/**
 * POST /api/mercadolivre/sync-customers
 * Sincroniza compradores dos pedidos dos últimos 90 dias na tabela customers.
 *
 * Retorna: { synced, new, updated }
 */
import { NextResponse } from 'next/server'
import { getAuthUser }  from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ORDERS_LIMIT = 50
const MAX_PAGES    = 10   // até 500 pedidos

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface RawBuyer {
  id:         number | string
  nickname?:  string
  first_name?: string
  last_name?:  string
  email?:     string
  phone?:     string
}

interface RawShippingAddress {
  city?:     { name?: string }
  state?:    { name?: string }
  zip_code?: string
}

interface RawOrder {
  status:            string
  date_created:      string
  total_amount:      number
  buyer:             RawBuyer
  shipping?:         { receiver_address?: RawShippingAddress }
}

interface CustomerAccum {
  ml_buyer_id:  string
  nickname:     string
  first_name:   string
  last_name:    string
  email:        string
  phone:        string
  city:         string
  state:        string
  zip_code:     string
  total_orders: number
  total_spent:  number
  first_order_date: string
  last_order_date:  string
}

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado', notConnected: true })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const auth    = { Authorization: `Bearer ${token}` }
  const mlId    = conn.ml_user_id
  const dateFrom = new Date(Date.now() - 90 * 86400_000).toISOString()

  /* ── Paginar pedidos ─────────────────────────────────────────────────────── */
  const allOrders: RawOrder[] = []
  let offset = 0
  let total  = Infinity
  let pages  = 0

  while (offset < total && pages < MAX_PAGES) {
    const r = await fetch(
      `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc` +
      `&limit=${ORDERS_LIMIT}&offset=${offset}` +
      `&order.date_created.from=${dateFrom}`,
      { headers: auth }
    )
    if (!r.ok) break

    const d = await r.json()
    total   = d.paging?.total ?? 0

    const results: RawOrder[] = (d.results ?? []).map((o: Record<string, unknown>) => ({
      status:       String(o.status ?? ''),
      date_created: String(o.date_created ?? ''),
      total_amount: Number(o.total_amount ?? 0),
      buyer:        (o.buyer as RawBuyer) ?? {},
      shipping:     o.shipping as RawOrder['shipping'],
    }))

    allOrders.push(...results)
    offset += results.length
    pages++
    if (results.length < ORDERS_LIMIT) break
  }

  /* ── Filtrar cancelados e agrupar por buyer ──────────────────────────────── */
  const valid = allOrders.filter(o => o.status !== 'cancelled')
  const map   = new Map<string, CustomerAccum>()

  for (const o of valid) {
    const bid = String(o.buyer?.id ?? '')
    if (!bid) continue

    const addr = o.shipping?.receiver_address ?? {}
    const existing = map.get(bid)

    if (!existing) {
      map.set(bid, {
        ml_buyer_id:      bid,
        nickname:         o.buyer.nickname    ?? '',
        first_name:       o.buyer.first_name  ?? '',
        last_name:        o.buyer.last_name   ?? '',
        email:            o.buyer.email       ?? '',
        phone:            o.buyer.phone       ?? '',
        city:             addr.city?.name     ?? '',
        state:            addr.state?.name    ?? '',
        zip_code:         addr.zip_code       ?? '',
        total_orders:     1,
        total_spent:      o.total_amount,
        first_order_date: o.date_created,
        last_order_date:  o.date_created,
      })
    } else {
      existing.total_orders++
      existing.total_spent += o.total_amount
      if (o.date_created < existing.first_order_date) existing.first_order_date = o.date_created
      if (o.date_created > existing.last_order_date)  existing.last_order_date  = o.date_created
      // Atualizar endereço com o mais recente (last_order)
      if (o.date_created === existing.last_order_date && addr.city?.name) {
        existing.city     = addr.city?.name  ?? existing.city
        existing.state    = addr.state?.name ?? existing.state
        existing.zip_code = addr.zip_code    ?? existing.zip_code
      }
    }
  }

  if (map.size === 0) {
    return NextResponse.json({ synced: 0, new: 0, updated: 0 })
  }

  /* ── Buscar clientes já existentes para diferenciar new vs updated ───────── */
  const mlIds = Array.from(map.keys())
  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('ml_buyer_id')
    .eq('user_id', user.id)
    .in('ml_buyer_id', mlIds)

  const existingSet = new Set((existing ?? []).map((r: { ml_buyer_id: string }) => r.ml_buyer_id))

  /* ── Preparar payload e upsert ───────────────────────────────────────────── */
  const payload = Array.from(map.values()).map(c => ({
    user_id:          user.id,
    ml_buyer_id:      c.ml_buyer_id,
    nickname:         c.nickname     || null,
    first_name:       c.first_name   || null,
    last_name:        c.last_name    || null,
    email:            c.email        || null,
    phone:            c.phone        || null,
    city:             c.city         || null,
    state:            c.state        || null,
    zip_code:         c.zip_code     || null,
    total_orders:     c.total_orders,
    total_spent:      Math.round(c.total_spent * 100) / 100,
    average_ticket:   c.total_orders > 0
                        ? Math.round((c.total_spent / c.total_orders) * 100) / 100
                        : 0,
    first_order_date: c.first_order_date,
    last_order_date:  c.last_order_date,
    synced_at:        new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from('customers')
    .upsert(payload, { onConflict: 'user_id,ml_buyer_id', ignoreDuplicates: false })

  if (error) {
    console.error('[sync-customers]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const newCount     = payload.filter(p => !existingSet.has(p.ml_buyer_id)).length
  const updatedCount = payload.length - newCount

  return NextResponse.json({
    synced:  payload.length,
    new:     newCount,
    updated: updatedCount,
  })
}
