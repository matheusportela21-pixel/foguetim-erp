/**
 * PATCH /api/admin/tickets/[id] — update status, priority, assigned_to
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const body = await req.json() as {
      status?:      string
      priority?:    string
      assigned_to?: string | null
    }

    const update: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    if (body.status === 'resolved') {
      update.resolved_at = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin()
      .from('support_tickets')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ticket: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
