/**
 * lib/alerts/engine.ts
 * Engine que executa todas as verificações de alerta para um usuário.
 * Cada check: verifica condição → cria alerta se nova → resolve se condição mudou.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAlert, resolveAlerts, getAlertSettings } from './helpers'
import type { AlertSettings } from './types'
import { getPlanLimits } from '@/lib/plan-limits'

/**
 * Executa todas as verificações de alerta para um usuário.
 */
export async function runAlertChecks(userId: string): Promise<void> {
  const settings = await getAlertSettings(userId)

  await Promise.allSettled([
    checkStockLow(userId, settings),
    checkStockZero(userId, settings),
    checkTokenExpiring(userId, settings),
    checkPlanLimits(userId),
    checkNegativeMargin(userId, settings),
  ])
}

// ─── Stock Low ───────────────────────────────────────────────────────────────

async function checkStockLow(userId: string, settings: AlertSettings) {
  if (!settings.stock_low_enabled) return

  const db = supabaseAdmin()
  const threshold = settings.stock_low_threshold

  const { data: lowStock } = await db
    .from('products')
    .select('id, name, sku, stock_real')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .gt('stock_real', 0)
    .lte('stock_real', threshold)
    .limit(10)

  if (lowStock && lowStock.length > 0) {
    const names = lowStock.slice(0, 3).map((p: { name: string }) => p.name).join(', ')
    const extra = lowStock.length > 3 ? ` e mais ${lowStock.length - 3}` : ''
    await createAlert({
      userId,
      type:      'stock_low',
      severity:  'warning',
      title:     `${lowStock.length} produto(s) com estoque baixo`,
      message:   `${names}${extra} estão com estoque abaixo de ${threshold} unidades.`,
      channel:   'system',
      actionUrl: '/dashboard/armazem',
      actionLabel: 'Ver estoque',
      metadata:  { count: lowStock.length, threshold },
    })
  } else {
    await resolveAlerts(userId, 'stock_low')
  }
}

// ─── Stock Zero ──────────────────────────────────────────────────────────────

async function checkStockZero(userId: string, settings: AlertSettings) {
  if (!settings.stock_zero_enabled) return

  const db = supabaseAdmin()

  const { data: zeroStock } = await db
    .from('products')
    .select('id, name, sku')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .eq('stock_real', 0)
    .limit(10)

  if (zeroStock && zeroStock.length > 0) {
    const names = zeroStock.slice(0, 3).map((p: { name: string }) => p.name).join(', ')
    const extra = zeroStock.length > 3 ? ` e mais ${zeroStock.length - 3}` : ''
    await createAlert({
      userId,
      type:      'stock_zero',
      severity:  'critical',
      title:     `${zeroStock.length} produto(s) com estoque zerado`,
      message:   `${names}${extra} estão com estoque 0. Risco de cancelamento automático.`,
      channel:   'system',
      actionUrl: '/dashboard/armazem',
      actionLabel: 'Repor estoque',
      metadata:  { count: zeroStock.length },
    })
  } else {
    await resolveAlerts(userId, 'stock_zero')
  }
}

// ─── Token Expiring ──────────────────────────────────────────────────────────

async function checkTokenExpiring(userId: string, settings: AlertSettings) {
  if (!settings.token_expiring_enabled) return

  const db = supabaseAdmin()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: expiring } = await db
    .from('marketplace_connections')
    .select('marketplace, ml_nickname, expires_at')
    .eq('user_id', userId)
    .eq('connected', true)
    .lt('expires_at', in24h)

  if (expiring && expiring.length > 0) {
    for (const conn of expiring as { marketplace: string; ml_nickname: string; expires_at: string }[]) {
      const isExpired = new Date(conn.expires_at) < new Date()
      await createAlert({
        userId,
        type:     isExpired ? 'token_expired' : 'token_expiring',
        severity: isExpired ? 'critical' : 'warning',
        title:    isExpired
          ? `Token ${conn.marketplace} expirou`
          : `Token ${conn.marketplace} expira em breve`,
        message:  isExpired
          ? `O token de ${conn.ml_nickname ?? conn.marketplace} expirou. Reconecte para continuar usando.`
          : `O token de ${conn.ml_nickname ?? conn.marketplace} expira nas próximas 24h. Recomendamos reconectar.`,
        channel:  conn.marketplace as 'mercadolivre' | 'shopee' | 'magalu',
        actionUrl: '/dashboard/integracoes',
        actionLabel: 'Reconectar',
        metadata:  { marketplace: conn.marketplace, expires_at: conn.expires_at },
      })
    }
  } else {
    await resolveAlerts(userId, 'token_expiring')
    await resolveAlerts(userId, 'token_expired')
  }
}

// ─── Plan Limits ─────────────────────────────────────────────────────────────

async function checkPlanLimits(userId: string) {
  const db = supabaseAdmin()

  const { data: profile } = await db.from('users').select('plan').eq('id', userId).single()
  if (!profile) return

  const limits = getPlanLimits(profile.plan)

  // Check products
  const { count: productCount } = await db
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (productCount != null && limits.maxProducts !== Infinity && productCount >= limits.maxProducts * 0.9) {
    await createAlert({
      userId,
      type:     'plan_limit_near',
      severity: 'warning',
      title:    'Limite de produtos próximo',
      message:  `Você está usando ${productCount} de ${limits.maxProducts} produtos do plano ${limits.label}. Considere fazer upgrade.`,
      actionUrl: '/planos',
      actionLabel: 'Ver planos',
      metadata:  { resource: 'products', current: productCount, limit: limits.maxProducts },
    })
  } else {
    await resolveAlerts(userId, 'plan_limit_near')
  }
}

// ─── Negative Margin ─────────────────────────────────────────────────────────

async function checkNegativeMargin(userId: string, settings: AlertSettings) {
  if (!settings.negative_margin_enabled) return

  const db = supabaseAdmin()

  // Check products where cost_price > sale_price (simplified margin check)
  const { data: negativeProducts } = await db
    .from('products')
    .select('id, name, cost_price, sale_price')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .not('cost_price', 'is', null)
    .not('sale_price', 'is', null)
    .gt('cost_price', 0)
    .limit(20)

  const negative = (negativeProducts ?? []).filter(
    (p: { cost_price: number; sale_price: number }) => p.cost_price > p.sale_price
  )

  if (negative.length > 0) {
    const names = negative.slice(0, 3).map((p: { name: string }) => p.name).join(', ')
    await createAlert({
      userId,
      type:      'negative_margin',
      severity:  'critical',
      title:     `${negative.length} produto(s) com margem negativa`,
      message:   `${names} estão vendendo abaixo do custo. Revise os preços urgentemente.`,
      actionUrl: '/dashboard/precificacao',
      actionLabel: 'Revisar preços',
      metadata:  { count: negative.length },
    })
  } else {
    await resolveAlerts(userId, 'negative_margin')
  }
}
