'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Download, X, Loader2, Check, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import type { ExtendedProfile } from '../types'

/* ── Cancel reasons ─────────────────────────────────────────────────────────── */
const CANCEL_REASONS = [
  'Não uso o sistema com frequência',
  'Encontrei uma alternativa melhor',
  'O preço não cabe no meu orçamento',
  'Faltam funcionalidades que preciso',
  'Tive problemas técnicos',
  'Outros',
]

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function DangerSection() {
  const { profile, signOut } = useAuth()
  const p      = profile as unknown as ExtendedProfile
  const router = useRouter()

  const [showModal, setShowModal]   = useState(false)
  const [step, setStep]             = useState<1 | 2 | 3>(1)
  const [reason, setReason]         = useState('')
  const [details, setDetails]       = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* ── Reset modal ──────────────────────────────────────────────────────────── */
  const resetModal = () => {
    setShowModal(false)
    setStep(1)
    setReason('')
    setDetails('')
    setConfirmEmail('')
  }

  /* ── Data backup ──────────────────────────────────────────────────────────── */
  const handleBackup = useCallback(() => {
    const safeProfile: Record<string, unknown> = {
      id:                      p?.id,
      email:                   p?.email,
      name:                    p?.name,
      role:                    p?.role,
      company:                 p?.company,
      plan:                    p?.plan,
      razao_social:            p?.razao_social,
      nome_fantasia:           p?.nome_fantasia,
      document_type:           p?.document_type,
      document_number:         p?.document_number,
      segment:                 p?.segment,
      regime_tributario:       p?.regime_tributario,
      cep:                     p?.cep,
      uf:                      p?.uf,
      cidade:                  p?.cidade,
      bairro:                  p?.bairro,
      endereco:                p?.endereco,
      numero:                  p?.numero,
      complemento:             p?.complemento,
      pessoa_contato:          p?.pessoa_contato,
      telefone:                p?.telefone,
      whatsapp:                p?.whatsapp,
      site:                    p?.site,
      logo_url:                p?.logo_url,
      notification_prefs:      p?.notification_prefs,
      backup_generated_at:     new Date().toISOString(),
      note:                    'OAuth tokens and sensitive credentials are not included for security reasons.',
    }

    const json    = JSON.stringify(safeProfile, null, 2)
    const blob    = new Blob([json], { type: 'application/json' })
    const url     = URL.createObjectURL(blob)
    const dateStr = new Date().toISOString().split('T')[0]
    const a       = document.createElement('a')
    a.href        = url
    a.download    = `foguetim-backup-${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('success', 'Backup gerado e baixado com sucesso!')
  }, [p, showToast])

  /* ── Cancel account ───────────────────────────────────────────────────────── */
  const handleCancel = async () => {
    if (!reason) { showToast('error', 'Selecione um motivo para continuar.'); return }
    if (confirmEmail !== profile?.email) {
      showToast('error', 'E-mail não confere com a conta.'); return
    }

    if (!isConfigured() || !profile?.id) {
      showToast('success', 'Conta cancelada (modo dev). Redirecionando...')
      resetModal()
      setTimeout(() => { void signOut(); router.push('/?cancelled=true') }, 1500)
      return
    }

    setCancelling(true)
    try {
      // 1. Insert cancellation request
      const { error: reqErr } = await supabase
        .from('cancellation_requests')
        .insert({ user_id: profile.id, reason, details: details || null })
      if (reqErr) throw new Error(reqErr.message)

      // 2. Mark user as cancelled
      const scheduledDeletion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { error: updErr } = await supabase
        .from('users')
        .update({ cancelled_at: new Date().toISOString(), scheduled_deletion: scheduledDeletion })
        .eq('id', profile.id)
      if (updErr) throw new Error(updErr.message)

      // 3. Sign out and redirect
      resetModal()
      await signOut()
      router.push('/?cancelled=true')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao cancelar conta.')
    } finally {
      setCancelling(false)
    }
  }

  const emailMatches = confirmEmail === profile?.email && confirmEmail !== ''

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Zona de Perigo
        </h3>
        <p className="text-xs text-slate-600">Ações irreversíveis relacionadas à sua conta</p>
      </div>

      {/* ── Danger card ── */}
      <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-300 text-sm">Cancelar conta</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Ao cancelar sua conta, todos os dados serão mantidos por{' '}
              <strong className="text-slate-400">30 dias</strong> e depois permanentemente excluídos.
              Você pode fazer backup dos seus dados antes de cancelar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-white/[0.08] hover:bg-white/[0.04] transition-all"
          >
            <Download className="w-4 h-4" /> Fazer backup dos dados
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 border border-red-800/50 hover:bg-red-900/20 transition-all"
          >
            <AlertTriangle className="w-4 h-4" /> Cancelar minha conta
          </button>
        </div>
      </div>

      {/* ── Cancel modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-2xl p-6 max-w-md w-full border border-white/[0.08] space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i + 1 === step ? 'bg-red-400' : i + 1 < step ? 'bg-red-600' : 'bg-dark-600'}`}
                  />
                ))}
                <span className="text-xs text-slate-600 ml-1">Etapa {step} de 3</span>
              </div>
              <button onClick={resetModal} className="text-slate-600 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Step 1 ── */}
            {step === 1 && (
              <>
                <div>
                  <h4 className="font-bold text-white text-base">Tem certeza?</h4>
                  <p className="text-xs text-slate-500 mt-1">Esta ação irá:</p>
                </div>
                <ul className="space-y-2">
                  {[
                    'Desconectar todas as integrações com marketplaces',
                    'Cancelar sua assinatura imediatamente (se houver)',
                    'Manter seus dados por 30 dias para eventual recuperação',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3 pt-2">
                  <button onClick={resetModal}
                    className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-all">
                    Voltar
                  </button>
                  <button onClick={() => setStep(2)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-red-700/30 hover:bg-red-700/50 text-red-300 border border-red-700/40 transition-all">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <>
                <div>
                  <h4 className="font-bold text-white text-base">Por que você está saindo?</h4>
                  <p className="text-xs text-slate-500 mt-1">Seu feedback nos ajuda a melhorar</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Motivo <span className="text-red-400">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-red-600/40 transition-all"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  >
                    <option value="">Selecione um motivo...</option>
                    {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Conte mais (opcional)</label>
                  <textarea
                    rows={3}
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    placeholder="O que poderia ter sido diferente?"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-600/40 transition-all resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-all">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button onClick={() => { if (!reason) { showToast('error', 'Selecione um motivo.'); return } setStep(3) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-red-700/30 hover:bg-red-700/50 text-red-300 border border-red-700/40 transition-all">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <>
                <div>
                  <h4 className="font-bold text-white text-base">Confirmação final</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Para confirmar o cancelamento, digite seu e-mail abaixo:
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Seu e-mail: <span className="text-slate-400 font-normal">{profile?.email}</span>
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={e => setConfirmEmail(e.target.value)}
                    placeholder="Digite seu e-mail para confirmar"
                    className={`w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all ${
                      confirmEmail && !emailMatches
                        ? 'border-red-500/60 focus:ring-red-600/40'
                        : emailMatches
                        ? 'border-green-500/60 focus:ring-green-600/40'
                        : 'border-white/[0.08] focus:ring-red-600/40'
                    }`}
                  />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-all">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button
                    onClick={() => void handleCancel()}
                    disabled={!emailMatches || cancelling}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
