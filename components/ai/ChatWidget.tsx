'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Minus, ChevronUp, Send } from 'lucide-react'

interface ChatMessage {
  id:        string
  role:      'user' | 'assistant'
  content:   string
  timestamp: Date
}

const QUICK_SUGGESTIONS = [
  'Como posso melhorar meus anúncios?',
  'Dicas para aumentar minhas vendas',
  'Como responder uma reclamação?',
  'Como funciona o Product Ads?',
  'Quais produtos têm mais visibilidade?',
]

function renderContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

export function ChatWidget() {
  const [isOpen,      setIsOpen]      = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [input,       setInput]       = useState('')
  const [messages,    setMessages]    = useState<ChatMessage[]>([
    {
      id:        '1',
      role:      'assistant',
      content:   'Olá! 👋 Sou o **Foguetim AI**. Posso te ajudar com seus anúncios, vendas, métricas e muito mais. O que você quer saber?',
      timestamp: new Date(),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  async function sendMessage(text?: string) {
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
          message: messageText,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json() as { message?: string; limit_reached?: boolean }

      setMessages(prev => [...prev, {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        content:   data.message ?? 'Desculpe, não consegui responder agora.',
        timestamp: new Date(),
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
  }

  function handleOpen() {
    setIsOpen(true)
    setIsMinimized(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2
                   px-4 py-3 bg-indigo-600 hover:bg-indigo-700
                   text-white rounded-full shadow-lg transition-all
                   hover:scale-105 active:scale-95"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-medium">Foguetim AI</span>
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[380px]
                 bg-gray-950 border border-gray-800 rounded-2xl
                 shadow-2xl flex flex-col overflow-hidden
                 transition-all duration-200"
      style={{ height: isMinimized ? 'auto' : '520px' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-indigo-600 cursor-pointer select-none"
        onClick={() => setIsMinimized(v => !v)}
      >
        <Sparkles className="w-5 h-5 text-white shrink-0" />
        <span className="font-medium text-white flex-1 text-sm">Foguetim AI</span>

        <button
          onClick={e => { e.stopPropagation(); setIsMinimized(v => !v) }}
          className="text-white/70 hover:text-white p-0.5 rounded transition-colors"
        >
          {isMinimized
            ? <ChevronUp className="w-4 h-4" />
            : <Minus      className="w-4 h-4" />}
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-100 rounded-bl-sm'}`}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 px-3 py-2.5 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions — só quando só tem a mensagem de boas-vindas */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.slice(0, 3).map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
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
          <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
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
