'use client'

import Header from '@/components/Header'
import { FileCheck, Clock, Building2, Package, DollarSign, Hash, Calendar } from 'lucide-react'

export default function NfePage() {
  return (
    <div>
      <Header title="NF-e" subtitle="Emissão de Nota Fiscal Eletrônica" />

      <div className="p-6 space-y-6">
        {/* Coming soon banner */}
        <div className="dash-card p-8 rounded-2xl border border-purple-500/20 bg-purple-500/5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-5">
            <FileCheck className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
            Emissão de NF-e em Breve
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed mb-6">
            Estamos desenvolvendo a integração com a SEFAZ para emissão automática de Notas Fiscais Eletrônicas
            diretamente pelo Foguetim ERP, sem precisar de sistemas externos.
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-400 text-sm font-semibold">
            <Clock className="w-4 h-4" /> Previsão: Q2 2026
          </div>
        </div>

        {/* Mockup form (disabled) */}
        <div className="dash-card rounded-2xl p-6 opacity-50 pointer-events-none">
          <p className="text-sm font-bold text-slate-400 mb-5 flex items-center gap-2">
            <span className="text-[10px] bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded-full font-bold">PRÉVIA</span>
            Formulário de emissão
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { icon: Building2, label: 'Empresa emissora', placeholder: 'Nome da empresa' },
              { icon: Hash,      label: 'CNPJ',              placeholder: '00.000.000/0000-00' },
              { icon: Package,   label: 'Produto / Serviço', placeholder: 'Descrição do item' },
              { icon: DollarSign,label: 'Valor total (R$)',  placeholder: '0,00' },
              { icon: Calendar,  label: 'Data de emissão',   placeholder: 'dd/mm/aaaa' },
              { icon: Hash,      label: 'Natureza operação', placeholder: 'Venda de mercadoria' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <f.icon className="w-3.5 h-3.5" /> {f.label}
                </label>
                <input type="text" disabled placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-600 placeholder:text-slate-700 cursor-not-allowed" />
              </div>
            ))}
          </div>
          <button disabled className="mt-6 px-6 py-3 rounded-xl bg-purple-700/50 text-white/40 text-sm font-bold cursor-not-allowed">
            Emitir NF-e
          </button>
        </div>

        {/* Features coming */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: FileCheck,  title: 'Emissão Automática',  desc: 'Emita NF-e automaticamente após cada venda aprovada nos marketplaces.' },
            { icon: Building2,  title: 'Multi-empresa',       desc: 'Gerencie múltiplos CNPJs e emita notas para diferentes empresas.' },
            { icon: DollarSign, title: 'Cálculo de Impostos', desc: 'Cálculo automático de ICMS, PIS, COFINS e ISS conforme seu regime tributário.' },
          ].map(f => (
            <div key={f.title} className="dash-card p-5 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <f.icon className="w-4.5 h-4.5 text-purple-400 w-[18px] h-[18px]" />
              </div>
              <p className="font-bold text-white text-sm mb-2">{f.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
