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

export const SAC_ITEMS: SACItem[] = [
  // ── PERGUNTAS ──────────────────────────────────────────────────────────
  {
    id: 1,
    tipo: 'pergunta', status: 'pendente', prioridade: 'urgente',
    marketplace: 'ML', cliente: 'Ana Paula Rodrigues', produto: 'Óleo Capilar Fio Cabana 100ml',
    produtoImagem: null, pedidoId: undefined,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Boa tarde! Esse óleo serve pra cabelo liso? O meu é muito fininho e tenho medo de pesar. Tem algum tamanho menor que o 100ml?', data: '2026-03-12T14:25:00' },
    ],
    data: '2026-03-12T14:25:00',
  },
  {
    id: 2,
    tipo: 'pergunta', status: 'respondido', prioridade: 'normal',
    marketplace: 'SP', cliente: 'Carlos Eduardo Lima', produto: 'Shampoo Castilla Hidratação 400ml',
    produtoImagem: null, pedidoId: undefined,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Boa tarde! O frete pra Fortaleza é grátis? Quanto tempo demora pra chegar?', data: '2026-03-12T11:10:00' },
      { id: 2, de: 'vendedor', texto: 'Olá, Carlos! Frete grátis para o Ceará em compras acima de R$ 79,90. O prazo para Fortaleza é de 5 a 8 dias úteis pela Shopee. Qualquer outra dúvida, é só chamar! 😊', data: '2026-03-12T11:45:00' },
    ],
    data: '2026-03-12T11:10:00',
  },
  {
    id: 3,
    tipo: 'pergunta', status: 'pendente', prioridade: 'normal',
    marketplace: 'AMZ', cliente: 'Francisca Bezerra', produto: 'Kit Volume Intenso Kronel',
    produtoImagem: null, pedidoId: undefined,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Esse kit vem com quantas peças? Serve pra cabelo cacheado tipo 3B? Minha filha tem esse tipo de cabelo e tô querendo comprar pra ela, mas quero ter certeza antes.', data: '2026-03-12T09:30:00' },
    ],
    data: '2026-03-12T09:30:00',
  },
  {
    id: 4,
    tipo: 'pergunta', status: 'respondido', prioridade: 'normal',
    marketplace: 'ML', cliente: 'Diego Marcelino Freitas', produto: 'Sérum Capilar BioSeiva 60ml',
    produtoImagem: null, pedidoId: undefined,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Posso usar esse sérum todo dia? Tenho cabelo muito ressecado e uso chapinha e babyliss com frequência.', data: '2026-03-11T16:20:00' },
      { id: 2, de: 'vendedor', texto: 'Olá, Diego! Sim, pode usar diariamente! O Sérum BioSeiva é formulado justamente para proteção térmica e reconstrução das fibras. Recomendamos aplicar nas pontas antes do calor. Funciona muito bem para cabelos ressecados. 🌿', data: '2026-03-11T17:00:00' },
    ],
    data: '2026-03-11T16:20:00',
  },
  {
    id: 5,
    tipo: 'pergunta', status: 'em_andamento', prioridade: 'urgente',
    marketplace: 'MAG', cliente: 'Tatiana Leal Vasconcelos', produto: 'Perfume Zalike Masculino 50ml',
    produtoImagem: null, pedidoId: undefined,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Esse perfume é 100% original? Tem nota fiscal? Quero comprar pra dar de presente pro meu esposo no aniversário.', data: '2026-03-11T14:00:00' },
      { id: 2, de: 'vendedor', texto: 'Olá, Tatiana! Todos os nossos produtos são 100% originais e acompanham nota fiscal eletrônica. Para embalagem especial de presente, basta adicionar uma observação no pedido que nosso time cuida com todo cuidado! 🎁', data: '2026-03-11T14:30:00' },
      { id: 3, de: 'cliente', texto: 'Perfeito! Mas qual a duração em horas do Zalike? Vale a pena o 50ml ou compensa pegar dois?', data: '2026-03-11T15:10:00' },
    ],
    data: '2026-03-11T14:00:00',
  },

  // ── MENSAGENS (pós-venda) ──────────────────────────────────────────────
  {
    id: 6,
    tipo: 'mensagem', status: 'pendente', prioridade: 'urgente',
    marketplace: 'ML', cliente: 'Maria das Graças Lima', produto: 'Shampoo Castilla Hidratação 400ml',
    produtoImagem: null, pedidoId: 2,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Boa tarde! Fiz o pedido #ML-48285 no dia 12 de manhã e até agora não recebi nem o código de rastreio. Tá tudo bem com meu pedido? Já passou mais de 4 horas.', data: '2026-03-12T13:45:00' },
    ],
    data: '2026-03-12T13:45:00',
  },
  {
    id: 7,
    tipo: 'mensagem', status: 'respondido', prioridade: 'normal',
    marketplace: 'SP', cliente: 'Priscila Santos Araújo', produto: 'Shampoo Castilla Hidratação 400ml',
    produtoImagem: null, pedidoId: 8,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Oi! O rastreio do meu pedido tá parado em São Luís desde ontem. Isso é normal? Tô preocupada.', data: '2026-03-11T10:00:00' },
      { id: 2, de: 'vendedor', texto: 'Olá, Priscila! Verificamos e seu pedido está em processo de distribuição local. O sistema da transportadora às vezes demora para atualizar. O prazo máximo é amanhã até 20h. Caso não chegue, nos avise imediatamente que verificamos! 🙏', data: '2026-03-11T10:30:00' },
      { id: 3, de: 'cliente', texto: 'Chegou sim! O produto é maravilhoso, muito obrigada pela atenção! Compro de novo com certeza! ❤️', data: '2026-03-12T09:15:00' },
    ],
    data: '2026-03-11T10:00:00',
  },
  {
    id: 8,
    tipo: 'mensagem', status: 'em_andamento', prioridade: 'normal',
    marketplace: 'AMZ', cliente: 'João Pedro Alves', produto: 'Creme Hidratante Lanossi 250g',
    produtoImagem: null, pedidoId: 4,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Oi! O produto chegou, mas a tampa do creme tava com uma pequena rachadura. O produto em si parece intacto, mas fiquei preocupado se pode ter contaminado.', data: '2026-03-10T18:30:00' },
      { id: 2, de: 'vendedor', texto: 'João Pedro, que situação desagradável! Lamentamos muito isso. Pode tirar uma foto da tampa e enviar aqui? Vamos verificar se é seguro usar. Caso necessário, enviamos um novo produto sem custo algum! 📸', data: '2026-03-10T19:00:00' },
      { id: 3, de: 'cliente', texto: 'Tá aqui a foto. Olhando melhor, foi só a tampa mesmo, o lacre interno tava intacto. Mas foi feio chegar assim.', data: '2026-03-11T08:45:00' },
    ],
    data: '2026-03-10T18:30:00',
  },
  {
    id: 9,
    tipo: 'mensagem', status: 'respondido', prioridade: 'normal',
    marketplace: 'ML', cliente: 'Luciana Vasconcelos Maia', produto: 'Kit Volume Intenso Kronel',
    produtoImagem: null, pedidoId: 20,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Gente, cheguei aqui em casa e o pacote veio perfeito, bem protegidinho! O kit é simplesmente maravilhoso, já usei o shampoo hoje e o cabelo ficou com um volume lindo! Nota 10 pra vocês! 🥰', data: '2026-03-09T20:15:00' },
      { id: 2, de: 'vendedor', texto: 'Que notícia maravilhosa, Luciana! 🎉 Ficamos muito felizes que gostou! Você já é nossa cliente especial e seu carinho nos motiva muito a continuar melhorando. Até a próxima compra! 💜', data: '2026-03-09T21:00:00' },
    ],
    data: '2026-03-09T20:15:00',
  },

  // ── AVALIAÇÕES ────────────────────────────────────────────────────────
  {
    id: 10,
    tipo: 'avaliacao', status: 'respondido', prioridade: 'normal',
    marketplace: 'ML', cliente: 'Luciana Vasconcelos Maia', produto: 'Kit Volume Intenso Kronel',
    produtoImagem: null, pedidoId: 20, estrelas: 5,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Produto excelente! Cheirinho maravilhoso e o cabelo ficou com muito volume e brilho. Entrega super rápida, chegou em 2 dias aqui em Fortaleza. Vendedor nota 10, embalagem perfeita. Compro de novo com certeza! ⭐⭐⭐⭐⭐', data: '2026-03-09T22:00:00' },
      { id: 2, de: 'vendedor', texto: 'Muito obrigada pela avaliação carinhosa, Luciana! Ficamos muito felizes! Até a próxima! 🚀💜', data: '2026-03-10T09:00:00' },
    ],
    data: '2026-03-09T22:00:00',
  },
  {
    id: 11,
    tipo: 'avaliacao', status: 'pendente', prioridade: 'normal',
    marketplace: 'SP', cliente: 'Rafaela Costa Bezerra', produto: 'Shampoo Castilla Hidratação 400ml',
    produtoImagem: null, pedidoId: 6, estrelas: 4,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Shampoo muito bom, hidrata bastante meu cabelo! Só achei o cheirinho um pouco forte pra mim, mas o resultado é ótimo. Embalagem chegou intacta e mais rápido do que esperava. Recomendo! ⭐⭐⭐⭐', data: '2026-03-10T14:30:00' },
    ],
    data: '2026-03-10T14:30:00',
  },
  {
    id: 12,
    tipo: 'avaliacao', status: 'pendente', prioridade: 'urgente',
    marketplace: 'ML', cliente: 'Thiago Nascimento Pereira', produto: 'Sérum Capilar BioSeiva 60ml',
    produtoImagem: null, pedidoId: 19, estrelas: 2,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Produto demorou demais pra chegar, foram 12 dias! E quando chegou o frasco tava com menos produto do que deveria, parece que vazou no transporte. Muito decepcionante, esperava mais dessa loja. ⭐⭐', data: '2026-03-11T16:00:00' },
    ],
    data: '2026-03-11T16:00:00',
  },
  {
    id: 13,
    tipo: 'avaliacao', status: 'respondido', prioridade: 'normal',
    marketplace: 'AMZ', cliente: 'Cintia Dantas Ferreira', produto: 'Óleo Capilar Fio Cabana 100ml',
    produtoImagem: null, pedidoId: 12, estrelas: 5,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Melhor óleo capilar que já usei na vida! Meu cabelo era muito ressecado e depois de 2 semanas usando tá completamente transformado. Vale cada centavo. Obrigada! ⭐⭐⭐⭐⭐', data: '2026-03-08T19:45:00' },
      { id: 2, de: 'vendedor', texto: 'Fico muito feliz, Cintia! Obrigada pela avaliação carinhosa! Continue usando e qualquer dúvida sobre aplicação estamos aqui! 💜✨', data: '2026-03-09T08:30:00' },
    ],
    data: '2026-03-08T19:45:00',
  },
  {
    id: 14,
    tipo: 'avaliacao', status: 'pendente', prioridade: 'normal',
    marketplace: 'SP', cliente: 'Fernanda Melo Cavalcante', produto: 'Sérum Capilar BioSeiva 60ml',
    produtoImagem: null, pedidoId: 14, estrelas: 3,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'O produto é bom mas achei que devia durar mais. Em 3 semanas já acabou usando uma gotinha por dia. Entrega rápida e embalagem ok. Por esse preço esperava um pouco mais de quantidade.', data: '2026-03-07T11:00:00' },
    ],
    data: '2026-03-07T11:00:00',
  },

  // ── DEVOLUÇÕES ────────────────────────────────────────────────────────
  {
    id: 15,
    tipo: 'devolucao', status: 'pendente', prioridade: 'urgente',
    marketplace: 'ML', cliente: 'Antônio Marcos Neto', produto: 'Creme Hidratante Lanossi 250g',
    produtoImagem: null, pedidoId: 5,
    motivoDevolucao: 'Produto com defeito', statusDevolucao: 'Solicitada', valorReembolso: 67.90,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'O produto chegou com o lacre violado e uma mancha estranha na consistência. Não consigo usar assim, parece que foi adulterado. Quero a devolução imediata!', data: '2026-03-11T14:00:00' },
      { id: 2, de: 'vendedor', texto: 'Antônio, lamentamos muito! Isso é inaceitável. Sua solicitação foi registrada com prioridade máxima. Por favor, tire fotos do produto e aguarde nossas instruções para a devolução. Vamos resolver urgentemente!', data: '2026-03-11T14:30:00' },
    ],
    data: '2026-03-11T14:00:00',
  },
  {
    id: 16,
    tipo: 'devolucao', status: 'em_andamento', prioridade: 'normal',
    marketplace: 'SP', cliente: 'Bruno Cavalcante Lima', produto: 'Shampoo Antiqueda Kronel 300ml',
    produtoImagem: null, pedidoId: 15,
    motivoDevolucao: 'Arrependimento', statusDevolucao: 'Aprovada', valorReembolso: 79.90,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Oi, quero cancelar o pedido. Comprei errado — queria o condicionador e acabei comprando o shampoo. Só vi quando cheguei em casa.', data: '2026-03-10T10:00:00' },
      { id: 2, de: 'vendedor', texto: 'Olá, Bruno! Entendemos perfeitamente. Aprovamos sua devolução por arrependimento. Por favor, retorne o produto lacrado pelo mesmo serviço de frete. Após o recebimento e conferência, o reembolso será processado em até 5 dias úteis! 📦', data: '2026-03-10T10:30:00' },
    ],
    data: '2026-03-10T10:00:00',
  },
  {
    id: 17,
    tipo: 'devolucao', status: 'respondido', prioridade: 'normal',
    marketplace: 'MAG', cliente: 'Thiago Nascimento Pereira', produto: 'Sérum Capilar BioSeiva 60ml',
    produtoImagem: null, pedidoId: 19,
    motivoDevolucao: 'Produto com defeito', statusDevolucao: 'Reembolsado', valorReembolso: 89.90,
    mensagens: [
      { id: 1, de: 'cliente', texto: 'Recebi o produto com menos quantidade do que deveria. Parece que vazou durante o transporte. Quero o reembolso.', data: '2026-03-08T16:00:00' },
      { id: 2, de: 'vendedor', texto: 'Thiago, pedimos desculpas pelo ocorrido! Verificamos e confirmamos o problema. Processamos o reembolso total de R$ 89,90 hoje mesmo. Você receberá em até 5 dias úteis.', data: '2026-03-08T16:30:00' },
      { id: 3, de: 'cliente', texto: 'Reembolso recebido hoje. Obrigado pela agilidade na resolução.', data: '2026-03-11T09:00:00' },
    ],
    data: '2026-03-08T16:00:00',
  },
]

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
