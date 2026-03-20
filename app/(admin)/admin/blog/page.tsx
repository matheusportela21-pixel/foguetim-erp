'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Newspaper, Plus, Edit2, Trash2, Eye, EyeOff, Search,
  BarChart3, FileText, BookOpen, Star, StarOff, X, Save,
  ChevronDown, Tag, Loader2, AlertCircle, CheckCircle2,
  Clock, Archive, Layout, Palette,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string | null
  content: string | null
  meta_title: string | null
  meta_description: string | null
  tags: string[] | null
  category: string | null
  category_slug: string | null
  seo_keywords: string[] | null
  reading_time_min: number | null
  status: 'draft' | 'review' | 'published' | 'archived'
  is_featured: boolean
  author: string | null
  published_at: string | null
  related_product: string | null
  cover_image_url: string | null
  views_count: number
  likes_count: number
  created_at: string
  updated_at: string
}

interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  order_index: number
  is_visible: boolean
  post_count: number
  created_at?: string
  updated_at?: string
}

type Tab = 'dashboard' | 'posts' | 'categorias'
type PostStatus = 'all' | 'draft' | 'review' | 'published' | 'archived'

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function calcReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR')
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:     'Rascunho',
  review:    'Em Revisão',
  published: 'Publicado',
  archived:  'Arquivado',
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-slate-700 text-slate-300',
  review:    'bg-yellow-900/60 text-yellow-400',
  published: 'bg-emerald-900/60 text-emerald-400',
  archived:  'bg-slate-800 text-slate-500',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${STATUS_COLORS[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── Default post form ──────────────────────────────────────────────────────────

function emptyPost(): Partial<BlogPost> {
  return {
    title: '', slug: '', summary: '', content: '',
    meta_title: '', meta_description: '', tags: [],
    category: '', category_slug: '',
    seo_keywords: [], reading_time_min: 1,
    status: 'draft', is_featured: false,
    author: '', published_at: null, related_product: '',
    cover_image_url: '',
  }
}

function emptyCategory(): Partial<BlogCategory> {
  return {
    name: '', slug: '', description: '',
    icon: '', color: '#6366f1',
    order_index: 0, is_visible: true,
  }
}

// ── Post Edit Modal ────────────────────────────────────────────────────────────

interface PostModalProps {
  post: Partial<BlogPost> | null
  categories: BlogCategory[]
  onClose: () => void
  onSaved: () => void
}

function PostModal({ post, categories, onClose, onSaved }: PostModalProps) {
  const isNew = !post?.id
  const [form, setForm] = useState<Partial<BlogPost>>(post ?? emptyPost())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagsInput, setTagsInput] = useState((post?.tags ?? []).join(', '))
  const [kwInput, setKwInput] = useState((post?.seo_keywords ?? []).join(', '))
  const [preview, setPreview] = useState(false)
  const [titleDirty, setTitleDirty] = useState(!isNew)

  function set<K extends keyof BlogPost>(key: K, value: BlogPost[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleTitle(v: string) {
    set('title', v)
    if (!titleDirty) set('slug', toSlug(v))
    if (!form.meta_title) set('meta_title', v.slice(0, 60))
  }

  function handleContent(v: string) {
    set('content', v)
    set('reading_time_min', calcReadingTime(v))
  }

  function handleCategory(slug: string) {
    const cat = categories.find(c => c.slug === slug)
    set('category_slug', slug)
    set('category', cat?.name ?? slug)
  }

  async function handleSave() {
    if (!form.title?.trim()) { setError('Título obrigatório'); return }
    if (!form.slug?.trim())  { setError('Slug obrigatório');   return }
    setSaving(true)
    setError('')

    const payload: Record<string, unknown> = {
      ...form,
      tags:         tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      seo_keywords: kwInput.split(',').map(k => k.trim()).filter(Boolean),
    }

    try {
      let res: Response
      if (isNew) {
        res = await fetch('/api/admin/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/admin/blog/posts/${form.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Erro desconhecido')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="w-full max-w-4xl bg-[#0f1117] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-slate-200">
            {isNew ? 'Novo Post' : 'Editar Post'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Title + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Título *</label>
              <input
                value={form.title ?? ''}
                onChange={e => handleTitle(e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                placeholder="Título do post"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Slug *</label>
              <input
                value={form.slug ?? ''}
                onChange={e => { setTitleDirty(true); set('slug', e.target.value) }}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 font-mono"
                placeholder="meu-post-slug"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Resumo</label>
            <textarea
              value={form.summary ?? ''}
              onChange={e => set('summary', e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 resize-none"
              placeholder="Resumo curto do post..."
            />
          </div>

          {/* Content + Preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">
                Conteúdo (Markdown)
                {form.content && (
                  <span className="ml-2 text-slate-600">
                    · {calcReadingTime(form.content)} min de leitura
                  </span>
                )}
              </label>
              <button
                onClick={() => setPreview(p => !p)}
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {preview ? 'Editar' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="bg-slate-900 border border-white/[0.06] rounded-lg px-4 py-3 min-h-[300px] prose prose-invert prose-sm max-w-none overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {form.content ?? ''}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                value={form.content ?? ''}
                onChange={e => handleContent(e.target.value)}
                style={{ height: 300, fontFamily: 'monospace', fontSize: 13 }}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-violet-500/60 resize-none leading-relaxed"
                placeholder="# Título&#10;&#10;Escreva seu conteúdo em markdown..."
              />
            )}
          </div>

          {/* Category + Author + Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoria</label>
              <div className="relative">
                <select
                  value={form.category_slug ?? ''}
                  onChange={e => handleCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 appearance-none pr-8"
                >
                  <option value="">Sem categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Autor</label>
              <input
                value={form.author ?? ''}
                onChange={e => set('author', e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                placeholder="Nome do autor"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
              <div className="relative">
                <select
                  value={form.status ?? 'draft'}
                  onChange={e => set('status', e.target.value as BlogPost['status'])}
                  className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 appearance-none pr-8"
                >
                  <option value="draft">Rascunho</option>
                  <option value="review">Em Revisão</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tags + Published at */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Tags <span className="text-slate-600">(separadas por vírgula)</span>
              </label>
              <input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de publicação</label>
              <input
                type="datetime-local"
                value={form.published_at ? form.published_at.slice(0, 16) : ''}
                onChange={e => set('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
              />
            </div>
          </div>

          {/* Cover image + Destaque */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">URL da capa</label>
              <input
                value={form.cover_image_url ?? ''}
                onChange={e => set('cover_image_url', e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => set('is_featured', !form.is_featured)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.is_featured ? 'bg-violet-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-slate-300">Post em destaque</span>
              </label>
            </div>
          </div>

          {/* SEO section */}
          <div className="border-t border-white/[0.04] pt-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">SEO</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
                  <span>Meta Title</span>
                  <span className={(form.meta_title?.length ?? 0) > 60 ? 'text-red-400' : 'text-slate-600'}>
                    {form.meta_title?.length ?? 0}/60
                  </span>
                </label>
                <input
                  value={form.meta_title ?? ''}
                  onChange={e => set('meta_title', e.target.value.slice(0, 70))}
                  className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                  placeholder="Título para SEO"
                />
              </div>
              <div>
                <label className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
                  <span>Meta Description</span>
                  <span className={(form.meta_description?.length ?? 0) > 155 ? 'text-red-400' : 'text-slate-600'}>
                    {form.meta_description?.length ?? 0}/155
                  </span>
                </label>
                <input
                  value={form.meta_description ?? ''}
                  onChange={e => set('meta_description', e.target.value.slice(0, 170))}
                  className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                  placeholder="Descrição para buscadores..."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Palavras-chave SEO <span className="text-slate-600">(separadas por vírgula)</span>
              </label>
              <input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                placeholder="palavra1, palavra2, palavra3"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category Edit Modal ────────────────────────────────────────────────────────

interface CatModalProps {
  cat: Partial<BlogCategory> | null
  onClose: () => void
  onSaved: () => void
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

function CategoryModal({ cat, onClose, onSaved }: CatModalProps) {
  const isNew = !cat?.id
  const [form, setForm] = useState<Partial<BlogCategory>>(cat ?? emptyCategory())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameDirty, setNameDirty] = useState(!isNew)

  function set<K extends keyof BlogCategory>(key: K, value: BlogCategory[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleName(v: string) {
    set('name', v)
    if (!nameDirty) set('slug', toSlug(v))
  }

  async function handleSave() {
    if (!form.name?.trim()) { setError('Nome obrigatório'); return }
    if (!form.slug?.trim()) { setError('Slug obrigatório'); return }
    setSaving(true)
    setError('')
    try {
      let res: Response
      if (isNew) {
        res = await fetch('/api/admin/blog/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        res = await fetch(`/api/admin/blog/categories/${form.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }

      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Erro desconhecido')
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-[#0f1117] border border-white/[0.08] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-slate-200">
            {isNew ? 'Nova Categoria' : 'Editar Categoria'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome *</label>
              <input
                value={form.name ?? ''}
                onChange={e => handleName(e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                placeholder="Nome da categoria"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Slug *</label>
              <input
                value={form.slug ?? ''}
                onChange={e => { setNameDirty(true); set('slug', e.target.value) }}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 font-mono"
                placeholder="minha-categoria"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descrição</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 resize-none"
              placeholder="Descrição da categoria..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Ícone (emoji ou texto)</label>
              <input
                value={form.icon ?? ''}
                onChange={e => set('icon', e.target.value)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                placeholder="📝"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Ordem</label>
              <input
                type="number"
                value={form.order_index ?? 0}
                onChange={e => set('order_index', parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Cor</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'}`}
                />
              ))}
              <input
                type="color"
                value={form.color ?? '#6366f1'}
                onChange={e => set('color', e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>

          {/* Visible toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set('is_visible', !form.is_visible)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.is_visible ? 'bg-violet-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.is_visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-300">Visível no site</span>
          </label>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminBlogPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  const [posts, setPosts]           = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingCats, setLoadingCats]   = useState(true)

  // Posts filters
  const [statusFilter, setStatusFilter] = useState<PostStatus>('all')
  const [catFilter, setCatFilter]       = useState('')
  const [search, setSearch]             = useState('')

  // Modals
  const [editPost, setEditPost]   = useState<Partial<BlogPost> | null>(null)
  const [editCat, setEditCat]     = useState<Partial<BlogCategory> | null>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [showCatModal, setShowCatModal]  = useState(false)

  // Confirm delete
  const [delPostId, setDelPostId]   = useState<string | null>(null)
  const [delCatId, setDelCatId]     = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (catFilter) params.set('category', catFilter)
      const res  = await fetch(`/api/admin/blog/posts?${params}`)
      const data = await res.json() as { posts: BlogPost[] }
      setPosts(data.posts ?? [])
    } catch {
      setPosts([])
    } finally {
      setLoadingPosts(false)
    }
  }, [statusFilter, catFilter])

  const fetchCats = useCallback(async () => {
    setLoadingCats(true)
    try {
      const res  = await fetch('/api/admin/blog/categories')
      const data = await res.json() as { categories: BlogCategory[] }
      setCategories(data.categories ?? [])
    } catch {
      setCategories([])
    } finally {
      setLoadingCats(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])
  useEffect(() => { fetchCats() }, [fetchCats])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredPosts = posts.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  )

  const totalViews    = posts.reduce((s, p) => s + (p.views_count ?? 0), 0)
  const publishedCnt  = posts.filter(p => p.status === 'published').length
  const draftsCnt     = posts.filter(p => p.status === 'draft' || p.status === 'review').length
  const top10         = [...posts]
    .sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0))
    .slice(0, 10)

  // ── Delete handlers ──────────────────────────────────────────────────────────

  async function confirmDeletePost() {
    if (!delPostId) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/blog/posts/${delPostId}`, { method: 'DELETE' })
      setDelPostId(null)
      fetchPosts()
    } finally {
      setDeleting(false)
    }
  }

  async function confirmDeleteCat() {
    if (!delCatId) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/blog/categories/${delCatId}`, { method: 'DELETE' })
      setDelCatId(null)
      fetchCats()
    } finally {
      setDeleting(false)
    }
  }

  // ── Toggle featured ──────────────────────────────────────────────────────────

  async function toggleFeatured(post: BlogPost) {
    await fetch(`/api/admin/blog/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: !post.is_featured }),
    })
    fetchPosts()
  }

  async function toggleCatVisible(cat: BlogCategory) {
    await fetch(`/api/admin/blog/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: !cat.is_visible }),
    })
    fetchCats()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'posts',     label: 'Posts',     icon: FileText  },
    { id: 'categorias',label: 'Categorias',icon: Layout    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0f1117]">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Blog</h1>
              <p className="text-xs text-slate-500">Gerencie posts e categorias</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-violet-600/20 text-violet-400'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Tab: Dashboard ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de Posts',  value: fmtNum(posts.length),       icon: FileText,      color: 'text-violet-400', bg: 'bg-violet-600/10' },
                { label: 'Publicados',       value: fmtNum(publishedCnt),        icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
                { label: 'Rascunhos',        value: fmtNum(draftsCnt),           icon: Clock,         color: 'text-yellow-400', bg: 'bg-yellow-600/10' },
                { label: 'Views totais',     value: fmtNum(totalViews),          icon: Eye,           color: 'text-blue-400', bg: 'bg-blue-600/10' },
              ].map(k => (
                <div key={k.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500 font-medium">{k.label}</span>
                    <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                      <k.icon className={`w-4 h-4 ${k.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-100">{loadingPosts ? '—' : k.value}</p>
                </div>
              ))}
            </div>

            {/* Top 10 posts */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className="px-5 py-4 border-b border-white/[0.04]">
                <h2 className="text-sm font-semibold text-slate-300">Top 10 posts por views</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Título</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Views</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Publicado</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPosts ? (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-600">Carregando...</td></tr>
                    ) : top10.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-600">Nenhum post ainda</td></tr>
                    ) : top10.map((p, i) => (
                      <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-slate-600 font-mono text-xs">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className="text-slate-200 font-medium line-clamp-1">{p.title}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{p.category ?? '—'}</td>
                        <td className="px-5 py-3 text-right font-mono text-slate-300">{fmtNum(p.views_count)}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(p.published_at)}</td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Posts ── */}
        {tab === 'posts' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                  placeholder="Buscar posts..."
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as PostStatus)}
                  className="bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 appearance-none pr-8"
                >
                  <option value="all">Todos os status</option>
                  <option value="draft">Rascunho</option>
                  <option value="review">Em Revisão</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              {/* Category filter */}
              <div className="relative">
                <select
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                  className="bg-slate-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60 appearance-none pr-8"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              <button
                onClick={() => { setEditPost(emptyPost()); setShowPostModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors ml-auto"
              >
                <Plus className="w-4 h-4" />
                Novo Post
              </button>
            </div>

            {/* Table */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Título</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Destaque</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Views</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Publicado</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPosts ? (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </td></tr>
                    ) : filteredPosts.length === 0 ? (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-600">
                        {search || statusFilter !== 'all' || catFilter ? 'Nenhum post encontrado com esses filtros.' : 'Nenhum post ainda. Crie o primeiro!'}
                      </td></tr>
                    ) : filteredPosts.map(p => (
                      <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-slate-200 font-medium max-w-xs truncate">{p.title}</p>
                          <p className="text-xs text-slate-600 font-mono">{p.slug}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{p.category ?? '—'}</td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => toggleFeatured(p)}
                            className="transition-colors hover:scale-110"
                            title={p.is_featured ? 'Remover destaque' : 'Marcar como destaque'}
                          >
                            {p.is_featured
                              ? <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              : <StarOff className="w-4 h-4 text-slate-600 hover:text-yellow-400" />
                            }
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-400 text-xs">{fmtNum(p.views_count)}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(p.published_at)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditPost(p); setShowPostModal(true) }}
                              className="p-1.5 text-slate-500 hover:text-violet-400 transition-colors rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDelPostId(p.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loadingPosts && (
                <div className="px-5 py-3 border-t border-white/[0.04] text-xs text-slate-600">
                  {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
                  {posts.length !== filteredPosts.length && ` (de ${posts.length} total)`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Categorias ── */}
        {tab === 'categorias' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => { setEditCat(emptyCategory()); setShowCatModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Categoria
              </button>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Slug</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Posts</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Ordem</th>
                    <th className="px-5 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Visível</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCats ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-600">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td></tr>
                  ) : categories.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-600">
                      Nenhuma categoria ainda.
                    </td></tr>
                  ) : categories.map(c => (
                    <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          {c.icon && <span className="text-base leading-none">{c.icon}</span>}
                          <span className="text-slate-200 font-medium">{c.name}</span>
                        </div>
                        {c.description && (
                          <p className="text-xs text-slate-600 mt-0.5 pl-5 max-w-xs truncate">{c.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                      <td className="px-5 py-3 text-center text-slate-400">{c.post_count ?? 0}</td>
                      <td className="px-5 py-3 text-center text-slate-500 font-mono text-xs">{c.order_index}</td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleCatVisible(c)}
                          className={`transition-colors ${c.is_visible ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'}`}
                          title={c.is_visible ? 'Ocultar' : 'Mostrar'}
                        >
                          {c.is_visible
                            ? <Eye className="w-4 h-4" />
                            : <EyeOff className="w-4 h-4" />
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditCat(c); setShowCatModal(true) }}
                            className="p-1.5 text-slate-500 hover:text-violet-400 transition-colors rounded"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDelCatId(c.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Post Modal ── */}
      {showPostModal && (
        <PostModal
          post={editPost}
          categories={categories}
          onClose={() => { setShowPostModal(false); setEditPost(null) }}
          onSaved={fetchPosts}
        />
      )}

      {/* ── Category Modal ── */}
      {showCatModal && (
        <CategoryModal
          cat={editCat}
          onClose={() => { setShowCatModal(false); setEditCat(null) }}
          onSaved={fetchCats}
        />
      )}

      {/* ── Delete Post Confirm ── */}
      {delPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold">Excluir post?</p>
              <p className="text-sm text-slate-500 mt-1">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDelPostId(null)}
                className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePost}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Cat Confirm ── */}
      {delCatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold">Excluir categoria?</p>
              <p className="text-sm text-slate-500 mt-1">Posts desta categoria não serão excluídos, mas perderão o vínculo.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDelCatId(null)}
                className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteCat}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
