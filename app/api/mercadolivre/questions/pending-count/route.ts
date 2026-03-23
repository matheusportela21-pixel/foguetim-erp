/**
 * GET /api/mercadolivre/questions/pending-count
 * Retorna o número de perguntas UNANSWERED do vendedor.
 * Usado pelo dashboard para exibir alerta de perguntas pendentes.
 */
import { NextResponse }  from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export async function GET() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ count: 0, notConnected: true })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ count: 0 })

  try {
    const res = await fetch(
      `${ML_API_BASE}/questions/search?seller_id=${conn.ml_user_id}&role=seller&status=UNANSWERED&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return NextResponse.json({ count: 0 })

    const data = await res.json() as { paging?: { total?: number } }
    const count = data.paging?.total ?? 0

    return NextResponse.json(
      { count },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
