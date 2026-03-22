'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Rocket, Eye, EyeOff, AlertCircle, Loader2, Check,
  Package, BarChart2, Zap, Shield, TrendingUp,
} from 'lucide-react'
import { supabase, isConfigured } from '@/lib/supabase'

// ── Password strength ──────────────────────────────────────────────────────────

interface StrengthResult { score: number; label: string; barColor: string; textColor: string }

function getPasswordStrength(pwd: string): StrengthResult {
  if (!pwd) return { score: 0, label: '', barColor: '', textColor: '' }
  let score = 0
  if (pwd.length >= 8)         score++
  if (pwd.length >= 12)        score++
  if (/[A-Z]/.test(pwd))       score++
  if (/[0-9]/.test(pwd))       score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score: 1, label: 'Fraca', barColor: 'bg-red-500',   textColor: 'text-red-400'   }
  if (score <= 3) return { score: 2, label: 'Média', barColor: 'bg-amber-500', textColor: 'text-amber-400' }
  return                { score: 3, label: 'Forte', barColor: 'bg-green-500', textColor: 'text-green-400' }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all'

const BENEFITS = [
  { icon: Rocket,     text: 'Conecte seu Mercado Livre em minutos' },
  { icon: Package,    text: 'Gerencie produtos, pedidos e estoque' },
  { icon: BarChart2,  text: 'Métricas e relatórios em tempo real' },
  { icon: Zap,        text: 'Listagens com inteligência artificial' },
  { icon: TrendingUp, text: 'Precificação inteligente por plataforma' },
  { icon: Shield,     text: 'Sem cartão de crédito para começar' },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 text-[11px] text-red-400 mt-1.5">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CadastroPage() {
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const startedRef = useRef(false)

  const configured = isConfigured()

  const setErr   = (k: string, v: string) => setErrors(p => ({ ...p, [k]: v }))
  const clearErr = (k: string) =>
    setErrors(p => { const n = { ...p }; delete n[k]; return n })

  // Log signup_started once on first interaction
  const trackStart = () => {
    if (startedRef.current) return
    startedRef.current = true
    void fetch('/api/auth/log', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'signup_started', category: 'auth', description: 'Usuário iniciou cadastro' }),
    })
  }

  const handleGoogleAuth = async () => {
    setGoogleLoading(true)
    void fetch('/api/auth/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'google_auth_started', category: 'auth', description: 'Iniciou cadastro via Google' }),
    })
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) {
        void fetch('/api/auth/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'google_auth_error', category: 'auth', description: error.message }),
        })
        setErr('form', 'Erro ao conectar com Google: ' + error.message)
        setGoogleLoading(false)
      }
    } catch {
      setErr('form', 'Erro inesperado ao conectar com Google.')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const ve: Record<string, string> = {}
    if (!name.trim())                                            ve.name       = 'Informe seu nome'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))   ve.email      = 'E-mail inválido'
    if (password.length < 8)                                     ve.password   = 'Mínimo 8 caracteres'
    if (password !== confirmPwd)                                 ve.confirmPwd = 'As senhas não coincidem'

    const allErrors = { ...errors, ...ve }
    setErrors(allErrors)
    if (Object.keys(allErrors).length > 0) return

    setLoading(true)

    // Mock mode — Supabase not configured
    if (!configured) {
      await new Promise(r => setTimeout(r, 800))
      window.location.href = '/dashboard'
      return
    }

    try {
      // 1. Create user via server (admin, auto-confirmed)
      const res  = await fetch('/api/auth/cadastro', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), email, password }),
      })
      const data = await res.json() as { success?: boolean; error?: string }

      if (!res.ok || data.error) {
        void fetch('/api/auth/log', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'signup_error', category: 'auth', description: data.error ?? 'Erro ao criar conta' }),
        })
        setErr('form', data.error ?? 'Erro ao criar conta. Tente novamente.')
        setLoading(false)
        return
      }

      // 2. Sign in to get session
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) {
        // Account created but session failed — go to login
        window.location.href = '/login?success=1'
        return
      }

      // 3. Log + redirect
      void fetch('/api/auth/log', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'signup_completed', category: 'auth', description: 'Conta criada com sucesso' }),
      })
      window.location.href = '/dashboard'

    } catch {
      setErr('form', 'Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  const strength = getPasswordStrength(password)

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand + benefits ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-[#080b1a] via-[#141b40] to-[#3b1f6a] p-12 relative overflow-hidden">
        {/* Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 22 }, (_, i) => {
            const phi = 0.618033988749895
            return (
              <div
                key={i}
                className="absolute rounded-full bg-white animate-twinkle"
                style={{
                  left:           `${((i * phi * 100) % 100).toFixed(1)}%`,
                  top:            `${((i * phi * phi * 100 + i * 2) % 100).toFixed(1)}%`,
                  width:          1 + (i % 2),
                  height:         1 + (i % 2),
                  animationDelay: `${((i * phi * 6) % 5).toFixed(1)}s`,
                  opacity:        0.5,
                }}
              />
            )
          })}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-purple-500/10" />
          <div className="absolute bottom-0 -left-10 w-80 h-80 rounded-full bg-blue-500/[0.08]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Rocket className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Foguetim ERP
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-7 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <Rocket className="w-7 h-7 text-white" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Decole seu<br />e-commerce
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-xs">
            Crie sua conta grátis e comece a gerenciar seus marketplaces hoje.
          </p>
          <div className="space-y-3.5">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white/70" />
                </div>
                <p className="text-sm text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">© 2026 Foguetim ERP</p>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#03050f]">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1040] to-purple-700 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
          </Link>

          <div className="w-full max-w-md">

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                Criar sua conta
              </h1>
              <p className="text-sm text-slate-500">Comece grátis, sem cartão de crédito</p>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-200 text-sm font-medium hover:bg-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuar com Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[11px] text-slate-600 uppercase tracking-wider">ou com e-mail</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4" onChange={trackStart}>

              {/* Nome */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome completo
                </label>
                <input
                  type="text"
                  name="name-cadastro"
                  autoComplete="off"
                  value={name}
                  onChange={e => { setName(e.target.value); clearErr('name') }}
                  placeholder="Seu nome"
                  className={INPUT_CLS}
                />
                {errors.name && <FieldError msg={errors.name} />}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email-cadastro"
                  autoComplete="off"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearErr('email') }}
                  placeholder="seu@email.com"
                  className={INPUT_CLS}
                />
                {errors.email && <FieldError msg={errors.email} />}
              </div>

              {/* Senha */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Senha <span className="normal-case font-normal text-slate-600">(mínimo 8 caracteres)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    name="password-cadastro"
                    autoComplete="new-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearErr('password') }}
                    placeholder="Mínimo 8 caracteres"
                    className={INPUT_CLS}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map(s => (
                        <div
                          key={s}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            s <= strength.score ? strength.barColor : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-[10px] font-semibold ${strength.textColor}`}>Senha {strength.label}</p>
                  </div>
                )}
                {errors.password && <FieldError msg={errors.password} />}
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirm-password-cadastro"
                    autoComplete="new-password"
                    value={confirmPwd}
                    onChange={e => { setConfirmPwd(e.target.value); clearErr('confirmPwd') }}
                    placeholder="Repita sua senha"
                    className={INPUT_CLS}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPwd && confirmPwd !== password && !errors.confirmPwd && (
                  <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    As senhas não coincidem
                  </p>
                )}
                {confirmPwd && confirmPwd === password && confirmPwd.length > 0 && (
                  <p className="text-[11px] text-green-400 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3 shrink-0" />
                    Senhas coincidem
                  </p>
                )}
                {errors.confirmPwd && <FieldError msg={errors.confirmPwd} />}
              </div>

              {/* Form error */}
              {errors.form && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {errors.form}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700 transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</>
                  : 'Criar conta grátis →'
                }
              </button>

            </form>

            <p className="text-center text-xs text-slate-600 mt-5 leading-relaxed">
              Ao criar sua conta, você concorda com os{' '}
              <Link href="/termos" target="_blank" className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2">
                Termos de Uso
              </Link>
              {' '}e a{' '}
              <Link href="/privacidade" target="_blank" className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2">
                Política de Privacidade
              </Link>
            </p>

            <p className="text-center text-sm text-slate-600 mt-4">
              Já tem conta?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">
                Entrar
              </Link>
            </p>

          </div>
        </div>
      </div>

    </div>
  )
}
