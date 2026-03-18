/**
 * GET /api/mercadolivre/shipments/[shipment_id]/danfe
 *
 * Retorna o DANFE (PDF da nota fiscal) do envio, se disponível.
 * ML expõe o DANFE via GET /users/{ml_user_id}/invoices/shipments/{shipment_id}
 * no campo `danfe_location` da resposta.
 *
 * Redireciona para a URL do DANFE (PDF hospedado no ML).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

interface MLInvoiceResponse {
  danfe_location?: string
  [k: string]: unknown
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { shipment_id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ error: 'Conta ML não conectada' }, { status: 401 })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { shipment_id } = params
  const auth = { Authorization: `Bearer ${token}` }

  try {
    const res = await fetch(
      `${ML_API_BASE}/users/${conn.ml_user_id}/invoices/shipments/${shipment_id}`,
      { headers: auth },
    )

    if (res.status === 404) {
      return NextResponse.json({ error: 'DANFE não disponível para este envio' }, { status: 404 })
    }

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json(
        { error: `ML API ${res.status}: ${txt}` },
        { status: res.status },
      )
    }

    const data = await res.json() as MLInvoiceResponse

    if (!data.danfe_location) {
      return NextResponse.json({ error: 'DANFE não disponível para este envio' }, { status: 404 })
    }

    // Redireciona para a URL do PDF do DANFE
    return NextResponse.redirect(data.danfe_location)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[shipment danfe GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
