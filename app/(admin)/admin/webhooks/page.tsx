'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Webhook, ChevronLeft, ChevronRight } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface WebhookEntry {
  id:            string
  topic:         string
  resource:      string
  user_id:       string
  status:        string
  attempts:      number
  received_at:   string
  error_message: string | null
}

interface KPIs {
  today:   number
  pending: number
  errors:  number
}

interface ApiResponse {
  webhooks: WebhookEntry[]
  total:    number
  kpis:     KPIs
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const TOPICS = ['orders_v2', 'questions', 'claims', 'messages', 'shipments', 'items', 'payments']

const TOPIC_LABELS: Record<string, string> = {
  orders_v2: 'Pedidos',
  questions: 'Perguntas',
  claims:    'Reclamações',
  messages:  'Mensagens',
  shipments: 'Envios',
  items:     'Anúncios',
  payments:  'Pagamentos',
}

const TOPIC_COLORS: Record<string, string> = {
  orders_v2: 'bg-blue-900/30 text-blue-400',
  questions: 'bg-purple-900/30 text-purple-400',
  claims:    'bg-red-900/30 text-red-400',
  messages:  'bg-cyan-900/30 text-cyan-400',
  shipments: 'bg-amber-900/30 text-amber-400',
  items:     'bg-green-900/30 text-green-400',
  payments:  'bg-emerald-900/30 text-emerald-400',
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-900/30 text-amber-400',
  processing: 'bg-blue-900/30 text-blue-400',
  done:       'bg-green-900/30 text-green-400',
  error:      'bg-red-900/30 text-red-400',
}

const STATUS_ICONS: Record<string, string> = {
  pending:    '⏳',
  processing: '⚙️',
  done:       '✅',
  error:      '❌',
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminWebhooksPage() {
  const [data, setData]           = useState<ApiResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [filterTopic, setFilterTopic]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage]           = useState(1)
  const LIMIT = 50

  const fetchData = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
    if (filterTopic)  params.set('topic', filterTopic)
    if (filterStatus) params.set('status', filterStatus)
    try {
      const res = await fetch(`/api/admin/webhooks?${params}`)
      if (res.ok) setData(await res.json() as ApiResponse)
    } finally {
      setLoading(false)
    }
  }, [page, filterTopic, filterStatus])

  useEffect(() => { void fetchData() }, [fetchData])

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Monitor de Webhooks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Notificações recebidas do Mercado Livre em tempo real
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Recebidos hoje',  value: data?.kpis.today   ?? 0, color: 'text-blue-400'   },
          { label: 'Pendentes',       value: data?.kpis.pending ?? 0, color: 'text-amber-400'  },
          { label: 'Com erro',        value: data?.kpis.errors  ?? 0, color: 'text-red-400'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-2">{label}</p>
            {loading ? (
              <div className="h-7 w-12 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Webhook className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-widest">Filtros</span>
        </div>
        <select
          value={filterTopic}
          onChange={e => { setFilterTopic(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none"
        >
          <option value="">Todos os tópicos</option>
          {TOPICS.map(t => <option key={t} value={t}>{TOPIC_LABELS[t] ?? t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="processing">Processando</option>
          <option value="done">Concluído</option>
          <option value="error">Erro</option>
        </select>
        {(filterTopic || filterStatus) && (
          <button
            onClick={() => { setFilterTopic(''); setFilterStatus(''); setPage(1) }}
            className="px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Hora', 'Tópico', 'Recurso', 'User ML', 'Status', 'Tent.'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data || data.webhooks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Webhook className="w-8 h-8 text-slate-700" />
                    <p className="text-sm text-slate-600">Nenhum webhook recebido</p>
                    <p className="text-xs text-slate-700">
                      Configure a URL no ML Dev Center para começar a receber notificações
                    </p>
                  </div>
                </td>
              </tr>
            ) : data.webhooks.map(w => (
              <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                  {fmtDatetime(w.received_at)}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TOPIC_COLORS[w.topic] ?? 'bg-slate-800 text-slate-400'}`}>
                    {TOPIC_LABELS[w.topic] ?? w.topic}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono max-w-[200px] truncate" title={w.resource}>
                  {w.resource}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                  {w.user_id}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[w.status] ?? 'bg-slate-800 text-slate-400'}`}>
                    {STATUS_ICONS[w.status] ?? ''} {w.status}
                  </span>
                  {w.error_message && (
                    <p className="text-[10px] text-red-400 mt-0.5 max-w-[200px] truncate" title={w.error_message}>
                      {w.error_message}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                  {w.attempts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {data ? `${((page - 1) * LIMIT) + 1}–${Math.min(page * LIMIT, data.total)} de ${data.total}` : ''}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs text-slate-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* URL info */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Configuração</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-xs text-green-400 bg-green-900/10 border border-green-800/20 px-3 py-2 rounded-lg font-mono">
            POST https://www.foguetim.com.br/api/webhooks/mercadolivre
          </code>
        </div>
        <p className="text-xs text-slate-600">
          Configure esta URL no{' '}
          <span className="text-slate-400">ML Developer Center</span>
          {' '}para os tópicos: orders_v2, questions, claims, messages, shipments, items, payments.
        </p>
      </div>
    </div>
  )
}
