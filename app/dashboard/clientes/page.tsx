'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import { Users, Search, ChevronDown, Star, ShoppingBag, TrendingUp } from 'lucide-react'

interface Cliente {
  id: number; nome: string; email: string; cidade: string
  pedidos: number; gasto: number; ultimaCompra: string; status: 'ativo' | 'inativo'
}

const clientes: Cliente[] = []


function tier(gasto: number) {
  if (gasto >= 2000) return { label: 'VIP', cls: 'text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20' }
  if (gasto >= 500)  return { label: 'Ouro', cls: 'text-yellow-400 bg-yellow-400/10 ring-1 ring-yellow-400/20' }
  return { label: 'Padrão', cls: 'text-slate-400 bg-slate-400/10 ring-1 ring-slate-400/20' }
}

function initials(nome: string) {
  return nome.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
}

export default function ClientesPage() {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('Todos')

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.cidade.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'Todos' || (filter === 'VIP' && c.gasto >= 2000) || (filter === 'Ativo' && c.status === 'ativo') || (filter === 'Inativo' && c.status === 'inativo')
      return matchSearch && matchFilter
    })
  }, [search, filter])

  const totalGasto  = clientes.reduce((s, c) => s + c.gasto, 0)
  const totalPedidos = clientes.reduce((s, c) => s + c.pedidos, 0)
  const vipCount    = clientes.filter(c => c.gasto >= 2000).length

  return (
    <div>
      <Header title="Clientes" subtitle="Base de clientes e histórico de compras" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total clientes', val: clientes.length,  color: 'text-purple-400', icon: Users       },
            { label: 'Clientes VIP',   val: vipCount,          color: 'text-amber-400',  icon: Star        },
            { label: 'Total pedidos',  val: totalPedidos,      color: 'text-blue-400',   icon: ShoppingBag },
            { label: 'Faturamento',    val: `R$ ${(totalGasto/1000).toFixed(1)}k`, color: 'text-green-400', icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="dash-card p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-3.5 h-3.5 text-slate-600" />
                <p className="text-xs text-slate-600">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'Sora, sans-serif' }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="dash-card rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
            <p className="font-bold text-white text-sm shrink-0" style={{ fontFamily: 'Sora, sans-serif' }}>Lista de Clientes</p>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 w-40" />
              </div>
              <div className="relative">
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40 cursor-pointer">
                  {['Todos', 'VIP', 'Ativo', 'Inativo'].map(f => <option key={f}>{f}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Cliente', 'Cidade', 'Pedidos', 'Total gasto', 'Último pedido', 'Tier', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-600">Nenhum cliente encontrado</td></tr>
                ) : filtered.map(c => {
                  const t = tier(c.gasto)
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {initials(c.nome)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{c.nome}</p>
                            <p className="text-[10px] text-slate-600">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.cidade}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-white">{c.pedidos}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-white whitespace-nowrap">
                        R$ {c.gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">{c.ultimaCompra}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'ativo' ? 'text-green-400 bg-green-400/10' : 'text-slate-500 bg-slate-500/10'
                        }`}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-white/[0.04]">
            <p className="text-xs text-slate-600">{filtered.length} de {clientes.length} clientes</p>
          </div>
        </div>
      </div>
    </div>
  )
}
