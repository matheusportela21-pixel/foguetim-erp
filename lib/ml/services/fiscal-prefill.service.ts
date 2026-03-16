/**
 * Pré-carregamento de dados fiscais e EAN a partir do cadastro local (Supabase).
 *
 * Procura o produto por ml_item_id ou sku (seller_custom_field).
 * Nunca lança — retorna source:'empty' em caso de falha ou ausência.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface FiscalPrefillState {
  ean:    string
  ncm:    string
  cest:   string
  origem: string
  mpn:    string
  sku:    string
  source: 'local_product' | 'empty'
}

export async function preloadFiscalData(
  itemId:     string,
  sellerSku:  string,
  supabase:   SupabaseClient,
): Promise<FiscalPrefillState> {
  try {
    const orClause = [`ml_item_id.eq.${itemId}`]
    if (sellerSku) orClause.push(`sku.eq.${sellerSku}`)

    const { data } = await supabase
      .from('products')
      .select('ean, ncm, cest, origem, mpn, sku')
      .or(orClause.join(','))
      .limit(1)
      .maybeSingle()

    if (data) {
      const row = data as Record<string, string | null>
      return {
        ean:    row.ean    ?? '',
        ncm:    row.ncm    ?? '',
        cest:   row.cest   ?? '',
        origem: row.origem ?? 'nacional',
        mpn:    row.mpn    ?? '',
        sku:    row.sku    ?? '',
        source: 'local_product',
      }
    }
  } catch { /* non-fatal */ }

  return { ean: '', ncm: '', cest: '', origem: 'nacional', mpn: '', sku: '', source: 'empty' }
}
