/**
 * Pré-carregamento de identificadores de produto (EAN, SKU, MPN) do cadastro local Supabase.
 *
 * Busca por ml_item_id ou sku (seller_custom_field).
 * Nunca lança — retorna source:'empty' em caso de falha ou ausência.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface LocalProductIdentifiers {
  ean:    string
  sku:    string
  mpn:    string
  source: 'local' | 'empty'
}

export async function preloadIdentifiersFromLocalProduct(
  itemId:     string,
  sellerSku:  string,
  supabaseClient: SupabaseClient,
): Promise<LocalProductIdentifiers> {
  try {
    const orClause = [`ml_item_id.eq.${itemId}`]
    if (sellerSku) orClause.push(`sku.eq.${sellerSku}`)

    const { data } = await supabaseClient
      .from('products')
      .select('ean, sku, mpn')
      .or(orClause.join(','))
      .limit(1)
      .maybeSingle()

    if (data) {
      const row = data as Record<string, string | null>
      return {
        ean:    row.ean ?? '',
        sku:    row.sku ?? '',
        mpn:    row.mpn ?? '',
        source: 'local',
      }
    }
  } catch { /* non-fatal */ }

  return { ean: '', sku: '', mpn: '', source: 'empty' }
}
