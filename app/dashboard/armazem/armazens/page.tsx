'use client'

import { Building2, Plus, Pencil, Star } from 'lucide-react'
import Header from '@/components/Header'

export default function ArmazensPage() {
  return (
    <div>
      <Header title="Armazéns" subtitle="Gerencie seus centros de distribuição" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Cada armazém tem seu próprio estoque, localizações e histórico de movimentações.
          </p>
          <button className="btn-primary flex items-center gap-2 text-sm" disabled>
            <Plus className="w-4 h-4" />
            Novo Armazém
          </button>
        </div>

        {/* Placeholder card — armazém Principal */}
        <div className="glass-card p-5 flex items-center gap-4 opacity-60">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-200">Principal</p>
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40">
                <Star className="w-2.5 h-2.5" /> Padrão
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Código: PRINC · Ativo</p>
          </div>
          <button className="p-2 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all" disabled>
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 text-center pt-2">Gestão completa disponível no Bloco 2</p>
      </div>
    </div>
  )
}
