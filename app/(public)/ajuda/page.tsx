import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import {
  Rocket, ShoppingCart, Warehouse, Calculator, TrendingUp,
  Shield, CreditCard, HelpCircle, MessageCircle, Mail, Zap,
  type LucideIcon,
} from 'lucide-react'

export const metadata = {
  title: 'Central de Ajuda | Foguetim ERP',
  description: 'Encontre respostas, tutoriais e guias para usar o Foguetim ERP.',
}

/* ── Types ─────────────────────────────────────────────────────────────── */
interface HelpCategory {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  icon: string | null
  order_index: number
  is_visible: boolean
  help_articles: [{ count: number }] | null
}

interface HelpArticle {
  id: string
  title: string
  slug: string
  summary: string | null
  tags: string[]
  views_count: number
  updated_at: string
  help_categories: { name: string; slug: string; color: string } | null
}

/* ── Color + Icon maps ──────────────────────────────────────────────────── */
const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  green:   { bg: 'bg-green-500/10',   text: 'text-green-400',   border: 'border-green-500/20' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20' },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/20' },
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

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function HelpHomePage() {
  const supabase = getSupabase()

  const [{ data: rawCategories }, { data: featured }] = await Promise.all([
    supabase
      .from('help_categories')
      .select('*, help_articles(count)')
      .eq('is_visible', true)
      .order('order_index'),
    supabase
      .from('help_articles')
      .select('id, title, slug, summary, tags, views_count, updated_at, help_categories(name, slug, color)')
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('views_count', { ascending: false })
      .limit(4),
  ])

  const categories: HelpCategory[] = rawCategories ?? []
  const featuredArticles: HelpArticle[] = (featured as unknown as HelpArticle[]) ?? []

  return (
    <div className="min-h-screen bg-[#0A0718] text-slate-100 stars-bg">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0A0718]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Foguetim" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim <span className="text-slate-500 font-medium text-sm">ERP</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <Link href="/planos" className="hover:text-white transition-colors">Planos</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors px-4 py-2">Entrar</Link>
            <Link href="/cadastro" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Começar grátis</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-transparent to-purple-900/20 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Como podemos te ajudar?
          </h1>
          <p className="text-slate-400 text-lg mb-10">
            Tutoriais, guias e respostas para tirar o máximo do Foguetim ERP.
          </p>
          <form action="/ajuda/busca" method="GET" className="relative max-w-xl mx-auto">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              name="q"
              type="search"
              placeholder="Ex: como cadastrar produto, integração Mercado Livre..."
              className="w-full pl-12 pr-36 py-4 text-slate-200 bg-white/5 rounded-xl text-base border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 placeholder-slate-600"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-500 transition-colors">
              Buscar
            </button>
          </form>
          <p className="mt-4 text-slate-600 text-sm">
            Dicas populares: precificação, estoque, relatórios, integrações
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        {/* ── Categories ───────────────────────────────────────────────── */}
        <section className="py-14">
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Categorias</h2>
          <p className="text-slate-500 mb-8">Navegue pelos tópicos da nossa base de conhecimento.</p>

          {categories.length === 0 ? (
            <div className="text-center py-16 text-slate-600">Nenhuma categoria disponível ainda.</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map(cat => {
                const colors = getColor(cat.color)
                const count = cat.help_articles?.[0]?.count ?? 0
                return (
                  <Link key={cat.id} href={`/ajuda/${cat.slug}`}
                    className={`group flex flex-col gap-3 p-5 rounded-xl glass-card hover:scale-[1.02] transition-all duration-200`}
                  >
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                      <CategoryIcon name={cat.icon} className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors text-sm">{cat.name}</h3>
                      {cat.description && <p className="text-slate-500 text-xs mt-1 line-clamp-2">{cat.description}</p>}
                    </div>
                    <span className={`text-xs font-medium ${colors.text} mt-auto`}>
                      {count} {count === 1 ? 'artigo' : 'artigos'}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Featured Articles ─────────────────────────────────────────── */}
        {featuredArticles.length > 0 && (
          <section className="pb-14">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Artigos em destaque</h2>
            <p className="text-slate-500 mb-8">Os guias mais acessados pelos nossos usuários.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredArticles.map(article => {
                const cat = article.help_categories
                const colors = getColor(cat?.color ?? 'slate')
                return (
                  <Link key={article.id} href={`/ajuda/${cat?.slug ?? 'geral'}/${article.slug}`}
                    className="group flex flex-col gap-3 p-5 glass-card rounded-xl hover:border-violet-500/30 transition-all duration-200"
                  >
                    {cat && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full w-fit ${colors.bg} ${colors.text}`}>
                        {cat.name}
                      </span>
                    )}
                    <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors leading-snug">
                      {article.title}
                    </h3>
                    {article.summary && <p className="text-slate-500 text-sm line-clamp-2">{article.summary}</p>}
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-auto">
                      <span>{article.views_count} visualizações</span>
                      <span>·</span>
                      <span>{formatDate(article.updated_at)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Contact / More Help ───────────────────────────────────────── */}
        <section className="pb-16">
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Precisa de mais ajuda?</h2>
          <p className="text-slate-500 mb-8">Nossa equipe está pronta para te auxiliar.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-start gap-3 p-6 glass-card rounded-xl">
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Suporte ao vivo</h3>
                <p className="text-sm text-slate-500 mt-1">Chat disponível nos dias úteis das 9h às 18h.</p>
              </div>
              <Link href="/contato" className="mt-auto text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
                Iniciar chat →
              </Link>
            </div>

            <div className="flex flex-col items-start gap-3 p-6 glass-card rounded-xl">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">E-mail</h3>
                <p className="text-sm text-slate-500 mt-1">Resposta em até 24 horas úteis.</p>
              </div>
              <a href="mailto:contato@foguetim.com.br" className="mt-auto text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                contato@foguetim.com.br →
              </a>
            </div>

            <div className="flex flex-col items-start gap-3 p-6 glass-card rounded-xl">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Novidades</h3>
                <p className="text-sm text-slate-500 mt-1">Últimas atualizações e melhorias da plataforma.</p>
              </div>
              <Link href="/changelog" className="mt-auto text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
                Ver changelog →
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6 bg-[#060512]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} Foguetim ERP. Todos os direitos reservados.</p>
          <div className="flex gap-5 text-slate-500">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <Link href="/planos" className="hover:text-white transition-colors">Planos</Link>
            <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
