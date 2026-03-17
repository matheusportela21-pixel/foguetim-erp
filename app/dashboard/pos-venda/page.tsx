'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare, HelpCircle, AlertTriangle,
  Send, RefreshCw, Loader2, Sparkles, X,
  Clock, ShoppingBag, ChevronRight,
} from 'lucide-react'
import Header from '@/components/Header'

/* ── Types ───────────────────────────────────────────────────────────────── */
type TabType = 'questions' | 'messages' | 'claims'

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low'

interface QuestionItem {
  id:           number
  text:         string
  date_created: string
  status:       string
  item_id:      string
  item:         { title: string; thumbnail: string } | null
  from:         { id: number } | null
  answer:       { text: string; date_created: string } | null
}

interface MessageItem {
  pack_id:      number
  order_id:     number | null
  unread:       number
  last_message: { text: string; date: string; from_buyer: boolean } | null
  blocked:      boolean
  buyer_id:     number | null
}

interface ClaimItem {
  claim_id:     number | string
  order_id:     number | string
  stage:        string
  reason_id:    string
  reason_label: string
  status:       string
  date_created: string
  last_updated: string
  days_open:    number
  urgency:      'urgent' | 'warning' | 'normal'
  order?: {
    product_title:    string
    buyer_nickname:   string
    total_amount:     number
    order_date:       string
  }
}

interface MLMessage {
  id:           string
  from:         { user_id: number }
  text:         { plain: string }
  message_date: { received: string }
}

interface ConversationData {
  messages:     MLMessage[]
  participants?: { seller_id: number; buyer_id: number }
  order_id?:    number
}

/* ── Urgency logic ───────────────────────────────────────────────────────── */
function getHoursSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 3600)
}

function getQuestionUrgency(q: QuestionItem): UrgencyLevel {
  if (q.status === 'UNANSWERED') {
    const hours = getHoursSince(q.date_created)
    if (hours > 24) return 'high'
    if (hours > 12) return 'medium'
    return 'low'
  }
  return 'low'
}

function getMessageUrgency(m: MessageItem): UrgencyLevel {
  if (m.blocked) return 'critical'
  if (!m.last_message?.from_buyer) return 'low'
  const hours = getHoursSince(m.last_message.date)
  if (hours > 24) return 'high'
  if (hours > 12) return 'medium'
  return 'low'
}

function getClaimUrgency(c: ClaimItem): UrgencyLevel {
  if (c.status === 'opened') return 'critical'
  return c.urgency === 'urgent' ? 'high' : c.urgency === 'warning' ? 'medium' : 'low'
}

const URGENCY_DOT: Record<UrgencyLevel, string> = {
  critical: 'bg-red-500 animate-pulse',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-green-500',
}

const URGENCY_BORDER: Record<UrgencyLevel, string> = {
  critical: 'border-l-red-500/60',
  high:     'border-l-orange-500/40',
  medium:   'border-l-yellow-500/40',
  low:      'border-l-transparent',
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 60)  return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function UrgencyDot({ level }: { level: UrgencyLevel }) {
  return <span className={`w-2 h-2 rounded-full shrink-0 ${URGENCY_DOT[level]}`} />
}

function ConversationPanel({
  tab,
  item,
  mlUserId,
  onClose,
}: {
  tab:       TabType
  item:      QuestionItem | MessageItem | ClaimItem
  mlUserId?: number | null
  onClose:   () => void
}) {
  const [reply, setReply]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [conv, setConv]       = useState<ConversationData | null>(null)
  const [convLoading, setConvLoading] = useState(false)

  // Load message thread for messages tab
  useEffect(() => {
    if (tab !== 'messages') return
    const m = item as MessageItem
    setConvLoading(true)
    fetch(`/api/mercadolivre/messages/${m.pack_id}`)
      .then(r => r.json())
      .then((d: ConversationData) => setConv(d))
      .catch(() => {/* ignore */})
      .finally(() => setConvLoading(false))
  }, [tab, item])

  const questionText = tab === 'questions' ? (item as QuestionItem).text : ''
  const productTitle = tab === 'questions'
    ? ((item as QuestionItem).item?.title ?? '')
    : tab === 'claims'
    ? ((item as ClaimItem).order?.product_title ?? '')
    : ''

  async function handleAISuggest() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/suggest-sac-response', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          question:      tab === 'messages'
            ? ((item as MessageItem).last_message?.text ?? '')
            : questionText,
          product_title: productTitle,
        }),
      })
      const data = await res.json() as { response?: string }
      if (data.response) setReply(data.response)
    } catch { /* ignore */ }
    setAiLoading(false)
  }

  async function handleSend() {
    if (!reply.trim()) return
    setSending(true)
    setError('')

    try {
      if (tab === 'questions') {
        const q = item as QuestionItem
        const res = await fetch('/api/mercadolivre/questions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ question_id: q.id, text: reply.trim() }),
        })
        if (!res.ok) throw new Error('Falha ao enviar resposta')
      } else if (tab === 'messages') {
        const m = item as MessageItem
        const res = await fetch(`/api/mercadolivre/messages/${m.pack_id}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text: reply.trim(), buyer_id: String(m.buyer_id ?? '') }),
        })
        if (!res.ok) throw new Error('Falha ao enviar mensagem')
      }
      setSent(true)
      setReply('')
      setTimeout(() => setSent(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar')
    }
    setSending(false)
  }

  const canReply = tab !== 'claims'

  return (
    <div className="flex flex-col h-full bg-[#0f1117] border-l border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          {tab === 'questions' && <HelpCircle className="w-4 h-4 text-purple-400 shrink-0" />}
          {tab === 'messages'  && <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />}
          {tab === 'claims'    && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
          <p className="text-sm font-semibold text-white truncate">
            {tab === 'questions' ? `Pergunta #${(item as QuestionItem).id}` : ''}
            {tab === 'messages'  ? `Pack #${(item as MessageItem).pack_id}` : ''}
            {tab === 'claims'    ? `Reclamação #${(item as ClaimItem).claim_id}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-600 hover:text-slate-300 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        {tab === 'questions' && (() => {
          const q = item as QuestionItem
          return (
            <div className="space-y-1">
              {q.item && (
                <p className="text-xs text-slate-400 truncate">{q.item.title}</p>
              )}
              <p className="text-[10px] text-slate-600">
                ID comprador: {q.from?.id ?? '—'} · {fmtRelative(q.date_created)}
              </p>
            </div>
          )
        })()}
        {tab === 'messages' && (() => {
          const m = item as MessageItem
          return (
            <div className="space-y-1">
              {m.order_id && <p className="text-xs text-slate-400">Pedido #{m.order_id}</p>}
              <p className="text-[10px] text-slate-600">
                Buyer ID: {m.buyer_id ?? '—'} · {m.unread} não lida(s)
              </p>
            </div>
          )
        })()}
        {tab === 'claims' && (() => {
          const c = item as ClaimItem
          return (
            <div className="space-y-1">
              {c.order?.product_title && <p className="text-xs text-slate-400 truncate">{c.order.product_title}</p>}
              <p className="text-[10px] text-slate-600">
                Pedido #{c.order_id} · {c.reason_label} · {fmtRelative(c.date_created)}
              </p>
              <a
                href={`https://www.mercadolivre.com.br/reclamacoes/${c.claim_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:underline"
              >
                Ver no Mercado Livre →
              </a>
            </div>
          )
        })()}
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === 'questions' && (() => {
          const q = item as QuestionItem
          return (
            <>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">C</div>
                <div className="flex-1 bg-white/[0.04] rounded-xl rounded-tl-none px-3 py-2">
                  <p className="text-xs text-slate-200">{q.text}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{fmtRelative(q.date_created)}</p>
                </div>
              </div>
              {q.answer && (
                <div className="flex gap-2 justify-end">
                  <div className="flex-1 bg-purple-900/20 border border-purple-800/20 rounded-xl rounded-tr-none px-3 py-2 max-w-[85%] ml-auto">
                    <p className="text-xs text-slate-200">{q.answer.text}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{fmtRelative(q.answer.date_created)}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-purple-900/40 flex items-center justify-center text-[10px] font-bold text-purple-300 shrink-0">V</div>
                </div>
              )}
            </>
          )
        })()}

        {tab === 'messages' && (() => {
          if (convLoading) return (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            </div>
          )
          const msgs = conv?.messages ?? []
          if (msgs.length === 0) return (
            <p className="text-xs text-slate-600 text-center py-8">Nenhuma mensagem no histórico</p>
          )
          return msgs.map(msg => {
            const isSeller = mlUserId != null && msg.from.user_id === mlUserId
            return (
              <div key={msg.id} className={`flex gap-2 ${isSeller ? 'justify-end' : ''}`}>
                {!isSeller && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">C</div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                  isSeller
                    ? 'bg-cyan-900/20 border border-cyan-800/20 rounded-tr-none'
                    : 'bg-white/[0.04] rounded-tl-none'
                }`}>
                  <p className="text-xs text-slate-200">{msg.text?.plain}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{fmtRelative(msg.message_date?.received)}</p>
                </div>
                {isSeller && (
                  <div className="w-6 h-6 rounded-full bg-cyan-900/40 flex items-center justify-center text-[10px] font-bold text-cyan-300 shrink-0">V</div>
                )}
              </div>
            )
          })
        })()}

        {tab === 'claims' && (
          <div className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-xs text-red-300 font-semibold">Reclamação aberta</p>
              <p className="text-xs text-slate-400 mt-1">
                Tipo: {(item as ClaimItem).stage === 'mediations' ? 'Mediação' : 'Devolução/Reclamação'}
              </p>
              <p className="text-xs text-slate-400">
                Motivo: {(item as ClaimItem).reason_label}
              </p>
            </div>
            <p className="text-xs text-slate-600 text-center">
              Responda diretamente no Mercado Livre para proteger sua reputação.
            </p>
          </div>
        )}
      </div>

      {/* Reply area */}
      {canReply && (
        <div className="p-4 border-t border-white/[0.06] space-y-2">
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          {sent && (
            <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">Enviado com sucesso!</p>
          )}

          {/* AI suggestion */}
          <button
            onClick={handleAISuggest}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
          >
            {aiLoading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Sparkles className="w-3 h-3" />
            }
            Sugerir resposta com IA
          </button>

          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={tab === 'questions' ? 'Responder pergunta...' : 'Escrever mensagem...'}
              rows={3}
              maxLength={2000}
              className="flex-1 px-3 py-2 text-xs bg-[#1a1f2e] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all disabled:opacity-50 flex items-center gap-1.5 self-end text-xs font-medium"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar
            </button>
          </div>
          {reply.length > 1800 && (
            <p className="text-[10px] text-slate-600">{reply.length}/2000</p>
          )}
          {reply.length > 0 && (
            <p className="text-[10px] text-amber-500/70">✨ Sugestão da IA — revise antes de enviar</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function PosVendaPage() {
  const [tab, setTab] = useState<TabType>('questions')

  const [questions, setQuestions]   = useState<QuestionItem[]>([])
  const [messages, setMessages]     = useState<MessageItem[]>([])
  const [claims, setClaims]         = useState<ClaimItem[]>([])
  const [qLoading, setQLoading]     = useState(true)
  const [mLoading, setMLoading]     = useState(true)
  const [cLoading, setCLoading]     = useState(true)
  const [selected, setSelected]     = useState<QuestionItem | MessageItem | ClaimItem | null>(null)
  const [filterUrgent, setFilterUrgent] = useState(false)
  const [filterUnread, setFilterUnread] = useState(false)
  const [search, setSearch]         = useState('')
  const [mlUserId, setMlUserId]     = useState<number | null>(null)

  const loadQuestions = useCallback(async () => {
    setQLoading(true)
    try {
      const res = await fetch('/api/mercadolivre/questions?status=UNANSWERED&limit=50')
      const d   = await res.json() as { questions: QuestionItem[] }
      setQuestions(d.questions ?? [])
    } catch { setQuestions([]) }
    setQLoading(false)
  }, [])

  const loadMessages = useCallback(async () => {
    setMLoading(true)
    try {
      const res = await fetch('/api/mercadolivre/messages')
      const d   = await res.json() as { messages: MessageItem[] }
      setMessages(d.messages ?? [])
    } catch { setMessages([]) }
    setMLoading(false)
  }, [])

  const loadClaims = useCallback(async () => {
    setCLoading(true)
    try {
      const res = await fetch('/api/mercadolivre/reclamacoes')
      const d   = await res.json() as { items: ClaimItem[] }
      setClaims(d.items ?? [])
    } catch { setClaims([]) }
    setCLoading(false)
  }, [])

  useEffect(() => {
    void loadQuestions()
    void loadMessages()
    void loadClaims()
  }, [loadQuestions, loadMessages, loadClaims])

  function handleRefresh() {
    if (tab === 'questions') void loadQuestions()
    if (tab === 'messages')  void loadMessages()
    if (tab === 'claims')    void loadClaims()
  }

  const isLoading = tab === 'questions' ? qLoading : tab === 'messages' ? mLoading : cLoading

  /* Filtered list */
  const currentList: (QuestionItem | MessageItem | ClaimItem)[] = (() => {
    let list: (QuestionItem | MessageItem | ClaimItem)[]

    if (tab === 'questions') {
      list = questions
      if (filterUnread)  list = (list as QuestionItem[]).filter(q => q.status === 'UNANSWERED')
      if (search)        list = (list as QuestionItem[]).filter(q => q.text.toLowerCase().includes(search.toLowerCase()) || (q.item?.title ?? '').toLowerCase().includes(search.toLowerCase()))
      if (filterUrgent)  list = (list as QuestionItem[]).filter(q => ['critical','high','medium'].includes(getQuestionUrgency(q)))
    } else if (tab === 'messages') {
      list = messages
      if (filterUnread)  list = (list as MessageItem[]).filter(m => m.unread > 0)
      if (search)        list = (list as MessageItem[]).filter(m => String(m.pack_id).includes(search) || String(m.order_id ?? '').includes(search))
      if (filterUrgent)  list = (list as MessageItem[]).filter(m => ['critical','high','medium'].includes(getMessageUrgency(m)))
    } else {
      list = claims
      if (filterUnread)  list = (list as ClaimItem[]).filter(c => c.status === 'opened')
      if (search)        list = (list as ClaimItem[]).filter(c => (c.order?.product_title ?? '').toLowerCase().includes(search.toLowerCase()) || String(c.order_id).includes(search))
      if (filterUrgent)  list = (list as ClaimItem[]).filter(c => ['critical','high'].includes(getClaimUrgency(c)))
    }
    return list
  })()

  /* Counts */
  const unansweredQ = questions.filter(q => q.status === 'UNANSWERED').length
  const unreadM     = messages.filter(m => m.unread > 0).length
  const openC       = claims.filter(c => c.status === 'opened').length

  const TABS: { key: TabType; icon: React.ElementType; label: string; count: number; color: string }[] = [
    { key: 'questions', icon: HelpCircle,     label: 'Perguntas',    count: unansweredQ, color: 'text-purple-400' },
    { key: 'messages',  icon: MessageSquare,  label: 'Mensagens',    count: unreadM,     color: 'text-cyan-400'   },
    { key: 'claims',    icon: AlertTriangle,  label: 'Reclamações',  count: openC,       color: 'text-red-400'    },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Central Pós-Venda" />

      <div className="flex flex-col flex-1 overflow-hidden p-6 gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#111318] border border-white/[0.06] rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <t.icon className={`w-4 h-4 ${tab === t.key ? t.color : ''}`} />
              {t.label}
              {t.count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  t.key === 'claims'    ? 'bg-red-900/40 text-red-400 ring-1 ring-red-700/40 animate-pulse' :
                  t.key === 'messages'  ? 'bg-cyan-900/40 text-cyan-400' :
                  'bg-purple-900/40 text-purple-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="px-3 py-1.5 text-xs bg-[#111318] border border-white/[0.08] rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/30 w-48"
          />
          <button
            onClick={() => setFilterUnread(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterUnread ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300 bg-[#111318] border border-white/[0.06]'
            }`}
          >
            Não respondidas
          </button>
          <button
            onClick={() => setFilterUrgent(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterUrgent ? 'bg-red-900/30 text-red-400 border border-red-800/30' : 'text-slate-500 hover:text-slate-300 bg-[#111318] border border-white/[0.06]'
            }`}
          >
            Urgentes
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-200 bg-[#111318] border border-white/[0.06] rounded-lg transition-all disabled:opacity-50 ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Main content: list + detail */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

          {/* Left: conversation list */}
          <div className={`flex flex-col bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden ${selected ? 'w-80 shrink-0' : 'flex-1'}`}>
            <div className="px-4 py-2.5 border-b border-white/[0.06]">
              <p className="text-xs text-slate-500">
                {currentList.length} {tab === 'questions' ? 'pergunta(s)' : tab === 'messages' ? 'conversa(s)' : 'reclamação(ões)'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <div className="h-3 w-3/4 bg-white/[0.04] rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-white/[0.04] rounded animate-pulse" />
                  </div>
                ))
              ) : currentList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  {tab === 'questions'  && <HelpCircle    className="w-8 h-8 text-slate-700" />}
                  {tab === 'messages'   && <MessageSquare className="w-8 h-8 text-slate-700" />}
                  {tab === 'claims'     && <AlertTriangle className="w-8 h-8 text-slate-700" />}
                  <p className="text-sm text-slate-600">
                    {tab === 'questions'  ? 'Nenhuma pergunta pendente' : ''}
                    {tab === 'messages'   ? 'Nenhuma mensagem não lida' : ''}
                    {tab === 'claims'     ? 'Nenhuma reclamação aberta' : ''}
                  </p>
                </div>
              ) : currentList.map((item, i) => {
                const urgency = tab === 'questions'
                  ? getQuestionUrgency(item as QuestionItem)
                  : tab === 'messages'
                  ? getMessageUrgency(item as MessageItem)
                  : getClaimUrgency(item as ClaimItem)

                const isSelected = selected === item

                return (
                  <button
                    key={i}
                    onClick={() => setSelected(isSelected ? null : item)}
                    className={`w-full text-left px-4 py-3 border-l-2 transition-all hover:bg-white/[0.03] ${
                      URGENCY_BORDER[urgency]
                    } ${isSelected ? 'bg-white/[0.05]' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <UrgencyDot level={urgency} />
                      <div className="flex-1 min-w-0">
                        {tab === 'questions' && (() => {
                          const q = item as QuestionItem
                          return (
                            <>
                              <p className="text-xs font-medium text-slate-200 truncate">{q.text}</p>
                              {q.item && <p className="text-[10px] text-slate-600 truncate mt-0.5">{q.item.title}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-2.5 h-2.5 text-slate-700" />
                                <span className="text-[10px] text-slate-600">{fmtRelative(q.date_created)}</span>
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                                  q.status === 'UNANSWERED' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-green-900/40 text-green-400'
                                }`}>
                                  {q.status === 'UNANSWERED' ? 'Sem resposta' : 'Respondida'}
                                </span>
                              </div>
                            </>
                          )
                        })()}
                        {tab === 'messages' && (() => {
                          const m = item as MessageItem
                          return (
                            <>
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="w-3 h-3 text-slate-600" />
                                <p className="text-xs font-medium text-slate-200">
                                  {m.order_id ? `Pedido #${m.order_id}` : `Pack #${m.pack_id}`}
                                </p>
                                {m.unread > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-900/40 text-cyan-400">
                                    {m.unread} nova(s)
                                  </span>
                                )}
                              </div>
                              {m.last_message && (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{m.last_message.text}</p>
                              )}
                              {m.last_message && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="w-2.5 h-2.5 text-slate-700" />
                                  <span className="text-[10px] text-slate-600">{fmtRelative(m.last_message.date)}</span>
                                </div>
                              )}
                            </>
                          )
                        })()}
                        {tab === 'claims' && (() => {
                          const c = item as ClaimItem
                          return (
                            <>
                              <p className="text-xs font-medium text-slate-200 truncate">
                                {c.order?.product_title ?? `Pedido #${c.order_id}`}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-900/40 text-red-400">
                                  {c.reason_label}
                                </span>
                                <span className="text-[10px] text-slate-600">{fmtRelative(c.date_created)}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 text-slate-700 shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: conversation detail */}
          {selected && (
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-white/[0.06]">
              <ConversationPanel
                tab={tab}
                item={selected}
                mlUserId={mlUserId}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
