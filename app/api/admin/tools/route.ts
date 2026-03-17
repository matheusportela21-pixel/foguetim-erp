/**
 * GET  /api/admin/tools — status das integrações e ferramentas
 * POST /api/admin/tools — executar ação de ferramenta
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const db = supabaseAdmin()

    const [mlRes, usersRes, ticketsRes] = await Promise.all([
      db.from('marketplace_connections')
        .select('user_id, connected, updated_at')
        .eq('marketplace', 'mercadolibre')
        .eq('connected', true)
        .limit(1000),
      db.from('users').select('id', { count: 'exact', head: true }),
      db.from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
    ])

    const mlConnected = mlRes.data?.length ?? 0
    const lastSync    = mlRes.data?.[0]?.updated_at ?? null

    return NextResponse.json({
      ml: {
        connected:   mlConnected,
        status:      'ok',
        last_sync:   lastSync,
      },
      platform: {
        total_users:    usersRes.count ?? 0,
        open_tickets:   ticketsRes.count ?? 0,
        maintenance:    false,
      },
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const { action, payload } = await req.json() as { action: string; payload?: Record<string, unknown> }

    // Log the tool action
    await Promise.resolve(
      supabaseAdmin().from('admin_audit_logs').insert({
        actor_id:    guard.userId,
        actor_role:  guard.role,
        action:      `tool:${action}`,
        target_type: 'system',
        description: `Ferramenta executada: ${action}`,
        metadata:    payload ?? {},
      })
    ).catch(() => {/* non-blocking */})

    // Actions
    switch (action) {
      case 'ping':
        return NextResponse.json({ ok: true, message: 'pong', ts: new Date().toISOString() })

      default:
        return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
