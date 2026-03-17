'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Scale, DollarSign, TrendingDown, Gift, ChevronDown,
  CheckCircle, AlertTriangle, RefreshCw, Link2, Loader2,
} from 'lucide-react'
import type { ConciliacaoResult, ConciliacaoOrder } from '@/app/api/mercadolivre/conciliacao/route'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface BillingPeriod {
  key:     string
  status:  string
  summary?: unknown
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function periodLabel(key: string): string {
  try {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  } catch { return key }
}

const STATUS_ORDER: Record<string, { label: string; cls: string }> = {
  paid:      { label: 'Pago',     cls: 'bg-green-400/10 text-green-400'   },
  shipped:   { label: 'Enviado',  cls: 'bg-blue-400/10 text-blue-400'     },
  delivered: { label: 'Entregue', cls: 'bg-purple-400/10 text-purple-400' },
  cancelled: { label: 'Cancelado',cls: 'bg-red-400/10 text-red-400'       },
}

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ title, value, sub, icon: Icon, color, loading }: {
  title: string; value: string; sub?: string
  icon: React.ElementType; color: string; loading?: boolean
}) {
  return (
    <div className={`glass-card rounded-xl p-5 bg-gradient-to-br border ${color}`}>
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-current opacity-70" />
      </div>
      {loading
        ? <div className="h-7 w-24 bg-white/[0.06] animate-pulse rounded mb-1" />
        : <p className="text-xl font-bold font-mono">{value}</p>}
      <p className="text-xs text-slate-400 mt-1">{title}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── Composition Bar ─────────────────────────────────────────────────────── */
function CompositionBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((Math.abs(value) / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 text-xs text-slate-400 truncate shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`text-xs font-mono font-semibold shrink-0 w-28 text-right ${value < 0 ? 'text-red-400' : value > 0 ? 'text-green-400' : 'text-white'}`}>
        {value >= 0 ? '+' : ''}{fmtBRL(value)}
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
type TabId = 'visao' | 'taxas' | 'pedidos'

export default function ConciliacaoPage() {
  const [periods,     setPeriods]     = useState<BillingPeriod[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [periodOpen,  setPeriodOpen]  = useState(false)
  const [data,        setData]        = useState<ConciliacaoResult | null>(null)
  const [tab,         setTab]         = useState<TabId>('visao')
  const [loadingP,    setLoadingP]    = useState(true)
  const [loadingD,    setLoadingD]    = useState(false)
  const [connected,   setConnected]   = useState<boolean | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  // Load periods list
  useEffect(() => {
    setLoadingP(true)
    fetch('/api/mercadolivre/billing')
      .then(r => r.json())
      .then((d: { connected?: boolean; periods?: BillingPeriod[] }) => {
        if (d.connected === false) { setConnected(false); return }
        setConnected(true)
        const list = d.periods ?? []
        setPeriods(list)
        if (list[0]) setSelectedKey(list[0].key)
      })
      .catch(() => setConnected(false))
      .finally(() => setLoadingP(false))
  }, [])

  // Load conciliation data when period changes
  const loadData = useCallback(async (key: string) => {
    if (!key) return
    setLoadingD(true)
    setError(null)
    setData(null)
    try {
      const res  = await fetch(`/api/mercadolivre/conciliacao?period_key=${key}`)
      const d    = await res.json() as ConciliacaoResult & { connected?: boolean; error?: string }
      if (d.connected === false) { setConnected(false); return }
      if (d.error) { setError(d.error); return }
      setData(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoadingD(false)
    }
  }, [])

  useEffect(() => {
    if (selectedKey) loadData(selectedKey)
  }, [selectedKey, loadData])

  /* Derived */
  const max = data ? Math.max(data.receita_bruta, data.receita_liquida) : 1

  const chartData = data ? [
    { name: 'Rec. Bruta',   value: data.receita_bruta,    color: '#10b981' },
    { name: 'Taxas ML',     value: -data.total_taxas_ml,  color: '#ef4444' },
    { name: 'Bônus',        value: data.total_bonus,       color: '#6366f1' },
    { name: 'Líquido',      value: data.receita_liquida,   color: '#3b82f6' },
  ] : []

  return (
    <div>
      <Header title="Conciliação Financeira" subtitle="Receita dos pedidos vs cobranças do Mercado Livre" />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* ── Not connected ────────────────────────────────────────────── */}
        {connected === false && (
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-10 flex flex-col items-center gap-3 text-center">
            <Link2 className="w-10 h-10 text-slate-700" />
            <p className="text-sm font-semibold text-slate-400">Conta Mercado Livre não conectada</p>
            <Link href="/dashboard/integracoes" className="text-xs text-indigo-400 hover:underline">
              Ir para Integrações →
            </Link>
          </div>
        )}

        {connected !== false && (
          <>
            {/* ── Period selector ────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setPeriodOpen(v => !v)}
                  disabled={loadingP || (!loadingP && periods.length === 0)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#111318] border border-white/[0.08] rounded-xl text-sm font-medium text-white hover:border-white/[0.15] transition-all disabled:opacity-50"
                >
                  {loadingP
                    ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    : <Scale className="w-4 h-4 text-slate-500" />}
                  <span>{loadingP ? 'Carregando...' : !loadingP && periods.length === 0 ? 'Nenhum período disponível' : selectedKey ? periodLabel(selectedKey) : 'Selecionar período'}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
                </button>

                {periodOpen && periods.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-[#111318] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden w-52">
                    {periods.map(p => (
                      <button
                        key={p.key}
                        onClick={() => { setSelectedKey(p.key); setPeriodOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${p.key === selectedKey ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-white/[0.04]'}`}
                      >
                        {periodLabel(p.key)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => selectedKey && loadData(selectedKey)}
                disabled={loadingD}
                className="p-2 text-slate-500 hover:text-slate-200 bg-white/[0.04] border border-white/[0.06] rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingD ? 'animate-spin' : ''}`} />
              </button>

              {data && (
                <span className="text-xs text-slate-600 ml-auto">
                  {data.period_label}
                </span>
              )}
            </div>

            {/* ── Error ──────────────────────────────────────────────── */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* ── KPIs ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                title="Receita Bruta"
                value={data ? fmtBRL(data.receita_bruta) : '—'}
                sub={data ? `${data.total_pedidos} pedidos` : undefined}
                icon={DollarSign}
                color="from-green-500/10 to-transparent border-green-500/20 text-green-400"
                loading={loadingD}
              />
              <KpiCard
                title="Taxas ML"
                value={data ? fmtBRL(-data.total_taxas_ml) : '—'}
                sub={data ? `${data.comissao_percentual.toFixed(1)}% da receita` : undefined}
                icon={TrendingDown}
                color="from-red-500/10 to-transparent border-red-500/20 text-red-400"
                loading={loadingD}
              />
              <KpiCard
                title="Bônus / Créditos"
                value={data ? fmtBRL(data.total_bonus) : '—'}
                sub={data ? `${data.bonuses.length} crédito(s)` : undefined}
                icon={Gift}
                color="from-purple-500/10 to-transparent border-purple-500/20 text-purple-400"
                loading={loadingD}
              />
              <KpiCard
                title="Receita Líquida"
                value={data ? fmtBRL(data.receita_liquida) : '—'}
                sub={data ? `Ticket médio: ${fmtBRL(data.ticket_medio)}` : undefined}
                icon={Scale}
                color="from-blue-500/10 to-transparent border-blue-500/20 text-blue-400"
                loading={loadingD}
              />
            </div>

            {/* ── Status card ──────────────────────────────────────────── */}
            {data && (
              <div>
                {data.status === 'ok' ? (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-green-400 text-sm font-medium">
                      Conciliado — sem divergências significativas entre pedidos e billing
                    </span>
                  </div>
                ) : data.status === 'divergente' ? (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-amber-400 text-sm">
                      Divergência de {fmtBRL(Math.abs(data.divergencia))} — pode haver defasagem de até 24h entre pedidos e billing
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-500/10 border border-slate-500/20 rounded-xl">
                    <Loader2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-400 text-sm">
                      Dados de billing ainda não disponíveis para este período
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            {data && (
              <>
                <div className="flex gap-1 border-b border-white/[0.06] pb-0">
                  {([
                    { id: 'visao' as TabId,   label: '📊 Visão Geral'      },
                    { id: 'taxas' as TabId,   label: '💸 Taxas Detalhadas' },
                    { id: 'pedidos' as TabId, label: '🧾 Por Pedido'       },
                  ] as { id: TabId; label: string }[]).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                        tab === t.id
                          ? 'text-white border-indigo-500'
                          : 'text-slate-500 border-transparent hover:text-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── Visão Geral ──────────────────────────────────────── */}
                {tab === 'visao' && (
                  <div className="space-y-6">
                    {/* Chart */}
                    <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
                      <p className="text-xs font-semibold text-slate-400 mb-5">Composição da Receita</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={chartData} barSize={32} barCategoryGap="30%">
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                            formatter={(v: number) => [fmtBRL(v), '']}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Composition bars */}
                    <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 space-y-3">
                      <p className="text-xs font-semibold text-slate-400 mb-4">Breakdown</p>
                      <CompositionBar label="Receita Bruta"   value={data.receita_bruta}      max={max} color="bg-emerald-500" />
                      {data.charges.map((c, i) => (
                        <CompositionBar key={i} label={c.label} value={-c.amount} max={max} color="bg-red-500/70" />
                      ))}
                      {data.total_taxas_ml > 0 && data.charges.length === 0 && (
                        <CompositionBar label="Taxas ML" value={-data.total_taxas_ml} max={max} color="bg-red-500/70" />
                      )}
                      {data.bonuses.map((b, i) => (
                        <CompositionBar key={i} label={b.label} value={b.amount} max={max} color="bg-purple-500/70" />
                      ))}
                      <div className="border-t border-white/[0.06] pt-3">
                        <CompositionBar label="Receita Líquida" value={data.receita_liquida} max={max} color="bg-blue-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Taxas Detalhadas ─────────────────────────────────── */}
                {tab === 'taxas' && (
                  <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Item', 'Valor', '% Receita'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {data.charges.length > 0 ? data.charges.map((c, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="px-5 py-3 text-xs text-slate-300">{c.label}</td>
                            <td className="px-5 py-3 text-xs font-mono text-red-400">{fmtBRL(-c.amount)}</td>
                            <td className="px-5 py-3 text-xs text-slate-500">
                              {data.receita_bruta > 0 ? `${((c.amount / data.receita_bruta) * 100).toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td className="px-5 py-3 text-xs text-slate-300">Total cobranças ML</td>
                            <td className="px-5 py-3 text-xs font-mono text-red-400">{fmtBRL(-data.total_taxas_ml)}</td>
                            <td className="px-5 py-3 text-xs text-slate-500">
                              {data.comissao_percentual.toFixed(1)}%
                            </td>
                          </tr>
                        )}
                        {/* Totals row */}
                        <tr className="bg-white/[0.02] font-semibold">
                          <td className="px-5 py-3 text-xs text-slate-200">Total taxas</td>
                          <td className="px-5 py-3 text-xs font-mono text-red-400">{fmtBRL(-data.total_taxas_ml)}</td>
                          <td className="px-5 py-3 text-xs text-slate-400">{data.comissao_percentual.toFixed(1)}%</td>
                        </tr>

                        {data.bonuses.length > 0 && (
                          <>
                            <tr className="bg-white/[0.01]">
                              <td colSpan={3} className="px-5 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Bônus / Créditos</td>
                            </tr>
                            {data.bonuses.map((b, i) => (
                              <tr key={i} className="hover:bg-white/[0.02]">
                                <td className="px-5 py-3 text-xs text-slate-300">{b.label}</td>
                                <td className="px-5 py-3 text-xs font-mono text-purple-400">+{fmtBRL(b.amount)}</td>
                                <td className="px-5 py-3 text-xs text-slate-500">—</td>
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Por Pedido ───────────────────────────────────────── */}
                {tab === 'pedidos' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-400">
                        Comissão estimada com base na taxa média do período ({data.comissao_percentual.toFixed(1)}%). O ML não disponibiliza a comissão por pedido via API.
                      </p>
                    </div>

                    <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            {['Pedido', 'Comprador', 'Produto(s)', 'Valor', 'Comissão*', '% Comiss.', 'Líquido*'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {data.orders.map((order: ConciliacaoOrder) => {
                            const stCfg = STATUS_ORDER[order.status] ?? { label: order.status, cls: 'bg-slate-500/10 text-slate-400' }
                            return (
                              <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3 font-mono text-slate-400">
                                  <div>#{String(order.id).slice(-8)}</div>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stCfg.cls}`}>{stCfg.label}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-300 max-w-[100px] truncate">{order.buyer_nickname}</td>
                                <td className="px-4 py-3 max-w-[180px]">
                                  {order.items.slice(0, 2).map((it, i) => (
                                    <p key={i} className="text-slate-400 truncate">{it.quantity}× {it.title}</p>
                                  ))}
                                  {order.items.length > 2 && (
                                    <p className="text-slate-600">+{order.items.length - 2} mais</p>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold text-white whitespace-nowrap">
                                  {fmtBRL(order.total_amount)}
                                </td>
                                <td className="px-4 py-3 font-mono text-red-400 whitespace-nowrap">
                                  {fmtBRL(-order.comissao_estimada)}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {data.comissao_percentual.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold text-blue-400 whitespace-nowrap">
                                  {fmtBRL(order.liquido_estimado)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {data.orders.length >= 100 && (
                        <div className="px-5 py-3 text-center text-xs text-slate-600 border-t border-white/[0.04]">
                          Exibindo os primeiros 100 pedidos. Acesse o Financeiro para o período completo.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Loading state */}
            {loadingD && !data && (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Calculando conciliação...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
