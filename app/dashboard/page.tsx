'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart,
  AlertTriangle, ArrowUpRight, ShoppingBag, MessageCircle,
  Truck, FileCheck, Plus, Tag, Calculator, Zap, BarChart3,
  Eye, Clock, Megaphone, Bell, Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

/* ── Notices & Changelog (informational content, not mock data) ─────────── */
const notices = [
  { badge: 'IMPORTANTE', badgeCls: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',        title: 'Black Friday 2026 — Prepare seu estoque com antecedência!',               date: '10/03/2026' },
  { badge: 'ATENÇÃO',    badgeCls: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',  title: 'Shopee: Novas regras de comissão a partir de Abril/2026',                  date: '08/03/2026' },
  { badge: 'OPORTUNIDADE',badgeCls:'bg-green-500/15 text-green-400 ring-1 ring-green-500/30',  title: 'Mercado Livre: Promoção relâmpago disponível para sellers Gold',           date: '07/03/2026' },
  { badge: 'NOVO',       badgeCls: 'bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30',title: 'Novo: Integração com TikTok Shop disponível no próximo update!',          date: '05/03/2026' },
]

const changelog = [
  { version: 'v1.1.0', title: 'Módulo de Expedição lançado!',   desc: 'Gerencie envios, gere etiquetas e acompanhe rastreamento.',              date: '12/03/2026' },
  { version: 'v1.0.5', title: 'Relatórios avançados',           desc: 'Novos gráficos de desempenho por marca e marketplace.',                  date: '10/03/2026' },
  { version: 'v1.0.0', title: 'Lançamento do Foguetim ERP',     desc: 'Dashboard, Produtos, Precificação, Listagens e Financeiro.',              date: '01/03/2026' },
]

/* ── Helpers ───────────────────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
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

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [infoTab, setInfoTab] = useState<'avisos' | 'updates'>('avisos')
  const { user } = useAuth()

  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? 'lá'

  return (
    <div>
      <div className="p-6 space-y-6">

        {/* ── Greeting ── */}
        <div className="animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                {greeting()}, {firstName}! 👋
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Conecte seus canais de venda para ver seus dados em tempo real.
              </p>
            </div>
            <p className="text-xs text-slate-600 shrink-0">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
          {[
            { label: 'Receita do mês',    value: 'R$ 0,00',  icon: DollarSign,   color: 'text-purple-400 bg-purple-400/10', href: '/dashboard/financeiro' },
            { label: 'Lucro líquido',     value: 'R$ 0,00',  icon: TrendingUp,   color: 'text-green-400 bg-green-400/10',   href: '/dashboard/financeiro' },
            { label: 'Pedidos realizados',value: '0',        icon: ShoppingCart, color: 'text-cyan-400 bg-cyan-400/10',     href: '/dashboard/pedidos'    },
            { label: 'Produtos ativos',   value: '0',        icon: Package,      color: 'text-orange-400 bg-orange-400/10', href: '/dashboard/produtos'   },
          ].map(k => (
            <Link key={k.label} href={k.href}
              className="dash-card p-4 rounded-2xl hover:border-purple-600/20 hover:shadow-lg hover:shadow-purple-900/10 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider leading-tight">{k.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}>
                  <k.icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{k.value}</p>
              <p className="text-[10px] text-slate-600 mt-1.5">Nenhum dado ainda</p>
            </Link>
          ))}
        </div>

        {/* ── Task Boxes ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">

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
                { label: 'Para Reservar',          val: 0, level: 'muted' as const, href: '/dashboard/pedidos' },
                { label: 'Para Emitir NF-e',       val: 0, level: 'muted' as const, href: '/dashboard/nfe'     },
                { label: 'Para Enviar',             val: 0, level: 'muted' as const, href: '/dashboard/expedicao'},
                { label: 'Expirando',               val: 0, level: 'muted' as const, href: '/dashboard/pedidos' },
                { label: 'Para Imprimir Etiqueta',  val: 0, level: 'muted' as const, href: '/dashboard/expedicao'},
                { label: 'Devoluções Pendentes',    val: 0, level: 'muted' as const, href: '/dashboard/pedidos' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-600">{item.val}</span>
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
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Estoque</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {[
                { label: 'Estoque Baixo',    val: 0, level: 'muted' as const, href: '/dashboard/produtos?filtro=estoque-baixo' },
                { label: 'Sem Estoque',      val: 0, level: 'muted' as const, href: '/dashboard/produtos?filtro=sem-estoque'   },
                { label: 'Produtos Ativos',  val: 0, level: 'muted' as const, href: '/dashboard/produtos'                      },
                { label: 'Produtos Inativos',val: 0, level: 'muted' as const, href: '/dashboard/produtos'                      },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-600">{item.val}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
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
                { label: 'Perguntas Pendentes ML',    val: 0, level: 'muted' as const, href: '/dashboard/sac' },
                { label: 'Mensagens Não Lidas',        val: 0, level: 'muted' as const, href: '/dashboard/sac' },
                { label: 'Reclamações Pendentes',     val: 0, level: 'muted' as const, href: '/dashboard/sac' },
                { label: 'Devoluções / Reembolsos',   val: 0, level: 'muted' as const, href: '/dashboard/sac' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-600">{item.val}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
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
              { icon: DollarSign,  label: 'Novo Lançamento',   href: '/dashboard/financeiro'  },
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
                message="Nenhum dado de vendas ainda"
                hint="Conecte seus canais de venda em Integrações para começar"
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
                message="Nenhum pedido encontrado"
                hint="Os pedidos aparecerão aqui após conectar seus marketplaces"
              />
            </div>
          </div>

          {/* Right: Platform distribution + Low stock */}
          <div className="space-y-4">
            <div className="dash-card p-5 rounded-2xl">
              <p className="font-bold text-white text-sm mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Vendas por Plataforma</p>
              <p className="text-xs text-slate-600 mb-4">Distribuição no mês</p>
              <EmptyCard
                message="Nenhuma venda ainda"
                hint="Conecte marketplaces para ver a distribuição"
              />
            </div>

            {/* Low stock */}
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
            {/* Tabs */}
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
              {[
                { label: 'Visitas hoje',        val: '0',   color: 'text-slate-500', icon: Eye         },
                { label: 'Taxa de conversão',   val: '—',   color: 'text-slate-500', icon: TrendingUp  },
                { label: 'Anúncios ativos',     val: '0',   color: 'text-slate-500', icon: Zap         },
                { label: 'Anúncios pausados',   val: '0',   color: 'text-slate-500', icon: Clock       },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <s.icon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs text-slate-500">{s.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${s.color}`}>{s.val}</span>
                </div>
              ))}

              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <p className="text-[10px] text-slate-600 mb-1.5 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Melhor anúncio do mês
                </p>
                <p className="text-xs text-slate-600 italic">Nenhum dado disponível</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
