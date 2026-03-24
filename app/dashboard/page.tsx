'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign, ShoppingCart, TrendingUp, Percent,
  AlertTriangle, ArrowUpRight, ChevronRight,
  Archive, Activity, Calendar, MessageSquare,
  ShoppingBag, BarChart3, FileText, Settings,
  Users, HelpCircle, Package, Sparkles, Wrench,
  Shield, Loader2, ExternalLink, BookOpen,
} from 'lucide-react'
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
  id:           string
  version:      string
  title:        string
  description:  string
  category:     'feature' | 'fix' | 'improvement' | 'security'
  published_at: string
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtCompact(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.0', '')}k`
  return String(v)
}

const CHANGELOG_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  feature:     { icon: Sparkles,   color: 'text-purple-400' },
  fix:         { icon: Wrench,     color: 'text-blue-400'   },
  improvement: { icon: TrendingUp, color: 'text-green-400'  },
  security:    { icon: Shield,     color: 'text-red-400'    },
}

/* ── Stagger animation ──────────────────────────────────────────────────── */
const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
}

/* ── KPI Skeleton ─────────────────────────────────────────────────────── */
function KpiSkeleton() {
  return (
    <div className="glass-card p-4 rounded-2xl animate-pulse">
      <div className="h-2.5 w-24 bg-white/5 rounded mb-3" />
      <div className="h-6 w-20 bg-white/5 rounded mb-2" />
      <div className="h-2 w-32 bg-white/5 rounded" />
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  useEffect(() => { document.title = 'Dashboard — Foguetim ERP' }, [])

  const { user, profile } = useAuth()
  const { hasML, hasShopee, hasMagalu, loading: mktLoading } = useConnectedMarketplaces()
  const anyMarketplace = hasML || hasShopee || hasMagalu

  // ── State ────────────────────────────────────────────────────────────
  const [greeting, setGreeting]     = useState('Olá')
  const [todayStr, setTodayStr]     = useState('')
  const [nextHoliday, setNextHoliday] = useState<{ nome: string; icone: string; days: number } | null>(null)

  const [ml, setMl]                 = useState<MLMetrics | null>(null)
  const [mlLoading, setMlLoading]   = useState(true)
  const [urgentClaims, setUrgentClaims] = useState(0)
  const [rupturasCount, setRupturasCount] = useState(0)
  const [healthScore, setHealthScore] = useState<number | null>(null)
  const [questions, setQuestions]   = useState(0)

  const [changelog, setChangelog]   = useState<ChangelogEntry[]>([])

  const firstName = (
    user?.user_metadata?.name?.split(' ')[0] ||
    profile?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'vendedor'
  )

  // ── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    setGreeting(getGreeting())
    setTodayStr(formatBrasiliaDate())
    const next = getUpcomingEvents().find(e => daysUntil(e.data) >= 0 && daysUntil(e.data) <= 30)
    if (next) setNextHoliday({ nome: next.nome, icone: next.icone, days: daysUntil(next.data) })
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/metrics')
      .then(r => r.json())
      .then((d: MLMetrics) => {
        setMl(d)
        setQuestions(d.pendingQuestions ?? 0)
      })
      .catch(() => setMl({ connected: false }))
      .finally(() => setMlLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/mercadolivre/reclamacoes?status=opened')
      .then(r => r.json())
      .then((d: { summary?: { seller_action_required?: number } }) => {
        setUrgentClaims(d.summary?.seller_action_required ?? 0)
      })
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
          setHealthScore(cached.data.score)
          return
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

  // ── Computed values ──────────────────────────────────────────────────
  const revenue  = ml?.connected ? fmtBRL(ml.revenue30d ?? 0) : '—'
  const orders   = ml?.connected ? String(ml.totalOrders30d ?? 0) : '—'
  const active   = ml?.connected ? String(ml.totalActive ?? 0) : '—'
  const avgTicket = ml?.connected && (ml.avgTicket ?? 0) > 0 ? fmtBRL(ml.avgTicket!) : '—'

  // Count connected channels
  const connectedChannels: { name: string; color: string; dot: string }[] = []
  if (hasML) connectedChannels.push({ name: 'Mercado Livre', color: 'text-yellow-400', dot: 'bg-yellow-400' })
  if (hasShopee) connectedChannels.push({ name: 'Shopee', color: 'text-orange-400', dot: 'bg-orange-400' })
  if (hasMagalu) connectedChannels.push({ name: 'Magalu', color: 'text-blue-400', dot: 'bg-blue-400' })

  // ── KPI data ─────────────────────────────────────────────────────────
  const kpis = [
    {
      label: 'Faturamento 30d',
      value: revenue,
      icon: DollarSign,
      color: 'text-primary-400 bg-primary-400/10',
      href: '/dashboard/financeiro',
    },
    {
      label: 'Pedidos 30d',
      value: orders,
      icon: ShoppingCart,
      color: 'text-cyan-400 bg-cyan-400/10',
      href: '/dashboard/pedidos',
    },
    {
      label: 'Ticket Médio',
      value: avgTicket,
      icon: TrendingUp,
      color: 'text-accent-400 bg-accent-400/10',
      href: '/dashboard/financeiro',
    },
    {
      label: 'Anúncios Ativos',
      value: active,
      icon: Package,
      color: 'text-green-400 bg-green-400/10',
      href: '/dashboard/produtos-ml',
    },
  ]

  // ── Alerts ───────────────────────────────────────────────────────────
  const alerts: { label: string; sub: string; href: string; color: string; icon: React.ElementType }[] = []
  if (hasML && urgentClaims > 0) {
    alerts.push({
      label: `${urgentClaims} reclamação${urgentClaims !== 1 ? 'ões' : ''} urgente${urgentClaims !== 1 ? 's' : ''}`,
      sub: 'Responda em até 48h',
      href: '/dashboard/reclamacoes',
      color: 'border-l-red-500',
      icon: AlertTriangle,
    })
  }
  if (hasML && rupturasCount > 0) {
    alerts.push({
      label: `${rupturasCount} anúncio${rupturasCount !== 1 ? 's' : ''} sem estoque`,
      sub: 'Atualize para não perder vendas',
      href: '/dashboard/estoque?filter=ruptura',
      color: 'border-l-amber-500',
      icon: Archive,
    })
  }
  if (hasML && questions > 0) {
    alerts.push({
      label: `${questions} pergunta${questions !== 1 ? 's' : ''} pendente${questions !== 1 ? 's' : ''}`,
      sub: 'Responda rápido para melhorar reputação',
      href: '/dashboard/sac',
      color: 'border-l-amber-500',
      icon: MessageSquare,
    })
  }
  if (hasML && healthScore !== null && healthScore < 70) {
    alerts.push({
      label: `Saúde da conta: ${healthScore}/100`,
      sub: healthScore < 50 ? 'Atenção urgente necessária' : 'Precisa de cuidados',
      href: '/dashboard/saude',
      color: healthScore < 50 ? 'border-l-red-500' : 'border-l-yellow-500',
      icon: Activity,
    })
  }

  // ── Quick links ──────────────────────────────────────────────────────
  const quickLinks = [
    { label: 'Pedidos ML',    icon: ShoppingBag,  href: '/dashboard/pedidos',        show: hasML },
    { label: 'Pedidos Magalu', icon: ShoppingCart, href: '/dashboard/magalu/pedidos', show: hasMagalu },
    { label: 'DRE',           icon: BarChart3,     href: '/dashboard/financeiro/dre', show: true },
    { label: 'Relatórios',    icon: FileText,      href: '/dashboard/relatorios',     show: true },
    { label: 'Magalu',        icon: Package,       href: '/dashboard/magalu/overview', show: hasMagalu },
    { label: 'Equipe',        icon: Users,         href: '/dashboard/equipe',         show: true },
    { label: 'Config',        icon: Settings,      href: '/dashboard/configuracoes',  show: true },
    { label: 'Ajuda',         icon: HelpCircle,    href: '/dashboard/ajuda',          show: true },
  ].filter(l => l.show)

  // ── Changelog hardcoded fallback ─────────────────────────────────────
  const changelogFallback: ChangelogEntry[] = [
    { id: '1', version: '2.1', title: 'Integração Magalu disponível!', description: 'Conecte sua conta Magalu para ver pedidos e produtos.', category: 'feature', published_at: '2026-03-24' },
    { id: '2', version: '2.0', title: 'Redesign completo + mascote Timm', description: 'Nova identidade visual com design system violeta/laranja.', category: 'improvement', published_at: '2026-03-24' },
    { id: '3', version: '1.9', title: 'DRE simplificado + lucro real', description: 'Calcule seu lucro real com custos e taxas.', category: 'feature', published_at: '2026-03-22' },
    { id: '4', version: '1.8', title: 'Auditoria de segurança + RLS', description: 'Políticas de segurança em todas as tabelas.', category: 'security', published_at: '2026-03-22' },
    { id: '5', version: '1.7', title: 'Sistema multi-usuário com convites', description: 'Adicione membros à sua equipe.', category: 'feature', published_at: '2026-03-22' },
  ]

  const displayChangelog = changelog.length > 0 ? changelog : changelogFallback

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      variants={stagger.container}
      initial="hidden"
      animate="visible"
    >
      <DevBanner />

      {/* ── Greeting ────────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-white">{greeting}, </span>
              <span className="text-gradient-violet">{firstName}!</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              {todayStr && <p className="text-sm text-slate-500">{todayStr}</p>}
              {connectedChannels.length > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <div className="flex items-center gap-2">
                    {connectedChannels.map(ch => (
                      <span key={ch.name} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${ch.dot}`} />
                        <span className={`text-xs ${ch.color}`}>{ch.name}</span>
                      </span>
                    ))}
                  </div>
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
      </motion.div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        {mlLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <KpiSkeleton key={i} />)}
          </div>
        ) : !anyMarketplace ? (
          <EmptyState
            image="connect"
            title="Conecte seu marketplace"
            description="Vincule Mercado Livre, Shopee ou Magalu para ver seus dados em tempo real."
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

      {/* ── Alerts ───────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <motion.div variants={stagger.item} className="space-y-2">
          {alerts.map((alert, i) => (
            <Link key={i} href={alert.href}>
              <div className={`flex items-center gap-3 p-3 glass-card border-l-4 ${alert.color} rounded-xl hover:shadow-glow-sm transition-all`}>
                <alert.icon className="w-4 h-4 text-white/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{alert.label}</p>
                  <p className="text-[11px] text-slate-500">{alert.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* ── Quick Links ──────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Atalhos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {quickLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="glass-card flex flex-col items-center gap-1.5 p-3 rounded-xl hover:border-primary-500/25 hover:shadow-glow-sm transition-all group"
            >
              <link.icon className="w-5 h-5 text-slate-400 group-hover:text-primary-400 transition-colors" />
              <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors text-center leading-tight">{link.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Channel Ranking ──────────────────────────────────────────── */}
      {connectedChannels.length > 0 && (
        <motion.div variants={stagger.item}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Channel revenue breakdown */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary-400" />
                Canais conectados
              </h3>
              <div className="space-y-3">
                {hasML && (
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Mercado Livre</span>
                    <span className="text-sm font-bold text-white font-mono">{revenue !== '—' ? revenue : 'Carregando...'}</span>
                  </div>
                )}
                {hasMagalu && (
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Magalu</span>
                    <Link href="/dashboard/magalu/overview" className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                      Ver dados <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
                {hasShopee && (
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    <span className="text-sm text-white flex-1">Shopee</span>
                    <Link href="/dashboard/shopee/overview" className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1">
                      Ver dados <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
              {!hasML && !hasMagalu && !hasShopee && (
                <p className="text-xs text-slate-600">Nenhum canal conectado.</p>
              )}
            </div>

            {/* SAC / Atendimento summary */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Atendimento
              </h3>
              <div className="space-y-3">
                <Link href="/dashboard/sac" className="flex items-center justify-between group">
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Perguntas pendentes</span>
                  <span className={`text-sm font-bold ${questions > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{questions}</span>
                </Link>
                <Link href="/dashboard/reclamacoes" className="flex items-center justify-between group">
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Reclamações urgentes</span>
                  <span className={`text-sm font-bold ${urgentClaims > 0 ? 'text-red-400' : 'text-slate-600'}`}>{urgentClaims}</span>
                </Link>
                <Link href="/dashboard/estoque?filter=ruptura" className="flex items-center justify-between group">
                  <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Rupturas de estoque</span>
                  <span className={`text-sm font-bold ${rupturasCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>{rupturasCount}</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Changelog / Updates ───────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              Novidades do Foguetim
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

      {/* ── Blog link ──────────────────────────────────────────────────── */}
      <motion.div variants={stagger.item}>
        <Link
          href="https://foguetim.com.br/blog"
          target="_blank"
          className="glass-card flex items-center gap-4 p-4 rounded-2xl hover:border-primary-500/25 hover:shadow-glow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">Blog Foguetim</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Dicas de e-commerce, finanças, marketing e gestão para quem vende online.
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-primary-400 transition-colors shrink-0" />
        </Link>
      </motion.div>
    </motion.div>
  )
}
