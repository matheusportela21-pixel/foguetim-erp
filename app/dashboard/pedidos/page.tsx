'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, Clock, Package, Truck, CheckCircle2, XCircle,
  CircleDollarSign, ScanLine, Send, RotateCcw, Star,
  Search, Filter, Eye, Printer, Tag, X, CheckSquare, Square,
  AlertTriangle, Bell, ChevronDown, ChevronUp, ArrowUpDown,
  TrendingUp, Calendar, MapPin, Zap, Loader2, RefreshCw, Link2,
  CreditCard, Copy, ExternalLink, FileDown,
} from 'lucide-react'
import {
  PEDIDOS, STATUS_META, MKT_META,
  type Pedido, type PedidoStatus, type MKTPedido,
} from './_data'
import { EmptyState } from '@/components/shared/EmptyState'
import ExportCSVButton from '@/components/ExportCSVButton'
import ExportPDFButton from '@/components/ExportPDFButton'
import { generatePedidosPDF } from '@/lib/reports/pdf-generator'
import { PageHeader } from '@/components/shared/PageHeader'

// ─── ML ORDER TYPES ──────────────────────────────────────────────────────────

interface MLOrder {
  id: number
  pack_id: string | number | null
  status: string
  date_created: string
  date_closed: string | null
  total_amount: number
  currency_id?: string
  buyer: { id: number; nickname: string; first_name?: string; last_name?: string }
  order_items: { title: string; quantity: number; unit_price: number; thumbnail?: string }[]
  payments: { status: string; total_paid_amount: number; payment_method_id: string }[]
  shipping: { id: number; status: string; tracking_number?: string }
  tags?: string[]
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: 'Cart\u00e3o de cr\u00e9dito',
  debit_card: 'Cart\u00e3o de d\u00e9bito',
  account_money: 'Mercado Pago',
  ticket: 'Boleto',
  pix: 'Pix',
}

const SHIPPING_STATUS_PT: Record<string, { label: string; cls: string }> = {
  pending:          { label: 'Pendente',     cls: 'bg-amber-400/10 text-amber-400' },
  handling:         { label: 'Preparando',   cls: 'bg-amber-400/10 text-amber-400' },
  ready_to_ship:    { label: 'Pronto envio', cls: 'bg-yellow-400/10 text-yellow-400' },
  shipped:          { label: 'Enviado',      cls: 'bg-blue-400/10 text-blue-400' },
  delivered:        { label: 'Entregue',     cls: 'bg-green-400/10 text-green-400' },
  not_delivered:    { label: 'N\u00e3o entregue', cls: 'bg-red-400/10 text-red-400' },
  cancelled:        { label: 'Cancelado',    cls: 'bg-red-400/10 text-red-400' },
}

// ─── ML ORDERS TAB ───────────────────────────────────────────────────────────

function MLOrdersTab() {
  const [orders, setOrders]         = useState<MLOrder[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [days, setDays]             = useState(30)
  const [paging, setPaging]         = useState({ total: 0, offset: 0, limit: 50 })
  const [offset, setOffset]         = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<MLOrder | null>(null)
  const [mlSelected, setMlSelected] = useState<number[]>([])
  const [sortMode, setSortMode]     = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc')
  const [showLabelModal, setShowLabelModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/mercadolivre/orders?offset=${offset}&limit=50&status=${statusFilter}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.notConnected) { setNotConnected(true); return }
        if (d.error) { setError(d.error); return }
        setOrders(d.orders ?? [])
        setPaging(d.paging ?? { total: 0, offset, limit: 50 })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [offset, statusFilter, days, refreshKey])

  const STATUS_PT: Record<string, { label: string; cls: string }> = {
    paid:           { label: 'Pago',        cls: 'bg-green-400/10 text-green-400'  },
    shipped:        { label: 'Enviado',     cls: 'bg-blue-400/10 text-blue-400'    },
    delivered:      { label: 'Entregue',    cls: 'bg-purple-400/10 text-purple-400'},
    cancelled:      { label: 'Cancelado',   cls: 'bg-red-400/10 text-red-400'      },
    payment_required: { label: 'Ag. Pag.', cls: 'bg-amber-400/10 text-amber-400'  },
    confirmed:      { label: 'Confirmado',  cls: 'bg-cyan-400/10 text-cyan-400'    },
    in_process:     { label: 'Em processo', cls: 'bg-slate-400/10 text-slate-400'  },
  }

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })
      + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  }

  // Local search filter
  const searched = search
    ? orders.filter(o =>
        String(o.id).includes(search) ||
        o.buyer.nickname?.toLowerCase().includes(search.toLowerCase()) ||
        o.order_items.some(i => i.title?.toLowerCase().includes(search.toLowerCase()))
      )
    : orders

  // Local sort
  const filtered = useMemo(() => {
    const sorted = [...searched]
    sorted.sort((a, b) => {
      switch (sortMode) {
        case 'date_asc':    return new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
        case 'total_desc':  return b.total_amount - a.total_amount
        case 'total_asc':   return a.total_amount - b.total_amount
        default:            return new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
      }
    })
    return sorted
  }, [searched, sortMode])

  // Workflow tab counts
  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length, paid: 0, shipped: 0, delivered: 0, cancelled: 0 }
    for (const o of orders) {
      if (counts[o.status] !== undefined) counts[o.status]++
    }
    return counts
  }, [orders])

  // Selection helpers
  const mlAllSelected = mlSelected.length === filtered.length && filtered.length > 0
  const toggleMlSelect = (id: number) =>
    setMlSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleMlSelectAll = () =>
    setMlSelected(mlAllSelected ? [] : filtered.map(o => o.id))

  // CSV export for selected
  const exportSelectedCSV = () => {
    const rows = orders.filter(o => mlSelected.includes(o.id))
    const header = 'Pedido,Data,Comprador,Produto,Valor,Status,Envio\n'
    const csv = header + rows.map(o =>
      `${o.id},"${fmtDate(o.date_created)}","${o.buyer.nickname}","${o.order_items[0]?.title ?? ''}",${o.total_amount},${o.status},${o.shipping?.status ?? ''}`
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'pedidos-ml-selecionados.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Copy tracking number
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  if (notConnected) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
        <Link2 className="w-6 h-6 text-yellow-400" />
      </div>
      <p className="text-sm font-semibold text-white">Mercado Livre n\u00e3o conectado</p>
      <p className="text-xs text-slate-500">Conecte sua conta em Integra\u00e7\u00f5es para ver seus pedidos.</p>
      <a href="/dashboard/integracoes" className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition-colors">
        Ir para Integra\u00e7\u00f5es
      </a>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando pedidos do Mercado Livre...</span>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertTriangle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-400 font-semibold">Erro ao carregar pedidos</p>
      <p className="text-xs text-slate-500 max-w-sm text-center">{error}</p>
      <button onClick={() => setRefreshKey(k => k + 1)}
        className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-colors">
        Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      {/* Toolbar row 1: Search + Period + Sort + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ID, comprador, produto..."
            className="pl-9 pr-4 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 w-52" />
        </div>

        <div className="flex items-center gap-1">
          {[7, 15, 30, 90].map(d => (
            <button key={d} onClick={() => { setDays(d); setOffset(0) }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${days === d ? 'bg-purple-500/15 text-purple-400' : 'text-slate-600 hover:text-slate-400'}`}>
              {d}d
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {([
            { v: 'date_desc' as const, l: 'Mais recentes' },
            { v: 'date_asc'  as const, l: 'Mais antigos'  },
            { v: 'total_desc' as const,l: 'Maior valor'   },
            { v: 'total_asc' as const, l: 'Menor valor'   },
          ]).map(s => (
            <button key={s.v} onClick={() => setSortMode(s.v)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${sortMode === s.v ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}>
              {s.l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setRefreshKey(k => k + 1)} disabled={loading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:bg-white/[0.04] transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <ExportPDFButton onExport={() => generatePedidosPDF({
            pedidos: orders.map(o => ({
              id:          o.id,
              date:        o.date_created,
              buyer:       o.buyer.nickname ?? String(o.buyer.id),
              items:       o.order_items.map(i => i.title).join(', '),
              status:      STATUS_PT[o.status]?.label ?? o.status,
              marketplace: 'Mercado Livre',
              total:       o.total_amount,
            })),
            totals: {
              count:        paging.total,
              receita:      orders.reduce((s, o) => s + o.total_amount, 0),
              ticket_medio: orders.length ? orders.reduce((s, o) => s + o.total_amount, 0) / orders.length : 0,
            },
            period: `\u00DAltimos ${days} dias`,
          })} />
          <ExportCSVButton
            data={orders.map(o => ({
              id:        o.id,
              data:      o.date_created,
              comprador: o.buyer.nickname,
              produto:   o.order_items[0]?.title ?? '',
              valor:     o.total_amount,
              status:    o.status,
              envio:     o.shipping?.status ?? '',
            }))}
            filename="pedidos"
            columns={[
              { key: 'id',        label: 'N\u00BA Pedido'  },
              { key: 'data',      label: 'Data'        },
              { key: 'comprador', label: 'Comprador'   },
              { key: 'produto',   label: 'Produto'     },
              { key: 'valor',     label: 'Valor'       },
              { key: 'status',    label: 'Status'      },
              { key: 'envio',     label: 'Envio'       },
            ]}
          />
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0">
        {[
          { v: 'all',       l: 'Todos',      icon: ShoppingCart },
          { v: 'paid',      l: 'Pra enviar', icon: Package      },
          { v: 'shipped',   l: 'Enviados',   icon: Truck        },
          { v: 'delivered', l: 'Entregues',   icon: CheckCircle2 },
          { v: 'cancelled', l: 'Cancelados',  icon: XCircle      },
        ].map(tab => {
          const Icon = tab.icon
          const count = countByStatus[tab.v] ?? 0
          const active = statusFilter === tab.v
          return (
            <button key={tab.v} onClick={() => { setStatusFilter(tab.v); setOffset(0); setMlSelected([]) }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
                active
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.l}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                active ? 'bg-yellow-400/15 text-yellow-400' : 'bg-white/[0.04] text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
        <span className="ml-auto text-xs text-slate-600">
          <span className="text-white font-bold">{paging.total}</span> pedidos {days}d
        </span>
      </div>

      {/* Summary KPIs */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total de pedidos', value: String(paging.total),                                                  cls: 'text-white'    },
            { label: 'Faturamento',      value: fmtBRL(orders.reduce((s, o) => s + o.total_amount, 0)),               cls: 'text-green-400'},
            { label: 'Ticket m\u00e9dio',     value: orders.length ? fmtBRL(orders.reduce((s,o)=>s+o.total_amount,0)/orders.length) : '\u2014', cls: 'text-cyan-400' },
          ].map(k => (
            <div key={k.label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-lg font-bold ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {mlSelected.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-900/20 border border-yellow-500/20 rounded-xl">
          <CheckSquare className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-slate-300 font-medium">{mlSelected.length} selecionado(s)</span>
          <div className="flex-1" />
          <button onClick={exportSelectedCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
            <FileDown className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button onClick={() => setShowLabelModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
            <Tag className="w-3.5 h-3.5" /> Imprimir etiquetas
          </button>
          <button onClick={() => setMlSelected([])} className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Orders table */}
      {filtered.length === 0 ? (
        <EmptyState
          image="box"
          title="Nenhum pedido encontrado"
          description="Os pedidos aparecer\u00e3o aqui quando voc\u00ea vender pelo marketplace."
          action={{ label: "Ver integra\u00e7\u00f5es", href: "/dashboard/integracoes" }}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pl-3 pr-1 py-2.5">
                    <button onClick={toggleMlSelectAll}>
                      {mlAllSelected
                        ? <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />
                        : <Square className="w-3.5 h-3.5 text-slate-600" />}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 w-9"></th>
                  {['N\u00BA Pedido', 'Data', 'Comprador', 'Produtos', 'Valor', 'Status', 'Envio'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(order => {
                  const st = STATUS_PT[order.status] ?? { label: order.status, cls: 'bg-slate-700 text-slate-400' }
                  const shipSt = SHIPPING_STATUS_PT[order.shipping?.status] ?? null
                  const isSelected = mlSelected.includes(order.id)
                  const thumb = order.order_items[0]?.thumbnail
                  return (
                    <tr key={order.id}
                      className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${isSelected ? 'bg-yellow-500/[0.04]' : ''}`}
                      onClick={() => setSelectedOrder(order)}>
                      <td className="pl-3 pr-1 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleMlSelect(order.id)}>
                          {isSelected
                            ? <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />
                            : <Square className="w-3.5 h-3.5 text-slate-700 hover:text-slate-500" />}
                        </button>
                      </td>
                      <td className="py-3 px-2">
                        {thumb ? (
                          <img src={thumb.replace('http://', 'https://')} alt="" className="w-8 h-8 rounded-lg object-cover bg-dark-700"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center">
                            <Package className="w-3.5 h-3.5 text-slate-700" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">#{order.id}</td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{fmtDate(order.date_created)}</td>
                      <td className="py-3 px-3">
                        <p className="text-white font-semibold">{order.buyer.nickname}</p>
                        {order.buyer.first_name && (
                          <p className="text-[10px] text-slate-600">{order.buyer.first_name} {order.buyer.last_name ?? ''}</p>
                        )}
                        {order.pack_id && (
                          <a
                            href="/dashboard/packs"
                            className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                            title={`Pack #${order.pack_id}`}
                            onClick={e => e.stopPropagation()}
                          >
                            Pack #{order.pack_id}
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-[200px]">
                        {order.order_items.map((it, i) => (
                          <p key={i} className="text-slate-300 truncate text-[10px]">
                            {it.quantity}\u00d7 {it.title}
                          </p>
                        ))}
                      </td>
                      <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                        {fmtBRL(order.total_amount)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="py-3 px-3">
                        {shipSt ? (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${shipSt.cls}`}>{shipSt.label}</span>
                        ) : (
                          <span className="text-[10px] text-slate-600">{order.shipping?.status ?? '\u2014'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {paging.total > 50 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600">
                Mostrando {offset + 1}\u2013{Math.min(offset + 50, paging.total)} de {paging.total}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                  \u2190 Anterior
                </button>
                <button onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= paging.total}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-700 text-slate-400 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                  Pr\u00f3xima \u2192
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Label print modal */}
      {showLabelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowLabelModal(false)}>
          <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Imprimir etiquetas</p>
                <p className="text-xs text-slate-500">Somente leitura \u2014 esta fun\u00e7\u00e3o redireciona ao Mercado Livre</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Para imprimir etiquetas de envio, acesse o painel de vendas do Mercado Livre diretamente.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="https://www.mercadolivre.com.br/vendas/lista" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/15 text-yellow-400 text-xs font-bold hover:bg-yellow-500/25 transition-colors">
                Ir para o ML <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order detail drawer (slide-in from right) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}>
          <div className="bg-dark-800 border-l border-white/10 w-full max-w-lg shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 bg-dark-800/95 backdrop-blur-sm z-10">
              <div>
                <p className="font-bold text-white text-sm">Pedido #{selectedOrder.id}</p>
                <p className="text-xs text-slate-500">{fmtDate(selectedOrder.date_created)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Section 1: Resumo */}
              <div className="space-y-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Resumo</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${(STATUS_PT[selectedOrder.status] ?? { cls: 'bg-slate-700 text-slate-400' }).cls}`}>
                    {(STATUS_PT[selectedOrder.status] ?? { label: selectedOrder.status }).label}
                  </span>
                  {selectedOrder.pack_id && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">
                      Pack #{selectedOrder.pack_id}
                    </span>
                  )}
                  {selectedOrder.tags && selectedOrder.tags.length > 0 && selectedOrder.tags.map((tag, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-500">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-500">Total do pedido</p>
                  <p className="text-lg font-bold text-white">{fmtBRL(selectedOrder.total_amount)}</p>
                </div>
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Section 2: Itens */}
              <div className="space-y-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Itens</p>
                <div className="space-y-2">
                  {selectedOrder.order_items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/[0.02] rounded-xl p-2.5">
                      {it.thumbnail ? (
                        <img src={it.thumbnail.replace('http://', 'https://')} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-dark-700"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = '' }} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-slate-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{it.title}</p>
                        <p className="text-[10px] text-slate-500">{it.quantity}\u00d7 {fmtBRL(it.unit_price)}</p>
                      </div>
                      <p className="text-xs font-bold text-white shrink-0">{fmtBRL(it.quantity * it.unit_price)}</p>
                    </div>
                  ))}
                </div>
                <a href="https://www.mercadolivre.com.br" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors">
                  Ver no Mercado Livre <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Section 3: Comprador */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Comprador</p>
                <p className="text-sm text-white font-semibold">{selectedOrder.buyer.nickname}</p>
                {(selectedOrder.buyer.first_name || selectedOrder.buyer.last_name) && (
                  <p className="text-xs text-slate-400">
                    {[selectedOrder.buyer.first_name, selectedOrder.buyer.last_name].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Section 4: Pagamento */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Pagamento</p>
                {selectedOrder.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.payments.map((pm, i) => (
                      <div key={i} className="bg-white/[0.02] rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs text-white font-medium">
                              {PAYMENT_METHOD_LABELS[pm.payment_method_id] ?? pm.payment_method_id}
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            pm.status === 'approved' ? 'bg-green-400/10 text-green-400' :
                            pm.status === 'pending'  ? 'bg-amber-400/10 text-amber-400' :
                            'bg-slate-400/10 text-slate-400'
                          }`}>
                            {pm.status === 'approved' ? 'Aprovado' : pm.status === 'pending' ? 'Pendente' : pm.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white">{fmtBRL(pm.total_paid_amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Sem dados de pagamento</p>
                )}
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Section 5: Envio */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Envio</p>
                <div className="bg-white/[0.02] rounded-xl p-3 space-y-2">
                  {selectedOrder.shipping?.status && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Status</span>
                      {(() => {
                        const ss = SHIPPING_STATUS_PT[selectedOrder.shipping.status]
                        return ss ? (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ss.cls}`}>{ss.label}</span>
                        ) : (
                          <span className="text-xs text-slate-400">{selectedOrder.shipping.status}</span>
                        )
                      })()}
                    </div>
                  )}
                  {selectedOrder.shipping?.id && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Shipping ID</span>
                      <span className="text-xs font-mono text-slate-400">{selectedOrder.shipping.id}</span>
                    </div>
                  )}
                  {selectedOrder.shipping?.tracking_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Rastreamento</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-cyan-400">{selectedOrder.shipping.tracking_number}</span>
                        <button onClick={() => copyToClipboard(selectedOrder.shipping.tracking_number!)}
                          className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-slate-300 transition-all"
                          title="Copiar">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/[0.06]" />

              {/* Section 6: Timeline */}
              <div className="space-y-3">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Timeline</p>
                <div className="space-y-0">
                  {(() => {
                    const steps = [
                      { key: 'created',   label: 'Criado',   reached: true,                                                   date: selectedOrder.date_created },
                      { key: 'paid',      label: 'Pago',     reached: ['paid', 'shipped', 'delivered'].includes(selectedOrder.status), date: selectedOrder.date_closed },
                      { key: 'shipped',   label: 'Enviado',  reached: ['shipped', 'delivered'].includes(selectedOrder.status),  date: null },
                      { key: 'delivered', label: 'Entregue', reached: selectedOrder.status === 'delivered',                     date: null },
                    ]
                    return steps.map((step, i) => (
                      <div key={step.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            step.reached
                              ? 'bg-green-400 border-green-400'
                              : 'bg-transparent border-slate-700'
                          }`} />
                          {i < steps.length - 1 && (
                            <div className={`w-0.5 h-6 ${step.reached ? 'bg-green-400/30' : 'bg-slate-800'}`} />
                          )}
                        </div>
                        <div className="-mt-0.5">
                          <p className={`text-xs font-semibold ${step.reached ? 'text-white' : 'text-slate-600'}`}>{step.label}</p>
                          {step.date && step.reached && (
                            <p className="text-[10px] text-slate-500">{fmtDate(step.date)}</p>
                          )}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

const TODAY    = '2026-03-12'
const TOMORROW = '2026-03-13'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function prazoStatus(prazo: string): 'urgent' | 'tomorrow' | 'ok' {
  if (prazo <= TODAY) return 'urgent'
  if (prazo === TOMORROW) return 'tomorrow'
  return 'ok'
}

function ordinalCompra(n: number) {
  if (n === 0) return null
  return `${n + 1}\u00aa compra`
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
  const [view, setView]                   = useState<'ml' | 'local'>('ml')
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
      <PageHeader title="Pedidos" description="Gerencie todos os pedidos da sua loja" />

      {/* ── View Tabs ── */}
      <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-white/[0.06]">
          {[
            { id: 'ml',    label: 'Mercado Livre' },
            { id: 'local', label: 'Local'          },
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id as 'ml' | 'local')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === t.id ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ML Pedidos Tab */}
      {view === 'ml' && (
        <div className="dash-card m-6 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div>
              <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Pedidos do Mercado Livre</p>
              <p className="text-xs text-slate-600 mt-0.5">Dados em tempo real da API do ML \u00b7 Clique em um pedido para ver detalhes</p>
            </div>
            <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              Somente leitura
            </span>
          </div>
          <MLOrdersTab />
        </div>
      )}

      {view === 'local' && <div className="p-4 md:p-6 space-y-5">

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Pedidos Hoje" value={kpis.pedidosHoje} sub="+3 vs ontem"
            icon={ShoppingCart} iconCls="bg-purple-400/10 text-purple-400" />
          <KpiCard label="Aguardando Envio" value={kpis.aguardandoEnvio}
            sub={kpis.aguardandoEnvio > 5 ? 'Acima do ideal' : 'Normal'}
            icon={Package} iconCls={kpis.aguardandoEnvio > 5 ? 'bg-red-400/10 text-red-400' : 'bg-blue-400/10 text-blue-400'}
            urgent={kpis.aguardandoEnvio > 5} />
          <KpiCard label="Enviados Hoje" value={kpis.enviadosHoje} sub="via Correios + Jadlog"
            icon={Send} iconCls="bg-emerald-400/10 text-emerald-400" />
          <KpiCard label="Faturamento Hoje" value={fmt(kpis.faturamentoHoje)}
            icon={TrendingUp} iconCls="bg-cyan-400/10 text-cyan-400" />
          <KpiCard label="Ticket M\u00e9dio" value={fmt(kpis.ticketMedio)}
            icon={CircleDollarSign} iconCls="bg-indigo-400/10 text-indigo-400" />
          <KpiCard label="Prazo Hoje" value={kpis.prazosHoje} sub="precisam ser postados"
            icon={Clock} iconCls={kpis.prazosHoje > 0 ? 'bg-red-400/10 text-red-400' : 'bg-slate-700 text-slate-500'}
            urgent={kpis.prazosHoje > 0} pulse={kpis.prazosHoje > 0} />
        </div>

        {/* ── ALERT BANNERS ── */}
        <div className="space-y-2">
          {!dismissedAlerts.includes('urgent') && urgentCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <button
                onClick={() => { setStatusFilter('todos'); setDismissedAlerts([]); setSortBy('prazo'); setSortDir('asc') }}
                className="flex-1 text-left text-sm text-red-300 font-medium hover:text-red-200 transition-colors">
                {urgentCount} pedido{urgentCount > 1 ? 's precisam' : ' precisa'} ser enviado{urgentCount > 1 ? 's' : ''} HOJE! \u2014 clique para filtrar
              </button>
              <button onClick={() => dismissAlert('urgent')} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {!dismissedAlerts.includes('stuck') && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <button className="flex-1 text-left text-sm text-amber-300 hover:text-amber-200 transition-colors">
                2 pedidos parados h\u00e1 mais de 48h sem atualiza\u00e7\u00e3o \u2014 clique para ver
              </button>
              <button onClick={() => dismissAlert('stuck')} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {!dismissedAlerts.includes('devol') && devolucoesCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <Package className="w-4 h-4 text-orange-400" />
              <button
                onClick={() => { setStatusFilter('devolvido'); dismissAlert('devol') }}
                className="flex-1 text-left text-sm text-orange-300 hover:text-orange-200 transition-colors">
                {devolucoesCount} devolu\u00e7\u00e3o pendente de aprova\u00e7\u00e3o \u2014 clique para ver
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
                placeholder="Buscar por N\u00ba pedido, cliente ou SKU..."
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

                {/* Per\u00edodo */}
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Per\u00edodo</p>
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
              <Printer className="w-3.5 h-3.5" /> Imprimir Separa\u00e7\u00e3o
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
                  <th className="px-3 py-3 text-left whitespace-nowrap">N\u00ba Pedido</th>
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
                  <th className="px-3 py-3 text-right pr-4">A\u00e7\u00f5es</th>
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

                      {/* N\u00ba Pedido */}
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
                            {p.itens[0].variacao && <span className="text-slate-500"> \u00b7 {p.itens[0].variacao}</span>}
                            {p.itens[0].quantidade > 1 && <span className="text-slate-500"> \u00d7{p.itens[0].quantidade}</span>}
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
                          <span className="text-[10px] text-slate-600">\u2014</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Calendar className={`w-3 h-3 ${ps === 'urgent' ? 'text-red-400' : ps === 'tomorrow' ? 'text-yellow-400' : 'text-slate-600'}`} />
                            <span className={`text-xs font-medium ${ps === 'urgent' ? 'text-red-400' : ps === 'tomorrow' ? 'text-yellow-400' : 'text-slate-400'}`}>
                              {fmtDate(p.prazoPostagem)}
                            </span>
                            {ps === 'urgent' && <span className="text-[9px] font-bold text-red-400 animate-pulse">HOJE</span>}
                            {ps === 'tomorrow' && <span className="text-[9px] font-bold text-yellow-400">AMANH\u00c3</span>}
                          </div>
                        )}
                      </td>

                      {/* Previs\u00e3o Entrega */}
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {p.envio.previsaoEntrega ? fmtDate(p.envio.previsaoEntrega) : <span className="text-slate-700">\u2014</span>}
                      </td>

                      {/* A\u00e7\u00f5es */}
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
              {selected.length > 0 && ` \u00b7 ${selected.length} selecionado(s)`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">
                Total vis\u00edvel: {fmt(filteredPedidos.reduce((s, p) => s + p.financeiro.valorProdutos + p.financeiro.freteCliente, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>} {/* end view === 'local' */}
    </div>
  )
}
