/**
 * GET /api/admin/reset-shopee-test-user
 * Rota temporária — reseta a senha da conta de teste da Shopee via Supabase Admin SDK.
 * APAGAR após confirmar que o login funciona.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const TARGET_USER_ID = '0cb40abb-f46f-4614-b626-77dc255c91ea'
const TARGET_EMAIL   = 'shopeeteste@foguetim.com.br'

export async function GET() {
  const db = supabaseAdmin()

  // 1. Resetar senha via Admin SDK (usa o bcrypt interno do Supabase)
  const { data: updated, error: updateErr } = await db.auth.admin.updateUserById(
    TARGET_USER_ID,
    {
      password:       'ShopeeTest2026!Fgt',
      email_confirm:  true,
    }
  )

  if (updateErr) {
    console.error('[reset-shopee-test-user] updateUserById error:', updateErr.message)
    return NextResponse.json({ ok: false, step: 'updateUserById', error: updateErr.message }, { status: 500 })
  }

  // 2. Confirmar que o perfil público existe com o plano correto
  const { data: profile, error: profileErr } = await db
    .from('users')
    .select('id, email, role, plan')
    .eq('id', TARGET_USER_ID)
    .maybeSingle()

  return NextResponse.json({
    ok:          true,
    authUser:    { id: updated.user.id, email: updated.user.email },
    profile:     profileErr ? { error: profileErr.message } : profile,
    instruction: 'Senha resetada. Tente logar em app.foguetim.com.br com shopeeteste@foguetim.com.br / ShopeeTest2026!Fgt',
  })
}
