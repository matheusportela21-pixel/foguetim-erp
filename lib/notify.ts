/**
 * lib/notify.ts
 * Helper server-side para criar notificações na tabela notifications.
 * Usa service role — só chamar em API routes / Server Actions.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface CreateNotificationParams {
  userId:    string
  title:     string
  message:   string
  type?:     'info' | 'warning' | 'error' | 'success'
  category?: 'system' | 'orders' | 'claims' | 'products' | 'financial' | 'integration'
  actionUrl?: string
}

export async function createNotification({
  userId,
  title,
  message,
  type     = 'info',
  category = 'system',
  actionUrl,
}: CreateNotificationParams): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('notifications')
    .insert({
      user_id:    userId,
      title,
      message,
      type,
      category,
      action_url: actionUrl ?? null,
    })

  if (error) {
    // Log but never throw — notifications are non-critical
    console.error('[notify] Erro ao criar notificação:', error.message)
  }
}
