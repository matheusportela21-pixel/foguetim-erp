/**
 * app/(public)/blog/categoria/[slug]/page.tsx
 * Server Component — Category archive with posts grid and pagination.
 * ISR: revalidates every hour.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Clock, ChevronRight, User, BookOpen } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import BlogLoadMore from '@/components/blog/BlogLoadMore'

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

interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  order_index: number
  post_count: number
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

/* ── Static params ──────────────────────────────────────────────────────── */
export async function generateStaticParams() {
  const slugs = [
    'ecommerce-marketplaces',
    'mercado-livre',
    'gestao-empreendedorismo',
    'financas-economia',
    'fiscal-tributario',
    'estoque-logistica',
    'marketing-digital',
    'setores-nichos',
    'novidades-foguetim',
    'ferramentas-tecnologia',
  ]
  return slugs.map(slug => ({ slug }))
}

/* ── generateMetadata ───────────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  try {
    const db = supabaseAdmin()
    const { data } = await db
      .from('blog_categories')
      .select('name, description')
      .eq('slug', params.slug)
      .maybeSingle()

    if (!data) return { title: 'Categoria | Blog Foguetim' }

    return {
      title: `${data.name} | Blog Foguetim`,
      description: data.description ?? `Artigos sobre ${data.name} no Blog do Foguetim ERP.`,
    }
  } catch {
    return { title: 'Blog Foguetim' }
  }
}

/* ── Data fetching ──────────────────────────────────────────────────────── */
async function getData(slug: string, sort: string) {
  const db = supabaseAdmin()

  const [catResult, postsResult] = await Promise.all([
    db
      .from('blog_categories')
      .select('id, name, slug, description, icon, color, order_index, post_count')
      .eq('slug', slug)
      .eq('is_visible', true)
      .maybeSingle(),

    db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, category, category_slug, author, published_at, reading_time_min, ' +
        'tags, cover_image_url, cover_image_alt, is_featured, views_count, likes_count, status, ' +
        'meta_title, meta_description, related_product, og_image_url'
      )
      .eq('status', 'published')
      .eq('category_slug', slug)
      .order(
        sort === 'popular' ? 'views_count' : 'published_at',
        { ascending: false }
      )
      .limit(12),
  ])

  return {
    category: (catResult.data ?? null) as unknown as BlogCategory | null,
    posts: (postsResult.data ?? []) as unknown as BlogPost[],
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { sort?: string }
}) {
  const sort = searchParams.sort ?? 'recent'
  const { category, posts } = await getData(params.slug, sort)

  if (!category) notFound()

  const gradCls = CATEGORY_COLORS[params.slug] ?? 'from-violet-400 to-violet-600'

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-violet-400 transition-colors">Início</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/blog" className="hover:text-violet-400 transition-colors">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-400 font-medium">{category.name}</span>
        </nav>

        {/* Category header */}
        <div className="glass-card rounded-2xl border border-white/10 p-8 mb-10 flex items-start gap-5">
          {category.icon ? (
            <span className="text-4xl shrink-0">{category.icon}</span>
          ) : (
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradCls} flex items-center justify-center shrink-0`}>
              <span className="text-white text-2xl font-black">
                {category.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              {category.name}
            </h1>
            {category.description && (
              <p className="text-slate-400 leading-relaxed max-w-2xl">{category.description}</p>
            )}
            <p className="text-sm text-slate-600 mt-2">
              {category.post_count} {category.post_count === 1 ? 'artigo' : 'artigos'}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-7">
          <span className="text-sm text-slate-500 font-medium">Ordenar por:</span>
          <Link
            href={`/blog/categoria/${params.slug}`}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              sort === 'recent'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:border-violet-500/30 hover:text-violet-400'
            }`}
          >
            Mais recentes
          </Link>
          <Link
            href={`/blog/categoria/${params.slug}?sort=popular`}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              sort === 'popular'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:border-violet-500/30 hover:text-violet-400'
            }`}
          >
            Mais lidos
          </Link>
        </div>

        {/* Posts grid */}
        {posts.length > 0 ? (
          <BlogLoadMore
            initialPosts={posts}
            categorySlug={params.slug}
            sort={sort}
          />
        ) : (
          <div className="text-center py-20 text-slate-600">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum artigo nesta categoria ainda.</p>
            <Link href="/blog" className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors">
              ← Voltar ao blog
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
