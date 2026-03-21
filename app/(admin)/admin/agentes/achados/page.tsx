'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, XCircle, AlertCircle, Info, CheckCircle2,
  Search, Filter, RefreshCw, ChevronRight, FileText,
  Shield, BarChart3, Bot, Rocket, Scale, Globe,
  ChevronDown, X, Activity, Download,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AchadoItem {
  report_id: string; report_status: string; report_created_at: string
  agent_nome: string; agent_slug: string; agent_categoria: string
  titulo: string; descricao: string; severidade: string
  sugestao: string; modulo_afetado: string
}

interface FilterOptions {
  agentes:    Array<{ slug: string; nome: string; categoria: string }>
  modulos:    string[]
  categorias: string[]
}

// ── Config ────────────────────────────────────────────────────────────────────

const SEV_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  critica: { label: 'Crítica', color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/30',     icon: XCircle      },
  alta:    { label: 'Alta',    color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/30', icon: AlertTriangle },
  media:   { label: 'Média',  color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/30',   icon: AlertCircle  },
  baixa:   { label: 'Baixa',  color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/30',     icon: Info         },
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  novo:         { label: 'Novo',         color: 'text-violet-400 bg-violet-900/20 border-violet-700/30' },
  lido:         { label: 'Lido',         color: 'text-slate-400 bg-slate-800 border-slate-700/30'       },
  em_andamento: { label: 'Em andamento', color: 'text-amber-400 bg-amber-900/20 border-amber-700/30'    },
  resolvido:    { label: 'Resolvido',    color: 'text-green-400 bg-green-900/20 border-green-700/30'    },
  descartado:   { label: 'Descartado',   color: 'text-slate-500 bg-slate-800/40 border-slate-700/20'    },
}

const CAT_ICON: Record<string, React.ElementType> = {
  protecao: Shield, produto: BarChart3, meta: Bot,
  deploy: Rocket, compliance: Scale, marketplace: Globe, default: Bot,
}

const CAT_COLOR: Record<string, string> = {
  protecao:    'text-red-400',    produto:   'text-blue-400',
  meta:        'text-violet-400', deploy:    'text-green-400',
  compliance:  'text-amber-400',  marketplace: 'text-orange-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

// ── Export Dropdown ───────────────────────────────────────────────────────────

function ExportAchadosDropdown({ filters }: {
  filters: {
    search: string; period: string
    sevFilter: string[]; stsFilter: string[]; agtFilter: string[]; catFilter: string[]
  }
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function buildQS(format: string) {
    const qs = new URLSearchParams({ format })
    if (filters.period !== 'all') {
      qs.set('period', filters.period)
    }
    filters.sevFilter.forEach(s => qs.append('severidade', s))
    filters.stsFilter.forEach(s => qs.append('status', s))
    filters.agtFilter.forEach(s => qs.append('agente', s))
    if (filters.search) qs.set('search', filters.search)
    return qs.toString()
  }

  const dl = (format: string) => {
    window.open(`/api/admin/agentes/export?${buildQS(format)}`, '_blank')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="h-9 px-3 text-sm rounded-lg flex items-center gap-1.5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all">
        <Download size={13} /> Exportar <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-20 py-1 min-w-[160px]">
          {(['JSON', 'CSV', 'Markdown'] as const).map(f => (
            <button key={f} onClick={() => dl(f.toLowerCase())}
              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors">
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AchadosPage() {
  const [achados,   setAchados]   = useState<AchadoItem[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [filters,   setFilters]   = useState<FilterOptions>({ agentes: [], modulos: [], categorias: [] })
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [page,      setPage]      = useState(1)

  // Filter state
  const [search,     setSearch]     = useState('')
  const [sevFilter,  setSevFilter]  = useState<string[]>([])
  const [stsFilter,  setStsFilter]  = useState<string[]>([])
  const [agtFilter,  setAgtFilter]  = useState<string[]>([])
  const [catFilter,  setCatFilter]  = useState<string[]>([])
  const [period,     setPeriod]     = useState('30d')

  const limit = 50
  const searchRef = useRef<NodeJS.Timeout>()

  const load = useCallback(async (pg = page) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(pg), limit: String(limit) })
    if (search)              qs.set('search', search)
    if (period !== 'all') {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      qs.set('after', new Date(Date.now() - days * 86_400_000).toISOString())
    }
    sevFilter.forEach(s => qs.append('severidade', s))
    stsFilter.forEach(s => qs.append('status', s))
    agtFilter.forEach(s => qs.append('agente', s))
    catFilter.forEach(c => qs.append('categoria', c))

    try {
      const res  = await fetch(`/api/admin/agentes/achados?${qs}`)
      const data = await res.json() as { achados: AchadoItem[]; total: number; filters_available: FilterOptions }
      setAchados(data.achados ?? [])
      setTotal(data.total ?? 0)
      if (data.filters_available) setFilters(data.filters_available)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, search, period, sevFilter, stsFilter, agtFilter, catFilter])

  useEffect(() => {
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => { setPage(1); load(1) }, 300)
    return () => clearTimeout(searchRef.current)
  }, [search]) // eslint-disable-line

  useEffect(() => { setPage(1); load(1) }, [sevFilter, stsFilter, agtFilter, catFilter, period]) // eslint-disable-line

  function toggleSev(s: string) { setSevFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]) }
  function toggleSts(s: string) { setStsFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]) }
  function toggleAgt(s: string) { setAgtFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]) }
  function toggleCat(s: string) { setCatFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]) }

  function toggleSelect(reportId: string) {
    setSelected(prev => { const s = new Set(prev); s.has(reportId) ? s.delete(reportId) : s.add(reportId); return s })
  }
  function selectAll() { setSelected(new Set(achados.map(a => a.report_id))) }
  function clearSelect() { setSelected(new Set()) }

  async function applyBulk() {
    if (!bulkStatus || selected.size === 0) return
    setSaving(true)
    try {
      await fetch('/api/admin/agentes/achados/bulk', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: Array.from(selected), status: bulkStatus }),
      })
      clearSelect()
      load()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const pages = Math.ceil(total / limit)
  const hasFilters = sevFilter.length || stsFilter.length || agtFilter.length || catFilter.length || search

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/agentes" className="hover:text-slate-300 transition-colors">Agentes</Link>
            <ChevronRight size={14} />
            <span className="text-slate-300">Achados</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity size={22} className="text-orange-400" /> Visão Unificada de Achados
          </h1>
          <p className="text-sm text-slate-400 mt-1">Todos os achados de todos os agentes em um só lugar</p>
        </div>
        <div className="flex gap-2">
          <ExportAchadosDropdown filters={{ search, period, sevFilter, stsFilter, agtFilter, catFilter }} />
          <button onClick={() => load()} className="btn-neon h-9 px-4 text-sm rounded-lg flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card rounded-xl p-4 border border-white/8 space-y-3">
        {/* Row 1: Search + Period */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por título ou descrição…"
              className="input-cyber w-full pl-9 h-9 text-sm rounded-lg"
            />
          </div>
          <div className="flex gap-1">
            {(['7d','30d','90d','all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                {p === 'all' ? 'Todos' : p}
              </button>
            ))}
          </div>
          {hasFilters ? (
            <button onClick={() => { setSevFilter([]); setStsFilter([]); setAgtFilter([]); setCatFilter([]); setSearch('') }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              <X size={12} /> Limpar filtros
            </button>
          ) : null}
        </div>

        {/* Row 2: Severity */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-slate-500 mr-1"><Filter size={12} className="inline mr-1" />Severidade:</span>
          {Object.entries(SEV_CFG).map(([k, cfg]) => {
            const Icon = cfg.icon
            const active = sevFilter.includes(k)
            return (
              <button key={k} onClick={() => toggleSev(k)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all ${active ? `${cfg.bg} ${cfg.color}` : 'text-slate-500 border-white/10 hover:border-white/20'}`}>
                <Icon size={11} /> {cfg.label}
              </button>
            )
          })}

          <span className="text-xs text-slate-500 ml-3 mr-1">Status:</span>
          {Object.entries(STATUS_CFG).map(([k, cfg]) => {
            const active = stsFilter.includes(k)
            return (
              <button key={k} onClick={() => toggleSts(k)} className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${active ? cfg.color : 'text-slate-500 border-white/10 hover:border-white/20'}`}>
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Row 3: Category + Agent (if loaded) */}
        {filters.categorias.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-slate-500 mr-1">Categoria:</span>
            {filters.categorias.map(cat => {
              const Icon  = CAT_ICON[cat] ?? CAT_ICON['default']
              const color = CAT_COLOR[cat] ?? 'text-slate-400'
              const active = catFilter.includes(cat)
              return (
                <button key={cat} onClick={() => toggleCat(cat)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all capitalize ${active ? `${color} bg-white/10 border-white/20` : 'text-slate-500 border-white/10 hover:border-white/20'}`}>
                  <Icon size={11} /> {cat}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="glass-card rounded-xl p-3 border border-amber-700/30 bg-amber-900/10 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-amber-400 font-medium">{selected.size} selecionado(s)</span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            className="input-cyber h-8 text-xs px-2 rounded-lg"
          >
            <option value="">Alterar status para…</option>
            <option value="lido">Lido</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvido">Resolvido</option>
            <option value="descartado">Descartado</option>
          </select>
          <button
            disabled={!bulkStatus || saving}
            onClick={applyBulk}
            className="btn-neon h-8 px-3 text-xs rounded-lg disabled:opacity-40 flex items-center gap-1"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Aplicar
          </button>
          <button
            onClick={() => {
              const ids = Array.from(selected).join(',')
              window.open(`/api/admin/agentes/export/zip?agentes=&after=${new Date(Date.now() - 90 * 86_400_000).toISOString()}&report_ids=${ids}`, '_blank')
            }}
            className="h-8 px-3 text-xs rounded-lg flex items-center gap-1.5 border border-violet-700/30 text-violet-400 hover:text-violet-200 hover:border-violet-500/40 transition-all"
          >
            <Download size={12} /> Exportar ZIP
          </button>
          <button onClick={clearSelect} className="text-xs text-slate-500 hover:text-slate-300 ml-auto">Cancelar</button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
          <input
            type="checkbox"
            checked={selected.size === achados.length && achados.length > 0}
            onChange={e => e.target.checked ? selectAll() : clearSelect()}
            className="w-3.5 h-3.5 accent-orange-500"
          />
          <span className="w-20">Severidade</span>
          <span className="flex-1">Título</span>
          <span className="w-32">Agente</span>
          <span className="w-28">Módulo</span>
          <span className="w-24">Data</span>
          <span className="w-24">Status</span>
          <span className="w-16"></span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-500">
            <RefreshCw size={18} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : achados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Activity size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhum achado encontrado</p>
            {hasFilters && <p className="text-xs mt-1 text-slate-600">Tente ajustar os filtros</p>}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {achados.map((a, idx) => {
              const sc     = SEV_CFG[a.severidade] ?? SEV_CFG['baixa']
              const SevIcon = sc.icon
              const stCfg  = STATUS_CFG[a.report_status] ?? { label: a.report_status, color: 'text-slate-400' }
              const Icon   = CAT_ICON[a.agent_categoria] ?? CAT_ICON['default']
              const catClr = CAT_COLOR[a.agent_categoria] ?? 'text-slate-400'
              const isSelected = selected.has(a.report_id)
              return (
                <div
                  key={`${a.report_id}-${idx}`}
                  className={`flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-amber-900/10' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(a.report_id)}
                    className="w-3.5 h-3.5 accent-orange-500 shrink-0"
                  />
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border w-20 shrink-0 ${sc.bg} ${sc.color}`}>
                    <SevIcon size={10} /> {sc.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{a.titulo || '—'}</p>
                    {a.descricao && <p className="text-[11px] text-slate-500 truncate">{a.descricao}</p>}
                  </div>
                  <div className="w-32 shrink-0 flex items-center gap-1.5">
                    <Icon size={13} className={`${catClr} shrink-0`} />
                    <span className="text-xs text-slate-400 truncate">{a.agent_nome}</span>
                  </div>
                  <span className="w-28 text-[11px] text-slate-500 truncate shrink-0">
                    {a.modulo_afetado || '—'}
                  </span>
                  <span className="w-24 text-[11px] text-slate-500 shrink-0">{fmtDate(a.report_created_at)}</span>
                  <span className={`w-24 inline-flex items-center text-[11px] px-2 py-0.5 rounded border shrink-0 ${stCfg.color}`}>
                    {stCfg.label}
                  </span>
                  <Link
                    href={`/admin/agentes/${a.agent_slug}`}
                    className="w-16 text-xs text-violet-400 hover:text-violet-300 shrink-0 text-right"
                  >
                    Ver →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{total} achado(s) encontrado(s)</span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p) }} className="h-7 px-3 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all">←</button>
            <span>{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); load(p) }} className="h-7 px-3 rounded-lg border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 transition-all">→</button>
          </div>
        )}
      </div>
    </div>
  )
}
