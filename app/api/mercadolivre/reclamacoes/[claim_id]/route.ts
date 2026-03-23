/**
 * GET /api/mercadolivre/reclamacoes/[claim_id]
 * Detalhe completo de uma reclamação — busca 4 endpoints ML em paralelo.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner }           from '@/lib/auth/api-permissions'
import { getValidToken, ML_API_BASE, getMLConnection } from '@/lib/mercadolivre'

export async function GET(
  _req: NextRequest,
  { params }: { params: { claim_id: string } },
) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { claim_id } = params
  const auth = { Authorization: `Bearer ${token}` }

  const safeParse = async (r: PromiseSettledResult<Response>) => {
    if (r.status !== 'fulfilled' || !r.value.ok) return null
    try { return await r.value.json() } catch { return null }
  }

  try {
    const [detailRes, returnsRes, reputationRes, historyRes] = await Promise.allSettled([
      fetch(`${ML_API_BASE}/post-purchase/v1/claims/${claim_id}/detail`,            { headers: auth }),
      fetch(`${ML_API_BASE}/post-purchase/v2/claims/${claim_id}/returns`,           { headers: auth }),
      fetch(`${ML_API_BASE}/post-purchase/v1/claims/${claim_id}/affects-reputation`,{ headers: auth }),
      fetch(`${ML_API_BASE}/post-purchase/v1/claims/${claim_id}/status-history`,    { headers: auth }),
    ])

    const [detail, returnsRaw, reputation, historyRaw] = await Promise.all([
      safeParse(detailRes),
      safeParse(returnsRes),
      safeParse(reputationRes),
      safeParse(historyRes),
    ])

    // Normalise arrays — ML may return object with results[] or plain array
    const returns = Array.isArray(returnsRaw)
      ? returnsRaw
      : (returnsRaw?.results ?? returnsRaw?.returns ?? [])

    const history = Array.isArray(historyRaw)
      ? historyRaw
      : (historyRaw?.events ?? historyRaw?.history ?? [])

    return NextResponse.json({
      detail,
      returns,
      affects_reputation: reputation?.affects_reputation ?? false,
      history,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[reclamacoes detail GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
