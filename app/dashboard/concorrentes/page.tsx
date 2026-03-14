'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Header from '@/components/Header'
import {
  Search, X, ExternalLink, Truck, Clock, Target,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Users, Tag, BarChart2, Loader2, Link2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConcorrenteItem {
  item_id:             string
  title:               string
  price:               number
  sold_quantity:       number
  thumbnail:           string
  seller_id:           number
  seller_nickname:     string
  seller_level:        string
  seller_transactions: number
  seller_claims_rate:  number
  free_shipping:       boolean
  listing_type:        string
  condition:           string
  url:                 string
  is_own:              boolean
}

interface MeuAnuncio {
  item_id:      string
  title:        string
  price:        number
  sold_quantity:number
  listing_type: string
  free_shipping:boolean
}

// ─── Display maps ─────────────────────────────────────────────────────────────

const REP_LEVEL: Record<string, { label: string; cls: string }> = {
  green:       { label: 'Verde',    cls: 'bg-green-400/10  text-green-400  ring-1 ring-green-400/20'  },
  light_green: { label: 'Amarelo',  cls: 'bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-400/20' },
  yellow:      { label: 'Laranja',  cls: 'bg-orange-400/10 text-orange-400 ring-1 ring-orange-400/20' },
  orange:      { label: 'Vermelho', cls: 'bg-red-400/10    text-red-400    ring-1 ring-red-400/20'    },
  red:         { label: 'Crítico',  cls: 'bg-red-600/10    text-red-500    ring-1 ring-red-600/20'    },
  unknown:     { label: '—',        cls: 'bg-slate-700/30  text-slate-500'                            },
}

const LISTING_TYPE: Record<string, { label: string; cls: string }> = {
  gold_pro:     { label: 'Premium',   cls: 'bg-amber-400/10  text-amber-300  ring-1 ring-amber-400/20'  },
  gold_special: { label: 'Clássico+', cls: 'bg-yellow-400/10 text-yellow-300 ring-1 ring-yellow-400/20' },
  gold:         { label: 'Clássico',  cls: 'bg-slate-400/10  text-slate-400  ring-1 ring-slate-400/20'  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum = (v: number) => v.toLocaleString('pt-BR')

const isMLItemId = (s: string) => /^MLB\d+$/i.test(s.trim())

function getListing(type: string) {
  return LISTING_TYPE[type] ?? { label: type, cls: 'bg-slate-700/30 text-slate-400' }
}

function getLevel(level: string) {
  return REP_LEVEL[level] ?? REP_LEVEL['unknown']
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-4 h-28 bg-dark-800/40 col-span-1" />
        <div className="glass-card rounded-xl bg-dark-800/40 col-span-2 overflow-hidden">
          <div className="h-12 bg-dark-700/60 border-b border-white/[0.04]" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 border-b border-white/[0.03] flex items-center gap-3 px-4">
              <div className="w-10 h-10 rounded-lg bg-dark-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-dark-700 rounded w-3/5" />
                <div className="h-2 bg-dark-800 rounded w-2/5" />
              </div>
              <div className="h-3 bg-dark-700 rounded w-16" />
              <div className="h-3 bg-dark-700 rounded w-16" />
              <div className="h-3 bg-dark-700 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onExample }: { onExample: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
        <Target className="w-9 h-9 text-purple-500/60" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-2">Analise seus concorrentes</h3>
        <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
          Busque por nome do produto ou cole o ID de um anúncio do Mercado Livre
          para ver preços, vendas e reputação dos concorrentes.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {['Fone Bluetooth', 'Tênis Nike', 'Suporte Notebook'].map(ex => (
          <button
            key={ex}
            onClick={() => onExample(ex)}
            className="px-3 py-1.5 rounded-lg bg-dark-800 border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-purple-500/30 text-xs transition-all"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConcorrentesPage() {
  const [inputValue,   setInputValue]   = useState('')
  const [concorrentes, setConcorrentes] = useState<ConcorrenteItem[]>([])
  const [meuAnuncio,   setMeuAnuncio]   = useState<MeuAnuncio | null>(null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [notConnected,   setNotConnected]   = useState(false)
  const [hasSearched,    setHasSearched]    = useState(false)
  const [history,        setHistory]        = useState<string[]>([])

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('concorrentes_history')
      if (saved) setHistory(JSON.parse(saved) as string[])
    } catch { /* ignore */ }
  }, [])

  const saveHistory = useCallback((q: string) => {
    setHistory(prev => {
      const updated = [q, ...prev.filter(h => h !== q)].slice(0, 5)
      try { localStorage.setItem('concorrentes_history', JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [])

  const handleSearch = useCallback(async (q: string) => {
    const term = q.trim()
    if (!term) return

    setLoading(true)
    setError(null)
    setNotConnected(false)
    setHasSearched(true)
    setConcorrentes([])
    setMeuAnuncio(null)
    setInputValue(term)

    const params = new URLSearchParams({ q: term })
    if (isMLItemId(term)) params.set('item_id', term)

    try {
      const res  = await fetch(`/api/mercadolivre/concorrentes?${params.toString()}`)
      const data = await res.json() as {
        error?:        string
        code?:         string
        concorrentes?: ConcorrenteItem[]
        meu_anuncio?:  MeuAnuncio | null
      }

      if (data.code === 'NOT_CONNECTED') { setNotConnected(true); return }
      if (data.error) { setError(data.error); return }
      setConcorrentes(data.concorrentes ?? [])
      setMeuAnuncio(data.meu_anuncio ?? null)
      saveHistory(term)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [saveHistory])

  // ── Insights ────────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!concorrentes.length) return null

    const competitors = concorrentes.filter(c => !c.is_own)
    if (!competitors.length) return null

    const prices = competitors.map(c => c.price).sort((a, b) => a - b)
    const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0

    const freeShippingCount = competitors.filter(c => c.free_shipping).length
    const salesLeader       = competitors[0] ?? null
    const myPrice           = meuAnuncio?.price ?? null

    const priceDiff = (myPrice !== null && medianPrice > 0)
      ? ((myPrice - medianPrice) / medianPrice) * 100
      : null

    // Most common rep level
    const levelCounts = new Map<string, number>()
    competitors.forEach(c => levelCounts.set(c.seller_level, (levelCounts.get(c.seller_level) ?? 0) + 1))
    let dominantLevel = 'unknown'
    let maxCount = 0
    levelCounts.forEach((count, level) => { if (count > maxCount) { maxCount = count; dominantLevel = level } })

    return { medianPrice, freeShippingCount, totalCompetitors: competitors.length, salesLeader, myPrice, priceDiff, dominantLevel }
  }, [concorrentes, meuAnuncio])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title="Análise de Concorrentes"
        subtitle="Compare preços e reputação com outros vendedores"
      />

      <div className="p-6 space-y-6">

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="glass-card rounded-xl p-4">
          <form
            onSubmit={e => { e.preventDefault(); handleSearch(inputValue) }}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Buscar produto ou colar ID do anúncio ML (ex: MLB1234567)"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 focus:border-purple-600/40 transition-all"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          {/* History chips */}
          {history.length > 0 && !loading && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recentes
              </span>
              {history.map(h => (
                <button
                  key={h}
                  onClick={() => handleSearch(h)}
                  className="px-2.5 py-1 rounded-full bg-dark-700 border border-white/[0.06] text-xs text-slate-500 hover:text-slate-200 hover:border-purple-500/30 transition-all"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* ── Not connected ───────────────────────────────────────────────── */}
        {notConnected && (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
              <Link2 className="w-7 h-7 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 text-lg font-semibold mb-1">Mercado Livre não conectado</p>
              <p className="text-slate-500 text-sm max-w-sm">
                Conecte sua conta do Mercado Livre em Integrações para usar a Análise de Concorrentes.
              </p>
            </div>
            <a
              href="/dashboard/integracoes"
              className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
            >
              Ir para Integrações
            </a>
          </div>
        )}

        {/* ── Loading skeleton ────────────────────────────────────────────── */}
        {loading && <TableSkeleton />}

        {/* ── Empty initial state ─────────────────────────────────────────── */}
        {!loading && !hasSearched && !error && (
          <EmptyState onExample={q => { setInputValue(q); handleSearch(q) }} />
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {!loading && hasSearched && !error && (
          <>
            {concorrentes.length === 0 ? (
              <div className="glass-card p-16 rounded-xl flex flex-col items-center gap-3">
                <Target className="w-10 h-10 text-slate-600" />
                <p className="text-slate-400 font-semibold">Nenhum resultado encontrado</p>
                <p className="text-slate-600 text-sm">Tente um termo de busca diferente</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">

                {/* ── Coluna esquerda: Meu Anúncio ───────────────────────── */}
                <div className="col-span-1 space-y-4">
                  <div className={`rounded-xl p-4 border ${
                    meuAnuncio
                      ? 'bg-purple-900/20 border-purple-500/25'
                      : 'glass-card border-white/[0.06]'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-purple-600/30 flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Meu Anúncio</p>
                    </div>

                    {meuAnuncio ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-200 font-medium leading-snug line-clamp-3">
                          {meuAnuncio.title}
                        </p>
                        <p className="text-2xl font-bold text-purple-300 tabular-nums">
                          {fmtBRL(meuAnuncio.price)}
                        </p>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Vendas</span>
                            <span className="text-slate-300 font-semibold">{fmtNum(meuAnuncio.sold_quantity)}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Tipo</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${getListing(meuAnuncio.listing_type).cls}`}>
                              {getListing(meuAnuncio.listing_type).label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Frete</span>
                            {meuAnuncio.free_shipping
                              ? <span className="text-green-400 flex items-center gap-1"><Truck className="w-3 h-3" /> Grátis</span>
                              : <span className="text-slate-500">Pago</span>
                            }
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-600 font-mono">{meuAnuncio.item_id}</p>
                      </div>
                    ) : (
                      <div className="py-4 space-y-2">
                        <p className="text-sm text-slate-500">Seu anúncio não foi encontrado nessa busca.</p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Cole o ID do anúncio (ex: MLB1234567) na busca, ou conecte o Mercado Livre para identificação automática.
                        </p>
                        <a
                          href="/dashboard/integracoes"
                          className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1"
                        >
                          <Link2 className="w-3 h-3" /> Conectar ML
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Quick stats */}
                  {insights && (
                    <div className="glass-card rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Panorama</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Concorrentes</span>
                          <span className="text-slate-300 font-bold">{insights.totalCompetitors}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Preço mediano</span>
                          <span className="text-slate-300 font-bold tabular-nums">{fmtBRL(insights.medianPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Frete grátis</span>
                          <span className="text-green-400 font-bold">{insights.freeShippingCount}/{insights.totalCompetitors}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Reputação dom.</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${getLevel(insights.dominantLevel).cls}`}>
                            {getLevel(insights.dominantLevel).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Coluna direita: Tabela de concorrentes ──────────────── */}
                <div className="col-span-2 space-y-4">
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">Concorrentes</h3>
                        <p className="text-[10px] text-slate-600 mt-0.5">{concorrentes.length} resultados · ordenados por vendas</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4 text-slate-600" />
                        <span className="text-xs text-slate-600">MLB Search</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.04]">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">#</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Produto</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Vendedor</th>
                            <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Preço</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Frete</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Vendas</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {concorrentes.map((item, idx) => {
                            const myPriceRef  = meuAnuncio?.price ?? null
                            const isAbove     = myPriceRef !== null && item.price > myPriceRef
                            const isBelow     = myPriceRef !== null && item.price < myPriceRef
                            const listing     = getListing(item.listing_type)
                            const repLevel    = getLevel(item.seller_level)

                            return (
                              <tr
                                key={item.item_id}
                                className={`border-b border-white/[0.03] transition-colors ${
                                  item.is_own
                                    ? 'bg-purple-900/10 border-l-2 border-l-purple-500/50'
                                    : 'hover:bg-white/[0.015]'
                                }`}
                              >
                                {/* Rank */}
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-bold tabular-nums ${
                                    idx === 0 ? 'text-amber-400' :
                                    idx === 1 ? 'text-slate-400' :
                                    idx === 2 ? 'text-amber-700' :
                                    'text-slate-600'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                </td>

                                {/* Product */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5 max-w-[200px]">
                                    {item.thumbnail ? (
                                      <img
                                        src={item.thumbnail}
                                        alt=""
                                        className="w-9 h-9 rounded-lg object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                                        <Tag className="w-4 h-4 text-slate-600" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs text-slate-200 line-clamp-2 leading-tight" title={item.title}>
                                        {item.title}
                                      </p>
                                      {item.is_own && (
                                        <span className="text-[9px] text-purple-400 font-bold">● Seu anúncio</span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Seller */}
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <p className="text-xs text-slate-300 font-medium truncate max-w-[100px]">
                                      {item.seller_nickname}
                                    </p>
                                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${repLevel.cls}`}>
                                      {repLevel.label}
                                    </span>
                                  </div>
                                </td>

                                {/* Price */}
                                <td className="px-4 py-3 text-right">
                                  <div className="space-y-0.5">
                                    <p className={`text-sm font-bold tabular-nums ${
                                      isAbove ? 'text-red-400' :
                                      isBelow ? 'text-green-400' :
                                      'text-white'
                                    }`}>
                                      {fmtBRL(item.price)}
                                    </p>
                                    {myPriceRef !== null && !item.is_own && (
                                      <p className={`text-[10px] tabular-nums ${isAbove ? 'text-red-400/70' : 'text-green-400/70'}`}>
                                        {isAbove ? '+' : ''}{(((item.price - myPriceRef) / myPriceRef) * 100).toFixed(1)}%
                                      </p>
                                    )}
                                  </div>
                                </td>

                                {/* Shipping */}
                                <td className="px-4 py-3 text-center">
                                  {item.free_shipping
                                    ? <Truck className="w-4 h-4 text-green-400 mx-auto" />
                                    : <span className="text-slate-600 text-xs">—</span>
                                  }
                                </td>

                                {/* Listing type */}
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.cls}`}>
                                    {listing.label}
                                  </span>
                                </td>

                                {/* Sales */}
                                <td className="px-4 py-3 text-right">
                                  <span className="text-xs text-slate-300 font-semibold tabular-nums">
                                    {fmtNum(item.sold_quantity)}
                                  </span>
                                </td>

                                {/* Link */}
                                <td className="px-4 py-3 text-center">
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-dark-700 hover:bg-purple-600/20 text-slate-500 hover:text-purple-400 border border-white/[0.06] hover:border-purple-500/30 transition-all"
                                    title="Ver no ML"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Insights ──────────────────────────────────────────── */}
                  {insights && (
                    <div className="glass-card rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center">
                          <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Insights Automáticos</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Price vs median */}
                        {insights.priceDiff !== null ? (
                          <div className={`p-3 rounded-xl border ${
                            Math.abs(insights.priceDiff) < 5
                              ? 'bg-slate-800/40 border-white/[0.06]'
                              : insights.priceDiff > 0
                                ? 'bg-red-500/5 border-red-500/20'
                                : 'bg-green-500/5 border-green-500/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              {insights.priceDiff > 5
                                ? <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                                : insights.priceDiff < -5
                                  ? <TrendingDown className="w-3.5 h-3.5 text-green-400" />
                                  : <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                              }
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seu Preço</p>
                            </div>
                            <p className={`text-xs font-semibold leading-snug ${
                              insights.priceDiff > 5  ? 'text-red-400' :
                              insights.priceDiff < -5 ? 'text-green-400' :
                              'text-slate-300'
                            }`}>
                              {Math.abs(insights.priceDiff) < 1
                                ? 'Na mediana dos concorrentes'
                                : `${Math.abs(insights.priceDiff).toFixed(1)}% ${insights.priceDiff > 0 ? 'acima' : 'abaixo'} da mediana (${fmtBRL(insights.medianPrice)})`
                              }
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl border bg-slate-800/40 border-white/[0.06]">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Preço Mediano</p>
                            <p className="text-xs text-slate-300 font-semibold tabular-nums">{fmtBRL(insights.medianPrice)}</p>
                          </div>
                        )}

                        {/* Free shipping */}
                        <div className={`p-3 rounded-xl border ${
                          insights.freeShippingCount / insights.totalCompetitors > 0.5
                            ? 'bg-amber-500/5 border-amber-500/20'
                            : 'bg-slate-800/40 border-white/[0.06]'
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Frete Grátis</p>
                          </div>
                          <p className="text-xs text-slate-300 font-semibold leading-snug">
                            <span className="text-green-400">{insights.freeShippingCount}</span> de {insights.totalCompetitors} concorrentes oferecem frete grátis
                          </p>
                        </div>

                        {/* Sales leader */}
                        {insights.salesLeader && (
                          <div className="p-3 rounded-xl border bg-slate-800/40 border-white/[0.06]">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Líder de Vendas</p>
                            </div>
                            <p className="text-xs text-slate-300 font-semibold leading-snug">
                              {insights.salesLeader.seller_nickname} cobra{' '}
                              <span className="text-amber-300">{fmtBRL(insights.salesLeader.price)}</span>{' '}
                              com{' '}
                              <span className="text-blue-400">{fmtNum(insights.salesLeader.sold_quantity)} vendas</span>
                            </p>
                          </div>
                        )}

                        {/* Dominant reputation */}
                        <div className="p-3 rounded-xl border bg-slate-800/40 border-white/[0.06]">
                          <div className="flex items-center gap-2 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reputação Média</p>
                          </div>
                          <p className="text-xs text-slate-300 font-semibold">
                            Maioria dos concorrentes com reputação{' '}
                            <span className={`font-bold ${getLevel(insights.dominantLevel).cls.split(' ').find(c => c.startsWith('text-')) ?? 'text-slate-300'}`}>
                              {getLevel(insights.dominantLevel).label}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
