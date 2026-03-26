'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Plug, Bot, CreditCard, Mail, ChevronDown, Eye, Save, Loader2,
} from 'lucide-react'

/* -- Types ----------------------------------------------------------------- */

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

interface SystemSettings {
  maintenance_mode: boolean
  max_users_explorador: number
  max_users_piloto: number
  max_users_comandante: number
  max_users_almirante: number
  max_users_enterprise: number
  default_trial_days: number
  email_notifications: boolean
}

const DEFAULT_SETTINGS: SystemSettings = {
  maintenance_mode: false,
  max_users_explorador: 1,
  max_users_piloto: 3,
  max_users_comandante: 5,
  max_users_almirante: 10,
  max_users_enterprise: 50,
  default_trial_days: 7,
  email_notifications: true,
}

/* -- Masked Value Component ------------------------------------------------ */

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
    ? '****' + value.slice(-4)
    : '****'

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

/* -- Badge Component ------------------------------------------------------- */

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

/* -- Section Data (read-only env var display) ------------------------------ */

const sections: ConfigSection[] = [
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

/* -- Collapsible Section Component ----------------------------------------- */

function SectionCard({ section }: { section: ConfigSection }) {
  const [open, setOpen] = useState(true)
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
          {section.items.map((item) => (
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
          ))}
        </div>
      )}
    </div>
  )
}

/* -- Toggle Component ------------------------------------------------------ */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-emerald-500/60' : 'bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

/* -- Number Input Component ------------------------------------------------ */

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <input
        type="number"
        min={1}
        max={9999}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-20 bg-[#080b10] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-slate-200 text-right outline-none focus:border-white/[0.15] transition-colors"
      />
    </div>
  )
}

/* -- Page ------------------------------------------------------------------ */

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Load settings on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/configuracoes')
        if (res.ok) {
          const data = await res.json()
          setSettings({ ...DEFAULT_SETTINGS, ...data })
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/configuracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar')
      }
      showToast('success', 'Configuracoes salvas com sucesso!')
    } catch (e) {
      showToast('error', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function updateSetting<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-[#080b10] p-6 md:p-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configuracoes do sistema e variaveis de ambiente
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-3xl">
        {/* ============================================================ */}
        {/*  Editable System Settings                                     */}
        {/* ============================================================ */}
        <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-5 flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-semibold text-white">Configuracoes do Sistema</h2>
          </div>

          {loading ? (
            <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/[0.04] rounded mb-2 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
              {/* Maintenance Mode */}
              <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                <div>
                  <span className="text-sm text-slate-300">Modo Manutencao</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Quando ativo, apenas admins podem acessar o sistema
                  </p>
                </div>
                <Toggle
                  checked={settings.maintenance_mode}
                  onChange={(v) => updateSetting('maintenance_mode', v)}
                />
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                <div>
                  <span className="text-sm text-slate-300">Notificacoes por Email</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Emails automaticos de boas-vindas, alertas e relatorios
                  </p>
                </div>
                <Toggle
                  checked={settings.email_notifications}
                  onChange={(v) => updateSetting('email_notifications', v)}
                />
              </div>

              {/* Default Trial Days */}
              <NumberInput
                label="Dias de trial padrao"
                value={settings.default_trial_days}
                onChange={(v) => updateSetting('default_trial_days', v)}
              />

              {/* Max Users per Plan */}
              <div className="pt-3 mt-3 border-t border-white/[0.06]">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  Max usuarios por plano
                </p>
                <NumberInput label="Explorador" value={settings.max_users_explorador} onChange={(v) => updateSetting('max_users_explorador', v)} />
                <NumberInput label="Piloto" value={settings.max_users_piloto} onChange={(v) => updateSetting('max_users_piloto', v)} />
                <NumberInput label="Comandante" value={settings.max_users_comandante} onChange={(v) => updateSetting('max_users_comandante', v)} />
                <NumberInput label="Almirante" value={settings.max_users_almirante} onChange={(v) => updateSetting('max_users_almirante', v)} />
                <NumberInput label="Enterprise" value={settings.max_users_enterprise} onChange={(v) => updateSetting('max_users_enterprise', v)} />
              </div>

              {/* Save Button */}
              <div className="pt-4 mt-3 border-t border-white/[0.06] flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Configuracoes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  Read-only env var sections                                    */}
        {/* ============================================================ */}
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  )
}
