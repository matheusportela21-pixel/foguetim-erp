// ─── TYPES ─────────────────────────────────────────────────────────────────

export type PedidoStatus =
  | 'pago' | 'separando' | 'embalado' | 'enviado'
  | 'em_transito' | 'entregue' | 'cancelado' | 'devolvido'

export type MKTPedido = 'ML' | 'SP' | 'AMZ' | 'MAG'

export interface PedidoItem {
  produtoId: number
  nome: string
  variacao?: string
  sku: string
  ean: string
  quantidade: number
  precoUnit: number
  custoUnit: number
  imagem: string | null
  localizacao?: string
}

export interface PedidoEnvio {
  transportadora: string
  codigoRastreio: string | null
  linkRastreio: string | null
  pesoTotal: number
  comp: number
  larg: number
  alt: number
  dataPostagem: string | null
  previsaoEntrega: string | null
}

export interface PedidoFinanceiro {
  valorProdutos: number
  freteCliente: number
  custoProdutos: number
  comissaoPct: number
  custoFreteReal: number
  tarifaFixa: number
  impostoPct: number
  embalagem: number
  lucro: number
  margem: number
}

export interface Observacao {
  id: number
  texto: string
  data: string
  usuario: string
}

export interface ClientePedido {
  nome: string
  cpf: string
  email: string
  telefone: string
  cidade: string
  uf: string
  logradouro: string
  numero: string
  bairro: string
  cep: string
  pedidosAnteriores: number
}

export interface Pedido {
  id: number
  numero: string
  data: string
  status: PedidoStatus
  marketplace: MKTPedido
  cliente: ClientePedido
  itens: PedidoItem[]
  financeiro: PedidoFinanceiro
  envio: PedidoEnvio
  prazoPostagem: string
  observacoes: Observacao[]
  separacaoFeita: boolean
}

// ─── META ───────────────────────────────────────────────────────────────────

export const STATUS_META: Record<PedidoStatus, { label: string; cor: string; bgCor: string; iconName: string }> = {
  pago:        { label: 'Pago',        cor: 'text-emerald-400', bgCor: 'bg-emerald-400/10', iconName: 'CircleDollarSign' },
  separando:   { label: 'Separando',   cor: 'text-cyan-400',    bgCor: 'bg-cyan-400/10',    iconName: 'ScanLine'         },
  embalado:    { label: 'Embalado',    cor: 'text-blue-400',    bgCor: 'bg-blue-400/10',    iconName: 'Package'          },
  enviado:     { label: 'Enviado',     cor: 'text-purple-400',  bgCor: 'bg-purple-400/10',  iconName: 'Send'             },
  em_transito: { label: 'Em Trânsito', cor: 'text-indigo-400',  bgCor: 'bg-indigo-400/10',  iconName: 'Truck'            },
  entregue:    { label: 'Entregue',    cor: 'text-green-400',   bgCor: 'bg-green-400/10',   iconName: 'CheckCircle2'     },
  cancelado:   { label: 'Cancelado',   cor: 'text-red-400',     bgCor: 'bg-red-400/10',     iconName: 'XCircle'          },
  devolvido:   { label: 'Devolvido',   cor: 'text-orange-400',  bgCor: 'bg-orange-400/10',  iconName: 'RotateCcw'        },
}

export const MKT_META: Record<MKTPedido, { label: string; cor: string; bgCor: string; abbr: string }> = {
  ML:  { label: 'Mercado Livre', cor: 'text-yellow-300',  bgCor: 'bg-yellow-400/10',  abbr: 'ML'  },
  SP:  { label: 'Shopee',        cor: 'text-orange-400',  bgCor: 'bg-orange-500/10',  abbr: 'SP'  },
  AMZ: { label: 'Amazon',        cor: 'text-sky-400',     bgCor: 'bg-sky-400/10',     abbr: 'AMZ' },
  MAG: { label: 'Magalu',        cor: 'text-blue-400',    bgCor: 'bg-blue-400/15',    abbr: 'MAG' },
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function fin(
  valorProdutos: number,
  freteCliente: number,
  custoProdutos: number,
  marketplace: MKTPedido,
  custoFreteReal: number,
): PedidoFinanceiro {
  const comissaoPct = marketplace === 'AMZ' ? 15 : marketplace === 'MAG' ? 16 : 14
  const tarifaFixa  = marketplace === 'ML' ? 6 : 0
  const impostoPct  = 6
  const embalagem   = 2.50
  const lucro = valorProdutos + freteCliente
    - custoProdutos
    - (valorProdutos * comissaoPct / 100)
    - custoFreteReal
    - tarifaFixa
    - (valorProdutos * impostoPct / 100)
    - embalagem
  const margem = Math.round((lucro / (valorProdutos + freteCliente)) * 1000) / 10
  return { valorProdutos, freteCliente, custoProdutos, comissaoPct, custoFreteReal, tarifaFixa, impostoPct, embalagem, lucro: Math.round(lucro * 100) / 100, margem }
}

// ─── PEDIDOS ────────────────────────────────────────────────────────────────

export const PEDIDOS: Pedido[] = []
