/**
 * GET /api/mercadolivre/shipments/[shipment_id]/label
 * Baixar etiqueta de envio em PDF.
 *
 * Disponível quando shipment.status = ready_to_ship.
 * Proxy: GET /shipment_labels?shipment_ids={id}&response_type=pdf
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export async function GET(
  _req: NextRequest,
  { params }: { params: { shipment_id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const { shipment_id } = params
  const auth = { Authorization: `Bearer ${token}` }

  try {
    const res = await fetch(
      `${ML_API_BASE}/shipment_labels?shipment_ids=${shipment_id}&response_type=pdf`,
      { headers: auth },
    )

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json(
        { error: `Etiqueta indisponível (${res.status}): ${txt}` },
        { status: res.status },
      )
    }

    const pdfBuffer = await res.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="etiqueta-${shipment_id}.pdf"`,
        'Cache-Control':       'private, no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[shipment label GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
