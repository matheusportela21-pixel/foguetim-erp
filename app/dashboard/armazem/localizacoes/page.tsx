'use client'

import { useEffect, useState, useRef } from 'react'
import { MapPin, Plus, Search, Pencil, Eye, EyeOff, X } from 'lucide-react'
import Header from '@/components/Header'

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Location {
  id: number
  warehouse_id: number
  label: string
  rua: string | null
  corredor: string | null
  prateleira: string | null
  nivel: string | null
  box: string | null
  active: boolean
  warehouse: { id: number; name: string }
}

interface Warehouse {
  id: number
  name: string
  code: string | null
  active: boolean
}

type Toast = { message: string; type: 'success' | 'error' } | null

/* ── Auto-label helper ───────────────────────────────────────────────────── */
function autoLabel(fields: { rua: string; corredor: string; prateleira: string; nivel: string; box: string }): string {
  return [fields.rua, fields.corredor, fields.prateleira, fields.nivel, fields.box]
    .filter(Boolean)
    .join('-')
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function LocalizacoesPage() {
  const [locations, setLocations]   = useState<Location[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')

  const [showModal, setShowModal]             = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [form, setForm] = useState({
    warehouse_id: '',
    label: '',
    rua: '',
    corredor: '',
    prateleira: '',
    nivel: '',
    box: '',
    active: true,
  })
  const [labelManual, setLabelManual] = useState(false)
  const [saving, setSaving]           = useState(false)

  const [toast, setToast] = useState<Toast>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── fetch warehouses ── */
  async function fetchWarehouses() {
    try {
      const res = await fetch('/api/armazem/armazens')
      if (!res.ok) return
      const json = await res.json()
      setWarehouses(json.data ?? [])
    } catch {
      // non-critical
    }
  }

  /* ── fetch locations ── */
  async function fetchLocations() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedWarehouse) params.set('warehouse_id', selectedWarehouse)
      const res = await fetch(`/api/armazem/localizacoes?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar localizações')
      const json = await res.json()
      setLocations(json.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarehouses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchLocations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouse])

  /* ── toast ── */
  function showToast(message: string, type: 'success' | 'error') {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ message, type })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  /* ── open modal ── */
  function openCreate() {
    setEditingLocation(null)
    const defaultWh = selectedWarehouse || (warehouses[0]?.id ? String(warehouses[0].id) : '')
    setForm({ warehouse_id: defaultWh, label: '', rua: '', corredor: '', prateleira: '', nivel: '', box: '', active: true })
    setLabelManual(false)
    setShowModal(true)
  }

  function openEdit(l: Location) {
    setEditingLocation(l)
    setForm({
      warehouse_id: String(l.warehouse_id),
      label: l.label,
      rua: l.rua ?? '',
      corredor: l.corredor ?? '',
      prateleira: l.prateleira ?? '',
      nivel: l.nivel ?? '',
      box: l.box ?? '',
      active: l.active,
    })
    setLabelManual(true)
    setShowModal(true)
  }

  /* ── form: update position field and auto-label ── */
  function updatePositionField(field: 'rua' | 'corredor' | 'prateleira' | 'nivel' | 'box', value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      const generated = autoLabel({
        rua: updated.rua,
        corredor: updated.corredor,
        prateleira: updated.prateleira,
        nivel: updated.nivel,
        box: updated.box,
      })
      return {
        ...updated,
        label: labelManual ? prev.label : (generated || prev.label),
      }
    })
  }

  /* ── save ── */
  async function handleSave() {
    if (!form.warehouse_id) { showToast('Selecione um armazém', 'error'); return }
    const finalLabel = form.label.trim() ||
      autoLabel({ rua: form.rua, corredor: form.corredor, prateleira: form.prateleira, nivel: form.nivel, box: form.box })
    if (!finalLabel) { showToast('Informe um label ou preencha os campos de posição', 'error'); return }

    setSaving(true)
    try {
      const body = {
        warehouse_id: Number(form.warehouse_id),
        label: finalLabel,
        rua: form.rua.trim() || null,
        corredor: form.corredor.trim() || null,
        prateleira: form.prateleira.trim() || null,
        nivel: form.nivel.trim() || null,
        box: form.box.trim() || null,
        ...(editingLocation ? { active: form.active } : {}),
      }
      const url    = editingLocation ? `/api/armazem/localizacoes/${editingLocation.id}` : '/api/armazem/localizacoes'
      const method = editingLocation ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao salvar')
      }
      showToast(editingLocation ? 'Localização atualizada!' : 'Localização criada!', 'success')
      setShowModal(false)
      fetchLocations()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── toggle active ── */
  async function toggleActive(l: Location) {
    try {
      const res = await fetch(`/api/armazem/localizacoes/${l.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !l.active }),
      })
      if (!res.ok) throw new Error()
      showToast(l.active ? 'Localização desativada' : 'Localização ativada', 'success')
      fetchLocations()
    } catch {
      showToast('Erro ao atualizar status', 'error')
    }
  }

  /* ── filtered ── */
  const filtered = locations.filter(l => {
    const q = search.toLowerCase()
    return (
      l.label.toLowerCase().includes(q) ||
      (l.rua ?? '').toLowerCase().includes(q) ||
      (l.corredor ?? '').toLowerCase().includes(q) ||
      l.warehouse.name.toLowerCase().includes(q)
    )
  })

  /* ── position preview for modal ── */
  const formPreviewLabel = autoLabel({ rua: form.rua, corredor: form.corredor, prateleira: form.prateleira, nivel: form.nivel, box: form.box })

  return (
    <div>
      <Header title="Localizações" subtitle="Pontos de armazenamento dentro dos armazéns" />

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
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="input-cyber px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">Todos os armazéns</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar localização..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
            />
          </div>

          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm ml-auto px-4 py-2 rounded-lg">
            <Plus className="w-4 h-4" />
            Nova Localização
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="glass-card p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={fetchLocations} className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline">
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">
              {search || selectedWarehouse ? 'Nenhuma localização encontrada' : 'Nenhuma localização cadastrada'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {search || selectedWarehouse
                ? 'Tente outros filtros.'
                : 'Cadastre as localizações físicas do seu armazém para rastrear onde cada produto está guardado.'}
            </p>
            {!search && !selectedWarehouse && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg">
                <Plus className="w-4 h-4" />
                Criar primeira localização
              </button>
            )}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Label</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Armazém</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Rua</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Corredor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Prateleira</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(l => (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-violet-300 bg-violet-900/20 border border-violet-700/30 px-2 py-0.5 rounded">
                          {l.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-slate-700/60 flex items-center justify-center shrink-0">
                            <MapPin className="w-3 h-3 text-slate-500" />
                          </div>
                          <span className="text-slate-300 text-xs">{l.warehouse.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-slate-400 text-xs">{l.rua ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs">{l.corredor ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-slate-400 text-xs">{l.prateleira ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {l.active ? (
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
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(l)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(l)}
                            title={l.active ? 'Desativar' : 'Ativar'}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                          >
                            {l.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
          <div className="glass-card w-full max-w-lg p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-200">
                {editingLocation ? 'Editar Localização' : 'Nova Localização'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Armazém */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Armazém <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.warehouse_id}
                  onChange={e => setForm(prev => ({ ...prev, warehouse_id: e.target.value }))}
                  className="input-cyber w-full px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Label */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Label</label>
                  {!labelManual && formPreviewLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-400 border border-violet-700/30">
                      auto
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => { setLabelManual(true); setForm(prev => ({ ...prev, label: e.target.value })) }}
                  placeholder={formPreviewLabel || 'ex: A-01-P3'}
                  className="input-cyber w-full px-3 py-2 text-sm font-mono"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Gerado automaticamente a partir dos campos abaixo, ou defina manualmente
                </p>
              </div>

              {/* Position fields */}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Posição no armazém</p>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { key: 'rua',        label: 'Rua' },
                      { key: 'corredor',   label: 'Corredor' },
                      { key: 'prateleira', label: 'Prateleira' },
                      { key: 'nivel',      label: 'Nível' },
                      { key: 'box',        label: 'Box' },
                    ] as { key: 'rua' | 'corredor' | 'prateleira' | 'nivel' | 'box'; label: string }[]
                  ).map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        {label} <span className="text-slate-700">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={form[key]}
                        onChange={e => updatePositionField(key, e.target.value)}
                        placeholder={`ex: ${label[0]}1`}
                        className="input-cyber w-full px-3 py-1.5 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Status (edit only) */}
              {editingLocation && (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Status</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Localização {form.active ? 'ativa' : 'inativa'}</p>
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
