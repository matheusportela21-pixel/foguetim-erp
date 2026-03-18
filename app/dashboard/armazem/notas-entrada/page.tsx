'use client'

import { FileText, Upload, Lock, AlertTriangle } from 'lucide-react'
import Header from '@/components/Header'
import { useAuth } from '@/lib/auth-context'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

export default function NotasEntradaPage() {
  const { profile } = useAuth()

  const isAdmin = profile?.role && ADMIN_ROLES.includes(profile.role)

  if (profile === null) {
    // Loaded but no role — show restricted
    return (
      <div>
        <Header title="Notas de Entrada" subtitle="NF-e de compra — Beta" />
        <div className="p-6">
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Acesso restrito</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Esta funcionalidade está disponível apenas para administradores.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div>
        <Header title="Notas de Entrada" subtitle="NF-e de compra — Beta" />
        <div className="p-6">
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Acesso restrito</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Esta funcionalidade está disponível apenas para administradores do sistema.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Notas de Entrada" subtitle="Upload e processamento de NF-e de compra" />

      <div className="p-6 space-y-4">
        {/* Beta warning */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400 mb-0.5">Funcionalidade Beta</p>
            <p className="text-xs text-amber-300/70">
              O processamento de NF-e de entrada está em desenvolvimento. A estrutura de banco de dados
              já está pronta. A UI de upload e resolução de itens será implementada no Bloco 3.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Notas de compra processadas</p>
          <button className="btn-primary flex items-center gap-2 text-sm" disabled>
            <Upload className="w-4 h-4" />
            Upload XML
          </button>
        </div>

        {/* Empty state */}
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhuma nota de entrada</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-3">
            Faça upload do XML da NF-e de compra para dar entrada no estoque automaticamente
            e vincular os itens aos produtos do armazém.
          </p>
          <p className="text-xs text-slate-600">Upload disponível no Bloco 3</p>
        </div>
      </div>
    </div>
  )
}
