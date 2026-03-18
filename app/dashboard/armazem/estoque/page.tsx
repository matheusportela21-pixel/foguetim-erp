'use client'

import { Layers, Plus, Search, Filter, AlertTriangle } from 'lucide-react'
import Header from '@/components/Header'

export default function ArmazemEstoquePage() {
  return (
    <div>
      <Header title="Estoque" subtitle="Posição de estoque por produto e armazém" />

      <div className="p-6 space-y-4">
        {/* KPI row placeholder */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['Total de SKUs', 'Abaixo do mínimo', 'Sem estoque', 'Em trânsito'].map(label => (
            <div key={label} className="glass-card p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-2xl font-bold text-slate-300">—</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar produto, SKU..."
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
              disabled
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.04] transition-colors" disabled>
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm ml-auto" disabled>
            <Plus className="w-4 h-4" />
            Ajuste Manual
          </button>
        </div>

        {/* Empty state */}
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <Layers className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhum estoque registrado</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-2">
            Cadastre produtos e realize entradas para ver a posição do estoque aqui.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-amber-500/80 mt-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            Disponível no Bloco 2
          </div>
        </div>
      </div>
    </div>
  )
}
