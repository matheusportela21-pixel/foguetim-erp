'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Rocket, Mail, Lock, ArrowRight, Eye, EyeOff, Shield, Zap } from 'lucide-react'

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel (brand) ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-navy-900 via-[#1e2460] to-purple-700 p-12 relative overflow-hidden">
        {/* Background detail */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 25 }, (_, i) => {
            const phi = 0.618033988749895
            return (
              <div
                key={i}
                className="absolute rounded-full bg-white animate-twinkle"
                style={{
                  left: `${((i * phi * 100) % 100).toFixed(1)}%`,
                  top:  `${((i * phi * phi * 100 + i * 2) % 100).toFixed(1)}%`,
                  width: 1 + (i % 2), height: 1 + (i % 2),
                  animationDelay: `${((i * phi * 6) % 5).toFixed(1)}s`,
                  opacity: 0.4,
                }}
              />
            )
          })}
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <Rocket className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </Link>

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8 animate-float">
            <Rocket className="w-8 h-8 text-white" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Seu e-commerce<br />em órbita
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Gerencie produtos, precificação, listagens e financeiro em um só lugar. Para sellers de ML, Shopee e Amazon.
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Bem-vindo de volta
            </h1>
            <p className="text-sm text-slate-500">Entre com sua conta para continuar</p>
          </div>

          <form className="space-y-5" onSubmit={e => { e.preventDefault(); window.location.href = '/dashboard' }}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  defaultValue="matheus.portela21@gmail.com"
                  className="dash-input w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Senha</label>
                <a href="#" className="text-xs text-purple-600 hover:underline font-medium">Esqueci a senha</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  defaultValue="123456"
                  className="dash-input w-full pl-10 pr-10 py-3 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn-primary py-3.5 rounded-xl text-sm font-bold"
            >
              Entrar <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">ou entre com</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['Google', 'GitHub'].map(p => (
              <button key={p} className="py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                {p}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            Não tem uma conta?{' '}
            <Link href="/registro" className="text-purple-600 font-semibold hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
