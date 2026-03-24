/**
 * app/(public)/blog/busca/page.tsx
 * Client Component — Blog search page with real-time results.
 */
'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Clock, User, Loader2, BookOpen, ChevronRight } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────────────── */
interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string | null
  category: string
  category_slug: string | null
  reading_time_min: number | null
  views_count: number
  author: string
  published_at: string
  cover_image_url: string | null
  cover_image_alt: string | null
  tags: string[] | null
}

/* ── Design constants ───────────────────────────────────────────────────── */
const CATEGORY_COLORS: Record<string, string> = {
  'ecommerce-marketplaces':  'from-amber-400 to-amber-600',
  'mercado-livre':           'from-yellow-400 to-yellow-600',
  'gestao-empreendedorismo': 'from-blue-400 to-blue-600',
  'financas-economia':       'from-green-400 to-green-600',
  'fiscal-tributario':       'from-red-400 to-red-600',
  'estoque-logistica':       'from-emerald-400 to-emerald-600',
  'marketing-digital':       'from-pink-400 to-pink-600',
  'setores-nichos':          'from-purple-400 to-purple-600',
  'novidades-foguetim':      'from-violet-400 to-violet-600',
  'ferramentas-tecnologia':  'from-cyan-400 to-cyan-600',
}

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  'ecommerce-marketplaces':  'bg-amber-500/10 text-amber-400',
  'mercado-livre':           'bg-yellow-500/10 text-yellow-400',
  'gestao-empreendedorismo': 'bg-blue-500/10 text-blue-400',
  'financas-economia':       'bg-green-500/10 text-green-400',
  'fiscal-tributario':       'bg-red-500/10 text-red-400',
  'estoque-logistica':       'bg-emerald-500/10 text-emerald-400',
  'marketing-digital':       'bg-pink-500/10 text-pink-400',
  'setores-nichos':          'bg-purple-500/10 text-purple-400',
  'novidades-foguetim':      'bg-violet-500/10 text-violet-400',
  'ferramentas-tecnologia':  'bg-cyan-500/10 text-cyan-400',
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-violet-500/20 text-violet-300 rounded px-0.5 font-semibold not-italic">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass-card rounded-2xl border border-white/5 p-5 flex gap-4">
          <div className="w-20 h-20 rounded-xl bg-white/5 shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-3 bg-white/5 rounded w-1/4" />
            <div className="h-4 bg-white/5 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Result card ─────────────────────────────────────────────────────────── */
function ResultCard({ post, query }: { post: BlogPost; query: string }) {
  const grad = CATEGORY_COLORS[post.category_slug ?? ''] ?? 'from-violet-400 to-violet-600'
  const catCls = CATEGORY_TEXT_COLORS[post.category_slug ?? ''] ?? 'bg-violet-500/10 text-violet-400'

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group glass-card rounded-2xl border border-white/5 p-5 flex gap-4 hover:border-violet-500/20 transition-all"
    >
      {/* Mini cover */}
      <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${grad} shrink-0 overflow-hidden`}>
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${catCls}`}>
            {post.category}
          </span>
        </div>

        <h3 className="font-semibold text-slate-100 group-hover:text-violet-400 transition-colors leading-snug line-clamp-2 text-sm">
          {highlight(post.title, query)}
        </h3>

        {post.summary && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {highlight(post.summary, query)}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {post.author}
          </span>
          <span>{fmtDateShort(post.published_at)}</span>
          {post.reading_time_min && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.reading_time_min} min
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
function BlogSearchContent() {
  const searchParamsHook = useSearchParams()
  const router = useRouter()
  const initialQ = searchParamsHook.get('q') ?? ''

  const [inputValue, setInputValue] = useState(initialQ)
  const [query, setQuery] = useState(initialQ)
  const [results, setResults] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      const res = await fetch(`/api/blog/search?q=${encodeURIComponent(q.trim())}`)
      const data = (await res.json()) as { results: BlogPost[]; query: string }
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [])

  // Run search on mount if we have an initial query
  useEffect(() => {
    if (initialQ) {
      doSearch(initialQ)
    }
    inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(val)
      doSearch(val)
      // Update URL without navigation
      const url = val.trim() ? `/blog/busca?q=${encodeURIComponent(val.trim())}` : '/blog/busca'
      router.replace(url, { scroll: false })
    }, 400)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setQuery(inputValue)
    doSearch(inputValue)
    if (inputValue.trim()) {
      router.replace(`/blog/busca?q=${encodeURIComponent(inputValue.trim())}`, { scroll: false })
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-violet-400 transition-colors">Início</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/blog" className="hover:text-violet-400 transition-colors">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-400 font-medium">Busca</span>
        </nav>

        {/* Search header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-white mb-6"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Buscar no blog
          </h1>

          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={inputValue}
              onChange={handleChange}
              placeholder="Buscar artigos, categorias, dicas..."
              className="w-full pl-12 pr-4 py-4 text-base bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all text-slate-100 placeholder-slate-600"
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400 animate-spin" />
            )}
          </form>
        </div>

        {/* States */}
        {loading && !results.length && <Skeleton />}

        {!loading && searched && results.length > 0 && (
          <>
            <p className="text-sm text-slate-500 mb-5">
              {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para{' '}
              <span className="font-semibold text-slate-300">"{query}"</span>
            </p>
            <div className="space-y-4">
              {results.map(post => (
                <ResultCard key={post.id} post={post} query={query} />
              ))}
            </div>
          </>
        )}

        {!loading && searched && results.length === 0 && query.trim().length >= 2 && (
          <div className="text-center py-20">
            <BookOpen className="w-14 h-14 mx-auto mb-4 text-slate-700" />
            <p className="text-lg font-semibold text-slate-300 mb-1">
              Nenhum resultado para{' '}
              <span className="text-violet-400">"{query}"</span>
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Tente outros termos ou navegue pelas categorias.
            </p>
            <Link
              href="/blog"
              className="inline-block text-sm font-medium text-violet-400 hover:text-violet-300 px-5 py-2.5 rounded-xl border border-violet-500/20 hover:border-violet-500/40 transition-colors"
            >
              ← Ver todos os artigos
            </Link>
          </div>
        )}

        {!loading && !searched && !inputValue && (
          <div className="text-center py-20 text-slate-600">
            <Search className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">Digite para buscar artigos no blog.</p>
            <p className="text-sm mt-1">Mínimo 2 caracteres.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BlogSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0718] flex items-center justify-center text-slate-500">Carregando...</div>}>
      <BlogSearchContent />
    </Suspense>
  )
}
