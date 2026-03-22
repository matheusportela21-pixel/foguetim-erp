'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import {
  Rocket, Eye, EyeOff, AlertCircle, CheckCircle2,
  Loader2, AlertTriangle, ArrowLeft,
} from 'lucide-react'
import { supabase, isConfigured } from '@/lib/supabase'

const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all'

// ── Password strength ──────────────────────────────────────────────────────────

interface StrengthResult { score: number; label: string; barColor: string; textColor: string }

function getPasswordStrength(pwd: string): StrengthResult {
  if (!pwd) return { score: 0, label: '', barColor: '', textColor: '' }
  let score = 0
  if (pwd.length >= 8)          score++
  if (pwd.length >= 12)         score++
  if (/[A-Z]/.test(pwd))        score++
  if (/[0-9]/.test(pwd))        score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score: 1, label: 'Fraca', barColor: 'bg-red-500',   textColor: 'text-red-400'   }
  if (score <= 3) return { score: 2, label: 'Média', barColor: 'bg-amber-500', textColor: 'text-amber-400' }
  return                { score: 3, label: 'Forte', barColor: 'bg-green-500', textColor: 'text-green-400' }
}

// ── Form component ─────────────────────────────────────────────────────────────

function RedefinirForm() {
  const [password,    setPassword]    = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')
  const [tokenReady,  setTokenReady]  = useState(false)
  const [tokenError,  setTokenError]  = useState(false)

  const configured = isConfigured()

  useEffect(() => {
    if (!configured) {
      setTokenReady(true)
      return
    }

    // Check for existing session (Supabase may have set it from the recovery link hash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTokenReady(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        setTokenReady(true)
        setTokenError(false)
      }
      if (event === 'SIGNED_OUT') {
        setTokenError(true)
      }
    })

    // If no token found after 3s, show error
    const timer = setTimeout(() => {
      if (!tokenReady) setTokenError(true)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Mínimo 8 caracteres.'); return }
    if (password !== confirmPwd) { setError('As senhas não coincidem.'); return }

    setLoading(true)

    if (!configured) {
      await new Promise(r => setTimeout(r, 800))
      setDone(true)
      setLoading(false)
      return
    }

    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError(err.message)
        setLoading(false)
      } else {
        setDone(true)
        setLoading(false)
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  const strength = getPasswordStrength(password)

  // ── Token error state ───────────────────────────────────────────────────────
  if (tokenError && !tokenReady) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
          Link inválido ou expirado
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Este link de redefinição expirou ou já foi utilizado.
        </p>
        <Link
          href="/recuperar-senha"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-all"
        >
          Solicitar novo link
        </Link>
      </div>
    )
  }

  // ── Done state ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
          Senha redefinida!
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Sua senha foi atualizada com sucesso.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-all"
        >
          Entrar agora
        </Link>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Redefinir senha
        </h1>
        <p className="text-sm text-slate-500">Crie uma nova senha para sua conta.</p>
      </div>

      <div className="bg-[#0d0f1a]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nova senha */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nova senha <span className="normal-case font-normal">(mínimo 8 caracteres)</span>
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Mínimo 8 caracteres"
                autoFocus
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
          </div>

          {/* Confirmar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Confirmar nova senha
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setError('') }}
                placeholder="Repita a senha"
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
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!tokenReady && configured)}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
              : 'Salvar nova senha'
            }
          </button>

        </form>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <div className="min-h-screen bg-[#03050f] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1040] to-purple-700 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
          </Link>

          <RedefinirForm />

          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-slate-600 hover:text-slate-400 transition-colors mt-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o login
          </Link>

        </div>
      </div>
    </Suspense>
  )
}
