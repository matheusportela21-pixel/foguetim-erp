'use client'

import { MapPin, Plus, Search, Info } from 'lucide-react'
import Header from '@/components/Header'

export default function LocalizacoesPage() {
  return (
    <div>
      <Header title="Localizações" subtitle="Ruas, corredores, prateleiras e boxes do armazém" />

      <div className="p-6 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/80">
            Localizações usam o formato livre <strong>Rua · Corredor · Prateleira · Nível · Box</strong>.
            Exemplo: <code className="font-mono bg-white/5 px-1 rounded">A1-C3-P2-N1-B4</code>.
            Cada produto pode ter uma localização padrão no armazém.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar localização..."
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
              disabled
            />
          </div>
          <button className="btn-primary flex items-center gap-2 text-sm ml-auto" disabled>
            <Plus className="w-4 h-4" />
            Nova Localização
          </button>
        </div>

        {/* Empty state */}
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhuma localização cadastrada</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-3">
            Cadastre as localizações físicas do seu armazém para rastrear onde cada produto
            está guardado.
          </p>
          <p className="text-xs text-slate-600">Disponível no Bloco 2</p>
        </div>
      </div>
    </div>
  )
}
