/**
 * GET /api/cron/sentinela-check
 * Cron leve do Sentinela — sem IA, sem custo de tokens.
 * Roda a cada 5 minutos. Verifica condições críticas e envia alertas.
 * Schedule: *\/5 * * * *
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { sendEmail }                 from '@/lib/email/email.service'

export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // ── Verificar secret ────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db            = supabaseAdmin()
  const ADMIN_EMAIL   = process.env.ADMIN_ALERT_EMAIL ?? 'contato@foguetim.com.br'
  const since5min     = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const alertsSent: string[] = []

  // ── Check 1: Auth failures in last 5 minutes ────────────────────────────────
  let authFailureCount = 0
  try {
    const { data } = await db
      .from('activity_logs').select('id').eq('acao', 'login_failed').gte('created_at', since5min)
    authFailureCount = (data ?? []).length
  } catch { /* ignore */ }

  // ── Check 2: Expiring ML tokens (within next 1 hour) ────────────────────────
  const in1hour = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  let expiringCount = 0
  try {
    const { data } = await db
      .from('marketplace_connections').select('id, user_id, expires_at')
      .eq('status', 'active').lt('expires_at', in1hour)
    expiringCount = (data ?? []).length
  } catch { /* ignore */ }

  // ── Check 3: DB health ──────────────────────────────────────────────────────
  const { error: dbError } = await db.from('profiles').select('id').limit(1)
  const dbHealthy = !dbError

  // ── Check 4: Error count in activity_logs ───────────────────────────────────
  let errorCount = 0
  try {
    const { data } = await db
      .from('activity_logs').select('id')
      .in('acao', ['error', 'webhook_error', 'payment_error'])
      .gte('created_at', since5min)
    errorCount = (data ?? []).length
  } catch { /* ignore */ }

  // ── Check 5: Webhook errors ─────────────────────────────────────────────────
  let webhookErrorCount = 0
  try {
    const { data } = await db
      .from('webhook_queue').select('id').eq('status', 'error').gte('created_at', since5min)
    webhookErrorCount = (data ?? []).length
  } catch { /* ignore */ }

  // ── Alert rules ─────────────────────────────────────────────────────────────

  // Regra 1: 20+ auth failures in 5min → força bruta
  if (authFailureCount >= 20) {
    const subject = '🚨 [Foguetim] Ataque de força bruta detectado'
    await sendEmail({
      to:      ADMIN_EMAIL,
      subject,
      html:    `
        <p>O sistema detectou <strong>${authFailureCount} falhas de autenticação</strong> nos últimos 5 minutos.</p>
        <p>Isso pode indicar um ataque de força bruta. Verifique imediatamente.</p>
        <p><small>Checado em: ${new Date().toISOString()}</small></p>
      `,
    }).catch(console.error)
    alertsSent.push(subject)
  }

  // Regra 2: DB inacessível
  if (!dbHealthy) {
    const subject = '🚨 [Foguetim] Banco de dados inacessível'
    await sendEmail({
      to:      ADMIN_EMAIL,
      subject,
      html:    `
        <p>O banco de dados está <strong>inacessível</strong> neste momento.</p>
        <p>Erro reportado: ${dbError?.message ?? 'desconhecido'}</p>
        <p><small>Checado em: ${new Date().toISOString()}</small></p>
      `,
    }).catch(console.error)
    alertsSent.push(subject)
  }

  // Regra 3: Token ML ativo já expirado
  let expiredCount = 0
  try {
    const { data } = await db
      .from('marketplace_connections').select('id')
      .eq('status', 'active').lt('expires_at', new Date().toISOString())
    expiredCount = (data ?? []).length
  } catch { /* ignore */ }

  if (expiredCount > 0) {
    const subject = '⚠️ [Foguetim] Token ML expirado'
    await sendEmail({
      to:      ADMIN_EMAIL,
      subject,
      html:    `
        <p>Existem <strong>${expiredCount} conexão(ões)</strong> com o Mercado Livre marcadas como ativas,
        mas com token já expirado.</p>
        <p>Acesse o painel e reconecte a conta do marketplace.</p>
        <p><small>Checado em: ${new Date().toISOString()}</small></p>
      `,
    }).catch(console.error)
    alertsSent.push(subject)
  }

  // ── Montar resultado ─────────────────────────────────────────────────────────
  const resultado = {
    auth_failures_5min:  authFailureCount,
    expiring_tokens:     expiringCount,
    db_healthy:          dbHealthy,
    error_logs_5min:     errorCount,
    webhook_errors_5min: webhookErrorCount,
    alerts_sent:         alertsSent,
    checked_at:          new Date().toISOString(),
  }

  // ── Persistir no banco ───────────────────────────────────────────────────────
  try {
    await db.from('sentinela_checks').insert({
      tipo:     'check_5min',
      resultado,
      alertas:  alertsSent.length > 0 ? { alerts: alertsSent } : null,
    })
  } catch { /* non-critical */ }

  // ── Limpar registros antigos (> 7 dias) ──────────────────────────────────────
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  try {
    await db.from('sentinela_checks').delete().lt('created_at', cutoff)
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true, resultado })
}
