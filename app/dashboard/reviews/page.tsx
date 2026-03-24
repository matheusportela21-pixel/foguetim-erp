'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Star, StarOff, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle2,
  Loader2, Link2, ShieldCheck, MessageSquare, BarChart2, TrendingDown,
  RefreshCw,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RatingLevels {
  one_star:   number
  two_stars:  number
  three_stars:number
  four_stars: number
  five_stars: number
}

interface ReviewSummaryItem {
  item_id:          string
  title:            string
  thumbnail:        string
  rating_average:   number
  total_reviews:    number
  rating_levels:    RatingLevels
  last_review_date: string
  has_negative:     boolean
}

interface SummaryTotals {
  total_items_with_reviews: number
  total_reviews:            number
  overall_average:          number
  items_with_negative:      number
}

interface ReviewItem {
  id:            string
  date_created:  string
  rating:        number
  title:         string
  content:       string
  likes:         number
  dislikes:      number
  reviewer_name: string
  fulfilled:     boolean
}

interface ItemReviews {
  item_id:       string
  title:         string
  thumbnail:     string
  rating_average:number
  total:         number
  rating_levels: RatingLevels
  reviews:       ReviewItem[]
}

type FilterTab = 'all' | 'positive' | 'neutral' | 'negative'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return iso }
}

function ratingColor(r: number): string {
  if (r >= 4.5) return 'text-green-400'
  if (r >= 4)   return 'text-green-300'
  if (r >= 3)   return 'text-yellow-400'
  if (r >= 2)   return 'text-orange-400'
  return 'text-red-400'
}

function ratingBg(r: number): string {
  if (r >= 4) return 'bg-green-500/5 border-green-500/15'
  if (r >= 3) return 'bg-slate-800/40 border-white/[0.04]'
  return 'bg-red-500/5 border-red-500/15'
}

// Stars component
function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  const color = ratingColor(rating)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${cls} ${n <= Math.round(rating) ? color : 'text-slate-700'}`}
          fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  )
}

// Rating bar
function RatingBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 w-5 text-right shrink-0">{count}</span>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-4 h-24 bg-dark-800/40" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl bg-dark-800/40 col-span-1 h-96" />
        <div className="glass-card rounded-xl bg-dark-800/40 col-span-2 h-96" />
      </div>
    </div>
  )
}

function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
        <Link2 className="w-7 h-7 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 text-lg font-semibold mb-1">Mercado Livre não conectado</p>
        <p className="text-slate-500 text-sm max-w-sm">
          Conecte sua conta do Mercado Livre em Integrações para visualizar as avaliações dos seus produtos.
        </p>
      </div>
      <a
        href="/dashboard/integracoes"
        className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
      >
        Ir para Integrações
      </a>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 col-span-3">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
        <StarOff className="w-7 h-7 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold text-base mb-1.5">Nenhuma avaliação encontrada</p>
        <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
          Conforme suas vendas crescem, as opiniões dos compradores aparecerão aqui.
        </p>
      </div>
    </div>
  )
}

// ─── Detail panel (right side) ─────────────────────────────────────────────────

function DetailPanel({
  itemId,
  summary,
}: {
  itemId: string
  summary: ReviewSummaryItem
}) {
  const [data,        setData]        = useState<ItemReviews | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [filterTab,   setFilterTab]   = useState<FilterTab>('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setData(null)
      setFilterTab('all')
      try {
        const res  = await fetch(`/api/mercadolivre/reviews?item_id=${itemId}`)
        const json = await res.json() as ItemReviews & { error?: string }
        if (cancelled) return
        if (json.error) { setError(json.error); return }
        setData(json)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [itemId])

  const filtered = useMemo(() => {
    if (!data) return []
    switch (filterTab) {
      case 'positive': return data.reviews.filter(r => r.rating >= 4)
      case 'neutral':  return data.reviews.filter(r => r.rating === 3)
      case 'negative': return data.reviews.filter(r => r.rating <= 2)
      default:         return data.reviews
    }
  }, [data, filterTab])

  const total = data?.total ?? 0
  const rl    = data?.rating_levels ?? summary.rating_levels

  const posCount = (rl.four_stars + rl.five_stars)
  const neuCount = rl.three_stars
  const negCount = (rl.one_star + rl.two_stars)

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all',      label: 'Todos',        count: total   },
    { id: 'positive', label: 'Positivos 4-5★', count: posCount },
    { id: 'neutral',  label: 'Neutros 3★',   count: neuCount },
    { id: 'negative', label: 'Negativos 1-2★',count: negCount },
  ]

  return (
    <div className="col-span-2 space-y-4">
      {/* Product header */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          {summary.thumbnail ? (
            <img
              src={summary.thumbnail}
              alt=""
              className="w-14 h-14 rounded-xl object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
              onError={e => { (e.currentTarget as HTMLImageElement).src = '' }}
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-dark-700 flex items-center justify-center shrink-0 border border-white/[0.06]">
              <Star className="w-6 h-6 text-slate-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-snug mb-1 line-clamp-2">
              {summary.title}
            </p>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-black tabular-nums ${ratingColor(summary.rating_average)}`}>
                {summary.rating_average.toFixed(1)}
              </span>
              <div className="space-y-0.5">
                <Stars rating={summary.rating_average} size="lg" />
                <p className="text-[10px] text-slate-500">{total} avaliações</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating distribution bars */}
        <div className="space-y-1.5">
          <RatingBar label="5 estrelas" count={rl.five_stars}  total={total} color="bg-green-400" />
          <RatingBar label="4 estrelas" count={rl.four_stars}  total={total} color="bg-green-300" />
          <RatingBar label="3 estrelas" count={rl.three_stars} total={total} color="bg-yellow-400" />
          <RatingBar label="2 estrelas" count={rl.two_stars}   total={total} color="bg-orange-400" />
          <RatingBar label="1 estrela"  count={rl.one_star}    total={total} color="bg-red-400" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-dark-800/60 rounded-xl border border-white/[0.04] w-fit">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1 py-0.5 rounded text-[9px] font-bold ${
                filterTab === tab.id ? 'bg-white/20' : 'bg-dark-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Reviews list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(review => (
            <div
              key={review.id}
              className={`glass-card rounded-xl p-4 border ${ratingBg(review.rating)}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <Stars rating={review.rating} />
                  {review.title && (
                    <p className="text-sm font-bold text-white mt-1">{review.title}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-slate-500">{fmtDate(review.date_created)}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{review.reviewer_name}</p>
                </div>
              </div>

              {review.content && (
                <p className="text-sm text-slate-300 leading-relaxed mb-3">{review.content}</p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {review.fulfilled && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full ring-1 ring-green-400/20">
                    <ShieldCheck className="w-3 h-3" />
                    Compra verificada
                  </span>
                )}
                {review.likes > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <ThumbsUp className="w-3 h-3" /> {review.likes}
                  </span>
                )}
                {review.dislikes > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <ThumbsDown className="w-3 h-3" /> {review.dislikes}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty filtered state */}
      {!loading && !error && data && filtered.length === 0 && (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center gap-3">
          <MessageSquare className="w-8 h-8 text-slate-600" />
          <p className="text-slate-500 text-sm">Nenhuma avaliação nesta categoria</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [summaryItems,  setSummaryItems]  = useState<ReviewSummaryItem[]>([])
  const [totals,        setTotals]        = useState<SummaryTotals | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [notConnected,  setNotConnected]  = useState(false)
  const [selectedId,    setSelectedId]    = useState<string | null>(null)

  const selectedItem = useMemo(
    () => summaryItems.find(x => x.item_id === selectedId) ?? null,
    [summaryItems, selectedId]
  )

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotConnected(false)
    setSummaryItems([])
    setTotals(null)
    setSelectedId(null)
    try {
      const res  = await fetch('/api/mercadolivre/reviews?summary=true')
      const data = await res.json() as {
        error?: string; code?: string
        items?: ReviewSummaryItem[]; totals?: SummaryTotals
      }
      if (data.code === 'NOT_CONNECTED') { setNotConnected(true); return }
      if (data.error) { setError(data.error); return }
      const items = data.items ?? []
      setSummaryItems(items)
      setTotals(data.totals ?? null)
      if (items.length > 0) setSelectedId(items[0].item_id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Reviews e Opiniões"
        description="Acompanhe o que os compradores estão falando dos seus produtos"
      />

      <div className="p-6 space-y-5">

        {notConnected && <NotConnected />}
        {loading && <SummarySkeleton />}

        {!loading && !notConnected && (
          <>
            {/* ── Error ──────────────────────────────────────────────────── */}
            {error && (
              <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {!error && totals && (
              <>
                {/* ── Summary cards ─────────────────────────────────────── */}
                <div className="grid grid-cols-4 gap-4">
                  {/* Produtos avaliados */}
                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produtos Avaliados</p>
                      <div className="w-8 h-8 rounded-lg bg-purple-600/15 flex items-center justify-center">
                        <BarChart2 className="w-4 h-4 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-white">{totals.total_items_with_reviews}</p>
                  </div>

                  {/* Total reviews */}
                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total de Reviews</p>
                      <div className="w-8 h-8 rounded-lg bg-blue-600/15 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-white">{totals.total_reviews.toLocaleString('pt-BR')}</p>
                  </div>

                  {/* Média geral */}
                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Média Geral</p>
                      <div className="w-8 h-8 rounded-lg bg-amber-600/15 flex items-center justify-center">
                        <Star className="w-4 h-4 text-amber-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-2xl font-black tabular-nums ${ratingColor(totals.overall_average)}`}>
                        {totals.overall_average.toFixed(1)}
                      </p>
                      <Stars rating={totals.overall_average} />
                    </div>
                  </div>

                  {/* Avaliações negativas */}
                  <div className={`glass-card rounded-xl p-4 ${totals.items_with_negative > 0 ? 'border border-red-500/20 bg-red-500/5' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Com Negativas</p>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${totals.items_with_negative > 0 ? 'bg-red-600/15' : totals.total_reviews === 0 ? 'bg-slate-700/40' : 'bg-slate-700/40'}`}>
                        {totals.items_with_negative > 0
                          ? <TrendingDown className="w-4 h-4 text-red-400" />
                          : <CheckCircle2 className={`w-4 h-4 ${totals.total_reviews === 0 ? 'text-slate-500' : 'text-green-400'}`} />
                        }
                      </div>
                    </div>
                    <p className={`text-2xl font-black ${totals.items_with_negative > 0 ? 'text-red-400' : totals.total_reviews === 0 ? 'text-slate-500' : 'text-green-400'}`}>
                      {totals.items_with_negative}
                    </p>
                    {totals.total_reviews === 0 ? (
                      <p className="text-[10px] text-slate-500 mt-0.5">Sem avaliações</p>
                    ) : totals.items_with_negative === 0 && (
                      <p className="text-[10px] text-green-400/60 mt-0.5">Excelente!</p>
                    )}
                  </div>
                </div>

                {/* ── Two-panel layout ──────────────────────────────────── */}
                {summaryItems.length === 0 ? (
                  <div className="grid grid-cols-3">
                    <EmptyState />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 items-start">

                    {/* Left panel: product list */}
                    <div className="col-span-1">
                      <div className="glass-card rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white">Produtos</h3>
                          <button
                            onClick={loadSummary}
                            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Atualizar
                          </button>
                        </div>

                        <div className="divide-y divide-white/[0.03]">
                          {summaryItems.map(item => (
                            <button
                              key={item.item_id}
                              onClick={() => setSelectedId(item.item_id)}
                              className={`w-full flex items-center gap-2.5 px-3 py-3 text-left transition-colors ${
                                selectedId === item.item_id
                                  ? 'bg-purple-600/15 border-l-2 border-l-purple-500'
                                  : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                              }`}
                            >
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
                                  onError={e => { (e.currentTarget as HTMLImageElement).src = '' }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                                  <Star className="w-4 h-4 text-slate-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-200 line-clamp-2 leading-snug mb-1" title={item.title}>
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Stars rating={item.rating_average} />
                                  <span className={`text-[10px] font-bold tabular-nums ${ratingColor(item.rating_average)}`}>
                                    {item.rating_average.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-slate-600">
                                    ({item.total_reviews})
                                  </span>
                                  {item.has_negative && (
                                    <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-1 py-0.5 rounded-full">
                                      neg
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right panel: detail */}
                    {selectedItem ? (
                      <DetailPanel
                        key={selectedItem.item_id}
                        itemId={selectedItem.item_id}
                        summary={selectedItem}
                      />
                    ) : (
                      <div className="col-span-2 glass-card rounded-xl p-16 flex flex-col items-center gap-3">
                        <Star className="w-8 h-8 text-slate-600" />
                        <p className="text-slate-500 text-sm">Selecione um produto para ver os reviews</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
