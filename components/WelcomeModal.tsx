'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Rocket, Sparkles, ArrowRight,
  Warehouse, ShoppingBag, Package, TrendingUp,
} from 'lucide-react'

const WELCOME_KEY = 'foguetim_welcome_v1'

const FEATURES = [
  {
    icon:   Warehouse,
    color:  'text-violet-400',
    bg:     'bg-violet-500/[0.10]',
    border: 'border-violet-500/20',
    glow:   '#7c3aed',
    title:  'Armazém',
    desc:   'Estoque multi-armazém, entradas, movimentações e rastreio.',
  },
  {
    icon:   ShoppingBag,
    color:  'text-blue-400',
    bg:     'bg-blue-500/[0.10]',
    border: 'border-blue-500/20',
    glow:   '#3b82f6',
    title:  'Mercado Livre',
    desc:   'Pedidos, perguntas, reclamações e anúncios em um painel.',
  },
  {
    icon:   Package,
    color:  'text-emerald-400',
    bg:     'bg-emerald-500/[0.10]',
    border: 'border-emerald-500/20',
    glow:   '#10b981',
    title:  'Produtos',
    desc:   'Catálogo completo com precificação e margem real.',
  },
  {
    icon:   TrendingUp,
    color:  'text-amber-400',
    bg:     'bg-amber-500/[0.10]',
    border: 'border-amber-500/20',
    glow:   '#f59e0b',
    title:  'Financeiro',
    desc:   'Receita, custos e fluxo de caixa sempre em tempo real.',
  },
] as const

export function WelcomeModal() {
  const { user, profile } = useAuth()
  const [visible, setVisible]   = useState(false)
  const [animate, setAnimate]   = useState(false)

  const firstName = (
    user?.user_metadata?.name?.split(' ')[0] ||
    profile?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    ''
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(WELCOME_KEY)) {
      const t = setTimeout(() => {
        setVisible(true)
        // Micro-delay so the DOM paints first, then trigger CSS transition
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)))
      }, 650)
      return () => clearTimeout(t)
    }
  }, [])

  function close() {
    setAnimate(false)
    setTimeout(() => {
      localStorage.setItem(WELCOME_KEY, '1')
      setVisible(false)
    }, 300)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{
        background:       animate ? 'rgba(0,0,0,0.72)' : 'transparent',
        backdropFilter:   animate ? 'blur(6px)'         : 'none',
        transition:       'background 0.3s, backdrop-filter 0.3s',
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background:  '#0a0d14',
          border:      '1px solid rgba(255,255,255,0.07)',
          opacity:     animate ? 1 : 0,
          transform:   animate ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
          transition:  'opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="relative px-8 pt-10 pb-7 text-center overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(124,58,237,0.22), transparent)',
            }}
          />
          {/* Stars / particles — purely decorative */}
          <div className="absolute top-4 left-8 w-1 h-1 rounded-full bg-violet-400/40" />
          <div className="absolute top-7 left-16 w-0.5 h-0.5 rounded-full bg-blue-300/30" />
          <div className="absolute top-5 right-12 w-1 h-1 rounded-full bg-amber-400/30" />
          <div className="absolute top-9 right-20 w-0.5 h-0.5 rounded-full bg-emerald-300/30" />

          {/* Icon */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div
              className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center"
              style={{
                background:   'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.15))',
                border:       '1px solid rgba(124,58,237,0.35)',
                boxShadow:    '0 0 40px rgba(124,58,237,0.20), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <Rocket className="w-8 h-8 text-violet-400" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.5))' }} />
            </div>
            {/* Sparkle badge */}
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#0a0d14] border border-white/[0.08] flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            </span>
          </div>

          {/* Greeting */}
          <h2
            className="text-[22px] font-bold text-white mb-2 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '-0.01em' }}
          >
            {firstName
              ? <>Bem-vindo ao Foguetim, <span className="text-violet-400">{firstName}</span>!</>
              : 'Bem-vindo ao Foguetim!'}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            Seu ERP para e-commerce está pronto. Conheça tudo que o Foguetim tem para você:
          </p>
        </div>

        {/* ── Features grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5 px-6 pb-5">
          {FEATURES.map(({ icon: Icon, color, bg, border, glow, title, desc }, i) => (
            <div
              key={i}
              className={`relative flex gap-3 p-3.5 rounded-xl border ${bg} ${border} overflow-hidden`}
            >
              {/* Subtle corner glow */}
              <div
                className="absolute top-0 left-0 w-16 h-16 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${glow}18, transparent)`, filter: 'blur(12px)', transform: 'translate(-30%, -30%)' }}
              />
              <div className={`relative w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="relative min-w-0">
                <p className={`text-xs font-bold mb-0.5 ${color}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                  {title}
                </p>
                <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <div className="px-6 pb-7">
          <button
            onClick={close}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              background:  'linear-gradient(135deg, #7c3aed, #6d28d9)',
              boxShadow:   '0 4px 20px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.10)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          >
            Começar a usar o Foguetim
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-[10px] text-slate-700 mt-3">
            Esta mensagem não será exibida novamente
          </p>
        </div>
      </div>
    </div>
  )
}
