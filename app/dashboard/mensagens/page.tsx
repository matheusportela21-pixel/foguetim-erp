'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare, Mail, Filter, RefreshCw, ExternalLink,
  Inbox, ChevronRight, Circle, Search, ShoppingBag, AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import type { InboxMessage } from '@/app/api/messages/inbox/route'

/* ── Helpers ────────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const CHANNEL_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  ml:     { label: 'ML',     bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  magalu: { label: 'Magalu', bg: 'bg-blue-500/15',   text: 'text-blue-400'   },
}

const TYPE_LABEL: Record<string, string> = {
  question: 'Pergunta',
  sac:      'SAC',
  message:  'Mensagem',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  UNANSWERED:        { label: 'Sem resposta',  color: 'text-yellow-400' },
  ANSWERED:          { label: 'Respondida',    color: 'text-green-400' },
  CLOSED_UNANSWERED: { label: 'Expirada',      color: 'text-red-400' },
  UNREAD:            { label: 'Nao lida',      color: 'text-blue-400' },
}

/* ── Filter buttons ─────────────────────────────────────────────────────── */

type Channel = 'all' | 'ml' | 'magalu'
type Status  = 'all' | 'unread'
type MsgType = 'all' | 'question' | 'sac'

interface FilterBtnProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
}

function FilterBtn({ active, onClick, children, count }: FilterBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400">
          {count}
        </span>
      )}
    </button>
  )
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */

function MessageSkeleton() {
  return (
    <div className="px-4 py-3.5 border-b border-white/[0.04] animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-white/[0.08]" />
        <div className="h-3 w-20 bg-white/[0.06] rounded" />
        <div className="h-3 w-12 bg-white/[0.06] rounded" />
      </div>
      <div className="h-3.5 w-3/4 bg-white/[0.06] rounded mb-1.5" />
      <div className="h-3 w-full bg-white/[0.04] rounded" />
    </div>
  )
}

/* ── Main Component ────────────────────────────────────────────────────── */

export default function MensagensPage() {
  const [messages, setMessages]   = useState<InboxMessage[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [unreadTotal, setUnreadTotal] = useState(0)

  // Filters
  const [channel, setChannel] = useState<Channel>('all')
  const [status, setStatus]   = useState<Status>('all')
  const [msgType, setMsgType] = useState<MsgType>('all')
  const [search, setSearch]   = useState('')

  // Selected message
  const [selected, setSelected] = useState<InboxMessage | null>(null)

  // Fetch
  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (channel !== 'all') params.set('channel', channel)
      if (status !== 'all')  params.set('status', status)
      if (msgType !== 'all') params.set('type', msgType)

      const res = await fetch(`/api/messages/inbox?${params}`)
      if (!res.ok) {
        if (res.status === 401) { setError('not_authenticated'); return }
        if (res.status === 403) { setError('no_permission'); return }
        throw new Error('Erro ao carregar')
      }

      const data = await res.json() as {
        messages: InboxMessage[]
        total: number
        unread: number
      }
      setMessages(data.messages)
      setUnreadTotal(data.unread)
    } catch {
      setError('fetch_error')
    } finally {
      setLoading(false)
    }
  }, [channel, status, msgType])

  useEffect(() => { void fetchMessages() }, [fetchMessages])

  // Local search filter
  const filtered = search.trim()
    ? messages.filter(m =>
        m.preview.toLowerCase().includes(search.toLowerCase()) ||
        m.subject.toLowerCase().includes(search.toLowerCase()) ||
        m.from.toLowerCase().includes(search.toLowerCase())
      )
    : messages

  // ── Not connected state ──────────────────────────────────────────────
  if (error === 'not_authenticated') {
    return (
      <div>
        <PageHeader title="Mensagens" description="Caixa de entrada unificada" />
        <div className="p-6">
          <div className="dash-card rounded-2xl p-12 text-center max-w-lg mx-auto">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Nao autenticado</p>
            <p className="text-sm text-slate-500">Faca login para acessar suas mensagens.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Mensagens" description="Caixa de entrada unificada" />

      <div className="p-4 md:p-6">
        {/* ── Filters ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Channel */}
          <div className="flex items-center gap-1 mr-2">
            <FilterBtn active={channel === 'all'} onClick={() => setChannel('all')}>Todas</FilterBtn>
            <FilterBtn active={channel === 'ml'}  onClick={() => setChannel('ml')}>
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> ML
            </FilterBtn>
            <FilterBtn active={channel === 'magalu'} onClick={() => setChannel('magalu')}>
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Magalu
            </FilterBtn>
          </div>

          <div className="w-px h-5 bg-white/[0.08] mx-1 hidden sm:block" />

          {/* Status & Type */}
          <div className="flex items-center gap-1">
            <FilterBtn
              active={status === 'unread'}
              onClick={() => setStatus(s => s === 'unread' ? 'all' : 'unread')}
              count={unreadTotal}
            >
              Nao lidas
            </FilterBtn>
            <FilterBtn
              active={msgType === 'question'}
              onClick={() => setMsgType(t => t === 'question' ? 'all' : 'question')}
            >
              Perguntas
            </FilterBtn>
            <FilterBtn
              active={msgType === 'sac'}
              onClick={() => setMsgType(t => t === 'sac' ? 'all' : 'sac')}
            >
              SAC
            </FilterBtn>
          </div>

          <div className="flex-1" />

          {/* Refresh */}
          <button
            onClick={() => void fetchMessages()}
            disabled={loading}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ── Split view ────────────────────────────────────────────── */}
        <div className="flex gap-4 min-h-[calc(100vh-260px)]">

          {/* ── Left panel: message list ─────────────────────────── */}
          <div className="w-full lg:w-[40%] dash-card rounded-2xl overflow-hidden flex flex-col">
            {/* Search */}
            <div className="px-3 py-2.5 border-b border-white/[0.06]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input
                  type="text"
                  placeholder="Buscar mensagens..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/30 transition-colors"
                />
              </div>
            </div>

            {/* Header */}
            <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                {loading ? 'Carregando...' : `${filtered.length} mensagen${filtered.length !== 1 ? 's' : ''}`}
              </p>
              {unreadTotal > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                  {unreadTotal} nao lida{unreadTotal !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <MessageSkeleton key={i} />)
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {error === 'no_permission'
                      ? 'Sem permissao para acessar mensagens'
                      : 'Erro ao carregar mensagens'}
                  </p>
                  <button
                    onClick={() => void fetchMessages()}
                    className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-400 mb-1">Nenhuma mensagem encontrada</p>
                  <p className="text-xs text-slate-600">
                    {messages.length === 0
                      ? 'Conecte seu marketplace em Integracoes para receber mensagens.'
                      : 'Tente ajustar os filtros.'}
                  </p>
                </div>
              ) : (
                filtered.map(msg => {
                  const isSelected = selected?.id === msg.id
                  const badge = CHANNEL_BADGE[msg.channel]

                  return (
                    <button
                      key={msg.id}
                      onClick={() => setSelected(msg)}
                      className={`w-full text-left px-4 py-3.5 border-b border-white/[0.04] transition-all ${
                        isSelected
                          ? 'bg-purple-600/10 border-l-2 border-l-purple-500'
                          : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {/* Unread dot */}
                        {!msg.read && (
                          <Circle className="w-2 h-2 fill-red-400 text-red-400 shrink-0" />
                        )}

                        {/* From */}
                        <span className={`text-xs font-semibold truncate ${msg.read ? 'text-slate-400' : 'text-white'}`}>
                          {msg.fromName ?? msg.from}
                        </span>

                        {/* Channel badge */}
                        {badge && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        )}

                        {/* Type */}
                        <span className="text-[10px] text-slate-600">
                          {TYPE_LABEL[msg.type] ?? msg.type}
                        </span>

                        <span className="flex-1" />

                        {/* Time */}
                        <span className="text-[10px] text-slate-600 shrink-0">
                          {timeAgo(msg.date)}
                        </span>
                      </div>

                      <p className={`text-sm truncate ${msg.read ? 'text-slate-500' : 'text-slate-300'}`}>
                        {msg.subject}
                      </p>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {msg.preview.substring(0, 120)}
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Right panel: detail ──────────────────────────────── */}
          <div className="hidden lg:flex lg:flex-1 dash-card rounded-2xl overflow-hidden flex-col">
            {selected ? (
              <>
                {/* Detail header */}
                <div className="px-6 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Channel badge */}
                    {(() => {
                      const badge = CHANNEL_BADGE[selected.channel]
                      return badge ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      ) : null
                    })()}

                    {/* Type */}
                    <span className="text-xs text-slate-500 font-medium">
                      {TYPE_LABEL[selected.type] ?? selected.type}
                    </span>

                    {/* Status */}
                    {(() => {
                      const s = STATUS_LABEL[selected.status]
                      return s ? (
                        <span className={`text-[10px] font-semibold ${s.color}`}>
                          {s.label}
                        </span>
                      ) : null
                    })()}

                    <span className="flex-1" />
                    <span className="text-xs text-slate-600">{formatDate(selected.date)}</span>
                  </div>

                  <p className="text-white font-semibold text-sm">
                    De: {selected.fromName ?? selected.from}
                  </p>
                </div>

                {/* Detail body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selected.preview}
                  </p>

                  {/* Item reference */}
                  {selected.itemId && (
                    <div className="mt-5 flex items-center gap-2 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <ShoppingBag className="w-4 h-4 text-slate-500 shrink-0" />
                      <p className="text-xs text-slate-400">
                        Anuncio: <span className="text-slate-300 font-medium">{selected.itemId}</span>
                      </p>
                    </div>
                  )}

                  {/* Order reference */}
                  {selected.orderId && (
                    <div className="mt-3 flex items-center gap-2 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                      <p className="text-xs text-slate-400">
                        Pedido: <span className="text-slate-300 font-medium">{selected.orderId}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Detail footer */}
                <div className="px-6 py-4 border-t border-white/[0.06]">
                  {selected.replyUrl ? (
                    <a
                      href={selected.replyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      Responder no ML
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Responda diretamente na plataforma do marketplace.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-sm font-medium text-slate-400 mb-1">Selecione uma mensagem</p>
                <p className="text-xs text-slate-600">
                  Escolha uma mensagem na lista ao lado para ver os detalhes.
                </p>
              </div>
            )}
          </div>

          {/* ── Mobile detail (shown below list when selected on mobile) ── */}
          {selected && (
            <div className="lg:hidden fixed inset-0 z-50 bg-space-900/95 backdrop-blur-sm overflow-y-auto">
              <div className="max-w-lg mx-auto p-4">
                <button
                  onClick={() => setSelected(null)}
                  className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
                </button>

                <div className="dash-card rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const badge = CHANNEL_BADGE[selected.channel]
                        return badge ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        ) : null
                      })()}
                      <span className="text-xs text-slate-500 font-medium">
                        {TYPE_LABEL[selected.type] ?? selected.type}
                      </span>
                      {(() => {
                        const s = STATUS_LABEL[selected.status]
                        return s ? (
                          <span className={`text-[10px] font-semibold ${s.color}`}>{s.label}</span>
                        ) : null
                      })()}
                    </div>
                    <p className="text-white font-semibold text-sm mb-0.5">
                      De: {selected.fromName ?? selected.from}
                    </p>
                    <p className="text-xs text-slate-600">{formatDate(selected.date)}</p>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {selected.preview}
                    </p>

                    {selected.itemId && (
                      <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <ShoppingBag className="w-4 h-4 text-slate-500" />
                        <p className="text-xs text-slate-400">Anuncio: <span className="text-slate-300">{selected.itemId}</span></p>
                      </div>
                    )}

                    {selected.orderId && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <p className="text-xs text-slate-400">Pedido: <span className="text-slate-300">{selected.orderId}</span></p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-4 border-t border-white/[0.06]">
                    {selected.replyUrl ? (
                      <a
                        href={selected.replyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-all"
                      >
                        Responder no ML <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <p className="text-xs text-slate-600">Responda diretamente na plataforma.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
