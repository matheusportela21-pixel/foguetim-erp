'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface BlogFeedbackProps {
  slug: string
}

type FeedbackState = 'idle' | 'loading' | 'done'

export function BlogFeedback({ slug }: BlogFeedbackProps) {
  const [state, setState] = useState<FeedbackState>('idle')
  const [choice, setChoice] = useState<boolean | null>(null)

  async function handleFeedback(helpful: boolean) {
    if (state !== 'idle') return
    setChoice(helpful)
    setState('loading')

    try {
      await fetch(`/api/blog/posts/${slug}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      })
    } catch {
      // best-effort
    } finally {
      setState('done')
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-3 py-4">
        <span className="text-2xl">{choice ? '👍' : '🙏'}</span>
        <p className="text-sm text-slate-400 font-medium">
          {choice
            ? 'Ótimo! Fico feliz que ajudou.'
            : 'Obrigado pelo feedback. Vamos melhorar!'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 py-4">
      <span className="text-sm font-medium text-slate-400">Este artigo foi útil?</span>
      <button
        onClick={() => handleFeedback(true)}
        disabled={state === 'loading'}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:border-green-500/30 hover:text-green-400 hover:bg-green-500/5 transition-colors disabled:opacity-50"
      >
        <ThumbsUp className="w-4 h-4" />
        Sim
      </button>
      <button
        onClick={() => handleFeedback(false)}
        disabled={state === 'loading'}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-50"
      >
        <ThumbsDown className="w-4 h-4" />
        Não
      </button>
    </div>
  )
}
