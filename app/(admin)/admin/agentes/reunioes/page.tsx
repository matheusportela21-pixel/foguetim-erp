'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, Calendar, FileText, AlertTriangle, XCircle, AlertCircle,
  Info, CheckCircle2, Clock, DollarSign, RefreshCw, Filter,
  ChevronRight, BookOpen, Download,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeetingRow {
  id: string
  titulo: string
  status: string
  participantes: string[]
  num_participantes: number
  num_report_ids: number
  resumo_executivo: string
  decisoes: Array<{ titulo?: string; severidade?: string; acao_sugerida?: string; status?: string }>
  severidade_max: string
  created_at: string
  custo_usd: number
  tokens_input: number
  tokens_output: number
  tempo_execucao_ms: number
}

type Period = '7d' | '30d' | '90d' | 'all'
type StatusFilter = '' | 'nova' | 'lida' | 'em_andamento' | 'concluida'

// ── Config ────────────────────────────────────────────────────────────────────

const SEV_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  critica: { label: 'Crítica', color: 'text-red-400 bg-red-900/20 border-red-700/30',         icon: XCircle      },
  alta:    { label: 'Alta',    color: 'text-orange-400 bg-orange-900/20 border-orange-700/30', icon: AlertTriangle },
  media:   { label: 'Média',   color: 'text-amber-400 bg-amber-900/20 border-amber-700/30',   icon: AlertCircle  },
  baixa:   { label: 'Baixa',   color: 'text-blue-400 bg-blue-900/20 border-blue-700/30',      icon: Info         },
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  nova:         { label: 'Nova',         color: 'text-violet-400 bg-violet-900/20 border-violet-700/30' },
  lida:         { label: 'Lida',         color: 'text-slate-400 bg-slate-800/60 border-slate-700/30'    },
  em_andamento: { label: 'Em andamento', color: 'text-amber-400 bg-amber-900/20 border-amber-700/30'    },
  concluida:    { label: 'Concluída',    color: 'text-green-400 bg-green-900/20 border-green-700/30'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}
function fmtMs(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }
function fmtUsd(v: number)  { return `$${v.toFixed(6)}` }

function periodToAfter(p: Period): string {
  if (p === 'all') return ''
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReunioesPage() {
  const [reunioes,  setReunioes]  = useState<MeetingRow[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [period,    setPeriod]    = useState<Period>('30d')
  const [statusFlt, setStatusFlt] = useState<StatusFilter>('')
  const [page,      setPage]      = useState(1)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    const after = periodToAfter(period)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (statusFlt) qs.set('status', statusFlt)
    if (after)     qs.set('after', after)
    try {
      const res  = await fetch(`/api/admin/agentes/reunioes?${qs}`)
      const data = await res.json() as { reunioes: MeetingRow[]; total: number }
      setReunioes(data.reunioes ?? [])
      setTotal(data.total ?? 0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [period, statusFlt, page])

  useEffect(() => { setPage(1) }, [period, statusFlt])
  useEffect(() => { load() }, [load])

  const pages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/agentes" className="hover:text-slate-300 transition-colors">Agentes</Link>
            <ChevronRight size={14} />
            <span className="text-slate-300">Reuniões</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={22} className="text-violet-400" />
            Atas de Reunião
          </h1>
          <p className="text-sm text-slate-400 mt-1">Relatórios consolidados gerados pelo Agente Coordenador</p>
        </div>
        <button onClick={load} className="btn-neon h-9 px-4 text-sm rounded-lg flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card rounded-xl p-4 border border-white/8 flex flex-wrap gap-3 items-center">
        <Filter size={15} className="text-slate-500" />

        {/* Period */}
        <div className="flex gap-1">
          {(['7d','30d','90d','all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {p === 'all' ? 'Todos' : p}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-white/10" />

        {/* Status */}
        <div className="flex gap-1 flex-wrap">
          {([['', 'Todos'], ['nova', 'Nova'], ['lida', 'Lida'], ['em_andamento', 'Em andamento'], ['concluida', 'Concluída']] as [StatusFilter, string][]).map(([v, lbl]) => (
            <button
              key={v}
              onClick={() => setStatusFlt(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFlt === v ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-500">{total} reunião(ões)</span>
      </div>

      {/* ── List ── */}
      <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">
            <RefreshCw size={18} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : reunioes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <BookOpen size={36} className="mb-3 opacity-30" />
            <p className="text-sm">Nenhuma reunião encontrada</p>
            <p className="text-xs mt-1 text-slate-600">O Agente Coordenador ainda não gerou atas</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[11px] text-slate-500 uppercase tracking-wider">
              <span>Reunião</span>
              <span>Participantes</span>
              <span>Relatórios</span>
              <span>Severidade</span>
              <span>Status</span>
              <span></span>
            </div>

            {reunioes.map(m => {
              const sevCfg = SEV_CFG[m.severidade_max] ?? SEV_CFG['baixa']
              const SevIcon = sevCfg.icon
              const stsCfg = STATUS_CFG[m.status] ?? STATUS_CFG['nova']

              return (
                <div key={m.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                  {/* Title + date */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{m.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <Calendar size={11} />
                      <span>{fmtDate(m.created_at)}</span>
                      {m.tempo_execucao_ms > 0 && (
                        <>
                          <span>·</span>
                          <Clock size={11} />
                          <span>{fmtMs(m.tempo_execucao_ms)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-1.5 text-sm text-slate-300">
                    <Users size={14} className="text-cyan-400 shrink-0" />
                    {m.num_participantes}
                  </div>

                  {/* Reports */}
                  <div className="flex items-center gap-1.5 text-sm text-slate-300">
                    <FileText size={14} className="text-violet-400 shrink-0" />
                    {m.num_report_ids}
                  </div>

                  {/* Severity */}
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border w-fit ${sevCfg.color}`}>
                    <SevIcon size={11} /> {sevCfg.label}
                  </span>

                  {/* Status */}
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border w-fit ${stsCfg.color}`}>
                    {stsCfg.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/agentes/reunioes/${m.id}`}
                      className="btn-neon h-7 px-3 text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                    >
                      Ver detalhes <ChevronRight size={12} />
                    </Link>
                    <a
                      href={`/api/admin/agentes/export/pdf?meeting_id=${m.id}`}
                      className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1 text-violet-400 hover:text-violet-200 border border-violet-700/30 hover:border-violet-500/40 transition-all"
                      title="Baixar Ata PDF"
                      target="_blank"
                    >
                      <Download size={12} /> PDF
                    </a>
                    <a
                      href={`/api/admin/agentes/export?format=markdown&meeting_id=${m.id}`}
                      className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1 text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 transition-all"
                      title="Baixar Markdown"
                    >
                      <Download size={12} />
                    </a>
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
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="h-8 px-4 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Anterior
          </button>
          <span className="text-xs text-slate-500 px-2">{page} / {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}
            className="h-8 px-4 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* ── Stats strip ── */}
      {reunioes.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-white/8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Total no período', value: String(total),                                                  icon: BookOpen,      color: 'text-violet-400' },
            { label: 'Custo total',       value: fmtUsd(reunioes.reduce((s, m) => s + (m.custo_usd ?? 0), 0)), icon: DollarSign,    color: 'text-green-400'  },
            { label: 'Não lidas',         value: String(reunioes.filter(m => m.status === 'nova').length),      icon: AlertCircle,   color: 'text-amber-400'  },
            { label: 'Com críticos',      value: String(reunioes.filter(m => m.severidade_max === 'critica').length), icon: XCircle, color: 'text-red-400'    },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label}>
              <Icon size={18} className={`${color} mx-auto mb-1`} />
              <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-[11px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
