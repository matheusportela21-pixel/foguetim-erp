/**
 * POST /api/shopee/products/bulk-action
 * Executa ação em massa em produtos Shopee.
 *
 * Body: { item_ids: number[], action: 'unlist' | 'activate' }
 *
 * Usa: POST /api/v2/product/unlist_item
 * A Shopee aceita até 50 itens por chamada em unlist_item.
 * Entre chamadas, aguarda 1s para respeitar rate limit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeePost } from '@/lib/shopee/client'
import { SHOPEE_PATH_UNLIST_ITEM } from '@/lib/shopee/config'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidShopeeToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Shopee não conectada' }, { status: 404 })

  const body = await req.json() as { item_ids?: number[]; action?: string }
  const { item_ids, action } = body

  if (!Array.isArray(item_ids) || item_ids.length === 0) {
    return NextResponse.json({ error: 'item_ids (array) obrigatório' }, { status: 400 })
  }
  if (action !== 'unlist' && action !== 'activate') {
    return NextResponse.json({ error: 'action deve ser "unlist" ou "activate"' }, { status: 400 })
  }

  const unlist = action === 'unlist'
  const chunks = chunkArray(item_ids, 50)
  const results: unknown[] = []

  for (const chunk of chunks) {
    try {
      const data = await shopeePost(
        SHOPEE_PATH_UNLIST_ITEM,
        tokenData.accessToken,
        tokenData.shopId,
        {
          item_list: chunk.map(id => ({ item_id: id, unlist })),
        },
      )
      results.push(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Shopee bulk-action] chunk error:', msg)
      results.push({ error: msg })
    }
    if (chunks.length > 1) await sleep(1100) // rate limit: 1 call/s
  }

  console.log(`[Shopee] bulk-action action=${action} count=${item_ids.length} user=${dataOwnerId}`)
  return NextResponse.json({ results, action, count: item_ids.length })
}
