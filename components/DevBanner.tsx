'use client'

import { useState, useEffect } from 'react'
import { X, Bug, Lightbulb, Rocket } from 'lucide-react'
import { FeedbackModal, type FeedbackType } from './FeedbackModal'

const BANNER_KEY = 'foguetim_devbanner_v1'

export function DevBanner() {
  const [visible, setVisible]           = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null)

  useEffect(() => {
    if (!sessionStorage.getItem(BANNER_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem(BANNER_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <div className="mx-4 sm:mx-6 mt-5 mb-0 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 flex items-center gap-3">
        <Rocket className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300/80 flex-1 leading-relaxed">
          <span className="font-semibold text-amber-300">Foguetim está em desenvolvimento ativo.</span>
          {' '}Encontrou algo estranho ou tem uma ideia?
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setFeedbackType('bug')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            <Bug className="w-3 h-3" /> Bug
          </button>
          <button
            onClick={() => setFeedbackType('feature_request')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-yellow-400 border border-yellow-500/20 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
          >
            <Lightbulb className="w-3 h-3" /> Ideia
          </button>
          <button onClick={dismiss}
            className="p-1 text-slate-600 hover:text-slate-400 transition-colors rounded-md hover:bg-white/[0.04]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {feedbackType && (
        <FeedbackModal defaultType={feedbackType} onClose={() => setFeedbackType(null)} />
      )}
    </>
  )
}
