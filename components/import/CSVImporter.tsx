'use client'

import { useState, useRef, useCallback, DragEvent } from 'react'
import {
  Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2,
  Loader2, X, AlertTriangle,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ColumnDef {
  key:      string
  label:    string
  required: boolean
}

interface ImportResult {
  success: number
  errors:  string[]
}

interface Props {
  templateColumns:  ColumnDef[]
  templateFilename: string
  onImport:         (rows: Record<string, string>[]) => Promise<ImportResult>
  onClose:          () => void
}

// ─── CSV Parsing ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  // Detect delimiter (semicolon or comma)
  const firstLine = text.split('\n')[0] ?? ''
  const delimiter = firstLine.includes(';') ? ';' : ','

  const rows: string[][] = []
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current.trim())
    rows.push(cells)
  }

  return rows
}

function generateTemplate(columns: ColumnDef[], filename: string) {
  const header = columns.map(c => c.label).join(';')
  const example = columns.map(c => {
    if (c.key === 'name') return 'Produto Exemplo'
    if (c.key === 'sku') return 'SKU-001'
    if (c.key === 'ean') return '7891234567890'
    if (c.key === 'cost') return '25.90'
    if (c.key === 'price') return '49.90'
    if (c.key === 'stock') return '100'
    if (c.key === 'category') return 'Acessorios'
    return ''
  }).join(';')

  const csv = `${header}\n${example}\n`
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function CSVImporter({ templateColumns, templateFilename, onImport, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile]             = useState<File | null>(null)
  const [rows, setRows]             = useState<Record<string, string>[]>([])
  const [headers, setHeaders]       = useState<string[]>([])
  const [mapping, setMapping]       = useState<Record<string, string>>({})
  const [dragOver, setDragOver]     = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting]   = useState(false)
  const [result, setResult]         = useState<ImportResult | null>(null)

  // ── Validation ────────────────────────────────────────────────────────────────

  const validationSummary = useCallback(() => {
    if (rows.length === 0) return null

    const requiredKeys = templateColumns.filter(c => c.required).map(c => c.key)
    let valid = 0
    let missingRequired = 0
    const skus = new Set<string>()
    let duplicates = 0

    for (const row of rows) {
      const hasMissing = requiredKeys.some(k => {
        const colHeader = Object.entries(mapping).find(([, v]) => v === k)?.[0]
        return !colHeader || !row[colHeader]?.trim()
      })
      if (hasMissing) {
        missingRequired++
        continue
      }

      const skuCol = Object.entries(mapping).find(([, v]) => v === 'sku')?.[0]
      const sku = skuCol ? row[skuCol]?.trim() : ''
      if (sku && skus.has(sku)) {
        duplicates++
      } else if (sku) {
        skus.add(sku)
      }
      valid++
    }

    return { valid, missingRequired, duplicates, total: rows.length }
  }, [rows, mapping, templateColumns])

  // ── File handling ─────────────────────────────────────────────────────────────

  function handleFile(f: File) {
    setFile(f)
    setParseError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseCSV(text)
        if (parsed.length < 2) {
          setParseError('Arquivo vazio ou sem dados alem do cabecalho.')
          return
        }

        const hdrs = parsed[0]
        setHeaders(hdrs)

        // Auto-map columns by matching labels
        const autoMap: Record<string, string> = {}
        for (const col of templateColumns) {
          const match = hdrs.find(h =>
            h.toLowerCase() === col.label.toLowerCase() ||
            h.toLowerCase() === col.key.toLowerCase()
          )
          if (match) autoMap[match] = col.key
        }
        setMapping(autoMap)

        // Parse data rows
        const dataRows = parsed.slice(1).map(cells => {
          const obj: Record<string, string> = {}
          hdrs.forEach((h, i) => { obj[h] = cells[i] ?? '' })
          return obj
        })
        setRows(dataRows)
      } catch {
        setParseError('Erro ao processar o arquivo CSV.')
      }
    }
    reader.readAsText(f, 'UTF-8')
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
      handleFile(f)
    } else {
      setParseError('Selecione um arquivo .csv')
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────────

  async function handleImport() {
    setImporting(true)
    setResult(null)

    // Map rows to template keys
    const mapped = rows.map(row => {
      const obj: Record<string, string> = {}
      for (const [header, key] of Object.entries(mapping)) {
        obj[key] = row[header] ?? ''
      }
      return obj
    }).filter(row => {
      // Filter out rows missing all required fields
      const requiredKeys = templateColumns.filter(c => c.required).map(c => c.key)
      return requiredKeys.every(k => row[k]?.trim())
    })

    try {
      const res = await onImport(mapped)
      setResult(res)
    } catch {
      setResult({ success: 0, errors: ['Erro inesperado ao importar'] })
    } finally {
      setImporting(false)
    }
  }

  const summary = validationSummary()
  const canImport = summary && summary.valid > 0 && !importing && !result

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-[#0f1117] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-600/20 border border-green-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="text-base font-bold text-slate-100" style={{ fontFamily: 'Sora, sans-serif' }}>
              Importar CSV
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Download template */}
          <button
            onClick={() => generateTemplate(templateColumns, templateFilename)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] text-sm text-slate-400 hover:text-slate-200 hover:border-purple-500/30 hover:bg-white/[0.03] transition-all"
          >
            <Download className="w-4 h-4" />
            Baixar template CSV
          </button>

          {/* Drop zone */}
          {!file && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                dragOver
                  ? 'border-purple-500/50 bg-purple-500/5'
                  : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]'
              }`}
            >
              <Upload className="w-8 h-8 text-slate-600" />
              <div className="text-center">
                <p className="text-sm text-slate-300 font-medium">Arraste o arquivo CSV aqui</p>
                <p className="text-xs text-slate-600 mt-1">ou clique para selecionar</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{parseError}</p>
            </div>
          )}

          {/* File loaded */}
          {file && rows.length > 0 && !result && (
            <>
              {/* File info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-300">{file.name}</span>
                  <span className="text-xs text-slate-600">({rows.length} linhas)</span>
                </div>
                <button
                  onClick={() => { setFile(null); setRows([]); setHeaders([]); setMapping({}) }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Column mapping */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Mapeamento de Colunas
                </h4>
                <div className="space-y-2">
                  {templateColumns.map(col => (
                    <div key={col.key} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-28 shrink-0">
                        {col.label}
                        {col.required && <span className="text-red-400 ml-0.5">*</span>}
                      </span>
                      <select
                        className="input-cyber flex-1 px-3 py-1.5 text-xs rounded-lg"
                        value={Object.entries(mapping).find(([, v]) => v === col.key)?.[0] ?? ''}
                        onChange={e => {
                          const newMap = { ...mapping }
                          // Remove old mapping for this key
                          for (const [k, v] of Object.entries(newMap)) {
                            if (v === col.key) delete newMap[k]
                          }
                          if (e.target.value) {
                            newMap[e.target.value] = col.key
                          }
                          setMapping(newMap)
                        }}
                      >
                        <option value="">-- Selecionar coluna --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Pre-visualizacao (primeiras 5 linhas)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        {templateColumns.map(col => {
                          const colHeader = Object.entries(mapping).find(([, v]) => v === col.key)?.[0]
                          return (
                            <th key={col.key} className="px-3 py-2 text-left text-slate-500 font-semibold">
                              {col.label}
                              {!colHeader && col.required && (
                                <AlertTriangle className="w-3 h-3 text-amber-400 inline ml-1" />
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          {templateColumns.map(col => {
                            const colHeader = Object.entries(mapping).find(([, v]) => v === col.key)?.[0]
                            const val = colHeader ? row[colHeader] ?? '' : ''
                            return (
                              <td key={col.key} className="px-3 py-2 text-slate-300">
                                {val || <span className="text-slate-700">-</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation summary */}
              {summary && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs text-green-400 font-semibold">{summary.valid} validos</span>
                  </div>
                  {summary.duplicates > 0 && (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-amber-400 font-semibold">{summary.duplicates} duplicados (atualizar)</span>
                    </div>
                  )}
                  {summary.missingRequired > 0 && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs text-red-400 font-semibold">{summary.missingRequired} com erros</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Import result */}
          {result && (
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border ${
                result.errors.length === 0
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.errors.length === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                  <span className="text-sm font-bold text-white">
                    {result.success} produto{result.success !== 1 ? 's' : ''} importado{result.success !== 1 ? 's' : ''}
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <div className="space-y-1 mt-3">
                    <p className="text-xs text-red-400 font-semibold">Erros:</p>
                    {result.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-xs text-red-300/80 pl-2">{err}</p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-xs text-slate-500 pl-2">...e mais {result.errors.length - 10} erros</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
          >
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!canImport}
              className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importar {summary?.valid ?? 0} produtos
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
