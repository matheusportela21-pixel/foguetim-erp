'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, AlertCircle, Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

/* ── Config ──────────────────────────────────────────────────────────────── */
const EMAIL_PREFS_CONFIG = [
  {
    key:         'new_order',
    label:       'Novo pedido',
    description: 'Receba um email quando uma nova venda for realizada',
  },
  {
    key:         'new_question',
    label:       'Nova pergunta',
    description: 'Receba um email quando um comprador fizer uma pergunta',
  },
  {
    key:         'new_claim',
    label:       'Nova reclamação',
    description: 'Receba um email quando uma reclamação for aberta',
  },
  {
    key:         'claim_urgent',
    label:       'Reclamação urgente',
    description: 'Alerta quando uma reclamação estiver próxima do prazo',
  },
  {
    key:         'new_message',
    label:       'Nova mensagem pós-venda',
    description: 'Receba um email quando um comprador enviar mensagem',
  },
  {
    key:         'shipping_update',
    label:       'Atualização de envio',
    description: 'Notificações sobre mudanças no status dos seus envios',
  },
  {
    key:         'weekly_summary',
    label:       'Resumo semanal',
    description: 'Receba todo domingo um resumo das suas vendas da semana',
  },
] as const

type PrefKey = typeof EMAIL_PREFS_CONFIG[number]['key']

type EmailPrefs = Record<PrefKey, boolean>

const DEFAULT_PREFS: EmailPrefs = {
  new_order:       false,
  new_question:    false,
  new_claim:       false,
  claim_urgent:    false,
  new_message:     false,
  shipping_update: false,
  weekly_summary:  false,
}

/* ── Toggle ──────────────────────────────────────────────────────────────── */
function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      className={`relative w-10 h-[22px] rounded-full transition-all shrink-0 disabled:opacity-50 ${on ? 'bg-purple-600' : 'bg-[#1e2330]'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function EmailPrefsSection() {
  const { profile } = useAuth()
  const [prefs, setPrefs]       = useState<EmailPrefs>({ ...DEFAULT_PREFS })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<PrefKey | null>(null)
  const [testing, setTesting]   = useState(false)
  const [toast, setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    fetch('/api/user/email-prefs')
      .then(r => r.json())
      .then((d: { email_prefs?: Partial<EmailPrefs> }) => {
        if (d.email_prefs) setPrefs(prev => ({ ...prev, ...d.email_prefs }))
      })
      .catch(() => {/* silenciar — usar defaults */})
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(key: PrefKey) {
    const newVal = !prefs[key]
    setPrefs(prev => ({ ...prev, [key]: newVal }))
    setSaving(key)
    try {
      const res = await fetch('/api/user/email-prefs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key, value: newVal }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      showToast('success', newVal ? 'Notificação ativada' : 'Notificação desativada')
    } catch {
      // Reverter
      setPrefs(prev => ({ ...prev, [key]: !newVal }))
      showToast('error', 'Erro ao salvar preferência')
    } finally {
      setSaving(null)
    }
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Notificações por Email
        </h3>
        <p className="text-xs text-slate-600">
          Escolha quais eventos você quer receber por email. Por padrão, todas as notificações estão desativadas.
        </p>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">
            Enviando para: <span className="text-white font-medium">{profile?.email ?? '—'}</span>
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enabledCount > 0 ? 'bg-purple-500/15 text-purple-400' : 'bg-white/[0.04] text-slate-600'}`}>
          {enabledCount} ativa{enabledCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Toggles */}
      <div className="dash-card rounded-xl overflow-hidden divide-y divide-white/[0.04]">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="space-y-1.5">
                <div className="h-3.5 w-36 bg-white/[0.06] rounded animate-pulse" />
                <div className="h-3 w-52 bg-white/[0.04] rounded animate-pulse" />
              </div>
              <div className="w-10 h-[22px] bg-white/[0.06] rounded-full animate-pulse" />
            </div>
          ))
        ) : (
          EMAIL_PREFS_CONFIG.map(item => (
            <div key={item.key} className="flex items-center justify-between px-5 py-3.5">
              <div className="pr-4 flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{item.description}</p>
                {item.key === 'weekly_summary' && (
                  <button
                    onClick={async () => {
                      const res  = await fetch('/api/email/weekly-summary', { method: 'POST' })
                      const data = await res.json() as { success?: boolean; message?: string }
                      alert(data.success
                        ? '✅ Resumo semanal enviado! Verifique sua caixa.'
                        : '❌ ' + (data.message ?? 'Erro ao enviar'))
                    }}
                    className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors"
                  >
                    Enviar resumo agora (teste)
                  </button>
                )}
              </div>
              {saving === item.key ? (
                <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" />
              ) : (
                <Toggle
                  on={prefs[item.key] ?? false}
                  onToggle={() => void handleToggle(item.key)}
                  disabled={saving !== null}
                />
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-slate-600">
        As notificações são enviadas apenas para eventos reais do Mercado Livre. Sem spam.
      </p>

      {/* Test button */}
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            setTesting(true)
            try {
              const res  = await fetch('/api/email/test', { method: 'POST' })
              const data = await res.json() as { success?: boolean; message?: string }
              showToast(data.success ? 'success' : 'error', data.message ?? 'Erro desconhecido')
            } catch {
              showToast('error', 'Erro ao chamar rota de teste')
            } finally {
              setTesting(false)
            }
          }}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white/[0.04] hover:bg-white/[0.07] text-slate-300 border border-white/[0.08] rounded-lg transition-all disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          {testing ? 'Enviando...' : 'Enviar email de teste'}
        </button>
        <p className="text-[11px] text-slate-600">Envia um exemplo para o seu email cadastrado</p>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
