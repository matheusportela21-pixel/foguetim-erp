'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Header from '@/components/Header'
import {
  AlertTriangle, Package, ShieldCheck, ExternalLink,
  AlertCircle, Loader2, Link2, RefreshCw, Clock,
  ToggleLeft, ToggleRight, ShieldOff,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClaimOrder {
  product_title:     string
  product_thumbnail: string
  buyer_nickname:    string
  total_amount:      number
  order_date:        string
}

interface ClaimItem {
  claim_id:     string
  order_id:     string
  status:       string
  stage:        string
  stage_label:  string
  reason_id:    string
  reason_label: string
  date_created: string
  last_updated: string
  days_open:    number
  urgency:      'urgent' | 'warning' | 'normal'
  order:        ClaimOrder
  resolution:   string
}

interface ClaimsSummary {
  total_opened:  number
  total_returns: number
  total_claims:  number
  urgent:        number
  warning:       number
}

type FilterTab   = 'all' | 'returns' | 'claims' | 'urgent'
type StatusToggle = 'opened' | 'closed'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return iso }
}

function urgencyStyles(urgency: 'urgent' | 'warning' | 'normal') {
  switch (urgency) {
    case 'urgent':  return {
      border: 'border-l-4 border-l-red-500/70',
      bg:     'bg-red-900/10',
      badge:  'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
      bar:    'bg-red-500',
    }
    case 'warning': return {
      border: 'border-l-4 border-l-yellow-500/70',
      bg:     'bg-yellow-900/10',
      badge:  'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30',
      bar:    'bg-yellow-500',
    }
    default: return {
      border: 'border-l-4 border-l-slate-700/60',
      bg:     'bg-dark-800/40',
      badge:  'bg-slate-700/40 text-slate-400',
      bar:    'bg-slate-600',
    }
  }
}

// Cache key for sidebar count
const CACHE_KEY     = 'claims_count_cache'
const CACHE_TTL_MS  = 5 * 60 * 1000

function saveCacheCount(count: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() }))
  } catch { /* ignore */ }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-4 h-24 bg-dark-800/40 border-l-4 border-l-slate-700/30" />
      ))}
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
          Conecte sua conta do Mercado Livre em Integrações para visualizar as reclamações.
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

function EmptyClean() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-green-400" />
      </div>
      <div className="text-center">
        <p className="text-green-400 font-bold text-lg mb-1">Nenhuma reclamação em aberto!</p>
        <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
          Continue assim — responda sempre rápido para manter sua reputação.
        </p>
      </div>
    </div>
  )
}

// ─── Claim card ────────────────────────────────────────────────────────────────

function ClaimCard({ claim }: { claim: ClaimItem }) {
  const s = urgencyStyles(claim.urgency)

  return (
    <div className={`glass-card rounded-xl overflow-hidden ${s.border} ${s.bg} transition-all hover:brightness-110`}>
      <div className="p-4 flex items-start gap-3">

        {/* Thumbnail */}
        {claim.order.product_thumbnail ? (
          <img
            src={claim.order.product_thumbnail}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-dark-700 flex items-center justify-center shrink-0 border border-white/[0.06]">
            <Package className="w-5 h-5 text-slate-600" />
          </div>
        )}

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-white line-clamp-2 leading-snug flex-1">
              {claim.order.product_title}
            </p>

            {/* Urgency badge */}
            {claim.urgency !== 'normal' && (
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${s.badge} ${claim.urgency === 'urgent' ? 'animate-pulse' : ''}`}>
                {claim.urgency === 'urgent'
                  ? <><ShieldOff className="w-3 h-3" /> URGENTE — {claim.days_open} dias</>
                  : <><Clock className="w-3 h-3" /> {claim.days_open} dias</>
                }
              </span>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {claim.reason_label}
            </span>
            <span>·</span>
            <span>{claim.stage_label}</span>
            <span>·</span>
            <span>Comprador: <span className="text-slate-400 font-medium">{claim.order.buyer_nickname}</span></span>
            {claim.order.total_amount > 0 && (
              <>
                <span>·</span>
                <span className="text-slate-300 font-semibold tabular-nums">
                  {fmtBRL(claim.order.total_amount)}
                </span>
              </>
            )}
          </div>

          {/* Dates + link */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[10px] text-slate-600">
              <span>Aberta em {fmtDate(claim.date_created)}</span>
              {claim.last_updated !== claim.date_created && (
                <span>· Atualizado {fmtDate(claim.last_updated)}</span>
              )}
            </div>
            <a
              href={`https://www.mercadolivre.com.br/disputas/${claim.claim_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-dark-700 hover:bg-purple-600/20 text-slate-500 hover:text-purple-400 border border-white/[0.06] hover:border-purple-500/30 transition-all text-[10px] font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              Ver no ML
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReclamacoesPage() {
  const [items,        setItems]        = useState<ClaimItem[]>([])
  const [summary,      setSummary]      = useState<ClaimsSummary | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [filterTab,    setFilterTab]    = useState<FilterTab>('all')
  const [statusToggle, setStatusToggle] = useState<StatusToggle>('opened')

  const loadData = useCallback(async (status: StatusToggle, type: FilterTab) => {
    setLoading(true)
    setError(null)
    setNotConnected(false)
    setItems([])
    setSummary(null)

    const apiType = type === 'urgent' ? 'all' : type  // urgent filter done client-side

    try {
      const res  = await fetch(
        `/api/mercadolivre/reclamacoes?status=${status}&type=${apiType}`
      )
      const data = await res.json() as {
        error?:   string
        code?:    string
        summary?: ClaimsSummary
        items?:   ClaimItem[]
      }

      if (data.code === 'NOT_CONNECTED') { setNotConnected(true); return }
      if (data.error) { setError(data.error); return }

      const fetchedItems = data.items ?? []
      setItems(fetchedItems)
      setSummary(data.summary ?? null)

      // Cache count for sidebar
      const openCount = data.summary?.total_opened ?? 0
      if (status === 'opened') saveCacheCount(openCount)

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadData(statusToggle, filterTab)
  }, [loadData, statusToggle, filterTab])

  // Filtered list
  const filtered = useMemo(() => {
    if (filterTab === 'urgent') return items.filter(c => c.urgency === 'urgent')
    return items
  }, [items, filterTab])

  const urgentCount = summary?.urgent ?? 0

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all',     label: 'Todos',        count: summary?.total_opened  },
    { id: 'returns', label: 'Devoluções',   count: summary?.total_returns },
    { id: 'claims',  label: 'Reclamações',  count: summary?.total_claims  },
    { id: 'urgent',  label: 'Urgentes',     count: urgentCount            },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <Header
        title={
          <span className="flex items-center gap-2.5">
            Devoluções e Reclamações
            {urgentCount > 0 && (
              <span className="animate-pulse flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-bold ring-1 ring-red-500/30">
                <AlertCircle className="w-3 h-3" />
                {urgentCount} urgente{urgentCount !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        }
        subtitle="Gerencie disputas abertas e evite impacto na sua reputação"
      />

      <div className="p-6 space-y-5">

        {notConnected && <NotConnected />}

        {!notConnected && (
          <>
            {/* ── Summary cards ───────────────────────────────────────────── */}
            {summary && !loading && (
              <div className="grid grid-cols-4 gap-4">

                {/* Total em aberto */}
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total em Aberto</p>
                    <div className="w-8 h-8 rounded-lg bg-purple-600/15 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">{summary.total_opened}</p>
                </div>

                {/* Devoluções */}
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Devoluções</p>
                    <div className="w-8 h-8 rounded-lg bg-blue-600/15 flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">{summary.total_returns}</p>
                </div>

                {/* Reclamações */}
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reclamações</p>
                    <div className="w-8 h-8 rounded-lg bg-orange-600/15 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-orange-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">{summary.total_claims}</p>
                </div>

                {/* Urgentes */}
                <div className={`glass-card rounded-xl p-4 ${urgentCount > 0 ? 'border border-red-500/20 bg-red-500/5' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Urgentes +5 dias</p>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${urgentCount > 0 ? 'bg-red-600/15' : 'bg-slate-700/40'}`}>
                      {urgentCount > 0
                        ? <ShieldOff className="w-4 h-4 text-red-400" />
                        : <ShieldCheck className="w-4 h-4 text-green-400" />
                      }
                    </div>
                  </div>
                  <p className={`text-2xl font-black ${urgentCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {urgentCount}
                  </p>
                  {urgentCount === 0 && (
                    <p className="text-[10px] text-green-400/60 mt-0.5">Tudo em dia!</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Urgent banner ───────────────────────────────────────────── */}
            {!loading && urgentCount > 0 && statusToggle === 'opened' && (
              <div className="rounded-xl p-4 border border-red-500/25 bg-red-500/8 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <p className="text-sm text-red-300">
                  <span className="font-bold">Atenção!</span>{' '}
                  Você tem{' '}
                  <span className="font-black">{urgentCount} reclamação{urgentCount !== 1 ? 'ões' : ''}</span>{' '}
                  com mais de 5 dias sem resposta.{' '}
                  <span className="text-red-400">Responda agora para evitar penalização na reputação.</span>
                </p>
              </div>
            )}

            {/* ── Filters ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
              {/* Tab filters */}
              <div className="flex items-center gap-1 p-1 bg-dark-800/60 rounded-xl border border-white/[0.04]">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      filterTab === tab.id
                        ? tab.id === 'urgent'
                          ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                          : 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        filterTab === tab.id ? 'bg-white/20' : 'bg-dark-700'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Status toggle + refresh */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next: StatusToggle = statusToggle === 'opened' ? 'closed' : 'opened'
                    setStatusToggle(next)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-white/[0.04] text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all"
                >
                  {statusToggle === 'opened'
                    ? <><ToggleRight className="w-4 h-4 text-green-400" /> Em aberto</>
                    : <><ToggleLeft className="w-4 h-4 text-slate-500" /> Encerrados</>
                  }
                </button>
                <button
                  onClick={() => loadData(statusToggle, filterTab)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-white/[0.04] text-xs text-slate-400 hover:text-slate-200 transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
            </div>

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
              <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* ── Loading ─────────────────────────────────────────────────── */}
            {loading && <ListSkeleton />}

            {/* ── Empty (nenhuma reclamação) ───────────────────────────────── */}
            {!loading && !error && filtered.length === 0 && statusToggle === 'opened' && (
              <EmptyClean />
            )}

            {/* ── Empty (encerradas / filtro vazio) ───────────────────────── */}
            {!loading && !error && filtered.length === 0 && statusToggle === 'closed' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertTriangle className="w-8 h-8 text-slate-600" />
                <p className="text-slate-500 text-sm">Nenhuma reclamação encerrada encontrada</p>
              </div>
            )}

            {/* ── Claim list ──────────────────────────────────────────────── */}
            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map(claim => (
                  <ClaimCard key={claim.claim_id} claim={claim} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
