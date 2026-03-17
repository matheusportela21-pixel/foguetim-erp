/**
 * GET /api/mercadolivre/shipments/[shipment_id]
 * Detalhes completos de um envio.
 *
 * Busca em paralelo:
 *   1. GET /shipments/{id}          (x-format-new: true)
 *   2. GET /shipments/{id}/history
 *   3. GET /shipments/{id}/carrier
 *
 * Retorna objeto unificado com shipment + history + carrier.
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
  { params }: { params: { shipment_id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const { shipment_id } = params
  const auth = { Authorization: `Bearer ${token}` }

  try {
    const [shipmentRes, historyRes, carrierRes] = await Promise.allSettled([
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
    ])

    const [shipment, historyRaw, carrier] = await Promise.all([
      safeParse(shipmentRes),
      safeParse(historyRes),
      safeParse(carrierRes),
    ])

    if (!shipment) {
      return NextResponse.json({ error: 'Envio não encontrado' }, { status: 404 })
    }

    // Normalizar histórico — pode vir como array ou objeto com results/history
    const history = Array.isArray(historyRaw)
      ? historyRaw
      : (historyRaw?.history ?? historyRaw?.results ?? [])

    return NextResponse.json(
      { connected: true, shipment, history, carrier },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[shipment detail GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
