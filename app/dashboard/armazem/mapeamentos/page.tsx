'use client'

import { Link2, Plus, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import Header from '@/components/Header'

const STATUS_INFO = [
  { key: 'unmapped',  label: 'Não mapeado', color: 'text-slate-400',   bg: 'bg-slate-900/40',   icon: Clock        },
  { key: 'partial',   label: 'Parcial',      color: 'text-amber-400',  bg: 'bg-amber-900/40',   icon: AlertCircle  },
  { key: 'mapped',    label: 'Mapeado',      color: 'text-emerald-400', bg: 'bg-emerald-900/40', icon: CheckCircle2 },
  { key: 'conflict',  label: 'Conflito',     color: 'text-red-400',    bg: 'bg-red-900/40',     icon: AlertCircle  },
]

export default function MapeamentosPage() {
  return (
    <div>
      <Header title="Mapeamentos" subtitle="Vínculo entre produtos do armazém e anúncios nos marketplaces" />

      <div className="p-6 space-y-4">
        {/* Status counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_INFO.map(({ key, label, color, bg, icon: Icon }) => (
            <div key={key} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-300">—</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por SKU ou título do anúncio..."
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
              disabled
            />
          </div>
          <button className="btn-primary flex items-center gap-2 text-sm ml-auto" disabled>
            <Plus className="w-4 h-4" />
            Novo Mapeamento
          </button>
        </div>

        {/* Empty state */}
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <Link2 className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhum mapeamento configurado</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-3">
            Vincule os produtos do seu armazém aos anúncios no Mercado Livre, Shopee e Amazon.
            Isso permite atualizar o estoque automaticamente após cada venda.
          </p>
          <p className="text-xs text-slate-600">Disponível no Bloco 3</p>
        </div>
      </div>
    </div>
  )
}
