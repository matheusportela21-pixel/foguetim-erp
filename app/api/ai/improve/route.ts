/**
 * POST /api/ai/improve
 * Melhoria de texto com IA (título ou descrição) com sistema de créditos.
 *
 * Body:
 *   - Gerar sugestão: { type: 'title' | 'description', text: string, marketplace?: 'ml' | 'magalu' | 'shopee' }
 *   - Aceitar sugestão: { accept: true, usage_id: string }
 *
 * Retorna:
 *   - Sugestão: { suggestion, usage_id, credits_remaining }
 *   - Aceite: { success: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

const TITLE_SYSTEM_PROMPT = `Você é um especialista em SEO para marketplaces brasileiros.
Para TÍTULOS: máximo 60 chars para ML, 100 para Magalu.
Incluir marca + produto + característica + tamanho.
Não usar CAPS LOCK. Palavras-chave relevantes.
Responda APENAS com o texto melhorado, sem aspas, sem explicação.`

const DESCRIPTION_SYSTEM_PROMPT = `Você é um copywriter especializado em marketplaces brasileiros.
Estruturar com seções claras. Destacar benefícios. Palavras-chave naturais.
Tom profissional e persuasivo. Apenas texto simples, sem HTML ou markdown.
Responda APENAS com o texto melhorado, sem explicação adicional.`

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:edit')
  if (authError) return authError

  const body = await req.json() as {
    type?: 'title' | 'description'
    text?: string
    marketplace?: 'ml' | 'magalu' | 'shopee'
    accept?: boolean
    usage_id?: string
  }

  const db = supabaseAdmin()

  // ── Aceitar sugestão (debitar crédito) ──────────────────────────────────
  if (body.accept && body.usage_id) {
    // Debitar 1 crédito
    const { data: credits } = await db
      .from('ai_credits')
      .select('credits_total, credits_used')
      .eq('user_id', dataOwnerId)
      .single()

    if (!credits || (credits.credits_total - credits.credits_used) < 1) {
      return NextResponse.json(
        { error: 'Sem créditos de IA', no_credits: true },
        { status: 402 },
      )
    }

    const { error: updateErr } = await db
      .from('ai_credits')
      .update({
        credits_used: credits.credits_used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', dataOwnerId)

    if (updateErr) {
      return NextResponse.json({ error: 'Erro ao debitar crédito' }, { status: 500 })
    }

    // Atualizar custo no registro de uso
    await db
      .from('ai_credit_usage')
      .update({ credits_cost: 1 })
      .eq('id', body.usage_id)
      .eq('user_id', dataOwnerId)

    return NextResponse.json({ success: true })
  }

  // ── Gerar sugestão ──────────────────────────────────────────────────────
  const type = body.type
  const text = body.text?.trim() ?? ''
  const marketplace = body.marketplace ?? 'ml'

  if (!type || !['title', 'description'].includes(type)) {
    return NextResponse.json({ error: 'Tipo inválido (title ou description)' }, { status: 400 })
  }
  if (!text) {
    return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 })
  }

  // Verificar créditos
  const { data: credits } = await db
    .from('ai_credits')
    .select('credits_total, credits_used')
    .eq('user_id', dataOwnerId)
    .single()

  const remaining = credits ? credits.credits_total - credits.credits_used : 0
  if (remaining < 1) {
    return NextResponse.json(
      { error: 'Sem créditos de IA', no_credits: true },
      { status: 402 },
    )
  }

  try {
    let suggestion: string

    const apiKey = process.env.OPENAI_API_KEY

    if (apiKey) {
      // Implementação real com OpenAI
      const systemPrompt = type === 'title' ? TITLE_SYSTEM_PROMPT : DESCRIPTION_SYSTEM_PROMPT
      const marketplaceLabel =
        marketplace === 'ml' ? 'Mercado Livre' :
        marketplace === 'magalu' ? 'Magalu' : 'Shopee'

      const userMessage = `Marketplace: ${marketplaceLabel}\nTexto original: "${text}"`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: type === 'title' ? 150 : 500,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: { message?: string } }
        throw new Error(err.error?.message ?? 'Erro na API OpenAI')
      }

      const data = await res.json() as { choices?: { message?: { content?: string } }[] }
      suggestion = data.choices?.[0]?.message?.content?.trim() ?? text
    } else {
      // Demo/mock para desenvolvimento
      suggestion = generateMockImprovement(type, text, marketplace)
    }

    // Salvar uso (credits_cost=0, só cobra no accept)
    const { data: usage, error: usageErr } = await db
      .from('ai_credit_usage')
      .insert({
        user_id: dataOwnerId,
        type: `improve_${type}`,
        input_text: text,
        output_text: suggestion,
        credits_cost: 0,
      })
      .select('id')
      .single()

    if (usageErr) {
      console.error('[ai/improve] Erro ao salvar uso:', usageErr.message)
    }

    return NextResponse.json({
      suggestion,
      usage_id: usage?.id ?? null,
      credits_remaining: remaining,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai/improve POST]', msg)
    return NextResponse.json({ error: 'Falha ao processar. Tente novamente.' }, { status: 500 })
  }
}

/**
 * Gera melhoria simulada para desenvolvimento sem API key.
 */
function generateMockImprovement(
  type: 'title' | 'description',
  text: string,
  marketplace: string,
): string {
  if (type === 'title') {
    // Capitalizar palavras, truncar conforme marketplace
    const maxLen = marketplace === 'ml' ? 60 : marketplace === 'magalu' ? 100 : 80
    const words = text.split(/\s+/)
    const improved = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    return improved.length > maxLen ? improved.slice(0, maxLen).trim() : improved
  }

  // Descrição: estruturar com seções
  return [
    text,
    '',
    'Características Principais:',
    '- Material de alta qualidade',
    '- Design moderno e funcional',
    '- Fácil de usar e manter',
    '',
    'O que está incluso:',
    '- 1x Produto conforme anúncio',
    '- Manual de instruções',
  ].join('\n')
}
