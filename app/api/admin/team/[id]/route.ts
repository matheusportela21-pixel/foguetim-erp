/**
 * PATCH  /api/admin/team/[id]  — update role / notes / is_active
 * DELETE /api/admin/team/[id]  — remove member
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (guard) return guard

  try {
    const body = await req.json() as { role?: string; notes?: string; is_active?: boolean }

    const { data, error } = await supabaseAdmin()
      .from('foguetim_team')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ member: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (guard) return guard

  try {
    const { error } = await supabaseAdmin()
      .from('foguetim_team')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
