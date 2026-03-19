/**
 * lib/pricing/pricing-engine.ts
 *
 * Engine de cálculo de precificação — reutilizável para DRE, simulações e relatórios.
 * Segue a fórmula de markup por dentro: preço = custo_fixo / (1 - soma_variáveis).
 *
 * REGRA CRÍTICA: Este módulo NUNCA aplica preços. Apenas calcula e sugere.
 */

import {
  getCommissionForCategory,
  getFixedFee,
  estimateShipping,
  calcCubicWeightG,
  ML_MIN_PRICE_HALF_FEE,
  type MLReputationShipping,
} from './ml-tariffs'

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

export type ListingType = 'classic' | 'premium'

export type ReputationLevel = MLReputationShipping['level']

export type ShippingMode = 'seller_pays' | 'buyer_pays' | 'free_shipping'

export interface PricingInput {
  // ── Custos do produto ──────────────────────────────────────────
  /** Custo de aquisição / produção por unidade (R$) */
  productCost:          number
  /** Custo de embalagem por unidade (R$) */
  packagingCost:        number
  /** Outros custos fixos por unidade (R$) — logística interna, rateio operacional */
  otherCosts:           number

  // ── Custos variáveis do vendedor (% sobre o preço de venda) ───
  /** Imposto sobre faturamento (%) — Simples Nacional, LP, LR, MEI */
  taxPct:               number
  /** Marketing / Ads (%) — ACoS, Product Ads, campanhas */
  marketingPct:         number
  /** Afiliados / influenciadores (%) */
  affiliatePct:         number

  // ── Canal ML ───────────────────────────────────────────────────
  /** Tipo de anúncio: 'classic' ou 'premium' */
  listingType:          ListingType
  /**
   * Comissão ML da categoria (%).
   * Se null, a engine busca pela categoryId/categoryName.
   */
  categoryCommissionPct: number | null
  /** ID da categoria ML (ex: 'MLA1246') — para auto-lookup */
  categoryId:           string | null
  /** Nome da categoria ML — para auto-lookup quando categoryId não disponível */
  categoryName:         string | null
  /** Nível de reputação do vendedor */
  sellerReputation:     ReputationLevel

  // ── Frete ──────────────────────────────────────────────────────
  shippingMode:         ShippingMode
  /**
   * Peso do produto em gramas. null = sem dados para cálculo automático.
   * Quando disponível, o frete é calculado automaticamente.
   */
  productWeightG:       number | null
  /** Peso da embalagem em gramas */
  packagingWeightG:     number | null
  /** Dimensões para cálculo de peso cúbico (cm) */
  lengthCm:             number | null
  widthCm:              number | null
  heightCm:             number | null
  /**
   * Frete estimado manual (R$).
   * Usado quando não há dados de peso/dimensão.
   * Se null e houver peso, é calculado automaticamente.
   */
  manualShippingCost:   number | null

  // ── Full / Fulfillment ─────────────────────────────────────────
  isFull:               boolean
  /** Custo de handling Full por unidade (R$) */
  fullHandlingCost:     number
  /** Custo de armazenagem Full por unidade (R$) — proporcional ao giro */
  fullStorageCost:      number

  // ── Meta ───────────────────────────────────────────────────────
  /** Margem líquida desejada (%) — sobre o preço de venda */
  targetMarginPct:      number
  /** Preço atual no ML — para comparativo (R$). null = modo manual */
  currentMLPrice:       number | null
}

// ─── Tipos de saída ───────────────────────────────────────────────────────────

export interface PricingBreakdown {
  /** Cada componente de custo com nome, valor absoluto e % sobre o preço sugerido */
  items: Array<{
    key:     string
    label:   string
    value:   number     // R$
    pct:     number     // % sobre o preço de venda
    color:   string     // cor para o gráfico empilhado
    isProfit: boolean
  }>
  totalCost:  number    // soma de todos os custos (R$)
  totalPct:   number    // % do preço que vai para custos
}

export interface PricingResult {
  /** Preço sugerido para atingir a margem-alvo (R$) */
  suggestedPrice:    number
  /** Preço mínimo sem prejuízo — margem 0 (R$) */
  breakEvenPrice:    number
  /** Lucro líquido por unidade (R$) */
  netProfit:         number
  /** Margem líquida real (%) sobre o preço sugerido */
  realMarginPct:     number
  /** ROI sobre o custo de aquisição (%) */
  roi:               number
  /** Comissão ML aplicada (%) */
  commissionPct:     number
  /** Taxa fixa ML aplicada (R$) */
  fixedFee:          number
  /** Custo de frete (R$) — calculado automaticamente ou manual */
  shippingCost:      number
  /** true se o frete foi calculado com base em peso; false = estimativa manual */
  shippingIsAuto:    boolean
  /** Peso total efetivo (g) — real ou cúbico, o maior */
  effectiveWeightG:  number | null
  /** Breakdown completo dos custos */
  breakdown:         PricingBreakdown
  /** Comparativo com preço atual ML */
  mlComparison:      { currentPrice: number; delta: number; deltaPct: number } | null
  /** Status da margem */
  marginStatus:      'healthy' | 'tight' | 'loss'
  /** Aviso ao usuário (ex: "Frete estimado — informe peso para cálculo preciso") */
  warnings:          string[]
}

// ─── Engine principal ─────────────────────────────────────────────────────────

/**
 * Calcula o preço sugerido para atingir a margem-alvo.
 * Retorna resultado completo com breakdown e comparativo.
 */
export function calcSuggestedPrice(input: PricingInput): PricingResult {
  const warnings: string[] = []

  // ── 1. Comissão ML ──────────────────────────────────────────────────────────
  let commissionPct: number
  if (input.categoryCommissionPct !== null) {
    commissionPct = input.categoryCommissionPct
  } else {
    const cat = getCommissionForCategory(input.categoryId, input.categoryName)
    commissionPct = input.listingType === 'premium' ? cat.premiumPct : cat.classicPct
    if (!input.categoryId && !input.categoryName) {
      warnings.push('Categoria não informada — usando comissão padrão de 12% (Clássico) / 17% (Premium).')
    }
  }

  // ── 2. Frete ────────────────────────────────────────────────────────────────
  let shippingCost = 0
  let shippingIsAuto = false
  let effectiveWeightG: number | null = null

  if (input.shippingMode !== 'buyer_pays') {
    const realWeightG = (input.productWeightG ?? 0) + (input.packagingWeightG ?? 0)

    if (realWeightG > 0) {
      // Peso cúbico quando dimensões disponíveis
      let cubicG = 0
      if (input.lengthCm && input.widthCm && input.heightCm) {
        cubicG = calcCubicWeightG(input.lengthCm, input.widthCm, input.heightCm)
      }
      effectiveWeightG = Math.max(realWeightG, cubicG)
      shippingCost  = estimateShipping(effectiveWeightG, input.sellerReputation)
      shippingIsAuto = true
    } else if (input.manualShippingCost !== null) {
      shippingCost = input.manualShippingCost
      warnings.push('Frete estimado manualmente. Informe peso do produto para cálculo automático.')
    } else {
      shippingCost = 18  // fallback conservador
      warnings.push('Sem dados de peso — usando frete estimado de R$ 18,00. Informe o peso para cálculo preciso.')
    }
  }

  // ── 3. Full ─────────────────────────────────────────────────────────────────
  const fullCost = input.isFull
    ? (input.fullHandlingCost + input.fullStorageCost)
    : 0

  // ── 4. Soma de custos fixos (não dependem do preço) ─────────────────────────
  // A taxa fixa ML é calculada iterativamente (depende do preço), mas para uma
  // primeira aproximação usamos o getFixedFee com um preço estimado e depois
  // refinamos com o preço calculado.
  const fixedCostEstimate =
    input.productCost +
    input.packagingCost +
    input.otherCosts +
    shippingCost +
    fullCost

  // Primeira estimativa do preço (sem taxa fixa)
  const variablesPct = commissionPct + input.taxPct + input.marketingPct + input.affiliatePct
  const denomFirst   = 1 - (variablesPct + input.targetMarginPct) / 100
  const priceEstimate = denomFirst > 0 ? fixedCostEstimate / denomFirst : fixedCostEstimate * 4

  // Taxa fixa baseada no preço estimado
  let fixedFee = getFixedFee(priceEstimate)
  if (priceEstimate < ML_MIN_PRICE_HALF_FEE) {
    warnings.push(`Preço abaixo de R$ ${ML_MIN_PRICE_HALF_FEE.toFixed(2)} — ML cobra 50% do valor como taxa.`)
  }

  // ── 5. Cálculo final com taxa fixa ──────────────────────────────────────────
  const fixedCostTotal = fixedCostEstimate + fixedFee
  const denom = 1 - (variablesPct + input.targetMarginPct) / 100

  let suggestedPrice: number
  if (denom <= 0) {
    suggestedPrice = 0
    warnings.push('Configuração impossível: a soma de comissão + impostos + marketing + margem ultrapassa 100%.')
  } else {
    suggestedPrice = fixedCostTotal / denom
    // Recalcular taxa fixa com preço final e iterar uma vez
    const fixedFee2 = getFixedFee(suggestedPrice)
    if (Math.abs(fixedFee2 - fixedFee) > 0.01) {
      fixedFee = fixedFee2
      const fixedCostFinal = fixedCostEstimate + fixedFee
      suggestedPrice = fixedCostFinal / denom
    }
  }

  suggestedPrice = Math.max(0, suggestedPrice)

  // ── 6. Break-even (margem = 0) ──────────────────────────────────────────────
  const denomBE      = 1 - variablesPct / 100
  const fixedFeeAtBE = getFixedFee(denomBE > 0 ? (fixedCostEstimate + fixedFee) / denomBE : 0)
  const breakEvenPrice = denomBE > 0
    ? (fixedCostEstimate + fixedFeeAtBE) / denomBE
    : 0

  // ── 7. Lucro e margem reais ─────────────────────────────────────────────────
  const netProfit = suggestedPrice > 0
    ? suggestedPrice
      - (input.productCost + input.packagingCost + input.otherCosts)
      - shippingCost
      - fullCost
      - fixedFee
      - suggestedPrice * commissionPct    / 100
      - suggestedPrice * input.taxPct     / 100
      - suggestedPrice * input.marketingPct / 100
      - suggestedPrice * input.affiliatePct / 100
    : 0

  const realMarginPct = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0
  const roi           = input.productCost > 0 ? (netProfit / input.productCost) * 100 : 0

  // ── 8. Status de margem ─────────────────────────────────────────────────────
  let marginStatus: PricingResult['marginStatus']
  if (realMarginPct < 0)                      marginStatus = 'loss'
  else if (realMarginPct < input.targetMarginPct) marginStatus = 'tight'
  else                                          marginStatus = 'healthy'

  // ── 9. Breakdown ────────────────────────────────────────────────────────────
  const breakdown = buildBreakdown(
    suggestedPrice, input, commissionPct, fixedFee, shippingCost, fullCost, netProfit,
  )

  // ── 10. Comparativo ML ──────────────────────────────────────────────────────
  const mlComparison = input.currentMLPrice
    ? {
        currentPrice: input.currentMLPrice,
        delta:        suggestedPrice - input.currentMLPrice,
        deltaPct:     ((suggestedPrice - input.currentMLPrice) / input.currentMLPrice) * 100,
      }
    : null

  return {
    suggestedPrice:   Math.round(suggestedPrice * 100) / 100,
    breakEvenPrice:   Math.round(breakEvenPrice  * 100) / 100,
    netProfit:        Math.round(netProfit        * 100) / 100,
    realMarginPct:    Math.round(realMarginPct    * 100) / 100,
    roi:              Math.round(roi              * 100) / 100,
    commissionPct,
    fixedFee:         Math.round(fixedFee         * 100) / 100,
    shippingCost:     Math.round(shippingCost     * 100) / 100,
    shippingIsAuto,
    effectiveWeightG,
    breakdown,
    mlComparison,
    marginStatus,
    warnings,
  }
}

/**
 * Calcula a margem real dado um preço específico (para simulações).
 */
export function calcMarginFromPrice(price: number, input: PricingInput): {
  netProfit:     number
  marginPct:     number
  roi:           number
  marginStatus:  PricingResult['marginStatus']
} {
  const commissionPct = input.categoryCommissionPct
    ?? (getCommissionForCategory(input.categoryId, input.categoryName)[
        input.listingType === 'premium' ? 'premiumPct' : 'classicPct'
      ])

  let shippingCost = 0
  if (input.shippingMode !== 'buyer_pays') {
    const realWeightG = (input.productWeightG ?? 0) + (input.packagingWeightG ?? 0)
    shippingCost = realWeightG > 0
      ? estimateShipping(realWeightG, input.sellerReputation)
      : (input.manualShippingCost ?? 18)
  }

  const fullCost = input.isFull ? (input.fullHandlingCost + input.fullStorageCost) : 0
  const fixedFee = getFixedFee(price)

  const netProfit = price
    - (input.productCost + input.packagingCost + input.otherCosts)
    - shippingCost
    - fullCost
    - fixedFee
    - price * commissionPct       / 100
    - price * input.taxPct        / 100
    - price * input.marketingPct  / 100
    - price * input.affiliatePct  / 100

  const marginPct = price > 0 ? (netProfit / price) * 100 : 0
  const roi       = input.productCost > 0 ? (netProfit / input.productCost) * 100 : 0

  let marginStatus: PricingResult['marginStatus']
  if (marginPct < 0)                       marginStatus = 'loss'
  else if (marginPct < input.targetMarginPct) marginStatus = 'tight'
  else                                        marginStatus = 'healthy'

  return {
    netProfit:    Math.round(netProfit  * 100) / 100,
    marginPct:    Math.round(marginPct  * 100) / 100,
    roi:          Math.round(roi        * 100) / 100,
    marginStatus,
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function buildBreakdown(
  price:          number,
  input:          PricingInput,
  commissionPct:  number,
  fixedFee:       number,
  shippingCost:   number,
  fullCost:       number,
  netProfit:      number,
): PricingBreakdown {
  const pct = (v: number) => price > 0 ? (v / price) * 100 : 0

  const items: PricingBreakdown['items'] = []

  const push = (key: string, label: string, value: number, color: string, isProfit = false) => {
    if (Math.abs(value) < 0.001) return
    items.push({ key, label, value: Math.round(value * 100) / 100, pct: Math.round(pct(value) * 10) / 10, color, isProfit })
  }

  push('product',    'Custo do produto',          input.productCost,                                   '#6366f1')
  push('packaging',  'Embalagem',                  input.packagingCost,                                 '#8b5cf6')
  push('other',      'Outros custos',              input.otherCosts,                                    '#7c3aed')
  push('commission', `Comissão ML (${commissionPct}%)`, price * commissionPct / 100,                   '#f97316')
  push('fixed_fee',  'Taxa fixa ML',               fixedFee,                                            '#fb923c')
  push('shipping',   'Frete',                      shippingCost,                                        '#a855f7')
  push('full',       'Full/Fulfillment',            fullCost,                                            '#06b6d4')
  push('tax',        `Imposto (${input.taxPct}%)`, price * input.taxPct / 100,                          '#ef4444')
  push('marketing',  `Marketing (${input.marketingPct}%)`, price * input.marketingPct / 100,            '#22c55e')
  push('affiliate',  `Afiliado (${input.affiliatePct}%)`,  price * input.affiliatePct / 100,            '#84cc16')
  push('profit',     'Lucro líquido',              netProfit,                                           '#00e96a', true)

  const totalCost = items.filter(i => !i.isProfit).reduce((s, i) => s + i.value, 0)
  const totalPct  = price > 0 ? (totalCost / price) * 100 : 0

  return { items, totalCost: Math.round(totalCost * 100) / 100, totalPct: Math.round(totalPct * 10) / 10 }
}
