/**
 * PATCH  /api/response-templates/[id] — atualizar template
 * DELETE /api/response-templates/[id] — deletar template
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { name?: string; content?: string; category?: string }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name?.trim())    updates.name    = body.name.trim()
  if (body.content?.trim()) updates.content = body.content.trim()
  if (body.category)        updates.category = body.category

  const { data, error } = await supabaseAdmin()
    .from('response_templates')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin()
    .from('response_templates')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

