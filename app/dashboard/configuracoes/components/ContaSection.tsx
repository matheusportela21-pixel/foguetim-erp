'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Loader2, Check, AlertCircle, Camera, Eye, EyeOff, X, Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-log'
import type { ExtendedProfile } from '../types'
import { INPUT_CLS, LABEL_CLS } from '../types'

/* ── Masks ─────────────────────────────────────────────────────────────────── */
function maskWhatsApp(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/* ── Password strength ──────────────────────────────────────────────────────── */
function strengthScore(pwd: string): number {
  let s = 0
  if (pwd.length >= 8) s++
  if (pwd.length >= 12) s++
  if (/[A-Z]/.test(pwd)) s++
  if (/[0-9]/.test(pwd)) s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  return s
}

function strengthInfo(s: number): { label: string; cls: string; pct: number } {
  if (s < 2) return { label: 'Fraca', cls: 'bg-red-500', pct: 25 }
  if (s < 4) return { label: 'Média', cls: 'bg-amber-500', pct: 60 }
  return { label: 'Forte', cls: 'bg-green-500', pct: 100 }
}

const ROLE_LABELS: Record<string, string> = {
  diretor: 'Diretor', director: 'Diretor',
  supervisor: 'Supervisor',
  analista_produtos: 'Analista de Produtos', analyst_products: 'Analista de Produtos',
  analista_financeiro: 'Analista Financeiro', analyst_financial: 'Analista Financeiro',
  suporte: 'Suporte', support: 'Suporte',
  operador: 'Operador', operator: 'Operador',
}

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function ContaSection() {
  const { profile } = useAuth()
  const p = profile as unknown as ExtendedProfile
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName]         = useState(p?.name ?? '')
  const [whatsapp, setWhatsapp] = useState(p?.whatsapp ?? '')
  const [avatarUrl, setAvatarUrl] = useState(p?.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)

  // Email modal
  const [emailModal, setEmailModal] = useState(false)
  const [newEmail, setNewEmail]     = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  // Password
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd]       = useState<Record<string, boolean>>({})
  const [pwdSaving, setPwdSaving]   = useState(false)
  const [pwdError, setPwdError]     = useState('')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    if (!profile) return
    const pr = profile as unknown as ExtendedProfile
    setName(pr.name ?? '')
    setWhatsapp(pr.whatsapp ?? '')
    setAvatarUrl(pr.avatar_url ?? '')
  }, [profile])

  const initials = name
    ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'MP'

  /* ── Avatar upload ──────────────────────────────────────────────────────── */
  const handleAvatarFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
      showToast('error', 'Formato inválido. Use JPG, PNG, GIF ou WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Arquivo muito grande. Máximo 2 MB.')
      return
    }

    if (!isConfigured() || !profile?.id) {
      const reader = new FileReader()
      reader.onload = e => setAvatarUrl(e.target?.result as string)
      reader.readAsDataURL(file)
      return
    }

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${profile.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw new Error(upErr.message)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(publicUrl)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id)
      void logActivity({ action: 'update_avatar', category: 'account', description: 'Foto de perfil atualizada' })
      showToast('success', 'Foto atualizada!')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }, [profile, showToast])

  /* ── Save profile ───────────────────────────────────────────────────────── */
  const handleSaveProfile = async () => {
    if (!isConfigured() || !profile?.id) {
      showToast('success', 'Dados salvos! (modo dev)')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name, whatsapp })
        .eq('id', profile.id)
      if (error) throw new Error(error.message)
      void logActivity({ action: 'update_profile', category: 'account', description: 'Dados do perfil atualizados', metadata: { fields: ['name', 'whatsapp'] } })
      showToast('success', 'Dados salvos com sucesso!')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Email change ───────────────────────────────────────────────────────── */
  const handleEmailChange = async () => {
    if (!newEmail.includes('@')) { showToast('error', 'E-mail inválido.'); return }
    if (!isConfigured()) { showToast('success', 'E-mail atualizado! (modo dev)'); setEmailModal(false); return }
    setEmailSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw new Error(error.message)
      void logActivity({ action: 'request_email_change', category: 'security', description: 'Solicitação de alteração de e-mail enviada' })
      showToast('success', 'Verifique seu e-mail para confirmar a alteração.')
      setEmailModal(false)
      setNewEmail('')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao alterar e-mail.')
    } finally {
      setEmailSaving(false)
    }
  }

  /* ── Password change ────────────────────────────────────────────────────── */
  const handlePasswordChange = async () => {
    setPwdError('')
    if (!currentPwd) { setPwdError('Informe a senha atual.'); return }
    if (newPwd.length < 8) { setPwdError('Nova senha deve ter no mínimo 8 caracteres.'); return }
    if (newPwd !== confirmPwd) { setPwdError('As senhas não coincidem.'); return }
    if (!isConfigured()) {
      showToast('success', 'Senha alterada! (modo dev)')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      return
    }
    setPwdSaving(true)
    try {
      // Re-authenticate then update
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile?.email ?? '',
        password: currentPwd,
      })
      if (signInErr) throw new Error('Senha atual incorreta.')
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw new Error(error.message)
      void logActivity({ action: 'update_password', category: 'security', description: 'Senha alterada com sucesso' })
      showToast('success', 'Senha alterada com sucesso!')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Erro ao alterar senha.')
    } finally {
      setPwdSaving(false)
    }
  }

  const pwdScore = strengthScore(newPwd)
  const pwdInfo  = strengthInfo(pwdScore)

  const togglePwd = (key: string) =>
    setShowPwd(prev => ({ ...prev, [key]: !prev[key] }))

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Minha Conta
        </h3>
        <p className="text-xs text-slate-600">Informações do seu perfil de usuário</p>
      </div>

      {/* ── Avatar ── */}
      <div className="flex items-center gap-5">
        <div className="relative">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-lg font-bold text-white">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-all border-2 border-dark-800"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{name || 'Usuário'}</p>
          <p className="text-xs text-slate-500">{profile?.email}</p>
          <span className="inline-block mt-1 text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
            {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? 'Operador'}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleAvatarFile(f) }}
        />
      </div>

      {/* ── Profile form ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Nome Completo</label>
          <input className={INPUT_CLS} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className={LABEL_CLS}>E-mail</label>
          <div className="flex gap-2">
            <input className={`${INPUT_CLS} flex-1`} value={profile?.email ?? ''} readOnly disabled />
            <button
              onClick={() => setEmailModal(true)}
              className="shrink-0 px-3 py-2.5 rounded-lg text-xs font-semibold text-purple-400 border border-purple-600/40 hover:bg-purple-600/10 transition-all flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" /> Alterar
            </button>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>WhatsApp</label>
          <input className={INPUT_CLS} value={whatsapp}
            onChange={e => setWhatsapp(maskWhatsApp(e.target.value))} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className={LABEL_CLS}>Cargo</label>
          <input className={`${INPUT_CLS}`} value={ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? ''} readOnly disabled />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => void handleSaveProfile()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar dados'}
        </button>
      </div>

      <div className="border-t border-white/[0.05]" />

      {/* ── Password change ── */}
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-white text-sm mb-0.5">Alterar Senha</h4>
          <p className="text-xs text-slate-600">Use uma senha forte com pelo menos 8 caracteres</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Senha Atual <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type={showPwd.current ? 'text' : 'password'}
                className={`${INPUT_CLS} pr-10`}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => togglePwd('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Nova Senha <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type={showPwd.new ? 'text' : 'password'}
                className={`${INPUT_CLS} pr-10`}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => togglePwd('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPwd && (
              <div className="mt-1.5">
                <div className="h-1 bg-dark-600 rounded-full overflow-hidden">
                  <div className={`h-full ${pwdInfo.cls} transition-all`} style={{ width: `${pwdInfo.pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-600 mt-0.5">Força: <span className="text-slate-400 font-semibold">{pwdInfo.label}</span></p>
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLS}>Confirmar Nova Senha <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type={showPwd.confirm ? 'text' : 'password'}
                className={`${INPUT_CLS} pr-10 ${confirmPwd && confirmPwd !== newPwd ? 'border-red-500/60' : ''}`}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => togglePwd('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                {showPwd.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {pwdError && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5" /> {pwdError}
          </p>
        )}

        <button
          onClick={() => void handlePasswordChange()}
          disabled={pwdSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-dark-700 border border-white/[0.08] hover:bg-white/[0.06] disabled:opacity-60 text-slate-200 transition-all"
        >
          {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {pwdSaving ? 'Alterando...' : 'Alterar senha'}
        </button>
      </div>

      {/* ── Email Modal ── */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-2xl p-6 max-w-sm w-full border border-white/[0.08] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-white">Alterar E-mail</h4>
                <p className="text-xs text-slate-500 mt-0.5">Um link de confirmação será enviado para o novo e-mail.</p>
              </div>
              <button onClick={() => setEmailModal(false)} className="text-slate-600 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className={LABEL_CLS}>Novo E-mail</label>
              <input type="email" className={INPUT_CLS} value={newEmail}
                onChange={e => setNewEmail(e.target.value)} placeholder="novo@email.com" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => void handleEmailChange()} disabled={emailSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white transition-all">
                {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {emailSaving ? 'Enviando...' : 'Confirmar'}
              </button>
              <button onClick={() => setEmailModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
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
