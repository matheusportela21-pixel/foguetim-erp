'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Users, Search, Star, RefreshCw, X, ChevronDown,
  ShoppingBag, TrendingUp, UserCheck, Loader2, AlertCircle,
  Plus, Trash2, Package, MapPin, Clock, Calendar,
  Zap, RotateCcw, ExternalLink,
} from 'lucide-react'
import Header from '@/components/Header'

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Customer {
  id:               string
  ml_buyer_id:      string
  nickname:         string | null
  first_name:       string | null
  last_name:        string | null
  email:            string | null
  phone:            string | null
  city:             string | null
  state:            string | null
  zip_code:         string | null
  total_orders:     number
  total_spent:      number
  average_ticket:   number
  first_order_date: string | null
  last_order_date:  string | null
  notes:            string | null
  tags:             string[]
  rating:           number | null
  is_vip:           boolean
  synced_at:        string | null
}

type SortField = 'last_order_date' | 'total_spent' | 'total_orders'

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function daysAgo(iso: string | null): string {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `há ${d} dias`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function displayName(c: Customer): string {
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ')
  return full || c.nickname || c.ml_buyer_id
}

function avatarInitials(c: Customer): string {
  const name = displayName(c)
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

/** Deterministic color from string — maps first char to a hue */
function avatarColor(s: string): string {
  const colors = [
    'from-violet-700 to-purple-600',
    'from-blue-700 to-indigo-600',
    'from-cyan-700 to-blue-600',
    'from-emerald-700 to-teal-600',
    'from-amber-700 to-orange-600',
    'from-rose-700 to-pink-600',
    'from-fuchsia-700 to-violet-600',
    'from-sky-700 to-cyan-600',
  ]
  const code = s.charCodeAt(0) || 0
  return colors[code % colors.length]
}

/* ── Star Rating ─────────────────────────────────────────────────────────────── */
function StarRating({
  value, onChange, size = 'sm',
}: { value: number | null; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button key={i} type="button"
          onClick={() => onChange?.(i + 1)}
          className={`${sz} transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}>
          <Star className={`w-full h-full ${(value ?? 0) > i ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
        </button>
      ))}
    </div>
  )
}

/* ── Segment card ─────────────────────────────────────────────────────────────── */
interface Segment { emoji: string; label: string; count: number; onClick: () => void }
function SegmentCard({ seg }: { seg: Segment }) {
  return (
    <button onClick={seg.onClick}
      className="dash-card rounded-2xl p-4 text-left hover:border-purple-600/30 hover:bg-white/[0.03] transition-all group">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{seg.emoji}</span>
        <p className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">{seg.label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-100">{seg.count}</p>
    </button>
  )
}

/* ── Customer Drawer ─────────────────────────────────────────────────────────── */
const TAG_SUGGESTIONS = ['VIP', 'Recorrente', 'Atacado', 'Problemático', 'Fiel', 'Novo']

function CustomerDrawer({
  customer,
  onClose,
  onUpdated,
}: {
  customer: Customer
  onClose:  () => void
  onUpdated: (c: Customer) => void
}) {
  const [notes,   setNotes]   = useState(customer.notes ?? '')
  const [tags,    setTags]    = useState<string[]>(customer.tags ?? [])
  const [rating,  setRating]  = useState<number | null>(customer.rating)
  const [isVip,   setIsVip]   = useState(customer.is_vip)
  const [tagInput, setTagInput] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const save = useCallback(async (patch: {
    notes?: string; tags?: string[]; rating?: number | null; is_vip?: boolean
  }) => {
    setSaving(true); setSaved(false); setError(null)
    try {
      const res  = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json() as { customer?: Customer; error?: string }
      if (json.error) { setError(json.error); return }
      if (json.customer) { onUpdated(json.customer); setSaved(true) }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
      setTimeout(() => setSaved(false), 2500)
    }
  }, [customer.id, onUpdated])

  const addTag = (t: string) => {
    const clean = t.trim()
    if (!clean || tags.includes(clean)) return
    const next = [...tags, clean]
    setTags(next)
    save({ tags: next })
    setTagInput('')
  }

  const removeTag = (t: string) => {
    const next = tags.filter(x => x !== t)
    setTags(next)
    save({ tags: next })
  }

  const toggleVip = () => {
    const next = !isVip
    setIsVip(next)
    save({ is_vip: next })
  }

  const handleRating = (v: number) => {
    setRating(v)
    save({ rating: v })
  }

  const handleNoteSave = () => save({ notes })

  const last90 = customer.last_order_date
    ? Math.floor((Date.now() - new Date(customer.last_order_date).getTime()) / 86400_000) <= 90
        ? customer.total_orders
        : 0
    : 0

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-dark-800 border-l border-white/[0.08] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(displayName(customer))} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
            {avatarInitials(customer)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-100 truncate">{displayName(customer)}</p>
              {isVip && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
            </div>
            {customer.nickname && <p className="text-xs text-slate-500">@{customer.nickname}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleVip} title={isVip ? 'Remover VIP' : 'Marcar como VIP'}
              className={`p-1.5 rounded-lg transition-all ${isVip ? 'text-amber-400 hover:text-amber-300 bg-amber-900/20' : 'text-slate-600 hover:text-amber-400 hover:bg-amber-900/10'}`}>
              <Star className={`w-4 h-4 ${isVip ? 'fill-amber-400' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Métricas */}
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Métricas</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Pedidos',       value: customer.total_orders,          icon: ShoppingBag, color: 'text-blue-400'   },
                { label: 'Total gasto',   value: fmtBRL(customer.total_spent),   icon: TrendingUp,  color: 'text-green-400'  },
                { label: 'Ticket médio',  value: fmtBRL(customer.average_ticket), icon: Zap,        color: 'text-purple-400' },
                { label: '90 dias',       value: `${last90} pedidos`,            icon: RotateCcw,   color: 'text-cyan-400'   },
              ].map(m => (
                <div key={m.label} className="bg-dark-700 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <m.icon className={`w-3 h-3 ${m.color}`} />
                    <p className="text-[10px] text-slate-600">{m.label}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-200">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-dark-700 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3 h-3 text-slate-600" />
                  <p className="text-[10px] text-slate-600">Primeiro pedido</p>
                </div>
                <p className="text-xs font-semibold text-slate-300">{fmtDate(customer.first_order_date)}</p>
              </div>
              <div className="bg-dark-700 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <p className="text-[10px] text-slate-600">Último pedido</p>
                </div>
                <p className="text-xs font-semibold text-slate-300">{daysAgo(customer.last_order_date)}</p>
              </div>
            </div>
          </div>

          {/* Endereço */}
          {(customer.city || customer.state) && (
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Endereço</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-dark-700">
                <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <p className="text-xs text-slate-300">
                  {[customer.city, customer.state, customer.zip_code].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Avaliação</p>
            <div className="flex items-center gap-3">
              <StarRating value={rating} onChange={handleRating} size="md" />
              {rating && <span className="text-xs text-slate-500">{rating}/5</span>}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Tags</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-900/20 text-purple-400 border border-purple-700/30">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Sugestões */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {TAG_SUGGESTIONS.filter(s => !tags.includes(s)).map(s => (
                <button key={s} onClick={() => addTag(s)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-slate-500 border border-white/[0.06] hover:border-purple-600/40 hover:text-purple-400 transition-all">
                  <Plus className="w-2.5 h-2.5" /> {s}
                </button>
              ))}
            </div>
            {/* Custom tag input */}
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                placeholder="Nova tag..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-dark-700 border border-white/[0.06] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
              <button onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-dark-700 border border-white/[0.06] text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-all">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Anotações */}
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Anotações</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Notas sobre este cliente..."
              className="w-full px-3 py-2.5 rounded-xl bg-dark-700 border border-white/[0.06] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
            <div className="flex items-center justify-between mt-2">
              <div>
                {saved  && <p className="text-[11px] text-green-400">Salvo!</p>}
                {error  && <p className="text-[11px] text-red-400">{error}</p>}
              </div>
              <button onClick={handleNoteSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white disabled:opacity-40 transition-all">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {saving ? 'Salvando...' : 'Salvar anotação'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

/* ── Customer Card Row ───────────────────────────────────────────────────────── */
function CustomerRow({ c, onClick }: { c: Customer; onClick: () => void }) {
  const name  = displayName(c)
  const color = avatarColor(name)

  return (
    <tr onClick={onClick} className="hover:bg-white/[0.03] cursor-pointer transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
            {avatarInitials(c)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-200 truncate">{name}</p>
              {c.is_vip && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
            </div>
            {c.nickname && <p className="text-[10px] text-slate-600">@{c.nickname}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
        {c.city && c.state ? `${c.city}, ${c.state}` : (c.city || c.state || '—')}
      </td>
      <td className="px-4 py-3 text-xs font-semibold text-slate-200 text-right whitespace-nowrap">
        {c.total_orders}
      </td>
      <td className="px-4 py-3 text-xs font-bold text-slate-100 text-right whitespace-nowrap">
        {fmtBRL(c.total_spent)}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
        {fmtBRL(c.average_ticket)}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
        {daysAgo(c.last_order_date)}
      </td>
      <td className="px-4 py-3">
        {c.rating && <StarRating value={c.rating} size="sm" />}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {(c.tags ?? []).slice(0, 2).map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-900/20 text-purple-400 border border-purple-700/30">
              {t}
            </span>
          ))}
          {(c.tags ?? []).length > 2 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-dark-600 text-slate-500">
              +{(c.tags ?? []).length - 2}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href="/dashboard/pedidos"
            className="text-[10px] text-slate-500 hover:text-purple-400 transition-colors whitespace-nowrap"
            onClick={e => e.stopPropagation()}>
            Ver pedidos
          </Link>
          {c.nickname && (
            <a href={`https://www.mercadolibre.com/perfil/${c.nickname}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors"
              onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function ClientesPage() {
  const [customers,   setCustomers]   = useState<Customer[]>([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [syncing,     setSyncing]     = useState(false)
  const [syncResult,  setSyncResult]  = useState<{ synced: number; new: number; updated: number } | null>(null)
  const [syncError,   setSyncError]   = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [sortField,   setSortField]   = useState<SortField>('last_order_date')
  const [vipOnly,     setVipOnly]     = useState(false)
  const [activeTag,   setActiveTag]   = useState('')
  const [page,        setPage]        = useState(1)
  const [totalPages,  setTotalPages]  = useState(1)
  const [selected,    setSelected]    = useState<Customer | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (opts?: { p?: number; s?: string; sort?: SortField; vip?: boolean; tag?: string }) => {
    setLoading(true)
    const p    = opts?.p    ?? page
    const s    = opts?.s    ?? search
    const srt  = opts?.sort ?? sortField
    const v    = opts?.vip  !== undefined ? opts.vip : vipOnly
    const tg   = opts?.tag  !== undefined ? opts.tag : activeTag

    const params = new URLSearchParams({
      page:  String(p),
      limit: '20',
      sort:  srt,
      order: 'desc',
    })
    if (s)  params.set('search', s)
    if (v)  params.set('vip', 'true')
    if (tg) params.set('tag', tg)

    try {
      const res  = await fetch(`/api/customers?${params}`)
      const json = await res.json() as {
        customers: Customer[]; total: number; total_pages: number; error?: string
      }
      if (json.error) { setLoading(false); return }
      setCustomers(json.customers ?? [])
      setTotal(json.total ?? 0)
      setTotalPages(json.total_pages ?? 1)
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, search, sortField, vipOnly, activeTag])

  useEffect(() => { load() }, [load])

  /* ── Search with debounce ───────────────────────────────────────────────── */
  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load({ s: v, p: 1 }), 350)
  }

  /* ── Sync ───────────────────────────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true); setSyncResult(null); setSyncError(null)
    try {
      const res  = await fetch('/api/mercadolivre/sync-customers', { method: 'POST' })
      const json = await res.json() as { synced?: number; new?: number; updated?: number; error?: string; notConnected?: boolean }
      if (json.error) {
        setSyncError(json.notConnected ? 'Mercado Livre não conectado. Acesse Integrações.' : json.error)
      } else {
        setSyncResult({ synced: json.synced ?? 0, new: json.new ?? 0, updated: json.updated ?? 0 })
        load({ p: 1 })
      }
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : 'Erro desconhecido')
    }
    setSyncing(false)
    setTimeout(() => { setSyncResult(null); setSyncError(null) }, 5000)
  }

  /* ── Update customer in list after drawer edit ─────────────────────────── */
  const handleUpdated = (updated: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  /* ── KPIs ──────────────────────────────────────────────────────────────── */
  const now30d      = Date.now() - 30 * 86400_000
  const vipCount    = customers.filter(c => c.is_vip).length
  const newCount    = customers.filter(c => c.first_order_date && new Date(c.first_order_date).getTime() > now30d).length
  const avgTicket   = customers.length > 0
    ? customers.reduce((s, c) => s + c.average_ticket, 0) / customers.length
    : 0

  /* ── Segments ──────────────────────────────────────────────────────────── */
  const recurrentes = customers.filter(c => c.total_orders >= 3).length
  const top20pct    = (() => {
    if (customers.length === 0) return 0
    const sorted = [...customers].sort((a, b) => b.total_spent - a.total_spent)
    return sorted.slice(0, Math.max(1, Math.ceil(customers.length * 0.2))).length
  })()
  const inativos = customers.filter(c => {
    if (!c.last_order_date) return true
    return Date.now() - new Date(c.last_order_date).getTime() > 90 * 86400_000
  }).length
  const novos = customers.filter(c => {
    if (!c.first_order_date) return false
    return Date.now() - new Date(c.first_order_date).getTime() < 30 * 86400_000
  }).length

  const segments: Segment[] = [
    { emoji: '🌟', label: 'VIP',        count: vipCount,    onClick: () => { setVipOnly(true);  setActiveTag(''); setPage(1); load({ vip: true, tag: '', p: 1 }) } },
    { emoji: '🔄', label: 'Recorrentes', count: recurrentes, onClick: () => {} },
    { emoji: '💎', label: 'Alto valor',  count: top20pct,    onClick: () => { setSortField('total_spent'); setPage(1); load({ sort: 'total_spent', p: 1 }) } },
    { emoji: '😴', label: 'Inativos',   count: inativos,    onClick: () => {} },
    { emoji: '🆕', label: 'Novos',      count: novos,       onClick: () => {} },
  ]

  /* ── Empty state ────────────────────────────────────────────────────────── */
  const isEmpty = !loading && customers.length === 0 && !search && !vipOnly && !activeTag

  return (
    <div>
      <Header
        title="Clientes"
        subtitle="Histórico e relacionamento com seus compradores"
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            <span className="font-semibold text-slate-300">{total}</span>
            <span>clientes cadastrados</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {syncResult && (
              <p className="text-xs text-green-400 font-medium">
                ✓ {syncResult.synced} sincronizados ({syncResult.new} novos)
              </p>
            )}
            {syncError && (
              <p className="text-xs text-red-400 font-medium truncate max-w-[200px]">{syncError}</p>
            )}
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-sm font-medium text-slate-400 hover:text-slate-200 hover:border-white/10 transition-all disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar com ML'}
            </button>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total de clientes',  value: total,              icon: Users,      color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30' },
            { label: 'Clientes VIP',       value: vipCount,           icon: Star,       color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/30'   },
            { label: 'Ticket médio geral', value: fmtBRL(avgTicket),  icon: TrendingUp, color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/30'   },
            { label: 'Novos (30 dias)',    value: newCount,           icon: UserCheck,  color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/30'     },
          ].map(k => (
            <div key={k.label} className="dash-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${k.bg}`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 truncate">{k.label}</p>
                  <p className="text-xl font-bold text-slate-100 leading-tight">{k.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Segmentos ────────────────────────────────────────────────────── */}
        {!isEmpty && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Segmentos</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {segments.map(s => <SegmentCard key={s.label} seg={s} />)}
            </div>
          </div>
        )}

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="dash-card rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar por nome, nickname ou email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select value={sortField} onChange={e => {
                const v = e.target.value as SortField
                setSortField(v); setPage(1); load({ sort: v, p: 1 })
              }} className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40 cursor-pointer">
                <option value="last_order_date">Mais recentes</option>
                <option value="total_spent">Maior valor</option>
                <option value="total_orders">Mais pedidos</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
            </div>
          </div>

          {/* Tag chips + VIP toggle */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setVipOnly(false); setActiveTag(''); setPage(1); load({ vip: false, tag: '', p: 1 }) }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                !vipOnly && !activeTag ? 'bg-purple-600/20 text-purple-300 border-purple-700/40' : 'bg-dark-700 text-slate-500 border-white/[0.06] hover:text-slate-300'
              }`}>Todos</button>
            <button onClick={() => { setVipOnly(true); setActiveTag(''); setPage(1); load({ vip: true, tag: '', p: 1 }) }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                vipOnly ? 'bg-amber-900/20 text-amber-300 border-amber-700/40' : 'bg-dark-700 text-slate-500 border-white/[0.06] hover:text-slate-300'
              }`}>
              <span className="flex items-center gap-1"><Star className="w-3 h-3" /> VIP</span>
            </button>
            {['Recorrente', 'Atacado', 'Fiel', 'Novo'].map(tag => (
              <button key={tag} onClick={() => {
                const next = activeTag === tag ? '' : tag
                setActiveTag(next); setVipOnly(false); setPage(1); load({ tag: next, vip: false, p: 1 })
              }} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                activeTag === tag ? 'bg-purple-600/20 text-purple-300 border-purple-700/40' : 'bg-dark-700 text-slate-500 border-white/[0.06] hover:text-slate-300'
              }`}>{tag}</button>
            ))}
          </div>
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
            <div className="max-w-sm">
              <p className="text-sm font-semibold text-slate-300 mb-1">Nenhum cliente encontrado</p>
              <p className="text-xs text-slate-500">
                Seus clientes aparecerão aqui após suas primeiras vendas no Mercado Livre. Sincronize para importar compradores.
              </p>
            </div>
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 text-purple-400 text-xs font-bold hover:bg-purple-600/30 transition-colors border border-purple-600/30">
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Sincronizar clientes
            </button>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────────── */}
        {!isEmpty && (
          <div className="dash-card rounded-2xl overflow-hidden">
            {loading ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left">
                      {['Cliente', 'Cidade', 'Pedidos', 'Total gasto', 'Ticket médio', 'Último pedido', 'Rating', 'Tags', ''].map(h => (
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${['Pedidos', 'Total gasto', 'Ticket médio'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
                            <div className="h-3 bg-white/[0.06] rounded w-28" />
                          </div>
                        </td>
                        <td className="px-4 py-3"><div className="h-3 bg-white/[0.06] rounded w-16" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-white/[0.06] rounded w-8 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-white/[0.06] rounded w-20 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-white/[0.06] rounded w-16 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-white/[0.06] rounded w-16" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-white/[0.06] rounded w-20" /></td>
                        <td className="px-4 py-3"><div className="h-3 bg-white/[0.06] rounded w-12" /></td>
                        <td className="px-4 py-3" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center text-center py-16">
                <AlertCircle className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">Nenhum cliente encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left">
                        {['Cliente', 'Cidade', 'Pedidos', 'Total gasto', 'Ticket médio', 'Último pedido', 'Rating', 'Tags', ''].map(h => (
                          <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${['Pedidos', 'Total gasto', 'Ticket médio'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {customers.map(c => (
                        <CustomerRow key={c.id} c={c} onClick={() => setSelected(c)} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
                    <p className="text-xs text-slate-600">
                      Página {page} de {totalPages} · {total} clientes
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => { setPage(p => { const n = p - 1; load({ p: n }); return n }) }}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-xl bg-dark-700 border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-all">
                        ← Anterior
                      </button>
                      <button onClick={() => { setPage(p => { const n = p + 1; load({ p: n }); return n }) }}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-xl bg-dark-700 border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-all">
                        Próxima →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      {selected && (
        <CustomerDrawer
          customer={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
