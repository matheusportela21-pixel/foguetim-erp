'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Ticket, Clock, CheckCircle2, AlertTriangle, Circle, ChevronDown } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
type TicketStatus   = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
type TicketCategory = 'bug' | 'feature_request' | 'billing' | 'integration' | 'account' | 'performance' | 'other'

interface SupportTicket {
  id:            string
  ticket_number: number
  title:         string
  description:   string
  status:        TicketStatus
  priority:      TicketPriority
  category:      TicketCategory
  created_at:    string
  updated_at:    string
  user:          { id: string; name: string; email: string } | null
  assignee:      { id: string; name: string; email: string } | null
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:         { label: 'Aberto',          color: 'text-blue-400',   icon: Circle       },
  in_progress:  { label: 'Em progresso',    color: 'text-orange-400', icon: Clock        },
  waiting_user: { label: 'Aguard. usuário', color: 'text-yellow-400', icon: Clock        },
  resolved:     { label: 'Resolvido',       color: 'text-green-400',  icon: CheckCircle2 },
  closed:       { label: 'Fechado',         color: 'text-slate-500',  icon: CheckCircle2 },
}

const PRIORITY_CFG: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Baixa',   color: 'text-slate-400' },
  medium: { label: 'Média',   color: 'text-blue-400'  },
  high:   { label: 'Alta',    color: 'text-orange-400'},
  urgent: { label: 'Urgente', color: 'text-red-400'   },
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug:             'Bug',
  feature_request: 'Sugestão',
  billing:         'Cobrança',
  integration:     'Integração',
  account:         'Conta',
  performance:     'Performance',
  other:           'Outro',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminTicketsPage() {
  const [tickets, setTickets]     = useState<SupportTicket[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [updating, setUpdating]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filterStatus)   params.set('status', filterStatus)
      if (filterPriority) params.set('priority', filterPriority)
      const res = await fetch(`/api/admin/tickets?${params}`)
      if (res.ok) {
        const d = await res.json() as { tickets: SupportTicket[]; total: number }
        setTickets(d.tickets ?? [])
        setTotal(d.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPriority])

  useEffect(() => { load() }, [load])

  async function updateTicket(id: string, body: Record<string, string>) {
    setUpdating(id)
    await fetch(`/api/admin/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setUpdating(null)
    load()
  }

  // KPI counts
  const counts: Record<TicketStatus, number> = {
    open:         0,
    in_progress:  0,
    waiting_user: 0,
    resolved:     0,
    closed:       0,
  }
  tickets.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1 })

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Tickets de Suporte
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} ticket(s) no total</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(STATUS_CFG) as TicketStatus[]).map(s => {
          const cfg  = STATUS_CFG[s]
          const Icon = cfg.icon
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${filterStatus === s ? 'bg-white/[0.06] border-white/10' : 'bg-[#111318] border-white/[0.06] hover:border-white/10'}`}>
              <Icon className={`w-4 h-4 ${cfg.color} shrink-0`} />
              <div>
                <p className={`text-lg font-bold ${cfg.color} tabular-nums`}>{counts[s]}</p>
                <p className="text-[10px] text-slate-600 leading-tight">{cfg.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_CFG) as TicketStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none">
          <option value="">Todas as prioridades</option>
          {(Object.keys(PRIORITY_CFG) as TicketPriority[]).map(p => (
            <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
          ))}
        </select>
      </div>

      {/* Tickets list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#111318] border border-white/[0.06] rounded-xl animate-pulse" />
          ))
        ) : tickets.length === 0 ? (
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-12 text-center">
            <Ticket className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Nenhum ticket encontrado</p>
            <p className="text-xs text-slate-700 mt-1">Os tickets de suporte dos usuários aparecerão aqui</p>
          </div>
        ) : tickets.map(t => {
          const statusCfg   = STATUS_CFG[t.status]
          const priorityCfg = PRIORITY_CFG[t.priority]
          const StatusIcon  = statusCfg.icon
          const isExpanded  = expanded === t.id
          return (
            <div key={t.id} className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                onClick={() => setExpanded(isExpanded ? null : t.id)}
              >
                <span className="text-xs text-slate-600 font-mono w-12 shrink-0">#{t.ticket_number}</span>
                <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${statusCfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{t.title}</p>
                  <p className="text-[11px] text-slate-600">
                    {t.user?.name ?? '—'} · {CATEGORY_LABELS[t.category]} · {fmtDate(t.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {t.priority !== 'medium' && (
                    <span className={`text-[10px] font-bold ${priorityCfg.color}`}>
                      {priorityCfg.label}
                    </span>
                  )}
                  {t.assignee && (
                    <span className="text-[10px] text-slate-500">{t.assignee.name}</span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 space-y-4">
                  <div className="p-3 bg-white/[0.02] rounded-lg">
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {/* Status change */}
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Status</label>
                      <select
                        value={t.status}
                        disabled={updating === t.id}
                        onChange={e => updateTicket(t.id, { status: e.target.value })}
                        className="px-2 py-1.5 text-xs bg-[#1a1f2e] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none disabled:opacity-50"
                      >
                        {(Object.keys(STATUS_CFG) as TicketStatus[]).map(s => (
                          <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Priority change */}
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Prioridade</label>
                      <select
                        value={t.priority}
                        disabled={updating === t.id}
                        onChange={e => updateTicket(t.id, { priority: e.target.value })}
                        className="px-2 py-1.5 text-xs bg-[#1a1f2e] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none disabled:opacity-50"
                      >
                        {(Object.keys(PRIORITY_CFG) as TicketPriority[]).map(p => (
                          <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
                        ))}
                      </select>
                    </div>
                    {/* User info */}
                    {t.user && (
                      <div className="ml-auto text-right">
                        <p className="text-[10px] text-slate-600">Enviado por</p>
                        <p className="text-xs text-slate-300 font-semibold">{t.user.name}</p>
                        <p className="text-[10px] text-slate-600">{t.user.email}</p>
                      </div>
                    )}
                  </div>
                  {updating === t.id && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Salvando...
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
