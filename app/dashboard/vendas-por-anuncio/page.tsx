'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import ExportCSVButton from '@/components/ExportCSVButton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Package, Search, RefreshCw, TrendingUp, Tag, CircleDollarSign,
  AlertCircle, Link2, ChevronDown, ChevronUp, ArrowUpDown,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnuncioItem {
  item_id:         string
  title:           string
  thumbnail?:      string
  total_vendas:    number
  receita_bruta:   number
  taxas_ml:        number
  receita_liquida: number
  ticket_medio:    number
  participacao:    number
  visitas:         number | null
  conversao:       number | null
}

type SortField = 'total_vendas' | 'receita_bruta' | 'taxas_ml' | 'receita_liquida' | 'ticket_medio' | 'participacao'
type SortDir   = 'asc' | 'desc'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum = (v: number) => v.toLocaleString('pt-BR')

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 h-24 bg-dark-800/40" />
        ))}
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="h-12 bg-dark-800/40 border-b border-white/[0.06]" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 border-b border-white/[0.03] flex items-center px-4 gap-3">
            <div className="w-8 h-8 rounded-md bg-dark-700" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-dark-700 rounded w-2/3" />
              <div className="h-2 bg-dark-800 rounded w-1/4" />
            </div>
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-3 bg-dark-700 rounded w-16 ml-auto" />
            ))}
          </div>
        ))}
      </div>
      <div className="glass-card rounded-xl p-5 h-96 bg-dark-800/40" />
    </div>
  )
}

// ─── Not Connected ────────────────────────────────────────────────────────────

function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 mt-24">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
        <Link2 className="w-7 h-7 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 text-lg font-semibold mb-1">Mercado Livre não conectado</p>
        <p className="text-slate-600 text-sm max-w-sm">
          Conecte sua conta do Mercado Livre para ver o ranking de vendas por anúncio.
        </p>
      </div>
      <a
        href="/dashboard/integracoes"
        className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
      >
        Conectar agora
      </a>
    </div>
  )
}

// ─── Tooltip do Recharts ──────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-900 border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-slate-400 mb-1.5 max-w-[180px] leading-tight">{label}</p>
      <p className="text-green-400 font-bold">{fmtBRL(payload[0].value)}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendasPorAnuncioPage() {
  const [data,         setData]         = useState<AnuncioItem[]>([])
  const [totalPedidos, setTotalPedidos] = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [days,         setDays]         = useState(30)
  const [search,       setSearch]       = useState('')
  const [sortField,    setSortField]    = useState<SortField>('total_vendas')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')
  const [page,         setPage]         = useState(1)
  const [refreshKey,   setRefreshKey]   = useState(0)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    setNotConnected(false)
    setPage(1)

    fetch(`/api/mercadolivre/vendas-por-anuncio?days=${days}&_=${refreshKey}`)
      .then(r => r.json())
      .then(d => {
        if (!d.connected) { setNotConnected(true); return }
        if (d.error)      { setError(d.error); return }
        setData(d.items ?? [])
        setTotalPedidos(d.totalPedidos ?? 0)
      })
      .catch(e => setError(String(e.message ?? e)))
      .finally(() => setLoading(false))
  }, [days, refreshKey])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Sorting ───────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

  // ── Filtered + sorted + paginated ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let items = data
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(x =>
        x.title.toLowerCase().includes(q) || x.item_id.includes(q)
      )
    }
    return [...items].sort((a, b) => {
      const diff = a[sortField] - b[sortField]
      return sortDir === 'asc' ? diff : -diff
    })
  }, [data, search, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalAnuncios     = data.length
  const totalUnidades     = data.reduce((s, x) => s + x.total_vendas,    0)
  const totalReceitaBruta = data.reduce((s, x) => s + x.receita_bruta,   0)
  const totalReceitaLiq   = data.reduce((s, x) => s + x.receita_liquida, 0)

  // ── Top 10 para o gráfico (invertido: maior fica no topo) ─────────────────
  const top10 = useMemo(() =>
    [...data]
      .sort((a, b) => b.receita_liquida - a.receita_liquida)
      .slice(0, 10)
      .map(x => ({
        ...x,
        shortTitle: x.title.length > 32 ? x.title.slice(0, 32) + '…' : x.title,
      }))
      .reverse(),
    [data]
  )

  // Referência para barra de vendas na tabela
  const maxVendas = data.length > 0 ? Math.max(...data.map(x => x.total_vendas)) : 1

  // ── Sort header helper ────────────────────────────────────────────────────
  const SortTh = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer select-none hover:text-slate-400 transition-colors whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-1">
        {children}
        {sortField === field
          ? sortDir === 'desc'
            ? <ChevronDown className="w-3 h-3 text-purple-400" />
            : <ChevronUp   className="w-3 h-3 text-purple-400" />
          : <ArrowUpDown className="w-3 h-3 opacity-30" />
        }
      </div>
    </th>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Vendas por Anúncio"
        description="Ranking de desempenho dos seus produtos"
      />

      <div className="p-6 space-y-6">

        {/* Period selector + refresh */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-dark-800 border border-white/[0.06] rounded-lg p-1">
            {([7, 30, 90] as const).map(d => (
              <button
                key={d}
                onClick={() => { setDays(d); setPage(1) }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="p-2 rounded-lg bg-dark-800 border border-white/[0.06] text-slate-500 hover:text-slate-300 disabled:opacity-50 transition-all"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <ExportCSVButton
            data={data as unknown as Record<string, unknown>[]}
            filename="vendas-por-anuncio"
            columns={[
              { key: 'item_id',         label: 'ID Anúncio'      },
              { key: 'title',           label: 'Título'          },
              { key: 'total_vendas',    label: 'Qtd Vendas'      },
              { key: 'receita_bruta',   label: 'Receita Bruta'   },
              { key: 'taxas_ml',        label: 'Taxas ML'        },
              { key: 'receita_liquida', label: 'Receita Líquida' },
              { key: 'ticket_medio',    label: 'Ticket Médio'    },
              { key: 'participacao',    label: 'Participação %'  },
              { key: 'visitas',         label: 'Visitas'         },
              { key: 'conversao',       label: 'Conversão %'     },
            ]}
          />

          {!loading && totalPedidos > 0 && (
            <span className="text-xs text-slate-600">
              {fmtNum(totalPedidos)} pedido{totalPedidos !== 1 ? 's' : ''} processado{totalPedidos !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && <Skeleton />}

        {/* Not connected */}
        {!loading && notConnected && <NotConnected />}

        {/* Error */}
        {!loading && error && (
          <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !notConnected && !error && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Anúncios com Vendas',
                  value: fmtNum(totalAnuncios),
                  icon:  Tag,
                  color: 'text-purple-400',
                  bg:    'bg-purple-500/10',
                },
                {
                  label: 'Unidades Vendidas',
                  value: fmtNum(totalUnidades),
                  icon:  Package,
                  color: 'text-blue-400',
                  bg:    'bg-blue-500/10',
                },
                {
                  label: 'Receita Bruta',
                  value: fmtBRL(totalReceitaBruta),
                  icon:  TrendingUp,
                  color: 'text-green-400',
                  bg:    'bg-green-500/10',
                },
                {
                  label: 'Receita Líquida',
                  value: fmtBRL(totalReceitaLiq),
                  icon:  CircleDollarSign,
                  color: 'text-cyan-400',
                  bg:    'bg-cyan-500/10',
                },
              ].map(card => (
                <div key={card.label} className="glass-card p-4 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-tight">{card.label}</p>
                    <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${card.color} tabular-nums`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {data.length === 0 && (
              <div className="glass-card p-16 rounded-xl flex flex-col items-center gap-4">
                <Package className="w-12 h-12 text-slate-700" />
                <div className="text-center">
                  <p className="text-slate-400 font-semibold mb-1">Nenhuma venda nos últimos {days} dias</p>
                  <p className="text-slate-600 text-sm">Tente ampliar o período selecionado</p>
                </div>
              </div>
            )}

            {data.length > 0 && (
              <>
                {/* ── Ranking Table ──────────────────────────────────────── */}
                <div className="glass-card rounded-xl overflow-hidden">

                  {/* Table toolbar */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">Ranking de Produtos</h3>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {fmtNum(data.length)} anúncio{data.length !== 1 ? 's' : ''} com venda{data.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                      <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Buscar produto..."
                        className="w-52 pl-9 pr-4 py-1.5 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 focus:border-purple-600/40 transition-all"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.04]">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider w-10">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider min-w-[220px]">Produto</th>
                          <SortTh field="total_vendas">Vendas</SortTh>
                          <SortTh field="receita_bruta">Rec. Bruta</SortTh>
                          <SortTh field="taxas_ml">Taxas ML</SortTh>
                          <SortTh field="receita_liquida">Rec. Líquida</SortTh>
                          <SortTh field="ticket_medio">Ticket Médio</SortTh>
                          <SortTh field="participacao">Participação</SortTh>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Visitas</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Conversão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((item, idx) => {
                          const rank   = (page - 1) * PAGE_SIZE + idx + 1
                          const barPct = maxVendas > 0 ? (item.total_vendas / maxVendas) * 100 : 0

                          return (
                            <tr
                              key={item.item_id}
                              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                            >
                              {/* Rank */}
                              <td className="px-4 py-3">
                                <span className={`text-xs font-bold tabular-nums ${
                                  rank === 1 ? 'text-amber-400' :
                                  rank === 2 ? 'text-slate-400' :
                                  rank === 3 ? 'text-amber-700' :
                                  'text-slate-600'
                                }`}>
                                  {rank}
                                </span>
                              </td>

                              {/* Product */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5 max-w-xs">
                                  {item.thumbnail ? (
                                    <img
                                      src={item.thumbnail.replace('http://', 'https://')}
                                      alt=""
                                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
                                      onError={e => { (e.currentTarget as HTMLImageElement).src = '' }}
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-dark-700 border border-white/[0.06] flex items-center justify-center shrink-0">
                                      <Package className="w-4 h-4 text-slate-600" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p
                                      className="text-sm text-slate-200 truncate font-medium leading-tight"
                                      title={item.title}
                                    >
                                      {item.title}
                                    </p>
                                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">{item.item_id}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Vendas + mini-bar */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end min-w-[80px]">
                                  <span className="text-sm font-bold text-white tabular-nums">
                                    {fmtNum(item.total_vendas)}
                                  </span>
                                  <div className="w-12 h-1 bg-dark-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-purple-500 rounded-full"
                                      style={{ width: `${barPct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Receita bruta */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-slate-300 tabular-nums">
                                  {fmtBRL(item.receita_bruta)}
                                </span>
                              </td>

                              {/* Taxas ML */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-red-400/70 tabular-nums">
                                  {fmtBRL(item.taxas_ml)}
                                </span>
                              </td>

                              {/* Receita líquida */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-green-400 font-semibold tabular-nums">
                                  {fmtBRL(item.receita_liquida)}
                                </span>
                              </td>

                              {/* Ticket médio */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-slate-400 tabular-nums">
                                  {fmtBRL(item.ticket_medio)}
                                </span>
                              </td>

                              {/* Participação */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end min-w-[90px]">
                                  <div className="w-14 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                                      style={{ width: `${Math.min(100, item.participacao)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-400 tabular-nums w-10 text-right">
                                    {item.participacao.toFixed(1)}%
                                  </span>
                                </div>
                              </td>

                              {/* Visitas */}
                              <td className="px-4 py-3 text-right">
                                {item.visitas != null ? (
                                  <span className="text-sm text-slate-400 tabular-nums">{fmtNum(item.visitas)}</span>
                                ) : (
                                  <span className="text-[10px] text-slate-700">—</span>
                                )}
                              </td>

                              {/* Conversão */}
                              <td className="px-4 py-3 text-right">
                                {item.conversao != null ? (
                                  <span className={`text-sm font-semibold tabular-nums ${
                                    item.conversao >= 5 ? 'text-green-400' :
                                    item.conversao >= 2 ? 'text-amber-400' : 'text-red-400'
                                  }`}>
                                    {item.conversao.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-700">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Search empty state */}
                  {search && paginated.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-slate-500 text-sm">Nenhum produto encontrado para "{search}"</p>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                      <p className="text-xs text-slate-600">
                        {fmtNum(filtered.length)} produto{filtered.length !== 1 ? 's' : ''}
                        {search ? ` encontrado${filtered.length !== 1 ? 's' : ''}` : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {page} / {totalPages}
                        </span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Recharts — Top 10 por Receita Líquida ──────────────── */}
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-1">Top 10 — Receita Líquida</h3>
                  <p className="text-xs text-slate-600 mb-6">
                    Maiores geradores de receita no período selecionado
                  </p>

                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart
                      layout="vertical"
                      data={top10}
                      margin={{ top: 0, right: 24, left: 16, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={v => fmtBRL(v as number)}
                        stroke="#334155"
                        tick={{ fill: '#475569', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="shortTitle"
                        width={170}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(168,85,247,0.05)' }} />
                      <Bar
                        dataKey="receita_liquida"
                        fill="#a855f7"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
