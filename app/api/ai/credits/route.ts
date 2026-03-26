/**
 * GET  /api/ai/credits — saldo de créditos de IA do usuário
 * POST /api/ai/credits — adicionar créditos (admin)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const db = supabaseAdmin()

  let { data: credits } = await db
    .from('ai_credits')
    .select('credits_total, credits_used')
    .eq('user_id', dataOwnerId)
    .single()

  // Se não existe, criar registro com 0 créditos
  if (!credits) {
    const { data: newRow } = await db
      .from('ai_credits')
      .insert({ user_id: dataOwnerId, credits_total: 0, credits_used: 0 })
      .select('credits_total, credits_used')
      .single()

    credits = newRow ?? { credits_total: 0, credits_used: 0 }
  }

  return NextResponse.json({
    credits_total: credits.credits_total,
    credits_used: credits.credits_used,
    credits_remaining: credits.credits_total - credits.credits_used,
  })
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('settings:edit')
  if (authError) return authError

  const body = await req.json() as { credits?: number }
  const creditsToAdd = body.credits

  if (!creditsToAdd || creditsToAdd <= 0) {
    return NextResponse.json({ error: 'Quantidade de créditos inválida' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Buscar saldo atual
  let { data: current } = await db
    .from('ai_credits')
    .select('credits_total, credits_used')
    .eq('user_id', dataOwnerId)
    .single()

  if (!current) {
    // Criar registro
    const { data: newRow, error: insertErr } = await db
      .from('ai_credits')
      .insert({
        user_id: dataOwnerId,
        credits_total: creditsToAdd,
        credits_used: 0,
        last_purchase_at: new Date().toISOString(),
      })
      .select('credits_total, credits_used')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
    current = newRow
  } else {
    // Atualizar
    const { data: updated, error: updateErr } = await db
      .from('ai_credits')
      .update({
        credits_total: current.credits_total + creditsToAdd,
        last_purchase_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', dataOwnerId)
      .select('credits_total, credits_used')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
    current = updated
  }

  const total = current?.credits_total ?? 0
  const used = current?.credits_used ?? 0

  return NextResponse.json({
    success: true,
    credits_total: total,
    credits_used: used,
    credits_remaining: total - used,
  })
}
