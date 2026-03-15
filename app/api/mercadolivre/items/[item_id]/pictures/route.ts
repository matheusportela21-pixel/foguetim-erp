/**
 * POST /api/mercadolivre/items/[item_id]/pictures
 * Substitui as imagens do anúncio no ML.
 * Body: { urls: string[] }  — URLs públicas das imagens
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }                from '@/lib/server-auth'
import { mlFetch }                    from '@/lib/mercadolivre'

type Params = { params: { item_id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { urls: string[] }
  try {
    body = await req.json() as { urls: string[] }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json({ error: 'Informe ao menos uma URL de imagem' }, { status: 400 })
  }

  const pictures = body.urls.map(url => ({ source: url }))

  try {
    const updated = await mlFetch(user.id, `/items/${params.item_id}`, {
      method: 'PUT',
      body: JSON.stringify({ pictures }),
    })
    return NextResponse.json({ ok: true, item: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
