/**
 * POST /api/listings/extract
 * Extrai dados de um anúncio a partir da URL do marketplace.
 *
 * Body: { url: string }
 * Returns: { success: boolean, product: ExtractedProduct }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { extractProduct } from '@/lib/listings/extractor'

export async function POST(req: NextRequest) {
  const { error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const { url } = await req.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })
  }

  try {
    new URL(url) // validate URL format
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  try {
    const product = await extractProduct(url)
    return NextResponse.json({ success: true, product })
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Não foi possível extrair dados deste anúncio',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 422 },
    )
  }
}
