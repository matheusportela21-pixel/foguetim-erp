'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import type { ExtendedProfile, NotifPrefs } from '../types'

const DEFAULT_PREFS: Required<NotifPrefs> = {
  email_novos_pedidos:        true,
  email_reclamacoes:          true,
  email_estoque_baixo:        true,
  email_relatorio_semanal:    true,
  email_novidades:            true,
  app_novos_pedidos:          true,
  app_reclamacoes_urgentes:   true,
  app_estoque_zerado:         true,
}

const EMAIL_TOGGLES: { key: keyof NotifPrefs; label: string; sub: string }[] = [
  { key: 'email_novos_pedidos',     label: 'Novos pedidos',      sub: 'Notificar ao receber um novo pedido' },
  { key: 'email_reclamacoes',       label: 'Reclamações abertas', sub: 'Alertar quando uma reclamação for aberta' },
  { key: 'email_estoque_baixo',     label: 'Estoque baixo',      sub: 'Alertar quando produto atingir estoque crítico' },
  { key: 'email_relatorio_semanal', label: 'Relatório semanal',  sub: 'Resumo de performance toda segunda-feira' },
  { key: 'email_novidades',         label: 'Novidades do Foguetim', sub: 'Dicas, melhorias e novos recursos' },
]

const APP_TOGGLES: { key: keyof NotifPrefs; label: string; sub: string }[] = [
  { key: 'app_novos_pedidos',        label: 'Novos pedidos',         sub: 'Notificação em tempo real no painel' },
  { key: 'app_reclamacoes_urgentes', label: 'Reclamações urgentes',  sub: 'Alertas de reclamações críticas' },
  { key: 'app_estoque_zerado',       label: 'Produtos sem estoque',  sub: 'Aviso quando produto zerar estoque' },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`relative w-10 h-[22px] rounded-full transition-all shrink-0 ${on ? 'bg-purple-600' : 'bg-dark-600'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export default function NotifSection() {
  const { profile } = useAuth()
  const p = profile as unknown as ExtendedProfile

  const [prefs, setPrefs] = useState<Required<NotifPrefs>>({ ...DEFAULT_PREFS })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    if (!p?.notification_prefs) return
    setPrefs(prev => ({ ...prev, ...p.notification_prefs }))
  }, [p?.notification_prefs])

  const toggle = (key: keyof NotifPrefs) =>
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    if (!isConfigured() || !profile?.id) {
      showToast('success', 'Preferências salvas! (modo dev)')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_prefs: prefs })
        .eq('id', profile.id)
      if (error) throw new Error(error.message)
      showToast('success', 'Preferências salvas com sucesso!')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const renderGroup = (
    title: string,
    items: { key: keyof NotifPrefs; label: string; sub: string }[]
  ) => (
    <div className="space-y-1">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="dash-card rounded-xl overflow-hidden divide-y divide-white/[0.04]">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-slate-200">{item.label}</p>
              <p className="text-xs text-slate-600 mt-0.5">{item.sub}</p>
            </div>
            <Toggle on={prefs[item.key] ?? false} onToggle={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Notificações
        </h3>
        <p className="text-xs text-slate-600">Configure como e quando deseja ser notificado</p>
      </div>

      {renderGroup('E-mail', EMAIL_TOGGLES)}
      {renderGroup('Sistema (in-app)', APP_TOGGLES)}

      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white transition-all"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? 'Salvando...' : 'Salvar preferências'}
      </button>

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
