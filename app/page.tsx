'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Rocket, Package, Calculator, FileText, TrendingUp, BarChart2,
  Users, ShoppingCart, Zap, Check, ArrowRight, ChevronRight,
  Globe, Clock, Shield, Menu, X, CheckCircle2, BarChart3,
} from 'lucide-react'

/* ── Deterministic star positions ────────────────────────────────────────── */
const phi = 0.618033988749895
const stars = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  x: ((i * phi * 100) % 100).toFixed(2),
  y: ((i * phi * phi * 100 + i * 1.3) % 100).toFixed(2),
  r: 1 + (i % 2),
  delay: ((i * phi * 8) % 5).toFixed(1),
}))

/* ── Hero benefits ────────────────────────────────────────────────────────── */
const heroBenefits = [
  { icon: CheckCircle2, text: 'Plano gratuito para sempre, sem cartão de crédito' },
  { icon: Package,      text: 'Controle de estoque em tempo real por SKU' },
  { icon: BarChart3,    text: 'Dashboard financeiro consolidado por plataforma' },
  { icon: FileText,     text: 'Gerador de listagens otimizadas por marketplace' },
  { icon: Calculator,   text: 'Precificação automática com comissões e frete' },
  { icon: Shield,       text: 'Dados seguros com backup diário e criptografia' },
]

/* ── Data ─────────────────────────────────────────────────────────────────── */
const solutions = [
  { icon: Package,    color: 'bg-blue-50 text-blue-600',    title: 'Gestão de Produtos',       desc: 'Cadastre, organize e controle todos os seus SKUs com estoque em tempo real e alertas automáticos de reposição.' },
  { icon: Calculator, color: 'bg-purple-50 text-purple-600', title: 'Precificação Inteligente', desc: 'Calcule preços ideais considerando comissões, frete e impostos de cada marketplace automaticamente.' },
  { icon: FileText,   color: 'bg-cyan-50 text-cyan-600',    title: 'Gerador de Listagens',     desc: 'Crie títulos, descrições e bullets otimizados para Mercado Livre, Shopee e Amazon com foco em SEO.' },
  { icon: TrendingUp, color: 'bg-orange-50 text-orange-500', title: 'Painel Financeiro',        desc: 'Acompanhe receitas, custos e lucro com dashboards intuitivos e relatórios consolidados por plataforma.' },
  { icon: ShoppingCart,color:'bg-green-50 text-green-600',  title: 'Gestão de Pedidos',        desc: 'Centralize pedidos de todos os canais de venda com rastreamento e atualização de status em tempo real.' },
  { icon: BarChart2,  color: 'bg-indigo-50 text-indigo-600',title: 'Relatórios & Analytics',   desc: 'Tome decisões baseadas em dados com relatórios completos de desempenho e tendências de venda.' },
]

const tools = [
  { icon: Globe,       label: 'Multi-marketplace',  desc: 'ML, Shopee, Amazon em um painel',    status: 'active' },
  { icon: Shield,      label: 'Nota Fiscal (NF-e)', desc: 'Emissão automática de NF-e',          status: 'soon'   },
  { icon: Users,       label: 'Gestão de Equipe',   desc: 'Controle de acesso por perfil',       status: 'active' },
  { icon: Zap,         label: 'Integrações',         desc: 'Conexão direta com marketplaces',     status: 'active' },
  { icon: BarChart2,   label: 'BI com IA',           desc: 'Relatórios preditivos inteligentes',  status: 'future' },
  { icon: Clock,       label: 'Automações',          desc: 'Regras e workflows automáticos',      status: 'soon'   },
  { icon: Package,     label: 'Estoque Real',        desc: 'Sincronização de estoque cross-canal',status: 'active' },
  { icon: ShoppingCart,label: 'SAC Unificado',       desc: 'Atendimento centralizado em um lugar',status: 'active' },
]

const statusMap = {
  active: { label: 'Ativo',    cls: 'bg-green-50 text-green-700 ring-1 ring-green-200'   },
  soon:   { label: 'Em breve', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'   },
  future: { label: 'Futuro',   cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200'},
}

/* ── Integrations (honest social proof) ────────────────────────────────────── */
const integrations = [
  {
    name: 'Mercado Livre',
    color: '#f59e0b',
    status: 'Ativo',
    statusCls: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    desc: 'Produtos, pedidos, financeiro e reputação integrados via API oficial.',
    dot: 'bg-amber-400',
  },
  {
    name: 'Shopee',
    color: '#f97316',
    status: 'Em breve',
    statusCls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    desc: 'Integração em desenvolvimento. Previsão para os próximos meses.',
    dot: 'bg-orange-400',
  },
  {
    name: 'Amazon',
    color: '#0ea5e9',
    status: 'Em breve',
    statusCls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    desc: 'Suporte à API SP-API da Amazon em planejamento ativo.',
    dot: 'bg-sky-400',
  },
]

/* ── Plans ──────────────────────────────────────────────────────────────────── */
type Billing = 'monthly' | 'annual'

const plansData = {
  monthly: [
    {
      name: 'Explorador', price: 'Grátis', period: '',
      desc: 'Ideal para quem está começando',
      badge: null, popular: false,
      features: ['Até 50 produtos', '1 marketplace', 'Precificação básica', 'Dashboard essencial', '1 usuário'],
      cta: 'Começar Grátis', href: '/registro',
    },
    {
      name: 'Comandante', price: 'R$59', period: '/mês',
      desc: 'Para sellers em crescimento',
      badge: 'Mais Popular', popular: true,
      features: ['Até 500 produtos', '3 marketplaces', 'Todos os módulos', 'Precificação avançada', 'Gerador de listagens', 'Painel financeiro completo', 'Até 5 usuários', 'Suporte prioritário'],
      cta: 'Criar minha conta grátis', href: '/registro?plano=comandante',
    },
    {
      name: 'Almirante', price: 'R$99', period: '/mês',
      desc: 'Para grandes operações',
      badge: null, popular: false,
      features: ['Produtos ilimitados', 'Marketplaces ilimitados', 'NF-e automática', 'API de integração', 'Usuários ilimitados', 'Relatórios com IA', 'Gerente de sucesso dedicado', 'Suporte 24/7'],
      cta: 'Criar minha conta grátis', href: '/registro?plano=almirante',
    },
  ],
  annual: [
    {
      name: 'Explorador', price: 'Grátis', period: '',
      desc: 'Ideal para quem está começando',
      badge: null, popular: false,
      features: ['Até 50 produtos', '1 marketplace', 'Precificação básica', 'Dashboard essencial', '1 usuário'],
      cta: 'Começar Grátis', href: '/registro',
    },
    {
      name: 'Comandante', price: 'R$47', period: '/mês',
      desc: 'Para sellers em crescimento · cobrado anualmente',
      badge: 'Mais Popular', popular: true,
      features: ['Até 500 produtos', '3 marketplaces', 'Todos os módulos', 'Precificação avançada', 'Gerador de listagens', 'Painel financeiro completo', 'Até 5 usuários', 'Suporte prioritário'],
      cta: 'Criar minha conta grátis', href: '/registro?plano=comandante&billing=annual',
    },
    {
      name: 'Almirante', price: 'R$79', period: '/mês',
      desc: 'Para grandes operações · cobrado anualmente',
      badge: null, popular: false,
      features: ['Produtos ilimitados', 'Marketplaces ilimitados', 'NF-e automática', 'API de integração', 'Usuários ilimitados', 'Relatórios com IA', 'Gerente de sucesso dedicado', 'Suporte 24/7'],
      cta: 'Criar minha conta grátis', href: '/registro?plano=almirante&billing=annual',
    },
  ],
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [menu, setMenu]       = useState(false)
  const [billing, setBilling] = useState<Billing>('monthly')

  const plans = plansData[billing]

  return (
    <div className="landing-bg min-h-screen overflow-x-hidden">

      {/* Subtle star background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {stars.map(s => (
          <div
            key={s.id}
            className="absolute rounded-full bg-slate-300 animate-twinkle"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r, height: s.r, animationDelay: `${s.delay}s`, opacity: 0.4 }}
          />
        ))}
        {/* Subtle gradient blobs */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-radial from-purple-50 to-transparent opacity-60" />
        <div className="absolute top-1/2 -left-20 w-[400px] h-[400px] rounded-full bg-gradient-radial from-cyan-50 to-transparent opacity-50" />
      </div>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center shadow-sm">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim
            </span>
            <span className="hidden sm:block text-xs font-medium text-slate-400 tracking-wider mt-0.5">ERP</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#solucoes"    className="hover:text-navy-900 transition-colors">Soluções</a>
            <a href="#ferramentas" className="hover:text-navy-900 transition-colors">Ferramentas</a>
            <Link href="/sobre"        className="hover:text-navy-900 transition-colors">Sobre</Link>
            <Link href="/integracoes"  className="hover:text-navy-900 transition-colors">Integrações</Link>
            <Link href="/planos"       className="hover:text-navy-900 transition-colors">Preços</Link>
            <Link href="/contato"      className="hover:text-navy-900 transition-colors">Contato</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-navy-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/registro" className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              Começar Grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button className="md:hidden p-2 text-slate-500" onClick={() => setMenu(v => !v)}>
            {menu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menu && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-1">
            {['#solucoes:Soluções', '#ferramentas:Ferramentas'].map(s => {
              const [href, label] = s.split(':')
              return <a key={href} href={href} onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">{label}</a>
            })}
            <Link href="/sobre"       onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">Sobre</Link>
            <Link href="/integracoes" onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">Integrações</Link>
            <Link href="/planos"      onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">Preços</Link>
            <Link href="/contato"     onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">Contato</Link>
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Link href="/login"    className="flex-1 btn-outline py-2.5 rounded-xl text-sm text-center">Entrar</Link>
              <Link href="/registro" className="flex-1 btn-primary py-2.5 rounded-xl text-sm text-center">Cadastrar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-24 pb-32 text-center px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-8 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            ERP completo para sellers de marketplace
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-navy-900 leading-[1.08] mb-6 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Seu e-commerce{' '}
            <span className="text-gradient">em órbita</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Gerencie Mercado Livre, Shopee e Amazon em um painel unificado.
            Precificação, estoque, pedidos e financeiro — tudo em um só lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro" className="btn-primary px-8 py-4 rounded-2xl text-base">
              Começar gratuitamente <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/registro" className="btn-outline px-8 py-4 rounded-2xl text-base">
              Criar minha conta grátis
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">Sem cartão de crédito · Cancele quando quiser</p>

          {/* Hero visual */}
          <div className="relative mt-16 mx-auto max-w-xs">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 rounded-full border border-slate-200 animate-orbit opacity-40" />
              <div className="w-36 h-36 rounded-full border border-purple-100 animate-orbit opacity-60" style={{ animationDuration: '14s', animationDirection: 'reverse' }} />
            </div>
            <div className="relative z-10 flex items-center justify-center h-56 animate-float">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center shadow-card-lg">
                <Rocket className="w-12 h-12 text-white" style={{ transform: 'rotate(-45deg)' }} />
              </div>
            </div>
          </div>

          {/* Hero benefits replacing fake stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
            {heroBenefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-sm text-slate-600">
                <Icon className="w-4 h-4 shrink-0 text-purple-500" />
                {text}
              </div>
            ))}
          </div>

          {/* Platform logos */}
          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Integra com</span>
            {[
              { name: 'Mercado Livre', color: '#f59e0b' },
              { name: 'Shopee',        color: '#f97316' },
              { name: 'Amazon',        color: '#0ea5e9' },
            ].map(p => (
              <span key={p.name} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 font-medium" style={{ color: p.color }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solutions ───────────────────────────────────────────────────────── */}
      <section id="solucoes" className="relative z-10 py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-purple-600 mb-3 uppercase tracking-wider">Soluções</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Uma plataforma completa para gerenciar toda a operação do seu e-commerce.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {solutions.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="landing-card p-7 group cursor-default hover:-translate-y-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2 text-base">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                <div className="flex items-center gap-1 mt-5 text-xs font-bold text-purple-600 group-hover:gap-2 transition-all">
                  Saiba mais <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tools ───────────────────────────────────────────────────────────── */}
      <section id="ferramentas" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-cyan-600 mb-3 uppercase tracking-wider">Ferramentas</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Uma plataforma, infinitas possibilidades
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Estamos construindo o ERP mais completo para sellers brasileiros.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map(({ icon: Icon, label, desc, status }) => {
              const s = statusMap[status as keyof typeof statusMap]
              return (
                <div key={label} className="landing-card p-5 flex flex-col gap-3">
                  <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-navy-700" />
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-bold text-navy-900 text-sm leading-tight">{label}</span>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="planos" className="relative z-10 py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-orange-500 mb-3 uppercase tracking-wider">Planos</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Escolha sua missão
            </h2>
            <p className="text-slate-500 mb-8">Comece grátis e cresça no seu ritmo. Sem contratos longos.</p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${billing === 'annual' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Anual
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`relative landing-card p-8 flex flex-col ${plan.popular ? 'ring-2 ring-purple-500 shadow-card-lg' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <p className="text-sm font-bold text-slate-500 mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-bold text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>{plan.price}</span>
                  {plan.period && <span className="text-slate-400 text-sm mb-1">{plan.period}</span>}
                </div>
                <p className="text-xs text-slate-500 mb-7">{plan.desc}</p>

                <Link href={plan.href} className={`block text-center py-3 rounded-xl text-sm font-bold w-full mb-7 transition-all ${plan.popular ? 'btn-primary' : 'btn-outline'}`}>
                  {plan.cta}
                </Link>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Check className={`w-4 h-4 shrink-0 ${plan.popular ? 'text-purple-500' : 'text-slate-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 space-y-2">
            <p className="text-xs text-slate-400">
              Todos os planos incluem SSL, backups diários e acesso via web e mobile.
            </p>
            <Link href="/planos" className="inline-block text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
              Ver todos os planos e comparativo completo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Integrations (honest social proof) ──────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-purple-600 mb-3 uppercase tracking-wider">Integrações</p>
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Conectado aos maiores marketplaces
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Status real das nossas integrações. Transparência total sobre o que está disponível hoje.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {integrations.map(int => (
              <div key={int.name} className="landing-card p-7 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${int.dot}`} />
                    <span className="font-bold text-navy-900 text-base" style={{ color: int.color }}>{int.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${int.statusCls}`}>{int.status}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{int.desc}</p>
              </div>
            ))}
          </div>

          {/* Value props */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { title: 'Dados reais',        desc: 'Nenhum número fabricado. Todos os dados refletem sua operação real.' },
              { title: 'Sem senhas expostas', desc: 'Integração via OAuth e tokens de API. Suas credenciais nunca passam por nós.' },
              { title: 'Sempre atualizado',  desc: 'Nossos dados são sincronizados com os marketplaces em tempo real.' },
            ].map(v => (
              <div key={v.title} className="landing-card p-6">
                <p className="font-bold text-navy-900 mb-2 text-sm">{v.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-navy-900 to-purple-700 rounded-3xl px-8 py-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {stars.slice(0, 15).map(s => (
                <div key={s.id} className="absolute w-1 h-1 rounded-full bg-white"
                  style={{ left: `${s.x}%`, top: `${s.y}%` }} />
              ))}
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
                Pronto para decolar?
              </h2>
              <p className="text-white/70 mb-8 max-w-md mx-auto">
                Crie sua conta gratuita agora e comece a organizar seu e-commerce em minutos.
              </p>
              <Link href="/registro" className="btn-orange px-8 py-3.5 rounded-2xl text-base font-bold inline-flex items-center gap-2">
                Criar conta grátis <Rocket className="w-4 h-4" />
              </Link>
              <p className="text-white/40 text-xs mt-4">Sem cartão de crédito · Plano gratuito para sempre</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-100 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center">
                  <Rocket className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                O ERP completo para sellers de marketplace brasileiro. Seu e-commerce em órbita.
              </p>
              <div className="space-y-1 text-xs text-slate-400">
                <p>Operado por FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA</p>
                <p>CNPJ: 33.685.241/0001-70 | Fortaleza — CE — Brasil</p>
                <a href="mailto:contato@foguetim.com.br" className="hover:text-navy-900 transition-colors block">
                  contato@foguetim.com.br
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-bold text-navy-900 mb-3 text-xs uppercase tracking-wider">Produto</p>
                <ul className="space-y-2">
                  <li><a href="#solucoes" className="text-slate-500 hover:text-navy-900 transition-colors text-sm">Soluções</a></li>
                  <li><a href="#planos" className="text-slate-500 hover:text-navy-900 transition-colors text-sm">Preços</a></li>
                  <li><Link href="/integracoes" className="text-slate-500 hover:text-navy-900 transition-colors text-sm">Integrações</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-navy-900 mb-3 text-xs uppercase tracking-wider">Empresa</p>
                <ul className="space-y-2">
                  <li><Link href="/sobre" className="text-slate-500 hover:text-navy-900 transition-colors text-sm">Sobre</Link></li>
                  <li><Link href="/contato" className="text-slate-500 hover:text-navy-900 transition-colors text-sm">Contato</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-navy-900 mb-3 text-xs uppercase tracking-wider">Legal</p>
                <ul className="space-y-2">
                  <li><Link href="/termos" className="text-slate-500 hover:text-navy-900 transition-colors text-sm">Termos de Uso</Link></li>
                  <li><Link href="/privacidade" className="text-slate-500 hover:text-navy-900 transition-colors text-sm">Privacidade</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 Foguetim ERP — Todos os direitos reservados.</p>
            <p className="text-center text-xs text-slate-400 italic">
              Foguetim é uma plataforma independente. As integrações são realizadas via APIs oficiais de cada marketplace.
            </p>
            <div className="flex gap-5">
              <Link href="/sobre" className="hover:text-navy-900 transition-colors">Sobre</Link>
              <Link href="/termos" className="hover:text-navy-900 transition-colors">Termos de Uso</Link>
              <Link href="/privacidade" className="hover:text-navy-900 transition-colors">Privacidade</Link>
              <Link href="/contato" className="hover:text-navy-900 transition-colors">Contato</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
