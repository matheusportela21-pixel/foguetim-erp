'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import {
  fetchActivityLogs,
  CATEGORY_CONFIG,
  type ActivityLog,
  type LogCategory,
} from '@/lib/activity-log'

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'Agora'
  if (m < 60)  return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d atrás`
  return formatDate(iso)
}

/* ── Category filter options ────────────────────────────────────────────────── */

const FILTER_OPTIONS: { value: LogCategory | 'all'; label: string }[] = [
  { value: 'all',           label: 'Todas'         },
  { value: 'auth',          label: 'Autenticação'   },
  { value: 'account',       label: 'Conta'          },
  { value: 'company',       label: 'Empresa'        },
  { value: 'notifications', label: 'Notificações'   },
  { value: 'products',      label: 'Produtos'       },
  { value: 'orders',        label: 'Pedidos'        },
  { value: 'security',      label: 'Segurança'      },
  { value: 'billing',       label: 'Assinatura'     },
  { value: 'system',        label: 'Sistema'        },
]

const PAGE_SIZE = 20

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function HistoricoSection() {
  const [logs, setLogs]           = useState<ActivityLog[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(0)
  const [loading, setLoading]     = useState(true)
  const [category, setCategory]   = useState<LogCategory | 'all'>('all')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchActivityLogs({
      category,
      limit:  PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
    setLogs(result.logs)
    setTotal(result.total)
    setLoading(false)
  }, [category, page, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load() }, [load])

  // Reset page when filter changes
  const handleCategoryChange = (val: LogCategory | 'all') => {
    setCategory(val)
    setPage(0)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start      = page * PAGE_SIZE + 1
  const end        = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Histórico de Atividades
        </h3>
        <p className="text-xs text-slate-600">Registro de todas as ações realizadas na sua conta</p>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleCategoryChange(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  category === opt.value
                    ? 'bg-purple-600/30 text-purple-300 ring-1 ring-purple-600/50'
                    : 'bg-dark-700 text-slate-500 hover:text-slate-300 hover:bg-dark-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Refresh */}
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* ── Log list ── */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-dark-700 flex items-center justify-center">
            <History className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">Nenhuma atividade encontrada</p>
            <p className="text-xs text-slate-600 mt-1">
              {category !== 'all'
                ? 'Tente outro filtro de categoria.'
                : 'As ações que você realizar aparecerão aqui.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Count info */}
          <p className="text-xs text-slate-600">
            Exibindo {start}–{end} de {total} registros
          </p>

          {/* Table */}
          <div className="dash-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider w-44">
                      Data / Hora
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider w-28">
                      Categoria
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Descrição
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {logs.map(log => {
                    const cat = CATEGORY_CONFIG[log.category] ?? CATEGORY_CONFIG.system
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-xs text-slate-400 font-medium">
                            {formatDate(log.created_at)}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {relativeTime(log.created_at)}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cat.cls}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-slate-300">{log.description}</p>
                          {Object.keys(log.metadata ?? {}).length > 0 && (
                            <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                              {JSON.stringify(log.metadata)}
                            </p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 border border-white/[0.06] hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>

              <span className="text-xs text-slate-600">
                Página {page + 1} de {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 border border-white/[0.06] hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Próxima <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
