/**
 * lib/ai-rate-limit.ts
 * Controla o uso de IA por usuário/dia para evitar abuso de custos.
 * Usa a tabela ai_usage no Supabase (server-side only).
 */
import { createClient } from '@supabase/supabase-js'

const PLAN_DAILY_LIMITS: Record<string, number> = {
  explorador:      10,
  piloto:          30,
  crescimento:     30,
  comandante:     100,
  almirante:      300,
  missao_espacial: 1000,
  enterprise:     1000,
}

const DEFAULT_LIMIT = 10

function getAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? ''
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY   ?? ''
  return createClient(url, roleKey, { auth: { persistSession: false } })
}

export async function checkAIRateLimit(
  userId:  string,
  feature: string,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const db = getAdminClient()

    // Get user plan
    const { data: userRow } = await db
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single()

    const plan  = (userRow as { plan?: string } | null)?.plan ?? 'explorador'
    const limit = PLAN_DAILY_LIMITS[plan] ?? DEFAULT_LIMIT

    // Count calls today (UTC)
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)

    const { count } = await db
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())

    const used      = count ?? 0
    const remaining = Math.max(0, limit - used)
    const allowed   = used < limit

    // Log this call (fire & forget)
    if (allowed) {
      void db.from('ai_usage').insert({ user_id: userId, feature })
    }

    return { allowed, remaining }
  } catch {
    // If DB unreachable, allow (graceful degradation)
    return { allowed: true, remaining: 99 }
  }
}
