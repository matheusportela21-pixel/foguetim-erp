'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, ArrowLeft, Ticket, Circle, Clock, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

/* ── Types ───────────────────────────────────────────────────────────────── */
type TicketStatus   = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'
type TicketCategory = 'bug' | 'feature_request' | 'billing' | 'integration' | 'account' | 'performance' | 'other'

interface SupportTicket {
  id:            string
  ticket_number: number
  title:         string
  description:   string
  status:        TicketStatus
  category:      TicketCategory
  created_at:    string
  updated_at:    string
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  open:         { label: 'Aberto',           color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: Circle       },
  in_progress:  { label: 'Em progresso',     color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Clock        },
  waiting_user: { label: 'Aguard. resposta', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock        },
  resolved:     { label: 'Resolvido',        color: 'text-green-400',  bg: 'bg-green-500/10',  icon: CheckCircle2 },
  closed:       { label: 'Fechado',          color: 'text-slate-500',  bg: 'bg-slate-500/10',  icon: CheckCircle2 },
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
    timeZone: 'America/Sao_Paulo',
  })
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function FeedbacksPage() {
  useEffect(() => { document.title = 'Meus Feedbacks — Foguetim ERP' }, [])
  const [tickets, setTickets]   = useState<SupportTicket[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tickets?limit=100')
      if (res.ok) {
        const d = await res.json() as { tickets: SupportTicket[]; total: number }
        setTickets(d.tickets ?? [])
        setTotal(d.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title="Meus Feedbacks" description="Histórico dos seus tickets e sugestões enviadas" />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Back + refresh */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/ajuda"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para Ajuda
          </Link>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Summary */}
        <p className="text-xs text-slate-600">{total} ticket(s) enviado(s)</p>

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 dash-card rounded-xl shimmer-load" />
            ))
          ) : tickets.length === 0 ? (
            <div className="dash-card rounded-2xl p-12 text-center">
              <Ticket className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nenhum ticket enviado ainda</p>
              <p className="text-xs text-slate-600 mt-1">
                Use o botão "Feedback" no canto inferior esquerdo para reportar bugs ou sugestões.
              </p>
            </div>
          ) : tickets.map(t => {
            const cfg     = STATUS_CFG[t.status]
            const Icon    = cfg.icon
            const isOpen  = expanded === t.id
            return (
              <div key={t.id} className="dash-card rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                >
                  <span className="text-[10px] text-slate-700 font-mono w-10 shrink-0">#{t.ticket_number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{t.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {CATEGORY_LABELS[t.category]} · {fmtDate(t.created_at)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.color} ${cfg.bg}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-white/[0.04] pt-3">
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {t.description}
                    </p>
                    {t.updated_at !== t.created_at && (
                      <p className="text-[10px] text-slate-700 mt-3">
                        Atualizado em {fmtDate(t.updated_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
