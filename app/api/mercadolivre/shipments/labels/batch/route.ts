/**
 * GET /api/mercadolivre/shipments/labels/batch
 *
 * Baixa etiquetas de múltiplos envios em lote.
 *
 * Query params:
 *   ids    — IDs dos envios separados por vírgula (ex: 123,456,789)
 *   format — 'pdf' (padrão) | 'zpl2'
 *
 * Para PDF  → retorna application/pdf inline
 * Para ZPL2 → retorna application/zip (ML empacota ZPL + PLP em ZIP)
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const idsParam = searchParams.get('ids') ?? ''
  const format   = searchParams.get('format') === 'zpl2' ? 'zpl2' : 'pdf'

  if (!idsParam.trim()) {
    return NextResponse.json({ error: 'ids é obrigatório' }, { status: 400 })
  }

  // Sanitize: only numbers and commas allowed
  const ids = idsParam.replace(/[^0-9,]/g, '').replace(/,+/g, ',').replace(/^,|,$/g, '')
  if (!ids) {
    return NextResponse.json({ error: 'ids inválidos' }, { status: 400 })
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ error: 'Conta ML não conectada' }, { status: 401 })

  const mlFormat  = format === 'zpl2' ? 'zpl2' : 'pdf'
  const mlUrl     = `${ML_API_BASE}/shipment_labels?shipment_ids=${ids}&response_type=${mlFormat}`

  try {
    const res = await fetch(mlUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json(
        { error: `Etiqueta indisponível (${res.status}): ${txt}` },
        { status: res.status },
      )
    }

    const buf      = await res.arrayBuffer()
    const idList   = ids.split(',')
    const fileName = idList.length === 1
      ? `etiqueta-${idList[0]}.${format === 'zpl2' ? 'zip' : 'pdf'}`
      : `etiquetas-lote-${idList.length}.${format === 'zpl2' ? 'zip' : 'pdf'}`

    const contentType = format === 'zpl2' ? 'application/zip' : 'application/pdf'

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control':       'private, no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[shipment labels batch GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
