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
      .select('ean, ncm, cest, origem')
      .or(orClause.join(','))
      .limit(1)
      .single()

    if (data) {
      return {
        ean:    (data as Record<string, string | null>).ean    ?? '',
        ncm:    (data as Record<string, string | null>).ncm    ?? '',
        cest:   (data as Record<string, string | null>).cest   ?? '',
        origem: (data as Record<string, string | null>).origem ?? 'nacional',
        source: 'local_product',
      }
    }
  } catch { /* non-fatal */ }

  return { ean: '', ncm: '', cest: '', origem: 'nacional', source: 'empty' }
}
