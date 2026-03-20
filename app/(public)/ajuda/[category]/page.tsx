import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import {
  Rocket, ShoppingCart, Warehouse, Calculator, TrendingUp,
  Shield, CreditCard, HelpCircle, ChevronRight, Eye, Tag,
  type LucideIcon,
} from 'lucide-react'
import type { Metadata } from 'next'

/* ── Types ─────────────────────────────────────────────────────────────── */
interface HelpCategory {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  icon: string | null
}

interface HelpArticle {
  id: string
  title: string
  slug: string
  summary: string | null
  tags: string[]
  views_count: number
  updated_at: string
  is_featured: boolean
}

/* ── Color + Icon maps ──────────────────────────────────────────────────── */
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700'  },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700'   },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700'},
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700'    },
  green:   { bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-200',   badge: 'bg-green-100 text-green-700'  },
  red:     { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700'     },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700'},
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-700'  },
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
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
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
  { params }: { params: { category: string } },
): Promise<Metadata> {
  const supabase = getSupabase()
  const { data: category } = await supabase
    .from('help_categories')
    .select('name, description')
    .eq('slug', params.category)
    .eq('is_visible', true)
    .single()

  if (!category) return { title: 'Categoria | Central de Ajuda | Foguetim ERP' }

  return {
    title: `${category.name} | Central de Ajuda | Foguetim ERP`,
    description: category.description ?? `Artigos e guias sobre ${category.name} no Foguetim ERP.`,
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function CategoryPage({ params }: { params: { category: string } }) {
  const supabase = getSupabase()

  const { data: category } = await supabase
    .from('help_categories')
    .select('*')
    .eq('slug', params.category)
    .eq('is_visible', true)
    .single()

  if (!category) notFound()

  const { data: articles } = await supabase
    .from('help_articles')
    .select('id, title, slug, summary, tags, views_count, updated_at, is_featured')
    .eq('category_id', (category as HelpCategory).id)
    .eq('is_published', true)
    .order('order_index', { ascending: true })
    .order('updated_at', { ascending: false })

  const cat = category as HelpCategory
  const arts: HelpArticle[] = (articles as HelpArticle[]) ?? []
  const colors = getColor(cat.color)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/ajuda" className="hover:text-gray-900 transition-colors">Central de Ajuda</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{cat.name}</span>
      </nav>

      {/* Category Header */}
      <div className={`flex items-start gap-4 p-6 rounded-2xl border ${colors.bg} ${colors.border} mb-10`}>
        <div className={`w-14 h-14 rounded-xl border ${colors.border} bg-white flex items-center justify-center shrink-0`}>
          <CategoryIcon name={cat.icon} className={`w-7 h-7 ${colors.text}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cat.name}</h1>
          {cat.description && (
            <p className="text-gray-600 mt-1 leading-relaxed">{cat.description}</p>
          )}
          <p className={`text-sm font-medium ${colors.text} mt-2`}>
            {arts.length} {arts.length === 1 ? 'artigo' : 'artigos'}
          </p>
        </div>
      </div>

      {/* Articles List */}
      {arts.length === 0 ? (
        <div className="text-center py-20">
          <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-500">Nenhum artigo nesta categoria ainda.</h2>
          <p className="text-gray-400 text-sm mt-1">Volte em breve ou explore outras categorias.</p>
          <Link
            href="/ajuda"
            className="inline-block mt-6 text-sm font-medium text-violet-600 hover:text-violet-800"
          >
            ← Voltar para Central de Ajuda
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {arts.map(article => (
            <Link
              key={article.id}
              href={`/ajuda/${cat.slug}/${article.slug}`}
              className="group flex flex-col sm:flex-row sm:items-start gap-3 p-5 bg-white rounded-xl border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                    {article.title}
                  </h2>
                  {article.is_featured && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Destaque
                    </span>
                  )}
                </div>
                {article.summary && (
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{article.summary}</p>
                )}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    {article.tags.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 shrink-0 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {article.views_count}
                </span>
                <span>{formatDate(article.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
