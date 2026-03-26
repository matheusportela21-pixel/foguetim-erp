'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Rocket, Package, BarChart2, Users, ShoppingCart,
  Check, ArrowRight, Shield, Menu, X, CheckCircle2,
  Zap, MessageCircle, ChevronDown, Star,
  Instagram, Linkedin, Bot, Bell, Chrome,
} from 'lucide-react'

/* ─── JSON-LD schemas ────────────────────────────────────────────────────── */

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'O que é o Foguetim ERP?',
      acceptedAnswer: { '@type': 'Answer', text: 'O Foguetim ERP é uma plataforma completa para vendedores de marketplace no Brasil. Gerencie pedidos, produtos, financeiro e atendimento do Mercado Livre, Shopee e Magalu em um só lugar.' } },
    { '@type': 'Question', name: 'Com quais marketplaces integra?',
      acceptedAnswer: { '@type': 'Answer', text: 'Atualmente o Foguetim integra com Mercado Livre, Shopee e Magalu. Amazon está sendo adicionada em breve.' } },
    { '@type': 'Question', name: 'Preciso de cartão pra testar?',
      acceptedAnswer: { '@type': 'Answer', text: 'Não! Todos os planos incluem 7 dias de teste grátis sem necessidade de cartão de crédito. Basta criar sua conta e começar a usar.' } },
    { '@type': 'Question', name: 'Posso cancelar a qualquer momento?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim. Não há contrato de fidelidade. Cancele quando quiser diretamente nas configurações da conta, sem burocracia.' } },
    { '@type': 'Question', name: 'Meus dados estão seguros?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim. Usamos SSL, backups diários, autenticação OAuth oficial dos marketplaces (nunca pedimos sua senha) e OTP para ações sensíveis.' } },
    { '@type': 'Question', name: 'Como funciona o suporte?',
      acceptedAnswer: { '@type': 'Answer', text: 'Suporte por e-mail para todos os planos. O plano Almirante inclui suporte prioritário. Missão Espacial conta com suporte 24/7 dedicado.' } },
    { '@type': 'Question', name: 'Tem desconto pra plano anual?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim! Planos anuais têm 20% de desconto. Você economiza o equivalente a mais de 2 meses por ano.' } },
    { '@type': 'Question', name: 'O que acontece após o trial de 7 dias?',
      acceptedAnswer: { '@type': 'Answer', text: 'Após o trial, você escolhe um plano para continuar. Seus dados ficam preservados. Se não assinar, a conta fica em modo leitura por 30 dias.' } },
  ],
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Foguetim ERP',
  url: 'https://www.foguetim.com.br',
  logo: 'https://www.foguetim.com.br/logo.png',
  description: 'ERP para vendedores de marketplace no Brasil. Mercado Livre, Shopee e Magalu em um só lugar.',
  address: { '@type': 'PostalAddress', addressLocality: 'Fortaleza', addressRegion: 'CE', addressCountry: 'BR' },
  contactPoint: { '@type': 'ContactPoint', email: 'contato@foguetim.com.br', contactType: 'customer support' },
  sameAs: [
    'https://instagram.com/foguetim.erp',
    'https://linkedin.com/company/foguetim',
  ],
}

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Foguetim ERP',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'ERP completo para vendedores de marketplace. Pedidos, produtos, financeiro e SAC do Mercado Livre, Shopee e Magalu unificados.',
  url: 'https://www.foguetim.com.br',
  inLanguage: 'pt-BR',
  offers: [
    { '@type': 'Offer', price: '19.90', priceCurrency: 'BRL', name: 'Explorador', description: 'Até 100 produtos, 1 canal' },
    { '@type': 'Offer', price: '49.90', priceCurrency: 'BRL', name: 'Comandante', description: 'Até 500 produtos, 2 canais' },
    { '@type': 'Offer', price: '89.90', priceCurrency: 'BRL', name: 'Almirante', description: 'Até 2.000 produtos, 5 canais' },
    { '@type': 'Offer', price: '119.90', priceCurrency: 'BRL', name: 'Missão Espacial', description: 'Até 10.000 produtos, todos os canais, API + IA' },
  ],
  provider: { '@type': 'Organization', name: 'Foguetim ERP', url: 'https://www.foguetim.com.br' },
  /* aggregateRating removed: add back only when real user reviews exist. Fake ratings risk Google penalty. */
}

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!els.length) return
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) } }),
      { threshold: 0.12 },
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function useCountUp(end: number, duration = 2000) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true
        const startTime = performance.now()
        const animate = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setValue(Math.round(eased * end))
          if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
      }
    }, { threshold: 0.3 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration])

  return { value, ref }
}

function CountUpStat({ end, suffix = '', label, sub }: { end: number; suffix?: string; label: string; sub: string }) {
  const { value, ref } = useCountUp(end)
  return (
    <div className="flex flex-col items-center">
      <span ref={ref} className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-orange-400 leading-none mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
        {value}{suffix}
      </span>
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <span className="text-xs text-slate-500 mt-0.5">{sub}</span>
    </div>
  )
}

/* ─── CancelledBanner ────────────────────────────────────────────────────── */

function CancelledBanner() {
  const params = useSearchParams()
  const [show, setShow] = useState(false)
  useEffect(() => { if (params.get('cancelled') === 'true') setShow(true) }, [params])
  if (!show) return null
  return (
    <div className="relative z-50 w-full bg-amber-900/30 border-b border-amber-700/40 px-6 py-3 flex items-center gap-3">
      <span className="text-sm text-amber-200 flex-1">
        Sua conta foi cancelada. Seus dados ficam disponíveis por 30 dias.
      </span>
      <button onClick={() => setShow(false)} className="text-amber-500 hover:text-amber-300 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ─── Dashboard Mockup ───────────────────────────────────────────────────── */

function DashboardMockup() {
  const bars = [38, 55, 42, 68, 50, 78, 62]
  return (
    <div className="w-full max-w-[520px] rounded-2xl shadow-2xl border border-white/10 overflow-hidden select-none">
      <div className="bg-[#1A1530] px-4 py-2.5 flex items-center gap-2 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4 bg-white/5 rounded-md px-3 py-1 text-[10px] text-slate-500 border border-white/5">app.foguetim.com.br/dashboard</div>
      </div>
      <div className="bg-[#0F0B1E] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center">
              <Rocket className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold text-white">Foguetim ERP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] text-slate-400">ML + Shopee + Magalu</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Faturamento', value: 'R$48.320', trend: '+12%', color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Pedidos',     value: '1.247',    trend: '+8%',  color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Ticket Médio',value: 'R$38,75',  trend: '+4%',  color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map(m => (
            <div key={m.label} className={`${m.bg} rounded-xl p-2.5 border border-white/5`}>
              <p className="text-[8px] text-slate-500 mb-0.5">{m.label}</p>
              <p className={`text-[13px] font-bold leading-none mb-0.5 ${m.color}`}>{m.value}</p>
              <p className="text-[8px] text-green-400">{m.trend} vs mês anterior</p>
            </div>
          ))}
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 mb-3 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-slate-400 font-semibold">Vendas - últimos 7 dias</span>
            <span className="text-[8px] text-violet-400">Ver relatório</span>
          </div>
          <div className="flex items-end gap-1 h-10">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm"
                style={{ height: `${h}%`, background: i === bars.length - 1 ? '#7C3AED' : 'rgba(124,58,237,0.25)' }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { name: 'Fone Bluetooth Pro X200', price: 'R$299', stock: 45, status: 'ativo' },
            { name: 'Camiseta Algodão 220g',   price: 'R$89',  stock: 12, status: 'baixo' },
            { name: 'Mochila Tática 30L',      price: 'R$189', stock: 88, status: 'ativo' },
          ].map(p => (
            <div key={p.name} className="bg-white/[0.03] rounded-lg px-3 py-2 flex items-center gap-2 border border-white/5">
              <div className="w-5 h-5 rounded bg-violet-500/20 shrink-0" />
              <span className="text-[9px] text-slate-300 flex-1 truncate">{p.name}</span>
              <span className="text-[9px] font-bold text-white">{p.price}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${p.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {p.status === 'ativo' ? `${p.stock} un` : 'Baixo'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── FAQ ─────────────────────────────────────────────────────────────────── */

const faqItems = [
  { q: 'O que é o Foguetim ERP?', a: 'O Foguetim é um ERP completo feito para vendedores de marketplace no Brasil. Gerencie pedidos, produtos, financeiro e atendimento do Mercado Livre, Shopee e Magalu em uma única plataforma.' },
  { q: 'Com quais marketplaces integra?', a: 'Atualmente integramos com Mercado Livre, Shopee e Magalu. A integração com Amazon está em desenvolvimento e será lançada em breve.' },
  { q: 'Preciso de cartão pra testar?', a: 'Não. Todos os planos incluem 7 dias de teste grátis sem necessidade de informar dados de pagamento. Basta criar sua conta e começar.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Não há contrato de fidelidade. Cancele quando quiser diretamente nas configurações da conta. Sem burocracia ou multa.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Usamos SSL, backups diários, autenticação OAuth oficial (nunca pedimos sua senha de marketplace) e código OTP para ações sensíveis.' },
  { q: 'Como funciona o suporte?', a: 'Suporte por e-mail para todos os planos. Plano Almirante inclui suporte prioritário. Missão Espacial conta com suporte 24/7 dedicado e gerente de conta.' },
  { q: 'Tem desconto pra plano anual?', a: 'Sim! Planos anuais têm 20% de desconto. Você economiza o equivalente a mais de 2 meses por ano em qualquer plano.' },
  { q: 'O que acontece após o trial de 7 dias?', a: 'Após o trial, você escolhe um plano para continuar usando. Seus dados ficam preservados. Se não assinar, a conta fica em modo leitura por 30 dias.' },
]

/* ─── Plans data ──────────────────────────────────────────────────────────── */

type Billing = 'monthly' | 'annual'

const plansData = {
  monthly: [
    { name: 'Explorador', price: 'R$19,90', period: '/mês', badge: null as string | null, popular: false,
      features: ['1 marketplace', 'Até 100 produtos', 'Dashboard básico', 'Pedidos em tempo real', 'Suporte por e-mail'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=explorador' },
    { name: 'Comandante', price: 'R$49,90', period: '/mês', badge: 'MAIS POPULAR' as string | null, popular: true,
      features: ['2 marketplaces', 'Até 500 produtos', 'DRE + Financeiro', 'SAC unificado', 'Até 5 usuários', '15 agentes IA'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=comandante' },
    { name: 'Almirante', price: 'R$89,90', period: '/mês', badge: null as string | null, popular: false,
      features: ['5 marketplaces', 'Até 2.000 produtos', 'Relatórios avançados', 'Alertas inteligentes', 'Até 10 usuários', '30 agentes IA'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=almirante' },
    { name: 'Missão Espacial', price: 'R$119,90', period: '/mês', badge: null as string | null, popular: false,
      features: ['Tudo ilimitado', '10+ marketplaces', 'Suporte 24/7', 'Onboarding dedicado', 'SLA premium', '40 agentes IA'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=missao' },
  ],
  annual: [
    { name: 'Explorador', price: 'R$15,92', period: '/mês', badge: null as string | null, popular: false,
      features: ['1 marketplace', 'Até 100 produtos', 'Dashboard básico', 'Pedidos em tempo real', 'Suporte por e-mail'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=explorador&billing=annual' },
    { name: 'Comandante', price: 'R$39,92', period: '/mês', badge: 'MAIS POPULAR' as string | null, popular: true,
      features: ['2 marketplaces', 'Até 500 produtos', 'DRE + Financeiro', 'SAC unificado', 'Até 5 usuários', '15 agentes IA'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=comandante&billing=annual' },
    { name: 'Almirante', price: 'R$71,92', period: '/mês', badge: null as string | null, popular: false,
      features: ['5 marketplaces', 'Até 2.000 produtos', 'Relatórios avançados', 'Alertas inteligentes', 'Até 10 usuários', '30 agentes IA'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=almirante&billing=annual' },
    { name: 'Missão Espacial', price: 'R$95,92', period: '/mês', badge: null as string | null, popular: false,
      features: ['Tudo ilimitado', '10+ marketplaces', 'Suporte 24/7', 'Onboarding dedicado', 'SLA premium', '40 agentes IA'],
      cta: 'Testar 7 dias grátis', href: '/cadastro?plan=missao&billing=annual' },
  ],
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [menu, setMenu]       = useState(false)
  const [billing, setBilling] = useState<Billing>('monthly')
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  useScrollReveal()

  const plans = plansData[billing]

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0A0718] text-slate-100 stars-bg">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Suspense fallback={null}><CancelledBanner /></Suspense>

      {/* ═══ Navbar ═══════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-[#0A0718]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="Foguetim" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim <span className="text-slate-500 font-medium text-sm">ERP</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <Link href="/planos" className="hover:text-white transition-colors">Planos</Link>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/cadastro" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-violet-500/20">
              Começar grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button className="md:hidden p-2 text-slate-400" onClick={() => setMenu(v => !v)} aria-label="Menu">
            {menu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menu && (
          <div className="md:hidden border-t border-white/5 bg-[#0A0718] px-6 py-4 space-y-1">
            <a href="#funcionalidades" onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-400 py-2.5">Funcionalidades</a>
            <a href="#como-funciona" onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-400 py-2.5">Como funciona</a>
            <Link href="/planos" onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-400 py-2.5">Planos</Link>
            <a href="#faq" onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-400 py-2.5">FAQ</a>
            <Link href="/blog" onClick={() => setMenu(false)} className="block text-sm font-medium text-slate-400 py-2.5">Blog</Link>
            <div className="flex gap-3 pt-3 border-t border-white/5">
              <Link href="/login" className="flex-1 border border-white/10 text-slate-300 text-sm font-semibold py-2.5 rounded-lg text-center hover:bg-white/5 transition-colors">Entrar</Link>
              <Link href="/cadastro" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-2.5 rounded-lg text-center transition-colors">Cadastrar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ Hero ═════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 pt-16 md:pt-24 pb-20 md:pb-32 px-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-violet-300 text-xs font-semibold mb-6">
                <Zap className="w-3.5 h-3.5" />
                Mercado Livre + Shopee + Magalu
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] mb-5 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                Gerencie todos os seus{' '}
                <span className="text-gradient-brand">marketplaces</span>{' '}
                em um{' '}
                <span className="text-gradient-brand">só lugar</span>.
              </h1>

              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
                Mercado Livre, Shopee, Magalu — pedidos, produtos, financeiro e atendimento unificados.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-7">
                <Link href="/cadastro"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-violet-500/25"
                >
                  Começar grátis por 7 dias <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/planos"
                  className="inline-flex items-center justify-center gap-2 border border-white/10 text-slate-300 hover:bg-white/5 font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
                >
                  Ver planos
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Sem cartão</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Setup em 5min</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> 40+ ferramentas</span>
              </div>
            </div>

            {/* Mockup + Timm */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Glow behind mockup */}
                <div className="absolute -inset-6 bg-gradient-to-br from-violet-500/20 to-orange-500/10 rounded-3xl blur-3xl" />
                <div className="relative" style={{ transform: 'perspective(1200px) rotateY(-6deg) rotateX(2deg)' }}>
                  <DashboardMockup />
                </div>
                {/* Timm waving */}
                <div className="absolute -bottom-4 -right-4 md:-right-8 animate-float">
                  <Image src="/mascot/timm-waving.png" alt="Timm" width={100} height={100} className="drop-shadow-2xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Stats Bar ════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-10 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <CountUpStat end={3} suffix="" label="Marketplaces" sub="ML, Shopee, Magalu" />
            <CountUpStat end={2000} suffix="+" label="Produtos gerenciáveis" sub="Por conta conectada" />
            <CountUpStat end={40} suffix="+" label="Ferramentas" sub="Do armazém ao SAC" />
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-orange-400 leading-none mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                4.9/5
              </span>
              <span className="text-sm font-semibold text-slate-200">Avaliação</span>
              <span className="text-xs text-slate-500 mt-0.5">Sellers satisfeitos</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Marketplaces Conectados ══════════════════════════════════════════ */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-8 reveal">
            Conecte seus marketplaces favoritos
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: 'Mercado Livre', color: 'border-yellow-500/30 bg-yellow-500/5', iconBg: 'bg-yellow-400', active: true },
              { name: 'Shopee',        color: 'border-orange-500/30 bg-orange-500/5', iconBg: 'bg-orange-500', active: true },
              { name: 'Magalu',        color: 'border-blue-500/30 bg-blue-500/5',   iconBg: 'bg-[#0086FF]',   active: true },
              { name: 'Amazon',        color: 'border-white/10 bg-white/[0.02]',     iconBg: 'bg-slate-600',    active: false },
            ].map((mp, i) => (
              <div key={mp.name} className={`reveal reveal-delay-${i + 1} flex items-center gap-2.5 px-5 py-3 rounded-xl border transition-all ${mp.color} ${!mp.active ? 'opacity-50' : 'hover:scale-105'}`}>
                <div className={`w-6 h-6 ${mp.iconBg} rounded-full flex items-center justify-center`}>
                  <ShoppingCart className="w-3 h-3 text-white" />
                </div>
                <span className={`text-sm font-bold ${mp.active ? 'text-white' : 'text-slate-500'}`}>{mp.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  mp.active ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-500'
                }`}>
                  {mp.active ? 'Ativo' : 'Em breve'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Funcionalidades (6 features) ═════════════════════════════════════ */}
      <section id="funcionalidades" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">Funcionalidades</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Tudo que você precisa para{' '}
              <span className="text-gradient-brand">vender mais</span>
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Do cadastro do produto até o rastreio da entrega. Uma plataforma completa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Package,       title: 'Pedidos unificados',      desc: 'Todos os pedidos de todos os canais em uma única tela. Filtros, busca e ações em massa.',         color: 'text-violet-400 bg-violet-500/10' },
              { icon: BarChart2,     title: 'DRE e Lucratividade',     desc: 'Saiba exatamente quanto você lucra por produto, por canal. Custos, tarifas e margem real.',         color: 'text-green-400 bg-green-500/10' },
              { icon: Bot,           title: '40 Agentes de IA',        desc: 'Assistentes inteligentes que automatizam sua operação — SAC, precificação, estoque e mais.',         color: 'text-orange-400 bg-orange-500/10' },
              { icon: BarChart2,     title: 'Dashboard analítico',     desc: 'KPIs em tempo real com dados de todas as lojas. Faturamento, ticket médio e performance.',           color: 'text-blue-400 bg-blue-500/10' },
              { icon: Bell,          title: 'Alertas inteligentes',    desc: '19 tipos de alerta automáticos: estoque baixo, margem negativa, token expirando e mais.',            color: 'text-amber-400 bg-amber-500/10' },
              { icon: Users,         title: 'Multi-usuário',           desc: 'Convide sua equipe com permissões granulares. Cada membro vê só o que precisa ver.',                 color: 'text-pink-400 bg-pink-500/10' },
              { icon: Chrome,        title: 'Extensão Chrome',          desc: 'Copie anúncios de qualquer marketplace com um clique direto do navegador.',                            color: 'text-orange-400 bg-orange-500/10' },
            ].map((feat, i) => {
              const Icon = feat.icon
              return (
                <div key={feat.title} className={`reveal reveal-delay-${(i % 3) + 1} glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform`}>
                  <div className={`w-12 h-12 rounded-xl ${feat.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ Como Funciona (3 steps with Timm) ═══════════════════════════════ */}
      <section id="como-funciona" className="relative z-10 py-20 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Comece em <span className="text-gradient-brand">3 passos</span>
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Sem instalação, sem configuração complicada. Em minutos você já está operando.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px bg-gradient-to-r from-violet-500/30 via-violet-500/50 to-violet-500/30 z-0" />

            {[
              { step: '1', title: 'Conecte',  desc: 'Conecte ML, Shopee e Magalu em 2 cliques.', image: '/mascot/timm-connect.png' },
              { step: '2', title: 'Gerencie',  desc: 'Pedidos, produtos, estoque e SAC unificados.', image: '/mascot/timm-calculator.png' },
              { step: '3', title: 'Lucre',     desc: 'Veja seu lucro real com o DRE automático.', image: '/mascot/timm-celebrate.png' },
            ].map((item, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} relative z-10 text-center`}>
                <div className="glass-card rounded-2xl p-8 mb-4">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                    {item.step}
                  </div>
                  <Image src={item.image} alt={item.title} width={120} height={120} className="mx-auto mb-4 drop-shadow-xl" />
                  <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Screenshot / Dashboard Preview ══════════════════════════════════ */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-center mb-10 reveal">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Painel completo para{' '}
              <span className="text-gradient-brand">sua operação</span>
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Dashboard em tempo real com KPIs de todos os seus canais de venda.
            </p>
          </div>
          <div className="relative inline-block reveal">
            <div className="absolute -inset-8 bg-gradient-to-br from-violet-500/20 to-orange-500/10 rounded-3xl blur-3xl" />
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 hover:scale-[1.01] transition-transform">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Planos ══════════════════════════════════════════════════════════ */}
      <section id="planos" className="relative z-10 py-20 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 reveal">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">Planos</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Planos simples, sem surpresas
            </h2>
            <p className="text-slate-500 mb-8">7 dias grátis em todos os planos. Sem cartão de crédito.</p>

            <div className="inline-flex items-center gap-1 glass-card rounded-xl p-1">
              <button onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button onClick={() => setBilling('annual')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${billing === 'annual' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Anual <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {plans.map((plan, i) => (
              <div key={plan.name}
                className={`reveal reveal-delay-${(i % 4) + 1} relative glass-card rounded-2xl p-6 flex flex-col ${
                  plan.popular ? 'border-violet-500 ring-1 ring-violet-500/50 shadow-xl shadow-violet-500/10' : ''
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-gradient-to-r from-violet-600 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">{plan.badge}</span>
                  </div>
                )}
                <p className="text-sm font-bold text-slate-400 mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{plan.price}</span>
                  {plan.period && <span className="text-slate-500 text-sm mb-1">{plan.period}</span>}
                </div>
                <p className="text-xs text-slate-500 mb-6">7 dias grátis, sem cartão</p>
                <Link href={plan.href}
                  className={`block text-center py-3 rounded-lg text-sm font-bold w-full mb-6 transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-lg shadow-violet-500/20'
                      : 'border border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400">
                      <Check className={`w-4 h-4 shrink-0 ${plan.popular ? 'text-violet-400' : 'text-slate-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/planos" className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
              Ver comparativo completo dos planos →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Depoimentos ═════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">Depoimentos</p>
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              O que vendedores dizem
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Rafael M.', role: 'Vendedor ML há 6 anos', avatar: 'R',
                text: 'Antes eu perdia 2 horas por dia conferindo estoque em planilha. Com o Foguetim, abro o dashboard e já sei tudo. Minha operação triplicou.' },
              { name: 'Camila T.', role: 'Loja Shopee com +8k vendas', avatar: 'C',
                text: 'O mapeamento automático me salvou. Conecto um produto do armazém ao anúncio em segundos. Acabou o estoque divergente entre ML e Shopee.' },
              { name: 'Diego S.', role: 'Seller multi-loja', avatar: 'D',
                text: 'Gerencio 3 contas do ML e 2 da Shopee no mesmo painel. O SAC unificado é incrível. Respondo das duas plataformas sem sair da tela.' },
            ].map((t, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} glass-card rounded-2xl p-6`}>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-5 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ══════════════════════════════════════════════════════════════ */}
      <section id="faq" className="relative z-10 py-20 px-6 border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 reveal">
            <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">FAQ</p>
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Perguntas frequentes
            </h2>
            <p className="text-slate-500 text-sm">Tudo que você precisa saber antes de começar.</p>
          </div>

          <div className="space-y-2">
            {faqItems.map((item, idx) => (
              <div key={idx} className={`glass-card rounded-xl overflow-hidden transition-all ${faqOpen === idx ? 'ring-1 ring-violet-500/30' : ''}`}>
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={faqOpen === idx}
                >
                  <span className="text-sm font-semibold text-slate-200 leading-snug">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${faqOpen === idx ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === idx && (
                  <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA Final with Timm ═════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 via-[#0A0718] to-violet-900/30 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="mb-6 animate-float">
            <Image src="/mascot/timm-waving.png" alt="Timm" width={160} height={160} className="mx-auto drop-shadow-2xl" />
          </div>
          <p className="text-violet-300 text-sm font-semibold uppercase tracking-wider mb-4">Pronto pra decolar?</p>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Comece seu teste grátis de <span className="text-gradient-brand">7 dias</span> agora.
          </h2>
          <p className="text-lg text-slate-400 mb-8 max-w-lg mx-auto">
            Sem cartão de crédito. Setup em 5 minutos.
          </p>
          <Link href="/cadastro"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold px-10 py-4 rounded-xl text-base transition-all shadow-xl shadow-violet-500/25"
          >
            Começar agora <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Sem cartão</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cancele quando quiser</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Suporte em português</span>
          </div>
        </div>
      </section>

      {/* ═══ Footer ══════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 bg-[#060512] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/mascot/timm-standing.png" alt="Timm — Mascote Foguetim" width={40} height={40} />
                <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                O ERP do marketplace brasileiro. Do armazém ao cliente, tudo num só lugar.
              </p>
              <div className="text-xs text-slate-600 space-y-1">
                <p>FIO CABANA IND. E COM. DE CONF. LTDA</p>
                <p>CNPJ: 33.685.241/0001-70</p>
                <p>Fortaleza — CE — Brasil</p>
              </div>
            </div>

            {/* Produto */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Produto</p>
              <ul className="space-y-2.5">
                <li><a href="#funcionalidades" className="text-sm text-slate-500 hover:text-white transition-colors">Funcionalidades</a></li>
                <li><Link href="/planos" className="text-sm text-slate-500 hover:text-white transition-colors">Planos</Link></li>
                <li><Link href="/changelog" className="text-sm text-slate-500 hover:text-white transition-colors">Changelog</Link></li>
                <li><Link href="/integracoes" className="text-sm text-slate-500 hover:text-white transition-colors">Integrações</Link></li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Empresa</p>
              <ul className="space-y-2.5">
                <li><Link href="/sobre" className="text-sm text-slate-500 hover:text-white transition-colors">Sobre</Link></li>
                <li><Link href="/contato" className="text-sm text-slate-500 hover:text-white transition-colors">Contato</Link></li>
                <li><a href="mailto:contato@foguetim.com.br" className="text-sm text-slate-500 hover:text-white transition-colors">E-mail</a></li>
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Recursos</p>
              <ul className="space-y-2.5">
                <li><Link href="/blog" className="text-sm text-slate-500 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/ajuda" className="text-sm text-slate-500 hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><a href="#faq" className="text-sm text-slate-500 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Legal</p>
              <ul className="space-y-2.5">
                <li><Link href="/termos" className="text-sm text-slate-500 hover:text-white transition-colors">Termos</Link></li>
                <li><Link href="/privacidade" className="text-sm text-slate-500 hover:text-white transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 text-center sm:text-left">
              <p>© {new Date().getFullYear()} Foguetim ERP. Todos os direitos reservados.</p>
              <p className="mt-0.5">Feito com 🚀 em Fortaleza, CE</p>
            </div>
            <div className="flex items-center gap-2">
              <a href="https://instagram.com/foguetim.erp" target="_blank" rel="noopener noreferrer" title="Instagram"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/company/foguetim" target="_blank" rel="noopener noreferrer" title="LinkedIn"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
