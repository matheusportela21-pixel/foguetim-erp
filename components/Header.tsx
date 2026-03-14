'use client'

import { Bell, Search, Sun, Moon, Menu, Info, AlertTriangle, XCircle, CheckCircle2, CheckCheck, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/context/ThemeContext'
import { useSidebar } from '@/context/SidebarContext'
import { useState, useEffect, useRef, useCallback } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
}

const ROLE_LABELS: Record<string, string> = {
  diretor: 'Diretor', director: 'Diretor',
  supervisor: 'Supervisor',
  analista_produtos: 'Analista de Produtos', analyst_products: 'Analista de Produtos',
  analista_financeiro: 'Analista Financeiro', analyst_financial: 'Analista Financeiro',
  suporte: 'Suporte', support: 'Suporte',
  operador: 'Operador', operator: 'Operador',
}

/* ── Notification types ──────────────────────────────────────────────────── */
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

const TYPE_CONFIG = {
  info:    { icon: Info,         color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  error:   { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-500/10'    },
  success: { icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10'  },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function Header({ title, subtitle }: HeaderProps) {
  const { profile } = useAuth()
  const router      = useRouter()
  const { theme, setTheme } = useTheme()
  const { toggle }  = useSidebar()

  // Notifications state
  const [notifs, setNotifs]       = useState<Notification[]>([])
  const [unread, setUnread]       = useState(0)
  const [open, setOpen]           = useState(false)
  const [marking, setMarking]     = useState(false)
  const [loadingN, setLoadingN]   = useState(false)
  const dropdownRef               = useRef<HTMLDivElement>(null)
  const POLL_INTERVAL             = 60_000  // 60 s

  const initials    = profile?.name
    ? profile.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'MP'
  const displayName = profile?.name ?? 'Usuário'
  const displayRole = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : 'Administrador'

  /* fetch notifications */
  const fetchNotifs = useCallback(async (silent = false) => {
    if (!silent) setLoadingN(true)
    try {
      const res  = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifs(data.notifications ?? [])
      setUnread(data.unread_count  ?? 0)
    } catch {
      // silently ignore — non-critical
    } finally {
      if (!silent) setLoadingN(false)
    }
  }, [])

  /* initial load + polling */
  useEffect(() => {
    fetchNotifs()
    const id = setInterval(() => fetchNotifs(true), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchNotifs])

  /* close on outside click */
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  /* mark one read */
  async function markRead(id: string, actionUrl: string | null) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (actionUrl) {
      setOpen(false)
      router.push(actionUrl)
    }
  }

  /* mark all read */
  async function markAllRead() {
    setMarking(true)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setMarking(false)
  }

  return (
    <header className="dash-header sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          aria-label="Abrir menu"
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base md:text-lg font-bold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search — hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-44 pl-9 pr-4 py-2 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 focus:border-purple-600/40 transition-all"
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          className="p-2 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* ── Notifications bell ─────────────────────────────────────────── */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setOpen(o => !o); if (!open) fetchNotifs() }}
            className="relative p-2 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
            aria-label="Notificações"
          >
            <Bell className={`w-4 h-4 ${open ? 'text-purple-400' : ''}`} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-2 w-[380px] max-h-[480px] flex flex-col glass-card rounded-xl shadow-2xl border border-white/[0.08] z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">Notificações</span>
                  {unread > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unread}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={marking}
                    className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Marcar todas
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
                {loadingN ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
                      <div className="w-7 h-7 rounded-lg bg-dark-700 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-dark-700 rounded w-36" />
                        <div className="h-3 bg-dark-700 rounded w-56" />
                        <div className="h-2.5 bg-dark-700 rounded w-20" />
                      </div>
                    </div>
                  ))
                ) : notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Bell className="w-8 h-8 text-slate-700" />
                    <p className="text-xs text-slate-600">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifs.map(n => {
                    const tc   = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
                    const Icon = tc.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id, n.action_url)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-all ${
                          !n.read ? 'bg-indigo-900/20' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg ${tc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-3.5 h-3.5 ${tc.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-semibold truncate ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                              {n.title}
                            </p>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-0.5">{n.message}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-600">{timeAgo(n.created_at)}</span>
                            {n.action_url && (
                              <>
                                <span className="text-[10px] text-slate-700">·</span>
                                <ExternalLink className="w-2.5 h-2.5 text-purple-500" />
                                <span className="text-[10px] text-purple-400">Ver</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-white/[0.06] shrink-0">
                <button
                  onClick={() => { setOpen(false); router.push('/dashboard/notificacoes') }}
                  className="w-full text-center text-xs text-purple-400 hover:text-purple-300 transition-colors py-0.5"
                >
                  Ver todas as notificações →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 ml-1 border-l border-white/[0.06]">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-200 leading-tight">{displayName}</p>
            <p className="text-[10px] text-slate-600 capitalize">{displayRole}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
