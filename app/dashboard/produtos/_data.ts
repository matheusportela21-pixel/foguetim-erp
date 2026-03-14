// ─── Types ───────────────────────────────────────────────────────────────────

export type Status    = 'ativo' | 'inativo' | 'pausado' | 'rascunho'
export type MKT       = 'ML' | 'SP' | 'AMZ' | 'MAG' | 'TKT' | 'AME' | 'CB' | 'NS' | 'TRY' | 'LI' | 'ALI'
export type Condicao  = 'Novo' | 'Usado' | 'Recondicionado'
export type Unidade   = 'UN' | 'KG' | 'L' | 'ML' | 'CX' | 'KIT' | 'PAR' | 'PCT'
export type Garantia  = 'Sem garantia' | '30 dias' | '90 dias' | '6 meses' | '1 ano' | '2 anos'
export type MktStatus = 'ativo' | 'pausado' | 'pendente' | 'reprovado'
export type TipoEmb   = 'Caixa' | 'Envelope' | 'Tubo' | 'Saco plástico'

export interface MktListing {
  // ── comum ──────────────────────────────────────────────────────────────────
  enabled:      boolean
  anuncioId:    string | null
  link:         string | null
  status:       MktStatus | null
  precoManual:  number          // 0 = use auto
  estoqueSync:  boolean
  categoria:    string
  obs:          string
  // ── conteúdo (todos os canais) ─────────────────────────────────────────────
  titulo:       string          // título específico deste canal
  descricao:    string          // descrição específica deste canal
  // ── Mercado Livre ──────────────────────────────────────────────────────────
  tipoAnuncio?: 'classico' | 'premium'
  freteML?:     boolean         // ML Envios ativo
  // ── Shopee ─────────────────────────────────────────────────────────────────
  descCurta?:   string          // até 500 chars
  freteGratis?: boolean
  // ── Amazon ─────────────────────────────────────────────────────────────────
  bullets?:     string[]        // até 5 bullet points (500 chars cada)
  backendKw?:   string          // keywords de backend (250 chars)
  fulfillment?: 'FBA' | 'FBM'
  asin?:        string
  // ── Nuvemshop / Tray / Loja Integrada ─────────────────────────────────────
  seoMeta?:     string          // meta description 160 chars
  slug?:        string
  destaque?:    boolean
  tagsSEO?:     string[]
  // ── TikTok Shop ────────────────────────────────────────────────────────────
  tagsProd?:    string[]        // até 10 tags
  // ── AliExpress ─────────────────────────────────────────────────────────────
  tituloEN?:    string          // título em inglês 128 chars
}

export interface Produto {
  id:              number
  sku:             string
  ean:             string
  nome:            string
  descricao:       string
  descricaoCurta:  string
  marca:           string
  categoria:       string
  tags:            string[]
  status:          Status
  condicao:        Condicao
  unidade:         Unidade
  garantia:        Garantia
  // pricing
  custo:           number
  embalagem:       number
  variados:        number
  marketing:       number   // %
  influenciador:   number   // %
  imposto:         number   // %
  margem:          number   // % desejada
  precoVenda:      number   // manual override (0 = use auto)
  // stock
  estoqueReal:     number
  estoqueVirtual:  number
  estoqueMinimo:   number
  // fiscal
  ncm:             string
  cfop:            string
  origem:          string
  cest:            string
  icms:            number
  ipi:             number
  pis:             number
  cofins:          number
  infAdicionais:   string
  // dims (cm / kg)
  compProd: number; largProd: number; altProd: number; pesoProd: number
  compEmb:  number; largEmb:  number; altEmb:  number; pesoEmb:  number
  tipoEmb:  TipoEmb
  // images
  imagens:         string[]
  // marketplaces
  mkt:             Partial<Record<MKT, MktListing>>
  // meta
  criadoEm:        string
  updatedAt:       string
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MARCAS = ['Fio Cabana', 'Castilla', 'BioSeiva', 'Kronel', 'Lanossi', 'Zalike']

export const CATEGORIAS = [
  'Cabelos', 'Corpo', 'Rosto', 'Barba', 'Infantil', 'Higiene', 'Perfumaria',
]

export const TAGS_LIST = [
  'vegano', 'sem-sulfato', 'sem-parabenos', 'natural', 'orgânico',
  'hidratante', 'anti-queda', 'proteína', 'argan', 'coco',
]

export const UNIDADES: Unidade[]  = ['UN', 'KG', 'L', 'ML', 'CX', 'KIT', 'PAR', 'PCT']
export const GARANTIAS: Garantia[] = ['Sem garantia', '30 dias', '90 dias', '6 meses', '1 ano', '2 anos']
export const CONDICOES: Condicao[] = ['Novo', 'Usado', 'Recondicionado']
export const TIPOS_EMB: TipoEmb[]  = ['Caixa', 'Envelope', 'Tubo', 'Saco plástico']

export const MKTS: MKT[] = ['ML', 'SP', 'AMZ', 'MAG', 'TKT', 'AME', 'CB', 'NS', 'TRY', 'LI', 'ALI']

export const MKT_RULES: Record<MKT, { comissao: number; frete: number; tarifa: number; nome: string; freteInfo: string }> = {
  ML:  { comissao: 14, frete: 18, tarifa: 6,  nome: 'Mercado Livre',    freteInfo: 'Frete grátis obrigatório acima de R$ 79'    },
  SP:  { comissao: 14, frete: 12, tarifa: 0,  nome: 'Shopee',           freteInfo: 'Programa Frete Grátis Shopee disponível'    },
  AMZ: { comissao: 15, frete: 22, tarifa: 0,  nome: 'Amazon',           freteInfo: 'FBA (estoque Amazon) ou FBM (envio próprio)' },
  MAG: { comissao: 16, frete: 20, tarifa: 0,  nome: 'Magalu',           freteInfo: 'Frete grátis em compras acima de R$ 69'     },
  TKT: { comissao:  5, frete:  0, tarifa: 0,  nome: 'TikTok Shop',      freteInfo: 'Frete grátis incentivado pelo TikTok'       },
  AME: { comissao: 16, frete: 15, tarifa: 0,  nome: 'Americanas',       freteInfo: 'Frete calculado por faixa de CEP'           },
  CB:  { comissao: 16, frete: 15, tarifa: 0,  nome: 'Casas Bahia',      freteInfo: 'Via Varejo — frete calculado por CEP'       },
  NS:  { comissao:  0, frete: 12, tarifa: 0,  nome: 'Nuvemshop',        freteInfo: 'Loja própria — frete via Melhor Envio'      },
  TRY: { comissao:  0, frete: 12, tarifa: 0,  nome: 'Tray',             freteInfo: 'Loja própria — frete configurável'          },
  LI:  { comissao:  0, frete: 12, tarifa: 0,  nome: 'Loja Integrada',   freteInfo: 'Loja própria — frete via hub'               },
  ALI: { comissao:  8, frete:  0, tarifa: 0,  nome: 'AliExpress',       freteInfo: 'Frete internacional incluso no produto'     },
}

export const MKT_COLOR: Record<MKT, string> = {
  ML:  'text-amber-400   bg-amber-400/10',
  SP:  'text-orange-400  bg-orange-400/10',
  AMZ: 'text-cyan-400    bg-cyan-400/10',
  MAG: 'text-blue-400    bg-blue-400/10',
  TKT: 'text-slate-200   bg-slate-700/40',
  AME: 'text-rose-400    bg-rose-400/10',
  CB:  'text-yellow-400  bg-yellow-400/10',
  NS:  'text-indigo-400  bg-indigo-400/10',
  TRY: 'text-yellow-600  bg-yellow-700/10',
  LI:  'text-violet-400  bg-violet-400/10',
  ALI: 'text-red-400     bg-red-400/10',
}

export const MKT_STATUS_META: Record<MktStatus, { label: string; cls: string }> = {
  ativo:    { label: 'Ativo',    cls: 'text-green-400  bg-green-400/10'  },
  pausado:  { label: 'Pausado',  cls: 'text-amber-400  bg-amber-400/10'  },
  pendente: { label: 'Pendente', cls: 'text-blue-400   bg-blue-400/10'   },
  reprovado:{ label: 'Reprovado',cls: 'text-red-400    bg-red-400/10'    },
}

export const STATUS_META: Record<Status, { label: string; cls: string }> = {
  ativo:    { label: 'Ativo',    cls: 'text-green-400  bg-green-400/10'  },
  inativo:  { label: 'Inativo',  cls: 'text-slate-400  bg-slate-400/10'  },
  pausado:  { label: 'Pausado',  cls: 'text-amber-400  bg-amber-400/10'  },
  rascunho: { label: 'Rascunho', cls: 'text-purple-400 bg-purple-400/10' },
}

export const MARCA_COLOR: Record<string, string> = {
  'Fio Cabana': 'text-emerald-400 bg-emerald-400/10',
  'Castilla':   'text-blue-400    bg-blue-400/10',
  'BioSeiva':   'text-green-400   bg-green-400/10',
  'Kronel':     'text-cyan-400    bg-cyan-400/10',
  'Lanossi':    'text-purple-400  bg-purple-400/10',
  'Zalike':     'text-pink-400    bg-pink-400/10',
}

// ─── Pricing helpers ──────────────────────────────────────────────────────────

export function calcFreteAuto(compEmb: number, largEmb: number, altEmb: number, pesoEmb: number): number {
  if (!compEmb || !largEmb || !altEmb || !pesoEmb) return 0
  const pesoCubado = (compEmb * largEmb * altEmb) / 6000
  const pesoCobrado = Math.max(pesoEmb, pesoCubado)
  // Simple frete estimate: R$6 base + R$4/kg
  return Math.round((6 + pesoCobrado * 4) * 100) / 100
}

export function calcPreco(
  p: Pick<Produto, 'custo'|'embalagem'|'variados'|'marketing'|'influenciador'|'imposto'|'margem'|'compEmb'|'largEmb'|'altEmb'|'pesoEmb'>,
  mkt: MKT,
  freteOverride?: number,
): number {
  const r = MKT_RULES[mkt]
  const frete = freteOverride !== undefined ? freteOverride : r.frete
  const custoFixo = p.custo + p.embalagem + p.variados + frete + r.tarifa
  const taxaVar   = (r.comissao + p.marketing + (p.influenciador ?? 0) + p.imposto) / 100
  const pct       = taxaVar + p.margem / 100
  if (pct >= 1) return custoFixo * 3
  return Math.ceil((custoFixo / (1 - pct)) * 100) / 100
}

export function margem(p: Produto, mkt: MKT): number {
  const r = MKT_RULES[mkt]
  const listing = p.mkt[mkt]
  const venda = (listing?.precoManual ?? 0) > 0 ? listing!.precoManual : (p.precoVenda > 0 ? p.precoVenda : calcPreco(p, mkt))
  const custoFixo = p.custo + p.embalagem + p.variados + r.frete + r.tarifa
  const taxaVar   = (r.comissao + p.marketing + (p.influenciador ?? 0) + p.imposto) / 100
  const lucro = venda * (1 - taxaVar) - custoFixo
  return Math.round((lucro / venda) * 100 * 10) / 10
}

export function healthScore(p: Produto): { score: number; checks: { label: string; ok: boolean }[] } {
  const checks = [
    { label: 'Tem título',           ok: p.nome.length > 5                           },
    { label: 'Tem descrição',        ok: p.descricao.length > 20                     },
    { label: 'Tem imagem',           ok: p.imagens.length > 0                        },
    { label: 'Tem 3+ imagens',       ok: p.imagens.length >= 3                       },
    { label: 'Tem EAN/GTIN',         ok: !!p.ean                                     },
    { label: 'Tem NCM',              ok: !!p.ncm                                     },
    { label: 'Em estoque',           ok: p.estoqueReal > 0                           },
    { label: 'Estoque acima mínimo', ok: p.estoqueReal > p.estoqueMinimo             },
    { label: 'Publicado (1+ canal)', ok: Object.values(p.mkt).some(m => m?.enabled)  },
    { label: 'Margem saudável (>15%)',ok: MKTS.filter(m => p.mkt[m]?.enabled).length === 0 || MKTS.filter(m => p.mkt[m]?.enabled).every(m => margem(p, m) >= 15) },
    { label: 'Não é rascunho',       ok: p.status !== 'rascunho'                     },
  ]
  const score = Math.round(checks.filter(c => c.ok).length / checks.length * 100)
  return { score, checks }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

function mkl(
  on: boolean,
  id: string | null,
  precoManual = 0,
  extras: Partial<MktListing> = {},
): MktListing {
  return {
    enabled: on,
    anuncioId: on && id ? id : null,
    link: on && id ? `https://exemplo.com/${id}` : null,
    status: on ? 'ativo' : null,
    precoManual,
    estoqueSync: true,
    categoria: '',
    obs: '',
    titulo: '',
    descricao: '',
    ...extras,
  }
}

type MkCfg = Partial<Record<MKT, boolean>>

function mk(cfg: MkCfg = {}, extras: Partial<Record<MKT, Partial<MktListing>>> = {}): Partial<Record<MKT, MktListing>> {
  const ids: Record<MKT, () => string> = {
    ML:  () => `MLB${Math.floor(1000000+Math.random()*9000000)}`,
    SP:  () => `SP${Math.floor(100000+Math.random()*900000)}`,
    AMZ: () => `B0${Math.floor(10000+Math.random()*90000)}X`,
    MAG: () => `MAG${Math.floor(10000+Math.random()*90000)}`,
    TKT: () => `TKT${Math.floor(100000+Math.random()*900000)}`,
    AME: () => `AME${Math.floor(10000+Math.random()*90000)}`,
    CB:  () => `CB${Math.floor(10000+Math.random()*90000)}`,
    NS:  () => `NS${Math.floor(10000+Math.random()*90000)}`,
    TRY: () => `TRY${Math.floor(10000+Math.random()*90000)}`,
    LI:  () => `LI${Math.floor(10000+Math.random()*90000)}`,
    ALI: () => `ALI${Math.floor(10000+Math.random()*90000)}`,
  }
  const result: Partial<Record<MKT, MktListing>> = {}
  for (const m of MKTS) {
    const on = cfg[m] ?? false
    result[m] = mkl(on, on ? ids[m]() : null, 0, extras[m] ?? {})
  }
  return result
}

const DESC_ARGAN = `Formulado com óleo de argan puro extraído a frio, este óleo capilar proporciona hidratação intensa, brilho e maciez sem deixar resíduo gorduroso. Ideal para cabelos ressecados, com frizz ou quimicamente tratados. Aplicar em mechas úmidas ou secas antes de finalizar.`
const DESC_SHAMPOO = `Shampoo de limpeza suave com pH balanceado, sem sulfatos agressivos. Limpa profundamente os fios e o couro cabeludo removendo impurezas sem ressecar. Enriquecido com extratos naturais para nutrir e fortalecer os fios a cada lavagem.`
const DESC_CURTA = `Tratamento capilar premium com tecnologia avançada. Resultados visíveis desde a primeira aplicação.`

export const produtos: Produto[] = []
