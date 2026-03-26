'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Trophy, TrendingUp, Eye, ShoppingCart,
  Loader2, RefreshCw, AlertTriangle, Lightbulb,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

/* ── Types ─────────────────────────────────────────────────────────────────── */
type RankType = 'revenue' | 'units' | 'visits' | 'conversion'
type Period   = 7 | 15 | 30 | 90

interface RankItem {
  itemId:      string
  title:       string
  thumbnail:   string | null
  revenue:     number
  units:       number
  orders:      number
  visits?:     number
  conversion?: number
}

interface RankData {
  rankings: RankItem[]
  period:   number
  type:     string
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const MEDAL: Record<number, string> = { 0: '\u{1F947}', 1: '\u{1F948}', 2: '\u{1F949}' }

const TABS: { key: RankType; label: string; icon: React.ElementType }[] = [
  { key: 'revenue',    label: 'Por faturamento', icon: TrendingUp },
  { key: 'units',      label: 'Por unidades',    icon: ShoppingCart },
  { key: 'visits',     label: 'Por visitas',     icon: Eye },
  { key: 'conversion', label: 'Por conversao',   icon: Trophy },
]

const PERIODS: { value: Period; label: string }[] = [
  { value: 7,  label: '7d' },
  { value: 15, label: '15d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

/* ── Insights generator ───────────────────────────────────────────────────── */
function generateInsights(items: RankItem[]): string[] {
  if (items.length === 0) return []
  const insights: string[] = []

  // Top revenue
  const top = items[0]
  if (top) {
    insights.push(
      `\u{1F3C6} ${top.title} e seu campeao de vendas com ${BRL(top.revenue)}`,
    )
  }

  // Low conversion warning
  const lowConv = items.find(
    (i) => i.visits && i.visits > 50 && i.conversion !== undefined && i.conversion < 2,
  )
  if (lowConv) {
    insights.push(
      `\u26A0\uFE0F ${lowConv.title} tem ${lowConv.visits} visitas mas so ${lowConv.units} vendas (${lowConv.conversion?.toFixed(1)}% conversao) - revise preco ou fotos`,
    )
  }

  // High conversion
  const highConv = items.reduce<RankItem | null>((best, cur) => {
    if (!cur.conversion || cur.units < 2) return best
    if (!best || cur.conversion > (best.conversion ?? 0)) return cur
    return best
  }, null)
  if (highConv && highConv.conversion) {
    insights.push(
      `\u{1F4C8} ${highConv.title} tem a maior conversao (${highConv.conversion.toFixed(1)}%) - considere investir em ads`,
    )
  }

  return insights.slice(0, 3)
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function RankingPage() {
  const [type, setType]       = useState<RankType>('revenue')
  const [period, setPeriod]   = useState<Period>(30)
  const [data, setData]       = useState<RankData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard/rankings?type=${type}&period=${period}`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.notConnected) {
          setNotConnected(true)
          setData(null)
          return
        }
        throw new Error(body.error ?? `Erro ${res.status}`)
      }
      setNotConnected(false)
      const json: RankData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ranking')
    } finally {
      setLoading(false)
    }
  }, [type, period])

  useEffect(() => { fetchData() }, [fetchData])

  /* ── Render ─────────────────────────────────────────────────────────────── */

  // Not connected
  if (notConnected && !loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Ranking de Anuncios"
          description="Veja quais produtos vendem mais"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Ranking' },
          ]}
        />
        <EmptyState
          image="connect"
          title="Nenhum canal conectado"
          description="Conecte sua conta do Mercado Livre para ver o ranking dos seus anuncios."
          action={{ label: 'Conectar canal', href: '/dashboard/integracoes' }}
        />
      </div>
    )
  }

  const insights = data ? generateInsights(data.rankings) : []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Ranking de Anuncios"
        description="Descubra seus produtos campeoes de venda"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ranking' },
        ]}
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-800 border border-white/[0.06] text-sm text-gray-300 hover:text-white hover:bg-space-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      {/* ── Tabs + Period ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-space-900/60 rounded-lg p-1 border border-white/[0.04]">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = type === t.key
            return (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-space-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Period */}
        <div className="flex gap-1 bg-space-900/60 rounded-lg p-1 border border-white/[0.04]">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === p.value
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-space-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="glass-card p-4 border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── Empty ──────────────────────────────────────────────────────────── */}
      {!loading && !error && data && data.rankings.length === 0 && (
        <EmptyState
          image="search"
          title="Nenhum dado encontrado"
          description={`Nenhum dado de vendas encontrado nos ultimos ${period} dias`}
        />
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {!loading && !error && data && data.rankings.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-cyber w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-gray-400 font-medium w-10">#</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium">Produto</th>
                  <th className="px-4 py-3 text-left text-gray-400 font-medium w-20">Canal</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Faturamento</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Unidades</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Visitas</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">Conversao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.rankings.map((item, idx) => (
                  <tr
                    key={item.itemId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Position */}
                    <td className="px-4 py-3 text-center">
                      {idx < 3 ? (
                        <span className="text-lg">{MEDAL[idx]}</span>
                      ) : (
                        <span className="text-gray-500 font-mono">{idx + 1}</span>
                      )}
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            width={32}
                            height={32}
                            className="rounded object-cover bg-space-800"
                            unoptimized
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-space-800 flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 truncate max-w-[280px]">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {item.itemId}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                        ML
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${type === 'revenue' ? 'text-green-400' : 'text-gray-300'}`}>
                        {BRL(item.revenue)}
                      </span>
                    </td>

                    {/* Units */}
                    <td className="px-4 py-3 text-right">
                      <span className={`${type === 'units' ? 'text-primary-400 font-semibold' : 'text-gray-300'}`}>
                        {item.units}
                      </span>
                    </td>

                    {/* Visits */}
                    <td className="px-4 py-3 text-right">
                      <span className={`${type === 'visits' ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>
                        {item.visits != null ? item.visits.toLocaleString('pt-BR') : '\u2014'}
                      </span>
                    </td>

                    {/* Conversion */}
                    <td className="px-4 py-3 text-right">
                      <span className={`${type === 'conversion' ? 'text-purple-400 font-semibold' : 'text-gray-400'}`}>
                        {item.conversion != null ? `${item.conversion.toFixed(1)}%` : '\u2014'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Insights ───────────────────────────────────────────────────────── */}
      {!loading && insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Insights
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((text, i) => (
              <div
                key={i}
                className="glass-card p-4 text-sm text-gray-300 leading-relaxed"
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
