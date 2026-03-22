/**
 * GET /api/armazem/mapeamentos/stats
 * Estatísticas de mapeamento por canal para o usuário autenticado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    // Total de produtos no armazém
    const { count: totalProducts } = await db
      .from('warehouse_products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('active', true)

    // Todos os mapeamentos do usuário
    const { data: allMaps } = await db
      .from('warehouse_product_mappings')
      .select('warehouse_product_id, channel')
      .eq('user_id', user.id)

    const maps = allMaps ?? []

    const mlProductIds     = new Set<number>()
    const shopeeProductIds = new Set<number>()
    const anyMappedIds     = new Set<number>()

    for (const m of maps) {
      anyMappedIds.add(m.warehouse_product_id)
      if (m.channel === 'mercado_livre') mlProductIds.add(m.warehouse_product_id)
      if (m.channel === 'shopee')        shopeeProductIds.add(m.warehouse_product_id)
    }

    const total      = totalProducts ?? 0
    const unmappedAny = Math.max(0, total - anyMappedIds.size)

    return NextResponse.json({
      totalProducts: total,
      mappedML:      mlProductIds.size,
      mappedShopee:  shopeeProductIds.size,
      unmappedAny,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mapeamentos/stats GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
