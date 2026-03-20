/**
 * GET /api/admin/agentes/badge — contagem rápida de achados não lidos por severidade
 * Usado pelo menu lateral para mostrar badge de notificação.
 */
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ criticos: 0, altos: 0 })

  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const db = supabaseAdmin()

  const { data } = await db
    .from('ai_agent_reports')
    .select('achados, status')
    .eq('status', 'novo')
    .gte('created_at', since7d)
    .limit(500)

  let criticos = 0
  let altos    = 0
  for (const r of data ?? []) {
    for (const a of (r.achados ?? []) as Array<{ severidade?: string }>) {
      const sev = (a.severidade ?? '').toLowerCase()
      if (sev === 'critica' || sev === 'crítica') criticos++
      else if (sev === 'alta') altos++
    }
  }

  return NextResponse.json({ criticos, altos })
}
