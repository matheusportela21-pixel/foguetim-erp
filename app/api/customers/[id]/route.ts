/**
 * PATCH /api/customers/[id]
 * Atualiza campos CRM de um cliente (notes, tags, rating, is_vip).
 * Somente o dono pode alterar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

interface PatchBody {
  notes?:   string | null
  tags?:    string[]
  rating?:  number | null
  is_vip?:  boolean
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  let body: PatchBody
  try {
    body = await req.json() as PatchBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // Permitir apenas campos CRM
  const patch: Partial<PatchBody> = {}
  if ('notes'  in body) patch.notes  = body.notes  ?? null
  if ('tags'   in body) patch.tags   = Array.isArray(body.tags) ? body.tags : []
  if ('rating' in body) patch.rating = body.rating  ?? null
  if ('is_vip' in body) patch.is_vip = Boolean(body.is_vip)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)   // garante ownership via RLS
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data })
}
