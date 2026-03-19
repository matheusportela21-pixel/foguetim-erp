'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Bug, Lightbulb, MessageSquare, Check, Loader2 } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
export type FeedbackType = 'bug' | 'feature_request' | 'other'

const PAGES = [
  { value: '/dashboard/armazem/movimentacoes', label: 'Movimentações'        },
  { value: '/dashboard/armazem/produtos',      label: 'Produtos Armazém'     },
  { value: '/dashboard/armazem/estoque',       label: 'Estoque'              },
  { value: '/dashboard/armazem/notas',         label: 'Notas de Entrada'     },
  { value: '/dashboard/armazem',               label: 'Visão Geral Armazém'  },
  { value: '/dashboard/produtos-ml',           label: 'Produtos ML'          },
  { value: '/dashboard/precificacao',          label: 'Precificação'         },
  { value: '/dashboard/financeiro',            label: 'Financeiro'           },
  { value: '/dashboard/integracoes',           label: 'Integrações'          },
  { value: '/dashboard/configuracoes',         label: 'Configurações'        },
  { value: '/dashboard/ajuda',                 label: 'Central de Ajuda'     },
  { value: '/dashboard/listagens',             label: 'Listagens'            },
  { value: '/dashboard',                       label: 'Dashboard'            },
  { value: 'other',                            label: 'Outro / Geral'        },
]

const TYPE_CFG = {
  bug: {
    label:       'Bug / Erro',
    icon:        Bug,
    activeCls:   'text-red-400 border-red-500/40 bg-red-500/10',
    placeholder: 'Descreva o que aconteceu, o que você esperava e como reproduzir o problema...',
    category:    'bug',
    priority:    'high',
  },
  feature_request: {
    label:       'Sugestão',
    icon:        Lightbulb,
    activeCls:   'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    placeholder: 'Conte sua ideia! O que tornaria o Foguetim mais útil para a sua operação?',
    category:    'feature_request',
    priority:    'medium',
  },
  other: {
    label:       'Outro',
    icon:        MessageSquare,
    activeCls:   'text-blue-400 border-blue-500/40 bg-blue-500/10',
    placeholder: 'Elogio, dúvida, ou qualquer coisa que queira compartilhar...',
    category:    'other',
    priority:    'low',
  },
} satisfies Record<FeedbackType, { label: string; icon: React.ElementType; activeCls: string; placeholder: string; category: string; priority: string }>

/* ── Props ───────────────────────────────────────────────────────────────── */
interface FeedbackModalProps {
  onClose:      () => void
  defaultType?: FeedbackType
}

/* ── Component ───────────────────────────────────────────────────────────── */
export function FeedbackModal({ onClose, defaultType = 'bug' }: FeedbackModalProps) {
  const pathname = usePathname()

  const [type, setType]               = useState<FeedbackType>(defaultType)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)

  // Best-match page from current pathname (PAGES sorted most-specific first)
  const [page, setPage] = useState<string>(() => {
    const match = PAGES.find(p => p.value !== 'other' && pathname?.startsWith(p.value))
    return match?.value ?? 'other'
  })

  const cfg = TYPE_CFG[type]

  async function handleSubmit() {
    if (!description.trim()) return
    setSubmitting(true)
    try {
      const pageLabel = PAGES.find(p => p.value === page)?.label ?? page
      const res = await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, page: pageLabel, description: description.trim() }),
      })
      if (res.ok) setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">

        {done ? (
          /* ── Success ─────────────────────────────────────────────────────── */
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 ring-4 ring-green-500/10">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Obrigado pelo feedback!
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Recebemos sua mensagem. Cada opinião ajuda a tornar o Foguetim melhor.
            </p>
            <button onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors">
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                Enviar Feedback
              </h3>
              <button onClick={onClose} className="p-1 text-slate-600 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/[0.04]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type pills */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Tipo</p>
                <div className="flex gap-2">
                  {(Object.keys(TYPE_CFG) as FeedbackType[]).map(t => {
                    const c    = TYPE_CFG[t]
                    const Icon = c.icon
                    const active = type === t
                    return (
                      <button key={t} onClick={() => setType(t)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? c.activeCls : 'text-slate-500 border-white/[0.06] bg-transparent hover:border-white/10 hover:text-slate-400'}`}>
                        <Icon className="w-3 h-3" />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Page */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Página / Módulo</label>
                <select value={page} onChange={e => setPage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-600/40">
                  {PAGES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Descrição *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder={cfg.placeholder}
                  className="w-full px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-600/40 resize-none"
                />
                <p className="text-[10px] text-slate-700 mt-1 text-right">{description.length} / 1000</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] transition-all">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!description.trim() || submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all disabled:opacity-50">
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <cfg.icon className="w-4 h-4" />}
                {submitting ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
