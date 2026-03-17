/**
 * GET /api/mercadolivre/packs/[pack_id]
 * Detalhes completos de um pack específico.
 *
 * Busca em paralelo:
 *   1. GET /packs/{pack_id}
 *   2. GET /marketplace/orders/pack/{pack_id}
 *   3. Se tiver shipment_id: GET /shipments/{id} (x-format-new: true)
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
  { params }: { params: { pack_id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const { pack_id } = params
  const auth = { Authorization: `Bearer ${token}` }

  try {
    const [packRes, ordersRes] = await Promise.allSettled([
      fetch(`${ML_API_BASE}/packs/${pack_id}`, { headers: auth }),
      fetch(`${ML_API_BASE}/marketplace/orders/pack/${pack_id}`, { headers: auth }),
    ])

    const [packData, ordersData] = await Promise.all([
      safeParse(packRes),
      safeParse(ordersRes),
    ])

    if (!packData) {
      return NextResponse.json({ error: 'Pack não encontrado' }, { status: 404 })
    }

    // Normalizar orders — pode vir como array ou objeto com results
    const orders = Array.isArray(ordersData)
      ? ordersData
      : (ordersData?.results ?? ordersData?.orders ?? [])

    // Se o pack tiver shipment_id, buscar detalhes do envio
    const shipmentId = packData.shipment_id ?? packData.shipment?.id
    let shipment: Record<string, unknown> | null = null

    if (shipmentId) {
      try {
        const r = await fetch(
          `${ML_API_BASE}/shipments/${shipmentId}`,
          { headers: { ...auth, 'x-format-new': 'true' } },
        )
        if (r.ok) shipment = await r.json() as Record<string, unknown>
      } catch { /* silenciar */ }
    }

    return NextResponse.json(
      { connected: true, pack_id, pack: packData, orders, shipment },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[pack detail GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
