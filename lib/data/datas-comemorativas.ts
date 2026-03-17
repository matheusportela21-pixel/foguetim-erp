/**
 * Datas comemorativas do e-commerce brasileiro — 2026
 * Todas as datas variáveis foram pesquisadas e confirmadas para 2026.
 *
 * Fontes:
 *   Carnaval 2026: Terça-feira 17/02/2026 (confirmado)
 *   Páscoa 2026: Domingo 05/04/2026 (confirmado)
 *   Dia das Mães: 2º domingo de maio = 10/05/2026 (confirmado)
 *   Dia dos Pais: 2º domingo de agosto = 09/08/2026 (confirmado)
 *   Black Friday: última sexta de novembro = 27/11/2026 (confirmado)
 *   Cyber Monday: segunda após Black Friday = 30/11/2026 (confirmado)
 */

export type CategoriaData = 'mega' | 'alta' | 'media' | 'nicho'

export interface DataComemorativa {
  id:           string
  nome:         string
  data:         string   // YYYY-MM-DD
  categoria:    CategoriaData
  icone:        string   // emoji
  dica:         string   // dica rápida para o vendedor
}

export const DATAS_COMEMORATIVAS_2026: DataComemorativa[] = [
  /* ── MEGA ──────────────────────────────────────────────────────────── */
  {
    id:        'natal',
    nome:      'Natal',
    data:      '2026-12-25',
    categoria: 'mega',
    icone:     '🎄',
    dica:      'Prepare kits e embalagens especiais. Aumente o estoque de produtos de maior saída com 60 dias de antecedência. Ative campanhas de produto patrocinado com 2 semanas de antecipação.',
  },
  {
    id:        'black-friday',
    nome:      'Black Friday',
    data:      '2026-11-27',
    categoria: 'mega',
    icone:     '🖤',
    dica:      'Maior data do e-commerce. Programe descontos reais (o ML monitora variação de preço). Atualize estoque com 30 dias de antecedência. Ative promoções relâmpago pelo painel do ML.',
  },
  {
    id:        'dia-das-maes',
    nome:      'Dia das Mães',
    data:      '2026-05-10',
    categoria: 'mega',
    icone:     '💐',
    dica:      'Segunda maior data de vendas do Brasil. Crie kits presentes, destaque produtos relacionados a beleza e bem-estar. Prepare listagens específicas para presente com 30 dias de antecedência.',
  },
  {
    id:        'dia-dos-namorados',
    nome:      'Dia dos Namorados',
    data:      '2026-06-12',
    categoria: 'mega',
    icone:     '❤️',
    dica:      'Data forte para cosméticos, perfumes e kits presentes. Reforce o estoque dos seus itens mais presentes 3 semanas antes. Crie títulos orientados a "presente para namorada/namorado".',
  },
  {
    id:        'dia-dos-pais',
    nome:      'Dia dos Pais',
    data:      '2026-08-09',
    categoria: 'mega',
    icone:     '👨‍👧',
    dica:      'Foco em produtos masculinos e kits presentes. Oportunidade para produtos de cuidado pessoal masculino. Prepare campanhas 3 semanas antes da data.',
  },
  {
    id:        'dia-das-criancas',
    nome:      'Dia das Crianças',
    data:      '2026-10-12',
    categoria: 'mega',
    icone:     '🎈',
    dica:      'Data de pico para brinquedos e produtos infantis. Para cosméticos, foque em presentes para filhos adultos e kits familiares. Reforce estoque 3 semanas antes.',
  },

  /* ── ALTA ───────────────────────────────────────────────────────────── */
  {
    id:        'pascoa',
    nome:      'Páscoa',
    data:      '2026-04-05',
    categoria: 'alta',
    icone:     '🐣',
    dica:      'Oportunidade para kits de beleza e bem-estar. Embalagens especiais aumentam o ticket médio. Prepare com 3 semanas de antecedência.',
  },
  {
    id:        'carnaval',
    nome:      'Carnaval',
    data:      '2026-02-17',
    categoria: 'alta',
    icone:     '🎭',
    dica:      'Pico de vendas de fantasias e maquiagem artística. Bom momento para produtos de maquiagem e glitter. Campanha deve ir ao ar 2 semanas antes.',
  },
  {
    id:        'cyber-monday',
    nome:      'Cyber Monday',
    data:      '2026-11-30',
    categoria: 'alta',
    icone:     '💻',
    dica:      'Segunda-feira após a Black Friday. Ótima para limpar o estoque restante com descontos adicionais. Mantenha campanhas ativas do fim de semana da BF.',
  },
  {
    id:        'dia-do-consumidor',
    nome:      'Dia do Consumidor',
    data:      '2026-03-15',
    categoria: 'alta',
    icone:     '🛒',
    dica:      'Chamada de "Black Friday de março". Excelente para promoções relâmpago e cupons de desconto no ML. Prepare 1 semana antes.',
  },
  {
    id:        'volta-as-aulas',
    nome:      'Volta às Aulas',
    data:      '2026-01-26',
    categoria: 'alta',
    icone:     '🎒',
    dica:      'Boa oportunidade para produtos de organização e higiene pessoal. Foque em kits prontos para uso. Campanha deve começar na primeira semana de janeiro.',
  },
  {
    id:        'dia-dos-avos',
    nome:      'Dia dos Avós',
    data:      '2026-07-26',
    categoria: 'alta',
    icone:     '👴',
    dica:      'Crescendo como data de presente. Kits de bem-estar e cuidado pessoal performam bem. Prepare listagens orientadas a "presente para avó/avô".',
  },

  /* ── MÉDIA ──────────────────────────────────────────────────────────── */
  {
    id:        'dia-da-mulher',
    nome:      'Dia Internacional da Mulher',
    data:      '2026-03-08',
    categoria: 'media',
    icone:     '🌸',
    dica:      'Cosméticos e beleza têm alta nesta data. Destaque produtos femininos nos títulos e fotos. Crie campanhas com 1 semana de antecedência.',
  },
  {
    id:        'ano-novo',
    nome:      'Ano Novo',
    data:      '2026-01-01',
    categoria: 'media',
    icone:     '🎆',
    dica:      'Boa oportunidade para produtos de beleza e bem-estar com tema "novo ano, nova você". Prepare antes do Natal — quem não comprou de presente pode comprar para si.',
  },
  {
    id:        'dia-do-amigo',
    nome:      'Dia do Amigo',
    data:      '2026-07-20',
    categoria: 'media',
    icone:     '🤝',
    dica:      'Kits de presente e produtos de valor acessível (até R$80) performam bem. Ative cupons de desconto com 5 dias de antecedência.',
  },
  {
    id:        'halloween',
    nome:      'Halloween',
    data:      '2026-10-31',
    categoria: 'media',
    icone:     '🎃',
    dica:      'Crescendo no Brasil. Maquiagem artística e acessórios têm alta. Prepare listagens com tema entre 15 e 25 de outubro.',
  },

  /* ── NICHO (beleza/cosméticos) ──────────────────────────────────────── */
  {
    id:        'dia-da-beleza',
    nome:      'Dia da Beleza',
    data:      '2026-11-01',
    categoria: 'nicho',
    icone:     '💄',
    dica:      'Data dedicada ao setor de beleza, logo após o Halloween. Excelente para promoções em cosméticos. Aproveite o impulso do Dia do Halloween.',
  },
  {
    id:        'dia-do-cabeleireiro',
    nome:      'Dia do Cabeleireiro',
    data:      '2026-12-05',
    categoria: 'nicho',
    icone:     '✂️',
    dica:      'Oportunidade para produtos profissionais de cabelo. Crie kits para presentear cabeleireiros.',
  },
  {
    id:        'dia-do-esteticista',
    nome:      'Dia do Esteticista',
    data:      '2026-06-02',
    categoria: 'nicho',
    icone:     '🧖',
    dica:      'Data nicho para produtos profissionais de estética. Foque em kits e produtos de uso profissional.',
  },
  {
    id:        'dia-da-mulher-negra',
    nome:      'Dia da Mulher Negra',
    data:      '2026-07-25',
    categoria: 'nicho',
    icone:     '✊',
    dica:      'Data importante para produtos de beleza para pele negra. Destaque produtos específicos e mostre representatividade nas fotos.',
  },
]

/* ── Helpers ─────────────────────────────────────────────────────────── */

export const CATEGORIA_CONFIG: Record<CategoriaData, { label: string; color: string; bg: string; border: string }> = {
  mega:  { label: 'Mega',   color: 'text-red-300',    bg: 'bg-red-950/50',    border: 'border-red-800/50'    },
  alta:  { label: 'Alta',   color: 'text-orange-300', bg: 'bg-orange-950/40', border: 'border-orange-800/40' },
  media: { label: 'Média',  color: 'text-yellow-300', bg: 'bg-yellow-950/30', border: 'border-yellow-800/40' },
  nicho: { label: 'Nicho',  color: 'text-purple-300', bg: 'bg-purple-950/30', border: 'border-purple-800/40' },
}

/** Returns events sorted by date, starting from today (Brasília). */
export function getUpcomingEvents(all = DATAS_COMEMORATIVAS_2026): DataComemorativa[] {
  return [...all].sort((a, b) => a.data.localeCompare(b.data))
}

/** Formats a YYYY-MM-DD date string for display (e.g. "Dom, 10 mai 2026"). */
export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}
