'use client'

import { useState, useEffect } from 'react'
import { Monitor, X } from 'lucide-react'

const STORAGE_KEY = 'foguetim_mobile_warning_dismissed'

export default function MobileWarning() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY)
      if (!dismissed) setVisible(true)
    } catch { /* SSR safety */ }
  }, [])

  const dismiss = () => {
    try { sessionStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="md:hidden flex items-start gap-3 mx-4 mt-4 px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-700/30">
      <Monitor className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
      <p className="text-slate-400 flex-1 text-xs leading-relaxed">
        <span className="font-semibold text-slate-300">💻 Melhor no desktop.</span>{' '}
        Algumas funcionalidades desta página são mais completas na versão para computador.
      </p>
      <button
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
