/**
 * lib/financial/dre-engine.ts
 * Engine de cálculo do DRE (Demonstrativo de Resultados do Exercício) simplificado.
 *
 * Fluxo: Receita Bruta → Deduções → Receita Líquida → CMV → Lucro Bruto
 *        → Despesas Operacionais → Lucro Operacional → Outras Despesas → Lucro Líquido
 *
 * Fontes:
 *   - ML orders (real): total_amount, sale_fee via API
 *   - Product costs: warehouse_products via getProductCost()
 *   - Company costs: company_costs table
 *   - Tax rate: pricing_rules.tax_pct ou fallback 6%
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidToken, getMLConnection, ML_API_BASE } from '@/lib/mercadolivre'
import { getProductCost, type WarehouseProductCostFields } from '@/lib/warehouse/product-cost'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DREResult {
  periodStart: string
  periodEnd:   string
  revenue: {
    ml:     number
    shopee: number
    magalu: number
    total:  number
  }
  deductions: {
    commissions_ml:     number
    commissions_shopee: number
    commissions_magalu: number
    shipping:           number
    taxes:              number
    taxRate:            number
    total:              number
  }
  netRevenue: number
  cmv: {
    total:       number
    coveragePct: number
  }
  grossProfit:            number
  grossMarginPct:         number
  operationalExpenses:    number
  operationalProfit:      number
  operationalMarginPct:   number
  otherExpenses:          number
  netProfit:              number
  netMarginPct:           number
  ordersCount:            number
  ticketMedio:            number
  dataSources:            Record<string, string>
  productProfitability:   ProductProfit[]
}

export interface ProductProfit {
  title:      string
  sku?:       string
  revenue:    number
  cmv:        number
  commission: number
  shipping:   number
  profit:     number
  marginPct:  number
  quantity:   number
}

// ─── ML Order Fetch ──────────────────────────────────────────────────────────

interface MLOrderItem {
  item:       { id: string; title: string }
  quantity:   number
  unit_price: number
  sale_fee:   number
}

interface MLOrder {
  id:            number
  status:        string
  total_amount:  number
  shipping_cost?: number
  order_items:   MLOrderItem[]
  date_created:  string
}

const ORDERS_LIMIT = 50
const MAX_PAGES    = 20
const DELAY_MS     = 150

async function fetchMLOrders(
  userId: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ orders: MLOrder[]; connected: boolean }> {
  const conn = await getMLConnection(userId)
  if (!conn?.connected) return { orders: [], connected: false }

  const token = await getValidToken(userId)
  if (!token) return { orders: [], connected: false }

  const auth = { Authorization: `Bearer ${token}` }
  const mlId = conn.ml_user_id
  const allOrders: MLOrder[] = []
  let offset = 0
  let totalFromPaging = Infinity
  let pages = 0

  while (offset < totalFromPaging && pages < MAX_PAGES) {
    const r = await fetch(
      `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc` +
      `&limit=${ORDERS_LIMIT}&offset=${offset}` +
      `&order.date_created.from=${dateFrom}` +
      `&order.date_created.to=${dateTo}`,
      { headers: auth },
    )
    if (!r.ok) break

    const d = await r.json()
    totalFromPaging = d.paging?.total ?? 0
    const results = (d.results ?? []) as MLOrder[]
    allOrders.push(...results)
    offset += results.length
    pages++

    if (results.length < ORDERS_LIMIT) break
    if (pages < MAX_PAGES && offset < totalFromPaging) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  return { orders: allOrders, connected: true }
}

// ─── Recurrence converter ────────────────────────────────────────────────────

function toMonthlyAmount(amount: number, recurrence: string): number {
  switch (recurrence) {
    case 'monthly':   return amount
    case 'annual':    return amount / 12
    case 'biweekly':  return amount * 2
    case 'weekly':    return amount * 4.33
    case 'one_time':  return 0
    default:          return amount
  }
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

export async function calculateDRE(
  userId:      string,
  periodStart: Date,
  periodEnd:   Date,
): Promise<DREResult> {
  const db = supabaseAdmin()
  const dateFrom = periodStart.toISOString()
  const dateTo   = periodEnd.toISOString()
  const dataSources: Record<string, string> = {}

  // ── 1. Revenue: ML orders ──────────────────────────────────────────────────
  const { orders: mlOrders, connected: mlConnected } = await fetchMLOrders(userId, dateFrom, dateTo)
  dataSources.ml = mlConnected ? 'real' : 'unavailable'

  let revenue_ml = 0
  let commissions_ml = 0
  let shipping_ml = 0
  let ordersCount = 0
  const orderItems: { itemId: string; title: string; quantity: number; unitPrice: number; saleFee: number; revenue: number }[] = []

  for (const order of mlOrders) {
    if (order.status === 'cancelled') continue
    ordersCount++
    revenue_ml += order.total_amount ?? 0

    for (const oi of order.order_items ?? []) {
      commissions_ml += oi.sale_fee ?? 0
      orderItems.push({
        itemId:    oi.item?.id ?? '',
        title:     oi.item?.title ?? 'Produto',
        quantity:  oi.quantity ?? 1,
        unitPrice: oi.unit_price ?? 0,
        saleFee:   oi.sale_fee ?? 0,
        revenue:   (oi.unit_price ?? 0) * (oi.quantity ?? 1),
      })
    }
  }

  // TODO: fetch Shopee/Magalu orders when available
  const revenue_shopee = 0
  const revenue_magalu = 0
  const commissions_shopee = 0
  const commissions_magalu = 0
  dataSources.shopee = 'not_implemented'
  dataSources.magalu = 'not_implemented'

  const revenue_total = revenue_ml + revenue_shopee + revenue_magalu

  // ── 2. Tax rate ────────────────────────────────────────────────────────────
  const { data: pricingRule } = await db
    .from('pricing_rules')
    .select('tax_pct')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_global', { ascending: false })
    .limit(1)
    .maybeSingle()

  const taxRate = pricingRule?.tax_pct ?? 6.0
  const taxes = revenue_total * (taxRate / 100)

  // ── 3. Shipping (estimated from ML data) ───────────────────────────────────
  // ML sale_fee includes platform fees but shipping is separate
  // For now estimate shipping as ~6% of revenue if no detailed data
  const shipping = shipping_ml > 0 ? shipping_ml : revenue_ml * 0.06

  const deductions_total = commissions_ml + commissions_shopee + commissions_magalu + shipping + taxes
  const netRevenue = revenue_total - deductions_total

  // ── 4. CMV (Custo de Mercadoria Vendida) ───────────────────────────────────
  // Fetch all warehouse products for this user to lookup costs
  const { data: warehouseProducts } = await db
    .from('warehouse_products')
    .select('id, sku, name, manual_cost, average_cost, last_entry_cost, cost_price')
    .eq('user_id', userId)

  const productCostMap = new Map<string, number>()
  let productsWithCost = 0
  let productsTotal = 0

  if (warehouseProducts) {
    for (const wp of warehouseProducts as (WarehouseProductCostFields & { id: string; sku: string; name: string })[]) {
      const cost = getProductCost(wp)
      if (cost != null) {
        productCostMap.set(wp.sku ?? wp.id, cost)
        productsWithCost++
      }
      productsTotal++
    }
  }

  // Also check products table for cost_price
  const { data: products } = await db
    .from('products')
    .select('id, sku, name, cost_price')
    .eq('user_id', userId)

  if (products) {
    for (const p of products as { id: string | number; sku: string; name: string; cost_price: number | null }[]) {
      if (p.cost_price != null && p.sku && !productCostMap.has(p.sku)) {
        productCostMap.set(p.sku, p.cost_price)
        productsWithCost++
      }
      if (!productCostMap.has(p.sku ?? String(p.id))) productsTotal++
    }
  }

  let cmv_total = 0
  let itemsWithCost = 0
  let itemsTotal = orderItems.length

  // Build product profitability
  const profitMap = new Map<string, ProductProfit>()

  for (const oi of orderItems) {
    let itemCost = 0
    // Try to find cost by matching title/sku patterns
    for (const [key, cost] of Array.from(productCostMap.entries())) {
      if (oi.itemId.includes(key) || oi.title.toLowerCase().includes(key.toLowerCase())) {
        itemCost = cost
        break
      }
    }

    if (itemCost > 0) {
      cmv_total += itemCost * oi.quantity
      itemsWithCost++
    }

    const existing = profitMap.get(oi.itemId)
    if (existing) {
      existing.revenue    += oi.revenue
      existing.cmv        += itemCost * oi.quantity
      existing.commission += oi.saleFee
      existing.quantity   += oi.quantity
      existing.profit = existing.revenue - existing.cmv - existing.commission
      existing.marginPct = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0
    } else {
      const profit = oi.revenue - (itemCost * oi.quantity) - oi.saleFee
      profitMap.set(oi.itemId, {
        title:      oi.title,
        revenue:    oi.revenue,
        cmv:        itemCost * oi.quantity,
        commission: oi.saleFee,
        shipping:   0,
        profit,
        marginPct:  oi.revenue > 0 ? (profit / oi.revenue) * 100 : 0,
        quantity:   oi.quantity,
      })
    }
  }

  const coveragePct = itemsTotal > 0 ? (itemsWithCost / itemsTotal) * 100 : 0

  // ── 5. Gross profit ────────────────────────────────────────────────────────
  const grossProfit = netRevenue - cmv_total
  const grossMarginPct = revenue_total > 0 ? (grossProfit / revenue_total) * 100 : 0

  // ── 6. Operational expenses ────────────────────────────────────────────────
  const { data: costs } = await db
    .from('company_costs')
    .select('amount, recurrence, active')
    .eq('user_id', userId)
    .eq('active', true)

  let operationalExpenses = 0
  if (costs) {
    for (const c of costs as { amount: number; recurrence: string; active: boolean }[]) {
      operationalExpenses += toMonthlyAmount(c.amount, c.recurrence)
    }
  }

  // Prorate if period is not exactly 1 month
  const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000)
  const monthFraction = periodDays / 30
  operationalExpenses = operationalExpenses * monthFraction

  const operationalProfit = grossProfit - operationalExpenses
  const operationalMarginPct = revenue_total > 0 ? (operationalProfit / revenue_total) * 100 : 0

  // ── 7. Other expenses ──────────────────────────────────────────────────────
  const otherExpenses = 0 // TODO: ML ads, discounts

  // ── 8. Net profit ──────────────────────────────────────────────────────────
  const netProfit = operationalProfit - otherExpenses
  const netMarginPct = revenue_total > 0 ? (netProfit / revenue_total) * 100 : 0

  const ticketMedio = ordersCount > 0 ? revenue_total / ordersCount : 0

  // ── 9. Product profitability sorted ────────────────────────────────────────
  const productProfitability = Array.from(profitMap.values())
    .sort((a, b) => b.profit - a.profit)

  // ── 10. Save to cache ──────────────────────────────────────────────────────
  const pStart = periodStart.toISOString().slice(0, 10)
  const pEnd   = periodEnd.toISOString().slice(0, 10)

  await db.from('dre_reports').upsert({
    user_id:                userId,
    period_start:           pStart,
    period_end:             pEnd,
    revenue_ml,
    revenue_shopee,
    revenue_magalu,
    revenue_total,
    commissions_ml,
    commissions_shopee,
    commissions_magalu,
    shipping_cost:          shipping,
    taxes,
    tax_rate:               taxRate,
    deductions_total,
    net_revenue:            netRevenue,
    cmv_total,
    cmv_coverage_pct:       coveragePct,
    gross_profit:           grossProfit,
    gross_margin_pct:       grossMarginPct,
    operational_expenses:   operationalExpenses,
    operational_profit:     operationalProfit,
    operational_margin_pct: operationalMarginPct,
    other_expenses:         otherExpenses,
    net_profit:             netProfit,
    net_margin_pct:         netMarginPct,
    orders_count:           ordersCount,
    ticket_medio:           ticketMedio,
    calculated_at:          new Date().toISOString(),
    data_sources:           dataSources,
    updated_at:             new Date().toISOString(),
  }, { onConflict: 'user_id,period_start,period_end' })

  return {
    periodStart: pStart,
    periodEnd:   pEnd,
    revenue:     { ml: revenue_ml, shopee: revenue_shopee, magalu: revenue_magalu, total: revenue_total },
    deductions:  { commissions_ml, commissions_shopee, commissions_magalu, shipping, taxes, taxRate, total: deductions_total },
    netRevenue,
    cmv:         { total: cmv_total, coveragePct },
    grossProfit,
    grossMarginPct,
    operationalExpenses,
    operationalProfit,
    operationalMarginPct,
    otherExpenses,
    netProfit,
    netMarginPct,
    ordersCount,
    ticketMedio,
    dataSources,
    productProfitability,
  }
}
