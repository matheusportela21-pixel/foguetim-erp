/**
 * POST /api/armazem/notas-entrada/upload
 * Parses NF-e XML and saves to purchase_invoices_beta + purchase_invoice_items_beta
 * Admin only
 */
import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

interface NfeItem {
  description: string
  supplier_sku: string
  barcode: string | null
  quantity: number
  unit_cost: number
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    // Admin check
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', dataOwnerId)
      .maybeSingle()

    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse multipart form data
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Requisição inválida: esperado multipart/form-data' }, { status: 400 })
    }

    const xmlFile = formData.get('xml')
    if (!xmlFile) {
      return NextResponse.json({ error: 'Campo "xml" não encontrado no formulário' }, { status: 400 })
    }

    let xmlText: string
    if (typeof xmlFile === 'string') {
      xmlText = xmlFile
    } else if (xmlFile instanceof File) {
      xmlText = await xmlFile.text()
    } else {
      return NextResponse.json({ error: 'Campo "xml" deve ser um arquivo ou texto' }, { status: 400 })
    }

    // Parse XML
    let supplierName: string
    let supplierDocument: string
    let invoiceNumber: string
    let invoiceKey: string | null
    let totalAmount: number
    let freightAmount: number
    let discountAmount: number
    let items: NfeItem[]

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseTagValue: true,
        trimValues: true,
      })

      const parsed = parser.parse(xmlText)

      // Try different NF-e XML wrappers
      const nfe =
        parsed?.nfeProc?.NFe?.infNFe ||
        parsed?.NFe?.infNFe ||
        parsed?.infNFe ||
        null

      if (!nfe) {
        throw new Error('XML não reconhecido como NF-e válida')
      }

      const emit = (nfe.emit as Record<string, unknown>) || {}
      supplierName = String(emit.xNome || emit.xFant || 'Desconhecido')
      supplierDocument = String(emit.CNPJ || emit.CPF || '')

      const ide = (nfe.ide as Record<string, unknown>) || {}
      invoiceNumber = String(ide.nNF || '')
      invoiceKey = String((nfe as Record<string, unknown>)['@_Id'] || '').replace(/^NFe/, '') || null

      const totals = ((nfe.total as Record<string, unknown>)?.ICMSTot as Record<string, unknown>) || {}
      totalAmount = Number(totals.vNF || 0)
      freightAmount = Number(totals.vFrete || 0)
      discountAmount = Number(totals.vDesc || 0)

      // Items
      const detRaw = (nfe as Record<string, unknown>).det
      const detArr = Array.isArray(detRaw) ? detRaw : detRaw ? [detRaw] : []

      items = (detArr as Record<string, unknown>[]).map((det) => {
        const prod = (det.prod as Record<string, unknown>) || {}
        const eanRaw = String(prod.cEANTrib || prod.cEAN || '')
        const barcode =
          eanRaw && eanRaw !== 'SEM GTIN' && eanRaw !== '0' ? eanRaw : null

        return {
          description: String(prod.xProd || ''),
          supplier_sku: String(prod.cProd || ''),
          barcode,
          quantity: Number(prod.qCom ?? prod.qTrib ?? 1),
          unit_cost: Number(prod.vUnCom ?? prod.vUnTrib ?? 0),
        }
      })

      if (items.length === 0) {
        throw new Error('NF-e não contém itens')
      }
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr)
      return NextResponse.json({ error: `Erro ao processar XML: ${msg}` }, { status: 400 })
    }

    // Insert purchase invoice
    const { data: invoice, error: invoiceError } = await db
      .from('purchase_invoices_beta')
      .insert({
        user_id: dataOwnerId,
        supplier_name: supplierName,
        supplier_document: supplierDocument,
        invoice_number: invoiceNumber,
        invoice_key: invoiceKey,
        total_amount: totalAmount,
        freight_amount: freightAmount,
        discount_amount: discountAmount,
        status: 'pending_resolution',
        is_beta: true,
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('[notas-entrada/upload POST invoice insert]', invoiceError)
      return NextResponse.json({ error: 'Erro ao salvar nota fiscal' }, { status: 500 })
    }

    // Insert all items
    const itemsData = items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      supplier_sku: item.supplier_sku,
      barcode: item.barcode,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      resolution_type: 'pending' as const,
    }))

    const { data: insertedItems, error: itemsError } = await db
      .from('purchase_invoice_items_beta')
      .insert(itemsData)
      .select()

    if (itemsError) {
      console.error('[notas-entrada/upload POST items insert]', itemsError)
      return NextResponse.json({ error: 'Nota criada mas erro ao salvar itens' }, { status: 500 })
    }

    return NextResponse.json(
      { invoice, items_count: (insertedItems ?? []).length },
      { status: 201 },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notas-entrada/upload POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
