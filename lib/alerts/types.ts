/**
 * lib/alerts/types.ts
 * Tipos e constantes do sistema de alertas inteligentes.
 */

export type AlertType =
  // Estoque
  | 'stock_low'
  | 'stock_zero'
  | 'stock_divergence'
  // Financeiro
  | 'negative_margin'
  | 'low_margin'
  | 'revenue_drop'
  // Integrações
  | 'token_expiring'
  | 'token_expired'
  | 'api_error_rate'
  // Pedidos
  | 'order_pending_ship'
  | 'order_late_ship'
  | 'order_cancelled'
  | 'claim_opened'
  // SAC
  | 'question_unanswered'
  | 'message_unread'
  // Sistema
  | 'plan_limit_near'
  | 'cron_failed'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertChannel = 'mercadolivre' | 'shopee' | 'magalu' | 'system'

export interface Alert {
  id:           string
  user_id:      string
  type:         AlertType
  severity:     AlertSeverity
  title:        string
  message:      string
  metadata:     Record<string, unknown>
  channel:      AlertChannel
  is_read:      boolean
  is_dismissed: boolean
  action_url:   string | null
  action_label: string | null
  created_at:   string
  resolved_at:  string | null
  expires_at:   string | null
}

export interface AlertSettings {
  stock_low_threshold:      number
  stock_low_enabled:        boolean
  stock_zero_enabled:       boolean
  margin_low_threshold:     number
  negative_margin_enabled:  boolean
  token_expiring_enabled:   boolean
  pending_ship_hours:       number
  pending_ship_enabled:     boolean
  claim_enabled:            boolean
  unanswered_hours:         number
  unanswered_enabled:       boolean
  notify_email:             boolean
  notify_dashboard:         boolean
}

export const SEVERITY_CFG: Record<AlertSeverity, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: 'Crítico',  color: 'text-red-400',    bg: 'bg-red-500/10',    dot: 'bg-red-500' },
  warning:  { label: 'Aviso',    color: 'text-amber-400',  bg: 'bg-amber-500/10',  dot: 'bg-amber-500' },
  info:     { label: 'Info',     color: 'text-blue-400',   bg: 'bg-blue-500/10',   dot: 'bg-blue-500' },
}

export const DEFAULT_SETTINGS: AlertSettings = {
  stock_low_threshold:     5,
  stock_low_enabled:       true,
  stock_zero_enabled:      true,
  margin_low_threshold:    10.0,
  negative_margin_enabled: true,
  token_expiring_enabled:  true,
  pending_ship_hours:      24,
  pending_ship_enabled:    true,
  claim_enabled:           true,
  unanswered_hours:        4,
  unanswered_enabled:      true,
  notify_email:            false,
  notify_dashboard:        true,
}
