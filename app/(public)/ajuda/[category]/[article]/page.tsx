import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'
import {
  Rocket, ShoppingCart, Warehouse, Calculator, TrendingUp,
  Shield, CreditCard, HelpCircle, ChevronRight, Eye, Clock,
  type LucideIcon,
} from 'lucide-react'
import type { Metadata } from 'next'
import ArticleBody from './ArticleBody'

/* ── Types ─────────────────────────────────────────────────────────────── */
interface HelpCategory {
  id: string
  name: string
  slug: string
  color: string
  icon: string | null
}

interface HelpArticle {
  id: string
  title: string
  slug: string
  summary: string | null
  content: string
  tags: string[]
  views_count: number
  helpful_yes: number
  helpful_no: number
  is_published: boolean
  is_featured: boolean
  updated_at: string
  created_at: string
  category_id: string
  help_categories: HelpCategory | null
}

interface RelatedArticle {
  id: string
  title: string
  slug: string
  summary: string | null
}

/* ── Color + Icon maps ──────────────────────────────────────────────────── */
const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100'  },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100'   },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100'    },
  green:   { bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-100'   },
  red:     { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100'     },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100'  },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-100'   },
}

const ICONS: Record<string, LucideIcon> = {
  Rocket, ShoppingCart, Warehouse, Calculator, TrendingUp,
  Shield, CreditCard, HelpCircle,
}

function getColor(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.slate
}

function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) ? ICONS[name] : HelpCircle
  return <Icon className={className} />
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
}

/* ── Supabase helper ────────────────────────────────────────────────────── */
function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
}

/* ── Metadata ───────────────────────────────────────────────────────────── */
export async function generateMetadata(
  { params }: { params: { category: string; article: string } },
): Promise<Metadata> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('help_articles')
    .select('title, summary')
    .eq('slug', params.article)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'Artigo | Central de Ajuda | Foguetim ERP' }

  return {
    title: `${data.title} | Central de Ajuda | Foguetim ERP`,
    description: data.summary ?? undefined,
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function ArticlePage(
  { params }: { params: { category: string; article: string } },
) {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('help_articles')
    .select('*, help_categories(id, name, slug, color, icon)')
    .eq('slug', params.article)
    .eq('is_published', true)
    .single()

  if (!data) notFound()

  const article = data as HelpArticle
  const cat = article.help_categories
  const colors = getColor(cat?.color ?? 'slate')

  // Related articles (same category, not current)
  const { data: related } = await supabase
    .from('help_articles')
    .select('id, title, slug, summary')
    .eq('category_id', article.category_id)
    .eq('is_published', true)
    .neq('id', article.id)
    .order('views_count', { ascending: false })
    .limit(4)

  const relatedArticles: RelatedArticle[] = (related as RelatedArticle[]) ?? []

  // Increment views via API (fire and forget)
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/help/articles/${article.slug}`, {
    method: 'GET',
    cache: 'no-store',
  }).catch(() => {})

  // BreadcrumbList JSON-LD for SEO
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://www.foguetim.com.br' },
      { '@type': 'ListItem', position: 2, name: 'Ajuda', item: 'https://www.foguetim.com.br/ajuda' },
      ...(cat
        ? [{ '@type': 'ListItem', position: 3, name: cat.name, item: `https://www.foguetim.com.br/ajuda/${cat.slug}` },
           { '@type': 'ListItem', position: 4, name: article.title }]
        : [{ '@type': 'ListItem', position: 3, name: article.title }]
      ),
    ],
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
        <Link href="/ajuda" className="hover:text-gray-900 transition-colors">Central de Ajuda</Link>
        <ChevronRight className="w-4 h-4" />
        {cat && (
          <>
            <Link href={`/ajuda/${cat.slug}`} className="hover:text-gray-900 transition-colors">
              {cat.name}
            </Link>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        <span className="text-gray-900 font-medium truncate max-w-xs">{article.title}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* ── Main Content ─────────────────────────────────────────────── */}
        <article className="flex-1 min-w-0">
          {/* Category badge */}
          {cat && (
            <Link
              href={`/ajuda/${cat.slug}`}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} ${colors.border} border mb-4`}
            >
              <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
              {cat.name}
            </Link>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Atualizado em {formatDate(article.updated_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {article.views_count} visualizações
            </span>
          </div>

          {/* Summary */}
          {article.summary && (
            <p className="text-lg text-gray-600 leading-relaxed mb-8 pb-8 border-b border-gray-100">
              {article.summary}
            </p>
          )}

          {/* Article Content + Feedback (client component) */}
          <ArticleBody content={article.content} articleSlug={article.slug} />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="lg:w-64 shrink-0 space-y-6">
          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Artigos relacionados</h3>
              <ul className="space-y-3">
                {relatedArticles.map(rel => (
                  <li key={rel.id}>
                    <Link
                      href={`/ajuda/${cat?.slug ?? 'geral'}/${rel.slug}`}
                      className="text-sm text-violet-600 hover:text-violet-800 hover:underline leading-snug block"
                    >
                      {rel.title}
                    </Link>
                    {rel.summary && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{rel.summary}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Helpful stats */}
          {(article.helpful_yes > 0 || article.helpful_no > 0) && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Avaliações</h3>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">👍 {article.helpful_yes}</span>
                <span className="text-red-500 font-medium">👎 {article.helpful_no}</span>
              </div>
            </div>
          )}

          {/* Back to category */}
          {cat && (
            <Link
              href={`/ajuda/${cat.slug}`}
              className={`flex items-center gap-2 text-sm font-medium ${colors.text} hover:underline`}
            >
              ← Ver todos os artigos de {cat.name}
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}
