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

export const PEDIDOS: Pedido[] = [
  // ── 1 · URGENTE hoje ─────────────────────────────────────────────────────
  {
    id: 1,
    numero: '#ML-48291',
    data: '2026-03-12T10:15:00',
    status: 'pago',
    marketplace: 'ML',
    cliente: {
      nome: 'Ana Beatriz Ferreira', cpf: '***.***.234-10',
      email: 'ana.beatriz@gmail.com', telefone: '(85) 9 9812-3456',
      cidade: 'Fortaleza', uf: 'CE',
      logradouro: 'Rua das Flores', numero: '142', bairro: 'Aldeota', cep: '60150-150',
      pedidosAnteriores: 1,
    },
    itens: [
      { produtoId: 1, nome: 'Óleo Capilar Fio Cabana 100ml', sku: 'FIO-001', ean: '7891234560001', quantidade: 1, precoUnit: 89.90, custoUnit: 28.00, imagem: null, localizacao: 'Corredor A, Prateleira 1' },
    ],
    financeiro: fin(89.90, 0, 28.00, 'ML', 12.00),
    envio: { transportadora: 'Correios', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.18, comp: 14, larg: 8, alt: 8, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-12',
    observacoes: [
      { id: 1, texto: 'Cliente pediu embalagem com plástico bolha extra', data: '2026-03-12T10:20:00', usuario: 'Matheus P.' },
    ],
    separacaoFeita: false,
  },
  // ── 2 · URGENTE hoje ─────────────────────────────────────────────────────
  {
    id: 2,
    numero: '#ML-48285',
    data: '2026-03-12T08:30:00',
    status: 'separando',
    marketplace: 'ML',
    cliente: {
      nome: 'Maria das Graças Lima', cpf: '***.***.512-88',
      email: 'gracas.lima@hotmail.com', telefone: '(83) 9 8834-7821',
      cidade: 'Campina Grande', uf: 'PB',
      logradouro: 'Av. Canal da Redenção', numero: '890', bairro: 'Bodocongó', cep: '58104-240',
      pedidosAnteriores: 2,
    },
    itens: [
      { produtoId: 3, nome: 'Shampoo Castilla Hidratação 400ml', sku: 'CAS-001', ean: '7891234560011', quantidade: 2, precoUnit: 47.90, custoUnit: 15.00, imagem: null, localizacao: 'Corredor B, Prateleira 2' },
    ],
    financeiro: fin(95.80, 0, 30.00, 'ML', 10.00),
    envio: { transportadora: 'Correios', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.95, comp: 20, larg: 12, alt: 12, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-12',
    observacoes: [
      { id: 2, texto: 'Endereço de difícil acesso, ligar antes da entrega', data: '2026-03-12T08:35:00', usuario: 'Matheus P.' },
    ],
    separacaoFeita: false,
  },
  // ── 3 · URGENTE hoje ─────────────────────────────────────────────────────
  {
    id: 3,
    numero: '#SP-29847',
    data: '2026-03-12T09:45:00',
    status: 'pago',
    marketplace: 'SP',
    cliente: {
      nome: 'Francisca Oliveira Santos', cpf: '***.***.789-33',
      email: 'chica.oliveira@yahoo.com.br', telefone: '(88) 9 9623-1147',
      cidade: 'Juazeiro do Norte', uf: 'CE',
      logradouro: 'Rua São Pedro', numero: '331', bairro: 'Pirajá', cep: '63024-030',
      pedidosAnteriores: 3,
    },
    itens: [
      { produtoId: 7, nome: 'Kit Volume Intenso Kronel', sku: 'KRO-001', ean: '7891234560031', quantidade: 1, precoUnit: 129.90, custoUnit: 38.00, imagem: null, localizacao: 'Corredor D, Prateleira 1' },
    ],
    financeiro: fin(129.90, 0, 38.00, 'SP', 14.00),
    envio: { transportadora: 'Jadlog', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.55, comp: 22, larg: 16, alt: 10, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-12',
    observacoes: [],
    separacaoFeita: false,
  },
  // ── 4 · URGENTE hoje ─────────────────────────────────────────────────────
  {
    id: 4,
    numero: '#AMZ-7821',
    data: '2026-03-12T07:00:00',
    status: 'embalado',
    marketplace: 'AMZ',
    cliente: {
      nome: 'João Pedro Alves', cpf: '***.***.091-55',
      email: 'joao.alves@gmail.com', telefone: '(86) 9 8714-2290',
      cidade: 'Teresina', uf: 'PI',
      logradouro: 'Rua Acre', numero: '57', bairro: 'Centro', cep: '64000-160',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 6, nome: 'Sérum Capilar BioSeiva 60ml', sku: 'BIO-004', ean: '7891234560024', quantidade: 1, precoUnit: 89.90, custoUnit: 28.00, imagem: null, localizacao: 'Corredor C, Prateleira 2' },
      { produtoId: 9, nome: 'Creme Hidratante Lanossi 250g', sku: 'LAN-001', ean: '7891234560041', quantidade: 1, precoUnit: 67.90, custoUnit: 20.00, imagem: null, localizacao: 'Corredor E, Prateleira 1' },
    ],
    financeiro: fin(157.80, 0, 48.00, 'AMZ', 15.00),
    envio: { transportadora: 'Amazon Logistics', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.72, comp: 25, larg: 18, alt: 12, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-12',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 5 · prazo amanhã ─────────────────────────────────────────────────────
  {
    id: 5,
    numero: '#ML-48279',
    data: '2026-03-11T16:20:00',
    status: 'separando',
    marketplace: 'ML',
    cliente: {
      nome: 'Antônio Marcos Neto', cpf: '***.***.348-22',
      email: 'antonio.neto@gmail.com', telefone: '(84) 9 9321-8864',
      cidade: 'Natal', uf: 'RN',
      logradouro: 'Av. Prudente de Morais', numero: '2200', bairro: 'Tirol', cep: '59020-400',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 9, nome: 'Creme Hidratante Lanossi 250g', sku: 'LAN-001', ean: '7891234560041', quantidade: 1, precoUnit: 67.90, custoUnit: 20.00, imagem: null, localizacao: 'Corredor E, Prateleira 1' },
    ],
    financeiro: fin(67.90, 9.90, 20.00, 'ML', 11.00),
    envio: { transportadora: 'Correios', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.32, comp: 18, larg: 12, alt: 8, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-13',
    observacoes: [],
    separacaoFeita: false,
  },
  // ── 6 · prazo amanhã ─────────────────────────────────────────────────────
  {
    id: 6,
    numero: '#ML-48272',
    data: '2026-03-11T14:05:00',
    status: 'embalado',
    marketplace: 'ML',
    cliente: {
      nome: 'Rafaela Costa Bezerra', cpf: '***.***.667-44',
      email: 'rafa.costa@outlook.com', telefone: '(85) 9 9541-3317',
      cidade: 'Fortaleza', uf: 'CE',
      logradouro: 'Rua Coronel Nunes', numero: '88', bairro: 'Meireles', cep: '60165-080',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 4, nome: 'Máscara Tratamento Castilla 300g', sku: 'CAS-002', ean: '7891234560012', quantidade: 1, precoUnit: 67.90, custoUnit: 22.00, imagem: null, localizacao: 'Corredor B, Prateleira 2' },
    ],
    financeiro: fin(67.90, 0, 22.00, 'ML', 10.00),
    envio: { transportadora: 'Correios', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.38, comp: 18, larg: 12, alt: 8, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-13',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 7 · prazo amanhã ─────────────────────────────────────────────────────
  {
    id: 7,
    numero: '#SP-29839',
    data: '2026-03-11T11:30:00',
    status: 'pago',
    marketplace: 'SP',
    cliente: {
      nome: 'Luís Felipe Monteiro', cpf: '***.***.129-77',
      email: 'luisfe.monteiro@gmail.com', telefone: '(81) 9 8256-4490',
      cidade: 'Caruaru', uf: 'PE',
      logradouro: 'Rua Vinte e Quatro de Outubro', numero: '314', bairro: 'Indianópolis', cep: '55020-320',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 5, nome: 'Creme Esfoliante BioSeiva 200g', sku: 'BIO-002', ean: '7891234560021', quantidade: 2, precoUnit: 39.90, custoUnit: 12.00, imagem: null, localizacao: 'Corredor C, Prateleira 1' },
    ],
    financeiro: fin(79.80, 0, 24.00, 'SP', 12.00),
    envio: { transportadora: 'Jadlog', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.52, comp: 20, larg: 14, alt: 10, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-13',
    observacoes: [],
    separacaoFeita: false,
  },
  // ── 8 · prazo 14/03 ──────────────────────────────────────────────────────
  {
    id: 8,
    numero: '#ML-48265',
    data: '2026-03-10T17:45:00',
    status: 'enviado',
    marketplace: 'ML',
    cliente: {
      nome: 'Priscila Santos Araújo', cpf: '***.***.881-19',
      email: 'pri.santos@gmail.com', telefone: '(98) 9 9712-0033',
      cidade: 'São Luís', uf: 'MA',
      logradouro: 'Av. dos Holandeses', numero: '1600', bairro: 'Calhau', cep: '65071-380',
      pedidosAnteriores: 1,
    },
    itens: [
      { produtoId: 3, nome: 'Shampoo Castilla Hidratação 400ml', sku: 'CAS-001', ean: '7891234560011', quantidade: 1, precoUnit: 47.90, custoUnit: 15.00, imagem: null, localizacao: 'Corredor B, Prateleira 2' },
    ],
    financeiro: fin(47.90, 14.90, 15.00, 'ML', 10.50),
    envio: { transportadora: 'Correios', codigoRastreio: 'BR812345678CE', linkRastreio: 'https://rastreamento.correios.com.br/app/index.php', pesoTotal: 0.52, comp: 20, larg: 12, alt: 10, dataPostagem: '2026-03-11', previsaoEntrega: '2026-03-16' },
    prazoPostagem: '2026-03-14',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 9 · prazo 14/03 ──────────────────────────────────────────────────────
  {
    id: 9,
    numero: '#SP-29831',
    data: '2026-03-10T14:15:00',
    status: 'enviado',
    marketplace: 'SP',
    cliente: {
      nome: 'Diego Marcelino Freitas', cpf: '***.***.453-60',
      email: 'diego.marcelino@gmail.com', telefone: '(85) 9 8811-7742',
      cidade: 'Caucaia', uf: 'CE',
      logradouro: 'Rua José Figueiredo', numero: '55', bairro: 'Parque Soledade', cep: '61643-110',
      pedidosAnteriores: 1,
    },
    itens: [
      { produtoId: 8, nome: 'Shampoo Antiqueda Kronel 300ml', sku: 'KRO-002', ean: '7891234560032', quantidade: 1, precoUnit: 79.90, custoUnit: 24.00, imagem: null, localizacao: 'Corredor D, Prateleira 1' },
    ],
    financeiro: fin(79.90, 0, 24.00, 'SP', 13.00),
    envio: { transportadora: 'Jadlog', codigoRastreio: 'JAD987654321', linkRastreio: 'https://jadlog.com.br/rastreamento', pesoTotal: 0.38, comp: 18, larg: 10, alt: 10, dataPostagem: '2026-03-11', previsaoEntrega: '2026-03-17' },
    prazoPostagem: '2026-03-14',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 10 ───────────────────────────────────────────────────────────────────
  {
    id: 10,
    numero: '#MAG-3341',
    data: '2026-03-10T10:00:00',
    status: 'em_transito',
    marketplace: 'MAG',
    cliente: {
      nome: 'Tatiana Leal Vasconcelos', cpf: '***.***.202-90',
      email: 'tati.leal@gmail.com', telefone: '(88) 9 9123-5566',
      cidade: 'Sobral', uf: 'CE',
      logradouro: 'Rua Dom José', numero: '712', bairro: 'Centro', cep: '62010-350',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 10, nome: 'Perfume Zalike Masculino 50ml', sku: 'ZAL-001', ean: '7891234560051', quantidade: 1, precoUnit: 189.90, custoUnit: 55.00, imagem: null, localizacao: 'Corredor F, Prateleira 1' },
    ],
    financeiro: fin(189.90, 0, 55.00, 'MAG', 18.00),
    envio: { transportadora: 'Total Express', codigoRastreio: 'TEX334455667', linkRastreio: 'https://totalexpress.com.br/rastreio', pesoTotal: 0.22, comp: 12, larg: 8, alt: 8, dataPostagem: '2026-03-11', previsaoEntrega: '2026-03-15' },
    prazoPostagem: '2026-03-15',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 11 ───────────────────────────────────────────────────────────────────
  {
    id: 11,
    numero: '#ML-48259',
    data: '2026-03-09T16:40:00',
    status: 'em_transito',
    marketplace: 'ML',
    cliente: {
      nome: 'Marcelo Pinheiro Albuquerque', cpf: '***.***.771-13',
      email: 'marcelo.pinheiro@gmail.com', telefone: '(87) 9 9641-8821',
      cidade: 'Petrolina', uf: 'PE',
      logradouro: 'Av. Cardoso de Sá', numero: '1100', bairro: 'Centro', cep: '56304-120',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 4, nome: 'Máscara Tratamento Castilla 300g', sku: 'CAS-002', ean: '7891234560012', quantidade: 1, precoUnit: 67.90, custoUnit: 22.00, imagem: null, localizacao: 'Corredor B, Prateleira 2' },
      { produtoId: 5, nome: 'Creme Esfoliante BioSeiva 200g', sku: 'BIO-002', ean: '7891234560021', quantidade: 1, precoUnit: 39.90, custoUnit: 12.00, imagem: null, localizacao: 'Corredor C, Prateleira 1' },
    ],
    financeiro: fin(107.80, 0, 34.00, 'ML', 14.00),
    envio: { transportadora: 'Correios', codigoRastreio: 'BR901234567PE', linkRastreio: 'https://rastreamento.correios.com.br/app/index.php', pesoTotal: 0.65, comp: 22, larg: 16, alt: 12, dataPostagem: '2026-03-10', previsaoEntrega: '2026-03-17' },
    prazoPostagem: '2026-03-16',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 12 ───────────────────────────────────────────────────────────────────
  {
    id: 12,
    numero: '#AMZ-7815',
    data: '2026-03-09T11:20:00',
    status: 'enviado',
    marketplace: 'AMZ',
    cliente: {
      nome: 'Cintia Dantas Ferreira', cpf: '***.***.334-07',
      email: 'cintia.dantas@gmail.com', telefone: '(81) 9 8956-2244',
      cidade: 'Recife', uf: 'PE',
      logradouro: 'Av. Boa Viagem', numero: '3200', bairro: 'Boa Viagem', cep: '51020-001',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 1, nome: 'Óleo Capilar Fio Cabana 100ml', sku: 'FIO-001', ean: '7891234560001', quantidade: 1, precoUnit: 89.90, custoUnit: 28.00, imagem: null, localizacao: 'Corredor A, Prateleira 1' },
    ],
    financeiro: fin(89.90, 0, 28.00, 'AMZ', 12.00),
    envio: { transportadora: 'Amazon Logistics', codigoRastreio: 'AZ115566778', linkRastreio: null, pesoTotal: 0.18, comp: 14, larg: 8, alt: 8, dataPostagem: '2026-03-10', previsaoEntrega: '2026-03-14' },
    prazoPostagem: '2026-03-16',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 13 ───────────────────────────────────────────────────────────────────
  {
    id: 13,
    numero: '#ML-48251',
    data: '2026-03-08T15:00:00',
    status: 'entregue',
    marketplace: 'ML',
    cliente: {
      nome: 'José Roberto Pinto', cpf: '***.***.590-28',
      email: 'jose.pinto@hotmail.com', telefone: '(79) 9 9871-3300',
      cidade: 'Aracaju', uf: 'SE',
      logradouro: 'Av. Francisco Porto', numero: '800', bairro: 'Jardins', cep: '49025-040',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 7, nome: 'Kit Volume Intenso Kronel', sku: 'KRO-001', ean: '7891234560031', quantidade: 1, precoUnit: 129.90, custoUnit: 38.00, imagem: null, localizacao: 'Corredor D, Prateleira 1' },
    ],
    financeiro: fin(129.90, 14.90, 38.00, 'ML', 16.00),
    envio: { transportadora: 'Correios', codigoRastreio: 'BR223344556SE', linkRastreio: 'https://rastreamento.correios.com.br/app/index.php', pesoTotal: 0.55, comp: 22, larg: 16, alt: 10, dataPostagem: '2026-03-09', previsaoEntrega: '2026-03-12' },
    prazoPostagem: '2026-03-17',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 14 ───────────────────────────────────────────────────────────────────
  {
    id: 14,
    numero: '#SP-29819',
    data: '2026-03-08T09:15:00',
    status: 'entregue',
    marketplace: 'SP',
    cliente: {
      nome: 'Fernanda Melo Cavalcante', cpf: '***.***.118-54',
      email: 'fernanda.melo@gmail.com', telefone: '(85) 9 9231-6610',
      cidade: 'Fortaleza', uf: 'CE',
      logradouro: 'Rua Tibúrcio Cavalcante', numero: '230', bairro: 'Dionísio Torres', cep: '60125-100',
      pedidosAnteriores: 1,
    },
    itens: [
      { produtoId: 6, nome: 'Sérum Capilar BioSeiva 60ml', sku: 'BIO-004', ean: '7891234560024', quantidade: 1, precoUnit: 89.90, custoUnit: 28.00, imagem: null, localizacao: 'Corredor C, Prateleira 2' },
    ],
    financeiro: fin(89.90, 0, 28.00, 'SP', 11.00),
    envio: { transportadora: 'Jadlog', codigoRastreio: 'JAD112233445', linkRastreio: 'https://jadlog.com.br/rastreamento', pesoTotal: 0.22, comp: 14, larg: 8, alt: 8, dataPostagem: '2026-03-09', previsaoEntrega: '2026-03-11' },
    prazoPostagem: '2026-03-17',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 15 ───────────────────────────────────────────────────────────────────
  {
    id: 15,
    numero: '#ML-48245',
    data: '2026-03-07T14:30:00',
    status: 'enviado',
    marketplace: 'ML',
    cliente: {
      nome: 'Bruno Cavalcante Lima', cpf: '***.***.886-41',
      email: 'bruno.cavalcante@gmail.com', telefone: '(85) 9 8741-2290',
      cidade: 'Maracanaú', uf: 'CE',
      logradouro: 'Rua Antônio Justa', numero: '1500', bairro: 'Industrial', cep: '61915-010',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 2, nome: 'Óleo Capilar Fio Cabana 200ml', variacao: 'Volume: 200ml', sku: 'FIO-002', ean: '7891234560002', quantidade: 1, precoUnit: 149.90, custoUnit: 42.00, imagem: null, localizacao: 'Corredor A, Prateleira 1' },
    ],
    financeiro: fin(149.90, 0, 42.00, 'ML', 16.00),
    envio: { transportadora: 'Correios', codigoRastreio: 'BR445566778CE', linkRastreio: 'https://rastreamento.correios.com.br/app/index.php', pesoTotal: 0.28, comp: 16, larg: 8, alt: 8, dataPostagem: '2026-03-08', previsaoEntrega: '2026-03-14' },
    prazoPostagem: '2026-03-18',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 16 ───────────────────────────────────────────────────────────────────
  {
    id: 16,
    numero: '#AMZ-7809',
    data: '2026-03-07T10:10:00',
    status: 'entregue',
    marketplace: 'AMZ',
    cliente: {
      nome: 'Sandra Nogueira Barbosa', cpf: '***.***.263-88',
      email: 'sandra.nogueira@gmail.com', telefone: '(83) 9 9312-5544',
      cidade: 'João Pessoa', uf: 'PB',
      logradouro: 'Av. Epitácio Pessoa', numero: '4400', bairro: 'Tambaú', cep: '58039-000',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 9, nome: 'Creme Hidratante Lanossi 250g', sku: 'LAN-001', ean: '7891234560041', quantidade: 2, precoUnit: 67.90, custoUnit: 20.00, imagem: null, localizacao: 'Corredor E, Prateleira 1' },
    ],
    financeiro: fin(135.80, 0, 40.00, 'AMZ', 14.00),
    envio: { transportadora: 'Amazon Logistics', codigoRastreio: 'AZ998877665', linkRastreio: null, pesoTotal: 0.64, comp: 22, larg: 14, alt: 10, dataPostagem: '2026-03-08', previsaoEntrega: '2026-03-11' },
    prazoPostagem: '2026-03-18',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 17 ───────────────────────────────────────────────────────────────────
  {
    id: 17,
    numero: '#ML-48238',
    data: '2026-03-06T11:55:00',
    status: 'cancelado',
    marketplace: 'ML',
    cliente: {
      nome: 'Renato Barbosa Sousa', cpf: '***.***.440-61',
      email: 'renato.barbosa@gmail.com', telefone: '(86) 9 9115-8830',
      cidade: 'Parnaíba', uf: 'PI',
      logradouro: 'Rua Coronel Raimundo', numero: '90', bairro: 'Dirceu Arcoverde', cep: '64200-250',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 8, nome: 'Shampoo Antiqueda Kronel 300ml', sku: 'KRO-002', ean: '7891234560032', quantidade: 1, precoUnit: 79.90, custoUnit: 24.00, imagem: null, localizacao: 'Corredor D, Prateleira 1' },
    ],
    financeiro: fin(79.90, 9.90, 24.00, 'ML', 14.00),
    envio: { transportadora: 'Correios', codigoRastreio: null, linkRastreio: null, pesoTotal: 0.38, comp: 18, larg: 10, alt: 10, dataPostagem: null, previsaoEntrega: null },
    prazoPostagem: '2026-03-19',
    observacoes: [
      { id: 3, texto: 'Cliente cancelou por duplicidade de pedido', data: '2026-03-06T13:00:00', usuario: 'Matheus P.' },
    ],
    separacaoFeita: false,
  },
  // ── 18 ───────────────────────────────────────────────────────────────────
  {
    id: 18,
    numero: '#SP-29811',
    data: '2026-03-06T09:30:00',
    status: 'em_transito',
    marketplace: 'SP',
    cliente: {
      nome: 'Claudia Ferreira Cruz', cpf: '***.***.795-02',
      email: 'claudia.cruz@hotmail.com', telefone: '(88) 9 8882-1100',
      cidade: 'Crato', uf: 'CE',
      logradouro: 'Rua São Luís', numero: '420', bairro: 'São Miguel', cep: '63100-110',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 3, nome: 'Shampoo Castilla Hidratação 400ml', sku: 'CAS-001', ean: '7891234560011', quantidade: 1, precoUnit: 47.90, custoUnit: 15.00, imagem: null, localizacao: 'Corredor B, Prateleira 2' },
      { produtoId: 4, nome: 'Máscara Tratamento Castilla 300g', sku: 'CAS-002', ean: '7891234560012', quantidade: 1, precoUnit: 67.90, custoUnit: 22.00, imagem: null, localizacao: 'Corredor B, Prateleira 2' },
    ],
    financeiro: fin(115.80, 0, 37.00, 'SP', 13.00),
    envio: { transportadora: 'Jadlog', codigoRastreio: 'JAD554433221', linkRastreio: 'https://jadlog.com.br/rastreamento', pesoTotal: 0.85, comp: 24, larg: 16, alt: 12, dataPostagem: '2026-03-07', previsaoEntrega: '2026-03-14' },
    prazoPostagem: '2026-03-19',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 19 ───────────────────────────────────────────────────────────────────
  {
    id: 19,
    numero: '#MAG-3338',
    data: '2026-03-05T15:45:00',
    status: 'devolvido',
    marketplace: 'MAG',
    cliente: {
      nome: 'Thiago Nascimento Pereira', cpf: '***.***.128-76',
      email: 'thiago.nasc@gmail.com', telefone: '(92) 9 9634-7700',
      cidade: 'Manaus', uf: 'AM',
      logradouro: 'Av. Djalma Batista', numero: '3334', bairro: 'Chapada', cep: '69050-010',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 6, nome: 'Sérum Capilar BioSeiva 60ml', sku: 'BIO-004', ean: '7891234560024', quantidade: 1, precoUnit: 89.90, custoUnit: 28.00, imagem: null, localizacao: 'Corredor C, Prateleira 2' },
    ],
    financeiro: fin(89.90, 0, 28.00, 'MAG', 12.00),
    envio: { transportadora: 'Total Express', codigoRastreio: 'TEX667788991', linkRastreio: 'https://totalexpress.com.br/rastreio', pesoTotal: 0.22, comp: 14, larg: 8, alt: 8, dataPostagem: '2026-03-06', previsaoEntrega: '2026-03-12' },
    prazoPostagem: '2026-03-20',
    observacoes: [
      { id: 4, texto: 'Produto recebido com lacre violado. Reembolso processado.', data: '2026-03-11T09:00:00', usuario: 'Matheus P.' },
    ],
    separacaoFeita: true,
  },
  // ── 20 ───────────────────────────────────────────────────────────────────
  {
    id: 20,
    numero: '#ML-48230',
    data: '2026-03-04T10:20:00',
    status: 'entregue',
    marketplace: 'ML',
    cliente: {
      nome: 'Luciana Vasconcelos Maia', cpf: '***.***.559-88',
      email: 'lu.vasconcelos@gmail.com', telefone: '(85) 9 9921-4455',
      cidade: 'Fortaleza', uf: 'CE',
      logradouro: 'Av. Rui Barbosa', numero: '1560', bairro: 'Aldeota', cep: '60115-221',
      pedidosAnteriores: 4,
    },
    itens: [
      { produtoId: 7, nome: 'Kit Volume Intenso Kronel', sku: 'KRO-001', ean: '7891234560031', quantidade: 1, precoUnit: 129.90, custoUnit: 38.00, imagem: null, localizacao: 'Corredor D, Prateleira 1' },
    ],
    financeiro: fin(129.90, 0, 38.00, 'ML', 14.00),
    envio: { transportadora: 'Correios', codigoRastreio: 'BR778899001CE', linkRastreio: 'https://rastreamento.correios.com.br/app/index.php', pesoTotal: 0.55, comp: 22, larg: 16, alt: 10, dataPostagem: '2026-03-05', previsaoEntrega: '2026-03-09' },
    prazoPostagem: '2026-03-20',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 21 ───────────────────────────────────────────────────────────────────
  {
    id: 21,
    numero: '#AMZ-7802',
    data: '2026-03-03T16:00:00',
    status: 'entregue',
    marketplace: 'AMZ',
    cliente: {
      nome: 'Paulo Henrique Arraes', cpf: '***.***.311-50',
      email: 'paulo.arraes@gmail.com', telefone: '(87) 9 9340-6611',
      cidade: 'Petrolina', uf: 'PE',
      logradouro: 'Rua Padre Cícero', numero: '48', bairro: 'Centro', cep: '56304-001',
      pedidosAnteriores: 0,
    },
    itens: [
      { produtoId: 10, nome: 'Perfume Zalike Masculino 50ml', sku: 'ZAL-001', ean: '7891234560051', quantidade: 1, precoUnit: 189.90, custoUnit: 55.00, imagem: null, localizacao: 'Corredor F, Prateleira 1' },
    ],
    financeiro: fin(189.90, 0, 55.00, 'AMZ', 18.00),
    envio: { transportadora: 'Amazon Logistics', codigoRastreio: 'AZ334455669', linkRastreio: null, pesoTotal: 0.22, comp: 12, larg: 8, alt: 8, dataPostagem: '2026-03-04', previsaoEntrega: '2026-03-08' },
    prazoPostagem: '2026-03-21',
    observacoes: [],
    separacaoFeita: true,
  },
  // ── 22 ───────────────────────────────────────────────────────────────────
  {
    id: 22,
    numero: '#ML-48221',
    data: '2026-03-01T09:00:00',
    status: 'entregue',
    marketplace: 'ML',
    cliente: {
      nome: 'Luciana Vasconcelos Maia', cpf: '***.***.559-88',
      email: 'lu.vasconcelos@gmail.com', telefone: '(85) 9 9921-4455',
      cidade: 'Fortaleza', uf: 'CE',
      logradouro: 'Av. Rui Barbosa', numero: '1560', bairro: 'Aldeota', cep: '60115-221',
      pedidosAnteriores: 3,
    },
    itens: [
      { produtoId: 1, nome: 'Óleo Capilar Fio Cabana 100ml', sku: 'FIO-001', ean: '7891234560001', quantidade: 2, precoUnit: 89.90, custoUnit: 28.00, imagem: null, localizacao: 'Corredor A, Prateleira 1' },
    ],
    financeiro: fin(179.80, 0, 56.00, 'ML', 16.00),
    envio: { transportadora: 'Correios', codigoRastreio: 'BR556677889CE', linkRastreio: 'https://rastreamento.correios.com.br/app/index.php', pesoTotal: 0.36, comp: 16, larg: 10, alt: 10, dataPostagem: '2026-03-02', previsaoEntrega: '2026-03-06' },
    prazoPostagem: '2026-03-22',
    observacoes: [],
    separacaoFeita: true,
  },
]
