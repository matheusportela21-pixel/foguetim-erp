'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Rocket, Package, FileText, BarChart2,
  Users, ShoppingCart, Check, ArrowRight,
  Shield, Menu, X, CheckCircle2, Zap, MessageCircle,
  Info, Star, Warehouse, RefreshCw, CalendarDays,
  Printer, Globe, Truck, MapPin, Tags,
} from 'lucide-react'

/* ── Cancelled banner ─────────────────────────────────────────────────────── */
function CancelledBanner() {
  const params = useSearchParams()
  const [show, setShow] = useState(false)
  useEffect(() => { if (params.get('cancelled') === 'true') setShow(true) }, [params])
  if (!show) return null
  return (
    <div className="relative z-50 w-full bg-amber-900/30 border-b border-amber-700/40 px-6 py-3 flex items-center gap-3">
      <Info className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-sm text-amber-200 flex-1">
        Sua conta foi cancelada. Seus dados serão mantidos por 30 dias.{' '}
        <a href="mailto:contato@foguetim.com.br" className="underline font-semibold hover:text-amber-100">contato@foguetim.com.br</a>
      </p>
      <button onClick={() => setShow(false)} className="text-amber-500 hover:text-amber-300 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/* ── Dashboard Mockup ─────────────────────────────────────────────────────── */
function DashboardMockup() {
  const bars = [38, 55, 42, 68, 50, 78, 62]
  return (
    <div className="w-full max-w-[520px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden select-none">
      <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-[10px] text-gray-400 border border-gray-200">app.foguetim.com.br/dashboard</div>
      </div>
      <div className="bg-[#060a1a] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
              <Rocket className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold text-white">Foguetim ERP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] text-slate-400">Mercado Livre conectado</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Faturamento',  value: 'R$48.320', trend: '+12%', color: 'text-green-400',  bg: 'bg-green-500/10' },
            { label: 'Pedidos',      value: '1.247',     trend: '+8%',  color: 'text-blue-400',   bg: 'bg-blue-500/10'  },
            { label: 'Ticket Médio', value: 'R$38,75',   trend: '+4%',  color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
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
            <span className="text-[9px] text-slate-400 font-semibold">Vendas — últimos 7 dias</span>
            <span className="text-[8px] text-indigo-400">Ver relatório →</span>
          </div>
          <div className="flex items-end gap-1 h-10">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: `${h}%`, background: i === bars.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.35)' }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {[
            { name: 'Tênis Esportivo XR-500', price: 'R$299', stock: 45, status: 'ativo' },
            { name: 'Camiseta Algodão 220g',  price: 'R$89',  stock: 12, status: 'baixo' },
            { name: 'Mochila Tática 30L',     price: 'R$189', stock: 88, status: 'ativo' },
          ].map(p => (
            <div key={p.name} className="bg-white/[0.03] rounded-lg px-3 py-2 flex items-center gap-2 border border-white/5">
              <div className="w-5 h-5 rounded bg-indigo-500/20 shrink-0" />
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

/* ── Warehouse Mockup ─────────────────────────────────────────────────────── */
function WarehouseMockup() {
  return (
    <div className="w-full max-w-[520px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden select-none">
      <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-[10px] text-gray-400 border border-gray-200">app.foguetim.com.br/armazem/estoque</div>
      </div>
      <div className="bg-[#060a1a] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-cyan-600 flex items-center justify-center">
              <Warehouse className="w-3 h-3 text-white" />
            </div>
            <span className="text-[11px] font-bold text-white">Estoque</span>
          </div>
          <span className="text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">Armazém Principal</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Total SKUs',  value: '234',   color: 'text-cyan-400',  bg: 'bg-cyan-500/10'  },
            { label: 'Em ruptura',  value: '3',     color: 'text-red-400',   bg: 'bg-red-500/10'   },
            { label: 'Estoque baixo', value: '11',  color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(m => (
            <div key={m.label} className={`${m.bg} rounded-xl p-2.5 border border-white/5`}>
              <p className="text-[8px] text-slate-500 mb-0.5">{m.label}</p>
              <p className={`text-[15px] font-bold leading-none ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {[
            { name: 'Tênis XR-500 (P/M/G)',  sku: 'TNS-001',  qty: 142, mapped: true,  status: 'normal' },
            { name: 'Camiseta Oversized',     sku: 'CAM-003',  qty: 8,   mapped: true,  status: 'baixo'  },
            { name: 'Mochila Tática 30L',     sku: 'MOC-007',  qty: 0,   mapped: false, status: 'ruptura'},
          ].map(p => (
            <div key={p.name} className="bg-white/[0.03] rounded-lg px-3 py-2 flex items-center gap-2 border border-white/5">
              <div className="w-5 h-5 rounded bg-cyan-500/20 shrink-0 flex items-center justify-center">
                <Package className="w-2.5 h-2.5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-300 truncate">{p.name}</p>
                <p className="text-[8px] text-slate-600">{p.sku}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {p.mapped && <span className="text-[7px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">ML</span>}
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                  p.status === 'normal'  ? 'bg-green-500/20 text-green-400'  :
                  p.status === 'baixo'   ? 'bg-amber-500/20 text-amber-400'  :
                                           'bg-red-500/20 text-red-400'
                }`}>
                  {p.status === 'ruptura' ? '0 un' : `${p.qty} un`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Data ─────────────────────────────────────────────────────────────────── */
type Billing = 'monthly' | 'annual'

const problems = [
  { before: 'Planilhas para controle de estoque',      after: 'Estoque multi-armazém em tempo real'    },
  { before: 'Abas abertas para cada marketplace',      after: 'Painel unificado, tudo num só lugar'    },
  { before: 'Responder perguntas manualmente',         after: 'SAC integrado com pós-venda completo'   },
  { before: 'Não saber o custo real de cada produto',  after: '3 conceitos de custo por produto'       },
]

interface Capability {
  icon:  React.ElementType
  title: string
  desc:  string
  color: string
  soon?: boolean
}

const capabilities: Capability[] = [
  {
    icon:  Warehouse,
    title: 'Armazém Inteligente',
    desc:  'Produtos com SKU, estoque multi-armazém, movimentações, localizações, kits e variações.',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    icon:  ShoppingCart,
    title: 'Mercado Livre Completo',
    desc:  'Anúncios, pedidos, expedição, pós-venda, reputação, promoções e financeiro num só painel.',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    icon:  RefreshCw,
    title: 'Estoque Sincronizado',
    desc:  'Mapeamento produto ↔ anúncio, sync opt-in, alertas de ruptura e 3 conceitos de custo.',
    color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  },
  {
    icon:  CalendarDays,
    title: 'Calendário Comercial',
    desc:  'Datas comemorativas, planejamento de promoções e countdown para grandes eventos.',
    color: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  {
    icon:  Users,
    title: 'Multi-conta ML',
    desc:  'Conecte várias contas do Mercado Livre, alterne entre elas e controle limites por plano.',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    icon:  Printer,
    title: 'Etiquetas e Expedição',
    desc:  'Impressão em PDF e Zebra/ZPL, lote, DANFE, rastreio e preparação de envios.',
    color: 'bg-green-50 text-green-600 border-green-100',
  },
  {
    icon:  Shield,
    title: 'Segurança Avançada',
    desc:  'OTP para ações críticas, mascaramento de dados sensíveis e logs de auditoria completos.',
    color: 'bg-rose-50 text-rose-600 border-rose-100',
  },
  {
    icon:  Globe,
    title: 'Em breve: Shopee & Amazon',
    desc:  'Mesma arquitetura robusta expandindo para novos marketplaces. Sidebar já preparada.',
    color: 'bg-slate-50 text-slate-400 border-slate-200',
    soon:  true,
  },
]

const plansData = {
  monthly: [
    {
      name: 'Explorador', price: 'Grátis', period: '', note: 'Para sempre, sem cartão',
      badge: null as string | null, popular: false,
      features: ['Até 10 produtos', '1 conta Mercado Livre', 'Dashboard básico', 'Pedidos em tempo real', 'Suporte por e-mail'],
      cta: 'Começar grátis', href: '/registro',
    },
    {
      name: 'Comandante', price: 'R$49,90', period: '/mês', note: '7 dias grátis, sem cartão',
      badge: 'MAIS POPULAR', popular: true,
      features: ['Até 500 produtos', 'Até 3 contas Mercado Livre', 'Todos os módulos ML', 'SAC e pós-venda', 'Painel financeiro', 'Até 5 usuários'],
      cta: 'Começar com 7 dias grátis', href: '/registro?plan=comandante',
    },
    {
      name: 'Almirante', price: 'R$89,90', period: '/mês', note: '7 dias grátis, sem cartão',
      badge: null as string | null, popular: false,
      features: ['Produtos ilimitados', 'Até 5 contas Mercado Livre', 'Armazém avançado', 'Relatórios avançados', 'Até 10 usuários', 'Suporte prioritário'],
      cta: 'Começar com 7 dias grátis', href: '/registro?plan=almirante',
    },
    {
      name: 'Missão Espacial', price: 'R$119,90', period: '/mês', note: '7 dias grátis, sem cartão',
      badge: null as string | null, popular: false,
      features: ['Tudo ilimitado', 'Contas ML ilimitadas', 'Suporte 24/7 dedicado', 'Onboarding personalizado', 'SLA premium', 'Gerente de conta dedicado'],
      cta: 'Começar com 7 dias grátis', href: '/registro?plan=missao_espacial',
    },
  ],
  annual: [
    {
      name: 'Explorador', price: 'Grátis', period: '', note: 'Para sempre, sem cartão',
      badge: null as string | null, popular: false,
      features: ['Até 10 produtos', '1 conta Mercado Livre', 'Dashboard básico', 'Pedidos em tempo real', 'Suporte por e-mail'],
      cta: 'Começar grátis', href: '/registro',
    },
    {
      name: 'Comandante', price: 'R$39,90', period: '/mês', note: 'cobrado anualmente · economize 20%',
      badge: 'MAIS POPULAR', popular: true,
      features: ['Até 500 produtos', 'Até 3 contas Mercado Livre', 'Todos os módulos ML', 'SAC e pós-venda', 'Painel financeiro', 'Até 5 usuários'],
      cta: 'Começar com 7 dias grátis', href: '/registro?plan=comandante&billing=annual',
    },
    {
      name: 'Almirante', price: 'R$71,90', period: '/mês', note: 'cobrado anualmente · economize 20%',
      badge: null as string | null, popular: false,
      features: ['Produtos ilimitados', 'Até 5 contas Mercado Livre', 'Armazém avançado', 'Relatórios avançados', 'Até 10 usuários', 'Suporte prioritário'],
      cta: 'Começar com 7 dias grátis', href: '/registro?plan=almirante&billing=annual',
    },
    {
      name: 'Missão Espacial', price: 'R$95,90', period: '/mês', note: 'cobrado anualmente · economize 20%',
      badge: null as string | null, popular: false,
      features: ['Tudo ilimitado', 'Contas ML ilimitadas', 'Suporte 24/7 dedicado', 'Onboarding personalizado', 'SLA premium', 'Gerente de conta dedicado'],
      cta: 'Começar com 7 dias grátis', href: '/registro?plan=missao_espacial&billing=annual',
    },
  ],
}

const roadmapItems = [
  { name: 'Shopee',           icon: ShoppingCart, color: 'bg-orange-50 text-orange-600 border-orange-200', dotColor: 'bg-orange-500', status: 'Em breve'  },
  { name: 'Amazon',           icon: Package,      color: 'bg-blue-50 text-blue-600 border-blue-200',       dotColor: 'bg-blue-500',   status: 'Em breve'  },
  { name: 'NF-e completa',    icon: FileText,     color: 'bg-indigo-50 text-indigo-600 border-indigo-100', dotColor: 'bg-indigo-500', status: 'Em breve'  },
  { name: 'Fretes',           icon: Truck,        color: 'bg-slate-50 text-slate-500 border-slate-200',    dotColor: 'bg-slate-400',  status: 'Planejado' },
  { name: 'WhatsApp',         icon: MessageCircle,color: 'bg-green-50 text-green-600 border-green-200',    dotColor: 'bg-green-500',  status: 'Planejado' },
  { name: 'Magazine Luiza',   icon: Globe,        color: 'bg-slate-50 text-slate-500 border-slate-200',    dotColor: 'bg-slate-400',  status: 'Planejado' },
]

/* ── Feature Mockups ──────────────────────────────────────────────────────── */
function MockupProducts() {
  return (
    <div className="bg-[#060a1a] rounded-xl p-4 shadow-xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white">Meus Anúncios</span>
        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">2.031 anúncios</span>
      </div>
      {[
        { name: 'Tênis Esportivo XR-500 Branco',   price: 'R$299', health: 92, status: 'Ativo' },
        { name: 'Camiseta Oversized Premium',      price: 'R$89',  health: 78, status: 'Ativo' },
        { name: 'Mochila Tática Militar 30L',      price: 'R$189', health: 45, status: 'Pausado' },
      ].map(p => (
        <div key={p.name} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-200 truncate font-medium">{p.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${p.health >= 80 ? 'bg-green-400' : p.health >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${p.health}%` }} />
              </div>
              <span className="text-[8px] text-slate-500">{p.health}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-white">{p.price}</p>
            <p className={`text-[8px] mt-0.5 ${p.status === 'Ativo' ? 'text-green-400' : 'text-amber-400'}`}>{p.status}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function MockupMetrics() {
  const data = [45, 62, 55, 78, 60, 88, 72, 91, 68, 85, 79, 95]
  return (
    <div className="bg-[#060a1a] rounded-xl p-4 shadow-xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white">Performance do Mês</span>
        <span className="text-[10px] text-green-400">▲ +24% vs anterior</span>
      </div>
      <div className="flex items-end gap-1 h-16 mb-3">
        {data.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i >= data.length - 3 ? '#6366f1' : 'rgba(99,102,241,0.25)' }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Vendas', value: '1.247', color: 'text-indigo-400' },
          { label: 'Receita', value: 'R$48k', color: 'text-green-400' },
          { label: 'Margem', value: '32%', color: 'text-amber-400' },
        ].map(m => (
          <div key={m.label} className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/5">
            <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[8px] text-slate-500">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockupSac() {
  return (
    <div className="bg-[#060a1a] rounded-xl p-4 shadow-xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white">SAC — Perguntas</span>
        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">3 aguardando</span>
      </div>
      {[
        { q: 'Qual o prazo de entrega para SP?', suggestion: 'O prazo para São Paulo é de 2 a 4 dias úteis via Correios...', time: '5min' },
        { q: 'Tem esse produto na cor azul?', suggestion: 'Olá! Infelizmente disponível apenas na cor preta...', time: '12min' },
      ].map((item, i) => (
        <div key={i} className="mb-3 last:mb-0">
          <p className="text-[9px] text-slate-400 mb-1">{item.time} atrás — {item.q}</p>
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-2.5 h-2.5 text-indigo-400" />
              <span className="text-[8px] text-indigo-400 font-semibold">Sugestão</span>
            </div>
            <p className="text-[9px] text-slate-300 leading-relaxed">{item.suggestion}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [menu,    setMenu]    = useState(false)
  const [billing, setBilling] = useState<Billing>('monthly')

  const plans = plansData[billing]

  return (
    <div className="landing-bg min-h-screen overflow-x-hidden">
      <Suspense fallback={null}>
        <CancelledBanner />
      </Suspense>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim <span className="text-gray-400 font-medium text-sm">ERP</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#funcionalidades" className="hover:text-gray-900 transition-colors">Funcionalidades</a>
            <Link href="/planos"       className="hover:text-gray-900 transition-colors">Planos</Link>
            <Link href="/integracoes"  className="hover:text-gray-900 transition-colors">Integrações</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/registro" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              Começar grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-500" onClick={() => setMenu(v => !v)}>
            {menu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menu && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1">
            <a href="#funcionalidades" onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Funcionalidades</a>
            <Link href="/planos"       onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Planos</Link>
            <Link href="/integracoes"  onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Integrações</Link>
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <Link href="/login"    className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg text-center hover:bg-gray-50 transition-colors">Entrar</Link>
              <Link href="/registro" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg text-center transition-colors">Cadastrar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
                <Warehouse className="w-3.5 h-3.5" />
                Armazém + Mercado Livre + muito mais
              </div>

              <h1 className="text-5xl font-bold text-gray-900 leading-[1.08] mb-5 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                Do armazém ao<br />
                <span className="text-gradient">marketplace.</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
                Controle estoque, anúncios, pedidos, etiquetas e expedição — tudo num só sistema.
                Integração completa com o Mercado Livre, multi-conta, multi-armazém.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link href="/registro" className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
                  Começar grátis <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#funcionalidades" className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
                  Ver funcionalidades
                </a>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Sem cartão de crédito</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Cancele quando quiser</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Integração ML em minutos</span>
              </div>
            </div>

            {/* Dual Mockup */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-center lg:justify-end">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marketplace logos ─────────────────────────────────────────────── */}
      <section className="py-10 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-gray-400 font-semibold uppercase tracking-wider mb-6">
            Integração ativa · Mais marketplaces em desenvolvimento
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-2.5 h-2.5 text-yellow-900" />
              </div>
              <span className="text-sm font-bold text-gray-700">Mercado Livre</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Ativo</span>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-dashed border-orange-200 rounded-xl opacity-60">
              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-2.5 h-2.5 text-orange-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">Shopee</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">Em breve</span>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-dashed border-blue-200 rounded-xl opacity-60">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-2.5 h-2.5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Amazon</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Em breve</span>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-dashed border-gray-200 rounded-xl opacity-40">
              <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                <Globe className="w-2.5 h-2.5 text-slate-500" />
              </div>
              <span className="text-sm font-medium text-gray-400">+Outros</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">Planejado</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problema → Solução ────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">O problema</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Pare de improvisar a sua operação
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Vendedores sérios perdem horas toda semana com ferramentas que não conversam entre si. O Foguetim resolve isso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-red-500" />
                </div>
                <span className="text-sm font-bold text-red-700">Sem o Foguetim</span>
              </div>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.before} className="flex items-start gap-2.5 text-sm text-red-700">
                    <X className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    {p.before}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm font-bold text-green-700">Com o Foguetim</span>
              </div>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.after} className="flex items-start gap-2.5 text-sm text-green-700">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
                    {p.after}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funcionalidades Grid ───────────────────────────────────────────── */}
      <section id="funcionalidades" className="relative z-10 py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Funcionalidades</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Do cadastro do produto até o rastreio da entrega. Um sistema que cobre toda a operação.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {capabilities.map(cap => {
              const Icon = cap.icon
              return (
                <div
                  key={cap.title}
                  className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow ${cap.soon ? 'opacity-70' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${cap.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug">{cap.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{cap.desc}</p>
                  {cap.soon && (
                    <span className="inline-block mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                      Em breve
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Features em detalhe ───────────────────────────────────────────── */}
      <section className="relative z-10 py-6 px-6 bg-white">
        <div className="max-w-5xl mx-auto py-16 space-y-20">

          {/* Armazém */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center mb-5">
                <Warehouse className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                Armazém inteligente e multi-localização
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Cadastre produtos com SKU próprio, variações e kits. Gerencie múltiplos armazéns com localizações, controle movimentações e acompanhe 3 conceitos de custo por produto.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Multi-armazém', 'Variações e kits', 'Movimentações', '3 conceitos de custo'].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <WarehouseMockup />
            </div>
          </div>

          {/* Anúncios ML */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center" style={{ direction: 'rtl' }}>
            <div style={{ direction: 'ltr' }}>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-5">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                Mercado Livre em profundidade
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Gerencie todos os seus anúncios, pedidos, SAC, reputação, promoções e financeiro. Saúde do anúncio em tempo real, atributos corretos por categoria e etiquetas de envio em lote.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Anúncios em massa', 'Saúde do anúncio', 'Atributos ML', 'Etiquetas PDF/ZPL'].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ direction: 'ltr' }}>
              <MockupProducts />
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-600 border border-green-100 flex items-center justify-center mb-5">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                Métricas que importam, dados reais
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Faturamento, ticket médio, produtos mais vendidos e performance por anúncio. Dados diretos da API do Mercado Livre, sem estimativas ou delays.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Faturamento real', 'Ranking de produtos', 'Performance ML', 'Histórico de vendas'].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <MockupMetrics />
            </div>
          </div>

          {/* SAC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center" style={{ direction: 'rtl' }}>
            <div style={{ direction: 'ltr' }}>
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mb-5">
                <MessageCircle className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                Pós-venda e SAC integrado
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Gerencie perguntas, reclamações, devoluções e avaliações num único painel. Sugestões de resposta contextuais para agilizar o atendimento sem perder qualidade.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Perguntas', 'Reclamações', 'Devoluções', 'Avaliações'].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ direction: 'ltr' }}>
              <MockupSac />
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof / confiança ──────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Dados protegidos</p>
              <p className="text-xs text-gray-500">SSL, backups diários e OTP para ações sensíveis</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Integração oficial ML</p>
              <p className="text-xs text-gray-500">API oficial do Mercado Livre, sem acesso a senhas</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Suporte brasileiro</p>
              <p className="text-xs text-gray-500">Feito por vendedores, para vendedores. Fortaleza, CE</p>
            </div>
          </div>
          <p className="text-center text-sm font-semibold text-gray-500 mt-8 italic">
            &ldquo;Feito por vendedores, para vendedores&rdquo;
          </p>
        </div>
      </section>

      {/* ── Planos ────────────────────────────────────────────────────────── */}
      <section id="planos" className="relative z-10 py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Planos</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Planos simples, sem surpresas
            </h2>
            <p className="text-gray-500 mb-8">Comece grátis e cresça no seu ritmo. Sem contratos longos.</p>

            <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${billing === 'annual' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Anual
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl p-8 flex flex-col shadow-sm ${plan.popular ? 'border-2 border-indigo-500 shadow-lg' : 'border border-gray-200'}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <p className="text-sm font-bold text-gray-500 mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{plan.price}</span>
                  {plan.period && <span className="text-gray-400 text-sm mb-1">{plan.period}</span>}
                </div>
                <p className="text-xs text-gray-400 mb-7">{plan.note}</p>

                <Link
                  href={plan.href}
                  className={`block text-center py-3 rounded-lg text-sm font-bold w-full mb-7 transition-all ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Check className={`w-4 h-4 shrink-0 ${plan.popular ? 'text-indigo-500' : 'text-gray-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 space-y-2">
            <p className="text-xs text-gray-400">
              Todos os planos incluem SSL, backups diários e acesso via web e mobile.
            </p>
            <Link href="/planos" className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Ver todos os planos e comparativo completo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Roadmap ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-purple-600 mb-3 uppercase tracking-wider">Roadmap 2026</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              O que está chegando
            </h2>
            <p className="text-gray-500">
              Construindo o ERP mais completo para sellers brasileiros — um módulo de cada vez.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {roadmapItems.map(item => {
              const Icon = item.icon
              return (
                <div key={item.name} className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ${item.color.includes('border') ? '' : 'border-gray-200'}`}>
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{item.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.dotColor}`} />
                    <span className={`text-[11px] font-semibold ${item.status === 'Em breve' ? 'text-amber-600' : 'text-slate-500'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Final ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Comece hoje. É gratuito.
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
            Crie sua conta em menos de 2 minutos e conecte seu Mercado Livre agora mesmo.
          </p>
          <Link href="/registro" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-lg text-base transition-colors">
            Criar conta grátis <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">Sem cartão de crédito. Cancele quando quiser.</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-gray-100 py-14 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Rocket className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                O ERP completo para sellers de marketplace brasileiro.
              </p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Operado por Fio Cabana</p>
                <p>CNPJ: 33.685.241/0001-70</p>
                <a href="mailto:contato@foguetim.com.br" className="hover:text-gray-900 transition-colors block">
                  contato@foguetim.com.br
                </a>
              </div>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider">Produto</p>
              <ul className="space-y-2">
                <li><a href="#funcionalidades" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Funcionalidades</a></li>
                <li><Link href="/planos"        className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Planos</Link></li>
                <li><Link href="/integracoes"   className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Integrações</Link></li>
                <li><a href="#planos"           className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Preços</a></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider">Acesso</p>
              <ul className="space-y-2">
                <li><Link href="/login"    className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Login</Link></li>
                <li><Link href="/registro" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Cadastro grátis</Link></li>
                <li><Link href="/termos"   className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacidade</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider">Empresa</p>
              <ul className="space-y-2">
                <li><Link href="/sobre"   className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sobre</Link></li>
                <li><Link href="/contato" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Contato</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>© 2026 Foguetim ERP — Todos os direitos reservados.</p>
            <p className="italic text-center">
              Feito com 🚀 em Fortaleza, CE · Integrações via APIs oficiais
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
