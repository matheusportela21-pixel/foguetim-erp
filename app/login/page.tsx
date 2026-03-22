'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Rocket, Eye, EyeOff, AlertCircle, AlertTriangle, CheckCircle2, Loader2, Shield, Zap } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { logActivity } from '@/lib/activity-log'

function LoginForm() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  const { signIn } = useAuth()
  const searchParams = useSearchParams()

  // Mensagem de sucesso após cadastro
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setSuccess('Conta criada com sucesso! Faça login para continuar.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Timeout de 10 segundos
    const timeoutId = setTimeout(() => {
      setError('Tempo esgotado. Verifique sua conexão e tente novamente.')
      setLoading(false)
    }, 10000)

    try {
      const { error } = await signIn(email, password)
      clearTimeout(timeoutId)

      if (error) {
        setError('Email ou senha inválidos. Verifique os dados e tente novamente.')
        setLoading(false)
      } else {
        void fetch('/api/auth/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', category: 'auth', description: 'Login realizado com sucesso' }),
        })
        // Hard redirect — garante que a cookie de sessão está presente no próximo request
        const redirect = searchParams.get('redirect') ?? '/dashboard'
        window.location.href = redirect
      }
    } catch {
      clearTimeout(timeoutId)
      setError('Erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (brand) ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-[#080b1a] via-[#141b40] to-[#3b1f6a] p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 25 }, (_, i) => {
            const phi = 0.618033988749895
            return (
              <div key={i} className="absolute rounded-full bg-white animate-twinkle"
                style={{
                  left: `${((i * phi * 100) % 100).toFixed(1)}%`,
                  top:  `${((i * phi * phi * 100 + i * 2) % 100).toFixed(1)}%`,
                  width: 1 + (i % 2), height: 1 + (i % 2),
                  animationDelay: `${((i * phi * 6) % 5).toFixed(1)}s`,
                  opacity: 0.5,
                }}
              />
            )
          })}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-purple-500/10" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-blue-500/10" />
        </div>

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Rocket className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <Rocket className="w-8 h-8 text-white" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Seu e-commerce<br />em órbita
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Gerencie produtos, precificação, listagens e financeiro em um só lugar.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: Shield, text: 'Dados protegidos com SSL e criptografia' },
              { icon: Zap,    text: 'Acesso a todos os módulos no plano gratuito' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white/70" />
                </div>
                <p className="text-sm text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">© 2026 Foguetim ERP</p>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#03050f]">
        <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1040] to-purple-700 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-slate-500">Entre com sua conta para continuar</p>
          </div>

          {success && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs mb-4">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          <div className="bg-[#0d0f1a]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  name="email-login"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                  <Link href="/recuperar-senha" className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    name="password-login"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</>
                  : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-600 mt-5">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
