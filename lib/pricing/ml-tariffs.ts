/**
 * lib/pricing/ml-tariffs.ts
 *
 * Tarifas reais do Mercado Livre Brasil — extraídas das páginas de ajuda oficiais.
 * Fonte: mercadolivre.com.br/ajuda + koncili.com/blog/categorias-do-mercado-livre
 * Referência: médias praticadas em 2025 — validar periodicamente em:
 *   https://www.mercadolivre.com.br/ajuda/16449
 *   https://www.mercadolivre.com.br/ajuda/tarifas-e-faturamento_1472
 *
 * REGRA: NUNCA aplicar preço automaticamente no ML — apenas simular e sugerir.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MLCategoryCommission {
  /** ID da categoria no ML (ex: "MLA1246"). Null = match só por nome */
  categoryId:   string | null
  categoryName: string
  /** Comissão Anúncio Clássico (%) */
  classicPct:   number
  /** Comissão Anúncio Premium (%) */
  premiumPct:   number
}

export interface MLFixedFee {
  /** Preço mínimo do produto (inclusive) */
  priceMin: number
  /** Preço máximo do produto (exclusive). null = sem limite superior */
  priceMax: number | null
  /** Taxa fixa em R$ */
  fee:      number
  /** Descrição */
  label:    string
}

export interface MLShippingTier {
  /** Peso máximo em gramas (inclusive) */
  weightMaxG: number
  /** Custo base para reputação Verde (R$) — referência conservadora */
  baseGreen:  number
  /** Custo base para reputação Amarela / sem reputação (R$) */
  baseYellow: number
}

export interface MLReputationShipping {
  /** Nível de reputação */
  level:            'platinum' | 'gold' | 'silver' | 'green' | 'yellow' | 'none'
  label:            string
  /** Percentual de desconto que o ML subsidia no frete (0–100) */
  subsidyPct:       number
  /** Frete grátis automático p/ compras acima deste valor (R$). null = não se aplica */
  freeShippingAbove: number | null
}

// ─── Comissões por categoria ──────────────────────────────────────────────────
// Fonte: koncili.com (jan/2025) — médias praticadas

export const ML_CATEGORY_COMMISSIONS: MLCategoryCommission[] = [
  { categoryId: 'MLA1430', categoryName: 'Acessórios para Veículos',      classicPct: 12.0, premiumPct: 17.0 },
  { categoryId: null,      categoryName: 'Agro',                           classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: 'MLA1403', categoryName: 'Alimentos e Bebidas',            classicPct: 14.0, premiumPct: 19.0 },
  { categoryId: null,      categoryName: 'Antiguidades e Coleções',        classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: null,      categoryName: 'Arte, Papelaria e Armarinho',    classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: 'MLA5726', categoryName: 'Bebês',                          classicPct: 14.0, premiumPct: 19.0 },
  { categoryId: 'MLA1246', categoryName: 'Beleza e Cuidado Pessoal',       classicPct: 14.0, premiumPct: 19.0 },
  { categoryId: 'MLA1132', categoryName: 'Brinquedos e Hobbies',           classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: 'MLA1430', categoryName: 'Calçados, Roupas e Bolsas',      classicPct: 14.0, premiumPct: 19.0 },
  { categoryId: null,      categoryName: 'Câmeras e Acessórios',           classicPct: 11.0, premiumPct: 16.0 },
  { categoryId: 'MLA1574', categoryName: 'Casa, Móveis e Decoração',       classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: null,      categoryName: 'Construção',                     classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: 'MLA1000', categoryName: 'Eletrodomésticos',               classicPct: 11.0, premiumPct: 16.0 },
  { categoryId: 'MLA1002', categoryName: 'Eletrônicos, Áudio e Vídeo',     classicPct: 13.0, premiumPct: 18.0 },
  { categoryId: 'MLA1168', categoryName: 'Esportes e Fitness',             classicPct: 14.0, premiumPct: 19.0 },
  { categoryId: null,      categoryName: 'Festas e Lembrancinhas',         classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: 'MLA1144', categoryName: 'Games',                         classicPct: 13.0, premiumPct: 18.0 },
  { categoryId: 'MLA1648', categoryName: 'Informática',                    classicPct: 11.0, premiumPct: 16.0 },
  { categoryId: null,      categoryName: 'Indústria e Comércio',           classicPct: 12.0, premiumPct: 17.0 },
  { categoryId: null,      categoryName: 'Ingressos',                      classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: null,      categoryName: 'Instrumentos Musicais',          classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: 'MLA1499', categoryName: 'Joias e Relógios',               classicPct: 12.5, premiumPct: 17.5 },
  { categoryId: 'MLA3025', categoryName: 'Livros, Revistas e Comics',      classicPct: 12.0, premiumPct: 17.0 },
  { categoryId: null,      categoryName: 'Música, Filmes e Seriados',      classicPct: 12.0, premiumPct: 17.0 },
  { categoryId: 'MLA1297', categoryName: 'Pet Shop',                       classicPct: 12.5, premiumPct: 17.5 },
  { categoryId: 'MLA1276', categoryName: 'Saúde',                          classicPct: 12.0, premiumPct: 17.0 },
  // Celulares: categoria com alíquota específica
  { categoryId: 'MLA1055', categoryName: 'Celulares e Smartphones',        classicPct: 13.0, premiumPct: 18.0 },
  { categoryId: null,      categoryName: 'Acessórios para Celulares',      classicPct: 14.0, premiumPct: 19.0 },
  { categoryId: null,      categoryName: 'Ferramentas',                    classicPct: 11.5, premiumPct: 16.5 },
  { categoryId: null,      categoryName: 'Automotivo',                     classicPct: 12.0, premiumPct: 17.0 },
]

/** Comissão padrão quando a categoria não é encontrada */
export const ML_DEFAULT_COMMISSION: MLCategoryCommission = {
  categoryId:   null,
  categoryName: 'Outros / Não identificado',
  classicPct:   12.0,
  premiumPct:   17.0,
}

// ─── Taxa fixa por venda ──────────────────────────────────────────────────────
// Fonte: vendedores.mercadolivre.com.br
// Aplica-se apenas para produtos abaixo de R$ 79,00

export const ML_FIXED_FEES: MLFixedFee[] = [
  { priceMin: 0,     priceMax: 12.50, fee: 0,    label: 'Abaixo de R$ 12,50 — 50% do valor (sem taxa fixa)' },
  { priceMin: 12.50, priceMax: 20.01, fee: 5.50, label: 'R$ 12,50 a R$ 20,00'  },
  { priceMin: 20.01, priceMax: 79.00, fee: 6.00, label: 'R$ 20,01 a R$ 78,99'  },
  { priceMin: 79.00, priceMax: null,  fee: 0,    label: 'Acima de R$ 79,00 — sem taxa fixa' },
]

// Nota especial: produtos < R$ 12,50 → taxa = 50% do valor (tratado no engine)
export const ML_MIN_PRICE_HALF_FEE = 12.50

// ─── Frete estimado por peso (Mercado Envios) ─────────────────────────────────
// Fonte: mercadolivre.com.br/ajuda/49973 (tabela de custos de envio)
// Valores representam o custo real cobrado do vendedor pelo ML (reputação Verde)
// Reputação Amarela/sem reputação: ~15% mais caro

export const ML_SHIPPING_TIERS: MLShippingTier[] = [
  { weightMaxG:   300, baseGreen:  8.00, baseYellow: 10.00 },
  { weightMaxG:   700, baseGreen: 10.50, baseYellow: 13.00 },
  { weightMaxG:  1000, baseGreen: 12.00, baseYellow: 15.00 },
  { weightMaxG:  2000, baseGreen: 15.00, baseYellow: 18.50 },
  { weightMaxG:  3000, baseGreen: 18.00, baseYellow: 22.00 },
  { weightMaxG:  5000, baseGreen: 22.00, baseYellow: 27.00 },
  { weightMaxG:  7000, baseGreen: 27.00, baseYellow: 33.00 },
  { weightMaxG: 10000, baseGreen: 32.00, baseYellow: 39.00 },
  { weightMaxG: 15000, baseGreen: 40.00, baseYellow: 49.00 },
  { weightMaxG: 20000, baseGreen: 50.00, baseYellow: 61.00 },
  { weightMaxG: 30000, baseGreen: 62.00, baseYellow: 76.00 },
]

/** Peso máximo suportado pelo Mercado Envios Padrão (g) */
export const ML_MAX_WEIGHT_G = 30_000

/** Peso cúbico: quando dimensões disponíveis, usar o maior entre peso real e cúbico */
export function calcCubicWeightG(lengthCm: number, widthCm: number, heightCm: number): number {
  return Math.round((lengthCm * widthCm * heightCm) / 5) * 1000 / 1000
  // Fórmula ML: (L × W × H cm³) / 5 = peso cúbico em gramas
  // Simplificado: peso cúbico (kg) = (cm³) / 5000 → g = * 1000
}

// ─── Descontos de reputação no frete ─────────────────────────────────────────
// Fonte: mercadolivre.com.br/ajuda/Custos-para-frete-gratis-pelo-mercado-envios_3362
// MercadoLíder: ML subsidia parte do frete grátis

export const ML_REPUTATION_SHIPPING: MLReputationShipping[] = [
  {
    level:             'platinum',
    label:             'MercadoLíder Platinum',
    subsidyPct:        100,   // ML cobre 100% do frete (até limite por envio)
    freeShippingAbove: 0,     // Frete grátis em todos os produtos
  },
  {
    level:             'gold',
    label:             'MercadoLíder Gold',
    subsidyPct:        40,    // ML cobre 40% do custo do frete grátis
    freeShippingAbove: 79,    // Frete grátis em produtos acima de R$ 79
  },
  {
    level:             'silver',
    label:             'MercadoLíder Silver',
    subsidyPct:        20,    // ML cobre 20% do frete
    freeShippingAbove: 120,   // Frete grátis em produtos acima de R$ 120
  },
  {
    level:             'green',
    label:             'Reputação Verde',
    subsidyPct:        0,
    freeShippingAbove: 120,   // Vendedor paga 100% do frete grátis (acima de R$ 120)
  },
  {
    level:             'yellow',
    label:             'Reputação Amarela',
    subsidyPct:        0,
    freeShippingAbove: null,  // Sem frete grátis automático
  },
  {
    level:             'none',
    label:             'Sem reputação',
    subsidyPct:        0,
    freeShippingAbove: null,
  },
]

// ─── Custos Full / Fulfillment ────────────────────────────────────────────────
// Fonte: mercadolivre.com.br/ajuda/40538
// Valores aproximados — variam por tamanho do produto e duração de armazenagem

export interface MLFullCost {
  sizeLabel:     string
  handlingFee:   number  // taxa de expedição por envio (R$)
  storagePer30d: number  // armazenagem por unidade a cada 30 dias (R$) — após 90 dias gratuitos
}

export const ML_FULL_COSTS: MLFullCost[] = [
  { sizeLabel: 'Pequeno (até 0,5kg, até 20×13×2cm)',      handlingFee: 4.50,  storagePer30d: 0.50 },
  { sizeLabel: 'Médio (até 1kg, até 35×25×4cm)',          handlingFee: 5.50,  storagePer30d: 0.80 },
  { sizeLabel: 'Grande (até 5kg, até 60×45×45cm)',        handlingFee: 7.50,  storagePer30d: 1.20 },
  { sizeLabel: 'Extra-grande (até 25kg, até 90×60×60cm)', handlingFee: 12.00, storagePer30d: 2.50 },
]

// ─── Funções auxiliares ───────────────────────────────────────────────────────

/**
 * Busca comissão da categoria pelo ID ou nome (match parcial, case-insensitive).
 * Retorna ML_DEFAULT_COMMISSION se não encontrar.
 */
export function getCommissionForCategory(
  categoryId:   string | null,
  categoryName: string | null,
): MLCategoryCommission {
  if (categoryId) {
    const byId = ML_CATEGORY_COMMISSIONS.find(c => c.categoryId === categoryId)
    if (byId) return byId
  }
  if (categoryName) {
    const lower = categoryName.toLowerCase()
    const byName = ML_CATEGORY_COMMISSIONS.find(c =>
      c.categoryName.toLowerCase().includes(lower) ||
      lower.includes(c.categoryName.toLowerCase().split(' ')[0].toLowerCase())
    )
    if (byName) return byName
  }
  return ML_DEFAULT_COMMISSION
}

/**
 * Calcula a taxa fixa por venda com base no preço do produto.
 * Produtos < R$ 12,50: taxa = 50% do valor (tratado separadamente na engine).
 */
export function getFixedFee(price: number): number {
  if (price < ML_MIN_PRICE_HALF_FEE) return price * 0.5
  const tier = ML_FIXED_FEES.find(
    t => price >= t.priceMin && (t.priceMax === null || price < t.priceMax)
  )
  return tier?.fee ?? 0
}

/**
 * Estima custo de frete pelo Mercado Envios com base no peso total (g).
 * Usa peso cúbico quando dimensões disponíveis.
 * reputation: nível de reputação do vendedor.
 */
export function estimateShipping(
  weightG:     number,
  reputation:  MLReputationShipping['level'] = 'none',
): number {
  const clampedWeight = Math.min(weightG, ML_MAX_WEIGHT_G)
  const tier = ML_SHIPPING_TIERS.find(t => clampedWeight <= t.weightMaxG)
    ?? ML_SHIPPING_TIERS[ML_SHIPPING_TIERS.length - 1]

  const isYellow = reputation === 'yellow' || reputation === 'none'
  const base = isYellow ? tier.baseYellow : tier.baseGreen

  // Desconto de subsídio do ML para MercadoLíderes
  const repConfig = ML_REPUTATION_SHIPPING.find(r => r.level === reputation)
  const subsidyPct = repConfig?.subsidyPct ?? 0

  return Math.round(base * (1 - subsidyPct / 100) * 100) / 100
}

/**
 * Retorna configuração de reputação.
 */
export function getReputationConfig(level: string): MLReputationShipping {
  return ML_REPUTATION_SHIPPING.find(r => r.level === level)
    ?? ML_REPUTATION_SHIPPING[ML_REPUTATION_SHIPPING.length - 1]
}

/** Mapeia seller_reputation do ML para nosso nível interno */
export function mapMLReputation(
  powerSellerStatus: string | null,
  levelColor:        string | null,
): MLReputationShipping['level'] {
  if (powerSellerStatus === 'platinum') return 'platinum'
  if (powerSellerStatus === 'gold')     return 'gold'
  if (powerSellerStatus === 'silver')   return 'silver'
  if (levelColor === 'green')           return 'green'
  if (levelColor === 'yellow')          return 'yellow'
  return 'none'
}
