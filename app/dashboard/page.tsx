'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart,
  AlertTriangle, ArrowUpRight, ShoppingBag, MessageCircle,
  Truck, FileCheck, Plus, Tag, Calculator, Zap, BarChart3,
  Eye, RotateCcw, Clock, Megaphone, Bell, Sparkles,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

/* ── Mock data ─────────────────────────────────────────────────────────── */
const salesData = [
  { mes: 'Out', receita: 31200, lucro: 12800 },
  { mes: 'Nov', receita: 39800, lucro: 17700 },
  { mes: 'Dez', receita: 58400, lucro: 27200 },
  { mes: 'Jan', receita: 34600, lucro: 14800 },
  { mes: 'Fev', receita: 47200, lucro: 21600 },
  { mes: 'Mar', receita: 52800, lucro: 24700 },
]

const platformData = [
  { name: 'Mercado Livre', value: 54, color: '#f59e0b' },
  { name: 'Shopee',        value: 31, color: '#f97316' },
  { name: 'Amazon',        value: 15, color: '#06b6d4' },
]

const recentOrders = [
  { id: '#ML-48291', produto: 'Óleo Capilar Fio Cabana 100ml',   cliente: 'Ana Beatriz Sousa',  plat: 'ML',  valor: 'R$ 89,90',  status: 'enviado'   },
  { id: '#SP-19847', produto: 'Shampoo Castilla Antiqueda 400ml',cliente: 'Carlos H. Lima',      plat: 'SP',  valor: 'R$ 69,90',  status: 'pago'      },
  { id: '#AMZ-7734', produto: 'Sérum Facial BioSeiva Vit. C',    cliente: 'Fernanda Gomes',      plat: 'AMZ', valor: 'R$ 119,90', status: 'entregue'  },
  { id: '#ML-48278', produto: 'Condicionador Kronel Hidratação', cliente: 'José R. Silva',       plat: 'ML',  valor: 'R$ 59,90',  status: 'cancelado' },
  { id: '#SP-19821', produto: 'Máscara Capilar Lanossi 300g',    cliente: 'M. das Graças Reis',  plat: 'SP',  valor: 'R$ 69,90',  status: 'pago'      },
]

const lowStockItems = [
  { nome: 'Sérum Facial BioSeiva Vitamina C', estoque: 8,  minimo: 20 },
  { nome: 'Shampoo Castilla Antiqueda 400ml', estoque: 14, minimo: 30 },
  { nome: 'Hidratante Zalike Corporal 200ml', estoque: 5,  minimo: 15 },
  { nome: 'Kronel Leave-in Protetor 200ml',   estoque: 11, minimo: 25 },
]

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
const platColor: Record<string, string> = {
  ML:  'text-amber-400 bg-amber-400/10',
  SP:  'text-orange-400 bg-orange-400/10',
  AMZ: 'text-cyan-400 bg-cyan-400/10',
}

const statusCls: Record<string, string> = {
  pago:      'text-blue-400 bg-blue-400/10',
  enviado:   'text-purple-400 bg-purple-400/10',
  entregue:  'text-green-400 bg-green-400/10',
  cancelado: 'text-red-400 bg-red-400/10',
}

const statusLabel: Record<string, string> = {
  pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-700 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="mb-0.5">
          {p.name}: R$ {p.value.toLocaleString('pt-BR')}
        </p>
      ))}
    </div>
  )
}

/* ── Task dot ──────────────────────────────────────────────────────────── */
function Dot({ level }: { level: 'ok' | 'warn' | 'danger' | 'muted' }) {
  const cls = { ok: 'bg-green-400', warn: 'bg-amber-400', danger: 'bg-red-400 animate-pulse', muted: 'bg-slate-600' }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${cls[level]}`} />
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [infoTab, setInfoTab] = useState<'avisos' | 'updates'>('avisos')

  return (
    <div>
      <div className="p-6 space-y-6">

        {/* ── Greeting ── */}
        <div className="animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                {greeting()}, Matheus! 👋
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Você tem{' '}
                <Link href="/dashboard/nfe"        className="text-amber-400 font-semibold hover:underline">8 notas para emitir</Link>,{' '}
                <Link href="/dashboard/expedicao"  className="text-purple-400 font-semibold hover:underline">5 pedidos para enviar</Link>{' '}
                e{' '}
                <span className="text-red-400 font-semibold">1 reclamação pendente</span>
              </p>
            </div>
            <p className="text-xs text-slate-600 shrink-0">Quarta-feira, 12 de Março de 2026</p>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
          {[
            { label: 'Receita do mês',    value: 'R$ 52.800', change: 11.8,  icon: DollarSign,   color: 'text-purple-400 bg-purple-400/10', href: '/dashboard/financeiro' },
            { label: 'Lucro líquido',     value: 'R$ 24.700', change: 14.4,  icon: TrendingUp,   color: 'text-green-400 bg-green-400/10',   href: '/dashboard/financeiro' },
            { label: 'Pedidos realizados',value: '1.211',      change: 8.3,   icon: ShoppingCart, color: 'text-cyan-400 bg-cyan-400/10',     href: '/dashboard/pedidos'    },
            { label: 'Produtos ativos',   value: '487',        change: -2.1,  icon: Package,      color: 'text-orange-400 bg-orange-400/10', href: '/dashboard/produtos'   },
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
              <div className={`flex items-center gap-1 text-[10px] font-semibold mt-1.5 ${k.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {k.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {k.change >= 0 ? '+' : ''}{k.change}% vs anterior
              </div>
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
                { label: 'Para Reservar',          val: 3,  level: 'warn'   as const, href: '/dashboard/pedidos' },
                { label: 'Para Emitir NF-e',       val: 8,  level: 'warn'   as const, href: '/dashboard/nfe'     },
                { label: 'Para Enviar',             val: 5,  level: 'warn'   as const, href: '/dashboard/expedicao'},
                { label: 'Expirando',               val: 1,  level: 'danger' as const, href: '/dashboard/pedidos' },
                { label: 'Para Imprimir Etiqueta',  val: 4,  level: 'ok'     as const, href: '/dashboard/expedicao'},
                { label: 'Devoluções Pendentes',    val: 2,  level: 'danger' as const, href: '/dashboard/pedidos' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${item.level === 'danger' ? 'text-red-400' : item.level === 'warn' ? 'text-amber-400' : 'text-green-400'}`}>
                      {item.val}
                    </span>
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
                { label: 'Estoque Baixo',    val: 6,   level: 'warn'   as const, href: '/dashboard/produtos?filtro=estoque-baixo' },
                { label: 'Sem Estoque',      val: 3,   level: 'danger' as const, href: '/dashboard/produtos?filtro=sem-estoque'   },
                { label: 'Produtos Ativos',  val: 487, level: 'ok'     as const, href: '/dashboard/produtos'                      },
                { label: 'Produtos Inativos',val: 12,  level: 'muted'  as const, href: '/dashboard/produtos'                      },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${
                      item.level === 'danger' ? 'text-red-400' : item.level === 'warn' ? 'text-amber-400' : item.level === 'ok' ? 'text-green-400' : 'text-slate-500'
                    }`}>{item.val}</span>
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
                { label: 'Perguntas Pendentes ML',    val: 4, level: 'warn'   as const, href: '/dashboard/pedidos' },
                { label: 'Mensagens Não Lidas Shopee', val: 2, level: 'warn'   as const, href: '/dashboard/pedidos' },
                { label: 'Reclamações Pendentes',     val: 1, level: 'danger' as const, href: '/dashboard/pedidos' },
                { label: 'Devoluções / Reembolsos',   val: 2, level: 'warn'   as const, href: '/dashboard/pedidos' },
              ].map(item => (
                <Link key={item.label} href={item.href}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Dot level={item.level} />
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${item.level === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
                      {item.val}
                    </span>
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

          {/* Left: Area chart + Recent orders */}
          <div className="lg:col-span-2 space-y-4">
            <div className="dash-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Receita vs Lucro</p>
                  <p className="text-xs text-slate-600 mt-0.5">Últimos 6 meses</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Receita</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Lucro</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={salesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#7c3aed" strokeWidth={2} fill="url(#gReceita)" />
                  <Area type="monotone" dataKey="lucro"   name="Lucro"   stroke="#06b6d4" strokeWidth={2} fill="url(#gLucro)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent orders */}
            <div className="dash-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Últimos Pedidos</p>
                <Link href="/dashboard/pedidos" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                  Ver todos <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recentOrders.map(o => (
                  <div key={o.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <span className="text-[10px] font-mono text-slate-600 w-20 shrink-0">{o.id}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{o.produto}</p>
                      <p className="text-[10px] text-slate-600">{o.cliente}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${platColor[o.plat]}`}>{o.plat}</span>
                    <span className="text-xs font-semibold text-white shrink-0">{o.valor}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusCls[o.status]}`}>
                      {statusLabel[o.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Donut + Low stock */}
          <div className="space-y-4">
            <div className="dash-card p-5 rounded-2xl">
              <p className="font-bold text-white text-sm mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Vendas por Plataforma</p>
              <p className="text-xs text-slate-600 mb-4">Distribuição no mês</p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                    {platformData.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: '#1c2233', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {platformData.map(p => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
                      <span className="text-slate-400">{p.name}</span>
                    </div>
                    <span className="font-bold text-white">{p.value}%</span>
                  </div>
                ))}
              </div>
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
              <div className="divide-y divide-white/[0.04]">
                {lowStockItems.map(item => (
                  <div key={item.nome} className="px-4 py-2.5">
                    <p className="text-[11px] font-medium text-white truncate mb-1.5">{item.nome}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((item.estoque / item.minimo) * 100, 100)}%`,
                            background: item.estoque / item.minimo < 0.4 ? '#ef4444' : '#f59e0b',
                          }} />
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 shrink-0 w-10 text-right">
                        {item.estoque}/{item.minimo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
                { label: 'Visitas hoje',        val: '1.247', color: 'text-white',        icon: Eye         },
                { label: 'Taxa de conversão',   val: '3,8%',  color: 'text-green-400',    icon: TrendingUp  },
                { label: 'Anúncios ativos',     val: '312',   color: 'text-purple-400',   icon: Zap         },
                { label: 'Anúncios pausados',   val: '15',    color: 'text-slate-500',    icon: Clock       },
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
                <p className="text-xs font-semibold text-white leading-tight">Óleo Capilar Fio Cabana 100ml</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-slate-600">89 vendas este mês</p>
                  <Link href="/dashboard/produtos" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors">
                    Ver <ArrowUpRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
                <div className="mt-2 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-purple-600 to-cyan-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
