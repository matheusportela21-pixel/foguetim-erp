'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, FileText, ChevronRight, Loader2, XCircle } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────────────── */
interface SearchResult {
  id: string
  title: string
  slug: string
  summary: string | null
  tags: string[]
  views_count: number
  updated_at: string
  help_categories: {
    name: string
    slug: string
    color: string
    icon: string | null
  } | null
}

/* ── Color map ──────────────────────────────────────────────────────────── */
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  green:   { bg: 'bg-green-100',   text: 'text-green-700'   },
  red:     { bg: 'bg-red-100',     text: 'text-red-700'     },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-700'  },
  slate:   { bg: 'bg-slate-100',   text: 'text-slate-700'   },
}

function getColor(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.slate
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-100 text-yellow-800 rounded px-0.5">$1</mark>')
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(false)
    try {
      const res = await fetch(`/api/help/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [])

  // Search on mount if there's an initial query
  useEffect(() => {
    if (initialQ.trim()) {
      doSearch(initialQ)
    }
    inputRef.current?.focus()
  }, [initialQ, doSearch])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.replace(`/ajuda/busca?q=${encodeURIComponent(q)}`)
    doSearch(q)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setSearched(false)
    router.replace('/ajuda/busca')
    inputRef.current?.focus()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/ajuda" className="hover:text-gray-900 transition-colors">Central de Ajuda</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Busca</span>
      </nav>

      {/* Search bar */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Buscar artigos</h1>
      <form onSubmit={handleSubmit} className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Digite sua dúvida ou palavra-chave..."
          className="w-full pl-12 pr-28 py-4 text-base bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Buscando...</span>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {results.length === 0
              ? `Nenhum resultado para "${initialQ || query}"`
              : `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${initialQ || query}"`}
          </p>

          {results.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-500 mb-2">
                Não encontramos resultados
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Tente palavras diferentes ou navegue pelas categorias.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/ajuda"
                  className="text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
                >
                  ← Ver todas as categorias
                </Link>
                <span className="text-gray-300 hidden sm:block">|</span>
                <Link
                  href="/contato"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Falar com suporte →
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {results.map(article => {
                const cat = article.help_categories
                const colors = getColor(cat?.color ?? 'slate')
                const q = initialQ || query

                return (
                  <li key={article.id}>
                    <Link
                      href={`/ajuda/${cat?.slug ?? 'geral'}/${article.slug}`}
                      className="group flex flex-col gap-2 p-5 bg-white rounded-xl border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all duration-200"
                    >
                      {cat && (
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full w-fit ${colors.bg} ${colors.text}`}>
                          {cat.name}
                        </span>
                      )}
                      <h2
                        className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors"
                        dangerouslySetInnerHTML={{ __html: highlightText(article.title, q) }}
                      />
                      {article.summary && (
                        <p
                          className="text-sm text-gray-500 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: highlightText(article.summary, q) }}
                        />
                      )}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {article.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {/* Initial state */}
      {!loading && !searched && !initialQ && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">Digite algo acima para começar a busca.</p>
          <Link href="/ajuda" className="inline-block mt-4 text-sm text-violet-600 hover:text-violet-800">
            Ou navegue pelas categorias →
          </Link>
        </div>
      )}
    </div>
  )
}
