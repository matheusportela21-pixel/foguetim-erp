'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw, AlertTriangle, CheckCircle2, Link2, ExternalLink,
  Layers, Search, Info, ToggleLeft,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Comparison {
  mappingId:        number
  productId:        number
  productName:      string
  sku:              string
  channel:          string
  marketplaceItemId: string
  autoSyncStock:    boolean
  warehouseStock:   number
  mlStock:          number | null
  magaluStock:      number | null
  hasDivergence:    boolean
  divergences:      string[]
}

interface Summary {
  total:     number
  synced:    number
  divergent: number
  coverage:  number
}

type FilterTab = 'all' | 'divergent' | 'synced' | 'unmapped'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function channelLabel(ch: string) {
  const map: Record<string, { label: string; color: string; dot: string }> = {
    mercado_livre: { label: 'ML',     color: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-400' },
    shopee:        { label: 'Shopee', color: 'bg-orange-900/40 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
    magalu:        { label: 'Magalu', color: 'bg-blue-900/40 text-blue-400 border-blue-500/20',       dot: 'bg-blue-400' },
  }
  const info = map[ch] ?? { label: ch, color: 'bg-slate-900/40 text-slate-400 border-slate-700', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  )
}

function mlItemUrl(itemId: string) {
  return `https://www.mercadolivre.com.br/p/${itemId}`
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function SincronizacaoPage() {
  useEffect(() => { document.title = 'Sincronizacao de Estoque — Foguetim ERP' }, [])

  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [summary, setSummary]         = useState<Summary>({ total: 0, synced: 0, divergent: 0, coverage: 0 })
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [isEmpty, setIsEmpty]         = useState(false)
  const [filter, setFilter]           = useState<FilterTab>('all')
  const [search, setSearch]           = useState('')
  const [lastSync, setLastSync]       = useState<string | null>(null)

  const fetchSync = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/armazem/stock-sync')
      if (!res.ok) throw new Error('Erro ao buscar dados de sincronizacao')
      const data = await res.json()

      if (data.comparisons && data.comparisons.length > 0) {
        setComparisons(data.comparisons)
        setSummary(data.summary)
        setIsEmpty(false)
      } else {
        setComparisons([])
        setSummary({ total: 0, synced: 0, divergent: 0, coverage: 0 })
        setIsEmpty(true)
      }
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } catch (e: unknown) {
      setComparisons([])
      setSummary({ total: 0, synced: 0, divergent: 0, coverage: 0 })
      setIsEmpty(true)
      console.error('[sincronizacao]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSync() }, [fetchSync])

  /* ── Filtered list ── */
  const filtered = comparisons.filter(item => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.marketplaceItemId.toLowerCase().includes(q)

    if (!matchSearch) return false

    switch (filter) {
      case 'divergent': return item.hasDivergence
      case 'synced':    return !item.hasDivergence && (item.mlStock !== null || item.magaluStock !== null)
      case 'unmapped':  return item.mlStock === null && item.magaluStock === null
      default:          return true
    }
  })

  const tabCounts = {
    all:       comparisons.length,
    divergent: comparisons.filter(c => c.hasDivergence).length,
    synced:    comparisons.filter(c => !c.hasDivergence && (c.mlStock !== null || c.magaluStock !== null)).length,
    unmapped:  comparisons.filter(c => c.mlStock === null && c.magaluStock === null).length,
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'Todos' },
    { key: 'divergent', label: 'Com divergencia' },
    { key: 'synced',    label: 'Sincronizados' },
    { key: 'unmapped',  label: 'Sem dados' },
  ]

  return (
    <div>
      <PageHeader
        title="Sincronizacao de Estoque"
        description="Compare estoque do armazem com os marketplaces"
        actions={
          <button
            onClick={fetchSync}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/[0.08] text-slate-300 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {/* Empty state — no mappings */}
        {isEmpty && !loading && (
          <EmptyState
            image="connect"
            title="Mapeie seus produtos primeiro"
            description="Para comparar o estoque do armazém com os marketplaces, você precisa mapear seus produtos."
            action={{ label: 'Ir para Mapeamentos', href: '/dashboard/armazem/mapeamentos' }}
          />
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Link2 className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <p className="text-xs text-slate-500">Produtos Mapeados</p>
            </div>
            <p className="text-2xl font-bold text-slate-200">{loading ? '---' : summary.total}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-500">Sincronizados</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{loading ? '---' : summary.synced}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xs text-slate-500">Com Divergencia</p>
            </div>
            <p className="text-2xl font-bold text-amber-400">{loading ? '---' : summary.divergent}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-xs text-slate-500">Cobertura</p>
            </div>
            <p className="text-2xl font-bold text-blue-400">{loading ? '---' : `${summary.coverage}%`}</p>
          </div>
        </div>

        {/* Search + last sync */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar produto, SKU, item ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
            />
          </div>
          {lastSync && (
            <span className="text-[11px] text-slate-600 ml-auto">
              Atualizado as {lastSync}
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 border-b border-white/[0.06]">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 text-xs font-medium transition-all relative pb-2.5 ${
                filter === tab.key
                  ? 'text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  filter === tab.key
                    ? 'bg-violet-900/40 text-violet-400'
                    : 'bg-white/[0.04] text-slate-500'
                }`}>
                  {tabCounts[tab.key]}
                </span>
              )}
              {filter === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="glass-card p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg shimmer-load" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Layers className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-2">Nenhum produto encontrado</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {search || filter !== 'all'
                ? 'Nenhum item corresponde aos filtros aplicados.'
                : 'Mapeie seus produtos do armazem aos marketplaces para ver a comparacao de estoque.'}
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Armazem</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ML</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Magalu</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(item => {
                    const statusBadge = item.hasDivergence
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-500/20">Divergente</span>
                      : (item.mlStock !== null || item.magaluStock !== null)
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-500/20">Sincronizado</span>
                        : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-400/10 text-slate-500 border border-slate-500/20">Sem dados</span>

                    return (
                      <tr key={item.mappingId} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-200 text-sm leading-tight line-clamp-1">{item.productName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {channelLabel(item.channel)}
                              <span className="text-[10px] text-slate-600 font-mono">{item.marketplaceItemId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="font-mono text-xs text-slate-400">{item.sku}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-200 font-medium">
                          {item.warehouseStock}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${
                          item.mlStock === null
                            ? 'text-slate-600'
                            : item.hasDivergence && item.channel === 'mercado_livre'
                              ? 'text-amber-400 font-semibold'
                              : 'text-slate-300'
                        }`}>
                          {item.mlStock !== null ? item.mlStock : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600 hidden md:table-cell">
                          {item.magaluStock !== null ? item.magaluStock : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {statusBadge}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.channel === 'mercado_livre' && item.marketplaceItemId && (
                            <a
                              href={mlItemUrl(item.marketplaceItemId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-yellow-400 transition-colors"
                              title="Ver no Mercado Livre"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="hidden lg:inline">Ver no ML</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Read-only warning */}
          <div className="glass-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Somente leitura</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O Foguetim <span className="font-semibold text-slate-400">nao altera estoque</span> nos marketplaces.
                  Apenas compara os valores e alerta divergencias para que voce corrija manualmente.
                </p>
              </div>
            </div>
          </div>

          {/* Future feature */}
          <div className="glass-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <ToggleLeft className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-1">
                  Sincronizacao automatica
                  <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">Em breve</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Em breve voce podera ativar a sincronizacao automatica de estoque do armazem para os marketplaces.
                  Disponivel por produto, com opt-in individual.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
