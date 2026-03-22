'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Rocket, Package, FileText, BarChart2,
  Users, ShoppingCart, Check, ArrowRight,
  Shield, Menu, X, CheckCircle2, Zap, MessageCircle,
  Info, Warehouse, RefreshCw, CalendarDays,
  Printer, Globe, Truck, MapPin, Tags,
  Instagram, Linkedin, Newspaper, Clock,
  ChevronDown, Link2, Star,
} from 'lucide-react'

// ─── FAQ JSON-LD ───────────────────────────────────────────────────────────

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'O Foguetim é gratuito?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim! O plano Explorador é gratuito para sempre, sem necessidade de cartão de crédito. Você pode gerenciar até 10 produtos e conectar 1 conta do Mercado Livre gratuitamente.' } },
    { '@type': 'Question', name: 'Preciso de cartão de crédito para começar?',
      acceptedAnswer: { '@type': 'Answer', text: 'Não. O plano gratuito não requer cartão. Para os planos pagos, você tem 7 dias de teste grátis sem informar dados de pagamento.' } },
    { '@type': 'Question', name: 'Funciona com Shopee?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim! O Foguetim integra com o Mercado Livre e com a Shopee. Gerencie produtos, pedidos e estoque de ambas as plataformas em um único painel. Mais marketplaces estão sendo adicionados.' } },
    { '@type': 'Question', name: 'Posso conectar mais de uma conta do marketplace?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim. O plano Comandante permite até 3 contas do Mercado Livre, e o Almirante até 5. Todos os planos suportam múltiplas contas da Shopee.' } },
    { '@type': 'Question', name: 'Meus dados estão seguros?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim. Utilizamos conexão SSL, backups diários, autenticação OAuth oficial dos marketplaces (nunca pedimos sua senha) e OTP para ações sensíveis na plataforma.' } },
    { '@type': 'Question', name: 'Como funciona o suporte?',
      acceptedAnswer: { '@type': 'Answer', text: 'Suporte por e-mail para todos os planos. O plano Almirante inclui suporte prioritário. O Missão Espacial conta com suporte 24/7 dedicado e gerente de conta.' } },
    { '@type': 'Question', name: 'Posso cancelar a qualquer momento?',
      acceptedAnswer: { '@type': 'Answer', text: 'Sim. Não há contrato de fidelidade. Você pode cancelar sua assinatura a qualquer momento diretamente nas configurações da conta, sem burocracia.' } },
    { '@type': 'Question', name: 'O Foguetim altera meus anúncios automaticamente?',
      acceptedAnswer: { '@type': 'Answer', text: 'Apenas se você ativar a sincronização automática de estoque ou preço. Por padrão, todas as alterações passam por sua aprovação antes de serem aplicadas.' } },
  ],
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Foguetim ERP',
  url: 'https://www.foguetim.com.br',
  logo: 'https://www.foguetim.com.br/logo.png',
  description: 'ERP para vendedores de marketplace no Brasil. Controle estoque, anúncios, pedidos e financeiro do Mercado Livre e Shopee em um só lugar.',
  address: { '@type': 'PostalAddress', addressLocality: 'Fortaleza', addressRegion: 'CE', addressCountry: 'BR' },
  contactPoint: { '@type': 'ContactPoint', email: 'contato@foguetim.com.br', contactType: 'customer support' },
}

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Foguetim ERP',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'ERP completo para vendedores de marketplace — controle estoque, anúncios, pedidos e financeiro do Mercado Livre e Shopee em um só lugar.',
  url: 'https://www.foguetim.com.br',
  inLanguage: 'pt-BR',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', description: 'Plano gratuito disponível' },
  provider: { '@type': 'Organization', name: 'Foguetim ERP', url: 'https://www.foguetim.com.br' },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '47' },
}

// ─── Scroll reveal hook ────────────────────────────────────────────────────

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

// ─── Cancelled banner ──────────────────────────────────────────────────────

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

// ─── Dashboard Mockup ──────────────────────────────────────────────────────

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
            <span className="text-[9px] text-slate-400">ML + Shopee conectados</span>
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
              <div key={i} className="flex-1 rounded-sm"
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

// ─── Warehouse Mockup ──────────────────────────────────────────────────────

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
            { label: 'Total SKUs',     value: '234', color: 'text-cyan-400',  bg: 'bg-cyan-500/10'  },
            { label: 'Em ruptura',     value: '3',   color: 'text-red-400',   bg: 'bg-red-500/10'   },
            { label: 'Estoque baixo',  value: '11',  color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(m => (
            <div key={m.label} className={`${m.bg} rounded-xl p-2.5 border border-white/5`}>
              <p className="text-[8px] text-slate-500 mb-0.5">{m.label}</p>
              <p className={`text-[15px] font-bold leading-none ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {[
            { name: 'Tênis XR-500 (P/M/G)',  sku: 'TNS-001',  qty: 142, mapped: true,  status: 'normal'  },
            { name: 'Camiseta Oversized',     sku: 'CAM-003',  qty: 8,   mapped: true,  status: 'baixo'   },
            { name: 'Mochila Tática 30L',     sku: 'MOC-007',  qty: 0,   mapped: false, status: 'ruptura' },
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

// ─── Mockups ───────────────────────────────────────────────────────────────

function MockupProducts() {
  return (
    <div className="bg-[#060a1a] rounded-xl p-4 shadow-xl border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white">Meus Anúncios</span>
        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">2.031 anúncios</span>
      </div>
      {[
        { name: 'Tênis Esportivo XR-500 Branco',  price: 'R$299', health: 92, status: 'Ativo'   },
        { name: 'Camiseta Oversized Premium',      price: 'R$89',  health: 78, status: 'Ativo'   },
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
          <div key={i} className="flex-1 rounded-t-sm"
            style={{ height: `${h}%`, background: i >= data.length - 3 ? '#6366f1' : 'rgba(99,102,241,0.25)' }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Vendas', value: '1.247', color: 'text-indigo-400' },
          { label: 'Receita', value: 'R$48k', color: 'text-green-400' },
          { label: 'Margem',  value: '32%',   color: 'text-amber-400' },
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
        { q: 'Tem esse produto na cor azul?',    suggestion: 'Olá! Infelizmente disponível apenas na cor preta...', time: '12min' },
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

// ─── Blog Preview ──────────────────────────────────────────────────────────

interface LandingBlogPost {
  id: string; title: string; slug: string; summary: string | null
  category: string; category_slug: string | null
  reading_time_min: number | null; published_at: string; cover_image_url: string | null
}

const BLOG_GRADIENTS: Record<string, string> = {
  'ecommerce-marketplaces':  'from-amber-400 to-amber-600',
  'mercado-livre':           'from-yellow-400 to-yellow-600',
  'gestao-empreendedorismo': 'from-blue-400 to-blue-600',
  'financas-economia':       'from-green-400 to-green-600',
  'fiscal-tributario':       'from-red-400 to-red-600',
  'estoque-logistica':       'from-emerald-400 to-emerald-600',
  'marketing-digital':       'from-pink-400 to-pink-600',
  'setores-nichos':          'from-purple-400 to-purple-600',
  'novidades-foguetim':      'from-violet-400 to-violet-600',
  'ferramentas-tecnologia':  'from-cyan-400 to-cyan-600',
}

function BlogPreview() {
  const [posts, setPosts] = useState<LandingBlogPost[]>([])
  useEffect(() => {
    fetch('/api/blog/posts/popular?limit=3')
      .then(r => r.json())
      .then(d => setPosts((Array.isArray(d.posts) ? d.posts : d.results ?? []).slice(0, 3)))
      .catch(() => {})
  }, [])
  if (!posts.length) return null
  return (
    <section className="relative z-10 py-20 px-6 bg-gray-50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 reveal">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <Newspaper className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Blog Foguetim</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Conteúdo para quem vende online
            </h2>
            <p className="text-gray-500 max-w-lg">
              Dicas de e-commerce, finanças, fiscal, marketing e gestão para empreendedores.
            </p>
          </div>
          <Link href="/blog" className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-300 bg-white px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap shadow-sm">
            Ver todos os artigos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post, i) => {
            const grad = BLOG_GRADIENTS[post.category_slug ?? ''] ?? 'from-violet-400 to-violet-600'
            return (
              <Link key={post.id} href={`/blog/${post.slug}`}
                className={`group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-violet-200 transition-all reveal reveal-delay-${i + 1}`}
              >
                <div className={`h-44 bg-gradient-to-br ${grad} relative overflow-hidden`}>
                  {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="p-5">
                  <span className="inline-block text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full mb-3">{post.category}</span>
                  <h3 className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-2 leading-snug mb-2 text-[15px]">{post.title}</h3>
                  {post.summary && <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{post.summary}</p>}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    {post.reading_time_min && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.reading_time_min} min</span>}
                    <span>{new Date(post.published_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ Accordion ─────────────────────────────────────────────────────────

const faqItems = [
  { q: 'O Foguetim é gratuito?', a: 'Sim! O plano Explorador é gratuito para sempre, sem necessidade de cartão de crédito. Você pode gerenciar até 10 produtos e conectar 1 conta do Mercado Livre gratuitamente.' },
  { q: 'Preciso de cartão de crédito para começar?', a: 'Não. O plano gratuito não requer cartão de crédito. Para planos pagos, você tem 7 dias de teste grátis sem precisar informar dados de pagamento.' },
  { q: 'Funciona com Shopee?', a: 'Sim! O Foguetim integra com Mercado Livre e Shopee. Gerencie produtos, pedidos e estoque de ambas as plataformas em um único painel. Mais marketplaces estão a caminho.' },
  { q: 'Posso conectar mais de uma conta do marketplace?', a: 'Sim. O plano Comandante permite até 3 contas do Mercado Livre, e o Almirante até 5. A Shopee suporta múltiplas contas em todos os planos.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Usamos SSL, backups diários, autenticação OAuth oficial dos marketplaces (nunca solicitamos sua senha) e código OTP para ações sensíveis dentro da plataforma.' },
  { q: 'Como funciona o suporte?', a: 'Suporte por e-mail para todos os planos. Plano Almirante inclui suporte prioritário. Missão Espacial conta com suporte 24/7 dedicado e gerente de conta exclusivo.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Não há contrato de fidelidade. Cancele quando quiser diretamente nas configurações da conta. Sem burocracia.' },
  { q: 'O Foguetim altera meus anúncios automaticamente?', a: 'Apenas se você ativar a sincronização automática. Por padrão, você aprova cada alteração antes de ser aplicada. Você tem controle total.' },
]

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)
  const half = Math.ceil(faqItems.length / 2)
  const col1 = faqItems.slice(0, half)
  const col2 = faqItems.slice(half)

  function FaqItem({ item, idx }: { item: { q: string; a: string }; idx: number }) {
    return (
      <div className={`bg-white border rounded-xl overflow-hidden transition-all ${open === idx ? 'border-indigo-200 shadow-sm' : 'border-gray-200'}`}>
        <button
          onClick={() => setOpen(open === idx ? null : idx)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={open === idx}
        >
          <span className="text-sm font-semibold text-gray-900 leading-snug">{item.q}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open === idx ? 'rotate-180' : ''}`} />
        </button>
        {open === idx && (
          <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
            {item.a}
          </div>
        )}
      </div>
    )
  }

  return (
    <section id="faq" className="relative z-10 py-14 px-6 bg-gray-50 border-t border-gray-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 reveal">
          <p className="text-sm font-semibold text-indigo-600 mb-2 uppercase tracking-wider">FAQ</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Perguntas frequentes
          </h2>
          <p className="text-gray-500 text-sm">Tudo que você precisa saber antes de começar.</p>
        </div>
        {/* 2 colunas no desktop, 1 no mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <div className="space-y-2">
            {col1.map((item, i) => <FaqItem key={i} item={item} idx={i} />)}
          </div>
          <div className="space-y-2">
            {col2.map((item, i) => <FaqItem key={i + half} item={item} idx={i + half} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────

type Billing = 'monthly' | 'annual'

const problems = [
  { before: 'Planilhas para controle de estoque',     after: 'Estoque multi-armazém em tempo real'   },
  { before: 'Abas abertas para cada marketplace',     after: 'Painel unificado, tudo num só lugar'   },
  { before: 'Responder perguntas manualmente',        after: 'SAC integrado com pós-venda completo'  },
  { before: 'Não saber o custo real de cada produto', after: '3 conceitos de custo por produto'      },
]

interface Capability { icon: React.ElementType; title: string; desc: string; color: string; soon?: boolean }
const capabilities: Capability[] = [
  { icon: Warehouse,    title: 'Armazém Multi-canal',       desc: 'Estoque unificado para ML e Shopee. SKU, variações, kits, multi-armazém.',           color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { icon: ShoppingCart, title: 'Mercado Livre Completo',    desc: 'Anúncios, pedidos, SAC, reputação, promoções e financeiro num só painel.',            color: 'bg-blue-50 text-blue-600 border-blue-100'       },
  { icon: Tags,         title: 'Precificação Inteligente',  desc: 'Simulador com tarifas reais do ML e Shopee. Saiba sua margem real antes de publicar.',  color: 'bg-amber-50 text-amber-600 border-amber-100'    },
  { icon: RefreshCw,    title: 'Mapeamento Automático',     desc: 'Conecta produto do armazém com anúncio por SKU/EAN. Sync opt-in por canal.',           color: 'bg-cyan-50 text-cyan-600 border-cyan-100'       },
  { icon: MessageCircle,title: 'SAC Unificado',             desc: 'Perguntas, reclamações e mensagens de ML e Shopee num único painel de atendimento.',   color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { icon: BarChart2,    title: 'Relatórios e Financeiro',   desc: 'Faturamento, conciliação, DRE simplificado. Dados reais, sem estimativas.',            color: 'bg-green-50 text-green-600 border-green-100'    },
  { icon: Users,        title: 'Multi-conta Multi-loja',    desc: 'Gerencie várias contas do ML e Shopee num único painel. Alterne com 1 clique.',        color: 'bg-rose-50 text-rose-600 border-rose-100'       },
  { icon: Shield,       title: 'Segurança com OTP',         desc: 'Ações sensíveis protegidas por código de verificação. Logs de auditoria completos.',   color: 'bg-slate-50 text-slate-600 border-slate-200'    },
]

const plansData = {
  monthly: [
    { name: 'Explorador',      price: 'Grátis',    period: '',     note: 'Para sempre, sem cartão', badge: null as string | null,    popular: false,
      features: ['Até 10 produtos', '1 conta Mercado Livre', 'Dashboard básico', 'Pedidos em tempo real', 'Suporte por e-mail'],
      cta: 'Começar grátis', href: '/cadastro' },
    { name: 'Comandante',      price: 'R$49,90',   period: '/mês', note: '7 dias grátis, sem cartão', badge: 'MAIS POPULAR' as string | null, popular: true,
      features: ['Até 500 produtos', 'Até 3 contas Mercado Livre', 'Todos os módulos ML', 'SAC e pós-venda', 'Painel financeiro', 'Até 5 usuários'],
      cta: 'Começar com 7 dias grátis', href: '/cadastro?plan=comandante' },
    { name: 'Almirante',       price: 'R$89,90',   period: '/mês', note: '7 dias grátis, sem cartão', badge: null as string | null,    popular: false,
      features: ['Produtos ilimitados', 'Até 5 contas Mercado Livre', 'Armazém avançado', 'Relatórios avançados', 'Até 10 usuários', 'Suporte prioritário'],
      cta: 'Começar com 7 dias grátis', href: '/cadastro?plan=almirante' },
    { name: 'Missão Espacial', price: 'R$119,90',  period: '/mês', note: '7 dias grátis, sem cartão', badge: null as string | null,    popular: false,
      features: ['Tudo ilimitado', 'Contas ML ilimitadas', 'Suporte 24/7 dedicado', 'Onboarding personalizado', 'SLA premium', 'Gerente de conta dedicado'],
      cta: 'Começar com 7 dias grátis', href: '/cadastro?plan=missao_espacial' },
  ],
  annual: [
    { name: 'Explorador',      price: 'Grátis',    period: '',     note: 'Para sempre, sem cartão',                   badge: null as string | null,    popular: false,
      features: ['Até 10 produtos', '1 conta Mercado Livre', 'Dashboard básico', 'Pedidos em tempo real', 'Suporte por e-mail'],
      cta: 'Começar grátis', href: '/cadastro' },
    { name: 'Comandante',      price: 'R$39,90',   period: '/mês', note: 'cobrado anualmente · economize 20%',        badge: 'MAIS POPULAR' as string | null, popular: true,
      features: ['Até 500 produtos', 'Até 3 contas Mercado Livre', 'Todos os módulos ML', 'SAC e pós-venda', 'Painel financeiro', 'Até 5 usuários'],
      cta: 'Começar com 7 dias grátis', href: '/cadastro?plan=comandante&billing=annual' },
    { name: 'Almirante',       price: 'R$71,90',   period: '/mês', note: 'cobrado anualmente · economize 20%',        badge: null as string | null,    popular: false,
      features: ['Produtos ilimitados', 'Até 5 contas Mercado Livre', 'Armazém avançado', 'Relatórios avançados', 'Até 10 usuários', 'Suporte prioritário'],
      cta: 'Começar com 7 dias grátis', href: '/cadastro?plan=almirante&billing=annual' },
    { name: 'Missão Espacial', price: 'R$95,90',   period: '/mês', note: 'cobrado anualmente · economize 20%',        badge: null as string | null,    popular: false,
      features: ['Tudo ilimitado', 'Contas ML ilimitadas', 'Suporte 24/7 dedicado', 'Onboarding personalizado', 'SLA premium', 'Gerente de conta dedicado'],
      cta: 'Começar com 7 dias grátis', href: '/cadastro?plan=missao_espacial&billing=annual' },
  ],
}

const roadmapItems = [
  { name: 'NF-e completa',    icon: FileText,      color: 'bg-indigo-50 text-indigo-600 border-indigo-100', dotColor: 'bg-indigo-500', status: 'Em breve'  },
  { name: 'Fretes',           icon: Truck,         color: 'bg-slate-50 text-slate-500 border-slate-200',    dotColor: 'bg-slate-400',  status: 'Planejado' },
  { name: 'WhatsApp',         icon: MessageCircle, color: 'bg-green-50 text-green-600 border-green-200',    dotColor: 'bg-green-500',  status: 'Planejado' },
  { name: 'Magazine Luiza',   icon: Globe,         color: 'bg-slate-50 text-slate-500 border-slate-200',    dotColor: 'bg-slate-400',  status: 'Planejado' },
  { name: 'Amazon',           icon: Package,       color: 'bg-blue-50 text-blue-600 border-blue-200',       dotColor: 'bg-blue-500',   status: 'Em breve'  },
  { name: 'Financeiro Avançado', icon: BarChart2,  color: 'bg-green-50 text-green-600 border-green-100',    dotColor: 'bg-green-500',  status: 'Planejado' },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menu,    setMenu]    = useState(false)
  const [billing, setBilling] = useState<Billing>('monthly')

  useScrollReveal()

  const plans = plansData[billing]

  return (
    <div className="landing-bg min-h-screen overflow-x-hidden">
      {/* JSON-LD schemas */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />

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
            <a href="#como-funciona"   className="hover:text-gray-900 transition-colors">Como funciona</a>
            <Link href="/planos"       className="hover:text-gray-900 transition-colors">Planos</Link>
            <a href="#faq"             className="hover:text-gray-900 transition-colors">FAQ</a>
            <Link href="/blog"         className="hover:text-gray-900 transition-colors">Blog</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/cadastro" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              Começar grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-500" onClick={() => setMenu(v => !v)} aria-label="Menu">
            {menu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menu && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1">
            <a href="#funcionalidades" onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Funcionalidades</a>
            <a href="#como-funciona"   onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Como funciona</a>
            <Link href="/planos"       onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Planos</Link>
            <a href="#faq"             onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">FAQ</a>
            <Link href="/blog"         onClick={() => setMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Blog</Link>
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <Link href="/login"    className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg text-center hover:bg-gray-50 transition-colors">Entrar</Link>
              <Link href="/cadastro" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg text-center transition-colors">Cadastrar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-24 px-6 bg-white overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
                <Zap className="w-3.5 h-3.5" />
                Mercado Livre + Shopee — num só sistema
              </div>

              <h1 className="text-5xl font-bold text-gray-900 leading-[1.08] mb-5 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                O ERP que entende<br />
                <span className="text-gradient">o vendedor de marketplace</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
                Controle estoque, anúncios, pedidos e financeiro do Mercado Livre e Shopee em um só lugar. Comece grátis.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-7">
                <Link href="/cadastro" className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-indigo-200">
                  Começar grátis <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#funcionalidades" className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm">
                  Ver funcionalidades
                </a>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Sem cartão de crédito</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Cancele quando quiser</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Integração em minutos</span>
              </div>
            </div>

            {/* Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl blur-2xl" />
                <div className="relative" style={{ transform: 'perspective(1200px) rotateY(-6deg) rotateX(2deg)' }}>
                  <DashboardMockup />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="py-8 px-6 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '2+',    label: 'Marketplaces integrados', sub: 'ML e Shopee ativos' },
              { value: '40+',   label: 'Funcionalidades',          sub: 'Do armazém ao SAC'  },
              { value: '100%',  label: 'Suporte em português',     sub: 'Por vendedores reais' },
              { value: 'Grátis', label: 'Para começar',            sub: 'Sem cartão de crédito' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-3xl font-bold text-indigo-600 leading-none mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {stat.value}
                </span>
                <span className="text-sm font-semibold text-gray-800">{stat.label}</span>
                <span className="text-xs text-gray-400 mt-0.5">{stat.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Logos / Prova social ─────────────────────────────────────────── */}
      <section className="py-10 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-gray-400 font-semibold uppercase tracking-wider mb-6">
            Integramos com os maiores marketplaces do Brasil
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* ML - Ativo */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-2.5 h-2.5 text-yellow-900" />
              </div>
              <span className="text-sm font-bold text-gray-700">Mercado Livre</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Ativo</span>
            </div>
            {/* Shopee - Ativo */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-orange-200 rounded-xl shadow-sm">
              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-2.5 h-2.5 text-orange-500" />
              </div>
              <span className="text-sm font-bold text-gray-700">Shopee</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Ativo</span>
            </div>
            {/* Amazon - Em breve */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-dashed border-blue-200 rounded-xl opacity-60">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-2.5 h-2.5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Amazon</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Em breve</span>
            </div>
            {/* Outros */}
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

      {/* ── Problema → Solução ───────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-red-500 mb-3 uppercase tracking-wider">O problema</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Cansado de gerenciar tudo em planilhas?
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Vendedores sérios perdem horas toda semana com ferramentas que não conversam entre si.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 reveal">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-red-500" />
                </div>
                <span className="text-sm font-bold text-red-700">Sem o Foguetim</span>
              </div>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.before} className="flex items-start gap-2.5 text-sm text-red-700">
                    <X className="w-4 h-4 shrink-0 mt-0.5 text-red-400" /> {p.before}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6 reveal reveal-delay-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm font-bold text-green-700">Com o Foguetim</span>
              </div>
              <ul className="space-y-3">
                {problems.map(p => (
                  <li key={p.after} className="flex items-start gap-2.5 text-sm text-green-700">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-500" /> {p.after}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funcionalidades Grid ─────────────────────────────────────────── */}
      <section id="funcionalidades" className="relative z-10 py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Funcionalidades</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Do cadastro do produto até o rastreio da entrega. Um sistema que cobre toda a operação.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon
              return (
                <div key={cap.title} className={`reveal reveal-delay-${(i % 4) + 1} bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}>
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${cap.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug">{cap.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{cap.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Features em detalhe ─────────────────────────────────────────── */}
      <section className="relative z-10 py-6 px-6 bg-white">
        <div className="max-w-5xl mx-auto py-16 space-y-20">

          {/* Armazém */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="reveal">
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
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-center md:justify-end reveal reveal-delay-1">
              <WarehouseMockup />
            </div>
          </div>

          {/* Anúncios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center" style={{ direction: 'rtl' }}>
            <div style={{ direction: 'ltr' }} className="reveal">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-5">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                Mercado Livre e Shopee em profundidade
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Gerencie todos os seus anúncios, pedidos, SAC, reputação, promoções e financeiro. Saúde do anúncio em tempo real e etiquetas de envio em lote.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Anúncios em massa', 'Saúde do anúncio', 'Atributos ML', 'Etiquetas PDF/ZPL'].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ direction: 'ltr' }} className="reveal reveal-delay-1">
              <MockupProducts />
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="reveal">
              <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-600 border border-green-100 flex items-center justify-center mb-5">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                Métricas que importam, dados reais
              </h3>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Faturamento, ticket médio, produtos mais vendidos e performance por anúncio. Dados diretos da API dos marketplaces, sem estimativas ou delays.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Faturamento real', 'Ranking de produtos', 'Performance ML', 'Histórico de vendas'].map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-center md:justify-end reveal reveal-delay-1">
              <MockupMetrics />
            </div>
          </div>

          {/* SAC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center" style={{ direction: 'rtl' }}>
            <div style={{ direction: 'ltr' }} className="reveal">
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
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-600">{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ direction: 'ltr' }} className="reveal reveal-delay-1">
              <MockupSac />
            </div>
          </div>
        </div>
      </section>

      {/* ── Como Funciona ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="relative z-10 py-24 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Como funciona</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Comece a usar em 3 passos
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Sem instalação, sem configuração complicada. Em minutos você já está operando.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting arrows (desktop) */}
            <div className="hidden md:block absolute top-12 left-[33%] right-[33%] h-0.5 bg-gradient-to-r from-indigo-200 to-indigo-200 z-0" />
            {[
              {
                step: '1',
                title: 'Crie sua conta grátis',
                desc: 'Cadastro em 30 segundos. Sem cartão, sem burocracia. Acesse direto pelo navegador.',
                icon: Rocket,
                color: 'bg-indigo-600',
              },
              {
                step: '2',
                title: 'Conecte seu marketplace',
                desc: 'Autorize o acesso ao Mercado Livre ou Shopee com 1 clique via OAuth seguro.',
                icon: Link2,
                color: 'bg-purple-600',
              },
              {
                step: '3',
                title: 'Gerencie tudo num só lugar',
                desc: 'Pedidos, estoque, preços e SAC do ML e Shopee centralizados. Operação simplificada.',
                icon: CheckCircle2,
                color: 'bg-green-600',
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`reveal reveal-delay-${i + 1} relative z-10 bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center`}>
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="text-center mt-10">
            <Link href="/cadastro" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-indigo-200">
              Criar conta grátis agora <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Social proof / confiança ─────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield,       bg: 'bg-green-100',  color: 'text-green-600',  title: 'Dados protegidos',     desc: 'SSL, backups diários e OTP para ações sensíveis' },
              { icon: CheckCircle2, bg: 'bg-yellow-100', color: 'text-yellow-700', title: 'Integração oficial',   desc: 'API oficial do Mercado Livre e Shopee, sem acesso a senhas' },
              { icon: MapPin,       bg: 'bg-indigo-100', color: 'text-indigo-600', title: 'Suporte brasileiro',   desc: 'Feito por vendedores, para vendedores. Fortaleza, CE' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`text-center reveal reveal-delay-${i + 1}`}>
                  <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Planos ──────────────────────────────────────────────────────── */}
      <section id="planos" className="relative z-10 py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 reveal">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Planos</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Planos simples, sem surpresas
            </h2>
            <p className="text-gray-500 mb-8">Comece grátis e cresça no seu ritmo. Sem contratos longos.</p>
            <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <button onClick={() => setBilling('monthly')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Mensal
              </button>
              <button onClick={() => setBilling('annual')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${billing === 'annual' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Anual <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map((plan, i) => (
              <div key={plan.name} className={`reveal reveal-delay-${(i % 4) + 1} relative bg-white rounded-2xl p-8 flex flex-col shadow-sm ${plan.popular ? 'border-2 border-indigo-500 shadow-xl' : 'border border-gray-200'}`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">{plan.badge}</span>
                  </div>
                )}
                <p className="text-sm font-bold text-gray-500 mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{plan.price}</span>
                  {plan.period && <span className="text-gray-400 text-sm mb-1">{plan.period}</span>}
                </div>
                <p className="text-xs text-gray-400 mb-7">{plan.note}</p>
                <Link href={plan.href} className={`block text-center py-3 rounded-lg text-sm font-bold w-full mb-7 transition-all ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
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
            <p className="text-xs text-gray-400">Todos os planos incluem SSL, backups diários e acesso via web e mobile.</p>
            <Link href="/planos" className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Ver todos os planos e comparativo completo →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Depoimentos ─────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Depoimentos</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              O que vendedores dizem
            </h2>
            <p className="text-gray-500">Quem usa o Foguetim não volta para planilhas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Rafael M.',
                role: 'Vendedor no Mercado Livre há 6 anos',
                avatar: '🧔',
                stars: 5,
                text: 'Antes eu perdia 2 horas por dia conferindo estoque em planilha. Com o Foguetim, abro o dashboard e já sei tudo. Minha operação triplicou sem precisar contratar mais ninguém.',
              },
              {
                name: 'Camila T.',
                role: 'Loja Shopee com +8k vendas',
                avatar: '👩',
                stars: 5,
                text: 'O mapeamento automático me salvou. Conecto um produto do armazém ao anúncio em segundos. Acabou o estoque divergente entre ML e Shopee. Vale cada centavo do plano.',
              },
              {
                name: 'Diego S.',
                role: 'Seller multi-loja (ML + Shopee)',
                avatar: '👨‍💼',
                stars: 5,
                text: 'Gerencio 3 contas do Mercado Livre e 2 da Shopee no mesmo painel. O SAC unificado é incrível — respondo perguntas das duas plataformas sem sair da tela.',
              },
            ].map((t, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} bg-gray-50 border border-gray-200 rounded-2xl p-6`}>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-5 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-lg">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 reveal">
            <p className="text-sm font-semibold text-purple-600 mb-3 uppercase tracking-wider">Roadmap 2026</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>O que está chegando</h2>
            <p className="text-gray-500">Construindo o ERP mais completo para sellers brasileiros — um módulo de cada vez.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {roadmapItems.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={item.name} className={`reveal reveal-delay-${(i % 3) + 1} bg-white border rounded-xl p-4 hover:shadow-md transition-shadow`} style={{ borderColor: 'rgb(229 231 235)' }}>
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{item.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.dotColor}`} />
                    <span className={`text-[11px] font-semibold ${item.status === 'Em breve' ? 'text-amber-600' : 'text-slate-500'}`}>{item.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <FaqSection />

      {/* ── Blog preview ─────────────────────────────────────────────────── */}
      <BlogPreview />

      {/* ── CTA Final ───────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-4">Pronto para começar?</p>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Pronto para crescer suas vendas?
          </h2>
          <p className="text-lg text-indigo-200 mb-8 max-w-lg mx-auto">
            Comece grátis hoje. Sem cartão, sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/cadastro" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-indigo-700 font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-xl">
              Criar conta grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="mailto:contato@foguetim.com.br" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white/60 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors">
              Falar com a equipe
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-indigo-200">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Sem cartão</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Cancele quando quiser</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Suporte em português</span>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 bg-slate-900 text-slate-300">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Rocket className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-5">
                O ERP do marketplace brasileiro. Do armazém ao cliente, tudo num só lugar.
              </p>
              <div className="text-xs text-slate-500 space-y-1">
                <p>FIO CABANA IND. E COM. DE CONF. LTDA</p>
                <p>CNPJ: 33.685.241/0001-70</p>
                <p>Fortaleza — CE — Brasil</p>
                <a href="mailto:contato@foguetim.com.br" className="text-slate-400 hover:text-white transition-colors inline-block mt-1">
                  contato@foguetim.com.br
                </a>
              </div>
            </div>

            {/* Foguetim */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Foguetim</p>
              <ul className="space-y-2.5">
                {[{ href: '/sobre', label: 'Sobre' }, { href: '/planos', label: 'Planos' }, { href: '/privacidade', label: 'Privacidade' }, { href: '/termos', label: 'Termos de Uso' }].map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>

            {/* Produto */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Produto</p>
              <ul className="space-y-2.5">
                <li><a href="#funcionalidades" className="text-sm text-slate-400 hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#como-funciona"   className="text-sm text-slate-400 hover:text-white transition-colors">Como Funciona</a></li>
                <li><Link href="/integracoes"  className="text-sm text-slate-400 hover:text-white transition-colors">Integrações</Link></li>
                <li><Link href="/planos"       className="text-sm text-slate-400 hover:text-white transition-colors">Preços</Link></li>
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Recursos</p>
              <ul className="space-y-2.5">
                <li><Link href="/ajuda"     className="text-sm text-slate-400 hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><Link href="/blog"      className="text-sm text-slate-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/changelog" className="text-sm text-slate-400 hover:text-white transition-colors">Changelog</Link></li>
                <li><a href="#faq"          className="text-sm text-slate-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Suporte */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Suporte</p>
              <ul className="space-y-2.5">
                <li><Link href="/contato" className="text-sm text-slate-400 hover:text-white transition-colors">Contato</Link></li>
                <li><a href="mailto:contato@foguetim.com.br" className="text-sm text-slate-400 hover:text-white transition-colors">contato@foguetim.com.br</a></li>
                <li><a href="#faq" className="text-sm text-slate-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              <p>© {new Date().getFullYear()} Foguetim ERP. Todos os direitos reservados.</p>
              <p className="mt-0.5">Feito com 🚀 em Fortaleza, CE · Integrações via APIs oficiais</p>
            </div>
            <div className="flex items-center gap-2">
              <a href="https://instagram.com/foguetim.erp" target="_blank" rel="noopener noreferrer" title="Instagram"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/company/foguetim" target="_blank" rel="noopener noreferrer" title="LinkedIn"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
