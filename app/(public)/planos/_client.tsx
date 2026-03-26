'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Fragment, useState } from 'react'
import { Check, X, ChevronDown, ChevronUp, ArrowRight, Zap, Menu, Bot } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────────────────── */
type BillingPeriod = 'monthly' | 'annual'

interface PlanCard {
  id:           string
  name:         string
  monthlyPrice: number
  annualPrice:  number
  desc:         string
  popular:      boolean
  cta:          string
  ctaHref:      string
  badge:        string | null
  features:     { label: string; included: boolean }[]
}

interface CompSection {
  section: string
  rows: { label: string; values: (string | boolean)[] }[]
}

interface FaqItem { q: string; a: string }

/* ── Plans data ─────────────────────────────────────────────────────────────── */
const PLANS: PlanCard[] = [
  {
    id: 'explorador', name: 'Explorador', monthlyPrice: 19.90, annualPrice: 15.92,
    desc: 'Para quem está começando a vender online', popular: false,
    cta: 'Testar 7 dias grátis', ctaHref: '/cadastro?plan=explorador', badge: null,
    features: [
      { label: '1 marketplace', included: true },
      { label: 'Até 100 produtos', included: true },
      { label: 'Dashboard básico', included: true },
      { label: 'Pedidos em tempo real', included: true },
      { label: 'Suporte por e-mail', included: true },
      { label: 'SAC e Reclamações', included: false },
      { label: 'Relatórios avançados', included: false },
    ],
  },
  {
    id: 'comandante', name: 'Comandante', monthlyPrice: 49.90, annualPrice: 39.92,
    desc: 'O mais completo para sellers sérios', popular: true,
    cta: 'Testar 7 dias grátis', ctaHref: '/cadastro?plan=comandante', badge: 'MAIS POPULAR',
    features: [
      { label: '2 marketplaces', included: true },
      { label: 'Até 500 produtos', included: true },
      { label: 'DRE + Financeiro', included: true },
      { label: 'SAC e Reclamações', included: true },
      { label: 'Precificação avançada', included: true },
      { label: 'Até 5 usuários', included: true },
      { label: '15 agentes IA', included: true },
    ],
  },
  {
    id: 'almirante', name: 'Almirante', monthlyPrice: 89.90, annualPrice: 71.92,
    desc: 'Para grandes operações de e-commerce', popular: false,
    cta: 'Testar 7 dias grátis', ctaHref: '/cadastro?plan=almirante', badge: null,
    features: [
      { label: '5 marketplaces', included: true },
      { label: 'Até 2.000 produtos', included: true },
      { label: 'Relatórios avançados', included: true },
      { label: 'Alertas inteligentes', included: true },
      { label: 'Até 10 usuários', included: true },
      { label: '30 agentes IA', included: true },
      { label: 'Suporte prioritário', included: true },
    ],
  },
  {
    id: 'missao', name: 'Missão Espacial', monthlyPrice: 119.90, annualPrice: 95.92,
    desc: 'Para empresas com operações avançadas', popular: false,
    cta: 'Testar 7 dias grátis', ctaHref: '/cadastro?plan=missao', badge: null,
    features: [
      { label: 'Tudo ilimitado', included: true },
      { label: '10+ marketplaces', included: true },
      { label: 'Suporte 24/7 dedicado', included: true },
      { label: 'Onboarding personalizado', included: true },
      { label: 'SLA premium', included: true },
      { label: '40 agentes IA', included: true },
      { label: 'Gerente de conta dedicado', included: true },
    ],
  },
]

/* ── Comparison table ────────────────────────────────────────────────────────── */
const COMPARISON: CompSection[] = [
  {
    section: 'MARKETPLACES',
    rows: [
      { label: 'Canais conectados', values: ['1', '2', '5', '10'] },
      { label: 'Mercado Livre', values: [true, true, true, true] },
      { label: 'Shopee', values: [false, true, true, true] },
      { label: 'Magalu', values: [false, true, true, true] },
    ],
  },
  {
    section: 'PRODUTOS',
    rows: [
      { label: 'Limite', values: ['100', '500', '2.000', '10.000'] },
      { label: 'Mapeamento', values: [true, true, true, true] },
      { label: 'Importacao CSV', values: [false, true, true, true] },
    ],
  },
  {
    section: 'PEDIDOS',
    rows: [
      { label: 'Limite/mes', values: ['200', '1.000', '5.000', '20.000'] },
      { label: 'Workflow', values: [true, true, true, true] },
      { label: 'Expedicao', values: [true, true, true, true] },
    ],
  },
  {
    section: 'FINANCEIRO',
    rows: [
      { label: 'Dashboard', values: ['Basico', 'Completo', 'Completo', 'Completo'] },
      { label: 'DRE', values: [false, true, true, true] },
      { label: 'Conciliacao', values: [false, true, true, true] },
      { label: 'Relatorios PDF', values: [false, true, true, true] },
    ],
  },
  {
    section: 'ESTOQUE',
    rows: [
      { label: 'Armazens', values: ['1', '2', '3', '5'] },
      { label: 'Sincronizacao', values: [false, true, true, true] },
      { label: 'Alertas estoque', values: ['Basico', true, true, true] },
    ],
  },
  {
    section: 'EQUIPE',
    rows: [
      { label: 'Membros', values: ['1', '3', '5', '10'] },
      { label: 'Permissoes', values: [false, true, true, true] },
    ],
  },
  {
    section: 'FERRAMENTAS',
    rows: [
      { label: 'Precificacao', values: ['Basica', 'Multi-canal', 'Multi-canal', 'Multi-canal'] },
      { label: 'Ranking', values: [false, true, true, true] },
      { label: 'Saude anuncios', values: [false, true, true, true] },
      { label: 'Concorrentes', values: [false, false, true, true] },
      { label: 'Historico precos', values: [false, false, true, true] },
    ],
  },
  {
    section: 'SUPORTE',
    rows: [
      { label: 'Email', values: [true, true, true, true] },
      { label: 'Prioritario', values: [false, true, true, true] },
      { label: 'WhatsApp VIP', values: [false, false, false, true] },
      { label: 'Gerente dedicado', values: [false, false, false, true] },
    ],
  },
  {
    section: 'IA (ADICIONAL)',
    rows: [
      { label: 'Timm AI (chat)', values: [true, true, true, true] },
      { label: 'Agentes IA', values: ['Pago*', 'Pago*', 'Pago*', 'Pago*'] },
    ],
  },
]

/* ── AI Plans ────────────────────────────────────────────────────────────────── */
const AI_PLANS_DATA = [
  { name: 'IA Starter', price: 29.90, agents: 5, executions: '100 exec/mes' },
  { name: 'IA Pro', price: 59.90, agents: 20, executions: '500 exec/mes' },
  { name: 'IA Enterprise', price: 99.90, agents: 50, executions: 'Ilimitado' },
]

const FAQS: FaqItem[] = [
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Cancele quando quiser nas configurações da conta. Sem multa ou burocracia.' },
  { q: 'O que acontece se ultrapassar o limite de produtos?', a: 'Você será notificado quando estiver próximo. Não bloqueamos sua conta — você pode fazer upgrade ou arquivar produtos.' },
  { q: 'Como funciona o desconto anual?', a: 'No plano anual você paga 20% menos por mês, cobrado de uma vez por ano.' },
  { q: 'Posso mudar de plano depois?', a: 'Sim. Upgrade é imediato; downgrade entra no próximo ciclo.' },
  { q: 'Como funciona o período de teste?', a: '7 dias grátis com acesso total. Sem cartão. Após o trial, escolha o plano.' },
]

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function PlanPrice({ plan, period }: { plan: PlanCard; period: BillingPeriod }) {
  const price = period === 'annual' ? plan.annualPrice : plan.monthlyPrice
  return (
    <div className="mb-1">
      {period === 'annual' && (
        <p className="text-sm text-slate-500 line-through mb-0.5">R${plan.monthlyPrice.toFixed(2).replace('.', ',')}/mês</p>
      )}
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
          R${price.toFixed(2).replace('.', ',')}
        </span>
        <span className="text-slate-500 text-sm mb-1">/mês</span>
      </div>
      {period === 'annual' && (
        <p className="text-xs text-green-400 font-semibold mt-0.5">Economize 20% no anual</p>
      )}
    </div>
  )
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-green-400 mx-auto" />
  if (value === false) return <X className="w-4 h-4 text-slate-700 mx-auto" />
  return <span className="text-xs text-white font-bold">{value}</span>
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function PlanosPage() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0A0718] text-slate-100 stars-bg">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0A0718]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="Foguetim" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim <span className="text-slate-500 font-medium text-sm">ERP</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <span className="text-white font-semibold">Planos</span>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white px-4 py-2 transition-colors">Entrar</Link>
            <Link href="/cadastro" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Começar grátis</Link>
          </div>
          <button className="md:hidden p-2 text-slate-400" onClick={() => setMobileMenu(v => !v)}>
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-white/5 bg-[#0A0718] px-6 py-4 space-y-1">
            <Link href="/" onClick={() => setMobileMenu(false)} className="block text-sm text-slate-400 py-2.5">Início</Link>
            <Link href="/blog" onClick={() => setMobileMenu(false)} className="block text-sm text-slate-400 py-2.5">Blog</Link>
            <Link href="/sobre" onClick={() => setMobileMenu(false)} className="block text-sm text-slate-400 py-2.5">Sobre</Link>
            <div className="flex gap-3 pt-3 border-t border-white/5">
              <Link href="/login" className="flex-1 border border-white/10 text-slate-300 text-sm font-semibold py-2.5 rounded-lg text-center">Entrar</Link>
              <Link href="/cadastro" className="flex-1 bg-violet-600 text-white text-sm font-semibold py-2.5 rounded-lg text-center">Cadastrar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-12 px-6 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-violet-300 text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" />
            Planos e Preços
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Planos simples,{' '}
            <span className="text-gradient-brand">sem surpresas</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed mb-8">
            Escolha o plano ideal para o tamanho da sua operação.
            7 dias grátis. Sem cartão de crédito.
          </p>

          <div className="inline-flex items-center gap-1 glass-card rounded-xl p-1">
            <button onClick={() => setPeriod('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${period === 'monthly' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Mensal
            </button>
            <button onClick={() => setPeriod('annual')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${period === 'annual' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Anual
              <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan Cards ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {PLANS.map(plan => (
              <div key={plan.id}
                className={`relative glass-card rounded-2xl p-6 flex flex-col ${plan.popular ? 'border-violet-500 ring-1 ring-violet-500/50 shadow-xl shadow-violet-500/10' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-gradient-to-r from-violet-600 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">{plan.badge}</span>
                  </div>
                )}
                <div className="mb-4">
                  <p className={`text-base font-bold mb-0.5 ${plan.popular ? 'text-violet-300' : 'text-white'}`}>{plan.name}</p>
                  <p className="text-xs text-slate-500 mb-3">{plan.desc}</p>
                  <PlanPrice plan={plan} period={period} />
                </div>
                <Link href={period === 'annual' ? plan.ctaHref + '&billing=annual' : plan.ctaHref}
                  className={`block text-center py-2.5 rounded-lg text-sm font-bold w-full mb-5 transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-lg shadow-violet-500/20'
                      : 'border border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      {f.included
                        ? <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${plan.popular ? 'text-violet-400' : 'text-green-400'}`} />
                        : <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-700" />
                      }
                      <span className={f.included ? 'text-slate-300' : 'text-slate-600'}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-8">
            Todos os planos incluem 7 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ── Comparison Table ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">Comparativo</p>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Compare todos os planos</h2>
            <p className="text-slate-500 text-sm mb-6">Veja em detalhe o que cada plano oferece</p>
            <div className="inline-flex items-center gap-1 glass-card rounded-xl p-1">
              <button onClick={() => setPeriod('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${period === 'monthly' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button onClick={() => setPeriod('annual')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${period === 'annual' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Anual
                <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10 glass-card">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-white/5 bg-[#1A1530]">
                  <th className="text-left p-4 pl-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-52 sticky left-0 bg-[#1A1530] z-30">
                    Funcionalidade
                  </th>
                  {PLANS.map(plan => (
                    <th key={plan.id} className={`p-4 text-center ${plan.popular ? 'bg-violet-500/10 border-t-2 border-violet-500' : ''}`}>
                      <span className={`text-sm font-bold block ${plan.popular ? 'text-violet-300' : 'text-white'}`}>
                        {plan.name}
                      </span>
                      {plan.popular && (
                        <span className="inline-block bg-gradient-to-r from-violet-600 to-violet-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-1">POPULAR</span>
                      )}
                      <span className="block text-xs text-slate-400 mt-1">
                        R${(period === 'annual' ? plan.annualPrice : plan.monthlyPrice).toFixed(2).replace('.', ',')}/mes
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((group) => (
                  <Fragment key={`section-${group.section}`}>
                    <tr className="bg-white/[0.02]">
                      <td colSpan={5} className="px-6 py-2.5 text-[10px] font-bold text-violet-400 uppercase tracking-widest border-t border-white/5">
                        {group.section}
                      </td>
                    </tr>
                    {group.rows.map((row, ri) => (
                      <tr key={`${group.section}-${ri}`} className={`border-b border-white/[0.03] ${ri % 2 !== 0 ? 'bg-white/[0.01]' : ''}`}>
                        <td className="p-4 pl-6 text-sm text-slate-300 font-medium sticky left-0 bg-[#1A1530]/90 backdrop-blur-sm z-10">
                          {row.label}
                        </td>
                        {row.values.map((val, vi) => (
                          <td key={vi} className={`p-4 text-center ${PLANS[vi]?.popular ? 'bg-violet-500/5' : ''}`}>
                            <CellValue value={val} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {/* Subscribe buttons row */}
                <tr className="border-t border-white/5">
                  <td className="p-4 sticky left-0 bg-[#1A1530]/90 backdrop-blur-sm z-10" />
                  {PLANS.map(plan => (
                    <td key={plan.id} className={`p-4 text-center ${plan.popular ? 'bg-violet-500/5' : ''}`}>
                      <Link
                        href={period === 'annual' ? plan.ctaHref + '&billing=annual' : plan.ctaHref}
                        className={`inline-block px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                          plan.popular
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-lg shadow-violet-500/20'
                            : 'border border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        Assinar
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">
            * Agentes IA cobrados separadamente. Planos a partir de R$ 29,90/mes.
          </p>
        </div>
      </section>

      {/* ── AI Plans ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-violet-300 text-xs font-semibold mb-4">
              <Bot className="w-3.5 h-3.5" />
              Complemento
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Planos de IA — Automatize sua operacao
            </h2>
            <p className="text-slate-500 text-sm">Adicione agentes IA ao seu plano para automatizar tarefas repetitivas</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AI_PLANS_DATA.map(ai => (
              <div key={ai.name} className="glass-card rounded-xl p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-1">{ai.name}</h3>
                <div className="flex items-end justify-center gap-1 mb-4">
                  <span className="text-2xl font-bold text-white">R${ai.price.toFixed(2).replace('.', ',')}</span>
                  <span className="text-slate-500 text-xs mb-1">/mes</span>
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  <p><span className="text-white font-semibold">{ai.agents}</span> agentes</p>
                  <p><span className="text-white font-semibold">{ai.executions}</span></p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-6">
            * O Timm AI (chat) e gratuito em todos os planos.
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">FAQ</p>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Perguntas frequentes</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className={`glass-card rounded-xl overflow-hidden ${openFaq === i ? 'ring-1 ring-violet-500/30' : ''}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 p-5 text-left">
                  <span className="font-semibold text-slate-200 text-sm">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-transparent to-violet-900/20 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <Image src="/mascot/timm-waving.png" alt="Timm" width={120} height={120} className="mx-auto mb-6 drop-shadow-2xl animate-float" />
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Pronto para começar?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Crie sua conta e conecte seus marketplaces em minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/cadastro" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-violet-500/25">
              Começar 7 dias grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="mailto:contato@foguetim.com.br" className="inline-flex items-center justify-center gap-2 border border-white/10 text-slate-300 hover:bg-white/5 font-semibold px-8 py-3.5 rounded-xl transition-colors">
              Falar com a equipe
            </a>
          </div>
          <p className="text-xs text-slate-600 mt-4">7 dias grátis. Sem cartão de crédito.</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6 bg-[#060512]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-600">
            <div className="text-center md:text-left space-y-1">
              <p className="font-semibold text-slate-400">© {new Date().getFullYear()} Foguetim ERP</p>
              <p>FIO CABANA IND. E COM. DE CONF. LTDA · CNPJ: 33.685.241/0001-70</p>
              <p>Fortaleza — CE — Brasil</p>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-slate-500">
              <Link href="/" className="hover:text-white transition-colors">Início</Link>
              <Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
              <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
