/**
 * POST /api/auth/verificar-duplicata
 * Body: { field: 'email' | 'document_number' | 'whatsapp', value: string }
 * Returns: { exists: boolean, message?: string }
 *
 * SOMENTE LEITURA — não modifica dados.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_FIELDS = ['email', 'document_number', 'whatsapp'] as const
type AllowedField = (typeof ALLOWED_FIELDS)[number]

const MENSAGENS: Record<AllowedField, string> = {
  email:           'Este e-mail já está cadastrado. Faça login ou recupere sua senha.',
  document_number: 'Este documento já possui uma conta. Entre em contato com nosso suporte: contato@foguetim.com.br',
  whatsapp:        'Este WhatsApp já está cadastrado em outra conta.',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { field?: string; value?: string }
    const { field, value } = body

    if (!field || !value) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    if (!(ALLOWED_FIELDS as readonly string[]).includes(field)) {
      return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })
    }

    const typedField = field as AllowedField

    const { data } = await supabaseAdmin()
      .from('users')
      .select('id')
      .eq(typedField, value)
      .maybeSingle()

    if (data) {
      return NextResponse.json({ exists: true, message: MENSAGENS[typedField] })
    }

    return NextResponse.json({ exists: false })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[verificar-duplicata]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
