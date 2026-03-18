'use client'

import { useState, useEffect } from 'react'
import { Printer, FileText, Zap, Check, Loader2 } from 'lucide-react'

interface PrintPrefs {
  format:      'pdf' | 'zpl2'
  label_size:  string
  auto_print:  boolean
}

const DEFAULTS: PrintPrefs = {
  format:     'pdf',
  label_size: '100x150',
  auto_print: false,
}

const LABEL_SIZES = [
  { value: '100x150', label: '100 × 150 mm (padrão ML / Correios)' },
  { value: '100x100', label: '100 × 100 mm' },
  { value: '10x15',   label: '10 × 15 cm' },
  { value: 'a4',      label: 'A4 (210 × 297 mm)' },
]

export default function ImpressaoSection() {
  const [prefs, setPrefs]     = useState<PrintPrefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/print-prefs')
      .then(r => r.json())
      .then(d => { if (d.print_prefs) setPrefs(d.print_prefs) })
      .catch(() => {/* usa defaults */})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/user/print-prefs', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(prefs),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro ao salvar')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-slate-600 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Impressão
        </h3>
        <p className="text-xs text-slate-600">Configurações de impressão de etiquetas e documentos</p>
      </div>

      {/* Formato */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Formato de etiqueta
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'pdf',  icon: FileText, label: 'PDF',       desc: 'Impressora comum ou laser' },
            { value: 'zpl2', icon: Zap,      label: 'ZPL2 (Zebra)', desc: 'Impressora térmica Zebra' },
          ].map(opt => {
            const active = prefs.format === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setPrefs(p => ({ ...p, format: opt.value as PrintPrefs['format'] }))}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-white/[0.06] bg-dark-700/50 hover:bg-white/[0.04]'
                }`}
              >
                <opt.icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-purple-400' : 'text-slate-500'}`} />
                <div>
                  <p className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{opt.label}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{opt.desc}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 text-purple-400 ml-auto shrink-0 mt-0.5" />}
              </button>
            )
          })}
        </div>

        {prefs.format === 'zpl2' && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              O Mercado Livre entrega ZPL2 em um arquivo ZIP contendo o código ZPL e o PDF PLP.
              O download será um arquivo <code className="font-mono text-amber-300">.zip</code>.
            </p>
          </div>
        )}
      </div>

      {/* Tamanho */}
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Tamanho da etiqueta
        </label>
        <select
          value={prefs.label_size}
          onChange={e => setPrefs(p => ({ ...p, label_size: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
        >
          {LABEL_SIZES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-slate-600 mt-1">
          O Mercado Livre gera etiquetas em formato padrão — esta preferência é usada para pré-configurar sua impressora.
        </p>
      </div>

      {/* Auto-print */}
      <div className="flex items-center justify-between py-3 border-t border-white/[0.04]">
        <div>
          <p className="text-xs font-semibold text-slate-300">Impressão automática</p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Abre o diálogo de impressão automaticamente ao baixar a etiqueta
          </p>
        </div>
        <button
          onClick={() => setPrefs(p => ({ ...p, auto_print: !p.auto_print }))}
          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
            prefs.auto_print ? 'bg-purple-600' : 'bg-dark-600 border border-white/[0.08]'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
            prefs.auto_print ? 'left-5' : 'left-1'
          }`} />
        </button>
      </div>

      {/* Save */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
          saved
            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
            : 'bg-purple-600 hover:bg-purple-500 text-white'
        } disabled:opacity-50`}
      >
        {saving ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
        ) : saved ? (
          <><Check className="w-3.5 h-3.5" /> Salvo</>
        ) : (
          <><Printer className="w-3.5 h-3.5" /> Salvar preferências</>
        )}
      </button>
    </div>
  )
}
