'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Bot, Shield, BarChart3, Users, Rocket, Scale, Globe,
  ArrowLeft, RefreshCw, Activity, Clock, DollarSign, FileText,
  AlertCircle, XCircle, Info, AlertTriangle, CheckCircle2, Zap, Download,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentRun    { status: string; started_at: string; finished_at?: string; custo_usd?: number }
interface AgentReport { severidade_max: string; status: string; created_at: string }

interface Agent {
  id: string; nome: string; slug: string; descricao: string
  categoria: string; ativo: boolean; frequencia: string
  modelo: string; created_at: string
  ultimo_run?: AgentRun | null
  ultimo_relatorio?: AgentReport | null
}

interface Achado {
  titulo: string; descricao: string
  severidade: 'critica' | 'alta' | 'media' | 'baixa'
  sugestao: string; modulo_afetado?: string
}

interface Report {
  id: string; resumo: string; severidade_max: string; status: string
  tokens_input: number; tokens_output: number; custo_usd: number
  tempo_execucao_ms: number; created_at: string; achados: Achado[]
  ai_agents?: { nome: string; slug: string; categoria: string } | null
}

interface DayAchado { dia: string; critica: number; alta: number; media: number; baixa: number; total: number }
interface DayCusto  { dia: string; custo: number }
interface DayExec   { dia: string; execucoes: number; tempo_medio: number }

interface StatsData {
  achados_por_dia:   DayAchado[]
  custo_por_dia:     DayCusto[]
  execucoes_por_dia: DayExec[]
  health_score:      number
  achados_hoje:      { total: number; critica: number; alta: number; media: number; baixa: number }
  total_custo_periodo: number
  execucoes_hoje:    number
  agentes_ativos:    number
}

type Period = '7d' | '30d' | '90d'

// ── Constants ─────────────────────────────────────────────────────────────────

const SEV_CFG: Record<string, { label: string; color: string; fill: string; icon: React.ElementType }> = {
  critica: { label: 'Crítica', color: 'bg-red-900/30 text-red-400 border-red-700/30',         fill: '#EF4444', icon: XCircle      },
  alta:    { label: 'Alta',    color: 'bg-orange-900/30 text-orange-400 border-orange-700/30', fill: '#F97316', icon: AlertTriangle },
  media:   { label: 'Média',   color: 'bg-amber-900/30 text-amber-400 border-amber-700/30',   fill: '#EAB308', icon: AlertCircle  },
  baixa:   { label: 'Baixa',   color: 'bg-blue-900/30 text-blue-400 border-blue-700/30',      fill: '#3B82F6', icon: Info         },
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  novo:         { label: 'Novo',         color: 'bg-violet-900/30 text-violet-400 border-violet-700/30' },
  lido:         { label: 'Lido',         color: 'bg-slate-800 text-slate-400 border-slate-700/30'       },
  em_andamento: { label: 'Em andamento', color: 'bg-amber-900/30 text-amber-400 border-amber-700/30'    },
  resolvido:    { label: 'Resolvido',    color: 'bg-green-900/30 text-green-400 border-green-700/30'    },
  descartado:   { label: 'Descartado',   color: 'bg-slate-800 text-slate-500 border-slate-700/20'       },
}

const CAT_ICON: Record<string, React.ElementType> = {
  protecao: Shield, produto: BarChart3, meta: Users,
  deploy: Rocket, compliance: Scale, marketplace: Globe, default: Bot,
}

const CAT_CFG: Record<string, { label: string; accent: string; iconBg: string }> = {
  protecao:    { label: 'Proteção',    accent: 'text-red-400',    iconBg: 'bg-red-500/10 border-red-500/20'        },
  produto:     { label: 'Produto',     accent: 'text-blue-400',   iconBg: 'bg-blue-500/10 border-blue-500/20'      },
  meta:        { label: 'Meta',        accent: 'text-violet-400', iconBg: 'bg-violet-500/10 border-violet-500/20'  },
  deploy:      { label: 'Deploy',      accent: 'text-green-400',  iconBg: 'bg-green-500/10 border-green-500/20'    },
  compliance:  { label: 'Compliance',  accent: 'text-amber-400',  iconBg: 'bg-amber-500/10 border-amber-500/20'    },
  marketplace: { label: 'Marketplace', accent: 'text-orange-400', iconBg: 'bg-orange-500/10 border-orange-500/20'  },
}

const CAT_DEFAULT = { label: 'Outros', accent: 'text-slate-400', iconBg: 'bg-slate-500/10 border-slate-500/20' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}
function fmtMs(ms: number)  { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }
function fmtUsd(v: number)  { return `$${v.toFixed(6)}` }
function fmtDia(dia: string) {
  const [, m, d] = dia.split('-')
  return `${d}/${m}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 rounded-lg border border-white/10 text-xs min-w-[120px]">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function SevBadge({ sev }: { sev: string }) {
  const cfg = SEV_CFG[sev.toLowerCase()] ?? SEV_CFG['baixa']
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: 'bg-slate-800 text-slate-400 border-slate-700/30' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgentSlugPage() {
  const params  = useParams()
  const router  = useRouter()
  const slug    = (params?.slug as string) ?? ''

  const [agent,    setAgent]    = useState<Agent | null>(null)
  const [stats,    setStats]    = useState<StatsData | null>(null)
  const [reports,  setReports]  = useState<Report[]>([])
  const [loading,  setLoading]  = useState(true)
  const [period,   setPeriod]   = useState<Period>('30d')
  const [expandedReport, setExpandedReport] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    try {
      const [agentsRes, statsRes, reportsRes] = await Promise.all([
        fetch('/api/admin/agentes'),
        fetch(`/api/admin/agentes/stats?period=${period}&agente=${slug}`),
        fetch(`/api/admin/agentes/relatorios?agente=${slug}&periodo=${period}&limit=50`),
      ])
      const agentsData  = await agentsRes.json()
      const statsData   = await statsRes.json()
      const reportsData = await reportsRes.json()

      const found = (agentsData as Agent[] | { error: string })
      if (Array.isArray(found)) {
        setAgent(found.find((a: Agent) => a.slug === slug) ?? null)
      }
      if (!statsData.error)  setStats(statsData)
      if (!reportsData.error) setReports(reportsData.reports ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [slug, period])

  useEffect(() => { load() }, [load])

  if (!slug) return null

  const cat     = agent?.categoria ?? ''
  const catCfg  = CAT_CFG[cat] ?? CAT_DEFAULT
  const CatIcon = CAT_ICON[cat] ?? CAT_ICON['default']

  // Totals from reports list
  const totalAchados  = reports.reduce((s, r) => s + (r.achados?.length ?? 0), 0)
  const totalCusto    = reports.reduce((s, r) => s + (r.custo_usd ?? 0), 0)
  const totalMs       = reports.reduce((s, r) => s + (r.tempo_execucao_ms ?? 0), 0)
  const avgMs         = reports.length > 0 ? Math.round(totalMs / reports.length) : 0

  return (
    <div className="space-y-6">
      {/* ── Back + Header ── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/admin/agentes')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors mt-1"
        >
          <ArrowLeft size={16} /> Agentes
        </button>
      </div>

      {loading && !agent ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <RefreshCw size={20} className="animate-spin mr-2" /> Carregando…
        </div>
      ) : agent ? (
        <>
          {/* ── Agent Header Card ── */}
          <div className="glass-card rounded-xl p-6 border border-white/8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 ${catCfg.iconBg}`}>
                  <CatIcon size={26} className={catCfg.accent} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{agent.nome}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-sm font-medium ${catCfg.accent}`}>{catCfg.label}</span>
                    <span className="text-slate-600">·</span>
                    <code className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">{agent.slug}</code>
                    <span className="text-slate-600">·</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${agent.ativo ? 'text-green-400 bg-green-900/20 border-green-700/30' : 'text-slate-500 bg-slate-800/40 border-slate-700/30'}`}>
                      {agent.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {agent.frequencia && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={11} /> {agent.frequencia}
                        </span>
                      </>
                    )}
                  </div>
                  {agent.descricao && (
                    <p className="text-sm text-slate-400 mt-2 max-w-2xl">{agent.descricao}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as Period)}
                  className="input-cyber text-xs h-8 px-3 rounded-lg"
                >
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                  <option value="90d">90 dias</option>
                </select>
                <button onClick={load} className="btn-neon h-8 px-3 text-xs rounded-lg flex items-center gap-1.5">
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar
                </button>
              </div>
            </div>

            {/* Last run / last report status strip */}
            {(agent.ultimo_run || agent.ultimo_relatorio) && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-white/5 flex-wrap text-xs text-slate-400">
                {agent.ultimo_run && (
                  <span className="flex items-center gap-1.5">
                    <Zap size={12} className="text-cyan-400" />
                    Último run: <span className="text-white">{fmtDate(agent.ultimo_run.started_at)}</span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] border ${agent.ultimo_run.status === 'completed' ? 'text-green-400 border-green-700/30 bg-green-900/20' : 'text-red-400 border-red-700/30 bg-red-900/20'}`}>
                      {agent.ultimo_run.status}
                    </span>
                  </span>
                )}
                {agent.ultimo_relatorio && (
                  <span className="flex items-center gap-1.5">
                    <FileText size={12} className="text-violet-400" />
                    Último relatório: <span className="text-white">{fmtDate(agent.ultimo_relatorio.created_at)}</span>
                    <SevBadge sev={agent.ultimo_relatorio.severidade_max} />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Relatórios', value: String(reports.length), icon: FileText,    accent: 'text-cyan-400',    sub: `no período de ${period}` },
              { label: 'Achados',    value: String(totalAchados),   icon: Activity,    accent: 'text-orange-400',  sub: `${(totalAchados / Math.max(1, reports.length)).toFixed(1)} por relatório` },
              { label: 'Custo Total', value: fmtUsd(totalCusto),   icon: DollarSign,  accent: 'text-green-400',   sub: `${fmtUsd(totalCusto / Math.max(1, reports.length))} por exec` },
              { label: 'Tempo Médio', value: fmtMs(avgMs),         icon: Clock,       accent: 'text-violet-400',  sub: `${fmtMs(totalMs)} total` },
            ].map(({ label, value, icon: Icon, accent, sub }) => (
              <div key={label} className="glass-card rounded-xl p-4 border border-white/8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">{label}</span>
                  <Icon size={16} className={accent} />
                </div>
                <p className={`text-2xl font-bold font-mono ${accent}`}>{value}</p>
                <p className="text-slate-500 text-[10px] mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* ── Charts ── */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Chart 1: Achados por dia */}
              <div className="glass-card rounded-xl p-5 border border-white/8">
                <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                  <Activity size={15} className="text-orange-400" /> Achados por Dia
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.achados_por_dia} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtDia} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="critica" name="Crítica" stackId="1" stroke="#EF4444" fill="url(#gc)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="alta"    name="Alta"    stackId="1" stroke="#F97316" fill="url(#ga)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="media"   name="Média"   stackId="1" stroke="#EAB308" fill="#EAB30810"  strokeWidth={1.5} />
                    <Area type="monotone" dataKey="baixa"   name="Baixa"   stackId="1" stroke="#3B82F6" fill="#3B82F610"  strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Custo por execução */}
              <div className="glass-card rounded-xl p-5 border border-white/8">
                <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                  <DollarSign size={15} className="text-green-400" /> Custo por Dia (USD)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.custo_por_dia} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtDia} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `$${v.toFixed(4)}`} width={60} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="glass-card p-3 rounded-lg border border-white/10 text-xs">
                            <p className="text-slate-400 mb-1">{label}</p>
                            <p className="text-green-400 font-mono">${(payload[0]?.value as number ?? 0).toFixed(6)}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="custo" name="Custo USD" fill="#22C55E" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Execuções + Tempo médio */}
              <div className="glass-card rounded-xl p-5 border border-white/8 lg:col-span-2">
                <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                  <Clock size={15} className="text-violet-400" /> Execuções e Tempo Médio
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={stats.execucoes_por_dia} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtDia} />
                    <YAxis yAxisId="left"  tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}s`} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Bar  yAxisId="left"  dataKey="execucoes"   name="Execuções"  fill="#8B5CF6" fillOpacity={0.8} radius={[3,3,0,0]} />
                    <Line yAxisId="right" dataKey="tempo_medio" name="Tempo (ms)" stroke="#06B6D4" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Reports History ── */}
          <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText size={15} className="text-violet-400" />
                Histórico de Relatórios
                <span className="text-xs text-slate-500 font-normal">({reports.length})</span>
              </h3>
            </div>

            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <FileText size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Nenhum relatório no período</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {reports.map(report => {
                  const isExpanded = expandedReport === report.id
                  const achados   = report.achados ?? []
                  return (
                    <div key={report.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Row */}
                      <button
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
                        onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                      >
                        <SevBadge sev={report.severidade_max} />
                        <span className="flex-1 text-sm text-slate-300 truncate">{report.resumo || '—'}</span>
                        <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                          {achados.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Activity size={11} /> {achados.length}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <DollarSign size={11} /> {fmtUsd(report.custo_usd ?? 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {fmtMs(report.tempo_execucao_ms ?? 0)}
                          </span>
                          <StatusBadge status={report.status} />
                          <span className="text-slate-600">{fmtDate(report.created_at)}</span>
                          <a
                            href={`/api/admin/agentes/export/pdf?report_id=${report.id}`}
                            target="_blank"
                            onClick={e => e.stopPropagation()}
                            className="text-slate-500 hover:text-violet-400 transition-colors"
                            title="Baixar PDF"
                          >
                            <Download size={13} />
                          </a>
                        </div>
                        <span className="text-slate-600 ml-1">{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {/* Expanded achados */}
                      {isExpanded && achados.length > 0 && (
                        <div className="px-5 pb-4 space-y-2">
                          {achados.map((a, i) => {
                            const sevCfg = SEV_CFG[a.severidade?.toLowerCase()] ?? SEV_CFG['baixa']
                            const SevIcon = sevCfg.icon
                            return (
                              <div key={i} className={`rounded-lg p-3.5 border text-sm ${sevCfg.color}`}>
                                <div className="flex items-start gap-2">
                                  <SevIcon size={14} className="mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white">{a.titulo}</p>
                                    {a.descricao && <p className="text-slate-400 text-xs mt-1">{a.descricao}</p>}
                                    {a.sugestao && (
                                      <p className="text-slate-500 text-xs mt-1.5 italic flex items-start gap-1">
                                        <CheckCircle2 size={11} className="text-green-500 mt-0.5 shrink-0" />
                                        {a.sugestao}
                                      </p>
                                    )}
                                    {a.modulo_afetado && (
                                      <code className="text-[10px] text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                                        {a.modulo_afetado}
                                      </code>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
          <Bot size={32} className="mb-3 opacity-30" />
          <p>Agente não encontrado: <code className="text-slate-400">{slug}</code></p>
        </div>
      )}
    </div>
  )
}
