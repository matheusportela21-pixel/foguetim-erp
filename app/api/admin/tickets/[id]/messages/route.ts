/**
 * GET  /api/admin/tickets/[id]/messages — list messages
 * POST /api/admin/tickets/[id]/messages — send message
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const { data, error } = await supabaseAdmin()
      .from('ticket_messages')
      .select('*, sender:sender_id(id, name, email)')
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ messages: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const { message, is_internal = false } = await req.json() as {
      message: string
      is_internal?: boolean
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin()
      .from('ticket_messages')
      .insert({
        ticket_id:   params.id,
        sender_id:   guard.userId,
        message:     message.trim(),
        is_internal,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update ticket updated_at
    await Promise.resolve(
      supabaseAdmin()
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', params.id)
    ).catch(() => {/* non-blocking */})

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
