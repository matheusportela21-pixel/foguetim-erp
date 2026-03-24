'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Package, DollarSign, ShoppingCart,
  AlertTriangle, ArrowUpRight, ShoppingBag, MessageCircle,
  Truck, FileCheck, Plus, Tag, Calculator, Zap, BarChart3,
  Eye, Clock, Megaphone, Bell, Sparkles, Loader2, Link2, ShieldCheck, Menu,
  Shield, ChevronRight, MessageSquare, Archive, Activity, Calendar,
  Wrench, X, ExternalLink, ChevronDown, BookOpen,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { getGreeting, formatBrasiliaDate, daysUntil } from '@/lib/utils/timezone'
import { getUpcomingEvents } from '@/lib/data/datas-comemorativas'
import { DevBanner } from '@/components/DevBanner'
import { useConnectedMarketplaces } from '@/lib/hooks/useConnectedMarketplaces'
import OnboardingWizard from '@/components/OnboardingWizard'

/* ── ML Metrics type ────────────────────────────────────────────────── */
interface MLMetrics {
  connected:        boolean
  nickname?:        string
  totalActive?:     number
  totalOrders30d?:  number
  revenue30d?:      number
  avgTicket?:       number
  pendingQuestions?: number
}

/* ── Shopee Metrics type ─────────────────────────────────────────────── */
interface ShopeeMetrics {
  connected:       boolean
  shop_name?:      string
  shop_id?:        number
  total_products?: number
}

interface ShopeeKpiData {
  ordersCount:   number | null
  productsCount: number | null
  loading:       boolean
}

/* ── Reputation mini type ───────────────────────────────────────────────── */
interface ReputaMini {
  connected: boolean
  nickname?: string
  seller_reputation?: {
    level_id: string | null
    power_seller_status: string | null
  }
  error?: string
}

const LEVEL_CFG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  green:       { label: 'Verde',    color: 'text-green-400',  bg: 'bg-green-500/10',  emoji: '🟢' },
  light_green: { label: 'Amarelo',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', emoji: '🟡' },
  yellow:      { label: 'Laranja',  color: 'text-orange-400', bg: 'bg-orange-500/10', emoji: '🟠' },
  orange:      { label: 'Vermelho', color: 'text-red-400',    bg: 'bg-red-500/10',    emoji: '🔴' },
  red:         { label: 'Crítico',  color: 'text-red-500',    bg: 'bg-red-600/15',    emoji: '🚨' },
}

/* ── Announcement & Changelog types ─────────────────────────────────────── */
interface Announcement {
  id:             string
  title:          string
  content:        string
  type:           'info' | 'warning' | 'success' | 'urgent'
  link:           string | null
  is_dismissible: boolean
  starts_at:      string
}

interface ChangelogEntry {
  id:           string
  version:      string
  title:        string
  description:  string
  details:      string | null
  category:     'feature' | 'fix' | 'improvement' | 'security'
  published_at: string
}

const ANNOUNCEMENT_COLORS: Record<string, { border: string; bg: string; dot: string }> = {
  info:    { border: 'border-blue-500/30',   bg: 'bg-blue-500/5',   dot: 'bg-blue-400'   },
  success: { border: 'border-green-500/30',  bg: 'bg-green-500/5',  dot: 'bg-green-400'  },
  warning: { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  dot: 'bg-amber-400'  },
  urgent:  { border: 'border-red-500/30',    bg: 'bg-red-500/5',    dot: 'bg-red-400 animate-pulse' },
}

const CHANGELOG_CATEGORY: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  feature:     { icon: Sparkles,   color: 'text-purple-400 bg-purple-500/10', label: 'Feature'     },
  fix:         { icon: Wrench,     color: 'text-blue-400 bg-blue-500/10',     label: 'Correção'    },
  improvement: { icon: TrendingUp, color: 'text-green-400 bg-green-500/10',   label: 'Melhoria'    },
  security:    { icon: Shield,     color: 'text-red-400 bg-red-500/10',       label: 'Segurança'   },
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/* ── Task dot ──────────────────────────────────────────────────────────── */
function Dot({ level }: { level: 'ok' | 'warn' | 'danger' | 'muted' }) {
  const cls = { ok: 'bg-green-400', warn: 'bg-amber-400', danger: 'bg-red-400 animate-pulse', muted: 'bg-slate-600' }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${cls[level]}`} />
}

/* ── Empty state ───────────────────────────────────────────────────────── */
function EmptyCard({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}

/* ── KPI Skeleton ──────────────────────────────────────────────────────── */
function KpiSkeleton() {
  return (
    <div className="glass-card p-4 rounded-2xl animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-2.5 w-24 bg-white/5 rounded" />
        <div className="w-8 h-8 rounded-xl bg-white/5" />
      </div>
      <div className="h-6 w-20 bg-white/5 rounded mb-2" />
      <div className="h-2 w-32 bg-white/5 rounded" />
    </div>
  )
}

/* ── KPI Tooltip ───────────────────────────────────────────────────────── */
function KpiTooltip({ text }: { text: string }) {
  return (
    <div className="absolute bottom-full left-0 mb-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a1f2e] border border-white/[0.10] text-[11px] text-slate-300 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-xl">
      {text}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  useEffect(() => { document.title = 'Dashboard — Foguetim ERP' }, [])
  const [infoTab, setInfoTab]   = useState<'avisos' | 'updates'>('avisos')
  const [metrics, setMetrics]   = useState<MLMetrics | null>(null)
  const [mlLoading, setMlLoading] = useState(true)
  const [reputa, setReputa]     = useState<ReputaMini | null>(null)
  const [reputaLoading, setReputaLoading] = useState(true)
  const [urgentClaims, setUrgentClaims] = useState(0)
  const [rupturasCount, setRupturasCount] = useState(0)
  const [healthScore, setHealthScore] = useState<number | null>(null)
  const [greeting, setGreeting] = useState('Olá')       // neutral until hydrated
  const [todayStr,  setTodayStr] = useState('')
  const [nextHoliday, setNextHoliday] = useState<{ nome: string; icone: string; days: number } | null>(null)
  const [announcements,    setAnnouncements]    = useState<Announcement[]>([])
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([])
  const [changelogLoading, setChangelogLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [finData, setFinData] = useState<{ receita_bruta: number; taxas_ml: number; receita_liquida: number } | null>(null)
  const [shopeeMetrics, setShopeeMetrics] = useState<ShopeeMetrics | null>(null)
  const [shopeeKpi, setShopeeKpi] = useState<ShopeeKpiData>({ ordersCount: null, productsCount: null, loading: true })
  const { user, profile } = useAuth()
  const { hasML, hasShopee, loading: mktLoading } = useConnectedMarketplaces()
  const anyMarketplace = hasML || hasShopee

  const firstName = (
    user?.user_metadata?.name?.split(' ')[0] ||
    profile?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'vendedor'
  )

  // Set greeting, date and next holiday client-side using Brasília timezone (avoids SSR UTC mismatch)
  useEffect(() => {
    setGreeting(getGreeting())
    setTodayStr(formatBrasiliaDate())
    const next = getUpcomingEvents().find(e => daysUntil(e.data) >= 0 && daysUntil(e.data) <= 30)
    if (next) setNextHoliday({ nome: next.nome, icone: next.icone, days: daysUntil(next.data) })
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/metrics')
      .then(r => r.json())
      .then((d: MLMetrics) => setMetrics(d))
      .catch(() => setMetrics({ connected: false }))
      .finally(() => setMlLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/reputacao')
      .then(r => r.json())
      .then((d: ReputaMini) => setReputa(d))
      .catch(() => setReputa({ connected: false }))
      .finally(() => setReputaLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/reclamacoes?status=opened')
      .then(r => r.json())
      .then((d: { summary?: { seller_action_required?: number } }) => {
        setUrgentClaims(d.summary?.seller_action_required ?? 0)
      })
      .catch(() => { /* silent — dashboard não deve quebrar por isso */ })
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/estoque')
      .then(r => r.json())
      .then((d: { summary?: { ruptura?: number } }) => {
        setRupturasCount(d.summary?.ruptura ?? 0)
      })
      .catch(() => { /* silent */ })
  }, [])

  useEffect(() => {
    // Use sessionStorage cache if available (15min TTL) — avoid extra ML call
    try {
      const raw = sessionStorage.getItem('ml_saude_cache')
      if (raw) {
        const cached = JSON.parse(raw) as { data: { score?: number }; ts: number }
        if (Date.now() - cached.ts < 15 * 60 * 1000 && typeof cached.data.score === 'number') {
          setHealthScore(cached.data.score)
          return
        }
      }
    } catch { /* ignore */ }
    fetch('/api/mercadolivre/saude')
      .then(r => r.json())
      .then((d: { score?: number; connected?: boolean }) => {
        if (d.connected && typeof d.score === 'number') setHealthScore(d.score)
      })
      .catch(() => { /* silent */ })
  }, [])

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then((d: { announcements?: Announcement[] }) => setAnnouncements(d.announcements ?? []))
      .catch(() => { /* silent */ })
  }, [])

  useEffect(() => {
    fetch('/api/changelog?limit=5')
      .then(r => r.json())
      .then((d: { entries?: ChangelogEntry[] }) => setChangelogEntries(d.entries ?? []))
      .catch(() => { /* silent */ })
      .finally(() => setChangelogLoading(false))
  }, [])

  useEffect(() => {
    if (!metrics?.connected) return
    fetch('/api/mercadolivre/financeiro?period=mes')
      .then(r => r.json())
      .then((d: { receita_bruta?: number; taxas_ml?: number; receita_liquida?: number }) => {
        if (typeof d.receita_bruta === 'number') {
          setFinData({ receita_bruta: d.receita_bruta, taxas_ml: d.taxas_ml ?? 0, receita_liquida: d.receita_liquida ?? 0 })
        }
      })
      .catch(() => { /* silent */ })
  }, [metrics?.connected])

  useEffect(() => {
    if (!hasShopee) return
    fetch('/api/shopee/status')
      .then(r => r.json())
      .then((d: ShopeeMetrics) => setShopeeMetrics(d))
      .catch(() => setShopeeMetrics({ connected: false }))
  }, [hasShopee])

  // Fetch Shopee KPIs (orders count + products count) — only when Shopee connected
  useEffect(() => {
    if (!hasShopee) { setShopeeKpi({ ordersCount: null, productsCount: null, loading: false }); return }
    setShopeeKpi(prev => ({ ...prev, loading: true }))
    Promise.all([
      fetch('/api/shopee/orders?days=30&page_size=100')
        .then(r => r.json())
        .then((d: { response?: { order_list?: unknown[] } }) => d.response?.order_list?.length ?? 0)
        .catch(() => null),
      fetch('/api/shopee/products?item_status=NORMAL&page_size=100')
        .then(r => r.json())
        .then((d: { response?: { total_count?: number } }) => d.response?.total_count ?? null)
        .catch(() => null),
    ]).then(([ordersCount, productsCount]) => {
      setShopeeKpi({ ordersCount, productsCount, loading: false })
    })
  }, [hasShopee])

  // When ML is known to be disconnected, stop mlLoading so KPI section doesn't wait forever
  useEffect(() => {
    if (!mktLoading && !hasML) {
      setMlLoading(false)
    }
  }, [mktLoading, hasML])

  const dismissAnnouncement = useCallback(async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    await fetch('/api/announcements/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id }),
    }).catch(() => { /* silently ignore — already removed from UI */ })
  }, [])

  /* Derived KPI values */
  const ml = metrics
  const revenue   = ml?.connected ? fmtBRL(ml.revenue30d ?? 0)       : 'R$ 0,00'
  const orders    = ml?.connected ? String(ml.totalOrders30d ?? 0)    : '0'
  const active    = ml?.connected ? String(ml.totalActive ?? 0)       : '0'
  const questions = ml?.connected ? (ml.pendingQuestions ?? 0)        : 0

  const dotLevel = (n: number): 'ok' | 'warn' | 'danger' | 'muted' =>
    !ml?.connected ? 'muted' : n > 5 ? 'danger' : n > 0 ? 'warn' : 'ok'

  /* Count of connected marketplaces */
  const connectedCount = (hasML ? 1 : 0) + (hasShopee ? 1 : 0)

  /* Reputation level for ML channel card */
  const reputaLvlKey = reputa?.seller_reputation?.level_id ?? 'green'
  const reputaLvl = LEVEL_CFG[reputaLvlKey] ?? LEVEL_CFG.green

  return (
    <div className="space-y-6">
      <DevBanner />

      {/* ── Onboarding wizard ── */}
      <OnboardingWizard isAdmin={profile?.role === 'super_admin'} />

        {/* ── Greeting ── */}
        <div className="animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                <span className="text-white">{greeting}, </span>
                <span className="text-gradient-violet">{firstName}!</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                {ml?.connected
                  ? `Conta ML: ${ml.nickname} · dados dos últimos 30 dias`
                  : anyMarketplace
                    ? 'Marketplace conectado — dados disponíveis.'
                    : 'Conecte seus canais de venda para ver seus dados em tempo real.'}
              </p>
            </div>
            {todayStr && (
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">{todayStr}</p>
                {nextHoliday && (
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {nextHoliday.icone} {nextHoliday.nome}
                    {nextHoliday.days === 0
                      ? ' · hoje!'
                      : nextHoliday.days === 1
                        ? ' · amanhã'
                        : ` · em ${nextHoliday.days} dias`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Urgent claims alert ── */}
        {hasML && urgentClaims > 0 && (
          <div className="glass-card border-l-4 border-l-red-500 rounded-xl p-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-300">
                  {urgentClaims} reclamação{urgentClaims !== 1 ? 'ões' : ''} {urgentClaims !== 1 ? 'precisam' : 'precisa'} de ação urgente
                </p>
                <p className="text-xs text-red-400">
                  Responda em até 48h para proteger sua reputação
                </p>
              </div>
              <Link href="/dashboard/reclamacoes" className="ml-auto shrink-0 text-sm text-red-400 hover:text-red-300 font-semibold transition-colors">
                Ver agora →
              </Link>
            </div>
          </div>
        )}

        {/* ── Perguntas pendentes ML alert ── */}
        {questions > 0 && ml?.connected && (
          <Link href="/dashboard/sac">
            <div className="flex items-center gap-3 p-4 glass-card border-l-4 border-l-amber-500 rounded-xl hover:shadow-glow-sm transition-all">
              <MessageSquare className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {questions} pergunta{questions !== 1 ? 's' : ''} sem resposta no Mercado Livre
                </p>
                <p className="text-xs text-amber-400/80 mt-0.5">Responda rapidamente para melhorar sua reputação</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
          </Link>
        )}

        {/* ── Ruptura de estoque alert ── */}
        {hasML && rupturasCount > 0 && (
          <Link href="/dashboard/estoque?filter=ruptura">
            <div className="flex items-center gap-3 p-4 glass-card border-l-4 border-l-red-500 rounded-xl hover:shadow-glow-sm transition-all">
              <Archive className="w-5 h-5 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {rupturasCount} anúncio{rupturasCount !== 1 ? 's' : ''} com estoque zerado
                </p>
                <p className="text-xs text-red-400 mt-0.5">Clique para ver e atualizar</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
            </div>
          </Link>
        )}

        {/* ── Health score alert ── */}
        {hasML && healthScore !== null && healthScore < 70 && (
          <Link href="/dashboard/saude">
            <div className={`flex items-center gap-3 p-4 glass-card rounded-xl border-l-4 hover:shadow-glow-sm transition-all ${
              healthScore < 50 ? 'border-l-red-500' : 'border-l-yellow-500'
            }`}>
              <Activity className={`w-5 h-5 shrink-0 ${healthScore < 50 ? 'text-red-400' : 'text-yellow-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {healthScore < 50 ? 'Atenção: sua conta precisa de cuidados urgentes' : 'Atenção: sua conta precisa de cuidados'}
                </p>
                <p className={`text-xs mt-0.5 ${healthScore < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                  Score de saúde: {healthScore}/100 — Clique para ver detalhes e alertas
                </p>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${healthScore < 50 ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
          </Link>
        )}

        {/* ── Próxima data comemorativa ── */}
        {nextHoliday && nextHoliday.days <= 14 && (
          <Link href="/dashboard/calendario">
            <div className="flex items-center gap-3 p-4 glass-card rounded-xl hover:border-primary-500/30 transition-all">
              <Calendar className="w-5 h-5 text-primary-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {nextHoliday.icone} {nextHoliday.nome}{' '}
                  {nextHoliday.days === 0 ? '· hoje!' : nextHoliday.days === 1 ? '· amanhã' : `· em ${nextHoliday.days} dias`}
                </p>
                <p className="text-xs text-primary-400/70 mt-0.5">Clique para planejar sua promoção</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary-600 shrink-0" />
            </div>
          </Link>
        )}

        {/* ── KPIs ── */}
        {mlLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <KpiSkeleton key={i} />)}
          </div>
        ) : hasML && hasShopee ? (
          /* Both ML and Shopee connected — unified KPIs */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Faturamento 30d',
                value: revenue,
                sub: ml?.connected ? `ML: ${revenue}` : 'Mercado Livre',
                icon: DollarSign,
                color: 'text-purple-400 bg-purple-400/10',
                href: '/dashboard/financeiro',
                tooltip: 'Receita bruta dos últimos 30 dias (Mercado Livre)',
              },
              {
                label: 'Pedidos 30d',
                value: orders,
                sub: ml?.connected ? `ML: ${orders} pedidos` : 'Mercado Livre',
                icon: ShoppingCart,
                color: 'text-cyan-400 bg-cyan-400/10',
                href: '/dashboard/pedidos',
                tooltip: 'Total de pedidos recebidos nos últimos 30 dias',
              },
              {
                label: 'Anúncios Ativos',
                value: active,
                sub: ml?.connected ? `ML: ${active} anúncios` : 'Mercado Livre',
                icon: Package,
                color: 'text-orange-400 bg-orange-400/10',
                href: '/dashboard/produtos-ml',
                tooltip: 'Total de anúncios ativos sincronizados no Mercado Livre',
              },
              {
                label: 'Canais Ativos',
                value: String(connectedCount),
                sub: [hasML ? 'Mercado Livre' : null, hasShopee ? 'Shopee' : null].filter(Boolean).join(' · '),
                icon: Link2,
                color: 'text-green-400 bg-green-400/10',
                href: '/dashboard/integracoes',
                tooltip: 'Número de marketplaces conectados à sua conta',
              },
            ].map(k => (
              <Link key={k.label} href={k.href}
                className="glass-card p-4 rounded-2xl hover:border-primary-500/25 hover:shadow-glow-sm transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight cursor-default">{k.label}</p>
                    <KpiTooltip text={k.tooltip} />
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                    <k.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white font-display">{k.value}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">{k.sub}</p>
              </Link>
            ))}
          </div>
        ) : !ml?.connected ? (
          hasShopee ? (
            /* Shopee-only — 4 KPI cards com dados reais */
            shopeeKpi.loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[0,1,2,3].map(i => <KpiSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Pedidos 30d',
                    value: shopeeKpi.ordersCount !== null ? String(shopeeKpi.ordersCount) : '—',
                    sub: 'Shopee',
                    icon: ShoppingCart,
                    color: 'text-orange-400 bg-orange-400/10',
                    href: '/dashboard/shopee/pedidos',
                    tooltip: 'Total de pedidos Shopee nos últimos 30 dias',
                  },
                  {
                    label: 'Produtos Ativos',
                    value: shopeeKpi.productsCount !== null ? String(shopeeKpi.productsCount) : '—',
                    sub: 'Shopee · NORMAL',
                    icon: Package,
                    color: 'text-cyan-400 bg-cyan-400/10',
                    href: '/dashboard/shopee/produtos',
                    tooltip: 'Produtos com status NORMAL na loja Shopee',
                  },
                  {
                    label: 'Avaliação',
                    value: '—',
                    sub: 'Em breve',
                    icon: ShieldCheck,
                    color: 'text-green-400 bg-green-400/10',
                    href: '/dashboard/shopee/overview',
                    tooltip: 'Avaliação e reputação da loja Shopee',
                  },
                  {
                    label: 'Canais Ativos',
                    value: '1',
                    sub: 'Shopee conectada',
                    icon: Link2,
                    color: 'text-purple-400 bg-purple-400/10',
                    href: '/dashboard/integracoes',
                    tooltip: 'Marketplaces conectados à sua conta',
                  },
                ].map(k => (
                  <Link key={k.label} href={k.href}
                    className="glass-card p-4 rounded-2xl hover:border-accent-500/25 hover:shadow-glow-sm transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="relative">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight cursor-default">{k.label}</p>
                        <KpiTooltip text={k.tooltip} />
                      </div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                        <k.icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-white font-display">{k.value}</p>
                    <p className="text-[10px] text-slate-600 mt-1.5">{k.sub}</p>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="glass-card p-5 rounded-2xl flex items-center gap-4 border-dashed border-white/10">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Conecte seu Mercado Livre para ver métricas reais</p>
                <p className="text-xs text-slate-500 mt-0.5">Pedidos, faturamento e anúncios aparecerão aqui automaticamente.</p>
              </div>
              <Link href="/dashboard/integracoes"
                className="shrink-0 px-4 py-2 rounded-xl bg-primary-500/10 text-primary-300 text-xs font-bold hover:bg-primary-500/20 transition-colors">
                Conectar ML
              </Link>
            </div>
          )
        ) : (
          /* Only ML connected */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Faturamento 30d',   value: revenue,   sub: 'Mercado Livre',       icon: DollarSign,   color: 'text-primary-400 bg-primary-400/10', href: '/dashboard/financeiro', tooltip: 'Receita bruta dos últimos 30 dias no Mercado Livre' },
              { label: 'Pedidos 30d',       value: orders,    sub: 'Mercado Livre',       icon: ShoppingCart, color: 'text-cyan-400 bg-cyan-400/10',        href: '/dashboard/pedidos',    tooltip: 'Total de pedidos recebidos nos últimos 30 dias' },
              { label: 'Anúncios Ativos',   value: active,    sub: 'Mercado Livre',       icon: Package,      color: 'text-accent-400 bg-accent-400/10',    href: '/dashboard/produtos-ml',   tooltip: 'Total de anúncios ativos sincronizados' },
              { label: 'Perguntas Pend.',   value: questions, sub: questions > 0 ? 'Ver Central Pós-Venda' : 'Nenhuma pendente', icon: MessageSquare, color: questions > 0 ? 'text-accent-400 bg-accent-400/10' : 'text-emerald-400 bg-emerald-400/10', href: '/dashboard/pos-venda', tooltip: 'Perguntas não respondidas dos seus compradores no ML' },
            ].map(k => (
              <Link key={k.label} href={k.href}
                className="glass-card p-4 rounded-2xl hover:border-primary-500/25 hover:shadow-glow-sm transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight cursor-default">{k.label}</p>
                    <KpiTooltip text={k.tooltip} />
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                    <k.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white font-display">{k.value}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">{k.sub}</p>
              </Link>
            ))}
          </div>
        )}

        {/* ── Task Boxes ── */}
        {hasML ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">

          {/* Pedidos */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-sm font-bold text-white">Pedidos</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: 'Total 30 dias',             val: ml?.connected ? ml.totalOrders30d ?? 0 : 0, level: dotLevel(ml?.totalOrders30d ?? 0), href: '/dashboard/pedidos' },
                { label: 'Para Emitir NF-e',          val: 0,  level: 'muted' as const, href: '/dashboard/nfe'      },
                { label: 'Para Enviar',               val: 0,  level: 'muted' as const, href: '/dashboard/expedicao'},
                { label: 'Devoluções Pendentes',      val: 0,  level: 'muted' as const, href: '/dashboard/pedidos'  },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${item.val > 0 ? 'text-white' : 'text-slate-600'}`}>{item.val}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Estoque */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-white">Anúncios ML</p>
            </div>
            {mlLoading ? (
              <div className="p-4 flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {[
                  { label: 'Anúncios Ativos',   val: ml?.connected ? ml.totalActive ?? 0 : 0, level: ml?.connected && (ml.totalActive ?? 0) > 0 ? 'ok' as const : 'muted' as const, href: '/dashboard/produtos-ml' },
                  { label: 'Anúncios Pausados', val: 0, level: 'muted' as const, href: '/dashboard/produtos-ml' },
                  { label: 'Em Revisão',        val: 0, level: 'muted' as const, href: '/dashboard/produtos-ml' },
                ].map(item => (
                  <Link key={item.label} href={item.href}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <Dot level={item.level} />
                      <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${item.val > 0 ? 'text-white' : 'text-slate-600'}`}>{item.val}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* SAC */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-white">SAC / Atendimento</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: 'Perguntas Pendentes ML', val: questions, level: dotLevel(questions), href: '/dashboard/pos-venda' },
                { label: 'Mensagens Não Lidas',    val: 0, level: 'muted' as const, href: '/dashboard/pos-venda' },
                { label: 'Reclamações Pendentes',  val: 0, level: 'muted' as const, href: '/dashboard/pos-venda' },
                { label: 'Devoluções / Reembolsos',val: 0, level: 'muted' as const, href: '/dashboard/pos-venda' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${item.val > 0 ? 'text-red-400' : 'text-slate-600'}`}>{item.val}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Reputação ML */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              </div>
              <p className="text-sm font-bold text-white">Reputação ML</p>
            </div>
            {reputaLoading ? (
              <div className="p-4 flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : !reputa?.connected ? (
              <div className="px-4 py-3">
                <p className="text-xs text-slate-600">ML não conectado</p>
                <Link href="/dashboard/integracoes" className="text-xs text-yellow-400 hover:text-yellow-300 mt-1 inline-block transition-colors">
                  Conectar ML →
                </Link>
              </div>
            ) : (() => {
              const lvlKey = reputa?.seller_reputation?.level_id ?? 'green'
              const lvl = LEVEL_CFG[lvlKey] ?? LEVEL_CFG.green
              return (
                <div className="divide-y divide-white/[0.04]">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{lvl.emoji}</span>
                      <div>
                        <p className="text-xs text-slate-400">Nível atual</p>
                        <p className={`text-sm font-bold ${lvl.color}`}>{lvl.label}</p>
                      </div>
                    </div>
                    <Link href="/dashboard/reputacao"
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                      Detalhes <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {reputa?.seller_reputation?.power_seller_status && (
                    <div className="px-4 py-2.5">
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider">Status</p>
                      <p className="text-xs font-semibold text-yellow-400 mt-0.5 capitalize">
                        MercadoLíder {reputa.seller_reputation.power_seller_status}
                      </p>
                    </div>
                  )}
                  <Link href="/dashboard/reputacao"
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                    <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">Ver painel completo</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </Link>
                </div>
              )
            })()}
          </div>
        </div>
        ) : hasShopee ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">

          {/* Pedidos Shopee */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <p className="text-sm font-bold text-white">Pedidos Shopee</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: 'Total 30 dias',          val: shopeeKpi.ordersCount ?? 0, level: (shopeeKpi.ordersCount ?? 0) > 0 ? 'ok' as const : 'muted' as const, href: '/dashboard/shopee/pedidos' },
                { label: 'Pagamento Pendente',      val: 0, level: 'muted' as const, href: '/dashboard/shopee/pedidos' },
                { label: 'Para Enviar',             val: 0, level: 'muted' as const, href: '/dashboard/shopee/pedidos' },
                { label: 'Concluídos',              val: 0, level: 'muted' as const, href: '/dashboard/shopee/pedidos' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${item.val > 0 ? 'text-white' : 'text-slate-600'}`}>{item.val}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Produtos Shopee */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-white">Produtos Shopee</p>
            </div>
            {shopeeKpi.loading ? (
              <div className="p-4 flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {[
                  { label: 'Produtos Ativos',  val: shopeeKpi.productsCount ?? 0, level: (shopeeKpi.productsCount ?? 0) > 0 ? 'ok' as const : 'muted' as const, href: '/dashboard/shopee/produtos' },
                  { label: 'Deslistados',       val: 0, level: 'muted' as const, href: '/dashboard/shopee/produtos' },
                  { label: 'Sem Estoque',       val: 0, level: 'muted' as const, href: '/dashboard/shopee/produtos' },
                ].map(item => (
                  <Link key={item.label} href={item.href}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <Dot level={item.level} />
                      <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${item.val > 0 ? 'text-white' : 'text-slate-600'}`}>{item.val}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Atendimento Shopee */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-white">Atendimento</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: 'Chats Pendentes',  val: 0, level: 'muted' as const, href: '/dashboard/shopee/overview' },
                { label: 'Avaliações Novas', val: 0, level: 'muted' as const, href: '/dashboard/shopee/overview' },
                { label: 'Reclamações',      val: 0, level: 'muted' as const, href: '/dashboard/shopee/overview' },
                { label: 'Devoluções',       val: 0, level: 'muted' as const, href: '/dashboard/shopee/overview' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${item.val > 0 ? 'text-red-400' : 'text-slate-600'}`}>{item.val}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Minha Loja Shopee */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              </div>
              <p className="text-sm font-bold text-white">Minha Loja Shopee</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🟠</span>
                  <div>
                    <p className="text-xs text-slate-400">Loja</p>
                    <p className="text-sm font-bold text-white truncate max-w-[120px]">{shopeeMetrics?.shop_name ?? '—'}</p>
                  </div>
                </div>
                <Link href="/dashboard/shopee/overview"
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
                  Detalhes <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {shopeeMetrics?.shop_id && (
                <div className="px-4 py-2.5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">Shop ID</p>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">{shopeeMetrics.shop_id}</p>
                </div>
              )}
              <Link href="/dashboard/shopee/overview"
                className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">Ver overview completo</span>
                <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
              </Link>
            </div>
          </div>

        </div>
        ) : null}

        {/* ── Quick Actions ── */}
        <div className="animate-slide-up">
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3">Ações Rápidas</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: Plus,        label: 'Cadastrar Produto', href: '/dashboard/armazem/produtos' },
              { icon: Calculator,  label: 'Calcular Preço',    href: '/dashboard/precificacao'     },
              { icon: FileCheck,   label: 'Emitir NF-e',       href: '/dashboard/nfe'              },
              { icon: DollarSign,  label: 'Financeiro',        href: '/dashboard/financeiro'       },
            ].map(a => (
              <Link key={a.label} href={a.href}
                className="dash-card flex flex-col items-center gap-2 py-3 px-2 rounded-xl hover:border-purple-600/25 hover:bg-purple-600/5 transition-all group text-center">
                <div className="w-8 h-8 rounded-xl bg-dark-700 flex items-center justify-center group-hover:bg-purple-600/15 transition-colors">
                  <a.icon className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-300 transition-colors leading-tight">{a.label}</span>
              </Link>
            ))}
            {anyMarketplace && [
              { icon: Tag,   label: 'Nova Listagem',  href: '/dashboard/listagens'  },
              { icon: Truck, label: 'Gerar Etiqueta', href: '/dashboard/expedicao'  },
            ].map(a => (
              <Link key={a.label} href={a.href}
                className="dash-card flex flex-col items-center gap-2 py-3 px-2 rounded-xl hover:border-purple-600/25 hover:bg-purple-600/5 transition-all group text-center">
                <div className="w-8 h-8 rounded-xl bg-dark-700 flex items-center justify-center group-hover:bg-purple-600/15 transition-colors">
                  <a.icon className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-300 transition-colors leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Seus Canais ── */}
        {anyMarketplace && (
          <div className="animate-slide-up">
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3">Seus Canais</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasML && (
                <div className="dash-card p-4 rounded-2xl border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🟡</span>
                    <p className="text-sm font-bold text-white">Mercado Livre</p>
                    <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">● Conectado</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    {ml?.nickname && (
                      <p><span className="text-slate-600">Conta:</span> @{ml.nickname}</p>
                    )}
                    <p><span className="text-slate-600">Faturamento:</span> <span className="text-white font-semibold">{revenue}</span> / 30d</p>
                    <p><span className="text-slate-600">Pedidos:</span> <span className="text-white font-semibold">{orders}</span> / 30d</p>
                    {reputa?.connected && (
                      <p><span className="text-slate-600">Reputação:</span> <span className={`font-semibold ${reputaLvl.color}`}>{reputaLvl.emoji} {reputaLvl.label}</span></p>
                    )}
                  </div>
                  <Link href="/dashboard/pedidos"
                    className="mt-3 flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-semibold">
                    Ver dashboard ML <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
              {hasShopee && (
                <div className="dash-card p-4 rounded-2xl border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🟠</span>
                    <p className="text-sm font-bold text-white">Shopee</p>
                    <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">● Conectado</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    {shopeeMetrics?.shop_name && (
                      <p><span className="text-slate-600">Loja:</span> <span className="text-white font-semibold">{shopeeMetrics.shop_name}</span></p>
                    )}
                    {shopeeMetrics?.shop_id && (
                      <p><span className="text-slate-600">Shop ID:</span> <span className="text-white font-semibold">{shopeeMetrics.shop_id}</span></p>
                    )}
                    {shopeeMetrics?.total_products !== undefined && (
                      <p><span className="text-slate-600">Produtos:</span> <span className="text-white font-semibold">{shopeeMetrics.total_products}</span></p>
                    )}
                  </div>
                  <Link href="/dashboard/shopee/overview"
                    className="mt-3 flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors font-semibold">
                    Ver dashboard Shopee <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Admin quick-access ── */}
        {(profile?.role === 'admin' || profile?.role === 'foguetim_support') && (
          <div className="animate-slide-up">
            <Link href="/admin">
              <div className="flex items-center gap-3 p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-xl hover:bg-indigo-900/30 transition-colors">
                <div className="p-2 bg-indigo-900/50 rounded-lg shrink-0">
                  <Shield className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Painel Administrativo</p>
                  <p className="text-xs text-slate-500">Gerenciar usuários e plataforma</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
            </Link>
          </div>
        )}

        {/* ── Charts + Orders / Donut + Stock ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: Revenue placeholder + Recent orders */}
          <div className="lg:col-span-2 space-y-4">
            <div className="dash-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-white text-sm">Financeiro do Mês</p>
                  <p className="text-xs text-slate-600 mt-0.5">Receita bruta · taxas ML · receita líquida</p>
                </div>
                <Link href="/dashboard/financeiro" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                  Ver financeiro <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {!hasML ? (
                hasShopee ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-white/[0.06] rounded-xl">
                    <BarChart3 className="w-7 h-7 text-slate-700" />
                    <p className="text-xs text-slate-500 text-center">Dados financeiros Shopee em breve<br/>Conecte o ML para ver receita e taxas</p>
                    <Link href="/dashboard/shopee/overview" className="text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors">
                      Ver Overview Shopee →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-white/[0.06] rounded-xl">
                    <BarChart3 className="w-7 h-7 text-slate-700" />
                    <p className="text-xs text-slate-500 text-center">Conecte o Mercado Livre<br/>para ver dados financeiros reais</p>
                    <Link href="/dashboard/integracoes" className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors">
                      Configurar integração →
                    </Link>
                  </div>
                )
              ) : finData ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Receita bruta',   value: finData.receita_bruta,   color: 'text-green-400'  },
                      { label: 'Taxas ML',         value: finData.taxas_ml,        color: 'text-red-400'    },
                      { label: 'Receita líquida',  value: finData.receita_liquida, color: 'text-purple-400' },
                    ].map(k => (
                      <div key={k.label} className="bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.06]">
                        <p className="text-[9px] text-slate-600 mb-0.5">{k.label}</p>
                        <p className={`text-xs font-bold ${k.color} leading-none`}>{fmtBRL(k.value)}</p>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={[
                      { name: 'Receita bruta',  value: finData.receita_bruta   },
                      { name: 'Taxas ML',        value: finData.taxas_ml        },
                      { name: 'Rec. líquida',   value: finData.receita_liquida },
                    ]} barSize={40}>
                      <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                        formatter={(v: number) => [fmtBRL(v), '']}
                      />
                      <Bar dataKey="value" radius={[6,6,0,0]}>
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                        <Cell fill="#a855f7" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="dash-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <p className="font-bold text-white text-sm">Últimos Pedidos</p>
                <Link href={hasShopee && !hasML ? '/dashboard/shopee/pedidos' : '/dashboard/pedidos'} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                  Ver todos <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <EmptyCard
                message={hasShopee && !hasML ? 'Acesse Pedidos Shopee para ver seus pedidos' : 'Acesse Pedidos para ver os pedidos do ML'}
                hint={hasShopee && !hasML ? 'Os pedidos são carregados diretamente da API da Shopee' : 'Os pedidos são carregados diretamente da API do Mercado Livre'}
              />
            </div>
          </div>

          {/* Right: Platform distribution + Stats */}
          <div className="space-y-4">
            <div className="dash-card p-5 rounded-2xl">
              <p className="font-bold text-white text-sm mb-1">Plataformas</p>
              <p className="text-xs text-slate-600 mb-4">Canais conectados</p>
              <div className="space-y-3">
                {hasML && (
                  <Link href="/dashboard/pedidos">
                    <div className="flex items-center gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/10 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">Mercado Livre</p>
                        <p className="text-[10px] text-slate-500">{ml?.connected ? `@${ml.nickname}` : 'Conectado'}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>
                        {hasML && hasShopee && (
                          <span className="text-[9px] text-yellow-400 hover:text-yellow-300 font-semibold">Ver detalhes</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )}
                {hasShopee && (
                  <Link href="/dashboard/shopee/overview">
                    <div className="flex items-center gap-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl hover:bg-orange-500/10 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">Shopee</p>
                        <p className="text-[10px] text-slate-500">{shopeeMetrics?.shop_name ? shopeeMetrics.shop_name : 'Loja conectada'}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>
                        {hasML && hasShopee && (
                          <span className="text-[9px] text-orange-400 hover:text-orange-300 font-semibold">Ver detalhes</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )}
                {!anyMarketplace && (
                  <Link href="/dashboard/integracoes">
                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-dashed border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-400">Nenhum canal conectado</p>
                        <p className="text-[10px] text-slate-600">Clique para integrar</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Estoque crítico */}
            <div className="dash-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-sm font-bold text-white">Estoque Crítico</p>
                </div>
                <Link href="/dashboard/produtos" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <EmptyCard message="Nenhum produto em estoque crítico" />
            </div>
          </div>
        </div>

        {/* ── Avisos + Changelog / Ad Performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Notices + Changelog */}
          <div className="lg:col-span-2 dash-card rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/[0.06]">
              {(['avisos', 'updates'] as const).map(t => (
                <button key={t} onClick={() => setInfoTab(t)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all ${
                    infoTab === t
                      ? 'text-white border-b-2 border-purple-500 -mb-px'
                      : 'text-slate-600 hover:text-slate-300'
                  }`}>
                  {t === 'avisos'
                    ? <><Bell className="w-3.5 h-3.5" /> Avisos{announcements.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold leading-none">{announcements.length}</span>}</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Notas de Atualização</>}
                </button>
              ))}
            </div>

            {infoTab === 'avisos' && (
              announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="w-6 h-6 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-600">Nenhum aviso no momento</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {announcements.map(a => {
                    const colors = ANNOUNCEMENT_COLORS[a.type] ?? ANNOUNCEMENT_COLORS.info
                    const inner = (
                      <div className={`flex items-start gap-3 px-5 py-3.5 border-l-2 ${colors.border} ${colors.bg} hover:bg-white/[0.02] transition-colors`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${colors.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white leading-snug">{a.title}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{a.content}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {a.link && <ExternalLink className="w-3 h-3 text-slate-600" />}
                          {a.is_dismissible && (
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); void dismissAnnouncement(a.id) }}
                              className="p-1 rounded text-slate-700 hover:text-slate-400 transition-colors"
                              aria-label="Dispensar aviso"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                    return a.link ? (
                      <Link key={a.id} href={a.link}>{inner}</Link>
                    ) : (
                      <div key={a.id}>{inner}</div>
                    )
                  })}
                </div>
              )
            )}

            {infoTab === 'updates' && (
              <div className="divide-y divide-white/[0.04]">
                {changelogLoading ? (
                  <div className="flex items-center gap-2 px-5 py-4 text-xs text-slate-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
                  </div>
                ) : changelogEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Sparkles className="w-6 h-6 text-slate-700 mb-2" />
                    <p className="text-xs text-slate-600">Nenhuma atualização encontrada</p>
                  </div>
                ) : (
                  <>
                    {changelogEntries.map(c => {
                      const cat  = CHANGELOG_CATEGORY[c.category] ?? CHANGELOG_CATEGORY.feature
                      const Icon = cat.icon
                      const isExpanded = expandedId === c.id
                      const dateStr = new Date(c.published_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        timeZone: 'America/Sao_Paulo',
                      })
                      return (
                        <div key={c.id}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="w-full flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors text-left"
                          >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${cat.color}`}>
                              <Icon className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-slate-500">{c.version}</span>
                                <p className="text-xs font-semibold text-white">{c.title}</p>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{c.description}</p>
                              {isExpanded && c.details && (
                                <p className="text-[11px] text-slate-400 mt-2 p-2.5 bg-white/[0.03] rounded-lg leading-relaxed border border-white/[0.05]">
                                  {c.details}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-600">{dateStr}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                        </div>
                      )
                    })}
                    <div className="px-5 py-2.5 border-t border-white/[0.04]">
                      <Link href="/dashboard/changelog" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                        Ver todas as atualizações <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Ad Performance */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-green-400" />
              </div>
              <p className="text-sm font-bold text-white">Performance de Anúncios</p>
            </div>
            <div className="p-4 space-y-3">
              {(mlLoading && hasML) || (shopeeKpi.loading && hasShopee && !hasML) ? (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
                </div>
              ) : hasML ? (
                <>
                  {[
                    { label: 'Visitas hoje',      val: '—',                                                     icon: Eye         },
                    { label: 'Ticket médio 30d',  val: ml?.connected ? fmtBRL(ml.avgTicket ?? 0) : '—',         icon: TrendingUp  },
                    { label: 'Anúncios ativos',   val: ml?.connected ? String(ml.totalActive ?? 0) : '—',       icon: Zap         },
                    { label: 'Perguntas pend.',   val: ml?.connected ? String(questions) : '—',                 icon: Clock       },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <s.icon className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs text-slate-500">{s.label}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{s.val}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-[10px] text-slate-600 mb-1.5 flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> Melhor anúncio do mês
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      {ml?.connected ? 'Acesse Produtos para ver detalhes' : 'Nenhum dado disponível'}
                    </p>
                  </div>
                </>
              ) : hasShopee ? (
                <>
                  {[
                    { label: 'Pedidos 30d',     val: shopeeKpi.ordersCount !== null ? String(shopeeKpi.ordersCount) : '—', icon: ShoppingCart },
                    { label: 'Produtos ativos', val: shopeeKpi.productsCount !== null ? String(shopeeKpi.productsCount) : '—', icon: Package   },
                    { label: 'Avaliação loja',  val: '—',                                                                    icon: ShieldCheck  },
                    { label: 'Loja',            val: shopeeMetrics?.shop_name ?? '—',                                        icon: Zap          },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <s.icon className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs text-slate-500">{s.label}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{s.val}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-[10px] text-slate-600 mb-1.5 flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> Visão geral Shopee
                    </p>
                    <Link href="/dashboard/shopee/overview" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      Ver overview Shopee →
                    </Link>
                  </div>
                </>
              ) : (
                <EmptyCard message="Conecte um marketplace para ver performance" />
              )}
            </div>
          </div>
        </div>

        {/* ── Blog card ─────────────────────────────────────────────────── */}
        <Link
          href="/blog"
          className="dash-card rounded-2xl p-4 flex items-center gap-4 hover:ring-1 hover:ring-violet-500/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Blog Foguetim</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Dicas de e-commerce, finanças, fiscal, marketing e gestão para quem vende online.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:text-violet-300 transition-colors shrink-0">
            Ver artigos <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>

    </div>
  )
}
