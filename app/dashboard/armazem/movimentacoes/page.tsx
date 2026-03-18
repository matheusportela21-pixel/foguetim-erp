'use client'

import { ArrowLeftRight, Plus, Search, Filter } from 'lucide-react'
import Header from '@/components/Header'

const MOVEMENT_TYPES = [
  { key: 'entrada_manual',       label: 'Entrada Manual',       color: 'text-emerald-400' },
  { key: 'saida_manual',         label: 'Saída Manual',         color: 'text-red-400'     },
  { key: 'venda',                label: 'Venda',                color: 'text-red-400'     },
  { key: 'ajuste',               label: 'Ajuste',               color: 'text-amber-400'   },
  { key: 'recebimento_nf',       label: 'Recebimento NF-e',     color: 'text-emerald-400' },
  { key: 'transferencia_entrada',label: 'Transferência Entrada', color: 'text-cyan-400'    },
  { key: 'transferencia_saida',  label: 'Transferência Saída',  color: 'text-cyan-400'    },
]

export default function MovimentacoesPage() {
  return (
    <div>
      <Header title="Movimentações" subtitle="Histórico completo de movimentações de estoque" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por produto, SKU..."
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
              disabled
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.04] transition-colors" disabled>
            <Filter className="w-4 h-4" />
            Período
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.04] transition-colors" disabled>
            Tipo
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm ml-auto" disabled>
            <Plus className="w-4 h-4" />
            Nova Movimentação
          </button>
        </div>

        {/* Empty state */}
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <ArrowLeftRight className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhuma movimentação registrada</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-4">
            Toda entrada, saída, ajuste e venda aparecerá aqui com rastreabilidade completa.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {MOVEMENT_TYPES.map(({ key, label, color }) => (
              <span key={key} className={`text-xs px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] ${color}`}>
                {label}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-4">Disponível no Bloco 2</p>
        </div>
      </div>
    </div>
  )
}
