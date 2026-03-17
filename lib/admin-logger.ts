/**
 * Server-side admin action logger.
 * Use in API routes (not client components) to record admin actions in activity_logs.
 * Fail-silent: logging errors never break the main flow.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AdminLogParams {
  userId:      string
  userEmail?:  string
  action:      string
  category:    'produtos' | 'financeiro' | 'admin' | 'config' | 'auth' | 'integracao'
  description: string
  metadata?:   Record<string, unknown>
  ip?:         string
}

export async function logAdminAction(params: AdminLogParams): Promise<void> {
  try {
    await supabaseAdmin()
      .from('activity_logs')
      .insert({
        user_id:     params.userId,
        action:      params.action,
        category:    params.category,
        description: params.description,
        metadata:    { ...(params.metadata ?? {}), ...(params.ip ? { ip: params.ip } : {}) },
        visibility:  'admin',
      })
  } catch (e) {
    console.error('[AdminLogger] Falhou:', e)
  }
}
