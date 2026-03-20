/**
 * GET /api/mercadolivre/conciliacao?period_key=2026-03-01
 *
 * Compara receita bruta dos pedidos com as cobranças e bônus do Billing ML.
 *
 * Retorna ConciliacaoResult com métricas unificadas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

/* ── Types ───────────────────────────────────────────────────────────────── */
export interface ConciliacaoCharge {
  label:  string
  amount: number
}

export interface ConciliacaoOrder {
  id:                   string | number
  status:               string
  total_amount:         number
  buyer_nickname:       string
  items:                { title: string; quantity: number; unit_price: number }[]
  comissao_estimada:    number
  liquido_estimado:     number
}

export interface ConciliacaoResult {
  period_key:           string
  period_label:         string

  // Pedidos
  total_pedidos:        number
  receita_bruta:        number
  ticket_medio:         number
  orders:               ConciliacaoOrder[]

  // Billing ML
  total_taxas_ml:       number
  total_bonus:          number
  receita_liquida:      number
  comissao_percentual:  number

  // Detalhamento
  charges:              ConciliacaoCharge[]
  bonuses:              ConciliacaoCharge[]

  // Conciliação
  // divergencia: diferença entre a taxa de comissão efetiva e o intervalo esperado (5–22%).
  // Valor positivo = excesso cobrado acima do limite; negativo = abaixo do mínimo esperado.
  // Zero = dentro do intervalo normal. null = sem dados de billing para comparar.
  divergencia:          number
  divergencia_pct:      number   // taxa efetiva − 13.5% (ponto médio referência ML)
  deducao_liquida:      number   // total_taxas_ml − total_bonus (impacto real no caixa)
  billing_disponivel:   boolean  // true = billing carregado com sucesso para o período
  status:               'ok' | 'divergente' | 'pendente'
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function periodDates(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number)
  const from   = new Date(y, m - 1, 1)
  const to     = new Date(y, m, 0, 23, 59, 59)
  return { from: from.toISOString(), to: to.toISOString() }
}

function periodLabel(key: string): string {
  try {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  } catch { return key }
}

function extractChargesBreakdown(summary: Record<string, unknown>): { total: number; items: ConciliacaoCharge[] } {
  const charges = summary.charges as Record<string, unknown> | undefined
  const total   = Math.abs(Number(charges?.total ?? summary.total_charges ?? 0))
  const items: ConciliacaoCharge[] = []

  const breakdown = (charges?.breakdown ?? charges?.items ?? []) as Record<string, unknown>[]
  for (const item of breakdown) {
    items.push({
      label:  String(item.description ?? item.label ?? item.name ?? 'Cobrança'),
      amount: Math.abs(Number(item.amount ?? 0)),
    })
  }
  if (items.length === 0 && total > 0) {
    items.push({ label: 'Total cobranças ML', amount: total })
  }
  return { total, items }
}

function extractBonusBreakdown(summary: Record<string, unknown>): { total: number; items: ConciliacaoCharge[] } {
  const bonuses = summary.bonuses as Record<string, unknown> | undefined
  const total   = Math.abs(Number(bonuses?.total ?? summary.total_bonuses ?? 0))
  const items: ConciliacaoCharge[] = []

  const breakdown = (bonuses?.breakdown ?? bonuses?.items ?? []) as Record<string, unknown>[]
  for (const item of breakdown) {
    items.push({
      label:  String(item.description ?? item.label ?? item.name ?? 'Bônus'),
      amount: Math.abs(Number(item.amount ?? 0)),
    })
  }
  if (items.length === 0 && total > 0) {
    items.push({ label: 'Total bônus/créditos', amount: total })
  }
  return { total, items }
}

/* ── Route ───────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const sp         = new URL(req.url).searchParams
  const period_key = sp.get('period_key')
  if (!period_key) return NextResponse.json({ error: 'period_key obrigatório' }, { status: 400 })

  const auth  = { Authorization: `Bearer ${token}` }
  const mlId  = conn.ml_user_id
  const { from, to } = periodDates(period_key)

  try {
    // ── 3 fetches paralelos ───────────────────────────────────────────────
    const ORDERS_LIMIT = 50
    const MAX_PAGES    = 20

    const [summaryRes, detailsRes] = await Promise.allSettled([
      fetch(
        `${ML_API_BASE}/billing/integration/periods/key/${period_key}/group/ML/summary`,
        { headers: auth },
      ),
      fetch(
        `${ML_API_BASE}/billing/integration/periods/key/${period_key}/group/ML/details`,
        { headers: auth },
      ),
    ])

    // Parse billing
    const summaryRaw = summaryRes.status === 'fulfilled' && summaryRes.value.ok
      ? (await summaryRes.value.json() as Record<string, unknown>)
      : null

    const detailsRaw = detailsRes.status === 'fulfilled' && detailsRes.value.ok
      ? (await detailsRes.value.json() as unknown)
      : null
    void detailsRaw // reserved for future breakdown enrichment

    // ── Busca paginada de pedidos do período ──────────────────────────────
    const allOrders: Record<string, unknown>[] = []
    let offset          = 0
    let totalFromPaging = Infinity
    let pages           = 0

    while (offset < totalFromPaging && pages < MAX_PAGES) {
      const r = await fetch(
        `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc` +
        `&limit=${ORDERS_LIMIT}&offset=${offset}` +
        `&order.date_created.from=${from}` +
        `&order.date_created.to=${to}`,
        { headers: auth },
      )
      if (!r.ok) break

      const d = await r.json() as { paging?: { total?: number }; results?: unknown[] }
      totalFromPaging = d.paging?.total ?? 0
      const results = (d.results ?? []) as Record<string, unknown>[]
      allOrders.push(...results)
      offset += results.length
      pages++
      if (results.length < ORDERS_LIMIT) break
      if (pages < MAX_PAGES && offset < totalFromPaging) {
        await new Promise(r => setTimeout(r, 150))
      }
    }

    // ── Agregar pedidos (excluir cancelados) ──────────────────────────────
    const activeOrders = allOrders.filter(o => (o.status as string) !== 'cancelled')

    let receita_bruta = 0
    for (const o of activeOrders) {
      receita_bruta += Number(o.total_amount ?? 0)
    }
    const total_pedidos = activeOrders.length
    const ticket_medio  = total_pedidos > 0 ? receita_bruta / total_pedidos : 0

    // ── Extrair valores do billing ────────────────────────────────────────
    const { total: total_taxas_ml, items: charges } = summaryRaw
      ? extractChargesBreakdown(summaryRaw)
      : { total: 0, items: [] }

    const { total: total_bonus, items: bonuses } = summaryRaw
      ? extractBonusBreakdown(summaryRaw)
      : { total: 0, items: [] }

    const receita_liquida      = receita_bruta - total_taxas_ml + total_bonus
    const deducao_liquida      = total_taxas_ml - total_bonus  // impacto real no caixa do vendedor
    const comissao_percentual  = receita_bruta > 0 ? (total_taxas_ml / receita_bruta) * 100 : 0
    const billing_disponivel   = summaryRaw !== null

    // ── Divergência com significado operacional ────────────────────────────
    // Compara a taxa efetiva cobrada vs o intervalo esperado do ML (5–22%).
    // Ponto médio de referência: 13.5% (média das comissões ML Brasil).
    // divergencia > 0: ML cobrou acima do esperado (suspeito).
    // divergencia < 0: ML cobrou abaixo (pode indicar bônus não refletidos ou erro).
    // Zero (ou billing indisponível): dentro do normal / sem dados para comparar.
    const ML_FEE_REF_PCT  = 13.5  // referência central (%)
    const ML_FEE_MIN_PCT  = 5     // mínimo aceitável (%)
    const ML_FEE_MAX_PCT  = 22    // máximo aceitável (%)

    let divergencia     = 0
    let divergencia_pct = 0
    if (billing_disponivel && receita_bruta > 0) {
      divergencia_pct = comissao_percentual - ML_FEE_REF_PCT
      // Divergência em reais: quanto o vendedor pagou a mais/menos vs referência
      divergencia = (comissao_percentual - ML_FEE_REF_PCT) / 100 * receita_bruta
    }

    // ── Montar pedidos com comissão estimada ──────────────────────────────
    const orders: ConciliacaoOrder[] = activeOrders.slice(0, 100).map(o => {
      const buyer = (o.buyer as Record<string, unknown>) ?? {}
      const items = ((o.order_items as unknown[]) ?? []).map((it: unknown) => {
        const oi   = it as Record<string, unknown>
        const item = (oi.item as Record<string, unknown>) ?? {}
        return {
          title:      String(item.title ?? ''),
          quantity:   Number(oi.quantity ?? 1),
          unit_price: Number(oi.unit_price ?? 0),
        }
      })
      const total            = Number(o.total_amount ?? 0)
      const comissao_est     = total * (comissao_percentual / 100)
      return {
        id:                o.id as string | number,
        status:            o.status as string,
        total_amount:      total,
        buyer_nickname:    String(buyer.nickname ?? buyer.first_name ?? '—'),
        items,
        comissao_estimada: comissao_est,
        liquido_estimado:  total - comissao_est,
      }
    })

    // Status: pendente (sem billing), divergente (taxa fora do intervalo esperado), ok
    const statusResult: 'ok' | 'divergente' | 'pendente' = !billing_disponivel
      ? 'pendente'
      : (comissao_percentual > ML_FEE_MAX_PCT || comissao_percentual < ML_FEE_MIN_PCT) && receita_bruta > 0
        ? 'divergente'
        : 'ok'

    const result: ConciliacaoResult = {
      period_key,
      period_label:        periodLabel(period_key),
      total_pedidos,
      receita_bruta,
      ticket_medio,
      orders,
      total_taxas_ml,
      total_bonus,
      receita_liquida,
      comissao_percentual,
      charges,
      bonuses,
      divergencia,
      divergencia_pct,
      deducao_liquida,
      billing_disponivel,
      status: statusResult,
    }

    return NextResponse.json(
      { connected: true, ...result },
      { headers: { 'Cache-Control': 'private, max-age=120' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[conciliacao GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
