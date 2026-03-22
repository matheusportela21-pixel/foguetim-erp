/**
 * POST /api/auth/cadastro
 * Cria o usuário no Supabase Auth (auto-confirmado), insere o perfil
 * na tabela users e inicializa o registro de onboarding.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface CadastroBody {
  name:     string
  email:    string
  password: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CadastroBody
    const { name, email, password } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
    }

    // 1. Criar usuário no Supabase Auth (sem e-mail de confirmação)
    const { data: authData, error: authError } = await supabaseAdmin()
      .auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError) {
      const already = authError.message.toLowerCase().includes('already')
      if (already) {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Inserir perfil na tabela users
    const { error: profileError } = await supabaseAdmin()
      .from('users')
      .upsert({
        id:      userId,
        email,
        name,
        company: name,
        role:    'operador',
        plan:    'explorador',
      })

    if (profileError) {
      // Rollback: remove auth user para evitar inconsistência
      await supabaseAdmin().auth.admin.deleteUser(userId)
      console.error('[cadastro] profile insert failed:', profileError.message)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // 3. Inicializar onboarding
    await supabaseAdmin()
      .from('user_onboarding')
      .insert({
        user_id:         userId,
        completed:       false,
        dismissed:       false,
        current_step:    0,
        steps_completed: {},
      })
      .select()

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cadastro]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
