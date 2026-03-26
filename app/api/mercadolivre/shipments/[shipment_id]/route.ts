/**
 * GET /api/mercadolivre/shipments/[shipment_id]
 * Detalhes completos de um envio.
 *
 * Busca em paralelo:
 *   1. GET /shipments/{id}          (x-format-new: true)
 *   2. GET /shipments/{id}/history
 *   3. GET /shipments/{id}/carrier
 *   4. GET /shipments/{id}/costs
 *
 * Retorna objeto unificado com shipment + history + carrier + costs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const safeParse = async (r: PromiseSettledResult<Response>) => {
  if (r.status !== 'fulfilled' || !r.value.ok) return null
  try { return await r.value.json() } catch { return null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { shipment_id: string } },
) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const { shipment_id } = params
  const auth = { Authorization: `Bearer ${token}` }

  try {
    const [shipmentRes, historyRes, carrierRes, costsRes] = await Promise.allSettled([
      fetch(
        `${ML_API_BASE}/shipments/${shipment_id}`,
        { headers: { ...auth, 'x-format-new': 'true' } },
      ),
      fetch(
        `${ML_API_BASE}/shipments/${shipment_id}/history`,
        { headers: auth },
      ),
      fetch(
        `${ML_API_BASE}/shipments/${shipment_id}/carrier`,
        { headers: auth },
      ),
      fetch(
        `${ML_API_BASE}/shipments/${shipment_id}/costs`,
        { headers: auth },
      ),
    ])

    const [shipment, historyRaw, carrier, costsRaw] = await Promise.all([
      safeParse(shipmentRes),
      safeParse(historyRes),
      safeParse(carrierRes),
      safeParse(costsRes),
    ])

    if (!shipment) {
      return NextResponse.json({ error: 'Envio não encontrado' }, { status: 404 })
    }

    // Normalizar histórico — pode vir como array ou objeto com results/history
    const history = Array.isArray(historyRaw)
      ? historyRaw
      : (historyRaw?.history ?? historyRaw?.results ?? [])

    // Normalizar custos do envio
    let costs: { gross_amount: number; discount: number; seller_cost: number; buyer_cost: number } | null = null
    if (costsRaw) {
      const senders   = (costsRaw.senders   as Array<Record<string, unknown>>) ?? []
      const receivers = (costsRaw.receivers  as Array<Record<string, unknown>>) ?? []
      let grossAmount = 0, discount = 0, sellerCost = 0, buyerCost = 0
      for (const s of senders) {
        grossAmount += Number(s.cost ?? 0)
        discount    += Number(s.discount ?? 0)
        sellerCost  += Number(s.cost ?? 0) - Number(s.discount ?? 0)
      }
      for (const r of receivers) {
        buyerCost += Number(r.cost ?? 0)
      }
      costs = { gross_amount: grossAmount, discount, seller_cost: sellerCost, buyer_cost: buyerCost }
    }

    return NextResponse.json(
      { connected: true, shipment, history, carrier, costs },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[shipment detail GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
