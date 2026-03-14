/** Extended user profile — includes all columns from the `users` table */
export interface ExtendedProfile {
  id: string
  email: string
  name: string
  role: string
  company: string
  plan: string
  avatar_url: string | null
  // From 20260314000000_add_user_fields
  razao_social?: string
  document_type?: 'cnpj' | 'cpf'
  document_number?: string
  whatsapp?: string
  segment?: string
  // From 20260314000001_configuracoes
  nome_fantasia?: string
  inscricao_estadual?: string
  inscricao_estadual_isento?: boolean
  inscricao_municipal?: string
  cnae?: string
  regime_tributario?: string
  cep?: string
  uf?: string
  cidade?: string
  bairro?: string
  endereco?: string
  numero?: string
  complemento?: string
  telefone?: string
  site?: string
  pessoa_contato?: string
  logo_url?: string
  notification_prefs?: NotifPrefs
}

export interface NotifPrefs {
  email_novos_pedidos?: boolean
  email_reclamacoes?: boolean
  email_estoque_baixo?: boolean
  email_relatorio_semanal?: boolean
  email_novidades?: boolean
  app_novos_pedidos?: boolean
  app_reclamacoes_urgentes?: boolean
  app_estoque_zerado?: boolean
}

export const INPUT_CLS = 'w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
export const LABEL_CLS = 'block text-xs font-semibold text-slate-500 mb-1.5'
