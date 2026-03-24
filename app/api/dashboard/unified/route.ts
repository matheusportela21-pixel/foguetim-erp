import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'

export const dynamic = 'force-dynamic'

interface ChannelData {
  revenue: number
  orders: number
  products: number
}

async function fetchMLData(userId: string): Promise<ChannelData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const [ordersRes, productsRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/mercadolivre/orders?limit=200`, {
        headers: { 'x-user-id': userId },
      }),
      fetch(`${baseUrl}/api/mercadolivre/listings?limit=1`, {
        headers: { 'x-user-id': userId },
      }),
    ])

    let revenue = 0
    let orders = 0
    let products = 0

    if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
      const data = await ordersRes.value.json()
      const list = data.results ?? data.items ?? []
      orders = list.length
      revenue = list.reduce((sum: number, o: Record<string, unknown>) => {
        return sum + (Number(o.total_amount) || 0)
      }, 0)
    }

    if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
      const data = await productsRes.value.json()
      products = data.total ?? data.paging?.total ?? 0
    }

    return { revenue, orders, products }
  } catch {
    return null
  }
}

async function fetchMagaluData(userId: string): Promise<ChannelData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const [ordersRes, productsRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/magalu/orders?limit=200`, {
        headers: { 'x-user-id': userId },
      }),
      fetch(`${baseUrl}/api/magalu/products?limit=1`, {
        headers: { 'x-user-id': userId },
      }),
    ])

    let revenue = 0
    let orders = 0
    let products = 0

    if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
      const data = await ordersRes.value.json()
      const list = data.items ?? []
      orders = list.length
      revenue = list.reduce((sum: number, o: Record<string, unknown>) => {
        return sum + (Number(o.total_amount) || 0)
      }, 0)
    }

    if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
      const data = await productsRes.value.json()
      products = data.total ?? 0
    }

    return { revenue, orders, products }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const owner = await resolveDataOwner()
    if (owner.error) return owner.error

    const [ml, magalu] = await Promise.allSettled([
      fetchMLData(owner.dataOwnerId),
      fetchMagaluData(owner.dataOwnerId),
    ])

    const mlData = ml.status === 'fulfilled' ? ml.value : null
    const magaluData = magalu.status === 'fulfilled' ? magalu.value : null

    const totalRevenue = (mlData?.revenue ?? 0) + (magaluData?.revenue ?? 0)
    const totalOrders = (mlData?.orders ?? 0) + (magaluData?.orders ?? 0)
    const totalProducts = (mlData?.products ?? 0) + (magaluData?.products ?? 0)

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        breakdown: {
          ml: mlData?.revenue ?? 0,
          magalu: magaluData?.revenue ?? 0,
          shopee: 0,
        },
      },
      orders: {
        total: totalOrders,
        breakdown: {
          ml: mlData?.orders ?? 0,
          magalu: magaluData?.orders ?? 0,
          shopee: 0,
        },
      },
      products: {
        total: totalProducts,
        breakdown: {
          ml: mlData?.products ?? 0,
          magalu: magaluData?.products ?? 0,
          shopee: 0,
        },
      },
      channels: {
        ml: !!mlData,
        shopee: false,
        magalu: !!magaluData,
      },
    })
  } catch (err) {
    console.error('[unified-dashboard]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
