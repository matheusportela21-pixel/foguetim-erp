/**
 * POST /api/security/otp/request
 *
 * Gera e envia um OTP de 6 dígitos para o e-mail do usuário.
 * Rate limit: máx 3 requisições por action_type em 15 minutos.
 *
 * Body: { action_type: string, context?: Record<string, unknown> }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes }   from 'crypto'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { sendEmail }                 from '@/lib/email/email.service'
import { otpVerificationTemplate }   from '@/lib/email/templates/otp-verification'

const OTP_EXPIRY_MINUTES = 10
const RATE_LIMIT_MAX     = 3
const RATE_LIMIT_WINDOW  = 15 * 60 * 1000 // 15 min

function generateOtp(): string {
  // 6 dígitos numéricos
  const bytes = randomBytes(4)
  const num   = bytes.readUInt32BE(0) % 1_000_000
  return num.toString().padStart(6, '0')
}

function hashOtp(otp: string, salt: string): string {
  return createHash('sha256').update(`${otp}:${salt}`).digest('hex')
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const body        = await req.json()
    const { action_type, context } = body as { action_type: string; context?: Record<string, unknown> }

    if (!action_type) {
      return NextResponse.json({ error: 'action_type obrigatório' }, { status: 400 })
    }

    // Rate limit: contar requests nas últimas 15 min para este user+action_type
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString()
    const { count } = await db
      .from('security_otp')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', action_type)
      .gte('created_at', since)

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Limite de tentativas atingido. Aguarde 15 minutos.' },
        { status: 429 },
      )
    }

    // Invalidar OTPs anteriores pendentes para este user+action_type
    try {
      await db
        .from('security_otp')
        .update({ used: true })
        .eq('user_id', user.id)
        .eq('action_type', action_type)
        .eq('used', false)
    } catch { /* non-critical */ }

    const otp      = generateOtp()
    const salt     = randomBytes(16).toString('hex')
    const otp_hash = hashOtp(otp, salt)
    const expires  = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

    const { data: record, error: insertErr } = await db
      .from('security_otp')
      .insert({
        user_id:     user.id,
        action_type,
        otp_hash,
        salt,
        expires_at:  expires,
        used:        false,
        context:     context ?? null,
      })
      .select('id')
      .single()

    if (insertErr || !record) {
      console.error('[security/otp/request]', insertErr)
      return NextResponse.json({ error: 'Erro ao criar OTP' }, { status: 500 })
    }

    // Buscar email do usuário
    const { data: profile } = await db
      .from('profiles')
      .select('email, name')
      .eq('id', user.id)
      .maybeSingle()

    const email = (profile as { email?: string; name?: string } | null)?.email ?? user.email ?? ''
    const name  = (profile as { email?: string; name?: string } | null)?.name  ?? 'Usuário'

    if (email) {
      const { subject, html } = otpVerificationTemplate({ name, otp, action_type, expiryMinutes: OTP_EXPIRY_MINUTES })
      // Fire-and-forget — não bloquear a resposta
      void sendEmail({ to: email, subject, html })
    }

    return NextResponse.json({
      otp_id:         record.id,
      expires_at:     expires,
      // Em dev, retornar o OTP para facilitar testes (apenas sem SMTP configurado)
      ...(process.env.NODE_ENV === 'development' && !process.env.SMTP_PASS ? { _dev_otp: otp } : {}),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[security/otp/request POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
