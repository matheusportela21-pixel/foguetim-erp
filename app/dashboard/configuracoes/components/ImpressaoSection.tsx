'use client'

import { Printer } from 'lucide-react'

export default function ImpressaoSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Impressão
        </h3>
        <p className="text-xs text-slate-600">Configurações de impressão de etiquetas e documentos</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-dark-700 border border-white/[0.06] flex items-center justify-center">
          <Printer className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-400">Em breve</p>
          <p className="text-xs text-slate-600 mt-1 max-w-xs">
            Configurações de impressão de etiquetas, DANFE e outros documentos fiscais estarão disponíveis em breve.
          </p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-900/30 text-amber-400 ring-1 ring-amber-700/30">
          Em desenvolvimento
        </span>
      </div>
    </div>
  )
}
