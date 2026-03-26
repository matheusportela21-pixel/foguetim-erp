/**
 * lib/listings/extractor.ts
 * Engine de extração de dados de anúncios de marketplaces.
 *
 * - ML: usa API pública (sem auth)
 * - Outros: extrai meta tags (og:*, product:*)
 */

export interface ExtractedProduct {
  title: string
  description: string
  price: number
  originalPrice: number | null
  currency: string
  images: string[]
  category: string
  brand: string
  condition: string
  attributes: Record<string, string>
  sku: string
  ean: string
  sourceMarketplace: string
  sourceId: string
  sourceUrl: string
}

/* ------------------------------------------------------------------ */
/*  Detect marketplace from URL                                       */
/* ------------------------------------------------------------------ */

export function detectMarketplace(url: string): string {
  if (url.includes('mercadolivre.com.br') || url.includes('mercadolibre.com')) return 'ml'
  if (url.includes('shopee.com')) return 'shopee'
  if (url.includes('magazineluiza.com.br') || url.includes('magalu.com.br')) return 'magalu'
  if (url.includes('amazon.com.br') || url.includes('amazon.com')) return 'amazon'
  if (url.includes('aliexpress.com')) return 'aliexpress'
  if (url.includes('shein.com')) return 'shein'
  if (url.includes('americanas.com.br')) return 'americanas'
  if (url.includes('kabum.com.br')) return 'kabum'
  return 'outro'
}

/* ------------------------------------------------------------------ */
/*  Mercado Livre — API pública                                       */
/* ------------------------------------------------------------------ */

/** Extrai item_id de URLs do ML (ex: /p/MLB12345678 ou /MLB-1234567890-...) */
function extractMLItemId(url: string): string | null {
  // Clean URL: remove fragment and query params
  const cleanUrl = url.split('#')[0].split('?')[0]

  const patterns = [
    /\/p\/(MLB\d+)/i,
    /(MLB[-]?\d+)/i,
  ]

  for (const p of patterns) {
    const m = cleanUrl.match(p)
    if (m) return m[1].replace(/-/g, '')
  }

  // Try from full URL (ID might be embedded)
  const fullMatch = url.match(/(MLB\d{8,})/i)
  if (fullMatch) return fullMatch[1]

  return null
}

async function extractFromML(url: string): Promise<ExtractedProduct> {
  const itemId = extractMLItemId(url)
  if (!itemId) throw new Error('Não foi possível identificar o anúncio do ML')

  const [itemRes, descRes] = await Promise.all([
    fetch(`https://api.mercadolibre.com/items/${itemId}`),
    fetch(`https://api.mercadolibre.com/items/${itemId}/description`),
  ])

  if (!itemRes.ok) throw new Error(`ML API retornou ${itemRes.status}`)

  const item = await itemRes.json()
  const desc = descRes.ok ? await descRes.json() : { plain_text: '' }

  return {
    title: item.title ?? '',
    description: desc.plain_text || desc.text || '',
    price: item.price ?? 0,
    originalPrice: item.original_price ?? null,
    currency: item.currency_id ?? 'BRL',
    images: (item.pictures ?? [])
      .map((p: Record<string, string>) => p.secure_url || p.url)
      .filter(Boolean),
    category: item.category_id ?? '',
    brand:
      item.attributes?.find((a: Record<string, string>) => a.id === 'BRAND')
        ?.value_name ?? '',
    condition: item.condition ?? 'new',
    attributes: (item.attributes ?? []).reduce(
      (acc: Record<string, string>, a: Record<string, string>) => {
        if (a.value_name) acc[a.name || a.id] = a.value_name
        return acc
      },
      {} as Record<string, string>,
    ),
    sku: item.seller_custom_field ?? '',
    ean:
      item.attributes?.find((a: Record<string, string>) => a.id === 'GTIN')
        ?.value_name ?? '',
    sourceMarketplace: 'ml',
    sourceId: itemId,
    sourceUrl: url,
  }
}

/* ------------------------------------------------------------------ */
/*  Generic — meta tags (og:*, product:*)                             */
/* ------------------------------------------------------------------ */

function extractMetaTag(html: string, property: string): string | null {
  // property/name before content
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i',
  )
  const match = html.match(regex)
  if (match) return match[1]
  // content before property/name (reversed order)
  const regex2 = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i',
  )
  const match2 = html.match(regex2)
  return match2 ? match2[1] : null
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() : ''
}

function extractAllMetaImages(html: string): string[] {
  const images: string[] = []
  const ogImage = extractMetaTag(html, 'og:image')
  if (ogImage) images.push(ogImage)
  const regex =
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    if (!images.includes(m[1])) images.push(m[1])
  }
  return images
}

async function extractGeneric(url: string): Promise<ExtractedProduct> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FoguetimBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`Página retornou ${response.status}`)
  const html = await response.text()

  const marketplace = detectMarketplace(url)

  return {
    title: extractMetaTag(html, 'og:title') || extractTitle(html) || '',
    description: extractMetaTag(html, 'og:description') || '',
    price: parseFloat(extractMetaTag(html, 'product:price:amount') || '0'),
    originalPrice: null,
    currency: extractMetaTag(html, 'product:price:currency') || 'BRL',
    images: extractAllMetaImages(html),
    category: '',
    brand: extractMetaTag(html, 'product:brand') || '',
    condition: 'new',
    attributes: {},
    sku: '',
    ean: '',
    sourceMarketplace: marketplace,
    sourceId: '',
    sourceUrl: url,
  }
}

/* ------------------------------------------------------------------ */
/*  Main router                                                       */
/* ------------------------------------------------------------------ */

export async function extractProduct(url: string): Promise<ExtractedProduct> {
  const marketplace = detectMarketplace(url)
  if (marketplace === 'ml') return extractFromML(url)
  return extractGeneric(url)
}
