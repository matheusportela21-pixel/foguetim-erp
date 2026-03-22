/**
 * lib/alerts/helpers.ts
 * CRUD helpers para o sistema de alertas.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AlertType, AlertSeverity, AlertChannel, AlertSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

/**
 * Cria um alerta, evitando duplicatas (mesmo type + metadata key ativo).
 */
export async function createAlert(params: {
  userId:       string
  type:         AlertType
  severity:     AlertSeverity
  title:        string
  message:      string
  metadata?:    Record<string, unknown>
  channel?:     AlertChannel
  actionUrl?:   string
  actionLabel?: string
}): Promise<void> {
  const db = supabaseAdmin()

  // Deduplicate: check for existing active alert of same type
  const metaKey = params.metadata ? JSON.stringify(params.metadata) : '{}'
  const { data: existing } = await db
    .from('alerts')
    .select('id')
    .eq('user_id', params.userId)
    .eq('type', params.type)
    .is('resolved_at', null)
    .eq('is_dismissed', false)
    .limit(1)
    .maybeSingle()

  // If there's already an active alert of the same type, skip
  if (existing) return

  await db.from('alerts').insert({
    user_id:      params.userId,
    type:         params.type,
    severity:     params.severity,
    title:        params.title,
    message:      params.message,
    metadata:     params.metadata ?? {},
    channel:      params.channel ?? 'system',
    action_url:   params.actionUrl ?? null,
    action_label: params.actionLabel ?? null,
  })
}

/**
 * Resolve alertas de um tipo específico (condição corrigida).
 */
export async function resolveAlerts(userId: string, type: AlertType): Promise<void> {
  await supabaseAdmin()
    .from('alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('type', type)
    .is('resolved_at', null)
}

/**
 * Contagem de alertas não lidos e não dispensados.
 */
export async function getUnreadAlertCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin()
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .eq('is_dismissed', false)
    .is('resolved_at', null)

  return count ?? 0
}

/**
 * Busca configurações de alerta do usuário (ou default).
 */
export async function getAlertSettings(userId: string): Promise<AlertSettings> {
  const { data } = await supabaseAdmin()
    .from('alert_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return DEFAULT_SETTINGS

  return {
    stock_low_threshold:     data.stock_low_threshold ?? DEFAULT_SETTINGS.stock_low_threshold,
    stock_low_enabled:       data.stock_low_enabled ?? DEFAULT_SETTINGS.stock_low_enabled,
    stock_zero_enabled:      data.stock_zero_enabled ?? DEFAULT_SETTINGS.stock_zero_enabled,
    margin_low_threshold:    data.margin_low_threshold ?? DEFAULT_SETTINGS.margin_low_threshold,
    negative_margin_enabled: data.negative_margin_enabled ?? DEFAULT_SETTINGS.negative_margin_enabled,
    token_expiring_enabled:  data.token_expiring_enabled ?? DEFAULT_SETTINGS.token_expiring_enabled,
    pending_ship_hours:      data.pending_ship_hours ?? DEFAULT_SETTINGS.pending_ship_hours,
    pending_ship_enabled:    data.pending_ship_enabled ?? DEFAULT_SETTINGS.pending_ship_enabled,
    claim_enabled:           data.claim_enabled ?? DEFAULT_SETTINGS.claim_enabled,
    unanswered_hours:        data.unanswered_hours ?? DEFAULT_SETTINGS.unanswered_hours,
    unanswered_enabled:      data.unanswered_enabled ?? DEFAULT_SETTINGS.unanswered_enabled,
    notify_email:            data.notify_email ?? DEFAULT_SETTINGS.notify_email,
    notify_dashboard:        data.notify_dashboard ?? DEFAULT_SETTINGS.notify_dashboard,
  }
}
