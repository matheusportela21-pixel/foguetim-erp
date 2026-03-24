'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles, Wrench, TrendingUp, Shield,
  ChevronDown, Loader2, ArrowLeft, Filter,
} from 'lucide-react'

interface ChangelogEntry {
  id:           string
  version:      string
  title:        string
  description:  string
  details:      string | null
  category:     'feature' | 'fix' | 'improvement' | 'security'
  published_at: string
}

const CATEGORIES: { value: string; label: string; icon: React.ElementType; color: string }[] = [
  { value: '',            label: 'Todos',      icon: Filter,     color: 'text-slate-400 bg-slate-500/10'  },
  { value: 'feature',     label: 'Features',   icon: Sparkles,   color: 'text-purple-400 bg-purple-500/10'},
  { value: 'fix',         label: 'Correções',  icon: Wrench,     color: 'text-blue-400 bg-blue-500/10'   },
  { value: 'improvement', label: 'Melhorias',  icon: TrendingUp, color: 'text-green-400 bg-green-500/10' },
  { value: 'security',    label: 'Segurança',  icon: Shield,     color: 'text-red-400 bg-red-500/10'     },
]

const CAT_CFG: Record<string, { icon: React.ElementType; color: string; label: string; dot: string }> = {
  feature:     { icon: Sparkles,   color: 'text-purple-400 bg-purple-500/10', label: 'Feature',   dot: 'bg-purple-400'  },
  fix:         { icon: Wrench,     color: 'text-blue-400 bg-blue-500/10',     label: 'Correção',  dot: 'bg-blue-400'    },
  improvement: { icon: TrendingUp, color: 'text-green-400 bg-green-500/10',   label: 'Melhoria',  dot: 'bg-green-400'   },
  security:    { icon: Shield,     color: 'text-red-400 bg-red-500/10',       label: 'Segurança', dot: 'bg-red-400'     },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

/* Group entries by version */
function groupByVersion(entries: ChangelogEntry[]) {
  const map: Record<string, ChangelogEntry[]> = {}
  for (const e of entries) {
    if (!map[e.version]) map[e.version] = []
    map[e.version].push(e)
  }
  return map
}

export default function ChangelogPage() {
  const [entries,    setEntries]    = useState<ChangelogEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [category,   setCategory]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [offset,     setOffset]     = useState(0)
  const [total,      setTotal]      = useState(0)
  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
    if (category) params.set('category', category)
    fetch(`/api/changelog?${params}`)
      .then(r => r.json())
      .then((d: { entries?: ChangelogEntry[]; total?: number }) => {
        setEntries(d.entries ?? [])
        setTotal(d.total ?? 0)
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false))
  }, [category, offset])

  const grouped = groupByVersion(entries)
  const versions = Object.keys(grouped).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Notas de Atualização
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Histórico completo de atualizações do Foguetim ERP</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const active = category === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setOffset(0) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                active
                  ? `${cat.color} ring-1 ring-current/30`
                  : 'text-slate-500 bg-white/[0.04] hover:bg-white/[0.07] hover:text-slate-300'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </div>
      ) : entries.length === 0 ? (
        <div className="dash-card p-8 rounded-2xl text-center">
          <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhuma atualização encontrada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {versions.map(version => (
            <div key={version} className="relative pl-6">
              {/* Version marker */}
              <div className="flex items-center gap-3 mb-3">
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-purple-500 ring-2 ring-purple-500/20" />
                <span className="text-sm font-bold font-mono text-purple-400">v{version}</span>
                {grouped[version][0] && (
                  <span className="text-xs text-slate-600">
                    {fmtDate(grouped[version][0].published_at)}
                  </span>
                )}
              </div>

              {/* Entries for this version */}
              <div className="dash-card rounded-xl overflow-hidden border-l-2 border-purple-500/20">
                {grouped[version].map((e, idx) => {
                  const cfg       = CAT_CFG[e.category] ?? CAT_CFG.feature
                  const Icon      = cfg.icon
                  const isExpanded = expandedId === e.id

                  return (
                    <div key={e.id} className={idx > 0 ? 'border-t border-white/[0.04]' : ''}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : e.id)}
                        className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <p className="text-sm font-semibold text-white">{e.title}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{e.description}</p>
                          {isExpanded && e.details && (
                            <p className="text-xs text-slate-400 mt-2.5 p-3 bg-white/[0.03] rounded-lg leading-relaxed border border-white/[0.06]">
                              {e.details}
                            </p>
                          )}
                        </div>
                        {e.details && (
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-600 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > LIMIT && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-600">
            {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
          </span>
          <button
            onClick={() => setOffset(offset + LIMIT)}
            disabled={offset + LIMIT >= total}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  )
}
