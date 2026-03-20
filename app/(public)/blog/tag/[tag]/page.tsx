/**
 * app/(public)/blog/tag/[tag]/page.tsx
 * Server Component — Tag archive page.
 * ISR: revalidates every hour.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronRight, Clock, User, BookOpen, Hash } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 3600

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
  'ecommerce-marketplaces':  'bg-amber-100 text-amber-700',
  'mercado-livre':           'bg-yellow-100 text-yellow-700',
  'gestao-empreendedorismo': 'bg-blue-100 text-blue-700',
  'financas-economia':       'bg-green-100 text-green-700',
  'fiscal-tributario':       'bg-red-100 text-red-700',
  'estoque-logistica':       'bg-emerald-100 text-emerald-700',
  'marketing-digital':       'bg-pink-100 text-pink-700',
  'setores-nichos':          'bg-purple-100 text-purple-700',
  'novidades-foguetim':      'bg-violet-100 text-violet-700',
  'ferramentas-tecnologia':  'bg-cyan-100 text-cyan-700',
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/* ── CoverImage ─────────────────────────────────────────────────────────── */
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

/* ── PostCard ───────────────────────────────────────────────────────────── */
function PostCard({ post }: { post: BlogPost }) {
  const catCls = CATEGORY_TEXT_COLORS[post.category_slug ?? ''] ?? 'bg-violet-100 text-violet-700'
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden flex flex-col"
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
          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors text-base">
            {post.title}
          </h3>
          {post.summary && (
            <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{post.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 pt-3 border-t border-gray-100">
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

/* ── generateMetadata ───────────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: { tag: string }
}): Promise<Metadata> {
  const tag = decodeURIComponent(params.tag)
  return {
    title: `#${tag} | Blog Foguetim`,
    description: `Artigos com a tag "${tag}" no Blog do Foguetim ERP.`,
  }
}

/* ── Data fetching ──────────────────────────────────────────────────────── */
async function getData(tag: string): Promise<BlogPost[]> {
  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, category, category_slug, author, published_at, reading_time_min, ' +
        'tags, cover_image_url, cover_image_alt, is_featured, views_count, likes_count, status, ' +
        'meta_title, meta_description, related_product, og_image_url'
      )
      .eq('status', 'published')
      .contains('tags', [tag.toLowerCase()])
      .order('published_at', { ascending: false })
      .limit(24)

    if (error) return []
    return (data ?? []) as unknown as BlogPost[]
  } catch {
    return []
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag)
  const posts = await getData(tag)

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-gray-600 transition-colors">Início</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600 font-medium">#{tag}</span>
        </nav>

        {/* Tag header */}
        <div className="mb-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Hash className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h1
              className="text-3xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              #{tag}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {posts.length} {posts.length === 1 ? 'artigo' : 'artigos'} com esta tag
            </p>
          </div>
        </div>

        {/* Posts grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold text-gray-600 mb-1">
              Nenhum artigo com a tag <span className="text-violet-600">#{tag}</span>.
            </p>
            <p className="text-sm text-gray-400 mb-6">Tente explorar outras tags ou categorias.</p>
            <Link
              href="/blog"
              className="inline-block text-sm font-medium text-violet-600 hover:text-violet-700 px-5 py-2.5 rounded-xl border border-violet-200 hover:border-violet-300 transition-colors"
            >
              ← Voltar ao blog
            </Link>
          </div>
        )}

        {/* Related tags from posts */}
        {posts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Tags relacionadas
            </h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Set(
                  posts
                    .flatMap(p => p.tags ?? [])
                    .filter(t => t.toLowerCase() !== tag.toLowerCase())
                ),
              )
                .slice(0, 20)
                .map(t => (
                  <Link
                    key={t}
                    href={`/blog/tag/${encodeURIComponent(t)}`}
                    className="text-sm text-gray-600 hover:text-violet-600 bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-200 px-3 py-1.5 rounded-full transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
