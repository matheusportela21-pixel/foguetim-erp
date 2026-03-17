/**
 * GET /api/mercadolivre/reclamacoes
 *
 * Query params:
 *   ?status=opened (padrão) | closed
 *   ?type=all | claims | returns
 *
 * SOMENTE LEITURA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const ORDER_BATCH = 5

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Arrow functions no nível do módulo — evita "function declaration inside block" em strict mode
const daysOpen = (dateStr: string): number => {
  try {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

const getUrgency = (days: number): 'urgent' | 'warning' | 'normal' => {
  if (days > 5) return 'urgent'
  if (days >= 3) return 'warning'
  return 'normal'
}

// ─── Reason mapping ────────────────────────────────────────────────────────────

// Mapa de reason_id completo (ML retorna códigos como "PDD9939", não apenas prefixos)
const REASON_LABELS: Record<string, string> = {
  // Devoluções (PDD)
  PDD9939: 'Produto diferente do anunciado',
  PDD1181: 'Produto diferente do anunciado',
  PDD1182: 'Produto com defeito',
  PDD1183: 'Produto avariado na entrega',
  PDD:     'Devolução de produto',
  // Não recebido (INR / PNR)
  INR1169: 'Produto não recebido',
  INR1170: 'Entregue no endereço errado',
  PNR1169: 'Produto não recebido',
  PNR1170: 'Entregue no endereço errado',
  INR:     'Produto não recebido',
  PNR:     'Produto não recebido',
  // Outros
  DECO:    'Produto diferente do anúncio',
  BRK:     'Produto com defeito',
  DEMA:    'Garantia / defeito',
}

// Fallback por prefixo de 3 caracteres se o código completo não estiver mapeado
function getReasonLabel(reasonId: string): string {
  if (REASON_LABELS[reasonId]) return REASON_LABELS[reasonId]
  const prefix = reasonId.slice(0, 3).toUpperCase()
  return REASON_LABELS[prefix] ?? reasonId
}

// Prefixos que indicam devolução de produto
const RETURN_PREFIXES = ['PDD']
const isReturn = (reasonId: string) => RETURN_PREFIXES.some(p => reasonId.toUpperCase().startsWith(p))

const STAGE_LABELS: Record<string, string> = {
  claim:             'Reclamação',
  opened:            'Aberta',
  waiting_seller:    'Aguardando vendedor',
  waiting_buyer:     'Aguardando comprador',
  dispute:           'Em disputa',
  closed:            'Encerrada',
  resolved:          'Resolvida',
}

// ─── ML API shapes ─────────────────────────────────────────────────────────────

interface MLPlayer {
  role:               string
  type?:              string   // 'seller' | 'buyer'
  user_id?:           number | null
  available_actions?: string[]
}

interface MLClaim {
  id:           string
  resource_id:  number     // order_id
  reason_id:    string
  status:       string
  stage:        string
  date_created: string
  last_updated: string
  due_date?:    string
  resolution?:  string
  players?:     MLPlayer[]
}

function getActionResponsible(players?: MLPlayer[]): 'seller' | 'buyer' | 'mediator' | null {
  if (!players?.length) return null
  const active = players.find(p => (p.available_actions?.length ?? 0) > 0)
  if (!active) return null
  const t = (active.type ?? active.role).toLowerCase()
  if (t === 'seller' || t === 'respondent') return 'seller'
  if (t === 'buyer'  || t === 'complainant') return 'buyer'
  if (t.includes('mediator')) return 'mediator'
  return null
}

interface MLClaimsSearchResponse {
  data?: MLClaim[]
  paging?: { total?: number }
}

interface MLOrderItem {
  item?: {
    id?:        string
    title?:     string
    thumbnail?: string
  }
}

interface MLOrder {
  id:           number
  status?:      string
  date_created?: string
  total_amount?: number
  buyer?: {
    id?:       number
    nickname?: string
  }
  order_items?: MLOrderItem[]
}

// ─── Output shapes ─────────────────────────────────────────────────────────────

export interface ClaimOrder {
  product_title:     string
  product_thumbnail: string
  buyer_nickname:    string
  total_amount:      number
  order_date:        string
}

export interface ClaimItem {
  claim_id:           string
  order_id:           string
  status:             string
  stage:              string
  stage_label:        string
  reason_id:          string
  reason_label:       string
  date_created:       string
  last_updated:       string
  due_date:           string
  action_responsible: 'seller' | 'buyer' | 'mediator' | null
  days_open:          number
  urgency:            'urgent' | 'warning' | 'normal'
  order:              ClaimOrder
  resolution:         string
}

export interface ClaimsSummary {
  total_opened:          number
  total_returns:         number
  total_claims:          number
  urgent:                number
  warning:               number
  seller_action_required: number
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json(
      { error: 'Conecte sua conta do Mercado Livre em Integrações.', code: 'NOT_CONNECTED' }
    )
  }

  const token = await getValidToken(user.id)
  if (!token) {
    return NextResponse.json(
      { error: 'Token inválido. Reconecte sua conta.', code: 'NOT_CONNECTED' }
    )
  }

  const auth: Record<string, string> = { Authorization: `Bearer ${token}` }
  const sp     = new URL(req.url).searchParams
  const status = sp.get('status') ?? 'opened'
  const type   = sp.get('type')   ?? 'all'

  try {
    // ── 1. Buscar reclamações ────────────────────────────────────────────────
    const claimsUrl =
      `${ML_API_BASE}/post-purchase/v1/claims/search` +
      `?status=${encodeURIComponent(status)}&limit=50`

    const claimsRes = await fetch(claimsUrl, { headers: auth })

    if (!claimsRes.ok) {
      const txt = await claimsRes.text()
      throw new Error(`ML claims (${claimsRes.status}): ${txt}`)
    }

    const claimsData = await claimsRes.json() as MLClaimsSearchResponse
    let rawClaims: MLClaim[] = claimsData.data ?? []

    // ── 2. Filtrar por tipo ──────────────────────────────────────────────────
    if (type === 'returns') {
      rawClaims = rawClaims.filter(c => isReturn(c.reason_id))
    } else if (type === 'claims') {
      rawClaims = rawClaims.filter(c => !isReturn(c.reason_id))
    }

    // ── 3 → 4. Buscar detalhes dos pedidos em lotes de 5 ────────────────────
    const orderMap = new Map<string, MLOrder>()

    for (let i = 0; i < rawClaims.length; i += ORDER_BATCH) {
      const batch = rawClaims.slice(i, i + ORDER_BATCH)

      const settled = await Promise.allSettled(
        batch.map(claim =>
          fetch(`${ML_API_BASE}/orders/${claim.resource_id}`, { headers: auth })
            .then(async r => {
              if (!r.ok) return null
              return await r.json() as MLOrder
            })
        )
      )

      settled.forEach((result, j) => {
        const claim = batch[j]
        if (!claim) return
        const orderId = String(claim.resource_id)
        if (result.status === 'fulfilled' && result.value) {
          orderMap.set(orderId, result.value)
        }
      })

      if (i + ORDER_BATCH < rawClaims.length) await sleep(150)
    }

    // ── 5. Montar lista final ────────────────────────────────────────────────
    const emptyOrder: ClaimOrder = {
      product_title:     'Produto não identificado',
      product_thumbnail: '',
      buyer_nickname:    'Comprador',
      total_amount:      0,
      order_date:        '',
    }

    const items: ClaimItem[] = rawClaims.map(claim => {
      const orderId = String(claim.resource_id)
      const order   = orderMap.get(orderId)

      const firstItem = order?.order_items?.[0]
      const orderInfo: ClaimOrder = order
        ? {
            product_title:     firstItem?.item?.title     ?? 'Produto não identificado',
            product_thumbnail: firstItem?.item?.thumbnail ?? '',
            buyer_nickname:    order.buyer?.nickname      ?? 'Comprador',
            total_amount:      order.total_amount         ?? 0,
            order_date:        order.date_created         ?? '',
          }
        : emptyOrder

      const days = daysOpen(claim.date_created)

      return {
        claim_id:           claim.id,
        order_id:           orderId,
        status:             claim.status,
        stage:              claim.stage,
        stage_label:        STAGE_LABELS[claim.stage] ?? claim.stage,
        reason_id:          claim.reason_id,
        reason_label:       getReasonLabel(claim.reason_id),
        date_created:       claim.date_created,
        last_updated:       claim.last_updated,
        due_date:           claim.due_date ?? '',
        action_responsible: getActionResponsible(claim.players),
        days_open:          days,
        urgency:            getUrgency(days),
        order:              orderInfo,
        resolution:         claim.resolution ?? '',
      }
    })

    // Ordenar: mais antigas primeiro (mais urgentes)
    items.sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime())

    // ── 6. Summary ───────────────────────────────────────────────────────────
    const allOpened = claimsData.data ?? []  // total before type filter
    const summary: ClaimsSummary = {
      total_opened:           allOpened.length,
      total_returns:          allOpened.filter(c => isReturn(c.reason_id)).length,
      total_claims:           allOpened.filter(c => !isReturn(c.reason_id)).length,
      urgent:                 items.filter(c => c.urgency === 'urgent').length,
      warning:                items.filter(c => c.urgency === 'warning').length,
      seller_action_required: items.filter(c => c.action_responsible === 'seller').length,
    }

    return NextResponse.json(
      { summary, items },
      { headers: { 'Cache-Control': 'private, max-age=120' } }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML reclamacoes GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
