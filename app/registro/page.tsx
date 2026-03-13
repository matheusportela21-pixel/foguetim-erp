'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Rocket, Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff, Check, ChevronLeft } from 'lucide-react'

const PLANS = [
  { id: 'explorador', name: 'Explorador', price: 'Grátis',       desc: 'Até 50 produtos, 1 marketplace' },
  { id: 'comandante', name: 'Comandante', price: 'R$49,90/mês',  desc: 'Até 500 produtos, 3 marketplaces', popular: true },
  { id: 'almirante',  name: 'Almirante',  price: 'R$99,90/mês',  desc: 'Ilimitado + NF-e + API' },
]

const MARKETPLACES = ['Mercado Livre', 'Shopee', 'Amazon', 'Todos', 'Outros']

export default function RegistroPage() {
  const [showPass, setShowPass]   = useState(false)
  const [plan, setPlan]           = useState('explorador')
  const [marketplace, setMkt]     = useState('Mercado Livre')
  const [step, setStep]           = useState<1 | 2>(1)
  const [terms, setTerms]         = useState(false)

  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br from-navy-900 via-[#1e2460] to-purple-700 p-12 relative overflow-hidden">
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
                  opacity: 0.4,
                }}
              />
            )
          })}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/5" />
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Rocket className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </Link>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Comece grátis,<br />cresça sem limites
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-xs">
            Crie sua conta em minutos e tenha acesso ao ERP mais completo para sellers de marketplace.
          </p>

          <div className="space-y-3">
            {[
              'Sem cartão de crédito necessário',
              'Cancele a qualquer momento',
              'Suporte via chat para novos usuários',
              'Dados seguros com criptografia SSL',
            ].map(t => (
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </Link>

        <div className="w-full max-w-sm">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s ? 'bg-green-500 text-white' :
                  step === s ? 'bg-navy-900 text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-navy-900' : 'text-slate-400'}`}>
                  {s === 1 ? 'Dados da conta' : 'Escolher plano'}
                </span>
                {s < 2 && <div className={`w-8 h-px mx-1 ${step > s ? 'bg-green-400' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-navy-900 mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Criar sua conta
                </h1>
                <p className="text-sm text-slate-500">Comece grátis, sem cartão de crédito</p>
              </div>

              <form className="space-y-4" onSubmit={e => { e.preventDefault(); setStep(2) }}>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required placeholder="Seu nome completo"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" required placeholder="seu@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">CNPJ <span className="font-normal text-slate-400">(opcional)</span></label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="00.000.000/0000-00"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPass ? 'text' : 'password'} required placeholder="Mínimo 8 caracteres"
                      className="w-full pl-10 pr-10 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all" />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Marketplace principal</label>
                  <div className="flex flex-wrap gap-2">
                    {MARKETPLACES.map(m => (
                      <button key={m} type="button" onClick={() => setMkt(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          marketplace === m
                            ? 'bg-navy-50 border-navy-300 text-navy-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full btn-primary py-3.5 rounded-xl text-sm font-bold mt-2">
                  Próximo <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-7">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-navy-900 transition-colors mb-4">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
                <h1 className="text-2xl font-bold text-navy-900 mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Escolha seu plano
                </h1>
                <p className="text-sm text-slate-500">Você pode mudar de plano a qualquer momento</p>
              </div>

              <div className="space-y-3 mb-6">
                {PLANS.map(p => (
                  <button key={p.id} onClick={() => setPlan(p.id)} type="button"
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                      plan === p.id ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        plan === p.id ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                      }`}>
                        {plan === p.id && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${plan === p.id ? 'text-navy-900' : 'text-slate-600'}`}>{p.name}</span>
                          {p.popular && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">Popular</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${plan === p.id ? 'text-purple-600' : 'text-slate-600'}`}>{p.price}</span>
                  </button>
                ))}
              </div>

              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    terms ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                  }`}
                  onClick={() => setTerms(v => !v)}
                >
                  {terms && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs text-slate-500 leading-relaxed">
                  Ao criar minha conta concordo com os{' '}
                  <a href="#" className="text-purple-600 hover:underline">Termos de Uso</a> e{' '}
                  <a href="#" className="text-purple-600 hover:underline">Política de Privacidade</a> do Foguetim ERP.
                </span>
              </label>

              <Link href="/dashboard"
                className={`block text-center btn-primary py-3.5 rounded-xl text-sm font-bold w-full ${!terms ? 'opacity-50 pointer-events-none' : ''}`}>
                Criar Minha Conta <Rocket className="w-4 h-4" />
              </Link>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-purple-600 font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
