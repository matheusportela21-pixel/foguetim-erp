/**
 * lib/rate-limit.ts
 * Rate limiter persistido via Supabase — sobrevive a cold starts do Vercel.
 *
 * Usa a tabela `rate_limits` (key TEXT PK, count INT, window_start TIMESTAMPTZ).
 * Cleanup automático: entradas com window_start + windowMs expiradas são ignoradas.
 *
 * Uso:
 *   const { allowed, remaining, retryAfter } = await checkRateLimit(
 *     `user:${userId}:/api/mercadolivre/items`, 10, 60_000
 *   )
 *   if (!allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
 */
import { supabaseAdmin } from './supabase-admin'

export interface RateLimitResult {
  allowed:     boolean
  remaining:   number
  retryAfter?: number  // segundos até reset da janela (só presente quando !allowed)
}

/**
 * Verifica e incrementa o contador de rate limit para um identificador.
 * @param identifier  Chave única — ex: 'user:uuid:/api/mercadolivre/items'
 * @param limit       Máximo de requisições permitidas na janela
 * @param windowMs    Duração da janela em milissegundos
 */
export async function checkRateLimit(
  identifier: string,
  limit:       number,
  windowMs:    number,
): Promise<RateLimitResult> {
  const db = supabaseAdmin()

  try {
    const now        = Date.now()
    const windowSecs = Math.ceil(windowMs / 1000)

    // Buscar registro atual
    const { data: existing } = await db
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', identifier)
      .maybeSingle()

    if (!existing) {
      // Primeira requisição — criar registro
      await db.from('rate_limits').insert({
        key:          identifier,
        count:        1,
        window_start: new Date(now).toISOString(),
      })
      return { allowed: true, remaining: limit - 1 }
    }

    const windowStart   = new Date(existing.window_start).getTime()
    const windowExpired = now - windowStart >= windowMs

    if (windowExpired) {
      // Janela expirada — resetar
      await db
        .from('rate_limits')
        .update({ count: 1, window_start: new Date(now).toISOString() })
        .eq('key', identifier)
      return { allowed: true, remaining: limit - 1 }
    }

    const currentCount = existing.count as number
    if (currentCount >= limit) {
      // Limite atingido — calcular quando a janela reseta
      const resetAt    = windowStart + windowMs
      const retryAfter = Math.ceil((resetAt - now) / 1000)
      return { allowed: false, remaining: 0, retryAfter }
    }

    // Incrementar contador
    await db
      .from('rate_limits')
      .update({ count: currentCount + 1 })
      .eq('key', identifier)

    return { allowed: true, remaining: limit - currentCount - 1 }

  } catch (err) {
    // Se Supabase falhar, permitir a requisição (graceful degradation)
    console.error('[rate-limit] DB error — allowing request:', err)
    return { allowed: true, remaining: limit }
  }
}

/**
 * Limpa entradas expiradas da tabela rate_limits.
 * Chamar periodicamente (ex: via cron) para manter a tabela pequena.
 */
export async function cleanupRateLimits(windowMs: number): Promise<void> {
  const db      = supabaseAdmin()
  const cutoff  = new Date(Date.now() - windowMs).toISOString()
  await db.from('rate_limits').delete().lt('window_start', cutoff)
}

/**
 * Constrói o identificador padrão de rate limit para um usuário + rota.
 */
export function rateLimitKey(userId: string, route: string): string {
  return `user:${userId}:${route}`
}

/**
 * Retorna headers HTTP padrão para rate limit (RFC 6585).
 */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit':     String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
  }
  if (!result.allowed && result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter)
  }
  return headers
}
