/**
 * app/(public)/blog/[slug]/page.tsx
 * Server Component — Individual blog post page with full markdown rendering,
 * table of contents, sidebar, share buttons, feedback, JSON-LD and SEO.
 * ISR: revalidates every hour.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Clock, Eye, User, ChevronRight, Tag, ArrowLeft, ArrowRight } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { BlogShareButtons } from '@/components/blog/BlogShareButtons'
import { BlogFeedback } from '@/components/blog/BlogFeedback'

export const revalidate = 3600

/* ── Types ─────────────────────────────────────────────────────────────── */
interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string | null
  content?: string
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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function toId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

function extractHeadings(content: string) {
  const headingRegex = /^#{2,3} (.+)$/gm
  const headings: { level: number; text: string; id: string }[] = []
  let match
  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[1]!
    const level = match[0].match(/^#+/)![0].length
    const id = toId(text)
    headings.push({ level, text, id })
  }
  return headings
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
      <span className="text-white/30 text-8xl font-black select-none">
        {post.category_slug?.charAt(0).toUpperCase() ?? 'F'}
      </span>
    </div>
  )
}

/* ── Related post mini card ─────────────────────────────────────────────── */
function RelatedCard({ post }: { post: BlogPost }) {
  const grad = CATEGORY_COLORS[post.category_slug ?? ''] ?? 'from-violet-400 to-violet-600'
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="flex gap-3 group hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${grad} shrink-0 overflow-hidden`}>
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 group-hover:text-violet-600 transition-colors line-clamp-2 leading-snug">
          {post.title}
        </p>
        {post.reading_time_min && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.reading_time_min} min
          </p>
        )}
      </div>
    </Link>
  )
}

/* ── generateStaticParams ───────────────────────────────────────────────── */
export async function generateStaticParams() {
  try {
    const db = supabaseAdmin()
    const { data } = await db
      .from('blog_posts')
      .select('slug')
      .eq('status', 'published')
      .order('views_count', { ascending: false })
      .limit(15)

    return (data ?? []).map(p => ({ slug: p.slug as string }))
  } catch {
    return []
  }
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
      .from('blog_posts')
      .select('title, meta_title, meta_description, summary, cover_image_url, og_image_url, slug, author, published_at, tags')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .maybeSingle()

    if (!data) return { title: 'Post não encontrado | Blog Foguetim' }

    const title = data.meta_title ?? data.title
    const description = data.meta_description ?? data.summary ?? ''
    const image = data.og_image_url ?? data.cover_image_url

    return {
      title: `${title} | Blog Foguetim`,
      description,
      keywords: data.tags ?? [],
      authors: [{ name: data.author }],
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: data.published_at,
        authors: [data.author],
        url: `https://www.foguetim.com.br/blog/${data.slug}`,
        ...(image && { images: [{ url: image, alt: title }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image && { images: [image] }),
      },
      alternates: {
        canonical: `https://www.foguetim.com.br/blog/${data.slug}`,
      },
    }
  } catch {
    return { title: 'Blog Foguetim' }
  }
}

/* ── Data fetching ──────────────────────────────────────────────────────── */
async function getData(slug: string) {
  const db = supabaseAdmin()

  const { data: post, error } = await db
    .from('blog_posts')
    .select(
      'id, title, slug, summary, content, meta_title, meta_description, tags, category, category_slug, ' +
      'reading_time_min, status, is_featured, views_count, likes_count, author, ' +
      'published_at, related_product, cover_image_url, cover_image_alt, og_image_url'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !post) return { post: null, related: [], prevPost: null, nextPost: null }

  const typedPost = post as unknown as BlogPost

  // Fire-and-forget view increment
  db.from('blog_posts')
    .update({ views_count: (typedPost.views_count ?? 0) + 1 })
    .eq('slug', slug)
    .then(() => {})

  // Related posts + prev/next in parallel
  const [relatedResult, prevResult, nextResult] = await Promise.all([
    db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, category, category_slug, reading_time_min, views_count, ' +
        'cover_image_url, cover_image_alt, author, published_at, status, is_featured, ' +
        'likes_count, tags, meta_title, meta_description, related_product, og_image_url'
      )
      .eq('status', 'published')
      .eq('category_slug', typedPost.category_slug ?? '')
      .neq('slug', slug)
      .order('published_at', { ascending: false })
      .limit(3),

    db
      .from('blog_posts')
      .select('id, title, slug')
      .eq('status', 'published')
      .lt('published_at', typedPost.published_at)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    db
      .from('blog_posts')
      .select('id, title, slug')
      .eq('status', 'published')
      .gt('published_at', typedPost.published_at)
      .order('published_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    post: typedPost,
    related: (relatedResult.data ?? []) as unknown as BlogPost[],
    prevPost: prevResult.data as unknown as { id: string; title: string; slug: string } | null,
    nextPost: nextResult.data as unknown as { id: string; title: string; slug: string } | null,
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { post, related, prevPost, nextPost } = await getData(params.slug)

  if (!post) notFound()

  const headings = post.content ? extractHeadings(post.content) : []
  const catBadgeCls = CATEGORY_TEXT_COLORS[post.category_slug ?? ''] ?? 'bg-violet-100 text-violet-700'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary ?? post.meta_description ?? '',
    author: { '@type': 'Person', name: post.author },
    datePublished: post.published_at,
    publisher: {
      '@type': 'Organization',
      name: 'Foguetim ERP',
      logo: { '@type': 'ImageObject', url: 'https://www.foguetim.com.br/icon.png' },
    },
    ...(post.cover_image_url && {
      image: post.cover_image_url,
    }),
    url: `https://foguetim.com.br/blog/${post.slug}`,
    keywords: post.tags?.join(', ') ?? '',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
            <Link href="/" className="hover:text-gray-600 transition-colors">Início</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
            {post.category_slug && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Link
                  href={`/blog/categoria/${post.category_slug}`}
                  className="hover:text-gray-600 transition-colors"
                >
                  {post.category}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600 font-medium truncate max-w-[200px]">{post.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10">

            {/* ── Main Article Column ──────────────────────────────────── */}
            <article>
              {/* Cover */}
              <div className="rounded-2xl overflow-hidden aspect-video mb-8 shadow-sm">
                <CoverImage post={post} className="w-full h-full object-cover" />
              </div>

              {/* Category badge */}
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${catBadgeCls}`}>
                {post.category}
              </span>

              {/* Title */}
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-5"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {post.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400 pb-6 border-b border-gray-200 mb-8">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
                <span>{fmtDate(post.published_at)}</span>
                {post.reading_time_min && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {post.reading_time_min} min de leitura
                  </span>
                )}
                <span className="flex items-center gap-1.5 ml-auto">
                  <Eye className="w-4 h-4" />
                  {post.views_count.toLocaleString('pt-BR')} visualizações
                </span>
              </div>

              {/* Markdown content */}
              {post.content && (
                <div className="prose-content max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1
                          className="text-3xl font-bold text-gray-900 mt-8 mb-4"
                          style={{ fontFamily: 'var(--font-playfair)' }}
                        >
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => {
                        const id = toId(String(children))
                        return (
                          <h2
                            id={id}
                            className="text-2xl font-bold text-gray-900 mt-10 mb-4 pt-4 border-t border-gray-100"
                            style={{ fontFamily: 'var(--font-playfair)' }}
                          >
                            {children}
                          </h2>
                        )
                      },
                      h3: ({ children }) => {
                        const id = toId(String(children))
                        return (
                          <h3
                            id={id}
                            className="text-xl font-semibold text-gray-800 mt-6 mb-3"
                          >
                            {children}
                          </h3>
                        )
                      },
                      p: ({ children }) => (
                        <p className="text-gray-700 leading-relaxed mb-4 text-base">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 mb-4 text-gray-700 pl-4">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 mb-4 text-gray-700 pl-4">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-violet-400 pl-4 italic text-gray-600 my-6 bg-violet-50 py-3 rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className }) => {
                        const isBlock = className?.includes('language-')
                        return isBlock ? (
                          <code className="block bg-gray-900 text-green-400 p-4 rounded-xl text-sm font-mono mb-4 overflow-x-auto">
                            {children}
                          </code>
                        ) : (
                          <code className="bg-gray-100 text-violet-700 px-1.5 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        )
                      },
                      pre: ({ children }) => <pre className="mb-4">{children}</pre>,
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          className="text-violet-600 hover:text-violet-700 underline"
                          target={href?.startsWith('http') ? '_blank' : undefined}
                          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        >
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900">{children}</strong>
                      ),
                      em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="w-full border-collapse text-sm">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-gray-200 px-4 py-2 text-gray-700">{children}</td>
                      ),
                      hr: () => <hr className="my-8 border-gray-200" />,
                      img: ({ src, alt }) => (
                        <img
                          src={src}
                          alt={alt ?? ''}
                          className="rounded-xl w-full object-cover my-6 shadow-sm"
                        />
                      ),
                    }}
                  >
                    {post.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* CTA Box */}
              <div className="my-10 bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl p-6 text-white">
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">🚀</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">Foguetim ERP</h3>
                    <p className="text-violet-100 text-sm mb-4 leading-relaxed">
                      Controle estoque, anúncios e vendas num só lugar. Integração completa com Mercado Livre.
                    </p>
                    <a
                      href="/cadastro"
                      className="inline-block bg-white text-violet-700 font-semibold px-5 py-2 rounded-lg hover:bg-violet-50 transition-colors text-sm"
                    >
                      Começar grátis →
                    </a>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
                  {post.tags.map(tag => (
                    <Link
                      key={tag}
                      href={`/blog/tag/${encodeURIComponent(tag)}`}
                      className="text-sm text-gray-600 hover:text-violet-600 bg-gray-100 hover:bg-violet-50 px-3 py-1 rounded-full transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Feedback */}
              <div className="border-t border-b border-gray-200 py-2 my-6">
                <BlogFeedback slug={post.slug} />
              </div>

              {/* Share */}
              <div className="mb-8">
                <BlogShareButtons title={post.title} slug={post.slug} />
              </div>

              {/* Prev / Next navigation */}
              {(prevPost || nextPost) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                  {prevPost ? (
                    <Link
                      href={`/blog/${prevPost.slug}`}
                      className="group flex items-start gap-3 p-4 rounded-2xl border border-gray-200 hover:border-violet-200 hover:bg-violet-50/50 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-violet-600 shrink-0 mt-0.5 transition-colors" />
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Anterior</p>
                        <p className="text-sm font-medium text-gray-800 group-hover:text-violet-600 transition-colors line-clamp-2">
                          {prevPost.title}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {nextPost ? (
                    <Link
                      href={`/blog/${nextPost.slug}`}
                      className="group flex items-start gap-3 p-4 rounded-2xl border border-gray-200 hover:border-violet-200 hover:bg-violet-50/50 transition-all text-right justify-end"
                    >
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Próximo</p>
                        <p className="text-sm font-medium text-gray-800 group-hover:text-violet-600 transition-colors line-clamp-2">
                          {nextPost.title}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-violet-600 shrink-0 mt-0.5 transition-colors" />
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>
              )}
            </article>

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 flex flex-col gap-6">

                {/* Table of Contents */}
                {headings.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                      Neste artigo
                    </h3>
                    <nav>
                      <ul className="space-y-1.5">
                        {headings.map((h, i) => (
                          <li key={i} className={h.level === 3 ? 'pl-4' : ''}>
                            <a
                              href={`#${h.id}`}
                              className="text-sm text-gray-600 hover:text-violet-600 transition-colors block py-0.5 leading-snug"
                            >
                              {h.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                )}

                {/* CTA Banner */}
                <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 text-white">
                  <span className="text-2xl mb-2 block">🚀</span>
                  <h3 className="font-bold text-base mb-1">Foguetim ERP</h3>
                  <p className="text-violet-200 text-sm mb-4 leading-relaxed">
                    Gerencie seu e-commerce com inteligência. Integração com Mercado Livre.
                  </p>
                  <Link
                    href="/cadastro"
                    className="inline-block w-full text-center bg-white text-violet-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-sm"
                  >
                    Começar grátis →
                  </Link>
                </div>

                {/* Related posts */}
                {related.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                      Artigos relacionados
                    </h3>
                    <div className="flex flex-col gap-3">
                      {related.map(rp => (
                        <RelatedCard key={rp.id} post={rp} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
