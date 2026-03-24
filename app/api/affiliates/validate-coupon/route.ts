/**
 * GET /api/affiliates/validate-coupon?code=JOAO20
 * Validates affiliate coupon code (public endpoint, no auth required)
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.toUpperCase().trim()

  if (!code || code.length < 2) {
    return NextResponse.json({ valid: false, message: 'Cupom inválido' })
  }

  try {
    const db = supabaseAdmin()
    const { data: affiliate } = await db
      .from('affiliates')
      .select('name, coupon_trial_days, coupon_discount_monthly, coupon_discount_annual, status')
      .eq('coupon_code', code)
      .eq('status', 'active')
      .maybeSingle()

    if (!affiliate) {
      return NextResponse.json({ valid: false, message: 'Cupom inválido ou expirado' })
    }

    return NextResponse.json({
      valid: true,
      benefits: {
        trialDays: affiliate.coupon_trial_days ?? 15,
        discountMonthly: affiliate.coupon_discount_monthly ?? 20,
        discountAnnual: affiliate.coupon_discount_annual ?? 30,
      },
      affiliateName: affiliate.name,
    })
  } catch {
    return NextResponse.json({ valid: false, message: 'Erro ao validar cupom' })
  }
}
