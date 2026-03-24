'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  DollarSign, ShoppingCart, TrendingUp,
  AlertTriangle, ArrowUpRight, ChevronRight,
  Archive, Activity, Calendar, MessageSquare,
  ShoppingBag, BarChart3, FileText, Settings,
  Users, HelpCircle, Package, Sparkles, Wrench,
  Shield, Loader2, ExternalLink, BookOpen, Trophy,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { getGreeting, formatBrasiliaDate, daysUntil } from '@/lib/utils/timezone'
import { getUpcomingEvents } from '@/lib/data/datas-comemorativas'
import { DevBanner } from '@/components/DevBanner'
import { useConnectedMarketplaces } from '@/lib/hooks/useConnectedMarketplaces'
import { EmptyState } from '@/components/shared/EmptyState'

/* ── Types ──────────────────────────────────────────────────────────────── */

interface MLMetrics {
  connected:        boolean
  nickname?:        string
  totalActive?:     number
  totalOrders30d?:  number
  revenue30d?:      number
  avgTicket?:       number
  pendingQuestions?: number
}

interface ChangelogEntry {
  id: string; version: string; title: string; description: string
  category: 'feature' | 'fix' | 'improvement' | 'security'; published_at: string
}

interface RecentOrder {
  id: string; order_id: string; channel: 'ml' | 'magalu' | 'shopee'
  buyer_name: string; total: number; status: string; date: string
}

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string
  cover_image: string | null; published_at: string
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PERIOD_OPTIONS = [
  { label: 'Hoje',    value: 'today' },
  { label: 'Semana',  value: 'week'  },
  { label: 'Mês',     value: 'month' },
  { label: '30 dias', value: '30d'   },
]

const CHANNEL_COLORS: Record<string, { dot: string; text: string; name: string; stroke: string }> = {
  ml:     { dot: 'bg-yellow-400', text: 'text-yellow-400', name: 'ML',     stroke: '#FFE600' },
  magalu: { dot: 'bg-blue-400',   text: 'text-blue-400',   name: 'Magalu', stroke: '#0086FF' },
  shopee: { dot: 'bg-orange-400', text: 'text-orange-400', name: 'Shopee', stroke: '#EE4D2D' },
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-500/15 text-green-400', delivered: 'bg-green-500/15 text-green-400',
  shipped: 'bg-orange-500/15 text-orange-400', invoiced: 'bg-violet-500/15 text-violet-400',
  approved: 'bg-blue-500/15 text-blue-400', new: 'bg-blue-500/15 text-blue-400',
  cancelled: 'bg-red-500/15 text-red-400', frozen: 'bg-gray-500/15 text-gray-400',
}

const CHANGELOG_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  feature: { icon: Sparkles, color: 'text-purple-400' },
  fix: { icon: Wrench, color: 'text-blue-400' },
  improvement: { icon: TrendingUp, color: 'text-green-400' },
  security: { icon: Shield, color: 'text-red-400' },
}

const MEDALS = ['🥇', '🥈', '🥉']

/* ── Stagger ────────────────────────────────────────────────────────────── */

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } },
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */

function KpiSkeleton() {
  return (
    <div className="glass-card p-4 rounded-2xl animate-pulse">
      <div className="h-2.5 w-24 bg-white/5 rounded mb-3" />
      <div className="h-6 w-20 bg-white/5 rounded mb-2" />
      <div className="h-2 w-32 bg-white/5 rounded" />
    </div>
  )
}

/* ── Custom tooltip for chart ───────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-space-800 border border-space-600 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.stroke }}>
          {CHANNEL_COLORS[p.dataKey]?.name ?? p.dataKey}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Page                                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  useEffect(() => { document.title = 'Dashboard — Foguetim ERP' }, [])

  const { user, profile } = useAuth()
  const { hasML, hasShopee, hasMagalu } = useConnectedMarketplaces()
  const anyMarketplace = hasML || hasShopee || hasMagalu

  /* ── Basic state ─────────────────────────────────────────────────────── */
  const [period, setPeriod]       = useState('30d')
  const [greeting, setGreeting]   = useState('Olá')
  const [todayStr, setTodayStr]   = useState('')
  const [nextHoliday, setNextHoliday] = useState<{ nome: string; icone: string; days: number } | null>(null)

  /* ── Data state ──────────────────────────────────────────────────────── */
  const [ml, setMl]               = useState<MLMetrics | null>(null)
  const [mlLoading, setMlLoading] = useState(true)
  const [urgentClaims, setUrgentClaims] = useState(0)
  const [rupturasCount, setRupturasCount] = useState(0)
  const [healthScore, setHealthScore]     = useState<number | null>(null)
  const [questions, setQuestions] = useState(0)
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [rankTab, setRankTab]     = useState<'units' | 'revenue'>('units')

  const firstName = (
    user?.user_metadata?.name?.split(' ')[0] ||
    profile?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'vendedor'
  )

  /* ── Effects ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    setGreeting(getGreeting())
    setTodayStr(formatBrasiliaDate())
    const next = getUpcomingEvents().find(e => daysUntil(e.data) >= 0 && daysUntil(e.data) <= 30)
    if (next) setNextHoliday({ nome: next.nome, icone: next.icone, days: daysUntil(next.data) })
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/metrics')
      .then(r => r.json())
      .then((d: MLMetrics) => { setMl(d); setQuestions(d.pendingQuestions ?? 0) })
      .catch(() => setMl({ connected: false }))
      .finally(() => setMlLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/reclamacoes?status=opened')
      .then(r => r.json())
      .then((d: { summary?: { seller_action_required?: number } }) => setUrgentClaims(d.summary?.seller_action_required ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/estoque')
      .then(r => r.json())
      .then((d: { summary?: { ruptura?: number } }) => setRupturasCount(d.summary?.ruptura ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ml_saude_cache')
      if (raw) {
        const cached = JSON.parse(raw) as { data: { score?: number }; ts: number }
        if (Date.now() - cached.ts < 15 * 60 * 1000 && typeof cached.data.score === 'number') {
          setHealthScore(cached.data.score); return
        }
      }
    } catch {}
    fetch('/api/mercadolivre/saude')
      .then(r => r.json())
      .then((d: { score?: number; connected?: boolean }) => {
        if (d.connected && typeof d.score === 'number') setHealthScore(d.score)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/changelog?limit=5')
      .then(r => r.json())
      .then((d: { entries?: ChangelogEntry[] }) => setChangelog(d.entries ?? []))
      .catch(() => {})
  }, [])

  // Recent orders — try fetching from ML orders API
  useEffect(() => {
    fetch('/api/mercadolivre/pedidos?limit=10&sort=date_desc')
      .then(r => r.json())
      .then((d: any) => {
        const items = d.results ?? d.orders ?? d.data ?? []
        const mapped: RecentOrder[] = items.slice(0, 10).map((o: any) => ({
          id: o.id ?? o.order_id ?? '',
          order_id: String(o.id ?? o.order_id ?? ''),
          channel: 'ml' as const,
          buyer_name: o.buyer?.nickname ?? o.buyer?.first_name ?? 'Comprador',
          total: o.total_amount ?? o.paid_amount ?? 0,
          status: o.status ?? 'unknown',
          date: o.date_created ?? '',
        }))
        setRecentOrders(mapped)
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [])

  // Blog posts
  useEffect(() => {
    fetch('/api/blog/posts?limit=3&status=published')
      .then(r => r.json())
      .then((d: { posts?: BlogPost[] }) => setBlogPosts(d.posts ?? []))
      .catch(() => {})
  }, [])

  /* ── Computed ─────────────────────────────────────────────────────────── */

  const revenue   = ml?.connected ? fmtBRL(ml.revenue30d ?? 0) : '—'
  const orders    = ml?.connected ? String(ml.totalOrders30d ?? 0) : '—'
  const active    = ml?.connected ? String(ml.totalActive ?? 0) : '—'
  const avgTicket = ml?.connected && (ml.avgTicket ?? 0) > 0 ? fmtBRL(ml.avgTicket!) : '—'

  const connectedChannels: { key: string; name: string; color: string; dot: string }[] = []
  if (hasML) connectedChannels.push({ key: 'ml', name: 'Mercado Livre', color: 'text-yellow-400', dot: 'bg-yellow-400' })
  if (hasShopee) connectedChannels.push({ key: 'shopee', name: 'Shopee', color: 'text-orange-400', dot: 'bg-orange-400' })
  if (hasMagalu) connectedChannels.push({ key: 'magalu', name: 'Magalu', color: 'text-blue-400', dot: 'bg-blue-400' })

  const kpis = [
    { label: 'Faturamento', value: revenue, icon: DollarSign, color: 'text-primary-400 bg-primary-400/10', href: '/dashboard/financeiro' },
    { label: 'Pedidos',     value: orders,  icon: ShoppingCart, color: 'text-cyan-400 bg-cyan-400/10', href: '/dashboard/pedidos' },
    { label: 'Ticket Médio', value: avgTicket, icon: TrendingUp, color: 'text-accent-400 bg-accent-400/10', href: '/dashboard/financeiro' },
    { label: 'Anúncios',    value: active,  icon: Package, color: 'text-green-400 bg-green-400/10', href: '/dashboard/produtos-ml' },
  ]

  // Alerts
  const alerts: { label: string; sub: string; href: string; color: string; icon: React.ElementType }[] = []
  if (hasML && urgentClaims > 0) alerts.push({ label: `${urgentClaims} reclamação${urgentClaims !== 1 ? 'ões' : ''} urgente${urgentClaims !== 1 ? 's' : ''}`, sub: 'Responda em até 48h', href: '/dashboard/reclamacoes', color: 'border-l-red-500', icon: AlertTriangle })
  if (hasML && rupturasCount > 0) alerts.push({ label: `${rupturasCount} anúncio${rupturasCount !== 1 ? 's' : ''} sem estoque`, sub: 'Atualize para não perder vendas', href: '/dashboard/estoque?filter=ruptura', color: 'border-l-amber-500', icon: Archive })
  if (hasML && questions > 0) alerts.push({ label: `${questions} pergunta${questions !== 1 ? 's' : ''} pendente${questions !== 1 ? 's' : ''}`, sub: 'Melhore sua reputação respondendo rápido', href: '/dashboard/sac', color: 'border-l-amber-500', icon: MessageSquare })
  if (hasML && healthScore !== null && healthScore < 70) alerts.push({ label: `Saúde da conta: ${healthScore}/100`, sub: healthScore < 50 ? 'Atenção urgente necessária' : 'Precisa de cuidados', href: '/dashboard/saude', color: healthScore < 50 ? 'border-l-red-500' : 'border-l-yellow-500', icon: Activity })

  // Quick links
  const quickLinks = [
    { label: 'Pedidos ML',     icon: ShoppingBag,  href: '/dashboard/pedidos',            show: hasML },
    { label: 'Magalu',         icon: Package,       href: '/dashboard/magalu/overview',     show: hasMagalu },
    { label: 'DRE',            icon: BarChart3,     href: '/dashboard/financeiro/dre',      show: true },
    { label: 'Relatórios',     icon: FileText,      href: '/dashboard/relatorios',          show: true },
    { label: 'Equipe',         icon: Users,         href: '/dashboard/equipe',              show: true },
    { label: 'Config',         icon: Settings,      href: '/dashboard/configuracoes',       show: true },
    { label: 'Ajuda',          icon: HelpCircle,    href: '/dashboard/ajuda',               show: true },
  ].filter(l => l.show)

  // Mock revenue chart data (will be replaced by real API data)
  const revenueChartData = useMemo(() => {
    const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 30
    const data: { date: string; ml: number; magalu: number; shopee: number }[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      data.push({
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        ml: hasML ? Math.round((ml?.revenue30d ?? 0) / days * (0.7 + Math.random() * 0.6)) : 0,
        magalu: hasMagalu ? Math.round(Math.random() * 300) : 0,
        shopee: hasShopee ? Math.round(Math.random() * 200) : 0,
      })
    }
    return data
  }, [period, hasML, hasMagalu, hasShopee, ml?.revenue30d])

  // Changelog fallback
  const changelogFallback: ChangelogEntry[] = [
    { id: '1', version: '2.1', title: 'Integração Magalu disponível!', description: 'Conecte sua conta Magalu.', category: 'feature', published_at: '2026-03-24' },
    { id: '2', version: '2.0', title: 'Redesign completo + Timm', description: 'Nova identidade visual.', category: 'improvement', published_at: '2026-03-24' },
    { id: '3', version: '1.9', title: 'DRE simplificado', description: 'Calcule seu lucro real.', category: 'feature', published_at: '2026-03-22' },
    { id: '4', version: '1.8', title: 'Segurança + RLS', description: 'Políticas em todas as tabelas.', category: 'security', published_at: '2026-03-22' },
    { id: '5', version: '1.7', title: 'Multi-usuário', description: 'Adicione membros à equipe.', category: 'feature', published_at: '2026-03-22' },
  ]
  const displayChangelog = changelog.length > 0 ? changelog : changelogFallback

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <motion.div className="space-y-6" variants={stagger.container} initial="hidden" animate="visible">
      <DevBanner />

      {/* ── Greeting + period filter ─────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                <span className="text-white">{greeting}, </span>
                <span className="text-gradient-violet">{firstName}!</span>
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {todayStr && <p className="text-sm text-slate-500">{todayStr}</p>}
                {connectedChannels.length > 0 && (
                  <>
                    <span className="text-slate-700">·</span>
                    {connectedChannels.map(ch => (
                      <span key={ch.key} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${ch.dot}`} />
                        <span className={`text-xs ${ch.color}`}>{ch.name}</span>
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
            {nextHoliday && nextHoliday.days <= 14 && (
              <Link href="/dashboard/calendario" className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card hover:border-primary-500/30 transition-all text-xs">
                <Calendar className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-gray-300">
                  {nextHoliday.icone} {nextHoliday.nome}
                  {nextHoliday.days === 0 ? ' · hoje!' : nextHoliday.days === 1 ? ' · amanhã' : ` · em ${nextHoliday.days}d`}
                </span>
              </Link>
            )}
          </div>

          {/* Period pills */}
          <div className="flex items-center gap-1.5">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p.value
                    ? 'bg-primary-500 text-white shadow-glow-sm'
                    : 'bg-space-800 text-gray-400 hover:bg-space-700 hover:text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        {mlLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <KpiSkeleton key={i} />)}
          </div>
        ) : !anyMarketplace ? (
          <EmptyState
            image="connect"
            title="Conecte seu marketplace"
            description="Vincule Mercado Livre, Shopee ou Magalu para ver seus dados."
            action={{ label: 'Conectar canal', href: '/dashboard/integracoes' }}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(k => (
              <Link key={k.label} href={k.href}
                className="glass-card p-4 rounded-2xl hover:border-primary-500/25 hover:shadow-glow-sm transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{k.label}</p>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                    <k.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white font-display">{k.value}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">
                  {connectedChannels.map(ch => ch.name).join(' + ')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Alerts ────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <motion.div variants={stagger.item} className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href}>
              <div className={`flex items-center gap-3 p-3 glass-card border-l-4 ${a.color} rounded-xl hover:shadow-glow-sm transition-all`}>
                <a.icon className="w-4 h-4 text-white/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.label}</p>
                  <p className="text-[11px] text-slate-500">{a.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* ── Quick links ──────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Atalhos rápidos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {quickLinks.map(l => (
            <Link key={l.href} href={l.href}
              className="glass-card flex flex-col items-center gap-1.5 p-3 rounded-xl hover:border-primary-500/25 hover:shadow-glow-sm transition-all group">
              <l.icon className="w-5 h-5 text-slate-400 group-hover:text-primary-400 transition-colors" />
              <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors text-center leading-tight">{l.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Revenue chart ────────────────────────────────────────────── */}
      {anyMarketplace && (
        <motion.div variants={stagger.item}>
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary-400" />
                Receita por Canal
              </h3>
              <div className="flex items-center gap-3">
                {connectedChannels.map(ch => (
                  <span key={ch.key} className="flex items-center gap-1.5 text-[10px]">
                    <span className={`w-2 h-2 rounded-full ${ch.dot}`} />
                    <span className={ch.color}>{ch.name}</span>
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="mlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFE600" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#FFE600" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="magaluGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0086FF" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0086FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="shopeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EE4D2D" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#EE4D2D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                {hasML && <Area type="monotone" dataKey="ml" stroke="#FFE600" fill="url(#mlGrad)" strokeWidth={2} dot={false} />}
                {hasMagalu && <Area type="monotone" dataKey="magalu" stroke="#0086FF" fill="url(#magaluGrad)" strokeWidth={2} dot={false} />}
                {hasShopee && <Area type="monotone" dataKey="shopee" stroke="#EE4D2D" fill="url(#shopeeGrad)" strokeWidth={2} dot={false} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── Channels + Atendimento row ───────────────────────────────── */}
      {connectedChannels.length > 0 && (
        <motion.div variants={stagger.item}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Channel breakdown */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent-400" />
                Ranking de Canais
              </h3>
              <div className="space-y-3">
                {hasML && (
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Mercado Livre</span>
                    <span className="text-sm font-bold text-white font-mono">{revenue !== '—' ? revenue : '...'}</span>
                  </div>
                )}
                {hasMagalu && (
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Magalu</span>
                    <Link href="/dashboard/magalu/overview" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      Ver dados <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
                {hasShopee && (
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Shopee</span>
                    <Link href="/dashboard/shopee/overview" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                      Ver dados <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Atendimento */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Atendimento
              </h3>
              <div className="space-y-3">
                <Link href="/dashboard/sac" className="flex items-center justify-between group">
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Perguntas pendentes</span>
                  <span className={`text-sm font-bold font-mono ${questions > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{questions}</span>
                </Link>
                <Link href="/dashboard/reclamacoes" className="flex items-center justify-between group">
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Reclamações urgentes</span>
                  <span className={`text-sm font-bold font-mono ${urgentClaims > 0 ? 'text-red-400' : 'text-slate-600'}`}>{urgentClaims}</span>
                </Link>
                <Link href="/dashboard/estoque?filter=ruptura" className="flex items-center justify-between group">
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Rupturas de estoque</span>
                  <span className={`text-sm font-bold font-mono ${rupturasCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>{rupturasCount}</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Recent orders ────────────────────────────────────────────── */}
      {anyMarketplace && (
        <motion.div variants={stagger.item}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary-400" />
                Últimos Pedidos
              </h3>
              <Link href="/dashboard/pedidos" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                Ver todos →
              </Link>
            </div>
            {ordersLoading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando pedidos...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Nenhum pedido recente encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Canal</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Pedido</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase hidden sm:table-cell">Comprador</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase">Valor</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => {
                      const ch = CHANNEL_COLORS[o.channel] ?? CHANNEL_COLORS.ml
                      const stColor = STATUS_COLORS[o.status] ?? 'bg-gray-500/15 text-gray-400'
                      return (
                        <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-2.5">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${ch.dot}`} />
                              <span className={`text-xs font-medium ${ch.text}`}>{ch.name}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-gray-300 font-mono">#{o.order_id.slice(-8)}</span>
                          </td>
                          <td className="px-3 py-2.5 hidden sm:table-cell">
                            <span className="text-xs text-gray-400 truncate block max-w-[150px]">{o.buyer_name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="text-xs font-bold text-white font-mono">{fmtBRL(o.total)}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${stColor}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Blog cards ───────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Do Blog
          </h2>
          <Link href="https://foguetim.com.br/blog" target="_blank"
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
            Ver todos <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {blogPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {blogPosts.map(post => (
              <Link key={post.id} href={`https://foguetim.com.br/blog/${post.slug}`} target="_blank"
                className="glass-card rounded-xl overflow-hidden hover:border-primary-500/25 hover:shadow-glow-sm transition-all group">
                <div className="aspect-video bg-gradient-to-br from-primary-900/50 to-space-800 flex items-center justify-center">
                  {post.cover_image ? (
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-8 h-8 text-primary-500/30" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors line-clamp-2">{post.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(post.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Link href="https://foguetim.com.br/blog" target="_blank"
            className="glass-card flex items-center gap-4 p-4 rounded-2xl hover:border-primary-500/25 hover:shadow-glow-sm transition-all group">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">Blog Foguetim</p>
              <p className="text-xs text-slate-500 mt-0.5">Dicas de e-commerce, marketing e gestão.</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-600 shrink-0" />
          </Link>
        )}
      </motion.div>

      {/* ── Changelog ────────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              Novidades
            </h3>
            <Link href="/dashboard/changelog" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {displayChangelog.slice(0, 5).map(entry => {
              const cfg = CHANGELOG_ICON[entry.category] ?? CHANGELOG_ICON.feature
              const Icon = cfg.icon
              return (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      <span className="text-slate-500 font-mono text-xs mr-2">v{entry.version}</span>
                      {entry.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{entry.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">
                    {new Date(entry.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
