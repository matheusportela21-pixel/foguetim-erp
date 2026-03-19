'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackModal } from './FeedbackModal'

export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Enviar feedback"
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 flex items-center gap-2 px-3 py-2.5 rounded-full bg-[#111318] border border-white/[0.10] text-slate-400 hover:text-slate-200 hover:border-white/20 shadow-lg transition-all hover:shadow-violet-900/20 hover:bg-[#161b27]"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:block">Feedback</span>
      </button>

      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}
