'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  BookOpen, Plus, Search, RefreshCw, ChevronRight,
  Edit2, Trash2, Eye, EyeOff, Tag, Bot, CheckCircle2,
  AlertCircle, X, HelpCircle, Wrench, Newspaper, Lightbulb,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KbEntry {
  id:          string
  tipo:        string
  titulo:      string
  conteudo:    string
  tags:        string[] | null
  modulo:      string | null
  ativo:       boolean
  created_at:  string
  updated_at:  string
  fonte_agent_id: string | null
}

// ── Config ────────────────────────────────────────────────────────────────────

const TIPOS = [
  { value: 'faq',            label: 'FAQ',             icon: HelpCircle,  color: 'text-blue-400'   },
  { value: 'feature',        label: 'Funcionalidade',  icon: CheckCircle2, color: 'text-green-400'  },
  { value: 'tutorial',       label: 'Tutorial',        icon: BookOpen,    color: 'text-violet-400'  },
  { value: 'troubleshooting', label: 'Troubleshooting', icon: Wrench,    color: 'text-amber-400'   },
  { value: 'changelog',      label: 'Changelog',       icon: Newspaper,   color: 'text-cyan-400'    },
  { value: 'agent_insight',  label: 'Insight de Agente', icon: Bot,       color: 'text-orange-400'  },
]

const MODULOS = [
  'Dashboard', 'Pedidos', 'Produtos', 'SAC', 'Logística',
  'Financeiro', 'Clientes', 'Reputação', 'Configurações',
  'Packs', 'Notificações', 'Integrações', 'Agentes IA',
]

function tipoCfg(tipo: string) {
  return TIPOS.find(t => t.value === tipo) ?? { label: tipo, icon: Lightbulb, color: 'text-slate-400' }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Modal de Edição ───────────────────────────────────────────────────────────

function EntryModal({
  entry, onClose, onSave,
}: {
  entry: Partial<KbEntry> | null
  onClose: () => void
  onSave: (data: Partial<KbEntry>) => Promise<void>
}) {
  const [tipo,     setTipo]     = useState(entry?.tipo     ?? 'faq')
  const [titulo,   setTitulo]   = useState(entry?.titulo   ?? '')
  const [conteudo, setConteudo] = useState(entry?.conteudo ?? '')
  const [modulo,   setModulo]   = useState(entry?.modulo   ?? '')
  const [tagsStr,  setTagsStr]  = useState((entry?.tags ?? []).join(', '))
  const [ativo,    setAtivo]    = useState(entry?.ativo    ?? true)
  const [saving,   setSaving]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        tipo, titulo, conteudo,
        modulo: modulo || null,
        tags:   tagsStr.split(',').map(t => t.trim()).filter(Boolean),
        ativo,
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 bg-black/70" onClick={onClose}>
      <div className="bg-[#0f1120] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">{entry?.id ? 'Editar Entrada' : 'Nova Entrada'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={e => void submit(e)} className="p-6 space-y-4">
          {/* Tipo */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setTipo(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    tipo === t.value
                      ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                      : 'border-white/10 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <t.icon size={12} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Título</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              required
              placeholder="Título claro e descritivo"
              className="input-cyber w-full h-9 text-sm px-3 rounded-lg"
            />
          </div>

          {/* Conteúdo */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Conteúdo</label>
            <textarea
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              required
              rows={6}
              placeholder="Conteúdo que será injetado no chat quando relevante…"
              className="input-cyber w-full text-sm p-3 rounded-lg resize-none"
            />
          </div>

          {/* Módulo + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Módulo</label>
              <select value={modulo} onChange={e => setModulo(e.target.value)} className="input-cyber w-full h-9 text-sm px-2 rounded-lg">
                <option value="">Todos / Geral</option>
                {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Tags (separadas por vírgula)</label>
              <input
                value={tagsStr}
                onChange={e => setTagsStr(e.target.value)}
                placeholder="ml, pedidos, sincronização"
                className="input-cyber w-full h-9 text-sm px-3 rounded-lg"
              />
            </div>
          </div>

          {/* Ativo */}
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="accent-violet-500 w-4 h-4" />
            Entrada ativa (disponível no chat)
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.06]">
            <button type="button" onClick={onClose} className="h-9 px-4 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-neon h-9 px-5 text-sm rounded-lg flex items-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [entries,  setEntries]  = useState<KbEntry[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [tipoFilt, setTipoFilt] = useState('')
  const [atvFilt,  setAtvFilt]  = useState('')
  const [editEntry, setEditEntry] = useState<Partial<KbEntry> | null | false>(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const limit = 20

  const load = useCallback(async (pg = page, s = search, t = tipoFilt, a = atvFilt) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(limit) })
      if (s) params.set('search', s)
      if (t) params.set('tipo',   t)
      if (a) params.set('ativo',  a)
      const res = await fetch(`/api/admin/knowledge-base?${params.toString()}`)
      if (res.ok) {
        const d = await res.json() as { entries: KbEntry[]; total: number }
        setEntries(d.entries)
        setTotal(d.total)
      }
    } finally { setLoading(false) }
  }, [page, search, tipoFilt, atvFilt])

  useEffect(() => { void load() }, [load])

  function onSearch(v: string) {
    setSearch(v)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void load(1, v, tipoFilt, atvFilt), 400)
  }

  async function handleSave(data: Partial<KbEntry>) {
    const isEdit = !!(editEntry as KbEntry | null)?.id
    const id     = (editEntry as KbEntry | null)?.id
    const res = isEdit
      ? await fetch(`/api/admin/knowledge-base/${id}`, { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      : await fetch('/api/admin/knowledge-base',       { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { setEditEntry(false); void load() }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta entrada? Ação irreversível.')) return
    await fetch(`/api/admin/knowledge-base/${id}`, { method: 'DELETE' })
    void load()
  }

  async function toggleAtivo(entry: KbEntry) {
    await fetch(`/api/admin/knowledge-base/${entry.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !entry.ativo }),
    })
    void load()
  }

  const pages = Math.ceil(total / limit)

  // Stats by tipo
  const byTipo: Record<string, number> = {}
  for (const e of entries) byTipo[e.tipo] = (byTipo[e.tipo] ?? 0) + 1

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {editEntry !== false && (
        <EntryModal
          entry={editEntry}
          onClose={() => setEditEntry(false)}
          onSave={handleSave}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-slate-300 transition-colors">Admin</Link>
            <ChevronRight size={14} />
            <span className="text-slate-300">Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={22} className="text-violet-400" /> Knowledge Base
          </h1>
          <p className="text-sm text-slate-400 mt-1">Banco de conhecimento do chat de IA — {total} entradas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-neon h-9 px-4 text-sm rounded-lg flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button onClick={() => setEditEntry({})} className="btn-primary h-9 px-4 text-sm rounded-lg flex items-center gap-2">
            <Plus size={14} /> Nova Entrada
          </button>
        </div>
      </div>

      {/* ── Stats badges ── */}
      <div className="flex flex-wrap gap-2">
        {TIPOS.map(t => {
          const cnt = entries.filter(e => e.tipo === t.value).length
          if (!cnt) return null
          return (
            <button key={t.value}
              onClick={() => { setTipoFilt(tipoFilt === t.value ? '' : t.value); setPage(1); void load(1, search, tipoFilt === t.value ? '' : t.value, atvFilt) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                tipoFilt === t.value ? 'border-violet-500/40 bg-violet-500/10 text-violet-300' : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              <t.icon size={12} className={t.color} /> {t.label} ({cnt})
            </button>
          )
        })}
        <button
          onClick={() => { setAtvFilt(atvFilt === 'false' ? '' : 'false'); setPage(1); void load(1, search, tipoFilt, atvFilt === 'false' ? '' : 'false') }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
            atvFilt === 'false' ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-white/10 text-slate-500 hover:text-slate-300'
          }`}
        >
          <EyeOff size={12} /> Inativos
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar por título ou conteúdo…"
          className="input-cyber w-full pl-9 h-9 text-sm rounded-lg"
        />
      </div>

      {/* ── Table ── */}
      <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center px-5 py-3 border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider gap-3">
          <span>Tipo</span>
          <span>Título / Conteúdo</span>
          <span>Módulo</span>
          <span>Tags</span>
          <span>Data</span>
          <span>Status</span>
          <span></span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-500">
            <RefreshCw size={18} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <BookOpen size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhuma entrada encontrada</p>
            <button onClick={() => setEditEntry({})} className="mt-3 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              <Plus size={12} /> Criar primeira entrada
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {entries.map(entry => {
              const cfg = tipoCfg(entry.tipo)
              const Icon = cfg.icon
              return (
                <div key={entry.id} className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-start px-5 py-3.5 gap-3 hover:bg-white/[0.02] transition-colors ${!entry.ativo ? 'opacity-50' : ''}`}>
                  {/* Tipo */}
                  <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                    <Icon size={13} /> <span className="hidden sm:inline">{cfg.label}</span>
                  </span>

                  {/* Título + preview */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.titulo}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{entry.conteudo}</p>
                    {entry.fonte_agent_id && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-orange-400 mt-1">
                        <Bot size={10} /> Gerado por agente
                      </span>
                    )}
                  </div>

                  {/* Módulo */}
                  <span className="text-[11px] text-slate-500 text-right whitespace-nowrap">{entry.modulo ?? '—'}</span>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 max-w-32">
                    {(entry.tags ?? []).slice(0, 3).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-500">
                        <Tag size={9} /> {tag}
                      </span>
                    ))}
                  </div>

                  {/* Data */}
                  <span className="text-[11px] text-slate-600 whitespace-nowrap">{fmtDate(entry.created_at)}</span>

                  {/* Status */}
                  <button
                    onClick={() => void toggleAtivo(entry)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-all ${
                      entry.ativo
                        ? 'text-green-400 border-green-700/30 bg-green-900/10 hover:bg-green-900/20'
                        : 'text-slate-500 border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/30'
                    }`}
                    title={entry.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {entry.ativo ? <><Eye size={11} /> Ativo</> : <><EyeOff size={11} /> Inativo</>}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditEntry(entry)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => void handleDelete(entry.id)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); void load(page - 1) }}
            className="h-8 px-4 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            ← Anterior
          </button>
          <span className="text-xs text-slate-500 px-2">{page} / {pages} — {total} entradas</span>
          <button disabled={page >= pages} onClick={() => { setPage(p => p + 1); void load(page + 1) }}
            className="h-8 px-4 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Próxima →
          </button>
        </div>
      )}

      {/* ── Dica sobre alimentação automática ── */}
      <div className="glass-card rounded-xl p-4 border border-white/5">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300 mb-1">Alimentação Automática por Agentes</p>
            <p className="text-xs text-slate-500">
              O Agente Changelog alimenta automaticamente esta base após cada deploy.
              O Agente Documentador salva rascunhos de documentação.
              Entradas geradas por agentes aparecem com o badge <span className="text-orange-400">Gerado por agente</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
