/**
 * GET  /api/response-templates   — lista templates do usuário
 * POST /api/response-templates   — criar novo template
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner }          from '@/lib/auth/api-permissions'
import { supabaseAdmin }             from '@/lib/supabase-admin'

const DEFAULT_TEMPLATES = [
  { name: 'Disponível para envio', category: 'pre_venda',  content: 'Olá! O produto está disponível e pode ser enviado hoje. Qualquer dúvida estou à disposição!' },
  { name: 'Prazo de entrega',      category: 'pre_venda',  content: 'O prazo de entrega estimado é de 5 a 10 dias úteis após a confirmação do pagamento, dependendo da sua região.' },
  { name: 'Pedido enviado',        category: 'pos_venda',  content: 'Obrigado pela sua compra! Seu pedido foi enviado e você pode acompanhar pelo rastreamento disponível no Mercado Livre.' },
  { name: 'Produto esgotado',      category: 'pre_venda',  content: 'Infelizmente este produto está esgotado no momento. Assim que repormos o estoque atualizaremos o anúncio.' },
  { name: 'Garantia do produto',   category: 'pos_venda',  content: 'O produto possui garantia conforme descrito no anúncio. Em caso de problema, entre em contato e resolveremos da melhor forma possível.' },
]

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET() {
  const { dataOwnerId, error: authErr } = await resolveDataOwner()
  if (authErr) return authErr

  const db = supabaseAdmin()

  // Se não tem templates ainda, inserir os padrão
  const { count } = await db
    .from('response_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', dataOwnerId)

  if ((count ?? 0) === 0) {
    await db.from('response_templates').insert(
      DEFAULT_TEMPLATES.map(t => ({
        user_id:    dataOwnerId,
        name:       t.name,
        content:    t.content,
        category:   t.category,
        is_default: true,
      }))
    )
  }

  const { data, error } = await db
    .from('response_templates')
    .select('*')
    .eq('user_id', dataOwnerId)
    .order('category')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data })
}

/* ── POST ────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authErr } = await resolveDataOwner()
  if (authErr) return authErr

  const { name, content, category } = await req.json() as { name: string; content: string; category?: string }

  if (!name?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'name e content são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('response_templates')
    .insert({
      user_id:  dataOwnerId,
      name:     name.trim(),
      content:  content.trim(),
      category: category ?? 'geral',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}
