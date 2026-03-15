/**
 * POST /api/mercadolivre/items/[item_id]/upload-image
 * Fluxo: arquivo → Supabase Storage (temp) → URL pública → ML PUT → cleanup Supabase
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'
import { supabaseAdmin }             from '@/lib/supabase-admin'

type Params = { params: { item_id: string } }

const BUCKET = 'ml-images-temp'
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/** Ensure the temp bucket exists (idempotent) */
async function ensureBucket() {
  const { error } = await supabaseAdmin().storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_SIZE_BYTES,
  })
  // "already exists" is fine
  if (error && !error.message.includes('already exists')) {
    throw new Error(`Bucket error: ${error.message}`)
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id } = params

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido (esperado multipart/form-data)' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Campo "file" não encontrado' }, { status: 400 })

  // Validate type
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Apenas JPG e PNG são aceitos' }, { status: 400 })
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 10MB' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)
  const ext         = file.type === 'image/png' ? 'png' : 'jpg'
  const filename    = `${crypto.randomUUID()}.${ext}`
  const path        = `temp/${user.id}/${filename}`

  try {
    await ensureBucket()

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin()
      .storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      throw new Error(`Falha no upload temporário: ${uploadError.message}`)
    }

    // 2. Get public URL
    const { data: urlData } = supabaseAdmin()
      .storage
      .from(BUCKET)
      .getPublicUrl(path)

    const publicUrl = urlData.publicUrl

    // 3. Fetch current item pictures
    const currentItem = await mlFetch<{ pictures: { secure_url: string; id: string }[] }>(
      user.id,
      `/items/${item_id}`,
    )
    const existingUrls = (currentItem.pictures ?? []).map(p => p.secure_url)
    const allUrls      = [...existingUrls, publicUrl]

    // 4. Send to ML
    const updated = await mlFetch<{ pictures: { id: string; secure_url: string }[] }>(
      user.id,
      `/items/${item_id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ pictures: allUrls.map(url => ({ source: url })) }),
      },
    )

    // 5. Cleanup Supabase (fire-and-forget)
    supabaseAdmin()
      .storage
      .from(BUCKET)
      .remove([path])
      .catch(e => console.error('[upload-image] cleanup error:', e))

    const newPicture = updated.pictures?.[updated.pictures.length - 1]
    return NextResponse.json({ ok: true, pictureId: newPicture?.id })
  } catch (err: unknown) {
    // Cleanup on failure too
    supabaseAdmin().storage.from(BUCKET).remove([path]).catch(() => {})

    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload-image]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
