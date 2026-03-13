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

export const produtos: Produto[] = [
  // ─── Fio Cabana ────────────────────────────────────────────────────────────
  {
    id: 1, sku: 'FIO-001', ean: '7891234560001',
    nome: 'Óleo Capilar Fio Cabana Argan 100ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Fio Cabana', categoria: 'Cabelos',
    tags: ['argan', 'hidratante', 'sem-sulfato'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 18.50, embalagem: 1.80, variados: 0.70, marketing: 3, influenciador: 1, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 148, estoqueVirtual: 142, estoqueMinimo: 20,
    ncm: '3305.90.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 4, largProd: 4, altProd: 10, pesoProd: 0.12,
    compEmb: 6, largEmb: 6, altEmb: 12, pesoEmb: 0.18, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/a855f7?text=FIO-001'],
    mkt: mk({ ML: true, SP: true }, {
      ML: { titulo: 'Óleo Capilar Argan Fio Cabana 100ml Anti-Frizz Brilho', tipoAnuncio: 'premium', freteML: true,
            descricao: 'Formulado com óleo de argan puro extraído a frio. Proporciona hidratação intensa, brilho e maciez sem resíduo gorduroso. Ideal para cabelos ressecados, com frizz ou quimicamente tratados.' },
      SP:  { titulo: 'Óleo Capilar Argan Fio Cabana 100ml Anti-Frizz Hidratante Brilho Intenso Cabelos Ressecados',
             descCurta: 'Óleo capilar premium com argan puro extraído a frio. Anti-frizz e hidratação intensa sem resíduo gorduroso.', freteGratis: false,
             descricao: 'Formulado com óleo de argan puro extraído a frio. Proporciona hidratação intensa, brilho e maciez sem resíduo gorduroso. Para cabelos ressecados, com frizz ou quimicamente tratados.' },
    }),
    criadoEm: '2025-08-14', updatedAt: '2026-03-01',
  },
  {
    id: 2, sku: 'FIO-002', ean: '7891234560002',
    nome: 'Shampoo Fio Cabana Coco Nutritivo 400ml',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Fio Cabana', categoria: 'Cabelos',
    tags: ['coco', 'hidratante', 'sem-parabenos'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 14.20, embalagem: 1.20, variados: 0.50, marketing: 3, influenciador: 0, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 93, estoqueVirtual: 93, estoqueMinimo: 15,
    ncm: '3305.10.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 20, pesoProd: 0.44,
    compEmb: 9, largEmb: 9, altEmb: 22, pesoEmb: 0.50, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/a855f7?text=FIO-002', 'https://placehold.co/400x400/1a1f2e/a855f7?text=FIO-002b'],
    mkt: mk({ ML: true, SP: true, AMZ: true }, {
      ML:  { titulo: 'Shampoo Coco Nutritivo Fio Cabana 400ml Sem Parabenos', tipoAnuncio: 'premium', freteML: true,
             descricao: 'Shampoo de limpeza suave com pH balanceado, sem sulfatos agressivos. Enriquecido com óleo de coco para nutrição e maciez. Limpa profundamente sem ressecar.' },
      SP:  { titulo: 'Shampoo Coco Nutritivo Fio Cabana 400ml Sem Parabenos Hidratação Profunda Limpeza Suave pH Balanceado',
             descCurta: 'Shampoo com óleo de coco, sem parabenos e pH balanceado. Limpa sem ressecar, nutre e fortalece os fios.', freteGratis: false,
             descricao: 'Shampoo de limpeza suave com pH balanceado, sem sulfatos agressivos. Rico em óleo de coco para nutrição intensa. Cabelos limpos, nutridos e com brilho desde a primeira lavagem.' },
      AMZ: { titulo: 'Shampoo Nutritivo Fio Cabana 400ml com Óleo de Coco - Sem Parabenos, pH Balanceado, Limpeza Suave para Cabelos Secos e Danificados',
             fulfillment: 'FBM', backendKw: 'shampoo coco nutritivo sem parabenos ph balanceado fio cabana cabelos ressecados',
             bullets: [
               'ÓLEO DE COCO PURO: Enriquecido com extratos de coco que penetram na fibra capilar restaurando a hidratação e o brilho natural',
               'SEM PARABENOS E SULFATOS AGRESSIVOS: Fórmula gentle com pH balanceado que limpa profundamente sem agredir o couro cabeludo',
               'PARA CABELOS SECOS E DANIFICADOS: Ideal para cabelos ressecados, quimicamente tratados ou com frizz excessivo',
               'LIMPEZA SUAVE E EFICAZ: Remove impurezas e excesso de oleosidade sem deixar o cabelo pesado ou sem brilho',
               'RESULTADO VISÍVEL: Cabelos mais nutridos, macios e com brilho intenso desde a primeira lavagem',
             ] },
    }),
    criadoEm: '2025-08-14', updatedAt: '2026-02-28',
  },
  {
    id: 3, sku: 'FIO-003', ean: '7891234560003',
    nome: 'Condicionador Fio Cabana Proteína 400ml',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Fio Cabana', categoria: 'Cabelos',
    tags: ['proteína', 'hidratante'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 13.80, embalagem: 1.20, variados: 0.50, marketing: 3, influenciador: 0, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 67, estoqueVirtual: 60, estoqueMinimo: 10,
    ncm: '3305.20.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 20, pesoProd: 0.43,
    compEmb: 9, largEmb: 9, altEmb: 22, pesoEmb: 0.49, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/a855f7?text=FIO-003'],
    mkt: mk({ ML: true, SP: true, AME: true }, {
      ML:  { titulo: 'Condicionador Proteína Fio Cabana 400ml Hidratação', tipoAnuncio: 'classico', freteML: true,
             descricao: 'Condicionador com proteínas hidrolisadas que reconstroem a estrutura capilar. Hidratação profunda, menos quebra e fios mais fortes e elásticos.' },
      SP:  { titulo: 'Condicionador Proteína Fio Cabana 400ml Hidratação Reconstrução Capilar Anti-Quebra Fios Fortes',
             descCurta: 'Condicionador com proteínas que reconstroem e fortalecem os fios. Hidratação profunda e menos quebra.', freteGratis: false,
             descricao: 'Condicionador com proteínas hidrolisadas para reconstrução capilar. Reduz a quebra, hidrata profundamente e deixa os fios mais fortes, elásticos e brilhantes.' },
    }),
    criadoEm: '2025-09-01', updatedAt: '2026-02-20',
  },
  {
    id: 4, sku: 'FIO-004', ean: '7891234560004',
    nome: 'Máscara Capilar Fio Cabana Ouro 500g',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Fio Cabana', categoria: 'Cabelos',
    tags: ['hidratante', 'argan', 'natural'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 28.90, embalagem: 2.00, variados: 0.80, marketing: 3, influenciador: 0, imposto: 6, margem: 12,
    precoVenda: 0,
    estoqueReal: 5, estoqueVirtual: 5, estoqueMinimo: 10,
    ncm: '3305.90.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 10, largProd: 10, altProd: 8, pesoProd: 0.52,
    compEmb: 12, largEmb: 12, altEmb: 10, pesoEmb: 0.60, tipoEmb: 'Caixa',
    imagens: [],
    mkt: mk({ ML: true }, {
      ML: { titulo: 'Máscara Capilar Ouro Fio Cabana 500g Hidratação Intensa',
            tipoAnuncio: 'premium', freteML: true,
            descricao: 'Máscara capilar com óleo de argan e partículas de ouro para hidratação ultra intensa. Restaura cabelos danificados, sela as cutículas e proporciona brilho espelhado.' },
    }),
    criadoEm: '2025-10-10', updatedAt: '2026-03-05',
  },
  {
    id: 5, sku: 'FIO-005', ean: '',
    nome: 'Leave-in Fio Cabana Reparador 200ml',
    descricao: '', descricaoCurta: '',
    marca: 'Fio Cabana', categoria: 'Cabelos',
    tags: ['sem-sulfato', 'proteína', 'hidratante'],
    status: 'rascunho', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 16.40, embalagem: 1.50, variados: 0.60, marketing: 3, influenciador: 0, imposto: 6, margem: 28,
    precoVenda: 0,
    estoqueReal: 0, estoqueVirtual: 0, estoqueMinimo: 10,
    ncm: '3305.90.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 5, largProd: 5, altProd: 14, pesoProd: 0.22,
    compEmb: 7, largEmb: 7, altEmb: 16, pesoEmb: 0.28, tipoEmb: 'Caixa',
    imagens: [],
    mkt: mk({}),
    criadoEm: '2026-02-28', updatedAt: '2026-03-10',
  },

  // ─── Castilla ──────────────────────────────────────────────────────────────
  {
    id: 6, sku: 'CAS-001', ean: '7891234560006',
    nome: 'Shampoo Castilla Antiqueda 400ml',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Castilla', categoria: 'Cabelos',
    tags: ['anti-queda', 'sem-parabenos'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 11.60, embalagem: 1.10, variados: 0.40, marketing: 2, influenciador: 0, imposto: 6, margem: 32,
    precoVenda: 0,
    estoqueReal: 204, estoqueVirtual: 200, estoqueMinimo: 25,
    ncm: '3305.10.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 20, pesoProd: 0.43,
    compEmb: 9, largEmb: 9, altEmb: 22, pesoEmb: 0.49, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/3b82f6?text=CAS-001', 'https://placehold.co/400x400/1a1f2e/3b82f6?text=CAS-001b', 'https://placehold.co/400x400/1a1f2e/3b82f6?text=CAS-001c'],
    mkt: mk({ ML: true, SP: true, AMZ: true, AME: true, MAG: true }, {
      ML:  { titulo: 'Shampoo Antiqueda Castilla 400ml Sem Parabenos Fortalecedor', tipoAnuncio: 'premium', freteML: true },
      SP:  { titulo: 'Shampoo Antiqueda Castilla 400ml Sem Parabenos Fortalece Reduz Queda Estimula Crescimento Capilar',
             descCurta: 'Shampoo antiqueda com pH balanceado. Sem parabenos. Fortalece e estimula o crescimento dos fios.', freteGratis: true },
      AMZ: { titulo: 'Shampoo Anti-Queda Castilla 400ml - Tratamento Fortalecedor sem Parabenos, Reduz Queda e Estimula Crescimento dos Fios, pH Balanceado',
             asin: 'B09ABC1234', fulfillment: 'FBM', backendKw: 'shampoo antiqueda fortalecedor sem parabenos crescimento capilar tratamento',
             bullets: [
               'FORTALECE OS FIOS: Fórmula avançada com ativos fortalecedores que penetram na fibra capilar reduzindo a queda em até 70% em 4 semanas',
               'SEM PARABENOS E SULFATOS AGRESSIVOS: pH balanceado que limpa profundamente sem ressecar ou agredir o couro cabeludo sensível',
               'ESTIMULA O CRESCIMENTO: Extratos naturais que ativam os folículos capilares para promover cabelos mais densos e saudáveis',
               'PARA TODOS OS TIPOS DE CABELO: Adequado para cabelos lisos, ondulados, cacheados, coloridos ou quimicamente tratados',
               'RESULTADO VISÍVEL: Cabelos mais fortes e com menos queda desde a primeira semana de uso contínuo',
             ]},
    }),
    criadoEm: '2025-07-20', updatedAt: '2026-03-08',
  },
  {
    id: 7, sku: 'CAS-002', ean: '7891234560007',
    nome: 'Condicionador Castilla Coco 400ml',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Castilla', categoria: 'Cabelos',
    tags: ['coco', 'hidratante', 'vegano'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 10.90, embalagem: 1.10, variados: 0.40, marketing: 2, influenciador: 0, imposto: 6, margem: 32,
    precoVenda: 0,
    estoqueReal: 172, estoqueVirtual: 172, estoqueMinimo: 20,
    ncm: '3305.20.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 20, pesoProd: 0.42,
    compEmb: 9, largEmb: 9, altEmb: 22, pesoEmb: 0.48, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/3b82f6?text=CAS-002'],
    mkt: mk({ ML: true, SP: true, AME: true }, {
      ML:  { titulo: 'Condicionador Coco Castilla 400ml Hidratação Vegano', tipoAnuncio: 'classico', freteML: true,
             descricao: 'Condicionador com óleo de coco e fórmula vegana. Hidratação profunda, maciez e brilho para todos os tipos de cabelo. Sem parabenos, sem crueldade.' },
      SP:  { titulo: 'Condicionador Coco Castilla 400ml Vegano Hidratação Intensa Maciez Brilho Sem Parabenos Todos Tipos',
             descCurta: 'Condicionador vegano com coco. Hidratação intensa, maciez e brilho para todos os tipos de cabelo.', freteGratis: false,
             descricao: 'Condicionador vegano com óleo de coco que proporciona hidratação profunda e maciez incomparável. Livre de parabenos e testado sem crueldade.' },
    }),
    criadoEm: '2025-07-20', updatedAt: '2026-02-15',
  },
  {
    id: 8, sku: 'CAS-003', ean: '7891234560008',
    nome: 'Castilla Shampoo Vegano 400ml',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Castilla', categoria: 'Cabelos',
    tags: ['vegano', 'sem-sulfato', 'sem-parabenos', 'natural'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 22.40, embalagem: 1.10, variados: 0.40, marketing: 2, influenciador: 0, imposto: 6, margem: 8,
    precoVenda: 0,
    estoqueReal: 38, estoqueVirtual: 35, estoqueMinimo: 15,
    ncm: '3305.10.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 20, pesoProd: 0.43,
    compEmb: 9, largEmb: 9, altEmb: 22, pesoEmb: 0.49, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/3b82f6?text=CAS-003'],
    mkt: mk({ ML: true, SP: true, AMZ: true }, {
      ML:  { titulo: 'Shampoo Vegano Castilla 400ml Sem Sulfato Natural', tipoAnuncio: 'premium', freteML: true,
             descricao: 'Shampoo 100% vegano sem sulfatos agressivos. Fórmula natural com ingredientes de origem vegetal. Limpa suavemente e respeita o meio ambiente.' },
      SP:  { titulo: 'Shampoo Vegano Castilla 400ml Sem Sulfato Sem Parabenos Natural Certificado Lavagem Leve Couro',
             descCurta: 'Shampoo 100% vegano, sem sulfatos e sem parabenos. Limpeza suave, natural e respeitosa com o couro cabeludo.', freteGratis: false,
             descricao: 'Shampoo 100% vegano com fórmula natural isenta de sulfatos, parabenos e ingredientes de origem animal. Ideal para couro cabeludo sensível e cabelos quimicamente tratados.' },
      AMZ: { titulo: 'Shampoo Vegano Castilla 400ml - Sem Sulfatos e Sem Parabenos, Limpeza Suave Natural, Certificado Vegano, para Todos os Tipos de Cabelo',
             fulfillment: 'FBM', backendKw: 'shampoo vegano sem sulfato sem parabenos natural castilla cabelos sensíveis orgânico',
             bullets: [
               'CERTIFICADO VEGANO: 100% livre de ingredientes de origem animal e não testado em animais, com certificação vegana internacional',
               'SEM SULFATOS E SEM PARABENOS: Fórmula suave que não agride o couro cabeludo, ideal para uso frequente e cabelos sensíveis',
               'LIMPEZA NATURAL EFICAZ: Surfactantes de origem vegetal que removem impurezas sem comprometer a hidratação natural do cabelo',
               'PARA TODOS OS TIPOS: Adequado para cabelos lisos, cacheados, coloridos, quimicamente tratados e couro cabeludo sensível',
               'SUSTENTÁVEL E CONSCIENTE: Embalagem reciclável e fórmula biodegradável com mínimo impacto ambiental',
             ] },
    }),
    criadoEm: '2025-08-05', updatedAt: '2026-01-30',
  },
  {
    id: 9, sku: 'CAS-004', ean: '7891234560009',
    nome: 'Kit Castilla Antiqueda Shampoo + Condicionador',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Castilla', categoria: 'Cabelos',
    tags: ['anti-queda', 'kit'],
    status: 'ativo', condicao: 'Novo', unidade: 'KIT', garantia: 'Sem garantia',
    custo: 24.50, embalagem: 2.50, variados: 1.00, marketing: 2, influenciador: 0, imposto: 6, margem: 28,
    precoVenda: 0,
    estoqueReal: 0, estoqueVirtual: 0, estoqueMinimo: 5,
    ncm: '3305.10.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 9, largProd: 7, altProd: 22, pesoProd: 0.95,
    compEmb: 11, largEmb: 11, altEmb: 24, pesoEmb: 1.10, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/3b82f6?text=CAS-004'],
    mkt: mk({ ML: true, SP: true }, {
      ML:  { titulo: 'Kit Castilla Antiqueda Shampoo Condicionador 400ml', tipoAnuncio: 'premium', freteML: true,
             descricao: 'Kit completo antiqueda com shampoo e condicionador Castilla. Fórmula sem parabenos que fortalece, reduz a queda e estimula o crescimento capilar.' },
      SP:  { titulo: 'Kit Castilla Antiqueda Shampoo + Condicionador 400ml Sem Parabenos Fortalece Estimula Crescimento',
             descCurta: 'Kit completo antiqueda: shampoo + condicionador Castilla sem parabenos. Fortalece e estimula o crescimento.', freteGratis: true,
             descricao: 'Kit antiqueda completo com shampoo e condicionador. Fórmula sem parabenos que atua na redução da queda, fortalecimento e estimulação do crescimento capilar.' },
    }),
    criadoEm: '2025-09-15', updatedAt: '2026-02-01',
  },
  {
    id: 10, sku: 'CAS-005', ean: '7891234560010',
    nome: 'Castilla Máscara Detox Carvão 300g',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Castilla', categoria: 'Cabelos',
    tags: ['natural', 'sem-parabenos'],
    status: 'pausado', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 19.80, embalagem: 1.80, variados: 0.70, marketing: 2, influenciador: 0, imposto: 6, margem: 25,
    precoVenda: 0,
    estoqueReal: 12, estoqueVirtual: 12, estoqueMinimo: 8,
    ncm: '3305.90.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 9, largProd: 9, altProd: 7, pesoProd: 0.32,
    compEmb: 11, largEmb: 11, altEmb: 9, pesoEmb: 0.40, tipoEmb: 'Caixa',
    imagens: [],
    mkt: mk({}),
    criadoEm: '2025-10-01', updatedAt: '2026-01-10',
  },

  // ─── BioSeiva ──────────────────────────────────────────────────────────────
  {
    id: 11, sku: 'BIO-001', ean: '7891234560011',
    nome: 'BioSeiva Hidratante Corporal Aloe Vera 500ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'BioSeiva', categoria: 'Corpo',
    tags: ['natural', 'hidratante', 'vegano'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 16.80, embalagem: 1.60, variados: 0.60, marketing: 3, influenciador: 2, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 89, estoqueVirtual: 85, estoqueMinimo: 15,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 22, pesoProd: 0.52,
    compEmb: 9, largEmb: 9, altEmb: 24, pesoEmb: 0.58, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/22c55e?text=BIO-001', 'https://placehold.co/400x400/1a1f2e/22c55e?text=BIO-001b'],
    mkt: mk({ ML: true, SP: true, AMZ: true, MAG: true }, {
      ML:  { titulo: 'Hidratante Corporal BioSeiva Aloe Vera 500ml Natural', tipoAnuncio: 'premium', freteML: true,
             descricao: 'Hidratante corporal natural com Aloe Vera puro. Hidratação prolongada de até 24h, absorção rápida sem resíduo oleoso. Vegano e sem parabenos.' },
      SP:  { titulo: 'Hidratante Corporal BioSeiva Aloe Vera 500ml Natural Vegano Absorção Rápida 24h Hidratação Sem Parabenos',
             descCurta: 'Hidratante corporal natural com Aloe Vera. Hidratação de 24h, absorção rápida, vegano e sem parabenos.', freteGratis: false,
             descricao: 'Hidratante corporal com Aloe Vera puro que proporciona hidratação profunda e duradoura de até 24 horas. Absorção imediata sem resíduo gorduroso. Fórmula vegana e sem parabenos.' },
      AMZ: { titulo: 'Hidratante Corporal BioSeiva 500ml com Aloe Vera Puro - Hidratação 24h, Absorção Rápida, Vegano, Sem Parabenos',
             fulfillment: 'FBM', backendKw: 'hidratante corporal aloe vera vegano sem parabenos bioseiva 24h absorção rápida',
             bullets: [
               'ALOE VERA PURO: Concentrado de babosa que hidrata, acalma e regenera a pele com propriedades naturais comprovadas',
               'HIDRATAÇÃO 24 HORAS: Fórmula de longa duração que mantém a pele hidratada e macia durante todo o dia',
               'ABSORÇÃO ULTRA RÁPIDA: Textura leve que penetra imediatamente na pele sem deixar resíduo gorduroso ou pegajoso',
               'VEGANO E SEM PARABENOS: Certificado vegano, livre de parabenos e não testado em animais',
               'PARA TODOS OS TIPOS DE PELE: Adequado para pele seca, normal, sensível e mista — inclusive para uso diário',
             ] },
    }),
    criadoEm: '2025-07-10', updatedAt: '2026-03-07',
  },
  {
    id: 12, sku: 'BIO-002', ean: '7891234560012',
    nome: 'BioSeiva Esfoliante Açúcar Mascavo 300g',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'BioSeiva', categoria: 'Corpo',
    tags: ['natural', 'orgânico'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 14.60, embalagem: 1.40, variados: 0.60, marketing: 3, influenciador: 0, imposto: 6, margem: 28,
    precoVenda: 0,
    estoqueReal: 4, estoqueVirtual: 4, estoqueMinimo: 8,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 9, largProd: 9, altProd: 6, pesoProd: 0.32,
    compEmb: 11, largEmb: 11, altEmb: 8, pesoEmb: 0.38, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/22c55e?text=BIO-002'],
    mkt: mk({ ML: true, SP: true }, {
      ML:  { titulo: 'Esfoliante Corporal BioSeiva Açúcar Mascavo 300g Natural',
             tipoAnuncio: 'classico', freteML: true,
             descricao: 'Esfoliante corporal com açúcar mascavo e óleos naturais. Remove células mortas, suaviza e ilumina a pele. Fórmula orgânica sem conservantes artificiais.' },
      SP:  { titulo: 'Esfoliante Corporal Açúcar Mascavo BioSeiva 300g Orgânico Natural Ilumina Suaviza Remove Células',
             descCurta: 'Esfoliante natural com açúcar mascavo. Remove células mortas, suaviza e ilumina a pele. Orgânico e sem conservantes.', freteGratis: false,
             descricao: 'Esfoliante corporal orgânico com açúcar mascavo que remove células mortas, promove renovação celular e deixa a pele suave, iluminada e uniforme.' },
    }),
    criadoEm: '2025-08-22', updatedAt: '2026-02-18',
  },
  {
    id: 13, sku: 'BIO-003', ean: '7891234560013',
    nome: 'BioSeiva Sabonete Líquido Bambu 400ml',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'BioSeiva', categoria: 'Higiene',
    tags: ['natural', 'vegano', 'sem-parabenos'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 10.40, embalagem: 1.00, variados: 0.40, marketing: 3, influenciador: 0, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 117, estoqueVirtual: 117, estoqueMinimo: 20,
    ncm: '3401.20.10', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 20, pesoProd: 0.42,
    compEmb: 9, largEmb: 9, altEmb: 22, pesoEmb: 0.48, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/22c55e?text=BIO-003', 'https://placehold.co/400x400/1a1f2e/22c55e?text=BIO-003b', 'https://placehold.co/400x400/1a1f2e/22c55e?text=BIO-003c'],
    mkt: mk({ ML: true, SP: true, AMZ: true, AME: true, MAG: true }, {
      ML:  { titulo: 'Sabonete Líquido Bambu BioSeiva 400ml Vegano Suave', tipoAnuncio: 'classico', freteML: true,
             descricao: 'Sabonete líquido com extrato de bambu. Limpeza suave e refrescante para o corpo inteiro. Fórmula vegana sem parabenos com ph balanceado.' },
      SP:  { titulo: 'Sabonete Líquido Bambu BioSeiva 400ml Vegano Refrescante Limpeza Suave pH Balanceado Sem Parabenos',
             descCurta: 'Sabonete líquido vegano com extrato de bambu. Limpeza suave, refrescante e pH balanceado para toda a família.', freteGratis: false,
             descricao: 'Sabonete líquido vegano com extrato natural de bambu. Limpeza suave e refrescante para todo o corpo. pH balanceado, sem parabenos e adequado para pele sensível.' },
      AMZ: { titulo: 'Sabonete Líquido Corporal BioSeiva 400ml com Bambu - Vegano, pH Balanceado, Limpeza Suave sem Parabenos',
             fulfillment: 'FBM', backendKw: 'sabonete liquido bambu vegano sem parabenos ph balanceado bioseiva suave refrescante',
             bullets: [
               'EXTRATO DE BAMBU: Ativo natural com propriedades purificantes e refrescantes que promovem uma sensação de limpeza e bem-estar',
               'FÓRMULA VEGANA: 100% livre de ingredientes de origem animal, não testado em animais, com certificação vegana',
               'pH BALANCEADO: Formulado para manter o pH natural da pele, indicado para uso diário inclusive em pele sensível',
               'SEM PARABENOS: Conservantes naturais que garantem segurança e durabilidade sem comprometer a saúde da pele',
               'PARA TODA A FAMÍLIA: Adequado para adultos e crianças, corpo e mãos, com fragrância suave e agradável',
             ] },
    }),
    criadoEm: '2025-07-10', updatedAt: '2026-03-02',
  },
  {
    id: 14, sku: 'BIO-004', ean: '7891234560014',
    nome: 'BioSeiva Óleo Corporal Rosa Mosqueta 60ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'BioSeiva', categoria: 'Corpo',
    tags: ['natural', 'orgânico', 'hidratante'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 24.00, embalagem: 1.80, variados: 0.70, marketing: 3, influenciador: 0, imposto: 6, margem: 32,
    precoVenda: 0,
    estoqueReal: 55, estoqueVirtual: 52, estoqueMinimo: 10,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 4, largProd: 4, altProd: 11, pesoProd: 0.08,
    compEmb: 6, largEmb: 6, altEmb: 13, pesoEmb: 0.14, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/22c55e?text=BIO-004'],
    mkt: mk({ ML: true, SP: true, AMZ: true }, {
      ML:  { titulo: 'Óleo Corporal Rosa Mosqueta BioSeiva 60ml Natural', tipoAnuncio: 'premium', freteML: true,
             descricao: 'Óleo de rosa mosqueta 100% puro e natural. Regenera a pele, reduz manchas, cicatrizes e rugas. Absorção rápida sem resíduo oleoso. Ideal para rosto e corpo.' },
      SP:  { titulo: 'Óleo Corporal Rosa Mosqueta BioSeiva 60ml Puro Natural Regenerador Anti-Manchas Cicatrizante Rosto',
             descCurta: 'Óleo de rosa mosqueta 100% puro. Regenera, reduz manchas e cicatrizes. Absorção rápida para rosto e corpo.', freteGratis: false,
             descricao: 'Óleo de rosa mosqueta puro extraído a frio. Regenera e rejuvenesce a pele, reduz manchas escuras, cicatrizes, linhas de expressão e estrias.' },
      AMZ: { titulo: 'Óleo de Rosa Mosqueta BioSeiva 60ml 100% Puro - Regenerador, Anti-Manchas, Anti-Rugas, Absorção Rápida para Rosto e Corpo',
             fulfillment: 'FBM', backendKw: 'oleo rosa mosqueta puro natural regenerador anti-manchas cicatrizante rugas bioseiva',
             bullets: [
               'ROSA MOSQUETA 100% PURA: Óleo extraído a frio que preserva todos os nutrientes e propriedades regeneradoras naturais',
               'REDUZ MANCHAS E CICATRIZES: Rico em ácidos graxos essenciais que uniformizam o tom da pele e suavizam imperfeições',
               'ANTI-RUGAS NATURAL: Vitaminas A, C e E que estimulam a produção de colágeno para pele mais firme e jovem',
               'ABSORÇÃO ULTRA RÁPIDA: Textura seca que penetra imediatamente sem deixar resíduo gorduroso no rosto ou corpo',
               'MULTIPOTENTE: Indicado para rosto, contorno dos olhos, lábios, estrias, cutículas e cicatrizes em geral',
             ] },
    }),
    criadoEm: '2025-09-30', updatedAt: '2026-02-25',
  },
  {
    id: 15, sku: 'BIO-005', ean: '',
    nome: 'BioSeiva Creme Facial Noturno 50g',
    descricao: '', descricaoCurta: '',
    marca: 'BioSeiva', categoria: 'Rosto',
    tags: ['natural', 'hidratante', 'sem-parabenos'],
    status: 'rascunho', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 32.00, embalagem: 2.20, variados: 0.80, marketing: 3, influenciador: 0, imposto: 6, margem: 35,
    precoVenda: 0,
    estoqueReal: 0, estoqueVirtual: 0, estoqueMinimo: 5,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 8, largProd: 8, altProd: 5, pesoProd: 0.06,
    compEmb: 10, largEmb: 10, altEmb: 7, pesoEmb: 0.12, tipoEmb: 'Caixa',
    imagens: [],
    mkt: mk({}),
    criadoEm: '2026-03-01', updatedAt: '2026-03-10',
  },

  // ─── Kronel ────────────────────────────────────────────────────────────────
  {
    id: 16, sku: 'KRO-001', ean: '7891234560016',
    nome: 'Kronel Shampoo Barba 200ml',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Kronel', categoria: 'Barba',
    tags: ['sem-parabenos', 'natural'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 15.20, embalagem: 1.30, variados: 0.50, marketing: 2, influenciador: 0, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 76, estoqueVirtual: 76, estoqueMinimo: 12,
    ncm: '3305.10.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 5, largProd: 5, altProd: 15, pesoProd: 0.22,
    compEmb: 7, largEmb: 7, altEmb: 17, pesoEmb: 0.28, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/06b6d4?text=KRO-001', 'https://placehold.co/400x400/1a1f2e/06b6d4?text=KRO-001b'],
    mkt: mk({ ML: true, SP: true, AMZ: true }),
    criadoEm: '2025-08-18', updatedAt: '2026-03-04',
  },
  {
    id: 17, sku: 'KRO-002', ean: '7891234560017',
    nome: 'Kronel Balm Pós-Barba 120ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Kronel', categoria: 'Barba',
    tags: ['hidratante', 'sem-parabenos'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 18.40, embalagem: 1.50, variados: 0.60, marketing: 2, influenciador: 0, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 48, estoqueVirtual: 44, estoqueMinimo: 10,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 6, largProd: 6, altProd: 8, pesoProd: 0.14,
    compEmb: 8, largEmb: 8, altEmb: 10, pesoEmb: 0.20, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/06b6d4?text=KRO-002'],
    mkt: mk({ ML: true, SP: true }),
    criadoEm: '2025-09-05', updatedAt: '2026-02-10',
  },
  {
    id: 18, sku: 'KRO-003', ean: '7891234560018',
    nome: 'Kronel Óleo de Barba Premium 30ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Kronel', categoria: 'Barba',
    tags: ['argan', 'natural'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 22.00, embalagem: 1.60, variados: 0.60, marketing: 2, influenciador: 0, imposto: 6, margem: 32,
    precoVenda: 0,
    estoqueReal: 7, estoqueVirtual: 7, estoqueMinimo: 10,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 3, largProd: 3, altProd: 10, pesoProd: 0.05,
    compEmb: 5, largEmb: 5, altEmb: 12, pesoEmb: 0.10, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/06b6d4?text=KRO-003'],
    mkt: mk({ ML: true, AMZ: true }),
    criadoEm: '2025-10-12', updatedAt: '2026-03-01',
  },
  {
    id: 19, sku: 'KRO-004', ean: '7891234560019',
    nome: 'Kronel Kit Barba Completo (4 itens)',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Kronel', categoria: 'Barba',
    tags: ['kit'],
    status: 'inativo', condicao: 'Novo', unidade: 'KIT', garantia: 'Sem garantia',
    custo: 58.00, embalagem: 4.00, variados: 2.00, marketing: 2, influenciador: 0, imposto: 6, margem: 25,
    precoVenda: 0,
    estoqueReal: 0, estoqueVirtual: 0, estoqueMinimo: 3,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 18, largProd: 12, altProd: 8, pesoProd: 0.65,
    compEmb: 20, largEmb: 14, altEmb: 10, pesoEmb: 0.80, tipoEmb: 'Caixa',
    imagens: [],
    mkt: mk({}),
    criadoEm: '2025-11-01', updatedAt: '2026-01-05',
  },

  // ─── Lanossi ───────────────────────────────────────────────────────────────
  {
    id: 20, sku: 'LAN-001', ean: '7891234560020',
    nome: 'Lanossi Máscara Reparadora Profunda 500g',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Lanossi', categoria: 'Cabelos',
    tags: ['proteína', 'hidratante', 'anti-queda'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 26.50, embalagem: 2.00, variados: 0.80, marketing: 3, influenciador: 1, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 63, estoqueVirtual: 60, estoqueMinimo: 10,
    ncm: '3305.90.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 11, largProd: 11, altProd: 9, pesoProd: 0.54,
    compEmb: 13, largEmb: 13, altEmb: 11, pesoEmb: 0.62, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/a855f7?text=LAN-001', 'https://placehold.co/400x400/1a1f2e/a855f7?text=LAN-001b', 'https://placehold.co/400x400/1a1f2e/a855f7?text=LAN-001c'],
    mkt: mk({ ML: true, SP: true, AMZ: true, AME: true, MAG: true }, {
      ML:  { titulo: 'Máscara Reparadora Profunda Lanossi 500g Proteína Hidratação', tipoAnuncio: 'premium', freteML: true },
      SP:  { titulo: 'Máscara Capilar Reparadora Profunda Lanossi 500g Proteína Hidratação Cabelos Danificados Quimicamente', freteGratis: true,
             descCurta: 'Máscara de tratamento intensivo com proteínas e hidratantes profundos. Resultados visíveis desde a 1ª aplicação.' },
      AMZ: { titulo: 'Máscara Capilar Reparadora Lanossi 500g - Tratamento Intensivo com Proteínas e Hidratação Profunda para Cabelos Danificados',
             asin: 'B08XYZ9876', fulfillment: 'FBM', backendKw: 'mascara capilar reparadora proteina hidratacao profunda tratamento quimico',
             bullets: [
               'REPARAÇÃO INTENSA: Proteínas de alta penetração que reconstroem a estrutura interna do fio danificado por processos químicos e térmicos',
               'HIDRATAÇÃO DE LONGA DURAÇÃO: Complexo umectante que retém a umidade nos fios por até 72 horas após a aplicação',
               'SEM PARABENOS E CORANTES: Fórmula limpa com ativos naturais certificados, segura para cabelos coloridos e sensíveis',
               'APLICAÇÃO PRÁTICA: Use 1x por semana como máscara de tratamento ou diariamente como condicionador leave-in diluído',
               'RESULTADO PROFISSIONAL EM CASA: Tecnologia salon com fórmula premium para resultados visíveis desde a primeira aplicação',
             ]},
    }),
    criadoEm: '2025-07-25', updatedAt: '2026-03-09',
  },
  {
    id: 21, sku: 'LAN-002', ean: '7891234560021',
    nome: 'Lanossi Queratina Líquida 100ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Lanossi', categoria: 'Cabelos',
    tags: ['proteína', 'sem-sulfato'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 31.00, embalagem: 1.80, variados: 0.70, marketing: 3, influenciador: 0, imposto: 6, margem: 32,
    precoVenda: 0,
    estoqueReal: 41, estoqueVirtual: 41, estoqueMinimo: 8,
    ncm: '3305.90.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 4, largProd: 4, altProd: 11, pesoProd: 0.11,
    compEmb: 6, largEmb: 6, altEmb: 13, pesoEmb: 0.17, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/a855f7?text=LAN-002'],
    mkt: mk(true, true, false, false, true),
    criadoEm: '2025-08-30', updatedAt: '2026-02-22',
  },
  {
    id: 22, sku: 'LAN-003', ean: '7891234560022',
    nome: 'Lanossi Ampola Shine Cristal 10ml (cx 12un)',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Lanossi', categoria: 'Cabelos',
    tags: ['hidratante'],
    status: 'pausado', condicao: 'Novo', unidade: 'CX', garantia: 'Sem garantia',
    custo: 38.40, embalagem: 3.00, variados: 1.20, marketing: 3, influenciador: 0, imposto: 6, margem: 28,
    precoVenda: 0,
    estoqueReal: 18, estoqueVirtual: 18, estoqueMinimo: 6,
    ncm: '3305.90.00', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 12, largProd: 8, altProd: 4, pesoProd: 0.14,
    compEmb: 14, largEmb: 10, altEmb: 6, pesoEmb: 0.20, tipoEmb: 'Caixa',
    imagens: [],
    mkt: mk({}),
    criadoEm: '2025-11-15', updatedAt: '2026-01-20',
  },

  // ─── Zalike ────────────────────────────────────────────────────────────────
  {
    id: 23, sku: 'ZAL-001', ean: '7891234560023',
    nome: 'Zalike Hidratante Corporal Manteiga Karité 200ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Zalike', categoria: 'Corpo',
    tags: ['hidratante', 'natural', 'orgânico'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 19.60, embalagem: 1.70, variados: 0.70, marketing: 3, influenciador: 0, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 82, estoqueVirtual: 78, estoqueMinimo: 12,
    ncm: '3304.99.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 7, largProd: 7, altProd: 11, pesoProd: 0.23,
    compEmb: 9, largEmb: 9, altEmb: 13, pesoEmb: 0.29, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/ec4899?text=ZAL-001', 'https://placehold.co/400x400/1a1f2e/ec4899?text=ZAL-001b'],
    mkt: mk(true, true, true, false, true),
    criadoEm: '2025-09-08', updatedAt: '2026-03-06',
  },
  {
    id: 24, sku: 'ZAL-002', ean: '7891234560024',
    nome: 'Zalike Sabonete Esfoliante Café 100g',
    descricao: DESC_SHAMPOO, descricaoCurta: DESC_CURTA,
    marca: 'Zalike', categoria: 'Corpo',
    tags: ['natural', 'orgânico', 'vegano'],
    status: 'ativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 8.60, embalagem: 0.80, variados: 0.30, marketing: 3, influenciador: 0, imposto: 6, margem: 28,
    precoVenda: 0,
    estoqueReal: 3, estoqueVirtual: 3, estoqueMinimo: 10,
    ncm: '3401.11.90', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 6, largProd: 4, altProd: 3, pesoProd: 0.11,
    compEmb: 8, largEmb: 6, altEmb: 4, pesoEmb: 0.15, tipoEmb: 'Caixa',
    imagens: ['https://placehold.co/400x400/1a1f2e/ec4899?text=ZAL-002'],
    mkt: mk({ ML: true, SP: true }),
    criadoEm: '2025-10-22', updatedAt: '2026-02-14',
  },
  {
    id: 25, sku: 'ZAL-003', ean: '7891234560025',
    nome: 'Zalike Colônia Floral 50ml',
    descricao: DESC_ARGAN, descricaoCurta: DESC_CURTA,
    marca: 'Zalike', categoria: 'Perfumaria',
    tags: ['natural'],
    status: 'inativo', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 42.00, embalagem: 2.50, variados: 1.00, marketing: 5, influenciador: 0, imposto: 6, margem: 30,
    precoVenda: 0,
    estoqueReal: 0, estoqueVirtual: 0, estoqueMinimo: 5,
    ncm: '3303.00.20', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 5, largProd: 5, altProd: 12, pesoProd: 0.10,
    compEmb: 7, largEmb: 7, altEmb: 14, pesoEmb: 0.16, tipoEmb: 'Caixa',
    imagens: [],
    mkt: mk({}),
    criadoEm: '2025-12-01', updatedAt: '2026-02-01',
  },
]
