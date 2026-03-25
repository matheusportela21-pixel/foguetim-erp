/**
 * GET /api/magalu/logistics
 * Lista entregas/expedições do Magalu.
 * Tenta /seller/v1/deliveries — se 403/404, retorna fallback vazio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const sp     = new URL(req.url).searchParams
  const offset = sp.get('offset') ?? '0'
  const limit  = sp.get('limit') ?? '50'
  const status = sp.get('status')

  try {
    const params: Record<string, string> = { _offset: offset, _limit: limit }
    if (status) params.status = status

    const data = await magaluGet(
      '/seller/v1/deliveries',
      tokenData.accessToken,
      tokenData.sellerId,
      params,
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any
    const deliveries: any[] = Array.isArray(raw) ? raw
      : raw?.items ?? raw?.results ?? raw?.data ?? []

    // Compute KPIs from delivery data
    let toShip = 0, inTransit = 0, delivered = 0, late = 0

    const orders = deliveries.map((d: any) => {
      const rawStatus = (d.status ?? '').toLowerCase()
      let mappedStatus: string

      if (['delivered', 'entregue'].includes(rawStatus)) {
        mappedStatus = 'delivered'
        delivered++
      } else if (['shipped', 'in_transit', 'em_transito', 'transporting'].includes(rawStatus)) {
        mappedStatus = 'in_transit'
        inTransit++
      } else if (['new', 'processing', 'approved', 'ready_to_ship', 'created'].includes(rawStatus)) {
        mappedStatus = 'to_ship'
        toShip++
      } else if (['late', 'delayed', 'overdue'].includes(rawStatus)) {
        mappedStatus = 'late'
        late++
      } else {
        mappedStatus = 'to_ship'
        toShip++
      }

      // Extract amount in BRL (normalizer is typically 100)
      const normalizer = d.amounts?.normalizer ?? 100
      const totalAmount = (d.amounts?.total ?? 0) / normalizer

      // Get first item info
      const firstItem = d.items?.[0]
      const productName = firstItem?.info?.name ?? '—'

      // Shipping address as buyer display
      const city = d.shipping_address?.city ?? ''
      const state = d.shipping_address?.state ?? ''
      const buyer = city && state ? `${city}, ${state}` : city || state || '—'

      return {
        id: d.code ?? d.id ?? '',
        buyer,
        carrier: d.carrier ?? d.logistics_provider ?? '—',
        tracking_code: d.tracking?.code ?? d.tracking_code ?? null,
        tracking_url: d.tracking?.url ?? d.tracking_url ?? null,
        status: mappedStatus,
        deadline: d.estimated_delivery_date ?? d.deadline ?? new Date().toISOString(),
        created_at: d.created_at ?? d.date_created ?? new Date().toISOString(),
        product_name: productName,
        total: totalAmount,
        quantity: firstItem?.quantity ?? 1,
      }
    })

    return NextResponse.json({
      available: true,
      kpis: { to_ship: toShip, in_transit: inTransit, delivered_30d: delivered, late },
      orders,
    })
  } catch (err) {
    console.warn('[Magalu Logistics] endpoint error:', err)
    return NextResponse.json({
      available: false,
      kpis: { to_ship: 0, in_transit: 0, delivered_30d: 0, late: 0 },
      orders: [],
      message: 'Logistics endpoint não disponível neste escopo',
    })
  }
}
