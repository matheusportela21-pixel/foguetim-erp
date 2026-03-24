'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  DollarSign, Plus, Search, Pencil, X, Check, Minus,
  TrendingUp, ToggleLeft, ToggleRight, FileText, Activity,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { FinancialNav } from '@/components/shared/FinancialNav'

/* ── Types ──────────────────────────────────────────────────────────────── */
type Recurrence = 'monthly' | 'annual' | 'biweekly' | 'weekly' | 'one_time'

interface Cost {
  id: number
  name: string
  category: string
  amount: number
  recurrence: Recurrence
  is_active: boolean
  include_in_reports: boolean
  start_date: string
  end_date: string | null
  notes: string | null
}

interface FormState {
  name: string
  category: string
  custom_category: string
  amount: string
  recurrence: Recurrence
  is_active: boolean
  include_in_reports: boolean
  start_date: string
  end_date: string
  notes: string
}

type Toast = { message: string; type: 'success' | 'error' } | null

/* ── Constants ───────────────────────────────────────────────────────────── */
const CATEGORY_OPTIONS = [
  'Aluguel', 'Água', 'Energia', 'Internet', 'Telefone',
  'Contabilidade', 'Folha/Pessoal', 'Pró-labore', 'Sistemas/Softwares',
  'Marketing', 'Fretes Operacionais', 'Impostos Gerais', 'Outros',
  'Personalizada',
]

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  monthly:  'Mensal',
  annual:   'Anual',
  biweekly: 'Quinzenal',
  weekly:   'Semanal',
  one_time: 'Avulso',
}

const EMPTY_FORM: FormState = {
  name: '',
  category: 'Outros',
  custom_category: '',
  amount: '',
  recurrence: 'monthly',
  is_active: true,
  include_in_reports: true,
  start_date: '',
  end_date: '',
  notes: '',
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function toMonthlyAmount(cost: Cost): number {
  switch (cost.recurrence) {
    case 'monthly':  return cost.amount
    case 'annual':   return cost.amount / 12
    case 'biweekly': return cost.amount * 2
    case 'weekly':   return cost.amount * 4.33
    case 'one_time': return 0
  }
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function CustosPage() {
  const [costs, setCosts]           = useState<Cost[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [search, setSearch]         = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus]       = useState<'all' | 'active' | 'inactive'>('all')
  const [filterCategory, setFilterCategory]   = useState('')
  const [filterRecurrence, setFilterRecurrence] = useState<Recurrence | ''>('')

  const [showModal, setShowModal]         = useState(false)
  const [editingCost, setEditingCost]     = useState<Cost | null>(null)
  const [form, setForm]                   = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]               = useState(false)
  const [toggleConfirm, setToggleConfirm] = useState<number | null>(null)
  const [toggling, setToggling]           = useState(false)

  const [toast, setToast] = useState<Toast>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── debounce search ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  /* ── fetch ── */
  const fetchCosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/empresa/custos')
      if (!res.ok) throw new Error('Erro ao carregar custos')
      const data = await res.json()
      setCosts(data.costs ?? data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCosts() }, [fetchCosts])

  /* ── toast ── */
  function showToast(message: string, type: 'success' | 'error') {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ message, type })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  /* ── KPIs ── */
  const activeCosts = costs.filter(c => c.is_active)
  const totalMonthly = activeCosts.reduce((acc, c) => acc + toMonthlyAmount(c), 0)
  const totalAnnual  = totalMonthly * 12
  const countActive  = activeCosts.length
  const countReports = costs.filter(c => c.include_in_reports).length

  /* ── unique categories ── */
  const allCategories = Array.from(new Set(costs.map(c => c.category))).sort()

  /* ── filtered ── */
  const filtered = costs.filter(c => {
    const matchSearch = !debouncedSearch ||
      c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchStatus =
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? c.is_active :
      !c.is_active
    const matchCategory = !filterCategory || c.category === filterCategory
    const matchRecurrence = !filterRecurrence || c.recurrence === filterRecurrence
    return matchSearch && matchStatus && matchCategory && matchRecurrence
  })

  /* ── open modal ── */
  function openCreate() {
    setEditingCost(null)
    setForm({ ...EMPTY_FORM, start_date: new Date().toISOString().split('T')[0] })
    setShowModal(true)
  }

  function openEdit(c: Cost) {
    setEditingCost(c)
    const isCustom = !CATEGORY_OPTIONS.includes(c.category) || c.category === 'Personalizada'
    setForm({
      name: c.name,
      category: isCustom ? 'Personalizada' : c.category,
      custom_category: isCustom ? c.category : '',
      amount: String(c.amount),
      recurrence: c.recurrence,
      is_active: c.is_active,
      include_in_reports: c.include_in_reports,
      start_date: c.start_date ?? '',
      end_date: c.end_date ?? '',
      notes: c.notes ?? '',
    })
    setShowModal(true)
  }

  /* ── save ── */
  async function handleSave() {
    if (!form.name.trim()) { showToast('Nome é obrigatório', 'error'); return }
    const parsedAmount = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount < 0) { showToast('Valor inválido', 'error'); return }

    const resolvedCategory = form.category === 'Personalizada'
      ? form.custom_category.trim() || 'Outros'
      : form.category

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        category: resolvedCategory,
        amount: parsedAmount,
        recurrence: form.recurrence,
        is_active: form.is_active,
        include_in_reports: form.include_in_reports,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes.trim() || null,
      }
      const url    = editingCost ? `/api/empresa/custos/${editingCost.id}` : '/api/empresa/custos'
      const method = editingCost ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Erro ao salvar')
      }
      showToast(editingCost ? 'Custo atualizado!' : 'Custo criado!', 'success')
      setShowModal(false)
      fetchCosts()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── toggle active ── */
  async function handleToggle(c: Cost) {
    setToggling(true)
    try {
      const res = await fetch(`/api/empresa/custos/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !c.is_active }),
      })
      if (!res.ok) throw new Error()
      showToast(c.is_active ? 'Custo desativado' : 'Custo ativado', 'success')
      setToggleConfirm(null)
      fetchCosts()
    } catch {
      showToast('Erro ao atualizar status', 'error')
    } finally {
      setToggling(false)
    }
  }

  const hasFilters = !!debouncedSearch || filterStatus !== 'all' || !!filterCategory || !!filterRecurrence

  return (
    <div>
      <PageHeader title="Custos da Empresa" description="Controle de custos fixos e variáveis" />
      <FinancialNav />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.type === 'success'
            ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/60'
            : 'bg-red-900/90 text-red-200 border border-red-700/60'}`}>
          {toast.message}
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5 opacity-70" /></button>
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Mensal */}
          <div className="glass-card rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Mensal</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-100 font-['Sora']">{fmtCurrency(totalMonthly)}</p>
            <p className="text-[11px] text-slate-600">Custos ativos estimados</p>
          </div>

          {/* Total Anual */}
          <div className="glass-card rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Anual</span>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-100 font-['Sora']">{fmtCurrency(totalAnnual)}</p>
            <p className="text-[11px] text-slate-600">Projeção anual</p>
          </div>

          {/* Custos Ativos */}
          <div className="glass-card rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Custos Ativos</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-100 font-['Sora']">{countActive}</p>
            <p className="text-[11px] text-slate-600">de {costs.length} cadastrados</p>
          </div>

          {/* Nos Relatórios */}
          <div className="glass-card rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nos Relatórios</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-100 font-['Sora']">{countReports}</p>
            <p className="text-[11px] text-slate-600">incluídos nos relatórios</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar custo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm rounded-xl"
            />
          </div>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="input-cyber px-3 py-2 text-sm rounded-xl"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>

          {/* Categoria */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="input-cyber px-3 py-2 text-sm rounded-xl"
          >
            <option value="">Todas as categorias</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Recorrência */}
          <select
            value={filterRecurrence}
            onChange={e => setFilterRecurrence(e.target.value as Recurrence | '')}
            className="input-cyber px-3 py-2 text-sm rounded-xl"
          >
            <option value="">Todas as recorrências</option>
            {(Object.entries(RECURRENCE_LABELS) as [Recurrence, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <button
            onClick={openCreate}
            className="btn-primary flex items-center gap-2 text-sm ml-auto px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Adicionar Custo
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="glass-card rounded-2xl p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={fetchCosts} className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline">
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <DollarSign className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">
              {hasFilters ? 'Nenhum custo encontrado' : 'Nenhum custo cadastrado'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {hasFilters
                ? 'Tente ajustar os filtros ou limpar a busca.'
                : 'Cadastre os custos fixos e variáveis da sua operação para acompanhar a saúde financeira.'}
            </p>
            {!hasFilters && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-xl">
                <Plus className="w-4 h-4" />
                Adicionar primeiro custo
              </button>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Categoria</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Recorrência</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Relatórios?</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Início</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Nome */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <div>
                            <span className="font-medium text-slate-200">{c.name}</span>
                            {c.notes && (
                              <p className="text-[11px] text-slate-600 truncate max-w-[160px]">{c.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md">{c.category}</span>
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-slate-200">{fmtCurrency(c.amount)}</span>
                      </td>

                      {/* Recorrência */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-slate-400">{RECURRENCE_LABELS[c.recurrence]}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {c.is_active ? (
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

                      {/* Relatórios */}
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {c.include_in_reports
                          ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          : <Minus className="w-4 h-4 text-slate-600 mx-auto" />
                        }
                      </td>

                      {/* Início */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500">{fmtDate(c.start_date)}</span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        {toggleConfirm === c.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-slate-400">
                              {c.is_active ? 'Desativar custo?' : 'Ativar custo?'}
                            </span>
                            <button
                              onClick={() => handleToggle(c)}
                              disabled={toggling}
                              className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                                c.is_active
                                  ? 'bg-red-600/80 text-white hover:bg-red-600'
                                  : 'bg-emerald-600/80 text-white hover:bg-emerald-600'
                              }`}
                            >
                              {toggling ? '...' : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => setToggleConfirm(null)}
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
                              onClick={() => setToggleConfirm(c.id)}
                              title={c.is_active ? 'Desativar' : 'Ativar'}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
                            >
                              {c.is_active
                                ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
                                : <ToggleLeft className="w-3.5 h-3.5" />
                              }
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-200 font-['Sora']">
                {editingCost ? 'Editar Custo' : 'Novo Custo'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Aluguel do galpão"
                  className="input-cyber w-full px-3 py-2 text-sm rounded-xl"
                  autoFocus
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoria</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="input-cyber w-full px-3 py-2 text-sm rounded-xl"
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {form.category === 'Personalizada' && (
                  <input
                    type="text"
                    value={form.custom_category}
                    onChange={e => setForm(prev => ({ ...prev, custom_category: e.target.value }))}
                    placeholder="Nome da categoria personalizada"
                    className="input-cyber w-full px-3 py-2 text-sm rounded-xl mt-2"
                  />
                )}
              </div>

              {/* Valor + Recorrência */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0,00"
                    className="input-cyber w-full px-3 py-2 text-sm rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Recorrência</label>
                  <select
                    value={form.recurrence}
                    onChange={e => setForm(prev => ({ ...prev, recurrence: e.target.value as Recurrence }))}
                    className="input-cyber w-full px-3 py-2 text-sm rounded-xl"
                  >
                    {(Object.entries(RECURRENCE_LABELS) as [Recurrence, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data de início + fim */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de início</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="input-cyber w-full px-3 py-2 text-sm rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Data de fim <span className="text-slate-600">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="input-cyber w-full px-3 py-2 text-sm rounded-xl"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Observações <span className="text-slate-600">(opcional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionais sobre este custo..."
                  rows={3}
                  className="input-cyber w-full px-3 py-2 text-sm rounded-xl resize-none"
                />
              </div>

              {/* Incluir nos relatórios */}
              <div className="flex items-center justify-between py-1 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-xs font-medium text-slate-300">Incluir nos relatórios gerenciais?</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Aparece nos dashboards financeiros e exportações
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, include_in_reports: !prev.include_in_reports }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    form.include_in_reports ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    form.include_in_reports ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Status (edit only) */}
              {editingCost && (
                <div className="flex items-center justify-between py-1 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div>
                    <p className="text-xs font-medium text-slate-300">Status</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Custo {form.is_active ? 'ativo' : 'inativo'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.is_active ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
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
                className="btn-primary text-sm px-4 py-2 rounded-xl disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : editingCost ? 'Salvar alterações' : 'Criar custo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
