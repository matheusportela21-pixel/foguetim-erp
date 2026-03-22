/**
 * POST /api/auth/ensure-profile
 * Garante que um usuário autenticado (ex: via Google OAuth) tenha
 * registro nas tabelas users e user_onboarding.
 * Chamado pelo auth-context após login via Google.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from the request cookies
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const db = supabaseAdmin()

    // Check if profile already exists
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ action: 'existing', userId: user.id })
    }

    // Extract name from Google metadata
    const meta = user.user_metadata ?? {}
    const name = meta.full_name || meta.name || meta.preferred_username || user.email?.split('@')[0] || ''

    // Create profile
    const { error: profileError } = await db
      .from('users')
      .insert({
        id:      user.id,
        email:   user.email,
        name,
        company: name,
        role:    'operador',
        plan:    'explorador',
      })

    if (profileError) {
      console.error('[ensure-profile] profile insert failed:', profileError.message)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Create onboarding
    await db
      .from('user_onboarding')
      .insert({
        user_id:         user.id,
        completed:       false,
        dismissed:       false,
        current_step:    0,
        steps_completed: {},
      })

    // Log signup
    await db
      .from('activity_logs')
      .insert({
        user_id:     user.id,
        action:      'google_auth_completed',
        category:    'auth',
        description: 'Conta criada via Google OAuth',
        metadata:    { provider: 'google', email: user.email, name },
      })

    return NextResponse.json({ action: 'created', userId: user.id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ensure-profile]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
