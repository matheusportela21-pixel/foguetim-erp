'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Building2, Plus, Pencil, Star, Eye, EyeOff, X, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuth } from '@/lib/auth-context'
import { getWarehouseLimit } from '@/lib/plan-limits'

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Warehouse {
  id: number
  name: string
  code: string | null
  is_default: boolean
  active: boolean
  created_at: string
}

type Toast = { message: string; type: 'success' | 'error' } | null

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function ArmazensPage() {
  const { profile } = useAuth()

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const warehouseLimit = getWarehouseLimit(profile?.plan)
  const atLimit        = warehouses.length >= warehouseLimit

  const [showModal, setShowModal]           = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [form, setForm] = useState({ name: '', code: '', is_default: false, active: true })
  const [saving, setSaving]                 = useState(false)

  const [toast, setToast] = useState<Toast>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch ── */
  async function fetchWarehouses() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/armazem/armazens')
      if (!res.ok) throw new Error('Erro ao carregar armazéns')
      const json = await res.json()
      setWarehouses(json.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWarehouses() }, [])

  /* ── toast ── */
  function showToast(message: string, type: 'success' | 'error') {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ message, type })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  /* ── open modal ── */
  function openCreate() {
    setEditingWarehouse(null)
    setForm({ name: '', code: '', is_default: false, active: true })
    setShowModal(true)
  }

  function openEdit(w: Warehouse) {
    setEditingWarehouse(w)
    setForm({ name: w.name, code: w.code ?? '', is_default: w.is_default, active: w.active })
    setShowModal(true)
  }

  /* ── save ── */
  async function handleSave() {
    if (!form.name.trim()) { showToast('Nome é obrigatório', 'error'); return }
    if (!editingWarehouse && atLimit && isFinite(warehouseLimit)) {
      showToast(`Limite de ${warehouseLimit} armazém${warehouseLimit !== 1 ? 's' : ''} atingido. Faça upgrade do plano.`, 'error')
      return
    }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || null,
        is_default: form.is_default,
        ...(editingWarehouse ? { active: form.active } : {}),
      }
      const url    = editingWarehouse ? `/api/armazem/armazens/${editingWarehouse.id}` : '/api/armazem/armazens'
      const method = editingWarehouse ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao salvar')
      }
      showToast(editingWarehouse ? 'Armazém atualizado!' : 'Armazém criado!', 'success')
      setShowModal(false)
      fetchWarehouses()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── toggle active ── */
  async function toggleActive(w: Warehouse) {
    try {
      const res = await fetch(`/api/armazem/armazens/${w.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !w.active }),
      })
      if (!res.ok) throw new Error()
      showToast(w.active ? 'Armazém desativado' : 'Armazém ativado', 'success')
      fetchWarehouses()
    } catch {
      showToast('Erro ao atualizar status', 'error')
    }
  }

  return (
    <div>
      <PageHeader title="Armazéns" description="Gerencie seus centros de distribuição" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/60' : 'bg-red-900/90 text-red-200 border border-red-700/60'}`}>
          {toast.message}
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5 opacity-70" /></button>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-slate-500">
              Cada armazém tem seu próprio estoque, localizações e histórico de movimentações.
            </p>
            {!loading && (
              <p className="text-xs text-slate-600 mt-0.5">
                {warehouses.length} de {isFinite(warehouseLimit) ? warehouseLimit : '∞'} armazéns usados
                {isFinite(warehouseLimit) && (
                  <> · Plano <span className="text-slate-500 font-medium">{profile?.plan ?? 'Explorador'}</span></>
                )}
              </p>
            )}
          </div>
          {atLimit && isFinite(warehouseLimit) ? (
            <Link
              href="/planos"
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Limite atingido · Fazer upgrade
            </Link>
          ) : (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg">
              <Plus className="w-4 h-4" />
              Novo Armazém
            </button>
          )}
        </div>

        {/* Plan limit banner */}
        {!loading && atLimit && isFinite(warehouseLimit) && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-950/30 border border-purple-800/40">
            <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-300">
                Limite de {warehouseLimit} armazém{warehouseLimit !== 1 ? 's' : ''} atingido
              </p>
              <p className="text-xs text-purple-400/70 mt-0.5">
                Seu plano permite até {warehouseLimit} armazém{warehouseLimit !== 1 ? 's' : ''}.{' '}
                <Link href="/planos" className="underline hover:text-purple-300">Faça upgrade</Link>{' '}
                para criar mais.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="glass-card p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={fetchWarehouses} className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline">Tentar novamente</button>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhum armazém cadastrado</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Crie armazéns para organizar seu estoque físico e rastrear movimentações.
            </p>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg">
              <Plus className="w-4 h-4" />
              Criar primeiro armazém
            </button>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Padrão</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Criado em</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {warehouses.map(w => (
                    <tr key={w.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-violet-400" />
                          </div>
                          <span className="font-medium text-slate-200">{w.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {w.code ? (
                          <span className="font-mono text-xs text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">{w.code}</span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.is_default ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40 w-fit">
                            <Star className="w-3 h-3 fill-amber-400" />
                            Padrão
                          </span>
                        ) : (
                          <Star className="w-4 h-4 text-slate-700" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.active ? (
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
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-slate-500">{formatDate(w.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(w)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(w)}
                            title={w.active ? 'Desativar' : 'Ativar'}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                          >
                            {w.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-200">
                {editingWarehouse ? 'Editar Armazém' : 'Novo Armazém'}
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
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Armazém Central"
                  className="input-cyber w-full px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              {/* Código */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Código <span className="text-slate-600">(opcional)</span></label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase().slice(0, 10) }))}
                  placeholder="ex: PRINC"
                  className="input-cyber w-full px-3 py-2 text-sm font-mono"
                  maxLength={10}
                />
                <p className="text-[10px] text-slate-600 mt-1">Máx. 10 caracteres, convertido para maiúsculas</p>
              </div>

              {/* Armazém Padrão */}
              <div className={`rounded-xl border p-4 space-y-2 transition-colors ${form.is_default ? 'border-amber-700/40 bg-amber-900/10' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-300">Armazém Padrão</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {form.is_default
                        ? 'Este armazém será usado como padrão para novos produtos.'
                        : 'Ao definir como padrão, o armazém atual padrão será substituído.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, is_default: !prev.is_default }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_default ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.is_default ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {form.is_default && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80 bg-amber-900/20 rounded-lg px-3 py-1.5">
                    <Star className="w-3 h-3 fill-amber-400/60" />
                    Este armazém será marcado como padrão
                  </div>
                )}
              </div>

              {/* Status (edit only) */}
              {editingWarehouse && (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Status</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Armazém {form.active ? 'ativo' : 'inativo'}</p>
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
