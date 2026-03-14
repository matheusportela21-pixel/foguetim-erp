'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Star, RotateCcw, Send, CheckCircle2,
  AlertTriangle, Search, X, Zap, ExternalLink, Bell,
  HelpCircle, MessageCircle, ThumbsUp, Package, BarChart2,
  Clock, ChevronRight, ArrowLeft, Loader2, RefreshCw, Link2,
} from 'lucide-react'
import { SAC_ITEMS, SAC_TEMPLATES, type SACItem, type SACTipo, type SACStatus, type MKTPedido } from './_data'

// ─── ML QUESTION TYPES ───────────────────────────────────────────────────────

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

// ─── ML QUESTIONS TAB ────────────────────────────────────────────────────────

function MLQuestionsTab() {
  const [questions, setQuestions]   = useState<MLQuestion[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [tab, setTab]               = useState<'UNANSWERED' | 'ANSWERED'>('UNANSWERED')
  const [paging, setPaging]         = useState({ total: 0, offset: 0, limit: 50 })
  const [offset, setOffset]         = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selected, setSelected]     = useState<MLQuestion | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/mercadolivre/questions?status=${tab}&offset=${offset}&limit=50`)
      .then(r => r.json())
      .then(d => {
        if (d.notConnected) { setNotConnected(true); return }
        if (d.error) { setError(d.error); return }
        setQuestions(d.questions ?? [])
        setPaging(d.paging ?? { total: 0, offset, limit: 50 })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [tab, offset, refreshKey])

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60)    return 'agora'
    if (diff < 3600)  return `há ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
    return `há ${Math.floor(diff / 86400)}d`
  }

  if (notConnected) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
        <Link2 className="w-6 h-6 text-yellow-400" />
      </div>
      <p className="text-sm font-semibold text-white">Mercado Livre não conectado</p>
      <p className="text-xs text-slate-500">Conecte sua conta para ver perguntas.</p>
      <a href="/dashboard/integracoes" className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition-colors">
        Ir para Integrações
      </a>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-dark-900/30">
        <div className="flex items-center gap-1">
          {[
            { v: 'UNANSWERED', l: 'Pendentes', cls: 'text-red-400 bg-red-400/10' },
            { v: 'ANSWERED',   l: 'Respondidas', cls: 'text-green-400 bg-green-400/10' },
          ].map(t => (
            <button key={t.v} onClick={() => { setTab(t.v as 'UNANSWERED' | 'ANSWERED'); setOffset(0) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t.v ? t.cls : 'text-slate-500 hover:text-slate-300'
              }`}>
              {t.l}
              {tab === t.v && paging.total > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-current/20 text-[9px]">{paging.total}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)}
          className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:bg-white/[0.04] transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
          Responder — Em breve
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando perguntas...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold">
            Tentar novamente
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle2 className="w-10 h-10 text-green-500/40" />
          <p className="text-sm text-slate-500">
            {tab === 'UNANSWERED' ? 'Nenhuma pergunta pendente 🎉' : 'Nenhuma pergunta respondida'}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Question list */}
          <div className="w-96 border-r border-white/[0.06] overflow-y-auto">
            {questions.map(q => (
              <button key={q.id} onClick={() => setSelected(q)}
                className={`w-full text-left p-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                  selected?.id === q.id ? 'bg-purple-500/5 border-l-2 border-l-purple-500' : ''
                }`}>
                <div className="flex items-start gap-3">
                  {q.item?.thumbnail ? (
                    <img src={q.item.thumbnail.replace('http://', 'https://')} alt=""
                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-dark-700"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '' }} />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-dark-700 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {q.item && <p className="text-[10px] text-yellow-400 truncate mb-0.5">{q.item.title}</p>}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{q.text}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(q.date_created)}</p>
                  </div>
                  {tab === 'UNANSWERED' && (
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 mt-1 animate-pulse" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Question detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-slate-600">Selecione uma pergunta para ver detalhes</p>
              </div>
            ) : (
              <div className="max-w-xl space-y-5">
                {/* Item */}
                {selected.item && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 border border-white/[0.06]">
                    <img src={selected.item.thumbnail.replace('http://', 'https://')} alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-dark-700"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{selected.item.title}</p>
                      <p className="text-[10px] text-slate-600 font-mono">{selected.item_id}</p>
                    </div>
                    <a href={`https://www.mercadolivre.com.br/p/${selected.item_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Question bubble */}
                <div className="bg-dark-700/50 rounded-2xl rounded-tl-sm p-4 border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-600">Comprador #{selected.from?.id}</span>
                    <span className="text-[10px] text-slate-600">{timeAgo(selected.date_created)}</span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{selected.text}</p>
                </div>

                {/* Answer or disabled CTA */}
                {selected.answer ? (
                  <div className="bg-purple-500/10 rounded-2xl rounded-tr-sm p-4 border border-purple-500/20 ml-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-purple-400 font-bold">Sua resposta</span>
                      <span className="text-[10px] text-slate-600">{timeAgo(selected.answer.date_created)}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{selected.answer.text}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-white/10 bg-dark-700/30">
                    <div className="flex items-center gap-2 mb-3">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <p className="text-xs font-semibold text-white">Responder esta pergunta</p>
                      <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400">Em breve</span>
                    </div>
                    <textarea disabled
                      placeholder="Funcionalidade de resposta estará disponível em breve..."
                      className="w-full bg-dark-800/50 border border-white/[0.06] rounded-xl p-3 text-xs text-slate-500 resize-none h-20 cursor-not-allowed opacity-50" />
                    <button disabled
                      className="mt-2 px-4 py-2 rounded-xl bg-purple-600/30 text-purple-400 text-xs font-bold cursor-not-allowed opacity-50 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Responder (em breve)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {paging.total > 50 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
          <span className="text-xs text-slate-600">{offset + 1}–{Math.min(offset + 50, paging.total)} de {paging.total}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-700 text-slate-400 disabled:opacity-30">← Ant.</button>
            <button onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= paging.total}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-700 text-slate-400 disabled:opacity-30">Próx. →</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const now  = new Date('2026-03-12T15:00:00')
  const then = new Date(isoDate)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diff < 60)   return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  return `há ${days} dia${days > 1 ? 's' : ''}`
}

function Stars({ count, size = 'sm' }: { count: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${cls} ${i <= count ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: SACStatus }) {
  const map = {
    pendente:     { cls: 'bg-red-400/10 text-red-400',    label: 'Pendente'     },
    respondido:   { cls: 'bg-green-400/10 text-green-400', label: 'Respondido'   },
    em_andamento: { cls: 'bg-yellow-400/10 text-yellow-400', label: 'Em andamento' },
  }
  const m = map[status]
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>
}

function MktBadge({ mkt }: { mkt: MKTPedido }) {
  const colors: Record<MKTPedido, string> = {
    ML:  'bg-yellow-400/10 text-yellow-300',
    SP:  'bg-orange-500/10 text-orange-400',
    AMZ: 'bg-sky-400/10 text-sky-400',
    MAG: 'bg-blue-400/10 text-blue-400',
  }
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors[mkt]}`}>{mkt}</span>
}

function MktAvatar({ mkt }: { mkt: MKTPedido }) {
  const colors: Record<MKTPedido, string> = {
    ML:  'bg-yellow-400/20 text-yellow-300',
    SP:  'bg-orange-500/20 text-orange-400',
    AMZ: 'bg-sky-400/20 text-sky-400',
    MAG: 'bg-blue-400/20 text-blue-400',
  }
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colors[mkt]}`}>
      {mkt}
    </div>
  )
}

function MotivoBadge({ motivo }: { motivo: string }) {
  const map: Record<string, string> = {
    'Produto com defeito':          'bg-red-400/10 text-red-400',
    'Arrependimento':               'bg-amber-400/10 text-amber-400',
    'Produto diferente do anunciado': 'bg-orange-400/10 text-orange-400',
    'Dano no transporte':           'bg-purple-400/10 text-purple-400',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[motivo] ?? 'bg-slate-700 text-slate-400'}`}>
      {motivo}
    </span>
  )
}

function DevolStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Solicitada:        'bg-red-400/10 text-red-400',
    Aprovada:          'bg-yellow-400/10 text-yellow-400',
    'Produto recebido': 'bg-blue-400/10 text-blue-400',
    Reembolsado:       'bg-green-400/10 text-green-400',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-slate-700 text-slate-400'}`}>
      {status}
    </span>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────────────────

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
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [selectedItem, localMsgs])

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
        i.cliente.toLowerCase().includes(q) ||
        i.produto.toLowerCase().includes(q) ||
        i.mensagens.some(m => m.texto.toLowerCase().includes(q))
      )
    }
    return list
  }, [activeTab, statusFilter, searchQuery])

  const sendReply = () => {
    if (!reply.trim() || !selectedItem) return
    setLocalMsgs(prev => ({
      ...prev,
      [selectedItem.id]: [...(prev[selectedItem.id] ?? []), reply],
    }))
    setReply('')
    setShowTemplates(false)
  }

  const markResolved = (id: number) => {
    setResolvedIds(prev => [...prev, id])
    setSelectedItem(null)
  }

  const TABS = [
    { key: 'todos', label: 'Todos', count: counts.todos, icon: MessageSquare },
    { key: 'pergunta', label: 'Perguntas', count: counts.pergunta, icon: HelpCircle },
    { key: 'mensagem', label: 'Mensagens', count: counts.mensagem, icon: MessageCircle },
    { key: 'avaliacao', label: 'Avaliações', count: counts.avaliacao, icon: Star },
    { key: 'devolucao', label: 'Devoluções', count: counts.devolucao, icon: RotateCcw },
  ] as const

  const pendingCount = SAC_ITEMS.filter(i => i.status === 'pendente' && !resolvedIds.includes(i.id)).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <div className="dash-header sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold text-white">SAC</h1>
          <p className="text-slate-500 text-sm">Central de Atendimento ao Cliente</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Main view tabs */}
          <div className="flex items-center gap-1 bg-dark-800/60 rounded-xl p-1 border border-white/[0.06]">
            {[
              { id: 'ml',  label: '📦 Perguntas ML' },
              { id: 'sac', label: 'SAC Local'        },
            ].map(t => (
              <button key={t.id} onClick={() => setMainView(t.id as 'ml' | 'sac')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mainView === t.id ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── ML Questions View ── */}
      {mainView === 'ml' && <MLQuestionsTab />}

      {/* ── SAC SPLIT PANEL ── */}
      {mainView === 'sac' && <div className="flex-1 flex overflow-hidden">

        {/* ===== LEFT PANEL ===== */}
        <div className="w-80 xl:w-96 flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden bg-dark-900/50">

          {/* Search */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente ou produto..."
                className="input-cyber w-full pl-9 py-2 text-xs"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button key={tab.key}
                onClick={() => { setActiveTab(tab.key as SACTipo | 'todos'); setSelectedItem(null) }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-600 hover:text-slate-400'
                }`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Status filter pills */}
          <div className="px-3 py-2 border-b border-white/[0.06] flex gap-1.5 overflow-x-auto scrollbar-none">
            {(['todos', 'pendente', 'em_andamento', 'respondido'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full transition-all ${
                  statusFilter === s
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'
                }`}>
                {s === 'todos' ? 'Todos' : s === 'pendente' ? '🔴 Pendente' : s === 'em_andamento' ? '🟡 Em andamento' : '🟢 Respondido'}
              </button>
            ))}
          </div>

          {/* Item List */}
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
                        <span className="text-[10px] text-slate-600 shrink-0 ml-1">{timeAgo(item.data)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mb-1">{item.produto}</p>
                      <p className="text-[10px] text-slate-600 truncate">{lastMsg?.texto}</p>
                      <div className="flex items-center flex-wrap gap-1 mt-1.5">
                        <StatusBadge status={item.status} />
                        {item.prioridade === 'urgente' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">
                            🔴 Urgente
                          </span>
                        )}
                        {item.tipo === 'avaliacao' && item.estrelas !== undefined && (
                          <Stars count={item.estrelas} />
                        )}
                        {item.tipo === 'devolucao' && item.statusDevolucao && (
                          <DevolStatusBadge status={item.statusDevolucao} />
                        )}
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

        {/* ===== RIGHT PANEL ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── AVALIAÇÕES OVERVIEW (when tab=avaliacao and no item selected) ── */}
          {activeTab === 'avaliacao' && !selectedItem && (
            <div className="flex-1 overflow-y-auto p-6">
              {/* Summary */}
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
                  {[
                    { stars: 5, pct: 68, count: 236 },
                    { stars: 4, pct: 22, count: 76  },
                    { stars: 3, pct: 6,  count: 21  },
                    { stars: 2, pct: 3,  count: 10  },
                    { stars: 1, pct: 1,  count: 4   },
                  ].map(row => (
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
              {/* Avaliações list */}
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
                    {item.mensagens[1] && (
                      <div className="p-3 bg-purple-500/[0.07] border border-purple-500/10 rounded-xl mb-3">
                        <p className="text-[10px] text-purple-400 font-bold mb-1">Resposta da loja:</p>
                        <p className="text-xs text-slate-400">{item.mensagens[1].texto}</p>
                      </div>
                    )}
                    {!item.mensagens[1] && (
                      avalReplying === item.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={avalReply}
                            onChange={e => setAvalReply(e.target.value)}
                            placeholder="Escreva sua resposta..."
                            className="input-cyber w-full resize-none text-xs h-16"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setAvalReplying(null)}
                              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                              Cancelar
                            </button>
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

          {/* ── DEVOLUÇÕES OVERVIEW ── */}
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

          {/* ── NO ITEM SELECTED ── */}
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

          {/* ── CONVERSATION VIEW ── */}
          {selectedItem && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Conversation header */}
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
                      {selectedItem.prioridade === 'urgente' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">🔴 Urgente</span>
                      )}
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

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedItem.mensagens.map(msg => (
                  <div key={msg.id} className={`flex ${msg.de === 'vendedor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.de === 'vendedor'
                        ? 'bg-purple-600/20 border border-purple-500/20'
                        : 'bg-dark-700 border border-white/[0.06]'
                    }`}>
                      <p className="text-sm text-slate-200 leading-relaxed">{msg.texto}</p>
                      <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${msg.de === 'vendedor' ? 'text-purple-400/60 justify-end' : 'text-slate-600'}`}>
                        <span>{msg.de === 'vendedor' ? 'Você' : selectedItem.cliente}</span>
                        <span>·</span>
                        <span>{new Date(msg.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Local messages */}
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

              {/* Reply box */}
              <div className="p-4 border-t border-white/[0.06] space-y-2">
                {/* Templates dropdown */}
                {showTemplates && (
                  <div className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden mb-2 shadow-xl">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Respostas Prontas</p>
                      <button onClick={() => setShowTemplates(false)} className="text-slate-600 hover:text-slate-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {SAC_TEMPLATES.map(t => (
                      <button key={t.id}
                        onClick={() => { setReply(t.texto); setShowTemplates(false) }}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 transition-all">
                        <p className="text-xs font-semibold text-slate-300">{t.titulo}</p>
                        <p className="text-[10px] text-slate-600 truncate mt-0.5">{t.texto.substring(0, 80)}...</p>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    placeholder="Digite sua resposta... (Enter para enviar, Shift+Enter para nova linha)"
                    className="input-cyber flex-1 resize-none text-sm py-2.5 min-h-[72px]"
                    rows={3}
                  />
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setShowTemplates(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        showTemplates
                          ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                          : 'bg-dark-700 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-dark-600'
                      }`}>
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
      </div>} {/* end mainView === 'sac' */}
    </div>
  )
}
