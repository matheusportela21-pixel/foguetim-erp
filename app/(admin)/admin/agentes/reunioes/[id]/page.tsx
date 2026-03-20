'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  BookOpen, ArrowLeft, Users, FileText, AlertTriangle, XCircle, AlertCircle,
  Info, CheckCircle2, Clock, DollarSign, RefreshCw, ChevronRight,
  Shield, BarChart3, Rocket, Scale, Globe, Bot, Download,
  Square, CheckSquare, MinusSquare, Swords, ListChecks, Star,
  ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Achado {
  titulo?: string; descricao?: string
  severidade: 'critica' | 'alta' | 'media' | 'baixa'
  sugestao?: string; modulo_afetado?: string
}

interface Decisao {
  titulo?: string; descricao?: string
  severidade?: string; agente_origem?: string
  acao_sugerida?: string; prazo_sugerido?: string
  status?: string; resolvido_em?: string | null
}

interface Conflito {
  descricao?: string
  agentes_envolvidos?: string[]
  recomendacao?: string
  posicao_a?: string; posicao_b?: string
}

interface ProximoPasso {
  acao?: string; prazo_sugerido?: string; responsavel?: string
  status?: string; concluido_em?: string | null
}

interface ReportSummary {
  id: string; resumo: string; severidade_max: string
  achados: Achado[]; custo_usd: number
  tempo_execucao_ms: number; created_at: string
  ai_agents?: { nome: string; slug: string; categoria: string } | null
}

interface Meeting {
  id: string; titulo: string; status: string
  participantes: string[]
  report_ids: string[]
  resumo_executivo: string; ata: string
  decisoes: Decisao[]
  conflitos: Conflito[]
  proximos_passos: ProximoPasso[]
  created_at: string
  custo_usd: number; tokens_input: number
  tokens_output: number; tempo_execucao_ms: number
  reports: ReportSummary[]
}

// ── Config ────────────────────────────────────────────────────────────────────

const SEV_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  critica: { label: 'Crítica', color: 'text-red-400 border-red-700/30',         bg: 'bg-red-900/20',    icon: XCircle      },
  alta:    { label: 'Alta',    color: 'text-orange-400 border-orange-700/30',   bg: 'bg-orange-900/20', icon: AlertTriangle },
  media:   { label: 'Média',   color: 'text-amber-400 border-amber-700/30',     bg: 'bg-amber-900/20',  icon: AlertCircle  },
  baixa:   { label: 'Baixa',   color: 'text-blue-400 border-blue-700/30',       bg: 'bg-blue-900/20',   icon: Info         },
}

const SEV_EXEC_BG: Record<string, string> = {
  critica: 'bg-red-900/20 border-red-700/40',
  alta:    'bg-orange-900/20 border-orange-700/40',
  media:   'bg-amber-900/20 border-amber-700/30',
  baixa:   'bg-green-900/15 border-green-700/30',
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  nova:         { label: 'Nova',         color: 'text-violet-400 bg-violet-900/20 border-violet-700/30' },
  lida:         { label: 'Lida',         color: 'text-slate-400 bg-slate-800/60 border-slate-700/30'    },
  em_andamento: { label: 'Em andamento', color: 'text-amber-400 bg-amber-900/20 border-amber-700/30'    },
  concluida:    { label: 'Concluída',    color: 'text-green-400 bg-green-900/20 border-green-700/30'    },
}

const CAT_ICON: Record<string, React.ElementType> = {
  protecao: Shield, produto: BarChart3, meta: Bot,
  deploy: Rocket, compliance: Scale, marketplace: Globe, default: Bot,
}

const CAT_COLOR: Record<string, string> = {
  protecao:    'text-red-400',
  produto:     'text-blue-400',
  meta:        'text-violet-400',
  deploy:      'text-green-400',
  compliance:  'text-amber-400',
  marketplace: 'text-orange-400',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}
function fmtMs(ms: number)  { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }
function fmtUsd(v: number)  { return `$${v.toFixed(6)}` }
function getTopSev(arr: Array<{ severidade?: string }>): string {
  const priority = ['critica', 'alta', 'media', 'baixa']
  for (const s of priority) {
    if (arr.some(a => (a.severidade ?? '').toLowerCase() === s)) return s
  }
  return 'baixa'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SevBadge({ sev }: { sev: string }) {
  const cfg = SEV_CFG[sev?.toLowerCase()] ?? SEV_CFG['baixa']
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cfg.color} ${cfg.bg}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = params?.id as string

  const [meeting, setMeeting]   = useState<Meeting | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    ata: true, relatorios: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/agentes/reunioes/${id}`)
      const data = await res.json() as Meeting
      setMeeting(data)
      // Auto-mark as lida
      if (data.status === 'nova') {
        await fetch(`/api/admin/agentes/reunioes/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'lida' }),
        })
        setMeeting(m => m ? { ...m, status: 'lida' } : m)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function patchMeeting(payload: Record<string, unknown>) {
    setSaving(true)
    try {
      const res  = await fetch(`/api/admin/agentes/reunioes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as Meeting
      setMeeting(prev => prev ? { ...prev, ...data } : prev)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  function togglePasso(idx: number) {
    if (!meeting) return
    const passos = meeting.proximos_passos.map((p, i) => {
      if (i !== idx) return p
      const done = p.status !== 'concluido'
      return { ...p, status: done ? 'concluido' : 'pendente', concluido_em: done ? new Date().toISOString() : null }
    })
    setMeeting(m => m ? { ...m, proximos_passos: passos } : m)
    patchMeeting({ proximos_passos: passos })
  }

  function toggleDecisao(idx: number, newStatus: string) {
    if (!meeting) return
    const decisoes = meeting.decisoes.map((d, i) => {
      if (i !== idx) return d
      const resolved = newStatus === 'resolvido'
      return { ...d, status: newStatus, resolvido_em: resolved ? new Date().toISOString() : null }
    })
    setMeeting(m => m ? { ...m, decisoes } : m)
    patchMeeting({ decisoes })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <RefreshCw size={20} className="animate-spin mr-2" /> Carregando reunião…
    </div>
  )

  if (!meeting) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
      <BookOpen size={36} className="mb-3 opacity-30" />
      <p>Reunião não encontrada</p>
    </div>
  )

  const reports       = meeting.reports ?? []
  const decisoes      = meeting.decisoes ?? []
  const conflitos     = meeting.conflitos ?? []
  const passos        = meeting.proximos_passos ?? []
  const participantes = meeting.participantes ?? []

  const sevMax = getTopSev(decisoes)
  const execBg = SEV_EXEC_BG[sevMax] ?? SEV_EXEC_BG['baixa']

  // Build participant stats from reports
  const participantStats: Record<string, {
    nome: string; slug: string; categoria: string
    achados: number; sevMax: string; reportId: string
  }> = {}
  for (const r of reports) {
    const ag = r.ai_agents
    if (!ag) continue
    const achados = r.achados ?? []
    const sev = getTopSev(achados)
    if (!participantStats[ag.slug]) {
      participantStats[ag.slug] = { nome: ag.nome, slug: ag.slug, categoria: ag.categoria, achados: 0, sevMax: 'baixa', reportId: r.id }
    }
    participantStats[ag.slug].achados += achados.length
    const ps = participantStats[ag.slug]
    const priority = ['critica', 'alta', 'media', 'baixa']
    if (priority.indexOf(sev) < priority.indexOf(ps.sevMax)) {
      participantStats[ag.slug].sevMax = sev
    }
  }

  const stsCfg = STATUS_CFG[meeting.status] ?? STATUS_CFG['nova']

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => router.push('/admin/agentes')} className="hover:text-slate-300 transition-colors">Agentes</button>
        <ChevronRight size={14} />
        <Link href="/admin/agentes/reunioes" className="hover:text-slate-300 transition-colors">Reuniões</Link>
        <ChevronRight size={14} />
        <span className="text-slate-400 truncate max-w-48">{meeting.titulo}</span>
      </div>

      {/* ── SEÇÃO 1: Header ── */}
      <div className="glass-card rounded-xl p-6 border border-white/8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={20} className="text-violet-400 shrink-0" />
              <h1 className="text-2xl font-bold text-white">{meeting.titulo}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1"><Clock size={12} /> {fmtDate(meeting.created_at)}</span>
              {meeting.tempo_execucao_ms > 0 && <span className="flex items-center gap-1"><RefreshCw size={12} /> Gerada em {fmtMs(meeting.tempo_execucao_ms)}</span>}
              {(meeting.tokens_input + meeting.tokens_output) > 0 && (
                <span className="flex items-center gap-1">
                  <FileText size={12} />
                  {(meeting.tokens_input + meeting.tokens_output).toLocaleString()} tokens
                </span>
              )}
              {meeting.custo_usd > 0 && <span className="flex items-center gap-1 text-green-400"><DollarSign size={12} /> {fmtUsd(meeting.custo_usd)}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-cyan-900/20 border border-cyan-700/30 text-cyan-400">
                <Users size={12} /> {participantes.length} agentes participaram
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-violet-900/20 border border-violet-700/30 text-violet-400">
                <FileText size={12} /> {reports.length} relatórios consolidados
              </span>
              <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-lg border ${stsCfg.color}`}>
                {stsCfg.label}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 items-start">
            <a
              href={`/api/admin/agentes/export?format=markdown&meeting_id=${id}`}
              className="h-9 px-3 text-xs rounded-lg flex items-center gap-1.5 border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all"
            >
              <Download size={13} /> Markdown
            </a>
            {(['lida','em_andamento','concluida'] as const).filter(s => s !== meeting.status).map(s => (
              <button
                key={s}
                disabled={saving}
                onClick={() => patchMeeting({ status: s })}
                className="h-9 px-3 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
              >
                {STATUS_CFG[s]?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 2: Resumo Executivo ── */}
      <div className={`rounded-xl p-5 border ${execBg}`}>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Star size={15} className="text-yellow-400" /> Resumo Executivo
        </h2>
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {meeting.resumo_executivo || 'Sem resumo disponível.'}
        </p>
        {sevMax === 'critica' && (
          <p className="text-xs text-red-400 mt-3 flex items-center gap-1.5">
            <XCircle size={12} /> Esta reunião tem achados CRÍTICOS — ação imediata recomendada
          </p>
        )}
      </div>

      {/* ── SEÇÃO 3: Top 5 Prioridades ── */}
      {decisoes.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/8 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400" />
            Top {Math.min(5, decisoes.length)} Prioridades
          </h2>
          {decisoes.slice(0, 5).map((d, i) => {
            const sc = SEV_CFG[(d.severidade ?? 'baixa').toLowerCase()] ?? SEV_CFG['baixa']
            const done = d.status === 'resolvido'
            const SevIcon = sc.icon
            return (
              <div key={i} className={`rounded-lg p-4 border transition-all ${done ? 'opacity-50 border-white/5 bg-white/[0.01]' : `${sc.bg} ${sc.color.split(' ')[0]} border`} border-opacity-30`}>
                <div className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${sc.bg} ${sc.color.split(' ')[0]} border ${sc.color.split(' ')[2] ?? ''}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`font-medium text-sm ${done ? 'line-through text-slate-500' : 'text-white'}`}>
                        {d.titulo ?? d.descricao ?? '—'}
                      </p>
                      <div className="flex gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${sc.color} ${sc.bg}`}>
                          <SevIcon size={10} /> {sc.label}
                        </span>
                        {d.agente_origem && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800/60 border border-white/10 text-slate-400">
                            {d.agente_origem}
                          </span>
                        )}
                      </div>
                    </div>
                    {d.acao_sugerida && (
                      <p className="text-xs text-slate-400 mt-1 italic">→ {d.acao_sugerida}</p>
                    )}
                    {done && d.resolvido_em && (
                      <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Resolvido em {fmtDate(d.resolvido_em)}
                      </p>
                    )}
                    {!done && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => toggleDecisao(i, 'resolvido')}
                          className="text-xs px-2 py-1 rounded bg-green-900/20 border border-green-700/30 text-green-400 hover:bg-green-900/40 transition-all"
                        >
                          ✓ Resolver
                        </button>
                        <button
                          onClick={() => toggleDecisao(i, 'agendado')}
                          className="text-xs px-2 py-1 rounded bg-amber-900/20 border border-amber-700/30 text-amber-400 hover:bg-amber-900/40 transition-all"
                        >
                          ⏳ Agendar
                        </button>
                        <button
                          onClick={() => toggleDecisao(i, 'descartado')}
                          className="text-xs px-2 py-1 rounded bg-slate-800/60 border border-white/10 text-slate-500 hover:text-slate-300 transition-all"
                        >
                          ✗ Descartar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── SEÇÃO 4: Participantes ── */}
      {Object.keys(participantStats).length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/8">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Users size={15} className="text-cyan-400" />
            Participantes ({Object.keys(participantStats).length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.values(participantStats).map(p => {
              const Icon  = CAT_ICON[p.categoria] ?? CAT_ICON['default']
              const color = CAT_COLOR[p.categoria] ?? 'text-slate-400'
              const sc    = SEV_CFG[p.sevMax] ?? SEV_CFG['baixa']
              return (
                <Link
                  key={p.slug}
                  href={`/admin/agentes/${p.slug}`}
                  className="glass-card rounded-lg p-3 border border-white/5 hover:border-white/15 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={`${color} shrink-0`} />
                    <span className="text-xs font-medium text-slate-300 truncate group-hover:text-white">{p.nome}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{p.achados} achados</span>
                    <span className={`${sc.color.split(' ')[0]}`}>{sc.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SEÇÃO 5: Conflitos ── */}
      <div className="glass-card rounded-xl p-5 border border-white/8">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Swords size={15} className="text-red-400" /> Conflitos entre Agentes
        </h2>
        {conflitos.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/10 border border-green-700/20 rounded-lg px-4 py-3">
            <CheckCircle2 size={16} /> Nenhum conflito entre agentes nesta reunião.
          </div>
        ) : (
          <div className="space-y-4">
            {conflitos.map((c, i) => {
              const [agA, agB] = c.agentes_envolvidos ?? []
              return (
                <div key={i} className="space-y-2">
                  {/* VS Layout */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                    <div className="rounded-lg p-3 bg-blue-900/15 border border-blue-700/30">
                      <p className="text-xs font-semibold text-blue-400 mb-1">{agA ?? 'Agente A'}</p>
                      <p className="text-xs text-slate-300">{c.posicao_a ?? c.descricao ?? '—'}</p>
                    </div>
                    <div className="flex items-center justify-center text-slate-500 font-bold text-sm px-1">VS</div>
                    <div className="rounded-lg p-3 bg-orange-900/15 border border-orange-700/30">
                      <p className="text-xs font-semibold text-orange-400 mb-1">{agB ?? 'Agente B'}</p>
                      <p className="text-xs text-slate-300">{c.posicao_b ?? '—'}</p>
                    </div>
                  </div>
                  {c.recomendacao && (
                    <p className="text-xs text-slate-400 bg-slate-800/40 border border-white/5 rounded-lg px-3 py-2 italic">
                      → Recomendação: {c.recomendacao}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SEÇÃO 6: Próximos Passos (Checklist Interativo) ── */}
      {passos.length > 0 && (
        <div className="glass-card rounded-xl p-5 border border-white/8">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <ListChecks size={15} className="text-green-400" />
            Próximos Passos
            <span className="ml-auto text-xs text-slate-500 font-normal">
              {passos.filter(p => p.status === 'concluido').length}/{passos.length} concluídos
              {saving && <RefreshCw size={11} className="animate-spin inline ml-1.5" />}
            </span>
          </h2>

          {/* Progress bar */}
          <div className="h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${passos.length > 0 ? (passos.filter(p => p.status === 'concluido').length / passos.length) * 100 : 0}%` }}
            />
          </div>

          <div className="space-y-2">
            {passos.map((p, i) => {
              const done    = p.status === 'concluido'
              const ignored = p.status === 'ignorado'
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    done    ? 'bg-green-900/10 border-green-700/20 opacity-70' :
                    ignored ? 'bg-slate-800/20 border-white/5 opacity-40' :
                    'bg-white/[0.02] border-white/8 hover:bg-white/[0.04]'
                  }`}
                >
                  <button
                    onClick={() => togglePasso(i)}
                    disabled={saving}
                    className="mt-0.5 shrink-0 disabled:opacity-50"
                  >
                    {done    ? <CheckSquare size={17} className="text-green-400" /> :
                     ignored ? <MinusSquare size={17} className="text-slate-500" /> :
                               <Square     size={17} className="text-slate-500 hover:text-slate-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${done ? 'line-through text-slate-500' : ignored ? 'text-slate-600' : 'text-slate-200'}`}>
                      {p.acao ?? '—'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-500">
                      {p.responsavel && <span>👤 {p.responsavel}</span>}
                      {p.prazo_sugerido && <span>📅 {p.prazo_sugerido}</span>}
                      {done && p.concluido_em && (
                        <span className="text-green-500">✓ Concluído em {fmtDate(p.concluido_em)}</span>
                      )}
                    </div>
                  </div>
                  {!done && !ignored && (
                    <button
                      onClick={() => {
                        if (!meeting) return
                        const updated = passos.map((pp, j) => j === i ? { ...pp, status: 'ignorado' } : pp)
                        setMeeting(m => m ? { ...m, proximos_passos: updated } : m)
                        patchMeeting({ proximos_passos: updated })
                      }}
                      className="text-[10px] text-slate-600 hover:text-slate-400 px-1.5 py-1 shrink-0"
                    >
                      Ignorar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SEÇÃO 7: Decisões Formais ── */}
      {decisoes.length > 0 && (
        <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={15} className="text-violet-400" /> Decisões Formais ({decisoes.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Decisão</th>
                  <th className="text-left px-4 py-3">Severidade</th>
                  <th className="text-left px-4 py-3">Ação</th>
                  <th className="text-left px-4 py-3">Prazo</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {decisoes.map((d, i) => {
                  const sc = SEV_CFG[(d.severidade ?? 'baixa').toLowerCase()] ?? SEV_CFG['baixa']
                  const statusColors: Record<string, string> = {
                    pendente:   'text-slate-400',
                    resolvido:  'text-green-400',
                    agendado:   'text-amber-400',
                    descartado: 'text-slate-600',
                  }
                  return (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-slate-300">{d.titulo ?? d.descricao ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${sc.color.split(' ')[0]}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{d.acao_sugerida ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{d.prazo_sugerido ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs capitalize ${statusColors[d.status ?? 'pendente'] ?? 'text-slate-400'}`}>
                          {d.status ?? 'pendente'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SEÇÃO 8: Relatórios Originais (colapsável) ── */}
      <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
          onClick={() => setCollapsed(c => ({ ...c, relatorios: !c.relatorios }))}
        >
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen size={15} className="text-slate-400" />
            Relatórios Originais
            <span className="text-xs font-normal text-slate-500">({reports.length})</span>
          </h2>
          {collapsed.relatorios ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
        </button>

        {!collapsed.relatorios && (
          <div className="border-t border-white/5 divide-y divide-white/5">
            {reports.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 text-center">Nenhum relatório vinculado a esta reunião</p>
            ) : reports.map(r => {
              const ag      = r.ai_agents
              const Icon    = CAT_ICON[ag?.categoria ?? 'default'] ?? CAT_ICON['default']
              const color   = CAT_COLOR[ag?.categoria ?? ''] ?? 'text-slate-400'
              const achados = r.achados ?? []
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02]">
                  <Icon size={16} className={`${color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 font-medium">{ag?.nome ?? '—'}</p>
                    <p className="text-xs text-slate-500 truncate">{r.resumo || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                    <span>{achados.length} achados</span>
                    <SevBadge sev={r.severidade_max} />
                    <Link
                      href={`/admin/agentes/${ag?.slug}`}
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Ver agente →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ATA completa (colapsável) ── */}
      {meeting.ata && (
        <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
            onClick={() => setCollapsed(c => ({ ...c, ata: !c.ata }))}
          >
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={15} className="text-slate-400" /> Ata Completa (texto bruto)
            </h2>
            {collapsed.ata ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
          </button>
          {!collapsed.ata && (
            <div className="border-t border-white/5 px-5 py-4">
              <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">{meeting.ata}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
