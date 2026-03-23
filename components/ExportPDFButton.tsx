'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'

interface ExportPDFButtonProps {
  onExport: () => Promise<void>
  label?: string
  className?: string
}

export default function ExportPDFButton({
  onExport,
  label = 'Exportar PDF',
  className = '',
}: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      await onExport()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        bg-purple-600/20 text-purple-300 border border-purple-600/30
        hover:bg-purple-600/30 hover:text-purple-200 transition-all
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Gerando...</>
        : <><FileDown className="w-3.5 h-3.5" />{label}</>
      }
    </button>
  )
}
