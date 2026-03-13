'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import {
  Plus, Search, Filter, Package, Edit3, Trash2,
  ChevronUp, ChevronDown, AlertCircle, CheckCircle,
  Upload, Download, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Produto {
  id: number
  sku: string
  nome: string
  marca: string
  categoria: string
  custoUnitario: number
  precoVenda: number
  estoque: number
  estoqueMinimo: number
  plataformas: string[]
  status: 'ativo' | 'inativo' | 'rascunho'
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockProdutos: Produto[] = [
  { id: 1, sku: 'FGT-001', nome: 'Smartphone X15 Pro 256GB', marca: 'TechBrand', categoria: 'Smartphones', custoUnitario: 1200, precoVenda: 2499.9, estoque: 23, estoqueMinimo: 5, plataformas: ['ML', 'AMZ'], status: 'ativo' },
  { id: 2, sku: 'FGT-018', nome: 'Fone Bluetooth TWS NoisePro', marca: 'SoundX', categoria: 'Áudio', custoUnitario: 48, precoVenda: 149.9, estoque: 3, estoqueMinimo: 10, plataformas: ['ML', 'SP'], status: 'ativo' },
  { id: 3, sku: 'FGT-043', nome: 'Smartwatch Ultra 2 AMOLED', marca: 'WristTech', categoria: 'Wearables', custoUnitario: 220, precoVenda: 499.9, estoque: 12, estoqueMinimo: 5, plataformas: ['AMZ'], status: 'ativo' },
  { id: 4, sku: 'FGT-007', nome: 'Carregador 65W GaN Turbo', marca: 'ChargeFast', categoria: 'Acessórios', custoUnitario: 22, precoVenda: 99.9, estoque: 87, estoqueMinimo: 20, plataformas: ['ML', 'SP', 'AMZ'], status: 'ativo' },
  { id: 5, sku: 'FGT-029', nome: 'Cabo USB-C 2m Nylon Trançado', marca: 'CablePro', categoria: 'Cabos', custoUnitario: 6, precoVenda: 22.9, estoque: 242, estoqueMinimo: 50, plataformas: ['ML', 'SP'], status: 'ativo' },
  { id: 6, sku: 'FGT-052', nome: 'Mesa Digitalizadora A4', marca: 'DrawMaster', categoria: 'Periféricos', custoUnitario: 85, precoVenda: 219.9, estoque: 0, estoqueMinimo: 3, plataformas: ['AMZ'], status: 'inativo' },
  { id: 7, sku: 'FGT-071', nome: 'SSD Externo 1TB USB-C', marca: 'StorageX', categoria: 'Armazenamento', custoUnitario: 140, precoVenda: 329.9, estoque: 19, estoqueMinimo: 5, plataformas: ['ML', 'AMZ'], status: 'ativo' },
  { id: 8, sku: 'FGT-089', nome: 'Webcam Full HD 1080p', marca: 'VisionPro', categoria: 'Periféricos', custoUnitario: 55, precoVenda: 189.9, estoque: 4, estoqueMinimo: 5, plataformas: ['ML', 'SP'], status: 'rascunho' },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function PlatformTag({ plat }: { plat: string }) {
  const colors: Record<string, string> = {
    ML: 'badge-orange', SP: 'badge-red', AMZ: 'badge-blue',
  }
  return <span className={`badge ${colors[plat] || 'badge-blue'} mr-1`}>{plat}</span>
}

function StatusBadge({ status }: { status: Produto['status'] }) {
  const map = {
    ativo:     { cls: 'badge-green',  label: 'Ativo' },
    inativo:   { cls: 'badge-red',    label: 'Inativo' },
    rascunho:  { cls: 'badge-purple', label: 'Rascunho' },
  }
  const { cls, label } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}

function EstoqueBar({ atual, minimo }: { atual: number; minimo: number }) {
  const pct = minimo > 0 ? Math.min((atual / (minimo * 4)) * 100, 100) : 100
  const color = atual === 0 ? '#ff3b6b' : atual < minimo ? '#ff8c00' : '#00ff88'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className={atual < minimo ? 'text-neon-red' : 'text-slate-400'}>{atual}</span>
        <span className="text-slate-600">min {minimo}</span>
      </div>
      <div className="h-1 bg-space-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  )
}

interface ModalProps { produto?: Partial<Produto>; onClose: () => void; onSave: (p: Partial<Produto>) => void }

function ProdutoModal({ produto, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState<Partial<Produto>>(produto || {
    sku: '', nome: '', marca: '', categoria: '', custoUnitario: 0,
    precoVenda: 0, estoque: 0, estoqueMinimo: 5, plataformas: [], status: 'rascunho',
  })

  const togglePlat = (p: string) => {
    const cur = form.plataformas || []
    setForm({ ...form, plataformas: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p] })
  }

  const margem = form.custoUnitario && form.precoVenda
    ? (((form.precoVenda - form.custoUnitario) / form.precoVenda) * 100).toFixed(1)
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card rounded-2xl w-full max-w-2xl p-6 border border-neon-blue/20 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">{produto?.id ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">SKU *</label>
            <input className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.sku || ''} onChange={e => setForm({...form, sku: e.target.value})} placeholder="FGT-000" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Marca *</label>
            <input className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.marca || ''} onChange={e => setForm({...form, marca: e.target.value})} placeholder="Nome da marca" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Nome do Produto *</label>
            <input className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.nome || ''} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Smartphone X15 Pro 256GB" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Categoria</label>
            <input className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.categoria || ''} onChange={e => setForm({...form, categoria: e.target.value})} placeholder="Ex: Smartphones" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Status</label>
            <select className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value as Produto['status']})}>
              <option value="rascunho">Rascunho</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Custo Unitário (R$) *</label>
            <input type="number" className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.custoUnitario || ''} onChange={e => setForm({...form, custoUnitario: +e.target.value})} placeholder="0,00" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Preço de Venda (R$) *</label>
            <input type="number" className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.precoVenda || ''} onChange={e => setForm({...form, precoVenda: +e.target.value})} placeholder="0,00" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Estoque Atual</label>
            <input type="number" className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.estoque || ''} onChange={e => setForm({...form, estoque: +e.target.value})} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Estoque Mínimo</label>
            <input type="number" className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm" value={form.estoqueMinimo || ''} onChange={e => setForm({...form, estoqueMinimo: +e.target.value})} placeholder="5" />
          </div>
        </div>

        {/* Margem preview */}
        <div className="mt-4 p-3 rounded-xl bg-space-800/60 border border-neon-green/10">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Margem calculada:</span>
            <span className="font-semibold font-mono neon-green">{margem}%</span>
          </div>
        </div>

        {/* Plataformas */}
        <div className="mt-4">
          <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Plataformas</label>
          <div className="flex gap-3 mt-2">
            {['ML', 'SP', 'AMZ'].map(p => {
              const active = (form.plataformas || []).includes(p)
              const colors: Record<string, string> = { ML: 'border-yellow-500 bg-yellow-500/10 text-yellow-400', SP: 'border-orange-500 bg-orange-500/10 text-orange-400', AMZ: 'border-neon-blue bg-neon-blue/10 text-neon-blue' }
              const labels: Record<string, string> = { ML: 'Mercado Livre', SP: 'Shopee', AMZ: 'Amazon' }
              return (
                <button key={p} onClick={() => togglePlat(p)} className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${active ? colors[p] : 'border-slate-700 text-slate-600 hover:border-slate-500'}`}>
                  {labels[p]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-all">Cancelar</button>
          <button onClick={() => onSave(form)} className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold">Salvar Produto</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>(mockProdutos)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterPlat, setFilterPlat] = useState<string>('todas')
  const [sortBy, setSortBy] = useState<keyof Produto>('sku')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modal, setModal] = useState<{ open: boolean; produto?: Partial<Produto> }>({ open: false })

  const filtered = produtos
    .filter(p => {
      const q = search.toLowerCase()
      const matchSearch = !q || p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q)
      const matchStatus = filterStatus === 'todos' || p.status === filterStatus
      const matchPlat = filterPlat === 'todas' || p.plataformas.includes(filterPlat)
      return matchSearch && matchStatus && matchPlat
    })
    .sort((a, b) => {
      const va = a[sortBy] as any
      const vb = b[sortBy] as any
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  const handleSort = (col: keyof Produto) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: keyof Produto }) =>
    sortBy === col
      ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />

  const handleSave = (form: Partial<Produto>) => {
    if (form.id) {
      setProdutos(prev => prev.map(p => p.id === form.id ? { ...p, ...form } as Produto : p))
    } else {
      const newId = Math.max(...produtos.map(p => p.id)) + 1
      setProdutos(prev => [...prev, { ...form, id: newId } as Produto])
    }
    setModal({ open: false })
  }

  const handleDelete = (id: number) => {
    if (confirm('Remover produto?')) setProdutos(prev => prev.filter(p => p.id !== id))
  }

  const criticalCount = produtos.filter(p => p.estoque < p.estoqueMinimo).length

  return (
    <div className="min-h-screen">
      <Header title="Produtos" subtitle={`${produtos.length} produtos cadastrados • ${criticalCount} com estoque crítico`} />

      {modal.open && (
        <ProdutoModal
          produto={modal.produto}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de SKUs', val: produtos.length, color: 'text-neon-blue' },
            { label: 'Ativos', val: produtos.filter(p => p.status === 'ativo').length, color: 'text-neon-green' },
            { label: 'Estoque crítico', val: criticalCount, color: 'text-neon-red' },
            { label: 'Valor em estoque', val: `R$ ${produtos.reduce((s,p)=>s+p.custoUnitario*p.estoque,0).toLocaleString('pt-BR',{minimumFractionDigits:0})}`, color: 'text-neon-purple' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-4">
              <p className="text-xs text-slate-500 font-mono">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="glass-card rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="input-cyber w-full pl-9 pr-4 py-2 rounded-lg text-sm"
              placeholder="Buscar por nome, SKU ou marca..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="input-cyber px-3 py-2 rounded-lg text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="rascunho">Rascunho</option>
          </select>

          <select className="input-cyber px-3 py-2 rounded-lg text-sm" value={filterPlat} onChange={e => setFilterPlat(e.target.value)}>
            <option value="todas">Todas as plataformas</option>
            <option value="ML">Mercado Livre</option>
            <option value="SP">Shopee</option>
            <option value="AMZ">Amazon</option>
          </select>

          <div className="ml-auto flex gap-2">
            <button className="btn-neon px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />Importar
            </button>
            <button className="btn-neon px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Download className="w-3.5 h-3.5" />Exportar
            </button>
            <button
              onClick={() => setModal({ open: true, produto: undefined })}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />Novo Produto
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-cyber text-sm">
              <thead>
                <tr className="border-b border-neon-blue/10 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                  {[
                    { col: 'sku', label: 'SKU' },
                    { col: 'nome', label: 'Produto' },
                    { col: 'marca', label: 'Marca' },
                    { col: null, label: 'Plataformas' },
                    { col: 'custoUnitario', label: 'Custo' },
                    { col: 'precoVenda', label: 'Venda' },
                    { col: null, label: 'Margem' },
                    { col: 'estoque', label: 'Estoque' },
                    { col: 'status', label: 'Status' },
                    { col: null, label: 'Ações' },
                  ].map(({ col, label }) => (
                    <th
                      key={label}
                      className={`text-left px-4 py-3 ${col ? 'cursor-pointer hover:text-slate-400 select-none' : ''}`}
                      onClick={() => col && handleSort(col as keyof Produto)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {col && <SortIcon col={col as keyof Produto} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const margem = (((p.precoVenda - p.custoUnitario) / p.precoVenda) * 100).toFixed(1)
                  const estoqueAlert = p.estoque === 0 ? 'critical' : p.estoque < p.estoqueMinimo ? 'low' : 'ok'
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-neon-blue text-xs">{p.sku}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-white font-medium">{p.nome}</p>
                        <p className="text-xs text-slate-500">{p.categoria}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs">{p.marca}</td>
                      <td className="px-4 py-3.5">
                        {p.plataformas.map(pl => <PlatformTag key={pl} plat={pl} />)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300 text-xs">
                        R$ {p.custoUnitario.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-200 text-xs font-semibold">
                        R$ {p.precoVenda.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-mono text-xs font-semibold ${+margem >= 40 ? 'text-neon-green' : +margem >= 20 ? 'text-neon-blue' : 'text-neon-red'}`}>
                          {margem}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          {estoqueAlert === 'critical' && <AlertCircle className="w-3.5 h-3.5 text-neon-red flex-shrink-0" />}
                          {estoqueAlert === 'low' && <AlertCircle className="w-3.5 h-3.5 text-neon-orange flex-shrink-0" />}
                          {estoqueAlert === 'ok' && <CheckCircle className="w-3.5 h-3.5 text-neon-green flex-shrink-0" />}
                          <EstoqueBar atual={p.estoque} minimo={p.estoqueMinimo} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModal({ open: true, produto: p })}
                            className="p-1.5 rounded-lg hover:bg-neon-blue/10 text-slate-500 hover:text-neon-blue transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg hover:bg-neon-red/10 text-slate-500 hover:text-neon-red transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>Nenhum produto encontrado</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-neon-blue/10 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Exibindo {filtered.length} de {produtos.length} produtos</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded border border-neon-blue/20 hover:border-neon-blue/50 transition-colors">← Anterior</button>
              <button className="px-3 py-1.5 rounded border border-neon-blue/20 bg-neon-blue/10 text-neon-blue">1</button>
              <button className="px-3 py-1.5 rounded border border-neon-blue/20 hover:border-neon-blue/50 transition-colors">Próximo →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
