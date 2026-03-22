'use client'

import { useState, useCallback } from 'react'
import {
  Settings, Plug, Bot, CreditCard, Mail, ChevronDown, Eye, EyeOff,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */

interface ConfigItem {
  label: string
  value: string
  masked?: boolean
  badge?: { text: string; color: 'green' | 'red' | 'yellow' | 'blue' }
}

interface ConfigSection {
  id: string
  title: string
  icon: React.ElementType
  items: ConfigItem[]
}

/* ── Masked Value Component ──────────────────────────────────────────────── */

function MaskedValue({ value }: { value: string }) {
  const [visible, setVisible] = useState(false)

  const reveal = useCallback(() => {
    setVisible(true)
    setTimeout(() => setVisible(false), 3000)
  }, [])

  if (visible) {
    return <span className="text-sm text-slate-200 font-mono">{value}</span>
  }

  const masked = value.length > 4
    ? '••••' + value.slice(-4)
    : '••••'

  return (
    <span className="flex items-center gap-2">
      <span className="text-sm text-slate-200 font-mono">{masked}</span>
      <button
        onClick={reveal}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
      >
        <Eye className="w-3.5 h-3.5" />
        Mostrar
      </button>
    </span>
  )
}

/* ── Badge Component ─────────────────────────────────────────────────────── */

const badgeColors = {
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red:   'bg-red-500/10 text-red-400 border-red-500/20',
  yellow:'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  blue:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
} as const

function Badge({ text, color }: { text: string; color: keyof typeof badgeColors }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeColors[color]}`}>
      {text}
    </span>
  )
}

/* ── Section Data ────────────────────────────────────────────────────────── */

const sections: ConfigSection[] = [
  {
    id: 'geral',
    title: 'Geral',
    icon: Settings,
    items: [
      { label: 'Sistema', value: 'Foguetim ERP' },
      { label: 'Versao', value: '1.0.0-beta' },
      { label: 'Ambiente', value: process.env.NODE_ENV ?? 'development' },
      { label: 'Modo manutencao', value: 'toggle' }, // handled specially
    ],
  },
  {
    id: 'integracoes',
    title: 'Integracoes',
    icon: Plug,
    items: [
      { label: 'ML App ID', value: '9876543211234', masked: true },
      { label: 'Shopee Partner ID', value: '5432109875678', masked: true },
      { label: 'Webhook URL ML', value: 'https://app.foguetim.com.br/webhooks/mercadolivre' },
      { label: 'Webhook URL Shopee', value: 'https://app.foguetim.com.br/webhooks/shopee' },
    ],
  },
  {
    id: 'ia',
    title: 'IA / Agentes',
    icon: Bot,
    items: [
      { label: 'API Key', value: 'sk-ant-api03-xxxxxxxxxxxx', masked: true },
      { label: 'Modelo padrao', value: 'claude-sonnet-4-5-20250514' },
      { label: 'Total de agentes', value: '40' },
      { label: 'Custo maximo mensal', value: 'R$ 500,00' },
    ],
  },
  {
    id: 'billing',
    title: 'Planos & Billing',
    icon: CreditCard,
    items: [
      { label: 'BILLING_ACTIVE', value: 'false', badge: { text: 'Inativo', color: 'red' } },
      { label: 'Gateway', value: 'Nao configurado' },
      { label: 'Planos disponiveis', value: 'Explorador, Piloto, Comandante, Almirante, Enterprise, Missao Espacial' },
    ],
  },
  {
    id: 'email',
    title: 'Email',
    icon: Mail,
    items: [
      { label: 'Provedor', value: 'Supabase Auth (built-in)' },
      { label: 'Email de envio', value: 'noreply@foguetim.com.br' },
      { label: 'Status', value: 'Ativo', badge: { text: 'Ativo', color: 'green' } },
    ],
  },
]

/* ── Collapsible Section Component ───────────────────────────────────────── */

function SectionCard({ section }: { section: ConfigSection }) {
  const [open, setOpen] = useState(true)
  const [manutencao, setManutencao] = useState(false)
  const Icon = section.icon

  return (
    <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-semibold text-white">{section.title}</h2>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
          {section.items.map((item) => {
            // Special handling for maintenance toggle
            if (item.label === 'Modo manutencao') {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                >
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setManutencao(!manutencao)
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      manutencao ? 'bg-red-500/60' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        manutencao ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={item.label}
                className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-sm text-slate-400">{item.label}</span>
                <span className="flex items-center gap-2">
                  {item.masked ? (
                    <MaskedValue value={item.value} />
                  ) : item.badge ? (
                    <Badge text={item.badge.text} color={item.badge.color} />
                  ) : (
                    <span className="text-sm text-slate-200 font-mono">{item.value}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function ConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-[#080b10] p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configuracoes do sistema — somente leitura
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-4 max-w-3xl">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  )
}
