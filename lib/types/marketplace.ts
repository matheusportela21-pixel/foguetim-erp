/**
 * lib/types/marketplace.ts
 * Tipos e constantes centralizadas para canais de marketplace.
 *
 * REGRA: Sempre usar estes valores ao inserir/consultar
 *   warehouse_product_mappings.channel (enum warehouse_channel_type).
 *
 * NOTA SOBRE marketplace_connections.marketplace:
 *   O campo marketplace em marketplace_connections usa 'mercadolivre' (sem underscore)
 *   por razões históricas. Ao adicionar novos canais use 'shopee', 'amazon' etc.
 *   Para o armazém (warehouse_product_mappings.channel) sempre use MARKETPLACE_CHANNELS.
 */

export const MARKETPLACE_CHANNELS = [
  'mercado_livre',
  'shopee',
  'amazon',
  'magalu',
  'americanas',
  'casas_bahia',
  'nuvemshop',
  'tray',
  'loja_integrada',
  'aliexpress',
  'tiktok_shop',
  'other',
] as const

export type MarketplaceChannel = typeof MARKETPLACE_CHANNELS[number]

/** Labels para exibição ao usuário */
export const MARKETPLACE_LABELS: Record<MarketplaceChannel, string> = {
  mercado_livre:  'Mercado Livre',
  shopee:         'Shopee',
  amazon:         'Amazon',
  magalu:         'Magalu',
  americanas:     'Americanas',
  casas_bahia:    'Casas Bahia',
  nuvemshop:      'Nuvemshop',
  tray:           'Tray',
  loja_integrada: 'Loja Integrada',
  aliexpress:     'AliExpress',
  tiktok_shop:    'TikTok Shop',
  other:          'Outro',
}

/** Abreviações para badges na UI */
export const MARKETPLACE_ABBR: Record<MarketplaceChannel, string> = {
  mercado_livre:  'ML',
  shopee:         'SP',
  amazon:         'AMZ',
  magalu:         'MAG',
  americanas:     'AME',
  casas_bahia:    'CB',
  nuvemshop:      'NS',
  tray:           'TRY',
  loja_integrada: 'LI',
  aliexpress:     'ALI',
  tiktok_shop:    'TKT',
  other:          '?',
}

/** Badge CSS por canal */
export const MARKETPLACE_BADGE_CLS: Record<MarketplaceChannel, string> = {
  mercado_livre:  'bg-yellow-900/40 text-yellow-400',
  shopee:         'bg-orange-900/40 text-orange-400',
  amazon:         'bg-blue-900/40 text-blue-400',
  magalu:         'bg-blue-800/40 text-blue-300',
  americanas:     'bg-red-900/40 text-red-400',
  casas_bahia:    'bg-yellow-800/40 text-yellow-300',
  nuvemshop:      'bg-cyan-900/40 text-cyan-400',
  tray:           'bg-purple-900/40 text-purple-400',
  loja_integrada: 'bg-indigo-900/40 text-indigo-400',
  aliexpress:     'bg-rose-900/40 text-rose-400',
  tiktok_shop:    'bg-slate-800/40 text-slate-300',
  other:          'bg-slate-900/40 text-slate-500',
}

/** Verifica se um string é um canal válido */
export function isValidChannel(value: string): value is MarketplaceChannel {
  return (MARKETPLACE_CHANNELS as readonly string[]).includes(value)
}
