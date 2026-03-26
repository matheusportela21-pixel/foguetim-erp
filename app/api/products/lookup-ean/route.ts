/**
 * POST /api/products/lookup-ean
 * Busca códigos EAN/GTIN a partir do nome do produto.
 *
 * Body: { name: string, brand?: string }
 * Retorna: { results: [{ ean, product_name, source }], total: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface EanResult {
  ean: string
  product_name: string
  source: 'ml_public' | 'warehouse'
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const body = await req.json() as { name?: string; brand?: string }
  const name = body.name?.trim() ?? ''
  if (!name) {
    return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 })
  }

  const brand = body.brand?.trim() ?? ''
  const searchQuery = brand ? `${name} ${brand}` : name
  const results: EanResult[] = []
  const seenEans = new Set<string>()

  try {
    // 1. Buscar na API pública do ML
    const mlUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchQuery)}&limit=10`
    const mlRes = await fetch(mlUrl)

    if (mlRes.ok) {
      const mlData = await mlRes.json() as {
        results?: Array<{
          title?: string
          attributes?: Array<{ id?: string; value_name?: string }>
        }>
      }

      for (const item of mlData.results ?? []) {
        const gtinAttr = item.attributes?.find(
          (a) => a.id === 'GTIN' && a.value_name,
        )
        if (gtinAttr?.value_name && !seenEans.has(gtinAttr.value_name)) {
          seenEans.add(gtinAttr.value_name)
          results.push({
            ean: gtinAttr.value_name,
            product_name: item.title ?? searchQuery,
            source: 'ml_public',
          })
        }
      }
    }

    // 2. Buscar no warehouse local (produtos do usuário)
    const searchTerm = `%${name}%`
    const { data: warehouseProducts } = await supabaseAdmin()
      .from('products')
      .select('ean, name')
      .eq('user_id', dataOwnerId)
      .ilike('name', searchTerm)
      .not('ean', 'is', null)
      .limit(5)

    if (warehouseProducts) {
      for (const prod of warehouseProducts) {
        if (prod.ean && !seenEans.has(prod.ean)) {
          seenEans.add(prod.ean)
          results.push({
            ean: prod.ean,
            product_name: prod.name,
            source: 'warehouse',
          })
        }
      }
    }

    return NextResponse.json({ results, total: results.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[lookup-ean POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
