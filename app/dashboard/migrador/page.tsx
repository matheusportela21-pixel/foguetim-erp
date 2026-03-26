'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  AlertTriangle, Loader2, Search, ArrowLeft, ArrowRight,
  CheckCircle2, XCircle, AlertCircle, X, Info,
  ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon,
  Image as ImageIcon, Repeat2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelInfo {
  key: string
  label: string
  emoji: string
  bg: string
  text: string
  border: string
  connected: boolean
  listingCount: number | null
}

interface MigrateProduct {
  id: string
  title: string
  thumbnail: string | null
  sku: string | null
  price: number
  quantity: number
}

interface DuplicateCheck {
  newCount: number
  duplicateCount: number
}

interface MigrationResult {
  migrated: number
  ignored: number
  failed: number
}

type PageState = 'channels' | 'listing' | 'modal' | 'progress' | 'result'
type StatusFilter = 'active' | 'inactive' | 'all'
type DuplicateMode = 'ignore' | 'duplicate'

// ─── Channel config ──────────────────────────────────────────────────────────

const CHANNELS: Omit<ChannelInfo, 'connected' | 'listingCount'>[] = [
  { key: 'ml',     label: 'Mercado Livre', emoji: '\uD83D\uDFE1', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  { key: 'shopee', label: 'Shopee',        emoji: '\uD83D\uDFE0', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  { key: 'magalu', label: 'Magalu',        emoji: '\uD83D\uDD35', bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
]

const CONNECTION_ENDPOINTS: Record<string, string> = {
  ml:     '/api/mercadolivre/status',
  shopee: '/api/shopee/status',
  magalu: '/api/magalu/status',
}

const PAGE_SIZE = 50

// ─── Component ────────────────────────────────────────────────────────────────

export default function MigradorPage() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('channels')

  // Channel selection
  const [channels, setChannels] = useState<ChannelInfo[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [sourceChannel, setSourceChannel] = useState<ChannelInfo | null>(null)

  // Product listing
  const [products, setProducts] = useState<MigrateProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [offset, setOffset] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)

  // Migration modal
  const [destinationChannel, setDestinationChannel] = useState('')
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('ignore')
  const [authorized, setAuthorized] = useState(false)
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheck | null>(null)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  // Migration progress & result
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)

  // ─── Fetch channel connections ──────────────────────────────────────────────

  useEffect(() => {
    async function loadChannels() {
      setLoadingChannels(true)
      const results = await Promise.all(
        CHANNELS.map(async ch => {
          try {
            const res = await fetch(CONNECTION_ENDPOINTS[ch.key])
            if (!res.ok) {
              console.warn(`[Migrador] ${ch.label} status check failed: HTTP ${res.status}`)
              return { ...ch, connected: false, listingCount: null }
            }
            const data = await res.json()
            const connected = !!data.connected

            // Fetch listing count for connected channels
            let listingCount: number | null = null
            if (connected) {
              try {
                const countRes = await fetch(`/api/listings/migrate/products?channel=${ch.key}&limit=1&offset=0&status=active`)
                if (countRes.ok) {
                  const countData = await countRes.json()
                  listingCount = countData.total ?? null
                }
              } catch (e) {
                console.warn(`[Migrador] ${ch.label} listing count fetch failed:`, e)
              }
            }

            return { ...ch, connected, listingCount }
          } catch (e) {
            console.warn(`[Migrador] ${ch.label} connection check failed:`, e)
            return { ...ch, connected: false, listingCount: null }
          }
        })
      )
      setChannels(results)
      setLoadingChannels(false)
    }
    loadChannels()
  }, [])

  // ─── Fetch products ─────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    if (!sourceChannel) return
    setLoadingProducts(true)
    try {
      const params = new URLSearchParams({
        channel: sourceChannel.key,
        offset: offset.toString(),
        limit: PAGE_SIZE.toString(),
        status: statusFilter,
      })
      if (searchQuery.trim()) params.set('q', searchQuery.trim())
      const res = await fetch(`/api/listings/migrate/products?${params}`)
      const data = await res.json()
      setProducts(data.products ?? [])
      setTotalProducts(data.total ?? 0)
    } catch {
      setProducts([])
      setTotalProducts(0)
    } finally {
      setLoadingProducts(false)
    }
  }, [sourceChannel, offset, statusFilter, searchQuery])

  useEffect(() => {
    if (pageState === 'listing') fetchProducts()
  }, [pageState, fetchProducts])

  // ─── Check duplicates ───────────────────────────────────────────────────────

  useEffect(() => {
    if (pageState !== 'modal' || !destinationChannel || duplicateMode !== 'ignore') {
      setDuplicateCheck(null)
      return
    }

    let cancelled = false
    async function check() {
      setCheckingDuplicates(true)
      try {
        const res = await fetch('/api/listings/migrate/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_channel: sourceChannel?.key,
            destination_channel: destinationChannel,
            product_ids: Array.from(selected),
          }),
        })
        const data = await res.json()
        if (!cancelled) {
          setDuplicateCheck({
            newCount: data.new_count ?? selected.size,
            duplicateCount: data.duplicate_count ?? 0,
          })
        }
      } catch {
        if (!cancelled) {
          setDuplicateCheck({ newCount: selected.size, duplicateCount: 0 })
        }
      } finally {
        if (!cancelled) setCheckingDuplicates(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [pageState, destinationChannel, duplicateMode, selected, sourceChannel])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function selectSource(ch: ChannelInfo) {
    if (!ch.connected) return
    setSourceChannel(ch)
    setProducts([])
    setSelected(new Set())
    setOffset(0)
    setSearchQuery('')
    setStatusFilter('active')
    setPageState('listing')
  }

  function goBackToChannels() {
    setPageState('channels')
    setSourceChannel(null)
    setSelected(new Set())
  }

  function openMigrationModal() {
    setDestinationChannel('')
    setDuplicateMode('ignore')
    setAuthorized(false)
    setDuplicateCheck(null)
    setPageState('modal')
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === products.length && products.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map(p => p.id)))
    }
  }

  async function executeMigration() {
    setMigrating(true)
    setPageState('progress')
    try {
      const res = await fetch('/api/listings/migrate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_channel: sourceChannel?.key,
          destination_channel: destinationChannel,
          product_ids: Array.from(selected),
          duplicate_mode: duplicateMode,
        }),
      })
      const data = await res.json()
      setMigrationResult({
        migrated: data.migrated ?? 0,
        ignored: data.ignored ?? 0,
        failed: data.failed ?? 0,
      })
      setPageState('result')
    } catch {
      setMigrationResult({ migrated: 0, ignored: 0, failed: selected.size })
      setPageState('result')
    } finally {
      setMigrating(false)
    }
  }

  function resetAll() {
    setPageState('channels')
    setSourceChannel(null)
    setSelected(new Set())
    setProducts([])
    setMigrationResult(null)
    setDestinationChannel('')
    setAuthorized(false)
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const destinationOptions = channels.filter(
    ch => ch.key !== sourceChannel?.key && ch.connected
  )
  const destChannelInfo = channels.find(ch => ch.key === destinationChannel)
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const migrateCount = duplicateMode === 'ignore' && duplicateCheck
    ? duplicateCheck.newCount
    : selected.size

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Migrador de Anuncios"
        description="Migre anuncios entre seus canais conectados."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Migrador' },
        ]}
      />

      {/* Legal disclaimer */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-300/90 leading-relaxed">
          <strong className="text-yellow-400">Aviso importante:</strong> O migrador de anuncios e uma
          ferramenta de auxilio para agilizar a transferencia de produtos entre canais. Utilize apenas para
          migrar anuncios de produtos que voce possui autorizacao para comercializar. Respeite os direitos
          autorais, marcas registradas e propriedade intelectual de terceiros. O Foguetim ERP nao se
          responsabiliza pelo uso indevido desta ferramenta.
        </p>
      </div>

      {/* ── State 1: Channel selection ─────────────────────────────────────────── */}
      {pageState === 'channels' && (
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Selecione o canal de origem</h3>
            <p className="text-xs text-slate-500">Escolha de qual canal deseja migrar os anuncios.</p>

            {loadingChannels ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {channels.map(ch => (
                  <button
                    key={ch.key}
                    onClick={() => selectSource(ch)}
                    disabled={!ch.connected}
                    className={`glass-card p-5 text-left transition-all duration-200
                      ${ch.connected
                        ? `hover:bg-white/[0.04] hover:scale-[1.02] active:scale-[0.98] cursor-pointer border ${ch.border}`
                        : 'opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{ch.emoji}</span>
                      <span className={`font-semibold ${ch.text}`}>{ch.label}</span>
                    </div>

                    {ch.connected ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <span className="text-xs text-green-400">Conectado</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {ch.listingCount !== null
                            ? `${ch.listingCount.toLocaleString('pt-BR')} anuncios`
                            : '-- anuncios'}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${ch.bg} ${ch.text}`}>
                          Selecionar
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-slate-600" />
                          <span className="text-xs text-slate-500">Nao conectado</span>
                        </div>
                        <Link
                          href="/dashboard/integracoes"
                          className="text-xs text-primary-400 hover:text-primary-300"
                          onClick={e => e.stopPropagation()}
                        >
                          Conectar canal
                        </Link>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── State 2: Product listing ───────────────────────────────────────────── */}
      {pageState === 'listing' && sourceChannel && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={goBackToChannels}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Migrar de:</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${sourceChannel.bg} ${sourceChannel.text}`}>
                <span>{sourceChannel.emoji}</span>
                {sourceChannel.label}
              </span>
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setOffset(0) }}
                placeholder="Buscar por titulo ou SKU..."
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                           text-white text-sm placeholder-slate-500
                           focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as StatusFilter); setOffset(0) }}
                className="appearance-none px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/[0.06]
                           text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40
                           cursor-pointer"
              >
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="all">Todos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Loading */}
          {loadingProducts && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          )}

          {/* Empty */}
          {!loadingProducts && products.length === 0 && (
            <EmptyState
              image="search"
              title="Nenhum anuncio encontrado"
              description="Tente ajustar os filtros ou verifique se o canal possui anuncios."
              action={{ label: 'Voltar', onClick: goBackToChannels }}
            />
          )}

          {/* Products table */}
          {!loadingProducts && products.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="p-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === products.length && products.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                                     text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                        />
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Produto</th>
                      <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                      <th className="p-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Preco</th>
                      <th className="p-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {products.map(p => (
                      <tr
                        key={p.id}
                        className={`hover:bg-white/[0.02] transition-colors cursor-pointer
                          ${selected.has(p.id) ? 'bg-primary-500/5' : ''}`}
                        onClick={() => toggleSelect(p.id)}
                      >
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                                       text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {p.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.thumbnail}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover bg-white/[0.03] border border-white/[0.06] shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                                <ImageIcon className="w-4 h-4 text-slate-600" />
                              </div>
                            )}
                            <p className="text-white font-medium truncate max-w-[300px]">{p.title}</p>
                          </div>
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <span className="text-xs text-slate-400">{p.sku || '-'}</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-white font-medium">
                            R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="p-3 text-right hidden md:table-cell">
                          <span className="text-slate-300">{p.quantity}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                  <p className="text-xs text-slate-500">
                    {offset + 1}-{Math.min(offset + PAGE_SIZE, totalProducts)} de {totalProducts}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                      disabled={offset === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]
                                 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-400 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      disabled={offset + PAGE_SIZE >= totalProducts}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]
                                 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating action bar */}
          {selected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40
                            flex items-center gap-4 px-6 py-3 rounded-2xl
                            bg-[#0A0718]/95 border border-primary-500/20 backdrop-blur-xl shadow-2xl">
              <span className="text-sm text-primary-400 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {selected.size} selecionado{selected.size > 1 ? 's' : ''}
              </span>
              <button
                onClick={openMigrationModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                           text-white font-semibold text-sm
                           hover:shadow-neon-purple transition-all duration-200
                           hover:scale-[1.02] active:scale-[0.98]
                           flex items-center gap-2"
              >
                Migrar selecionados
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── State 3: Migration modal ───────────────────────────────────────────── */}
      {pageState === 'modal' && sourceChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPageState('listing')} />

          <div className="relative w-full max-w-lg bg-[#0A0718] border border-white/[0.06] rounded-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Migrar Anuncios</h2>
                <button
                  onClick={() => setPageState('listing')}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Copiar de</label>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${sourceChannel.bg} ${sourceChannel.text}`}>
                  <span>{sourceChannel.emoji}</span>
                  {sourceChannel.label}
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Copiar para</label>
                {destinationOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum outro canal conectado.</p>
                ) : (
                  <div className="relative">
                    <select
                      value={destinationChannel}
                      onChange={e => setDestinationChannel(e.target.value)}
                      className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/[0.06]
                                 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer"
                    >
                      <option value="">Selecione o destino...</option>
                      {destinationOptions.map(ch => (
                        <option key={ch.key} value={ch.key}>
                          {ch.emoji} {ch.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Duplicate mode */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Duplicar Anuncios</label>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl
                                    bg-[#12102a] border border-white/[0.08] text-xs text-slate-300 leading-relaxed
                                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <strong className="text-white block mb-1">Ignorar:</strong>
                      Pula anuncios que ja existem no destino (baseado no SKU).
                      <strong className="text-white block mt-2 mb-1">Duplicar:</strong>
                      Copia todos os anuncios, mesmo que ja existam no destino.
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={duplicateMode}
                    onChange={e => setDuplicateMode(e.target.value as DuplicateMode)}
                    className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-white/[0.03] border border-white/[0.06]
                               text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer"
                  >
                    <option value="ignore">Ignorar duplicados</option>
                    <option value="duplicate">Duplicar mesmo assim</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                <h4 className="text-sm font-medium text-white">Resumo</h4>
                <p className="text-sm text-slate-400">{selected.size} anuncio{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}</p>

                {destinationChannel && duplicateMode === 'ignore' && (
                  <>
                    {checkingDuplicates ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando SKUs no destino...
                      </div>
                    ) : duplicateCheck ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          {duplicateCheck.newCount} novo{duplicateCheck.newCount !== 1 ? 's' : ''} (ser{duplicateCheck.newCount !== 1 ? 'ao' : 'a'} copiado{duplicateCheck.newCount !== 1 ? 's' : ''})
                        </div>
                        {duplicateCheck.duplicateCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-yellow-400">
                            <AlertCircle className="w-4 h-4" />
                            {duplicateCheck.duplicateCount} ja existe{duplicateCheck.duplicateCount !== 1 ? 'm' : ''} (ser{duplicateCheck.duplicateCount !== 1 ? 'ao' : 'a'} ignorado{duplicateCheck.duplicateCount !== 1 ? 's' : ''})
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Legal checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={e => setAuthorized(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                             text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors">
                  Declaro que tenho autorizacao para comercializar estes produtos e que o uso desta
                  ferramenta e de minha total responsabilidade.
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={executeMigration}
                  disabled={!authorized || !destinationChannel || checkingDuplicates}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                             text-white font-semibold text-sm
                             hover:shadow-neon-purple transition-all duration-200
                             hover:scale-[1.02] active:scale-[0.98]
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                             flex items-center gap-2 justify-center"
                >
                  <Repeat2 className="w-4 h-4" />
                  Migrar {migrateCount} anuncio{migrateCount !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={() => setPageState('listing')}
                  className="px-6 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]
                             text-slate-300 text-sm font-medium
                             hover:bg-white/[0.04] transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── State 4: Migration progress ────────────────────────────────────────── */}
      {pageState === 'progress' && (
        <div className="glass-card p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
          <Image
            src="/mascot/timm-thinking.png"
            alt="Timm pensando"
            width={80}
            height={80}
            className="animate-pulse"
          />
          <div className="space-y-2">
            <p className="text-white font-medium">Timm esta migrando seus anuncios...</p>
            <p className="text-sm text-slate-400">Isso pode levar alguns instantes.</p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md space-y-3">
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 animate-pulse w-2/3 transition-all duration-500" />
            </div>
            <p className="text-xs text-slate-500">
              Progresso: processando {selected.size} anuncio{selected.size > 1 ? 's' : ''}...
            </p>
          </div>

          {/* Shimmer skeleton */}
          <div className="w-full max-w-sm space-y-2 mt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-3 rounded bg-white/[0.04] animate-pulse" style={{ width: `${85 - i * 20}%` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── State 5: Migration result ──────────────────────────────────────────── */}
      {pageState === 'result' && migrationResult && (
        <div className="glass-card p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
          <Image
            src="/mascot/timm-waving.png"
            alt="Timm celebrando"
            width={100}
            height={100}
          />

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Migracao concluida!</h3>
            <p className="text-sm text-slate-400">
              Os anuncios foram salvos como rascunho no canal{' '}
              {destChannelInfo ? (
                <span className={destChannelInfo.text}>{destChannelInfo.label}</span>
              ) : (
                'de destino'
              )}.
            </p>
          </div>

          {/* Result counts */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {migrationResult.migrated > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  {migrationResult.migrated} migrado{migrationResult.migrated !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {migrationResult.ignored > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">
                  {migrationResult.ignored} ignorado{migrationResult.ignored !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {migrationResult.failed > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">
                  {migrationResult.failed} falha{migrationResult.failed !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/rascunhos"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                         text-white font-semibold text-sm
                         hover:shadow-neon-purple transition-all duration-200
                         hover:scale-[1.02] active:scale-[0.98]
                         flex items-center gap-2 justify-center"
            >
              Ver rascunhos
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={resetAll}
              className="px-6 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]
                         text-slate-300 text-sm font-medium
                         hover:bg-white/[0.04] transition-all
                         flex items-center gap-2 justify-center"
            >
              <Repeat2 className="w-4 h-4" />
              Migrar mais anuncios
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
