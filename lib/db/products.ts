/**
 * lib/db/products.ts
 * Supabase CRUD layer for products and related tables.
 * Falls back to mock data from _data.ts when Supabase is not configured.
 */
import { supabase, isConfigured } from '../supabase'
import {
  MKTS,
  type Produto, type MktListing, type MKT,
  type Status, type Condicao, type Unidade, type Garantia, type TipoEmb,
} from '@/app/dashboard/produtos/_data'

// ─── Marketplace key ↔ DB value ──────────────────────────────────────────────

const MKT_DB: Record<MKT, string> = {
  ML: 'mercadolivre', SP: 'shopee',  AMZ: 'amazon',       MAG: 'magalu',
  TKT: 'tiktok',     AME: 'americanas', CB: 'casasbahia',
  NS: 'nuvemshop',   TRY: 'tray',    LI: 'lojaintegrada', ALI: 'aliexpress',
}
const DB_MKT = Object.fromEntries(Object.entries(MKT_DB).map(([k, v]) => [v, k])) as Record<string, MKT>

// ─── Row → Produto ────────────────────────────────────────────────────────────

function rowToProduct(row: Record<string, unknown>): Produto {
  const extra = (row.extra_data as Record<string, unknown>) ?? {}
  return {
    id:              (row.id as number),
    sku:             (row.sku as string)              ?? '',
    ean:             (row.ean as string)              ?? '',
    nome:            (row.name as string)             ?? '',
    descricao:       (row.description as string)      ?? '',
    descricaoCurta:  (row.short_description as string)?? '',
    marca:           (row.brand as string)            ?? '',
    categoria:       (row.category as string)         ?? '',
    tags:            (row.tags as string[])           ?? [],
    status:          ((row.status  as Status)         ?? 'rascunho'),
    condicao:        ((row.condition as Condicao)      ?? 'Novo'),
    unidade:         ((row.unit as Unidade)            ?? 'UN'),
    garantia:        ((row.warranty as Garantia)       ?? 'Sem garantia'),
    // pricing
    custo:           parseFloat(String(row.cost_price ?? 0)) || 0,
    embalagem:       Number(extra.embalagem    ?? 0),
    variados:        Number(extra.variados     ?? 0),
    marketing:       Number(extra.marketing    ?? 3),
    influenciador:   Number(extra.influenciador?? 0),
    imposto:         Number(extra.imposto      ?? 6),
    margem:          Number(extra.margem       ?? 30),
    precoVenda:      parseFloat(String(row.sale_price ?? 0)) || 0,
    // stock
    estoqueReal:     Number(row.stock_real    ?? 0),
    estoqueVirtual:  Number(row.stock_virtual ?? 0),
    estoqueMinimo:   Number(row.stock_min     ?? 0),
    // fiscal
    ncm:             (row.ncm   as string) ?? '',
    cfop:            (row.cfop  as string) ?? '',
    origem:          (row.origin as string)?? 'Nacional',
    cest:            String(extra.cest            ?? ''),
    icms:            parseFloat(String(row.icms   ?? 0)) || 0,
    ipi:             parseFloat(String(row.ipi    ?? 0)) || 0,
    pis:             parseFloat(String(row.pis    ?? 0)) || 0,
    cofins:          parseFloat(String(row.cofins ?? 0)) || 0,
    infAdicionais:   String(extra.inf_adicionais ?? ''),
    // dimensions
    compProd:  parseFloat(String(row.length     ?? 0)) || 0,
    largProd:  parseFloat(String(row.width      ?? 0)) || 0,
    altProd:   parseFloat(String(row.height     ?? 0)) || 0,
    pesoProd:  parseFloat(String(row.weight     ?? 0)) || 0,
    compEmb:   parseFloat(String(row.pkg_length ?? 0)) || 0,
    largEmb:   parseFloat(String(row.pkg_width  ?? 0)) || 0,
    altEmb:    parseFloat(String(row.pkg_height ?? 0)) || 0,
    pesoEmb:   parseFloat(String(row.pkg_weight ?? 0)) || 0,
    tipoEmb:   ((extra.tipo_emb as TipoEmb)     ?? 'Caixa'),
    // media
    imagens:   (row.images as string[]) ?? [],
    // mkt — loaded separately
    mkt: {},
    // meta
    criadoEm:  String(row.created_at ?? '').split('T')[0] || new Date().toISOString().split('T')[0],
    updatedAt: String(row.updated_at ?? '').split('T')[0] || new Date().toISOString().split('T')[0],
  }
}

// ─── Produto → Row ────────────────────────────────────────────────────────────

function productToRow(p: Produto, userId: string) {
  return {
    user_id:          userId,
    name:             p.nome,
    description:      p.descricao,
    short_description:p.descricaoCurta,
    brand:            p.marca,
    category:         p.categoria,
    subcategory:      '',
    sku:              p.sku,
    ean:              p.ean,
    tags:             p.tags,
    status:           p.status,
    condition:        p.condicao,
    unit:             p.unidade,
    warranty:         p.garantia,
    cost_price:       p.custo,
    sale_price:       p.precoVenda,
    stock_real:       p.estoqueReal,
    stock_virtual:    p.estoqueVirtual,
    stock_min:        p.estoqueMinimo,
    stock_sync:       true,
    weight:           p.pesoProd,
    width:            p.largProd,
    height:           p.altProd,
    length:           p.compProd,
    pkg_weight:       p.pesoEmb,
    pkg_width:        p.largEmb,
    pkg_height:       p.altEmb,
    pkg_length:       p.compEmb,
    ncm:              p.ncm,
    cfop:             p.cfop,
    origin:           p.origem,
    icms:             p.icms,
    ipi:              p.ipi,
    pis:              p.pis,
    cofins:           p.cofins,
    images:           p.imagens,
    extra_data: {
      embalagem:      p.embalagem,
      variados:       p.variados,
      marketing:      p.marketing,
      influenciador:  p.influenciador,
      imposto:        p.imposto,
      margem:         p.margem,
      cest:           p.cest,
      inf_adicionais: p.infAdicionais,
      tipo_emb:       p.tipoEmb,
    },
  }
}

// ─── Marketplace row → MktListing ─────────────────────────────────────────────

function mktRowToListing(row: Record<string, unknown>): MktListing {
  const x = (row.extra_data as Record<string, unknown>) ?? {}
  return {
    enabled:     Boolean(row.active),
    anuncioId:   (row.listing_id  as string | null) ?? null,
    link:        (row.listing_url as string | null) ?? null,
    status:      (row.status as MktListing['status']) ?? null,
    precoManual: parseFloat(String(row.price_manual ?? 0)) || 0,
    estoqueSync: Boolean(x.estoque_sync ?? true),
    categoria:   String(row.category ?? ''),
    obs:         String(x.obs ?? ''),
    titulo:      String(row.title ?? ''),
    descricao:   String(row.description ?? ''),
    // ML
    tipoAnuncio: x.tipo_anuncio as MktListing['tipoAnuncio'],
    freteML:     x.frete_ml as boolean | undefined,
    // Shopee
    descCurta:   x.desc_curta  as string | undefined,
    freteGratis: x.frete_gratis as boolean | undefined,
    // Amazon
    bullets:     x.bullets    as string[] | undefined,
    backendKw:   x.backend_kw as string | undefined,
    fulfillment: (x.fulfillment ?? row.fulfillment) as MktListing['fulfillment'],
    asin:        x.asin as string | undefined,
    // NS/TRY/LI
    seoMeta:     x.seo_meta  as string | undefined,
    slug:        x.slug      as string | undefined,
    destaque:    x.destaque  as boolean | undefined,
    tagsSEO:     x.tags_seo  as string[] | undefined,
    // TikTok
    tagsProd:    x.tags_prod  as string[] | undefined,
    // AliExpress
    tituloEN:    x.titulo_en  as string | undefined,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getProducts(userId: string): Promise<Produto[]> {
  if (!isConfigured()) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error || !data) {
    console.error('[getProducts]', error)
    return []
  }
  return data.map(r => rowToProduct(r as Record<string, unknown>))
}

export async function getProduct(id: number, userId: string): Promise<Produto | null> {
  if (!isConfigured()) return null

  const { data: row, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !row) { console.error('[getProduct]', error); return null }

  const product = rowToProduct(row as Record<string, unknown>)

  // Load marketplace data
  const { data: mktRows } = await supabase
    .from('product_marketplaces')
    .select('*')
    .eq('product_id', id)

  const mkt: Partial<Record<MKT, MktListing>> = Object.fromEntries(
    MKTS.map(m => [m, {
      enabled: false, anuncioId: null, link: null, status: null,
      precoManual: 0, estoqueSync: true, categoria: '', obs: '',
      titulo: '', descricao: '',
    }])
  ) as Partial<Record<MKT, MktListing>>

  for (const r of (mktRows ?? [])) {
    const mktKey = DB_MKT[(r as Record<string, unknown>).marketplace as string]
    if (mktKey) mkt[mktKey] = mktRowToListing(r as Record<string, unknown>)
  }
  product.mkt = mkt

  return product
}

export async function createProduct(p: Produto, userId: string): Promise<Produto | null> {
  if (!isConfigured()) {
    console.log('[dev] createProduct (mock):', p.nome)
    return { ...p, id: Date.now() }
  }

  const { data, error } = await supabase
    .from('products')
    .insert(productToRow(p, userId))
    .select()
    .single()

  if (error || !data) { console.error('[createProduct]', error); return null }
  return rowToProduct(data as Record<string, unknown>)
}

export async function updateProduct(p: Produto, userId: string): Promise<boolean> {
  if (!isConfigured()) { console.log('[dev] updateProduct (mock):', p.id); return true }

  const { error } = await supabase
    .from('products')
    .update({ ...productToRow(p, userId), updated_at: new Date().toISOString() })
    .eq('id', p.id)
    .eq('user_id', userId)

  if (error) { console.error('[updateProduct]', error); return false }
  return true
}

export async function deleteProduct(id: number, userId: string): Promise<boolean> {
  if (!isConfigured()) { console.log('[dev] deleteProduct (mock):', id); return true }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) { console.error('[deleteProduct]', error); return false }
  return true
}

export async function saveProductMarketplaces(
  productId: number,
  mkt: Partial<Record<MKT, MktListing>>,
  userId: string,
): Promise<boolean> {
  if (!isConfigured()) { console.log('[dev] saveProductMarketplaces (mock):', productId); return true }

  // Verify ownership
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('id', productId)
    .eq('user_id', userId)
  if (!count) return false

  const rows = MKTS
    .filter(m => mkt[m])
    .map(m => {
      const l = mkt[m]!
      const extra: Record<string, unknown> = {
        obs: l.obs, estoque_sync: l.estoqueSync,
      }
      if (l.tipoAnuncio !== undefined) extra.tipo_anuncio = l.tipoAnuncio
      if (l.freteML     !== undefined) extra.frete_ml     = l.freteML
      if (l.descCurta   !== undefined) extra.desc_curta   = l.descCurta
      if (l.freteGratis !== undefined) extra.frete_gratis = l.freteGratis
      if (l.bullets     !== undefined) extra.bullets      = l.bullets
      if (l.backendKw   !== undefined) extra.backend_kw   = l.backendKw
      if (l.fulfillment !== undefined) extra.fulfillment  = l.fulfillment
      if (l.asin        !== undefined) extra.asin         = l.asin
      if (l.seoMeta     !== undefined) extra.seo_meta     = l.seoMeta
      if (l.slug        !== undefined) extra.slug         = l.slug
      if (l.destaque    !== undefined) extra.destaque     = l.destaque
      if (l.tagsSEO     !== undefined) extra.tags_seo     = l.tagsSEO
      if (l.tagsProd    !== undefined) extra.tags_prod    = l.tagsProd
      if (l.tituloEN    !== undefined) extra.titulo_en    = l.tituloEN

      return {
        product_id:  productId,
        marketplace: MKT_DB[m],
        active:      l.enabled,
        title:       l.titulo,
        description: l.descricao,
        category:    l.categoria,
        status:      l.status,
        listing_id:  l.anuncioId,
        listing_url: l.link,
        price_manual:l.precoManual,
        fulfillment: l.fulfillment ?? null,
        extra_data:  extra,
      }
    })

  if (!rows.length) return true

  const { error } = await supabase
    .from('product_marketplaces')
    .upsert(rows, { onConflict: 'product_id,marketplace' })

  if (error) { console.error('[saveProductMarketplaces]', error); return false }
  return true
}

export async function saveStockMovement(
  productId: number,
  userId: string,
  type: 'entrada' | 'saida',
  quantity: number,
  reason: string,
  userName: string,
): Promise<boolean> {
  if (!isConfigured()) {
    console.log('[dev] saveStockMovement (mock):', { productId, type, quantity })
    return true
  }

  const { error } = await supabase.from('stock_movements').insert({
    product_id: productId,
    user_id:    userId,
    type,
    quantity:   type === 'entrada' ? Math.abs(quantity) : -Math.abs(quantity),
    reason,
    user_name:  userName,
  })

  if (error) { console.error('[saveStockMovement]', error); return false }
  return true
}
