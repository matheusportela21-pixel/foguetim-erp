/**
 * GET /api/cron/relatorio-mensal
 * Cron job: roda no dia 1 de cada mês às 09:00 UTC (06:00 BRT).
 * Disparado pelo Vercel Cron — configurado em vercel.json.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verificar token do cron (Vercel define Authorization: Bearer CRON_SECRET)
  const auth = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET ?? ''
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Chamar o endpoint de geração com o mês anterior
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`
  const res = await fetch(`${baseUrl}/api/admin/agentes/relatorio-mensal`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      // Usar service role via cookie não funciona em cron — usar header interno
      'x-cron-token': process.env.CRON_SECRET ?? '',
    },
    body: JSON.stringify({}),
  })

  const data = await res.json()
  return NextResponse.json({ ok: res.ok, ...data })
}
