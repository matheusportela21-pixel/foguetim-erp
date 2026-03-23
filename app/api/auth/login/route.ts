/**
 * POST /api/auth/login
 * SEC-020: Login com rate limiting server-side.
 * 5 tentativas por IP a cada 15 minutos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const LIMIT     = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // Rate limit por IP
  const rl = await checkRateLimit(`auth:login:${ip}`, LIMIT, WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${rl.retryAfter}s.` },
      { status: 429, headers: rateLimitHeaders(rl, LIMIT) },
    )
  }

  const { email, password } = await req.json() as { email: string; password: string }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha obrigatórios.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 500 })
  }

  const supabase = createClient(url, key)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json(
      { error: 'Email ou senha inválidos.' },
      { status: 401, headers: rateLimitHeaders(rl, LIMIT) },
    )
  }

  // Retorna session para o client setar
  return NextResponse.json({
    session: data.session,
    user: data.user,
  }, { headers: rateLimitHeaders(rl, LIMIT) })
}
