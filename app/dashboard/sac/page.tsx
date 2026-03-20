'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Star, RotateCcw, Send, CheckCircle2,
  AlertTriangle, Search, X, Zap, ExternalLink, Bell,
  HelpCircle, MessageCircle, Package, Shield,
  ChevronRight, ArrowLeft, Loader2, RefreshCw, Link2,
  Sparkles,
} from 'lucide-react'
import { SAC_ITEMS, SAC_TEMPLATES, type SACItem, type SACTipo, type SACStatus, type MKTPedido } from './_data'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface MLQuestion {
  id: number
  text: string
  date_created: string
  status: string
  item_id: string
  item: { title: string; thumbnail: string } | null
  from: { id: number; answered_questions: number } | null
  answer: { text: string; date_created: string; status: string } | null
}

interface MLMessageThread {
  pack_id:      number
  order_id:     number | null
  unread:       number
  last_message: { text: string; date: string; from_buyer: boolean } | null
  blocked:      boolean
  buyer_id:     number | null
}

interface MLMsg {
  id:           string
  from:         { user_id: number }
  text:         { plain: string }
  message_date: { received: string }
}

interface MLThreadDetail {
  messages:     MLMsg[]
  participants?: { seller_id: number; buyer_id: number }
}

interface ClaimItem {
  claim_id:           string
  order_id:           string
  status:             string
  stage:              string
  stage_label:        string
  reason_label:       string
  date_created:       string
  due_date:           string
  action_responsible: 'seller' | 'buyer' | 'mediator' | null
  days_open:          number
  urgency:            'urgent' | 'warning' | 'normal'
  order: {
    product_title:     string
    product_thumbnail: string
    buyer_nickname:    string
    total_amount:      number
  }
}

interface ClaimsSummary {
  total_opened:           number
  total_returns:          number
  urgent:                 number
  seller_action_required: number
}

interface ResponseTemplate {
  id:       string
  name:     string
  content:  string
  category: string
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (diff < 60)    return 'agora'
  if (diff < 3600)  return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  const d = Math.floor(diff / 86400)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

function Stars({ count, size = 'sm' }: { count: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${cls} ${i <= count ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: SACStatus }) {
  const map = {
    pendente:     { cls: 'bg-red-400/10 text-red-400',       label: 'Pendente'      },
    respondido:   { cls: 'bg-green-400/10 text-green-400',   label: 'Respondido'    },
    em_andamento: { cls: 'bg-yellow-400/10 text-yellow-400', label: 'Em andamento'  },
  }
  const m = map[status]
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>
}

function MktBadge({ mkt }: { mkt: MKTPedido }) {
  const colors: Record<MKTPedido, string> = {
    ML: 'bg-yellow-400/10 text-yellow-300', SP: 'bg-orange-500/10 text-orange-400',
    AMZ: 'bg-sky-400/10 text-sky-400', MAG: 'bg-blue-400/10 text-blue-400',
  }
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors[mkt]}`}>{mkt}</span>
}

function MktAvatar({ mkt }: { mkt: MKTPedido }) {
  const colors: Record<MKTPedido, string> = {
    ML: 'bg-yellow-400/20 text-yellow-300', SP: 'bg-orange-500/20 text-orange-400',
    AMZ: 'bg-sky-400/20 text-sky-400', MAG: 'bg-blue-400/20 text-blue-400',
  }
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colors[mkt]}`}>
      {mkt}
    </div>
  )
}

function MotivoBadge({ motivo }: { motivo: string }) {
  const map: Record<string, string> = {
    'Produto com defeito': 'bg-red-400/10 text-red-400',
    'Arrependimento': 'bg-amber-400/10 text-amber-400',
    'Produto diferente do anunciado': 'bg-orange-400/10 text-orange-400',
    'Dano no transporte': 'bg-purple-400/10 text-purple-400',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[motivo] ?? 'bg-slate-700 text-slate-400'}`}>
      {motivo}
    </span>
  )
}

function DevolStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Solicitada: 'bg-red-400/10 text-red-400', Aprovada: 'bg-yellow-400/10 text-yellow-400',
    'Produto recebido': 'bg-blue-400/10 text-blue-400', Reembolsado: 'bg-green-400/10 text-green-400',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-slate-700 text-slate-400'}`}>
      {status}
    </span>
  )
}

// ─── TEMPLATES DROPDOWN ──────────────────────────────────────────────────────

function TemplatesDropdown({
  templates, onSelect, onClose,
}: { templates: ResponseTemplate[]; onSelect: (c: string) => void; onClose: () => void }) {
  return (
    <div className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden mb-2 shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Respostas Prontas</p>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400"><X className="w-3.5 h-3.5" /></button>
      </div>
      {templates.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-600">Nenhum template</p>}
      {templates.map(t => (
        <button key={t.id} onClick={() => { onSelect(t.content); onClose() }}
          className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 transition-all">
          <p className="text-xs font-semibold text-slate-300">{t.name}</p>
          <p className="text-[10px] text-slate-600 truncate mt-0.5">{t.content.substring(0, 80)}...</p>
        </button>
      ))}
    </div>
  )
}

// ─── ML PERGUNTAS TAB ────────────────────────────────────────────────────────

function MLPerguntasTab({ templates }: { templates: ResponseTemplate[] }) {
  const [questions, setQuestions]       = useState<MLQuestion[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [filter, setFilter]             = useState<'UNANSWERED' | 'ANSWERED'>('UNANSWERED')
  const [paging, setPaging]             = useState({ total: 0, offset: 0, limit: 50 })
  const [offset, setOffset]             = useState(0)
  const [selected, setSelected]         = useState<MLQuestion | null>(null)
  const [replyText, setReplyText]       = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending]           = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [refreshKey, setRefreshKey]     = useState(0)

  const fetchQuestions = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`/api/mercadolivre/questions?status=${filter}&limit=50&offset=${offset}`)
      const data = await res.json() as {
        questions?: MLQuestion[]; paging?: typeof paging
        notConnected?: boolean; error?: string
      }
      if (data.notConnected) { setNotConnected(true); return }
      if (data.error)        { setError(data.error); return }
      setQuestions(data.questions ?? [])
      setPaging(data.paging ?? { total: 0, offset: 0, limit: 50 })
    } catch { setError('Erro de rede') }
    finally  { setLoading(false) }
  }, [filter, offset, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  async function handleAiSuggest() {
    if (!selected) return
    setAiSuggesting(true)
    try {
      const r = await fetch('/api/ai/suggest-sac-response', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: selected.text, product_title: selected.item?.title ?? '' }),
      })
      if (r.ok) {
        const j = await r.json() as { response?: string }
        if (j.response) setReplyText(j.response)
      }
    } catch { /* silent */ }
    setAiSuggesting(false)
  }

  async function handleSendReply() {
    if (!selected || !replyText.trim()) return
    if (!window.confirm(`Confirmar resposta para pergunta #${selected.id}?\n\n"${replyText.trim()}"`)) return
    setSending(true)
    try {
      const res = await fetch('/api/mercadolivre/questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: selected.id, text: replyText.trim() }),
      })
      if (res.ok) {
        setReplyText(''); setSelected(null); setRefreshKey(k => k + 1)
      } else {
        const d = await res.json() as { error?: string }
        alert(`Erro: ${d.error ?? 'Falha ao enviar'}`)
      }
    } catch { alert('Erro de rede') }
    finally { setSending(false) }
  }

  if (notConnected) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <Link2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium mb-1">Mercado Livre não conectado</p>
        <Link href="/dashboard/integracoes" className="text-xs text-purple-400 hover:text-purple-300">Conectar conta →</Link>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* List */}
      <div className="w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 p-3 border-b border-white/[0.06]">
          {(['UNANSWERED', 'ANSWERED'] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setOffset(0); setSelected(null) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === f ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
              }`}>
              {f === 'UNANSWERED' ? '⏳ Pendentes' : '✅ Respondidas'}
            </button>
          ))}
          <button onClick={() => setRefreshKey(k => k + 1)} title="Atualizar"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>}
          {!loading && error && <div className="p-4 text-center text-xs text-red-400">{error}</div>}
          {!loading && !error && questions.length === 0 && (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400/30 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">{filter === 'UNANSWERED' ? 'Nenhuma pergunta pendente!' : 'Nenhuma respondida'}</p>
            </div>
          )}
          {!loading && questions.map(q => (
            <button key={q.id} onClick={() => { setSelected(q); setReplyText('') }}
              className={`w-full text-left p-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all ${
                selected?.id === q.id ? 'bg-purple-500/[0.07] border-l-2 border-l-purple-500' : 'border-l-2 border-l-transparent'
              }`}>
              <div className="flex items-start gap-2.5">
                {q.item?.thumbnail
                  ? <img src={q.item.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 opacity-80" />
                  : <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-slate-600" /></div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] text-slate-500 truncate">{q.item?.title ?? q.item_id}</span>
                    <span className="text-[9px] text-slate-700 shrink-0">{timeAgo(q.date_created)}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{q.text}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${q.status === 'UNANSWERED' ? 'bg-amber-400/10 text-amber-400' : 'bg-green-400/10 text-green-400'}`}>
                      {q.status === 'UNANSWERED' ? 'Pendente' : 'Respondida'}
                    </span>
                    {q.from && <span className="text-[9px] text-slate-700">#{q.from.id}</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {paging.total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <span className="text-[10px] text-slate-600">{offset + 1}–{Math.min(offset + 50, paging.total)} de {paging.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}
                className="px-2 py-1 rounded text-[10px] bg-dark-700 text-slate-400 disabled:opacity-30">← Ant.</button>
              <button onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= paging.total}
                className="px-2 py-1 rounded text-[10px] bg-dark-700 text-slate-400 disabled:opacity-30">Próx. →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <HelpCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Selecione uma pergunta</p>
              <p className="text-slate-700 text-sm mt-1">para visualizar e responder</p>
            </div>
          </div>
        )}
        {selected && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {selected.item && (
                  <div className="flex items-center gap-2 mb-2">
                    {selected.item.thumbnail && <img src={selected.item.thumbnail} alt="" className="w-6 h-6 rounded object-cover opacity-80" />}
                    <a href={`https://produto.mercadolivre.com.br/${selected.item_id}`} target="_blank" rel="noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors truncate">
                      {selected.item.title} <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
                <p className="text-[10px] text-slate-600">Comprador #{selected.from?.id} · {timeAgo(selected.date_created)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-dark-700/50 rounded-2xl rounded-tl-sm p-4 border border-white/[0.06] max-w-[85%]">
                <p className="text-sm text-white leading-relaxed">{selected.text}</p>
              </div>
              {selected.answer && (
                <div className="bg-purple-500/10 rounded-2xl rounded-tr-sm p-4 border border-purple-500/20 ml-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-purple-400 font-bold">Sua resposta</span>
                    <span className="text-[10px] text-slate-600">{timeAgo(selected.answer.date_created)}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{selected.answer.text}</p>
                </div>
              )}
            </div>

            {selected.status === 'UNANSWERED' && !selected.answer && (
              <div className="p-4 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-semibold text-slate-300">Responder via Mercado Livre</span>
                  <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400">API oficial</span>
                </div>
                {showTemplates && <TemplatesDropdown templates={templates} onSelect={setReplyText} onClose={() => setShowTemplates(false)} />}
                <div className="flex gap-2 items-end">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Digite sua resposta..." rows={3} maxLength={2000}
                    className="input-cyber flex-1 resize-none text-sm py-2.5 min-h-[80px]" />
                  <div className="flex flex-col gap-2">
                    <button onClick={handleAiSuggest} disabled={aiSuggesting}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      {aiSuggesting ? <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Sparkles className="w-3.5 h-3.5" />}
                      IA
                    </button>
                    <button onClick={() => setShowTemplates(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${showTemplates ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-dark-700 border-white/[0.06] text-slate-400 hover:text-slate-200'}`}>
                      <Zap className="w-3.5 h-3.5" /> Templates
                    </button>
                    <button onClick={handleSendReply} disabled={!replyText.trim() || sending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {sending ? <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Send className="w-3.5 h-3.5" />}
                      Enviar
                    </button>
                  </div>
                </div>
                {replyText.length > 0 && <p className="text-[10px] text-slate-700 text-right">{replyText.length}/2000</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ML MENSAGENS TAB ────────────────────────────────────────────────────────

function MLMensagensTab({ templates }: { templates: ResponseTemplate[] }) {
  const [threads, setThreads]           = useState<MLMessageThread[]>([])
  const [totalUnread, setTotalUnread]   = useState(0)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [selected, setSelected]         = useState<MLMessageThread | null>(null)
  const [threadDetail, setThreadDetail] = useState<MLThreadDetail | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyText, setReplyText]       = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending]           = useState(false)
  const [refreshKey, setRefreshKey]     = useState(0)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    fetch('/api/mercadolivre/messages')
      .then(r => r.json())
      .then((d: { messages?: MLMessageThread[]; total_unread?: number; error?: string }) => {
        if (d.error) { setError(d.error); return }
        setThreads(d.messages ?? []); setTotalUnread(d.total_unread ?? 0)
      })
      .catch(() => setError('Erro de rede'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  useEffect(() => {
    if (!selected) return
    setThreadLoading(true); setThreadDetail(null)
    fetch(`/api/mercadolivre/messages/${selected.pack_id}`)
      .then(r => r.json())
      .then((d: MLThreadDetail) => setThreadDetail(d))
      .catch(() => {/* silent */})
      .finally(() => setThreadLoading(false))
  }, [selected])

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [threadDetail])

  async function handleSendMessage() {
    if (!selected || !replyText.trim() || !selected.buyer_id) return
    if (!window.confirm(`Confirmar envio de mensagem?\n\n"${replyText.trim()}"`)) return
    setSending(true)
    try {
      const res = await fetch(`/api/mercadolivre/messages/${selected.pack_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText.trim(), buyer_id: String(selected.buyer_id) }),
      })
      if (res.ok) {
        setReplyText('')
        const dr = await fetch(`/api/mercadolivre/messages/${selected.pack_id}`)
        if (dr.ok) setThreadDetail(await dr.json())
      } else {
        const d = await res.json() as { error?: string }
        alert(`Erro: ${d.error ?? 'Falha ao enviar'}`)
      }
    } catch { alert('Erro de rede') }
    finally { setSending(false) }
  }

  const mlSellerId = threadDetail?.participants?.seller_id

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* List */}
      <div className="w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-slate-400">
            {totalUnread > 0 ? `${totalUnread} não lidas` : 'Conversas recentes'}
          </span>
          <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>}
          {!loading && error && <div className="p-4 text-center text-xs text-red-400">{error}</div>}
          {!loading && !error && threads.length === 0 && (
            <div className="py-12 text-center">
              <MessageCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">Nenhuma mensagem não lida</p>
            </div>
          )}
          {!loading && threads.map(t => (
            <button key={t.pack_id} onClick={() => { setSelected(t); setReplyText('') }}
              className={`w-full text-left p-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all ${
                selected?.pack_id === t.pack_id ? 'bg-purple-500/[0.07] border-l-2 border-l-purple-500' : 'border-l-2 border-l-transparent'
              }`}>
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-blue-400">
                  {t.unread > 0 ? t.unread : <MessageCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-slate-300">Pack #{t.pack_id}</span>
                    {t.last_message && <span className="text-[9px] text-slate-700">{timeAgo(t.last_message.date)}</span>}
                  </div>
                  {t.order_id && <p className="text-[10px] text-slate-600 mb-0.5">Pedido #{t.order_id}</p>}
                  {t.last_message && (
                    <p className="text-[10px] text-slate-500 truncate">
                      {t.last_message.from_buyer ? '👤 ' : '🏪 '}{t.last_message.text}
                    </p>
                  )}
                  {t.blocked && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-400 font-bold">Bloqueada</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Selecione uma conversa</p>
            </div>
          </div>
        )}
        {selected && (
          <>
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Pack #{selected.pack_id}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {selected.order_id && (
                    <Link href={`/dashboard/pedidos/${selected.order_id}`}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
                      Pedido #{selected.order_id} <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  )}
                  <span className="text-[10px] text-slate-600">{selected.unread} não lidas</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadLoading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>}
              {!threadLoading && threadDetail?.messages?.map(msg => {
                const isSeller = mlSellerId !== undefined
                  ? msg.from.user_id === mlSellerId
                  : !selected.last_message?.from_buyer
                return (
                  <div key={msg.id} className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isSeller ? 'bg-purple-600/20 border border-purple-500/20' : 'bg-dark-700 border border-white/[0.06]'}`}>
                      <p className="text-sm text-slate-200 leading-relaxed">{msg.text?.plain}</p>
                      <p className={`text-[10px] mt-1.5 ${isSeller ? 'text-purple-400/60 text-right' : 'text-slate-600'}`}>
                        {isSeller ? 'Você' : 'Comprador'} · {timeAgo(msg.message_date?.received)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEnd} />
            </div>

            {!selected.blocked && selected.buyer_id && (
              <div className="p-4 border-t border-white/[0.06] space-y-2">
                {showTemplates && <TemplatesDropdown templates={templates} onSelect={setReplyText} onClose={() => setShowTemplates(false)} />}
                <div className="flex gap-2 items-end">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Digite sua mensagem..." rows={3} maxLength={2000}
                    className="input-cyber flex-1 resize-none text-sm py-2.5 min-h-[72px]" />
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setShowTemplates(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${showTemplates ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-dark-700 border-white/[0.06] text-slate-400 hover:text-slate-200'}`}>
                      <Zap className="w-3.5 h-3.5" /> Templates
                    </button>
                    <button onClick={handleSendMessage} disabled={!replyText.trim() || sending}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {sending ? <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Send className="w-3.5 h-3.5" />}
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            )}
            {selected.blocked && (
              <div className="p-4 border-t border-white/[0.06]">
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Conversa bloqueada pelo Mercado Livre
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── ML RECLAMAÇÕES TAB ──────────────────────────────────────────────────────

function MLReclamacoesTab() {
  const [items, setItems]               = useState<ClaimItem[]>([])
  const [summary, setSummary]           = useState<ClaimsSummary | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [selected, setSelected]         = useState<ClaimItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<'opened' | 'closed'>('opened')
  const [refreshKey, setRefreshKey]     = useState(0)

  useEffect(() => {
    setLoading(true); setError(null); setSelected(null)
    fetch(`/api/mercadolivre/reclamacoes?status=${statusFilter}`)
      .then(r => r.json())
      .then((d: { items?: ClaimItem[]; summary?: ClaimsSummary; error?: string; code?: string }) => {
        if (d.code === 'NOT_CONNECTED') { setError('not_connected'); return }
        if (d.error) { setError(d.error); return }
        setItems(d.items ?? []); setSummary(d.summary ?? null)
      })
      .catch(() => setError('Erro de rede'))
      .finally(() => setLoading(false))
  }, [statusFilter, refreshKey])

  const urgencyColor = (u: string) =>
    u === 'urgent'  ? 'text-red-400 bg-red-400/10' :
    u === 'warning' ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500 bg-dark-700'

  const stageColor = (s: string) =>
    s === 'waiting_seller' ? 'text-red-400 bg-red-400/10' :
    s === 'dispute'        ? 'text-orange-400 bg-orange-400/10' :
    s === 'waiting_buyer'  ? 'text-blue-400 bg-blue-400/10' : 'text-slate-400 bg-dark-700'

  if (error === 'not_connected') return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <Link2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium mb-1">Mercado Livre não conectado</p>
        <Link href="/dashboard/integracoes" className="text-xs text-purple-400 hover:text-purple-300">Conectar conta →</Link>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* List */}
      <div className="w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 p-3 border-b border-white/[0.06]">
          {(['opened', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === f ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
              }`}>
              {f === 'opened' ? '🔴 Abertas' : '✅ Fechadas'}
            </button>
          ))}
          <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /></div>}
          {!loading && error && <div className="p-4 text-center text-xs text-red-400">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="py-12 text-center">
              <Shield className="w-8 h-8 text-green-400/30 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">{statusFilter === 'opened' ? 'Nenhuma reclamação aberta!' : 'Nenhuma fechada'}</p>
            </div>
          )}
          {!loading && items.map(c => (
            <button key={c.claim_id} onClick={() => setSelected(c)}
              className={`w-full text-left p-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all ${
                selected?.claim_id === c.claim_id ? 'bg-purple-500/[0.07] border-l-2 border-l-purple-500' : 'border-l-2 border-l-transparent'
              }`}>
              <div className="flex items-start gap-2.5">
                {c.order.product_thumbnail
                  ? <img src={c.order.product_thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 opacity-70" />
                  : <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-slate-600" /></div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-slate-300 truncate">{c.order.buyer_nickname}</span>
                    <span className="text-[9px] text-slate-700">{c.days_open}d</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mb-1">{c.order.product_title}</p>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${urgencyColor(c.urgency)}`}>
                      {c.urgency === 'urgent' ? '🔴 Urgente' : c.urgency === 'warning' ? '🟡 Atenção' : '⚪ Normal'}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stageColor(c.stage)}`}>{c.stage_label}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected && summary && (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-bold text-white mb-4">Resumo de Reclamações</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total abertas',   value: summary.total_opened,           color: 'text-white'       },
                { label: 'Devoluções',       value: summary.total_returns,          color: 'text-amber-400'   },
                { label: 'Urgentes',         value: summary.urgent,                 color: 'text-red-400'     },
                { label: 'Ação necessária',  value: summary.seller_action_required, color: 'text-orange-400'  },
              ].map(s => (
                <div key={s.label} className="dash-card rounded-xl p-4">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-600 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-700 mt-4 text-center">Selecione uma reclamação para ver detalhes</p>
          </div>
        )}
        {!selected && !summary && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Selecione uma reclamação</p>
            </div>
          </div>
        )}
        {selected && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Reclamação #{selected.claim_id}</h3>
                <p className="text-xs text-slate-600 mt-0.5">Pedido #{selected.order_id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="dash-card rounded-xl p-4 flex items-center gap-3">
              {selected.order.product_thumbnail && <img src={selected.order.product_thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover opacity-80" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{selected.order.product_title}</p>
                <p className="text-xs text-slate-600">{selected.order.buyer_nickname}</p>
                <p className="text-xs text-slate-600">{selected.order.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>

            <div className="dash-card rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><p className="text-slate-600 mb-1">Motivo</p><p className="text-slate-300 font-semibold">{selected.reason_label}</p></div>
                <div>
                  <p className="text-slate-600 mb-1">Estágio</p>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${stageColor(selected.stage)}`}>{selected.stage_label}</span>
                </div>
                <div><p className="text-slate-600 mb-1">Aberta há</p><p className="text-slate-300 font-semibold">{selected.days_open} dias</p></div>
                <div>
                  <p className="text-slate-600 mb-1">Responsável</p>
                  <p className={`font-semibold ${selected.action_responsible === 'seller' ? 'text-amber-400' : 'text-slate-300'}`}>
                    {selected.action_responsible === 'seller' ? '⚠️ Você' :
                     selected.action_responsible === 'buyer' ? 'Comprador' :
                     selected.action_responsible === 'mediator' ? 'Mediador ML' : '—'}
                  </p>
                </div>
              </div>
              {selected.due_date && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-xs text-slate-600">Prazo: <span className="text-amber-400 font-semibold">{new Date(selected.due_date).toLocaleDateString('pt-BR')}</span></p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-xs text-blue-400/70 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                Para responder, acesse o painel do Mercado Livre diretamente
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ML SAC PANEL ────────────────────────────────────────────────────────────

function MLSACPanel() {
  const [mlTab, setMlTab]       = useState<'perguntas' | 'mensagens' | 'reclamacoes'>('perguntas')
  const [templates, setTemplates] = useState<ResponseTemplate[]>([])
  const [kpis, setKpis]         = useState({ pendingQuestions: 0, unreadMessages: 0, openClaims: 0 })

  useEffect(() => {
    fetch('/api/response-templates')
      .then(r => r.json())
      .then((d: { templates?: ResponseTemplate[] }) => setTemplates(d.templates ?? []))
      .catch(() => {/* silent */})
  }, [])

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/mercadolivre/questions/pending-count').then(r => r.json()),
      fetch('/api/mercadolivre/messages').then(r => r.json()),
      fetch('/api/mercadolivre/reclamacoes?status=opened').then(r => r.json()),
    ]).then(([q, m, c]) => {
      setKpis({
        pendingQuestions: q.status === 'fulfilled' ? (q.value as { count?: number }).count ?? 0 : 0,
        unreadMessages:   m.status === 'fulfilled' ? (m.value as { total_unread?: number }).total_unread ?? 0 : 0,
        openClaims:       c.status === 'fulfilled' ? (c.value as { summary?: ClaimsSummary }).summary?.total_opened ?? 0 : 0,
      })
    })
  }, [])

  const ML_TABS = [
    { key: 'perguntas',   label: 'Perguntas',   icon: HelpCircle,    count: kpis.pendingQuestions, color: 'text-amber-400' },
    { key: 'mensagens',   label: 'Mensagens',   icon: MessageCircle, count: kpis.unreadMessages,   color: 'text-blue-400'  },
    { key: 'reclamacoes', label: 'Reclamações', icon: AlertTriangle, count: kpis.openClaims,       color: 'text-red-400'   },
  ] as const

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/[0.06]">
        {ML_TABS.map(t => (
          <button key={t.key} onClick={() => setMlTab(t.key)}
            className={`dash-card rounded-xl p-3 text-left transition-all hover:border-white/10 ${mlTab === t.key ? 'border-purple-500/30' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <t.icon className={`w-4 h-4 ${t.color}`} />
              {t.count > 0 && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.color} bg-white/[0.06]`}>{t.count}</span>}
            </div>
            <p className={`text-xl font-bold ${t.count > 0 ? t.color : 'text-slate-400'}`}>{t.count}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{t.label} pendentes</p>
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-white/[0.06]">
        {ML_TABS.map(t => (
          <button key={t.key} onClick={() => setMlTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
              mlTab === t.key ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-600 hover:text-slate-400'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${mlTab === t.key ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-slate-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {mlTab === 'perguntas'   && <MLPerguntasTab   templates={templates} />}
      {mlTab === 'mensagens'   && <MLMensagensTab   templates={templates} />}
      {mlTab === 'reclamacoes' && <MLReclamacoesTab />}
    </div>
  )
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function SACPage() {
  const [mainView, setMainView]           = useState<'ml' | 'sac'>('ml')
  const [activeTab, setActiveTab]         = useState<SACTipo | 'todos'>('todos')
  const [selectedItem, setSelectedItem]   = useState<SACItem | null>(SAC_ITEMS[0])
  const [reply, setReply]                 = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [statusFilter, setStatusFilter]   = useState<SACStatus | 'todos'>('todos')
  const [localMsgs, setLocalMsgs]         = useState<Record<number, string[]>>({})
  const [resolvedIds, setResolvedIds]     = useState<number[]>([])
  const [avalReplying, setAvalReplying]   = useState<number | null>(null)
  const [avalReply, setAvalReply]         = useState('')
  const [sacAiSuggesting, setSacAiSuggesting] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [selectedItem, localMsgs])

  async function suggestLocalSACResponse() {
    if (!selectedItem) return
    setSacAiSuggesting(true)
    try {
      const lastQuestion = [...selectedItem.mensagens].reverse().find(m => m.de === 'cliente')?.texto ?? ''
      const r = await fetch('/api/ai/suggest-sac-response', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: lastQuestion || (selectedItem.mensagens[0]?.texto ?? ''), product_title: selectedItem.produto }),
      })
      if (r.ok) { const j = await r.json() as { response?: string }; if (j.response) setReply(j.response) }
    } catch { /* non-fatal */ }
    setSacAiSuggesting(false)
  }

  const counts = useMemo(() => ({
    todos:     SAC_ITEMS.length,
    pergunta:  SAC_ITEMS.filter(i => i.tipo === 'pergunta').length,
    mensagem:  SAC_ITEMS.filter(i => i.tipo === 'mensagem').length,
    avaliacao: SAC_ITEMS.filter(i => i.tipo === 'avaliacao').length,
    devolucao: SAC_ITEMS.filter(i => i.tipo === 'devolucao').length,
  }), [])

  const filteredItems = useMemo(() => {
    let list = [...SAC_ITEMS]
    if (activeTab !== 'todos') list = list.filter(i => i.tipo === activeTab)
    if (statusFilter !== 'todos') list = list.filter(i => i.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(i =>
        i.cliente.toLowerCase().includes(q) || i.produto.toLowerCase().includes(q) ||
        i.mensagens.some(m => m.texto.toLowerCase().includes(q))
      )
    }
    return list
  }, [activeTab, statusFilter, searchQuery])

  const sendReply = () => {
    if (!reply.trim() || !selectedItem) return
    setLocalMsgs(prev => ({ ...prev, [selectedItem.id]: [...(prev[selectedItem.id] ?? []), reply] }))
    setReply(''); setShowTemplates(false)
  }

  const markResolved = (id: number) => { setResolvedIds(prev => [...prev, id]); setSelectedItem(null) }

  const TABS = [
    { key: 'todos',    label: 'Todos',      count: counts.todos,     icon: MessageSquare },
    { key: 'pergunta', label: 'Perguntas',  count: counts.pergunta,  icon: HelpCircle    },
    { key: 'mensagem', label: 'Mensagens',  count: counts.mensagem,  icon: MessageCircle },
    { key: 'avaliacao', label: 'Avaliações', count: counts.avaliacao, icon: Star         },
    { key: 'devolucao', label: 'Devoluções', count: counts.devolucao, icon: RotateCcw    },
  ] as const

  const pendingCount = SAC_ITEMS.filter(i => i.status === 'pendente' && !resolvedIds.includes(i.id)).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="dash-header sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white">SAC</h1>
          <p className="text-slate-500 text-sm">Central de Atendimento ao Cliente</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-white/[0.06]">
            {[{ id: 'ml', label: '📦 ML SAC' }, { id: 'sac', label: 'SAC Local' }].map(t => (
              <button key={t.id} onClick={() => setMainView(t.id as 'ml' | 'sac')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mainView === t.id ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          {mainView === 'sac' && (
            <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
              <Bell className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ML SAC VIEW */}
      {mainView === 'ml' && <MLSACPanel />}

      {/* SAC LOCAL VIEW */}
      {mainView === 'sac' && (
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT PANEL */}
          <div className="w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden bg-dark-900/50">
            <div className="p-3 border-b border-white/[0.06]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente ou produto..."
                  className="input-cyber w-full pl-9 py-2 text-xs" />
              </div>
            </div>

            <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-none">
              {TABS.map(tab => (
                <button key={tab.key}
                  onClick={() => { setActiveTab(tab.key as SACTipo | 'todos'); setSelectedItem(null) }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                    activeTab === tab.key ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-600 hover:text-slate-400'
                  }`}>
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-slate-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="px-3 py-2 border-b border-white/[0.06] flex gap-1.5 overflow-x-auto scrollbar-none">
              {(['todos', 'pendente', 'em_andamento', 'respondido'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full transition-all ${
                    statusFilter === s ? 'bg-purple-500/20 text-purple-400' : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'
                  }`}>
                  {s === 'todos' ? 'Todos' : s === 'pendente' ? '🔴 Pendente' : s === 'em_andamento' ? '🟡 Em andamento' : '🟢 Respondido'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredItems.map(item => {
                const lastMsg = item.mensagens[item.mensagens.length - 1]
                const isSelected = selectedItem?.id === item.id
                return (
                  <button key={item.id} onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all ${
                      isSelected ? 'bg-purple-500/[0.07] border-l-2 border-l-purple-500' : 'border-l-2 border-l-transparent'
                    }`}>
                    <div className="flex items-start gap-2.5">
                      <MktAvatar mkt={item.marketplace} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-semibold text-slate-200 truncate">{item.cliente}</span>
                          <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(item.data)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mb-1">{item.produto}</p>
                        <p className="text-[10px] text-slate-600 truncate">{lastMsg?.texto}</p>
                        <div className="flex items-center flex-wrap gap-1 mt-1.5">
                          <StatusBadge status={item.status} />
                          {item.prioridade === 'urgente' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">🔴 Urgente</span>}
                          {item.tipo === 'avaliacao' && item.estrelas !== undefined && <Stars count={item.estrelas} />}
                          {item.tipo === 'devolucao' && item.statusDevolucao && <DevolStatusBadge status={item.statusDevolucao} />}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
              {filteredItems.length === 0 && (
                <div className="py-12 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">Nenhum item encontrado</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* AVALIAÇÕES OVERVIEW */}
            {activeTab === 'avaliacao' && !selectedItem && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="dash-card rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Resumo de Avaliações</h2>
                      <p className="text-xs text-slate-600">Total: 347 avaliações recebidas</p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-yellow-400">4.6</div>
                      <Stars count={5} size="md" />
                      <p className="text-xs text-slate-600 mt-1">média geral</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[{ stars: 5, pct: 68, count: 236 }, { stars: 4, pct: 22, count: 76 }, { stars: 3, pct: 6, count: 21 }, { stars: 2, pct: 3, count: 10 }, { stars: 1, pct: 1, count: 4 }].map(row => (
                      <div key={row.stars} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-4 text-right">{row.stars}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-yellow-400/60" style={{ width: `${row.pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-600 w-8">{row.pct}%</span>
                        <span className="text-[10px] text-slate-700 w-8">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {SAC_ITEMS.filter(i => i.tipo === 'avaliacao').map(item => (
                    <div key={item.id} className="dash-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <MktAvatar mkt={item.marketplace} />
                          <div>
                            <p className="text-sm font-semibold text-white">{item.cliente}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.estrelas !== undefined && <Stars count={item.estrelas} />}
                              <MktBadge mkt={item.marketplace} />
                              <span className="text-[10px] text-slate-600">{timeAgo(item.data)}</span>
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{item.mensagens[0]?.texto}</p>
                      <p className="text-xs text-slate-600 mb-3">Produto: {item.produto}</p>
                      {item.mensagens[1] ? (
                        <div className="p-3 bg-purple-500/[0.07] border border-purple-500/10 rounded-xl mb-3">
                          <p className="text-[10px] text-purple-400 font-bold mb-1">Resposta da loja:</p>
                          <p className="text-xs text-slate-400">{item.mensagens[1].texto}</p>
                        </div>
                      ) : (
                        avalReplying === item.id ? (
                          <div className="space-y-2">
                            <textarea value={avalReply} onChange={e => setAvalReply(e.target.value)}
                              placeholder="Escreva sua resposta..." className="input-cyber w-full resize-none text-xs h-16" />
                            <div className="flex gap-2">
                              <button onClick={() => setAvalReplying(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300">Cancelar</button>
                              <button onClick={() => { setAvalReplying(null); setAvalReply('') }}
                                className="flex-1 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all">
                                Publicar Resposta
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAvalReplying(item.id); setSelectedItem(item) }}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> Responder avaliação
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DEVOLUÇÕES OVERVIEW */}
            {activeTab === 'devolucao' && !selectedItem && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="dash-card rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/[0.06]">
                    <h2 className="text-sm font-bold text-white">Devoluções e Trocas</h2>
                    <p className="text-xs text-slate-600 mt-0.5">{SAC_ITEMS.filter(i => i.tipo === 'devolucao').length} solicitações</p>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {SAC_ITEMS.filter(i => i.tipo === 'devolucao').map(item => (
                      <div key={item.id} className="p-4 hover:bg-white/[0.02] transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <MktAvatar mkt={item.marketplace} />
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white">{item.cliente}</span>
                                <MktBadge mkt={item.marketplace} />
                                {item.pedidoId && (
                                  <Link href={`/dashboard/pedidos/${item.pedidoId}`}
                                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors">
                                    #{item.pedidoId} <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mb-2">{item.produto}</p>
                              {item.motivoDevolucao && <MotivoBadge motivo={item.motivoDevolucao} />}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {item.statusDevolucao && <DevolStatusBadge status={item.statusDevolucao} />}
                            {item.valorReembolso && (
                              <p className="text-sm font-bold text-green-400 mt-1">
                                {item.valorReembolso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-600 mt-1">{timeAgo(item.data)}</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedItem(item)}
                          className="mt-3 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                          Ver conversa <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* NO ITEM SELECTED */}
            {!selectedItem && activeTab !== 'avaliacao' && activeTab !== 'devolucao' && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-purple-400/50" />
                  </div>
                  <p className="text-slate-500 font-medium">Selecione um atendimento</p>
                  <p className="text-slate-700 text-sm mt-1">para visualizar a conversa</p>
                </div>
              </div>
            )}

            {/* CONVERSATION VIEW */}
            {selectedItem && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-colors lg:hidden">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <MktAvatar mkt={selectedItem.marketplace} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{selectedItem.cliente}</span>
                        <MktBadge mkt={selectedItem.marketplace} />
                        <StatusBadge status={selectedItem.status} />
                        {selectedItem.prioridade === 'urgente' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">🔴 Urgente</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{selectedItem.produto}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {selectedItem.pedidoId && (
                      <Link href={`/dashboard/pedidos/${selectedItem.pedidoId}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all">
                        Pedido <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    <button onClick={() => markResolved(selectedItem.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-all border border-green-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedItem.mensagens.map(msg => (
                    <div key={msg.id} className={`flex ${msg.de === 'vendedor' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.de === 'vendedor' ? 'bg-purple-600/20 border border-purple-500/20' : 'bg-dark-700 border border-white/[0.06]'}`}>
                        <p className="text-sm text-slate-200 leading-relaxed">{msg.texto}</p>
                        <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${msg.de === 'vendedor' ? 'text-purple-400/60 justify-end' : 'text-slate-600'}`}>
                          <span>{msg.de === 'vendedor' ? 'Você' : selectedItem.cliente}</span>
                          <span>·</span>
                          <span>{new Date(msg.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(localMsgs[selectedItem.id] ?? []).map((txt, i) => (
                    <div key={`l${i}`} className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-purple-600/20 border border-purple-500/20">
                        <p className="text-sm text-slate-200 leading-relaxed">{txt}</p>
                        <p className="text-[10px] text-purple-400/60 mt-1.5 text-right">Você · agora</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEnd} />
                </div>

                <div className="p-4 border-t border-white/[0.06] space-y-2">
                  {showTemplates && (
                    <div className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden mb-2 shadow-xl">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Respostas Prontas</p>
                        <button onClick={() => setShowTemplates(false)} className="text-slate-600 hover:text-slate-400"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      {SAC_TEMPLATES.map(t => (
                        <button key={t.id} onClick={() => { setReply(t.texto); setShowTemplates(false) }}
                          className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 transition-all">
                          <p className="text-xs font-semibold text-slate-300">{t.titulo}</p>
                          <p className="text-[10px] text-slate-600 truncate mt-0.5">{t.texto.substring(0, 80)}...</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <textarea value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                      placeholder="Digite sua resposta... (Enter para enviar, Shift+Enter para nova linha)"
                      className="input-cyber flex-1 resize-none text-sm py-2.5 min-h-[72px]" rows={3} />
                    <div className="flex flex-col gap-2">
                      <button onClick={suggestLocalSACResponse} disabled={sacAiSuggesting}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {sacAiSuggesting ? <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Sparkles className="w-3.5 h-3.5" />}
                        IA
                      </button>
                      <button onClick={() => setShowTemplates(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${showTemplates ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-dark-700 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-dark-600'}`}>
                        <Zap className="w-3.5 h-3.5" /> Templates
                      </button>
                      <button onClick={sendReply} disabled={!reply.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        <Send className="w-3.5 h-3.5" /> Enviar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
