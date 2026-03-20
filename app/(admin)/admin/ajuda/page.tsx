'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Search, RefreshCw, Edit2, Trash2,
  Eye, Star, CheckCircle2, Clock, ChevronDown, AlertCircle,
  Filter,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────────────── */
interface HelpCategory {
  id: string
  name: string
  slug: string
  color: string
}

interface HelpArticle {
  id: string
  title: string
  slug: string
  summary: string | null
  is_published: boolean
  is_featured: boolean
  views_count: number
  helpful_yes: number
  helpful_no: number
  updated_at: string
  created_at: string
  category_id: string
  help_categories: HelpCategory | null
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function helpfulRatio(yes: number, no: number): string {
  const total = yes + no
  if (total === 0) return '—'
  return `${Math.round((yes / total) * 100)}%`
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function AdminHelpPage() {
  const [tab, setTab] = useState<'articles' | 'categories'>('articles')
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterCat) params.set('category_id', filterCat)
      if (filterStatus) params.set('status', filterStatus)

      const [artRes, catRes] = await Promise.all([
        fetch(`/api/admin/help/articles?${params}`),
        fetch('/api/help/categories'),
      ])

      const artData = await artRes.json()
      const catData = await catRes.json()

      setArticles(Array.isArray(artData) ? artData : [])
      setCategories(Array.isArray(catData) ? catData : [])
    } catch {
      setError('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [filterCat, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir o artigo "${title}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/help/articles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setArticles(prev => prev.filter(a => a.id !== id))
    } catch {
      setError('Erro ao excluir artigo.')
    } finally {
      setDeleting(null)
    }
  }

  async function togglePublish(article: HelpArticle) {
    try {
      const res = await fetch(`/api/admin/help/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !article.is_published }),
      })
      if (!res.ok) throw new Error()
      setArticles(prev =>
        prev.map(a => a.id === article.id ? { ...a, is_published: !a.is_published } : a),
      )
    } catch {
      setError('Erro ao alterar status.')
    }
  }

  const filtered = articles.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Central de Ajuda</h1>
            <p className="text-sm text-slate-400">Gerencie artigos e categorias</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <Link
            href="/admin/ajuda/novo"
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo artigo
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {(['articles', 'categories'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'articles' ? `Artigos (${articles.length})` : `Categorias (${categories.length})`}
          </button>
        ))}
      </div>

      {tab === 'articles' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar artigos..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="relative">
                <select
                  value={filterCat}
                  onChange={e => setFilterCat(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-slate-300 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-slate-300 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  <option value="">Todos os status</option>
                  <option value="published">Publicados</option>
                  <option value="draft">Rascunhos</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Articles Table */}
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Carregando artigos...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum artigo encontrado</p>
                <p className="text-sm mt-1">
                  {search || filterCat || filterStatus
                    ? 'Tente ajustar os filtros.'
                    : 'Crie o primeiro artigo clicando em "Novo artigo".'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Artigo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Categoria</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Views</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Útil?</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Atualizado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map(article => (
                      <tr key={article.id} className="hover:bg-white/3 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            {article.is_featured && (
                              <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-medium text-white line-clamp-1">{article.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{article.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          {article.help_categories ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-white/8 text-slate-300">
                              {article.help_categories.name}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => togglePublish(article)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                              article.is_published
                                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                            }`}
                          >
                            {article.is_published
                              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Publicado</>
                              : <><Clock className="w-3.5 h-3.5" /> Rascunho</>
                            }
                          </button>
                        </td>
                        <td className="px-4 py-4 text-right text-slate-400 hidden lg:table-cell">
                          <span className="flex items-center justify-end gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {article.views_count.toLocaleString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right hidden lg:table-cell">
                          <span className={`text-xs font-medium ${
                            helpfulRatio(article.helpful_yes, article.helpful_no) === '—'
                              ? 'text-slate-600'
                              : parseInt(helpfulRatio(article.helpful_yes, article.helpful_no)) >= 70
                              ? 'text-green-400'
                              : 'text-amber-400'
                          }`}>
                            {helpfulRatio(article.helpful_yes, article.helpful_no)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-slate-500 text-xs hidden md:table-cell">
                          {fmtDate(article.updated_at)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={`/ajuda/${article.help_categories?.slug ?? 'geral'}/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Ver artigo"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <Link
                              href={`/admin/ajuda/${article.id}`}
                              className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-400/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(article.id, article.title)}
                              disabled={deleting === article.id}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'categories' && (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Carregando categorias...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="font-medium">Nenhuma categoria encontrada</p>
              <p className="text-sm mt-1">Crie categorias diretamente no Supabase.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Slug</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {categories.map(cat => (
                    <tr key={cat.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-medium text-white">{cat.name}</span>
                      </td>
                      <td className="px-4 py-4 text-slate-400 font-mono text-xs">{cat.slug}</td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full bg-white/8 text-slate-300`}>
                          {cat.color}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
