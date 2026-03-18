'use client'

import { Tag, Plus, Search } from 'lucide-react'
import Header from '@/components/Header'

export default function CategoriasPage() {
  return (
    <div>
      <Header title="Categorias" subtitle="Categorias internas do armazém" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar categoria..."
              className="input-cyber w-full pl-9 pr-4 py-2 text-sm"
              disabled
            />
          </div>
          <button className="btn-primary flex items-center gap-2 text-sm ml-auto" disabled>
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        </div>

        {/* Empty state */}
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <Tag className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhuma categoria criada</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            Crie categorias internas para organizar seus produtos. Elas são independentes
            das categorias dos marketplaces e podem ter hierarquia (pai / filho).
          </p>
          <button className="btn-primary flex items-center gap-2 text-sm" disabled>
            <Plus className="w-4 h-4" />
            Criar primeira categoria
          </button>
          <p className="text-xs text-slate-600 mt-3">Disponível no Bloco 2</p>
        </div>
      </div>
    </div>
  )
}
