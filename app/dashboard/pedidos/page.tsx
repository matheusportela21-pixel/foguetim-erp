'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, Clock, Package, Truck, CheckCircle2, XCircle,
  CircleDollarSign, ScanLine, Send, RotateCcw, Star,
  Search, Filter, Eye, Printer, Tag, X, CheckSquare, Square,
  AlertTriangle, Bell, ChevronDown, ChevronUp, ArrowUpDown,
  TrendingUp, Calendar, MapPin, Zap,
} from 'lucide-react'
import {
  PEDIDOS, STATUS_META, MKT_META,
  type Pedido, type PedidoStatus, type MKTPedido,
} from './_data'

// ─── HELPERS ────────────────────────────────────────────────────────────────

const TODAY    = '2026-03-12'
const TOMORROW = '2026-03-13'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function prazoStatus(prazo: string): 'urgent' | 'tomorrow' | 'ok' {
  if (prazo <= TODAY) return 'urgent'
  if (prazo === TOMORROW) return 'tomorrow'
  return 'ok'
}

function ordinalCompra(n: number) {
  if (n === 0) return null
  return `${n + 1}ª compra`
}

// ─── STATUS ICON ────────────────────────────────────────────────────────────

function StatusIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? 'w-3.5 h-3.5'
  const map: Record<string, JSX.Element> = {
    CircleDollarSign: <CircleDollarSign className={cls} />,
    ScanLine:         <ScanLine className={cls} />,
    Package:          <Package className={cls} />,
    Send:             <Send className={cls} />,
    Truck:            <Truck className={cls} />,
    CheckCircle2:     <CheckCircle2 className={cls} />,
    XCircle:          <XCircle className={cls} />,
    RotateCcw:        <RotateCcw className={cls} />,
  }
  return map[name] ?? null
}

// ─── KPI CARD ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, iconCls, urgent, pulse,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; iconCls: string; urgent?: boolean; pulse?: boolean
}) {
  return (
    <div className={`glass-card rounded-2xl p-4 flex flex-col gap-3 ${urgent ? 'ring-1 ring-red-500/30 bg-red-500/[0.03]' : ''}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs text-slate-500 font-medium leading-snug">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className={`text-2xl font-bold ${urgent ? 'text-red-400' : 'text-white'} ${pulse ? 'animate-pulse' : ''}`}>
          {value}
        </div>
        {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<PedidoStatus | 'todos'>('todos')
  const [mktFilter, setMktFilter]         = useState<MKTPedido[]>([])
  const [periodoFilter, setPeriodoFilter] = useState<'hoje' | '7d' | '30d' | 'todos'>('todos')
  const [selected, setSelected]           = useState<number[]>([])
  const [showFilters, setShowFilters]     = useState(false)
  const [sortBy, setSortBy]               = useState<'data' | 'valor' | 'prazo' | 'lucro'>('data')
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc')
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // ── KPIs ──
  const todayOrders = useMemo(() => PEDIDOS.filter(p => p.data.startsWith(TODAY)), [])
  const kpis = useMemo(() => {
    const faturamentoHoje = todayOrders.reduce(
      (s, p) => s + p.financeiro.valorProdutos + p.financeiro.freteCliente, 0,
    )
    return {
      pedidosHoje:     todayOrders.length,
      aguardandoEnvio: PEDIDOS.filter(p => ['pago', 'separando', 'embalado'].includes(p.status)).length,
      enviadosHoje:    PEDIDOS.filter(p => p.status === 'enviado' && p.data.startsWith(TODAY)).length,
      faturamentoHoje,
      ticketMedio:     todayOrders.length ? faturamentoHoje / todayOrders.length : 0,
      prazosHoje:      PEDIDOS.filter(p =>
        p.prazoPostagem <= TODAY && !['entregue', 'cancelado', 'devolvido', 'enviado', 'em_transito'].includes(p.status)
      ).length,
    }
  }, [todayOrders])

  // ── Filters ──
  const filteredPedidos = useMemo(() => {
    let list = [...PEDIDOS]

    if (statusFilter !== 'todos') list = list.filter(p => p.status === statusFilter)
    if (mktFilter.length > 0)     list = list.filter(p => mktFilter.includes(p.marketplace))
    if (periodoFilter === 'hoje') list = list.filter(p => p.data.startsWith(TODAY))
    if (periodoFilter === '7d')   list = list.filter(p => p.data >= '2026-03-05')
    if (periodoFilter === '30d')  list = list.filter(p => p.data >= '2026-02-10')

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.numero.toLowerCase().includes(q) ||
        p.cliente.nome.toLowerCase().includes(q) ||
        p.itens.some(i => i.sku.toLowerCase().includes(q) || i.nome.toLowerCase().includes(q))
      )
    }

    list.sort((a, b) => {
      let va: number, vb: number
      switch (sortBy) {
        case 'valor':
          va = a.financeiro.valorProdutos; vb = b.financeiro.valorProdutos; break
        case 'prazo':
          va = new Date(a.prazoPostagem).getTime(); vb = new Date(b.prazoPostagem).getTime(); break
        case 'lucro':
          va = a.financeiro.lucro; vb = b.financeiro.lucro; break
        default:
          va = new Date(a.data).getTime(); vb = new Date(b.data).getTime()
      }
      return sortDir === 'desc' ? vb - va : va - vb
    })

    return list
  }, [search, statusFilter, mktFilter, periodoFilter, sortBy, sortDir])

  // ── Selection ──
  const allSelected = selected.length === filteredPedidos.length && filteredPedidos.length > 0

  const toggleSelect = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleSelectAll = () =>
    setSelected(allSelected ? [] : filteredPedidos.map(p => p.id))

  const toggleMkt = (mkt: MKTPedido) =>
    setMktFilter(prev => prev.includes(mkt) ? prev.filter(m => m !== mkt) : [...prev, mkt])

  const clearFilters = () => {
    setSearch(''); setStatusFilter('todos'); setMktFilter([]); setPeriodoFilter('todos')
  }

  const sortToggle = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronUp className="w-3 h-3 ml-1" />)
      : <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />

  const dismissAlert = (key: string) =>
    setDismissedAlerts(prev => [...prev, key])

  const urgentCount = kpis.prazosHoje
  const devolucoesCount = PEDIDOS.filter(p => p.status === 'devolvido').length

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── HEADER ── */}
      <div className="dash-header sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white">Pedidos</h1>
          <p className="text-slate-500 text-sm">Gerencie todos os pedidos da sua loja</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
            <Bell className="w-5 h-5" />
            {urgentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {urgentCount}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-xs font-bold text-white">
            MP
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Pedidos Hoje" value={kpis.pedidosHoje} sub="+3 vs ontem"
            icon={ShoppingCart} iconCls="bg-purple-400/10 text-purple-400" />
          <KpiCard label="Aguardando Envio" value={kpis.aguardandoEnvio}
            sub={kpis.aguardandoEnvio > 5 ? '⚠ Acima do ideal' : 'Normal'}
            icon={Package} iconCls={kpis.aguardandoEnvio > 5 ? 'bg-red-400/10 text-red-400' : 'bg-blue-400/10 text-blue-400'}
            urgent={kpis.aguardandoEnvio > 5} />
          <KpiCard label="Enviados Hoje" value={kpis.enviadosHoje} sub="via Correios + Jadlog"
            icon={Send} iconCls="bg-emerald-400/10 text-emerald-400" />
          <KpiCard label="Faturamento Hoje" value={fmt(kpis.faturamentoHoje)}
            icon={TrendingUp} iconCls="bg-cyan-400/10 text-cyan-400" />
          <KpiCard label="Ticket Médio" value={fmt(kpis.ticketMedio)}
            icon={CircleDollarSign} iconCls="bg-indigo-400/10 text-indigo-400" />
          <KpiCard label="Prazo Hoje" value={kpis.prazosHoje} sub="precisam ser postados"
            icon={Clock} iconCls={kpis.prazosHoje > 0 ? 'bg-red-400/10 text-red-400' : 'bg-slate-700 text-slate-500'}
            urgent={kpis.prazosHoje > 0} pulse={kpis.prazosHoje > 0} />
        </div>

        {/* ── ALERT BANNERS ── */}
        <div className="space-y-2">
          {!dismissedAlerts.includes('urgent') && urgentCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-sm">🔴</span>
              <button
                onClick={() => { setStatusFilter('todos'); setDismissedAlerts([]); setSortBy('prazo'); setSortDir('asc') }}
                className="flex-1 text-left text-sm text-red-300 font-medium hover:text-red-200 transition-colors">
                {urgentCount} pedido{urgentCount > 1 ? 's precisam' : ' precisa'} ser enviado{urgentCount > 1 ? 's' : ''} HOJE! — clique para filtrar
              </button>
              <button onClick={() => dismissAlert('urgent')} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {!dismissedAlerts.includes('stuck') && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-sm">⚠️</span>
              <button className="flex-1 text-left text-sm text-amber-300 hover:text-amber-200 transition-colors">
                2 pedidos parados há mais de 48h sem atualização — clique para ver
              </button>
              <button onClick={() => dismissAlert('stuck')} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {!dismissedAlerts.includes('devol') && devolucoesCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <span className="text-sm">📦</span>
              <button
                onClick={() => { setStatusFilter('devolvido'); dismissAlert('devol') }}
                className="flex-1 text-left text-sm text-orange-300 hover:text-orange-200 transition-colors">
                {devolucoesCount} devolução pendente de aprovação — clique para ver
              </button>
              <button onClick={() => dismissAlert('devol')} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── FILTERS ── */}
        <div className="dash-card rounded-2xl p-4 space-y-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por Nº pedido, cliente ou SKU..."
                className="input-cyber w-full pl-10 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                showFilters ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' : 'border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}>
              <Filter className="w-4 h-4" />
              Filtros
              {(statusFilter !== 'todos' || mktFilter.length > 0 || periodoFilter !== 'todos') && (
                <span className="w-2 h-2 bg-purple-400 rounded-full" />
              )}
            </button>
            {(statusFilter !== 'todos' || mktFilter.length > 0 || periodoFilter !== 'todos' || search) && (
              <button onClick={clearFilters} className="text-xs text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="border-t border-white/[0.06] pt-3 space-y-4">
              {/* Status */}
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['todos', 'pago', 'separando', 'embalado', 'enviado', 'em_transito', 'entregue', 'cancelado', 'devolvido'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === s
                          ? s === 'todos' ? 'bg-purple-500/20 text-purple-400' : `${STATUS_META[s as PedidoStatus]?.bgCor} ${STATUS_META[s as PedidoStatus]?.cor}`
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                      }`}>
                      {s === 'todos' ? 'Todos' : STATUS_META[s as PedidoStatus]?.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Marketplace */}
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Marketplace</p>
                  <div className="flex gap-2">
                    {(['ML', 'SP', 'AMZ', 'MAG'] as MKTPedido[]).map(m => (
                      <button key={m} onClick={() => toggleMkt(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          mktFilter.includes(m)
                            ? `${MKT_META[m].bgCor} ${MKT_META[m].cor} ring-1 ring-current`
                            : 'text-slate-500 hover:text-slate-300 bg-dark-700 hover:bg-dark-600'
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Período */}
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Período</p>
                  <div className="flex gap-1.5">
                    {(['hoje', '7d', '30d', 'todos'] as const).map(p => (
                      <button key={p} onClick={() => setPeriodoFilter(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          periodoFilter === p
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                        }`}>
                        {p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Todos'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── BULK BAR ── */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl animate-in slide-in-from-top-1 duration-200">
            <CheckSquare className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-300 font-medium">{selected.length} pedido(s) selecionado(s)</span>
            <div className="flex-1" />
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
              <Printer className="w-3.5 h-3.5" /> Imprimir Separação
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
              <Tag className="w-3.5 h-3.5" /> Gerar Etiquetas
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-all">
              <Send className="w-3.5 h-3.5" /> Marcar como Enviado
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 cursor-not-allowed rounded-lg" disabled>
              <Zap className="w-3.5 h-3.5" /> NF-e (Em Breve)
            </button>
            <button onClick={() => setSelected([])} className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── TABLE ── */}
        <div className="dash-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="pl-4 pr-2 py-3 text-left">
                    <button onClick={toggleSelectAll}>
                      {allSelected
                        ? <CheckSquare className="w-4 h-4 text-purple-400" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">Nº Pedido</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">
                    <button className="flex items-center" onClick={() => sortToggle('data')}>
                      Data <SortIcon col="data" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left min-w-[180px]">Produtos</th>
                  <th className="px-3 py-3 text-left">Canal</th>
                  <th className="px-3 py-3 text-right whitespace-nowrap">
                    <button className="flex items-center ml-auto" onClick={() => sortToggle('valor')}>
                      Total <SortIcon col="valor" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right whitespace-nowrap">
                    <button className="flex items-center ml-auto" onClick={() => sortToggle('lucro')}>
                      Lucro <SortIcon col="lucro" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">
                    <button className="flex items-center" onClick={() => sortToggle('prazo')}>
                      Prazo Post. <SortIcon col="prazo" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left whitespace-nowrap">Prev. Entrega</th>
                  <th className="px-3 py-3 text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPedidos.map(p => {
                  const ps   = prazoStatus(p.prazoPostagem)
                  const meta = STATUS_META[p.status]
                  const mkt  = MKT_META[p.marketplace]
                  const isSelected = selected.includes(p.id)
                  const valorTotal = p.financeiro.valorProdutos + p.financeiro.freteCliente
                  const compra = ordinalCompra(p.cliente.pedidosAnteriores)

                  return (
                    <tr key={p.id}
                      className={`border-b border-white/[0.04] transition-all
                        ${ps === 'urgent' ? 'border-l-2 border-l-red-500 bg-red-500/[0.025]' : ''}
                        ${ps === 'tomorrow' ? 'border-l-2 border-l-yellow-500 bg-yellow-500/[0.02]' : ''}
                        ${p.status === 'cancelado' ? 'opacity-50' : ''}
                        ${isSelected ? 'bg-purple-500/[0.05]' : 'hover:bg-white/[0.02]'}
                      `}>

                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-3">
                        <button onClick={() => toggleSelect(p.id)}>
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-purple-400" />
                            : <Square className="w-4 h-4 text-slate-700 hover:text-slate-500" />}
                        </button>
                      </td>

                      {/* Nº Pedido */}
                      <td className="px-3 py-3">
                        <Link href={`/dashboard/pedidos/${p.id}`}
                          className="text-purple-400 hover:text-purple-300 font-semibold text-xs transition-colors">
                          {p.numero}
                        </Link>
                      </td>

                      {/* Data */}
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {fmtDateTime(p.data)}
                      </td>

                      {/* Cliente */}
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-1.5">
                          {p.cliente.pedidosAnteriores > 0 && (
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-slate-200 whitespace-nowrap">{p.cliente.nome}</p>
                            <p className="text-[10px] text-slate-600">{p.cliente.cidade}, {p.cliente.uf}</p>
                            {compra && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">
                                {compra}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Produtos */}
                      <td className="px-3 py-3">
                        <div>
                          <p className="text-xs text-slate-300 line-clamp-1">
                            {p.itens[0].nome}
                            {p.itens[0].variacao && <span className="text-slate-500"> · {p.itens[0].variacao}</span>}
                            {p.itens[0].quantidade > 1 && <span className="text-slate-500"> ×{p.itens[0].quantidade}</span>}
                          </p>
                          {p.itens.length > 1 && (
                            <p className="text-[10px] text-slate-600">+{p.itens.length - 1} produto(s)</p>
                          )}
                        </div>
                      </td>

                      {/* Canal */}
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${mkt.bgCor} ${mkt.cor}`}>
                          {mkt.abbr}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-xs font-semibold text-white whitespace-nowrap">{fmt(valorTotal)}</span>
                        {p.financeiro.freteCliente > 0 && (
                          <p className="text-[9px] text-slate-600">+{fmt(p.financeiro.freteCliente)} frete</p>
                        )}
                      </td>

                      {/* Lucro / Margem */}
                      <td className="px-3 py-3 text-right">
                        <span className={`text-xs font-bold whitespace-nowrap ${p.financeiro.lucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmt(p.financeiro.lucro)}
                        </span>
                        <p className="text-[10px] text-slate-600">{p.financeiro.margem}%</p>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${meta.bgCor} ${meta.cor}`}>
                          <StatusIcon name={meta.iconName} className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                      </td>

                      {/* Prazo Postagem */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {['entregue', 'cancelado', 'devolvido', 'enviado', 'em_transito'].includes(p.status) ? (
                          <span className="text-[10px] text-slate-600">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Calendar className={`w-3 h-3 ${ps === 'urgent' ? 'text-red-400' : ps === 'tomorrow' ? 'text-yellow-400' : 'text-slate-600'}`} />
                            <span className={`text-xs font-medium ${ps === 'urgent' ? 'text-red-400' : ps === 'tomorrow' ? 'text-yellow-400' : 'text-slate-400'}`}>
                              {fmtDate(p.prazoPostagem)}
                            </span>
                            {ps === 'urgent' && <span className="text-[9px] font-bold text-red-400 animate-pulse">HOJE</span>}
                            {ps === 'tomorrow' && <span className="text-[9px] font-bold text-yellow-400">AMANHÃ</span>}
                          </div>
                        )}
                      </td>

                      {/* Previsão Entrega */}
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {p.envio.previsaoEntrega ? fmtDate(p.envio.previsaoEntrega) : <span className="text-slate-700">—</span>}
                      </td>

                      {/* Ações */}
                      <td className="px-3 py-3 pr-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={`/dashboard/pedidos/${p.id}`}
                            title="Ver detalhes"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-purple-400 hover:bg-purple-400/10 transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button title="Separar" className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all">
                            <ScanLine className="w-3.5 h-3.5" />
                          </button>
                          <button title="Etiqueta" className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          <button title="Marcar como enviado" className="p-1.5 rounded-lg text-slate-600 hover:text-green-400 hover:bg-green-400/10 transition-all">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredPedidos.length === 0 && (
              <div className="py-16 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-600 text-sm">Nenhum pedido encontrado</p>
                <button onClick={clearFilters} className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-600">
              {filteredPedidos.length} de {PEDIDOS.length} pedidos
              {selected.length > 0 && ` · ${selected.length} selecionado(s)`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">
                Total visível: {fmt(filteredPedidos.reduce((s, p) => s + p.financeiro.valorProdutos + p.financeiro.freteCliente, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
