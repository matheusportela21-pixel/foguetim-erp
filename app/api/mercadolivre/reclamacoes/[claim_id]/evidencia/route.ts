/**
 * POST /api/mercadolivre/reclamacoes/[claim_id]/evidencia
 * Faz upload de arquivo de evidência para a reclamação no ML.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { getValidToken, ML_API_BASE, getMLConnection } from '@/lib/mercadolivre'

export async function POST(
  req: NextRequest,
  { params }: { params: { claim_id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { claim_id } = params

  try {
    const formData = await req.formData()

    const mlRes = await fetch(
      `${ML_API_BASE}/post-purchase/v1/claims/${claim_id}/attachments`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      },
    )

    if (!mlRes.ok) {
      const txt = await mlRes.text()
      return NextResponse.json({ error: `ML API ${mlRes.status}: ${txt}` }, { status: mlRes.status })
    }

    const data = await mlRes.json()
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[evidencia POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
