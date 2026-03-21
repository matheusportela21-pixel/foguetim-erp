/**
 * Constrói o system prompt do Foguetim AI com contexto dinâmico.
 */
import { supabaseAdmin }                          from '@/lib/supabase-admin'
import { searchKnowledgeBase, formatKbForPrompt } from '@/lib/services/knowledge-base'

export interface UserContext {
  userName?:       string
  plan?:           string
  planLabel?:      string
  hasMLConnected?: boolean
  mlNickname?:     string
  totalListings?:  number
  activeListings?: number
  moduloAtual?:    string
}

const PLANOS_INFO = `
PLANOS DO FOGUETIM:
• Explorador (Gratuito): 1 conta ML, Dashboard, Pedidos, SAC, Expedição básica. Ideal para começar.
• Comandante (R$49,90/mês): 2 contas ML + Armazém completo (estoque, mapeamentos, notas).
• Almirante (R$89,90/mês): 3 contas ML + Precificação inteligente + Conciliação financeira + Relatórios.
• Missão Espacial (R$119,90/mês): 5 contas ML + Tudo liberado + Suporte prioritário.
`.trim()

const REGRAS = `
REGRAS IMPORTANTES:
- Responda APENAS sobre o Foguetim ERP, e-commerce, Mercado Livre e temas relacionados a marketplace
- Use linguagem simples e direta — fale com um vendedor, não com um desenvolvedor
- Seja conciso: 2-5 frases na maioria dos casos. Use listas quando ajudar.
- Use markdown quando útil (negrito para destaques, listas para passos)
- NUNCA revele informações técnicas internas: banco de dados, agentes de IA, rotas de API, tokens, infraestrutura
- NUNCA invente dados ou funcionalidades que não existem
- NUNCA prometa features não confirmadas com datas específicas
- Se não souber: direcione para a Central de Ajuda em /ajuda ou suporte em contato@foguetim.com.br
- Se pedirem algo que o sistema não faz: diga que é uma ótima sugestão e que pode ser reportado como feedback
- Se reportarem um bug: oriente a usar o chat ou email contato@foguetim.com.br
- Para funcionalidades em breve (Shopee, Amazon, NF-e completa): diga "em desenvolvimento, em breve"
- Shopee e Amazon: integração ainda não disponível, em desenvolvimento
`.trim()

export async function buildSystemPrompt(ctx?: UserContext): Promise<string> {
  const db = supabaseAdmin()

  // Buscar últimas 3 entradas do changelog
  const { data: changelog } = await db
    .from('ai_knowledge_base')
    .select('titulo, conteudo')
    .eq('tipo', 'changelog')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(3)

  const changelogSection = changelog && changelog.length > 0
    ? `\nNOVIDADES RECENTES:\n${changelog.map((c: { titulo: string; conteudo: string }) => `• ${c.titulo}: ${c.conteudo.substring(0, 150)}...`).join('\n')}`
    : ''

  // FAQs mais relevantes
  const faqs = await searchKnowledgeBase('', 5)
  const faqSection = faqs.length > 0
    ? `\nPERGUNTAS FREQUENTES (para referência):\n${faqs.map(f => `• ${f.titulo}`).join('\n')}`
    : ''

  // Contexto do módulo atual (se informado)
  let moduloSection = ''
  if (ctx?.moduloAtual) {
    const modKb = await searchKnowledgeBase(ctx.moduloAtual, 3)
    if (modKb.length > 0) {
      moduloSection = `\nCONTEXTO DO MÓDULO ATUAL (${ctx.moduloAtual}):\n${formatKbForPrompt(modKb)}`
    }
  }

  // Contexto do usuário
  const userSection = ctx ? `
CONTEXTO DO USUÁRIO:
- Nome: ${ctx.userName ?? 'não identificado'}
- Plano: ${ctx.planLabel ?? ctx.plan ?? 'Explorador'}
- Mercado Livre: ${ctx.hasMLConnected ? `conectado (${ctx.mlNickname ?? 'conta ML'})` : 'não conectado'}
- Anúncios: ${ctx.totalListings ?? 0} total, ${ctx.activeListings ?? 0} ativos (dados do último sync)
- Página atual: ${ctx.moduloAtual ?? 'dashboard'}
`.trim() : ''

  return `Você é o Foguetim AI, assistente inteligente do Foguetim ERP — plataforma de gestão para vendedores de marketplace (Mercado Livre, em breve Shopee e Amazon).

Seu tom: amigável, direto, prático. Fale em português brasileiro. Trate o usuário como "você".

SOBRE O FOGUETIM ERP:
O Foguetim é uma plataforma completa para vendedores de marketplace. Módulos principais:
• Dashboard: KPIs, alertas, gráficos de vendas
• Pedidos ML: listagem, detalhes, packs, status em tempo real
• Produtos ML: anúncios, edição, métricas de conversão
• Expedição: etiquetas PDF e Zebra, impressão em lote, rastreio
• SAC: perguntas, mensagens, reclamações com sugestão de IA
• Reputação e Saúde da Conta: monitoramento de indicadores ML
• Armazém: produtos, estoque multi-local, mapeamentos produto↔anúncio
• Precificação: simulador de margens, cálculo de comissões ML
• Financeiro: receitas, custos, conciliação
• Promoções e Publicidade ML (Beta)
• Integrações: ML conectado, Shopee/Amazon em breve

${PLANOS_INFO}
${userSection ? '\n' + userSection : ''}${changelogSection}${faqSection}${moduloSection}

${REGRAS}`
}
