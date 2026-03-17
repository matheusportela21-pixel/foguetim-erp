'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import {
  DollarSign, TrendingUp, TrendingDown, Gift, Loader2, Link2,
  ChevronDown, FileText, List, BarChart3, Info, RefreshCw, ExternalLink, Scale, ArrowRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillingSummary {
  total?:       number
  net_amount?:  number
  gross_amount?: number
  charges?:     { total?: number; breakdown?: { description: string; amount: number }[] }
  bonuses?:     { total?: number; breakdown?: { description: string; amount: number }[] }
  taxes?:       { total?: number }
  [key: string]: unknown
}

interface BillingPeriod {
  key:         string
  status:      string
  start_date?: string
  end_date?:   string
  summary?:    BillingSummary | null
}

interface BillingDocument {
  id?:      string
  type?:    string
  date?:    string
  amount?:  number
  status?:  string
  url?:     string
  [key: string]: unknown
}

interface BillingDetail {
  id?:          string
  description?: string
  amount?:      number
  date?:        string
  type?:        string
  [key: string]: unknown
}

interface BillingPeriodData {
  documents: BillingDocument[]
  summary:   BillingSummary | null
  details:   BillingDetail[]
}

interface OrdersData {
  connected:       boolean
  pedidos:         number
  receita_bruta:   number
  taxas_ml:        number
  receita_liquida: number
  ticket_medio:    number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDate = (s?: string) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('pt-BR') } catch { return s }
}

function periodLabel(key: string): string {
  try {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  } catch { return key }
}

function periodShort(key: string): string {
  try {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('.', '')
      .replace(/^\w/, c => c.toUpperCase())
  } catch { return key }
}

function periodDates(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number)
  const from = new Date(y, m - 1, 1)
  const to   = new Date(y, m, 0, 23, 59, 59)
  return { from: from.toISOString(), to: to.toISOString() }
}

// Extrai valores do summary com fallbacks para estruturas diferentes da ML API
function extractSummaryValues(s: BillingSummary | null) {
  if (!s) return { charges: 0, bonuses: 0, net: 0 }

  const charges = Math.abs(
    Number(s.charges?.total ?? 0) ||
    Number((s as Record<string, unknown>).total_charges ?? 0) ||
    0,
  )
  const bonuses = Math.abs(
    Number(s.bonuses?.total ?? 0) ||
    Number((s as Record<string, unknown>).total_bonuses ?? 0) ||
    0,
  )
  const net = Number(s.net_amount ?? s.gross_amount ?? s.total ?? 0)

  return { charges, bonuses, net }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, colorKey, loading,
}: {
  title: string; value: string; sub?: string
  icon: React.ElementType
  colorKey: 'blue' | 'green' | 'red' | 'purple'
  loading?: boolean
}) {
  const cfg = {
    blue:   { grad: 'from-blue-500/10 to-transparent',   border: 'border-blue-500/20',   text: 'text-blue-400'   },
    green:  { grad: 'from-green-500/10 to-transparent',  border: 'border-green-500/20',  text: 'text-green-400'  },
    red:    { grad: 'from-red-500/10 to-transparent',    border: 'border-red-500/20',    text: 'text-red-400'    },
    purple: { grad: 'from-purple-500/10 to-transparent', border: 'border-purple-500/20', text: 'text-purple-400' },
  }[colorKey]

  return (
    <div className={`glass-card rounded-xl p-5 bg-gradient-to-br ${cfg.grad} border ${cfg.border}`}>
      <div className={`w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>
      {loading
        ? <div className="h-7 w-24 bg-white/[0.06] animate-pulse rounded mb-1" />
        : <p className={`text-xl font-bold font-mono ${cfg.text}`}>{value}</p>}
      <p className="text-xs text-slate-400 mt-1">{title}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
          <div className="h-3 bg-slate-800 rounded w-48" />
          <div className="h-3 bg-slate-800 rounded w-20" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [periods,     setPeriods]     = useState<BillingPeriod[]>([])
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [billingData, setBillingData] = useState<BillingPeriodData | null>(null)
  const [ordersData,  setOrdersData]  = useState<OrdersData | null>(null)
  const [activeTab,   setActiveTab]   = useState<'resumo' | 'notas' | 'detalhamento'>('resumo')
  const [periodsLoading, setPeriodsLoading] = useState(true)
  const [detailLoading,  setDetailLoading]  = useState(false)
  const [connected,   setConnected]   = useState(true)
  const [periodOpen,  setPeriodOpen]  = useState(false)

  // ── 1. Carrega períodos + histórico ──────────────────────────────────────
  const loadPeriods = useCallback(async () => {
    setPeriodsLoading(true)
    try {
      const res = await fetch('/api/mercadolivre/billing?summary=true')
      const d   = await res.json()
      if (!d.connected) { setConnected(false); return }
      const list: BillingPeriod[] = d.periods ?? []
      setPeriods(list)
      if (list.length > 0 && !selectedKey) {
        setSelectedKey(list[0].key)
      }
    } catch {
      setConnected(false)
    } finally {
      setPeriodsLoading(false)
    }
  }, [selectedKey])

  useEffect(() => { loadPeriods() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Carrega detalhe do período selecionado ────────────────────────────
  const loadPeriodDetail = useCallback(async (key: string) => {
    if (!key) return
    setDetailLoading(true)
    setBillingData(null)
    setOrdersData(null)

    const { from, to } = periodDates(key)

    const [billingRes, ordersRes] = await Promise.allSettled([
      fetch(`/api/mercadolivre/billing/${key}`).then(r => r.json()),
      fetch(`/api/mercadolivre/financeiro?date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`).then(r => r.json()),
    ])

    if (billingRes.status === 'fulfilled') {
      const d = billingRes.value as BillingPeriodData & { connected?: boolean }
      if (d.connected !== false) setBillingData(d)
    }
    if (ordersRes.status === 'fulfilled') {
      setOrdersData(ordersRes.value as OrdersData)
    }

    setDetailLoading(false)
  }, [])

  useEffect(() => {
    if (selectedKey) loadPeriodDetail(selectedKey)
  }, [selectedKey, loadPeriodDetail])

  // ── KPI derivados ────────────────────────────────────────────────────────
  const summary    = billingData?.summary ?? null
  const { charges, bonuses } = extractSummaryValues(summary)
  const receitaBruta = ordersData?.receita_bruta ?? 0
  const liquido      = receitaBruta - charges + bonuses

  // ── Histórico para o gráfico ─────────────────────────────────────────────
  const chartData = [...periods]
    .reverse()
    .map(p => {
      const sv = extractSummaryValues(p.summary ?? null)
      return {
        name:     periodShort(p.key),
        charges:  parseFloat(sv.charges.toFixed(2)),
        bonuses:  parseFloat(sv.bonuses.toFixed(2)),
      }
    })

  const selectedPeriod = periods.find(p => p.key === selectedKey)

  // ── Not connected ────────────────────────────────────────────────────────
  if (!periodsLoading && !connected) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Painel Financeiro" subtitle="Faturamento e pagamentos do Mercado Livre" />
        <div className="flex flex-col items-center justify-center gap-4 mt-20 px-6">
          <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
            <Link2 className="w-6 h-6 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-semibold">Mercado Livre não conectado</p>
            <p className="text-slate-600 text-sm mt-1">Conecte sua conta para acessar dados financeiros.</p>
          </div>
          <a href="/dashboard/integracoes"
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
            Conectar agora
          </a>
        </div>
      </div>
    )
  }

  const loading = detailLoading || periodsLoading

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="Painel Financeiro" subtitle="Faturamento e pagamentos do Mercado Livre" />

      <div className="p-6 space-y-6">

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Period dropdown */}
          <div className="relative">
            <button
              onClick={() => setPeriodOpen(o => !o)}
              disabled={periodsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-white/[0.08] rounded-xl text-sm text-slate-200 hover:border-purple-500/40 transition-all disabled:opacity-50"
            >
              {periodsLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /><span className="text-slate-500">Carregando...</span></>
                : <><span>{selectedKey ? periodLabel(selectedKey) : 'Selecionar período'}</span></>
              }
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${periodOpen ? 'rotate-180' : ''}`} />
            </button>
            {periodOpen && periods.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-dark-800 border border-white/[0.08] rounded-xl shadow-2xl z-20 overflow-hidden">
                {periods.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setSelectedKey(p.key); setPeriodOpen(false) }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                      p.key === selectedKey
                        ? 'bg-purple-600/20 text-purple-300'
                        : 'text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{periodLabel(p.key)}</span>
                    {p.status === 'closed' && (
                      <span className="text-[9px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">Fechado</span>
                    )}
                    {p.status === 'open' && (
                      <span className="text-[9px] bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded-full">Aberto</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadPeriodDetail(selectedKey)}
            disabled={loading || !selectedKey}
            className="p-2 rounded-xl bg-dark-800 border border-white/[0.06] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {selectedPeriod?.status === 'open' && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
              <Info className="w-3 h-3" />
              Período em aberto — dados parciais
            </div>
          )}
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Receita Bruta"
            value={fmtBRL(receitaBruta)}
            sub={ordersData?.pedidos ? `${ordersData.pedidos} pedidos` : undefined}
            icon={DollarSign} colorKey="blue" loading={loading}
          />
          <KpiCard
            title="Taxas ML"
            value={charges > 0 ? `- ${fmtBRL(charges)}` : 'R$ 0,00'}
            sub="comissões e tarifas"
            icon={TrendingDown} colorKey="red" loading={loading}
          />
          <KpiCard
            title="Bônus / Créditos"
            value={bonuses > 0 ? `+ ${fmtBRL(bonuses)}` : 'R$ 0,00'}
            sub="descontos e incentivos"
            icon={Gift} colorKey="purple" loading={loading}
          />
          <KpiCard
            title="Líquido Recebido"
            value={fmtBRL(liquido)}
            sub="receita − taxas + bônus"
            icon={TrendingUp} colorKey="green" loading={loading}
          />
        </div>

        {/* ── Conciliação shortcut ────────────────────────────────────────── */}
        <Link
          href={`/dashboard/conciliacao${selectedKey ? `?period_key=${selectedKey}` : ''}`}
          className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Conciliação Financeira</p>
            <p className="text-xs text-slate-500 mt-0.5">Comparar receita bruta com taxas ML cobradas por pedido</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors shrink-0" />
        </Link>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="glass-card rounded-xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.06]">
            {([
              { key: 'resumo',        label: 'Resumo',        Icon: List       },
              { key: 'notas',         label: 'Notas Fiscais', Icon: FileText   },
              { key: 'detalhamento',  label: 'Detalhamento',  Icon: BarChart3  },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === key
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── TAB: Resumo ──────────────────────────────────────────── */}
            {activeTab === 'resumo' && (
              <div className="space-y-6">
                {loading && <SectionSkeleton />}

                {!loading && !summary && (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Sem resumo disponível para este período
                  </p>
                )}

                {!loading && summary && (
                  <>
                    {/* Cobranças */}
                    {charges > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Cobranças</p>
                        <div className="space-y-2">
                          {(summary.charges?.breakdown ?? []).map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                              <span className="text-sm text-slate-300">{item.description}</span>
                              <span className="text-sm text-red-400 font-mono tabular-nums">
                                {fmtBRL(Math.abs(item.amount))}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm font-bold text-slate-200">Total cobranças</span>
                            <span className="text-sm font-bold text-red-400 font-mono">- {fmtBRL(charges)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bônus */}
                    {bonuses > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Bônus / Créditos</p>
                        <div className="space-y-2">
                          {(summary.bonuses?.breakdown ?? []).map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                              <span className="text-sm text-slate-300">{item.description}</span>
                              <span className="text-sm text-green-400 font-mono tabular-nums">
                                + {fmtBRL(Math.abs(item.amount))}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm font-bold text-slate-200">Total bônus</span>
                            <span className="text-sm font-bold text-green-400 font-mono">+ {fmtBRL(bonuses)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Conciliação */}
                <div className="bg-dark-800/60 border border-white/[0.06] rounded-xl p-5 mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <List className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-semibold text-white">Conciliação do Período</p>
                  </div>
                  {loading ? (
                    <SectionSkeleton />
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Pedidos pagos</span>
                        <span className="text-white font-mono">{ordersData?.pedidos ?? '—'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Receita bruta</span>
                        <span className="text-white font-mono">{fmtBRL(receitaBruta)}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Taxas ML cobradas</span>
                        <span className="text-red-400 font-mono">- {fmtBRL(charges)}</span>
                      </div>
                      {bonuses > 0 && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-400">Bônus / créditos</span>
                          <span className="text-green-400 font-mono">+ {fmtBRL(bonuses)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-2.5 border-t border-white/[0.08] mt-1">
                        <span className="font-bold text-white">Valor líquido</span>
                        <span className="font-bold text-green-400 font-mono">{fmtBRL(liquido)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-600">
                    <Info className="w-3 h-3" />
                    Dados de pedidos vs billing podem ter defasagem de até 24h
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Notas Fiscais ──────────────────────────────────── */}
            {activeTab === 'notas' && (
              <div>
                {loading && <SectionSkeleton />}

                {!loading && (billingData?.documents ?? []).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhuma nota fiscal emitida neste período
                  </p>
                )}

                {!loading && (billingData?.documents ?? []).length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Data', 'Tipo', 'Valor', 'Status', ''].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(billingData?.documents ?? []).map((doc, i) => (
                          <tr key={doc.id ?? i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                            <td className="px-3 py-3 text-slate-300">{fmtDate(doc.date)}</td>
                            <td className="px-3 py-3">
                              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-800 text-slate-400">
                                {doc.type ?? '—'}
                              </span>
                            </td>
                            <td className={`px-3 py-3 font-mono tabular-nums ${(doc.amount ?? 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {doc.amount != null ? fmtBRL(Math.abs(doc.amount)) : '—'}
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                doc.status === 'ISSUED' ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {doc.status ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {doc.url && (
                                <a href={String(doc.url)} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                                  <ExternalLink className="w-3 h-3" /> Abrir
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Detalhamento ──────────────────────────────────── */}
            {activeTab === 'detalhamento' && (
              <div>
                {loading && <SectionSkeleton />}

                {!loading && (billingData?.details ?? []).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhum detalhamento disponível neste período
                  </p>
                )}

                {!loading && (billingData?.details ?? []).length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Data', 'Descrição', 'Tipo', 'Valor'].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(billingData?.details ?? []).slice(0, 200).map((d, i) => (
                          <tr key={d.id ?? i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(d.date)}</td>
                            <td className="px-3 py-2.5 text-slate-300 max-w-xs truncate" title={d.description}>
                              {d.description ?? '—'}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                {d.type ?? '—'}
                              </span>
                            </td>
                            <td className={`px-3 py-2.5 font-mono tabular-nums whitespace-nowrap ${
                              (d.amount ?? 0) < 0 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {d.amount != null ? fmtBRL(Math.abs(d.amount)) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(billingData?.details ?? []).length > 200 && (
                      <p className="text-xs text-slate-600 text-center py-3">
                        Mostrando 200 de {billingData!.details.length} registros
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Histórico 12 meses ───────────────────────────────────────────── */}
        {chartData.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-white">Histórico de Faturamento</h3>
              <p className="text-xs text-slate-500 mt-0.5">Taxas ML e bônus por período (últimos 12 meses)</p>
            </div>

            {periodsLoading ? (
              <div className="h-48 bg-dark-800/40 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#475569', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`}
                    tick={{ fill: '#475569', fontSize: 10 }}
                    axisLine={false} tickLine={false} width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111318', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, color: '#e2e8f0', fontSize: 12,
                    }}
                    formatter={(v: number, name: string) => [
                      fmtBRL(v),
                      name === 'charges' ? 'Taxas ML' : 'Bônus',
                    ]}
                  />
                  <Bar dataKey="charges" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="bonuses" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}

            <div className="flex items-center gap-5 mt-3 justify-center">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-xs text-slate-500">Taxas ML</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" /><span className="text-xs text-slate-500">Bônus</span></div>
            </div>
          </div>
        )}

        {/* Empty state — nenhum período disponível */}
        {!periodsLoading && connected && periods.length === 0 && (
          <div className="glass-card rounded-xl p-12 text-center">
            <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Nenhum período de faturamento disponível</p>
            <p className="text-slate-600 text-sm mt-1">Os dados de billing aparecem após o primeiro mês completo de vendas.</p>
          </div>
        )}

      </div>
    </div>
  )
}
