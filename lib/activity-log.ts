/**
 * Activity logging helper for Foguetim ERP.
 * Fail-silent: logging errors never break the main flow.
 */
import { supabase, isConfigured } from './supabase'

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type LogCategory =
  | 'auth'
  | 'account'
  | 'company'
  | 'notifications'
  | 'products'
  | 'orders'
  | 'billing'
  | 'security'
  | 'system'

export type LogVisibility = 'user' | 'support' | 'admin'

export interface LogActivityParams {
  action:      string
  category:    LogCategory
  description: string
  metadata?:   Record<string, unknown>
  visibility?: LogVisibility
}

export interface ActivityLog {
  id:          string
  user_id:     string
  action:      string
  category:    LogCategory
  description: string
  metadata:    Record<string, unknown>
  ip_address:  string | null
  user_agent:  string | null
  visibility:  LogVisibility
  created_at:  string
}

/* ── Category display config ────────────────────────────────────────────────── */

export const CATEGORY_CONFIG: Record<LogCategory, { label: string; cls: string }> = {
  auth:          { label: 'Autenticação',   cls: 'bg-blue-900/30   text-blue-400   ring-1 ring-blue-700/30'   },
  account:       { label: 'Conta',          cls: 'bg-purple-900/30 text-purple-400 ring-1 ring-purple-700/30' },
  company:       { label: 'Empresa',        cls: 'bg-cyan-900/30   text-cyan-400   ring-1 ring-cyan-700/30'   },
  notifications: { label: 'Notificações',   cls: 'bg-amber-900/30  text-amber-400  ring-1 ring-amber-700/30'  },
  products:      { label: 'Produtos',       cls: 'bg-green-900/30  text-green-400  ring-1 ring-green-700/30'  },
  orders:        { label: 'Pedidos',        cls: 'bg-orange-900/30 text-orange-400 ring-1 ring-orange-700/30' },
  billing:       { label: 'Assinatura',     cls: 'bg-indigo-900/30 text-indigo-400 ring-1 ring-indigo-700/30' },
  security:      { label: 'Segurança',      cls: 'bg-red-900/30    text-red-400    ring-1 ring-red-700/30'    },
  system:        { label: 'Sistema',        cls: 'bg-slate-800     text-slate-400  ring-1 ring-slate-600'     },
}

/* ── Client-side logger ─────────────────────────────────────────────────────── */

/**
 * Logs a user action to the activity_logs table via a server-side API route
 * so that the real client IP can be captured from request headers.
 * Safe to call from any client component — silently fails if not configured.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  if (!isConfigured()) return // dev mode: skip

  try {
    await fetch('/api/log-activity', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:      params.action,
        category:    params.category,
        description: params.description,
        metadata:    params.metadata ?? {},
        visibility:  params.visibility ?? 'user',
        user_agent:  typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
      }),
    })
  } catch {
    // Fail silently — logging should never interrupt the user flow
  }
}

/* ── Fetch logs for current user ────────────────────────────────────────────── */

export interface FetchLogsOptions {
  category?: LogCategory | 'all'
  limit?:    number
  offset?:   number
}

export async function fetchActivityLogs(
  opts: FetchLogsOptions = {}
): Promise<{ logs: ActivityLog[]; total: number }> {
  if (!isConfigured()) {
    return { logs: MOCK_LOGS, total: MOCK_LOGS.length }
  }

  const limit  = opts.limit  ?? 50
  const offset = opts.offset ?? 0

  try {
    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (opts.category && opts.category !== 'all') {
      query = query.eq('category', opts.category)
    }

    const { data, error, count } = await query
    if (error) throw error

    return {
      logs:  (data ?? []) as ActivityLog[],
      total: count ?? 0,
    }
  } catch {
    return { logs: [], total: 0 }
  }
}

/* ── Mock data (dev mode) ───────────────────────────────────────────────────── */

const MOCK_LOGS: ActivityLog[] = [
  {
    id: '1', user_id: 'dev', action: 'login', category: 'auth',
    description: 'Login realizado com sucesso',
    metadata: {}, ip_address: null, user_agent: null,
    visibility: 'user', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: '2', user_id: 'dev', action: 'update_company', category: 'company',
    description: 'Dados da empresa atualizados',
    metadata: { fields: ['razao_social', 'cnpj'] }, ip_address: null, user_agent: null,
    visibility: 'user', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '3', user_id: 'dev', action: 'update_password', category: 'security',
    description: 'Senha alterada com sucesso',
    metadata: {}, ip_address: null, user_agent: null,
    visibility: 'user', created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '4', user_id: 'dev', action: 'create_product', category: 'products',
    description: 'Produto criado: Camiseta Básica Branca',
    metadata: { sku: 'CAM-001' }, ip_address: null, user_agent: null,
    visibility: 'user', created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '5', user_id: 'dev', action: 'update_notifications', category: 'notifications',
    description: 'Preferências de notificação atualizadas',
    metadata: {}, ip_address: null, user_agent: null,
    visibility: 'user', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '6', user_id: 'dev', action: 'logout', category: 'auth',
    description: 'Sessão encerrada',
    metadata: {}, ip_address: null, user_agent: null,
    visibility: 'user', created_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
  },
]
