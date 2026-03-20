/**
 * GET /api/knowledge-base/search
 * Busca pública na knowledge base (usada pelo chat de IA).
 * Não requer autenticação admin.
 *
 * Query: q (texto), limit (default 8)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { searchKnowledgeBase }       from '@/lib/services/knowledge-base'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Requer apenas usuário autenticado (não precisa ser admin)
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp    = req.nextUrl.searchParams
  const q     = sp.get('q')     ?? ''
  const limit = Math.min(20, Math.max(1, Number(sp.get('limit') ?? 8)))

  const results = await searchKnowledgeBase(q, limit)
  return NextResponse.json({ results, query: q })
}
