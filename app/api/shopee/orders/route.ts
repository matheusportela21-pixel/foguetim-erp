/**
 * GET /api/shopee/orders
 * Lista pedidos da loja Shopee com suporte a paginação por cursor.
 *
 * Query params:
 *   days            — Janela de tempo em dias (padrão: 7, opções: 7, 15, 30)
 *                     Para 30 dias, faz 2 chamadas paralelas de 15 dias cada.
 *   order_status    — Filtro de status (omitir para todos os status)
 *   include_details — Se 'true', busca get_order_detail para cada pedido (até 50/lote)
 *   page_size       — Itens por página no get_order_list (padrão: 100, máx: 100)
 *
 * Nota: Shopee API v2 limita get_order_list a janelas de 15 dias por chamada.
 * Para 30 dias, fazemos 2 chamadas paralelas: [hoje-30d, hoje-15d] e [hoje-15d, hoje].
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import {
  SHOPEE_PATH_ORDER_LIST,
  SHOPEE_PATH_ORDER_DETAIL,
  SHOPEE_ORDER_OPTIONAL_FIELDS,
} from '@/lib/shopee/config'
import { nowTs } from '@/lib/shopee/sign'

interface OrderListResponse {
  response?: {
    order_list?: Array<{ order_sn: string; order_status: string; create_time: number; update_time: number }>
    more?:        boolean
    next_cursor?: string
  }
  error?:   string
  message?: string
}

interface OrderDetailResponse {
  response?: {
    order_list?: unknown[]
  }
  error?:   string
  message?: string
}

/** Coleta todos os pedidos de uma janela de tempo, seguindo paginação por cursor */
async function fetchAllOrdersInWindow(
  accessToken: string,
  shopId:      number,
  timeFrom:    number,
  timeTo:      number,
  orderStatus: string,
  pageSize:    number,
): Promise<Array<{ order_sn: string; order_status: string; create_time: number; update_time: number }>> {
  const allOrders: Array<{ order_sn: string; order_status: string; create_time: number; update_time: number }> = []
  let cursor = ''
  let hasMore = true

  while (hasMore) {
    const params: Record<string, string | number> = {
      time_range_field: 'create_time',
      time_from:        timeFrom,
      time_to:          timeTo,
      page_size:        pageSize,
      cursor,
    }
    if (orderStatus) params['order_status'] = orderStatus

    const data = await shopeeGet<OrderListResponse>(
      SHOPEE_PATH_ORDER_LIST,
      accessToken,
      shopId,
      params,
    )

    if (data.error) {
      console.error('[Shopee /orders] get_order_list error:', data.error, data.message)
      break
    }

    const batch = data.response?.order_list ?? []
    allOrders.push(...batch)

    hasMore = data.response?.more === true
    cursor  = data.response?.next_cursor ?? ''

    if (!cursor) hasMore = false
  }

  return allOrders
}

/** Busca detalhes de até 50 pedidos por chamada (limite Shopee) */
async function fetchOrderDetails(
  accessToken: string,
  shopId:      number,
  orderSns:    string[],
): Promise<unknown[]> {
  const BATCH = 50
  const allDetails: unknown[] = []

  for (let i = 0; i < orderSns.length; i += BATCH) {
    const chunk   = orderSns.slice(i, i + BATCH)
    const snParam = chunk.join(',')

    try {
      const data = await shopeeGet<OrderDetailResponse>(
        SHOPEE_PATH_ORDER_DETAIL,
        accessToken,
        shopId,
        {
          order_sn_list:          snParam,
          response_optional_fields: SHOPEE_ORDER_OPTIONAL_FIELDS,
        },
      )
      if (!data.error && data.response?.order_list) {
        allDetails.push(...data.response.order_list)
      }
    } catch (err) {
      console.error('[Shopee /orders] get_order_detail chunk error:', err)
    }

    // rate limit: 1 call/s para múltiplos lotes
    if (i + BATCH < orderSns.length) {
      await new Promise(r => setTimeout(r, 1100))
    }
  }

  return allDetails
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidShopeeToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Shopee não conectada' }, { status: 404 })

  const sp             = req.nextUrl.searchParams
  const days           = Math.min(Math.max(Number(sp.get('days') ?? '7'), 1), 30)
  const orderStatus    = sp.get('order_status') ?? ''
  const includeDetails = sp.get('include_details') === 'true'
  const pageSize       = Math.min(Number(sp.get('page_size') ?? '100'), 100)

  const now = nowTs()

  try {
    let allOrders: Array<{ order_sn: string; order_status: string; create_time: number; update_time: number }> = []

    if (days <= 15) {
      // Janela única
      const timeFrom = now - days * 86400
      allOrders = await fetchAllOrdersInWindow(
        tokenData.accessToken, tokenData.shopId,
        timeFrom, now, orderStatus, pageSize,
      )
    } else {
      // 30 dias: 2 janelas de 15 dias paralelas
      const mid = now - 15 * 86400
      const far = now - days * 86400

      const [recent, older] = await Promise.all([
        fetchAllOrdersInWindow(tokenData.accessToken, tokenData.shopId, mid, now,  orderStatus, pageSize),
        fetchAllOrdersInWindow(tokenData.accessToken, tokenData.shopId, far, mid,  orderStatus, pageSize),
      ])
      allOrders = [...recent, ...older]
    }

    // Ordenar por create_time desc (mais recente primeiro)
    allOrders.sort((a, b) => b.create_time - a.create_time)

    console.log('[Shopee /orders] total encontrado:', allOrders.length, '| includeDetails:', includeDetails)

    if (!includeDetails || allOrders.length === 0) {
      return NextResponse.json({
        response: {
          order_list: allOrders,
          total:      allOrders.length,
        },
      })
    }

    // Buscar detalhes em lote
    const orderSns  = allOrders.map(o => o.order_sn)
    const details   = await fetchOrderDetails(tokenData.accessToken, tokenData.shopId, orderSns)

    // Montar mapa de detalhes por order_sn
    const detailMap = new Map<string, unknown>()
    for (const d of details) {
      const order = d as Record<string, unknown>
      if (order.order_sn) detailMap.set(order.order_sn as string, order)
    }

    // Mesclar lista base com detalhes
    const enriched = allOrders.map(o => ({
      ...o,
      ...(detailMap.get(o.order_sn) ?? {}),
    }))

    return NextResponse.json({
      response: {
        order_list: enriched,
        total:      enriched.length,
      },
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /orders] erro:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
