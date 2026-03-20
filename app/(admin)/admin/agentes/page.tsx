'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Bot, Shield, Search, Zap, Users, Play, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Clock, DollarSign, Eye, ChevronDown,
  ChevronRight, FileText, BarChart3, Activity, ToggleLeft, ToggleRight,
  AlertCircle, Info,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentRun {
  status:       string
  started_at:   string
  finished_at?: string
  custo_usd?:   number
}

interface AgentReport {
  severidade_max: string
  status:         string
  created_at:     string
}

interface Agent {
  id:              string
  nome:            string
  slug:            string
  descricao:       string
  categoria:       string
  ativo:           boolean
  frequencia:      string
  modelo:          string
  created_at:      string
  ultimo_run?:     AgentRun | null
  ultimo_relatorio?: AgentReport | null
}

interface Achado {
  titulo:          string
  descricao:       string
  severidade:      'critica' | 'alta' | 'media' | 'baixa'
  sugestao:        string
  modulo_afetado?: string
}

interface Report {
  id:                string
  resumo:            string
  severidade_max:    string
  status:            string
  tokens_input:      number
  tokens_output:     number
  custo_usd:         number
  tempo_execucao_ms: number
  created_at:        string
  achados:           Achado[]
  ai_agents?:        { nome: string; slug: string; categoria: string } | null
}

interface Meeting {
  id:               string
  titulo:           string
  resumo_executivo: string
  decisoes:         Array<{ titulo: string; severidade: string; agente_origem: string; acao_sugerida: string }>
  conflitos:        Array<{ descricao: string; agentes_envolvidos: string[] }>
  proximos_passos:  Array<{ acao: string; prazo_sugerido: string; responsavel: string }>
  created_at:       string
}

interface AgentCost {
  nome:          string
  slug:          string
  execucoes:     number
  tokens_input:  number
  tokens_output: number
  custo_usd:     number
}

interface CostData {
  por_agente:      AgentCost[]
  total_mes_usd:   number
  total_mes_brl:   number
  total_execucoes: number
  periodo:         string
}

type Tab = 'agentes' | 'relatorios' | 'reunioes' | 'custos'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEV_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  critica: { label: 'Crítica', color: 'bg-red-900/30 text-red-400 border-red-700/30',       icon: XCircle      },
  alta:    { label: 'Alta',    color: 'bg-orange-900/30 text-orange-400 border-orange-700/30', icon: AlertTriangle },
  media:   { label: 'Média',   color: 'bg-amber-900/30 text-amber-400 border-amber-700/30',   icon: AlertCircle  },
  baixa:   { label: 'Baixa',   color: 'bg-blue-900/30 text-blue-400 border-blue-700/30',      icon: Info         },
}

const STATUS_REPORT_CFG: Record<string, { label: string; color: string }> = {
  novo:         { label: 'Novo',         color: 'bg-violet-900/30 text-violet-400 border-violet-700/30' },
  lido:         { label: 'Lido',         color: 'bg-slate-800 text-slate-400 border-slate-700/30' },
  em_andamento: { label: 'Em andamento', color: 'bg-amber-900/30 text-amber-400 border-amber-700/30' },
  resolvido:    { label: 'Resolvido',    color: 'bg-green-900/30 text-green-400 border-green-700/30' },
  descartado:   { label: 'Descartado',   color: 'bg-slate-800 text-slate-500 border-slate-700/20' },
}

const CAT_ICON: Record<string, React.ElementType> = {
  protecao: Shield,
  meta:     Users,
  default:  Bot,
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtMs(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtUsd(v: number) {
  return `$${v.toFixed(6)}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SevBadge({ sev }: { sev: string }) {
  const cfg = SEV_CFG[sev] ?? SEV_CFG.media
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_REPORT_CFG[status] ?? STATUS_REPORT_CFG.novo
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onExecutar,
  onToggle,
  executing,
}: {
  agent:     Agent
  onExecutar: (slug: string) => void
  onToggle:  (slug: string, ativo: boolean) => void
  executing: boolean
}) {
  const Icon       = CAT_ICON[agent.categoria] ?? CAT_ICON.default
  const lastRun    = agent.ultimo_run
  const lastReport = agent.ultimo_relatorio
  const sevCfg     = lastReport ? (SEV_CFG[lastReport.severidade_max] ?? SEV_CFG.media) : null

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{agent.nome}</p>
            <p className="text-[11px] text-slate-500 capitalize">{agent.categoria} · {agent.frequencia}</p>
          </div>
        </div>
        {/* Toggle ativo/inativo */}
        <button
          onClick={() => onToggle(agent.slug, !agent.ativo)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title={agent.ativo ? 'Desativar agente' : 'Ativar agente'}
        >
          {agent.ativo
            ? <ToggleRight className="w-6 h-6 text-green-400" />
            : <ToggleLeft  className="w-6 h-6 text-slate-600" />
          }
        </button>
      </div>

      {/* Descrição */}
      <p className="text-xs text-slate-400 leading-relaxed">{agent.descricao}</p>

      {/* Status última execução */}
      <div className="space-y-1.5">
        {lastRun ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Última execução: {fmtDate(lastRun.started_at)}</span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-600">Nenhuma execução registrada</p>
        )}
        {lastReport && sevCfg && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Último relatório:</span>
            <SevBadge sev={lastReport.severidade_max} />
            <StatusBadge status={lastReport.status} />
          </div>
        )}
      </div>

      {/* Ações */}
      <button
        onClick={() => onExecutar(agent.slug)}
        disabled={executing || !agent.ativo}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {executing
          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executando...</>
          : <><Play className="w-3.5 h-3.5" /> Executar agora</>
        }
      </button>
    </div>
  )
}

// ── Report Row ────────────────────────────────────────────────────────────────

function ReportRow({
  report,
  onStatusChange,
}: {
  report:         Report
  onStatusChange: (id: string, status: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const ag = report.ai_agents

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-slate-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm text-white font-medium truncate">{report.resumo || 'Sem resumo'}</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{ag?.nome ?? '—'}</span>
            <span>·</span>
            <span>{fmtDate(report.created_at)}</span>
            <span>·</span>
            <span>{fmtMs(report.tempo_execucao_ms)}</span>
            <span>·</span>
            <span>{fmtUsd(report.custo_usd)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SevBadge sev={report.severidade_max} />
          <StatusBadge status={report.status} />
          {/* Status changer */}
          <select
            value={report.status}
            onChange={e => { e.stopPropagation(); onStatusChange(report.id, e.target.value) }}
            onClick={e => e.stopPropagation()}
            className="text-[10px] bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-slate-400 cursor-pointer"
          >
            {Object.entries(STATUS_REPORT_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.05] space-y-3">
          {report.achados && report.achados.length > 0 ? (
            report.achados.map((achado, i) => {
              const sev = SEV_CFG[achado.severidade] ?? SEV_CFG.media
              const SevIcon = sev.icon
              return (
                <div key={i} className={`rounded-lg border p-3 space-y-1 ${sev.color}`}>
                  <div className="flex items-center gap-2">
                    <SevIcon className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-sm font-semibold">{achado.titulo}</p>
                    {achado.modulo_afetado && (
                      <span className="text-[10px] opacity-70 ml-auto">{achado.modulo_afetado}</span>
                    )}
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed">{achado.descricao}</p>
                  <p className="text-xs opacity-60 italic">💡 {achado.sugestao}</p>
                </div>
              )
            })
          ) : (
            <p className="text-xs text-slate-500 italic">Nenhum achado detalhado disponível.</p>
          )}
          <div className="flex gap-4 text-[11px] text-slate-600">
            <span>Tokens entrada: {report.tokens_input}</span>
            <span>Tokens saída: {report.tokens_output}</span>
            <span>Custo: {fmtUsd(report.custo_usd)}</span>
            <span>Tempo: {fmtMs(report.tempo_execucao_ms)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Meeting Row ───────────────────────────────────────────────────────────────

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-slate-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">{meeting.titulo}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(meeting.created_at)}</p>
        </div>
        <div className="text-[11px] text-slate-500">
          {(meeting.decisoes ?? []).length} prioridade(s)
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.05] space-y-4">
          {meeting.resumo_executivo && (
            <div>
              <p className="text-[11px] font-bold text-violet-300 uppercase tracking-wider mb-1.5">Resumo Executivo</p>
              <p className="text-sm text-slate-300 leading-relaxed">{meeting.resumo_executivo}</p>
            </div>
          )}
          {(meeting.decisoes ?? []).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2">Top Prioridades</p>
              <div className="space-y-2">
                {meeting.decisoes.map((d, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <SevBadge sev={d.severidade} />
                      <p className="text-sm font-medium text-white">{d.titulo}</p>
                      <span className="text-[10px] text-slate-500 ml-auto">↗ {d.agente_origem}</span>
                    </div>
                    <p className="text-xs text-slate-400 italic">💡 {d.acao_sugerida}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(meeting.proximos_passos ?? []).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-green-300 uppercase tracking-wider mb-2">Próximos Passos</p>
              <div className="space-y-1.5">
                {meeting.proximos_passos.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                    <span>{p.acao} <span className="text-slate-500">({p.prazo_sugerido} · {p.responsavel})</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(meeting.conflitos ?? []).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-red-300 uppercase tracking-wider mb-2">Conflitos</p>
              {meeting.conflitos.map((c, i) => (
                <p key={i} className="text-xs text-slate-400">{c.descricao}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAgentesPage() {
  useEffect(() => { document.title = 'Agentes de IA — Admin Foguetim' }, [])

  const [tab, setTab]           = useState<Tab>('agentes')
  const [agents, setAgents]     = useState<Agent[]>([])
  const [reports, setReports]   = useState<Report[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [costs, setCosts]       = useState<CostData | null>(null)
  const [loadingAgents, setLoadingAgents]   = useState(true)
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [loadingCosts, setLoadingCosts]     = useState(false)
  const [executing, setExecuting] = useState<string | null>(null)
  const [execMsg, setExecMsg]   = useState<{ slug: string; msg: string; ok: boolean } | null>(null)
  const [toastMsg, setToastMsg] = useState('')

  // Filtros relatórios
  const [filterSev, setFilterSev]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState('7d')

  // KPIs
  const totalAtivos      = agents.filter(a => a.ativo).length
  const achCriticos      = reports.filter(r => r.severidade_max === 'critica' && r.status === 'novo').length
  const ultimaExecucao   = agents
    .map(a => a.ultimo_run?.started_at ?? '')
    .filter(Boolean)
    .sort()
    .pop()

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true)
    try {
      const res = await fetch('/api/admin/agentes')
      if (res.ok) {
        const d = await res.json() as { agents: Agent[] }
        setAgents(d.agents ?? [])
      }
    } finally {
      setLoadingAgents(false)
    }
  }, [])

  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const params = new URLSearchParams({ periodo: filterPeriodo })
      if (filterSev)    params.set('severidade', filterSev)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/admin/agentes/relatorios?${params.toString()}`)
      if (res.ok) {
        const d = await res.json() as { reports: Report[] }
        setReports(d.reports ?? [])
      }
    } finally {
      setLoadingReports(false)
    }
  }, [filterSev, filterStatus, filterPeriodo])

  const loadMeetings = useCallback(async () => {
    setLoadingMeetings(true)
    try {
      const res = await fetch('/api/admin/agentes/reunioes')
      if (res.ok) {
        const d = await res.json() as { meetings: Meeting[] }
        setMeetings(d.meetings ?? [])
      }
    } finally {
      setLoadingMeetings(false)
    }
  }, [])

  const loadCosts = useCallback(async () => {
    setLoadingCosts(true)
    try {
      const res = await fetch('/api/admin/agentes/custos')
      if (res.ok) {
        const d = await res.json() as CostData
        setCosts(d)
      }
    } finally {
      setLoadingCosts(false)
    }
  }, [])

  useEffect(() => { void loadAgents() }, [loadAgents])
  useEffect(() => {
    if (tab === 'relatorios') void loadReports()
    if (tab === 'reunioes')   void loadMeetings()
    if (tab === 'custos')     void loadCosts()
  }, [tab, loadReports, loadMeetings, loadCosts])

  async function handleExecutar(slug: string) {
    setExecuting(slug)
    setExecMsg(null)
    try {
      const res = await fetch(`/api/admin/agentes/${slug}/executar`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; result?: { resumo: string; achados: unknown[] }; error?: string }
      if (data.ok) {
        setExecMsg({
          slug,
          msg: `✅ Concluído! ${(data.result?.achados ?? []).length} achado(s). ${data.result?.resumo ?? ''}`,
          ok: true,
        })
        void loadAgents()
        if (tab === 'relatorios') void loadReports()
        if (tab === 'reunioes' && slug === 'coordenador') void loadMeetings()
      } else {
        setExecMsg({ slug, msg: `❌ Erro: ${data.error ?? 'desconhecido'}`, ok: false })
      }
    } catch (e) {
      setExecMsg({ slug, msg: `❌ Falha de rede: ${e instanceof Error ? e.message : String(e)}`, ok: false })
    } finally {
      setExecuting(null)
    }
  }

  async function handleToggle(slug: string, ativo: boolean) {
    await fetch(`/api/admin/agentes/${slug}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ativo }),
    })
    setAgents(prev => prev.map(a => a.slug === slug ? { ...a, ativo } : a))
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/admin/agentes/relatorios/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setToastMsg('Status atualizado')
    setTimeout(() => setToastMsg(''), 2000)
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'agentes',   label: 'Agentes',   icon: Bot      },
    { id: 'relatorios', label: 'Relatórios', icon: FileText  },
    { id: 'reunioes',  label: 'Reuniões',   icon: Users    },
    { id: 'custos',    label: 'Custos',     icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#03050f' }}>
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-900/80 border border-green-700/30 text-green-300 text-sm px-4 py-2 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Bot className="w-7 h-7 text-violet-400" />
              Agentes de IA
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Inteligência artificial monitorando e evoluindo o Foguetim ERP
            </p>
          </div>
          <button
            onClick={() => void loadAgents()}
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAgents ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Agentes Ativos',
              value: loadingAgents ? '...' : `${totalAtivos} / ${agents.length}`,
              icon:  Activity,
              color: 'text-green-400',
            },
            {
              label: 'Última Execução',
              value: ultimaExecucao ? fmtDate(ultimaExecucao) : 'Nunca',
              icon:  Clock,
              color: 'text-blue-400',
            },
            {
              label: 'Críticos Pendentes',
              value: String(achCriticos),
              icon:  AlertTriangle,
              color: achCriticos > 0 ? 'text-red-400' : 'text-slate-500',
            },
            {
              label: 'Custo do Mês',
              value: costs ? `$${costs.total_mes_usd.toFixed(4)}` : '—',
              icon:  DollarSign,
              color: 'text-violet-400',
            },
          ].map(kpi => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="glass-card px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">{kpi.label}</p>
                  <p className="text-sm font-bold text-white">{kpi.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Exec result banner */}
        {execMsg && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${execMsg.ok ? 'bg-green-900/20 border-green-700/30 text-green-300' : 'bg-red-900/20 border-red-700/30 text-red-300'}`}>
            <span className="font-semibold capitalize">{execMsg.slug}:</span> {execMsg.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06] w-fit">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── Tab: Agentes ────────────────────────────────────────────────── */}
        {tab === 'agentes' && (
          <div>
            {loadingAgents ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onExecutar={slug => void handleExecutar(slug)}
                    onToggle={(slug, ativo) => void handleToggle(slug, ativo)}
                    executing={executing === agent.slug}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Relatórios ──────────────────────────────────────────────── */}
        {tab === 'relatorios' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterSev}
                onChange={e => setFilterSev(e.target.value)}
                className="input-cyber text-sm py-1.5 px-3"
              >
                <option value="">Todas severidades</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="input-cyber text-sm py-1.5 px-3"
              >
                <option value="">Todos status</option>
                {Object.entries(STATUS_REPORT_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={filterPeriodo}
                onChange={e => setFilterPeriodo(e.target.value)}
                className="input-cyber text-sm py-1.5 px-3"
              >
                <option value="1d">Hoje</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
              </select>
              <button
                onClick={() => void loadReports()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/20 text-violet-300 text-sm hover:bg-violet-600/30 transition-colors"
              >
                <Search className="w-3.5 h-3.5" /> Filtrar
              </button>
            </div>

            {loadingReports ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum relatório encontrado.</p>
                <p className="text-sm mt-1">Execute um agente para gerar o primeiro relatório.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map(r => (
                  <ReportRow
                    key={r.id}
                    report={r}
                    onStatusChange={(id, status) => void handleStatusChange(id, status)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Reuniões ────────────────────────────────────────────────── */}
        {tab === 'reunioes' && (
          <div className="space-y-4">
            {loadingMeetings ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma reunião registrada.</p>
                <p className="text-sm mt-1">Execute o Coordenador para gerar a primeira ata.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map(m => <MeetingRow key={m.id} meeting={m} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Custos ──────────────────────────────────────────────────── */}
        {tab === 'custos' && (
          <div className="space-y-6">
            {loadingCosts ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
              </div>
            ) : costs ? (
              <>
                {/* KPIs de custo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total (USD)',     value: `$${costs.total_mes_usd.toFixed(6)}`,  color: 'text-violet-400' },
                    { label: 'Total (BRL est.)', value: `R$ ${costs.total_mes_brl.toFixed(2)}`, color: 'text-blue-400'   },
                    { label: 'Execuções',        value: String(costs.total_execucoes),          color: 'text-green-400'  },
                    { label: 'Período',          value: costs.periodo,                          color: 'text-slate-400'  },
                  ].map(k => (
                    <div key={k.label} className="glass-card px-4 py-3">
                      <p className="text-[11px] text-slate-500">{k.label}</p>
                      <p className={`text-sm font-bold ${k.color} mt-0.5`}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {/* Tabela por agente */}
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Agente', 'Execuções', 'Tokens Entrada', 'Tokens Saída', 'Custo USD'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {costs.por_agente.map(ag => (
                        <tr key={ag.slug} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-medium text-white">{ag.nome}</td>
                          <td className="px-4 py-3 text-slate-400">{ag.execucoes}</td>
                          <td className="px-4 py-3 text-slate-400">{ag.tokens_input.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-400">{ag.tokens_output.toLocaleString()}</td>
                          <td className="px-4 py-3 text-violet-400 font-mono">{fmtUsd(ag.custo_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/[0.10]">
                        <td className="px-4 py-3 font-bold text-white">Total</td>
                        <td className="px-4 py-3 font-bold text-white">{costs.total_execucoes}</td>
                        <td colSpan={2} />
                        <td className="px-4 py-3 font-bold text-violet-400 font-mono">{fmtUsd(costs.total_mes_usd)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  {costs.por_agente.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma execução este mês.</p>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-600">
                  Preços de referência: claude-sonnet-4-20250514 — $3/MTok entrada · $15/MTok saída. Câmbio estimado: R$5,85/USD.
                </p>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Falha ao carregar custos.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
