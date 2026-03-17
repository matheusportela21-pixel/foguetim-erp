'use client'

import { Download } from 'lucide-react'

interface ExportCSVButtonProps {
  data: Record<string, unknown>[]
  filename: string
  columns?: { key: string; label: string }[]
  className?: string
}

export default function ExportCSVButton({ data, filename, columns, className = '' }: ExportCSVButtonProps) {
  function handleExport() {
    if (!data.length) return

    const cols = columns ?? Object.keys(data[0]).map(k => ({ key: k, label: k }))
    const header = cols.map(c => `"${c.label}"`).join(',')
    const rows = data.map(row =>
      cols.map(c => {
        const val = row[c.key]
        const s = val == null ? '' : String(val)
        return `"${s.replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = '\uFEFF' + [header, ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={!data.length}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <Download className="w-3.5 h-3.5" />
      Exportar CSV
    </button>
  )
}
