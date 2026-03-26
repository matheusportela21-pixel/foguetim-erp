/**
 * lib/pricing/multi-channel-calculator.ts
 *
 * Calculadora de precificacao multi-canal: ML, Shopee e Magalu.
 * Reutiliza a engine existente do ML para calculos ML e aplica formulas
 * simplificadas para Shopee e Magalu.
 *
 * REGRA: Apenas calcula e sugere. Nunca aplica precos automaticamente.
 */

import {
  calcSuggestedPrice,
  type PricingInput,
} from './pricing-engine'
import { estimateShipping } from './ml-tariffs'

// ── Tipos de entrada ────────────────────────────────────────────────────────

export interface MultiChannelInput {
  productCost: number
  packagingCost: number
  otherCosts: number
  taxPct: number
  targetMarginPct: number
  productWeightG: number
  freeShipping: boolean
  // ML-specific (reuse from existing PricingInput)
  listingType: 'classic' | 'premium'
  categoryCommissionPct: number | null
  sellerReputation: string
  // Channel-specific overrides
  shopeeCommissionPct?: number   // default 20
  magaluCommissionPct?: number   // default 16
  shopeeShippingCost?: number    // default 12
  magaluShippingCost?: number    // default 0
  // Extra ML fields
  marketingPct?: number
  affiliatePct?: number
}

// ── Tipos de saida ──────────────────────────────────────────────────────────

export interface ChannelResult {
  channel: 'ml' | 'shopee' | 'magalu'
  channelName: string
  channelColor: string
  suggestedPrice: number
  commission: number
  commissionRate: number
  shippingCost: number
  taxes: number
  totalCost: number
  profit: number
  margin: number
  isViable: boolean
}

// ── Constantes de canal ─────────────────────────────────────────────────────

export const CHANNEL_DEFAULTS = {
  shopee: {
    commissionPct: 20,
    commissionMin: 12,
    commissionMax: 25,
    shippingCost: 12,
    name: 'Shopee',
    color: '#f97316', // orange
  },
  magalu: {
    commissionPct: 16,
    commissionMin: 10,
    commissionMax: 22,
    shippingCost: 0,
    name: 'Magalu',
    color: '#3b82f6', // blue
  },
  ml: {
    name: 'Mercado Livre',
    color: '#eab308', // yellow
  },
} as const

// ── Calculo simplificado por canal (Shopee/Magalu) ──────────────────────────

function calcSimpleChannel(
  input: MultiChannelInput,
  commissionRate: number,
  shippingCost: number,
  channelKey: 'shopee' | 'magalu',
): ChannelResult {
  const fixedCosts = input.productCost + input.packagingCost + input.otherCosts + shippingCost
  const variablesPct = commissionRate + input.taxPct + input.targetMarginPct
  const denom = 1 - variablesPct / 100

  let suggestedPrice = 0
  if (denom > 0) {
    suggestedPrice = fixedCosts / denom
  }
  suggestedPrice = Math.max(0, suggestedPrice)

  const commission = suggestedPrice * commissionRate / 100
  const taxes = suggestedPrice * input.taxPct / 100
  const totalCost = input.productCost + input.packagingCost + input.otherCosts
  const profit = suggestedPrice - totalCost - shippingCost - commission - taxes
  const margin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0

  const defaults = CHANNEL_DEFAULTS[channelKey]

  return {
    channel: channelKey,
    channelName: defaults.name,
    channelColor: defaults.color,
    suggestedPrice: round2(suggestedPrice),
    commission: round2(commission),
    commissionRate,
    shippingCost: round2(shippingCost),
    taxes: round2(taxes),
    totalCost: round2(totalCost),
    profit: round2(profit),
    margin: round2(margin),
    isViable: margin >= input.targetMarginPct,
  }
}

// ── Funcao principal ────────────────────────────────────────────────────────

export function calculateMultiChannel(input: MultiChannelInput): ChannelResult[] {
  // --- ML: usa a engine existente completa ---
  const mlInput: PricingInput = {
    productCost: input.productCost,
    packagingCost: input.packagingCost,
    otherCosts: input.otherCosts,
    taxPct: input.taxPct,
    marketingPct: input.marketingPct ?? 0,
    affiliatePct: input.affiliatePct ?? 0,
    listingType: input.listingType,
    categoryCommissionPct: input.categoryCommissionPct,
    categoryId: null,
    categoryName: null,
    sellerReputation: input.sellerReputation as PricingInput['sellerReputation'],
    shippingMode: input.freeShipping ? 'free_shipping' : 'buyer_pays',
    productWeightG: input.productWeightG > 0 ? input.productWeightG : null,
    packagingWeightG: null,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    manualShippingCost: null,
    isFull: false,
    fullHandlingCost: 0,
    fullStorageCost: 0,
    targetMarginPct: input.targetMarginPct,
    currentMLPrice: null,
  }

  const mlResult = calcSuggestedPrice(mlInput)

  const mlChannel: ChannelResult = {
    channel: 'ml',
    channelName: CHANNEL_DEFAULTS.ml.name,
    channelColor: CHANNEL_DEFAULTS.ml.color,
    suggestedPrice: mlResult.suggestedPrice,
    commission: round2(mlResult.suggestedPrice * mlResult.commissionPct / 100 + mlResult.fixedFee),
    commissionRate: mlResult.commissionPct,
    shippingCost: mlResult.shippingCost,
    taxes: round2(mlResult.suggestedPrice * input.taxPct / 100),
    totalCost: round2(input.productCost + input.packagingCost + input.otherCosts),
    profit: mlResult.netProfit,
    margin: mlResult.realMarginPct,
    isViable: mlResult.marginStatus !== 'loss',
  }

  // --- Shopee ---
  const shopeeCommission = input.shopeeCommissionPct ?? CHANNEL_DEFAULTS.shopee.commissionPct
  const shopeeShipping = input.shopeeShippingCost ?? CHANNEL_DEFAULTS.shopee.shippingCost
  const shopeeChannel = calcSimpleChannel(input, shopeeCommission, shopeeShipping, 'shopee')

  // --- Magalu ---
  const magaluCommission = input.magaluCommissionPct ?? CHANNEL_DEFAULTS.magalu.commissionPct
  const magaluShipping = input.magaluShippingCost ?? CHANNEL_DEFAULTS.magalu.shippingCost
  const magaluChannel = calcSimpleChannel(input, magaluCommission, magaluShipping, 'magalu')

  return [mlChannel, shopeeChannel, magaluChannel]
}

/**
 * Retorna o canal com melhor margem.
 */
export function getBestChannel(results: ChannelResult[]): ChannelResult | null {
  if (!results.length) return null
  return results.reduce((best, r) => r.margin > best.margin ? r : best, results[0])
}

// ── Helper ──────────────────────────────────────────────────────────────────

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
