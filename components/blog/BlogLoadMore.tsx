'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, User, Loader2 } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string | null
  category: string
  category_slug: string | null
  reading_time_min: number | null
  views_count: number
  likes_count: number
  author: string
  published_at: string
  cover_image_url: string | null
  cover_image_alt: string | null
  tags: string[] | null
  status: string
  is_featured: boolean
  meta_title: string | null
  meta_description: string | null
  related_product: string | null
  og_image_url: string | null
}

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

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function CoverImage({ post, className }: { post: BlogPost; className?: string }) {
  const grad = CATEGORY_COLORS[post.category_slug ?? ''] ?? 'from-violet-400 to-violet-600'
  if (post.cover_image_url) {
    return (
      <img
        src={post.cover_image_url}
        alt={post.cover_image_alt ?? post.title}
        className={className}
      />
    )
  }
  return (
    <div className={`bg-gradient-to-br ${grad} flex items-center justify-center ${className ?? ''}`}>
      <span className="text-white/30 text-6xl font-black select-none">
        {post.category_slug?.charAt(0).toUpperCase() ?? 'F'}
      </span>
    </div>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  const catCls = CATEGORY_TEXT_COLORS[post.category_slug ?? ''] ?? 'bg-violet-500/10 text-violet-400'
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group glass-card rounded-2xl hover:border-violet-500/20 transition-all duration-200 border border-white/5 overflow-hidden flex flex-col"
    >
      <div className="relative overflow-hidden h-48">
        <CoverImage
          post={post}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-5 flex flex-col flex-1 gap-3">
        <span className={`inline-block self-start text-xs font-semibold px-2.5 py-1 rounded-full ${catCls}`}>
          {post.category}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-100 leading-snug line-clamp-2 group-hover:text-violet-400 transition-colors text-base">
            {post.title}
          </h3>
          {post.summary && (
            <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{post.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 pt-3 border-t border-white/5">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {post.author}
          </span>
          <span>{fmtDateShort(post.published_at)}</span>
          {post.reading_time_min && (
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              {post.reading_time_min} min
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

interface BlogLoadMoreProps {
  initialPosts: BlogPost[]
  categorySlug: string
  sort: string
}

export default function BlogLoadMore({ initialPosts, categorySlug, sort }: BlogLoadMoreProps) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length === 12)

  async function loadMore() {
    if (loading) return
    setLoading(true)

    try {
      const sortParam = sort === 'popular' ? 'views_count' : 'published_at'
      const url = `/api/blog/posts?category=${encodeURIComponent(categorySlug)}&limit=12&offset=${posts.length}&sort=${sortParam}`
      const res = await fetch(url)
      const data = (await res.json()) as { posts: BlogPost[]; hasMore: boolean }

      setPosts(prev => [...prev, ...(data.posts ?? [])])
      setHasMore(data.hasMore ?? false)
    } catch {
      // best-effort
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-400 hover:border-violet-500/30 hover:text-violet-400 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Carregando...' : 'Carregar mais artigos'}
          </button>
        </div>
      )}
    </>
  )
}
