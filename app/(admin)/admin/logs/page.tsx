'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Search, FileText } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ActivityLog {
  id:          string
  user_id:     string | null
  action:      string
  category:    string
  description: string
  visibility:  string
  ip_address:  string | null
  created_at:  string
  user:        { id: string; name: string; email: string } | null
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const CATEGORY_CFG: Record<string, { color: string; icon: string; label: string }> = {
  auth:          { color: 'text-blue-400',   icon: '🔐', label: 'Auth'         },
  products:      { color: 'text-orange-400', icon: '✏️',  label: 'Produtos'     },
  integrations:  { color: 'text-green-400',  icon: '🔗', label: 'Integrações'  },
  financial:     { color: 'text-purple-400', icon: '💳', label: 'Financeiro'   },
  settings:      { color: 'text-slate-400',  icon: '⚙️',  label: 'Config.'      },
  admin:         { color: 'text-red-400',    icon: '🔧', label: 'Admin'        },
  support:       { color: 'text-cyan-400',   icon: '🎧', label: 'Suporte'      },
  error:         { color: 'text-red-400',    icon: '⚠️',  label: 'Erro'         },
  impersonation: { color: 'text-yellow-400', icon: '👤', label: 'Impersonação' },
}

const CATEGORIES = Object.keys(CATEGORY_CFG)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminLogsPage() {
  const [logs, setLogs]       = useState<ActivityLog[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage]       = useState(1)
  const LIMIT = 50
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit:  String(LIMIT),
        offset: String((p - 1) * LIMIT),
      })
      if (s)        params.set('search', s)
      if (category) params.set('category', category)

      const res = await fetch(`/api/admin/logs?${params}`)
      if (res.ok) {
        const d = await res.json() as { logs: ActivityLog[]; total: number }
        setLogs(d.logs ?? [])
        setTotal(d.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, category])

  useEffect(() => { load() }, [load])

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => load(1, v), 350)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Logs do Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString('pt-BR')} eventos registrados</p>
        </div>
        <button onClick={() => load()} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
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
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none">
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(c => {
            const cfg = CATEGORY_CFG[c]
            return <option key={c} value={c}>{cfg.icon} {cfg.label}</option>
          })}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Evento', 'Usuário', 'Categoria', 'IP', 'Data'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Nenhum log encontrado</p>
                </td>
              </tr>
            ) : logs.map(l => (
              <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-xs text-slate-300 truncate">{l.description || l.action}</p>
                  {l.description && l.action !== l.description && (
                    <p className="text-[10px] text-slate-600 font-mono">{l.action}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {l.user ? (
                    <>
                      <p className="text-xs font-semibold text-slate-300">{l.user.name || '—'}</p>
                      <p className="text-[10px] text-slate-600">{l.user.email}</p>
                    </>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const cfg = CATEGORY_CFG[l.category]
                    return (
                      <span className={`text-xs font-medium ${cfg?.color ?? 'text-slate-500'}`}>
                        {cfg?.icon} {cfg?.label ?? l.category}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                  {l.ip_address || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {fmtDate(l.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total.toLocaleString('pt-BR')}
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
