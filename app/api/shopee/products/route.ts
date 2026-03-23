/**
 * GET /api/shopee/products
 * Lista produtos (anúncios) da loja Shopee conectada.
 *
 * Query params:
 *   offset      — Paginação (padrão: 0)
 *   page_size   — Itens por página (padrão: 20, máx: 100)
 *   item_status — Status: NORMAL | BANNED | DELETED | UNLIST
 *                 Aceita múltiplos separados por vírgula (ex: NORMAL,UNLIST,BANNED).
 *                 Nesse caso, faz chamadas paralelas e mescla os resultados.
 *
 * Nota: A API Shopee v2 aceita APENAS UM status por chamada.
 * Quando múltiplos status são informados, este endpoint faz chamadas
 * paralelas e retorna os resultados mesclados.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_ITEM_LIST } from '@/lib/shopee/config'

const VALID_STATUSES = new Set(['NORMAL', 'BANNED', 'DELETED', 'UNLIST'])

interface ShopeeListResponse {
  response?: {
    item?:          unknown[]
    total_count?:   number
    has_next_page?: boolean
    next_offset?:   number
  }
  error?:   string
  message?: string
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidShopeeToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Shopee não conectada' }, { status: 404 })

  const sp        = req.nextUrl.searchParams
  const offset    = sp.get('offset')      ?? '0'
  const page_size = sp.get('page_size')   ?? '20'
  const rawStatus = sp.get('item_status') ?? 'NORMAL'

  // Split and validate statuses
  const statusList = rawStatus
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => VALID_STATUSES.has(s))

  // Fallback if none are valid
  if (statusList.length === 0) {
    console.error('[Shopee /products] item_status inválido:', rawStatus, '→ fallback NORMAL')
    statusList.push('NORMAL')
  }

  console.log('[Shopee /products] params:', {
    statusList, offset, page_size, shopId: tokenData.shopId,
  })

  try {
    if (statusList.length === 1) {
      // ── Single status: forward directly ──────────────────────────────────
      const data = await shopeeGet<ShopeeListResponse>(
        SHOPEE_PATH_ITEM_LIST,
        tokenData.accessToken,
        tokenData.shopId,
        { offset, page_size, item_status: statusList[0] },
      )
      console.log('[Shopee /products] single-status response:', {
        error:       data.error,
        total_count: data.response?.total_count,
        item_count:  data.response?.item?.length,
      })
      return NextResponse.json(data)
    }

    // ── Multiple statuses: parallel calls + merge ───────────────────────────
    // For total_count, each status has its own count.
    // For item listing: fetch up to page_size per status, then combine.
    // Offset applies per-status (best effort for mixed-status lists).
    const results = await Promise.allSettled(
      statusList.map(status =>
        shopeeGet<ShopeeListResponse>(
          SHOPEE_PATH_ITEM_LIST,
          tokenData.accessToken,
          tokenData.shopId,
          { offset, page_size, item_status: status },
        )
      )
    )

    console.log('[Shopee /products] multi-status results:', results.map((r, i) => ({
      status: statusList[i],
      ok:     r.status === 'fulfilled',
      error:  r.status === 'fulfilled' ? r.value.error : (r as PromiseRejectedResult).reason,
      count:  r.status === 'fulfilled' ? r.value.response?.total_count : 0,
    })))

    const allItems: unknown[] = []
    let totalCount = 0
    let hasNext    = false

    results.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error) {
        allItems.push(...(r.value.response?.item ?? []))
        totalCount += r.value.response?.total_count ?? 0
        if (r.value.response?.has_next_page) hasNext = true
      }
    })

    return NextResponse.json({
      response: {
        item:          allItems,
        total_count:   totalCount,
        has_next_page: hasNext,
        next_offset:   Number(offset) + allItems.length,
      },
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products] erro:', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
