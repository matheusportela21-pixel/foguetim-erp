'use client'

import { useState, useEffect } from 'react'
import { X, Bug, Lightbulb, Rocket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FeedbackModal, type FeedbackType } from './FeedbackModal'

const BANNER_KEY = 'foguetim_devbanner_v2'

export function DevBanner() {
  const [visible, setVisible]           = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null)

  useEffect(() => {
    if (!localStorage.getItem(BANNER_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem(BANNER_KEY, '1')
    setVisible(false)
  }

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25 }}
            className="mb-4 rounded-xl border border-primary-500/20 bg-primary-900/30 backdrop-blur-sm px-4 py-3 flex items-center gap-3"
          >
            <Rocket className="w-4 h-4 text-primary-400 shrink-0" />
            <p className="text-xs text-primary-200/80 flex-1 leading-relaxed">
              <span className="font-semibold text-primary-200">Foguetim está em desenvolvimento ativo.</span>
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-accent-400 border border-accent-500/20 bg-accent-500/10 hover:bg-accent-500/20 transition-colors"
              >
                <Lightbulb className="w-3 h-3" /> Ideia
              </button>
              <button onClick={dismiss}
                className="p-1 text-slate-600 hover:text-slate-400 transition-colors rounded-md hover:bg-white/[0.04]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {feedbackType && (
        <FeedbackModal defaultType={feedbackType} onClose={() => setFeedbackType(null)} />
      )}
    </>
  )
}
