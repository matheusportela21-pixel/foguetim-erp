'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Bell, Info, AlertTriangle, XCircle, CheckCircle2,
  ShoppingCart, MessageSquareWarning, Package, DollarSign,
  Plug, Settings, RefreshCw, CheckCheck,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Notification {
  id:         string
  title:      string
  message:    string
  type:       'info' | 'warning' | 'error' | 'success'
  category:   string
  read:       boolean
  action_url: string | null
  created_at: string
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)   return 'agora'
  if (m < 60)  return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30)  return `há ${d} dia${d > 1 ? 's' : ''}`
  const mo = Math.floor(d / 30)
  return `há ${mo} mes${mo > 1 ? 'es' : ''}`
}

const TYPE_CONFIG = {
  info:    { icon: Info,            color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  warning: { icon: AlertTriangle,   color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  error:   { icon: XCircle,         color: 'text-red-400',    bg: 'bg-red-500/10'    },
  success: { icon: CheckCircle2,    color: 'text-green-400',  bg: 'bg-green-500/10'  },
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  system:      { icon: Settings,            label: 'Sistema'     },
  orders:      { icon: ShoppingCart,        label: 'Pedidos'     },
  claims:      { icon: MessageSquareWarning, label: 'Reclamações' },
  products:    { icon: Package,             label: 'Produtos'    },
  financial:   { icon: DollarSign,          label: 'Financeiro'  },
  integration: { icon: Plug,               label: 'Integração'  },
}

const PAGE_SIZE = 20

/* ── Component ───────────────────────────────────────────────────────────── */
export default function NotificacoesPage() {
  const [items, setItems]           = useState<Notification[]>([])
  const [loading, setLoading]       = useState(true)
  const [marking, setMarking]       = useState(false)
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [unread, setUnread]         = useState(0)
  const [filterRead, setFilterRead] = useState<'all' | 'unread'>('all')

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/notifications')
      const data = await res.json()
      setItems(data.notifications ?? [])
      setUnread(data.unread_count ?? 0)
      setTotal(data.notifications?.length ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function markAllRead() {
    setMarking(true)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    setMarking(false)
  }

  async function markRead(id: string, actionUrl: string | null) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
    if (actionUrl) window.location.href = actionUrl
  }

  const filtered = filterRead === 'unread' ? items.filter(n => !n.read) : items
  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore   = paginated.length < filtered.length

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Notificações" description="Central de alertas e atualizações" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: total,  color: 'text-slate-300' },
            { label: 'Não lidas',   value: unread, color: 'text-orange-400' },
            { label: 'Lidas',       value: total - unread, color: 'text-green-400' },
            { label: 'Esta semana', value: items.filter(n => {
              const d = new Date(n.created_at)
              return Date.now() - d.getTime() < 7 * 86400_000
            }).length, color: 'text-blue-400' },
          ].map(k => (
            <div key={k.label} className="dash-card p-4">
              <p className="text-xs text-slate-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilterRead(f); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterRead === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-dark-700 text-slate-400 hover:text-slate-200 border border-white/[0.06]'
                }`}
              >
                {f === 'all' ? 'Todas' : 'Não lidas'}
                {f === 'unread' && unread > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 bg-dark-700 border border-white/[0.06] hover:text-slate-200 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="dash-card divide-y divide-white/[0.04] overflow-hidden">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-dark-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-dark-700 rounded w-48" />
                  <div className="h-3 bg-dark-700 rounded w-72" />
                  <div className="h-3 bg-dark-700 rounded w-24" />
                </div>
              </div>
            ))
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bell className="w-10 h-10 text-slate-700" />
              <p className="text-slate-500 text-sm">
                {filterRead === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação ainda'}
              </p>
            </div>
          ) : (
            paginated.map(n => {
              const tc  = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
              const cc  = CATEGORY_CONFIG[n.category] ?? CATEGORY_CONFIG.system
              const Icon     = tc.icon
              const CatIcon  = cc.icon
              return (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markRead(n.id, n.action_url) }}
                  className={`flex items-start gap-3 p-4 transition-all cursor-pointer hover:bg-white/[0.02] ${
                    !n.read ? 'bg-indigo-900/[0.12]' : ''
                  }`}
                >
                  {/* Type icon */}
                  <div className={`w-8 h-8 rounded-lg ${tc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${tc.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-slate-300'} truncate`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <CatIcon className="w-3 h-3 text-slate-600" />
                      <span className="text-[10px] text-slate-600">{cc.label}</span>
                      <span className="text-[10px] text-slate-700">·</span>
                      <span className="text-[10px] text-slate-600">{timeAgo(n.created_at)}</span>
                      {n.action_url && (
                        <>
                          <span className="text-[10px] text-slate-700">·</span>
                          <span className="text-[10px] text-purple-400">Ver detalhes →</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm text-slate-400 bg-dark-700 rounded-lg border border-white/[0.06] hover:text-slate-200 transition-all"
            >
              Carregar mais
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
