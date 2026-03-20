/**
 * GET /api/cron/relatorio-mensal
 * Cron job: roda no dia 1 de cada mês às 09:00 UTC (06:00 BRT).
 * Disparado pelo Vercel Cron — configurado em vercel.json.
 * Após gerar o relatório, envia email de notificação para o admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail }                 from '@/lib/email/email.service'
import { monthlyReportTemplate }     from '@/lib/email/templates/monthly-report'

export const dynamic     = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  // Verificar token do cron (Vercel define Authorization: Bearer CRON_SECRET)
  const auth       = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET ?? ''
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Chamar o endpoint de geração com o mês anterior
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`
  const res     = await fetch(`${baseUrl}/api/admin/agentes/relatorio-mensal`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-cron-token':  process.env.CRON_SECRET ?? '',
    },
    body: JSON.stringify({}),
  })

  const data = await res.json() as {
    month?:      string
    monthLabel?: string
    relatorio?:  Record<string, unknown>
    custo_geracao?: number
    tokens?:     { input_tokens: number; output_tokens: number }
    error?:      string
  }

  if (!res.ok) {
    return NextResponse.json({ ok: false, ...data })
  }

  // ── Enviar email de notificação ─────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'matheus.portela21@gmail.com'
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://foguetim.com.br'
  const relatorio  = data.relatorio ?? {}
  const month      = data.month ?? ''
  const monthLabel = data.monthLabel ?? month

  const metricas = relatorio.metricas as Record<string, unknown> | undefined

  try {
    await sendEmail({
      to:      adminEmail,
      subject: `📊 Relatório Mensal — ${monthLabel} | Foguetim ERP`,
      html:    monthlyReportTemplate({
        month,
        monthLabel,
        score:         Number(relatorio.score_medio ?? 0),
        total_achados: Number(metricas?.total_relatorios ?? 0),
        criticos:      Number(metricas?.total_achados_criticos ?? 0),
        altos:         Number(metricas?.total_achados_altos ?? 0),
        custo_usd:     Number(metricas?.custo_total_usd ?? data.custo_geracao ?? 0),
        reunioes:      Number(metricas?.reunioes ?? 0),
        top_riscos:    (relatorio.principais_riscos as string[] | undefined) ?? [],
        conquistas:    (relatorio.conquistas as string[] | undefined) ?? [],
        report_url:    `${appUrl}/admin/agentes?tab=relatorios`,
        pdf_url:       `${appUrl}/api/admin/agentes/export/pdf?type=monthly&month=${month}`,
      }),
    })
  } catch (emailErr) {
    console.error('[cron/relatorio-mensal] Falha ao enviar email:', emailErr)
    // Não falhar o cron por causa do email
  }

  return NextResponse.json({ ok: true, ...data, email_sent: true })
}
