/**
 * app/(public)/blog/page.tsx
 * Server Component — Blog home with featured post, post grid, sidebar.
 * ISR: revalidates every hour.
 */
import Link from 'next/link'
import { Clock, Eye, User, ChevronRight, ArrowRight, BookOpen } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const revalidate = 3600

export const metadata = {
  title: 'Blog | Foguetim ERP',
  description: 'Conteúdo para vendedores online: estratégias de e-commerce, Mercado Livre, gestão e muito mais.',
}

/* ── Types ─────────────────────────────────────────────────────────────── */
interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string | null
  meta_title: string | null
  meta_description: string | null
  tags: string[] | null
  category: string
  category_slug: string | null
  reading_time_min: number | null
  status: string
  is_featured: boolean
  views_count: number
  likes_count: number
  author: string
  published_at: string
  related_product: string | null
  cover_image_url: string | null
  cover_image_alt: string | null
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

const CATEGORY_DOT_COLORS: Record<string, string> = {
  'ecommerce-marketplaces':  'bg-amber-500',
  'mercado-livre':           'bg-yellow-500',
  'gestao-empreendedorismo': 'bg-blue-500',
  'financas-economia':       'bg-green-500',
  'fiscal-tributario':       'bg-red-500',
  'estoque-logistica':       'bg-emerald-500',
  'marketing-digital':       'bg-pink-500',
  'setores-nichos':          'bg-purple-500',
  'novidades-foguetim':      'bg-violet-500',
  'ferramentas-tecnologia':  'bg-cyan-500',
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/* ── CoverImage helper ──────────────────────────────────────────────────── */
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

/* ── CategoryBadge ──────────────────────────────────────────────────────── */
function CategoryBadge({ post }: { post: BlogPost }) {
  const cls = CATEGORY_TEXT_COLORS[post.category_slug ?? ''] ?? 'bg-violet-100 text-violet-700'
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {post.category}
    </span>
  )
}

/* ── PostCard ───────────────────────────────────────────────────────────── */
function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden flex flex-col"
    >
      {/* Cover */}
      <div className="relative overflow-hidden h-48">
        <CoverImage
          post={post}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <CategoryBadge post={post} />

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors text-base">
            {post.title}
          </h3>
          {post.summary && (
            <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
              {post.summary}
            </p>
          )}
        </div>

        {/* Meta */}
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

/* ── PromoBanner ────────────────────────────────────────────────────────── */
function PromoBanner() {
  return (
    <div className="col-span-full bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <span className="text-3xl shrink-0">🚀</span>
      <div className="flex-1">
        <p className="font-bold text-lg leading-tight">Foguetim ERP</p>
        <p className="text-violet-200 text-sm mt-1">
          Controle pedidos, estoque e anúncios do Mercado Livre num só lugar.
        </p>
      </div>
      <Link
        href="https://app.foguetim.com.br/cadastro"
        className="shrink-0 inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-colors"
      >
        Começar grátis
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

/* ── Data fetching ──────────────────────────────────────────────────────── */
async function getData() {
  const db = supabaseAdmin()

  const [postsResult, featuredResult, popularResult, catsResult] = await Promise.all([
    db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, category, category_slug, author, published_at, reading_time_min, ' +
        'tags, cover_image_url, cover_image_alt, is_featured, views_count, likes_count, status, ' +
        'meta_title, meta_description, related_product, og_image_url'
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(9),

    db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, category, category_slug, author, published_at, reading_time_min, ' +
        'tags, cover_image_url, cover_image_alt, is_featured, views_count, likes_count, status, ' +
        'meta_title, meta_description, related_product, og_image_url'
      )
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    db
      .from('blog_posts')
      .select('id, title, slug, category, category_slug, reading_time_min, views_count, published_at')
      .eq('status', 'published')
      .order('views_count', { ascending: false })
      .limit(5),

    db
      .from('blog_categories')
      .select('id, name, slug, description, icon, color, order_index, post_count')
      .eq('is_visible', true)
      .order('order_index', { ascending: true }),
  ])

  return {
    posts: (postsResult.data ?? []) as unknown as BlogPost[],
    featured: (featuredResult.data ?? null) as unknown as BlogPost | null,
    popular: (popularResult.data ?? []) as unknown as Pick<BlogPost, 'id' | 'title' | 'slug' | 'category' | 'category_slug' | 'reading_time_min' | 'views_count' | 'published_at'>[],
    categories: (catsResult.data ?? []) as unknown as BlogCategory[],
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function BlogPage() {
  const { posts, featured, popular, categories } = await getData()

  // Exclude featured from grid to avoid duplication
  const gridPosts = featured
    ? posts.filter(p => p.slug !== featured.slug)
    : posts

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600 transition-colors">Início</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600 font-medium">Blog</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">

          {/* ── Left: Main content ──────────────────────────────────────── */}
          <div>
            {/* Featured hero */}
            {featured && (
              <section className="mb-10">
                <Link href={`/blog/${featured.slug}`} className="group block">
                  <div className="relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row h-auto md:h-80">
                    {/* Cover — left 55% */}
                    <div className="relative md:w-[55%] h-56 md:h-full overflow-hidden">
                      <CoverImage
                        post={featured}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
                    </div>

                    {/* Content — right 45% */}
                    <div className="flex flex-col justify-center p-7 md:w-[45%] gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block text-xs font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                          Destaque
                        </span>
                        <CategoryBadge post={featured} />
                      </div>

                      <h2
                        className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight group-hover:text-violet-600 transition-colors"
                        style={{ fontFamily: 'var(--font-playfair)' }}
                      >
                        {featured.title}
                      </h2>

                      {featured.summary && (
                        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                          {featured.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {featured.author}
                        </span>
                        <span>{fmtDate(featured.published_at)}</span>
                        {featured.reading_time_min && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {featured.reading_time_min} min
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 group-hover:gap-2.5 transition-all">
                        Ler artigo
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Posts grid */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-playfair)' }}>
                  Posts Recentes
                </h2>
                <Link href="/blog/busca" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                  Ver todos →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {gridPosts.map((post, idx) => (
                  <>
                    <PostCard key={post.id} post={post} />
                    {/* Promo banner after every 3 posts */}
                    {(idx + 1) % 3 === 0 && idx < gridPosts.length - 1 && (
                      <PromoBanner key={`promo-${idx}`} />
                    )}
                  </>
                ))}

                {gridPosts.length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Nenhum post publicado ainda.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Right: Sidebar ──────────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-6">

              {/* Categories */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Categorias</h3>
                <ul className="space-y-2.5">
                  {categories.map(cat => (
                    <li key={cat.id}>
                      <Link
                        href={`/blog/categoria/${cat.slug}`}
                        className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-violet-600 transition-colors group"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_DOT_COLORS[cat.slug] ?? 'bg-violet-400'}`}
                        />
                        <span className="flex-1 group-hover:translate-x-0.5 transition-transform">{cat.name}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{cat.post_count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Popular posts */}
              {popular.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Mais lidos</h3>
                  <ol className="space-y-4">
                    {popular.map((post, i) => (
                      <li key={post.id} className="flex gap-3">
                        <span className="text-2xl font-black text-gray-100 tabular-nums leading-none w-6 shrink-0 select-none">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="text-sm font-medium text-gray-800 hover:text-violet-600 transition-colors leading-snug line-clamp-2"
                          >
                            {post.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <Eye className="w-3 h-3" />
                            <span>{post.views_count.toLocaleString('pt-BR')} views</span>
                            {post.reading_time_min && (
                              <>
                                <span>·</span>
                                <span>{post.reading_time_min} min</span>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* CTA Banner */}
              <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 text-white">
                <span className="text-2xl mb-2 block">🚀</span>
                <h3 className="font-bold text-base mb-1">Foguetim ERP</h3>
                <p className="text-violet-200 text-sm mb-4 leading-relaxed">
                  Gerencie seu e-commerce com inteligência. Integração completa com Mercado Livre.
                </p>
                <Link
                  href="https://app.foguetim.com.br/cadastro"
                  className="inline-block w-full text-center bg-white text-violet-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-sm"
                >
                  Começar grátis →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
