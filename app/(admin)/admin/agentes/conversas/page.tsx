'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, MessageSquare, CheckCircle2, Clock, Copy,
  XCircle, ChevronRight, ChevronLeft, Plus, Loader2, Bot,
  Zap, Shield, Activity,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThreadListItem {
  id: string
  titulo: string
  tipo: string
  status: string
  severidade: string | null
  tags: string[] | null
  requer_decisao_humana: boolean
  created_at: string
  updated_at: string
  iniciador?: { nome: string; slug: string } | null
}

interface ThreadDetail {
  id: string
  titulo: string
  tipo: string
  status: string
  severidade: string | null
  tags: string[] | null
  requer_decisao_humana: boolean
  decisao_humana: string | null
  decidido_em: string | null
  resumo_final: string | null
  solucao_proposta: string | null
  comando_code: string | null
  created_at: string
  updated_at: string
}

interface MessageWithAgent {
  id: string
  thread_id: string
  agent_id: string | null
  conteudo: string
  tipo: string
  tokens_usados: number | null
  created_at: string
  agent?: { nome: string; slug: string; categoria: string } | null
}

type TabFilter = 'todos' | 'aguardando_decisao' | 'resolvido' | 'incidente' | 'novidade' | 'debate'
type ModalTipo = 'pedido_ajuda' | 'debate' | 'proposta' | 'melhoria'

// ── Config ────────────────────────────────────────────────────────────────────

const TIPO_CFG: Record<string, { label: string; color: string }> = {
  incidente:    { label: 'Incidente',    color: 'bg-red-900/30 text-red-400 border border-red-700/30'         },
  debate:       { label: 'Debate',       color: 'bg-violet-900/30 text-violet-400 border border-violet-700/30' },
  proposta:     { label: 'Proposta',     color: 'bg-blue-900/30 text-blue-400 border border-blue-700/30'       },
  novidade:     { label: 'Novidade',     color: 'bg-cyan-900/30 text-cyan-400 border border-cyan-700/30'       },
  pedido_ajuda: { label: 'Pedido Ajuda', color: 'bg-orange-900/30 text-orange-400 border border-orange-700/30' },
  melhoria:     { label: 'Melhoria',     color: 'bg-green-900/30 text-green-400 border border-green-700/30'    },
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  aberto:              { label: 'Aberto',            color: 'bg-blue-900/30 text-blue-400'    },
  aberta:              { label: 'Aberta',            color: 'bg-blue-900/30 text-blue-400'    },
  aguardando_decisao:  { label: 'Aguard. Decisão',   color: 'bg-amber-900/30 text-amber-400'  },
  resolvido:           { label: 'Resolvido',          color: 'bg-green-900/30 text-green-400'  },
  arquivado:           { label: 'Arquivado',          color: 'bg-slate-800 text-slate-500'     },
}

const SEV_CFG: Record<string, { label: string; color: string }> = {
  critica: { label: 'Crítica', color: 'bg-red-900/30 text-red-400 border border-red-700/30'         },
  alta:    { label: 'Alta',    color: 'bg-orange-900/30 text-orange-400 border border-orange-700/30' },
  media:   { label: 'Média',   color: 'bg-amber-900/30 text-amber-400 border border-amber-700/30'   },
  baixa:   { label: 'Baixa',   color: 'bg-blue-900/30 text-blue-400 border border-blue-700/30'      },
}

const AGENT_COLORS: string[] = [
  'bg-violet-600 text-white',
  'bg-blue-600 text-white',
  'bg-green-600 text-white',
  'bg-orange-600 text-white',
  'bg-cyan-600 text-white',
  'bg-pink-600 text-white',
  'bg-amber-600 text-white',
  'bg-red-600 text-white',
]

function agentColor(slug: string | undefined): string {
  if (!slug) return 'bg-slate-700 text-slate-300'
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) & 0xffffffff
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function getAgentIcon(categoria: string | undefined): React.ReactNode {
  switch (categoria) {
    case 'operacional': return <Zap className="w-3 h-3" />
    case 'seguranca':   return <Shield className="w-3 h-3" />
    case 'analise':     return <Activity className="w-3 h-3" />
    default:            return <Bot className="w-3 h-3" />
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversasPage() {
  const [view, setView]                   = useState<'list' | 'detail'>('list')
  const [threads, setThreads]             = useState<ThreadListItem[]>([])
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [messages, setMessages]           = useState<MessageWithAgent[]>([])
  const [pendingCount, setPendingCount]   = useState(0)
  const [total, setTotal]                 = useState(0)

  // Filters
  const [activeTab, setActiveTab]         = useState<TabFilter>('todos')
  const [sevFilter, setSevFilter]         = useState('')

  // Loading / error
  const [loadingList, setLoadingList]     = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [listError, setListError]         = useState('')

  // Decision
  const [decisaoText, setDecisaoText]     = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)

  // Copy code
  const [copied, setCopied]               = useState(false)

  // Modal
  const [showModal, setShowModal]         = useState(false)
  const [modalForm, setModalForm]         = useState({
    titulo: '', tipo: 'pedido_ajuda' as ModalTipo, descricao: '', tags: '',
  })
  const [submittingModal, setSubmittingModal] = useState(false)
  const [modalError, setModalError]       = useState('')
  const [toast, setToast]                 = useState('')

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const loadThreads = useCallback(async () => {
    setLoadingList(true)
    setListError('')
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })

      if (activeTab === 'aguardando_decisao') params.set('status', 'aguardando_decisao')
      else if (activeTab === 'resolvido')     params.set('status', 'resolvido')
      else if (activeTab === 'incidente')     params.set('tipo', 'incidente')
      else if (activeTab === 'novidade')      params.set('tipo', 'novidade')
      else if (activeTab === 'debate')        params.set('tipo', 'debate')

      if (sevFilter) params.set('severidade', sevFilter)

      const res  = await fetch(`/api/admin/threads?${params.toString()}`)
      const json = await res.json() as {
        threads: ThreadListItem[]
        total: number
        pending_count: number
        error?: string
      }
      if (!res.ok) { setListError(json.error ?? 'Erro ao carregar'); return }
      setThreads(json.threads)
      setTotal(json.total)
      setPendingCount(json.pending_count)
    } catch {
      setListError('Falha de conexão')
    } finally {
      setLoadingList(false)
    }
  }, [activeTab, sevFilter])

  useEffect(() => { void loadThreads() }, [loadThreads])

  // ── Fetch detail ────────────────────────────────────────────────────────────

  const loadThreadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true)
    try {
      const res  = await fetch(`/api/admin/threads/${id}`)
      const json = await res.json() as {
        thread: ThreadDetail
        messages: MessageWithAgent[]
        error?: string
      }
      if (!res.ok) return
      setSelectedThread(json.thread)
      setMessages(json.messages)
      setDecisaoText('')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const openDetail = useCallback(async (id: string) => {
    setView('detail')
    await loadThreadDetail(id)
  }, [loadThreadDetail])

  const backToList = useCallback(() => {
    setView('list')
    setSelectedThread(null)
    setMessages([])
  }, [])

  // ── Decision ────────────────────────────────────────────────────────────────

  const handleDecision = useCallback(async (tipo: 'aprovado' | 'modificado' | 'rejeitado' | 'arquivado') => {
    if (!selectedThread) return
    setSubmittingDecision(true)
    try {
      await fetch(`/api/admin/threads/${selectedThread.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisao_humana: decisaoText || tipo,
          status:         tipo === 'aprovado' || tipo === 'modificado' ? 'resolvido' : 'arquivado',
          decidido_em:    new Date().toISOString(),
        }),
      })
      await loadThreadDetail(selectedThread.id)
      void loadThreads()
    } finally {
      setSubmittingDecision(false)
    }
  }, [selectedThread, decisaoText, loadThreadDetail, loadThreads])

  // ── Copy code ───────────────────────────────────────────────────────────────

  const handleCopyCode = useCallback(async () => {
    if (selectedThread?.comando_code) {
      await navigator.clipboard.writeText(selectedThread.comando_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [selectedThread])

  // ── Modal ───────────────────────────────────────────────────────────────────

  const handleModalSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingModal(true)
    setModalError('')
    try {
      const res = await fetch('/api/admin/threads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo:    modalForm.titulo,
          tipo:      modalForm.tipo,
          descricao: modalForm.descricao,
          tags:      modalForm.tags,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) { setModalError(json.error ?? 'Erro ao criar'); return }
      setShowModal(false)
      setModalForm({ titulo: '', tipo: 'pedido_ajuda', descricao: '', tags: '' })
      void loadThreads()
      setToast('Thread criada! Os agentes foram convocados.')
      setTimeout(() => setToast(''), 4000)
    } catch {
      setModalError('Falha de conexão')
    } finally {
      setSubmittingModal(false)
    }
  }, [modalForm, loadThreads])

  // ── Tabs config ─────────────────────────────────────────────────────────────

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'todos',             label: 'Todos'               },
    { key: 'aguardando_decisao',label: 'Aguardando Decisão'  },
    { key: 'resolvido',         label: 'Resolvidos'          },
    { key: 'incidente',         label: 'Incidentes'          },
    { key: 'novidade',          label: 'Novidades'           },
    { key: 'debate',            label: 'Debates'             },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-violet-400" />
              Conversas dos Agentes
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Threads de comunicação entre agentes IA · {total} no total
            </p>
          </div>
          {view === 'list' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Thread
            </button>
          )}
          {view === 'detail' && (
            <button
              onClick={backToList}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-sm rounded-xl transition-colors border border-white/[0.06]"
            >
              <ChevronLeft className="w-4 h-4" />
              Conversas
            </button>
          )}
        </div>

        {/* Pending banner */}
        {pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-amber-200 text-sm font-medium">
              {pendingCount} thread{pendingCount > 1 ? 's' : ''} aguardando sua decisão
            </span>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-green-600 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {toast}
          </div>
        )}

        {/* ── LIST VIEW ────────────────────────────────────────────────────────── */}
        {view === 'list' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Tab buttons */}
              <div className="flex items-center bg-white/[0.02] border border-white/[0.06] rounded-xl p-1 gap-1 flex-wrap">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                    {tab.key === 'aguardando_decisao' && pendingCount > 0 && (
                      <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Severidade filter */}
              <select
                value={sevFilter}
                onChange={e => setSevFilter(e.target.value)}
                className="bg-slate-900/50 border border-white/[0.08] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500/50"
              >
                <option value="">Todas as severidades</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>

            {/* Thread table */}
            {loadingList ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Carregando threads...
              </div>
            ) : listError ? (
              <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-6 text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-300 text-sm">{listError}</p>
                <button
                  onClick={() => void loadThreads()}
                  className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : threads.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-12 text-center">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Nenhuma thread encontrada</p>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_120px_140px_120px_140px_40px] gap-4 px-4 py-3 border-b border-white/[0.06] text-xs text-slate-500 font-medium uppercase tracking-wide">
                  <span>Título / Tipo</span>
                  <span>Severidade</span>
                  <span>Iniciador</span>
                  <span>Status</span>
                  <span>Atualizado</span>
                  <span />
                </div>

                {threads.map(thread => {
                  const isAwaiting = thread.status === 'aguardando_decisao'
                  const tipoCfg    = TIPO_CFG[thread.tipo] ?? { label: thread.tipo, color: 'bg-slate-800 text-slate-400' }
                  const statusCfg  = STATUS_CFG[thread.status] ?? { label: thread.status, color: 'bg-slate-800 text-slate-400' }
                  const sevCfg     = thread.severidade ? SEV_CFG[thread.severidade] : null

                  return (
                    <button
                      key={thread.id}
                      onClick={() => void openDetail(thread.id)}
                      className={`w-full grid grid-cols-[1fr_120px_140px_120px_140px_40px] gap-4 px-4 py-4 text-left border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors items-center ${
                        isAwaiting ? 'bg-amber-500/5 border-amber-500/20' : ''
                      }`}
                    >
                      {/* Título + tipo */}
                      <div>
                        <p className="text-slate-200 text-sm font-medium truncate">{thread.titulo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${tipoCfg.color}`}>
                            {tipoCfg.label}
                          </span>
                          {thread.tags && thread.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Severidade */}
                      <div>
                        {sevCfg ? (
                          <span className={`text-[10px] px-2 py-1 rounded font-medium ${sevCfg.color}`}>
                            {sevCfg.label}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>

                      {/* Iniciador */}
                      <div>
                        {thread.iniciador ? (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${agentColor(thread.iniciador.slug)}`}>
                              {thread.iniciador.nome.slice(0, 1)}
                            </div>
                            <span className="text-slate-400 text-xs truncate">{thread.iniciador.nome}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Humano</span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`text-[10px] px-2 py-1 rounded font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Data */}
                      <div>
                        <span className="text-slate-500 text-xs">{fmtDate(thread.updated_at)}</span>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-end">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── DETAIL VIEW ──────────────────────────────────────────────────────── */}
        {view === 'detail' && (
          <>
            {loadingDetail && !selectedThread ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Carregando conversa...
              </div>
            ) : selectedThread ? (
              <div className="space-y-6">

                {/* Thread header */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
                  <div className="flex flex-wrap items-start gap-3 mb-3">
                    <h2 className="text-xl font-bold text-slate-100 flex-1">{selectedThread.titulo}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(() => {
                        const tipoCfg = TIPO_CFG[selectedThread.tipo] ?? { label: selectedThread.tipo, color: 'bg-slate-800 text-slate-400' }
                        return (
                          <span className={`text-xs px-2.5 py-1 rounded font-medium ${tipoCfg.color}`}>
                            {tipoCfg.label}
                          </span>
                        )
                      })()}
                      {selectedThread.severidade && (() => {
                        const sevCfg = SEV_CFG[selectedThread.severidade ?? '']
                        return sevCfg ? (
                          <span className={`text-xs px-2.5 py-1 rounded font-medium ${sevCfg.color}`}>
                            {sevCfg.label}
                          </span>
                        ) : null
                      })()}
                      {(() => {
                        const statusCfg = STATUS_CFG[selectedThread.status] ?? { label: selectedThread.status, color: 'bg-slate-800 text-slate-400' }
                        return (
                          <span className={`text-xs px-2.5 py-1 rounded font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Criada {fmtDate(selectedThread.created_at)}</span>
                    <span>{messages.length} mensagem{messages.length !== 1 ? 's' : ''}</span>
                    {selectedThread.tags && selectedThread.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        {selectedThread.tags.map(t => (
                          <span key={t} className="bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages timeline */}
                <div className="space-y-4">
                  {messages.map(message => {
                    const color = agentColor(message.agent?.slug)
                    const initial = message.agent?.nome?.slice(0, 1) ?? '👤'
                    return (
                      <div key={message.id} className="flex gap-3">
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                          {message.agent ? initial : <Bot className="w-4 h-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Meta */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-slate-200">
                              {message.agent?.nome ?? 'Sistema'}
                            </span>
                            {message.agent && (
                              <span className="text-slate-600 flex items-center gap-0.5">
                                {getAgentIcon(message.agent.categoria)}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">{fmtDate(message.created_at)}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                              {message.tipo}
                            </span>
                            {message.tokens_usados != null && (
                              <span className="text-[10px] text-slate-600">{message.tokens_usados} tokens</span>
                            )}
                          </div>

                          {/* Content */}
                          <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                            message.tipo === 'conclusao'
                              ? 'bg-violet-900/20 border border-violet-700/30 text-violet-100'
                              : 'bg-white/[0.03] border border-white/[0.06] text-slate-300'
                          }`}>
                            <pre className="whitespace-pre-wrap font-sans">{message.conteudo}</pre>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {messages.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      Nenhuma mensagem nesta thread.
                    </div>
                  )}
                </div>

                {/* Conclusion section */}
                {(selectedThread.resumo_final || selectedThread.solucao_proposta || selectedThread.comando_code || selectedThread.status === 'aguardando_decisao' || selectedThread.decisao_humana) && (
                  <div className="border-t border-white/[0.06] pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-200">Conclusão do Coordenador</h3>

                    {selectedThread.resumo_final && (
                      <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Resumo</p>
                        <p className="text-slate-300 text-sm">{selectedThread.resumo_final}</p>
                      </div>
                    )}

                    {selectedThread.solucao_proposta && (
                      <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Solução Proposta</p>
                        <p className="text-slate-300 text-sm">{selectedThread.solucao_proposta}</p>
                      </div>
                    )}

                    {selectedThread.comando_code && (
                      <div className="bg-slate-900 rounded-xl p-4 border border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Solução para Claude Code</p>
                          <button
                            onClick={() => void handleCopyCode()}
                            className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            {copied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                          {selectedThread.comando_code}
                        </pre>
                      </div>
                    )}

                    {/* Awaiting decision */}
                    {selectedThread.status === 'aguardando_decisao' && (
                      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
                        <p className="text-amber-300 text-sm font-semibold mb-3">⚠️ Sua decisão é necessária</p>
                        <textarea
                          value={decisaoText}
                          onChange={e => setDecisaoText(e.target.value)}
                          placeholder="Escreva sua decisão, modificação ou motivo de rejeição..."
                          className="w-full bg-slate-900/50 border border-white/[0.08] rounded-lg px-3 py-2 text-slate-200 text-sm resize-none h-24 focus:outline-none focus:border-violet-500/50"
                        />
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <button
                            onClick={() => void handleDecision('aprovado')}
                            disabled={submittingDecision}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                          >
                            {submittingDecision ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            ✅ Aprovar Solução
                          </button>
                          <button
                            onClick={() => void handleDecision('modificado')}
                            disabled={submittingDecision}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                          >
                            ✏️ Modificar
                          </button>
                          <button
                            onClick={() => void handleDecision('rejeitado')}
                            disabled={submittingDecision}
                            className="px-4 py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                          >
                            ❌ Rejeitar
                          </button>
                          <button
                            onClick={() => void handleDecision('arquivado')}
                            disabled={submittingDecision}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm rounded-lg transition-colors ml-auto"
                          >
                            Arquivar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Existing decision */}
                    {selectedThread.decisao_humana && (
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/[0.06]">
                        <p className="text-xs text-slate-500 mb-1">
                          Decisão: {selectedThread.status} em {fmtDate(selectedThread.decidido_em ?? '')}
                        </p>
                        <p className="text-slate-300 text-sm">{selectedThread.decisao_humana}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Modal: Nova Thread ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-slate-900 border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Nova Thread</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={e => void handleModalSubmit(e)} className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={modalForm.titulo}
                  onChange={e => setModalForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Precisamos revisar a estratégia de precificação"
                  className="w-full bg-slate-900/50 border border-white/[0.08] text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500/50 placeholder:text-slate-600"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Tipo *
                </label>
                <select
                  required
                  value={modalForm.tipo}
                  onChange={e => setModalForm(f => ({ ...f, tipo: e.target.value as ModalTipo }))}
                  className="w-full bg-slate-900/50 border border-white/[0.08] text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="pedido_ajuda">Pedido de Ajuda</option>
                  <option value="debate">Debate</option>
                  <option value="proposta">Proposta</option>
                  <option value="melhoria">Melhoria</option>
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Descrição *
                </label>
                <textarea
                  required
                  value={modalForm.descricao}
                  onChange={e => setModalForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descreva o contexto e o que você precisa dos agentes..."
                  className="w-full bg-slate-900/50 border border-white/[0.08] text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500/50 resize-none h-28 placeholder:text-slate-600"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
                  Tags <span className="text-slate-600">(separadas por vírgula)</span>
                </label>
                <input
                  type="text"
                  value={modalForm.tags}
                  onChange={e => setModalForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="Ex: precificacao, ml, urgente"
                  className="w-full bg-slate-900/50 border border-white/[0.08] text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500/50 placeholder:text-slate-600"
                />
              </div>

              {modalError && (
                <p className="text-red-400 text-xs">{modalError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] text-slate-300 text-sm rounded-xl transition-colors border border-white/[0.06]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submittingModal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Criar Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
