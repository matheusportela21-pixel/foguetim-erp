'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BarChart3, TrendingUp, Package, Users, DollarSign, ShoppingCart,
  Star, Zap, FileDown, Clock, RefreshCw, AlertCircle,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface PeriodWithSummary {
  key:     string
  summary: Record<string, unknown> | null
}

interface FinanceiroData {
  connected:      boolean
  pedidos:        number
  receita_bruta:  number
  taxas_ml:       number
  receita_liquida: number
  ticket_medio:   number
}

interface AnuncioItem {
  item_id:       string
  title:         string
  thumbnail?:    string
  total_vendas:  number
  receita_bruta: number
  taxas_ml:      number
}

interface VendasData {
  connected: boolean
  items?:    AnuncioItem[]
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function pct(num: number, den: number) {
  if (!den) return '—'
  return `${((num / den) * 100).toFixed(1)}%`
}

function periodLabel(key: string) {
  const [y, m] = key.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[Number(m) - 1]}/${y?.slice(2)}`
}

function extractCharges(summary: Record<string, unknown> | null): number {
  if (!summary) return 0
  const s = summary as Record<string, Record<string, number>>
  return (
    s?.charges?.total ??
    s?.total_charged ??
    s?.debit?.total ??
    0
  )
}

function extractCredits(summary: Record<string, unknown> | null): number {
  if (!summary) return 0
  const s = summary as Record<string, Record<string, number>>
  return (
    s?.credits?.total ??
    s?.total_credited ??
    s?.credit?.total ??
    0
  )
}

/* ── Report cards list ───────────────────────────────────────────────────── */
const reports = [
  {
    icon: TrendingUp,   title: 'Relatório de Vendas',
    desc: 'Análise completa de receita, ticket médio e crescimento por período.',
    tags: ['Mensal', 'Semanal', 'Diário'], available: true, ai: false,
  },
  {
    icon: Package,      title: 'Performance de Produtos',
    desc: 'Ranking de produtos mais vendidos, giro de estoque e margem por SKU.',
    tags: ['Produtos', 'Estoque'], available: true, ai: false,
  },
  {
    icon: BarChart3,    title: 'Relatório por Marketplace',
    desc: 'Performance do Mercado Livre por período: receita, pedidos e ticket médio.',
    tags: ['Canais', 'Comparativo'], available: true, ai: false,
  },
  {
    icon: DollarSign,   title: 'Análise Financeira',
    desc: 'Breakdown de custos, comissões, frete e lucratividade líquida.',
    tags: ['Financeiro', 'Custos'], available: true, ai: false,
  },
  {
    icon: Users,        title: 'Relatório de Clientes',
    desc: 'LTV, taxa de recompra, segmentação e clientes em risco de churn.',
    tags: ['CRM', 'Fidelidade'], available: false, ai: false,
  },
  {
    icon: ShoppingCart, title: 'Funil de Pedidos',
    desc: 'Taxa de cancelamento, devoluções e gargalos operacionais.',
    tags: ['Operações', 'Qualidade'], available: false, ai: false,
  },
  {
    icon: Star,         title: 'Insights IA — Previsão de Demanda',
    desc: 'Previsão de vendas para os próximos 30 dias baseada em histórico e sazonalidade.',
    tags: ['IA', 'Previsão'], available: false, ai: true,
  },
  {
    icon: Zap,          title: 'Insights IA — Otimização de Preços',
    desc: 'Sugestões de ajuste de preços para maximizar margem e competitividade.',
    tags: ['IA', 'Precificação'], available: false, ai: true,
  },
  {
    icon: TrendingUp,   title: 'Insights IA — Análise de Concorrência',
    desc: 'Monitoramento automático de concorrentes nos marketplaces conectados.',
    tags: ['IA', 'Mercado'], available: false, ai: true,
  },
]

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton({ w = 'w-20', h = 'h-4' }: { w?: string; h?: string }) {
  return <span className={`inline-block ${w} ${h} bg-white/[0.06] rounded animate-pulse`} />
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function RelatoriosPage() {
  const [billingData, setBillingData]   = useState<PeriodWithSummary[]>([])
  const [finData, setFinData]           = useState<FinanceiroData | null>(null)
  const [vendasData, setVendasData]     = useState<AnuncioItem[]>([])
  const [loadingBilling, setLoadingBilling] = useState(true)
  const [loadingFin, setLoadingFin]     = useState(true)
  const [loadingVendas, setLoadingVendas] = useState(true)
  const [mlConnected, setMlConnected]   = useState<boolean | null>(null)

  async function loadAll() {
    setLoadingBilling(true)
    setLoadingFin(true)
    setLoadingVendas(true)

    const [billingRes, finRes, vendasRes] = await Promise.allSettled([
      fetch('/api/mercadolivre/billing?summary=true').then(r => r.json()),
      fetch('/api/mercadolivre/financeiro?period=trimestre').then(r => r.json()),
      fetch('/api/mercadolivre/vendas-por-anuncio?days=90').then(r => r.json()),
    ])

    if (billingRes.status === 'fulfilled') {
      const d = billingRes.value as { connected?: boolean; periods?: PeriodWithSummary[] }
      if (d?.connected !== false) {
        setBillingData(d?.periods ?? [])
        setMlConnected(true)
      } else {
        setMlConnected(false)
      }
    }
    setLoadingBilling(false)

    if (finRes.status === 'fulfilled') {
      const d = finRes.value as FinanceiroData
      if (d?.connected !== false) setFinData(d)
    }
    setLoadingFin(false)

    if (vendasRes.status === 'fulfilled') {
      const d = vendasRes.value as VendasData
      if (d?.connected !== false) setVendasData(d?.items ?? [])
    }
    setLoadingVendas(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Derived values from billing */
  const last3 = billingData.slice(0, 3)
  const chartData = last3.map(p => ({
    label:   periodLabel(p.key),
    taxas:   Math.abs(extractCharges(p.summary)),
    creditos: Math.abs(extractCredits(p.summary)),
  })).reverse()

  const totalReceita3m = finData?.receita_bruta ?? 0
  const totalTaxas3m   = last3.reduce((s, p) => s + Math.abs(extractCharges(p.summary)), 0)
  const comissaoMedia  = pct(totalTaxas3m, totalReceita3m)
  const top5           = [...vendasData].sort((a, b) => b.receita_bruta - a.receita_bruta).slice(0, 5)

  const isLoading = loadingBilling || loadingFin || loadingVendas

  return (
    <div>
      <Header title="Relatórios" subtitle="Análises e insights do seu negócio" />

      <div className="p-6 space-y-6">

        {/* ── Painel de Dados Reais ML ─────────────────────────────────────── */}
        <div className="bg-[#111318] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                Resumo Financeiro — Mercado Livre
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Dados reais dos últimos 90 dias</p>
            </div>
            <button
              onClick={loadAll}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-200 bg-white/[0.04] border border-white/[0.06] rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {mlConnected === false ? (
            <div className="flex items-center gap-3 px-5 py-8 text-sm text-slate-500">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-500/70" />
              Conta Mercado Livre não conectada. Acesse{' '}
              <a href="/dashboard/configuracoes" className="text-indigo-400 hover:underline">Configurações</a>
              {' '}para conectar.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.05]">
              {/* Receita bruta (90d) */}
              <div className="px-5 py-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Receita Bruta (90d)</p>
                <p className="text-xl font-bold text-white">
                  {loadingFin ? <Skeleton w="w-24" h="h-6" /> : fmt(finData?.receita_bruta ?? 0)}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  {loadingFin ? <Skeleton w="w-16" /> : `${finData?.pedidos ?? 0} pedidos`}
                </p>
              </div>

              {/* Ticket médio */}
              <div className="px-5 py-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Ticket Médio</p>
                <p className="text-xl font-bold text-white">
                  {loadingFin ? <Skeleton w="w-20" h="h-6" /> : fmt(finData?.ticket_medio ?? 0)}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">por pedido</p>
              </div>

              {/* Taxas ML (3 meses do billing) */}
              <div className="px-5 py-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Taxas ML (3m)</p>
                <p className="text-xl font-bold text-red-400">
                  {loadingBilling ? <Skeleton w="w-20" h="h-6" /> : fmt(totalTaxas3m)}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">comissões + tarifas</p>
              </div>

              {/* Comissão média */}
              <div className="px-5 py-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Comissão Média</p>
                <p className="text-xl font-bold text-amber-400">
                  {loadingBilling || loadingFin ? <Skeleton w="w-16" h="h-6" /> : comissaoMedia}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">taxas / receita bruta</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Linha 2: Gráfico histórico + Top 5 Produtos ─────────────────── */}
        {mlConnected !== false && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Gráfico histórico 3 meses */}
            <div className="bg-[#111318] border border-white/[0.06] rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-400 mb-4">Taxas vs Créditos — Últimos 3 Meses (Billing)</p>
              {loadingBilling ? (
                <div className="h-40 flex items-center justify-center">
                  <span className="text-xs text-slate-600 animate-pulse">Carregando...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-xs text-slate-600">
                  Sem dados de billing disponíveis
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} barSize={16} barCategoryGap="40%">
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, name: string) => [fmt(v), name === 'taxas' ? 'Taxas' : 'Créditos']}
                    />
                    <Bar dataKey="taxas"    fill="#f87171" radius={[4,4,0,0]} />
                    <Bar dataKey="creditos" fill="#34d399" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Taxas ML
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />Créditos
                </div>
              </div>
            </div>

            {/* Top 5 produtos por receita */}
            <div className="bg-[#111318] border border-white/[0.06] rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-400 mb-4">Top 5 Produtos por Receita (90d)</p>
              {loadingVendas ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-4 text-[10px] text-slate-700 font-bold">{i + 1}</span>
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-white/[0.04] rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : top5.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-xs text-slate-600">
                  Sem dados de vendas nos últimos 90 dias
                </div>
              ) : (
                <div className="space-y-3">
                  {top5.map((item, i) => {
                    const maxReceita = top5[0]?.receita_bruta ?? 1
                    const barWidth   = `${Math.round((item.receita_bruta / maxReceita) * 100)}%`
                    return (
                      <div key={item.item_id} className="flex items-center gap-3">
                        <span className="w-4 text-[10px] text-slate-600 font-bold shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-slate-300 truncate pr-2">{item.title}</p>
                            <p className="text-xs font-semibold text-white shrink-0">{fmt(item.receita_bruta)}</p>
                          </div>
                          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500/70 rounded-full"
                              style={{ width: barWidth }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-600 mt-0.5">{item.total_vendas} vendas</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Reports grid ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
              Relatórios Disponíveis
            </h3>
            <span className="text-xs text-slate-600">
              {reports.filter(r => r.available).length} disponíveis · {reports.filter(r => !r.available).length} em breve
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map(r => (
              <div
                key={r.title}
                className={`dash-card rounded-2xl p-5 transition-all ${r.available ? 'hover:border-purple-500/30' : 'opacity-60'} ${r.ai ? 'border border-purple-500/20 bg-purple-500/5' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.ai ? 'bg-purple-500/20' : 'bg-dark-700'}`}>
                    <r.icon className={`w-[18px] h-[18px] ${r.ai ? 'text-purple-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {r.ai && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30">
                        IA
                      </span>
                    )}
                    {!r.available && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
                        Em breve
                      </span>
                    )}
                  </div>
                </div>

                <p className="font-bold text-white text-sm mb-1.5">{r.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{r.desc}</p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {r.tags.map(t => (
                      <span key={t} className="text-[9px] font-medium text-slate-600 bg-dark-700 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>

                  {r.available ? (
                    <button className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors shrink-0">
                      <FileDown className="w-3.5 h-3.5" /> Gerar
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock className="w-3 h-3" /> Breve
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI teaser ────────────────────────────────────────────────────── */}
        <div className="dash-card rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-cyan-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                Foguetim IA — Em breve
              </p>
              <p className="text-xs text-slate-500">Análises preditivas para o seu e-commerce</p>
            </div>
            <span className="ml-auto text-[10px] bg-purple-900/50 text-purple-400 px-2 py-1 rounded-full font-bold">Q3 2026</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              'Previsão de demanda por SKU e sazonalidade',
              'Detecção automática de oportunidades de precificação',
              'Alertas de anomalias em vendas e estoque',
            ].map(f => (
              <div key={f} className="bg-dark-700 rounded-xl p-3">
                <p className="text-xs text-slate-400 leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
