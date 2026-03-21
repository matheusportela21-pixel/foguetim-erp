'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Minus, ChevronUp, Send, Rocket } from 'lucide-react'

interface ChatMessage {
  id:      string
  role:    'user' | 'assistant'
  content: string
}

const QUICK_SUGGESTIONS = [
  'O que é o Foguetim?',
  'Quais são os planos e preços?',
  'Como funciona a integração ML?',
  'Tem versão gratuita?',
]

function renderMarkdown(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-3">$2</li>')
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/gm, (match) => `<ul class="space-y-0.5 my-1">${match}</ul>`)
    .replace(/\n/g, '<br/>')
}

export function PublicChatWidget() {
  const [isOpen,      setIsOpen]      = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [input,       setInput]       = useState('')
  const [messages,    setMessages]    = useState<ChatMessage[]>([
    {
      id:      '1',
      role:    'assistant',
      content: 'Olá! 👋 Sou o **Foguetim AI**. Pode me perguntar sobre funcionalidades, planos, como o Foguetim funciona — e muito mais!',
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, isMinimized])

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim()
    if (!messageText || isLoading) return

    setInput('')
    setIsLoading(true)

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: messageText }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await fetch('/api/ai/public-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: messageText,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json() as { message?: string }
      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: data.message ?? 'Desculpe, não consegui responder agora.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: '❌ Erro ao conectar. Tente novamente ou acesse nossa [Central de Ajuda](/ajuda).',
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false) }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2
                   px-3 py-2.5 md:px-4 md:py-3 bg-violet-600 hover:bg-violet-700
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
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[360px]
                 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden
                 transition-all duration-200"
      style={{ height: isMinimized ? 'auto' : '500px' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 bg-violet-600 cursor-pointer select-none shrink-0"
        onClick={() => setIsMinimized(v => !v)}
      >
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Rocket className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-none">Foguetim AI</p>
          <p className="text-white/60 text-[11px] mt-0.5">Tire suas dúvidas agora</p>
        </div>
        <button onClick={e => { e.stopPropagation(); setIsMinimized(v => !v) }}
                className="text-white/70 hover:text-white p-0.5 rounded transition-colors">
          {isMinimized ? <ChevronUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
        <button onClick={e => { e.stopPropagation(); setIsOpen(false) }}
                className="text-white/70 hover:text-white p-0.5 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-1.5`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0 mb-0.5">
                    <Rocket className="w-3 h-3 text-violet-600" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'}`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                  <Rocket className="w-3 h-3 text-violet-600" />
                </div>
                <div className="bg-white border border-gray-200 px-3 py-2.5 rounded-xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                           style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-gray-50 border-t border-gray-100 pt-2 shrink-0">
              {QUICK_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => void sendMessage(s)}
                        className="text-xs bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-300
                                   text-gray-600 hover:text-violet-700 px-2.5 py-1.5 rounded-lg transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }}
              placeholder="Pergunte sobre o Foguetim..."
              disabled={isLoading}
              className="flex-1 bg-gray-100 border border-transparent rounded-lg px-3 py-2
                         text-sm text-gray-900 placeholder-gray-400
                         focus:outline-none focus:bg-white focus:border-violet-400
                         disabled:opacity-50 transition-colors"
            />
            <button onClick={() => void sendMessage()} disabled={!input.trim() || isLoading}
                    className="p-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
