/**
 * GET /api/mercadolivre/billing/[period_key]
 * Detalhes de um período de faturamento: documentos + resumo + detalhamento.
 * Busca os 3 endpoints em paralelo para minimizar latência.
 *
 * period_key format: YYYY-MM-DD (primeiro dia do mês)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const safeParse = async (r: PromiseSettledResult<Response>) => {
  if (r.status !== 'fulfilled' || !r.value.ok) return null
  try { return await r.value.json() } catch { return null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { period_key: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const { period_key } = params
  const auth = { Authorization: `Bearer ${token}` }

  try {
    const [docsRes, summaryRes, detailsRes] = await Promise.allSettled([
      fetch(
        `${ML_API_BASE}/billing/integration/periods/key/${period_key}/documents?group=ML`,
        { headers: auth },
      ),
      fetch(
        `${ML_API_BASE}/billing/integration/periods/key/${period_key}/group/ML/summary`,
        { headers: auth },
      ),
      fetch(
        `${ML_API_BASE}/billing/integration/periods/key/${period_key}/group/ML/details`,
        { headers: auth },
      ),
    ])

    const [docsRaw, summary, detailsRaw] = await Promise.all([
      safeParse(docsRes),
      safeParse(summaryRes),
      safeParse(detailsRes),
    ])

    // Normalizar arrays — ML pode retornar objeto com results[] ou array direta
    const documents = Array.isArray(docsRaw)
      ? docsRaw
      : (docsRaw?.documents ?? docsRaw?.results ?? [])

    const details = Array.isArray(detailsRaw)
      ? detailsRaw
      : (detailsRaw?.details ?? detailsRaw?.results ?? detailsRaw?.data ?? [])

    return NextResponse.json(
      { connected: true, period_key, documents, summary, details },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[billing period GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
