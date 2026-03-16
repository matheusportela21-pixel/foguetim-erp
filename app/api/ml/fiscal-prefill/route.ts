/**
 * GET /api/ml/fiscal-prefill?item_id=MLB123&sku=ABC
 *
 * Busca dados fiscais (ncm, cest, origem) e EAN do cadastro local Supabase.
 * Procura por ml_item_id ou sku (seller_custom_field).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { preloadFiscalData }         from '@/lib/ml/services/fiscal-prefill.service'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp      = new URL(req.url).searchParams
  const item_id = sp.get('item_id') ?? ''
  const sku     = sp.get('sku')     ?? ''

  if (!item_id) {
    return NextResponse.json({ error: 'item_id obrigatório' }, { status: 400 })
  }

  const result = await preloadFiscalData(item_id, sku, supabaseAdmin())
  return NextResponse.json(result)
}
