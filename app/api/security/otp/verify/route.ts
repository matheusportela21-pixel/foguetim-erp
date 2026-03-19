/**
 * POST /api/security/otp/verify
 *
 * Verifica o OTP enviado pelo usuário.
 * Em caso de sucesso, marca o OTP como usado e registra em security_audit.
 *
 * Body: { otp_id: string, otp: string, action_type: string }
 * Returns: { verified: true, token: string } ou { error: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes }   from 'crypto'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

function hashOtp(otp: string, salt: string): string {
  return createHash('sha256').update(`${otp}:${salt}`).digest('hex')
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    // Aceita tanto 'otp' quanto 'code' para compatibilidade com o componente OtpConfirmation
    const otp_id      = body.otp_id      as string | undefined
    const otp         = (body.otp ?? body.code) as string | undefined
    const action_type = body.action_type as string | undefined

    if (!otp_id || !otp) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: otp_id, otp (ou code)' },
        { status: 400 },
      )
    }

    const { data: record } = await db
      .from('security_otp')
      .select('id, otp_hash, salt, expires_at, used, action_type')
      .eq('id', otp_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!record) {
      return NextResponse.json({ error: 'OTP inválido' }, { status: 400 })
    }

    const r = record as {
      id:          string
      otp_hash:    string
      salt:        string
      expires_at:  string
      used:        boolean
      action_type: string
    }

    if (r.used) {
      return NextResponse.json({ error: 'OTP já utilizado' }, { status: 400 })
    }

    // Se action_type foi fornecido, validar coerência
    if (action_type && r.action_type !== action_type) {
      return NextResponse.json({ error: 'OTP inválido para esta ação' }, { status: 400 })
    }

    if (new Date(r.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP expirado' }, { status: 400 })
    }

    const hash = hashOtp(otp.trim(), r.salt)
    if (hash !== r.otp_hash) {
      // Registrar tentativa inválida
      try {
        await db.from('security_audit').insert({
          user_id:     user.id,
          action_type,
          otp_id:      otp_id,
          success:     false,
          ip_address:  req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
          user_agent:  req.headers.get('user-agent') ?? null,
        })
      } catch { /* non-critical */ }

      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    // Marcar como usado
    try {
      await db
        .from('security_otp')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', otp_id)
    } catch { /* non-critical */ }

    // Gerar token de autorização curto-prazo (válido por 5 min, para uso no frontend)
    const authToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(authToken).digest('hex')
    const tokenExp  = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Persistir token hash no audit para validação downstream se necessário
    try {
      await db.from('security_audit').insert({
        user_id:      user.id,
        action_type,
        otp_id,
        success:      true,
        auth_token:   tokenHash,
        token_exp:    tokenExp,
        ip_address:   req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
        user_agent:   req.headers.get('user-agent') ?? null,
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      verified:   true,
      token:      authToken,
      expires_at: tokenExp,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[security/otp/verify POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
