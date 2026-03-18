'use client'

import { useEffect, useState, useRef } from 'react'
import { Tag, Plus, Search, Pencil, Trash2, Eye, EyeOff, X, ChevronRight } from 'lucide-react'
import Header from '@/components/Header'

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Category {
  id: number
  name: string
  slug: string
  parent_id: number | null
  active: boolean
  parent: { id: number; name: string } | null
}

type Toast = { message: string; type: 'success' | 'error' } | null

/* ── Slug helper ─────────────────────────────────────────────────────────── */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')

  const [showModal, setShowModal]           = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm]                     = useState({ name: '', slug: '', parent_id: '', active: true })
  const [slugManual, setSlugManual]         = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [deleteConfirm, setDeleteConfirm]   = useState<number | null>(null)
  const [deleting, setDeleting]             = useState(false)

  const [toast, setToast] = useState<Toast>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch ── */
  async function fetchCategories() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/armazem/categorias')
      if (!res.ok) throw new Error('Erro ao carregar categorias')
      const data = await res.json()
      setCategories(data.categories ?? data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  /* ── toast ── */
  function showToast(message: string, type: 'success' | 'error') {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ message, type })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  /* ── open modal ── */
  function openCreate() {
    setEditingCategory(null)
    setForm({ name: '', slug: '', parent_id: '', active: true })
    setSlugManual(false)
    setShowModal(true)
  }

  function openEdit(c: Category) {
    setEditingCategory(c)
    setForm({
      name: c.name,
      slug: c.slug,
      parent_id: c.parent_id ? String(c.parent_id) : '',
      active: c.active,
    })
    setSlugManual(true) // in edit mode, don't auto-overwrite slug
    setShowModal(true)
  }

  /* ── form handlers ── */
  function handleNameChange(value: string) {
    setForm(prev => ({
      ...prev,
      name: value,
      slug: slugManual ? prev.slug : toSlug(value),
    }))
  }

  function handleSlugChange(value: string) {
    setSlugManual(true)
    setForm(prev => ({ ...prev, slug: value }))
  }

  /* ── save ── */
  async function handleSave() {
    if (!form.name.trim()) { showToast('Nome é obrigatório', 'error'); return }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || toSlug(form.name),
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        active: form.active,
      }
      const url    = editingCategory ? `/api/armazem/categorias/${editingCategory.id}` : '/api/armazem/categorias'
      const method = editingCategory ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao salvar')
      }
      showToast(editingCategory ? 'Categoria atualizada!' : 'Categoria criada!', 'success')
      setShowModal(false)
      fetchCategories()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── toggle active ── */
  async function toggleActive(c: Category) {
    try {
      const res = await fetch(`/api/armazem/categorias/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active }),
      })
      if (!res.ok) throw new Error()
      showToast(c.active ? 'Categoria desativada' : 'Categoria ativada', 'success')
      fetchCategories()
    } catch {
      showToast('Erro ao atualizar status', 'error')
    }
  }

  /* ── delete ── */
  async function handleDelete(id: number) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/armazem/categorias/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao excluir')
      }
      showToast('Categoria excluída', 'success')
      setDeleteConfirm(null)
      fetchCategories()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao excluir', 'error')
    } finally {
      setDeleting(false)
    }
  }

  /* ── filtered ── */
  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  /* ── parent options ── */
  const parentOptions = categories.filter(c => !editingCategory || c.id !== editingCategory.id)

  return (
    <div>
      <Header title="Categorias" subtitle="Organização interna dos produtos" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/60' : 'bg-red-900/90 text-red-200 border border-red-700/60'}`}>
          {toast.message}
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5 opacity-70" /></button>
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
            />
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm ml-auto px-4 py-2 rounded-lg">
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="glass-card p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={fetchCategories} className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline">Tentar novamente</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Tag className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">
              {search ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {search
                ? 'Tente um termo diferente.'
                : 'Crie categorias internas para organizar seus produtos no armazém.'}
            </p>
            {!search && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg">
                <Plus className="w-4 h-4" />
                Criar primeira categoria
              </button>
            )}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Categoria Pai</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                            <Tag className="w-3.5 h-3.5 text-violet-400" />
                          </div>
                          <span className="font-medium text-slate-200">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded">{c.slug}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.parent ? (
                          <div className="flex items-center gap-1 text-slate-400 text-xs">
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                            {c.parent.name}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-700/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-500 ring-1 ring-white/[0.06]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-slate-400">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deleting}
                              className="text-xs px-2 py-1 rounded bg-red-600/80 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {deleting ? '...' : 'Excluir'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs px-2 py-1 rounded border border-white/[0.08] text-slate-400 hover:bg-white/[0.04] transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(c)}
                              title="Editar"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleActive(c)}
                              title={c.active ? 'Desativar' : 'Ativar'}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                            >
                              {c.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(c.id)}
                              title="Excluir"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-200">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="ex: Eletrônicos"
                  className="input-cyber w-full px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="ex: eletronicos"
                  className="input-cyber w-full px-3 py-2 text-sm font-mono"
                />
                <p className="text-[10px] text-slate-600 mt-1">Gerado automaticamente a partir do nome</p>
              </div>

              {/* Categoria Pai */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoria Pai</label>
                <select
                  value={form.parent_id}
                  onChange={e => setForm(prev => ({ ...prev, parent_id: e.target.value }))}
                  className="input-cyber w-full px-3 py-2 text-sm"
                >
                  <option value="">Nenhuma (categoria raiz)</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Status (edit only) */}
              {editingCategory && (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Status</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Categoria {form.active ? 'ativa' : 'inativa'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.active ? 'bg-emerald-600' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
