/**
 * GET /api/mercadolivre/billing
 * Lista os últimos 12 períodos mensais de faturamento do ML.
 *
 * Query params:
 *   summary  true | false  — se true, busca o resumo de cada período em paralelo
 *                            (usado para o gráfico histórico de 12 meses)
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

interface MLPeriod {
  key:         string
  status:      string
  start_date?: string
  end_date?:   string
  [k: string]: unknown
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const sp          = new URL(req.url).searchParams
  const withSummary = sp.get('summary') === 'true'
  const auth        = { Authorization: `Bearer ${token}` }

  try {
    // 1. Lista períodos mensais
    const periodsRes = await fetch(
      `${ML_API_BASE}/billing/integration/monthly/periods?group=ML`,
      { headers: auth },
    )

    if (!periodsRes.ok) {
      const txt = await periodsRes.text()
      // Retornar lista vazia com aviso — não quebrar a página
      return NextResponse.json(
        { connected: true, periods: [], error: `billing (${periodsRes.status}): ${txt}` },
        { headers: { 'Cache-Control': 'private, max-age=60' } },
      )
    }

    const raw         = await periodsRes.json()
    const periods: MLPeriod[] = Array.isArray(raw)
      ? raw
      : (raw?.periods ?? raw?.results ?? [])

    if (!withSummary) {
      return NextResponse.json(
        { connected: true, periods: periods.slice(0, 12) },
        { headers: { 'Cache-Control': 'private, max-age=300' } },
      )
    }

    // 2. Resumo de cada período em paralelo (para o gráfico histórico)
    const summaries = await Promise.allSettled(
      periods.slice(0, 12).map(p =>
        fetch(
          `${ML_API_BASE}/billing/integration/periods/key/${p.key}/group/ML/summary`,
          { headers: auth },
        )
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    )

    const periodsWithSummary = periods.slice(0, 12).map((p, i) => {
      const res = summaries[i]
      return { ...p, summary: res.status === 'fulfilled' ? res.value : null }
    })

    return NextResponse.json(
      { connected: true, periods: periodsWithSummary },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[billing GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
