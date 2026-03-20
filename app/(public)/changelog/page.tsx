'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles, Wrench, TrendingUp, Shield, Filter,
  ChevronDown, ChevronUp, Rocket, Loader2,
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

const CATEGORIES = [
  { value: '',            label: 'Todos',      icon: Filter,     bg: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'   },
  { value: 'feature',     label: 'Feature',    icon: Sparkles,   bg: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500'  },
  { value: 'fix',         label: 'Correção',   icon: Wrench,     bg: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'    },
  { value: 'improvement', label: 'Melhoria',   icon: TrendingUp, bg: 'bg-green-100 text-green-700',   dot: 'bg-green-500'   },
  { value: 'security',    label: 'Segurança',  icon: Shield,     bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500'     },
]

const CAT_MAP: Record<string, { bg: string; dot: string; label: string; icon: React.ElementType }> = {
  feature:     { bg: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500',  label: 'Feature',   icon: Sparkles   },
  fix:         { bg: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',    label: 'Correção',  icon: Wrench     },
  improvement: { bg: 'bg-green-100 text-green-700',   dot: 'bg-green-500',   label: 'Melhoria',  icon: TrendingUp },
  security:    { bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500',     label: 'Segurança', icon: Shield     },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

function groupByVersion(entries: ChangelogEntry[]) {
  const map: Record<string, ChangelogEntry[]> = {}
  for (const e of entries) {
    if (!map[e.version]) map[e.version] = []
    map[e.version].push(e)
  }
  return map
}

export default function ChangelogPublicPage() {
  const [entries,    setEntries]    = useState<ChangelogEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [category,   setCategory]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [total,      setTotal]      = useState(0)
  const [offset,     setOffset]     = useState(0)
  const LIMIT = 30

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
    if (category) p.set('category', category)
    fetch(`/api/changelog?${p}`)
      .then(r => r.json())
      .then((d: { entries?: ChangelogEntry[]; total?: number }) => {
        setEntries(d.entries ?? [])
        setTotal(d.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category, offset])

  const grouped  = groupByVersion(entries)
  const versions = Object.keys(grouped).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim <span className="text-gray-400 font-normal text-sm">ERP</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/ajuda" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">Central de Ajuda</Link>
            <Link href="/login" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white border-b border-gray-100 py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Novidades da plataforma
          </span>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Changelog
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Acompanhe as melhorias, correções e novidades do Foguetim ERP.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = category === cat.value
            return (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setOffset(0) }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  active
                    ? `${cat.bg} border-transparent shadow-sm`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Carregando...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma entrada encontrada.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-200 hidden sm:block" />

            <div className="space-y-10">
              {versions.map(version => {
                const vEntries = grouped[version]
                const firstDate = vEntries[0]?.published_at
                return (
                  <div key={version} className="sm:pl-8 relative">
                    {/* Version dot */}
                    <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-indigo-600 border-4 border-gray-50 hidden sm:flex items-center justify-center" />

                    {/* Version header */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-lg font-bold text-gray-900 font-mono">v{version}</span>
                      {firstDate && (
                        <span className="text-sm text-gray-400">{fmtDate(firstDate)}</span>
                      )}
                    </div>

                    {/* Entries */}
                    <div className="space-y-3">
                      {vEntries.map(entry => {
                        const cfg = CAT_MAP[entry.category] ?? CAT_MAP.feature
                        const Icon = cfg.icon
                        const isExpanded = expandedId === entry.id
                        return (
                          <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              className="w-full flex items-start gap-3 p-4 text-left"
                            >
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${cfg.bg}`}>
                                <Icon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm leading-snug">{entry.title}</p>
                                <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{entry.description}</p>
                              </div>
                              {entry.details && (
                                <div className="shrink-0 text-gray-400 mt-0.5">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              )}
                            </button>
                            {isExpanded && entry.details && (
                              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{entry.details}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Load more */}
            {entries.length < total && (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setOffset(o => o + LIMIT)}
                  className="px-6 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© {new Date().getFullYear()} Foguetim ERP. Todos os direitos reservados.</span>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-gray-900 transition-colors">Início</Link>
            <Link href="/ajuda" className="hover:text-gray-900 transition-colors">Ajuda</Link>
            <Link href="/planos" className="hover:text-gray-900 transition-colors">Planos</Link>
            <Link href="/contato" className="hover:text-gray-900 transition-colors">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
