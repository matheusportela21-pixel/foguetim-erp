'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  FileText, Loader2, Search, Trash2, CheckCircle2, Clock, AlertCircle,
  Edit3, ExternalLink, ChevronDown, ChevronUp, X, Copy, Package,
  Image as ImageIcon,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Draft {
  id: string
  title: string
  description: string | null
  price: number | null
  images: string[]
  brand: string | null
  condition: string | null
  sku: string | null
  ean: string | null
  category: string | null
  attributes: Record<string, string>
  source_marketplace: string | null
  source_url: string | null
  target_channels: string[]
  status: string
  created_at: string
  updated_at: string | null
  created_by?: string
}

// ─── Marketplace colors ──────────────────────────────────────────────────────

const MKT_COLORS: Record<string, { label: string; bg: string; text: string }> = {
  ml:         { label: 'Mercado Livre', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  shopee:     { label: 'Shopee',        bg: 'bg-orange-500/10', text: 'text-orange-400' },
  magalu:     { label: 'Magalu',        bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  amazon:     { label: 'Amazon',        bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  aliexpress: { label: 'AliExpress',    bg: 'bg-red-500/10',    text: 'text-red-400' },
  shein:      { label: 'Shein',         bg: 'bg-purple-500/10', text: 'text-purple-400' },
  americanas: { label: 'Americanas',    bg: 'bg-slate-500/10',  text: 'text-slate-400' },
  kabum:      { label: 'KaBuM',         bg: 'bg-amber-500/10',  text: 'text-amber-400' },
  outro:      { label: 'Outro',         bg: 'bg-gray-500/10',   text: 'text-gray-400' },
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft:     { label: 'Rascunho',   color: 'text-slate-400',  icon: FileText },
  ready:     { label: 'Pronto',     color: 'text-blue-400',   icon: CheckCircle2 },
  published: { label: 'Publicado',  color: 'text-green-400',  icon: CheckCircle2 },
  failed:    { label: 'Falha',      color: 'text-red-400',    icon: AlertCircle },
}

type TabKey = 'all' | 'draft' | 'ready' | 'published' | 'failed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'draft',     label: 'Rascunhos' },
  { key: 'ready',     label: 'Prontos' },
  { key: 'published', label: 'Publicados' },
  { key: 'failed',    label: 'Falhas' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function RascunhosPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [originFilter, setOriginFilter] = useState<string>('all')

  // Edit drawer
  const [editing, setEditing] = useState<Draft | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDescExpanded, setEditDescExpanded] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchDrafts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/listings/drafts?status=${tab}`)
      const data = await res.json()
      setDrafts(data.drafts ?? [])
    } catch {
      setDrafts([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = drafts.filter(d => {
    // Text search
    if (search) {
      const q = search.toLowerCase()
      const matchesSearch = d.title.toLowerCase().includes(q) ||
        d.sku?.toLowerCase().includes(q) ||
        d.brand?.toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    // Channel filter
    if (channelFilter !== 'all') {
      if (!(d.target_channels ?? []).includes(channelFilter)) return false
    }
    // Origin filter
    if (originFilter !== 'all') {
      const createdBy = d.created_by ?? 'copy'
      if (originFilter === 'copy' && createdBy !== 'copy') return false
      if (originFilter === 'migrate' && createdBy !== 'migrate') return false
      if (originFilter === 'manual' && createdBy !== 'manual') return false
    }
    return true
  })

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = [
    { label: 'Total',      value: drafts.length,                                    color: 'text-white' },
    { label: 'Rascunhos',  value: drafts.filter(d => d.status === 'draft').length,   color: 'text-slate-400' },
    { label: 'Prontos',    value: drafts.filter(d => d.status === 'ready').length,   color: 'text-blue-400' },
    { label: 'Publicados', value: drafts.filter(d => d.status === 'published').length, color: 'text-green-400' },
  ]

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(d => d.id)))
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/listings/drafts/${id}`, { method: 'DELETE' })
    fetchDrafts()
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  async function handleBulkDelete() {
    await Promise.all(Array.from(selected).map(id =>
      fetch(`/api/listings/drafts/${id}`, { method: 'DELETE' })
    ))
    setSelected(new Set())
    fetchDrafts()
  }

  function openEditor(draft: Draft) {
    setEditing(draft)
    setEditTitle(draft.title)
    setEditPrice(draft.price?.toString() ?? '')
    setEditDesc(draft.description ?? '')
    setEditDescExpanded(false)
    setEditSaving(false)
  }

  async function handleSaveEdit() {
    if (!editing) return
    setEditSaving(true)
    try {
      await fetch(`/api/listings/drafts/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          price: parseFloat(editPrice) || null,
          description: editDesc,
        }),
      })
      setEditing(null)
      fetchDrafts()
    } finally {
      setEditSaving(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rascunhos de Anuncios"
        description="Gerencie seus rascunhos de anuncios antes de publicar."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Rascunhos' },
        ]}
        actions={
          <Link
            href="/dashboard/copiador"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                       text-white text-sm font-semibold
                       hover:shadow-neon-purple transition-all hover:scale-[1.02] active:scale-[0.98]
                       flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Novo via Copiador
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="glass-card p-4 text-center space-y-1">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(new Set()) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${tab === t.key
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar titulo, SKU..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]
                       text-white text-sm placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
      </div>

      {/* Channel filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="space-y-1.5 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500 block">Canal</label>
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'ml', label: '\uD83D\uDFE1 ML' },
              { key: 'shopee', label: '\uD83D\uDFE0 Shopee' },
              { key: 'magalu', label: '\uD83D\uDD35 Magalu' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setChannelFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${channelFilter === f.key
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.03] bg-white/[0.02]'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500 block">Origem</label>
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'copy', label: 'Copiador' },
              { key: 'migrate', label: 'Migracao' },
              { key: 'manual', label: 'Manual' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setOriginFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${originFilter === f.key
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.03] bg-white/[0.02]'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/20">
          <span className="text-sm text-primary-400 font-medium">
            {selected.size} selecionado{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium
                       hover:bg-red-500/20 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          image="/mascot/timm-search.png"
          title="Nenhum rascunho encontrado"
          description="Use o Copiador de Anuncios para criar seus primeiros rascunhos."
          action={{ label: 'Ir para o Copiador', href: '/dashboard/copiador' }}
        />
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                                 text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                    />
                  </th>
                  <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Produto</th>
                  <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:table-cell">Origem</th>
                  <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Canais</th>
                  <th className="p-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Preco</th>
                  <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(d => {
                  const st = STATUS_MAP[d.status] ?? STATUS_MAP.draft
                  const StIcon = st.icon
                  return (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(d.id)}
                          onChange={() => toggleSelect(d.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                                     text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {d.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={d.images[0]}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-white/[0.03] border border-white/[0.06] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                              <ImageIcon className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[240px]">{d.title}</p>
                            {d.sku && <p className="text-xs text-slate-500">SKU: {d.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        {d.source_marketplace ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                            ${(MKT_COLORS[d.source_marketplace] ?? MKT_COLORS.outro).bg}
                            ${(MKT_COLORS[d.source_marketplace] ?? MKT_COLORS.outro).text}`}>
                            {(MKT_COLORS[d.source_marketplace] ?? MKT_COLORS.outro).label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(d.target_channels ?? []).map(ch => {
                            const c = MKT_COLORS[ch] ?? MKT_COLORS.outro
                            return (
                              <span key={ch} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.text}`}>
                                {c.label}
                              </span>
                            )
                          })}
                          {(!d.target_channels || d.target_channels.length === 0) && (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {d.price ? (
                          <span className="text-white font-medium">
                            R$ {d.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${st.color}`}>
                          <StIcon className="w-3.5 h-3.5" />
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditor(d)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {d.source_url && (
                            <a
                              href={d.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                              title="Ver original"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit drawer ────────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-[#0A0718] border-l border-white/[0.06] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Editar Rascunho</h2>
                <button
                  onClick={() => setEditing(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image preview */}
              {editing.images?.[0] && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {editing.images.slice(0, 4).map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={img}
                      alt={`Imagem ${i + 1}`}
                      className="w-20 h-20 rounded-lg object-cover bg-white/[0.03] border border-white/[0.06] shrink-0"
                    />
                  ))}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Titulo</label>
                <textarea
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                             text-white text-sm resize-none
                             focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
                <p className="text-xs text-slate-500">{editTitle.length} caracteres</p>
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Preco (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-full sm:w-48 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                             text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400">Descricao</label>
                  <button
                    onClick={() => setEditDescExpanded(!editDescExpanded)}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    {editDescExpanded ? 'Recolher' : 'Expandir'}
                    {editDescExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={editDescExpanded ? 12 : 4}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                             text-white text-sm resize-none
                             focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              {/* Info badges */}
              <div className="flex flex-wrap gap-2">
                {editing.brand && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    Marca: {editing.brand}
                  </span>
                )}
                {editing.sku && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    SKU: {editing.sku}
                  </span>
                )}
                {editing.ean && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    EAN: {editing.ean}
                  </span>
                )}
              </div>

              {/* Target channels */}
              {editing.target_channels?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">Canais de destino</label>
                  <div className="flex flex-wrap gap-2">
                    {editing.target_channels.map(ch => {
                      const c = MKT_COLORS[ch] ?? MKT_COLORS.outro
                      return (
                        <span key={ch} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${c.bg} ${c.text}`}>
                          {c.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                             text-white font-semibold text-sm
                             hover:shadow-neon-purple transition-all duration-200
                             hover:scale-[1.02] active:scale-[0.98]
                             disabled:opacity-40 disabled:cursor-not-allowed
                             flex items-center gap-2 justify-center"
                >
                  {editSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : (
                    <><Package className="w-4 h-4" /> Salvar alteracoes</>
                  )}
                </button>
                <button
                  onClick={() => setEditing(null)}
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
    </div>
  )
}
