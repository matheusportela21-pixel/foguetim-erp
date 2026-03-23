'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign,
  Percent, AlertTriangle, Info, Package, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Loader2, BarChart3,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import Link from 'next/link'
import ExportPDFButton from '@/components/ExportPDFButton'
import { generateDREPDF } from '@/lib/reports/pdf-generator'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface DREData {
  periodStart: string
  periodEnd:   string
  revenue:     { ml: number; shopee: number; magalu: number; total: number }
  deductions:  { commissions_ml: number; commissions_shopee: number; commissions_magalu: number; shipping: number; taxes: number; taxRate: number; total: number }
  netRevenue:  number
  cmv:         { total: number; coveragePct: number }
  grossProfit: number; grossMarginPct: number
  operationalExpenses: number
  operationalProfit: number; operationalMarginPct: number
  otherExpenses: number
  netProfit: number; netMarginPct: number
  ordersCount: number; ticketMedio: number
  dataSources: Record<string, string>
  productProfitability: ProductProfit[]
}

interface ProductProfit {
  title: string; revenue: number; cmv: number; commission: number
  shipping: number; profit: number; marginPct: number; quantity: number
}

interface HistoryEntry {
  period_start: string; revenue_total: number; gross_profit: number; net_profit: number
  net_margin_pct: number; orders_count: number
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtBRL(v: number) { return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtPct(v: number) { return `${v.toFixed(1)}%` }
function fmtMonth(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function getMonthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().slice(0, 10)
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ start, end, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, change, prefix, icon: Icon }: {
  label: string; value: string; change?: number | null; prefix?: string
  icon: React.ElementType
}) {
  return (
    <div className="glass-card px-4 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <p className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xl font-bold text-white">{prefix}{value}</p>
      {change != null && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change >= 0 ? '+' : ''}{change.toFixed(1)}{label.includes('Margem') ? 'pp' : '%'} vs anterior
        </div>
      )}
    </div>
  )
}

/* ── DRE Line ────────────────────────────────────────────────────────────── */
function DRELine({ label, value, indent, bold, negative, sub, tooltip }: {
  label: string; value: number; indent?: boolean; bold?: boolean; negative?: boolean
  sub?: boolean; tooltip?: string
}) {
  const textColor = negative ? 'text-red-400' : bold ? 'text-white' : 'text-slate-300'
  const formatted = negative ? `(${fmtBRL(Math.abs(value))})` : fmtBRL(value)

  return (
    <div className={`flex items-center justify-between py-2.5 px-4 ${
      bold ? 'bg-white/[0.04] font-bold' : sub ? 'bg-white/[0.01]' : ''
    } ${indent ? 'pl-10' : ''} group`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${textColor}`}>
          {negative && !indent ? '(−)' : indent ? '' : bold ? '(=)' : '(+)'} {label}
        </span>
        {tooltip && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity" title={tooltip}>
            <Info className="w-3 h-3 text-slate-600" />
          </span>
        )}
      </div>
      <span className={`text-sm font-mono ${textColor}`}>{formatted}</span>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function DREPage() {
  const [dre, setDre]             = useState<DREData | null>(null)
  const [prevDre, setPrevDre]     = useState<DREData | null>(null)
  const [history, setHistory]     = useState<HistoryEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [showProducts, setShowProducts]   = useState(false)

  const months = getMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(0) // index into months

  const period = months[selectedMonth]

  async function loadDRE(recalculate = false) {
    if (recalculate) setRecalculating(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams({ period_start: period.start, period_end: period.end })
      if (recalculate) params.set('recalculate', '1')

      const [dreRes, histRes] = await Promise.all([
        fetch(`/api/financial/dre?${params}`),
        fetch('/api/financial/dre/history'),
      ])

      if (dreRes.ok) {
        const d = await dreRes.json()
        setDre(d.dre)
      }
      if (histRes.ok) {
        const h = await histRes.json()
        setHistory(h.history ?? [])
      }

      // Load previous month for comparison
      if (selectedMonth < months.length - 1) {
        const prev = months[selectedMonth + 1]
        const prevRes = await fetch(`/api/financial/dre?period_start=${prev.start}&period_end=${prev.end}`)
        if (prevRes.ok) {
          const pd = await prevRes.json()
          setPrevDre(pd.dre)
        }
      }
    } catch { /* silencia */ }
    finally { setLoading(false); setRecalculating(false) }
  }

  useEffect(() => { loadDRE() }, [selectedMonth])

  // Chart data from history (reversed to show oldest first)
  const chartData = [...history].reverse().map(h => ({
    name:       fmtMonth(h.period_start),
    receita:    h.revenue_total,
    lucroBruto: h.gross_profit,
    lucroLiq:   h.net_profit,
  }))

  // Changes vs previous
  const pct = (cur: number, prev: number | undefined) => {
    if (prev == null || prev === 0) return null
    return ((cur - prev) / prev) * 100
  }

  const changes = prevDre ? {
    revenue:  pct(dre?.revenue.total ?? 0, prevDre.revenue.total),
    gross:    pct(dre?.grossProfit ?? 0, prevDre.grossProfit),
    net:      pct(dre?.netProfit ?? 0, prevDre.netProfit),
    margin:   (dre?.netMarginPct ?? 0) - prevDre.netMarginPct,
  } : { revenue: null, gross: null, net: null, margin: null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Header title="DRE Simplificado" subtitle="Demonstrativo de Resultados do Exercício" />
        <div className="flex items-center gap-3">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none">
            {months.map((m, i) => <option key={m.start} value={i}>{m.label}</option>)}
          </select>
          {dre && (
            <ExportPDFButton onExport={() => generateDREPDF(dre)} />
          )}
          <button onClick={() => loadDRE(true)} disabled={recalculating}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            Recalcular
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : !dre ? (
        <div className="glass-card p-8 text-center">
          <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhum dado disponível para este período</p>
          <p className="text-xs text-slate-600 mt-1">Conecte seu Mercado Livre para ver dados reais</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Receita Bruta" value={fmtBRL(dre.revenue.total)} change={changes.revenue} />
            <KpiCard icon={TrendingUp} label="Lucro Bruto" value={fmtBRL(dre.grossProfit)} change={changes.gross} />
            <KpiCard icon={TrendingUp} label="Lucro Líquido" value={fmtBRL(dre.netProfit)} change={changes.net} />
            <KpiCard icon={Percent} label="Margem Líquida" value={fmtPct(dre.netMarginPct)} change={changes.margin} />
          </div>

          {/* DRE Table */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Demonstrativo de Resultados</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{period.label}</p>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {/* Receita */}
              <DRELine label="RECEITA BRUTA" value={dre.revenue.total} bold />
              {dre.revenue.ml > 0 && <DRELine label="Vendas Mercado Livre" value={dre.revenue.ml} indent sub />}
              {dre.revenue.shopee > 0 && <DRELine label="Vendas Shopee" value={dre.revenue.shopee} indent sub />}
              {dre.revenue.magalu > 0 && <DRELine label="Vendas Magalu" value={dre.revenue.magalu} indent sub />}

              {/* Deduções */}
              <DRELine label="DEDUÇÕES" value={dre.deductions.total} negative bold />
              {dre.deductions.commissions_ml > 0 && <DRELine label="Comissões ML" value={dre.deductions.commissions_ml} indent negative tooltip="Taxa cobrada pelo Mercado Livre por venda (sale_fee)" />}
              {dre.deductions.commissions_shopee > 0 && <DRELine label="Comissões Shopee" value={dre.deductions.commissions_shopee} indent negative />}
              <DRELine label="Frete vendedor" value={dre.deductions.shipping} indent negative tooltip="Estimativa de frete pago pelo vendedor (~6% da receita)" />
              <DRELine label={`Impostos (${fmtPct(dre.deductions.taxRate)})`} value={dre.deductions.taxes} indent negative tooltip={`Taxa de imposto: ${fmtPct(dre.deductions.taxRate)} sobre receita bruta`} />

              {/* Receita Líquida */}
              <DRELine label="RECEITA LÍQUIDA" value={dre.netRevenue} bold />

              {/* CMV */}
              <DRELine label="CUSTO DE MERCADORIA (CMV)" value={dre.cmv.total} negative bold tooltip="Custo dos produtos vendidos, baseado no custo cadastrado" />

              {/* Lucro Bruto */}
              <DRELine label={`LUCRO BRUTO (${fmtPct(dre.grossMarginPct)})`} value={dre.grossProfit} bold />

              {/* Despesas Operacionais */}
              <DRELine label="DESPESAS OPERACIONAIS" value={dre.operationalExpenses} negative bold tooltip="Custos fixos cadastrados em /dashboard/financeiro/custos" />

              {/* Lucro Operacional */}
              <DRELine label={`LUCRO OPERACIONAL (${fmtPct(dre.operationalMarginPct)})`} value={dre.operationalProfit} bold />

              {dre.otherExpenses > 0 && (
                <>
                  <DRELine label="OUTRAS DESPESAS" value={dre.otherExpenses} negative bold />
                </>
              )}

              {/* Lucro Líquido */}
              <div className="flex items-center justify-between py-3.5 px-4 bg-gradient-to-r from-purple-500/10 to-transparent">
                <span className="text-sm font-bold text-white">(=) LUCRO LÍQUIDO ({fmtPct(dre.netMarginPct)})</span>
                <span className={`text-lg font-bold font-mono ${dre.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dre.netProfit >= 0 ? fmtBRL(dre.netProfit) : `(${fmtBRL(Math.abs(dre.netProfit))})`}
                </span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-3">
            {dre.cmv.coveragePct < 100 && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{fmtPct(100 - dre.cmv.coveragePct)} dos produtos vendidos não tem custo cadastrado</p>
                  <p className="text-amber-400/70 mt-0.5">Cadastre os custos no armazém para um DRE mais preciso.</p>
                  <Link href="/dashboard/armazem" className="text-amber-300 hover:underline mt-1 inline-block">Cadastrar custos →</Link>
                </div>
              </div>
            )}
            {dre.dataSources.ml === 'unavailable' && (
              <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Mercado Livre não conectado</p>
                  <p className="text-blue-400/70 mt-0.5">Conecte para ver dados reais de receita e comissões.</p>
                  <Link href="/dashboard/integracoes" className="text-blue-300 hover:underline mt-1 inline-block">Conectar →</Link>
                </div>
              </div>
            )}
            {dre.netMarginPct > 0 && prevDre && dre.netMarginPct > prevDre.netMarginPct && (
              <div className="flex items-start gap-3 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Margem líquida subiu {(dre.netMarginPct - prevDre.netMarginPct).toFixed(1)}pp neste período.</p>
              </div>
            )}
            {dre.netMarginPct > 0 && prevDre && dre.netMarginPct < prevDre.netMarginPct && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Margem líquida caiu {(prevDre.netMarginPct - dre.netMarginPct).toFixed(1)}pp. Verifique comissões e custos.</p>
              </div>
            )}
          </div>

          {/* Evolution Chart */}
          {chartData.length > 1 && (
            <div className="glass-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Evolução — Últimos meses</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                  <defs>
                    <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLucroBruto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLucroLiq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} />
                  <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#475569', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmtBRL(v), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#3b82f6" fill="url(#gReceita)" strokeWidth={2} />
                  <Area type="monotone" dataKey="lucroBruto" name="Lucro Bruto" stroke="#22c55e" fill="url(#gLucroBruto)" strokeWidth={2} />
                  <Area type="monotone" dataKey="lucroLiq" name="Lucro Líquido" stroke="#a855f7" fill="url(#gLucroLiq)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Product Profitability */}
          <div className="glass-card overflow-hidden">
            <button onClick={() => setShowProducts(!showProducts)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Lucratividade por Produto</p>
              </div>
              {showProducts ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showProducts && (
              <div className="border-t border-white/[0.06]">
                {dre.productProfitability.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-600">Sem dados de lucratividade</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Produto', 'Receita', 'CMV', 'Comissão', 'Lucro', 'Margem'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {dre.productProfitability.slice(0, 20).map((p, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5">
                            <p className="text-xs text-slate-300 truncate max-w-[200px]">{p.title}</p>
                            <p className="text-[10px] text-slate-600">Qtd: {p.quantity}</p>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-300 font-mono">{fmtBRL(p.revenue)}</td>
                          <td className="px-4 py-2.5 text-xs text-red-400 font-mono">{p.cmv > 0 ? `(${fmtBRL(p.cmv)})` : '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-red-400 font-mono">({fmtBRL(p.commission)})</td>
                          <td className="px-4 py-2.5 text-xs font-mono font-bold">
                            <span className={p.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {p.profit >= 0 ? fmtBRL(p.profit) : `(${fmtBRL(Math.abs(p.profit))})`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              p.marginPct >= 20 ? 'bg-green-500/10 text-green-400'
                                : p.marginPct >= 10 ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-red-500/10 text-red-400'
                            }`}>
                              {fmtPct(p.marginPct)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-[10px] text-slate-700 text-center">
            Dados: {Object.entries(dre.dataSources).map(([k, v]) => `${k}: ${v}`).join(' · ')} · Calculado em {new Date().toLocaleDateString('pt-BR')}
          </p>
        </>
      )}
    </div>
  )
}
