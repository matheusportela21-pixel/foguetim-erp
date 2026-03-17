'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  TrendingUp, Package, DollarSign, ShoppingCart,
  AlertTriangle, ArrowUpRight, ShoppingBag, MessageCircle,
  Truck, FileCheck, Plus, Tag, Calculator, Zap, BarChart3,
  Eye, Clock, Megaphone, Bell, Sparkles, Loader2, Link2, ShieldCheck, Menu,
  Shield, ChevronRight, MessageSquare, Archive, Activity, Calendar,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/context/SidebarContext'
import { getGreeting, formatBrasiliaDate, daysUntil } from '@/lib/utils/timezone'
import { getUpcomingEvents } from '@/lib/data/datas-comemorativas'

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

/* ── Notices & Changelog (informational content, not mock data) ─────────── */
const notices = [
  { badge: 'IMPORTANTE',  badgeCls: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',        title: 'Black Friday 2026 — Prepare seu estoque com antecedência!',                date: '10/03/2026' },
  { badge: 'OPORTUNIDADE', badgeCls: 'bg-green-500/15 text-green-400 ring-1 ring-green-500/30', title: 'Mercado Livre: Promoção relâmpago disponível para sellers Gold',            date: '07/03/2026' },
  { badge: 'NOVO',         badgeCls: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30', title: 'Foguetim ERP v1.1 lançado — Integração ML com pedidos e SAC em tempo real!', date: '14/03/2026' },
]

const changelog = [
  { version: 'v1.1.0', title: 'Integração Mercado Livre lançada!', desc: 'Sincronize anúncios, pedidos e perguntas do ML em tempo real.', date: '14/03/2026' },
  { version: 'v1.0.5', title: 'Relatórios avançados',             desc: 'Novos gráficos de desempenho por marca e marketplace.',         date: '10/03/2026' },
  { version: 'v1.0.0', title: 'Lançamento do Foguetim ERP',       desc: 'Dashboard, Produtos, Precificação, Listagens e Financeiro.',    date: '01/03/2026' },
]

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
    <div className="dash-card p-4 rounded-2xl animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-2.5 w-24 bg-slate-800 rounded" />
        <div className="w-7 h-7 rounded-lg bg-slate-800" />
      </div>
      <div className="h-6 w-20 bg-slate-800 rounded mb-2" />
      <div className="h-2 w-32 bg-slate-800 rounded" />
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
  const { user, profile } = useAuth()

  const { toggle } = useSidebar()
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

  /* Derived KPI values */
  const ml = metrics
  const revenue   = ml?.connected ? fmtBRL(ml.revenue30d ?? 0)       : 'R$ 0,00'
  const orders    = ml?.connected ? String(ml.totalOrders30d ?? 0)    : '0'
  const active    = ml?.connected ? String(ml.totalActive ?? 0)       : '0'
  const questions = ml?.connected ? (ml.pendingQuestions ?? 0)        : 0

  const dotLevel = (n: number): 'ok' | 'warn' | 'danger' | 'muted' =>
    !ml?.connected ? 'muted' : n > 5 ? 'danger' : n > 0 ? 'warn' : 'ok'

  return (
    <div>
      <div className="p-6 space-y-6">

        {/* ── Mobile sticky nav strip ── */}
        <div className="md:hidden sticky top-0 -mx-6 -mt-6 px-4 py-3 bg-dark-900/90 backdrop-blur border-b border-white/[0.06] flex items-center gap-3 z-20 mb-2">
          <button
            onClick={toggle}
            aria-label="Abrir menu"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Dashboard</span>
        </div>

        {/* ── Greeting ── */}
        <div className="animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                {greeting}, {firstName}! 👋
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {ml?.connected
                  ? `Conta ML: ${ml.nickname} · dados dos últimos 30 dias`
                  : 'Conecte seus canais de venda para ver seus dados em tempo real.'}
              </p>
            </div>
            {todayStr && (
              <p className="text-xs text-slate-600 shrink-0">{todayStr}</p>
            )}
          </div>
        </div>

        {/* ── Urgent claims alert ── */}
        {urgentClaims > 0 && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 animate-slide-up">
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

        {/* ── Ruptura de estoque alert ── */}
        {rupturasCount > 0 && (
          <Link href="/dashboard/estoque?filter=ruptura">
            <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-800/40 rounded-xl hover:bg-red-900/30 transition-colors">
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
        {healthScore !== null && healthScore < 70 && (
          <Link href="/dashboard/saude">
            <div className={`flex items-center gap-3 p-4 rounded-xl border hover:opacity-90 transition-opacity ${
              healthScore < 50
                ? 'bg-red-950/30 border-red-800/40'
                : 'bg-yellow-950/20 border-yellow-800/40'
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
        {nextHoliday && (
          <Link href="/dashboard/calendario">
            <div className="flex items-center gap-3 p-4 bg-purple-950/30 border border-purple-800/40 rounded-xl hover:bg-purple-900/30 transition-colors">
              <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {nextHoliday.icone} {nextHoliday.nome} em {nextHoliday.days} dia{nextHoliday.days !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-purple-400 mt-0.5">Clique para planejar sua promoção</p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-600 shrink-0" />
            </div>
          </Link>
        )}

        {/* ── KPIs ── */}
        {mlLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <KpiSkeleton key={i} />)}
          </div>
        ) : !ml?.connected ? (
          <div className="dash-card p-5 rounded-2xl flex items-center gap-4 border-dashed">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Conecte seu Mercado Livre para ver métricas reais</p>
              <p className="text-xs text-slate-500 mt-0.5">Pedidos, faturamento e anúncios aparecerão aqui automaticamente.</p>
            </div>
            <Link href="/dashboard/integracoes"
              className="shrink-0 px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition-colors">
              Conectar ML
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
            {[
              { label: 'Faturamento 30d',   value: revenue,   sub: 'Mercado Livre',       icon: DollarSign,   color: 'text-purple-400 bg-purple-400/10', href: '/dashboard/financeiro', tooltip: 'Receita bruta dos últimos 30 dias no Mercado Livre' },
              { label: 'Pedidos 30d',       value: orders,    sub: 'Mercado Livre',       icon: ShoppingCart, color: 'text-cyan-400 bg-cyan-400/10',     href: '/dashboard/pedidos',    tooltip: 'Total de pedidos recebidos nos últimos 30 dias' },
              { label: 'Anúncios Ativos',   value: active,    sub: 'Mercado Livre',       icon: Package,      color: 'text-orange-400 bg-orange-400/10', href: '/dashboard/produtos',   tooltip: 'Total de anúncios ativos sincronizados' },
              { label: 'Perguntas Pend.',   value: questions, sub: questions > 0 ? 'Ver Central Pós-Venda' : 'Nenhuma pendente', icon: MessageSquare, color: questions > 0 ? 'text-orange-400 bg-orange-400/10' : 'text-green-400 bg-green-400/10', href: '/dashboard/pos-venda', tooltip: 'Perguntas não respondidas dos seus compradores no ML' },
            ].map(k => (
              <Link key={k.label} href={k.href}
                className="dash-card p-4 rounded-2xl hover:border-purple-600/20 hover:shadow-lg hover:shadow-purple-900/10 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider leading-tight cursor-default">{k.label}</p>
                    <KpiTooltip text={k.tooltip} />
                  </div>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}>
                    <k.icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{k.value}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">{k.sub}</p>
              </Link>
            ))}
          </div>
        )}

        {/* ── Task Boxes ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">

          {/* Pedidos */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Pedidos</p>
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
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Anúncios ML</p>
            </div>
            {mlLoading ? (
              <div className="p-4 flex items-center gap-2 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {[
                  { label: 'Anúncios Ativos',   val: ml?.connected ? ml.totalActive ?? 0 : 0, level: ml?.connected && (ml.totalActive ?? 0) > 0 ? 'ok' as const : 'muted' as const, href: '/dashboard/produtos' },
                  { label: 'Anúncios Pausados', val: 0, level: 'muted' as const, href: '/dashboard/produtos' },
                  { label: 'Em Revisão',        val: 0, level: 'muted' as const, href: '/dashboard/produtos' },
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
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>SAC / Atendimento</p>
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
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Reputação ML</p>
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

        {/* ── Quick Actions ── */}
        <div className="animate-slide-up">
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3">Ações Rápidas</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { icon: Plus,        label: 'Cadastrar Produto', href: '/dashboard/produtos'    },
              { icon: Tag,         label: 'Nova Listagem',     href: '/dashboard/listagens'   },
              { icon: Calculator,  label: 'Calcular Preço',    href: '/dashboard/precificacao'},
              { icon: FileCheck,   label: 'Emitir NF-e',       href: '/dashboard/nfe'         },
              { icon: Truck,       label: 'Gerar Etiqueta',    href: '/dashboard/expedicao'   },
              { icon: DollarSign,  label: 'Financeiro',        href: '/dashboard/financeiro'  },
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
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Receita vs Lucro</p>
                  <p className="text-xs text-slate-600 mt-0.5">Últimos 6 meses</p>
                </div>
              </div>
              <EmptyCard
                message="Gráfico em desenvolvimento"
                hint="Em breve: evolução de receita e lucro por período"
              />
            </div>

            {/* Recent orders */}
            <div className="dash-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Últimos Pedidos</p>
                <Link href="/dashboard/pedidos" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                  Ver todos <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <EmptyCard
                message="Acesse Pedidos para ver os pedidos do ML"
                hint="Os pedidos são carregados diretamente da API do Mercado Livre"
              />
            </div>
          </div>

          {/* Right: Platform distribution + Stats */}
          <div className="space-y-4">
            <div className="dash-card p-5 rounded-2xl">
              <p className="font-bold text-white text-sm mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Vendas por Plataforma</p>
              <p className="text-xs text-slate-600 mb-4">Distribuição no mês</p>
              <EmptyCard
                message="Apenas ML integrado"
                hint="Novas integrações em breve"
              />
            </div>

            {/* Estoque crítico */}
            <div className="dash-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Estoque Crítico</p>
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
                  {t === 'avisos' ? <><Bell className="w-3.5 h-3.5" /> Avisos</> : <><Sparkles className="w-3.5 h-3.5" /> Notas de Atualização</>}
                </button>
              ))}
            </div>

            {infoTab === 'avisos' && (
              <div className="divide-y divide-white/[0.04]">
                {notices.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${n.badgeCls}`}>{n.badge}</span>
                    <p className="text-xs text-slate-300 flex-1 leading-relaxed">{n.title}</p>
                    <span className="text-[10px] text-slate-600 shrink-0">{n.date}</span>
                  </div>
                ))}
              </div>
            )}

            {infoTab === 'updates' && (
              <div className="divide-y divide-white/[0.04]">
                {changelog.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 shrink-0 mt-0.5 font-mono">
                      {c.version}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{c.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{c.desc}</p>
                    </div>
                    <span className="text-[10px] text-slate-600 shrink-0">{c.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ad Performance */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-green-400" />
              </div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Performance de Anúncios</p>
            </div>
            <div className="p-4 space-y-3">
              {mlLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
