/**
 * POST /api/auth/extension-login
 * Authenticates a user from the Chrome extension and returns session tokens.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function corsResponse(body: object, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return corsResponse({ error: 'Email e senha sao obrigatorios' }, 400)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return corsResponse({ error: 'Email ou senha incorretos' }, 401)
    }

    return corsResponse({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email,
      },
    }, 200)
  } catch (error) {
    return corsResponse({ error: 'Erro interno' }, 500)
  }
}
