'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Rocket, Eye, EyeOff, AlertCircle, Loader2, Check, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const PLANS = [
  { id: 'explorador', name: 'Explorador', price: 'Grátis',       desc: 'Até 50 produtos, 1 marketplace' },
  { id: 'crescimento',name: 'Crescimento',price: 'R$49,90/mês',  desc: 'Até 500 produtos, 5 marketplaces', popular: true },
  { id: 'comandante', name: 'Comandante', price: 'R$99,90/mês',  desc: 'Ilimitado + NF-e + API' },
]

export default function RegistroPage() {
  const [step,     setStep]     = useState<1 | 2>(1)
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [company,  setCompany]  = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [plan,     setPlan]     = useState('explorador')
  const [terms,    setTerms]    = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const { signUp } = useAuth()

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!terms) return
    setLoading(true)
    setError('')

    const timeoutId = setTimeout(() => {
      setError('Tempo esgotado. Verifique sua conexão e tente novamente.')
      setLoading(false)
    }, 10000)

    try {
      const { error } = await signUp(email, password, name, company)
      clearTimeout(timeoutId)
      if (error) {
        setError(error)
        setLoading(false)
      } else {
        // Redireciona para login com mensagem de sucesso
        window.location.href = '/login?success=1'
      }
    } catch {
      clearTimeout(timeoutId)
      setError('Erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br from-[#080b1a] via-[#141b40] to-[#3b1f6a] p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => {
            const phi = 0.618033988749895
            return (
              <div key={i} className="absolute rounded-full bg-white animate-twinkle"
                style={{
                  left: `${((i * phi * 100) % 100).toFixed(1)}%`,
                  top:  `${((i * phi * phi * 100 + i * 2.5) % 100).toFixed(1)}%`,
                  width: 1 + (i % 2), height: 1 + (i % 2),
                  animationDelay: `${((i * phi * 5) % 4).toFixed(1)}s`,
                  opacity: 0.5,
                }}
              />
            )
          })}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-purple-500/10" />
        </div>
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Rocket className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Comece grátis,<br />cresça sem limites
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-xs">
            Crie sua conta em minutos e tenha acesso ao ERP mais completo para sellers de marketplace.
          </p>
          <div className="space-y-3">
            {['Sem cartão de crédito necessário','Cancele a qualquer momento','Suporte via chat','Dados seguros com SSL'].map(t => (
              <div key={t} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white/70" />
                </div>
                <p className="text-sm text-white/60">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/30">© 2026 Foguetim ERP</p>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#03050f] overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {([1, 2] as const).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s ? 'bg-green-500 text-white' : step === s ? 'bg-purple-600 text-white' : 'bg-white/10 text-slate-500'
                }`}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-white' : 'text-slate-600'}`}>
                  {s === 1 ? 'Dados da conta' : 'Escolher plano'}
                </span>
                {s < 2 && <div className={`w-8 h-px mx-1 ${step > s ? 'bg-green-400' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>Criar sua conta</h1>
                <p className="text-sm text-slate-500">Comece grátis, sem cartão de crédito</p>
              </div>
              <div className="bg-[#0d0f1a]/90 border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
                <form onSubmit={handleStep1} className="space-y-4">
                  {[
                    { label: 'Nome completo',  value: name,    set: setName,    type: 'text',  placeholder: 'Seu nome completo'  },
                    { label: 'Email',          value: email,   set: setEmail,   type: 'email', placeholder: 'seu@email.com'       },
                    { label: 'Empresa / Loja', value: company, set: setCompany, type: 'text',  placeholder: 'Nome da sua empresa' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} required
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres" required
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition-all" />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
                    </div>
                  )}
                  <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30 mt-1">
                    Próximo →
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="mb-7">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-white transition-colors mb-4">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
                <h1 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>Escolha seu plano</h1>
                <p className="text-sm text-slate-500">Você pode mudar a qualquer momento</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="space-y-3 mb-5">
                  {PLANS.map(p => (
                    <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                        plan === p.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/[0.07] bg-[#0d0f1a] hover:border-white/20'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${plan === p.id ? 'border-purple-500 bg-purple-500' : 'border-slate-600'}`}>
                          {plan === p.id && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{p.name}</span>
                            {p.popular && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Popular</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${plan === p.id ? 'text-purple-400' : 'text-slate-400'}`}>{p.price}</span>
                    </button>
                  ))}
                </div>
                <label className="flex items-start gap-3 mb-5 cursor-pointer">
                  <div onClick={() => setTerms(v => !v)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${terms ? 'border-purple-500 bg-purple-500' : 'border-slate-600'}`}>
                    {terms && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs text-slate-500 leading-relaxed">
                    Concordo com os{' '}<a href="#" className="text-purple-400 hover:underline">Termos de Uso</a> e{' '}
                    <a href="#" className="text-purple-400 hover:underline">Política de Privacidade</a>.
                  </span>
                </label>
                {error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
                  </div>
                )}
                <button type="submit" disabled={!terms || loading}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</> : 'Criar Minha Conta'}
                </button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-slate-600 mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
