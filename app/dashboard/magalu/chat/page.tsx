'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  MessageSquare, Search, RefreshCw, Loader2,
  Send, User, Package, AlertCircle, X,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string
  from: 'buyer' | 'seller' | 'system'
  content: string
  sent_at: string
}

interface Conversation {
  id: string
  buyer_name:   string
  buyer_id?:    string
  order_id?:    string
  product_name?: string
  status:       'open' | 'closed' | 'pending'
  unread_count: number
  last_message: string
  last_message_at: string
  messages:     ChatMessage[]
}

interface ChatData {
  available: boolean
  items:     Conversation[]
  total:     number
}

/* ------------------------------------------------------------------ */
/*  Status config                                                       */
/* ------------------------------------------------------------------ */

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  open:    { label: 'Aberta',    bg: 'bg-[#0086FF]/10', text: 'text-[#0086FF]', dot: 'bg-[#0086FF]' },
  pending: { label: 'Pendente',  bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  closed:  { label: 'Fechada',   bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
}

function statusOf(s: string) {
  return STATUS_CFG[s] ?? { label: s, bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' }
}

function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH  = diffMs / 3600000
  if (diffH < 24) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffH < 48) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                           */
/* ------------------------------------------------------------------ */

function buildDemoConversations(): Conversation[] {
  return [
    {
      id: 'demo-1',
      buyer_name: 'Ana Silva',
      order_id: '1234567890',
      product_name: 'Fone Bluetooth Pro X200',
      status: 'open',
      unread_count: 2,
      last_message: 'Quando vai sair meu pedido?',
      last_message_at: new Date(Date.now() - 15 * 60000).toISOString(),
      messages: [
        { id: 'm1', from: 'buyer', content: 'Olá, queria saber sobre meu pedido!', sent_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'm2', from: 'seller', content: 'Olá Ana! Seu pedido está em separação. Previsão de envio: amanhã.', sent_at: new Date(Date.now() - 3000000).toISOString() },
        { id: 'm3', from: 'buyer', content: 'Quando vai sair meu pedido?', sent_at: new Date(Date.now() - 15 * 60000).toISOString() },
      ],
    },
    {
      id: 'demo-2',
      buyer_name: 'Carlos Mendes',
      order_id: '9876543210',
      product_name: 'Carregador Turbo 65W',
      status: 'pending',
      unread_count: 1,
      last_message: 'O produto chegou com defeito',
      last_message_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      messages: [
        { id: 'm4', from: 'buyer', content: 'O produto chegou com defeito, a tomada não encaixa', sent_at: new Date(Date.now() - 2 * 3600000).toISOString() },
      ],
    },
    {
      id: 'demo-3',
      buyer_name: 'Mariana Costa',
      order_id: '5555555555',
      product_name: 'Smart Watch Serie 5',
      status: 'closed',
      unread_count: 0,
      last_message: 'Ok, obrigada pela ajuda!',
      last_message_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      messages: [
        { id: 'm5', from: 'buyer', content: 'Vocês têm o produto em preto?', sent_at: new Date(Date.now() - 26 * 3600000).toISOString() },
        { id: 'm6', from: 'seller', content: 'Sim! Temos em preto, branco e rosé. Pode verificar no anúncio.', sent_at: new Date(Date.now() - 25 * 3600000).toISOString() },
        { id: 'm7', from: 'buyer', content: 'Ok, obrigada pela ajuda!', sent_at: new Date(Date.now() - 24 * 3600000).toISOString() },
      ],
    },
  ]
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function MagaluChatPage() {
  const [data, setData]                   = useState<ChatData | null>(null)
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState<Conversation | null>(null)
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState<string>('all')
  const [sending, setSending]             = useState(false)
  const [draft, setDraft]                 = useState('')
  const messagesEndRef                    = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/magalu/chat/conversations?limit=50')
      const json = await res.json() as ChatData
      setData(json)
    } catch {
      setData({ available: false, items: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.messages])

  const conversations = data?.available
    ? (data.items ?? [])
    : buildDemoConversations()

  const filtered = conversations.filter(c => {
    const matchSearch = !search
      || c.buyer_name.toLowerCase().includes(search.toLowerCase())
      || (c.order_id?.includes(search) ?? false)
      || (c.product_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  async function sendMessage() {
    if (!draft.trim() || !selected || !data?.available) return
    setSending(true)
    try {
      await fetch('/api/magalu/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: selected.id, message: draft }),
      })
      // Optimistically add message
      const newMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        from: 'seller',
        content: draft,
        sent_at: new Date().toISOString(),
      }
      setSelected(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev)
      setDraft('')
    } catch {
      // noop
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#0086FF]" />
      </div>
    )
  }

  // Se a API não estiver disponível e não houver dados reais, mostrar EmptyState
  if (data && !data.available && (!data.items || data.items.length === 0)) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Chat Magalu"
          description="Conversas com clientes via Magalu"
        />
        <EmptyState
          image="connect"
          title="Chat Magalu — em breve"
          description="O módulo de chat com clientes Magalu estará disponível quando o escopo de mensagens for habilitado na sua conta. Abaixo você pode ver uma prévia do layout."
          action={{ label: 'Ver documentação Magalu', href: 'https://developers.magalu.com' }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <PageHeader
          title="Chat Magalu"
          description={`${filtered.length} conversa${filtered.length !== 1 ? 's' : ''}`}
          actions={
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          }
        />

        {!data?.available && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Modo demonstração — API de chat não disponível neste escopo
          </div>
        )}
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — conversation list */}
        <div className="w-80 shrink-0 border-r border-white/5 flex flex-col">
          {/* Search + filters */}
          <div className="p-3 space-y-2 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#0086FF]/50"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['all', 'open', 'pending', 'closed'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    filterStatus === s
                      ? 'bg-[#0086FF] text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {s === 'all' ? 'Todas' : statusOf(s).label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Nenhuma conversa encontrada
              </div>
            ) : (
              filtered.map(conv => {
                const st = statusOf(conv.status)
                const isActive = selected?.id === conv.id
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelected(conv)}
                    className={`w-full text-left p-3 hover:bg-white/5 transition-colors ${
                      isActive ? 'bg-[#0086FF]/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#0086FF]/20 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#0086FF]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{conv.buyer_name}</p>
                          <p className="text-xs text-slate-500 truncate">{conv.last_message}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-slate-500">{formatTime(conv.last_message_at)}</span>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#0086FF] text-white text-xs flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                      {conv.order_id && (
                        <span className="text-[10px] text-slate-500">#{conv.order_id}</span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right panel — chat window */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Selecione uma conversa para visualizar</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0086FF]/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#0086FF]" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">{selected.buyer_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {selected.order_id && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Pedido #{selected.order_id}
                        </span>
                      )}
                      {selected.product_name && (
                        <span className="truncate max-w-[200px]">{selected.product_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusOf(selected.status).bg} ${statusOf(selected.status).text}`}>
                    {statusOf(selected.status).label}
                  </span>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 transition-colors lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.map(msg => {
                  const isSeller = msg.from === 'seller'
                  const isSystem = msg.from === 'system'
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-slate-500">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }
                  return (
                    <div key={msg.id} className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isSeller ? 'order-2' : 'order-1'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isSeller
                            ? 'bg-[#0086FF] text-white rounded-tr-sm'
                            : 'bg-white/10 text-slate-200 rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-slate-500 mt-1 ${isSeller ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.sent_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/5">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder={data?.available ? 'Digite sua mensagem...' : 'Chat somente leitura (modo demo)'}
                    disabled={!data?.available || sending}
                    rows={1}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#0086FF]/50 resize-none disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || !data?.available || sending}
                    className="p-2.5 rounded-xl bg-[#0086FF] text-white hover:bg-[#0070DD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">
                  Enter para enviar · Shift+Enter para nova linha
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
