// ─── TYPES ─────────────────────────────────────────────────────────────────

export type MKTPedido  = 'ML' | 'SP' | 'AMZ' | 'MAG'
export type SACTipo    = 'pergunta' | 'mensagem' | 'avaliacao' | 'devolucao'
export type SACStatus  = 'pendente' | 'respondido' | 'em_andamento'

export interface SACMsg {
  id: number
  de: 'cliente' | 'vendedor'
  texto: string
  data: string
}

export interface SACItem {
  id: number
  tipo: SACTipo
  status: SACStatus
  prioridade: 'urgente' | 'normal'
  marketplace: MKTPedido
  cliente: string
  produto: string
  produtoImagem: string | null
  pedidoId?: number
  mensagens: SACMsg[]
  estrelas?: number
  motivoDevolucao?: string
  statusDevolucao?: string
  valorReembolso?: number
  data: string
}

export interface SACTemplate {
  id: number
  titulo: string
  texto: string
}

// ─── DATA ───────────────────────────────────────────────────────────────────

export const SAC_ITEMS: SACItem[] = []

// ─── TEMPLATES ──────────────────────────────────────────────────────────────

export const SAC_TEMPLATES: SACTemplate[] = [
  {
    id: 1,
    titulo: 'Disponibilidade do produto',
    texto: 'Olá, [nome]! Tudo bem? O produto está disponível em estoque e despachamos em até 24 horas úteis após confirmação do pagamento. O prazo de entrega para sua região é de [prazo] dias úteis. Qualquer dúvida, é só chamar! 😊',
  },
  {
    id: 2,
    titulo: 'Código de rastreamento',
    texto: 'Olá, [nome]! O código de rastreamento do seu pedido é [código]. Você pode acompanhar em tempo real pelo site dos Correios (rastreamento.correios.com.br) ou pelo app da transportadora. A previsão de entrega é [data]. Qualquer novidade, nos avise!',
  },
  {
    id: 3,
    titulo: 'Problema / Pedido de desculpas',
    texto: 'Olá, [nome]! Lamentamos muito o ocorrido. Estamos verificando a situação do seu pedido com prioridade máxima e retornaremos em até 24 horas com uma solução. Obrigado pela paciência e compreensão! 🙏',
  },
  {
    id: 4,
    titulo: 'Agradecimento por avaliação',
    texto: 'Muito obrigado pela avaliação carinhosa, [nome]! Ficamos muito felizes que gostou do produto. Seu feedback nos motiva a continuar melhorando sempre. Esperamos tê-lo(a) como cliente por muito tempo! Até a próxima! 💜',
  },
  {
    id: 5,
    titulo: 'Instrução de devolução',
    texto: 'Olá, [nome]! Recebemos sua solicitação de devolução e ela foi aprovada. Por favor, envie o produto lacrado na embalagem original para nosso endereço de logística reversa. Após o recebimento e conferência, processaremos o reembolso completo em até 5 dias úteis no mesmo método de pagamento. Qualquer dúvida, estamos aqui!',
  },
  {
    id: 6,
    titulo: 'Informações pré-venda',
    texto: 'Olá, [nome]! Obrigado pelo interesse no [produto]! É um dos nossos mais bem avaliados pelos clientes, com ótimos resultados comprovados. O frete é calculado automaticamente no checkout e temos condições especiais para o Nordeste. Aproveite que temos estoque disponível hoje! Qualquer dúvida, estou aqui! 😊',
  },
]
