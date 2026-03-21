/**
 * GET /api/admin/reset-shopee-test-user
 * Rota temporária — reseta a senha da conta de teste da Shopee via Supabase Admin SDK.
 * APAGAR após confirmar que o login funciona.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const USERS_TO_RESET = [
  { id: '80619b9d-1a4e-450d-adbe-f3c3d5f2a5d7', email: 'shopee@foguetim.com'        },
  { id: '0cb40abb-f46f-4614-b626-77dc255c91ea',  email: 'shopeeteste@foguetim.com.br' },
]

export async function GET() {
  const db      = supabaseAdmin()
  const results = []

  for (const u of USERS_TO_RESET) {
    const { data, error } = await db.auth.admin.updateUserById(u.id, {
      password:      'ShopeeTest2026!Fgt',
      email_confirm: true,
    })

    results.push({
      email:  u.email,
      ok:     !error,
      userId: data?.user?.id ?? null,
      error:  error?.message ?? null,
    })
  }

  return NextResponse.json({
    results,
    instruction: 'Senha "ShopeeTest2026!Fgt" aplicada. Tente logar em app.foguetim.com.br',
  })
}
