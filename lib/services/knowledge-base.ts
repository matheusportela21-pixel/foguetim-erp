/**
 * Serviço de busca na Knowledge Base do Foguetim.
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

const STOP_WORDS = new Set([
  'como', 'que', 'o', 'a', 'de', 'do', 'da', 'para', 'por', 'no', 'na',
  'meu', 'minha', 'é', 'está', 'e', 'em', 'um', 'uma', 'os', 'as',
  'ou', 'se', 'me', 'eu', 'ele', 'ela', 'seu', 'sua', 'quando', 'onde',
  'qual', 'quais', 'não', 'sim', 'mas', 'mais', 'menos', 'com', 'sem',
  'foi', 'ser', 'ter', 'tem', 'ao', 'aos', 'das', 'dos', 'this',
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
    const { data } = await db
      .from('ai_knowledge_base')
      .select('id, tipo, titulo, conteudo, tags, modulo, created_at')
      .eq('ativo', true)
      .in('tipo', ['faq', 'feature'])
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as KbEntry[]
  }

  // Try full-text search first
  const { data: ftRaw } = await db
    .rpc('search_knowledge_base', { query_text: query.trim(), result_limit: limit })

  const ftData = ftRaw as unknown as KbEntry[] | null

  if (ftData && ftData.length > 0) {
    return ftData
  }

  // Fallback to ilike
  const keywords = extractKeywords(query)
  const orFilter = [
    `titulo.ilike.%${query}%`,
    `conteudo.ilike.%${query}%`,
    ...keywords.flatMap(k => [`titulo.ilike.%${k}%`, `conteudo.ilike.%${k}%`]),
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
