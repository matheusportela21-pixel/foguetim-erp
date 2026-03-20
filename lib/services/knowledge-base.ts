/**
 * Serviço de busca na Knowledge Base do Foguetim.
 * Usado pelo chat de IA para injetar contexto relevante.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface KbEntry {
  id:         string
  tipo:       string
  titulo:     string
  conteudo:   string
  tags:       string[] | null
  modulo:     string | null
  created_at: string
}

// Stop words em português para extração de keywords
const STOP_WORDS = new Set([
  'como', 'que', 'o', 'a', 'de', 'do', 'da', 'para', 'por', 'no', 'na',
  'meu', 'minha', 'é', 'está', 'e', 'em', 'um', 'uma', 'os', 'as',
  'ou', 'se', 'me', 'eu', 'ele', 'ela', 'seu', 'sua', 'quando', 'onde',
  'qual', 'quais', 'não', 'sim', 'mas', 'mais', 'menos', 'com', 'sem',
  'foi', 'ser', 'ter', 'tem', 'ao', 'aos', 'das', 'dos', 'que', 'this',
])

export function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\sáàãâéèêíîóòõôúùûç]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 6)
}

export async function searchKnowledgeBase(
  query: string,
  limit = 8,
): Promise<KbEntry[]> {
  const db = supabaseAdmin()

  if (!query?.trim()) {
    // Sem query — retornar entradas mais importantes (faq + feature)
    const { data } = await db
      .from('ai_knowledge_base')
      .select('id, tipo, titulo, conteudo, tags, modulo, created_at')
      .eq('ativo', true)
      .in('tipo', ['faq', 'feature'])
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as KbEntry[]
  }

  const keywords = extractKeywords(query)

  // Busca por título + conteúdo
  const orFilter = [
    `titulo.ilike.%${query}%`,
    `conteudo.ilike.%${query}%`,
    ...keywords.map(k => `titulo.ilike.%${k}%`),
    ...keywords.map(k => `conteudo.ilike.%${k}%`),
  ].join(',')

  const { data } = await db
    .from('ai_knowledge_base')
    .select('id, tipo, titulo, conteudo, tags, modulo, created_at')
    .eq('ativo', true)
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as KbEntry[]
}

export function formatKbForPrompt(entries: KbEntry[]): string {
  if (entries.length === 0) return ''
  return entries
    .map(e => `[${e.tipo.toUpperCase()}] ${e.titulo}\n${e.conteudo}`)
    .join('\n\n---\n\n')
}
