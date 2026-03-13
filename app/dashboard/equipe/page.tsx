'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { Users, Plus, Edit3, Mail, Shield, X, Check } from 'lucide-react'

interface Membro {
  id: number; nome: string; email: string; cargo: Cargo;
  status: 'ativo' | 'inativo'; entrada: string; avatar: string;
}

type Cargo = 'Diretor' | 'Supervisor' | 'Analista de Produtos' | 'Analista Financeiro' | 'Suporte ao Cliente' | 'Operador'

const CARGOS: Cargo[] = ['Diretor', 'Supervisor', 'Analista de Produtos', 'Analista Financeiro', 'Suporte ao Cliente', 'Operador']

const PERMISSOES: Record<Cargo, string[]> = {
  'Diretor':              ['Dashboard', 'Produtos', 'Precificação', 'Listagens', 'Financeiro', 'Pedidos', 'NF-e', 'Integrações', 'Equipe', 'Configurações'],
  'Supervisor':           ['Dashboard', 'Produtos', 'Precificação', 'Listagens', 'Financeiro', 'Pedidos', 'Integrações'],
  'Analista de Produtos': ['Dashboard', 'Produtos', 'Listagens'],
  'Analista Financeiro':  ['Dashboard', 'Financeiro', 'Precificação'],
  'Suporte ao Cliente':   ['Dashboard', 'Pedidos'],
  'Operador':             ['Dashboard'],
}

const initial: Membro[] = [
  { id: 1, nome: 'Matheus Portela', email: 'matheus.portela21@gmail.com', cargo: 'Diretor',             status: 'ativo', entrada: '01/01/2025', avatar: 'MP' },
  { id: 2, nome: 'Juliana Santos',  email: 'juliana.santos@skincenter.ce', cargo: 'Analista de Produtos',status: 'ativo', entrada: '15/03/2025', avatar: 'JS' },
  { id: 3, nome: 'Carlos Andrade',  email: 'carlos.andrade@skincenter.ce', cargo: 'Analista Financeiro', status: 'ativo', entrada: '10/05/2025', avatar: 'CA' },
  { id: 4, nome: 'Fernanda Lima',   email: 'fernanda.lima@skincenter.ce',  cargo: 'Suporte ao Cliente',  status: 'ativo', entrada: '02/08/2025', avatar: 'FL' },
  { id: 5, nome: 'Pedro Nunes',     email: 'pedro.nunes@skincenter.ce',    cargo: 'Operador',            status: 'inativo',entrada:'14/11/2025', avatar: 'PN' },
]

const cargoColor: Record<Cargo, string> = {
  'Diretor':              'text-purple-400 bg-purple-400/10 ring-1 ring-purple-400/20',
  'Supervisor':           'text-cyan-400 bg-cyan-400/10 ring-1 ring-cyan-400/20',
  'Analista de Produtos': 'text-blue-400 bg-blue-400/10 ring-1 ring-blue-400/20',
  'Analista Financeiro':  'text-green-400 bg-green-400/10 ring-1 ring-green-400/20',
  'Suporte ao Cliente':   'text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20',
  'Operador':             'text-slate-400 bg-slate-400/10 ring-1 ring-slate-400/20',
}

export default function EquipePage() {
  const [membros, setMembros] = useState<Membro[]>(initial)
  const [modal, setModal]     = useState<Membro | null | 'invite'>(null)
  const [editData, setEditData] = useState<Partial<Membro>>({})
  const [selectedCargo, setSelectedCargo] = useState<Cargo>('Analista de Produtos')

  function openEdit(m: Membro) { setModal(m); setEditData({ ...m }) }
  function close() { setModal(null); setEditData({}) }

  function save() {
    if (modal && modal !== 'invite') {
      setMembros(prev => prev.map(m => m.id === (modal as Membro).id ? { ...m, ...editData } : m))
    }
    close()
  }

  return (
    <div>
      <Header title="Equipe" subtitle="Gestão de membros e permissões" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total membros', val: membros.length,                                    color: 'text-purple-400' },
            { label: 'Ativos',        val: membros.filter(m => m.status === 'ativo').length,  color: 'text-green-400'  },
            { label: 'Inativos',      val: membros.filter(m => m.status === 'inativo').length,color: 'text-red-400'    },
            { label: 'Cargos',        val: CARGOS.length,                                     color: 'text-cyan-400'   },
          ].map(s => (
            <div key={s.label} className="dash-card p-4 rounded-2xl">
              <p className="text-xs text-slate-600 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'Sora, sans-serif' }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Team table */}
        <div className="dash-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Membros da Equipe</p>
            <button onClick={() => setModal('invite')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">
              <Plus className="w-3.5 h-3.5" /> Convidar membro
            </button>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {membros.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{m.nome}</p>
                    {m.id === 1 && <Shield className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-xs text-slate-600">{m.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full hidden md:block ${cargoColor[m.cargo]}`}>{m.cargo}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'ativo' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {m.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
                <p className="text-xs text-slate-600 hidden md:block shrink-0">desde {m.entrada}</p>
                {m.id !== 1 && (
                  <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] text-slate-500 hover:text-slate-200 transition-all">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Roles reference */}
        <div className="dash-card rounded-2xl p-5">
          <p className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Cargos e Permissões</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CARGOS.map(c => (
              <div key={c} className="bg-dark-700 rounded-xl p-4">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-3 ${cargoColor[c]}`}>{c}</span>
                <div className="flex flex-wrap gap-1">
                  {PERMISSOES[c].map(p => (
                    <span key={p} className="text-[9px] font-medium text-slate-500 bg-dark-600 px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {modal !== null && modal !== 'invite' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
          <div className="bg-dark-800 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Editar Membro</h3>
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Cargo</label>
                <select value={editData.cargo || ''} onChange={e => setEditData(d => ({ ...d, cargo: e.target.value as Cargo }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
                <div className="flex gap-2">
                  {(['ativo', 'inativo'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setEditData(d => ({ ...d, status: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all capitalize ${
                        editData.status === s
                          ? s === 'ativo' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'
                          : 'border-white/[0.08] text-slate-600'
                      }`}>{s === 'ativo' ? 'Ativo' : 'Inativo'}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={close} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04]">Cancelar</button>
              <button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {modal === 'invite' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
          <div className="bg-dark-800 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Convidar Membro</h3>
              <button onClick={close} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />E-mail do convidado</label>
                <input type="email" placeholder="email@empresa.com.br"
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Cargo</label>
                <div className="grid grid-cols-2 gap-2">
                  {CARGOS.slice(1).map(c => (
                    <button key={c} type="button" onClick={() => setSelectedCargo(c)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-left ${
                        selectedCargo === c ? cargoColor[c] + ' border-current/20' : 'border-white/[0.08] text-slate-600'
                      }`}>{c}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={close} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04]">Cancelar</button>
              <button onClick={close} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Enviar Convite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
