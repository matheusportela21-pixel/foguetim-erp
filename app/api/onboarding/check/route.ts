/**
 * GET /api/onboarding/check
 * Auto-detecta passos concluídos verificando estado real do banco.
 * Retorna quais passos estão de fato completos.
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  // Checar em paralelo
  const [profileRes, marketplaceRes, warehouseRes, mappingRes] = await Promise.all([
    // Passo "profile" — usuário tem nome preenchido
    db.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    // Passo "marketplace" — tem pelo menos 1 marketplace conectado
    db.from('marketplace_connections').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_active', true),
    // Passo "warehouse" — tem pelo menos 1 produto no armazém
    db.from('warehouse_products').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('active', true),
    // Passo "mapping" — tem pelo menos 1 mapeamento
    db.from('warehouse_product_mappings').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const steps: Record<string, boolean> = {
    welcome:     true, // sempre marcado (basta ter acessado)
    profile:     !!(profileRes.data?.name && profileRes.data.name.trim().length > 0),
    marketplace: (marketplaceRes.count ?? 0) > 0,
    warehouse:   (warehouseRes.count ?? 0) > 0,
    mapping:     (mappingRes.count ?? 0) > 0,
    explore:     true, // marcado automaticamente ao chegar no dashboard
  }

  // Atualiza steps_completed no banco (merge, não sobrescreve)
  const { data: existing } = await db
    .from('user_onboarding')
    .select('steps_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  const merged = {
    ...(existing?.steps_completed as Record<string, boolean> ?? {}),
    ...Object.fromEntries(Object.entries(steps).filter(([, v]) => v)),
  }

  await db.from('user_onboarding').upsert(
    { user_id: user.id, steps_completed: merged },
    { onConflict: 'user_id' },
  )

  return NextResponse.json({ steps, merged })
}
