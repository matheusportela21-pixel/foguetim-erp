'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Minus, ChevronUp, Send, ThumbsUp, ThumbsDown, Rocket } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface ChatMessage {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  timestamp: Date
  feedback?: 'up' | 'down' | null
}

const QUICK_SUGGESTIONS = [
  'Como conectar o Mercado Livre?',
  'Como funciona a precificação?',
  'Quais são os planos?',
  'Como imprimir etiquetas?',
  'Reportar um problema',
]

function renderMarkdown(content: string): string {
  return content
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Links markdown [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-400 underline">$1</a>')
    // Internal links /dashboard/xxx → link
    .replace(/\[([^\]]+)\]\((\/[^\)]+)\)/g, '<a href="$2" class="text-indigo-400 underline">$1</a>')
    // Numbered lists: lines starting with "1." "2." etc
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-3">$2</li>')
    // Bullet lists: lines starting with "- " or "• "
    .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/gm, (match) => `<ul class="space-y-0.5 my-1">${match}</ul>`)
    // Line breaks
    .replace(/\n/g, '<br/>')
}

export function ChatWidget() {
  const pathname = usePathname()

  const [isOpen,      setIsOpen]      = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [input,       setInput]       = useState('')
  const [messages,    setMessages]    = useState<ChatMessage[]>([
    {
      id:        '1',
      role:      'assistant',
      content:   'Oi! 👋 Sou o **Foguetim AI**. Posso te ajudar com dúvidas sobre o sistema, dicas de e-commerce e tudo sobre o Mercado Livre. O que precisa?',
      timestamp: new Date(),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  // Detectar módulo atual pela URL
  const moduloAtual = pathname?.split('/').filter(Boolean).slice(-1)[0] ?? 'dashboard'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim()
    if (!messageText || isLoading) return

    setInput('')
    setIsLoading(true)

    const userMsg: ChatMessage = {
      id:        Date.now().toString(),
      role:      'user',
      content:   messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:     messageText,
          history:     messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          moduloAtual,
        }),
      })

      const data = await res.json() as { message?: string; limit_reached?: boolean }

      setMessages(prev => [...prev, {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        content:   data.message ?? 'Desculpe, não consegui responder agora.',
        timestamp: new Date(),
        feedback:  null,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        content:   '❌ Erro ao conectar. Tente novamente.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, moduloAtual])

  function setFeedback(id: string, feedback: 'up' | 'down') {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback } : m))
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false) }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2
                   px-3 py-2.5 md:px-4 md:py-3 bg-indigo-600 hover:bg-indigo-700
                   text-white rounded-full shadow-lg transition-all
                   hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
        <span className="text-xs md:text-sm font-medium">Foguetim AI</span>
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[380px]
                 bg-gray-950 border border-gray-800 rounded-2xl
                 shadow-2xl flex flex-col overflow-hidden
                 transition-all duration-200"
      style={{ height: isMinimized ? 'auto' : '540px' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 bg-indigo-600 cursor-pointer select-none shrink-0"
        onClick={() => setIsMinimized(v => !v)}
      >
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Rocket className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-none">Foguetim AI</p>
          <p className="text-white/60 text-[11px] mt-0.5">Sempre online • responde em segundos</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setIsMinimized(v => !v) }}
          className="text-white/70 hover:text-white p-0.5 rounded transition-colors"
        >
          {isMinimized ? <ChevronUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setIsOpen(false) }}
          className="text-white/70 hover:text-white p-0.5 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map(msg => (
              <div key={msg.id}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-1.5`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 mb-0.5">
                      <Rocket className="w-3 h-3 text-indigo-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-gray-800 text-gray-100 rounded-bl-sm'}`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                </div>
                {/* Feedback após respostas do assistente */}
                {msg.role === 'assistant' && msg.id !== '1' && (
                  <div className="flex items-center gap-1 mt-1 ml-8">
                    <span className="text-[10px] text-gray-600">Útil?</span>
                    <button
                      onClick={() => setFeedback(msg.id, 'up')}
                      className={`p-0.5 rounded transition-colors ${msg.feedback === 'up' ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setFeedback(msg.id, 'down')}
                      className={`p-0.5 rounded transition-colors ${msg.feedback === 'down' ? 'text-red-400' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Rocket className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="bg-gray-800 px-3 py-2.5 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                           style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions — só na boas-vindas */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_SUGGESTIONS.slice(0, 4).map(s => (
                <button
                  key={s}
                  onClick={() => void sendMessage(s)}
                  className="text-xs bg-gray-800 hover:bg-gray-700
                             text-gray-300 px-2.5 py-1.5 rounded-lg border
                             border-gray-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-800 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder="Pergunte algo..."
              disabled={isLoading}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg
                         px-3 py-2 text-sm text-white placeholder-gray-500
                         focus:outline-none focus:border-indigo-500
                         disabled:opacity-50 transition-colors"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40
                         text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
