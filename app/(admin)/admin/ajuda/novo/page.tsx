'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Save, Eye, EyeOff, Star, StarOff,
  AlertCircle, CheckCircle2, Loader2, Tag, X,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────────────── */
interface HelpCategory {
  id: string
  name: string
  slug: string
  color: string
}

/* ── Slug generator ─────────────────────────────────────────────────────── */
function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/* ── Markdown Preview ───────────────────────────────────────────────────── */
function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        Escreva conteúdo para ver o preview aqui.
      </div>
    )
  }
  return (
    <div className="p-6 overflow-auto h-full prose prose-invert prose-sm max-w-none text-slate-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function NewArticlePage() {
  const router = useRouter()

  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [orderIndex, setOrderIndex] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch('/api/help/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(toSlug(title))
    }
  }, [title, slugEdited])

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !tags.includes(tag) && tags.length < 10) {
        setTags(prev => [...prev, tag])
        setTagInput('')
      }
    }
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  async function handleSave() {
    if (!title.trim()) return setError('O título é obrigatório.')
    if (!slug.trim()) return setError('O slug é obrigatório.')
    if (!categoryId) return setError('Selecione uma categoria.')
    if (!content.trim()) return setError('O conteúdo é obrigatório.')

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/help/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          category_id: categoryId,
          summary: summary.trim() || null,
          content: content.trim(),
          tags,
          is_published: isPublished,
          is_featured: isFeatured,
          order_index: orderIndex,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar artigo.')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/admin/ajuda'), 1200)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/ajuda"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-xl font-bold text-white">Novo artigo</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(p => !p)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Ocultar preview' : 'Ver preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : success
              ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
              : <><Save className="w-4 h-4" /> Salvar artigo</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main form ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Como configurar a integração com o Mercado Livre"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 text-base transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Slug <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus-within:border-violet-500 transition-colors">
              <span className="text-slate-500 text-sm shrink-0">/ajuda/.../</span>
              <input
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
                placeholder="meu-artigo"
                className="flex-1 bg-transparent text-violet-300 font-mono text-sm focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Gerado automaticamente a partir do título. Use apenas letras, números e hífens.</p>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Resumo</label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Breve descrição do artigo (aparece nos resultados de busca e listagens)..."
              rows={2}
              maxLength={300}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 resize-none transition-colors text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">{summary.length}/300 caracteres</p>
          </div>

          {/* Content + Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Conteúdo (Markdown) <span className="text-red-400">*</span>
              </label>
              <span className="text-xs text-slate-500">{content.length} caracteres</span>
            </div>
            <div className={`grid gap-4 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`# Título do artigo\n\nIntrodução...\n\n## Seção 1\n\nConteúdo da seção...`}
                rows={showPreview ? 28 : 20}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 resize-y transition-colors text-sm font-mono leading-relaxed"
              />
              {showPreview && (
                <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden" style={{ minHeight: '400px' }}>
                  <div className="px-4 py-2 border-b border-white/8">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</span>
                  </div>
                  <MarkdownPreview content={content} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar settings ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Category */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Configurações</h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Categoria <span className="text-red-400">*</span>
              </label>
              {loading ? (
                <div className="text-slate-500 text-sm">Carregando...</div>
              ) : (
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="">Selecionar categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Ordem de exibição</label>
              <input
                type="number"
                value={orderIndex}
                onChange={e => setOrderIndex(Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/8">
              <button
                type="button"
                onClick={() => setIsPublished(p => !p)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isPublished
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-white/5 border border-white/10 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {isPublished ? 'Publicado' : 'Rascunho'}
                </span>
                <div className={`w-8 h-4 rounded-full transition-colors ${isPublished ? 'bg-green-500' : 'bg-slate-600'}`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.5 transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsFeatured(p => !p)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isFeatured
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    : 'bg-white/5 border border-white/10 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isFeatured ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                  {isFeatured ? 'Em destaque' : 'Sem destaque'}
                </span>
                <div className={`w-8 h-4 rounded-full transition-colors ${isFeatured ? 'bg-amber-500' : 'bg-slate-600'}`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full mt-0.5 transition-transform ${isFeatured ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-white">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-violet-400 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Digite e pressione Enter ou vírgula..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <p className="text-xs text-slate-600">{tags.length}/10 tags</p>
          </div>

          {/* Save button (mobile) */}
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60 lg:hidden"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : success
              ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
              : <><Save className="w-4 h-4" /> Salvar artigo</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
