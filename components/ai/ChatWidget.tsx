'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, Minus, ChevronUp, Send, ThumbsUp, ThumbsDown, Rocket, Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import DOMPurify from 'dompurify'
import { motion, AnimatePresence } from 'framer-motion'

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
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-violet-400 underline">$1</a>')
    .replace(/\[([^\]]+)\]\((\/[^\)]+)\)/g, '<a href="$2" class="text-violet-400 underline">$1</a>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-3">$2</li>')
    .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/gm, (match) => `<ul class="space-y-0.5 my-1">${match}</ul>`)
    .replace(/\n/g, '<br/>')
}

/* ── Timm Avatar ─────────────────────────────────────────────────── */
function TimmAvatar({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const [imgErr, setImgErr] = useState(false)
  const dim = size === 'lg' ? 48 : size === 'md' ? 36 : 24

  if (!imgErr) {
    return (
      <Image
        src="/mascot/timm-standing.png"
        alt="Timm"
        width={dim}
        height={dim}
        className="object-contain drop-shadow-lg"
        onError={() => setImgErr(true)}
      />
    )
  }
  // Fallback rocket icon
  return (
    <div
      className={`rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0`}
      style={{ width: dim, height: dim }}
    >
      <Rocket className="text-primary-400" style={{ width: dim * 0.5, height: dim * 0.5 }} />
    </div>
  )
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
      content:   'Oi! 👋 Sou o **Timm**, seu assistente Foguetim. Posso te ajudar com dúvidas sobre o sistema, dicas de e-commerce e tudo sobre o Mercado Livre. O que precisa?',
      timestamp: new Date(),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

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

  /* ── Floating button ─────────────────────────────────────────── */
  if (!isOpen) {
    return (
      <motion.button
        onClick={() => { setIsOpen(true); setIsMinimized(false) }}
        className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50
                   flex items-center gap-2.5 pr-4 pl-2 py-2
                   bg-gradient-to-r from-primary-600 to-primary-500
                   text-white rounded-full shadow-xl
                   border border-primary-400/30"
        whileHover={{ scale: 1.05, boxShadow: '0 0 28px rgba(124,58,237,0.5)' }}
        whileTap={{ scale: 0.96 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        {/* Timm mini avatar */}
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center overflow-hidden shrink-0">
          <TimmAvatar size="sm" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-xs font-semibold">Timm AI</span>
          <span className="text-[10px] text-white/60 mt-0.5">Pergunte algo</span>
        </div>
      </motion.button>
    )
  }

  /* ── Chat panel ──────────────────────────────────────────────── */
  return (
    <motion.div
      className={`fixed z-50
                 inset-0 md:inset-auto
                 md:bottom-6 md:right-6
                 md:w-[400px] md:rounded-2xl
                 bg-space-800 md:border md:border-white/[0.08]
                 shadow-2xl flex flex-col overflow-hidden
                 ${isMinimized ? '' : 'md:h-[550px]'}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3
                   bg-gradient-to-r from-primary-700 to-primary-600
                   cursor-pointer select-none shrink-0"
        onClick={() => setIsMinimized(v => !v)}
      >
        {/* Timm avatar */}
        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
          <TimmAvatar size="md" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-none font-display">Timm</p>
          <p className="text-white/60 text-[11px] mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block animate-pulse" />
            Sempre online • responde em segundos
          </p>
        </div>

        <button
          onClick={e => { e.stopPropagation(); setIsMinimized(v => !v) }}
          className="text-white/60 hover:text-white p-1 rounded transition-colors"
        >
          {isMinimized ? <ChevronUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setIsOpen(false) }}
          className="text-white/60 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            className="flex flex-col flex-1 min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* ── Messages ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map(msg => (
                <div key={msg.id}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-1.5`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0 mb-0.5 overflow-hidden">
                        <TimmAvatar size="sm" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-primary-600 text-white rounded-br-sm'
                          : 'bg-space-700 text-slate-100 rounded-bl-sm border border-white/[0.06]'}`}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(msg.content)) }}
                    />
                  </div>
                  {/* Feedback */}
                  {msg.role === 'assistant' && msg.id !== '1' && (
                    <div className="flex items-center gap-1 mt-1 ml-8">
                      <span className="text-[10px] text-slate-600">Útil?</span>
                      <button
                        onClick={() => setFeedback(msg.id, 'up')}
                        className={`p-0.5 rounded transition-colors ${msg.feedback === 'up' ? 'text-green-400' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setFeedback(msg.id, 'down')}
                        className={`p-0.5 rounded transition-colors ${msg.feedback === 'down' ? 'text-red-400' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                    <TimmAvatar size="sm" />
                  </div>
                  <div className="bg-space-700 border border-white/[0.06] px-3 py-2.5 rounded-xl rounded-bl-sm">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"
                             style={{ animationDelay: `${i * 0.12}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick suggestions ───────────────────────────────── */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_SUGGESTIONS.slice(0, 4).map(s => (
                  <button
                    key={s}
                    onClick={() => void sendMessage(s)}
                    className="text-xs bg-space-700 hover:bg-space-600
                               text-slate-300 hover:text-white
                               px-2.5 py-1.5 rounded-lg border border-white/[0.06]
                               hover:border-primary-500/40 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input ───────────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2 shrink-0">
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
                className="flex-1 bg-space-700 border border-white/[0.08] rounded-xl
                           px-3 py-2 text-sm text-white placeholder-slate-500
                           focus:outline-none focus:border-primary-500/60
                           disabled:opacity-50 transition-colors"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40
                           text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
