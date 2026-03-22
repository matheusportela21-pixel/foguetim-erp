'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw, Search, FileText, ChevronDown, ChevronUp,
  Lock, Pencil, Link, CreditCard, Settings, Wrench, Headphones, AlertTriangle, UserCog,
  Activity, LogIn, UserPlus, AlertCircle,
} from 'lucide-react'
import { maskEmail } from '@/lib/mask-email'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ActivityLog {
  id:          string
  user_id:     string | null
  action:      string
  category:    string
  description: string
  visibility:  string
  ip_address:  string | null
  metadata:    Record<string, unknown> | null
  created_at:  string
  user:        { id: string; name: string; email: string } | null
}

interface LogStats {
  total_24h: number
  logins:    number
  signups:   number
  errors:    number
}

interface SimpleUser {
  id:    string
  name:  string
  email: string
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const CATEGORY_CFG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  auth:          { color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: Lock,          label: 'Auth'         },
  products:      { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Pencil,        label: 'Produtos'     },
  integrations:  { color: 'text-green-400',  bg: 'bg-green-500/10',  icon: Link,          label: 'Integrações'  },
  financial:     { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: CreditCard,    label: 'Financeiro'   },
  settings:      { color: 'text-slate-400',  bg: 'bg-slate-500/10',  icon: Settings,      label: 'Config.'      },
  admin:         { color: 'text-red-400',    bg: 'bg-red-500/10',    icon: Wrench,        label: 'Admin'        },
  support:       { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   icon: Headphones,    label: 'Suporte'      },
  error:         { color: 'text-red-400',    bg: 'bg-red-500/10',    icon: AlertTriangle, label: 'Erro'         },
  impersonation: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: UserCog,       label: 'Impersonação' },
}

const CATEGORIES = Object.keys(CATEGORY_CFG)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

const SEL =
  'px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none'

/* ── KPI Card ────────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | null; color: string }) {
  return (
    <div className="bg-[#111318] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</p>
        {value === null ? (
          <div className="h-5 w-12 shimmer-load rounded mt-0.5" />
        ) : (
          <p className="text-lg font-bold text-white">{value.toLocaleString('pt-BR')}</p>
        )}
      </div>
    </div>
  )
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminLogsPage() {
  useEffect(() => { document.title = 'Logs — Admin Foguetim' }, [])
  const [logs, setLogs]       = useState<ActivityLog[]>([])
  const [total, setTotal]     = useState<number | null>(null)
  const [stats, setStats]     = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [period, setPeriod]   = useState('')
  const [result, setResult]   = useState('')
  const [userId, setUserId]   = useState('')
  const [page, setPage]       = useState(1)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [users, setUsers]     = useState<SimpleUser[]>([])
  const LIMIT = 50
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load user list for filter dropdown
  useEffect(() => {
    fetch('/api/admin/users?limit=100')
      .then(r => r.json())
      .then(d => setUsers((d.users ?? []).map((u: SimpleUser) => ({ id: u.id, name: u.name, email: u.email }))))
      .catch(() => {})
  }, [])

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit:  String(LIMIT),
        offset: String((p - 1) * LIMIT),
        include_stats: '1',
      })
      if (s)        params.set('search', s)
      if (category) params.set('category', category)
      if (period)   params.set('period', period)
      if (result)   params.set('result', result)
      if (userId)   params.set('user_id', userId)

      const res = await fetch(`/api/admin/logs?${params}`)
      if (res.ok) {
        const d = await res.json() as { logs: ActivityLog[]; total: number; stats: LogStats | null }
        setLogs(d.logs ?? [])
        setTotal(d.total ?? 0)
        if (d.stats) setStats(d.stats)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, category, period, result, userId])

  useEffect(() => { load() }, [load])

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => load(1, v), 350)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPages = Math.ceil((total ?? 0) / LIMIT)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Logs do Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total === null ? (
              <span className="inline-block h-3.5 w-24 shimmer-load rounded align-middle" />
            ) : (
              <>{total.toLocaleString('pt-BR')} eventos registrados</>
            )}
          </p>
        </div>
        <button onClick={() => load()} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Activity}   label="Total 24h"  value={stats?.total_24h ?? null} color="bg-indigo-600" />
        <KpiCard icon={LogIn}      label="Logins"     value={stats?.logins ?? null}    color="bg-blue-600" />
        <KpiCard icon={UserPlus}   label="Cadastros"  value={stats?.signups ?? null}   color="bg-green-600" />
        <KpiCard icon={AlertCircle} label="Erros"     value={stats?.errors ?? null}    color="bg-red-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por descrição..."
            className="pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40 w-56"
          />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} className={SEL}>
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_CFG[c].label}</option>)}
        </select>
        <select value={userId} onChange={e => { setUserId(e.target.value); setPage(1) }} className={SEL}>
          <option value="">Todos os usuários</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>
        <select value={period} onChange={e => { setPeriod(e.target.value); setPage(1) }} className={SEL}>
          <option value="">Todos os períodos</option>
          <option value="1h">Última hora</option>
          <option value="6h">Últimas 6h</option>
          <option value="24h">Últimas 24h</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
        <select value={result} onChange={e => { setResult(e.target.value); setPage(1) }} className={SEL}>
          <option value="">Todos os resultados</option>
          <option value="success">Sucesso</option>
          <option value="error">Erro</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['', 'Evento', 'Usuário', 'Categoria', 'IP', 'Data'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 shimmer-load rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Nenhum log encontrado</p>
                </td>
              </tr>
            ) : logs.map(l => {
              const isOpen = expanded.has(l.id)
              const hasMeta = l.metadata && Object.keys(l.metadata).length > 0
              return (
                <React.Fragment key={l.id}>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    {/* Expand toggle */}
                    <td className="px-4 py-3 w-8">
                      {hasMeta ? (
                        <button onClick={() => toggleExpand(l.id)} className="text-slate-600 hover:text-slate-400 transition-colors">
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      ) : null}
                    </td>
                    {/* Evento */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-300 truncate">{l.description || l.action}</p>
                      {l.description && l.action !== l.description && (
                        <p className="text-[10px] text-slate-600 font-mono">{l.action}</p>
                      )}
                    </td>
                    {/* Usuário */}
                    <td className="px-4 py-3">
                      {l.user ? (
                        <>
                          <p className="text-xs font-semibold text-slate-300">{l.user.name || '—'}</p>
                          <p className="text-[10px] text-slate-600">{maskEmail(l.user.email)}</p>
                        </>
                      ) : (
                        <span className="text-xs text-slate-700">Sistema</span>
                      )}
                    </td>
                    {/* Categoria */}
                    <td className="px-4 py-3">
                      {(() => {
                        const cfg = CATEGORY_CFG[l.category]
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${cfg?.color ?? 'text-slate-500'} ${cfg?.bg ?? 'bg-slate-500/10'}`}>
                            {cfg?.icon && <cfg.icon className="w-3 h-3" />}
                            {cfg?.label ?? l.category}
                          </span>
                        )
                      })()}
                    </td>
                    {/* IP */}
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                      {l.ip_address || '—'}
                    </td>
                    {/* Data */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(l.created_at)}
                    </td>
                  </tr>
                  {/* Expanded metadata */}
                  {isOpen && hasMeta && (
                    <tr>
                      <td colSpan={6} className="px-8 py-3 bg-white/[0.01]">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Metadata (JSON)</p>
                        <pre className="text-xs text-slate-400 font-mono bg-[#0a0b14] rounded-lg p-3 overflow-x-auto max-h-48 border border-white/[0.04]">
                          {JSON.stringify(l.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total ?? 0)} de {(total ?? 0).toLocaleString('pt-BR')}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] disabled:opacity-30 transition-all">
              ‹ Anterior
            </button>
            <span className="px-3 py-1.5 text-xs text-slate-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] disabled:opacity-30 transition-all">
              Próximo ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
