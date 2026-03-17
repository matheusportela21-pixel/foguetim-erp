'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import ExportCSVButton from '@/components/ExportCSVButton'
import {
  AlertTriangle, Package, RefreshCw, Search, ExternalLink,
  CheckCircle2, Loader2, Link2, Archive,
} from 'lucide-react'
import type { EstoqueItem, EstoqueSummary, StockLevel } from '@/app/api/mercadolivre/estoque/route'

/* ── Config ──────────────────────────────────────────────────────────────── */

const LEVEL_CFG: Record<StockLevel, {
  label: string; dot: string; badge: string; border: string; kpiText: string; kpiBg: string
}> = {
  ruptura: {
    label:    'Ruptura',
    dot:      'bg-red-500 animate-pulse',
    badge:    'bg-red-900/30 text-red-400 ring-1 ring-red-700/40',
    border:   'border-red-500/20',
    kpiText:  'text-red-400',
    kpiBg:    'from-red-500/10 to-transparent border-red-500/20',
  },
  alerta: {
    label:    'Alerta',
    dot:      'bg-amber-400',
    badge:    'bg-amber-900/30 text-amber-400 ring-1 ring-amber-700/40',
    border:   'border-amber-500/20',
    kpiText:  'text-amber-400',
    kpiBg:    'from-amber-500/10 to-transparent border-amber-500/20',
  },
  baixo: {
    label:    'Baixo',
    dot:      'bg-blue-400',
    badge:    'bg-blue-900/30 text-blue-400 ring-1 ring-blue-700/40',
    border:   'border-blue-500/20',
    kpiText:  'text-blue-400',
    kpiBg:    'from-blue-500/10 to-transparent border-blue-500/20',
  },
  normal: {
    label:    'Normal',
    dot:      'bg-green-400',
    badge:    'bg-green-900/30 text-green-400 ring-1 ring-green-700/40',
    border:   'border-green-500/20',
    kpiText:  'text-green-400',
    kpiBg:    'from-green-500/10 to-transparent border-green-500/20',
  },
}

type FilterTab = 'todos' | StockLevel

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({
  level, count, loading,
}: { level: StockLevel; count: number; loading: boolean }) {
  const cfg = LEVEL_CFG[level]
  const emoji = { ruptura: '🔴', alerta: '🟡', baixo: '🔵', normal: '🟢' }[level]
  return (
    <div className={`glass-card rounded-xl p-4 bg-gradient-to-br ${cfg.kpiBg} border`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{emoji}</span>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cfg.label}</p>
      </div>
      {loading
        ? <div className="h-7 w-12 bg-white/[0.06] animate-pulse rounded" />
        : <p className={`text-2xl font-bold font-mono ${cfg.kpiText}`}>{count}</p>}
      <p className="text-[10px] text-slate-600 mt-1">anúncio{count !== 1 ? 's' : ''}</p>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function EstoquePage() {
  const [items,    setItems]    = useState<EstoqueItem[]>([])
  const [summary,  setSummary]  = useState<EstoqueSummary | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<FilterTab>('todos')
  const [search,   setSearch]   = useState('')
  const [connected, setConnected] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mercadolivre/estoque')
      const d   = await res.json() as { items?: EstoqueItem[]; summary?: EstoqueSummary; error?: string }
      if (d.error === 'Unauthorized' || !res.ok) { setConnected(false); return }
      setItems(d.items ?? [])
      setSummary(d.summary ?? null)
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // read ?filter= from URL
    const sp = new URLSearchParams(window.location.search)
    const f  = sp.get('filter') as FilterTab | null
    if (f) setFilter(f)
    load()
  }, [load])

  /* filtered + searched items */
  const visible = items.filter(item => {
    if (filter !== 'todos' && item.level !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.item_id.toLowerCase().includes(q) ||
        (item.seller_sku ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  if (!loading && !connected) {
    return (
      <div className="flex-1 overflow-y-auto">
        <Header title="Estoque" subtitle="Monitoramento de estoque por anúncio" />
        <div className="flex flex-col items-center justify-center gap-4 mt-20 px-6">
          <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
            <Link2 className="w-6 h-6 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-semibold">Mercado Livre não conectado</p>
            <p className="text-slate-600 text-sm mt-1">Conecte sua conta para monitorar o estoque.</p>
          </div>
          <Link href="/dashboard/integracoes"
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
            Conectar agora
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <Header title="Estoque" subtitle="Monitoramento de estoque por anúncio" />

      <div className="p-6 space-y-5">

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(['ruptura', 'alerta', 'baixo', 'normal'] as StockLevel[]).map(level => (
            <KpiCard
              key={level}
              level={level}
              count={summary?.[level] ?? 0}
              loading={loading}
            />
          ))}
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-dark-800 border border-white/[0.06] rounded-xl p-1">
            {([
              { key: 'todos',   label: 'Todos',   count: summary?.total   ?? 0 },
              { key: 'ruptura', label: '🔴 Ruptura', count: summary?.ruptura ?? 0 },
              { key: 'alerta',  label: '🟡 Alerta',  count: summary?.alerta  ?? 0 },
              { key: 'baixo',   label: '🔵 Baixo',   count: summary?.baixo   ?? 0 },
              { key: 'normal',  label: '🟢 Normal',  count: summary?.normal  ?? 0 },
            ] as { key: FilterTab; label: string; count: number }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
                {!loading && (
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${
                    filter === tab.key ? 'bg-white/20 text-white' : 'bg-dark-700 text-slate-600'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título, MLB, SKU..."
              className="w-full pl-9 pr-4 py-2 bg-dark-800 border border-white/[0.06] rounded-xl text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-purple-500/40"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl bg-dark-800 border border-white/[0.06] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <ExportCSVButton
            data={items as unknown as Record<string, unknown>[]}
            filename="estoque"
            columns={[
              { key: 'item_id',            label: 'ID Anúncio' },
              { key: 'title',              label: 'Título'      },
              { key: 'stock',              label: 'Estoque'     },
              { key: 'level',              label: 'Nível'       },
              { key: 'seller_sku',         label: 'SKU'         },
            ]}
          />
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="space-y-0 divide-y divide-white/[0.04]">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                  <div className="w-10 h-10 bg-dark-700 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-dark-700 rounded w-3/4" />
                    <div className="h-2.5 bg-dark-800 rounded w-1/3" />
                  </div>
                  <div className="h-3 w-12 bg-dark-700 rounded" />
                  <div className="h-3 w-16 bg-dark-700 rounded" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {items.length === 0 ? (
                <>
                  <Archive className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-slate-400 font-medium">Nenhum anúncio sincronizado</p>
                  <p className="text-slate-600 text-sm mt-1">Vá em Listagens e sincronize seus anúncios do ML.</p>
                  <Link href="/dashboard/listagens" className="mt-4 text-sm text-purple-400 hover:text-purple-300 underline">
                    Ir para Listagens →
                  </Link>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-600 mb-3" />
                  <p className="text-slate-400 font-medium">Nenhum anúncio neste filtro</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['', 'Produto', 'MLB', 'Estoque', 'Status', 'Vendidos', ''].map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {visible.map(item => {
                    const cfg = LEVEL_CFG[item.level]
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">

                        {/* Thumbnail */}
                        <td className="px-4 py-3 w-12">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-dark-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-700" />
                            </div>
                          )}
                        </td>

                        {/* Title + SKU */}
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                            <div>
                              <p className="text-slate-200 font-medium leading-snug line-clamp-2">{item.title}</p>
                              {item.seller_sku && (
                                <p className="text-[10px] text-slate-600 mt-0.5">SKU: {item.seller_sku}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* MLB */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-500 font-mono">{item.item_id}</span>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-lg font-bold font-mono ${cfg.kpiText}`}>
                            {item.stock}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'active'
                              ? 'bg-green-900/30 text-green-400'
                              : item.status === 'paused'
                              ? 'bg-amber-900/30 text-amber-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {item.status === 'active' ? 'Ativo'
                              : item.status === 'paused' ? 'Pausado'
                              : item.status}
                          </span>
                        </td>

                        {/* Sold */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-400 font-mono tabular-nums">
                            {item.sold_quantity.toLocaleString('pt-BR')}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <a
                            href={`https://www.mercadolivre.com.br/anuncios/${item.item_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-slate-600 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver ML
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {visible.length > 0 && (
                <div className="px-5 py-3 border-t border-white/[0.04] text-xs text-slate-600">
                  {visible.length} de {items.length} anúncio{items.length !== 1 ? 's' : ''}
                  {(summary?.ruptura ?? 0) > 0 && (
                    <span className="ml-3 text-red-400 font-medium">
                      ⚠️ {summary!.ruptura} com estoque zerado
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync info */}
        {!loading && items.length > 0 && items[0]?.synced_at && (
          <p className="text-[11px] text-slate-700 flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 opacity-0" />
            Última sincronização:{' '}
            {new Date(items[0].synced_at!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
            {' · '}
            <Link href="/dashboard/listagens" className="text-purple-600 hover:text-purple-400 underline">
              Sincronizar agora
            </Link>
          </p>
        )}

      </div>
    </div>
  )
}
