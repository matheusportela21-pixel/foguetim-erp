'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Rocket, Loader2, AlertCircle, Check, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/team/permissions'

interface InviteInfo {
  email: string
  name: string | null
  role: string
  ownerName: string
  companyName: string
  expiresAt: string
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router     = useRouter()

  const [invite, setInvite]     = useState<InviteInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [tab, setTab]           = useState<'login' | 'signup'>('signup')
  const [showPwd, setShowPwd]   = useState(false)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPwd, setFormPwd]   = useState('')
  const [accepting, setAccepting] = useState(false)
  const [success, setSuccess]   = useState(false)

  useEffect(() => {
    fetch(`/api/team/invite/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) {
          setInvite(d.invite)
          setFormEmail(d.invite.email)
          setFormName(d.invite.name ?? '')
        } else {
          setError(d.error ?? 'Convite inválido')
        }
      })
      .catch(() => setError('Erro ao verificar convite'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    setError('')
    try {
      const res = await fetch(`/api/team/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, password: formPwd, name: formName }),
      })
      const d = await res.json()
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push(d.redirect ?? '/dashboard'), 2000)
      } else {
        setError(d.error ?? 'Erro ao aceitar convite')
      }
    } catch {
      setError('Erro de conexão')
    }
    setAccepting(false)
  }

  function daysLeft() {
    if (!invite) return 0
    return Math.max(0, Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 86400000))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03050f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-[#03050f] flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-white mb-2">Convite inválido</h1>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link href="/login" className="text-sm text-purple-400 hover:underline">Ir para login</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#03050f] flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <Check className="w-10 h-10 text-green-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-white mb-2">Convite aceito!</h1>
          <p className="text-sm text-slate-500">Redirecionando para o dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#03050f] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1040] to-purple-700 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </div>

        {/* Invite info */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-white mb-2">Você foi convidado!</h1>
          <p className="text-sm text-slate-500">
            <span className="text-slate-300 font-semibold">{invite?.ownerName}</span> convidou você para a equipe da{' '}
            <span className="text-slate-300 font-semibold">{invite?.companyName}</span>
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-full">
            <span className="text-xs text-purple-400 font-medium">Cargo: {ROLE_LABELS[invite?.role ?? ''] ?? invite?.role}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white/[0.04] rounded-lg p-1">
          <button onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'signup' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
            Criar conta
          </button>
          <button onClick={() => setTab('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'login' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
            Já tenho conta
          </button>
        </div>

        {/* Form */}
        <div className="bg-[#0d0f1a]/90 border border-white/[0.08] rounded-2xl p-6 space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome completo</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Seu nome"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50" />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
            <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email" placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
            <div className="relative">
              <input value={formPwd} onChange={e => setFormPwd(e.target.value)} type={showPwd ? 'text' : 'password'} placeholder="Sua senha"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          <button onClick={handleAccept} disabled={!formEmail || !formPwd || accepting}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {tab === 'signup' ? 'Criar conta e aceitar convite' : 'Entrar e aceitar convite'}
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-700 mt-4">
          Convite expira em {daysLeft()} dia{daysLeft() !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
