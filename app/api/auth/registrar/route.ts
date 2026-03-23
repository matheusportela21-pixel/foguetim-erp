/**
 * POST /api/auth/registrar
 * Cria o usuário no Supabase Auth (auto-confirmado) e insere o perfil completo
 * na tabela users usando service role key (bypassa RLS).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'

interface RegistrarBody {
  email:           string
  password:        string
  razao_social:    string
  document_type:   'cnpj' | 'cpf'
  document_number: string   // apenas dígitos
  whatsapp:        string   // apenas dígitos
  segment:         string
  plan:            string
}

export async function POST(req: NextRequest) {
  // SEC-020: Rate limit — 3 registros por IP a cada 30 minutos
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimit(`auth:register:${ip}`, 3, 30 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas de cadastro. Tente novamente em ${rl.retryAfter}s.` },
      { status: 429 },
    )
  }

  try {
    const body = await req.json() as RegistrarBody
    const {
      email, password, razao_social,
      document_type, document_number, whatsapp, segment, plan,
    } = body

    // Validação mínima server-side
    if (!email || !password || !razao_social) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
    }

    // 1. Criar usuário no Supabase Auth (email_confirm: true → sem e-mail de confirmação)
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

    // 2. Inserir perfil completo na tabela users
    const { error: profileError } = await supabaseAdmin()
      .from('users')
      .upsert({
        id:              userId,
        email,
        name:            razao_social,
        razao_social,
        company:         razao_social,
        document_type:   document_type   || null,
        document_number: document_number || null,
        whatsapp:        whatsapp        || null,
        segment:         segment         || null,
        plan:            plan            || 'explorador',
        role:            'operador',
      })

    if (profileError) {
      // Rollback: remove o usuário auth criado para evitar inconsistência
      await supabaseAdmin().auth.admin.deleteUser(userId)
      console.error('[registrar] profile insert failed:', profileError.message)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[registrar]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
