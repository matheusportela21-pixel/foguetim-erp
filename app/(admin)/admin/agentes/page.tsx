'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bot, Shield, Search, Zap, Users, Play, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, Clock, DollarSign, ChevronDown,
  ChevronRight, FileText, BarChart3, Activity, ToggleLeft, ToggleRight,
  AlertCircle, Info, Rocket, Scale, Globe, Loader2, X, ListChecks,
  Download, TrendingUp, TrendingDown, Wifi,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, Legend,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentRun    { status: string; started_at: string; finished_at?: string; custo_usd?: number }
interface AgentReport { severidade_max: string; status: string; created_at: string }

interface Agent {
  id: string; nome: string; slug: string; descricao: string
  categoria: string; ativo: boolean; frequencia: string
  modelo: string; created_at: string
  ultimo_run?: AgentRun | null; ultimo_relatorio?: AgentReport | null
}

interface Achado {
  titulo: string; descricao: string; severidade: 'critica' | 'alta' | 'media' | 'baixa'
  sugestao: string; modulo_afetado?: string
}

interface Report {
  id: string; resumo: string; severidade_max: string; status: string
  tokens_input: number; tokens_output: number; custo_usd: number
  tempo_execucao_ms: number; created_at: string; achados: Achado[]
  ai_agents?: { nome: string; slug: string; categoria: string } | null
}

interface Meeting {
  id: string; titulo: string; resumo_executivo: string
  decisoes:       Array<{ titulo: string; severidade: string; agente_origem: string; acao_sugerida: string }>
  conflitos:      Array<{ descricao: string; agentes_envolvidos: string[] }>
  proximos_passos: Array<{ acao: string; prazo_sugerido: string; responsavel: string }>
  created_at: string
}

interface AgentCost { nome: string; slug: string; execucoes: number; tokens_input: number; tokens_output: number; custo_usd: number }
interface CostData { por_agente: AgentCost[]; total_mes_usd: number; total_mes_brl: number; total_execucoes: number; periodo: string }

interface DayAchado { dia: string; critica: number; alta: number; media: number; baixa: number; total: number }
interface DayScore  { dia: string; score: number | null }
interface DayCusto  { dia: string; custo: number }
interface DayExec   { dia: string; execucoes: number; tempo_medio: number }
interface FeedItem  { id: string; resumo: string; severidade_max: string; achados: Achado[]; created_at: string; ai_agents: { nome: string; slug: string; categoria: string } | null }

interface StatsData {
  achados_por_dia: DayAchado[]; score_por_dia: DayScore[]; custo_por_dia: DayCusto[]
  execucoes_por_dia: DayExec[]; health_score: number
  achados_hoje: { total: number; critica: number; alta: number; media: number; baixa: number }
  total_custo_periodo: number; execucoes_hoje: number; feed: FeedItem[]; agentes_ativos: number
}

interface QueueEvent {
  type: 'agent_start' | 'agent_done' | 'agent_error' | 'queue_done'
  slug: string; nome: string; current: number; total: number; progress: string
  result?: { resumo: string; achados: unknown[]; custoUsd: number }
  error?: string
  summary?: { total: number; completed: number; failed: number; custoTotal: number; tempoTotal: number }
}
interface QueueProgress { current: number; total: number; slug: string; nome: string; progress: string }

type Tab    = 'agentes' | 'relatorios' | 'reunioes' | 'custos'
type Period = '7d' | '30d' | '90d'

// ── Constants ─────────────────────────────────────────────────────────────────

const SEV_CFG: Record<string, { label: string; color: string; fill: string; icon: React.ElementType }> = {
  critica: { label: 'Crítica', color: 'bg-red-900/30 text-red-400 border-red-700/30',         fill: '#EF4444', icon: XCircle      },
  alta:    { label: 'Alta',    color: 'bg-orange-900/30 text-orange-400 border-orange-700/30', fill: '#F97316', icon: AlertTriangle },
  media:   { label: 'Média',   color: 'bg-amber-900/30 text-amber-400 border-amber-700/30',   fill: '#EAB308', icon: AlertCircle  },
  baixa:   { label: 'Baixa',   color: 'bg-blue-900/30 text-blue-400 border-blue-700/30',      fill: '#3B82F6', icon: Info         },
}

const STATUS_REPORT_CFG: Record<string, { label: string; color: string }> = {
  novo:         { label: 'Novo',         color: 'bg-violet-900/30 text-violet-400 border-violet-700/30' },
  lido:         { label: 'Lido',         color: 'bg-slate-800 text-slate-400 border-slate-700/30'        },
  em_andamento: { label: 'Em andamento', color: 'bg-amber-900/30 text-amber-400 border-amber-700/30'     },
  resolvido:    { label: 'Resolvido',    color: 'bg-green-900/30 text-green-400 border-green-700/30'     },
  descartado:   { label: 'Descartado',   color: 'bg-slate-800 text-slate-500 border-slate-700/20'        },
}

const CAT_ICON: Record<string, React.ElementType> = {
  protecao: Shield, produto: BarChart3, meta: Users,
  deploy: Rocket, compliance: Scale, marketplace: Globe, default: Bot,
}

const CAT_CFG: Record<string, { label: string; emoji: string; accent: string; iconBg: string }> = {
  protecao:    { label: 'Proteção',    emoji: '🛡️', accent: 'text-red-400',    iconBg: 'bg-red-500/10 border-red-500/20'     },
  produto:     { label: 'Produto',     emoji: '📊', accent: 'text-blue-400',   iconBg: 'bg-blue-500/10 border-blue-500/20'   },
  meta:        { label: 'Meta',        emoji: '🧠', accent: 'text-violet-400', iconBg: 'bg-violet-500/10 border-violet-500/20' },
  deploy:      { label: 'Deploy',      emoji: '🚀', accent: 'text-green-400',  iconBg: 'bg-green-500/10 border-green-500/20' },
  compliance:  { label: 'Compliance',  emoji: '⚖️', accent: 'text-amber-400',  iconBg: 'bg-amber-500/10 border-amber-500/20' },
  marketplace: { label: 'Marketplace', emoji: '🔶', accent: 'text-orange-400', iconBg: 'bg-orange-500/10 border-orange-500/20' },
}
const CAT_DEFAULT_CFG = { label: 'Outros', emoji: '🤖', accent: 'text-slate-400', iconBg: 'bg-slate-500/10 border-slate-500/20' }
const CAT_ORDER = ['protecao', 'produto', 'marketplace', 'deploy', 'compliance', 'meta']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}
function fmtMs(ms: number)  { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }
function fmtUsd(v: number)  { return `$${v.toFixed(6)}` }

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function formatXTick(dia: string, index: number, period: Period): string {
  if (period === '90d' && index % 10 !== 0) return ''
  if (period === '30d' && index % 5  !== 0) return ''
  const d = new Date(dia + 'T12:00:00Z')
  if (period === '7d') {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return `${days[d.getDay()] ?? ''} ${d.getDate()}`
  }
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SevBadge({ sev }: { sev: string }) {
  const cfg  = SEV_CFG[sev] ?? SEV_CFG.media!
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_REPORT_CFG[status] ?? STATUS_REPORT_CFG.novo!
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// Health Score Gauge (SVG semicircle)
function HealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#EAB308' : '#EF4444'
  const R     = 38
  const perimeter = Math.PI * R
  const offset    = perimeter * (1 - score / 100)
  return (
    <svg viewBox="0 0 100 64" fill="none" className="w-full h-full">
      <path d="M 12 54 A 38 38 0 0 1 88 54" stroke="#1e293b"   strokeWidth="9" strokeLinecap="round" />
      <path d="M 12 54 A 38 38 0 0 1 88 54" stroke={color}     strokeWidth="9" strokeLinecap="round"
        strokeDasharray={perimeter} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50" y="45" textAnchor="middle" fill="white"    fontSize="18" fontWeight="bold" fontFamily="system-ui">{score}</text>
      <text x="50" y="58" textAnchor="middle" fill="#64748b"  fontSize="6"  fontFamily="system-ui">/ 100</text>
    </svg>
  )
}

// Dark tooltip for Recharts
function DarkTooltip({ active, payload, label, valueFormatter }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>
  label?: string; valueFormatter?: (v: number, name: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-2xl backdrop-blur-sm">
      {label && <p className="text-slate-400 mb-1.5 font-medium border-b border-white/[0.06] pb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {valueFormatter ? valueFormatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// Export Dropdown
function ExportDropdown({ period }: { period: Period }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const dl = (format: string) => {
    window.open(`/api/admin/agentes/export?format=${format}&period=${period}`, '_blank')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm transition-colors">
        <Download className="w-3.5 h-3.5" /> Exportar <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-20 py-1 min-w-[120px]">
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

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({
  agent, onExecutar, onToggle, executing, completionStatus,
}: {
  agent: Agent; onExecutar: (slug: string) => void
  onToggle: (slug: string, ativo: boolean) => void
  executing: boolean; completionStatus: 'completed' | 'failed' | null
}) {
  const catCfg = CAT_CFG[agent.categoria] ?? CAT_DEFAULT_CFG
  const Icon   = CAT_ICON[agent.categoria] ?? CAT_ICON.default!

  return (
    <div className={`glass-card p-5 flex flex-col gap-4 relative transition-all ${
      completionStatus === 'completed' ? 'ring-1 ring-green-500/40' :
      completionStatus === 'failed'    ? 'ring-1 ring-red-500/40'   : ''
    }`}>
      {completionStatus && (
        <div className={`absolute top-2 right-2 ${completionStatus === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
          {completionStatus === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${catCfg.iconBg}`}>
            <Icon className={`w-5 h-5 ${catCfg.accent}`} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{agent.nome}</p>
            <p className="text-[11px] text-slate-500 capitalize">{agent.categoria} · {agent.frequencia}</p>
          </div>
        </div>
        <button onClick={() => onToggle(agent.slug, !agent.ativo)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0" title={agent.ativo ? 'Desativar' : 'Ativar'}>
          {agent.ativo ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
        </button>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{agent.descricao}</p>
      <div className="space-y-1.5">
        {agent.ultimo_run ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Última execução: {fmtDate(agent.ultimo_run.started_at)}</span>
          </div>
        ) : <p className="text-[11px] text-slate-600">Nenhuma execução registrada</p>}
        {agent.ultimo_relatorio && (
          <div className="flex items-center gap-2">
            <SevBadge sev={agent.ultimo_relatorio.severidade_max} />
            <StatusBadge status={agent.ultimo_relatorio.status} />
          </div>
        )}
      </div>
      <a href={`/admin/agentes/${agent.slug}`}
        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all mb-[-8px] ${catCfg.iconBg} hover:opacity-80 ${catCfg.accent}`}>
        <TrendingUp className="w-3 h-3" /> Ver detalhe
      </a>
      <button onClick={() => onExecutar(agent.slug)} disabled={executing || !agent.ativo}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${catCfg.iconBg} hover:opacity-80 ${catCfg.accent}`}>
        {executing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executando...</> : <><Play className="w-3.5 h-3.5" /> Executar agora</>}
      </button>
    </div>
  )
}

// ── Report Row ────────────────────────────────────────────────────────────────

function ReportRow({ report, onStatusChange }: { report: Report; onStatusChange: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const ag = report.ai_agents
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]" onClick={() => setExpanded(!expanded)}>
        <button className="text-slate-500">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{report.resumo || 'Sem resumo'}</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span>{ag?.nome ?? '—'}</span><span>·</span>
            <span>{fmtDate(report.created_at)}</span><span>·</span>
            <span>{fmtMs(report.tempo_execucao_ms)}</span><span>·</span>
            <span>{fmtUsd(report.custo_usd)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SevBadge sev={report.severidade_max} />
          <StatusBadge status={report.status} />
          <select value={report.status} onChange={e => { e.stopPropagation(); onStatusChange(report.id, e.target.value) }} onClick={e => e.stopPropagation()}
            className="text-[10px] bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-slate-400 cursor-pointer">
            {Object.entries(STATUS_REPORT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.05] space-y-3">
          {report.achados?.length > 0 ? report.achados.map((a, i) => {
            const sev = SEV_CFG[a.severidade] ?? SEV_CFG.media!
            const SevIcon = sev.icon
            return (
              <div key={i} className={`rounded-lg border p-3 space-y-1 ${sev.color}`}>
                <div className="flex items-center gap-2">
                  <SevIcon className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-sm font-semibold">{a.titulo}</p>
                  {a.modulo_afetado && <span className="text-[10px] opacity-70 ml-auto">{a.modulo_afetado}</span>}
                </div>
                <p className="text-xs opacity-80 leading-relaxed">{a.descricao}</p>
                <p className="text-xs opacity-60 italic">💡 {a.sugestao}</p>
              </div>
            )
          }) : <p className="text-xs text-slate-500 italic">Nenhum achado detalhado disponível.</p>}
          <div className="flex gap-4 text-[11px] text-slate-600">
            <span>Tokens: {report.tokens_input} in / {report.tokens_output} out</span>
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
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]" onClick={() => setExpanded(!expanded)}>
        <button className="text-slate-500">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">{meeting.titulo}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(meeting.created_at)}</p>
        </div>
        <div className="text-[11px] text-slate-500">{(meeting.decisoes ?? []).length} prioridade(s)</div>
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
        </div>
      )}
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ totalAgents, onConfirm, onCancel }: { totalAgents: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-md mx-4 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="font-bold text-white">Executar Todos os Agentes</h2>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3 text-sm text-slate-400">
          <p>Serão executados <span className="text-white font-semibold">{totalAgents} agentes ativos</span> sequencialmente:</p>
          <ol className="list-decimal list-inside space-y-1 text-[12px]">
            <li>🛡️ Proteção (dados base)</li>
            <li>🔶 Marketplace (chamadas ML)</li>
            <li>📊 Produto + 🚀 Deploy + ⚖️ Compliance</li>
            <li>🧠 Meta (Auditor, Sugestor, Coordenador)</li>
          </ol>
          <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 px-3 py-2 text-amber-300 text-xs">
            ⏱ Tempo estimado: {Math.ceil(totalAgents * 30 / 60)} min &nbsp;·&nbsp;
            💰 Custo estimado: ~US$ {(totalAgents * 0.007).toFixed(2)}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-white/10 text-slate-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-violet-600/30 border border-violet-500/30 text-violet-300 text-sm font-semibold hover:bg-violet-600/40 transition-colors">Confirmar e Executar</button>
        </div>
      </div>
    </div>
  )
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="space-y-0">
      {items.length === 0
        ? <p className="text-xs text-slate-600 text-center py-6">Nenhuma atividade recente.</p>
        : items.map(item => {
          const cfg    = SEV_CFG[item.severidade_max] ?? SEV_CFG.baixa!
          const SevIcon = cfg.icon
          const ag     = item.ai_agents
          const catCfg = ag ? (CAT_CFG[ag.categoria] ?? CAT_DEFAULT_CFG) : CAT_DEFAULT_CFG
          return (
            <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
              <div className="mt-0.5 shrink-0">
                <SevIcon className={`w-3.5 h-3.5 ${cfg.fill === '#EF4444' ? 'text-red-400' : cfg.fill === '#F97316' ? 'text-orange-400' : cfg.fill === '#EAB308' ? 'text-amber-400' : 'text-blue-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] font-semibold ${catCfg.accent}`}>{ag?.nome ?? '?'}</span>
                  <SevBadge sev={item.severidade_max} />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.resumo || `${item.achados?.length ?? 0} achado(s)`}</p>
              </div>
              <span className="text-[10px] text-slate-600 shrink-0">{relativeTime(item.created_at)}</span>
            </div>
          )
        })}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAgentesPage() {
  useEffect(() => { document.title = 'Agentes de IA — Admin Foguetim' }, [])

  const [tab, setTab]             = useState<Tab>('agentes')
  const [period, setPeriod]       = useState<Period>('7d')
  const [agents, setAgents]       = useState<Agent[]>([])
  const [reports, setReports]     = useState<Report[]>([])
  const [meetings, setMeetings]   = useState<Meeting[]>([])
  const [costs, setCosts]         = useState<CostData | null>(null)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loadingAgents,   setLoadingAgents]   = useState(true)
  const [loadingReports,  setLoadingReports]  = useState(false)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [loadingCosts,    setLoadingCosts]    = useState(false)
  const [loadingStats,    setLoadingStats]    = useState(false)
  const [executing,  setExecuting]  = useState<string | null>(null)
  const [execMsg,    setExecMsg]    = useState<{ slug: string; msg: string; ok: boolean } | null>(null)
  const [toastMsg,   setToastMsg]   = useState('')
  const [filterSev,       setFilterSev]       = useState('')
  const [filterStatus,    setFilterStatus]    = useState('')
  const [filterPeriodo,   setFilterPeriodo]   = useState('7d')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [executingAll,     setExecutingAll]     = useState(false)
  const [queueProgress,    setQueueProgress]    = useState<QueueProgress | null>(null)
  const [completedSlugs,   setCompletedSlugs]   = useState<Set<string>>(new Set())
  const [failedSlugs,      setFailedSlugs]      = useState<Set<string>>(new Set())
  const abortRef = useRef<boolean>(false)

  // Derived
  const totalAtivos    = agents.filter(a => a.ativo).length
  const achCriticos    = reports.filter(r => r.severidade_max === 'critica' && r.status === 'novo').length
  const ultimaExecucao = agents.map(a => a.ultimo_run?.started_at ?? '').filter(Boolean).sort().pop()
  const latestMeeting  = meetings[0] ?? null

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true)
    try {
      const res = await fetch('/api/admin/agentes')
      if (res.ok) { const d = await res.json() as { agents: Agent[] }; setAgents(d.agents ?? []) }
    } finally { setLoadingAgents(false) }
  }, [])

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/admin/agentes/stats?period=${period}`)
      if (res.ok) { const d = await res.json() as StatsData; setStatsData(d) }
    } finally { setLoadingStats(false) }
  }, [period])

  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const params = new URLSearchParams({ periodo: filterPeriodo })
      if (filterSev)    params.set('severidade', filterSev)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/admin/agentes/relatorios?${params.toString()}`)
      if (res.ok) { const d = await res.json() as { reports: Report[] }; setReports(d.reports ?? []) }
    } finally { setLoadingReports(false) }
  }, [filterSev, filterStatus, filterPeriodo])

  const loadMeetings = useCallback(async () => {
    setLoadingMeetings(true)
    try {
      const res = await fetch('/api/admin/agentes/reunioes')
      if (res.ok) { const d = await res.json() as { meetings: Meeting[] }; setMeetings(d.meetings ?? []) }
    } finally { setLoadingMeetings(false) }
  }, [])

  const loadCosts = useCallback(async () => {
    setLoadingCosts(true)
    try {
      const res = await fetch('/api/admin/agentes/custos')
      if (res.ok) { const d = await res.json() as CostData; setCosts(d) }
    } finally { setLoadingCosts(false) }
  }, [])

  useEffect(() => { void loadAgents(); void loadStats(); void loadMeetings() }, [loadAgents, loadStats, loadMeetings])
  useEffect(() => { void loadStats() }, [loadStats])

  // Auto-refresh every 60s
  useEffect(() => {
    const timer = setInterval(() => { void loadStats(); void loadAgents() }, 60_000)
    return () => clearInterval(timer)
  }, [loadStats, loadAgents])

  useEffect(() => {
    if (tab === 'relatorios') void loadReports()
    if (tab === 'reunioes')   void loadMeetings()
    if (tab === 'custos')     void loadCosts()
  }, [tab, loadReports, loadMeetings, loadCosts])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleExecutar(slug: string) {
    setExecuting(slug); setExecMsg(null)
    try {
      const res  = await fetch(`/api/admin/agentes/${slug}/executar`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; result?: { resumo: string; achados: unknown[] }; error?: string }
      if (data.ok) {
        setExecMsg({ slug, msg: `✅ Concluído! ${(data.result?.achados ?? []).length} achado(s). ${data.result?.resumo ?? ''}`, ok: true })
        void loadAgents(); void loadStats()
        if (tab === 'relatorios') void loadReports()
        if (tab === 'reunioes' && slug === 'coordenador') void loadMeetings()
      } else {
        setExecMsg({ slug, msg: `❌ Erro: ${data.error ?? 'desconhecido'}`, ok: false })
      }
    } catch (e) {
      setExecMsg({ slug, msg: `❌ Falha de rede: ${e instanceof Error ? e.message : String(e)}`, ok: false })
    } finally { setExecuting(null) }
  }

  async function handleToggle(slug: string, ativo: boolean) {
    await fetch(`/api/admin/agentes/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo }) })
    setAgents(prev => prev.map(a => a.slug === slug ? { ...a, ativo } : a))
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/admin/agentes/relatorios/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setToastMsg('Status atualizado'); setTimeout(() => setToastMsg(''), 2000)
  }

  async function handleExecutarTodos() {
    setShowConfirmModal(false); setExecutingAll(true)
    setCompletedSlugs(new Set()); setFailedSlugs(new Set())
    setQueueProgress({ current: 0, total: totalAtivos, slug: '', nome: 'Iniciando...', progress: `0/${totalAtivos}` })
    abortRef.current = false
    try {
      const res = await fetch('/api/admin/agentes/executar-todos', { method: 'POST' })
      if (!res.ok || !res.body) { setExecutingAll(false); return }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
      while (true) {
        if (abortRef.current) { await reader.cancel(); break }
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as QueueEvent
            if (event.type === 'agent_start') {
              setQueueProgress({ current: event.current, total: event.total, slug: event.slug, nome: event.nome, progress: event.progress })
            } else if (event.type === 'agent_done') {
              setCompletedSlugs(prev => { const s = new Set(prev); s.add(event.slug); return s })
              setQueueProgress({ current: event.current, total: event.total, slug: event.slug, nome: event.nome, progress: event.progress })
            } else if (event.type === 'agent_error') {
              setFailedSlugs(prev => { const s = new Set(prev); s.add(event.slug); return s })
            } else if (event.type === 'queue_done') {
              const s = event.summary!
              setToastMsg(`✅ Fila concluída: ${s.completed}/${s.total} agentes | $${s.custoTotal.toFixed(6)} | ${Math.round(s.tempoTotal / 1000)}s`)
              setTimeout(() => setToastMsg(''), 8000)
              void loadAgents(); void loadStats()
              if (tab === 'relatorios') void loadReports()
              void loadMeetings()
              if (tab === 'custos') void loadCosts()
            }
          } catch { /* parse error */ }
        }
      }
    } catch (err) { console.error('[executar-todos]', err) }
    finally { setExecutingAll(false); setQueueProgress(null) }
  }

  // ── Chart helpers ─────────────────────────────────────────────────────────

  const xTick = ({ x, y, payload, index }: { x: number; y: number; payload: { value: string }; index: number }) => {
    const label = formatXTick(payload.value, index, period)
    if (!label) return <g />
    return <text x={x} y={y + 10} textAnchor="middle" fill="#94a3b8" fontSize={10}>{label}</text>
  }

  const healthColor = statsData
    ? statsData.health_score >= 80 ? '#22C55E' : statsData.health_score >= 50 ? '#EAB308' : '#EF4444'
    : '#64748b'

  // ── TABS config ────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'agentes',    label: 'Agentes',    icon: Bot      },
    { id: 'relatorios', label: 'Relatórios', icon: FileText  },
    { id: 'reunioes',   label: 'Reuniões',   icon: Users    },
    { id: 'custos',     label: 'Custos',     icon: BarChart3 },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#03050f' }}>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-900/80 border border-green-700/30 text-green-300 text-sm px-4 py-2 rounded-xl shadow-lg max-w-sm">
          {toastMsg}
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirmModal && (
        <ConfirmModal totalAgents={totalAtivos} onConfirm={() => void handleExecutarTodos()} onCancel={() => setShowConfirmModal(false)} />
      )}

      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── Critical alerts banner ─────────────────────────────────────────── */}
        {achCriticos > 0 && (
          <div className="flex items-center gap-3 bg-red-900/25 border border-red-700/40 rounded-xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <p className="text-red-300 text-sm flex-1">
              <strong>{achCriticos}</strong> {achCriticos === 1 ? 'relatório com achado crítico aguarda' : 'relatórios com achados críticos aguardam'} atenção.
            </p>
            <button onClick={() => setTab('relatorios')} className="text-red-400 text-xs hover:text-red-300 transition-colors underline whitespace-nowrap">
              Ver relatórios →
            </button>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Bot className="w-7 h-7 text-violet-400" />
              Agentes de IA
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {agents.length} agentes · {totalAtivos} ativos
              {loadingStats ? '' : statsData ? ` · Score: ${statsData.health_score}/100` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mr-1">
              <Wifi className="w-3 h-3" /> auto-refresh 60s
            </div>
            <button onClick={() => { void loadAgents(); void loadStats() }}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors" title="Atualizar">
              <RefreshCw className={`w-4 h-4 ${loadingAgents || loadingStats ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowConfirmModal(true)} disabled={executingAll || totalAtivos === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {executingAll ? <><Loader2 className="w-4 h-4 animate-spin" /> Executando...</> : <><ListChecks className="w-4 h-4" /> Executar Todos</>}
            </button>
          </div>
        </div>

        {/* ── Queue progress bar ─────────────────────────────────────────────── */}
        {executingAll && queueProgress && (
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                <span className="text-white font-medium">
                  {queueProgress.current === 0 ? 'Iniciando fila...' : `Executando: ${queueProgress.nome}`}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-xs">{queueProgress.progress}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                style={{ width: queueProgress.total > 0 ? `${(queueProgress.current / queueProgress.total) * 100}%` : '0%' }} />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> {completedSlugs.size} concluído(s)</span>
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> {failedSlugs.size} falhou</span>
            </div>
          </div>
        )}

        {/* ── Stats Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Health Score (gauge) */}
          <div className="glass-card px-4 py-3 flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="w-20 h-14 shrink-0">
              {loadingStats ? <div className="w-full h-full bg-slate-800 animate-pulse rounded" /> : <HealthGauge score={statsData?.health_score ?? 0} />}
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Score de Saúde</p>
              {!loadingStats && statsData && (
                <p className="text-xs font-semibold mt-0.5" style={{ color: healthColor }}>
                  {statsData.health_score >= 80 ? '● Saudável' : statsData.health_score >= 50 ? '● Atenção' : '● Crítico'}
                </p>
              )}
            </div>
          </div>

          {/* Achados Hoje */}
          <div className="glass-card px-4 py-3">
            <p className="text-[11px] text-slate-500 mb-1">Achados Hoje</p>
            {loadingStats ? <div className="h-8 bg-slate-800 animate-pulse rounded" /> : statsData ? (
              <div>
                <p className="text-xl font-bold text-white">{statsData.achados_hoje.total}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {statsData.achados_hoje.critica > 0 && <span className="text-[10px] text-red-400">{statsData.achados_hoje.critica}c</span>}
                  {statsData.achados_hoje.alta    > 0 && <span className="text-[10px] text-orange-400">{statsData.achados_hoje.alta}a</span>}
                  {statsData.achados_hoje.media   > 0 && <span className="text-[10px] text-amber-400">{statsData.achados_hoje.media}m</span>}
                  {statsData.achados_hoje.baixa   > 0 && <span className="text-[10px] text-blue-400">{statsData.achados_hoje.baixa}b</span>}
                  {statsData.achados_hoje.total === 0 && <span className="text-[10px] text-green-400">Tudo ok</span>}
                </div>
              </div>
            ) : <p className="text-lg font-bold text-slate-600">—</p>}
          </div>

          {/* Agentes Ativos */}
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-green-400`}>
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Agentes Ativos</p>
              <p className="text-sm font-bold text-white">
                {loadingAgents ? '...' : `${totalAtivos} / ${agents.length}`}
              </p>
              {ultimaExecucao && <p className="text-[10px] text-slate-600 mt-0.5">{relativeTime(ultimaExecucao)}</p>}
            </div>
          </div>

          {/* Custo do Período */}
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-violet-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Custo ({period})</p>
              {loadingStats
                ? <div className="h-5 w-16 bg-slate-800 animate-pulse rounded mt-1" />
                : <p className="text-sm font-bold text-white">{statsData ? fmtUsd(statsData.total_custo_periodo) : '—'}</p>}
              {costs && <p className="text-[10px] text-slate-600 mt-0.5">Mês: {fmtUsd(costs.total_mes_usd)}</p>}
            </div>
          </div>

          {/* Última Reunião */}
          <div className="glass-card px-4 py-3">
            <p className="text-[11px] text-slate-500 mb-1">Última Reunião</p>
            {latestMeeting ? (
              <div>
                <p className="text-[11px] text-slate-300 font-medium leading-tight line-clamp-2">{latestMeeting.resumo_executivo || latestMeeting.titulo}</p>
                <p className="text-[10px] text-slate-600 mt-1">{fmtDate(latestMeeting.created_at)}</p>
              </div>
            ) : (
              <button onClick={() => setTab('reunioes')} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
                Execute o Coordenador →
              </button>
            )}
          </div>
        </div>

        {/* ── Exec result banner ─────────────────────────────────────────────── */}
        {execMsg && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${execMsg.ok ? 'bg-green-900/20 border-green-700/30 text-green-300' : 'bg-red-900/20 border-red-700/30 text-red-300'}`}>
            <span className="font-semibold capitalize">{execMsg.slug}:</span> {execMsg.msg}
          </div>
        )}

        {/* ── Charts ─────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tendências</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-white/[0.07] bg-white/[0.02]">
                {(['7d', '30d', '90d'] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${period === p ? 'bg-violet-600/30 text-violet-300' : 'text-slate-500 hover:text-slate-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <ExportDropdown period={period} />
            </div>
          </div>

          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="glass-card h-48 animate-pulse" />)}
            </div>
          ) : statsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Chart 1: Achados por Dia */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Achados por Dia</p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={statsData.achados_por_dia} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="dia" tick={xTick} tickLine={false} axisLine={false} interval={period === '7d' ? 0 : period === '30d' ? 4 : 9} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="critica" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Crítica" />
                    <Area type="monotone" dataKey="alta"    stackId="1" stroke="#F97316" fill="#F97316" fillOpacity={0.5} name="Alta" />
                    <Area type="monotone" dataKey="media"   stackId="1" stroke="#EAB308" fill="#EAB308" fillOpacity={0.4} name="Média" />
                    <Area type="monotone" dataKey="baixa"   stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Baixa" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Score de Saúde */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Score de Saúde</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={statsData.score_por_dia} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <ReferenceArea y1={80} y2={100} fill="#22C55E" fillOpacity={0.04} />
                    <ReferenceArea y1={50}  y2={80}  fill="#EAB308" fillOpacity={0.04} />
                    <ReferenceArea y1={0}   y2={50}  fill="#EF4444" fillOpacity={0.04} />
                    <XAxis dataKey="dia" tick={xTick} tickLine={false} axisLine={false} interval={period === '7d' ? 0 : period === '30d' ? 4 : 9} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<DarkTooltip valueFormatter={v => `${v}/100`} />} />
                    <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={2} dot={false} name="Score" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Custo por Dia */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Custo por Dia (USD)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={statsData.custo_por_dia} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="dia" tick={xTick} tickLine={false} axisLine={false} interval={period === '7d' ? 0 : period === '30d' ? 4 : 9} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(4)}`} />
                    <Tooltip content={<DarkTooltip valueFormatter={v => `$${v.toFixed(6)}`} />} />
                    <Bar dataKey="custo" fill="#00d4ff" fillOpacity={0.65} radius={[3, 3, 0, 0]} name="Custo" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 4: Execuções + Tempo */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Execuções e Performance</p>
                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={statsData.execucoes_por_dia} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="dia" tick={xTick} tickLine={false} axisLine={false} interval={period === '7d' ? 0 : period === '30d' ? 4 : 9} />
                    <YAxis yAxisId="exec" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="tempo" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}ms`} />
                    <Tooltip content={<DarkTooltip valueFormatter={(v, name) => name === 'Tempo Médio' ? `${v}ms` : String(v)} />} />
                    <Bar yAxisId="exec" dataKey="execucoes" fill="#00ff88" fillOpacity={0.5} radius={[3, 3, 0, 0]} name="Execuções" />
                    <Line yAxisId="tempo" type="monotone" dataKey="tempo_medio" stroke="#a855f7" strokeWidth={2} dot={false} name="Tempo Médio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

            </div>
          ) : (
            <div className="glass-card p-8 text-center text-slate-500">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Execute um agente para ver as tendências.</p>
            </div>
          )}
        </div>

        {/* ── Activity Feed ──────────────────────────────────────────────────── */}
        {statsData && statsData.feed.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Feed de Atividade
              </h2>
              <span className="text-[10px] text-slate-600">Últimas {statsData.feed.length} execuções</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <ActivityFeed items={statsData.feed} />
            </div>
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06] w-fit flex-wrap">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-violet-600/30 text-violet-300 border border-violet-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.id === 'relatorios' && achCriticos > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{achCriticos}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab: Agentes ───────────────────────────────────────────────────── */}
        {tab === 'agentes' && (
          <div className="space-y-8">
            {loadingAgents ? (
              <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 text-violet-400 animate-spin" /></div>
            ) : (
              CAT_ORDER.map(cat => {
                const catAgents = agents.filter(a => a.categoria === cat)
                if (catAgents.length === 0) return null
                const cfg = CAT_CFG[cat] ?? CAT_DEFAULT_CFG
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base leading-none">{cfg.emoji}</span>
                      <h2 className={`text-xs font-bold uppercase tracking-widest ${cfg.accent}`}>{cfg.label}</h2>
                      <span className="text-[11px] text-slate-600 ml-1">{catAgents.length} agente{catAgents.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {catAgents.map(agent => (
                        <AgentCard key={agent.id} agent={agent}
                          onExecutar={slug => void handleExecutar(slug)}
                          onToggle={(slug, ativo) => void handleToggle(slug, ativo)}
                          executing={executing === agent.slug}
                          completionStatus={completedSlugs.has(agent.slug) ? 'completed' : failedSlugs.has(agent.slug) ? 'failed' : null}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Tab: Relatórios ─────────────────────────────────────────────────── */}
        {tab === 'relatorios' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select value={filterSev} onChange={e => setFilterSev(e.target.value)} className="input-cyber text-sm py-1.5 px-3">
                <option value="">Todas severidades</option>
                <option value="critica">Crítica</option><option value="alta">Alta</option>
                <option value="media">Média</option><option value="baixa">Baixa</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-cyber text-sm py-1.5 px-3">
                <option value="">Todos status</option>
                {Object.entries(STATUS_REPORT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)} className="input-cyber text-sm py-1.5 px-3">
                <option value="1d">Hoje</option><option value="7d">7 dias</option>
                <option value="30d">30 dias</option><option value="90d">90 dias</option>
              </select>
              <button onClick={() => void loadReports()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/20 text-violet-300 text-sm hover:bg-violet-600/30 transition-colors">
                <Search className="w-3.5 h-3.5" /> Filtrar
              </button>
              <ExportDropdown period={filterPeriodo as Period} />
            </div>
            {loadingReports ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-violet-400 animate-spin" /></div>
              : reports.length === 0
              ? <div className="text-center py-12 text-slate-500"><FileText className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nenhum relatório encontrado.</p></div>
              : <div className="space-y-2">{reports.map(r => <ReportRow key={r.id} report={r} onStatusChange={(id, status) => void handleStatusChange(id, status)} />)}</div>
            }
          </div>
        )}

        {/* ── Tab: Reuniões ────────────────────────────────────────────────────── */}
        {tab === 'reunioes' && (
          <div className="space-y-4">
            {loadingMeetings ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-violet-400 animate-spin" /></div>
              : meetings.length === 0
              ? <div className="text-center py-12 text-slate-500"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nenhuma reunião. Execute o Coordenador.</p></div>
              : <div className="space-y-2">{meetings.map(m => <MeetingRow key={m.id} meeting={m} />)}</div>
            }
          </div>
        )}

        {/* ── Tab: Custos ──────────────────────────────────────────────────────── */}
        {tab === 'custos' && (
          <div className="space-y-6">
            {loadingCosts ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-violet-400 animate-spin" /></div>
              : costs ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total (USD)',      value: `$${costs.total_mes_usd.toFixed(6)}`,   color: 'text-violet-400' },
                    { label: 'Total (BRL est.)', value: `R$ ${costs.total_mes_brl.toFixed(2)}`, color: 'text-blue-400'   },
                    { label: 'Execuções',        value: String(costs.total_execucoes),           color: 'text-green-400'  },
                    { label: 'Período',          value: costs.periodo,                           color: 'text-slate-400'  },
                  ].map(k => (
                    <div key={k.label} className="glass-card px-4 py-3">
                      <p className="text-[11px] text-slate-500">{k.label}</p>
                      <p className={`text-sm font-bold ${k.color} mt-0.5`}>{k.value}</p>
                    </div>
                  ))}
                </div>
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Agente', 'Execuções', 'Tokens In', 'Tokens Out', 'Custo USD'].map(h => (
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
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Nenhuma execução este mês.</p>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-600">claude-sonnet-4-20250514 — $3/MTok entrada · $15/MTok saída · Câmbio estimado: R$5,85/USD</p>
              </>
            ) : <div className="text-center py-12 text-slate-500"><DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Falha ao carregar custos.</p></div>}
          </div>
        )}

      </div>
    </div>
  )
}
