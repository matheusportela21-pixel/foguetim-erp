/**
 * GET /api/mercadolivre/saude
 * Retorna score de saúde da conta ML, KPIs e alertas inteligentes.
 * SOMENTE LEITURA — nenhuma escrita na API do ML.
 *
 * Thresholds oficiais ML Brasil (60 days period):
 *   claims:        verde ≤ 2%,  amarelo ≤ 4.5%, vermelho > 4.5%
 *   cancellations: verde ≤ 1.5%, amarelo ≤ 3.5%, vermelho > 3.5%
 *   delayed:       verde ≤ 10%, amarelo ≤ 18%,  vermelho > 18%
 *   ratings_pos:   verde ≥ 95%, amarelo ≥ 90%,  vermelho < 90%
 */
import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

/* ── Types ──────────────────────────────────────────────────────────────── */

type MetricStatus = 'green' | 'yellow' | 'red' | 'unknown'

interface MetricResult {
  rate:   number        // 0–1 (e.g. 0.02 = 2%)
  pct:    number        // 0–100 display value
  value:  number        // absolute count
  period: string
  status: MetricStatus
  score:  number        // 0–100 contribution
}

interface Alert {
  type:        'critical' | 'warning'
  metric:      string
  title:       string
  description: string
  link:        string
  linkLabel:   string
}

/* ── Threshold helpers ───────────────────────────────────────────────────── */

/** For metrics where LOWER is better (claims, cancellations, delayed) */
function lowerIsBetter(rate: number, green: number, yellow: number): MetricStatus {
  if (rate <= green)  return 'green'
  if (rate <= yellow) return 'yellow'
  return 'red'
}

/** For metrics where HIGHER is better (positive ratings) */
function higherIsBetter(rate: number, green: number, yellow: number): MetricStatus {
  if (rate >= green)  return 'green'
  if (rate >= yellow) return 'yellow'
  return 'red'
}

/** Score 0–100 for a "lower is better" metric */
function scoreL(rate: number, perfect: number, worst: number): number {
  const pct = (worst - rate) / (worst - perfect)
  return Math.round(Math.max(0, Math.min(1, pct)) * 100)
}

/** Score 0–100 for a "higher is better" metric */
function scoreH(rate: number, perfect: number, worst: number): number {
  const pct = (rate - worst) / (perfect - worst)
  return Math.round(Math.max(0, Math.min(1, pct)) * 100)
}

/* ── Score calculation ────────────────────────────────────────────────────── */

function calcOverallScore(
  claims:        number,
  cancellations: number,
  delayed:       number,
  ratingsPos:    number,
): number {
  const s1 = scoreL(claims,        0,    0.08)   // worst = 8%
  const s2 = scoreL(cancellations, 0,    0.04)   // worst = 4%
  const s3 = scoreL(delayed,       0,    0.22)   // worst = 22%
  const s4 = scoreH(ratingsPos,    0.95, 0.70)   // worst = 70%

  // Weights: claims 35%, cancellations 25%, delayed 25%, ratings 15%
  return Math.round(s1 * 0.35 + s2 * 0.25 + s3 * 0.25 + s4 * 0.15)
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Excelente'
  if (score >= 70) return 'Bom'
  if (score >= 50) return 'Atenção necessária'
  return 'Risco de penalização'
}

/* ── Alert generator ─────────────────────────────────────────────────────── */

function buildAlerts(
  claims:        MetricResult,
  cancellations: MetricResult,
  delayed:       MetricResult,
  ratings:       MetricResult,
): Alert[] {
  const alerts: Alert[] = []

  if (claims.status === 'red') {
    alerts.push({
      type: 'critical', metric: 'claims',
      title: `Taxa de reclamações crítica: ${claims.pct.toFixed(1)}%`,
      description: 'Sua taxa de reclamações está acima do limite tolerado pelo ML (4.5%). Isso pode resultar em rebaixamento de nível ou restrição de conta.',
      link: '/dashboard/reclamacoes', linkLabel: 'Ver reclamações',
    })
  } else if (claims.status === 'yellow') {
    alerts.push({
      type: 'warning', metric: 'claims',
      title: `Taxa de reclamações em atenção: ${claims.pct.toFixed(1)}%`,
      description: 'Você está acima do ideal (2%) para o ML. Resolva reclamações abertas para não ultrapassar o limite crítico.',
      link: '/dashboard/reclamacoes', linkLabel: 'Ver reclamações',
    })
  }

  if (cancellations.status === 'red') {
    alerts.push({
      type: 'critical', metric: 'cancellations',
      title: `Taxa de cancelamentos crítica: ${cancellations.pct.toFixed(1)}%`,
      description: 'Cancelamentos acima de 3.5% podem impactar seu nível de reputação no ML. Revise pedidos com problemas.',
      link: '/dashboard/pedidos', linkLabel: 'Ver pedidos',
    })
  } else if (cancellations.status === 'yellow') {
    alerts.push({
      type: 'warning', metric: 'cancellations',
      title: `Taxa de cancelamentos em atenção: ${cancellations.pct.toFixed(1)}%`,
      description: 'Você está acima do ideal (1.5%) para o ML. Evite cancelamentos desnecessários.',
      link: '/dashboard/pedidos', linkLabel: 'Ver pedidos',
    })
  }

  if (delayed.status === 'red') {
    alerts.push({
      type: 'critical', metric: 'delayed',
      title: `Taxa de atraso no manuseio crítica: ${delayed.pct.toFixed(1)}%`,
      description: 'Atrasos acima de 18% afetam diretamente sua reputação. Poste os pedidos dentro do prazo de manuseio.',
      link: '/dashboard/pedidos', linkLabel: 'Ver pedidos',
    })
  } else if (delayed.status === 'yellow') {
    alerts.push({
      type: 'warning', metric: 'delayed',
      title: `Atraso no manuseio em atenção: ${delayed.pct.toFixed(1)}%`,
      description: 'Você está acima do ideal (10%) para o ML. Atenção ao prazo de postagem dos pedidos.',
      link: '/dashboard/pedidos', linkLabel: 'Ver pedidos',
    })
  }

  if (ratings.status === 'red') {
    alerts.push({
      type: 'critical', metric: 'ratings',
      title: `Avaliações positivas baixas: ${ratings.pct.toFixed(1)}%`,
      description: 'Menos de 90% de avaliações positivas indica insatisfação recorrente dos compradores.',
      link: '/dashboard/reviews', linkLabel: 'Ver reviews',
    })
  } else if (ratings.status === 'yellow') {
    alerts.push({
      type: 'warning', metric: 'ratings',
      title: `Avaliações positivas em atenção: ${ratings.pct.toFixed(1)}%`,
      description: 'Você está abaixo do ideal (95%) de avaliações positivas. Melhore o atendimento pós-venda.',
      link: '/dashboard/reviews', linkLabel: 'Ver reviews',
    })
  }

  return alerts
}

/* ── Route handler ───────────────────────────────────────────────────────── */

export async function GET() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ connected: false })
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) {
    return NextResponse.json({ connected: false, tokenExpired: true })
  }

  const auth = { Authorization: `Bearer ${token}` }
  const mlId = conn.ml_user_id

  try {
    const res = await fetch(`${ML_API_BASE}/users/${mlId}`, { headers: auth })

    if (res.status === 403) {
      return NextResponse.json({ connected: false, tokenExpired: true })
    }
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`ML users (${res.status}): ${txt}`)
    }

    const data = await res.json()
    const rep  = data.seller_reputation ?? {}
    const m    = rep.metrics ?? {}
    const tx   = rep.transactions ?? {}

    /* Extract raw rates (0–1) */
    const claimsRate  = m.claims?.rate                   ?? 0
    const cancelRate  = m.cancellations?.rate             ?? 0
    const delayedRate = m.delayed_handling_time?.rate     ?? 0
    const ratingsPos  = tx.ratings?.positive              ?? 1  // default 100% if no data

    /* Build metric results */
    const claims: MetricResult = {
      rate: claimsRate, pct: claimsRate * 100,
      value: m.claims?.value ?? 0,
      period: m.claims?.period ?? '60 days',
      status: lowerIsBetter(claimsRate, 0.02, 0.045),
      score: scoreL(claimsRate, 0, 0.08),
    }

    const cancellations: MetricResult = {
      rate: cancelRate, pct: cancelRate * 100,
      value: m.cancellations?.value ?? 0,
      period: m.cancellations?.period ?? '60 days',
      status: lowerIsBetter(cancelRate, 0.015, 0.035),
      score: scoreL(cancelRate, 0, 0.04),
    }

    const delayed: MetricResult = {
      rate: delayedRate, pct: delayedRate * 100,
      value: m.delayed_handling_time?.value ?? 0,
      period: m.delayed_handling_time?.period ?? '60 days',
      status: lowerIsBetter(delayedRate, 0.10, 0.18),
      score: scoreL(delayedRate, 0, 0.22),
    }

    const ratings: MetricResult = {
      rate: ratingsPos, pct: ratingsPos * 100,
      value: 0,
      period: tx.period ?? 'historic',
      status: higherIsBetter(ratingsPos, 0.95, 0.90),
      score: scoreH(ratingsPos, 0.95, 0.70),
    }

    const score = calcOverallScore(claimsRate, cancelRate, delayedRate, ratingsPos)
    const alerts = buildAlerts(claims, cancellations, delayed, ratings)

    return NextResponse.json({
      connected:           true,
      nickname:            data.nickname ?? conn.ml_nickname,
      level_id:            rep.level_id            ?? null,
      power_seller_status: rep.power_seller_status ?? null,
      score,
      scoreLabel:          scoreLabel(score),
      metrics: { claims, cancellations, delayed, ratings },
      alerts,
      transactions: {
        completed: tx.completed ?? 0,
        canceled:  tx.canceled  ?? 0,
        total:     tx.total     ?? 0,
        period:    tx.period    ?? 'historic',
      },
      sales_period: m.sales?.period ?? '60 days',
      sales_completed: m.sales?.completed ?? 0,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML saude GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
