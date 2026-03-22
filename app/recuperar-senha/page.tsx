'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Rocket, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import { supabase, isConfigured } from '@/lib/supabase'

const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all'

export default function RecuperarSenhaPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const configured = isConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um e-mail válido.')
      return
    }

    setLoading(true)

    if (!configured) {
      await new Promise(r => setTimeout(r, 800))
      setSent(true)
      setLoading(false)
      return
    }

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (err) {
        setError('Erro ao enviar e-mail. Tente novamente.')
      } else {
        void fetch('/api/auth/log', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'password_reset_requested', category: 'auth', description: 'Solicitação de redefinição de senha' }),
        })
        setSent(true)
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#03050f] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1040] to-purple-700 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </Link>

        {!sent ? (
          <>
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                Recuperar senha
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <div className="bg-[#0d0f1a]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="seu@email.com"
                    autoFocus
                    className={INPUT_CLS}
                  />
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
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                    : 'Enviar link de redefinição'
                  }
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              E-mail enviado!
            </h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Enviamos um link de redefinição para{' '}
              <span className="text-slate-300">{email}</span>.
              <br />Verifique sua caixa de entrada (e o spam).
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              Tentar outro e-mail
            </button>
          </div>
        )}

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-slate-600 hover:text-slate-400 transition-colors mt-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para o login
        </Link>

      </div>
    </div>
  )
}
