/**
 * POST /api/armazem/produtos/import
 * Body: { rows: [{name, sku, ean, cost, price, stock, category}] }
 * Upserts products by SKU.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface ImportRow {
  name?:     string
  sku?:      string
  ean?:      string
  cost?:     string
  price?:    string
  stock?:    string
  category?: string
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:edit')
  if (authError) return authError

  let body: { rows?: ImportRow[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const rows = body.rows
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Nenhuma linha para importar' }, { status: 400 })
  }

  // Limit batch size
  if (rows.length > 500) {
    return NextResponse.json({ error: 'Maximo de 500 linhas por importacao' }, { status: 400 })
  }

  const db = supabaseAdmin()
  let success = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2 // +2 because row 1 is header, data starts at 2

    // Validate required fields
    const name = row.name?.trim()
    const sku  = row.sku?.trim()

    if (!name) {
      errors.push(`Linha ${lineNum}: nome e obrigatorio`)
      continue
    }
    if (!sku) {
      errors.push(`Linha ${lineNum}: SKU e obrigatorio`)
      continue
    }

    // Parse numeric fields
    const costPrice = row.cost ? parseFloat(row.cost.replace(',', '.')) : null
    const refPrice  = row.price ? parseFloat(row.price.replace(',', '.')) : null
    const stockQty  = row.stock ? parseInt(row.stock, 10) : null

    if (row.cost && (isNaN(costPrice!) || costPrice! < 0)) {
      errors.push(`Linha ${lineNum}: custo invalido "${row.cost}"`)
      continue
    }
    if (row.price && (isNaN(refPrice!) || refPrice! < 0)) {
      errors.push(`Linha ${lineNum}: preco invalido "${row.price}"`)
      continue
    }

    try {
      // Check if SKU already exists
      const { data: existing } = await db
        .from('warehouse_products')
        .select('id')
        .eq('user_id', dataOwnerId)
        .eq('sku', sku)
        .maybeSingle()

      const productData: Record<string, unknown> = {
        user_id:         dataOwnerId,
        name,
        sku,
        barcode:         row.ean?.trim() || null,
        cost_price:      costPrice,
        reference_price: refPrice,
        product_type:    'single',
        active:          true,
        source_type:     'csv_import',
      }

      if (existing) {
        // Update existing product
        const { error: updateErr } = await db
          .from('warehouse_products')
          .update({
            name:            productData.name,
            barcode:         productData.barcode,
            cost_price:      productData.cost_price,
            reference_price: productData.reference_price,
            updated_at:      new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('user_id', dataOwnerId)

        if (updateErr) {
          errors.push(`Linha ${lineNum} (${sku}): ${updateErr.message}`)
          continue
        }
      } else {
        // Insert new product
        const { error: insertErr } = await db
          .from('warehouse_products')
          .insert(productData)

        if (insertErr) {
          errors.push(`Linha ${lineNum} (${sku}): ${insertErr.message}`)
          continue
        }
      }

      // Update stock if provided
      if (stockQty !== null && !isNaN(stockQty) && existing) {
        // Only update stock for existing products that have inventory entries
        await db
          .from('warehouse_inventory')
          .update({ available_qty: stockQty })
          .eq('product_id', existing.id)
          .eq('user_id', dataOwnerId)
          .limit(1)
      }

      success++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Linha ${lineNum} (${sku}): ${msg}`)
    }
  }

  return NextResponse.json({ success, errors })
}
