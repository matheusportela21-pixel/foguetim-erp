'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/lib/auth-context'
import { getProducts, deleteProduct } from '@/lib/db/products'
import {
  Plus, Upload, Download, RefreshCw, Copy, Search, SlidersHorizontal,
  ChevronDown, ChevronUp, X, TrendingDown,
  Package, CheckSquare, Square, Edit3, CopyPlus,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  AlertCircle, ImageOff, Info, CheckCircle2,
} from 'lucide-react'
import {
  produtos as mockProdutos, MARCAS, CATEGORIAS, MKTS, MKT_COLOR,
  STATUS_META, MARCA_COLOR, calcPreco, margem, healthScore,
  type Produto, type Status, type MKT,
} from './_data'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

type SortField = 'nome' | 'estoqueReal' | 'custo' | 'precoML' | 'margemML' | 'health'
type SortDir   = 'asc' | 'desc'

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthBar({ p }: { p: Produto }) {
  const { score, checks } = healthScore(p)
  const color = score >= 80 ? 'bg-green-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'
  const text  = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="relative group min-w-[56px]">
      <div className="flex items-center gap-1.5 cursor-help">
        <div className="flex-1 h-1 bg-dark-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-[10px] font-bold tabular-nums ${text}`}>{score}</span>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 w-52 bg-dark-800 border border-white/10 rounded-xl p-3 shadow-2xl z-30 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
        <p className="text-[10px] font-bold text-white mb-2">Checklist de Qualidade</p>
        {checks.map(c => (
          <div key={c.label} className="flex items-center gap-1.5 mb-1">
            {c.ok
              ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
              : <X className="w-3 h-3 text-red-400 shrink-0" />}
            <span className={`text-[10px] ${c.ok ? 'text-slate-400' : 'text-red-400'}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StockBadge({ real, virtual: virt, minimo }: { real: number; virtual: number; minimo: number }) {
  const mismatch = real !== virt
  const low      = real > 0 && real <= minimo
  const empty    = real === 0
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <span className={`text-xs font-semibold tabular-nums ${empty ? 'text-red-400' : low ? 'text-amber-400' : 'text-white'}`}>{real}</span>
        {mismatch && (
          <span className="text-[9px] text-slate-600 flex items-center gap-0.5">
            <RefreshCw className="w-2.5 h-2.5 text-amber-500" />{virt}
          </span>
        )}
      </div>
      {(low || empty) && (
        <span className={`text-[9px] font-bold ${empty ? 'text-red-400' : 'text-amber-400'}`}>
          {empty ? 'Sem estoque' : 'Baixo'}
        </span>
      )}
    </div>
  )
}

function MktBadges({ mkt }: { mkt: Produto['mkt'] }) {
  const active = MKTS.filter(m => mkt[m]?.enabled)
  if (!active.length) return <span className="text-[10px] text-slate-600">—</span>
  return (
    <div className="flex gap-0.5 flex-wrap">
      {active.map(m => (
        <span key={m} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${MKT_COLOR[m]}`}>{m}</span>
      ))}
    </div>
  )
}

// ─── Copy Modal ───────────────────────────────────────────────────────────────

function CopyModal({ produto, onClose }: { produto: Produto | null; onClose: () => void }) {
  const [step, setStep]       = useState(1)
  const [targets, setTargets] = useState<MKT[]>([])
  if (!produto) return null

  const activeMkts  = MKTS.filter(m => produto.mkt[m]?.enabled)
  const availTarget = MKTS.filter(m => !produto.mkt[m]?.enabled)
  const toggle      = (m: MKT) => setTargets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const MKT_NAMES: Record<MKT, string> = {
    ML: 'Mercado Livre', SP: 'Shopee', AMZ: 'Amazon', AME: 'Americanas', MAG: 'Magalu',
    TKT: 'TikTok', CB: 'Casas Bahia', NS: 'Nuvemshop', TRY: 'Tray', LI: 'Loja Integrada', ALI: 'AliExpress',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Copiar Anúncio</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">{produto.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/[0.04]">
          {['Origem', 'Destino', 'Opções', 'Confirmar'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className="w-6 h-px bg-white/10" />}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${step === i+1 ? 'bg-purple-600/20 text-purple-300' : step > i+1 ? 'text-green-400' : 'text-slate-600'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${step === i+1 ? 'bg-purple-600 text-white' : step > i+1 ? 'bg-green-500 text-white' : 'bg-dark-700 text-slate-600'}`}>{i+1}</span>
                {s}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 min-h-[160px]">
          {step === 1 && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Selecione o marketplace de origem:</p>
              {activeMkts.length === 0
                ? <p className="text-xs text-slate-600 text-center py-4">Produto não está ativo em nenhum marketplace.</p>
                : activeMkts.map(m => (
                  <button key={m} onClick={() => setStep(2)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04] transition-all text-left mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${MKT_COLOR[m]}`}>{m}</span>
                    <span className="text-sm text-white">{MKT_NAMES[m]}</span>
                    <span className="text-[10px] text-slate-600 font-mono ml-auto">{produto.mkt[m]?.anuncioId}</span>
                  </button>
                ))}
            </div>
          )}
          {step === 2 && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Selecione os marketplaces de destino:</p>
              {availTarget.length === 0
                ? <p className="text-xs text-slate-600 text-center py-4">Produto já está em todos os marketplaces.</p>
                : availTarget.map(m => (
                  <button key={m} onClick={() => toggle(m)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left mb-2 ${targets.includes(m) ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/[0.06] hover:bg-white/[0.04]'}`}>
                    {targets.includes(m) ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${MKT_COLOR[m]}`}>{m}</span>
                    <span className="text-sm text-white">{MKT_NAMES[m]}</span>
                  </button>
                ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">Opções de cópia:</p>
              {[
                ['Copiar título e descrição', true],
                ['Copiar imagens', true],
                ['Adaptar preço por marketplace', true],
                ['Manter status inativo (revisar antes de publicar)', false],
              ].map(([label, checked]) => (
                <label key={label as string} className="flex items-center gap-2.5 cursor-pointer">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-purple-600 border-purple-600' : 'border-white/20'}`}>
                    {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                  </div>
                  <span className="text-xs text-slate-300">{label as string}</span>
                </label>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Copy className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-bold text-white mb-1">Pronto para copiar!</p>
              <p className="text-xs text-slate-500">Serão criados {targets.length} novos anúncios para revisão.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          {step > 1
            ? <button onClick={() => setStep(s => s - 1)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Voltar</button>
            : <div />}
          {step < 4
            ? <button onClick={() => setStep(s => s + 1)}
                disabled={step === 2 && targets.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Próximo →
              </button>
            : <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-500 transition-all">
                Confirmar Cópia
              </button>}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProdutosPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [allProdutos, setAllProdutos] = useState<Produto[]>(mockProdutos)
  const [dbLoading,   setDbLoading]   = useState(false)

  // Load products from Supabase (replaces mock data when configured)
  useEffect(() => {
    if (!user || user.id === 'dev-user') return
    setDbLoading(true)
    getProducts(user.id)
      .then(data => setAllProdutos(data))
      .finally(() => setDbLoading(false))
  }, [user?.id])

  const [search,      setSearch]      = useState('')
  const [statusF,     setStatusF]     = useState<Status | 'Todos'>('Todos')
  const [marcaF,      setMarcaF]      = useState('Todas')
  const [catF,        setCatF]        = useState('Todas')
  const [mktF,        setMktF]        = useState<MKT[]>([])
  const [estoqueF,    setEstoqueF]    = useState<'todos' | 'baixo' | 'sem'>('todos')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField,   setSortField]   = useState<SortField>('nome')
  const [sortDir,     setSortDir]     = useState<SortDir>('asc')
  const [selected,    setSelected]    = useState<number[]>([])
  const [page,        setPage]        = useState(1)
  const [dismissed,   setDismissed]   = useState<string[]>([])
  const [copyProd,    setCopyProd]    = useState<Produto | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!user) return
    const ok = await deleteProduct(id, user.id)
    if (ok) {
      setAllProdutos(prev => prev.filter(p => p.id !== id))
      setSelected(prev => prev.filter(x => x !== id))
    }
    setDeleteConfirm(null)
  }

  // ── Filtered + sorted list ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = allProdutos.filter(p => {
      if (search) {
        const q = search.toLowerCase()
        if (!p.nome.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.ean.includes(q)) return false
      }
      if (statusF !== 'Todos' && p.status !== statusF) return false
      if (marcaF  !== 'Todas' && p.marca !== marcaF)   return false
      if (catF    !== 'Todas' && p.categoria !== catF)  return false
      if (mktF.length > 0 && !mktF.every(m => p.mkt[m]?.enabled)) return false
      if (estoqueF === 'sem'   && p.estoqueReal !== 0)              return false
      if (estoqueF === 'baixo' && !(p.estoqueReal > 0 && p.estoqueReal <= p.estoqueMinimo)) return false
      return true
    })

    return [...list].sort((a, b) => {
      let va: number | string, vb: number | string
      switch (sortField) {
        case 'nome':        va = a.nome; vb = b.nome; break
        case 'estoqueReal': va = a.estoqueReal; vb = b.estoqueReal; break
        case 'custo':       va = a.custo; vb = b.custo; break
        case 'precoML':     va = calcPreco(a, 'ML'); vb = calcPreco(b, 'ML'); break
        case 'margemML':    va = margem(a, 'ML'); vb = margem(b, 'ML'); break
        case 'health':      va = healthScore(a).score; vb = healthScore(b).score; break
        default: va = a.nome; vb = b.nome
      }
      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
  }, [search, statusF, marcaF, catF, mktF, estoqueF, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Alerts ────────────────────────────────────────────────────────────────

  const alerts = useMemo(() => [
    {
      key: 'margem',
      icon: TrendingDown,
      color: 'border-red-500/20 bg-red-500/5',
      iconCls: 'text-red-400 bg-red-500/10',
      msg: `${allProdutos.filter(p => margem(p,'ML') < 15).length} produtos com margem abaixo de 15% no ML`,
      detail: 'Revise o preço ou os custos.',
    },
    {
      key: 'semestoque',
      icon: Package,
      color: 'border-amber-500/20 bg-amber-500/5',
      iconCls: 'text-amber-400 bg-amber-500/10',
      msg: `${allProdutos.filter(p => p.estoqueReal === 0).length} produtos sem estoque`,
      detail: 'Ficam inativos nos marketplaces.',
    },
    {
      key: 'baixoestoque',
      icon: AlertCircle,
      color: 'border-amber-500/20 bg-amber-500/5',
      iconCls: 'text-amber-400 bg-amber-500/10',
      msg: `${allProdutos.filter(p => p.estoqueReal > 0 && p.estoqueReal <= p.estoqueMinimo).length} produtos com estoque abaixo do mínimo`,
      detail: 'Faça a reposição antes de esgotar.',
    },
    {
      key: 'semimagem',
      icon: ImageOff,
      color: 'border-slate-500/20 bg-slate-500/5',
      iconCls: 'text-slate-400 bg-slate-500/10',
      msg: `${allProdutos.filter(p => p.imagens.length === 0).length} produtos sem imagem`,
      detail: 'Menor taxa de conversão.',
    },
    {
      key: 'rascunho',
      icon: Info,
      color: 'border-purple-500/20 bg-purple-500/5',
      iconCls: 'text-purple-400 bg-purple-500/10',
      msg: `${allProdutos.filter(p => p.status === 'rascunho').length} produtos em rascunho`,
      detail: 'Finalize e publique nos marketplaces.',
    },
  ].filter(a => !dismissed.includes(a.key)), [dismissed])

  // ── Sort toggle ───────────────────────────────────────────────────────────

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }, [sortField])

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-400" /> : <ArrowDown className="w-3 h-3 text-purple-400" />
  }

  const toggleSelect  = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll     = () => setSelected(prev => prev.length === pageItems.length ? [] : pageItems.map(p => p.id))
  const toggleMkt     = (m: MKT) => { setMktF(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]); setPage(1) }

  const activeFilterCount = [
    statusF !== 'Todos', marcaF !== 'Todas', catF !== 'Todas', mktF.length > 0, estoqueF !== 'todos',
  ].filter(Boolean).length

  // ── Pagination helper ─────────────────────────────────────────────────────

  const pageNumbers = (() => {
    const nums: (number | '…')[] = []
    let prev = 0
    Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
      .forEach(n => {
        if (n - prev > 1) nums.push('…')
        nums.push(n)
        prev = n
      })
    return nums
  })()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title="Produtos" subtitle="Gerencie seu catálogo completo" />

      <div className="p-6 space-y-4">

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/produtos/novo">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/20">
              <Plus className="w-3.5 h-3.5" /> Novo Produto
            </button>
          </Link>
          {([
            { icon: Upload,    label: 'Importar',     soon: true  },
            { icon: Download,  label: 'Exportar',     soon: true  },
            { icon: RefreshCw, label: 'Sincronizar',  soon: true  },
            { icon: Copy,      label: 'Copiar Anúncio', soon: false },
          ] as const).map(btn => (
            <button key={btn.label}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-dark-700 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06] transition-all"
              onClick={btn.soon ? undefined : () => setCopyProd(pageItems[0] ?? null)}>
              <btn.icon className="w-3.5 h-3.5" />
              {btn.label}
              {btn.soon && <span className="text-[8px] text-amber-400 font-bold bg-amber-400/10 px-1 rounded">Em breve</span>}
            </button>
          ))}
          <p className="ml-auto text-xs text-slate-600">
            <span className="text-white font-bold">{filtered.length}</span> produtos
          </p>
        </div>

        {/* Alert Banners */}
        {alerts.map(a => (
          <div key={a.key} className={`dash-card p-3 rounded-xl border ${a.color} flex items-center gap-3`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${a.iconCls}`}>
              <a.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-white">{a.msg}</span>
              <span className="text-xs text-slate-500 ml-2">{a.detail}</span>
            </div>
            <button onClick={() => setDismissed(prev => [...prev, a.key])}
              className="p-1 rounded text-slate-600 hover:text-slate-400 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Table Card */}
        <div className="dash-card rounded-2xl overflow-hidden">

          {/* Search + Filter Bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Nome, SKU ou EAN..."
                className="pl-9 pr-4 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 w-52" />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {(['Todos', 'ativo', 'inativo', 'pausado', 'rascunho'] as const).map(s => (
                <button key={s}
                  onClick={() => { setStatusF(s); setPage(1) }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${statusF === s ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30' : 'text-slate-500 hover:text-slate-300 bg-dark-700'}`}>
                  {s === 'Todos' ? 'Todos' : STATUS_META[s].label}
                </button>
              ))}
            </div>

            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ml-auto shrink-0 ${showFilters || activeFilterCount > 0 ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-white/[0.06] text-slate-500 hover:text-slate-300 bg-dark-700'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="min-w-[16px] h-4 px-1 bg-purple-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-white/[0.04] grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Marca</label>
                <div className="relative">
                  <select value={marcaF} onChange={e => { setMarcaF(e.target.value); setPage(1) }}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                    <option>Todas</option>
                    {MARCAS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Categoria</label>
                <div className="relative">
                  <select value={catF} onChange={e => { setCatF(e.target.value); setPage(1) }}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                    <option>Todas</option>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Marketplaces</label>
                <div className="flex gap-1 flex-wrap">
                  {MKTS.map(m => (
                    <button key={m} onClick={() => toggleMkt(m)}
                      className={`text-[9px] font-bold px-1.5 py-1 rounded transition-all ${mktF.includes(m) ? MKT_COLOR[m] : 'text-slate-600 bg-dark-700 hover:text-slate-400'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5 block">Estoque</label>
                <div className="flex gap-1">
                  {([['todos','Todos'],['baixo','Baixo'],['sem','Sem']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => { setEstoqueF(v); setPage(1) }}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${estoqueF === v ? 'bg-purple-600/20 text-purple-300' : 'text-slate-600 bg-dark-700 hover:text-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selected.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-900/20 border-b border-purple-500/20 animate-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-300 font-bold">{selected.length} produto{selected.length > 1 ? 's' : ''} selecionado{selected.length > 1 ? 's' : ''}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex gap-1.5">
                {[
                  { label: 'Ativar',   cls: 'text-green-400 hover:bg-green-400/10'  },
                  { label: 'Pausar',   cls: 'text-amber-400 hover:bg-amber-400/10'  },
                  { label: 'Duplicar', cls: 'text-blue-400  hover:bg-blue-400/10'   },
                  { label: 'Excluir',  cls: 'text-red-400   hover:bg-red-400/10'    },
                ].map(a => (
                  <button key={a.label} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${a.cls}`}>{a.label}</button>
                ))}
              </div>
              <button onClick={() => setSelected([])} className="ml-auto p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-4 py-3 text-left w-8">
                    <button onClick={toggleAll} className="text-slate-600 hover:text-slate-400 transition-colors">
                      {selected.length === pageItems.length && pageItems.length > 0
                        ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                        : <Square className="w-3.5 h-3.5" />}
                    </button>
                  </th>
                  {([
                    ['nome',     'Produto',   true],
                    [null,       'Marca',     false, 'hidden md:table-cell'],
                    ['estoqueReal','Estoque', true],
                    ['custo',    'Custo',     true,  'hidden lg:table-cell'],
                    ['precoML',  'Preço ML',  true,  'hidden lg:table-cell'],
                    ['margemML', 'Margem',    true,  'hidden lg:table-cell'],
                    [null,       'Canais',    false, 'hidden xl:table-cell'],
                    [null,       'Status',    false],
                    ['health',   'Score',     true,  'hidden xl:table-cell'],
                  ] as [SortField|null, string, boolean, string?][]).map(([f, label, sortable, cls='']) => (
                    <th key={label} className={`px-4 py-3 text-left ${cls}`}>
                      {sortable && f
                        ? <button onClick={() => toggleSort(f)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-slate-400 transition-colors whitespace-nowrap">
                            {label} <SortIcon field={f} />
                          </button>
                        : <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{label}</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Nenhum produto encontrado</p>
                    </td>
                  </tr>
                ) : pageItems.map(p => {
                  const isSelected = selected.includes(p.id)
                  const st  = STATUS_META[p.status]
                  const mc  = MARCA_COLOR[p.marca] ?? 'text-slate-400 bg-slate-400/10'
                  const prML = calcPreco(p, 'ML')
                  const mgML = margem(p, 'ML')
                  return (
                    <tr key={p.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-purple-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(p.id)} className="text-slate-600 hover:text-slate-400 transition-colors">
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-purple-400" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Product info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0 overflow-hidden border border-white/[0.06]">
                            {p.imagens.length > 0
                              ? <img src={p.imagens[0]} alt="" className="w-full h-full object-cover" />
                              : <ImageOff className="w-4 h-4 text-slate-700" />}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/dashboard/produtos/${p.id}`}>
                              <p className="text-xs font-semibold text-white hover:text-purple-300 transition-colors line-clamp-1 max-w-[160px]">{p.nome}</p>
                            </Link>
                            <p className="text-[10px] text-slate-600 font-mono">{p.sku}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mc}`}>{p.marca}</span>
                      </td>

                      <td className="px-4 py-3">
                        <StockBadge real={p.estoqueReal} virtual={p.estoqueVirtual} minimo={p.estoqueMinimo} />
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-400 tabular-nums">R$ {p.custo.toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-semibold text-white tabular-nums">R$ {prML.toFixed(2)}</span>
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-bold tabular-nums ${mgML < 15 ? 'text-red-400' : mgML < 25 ? 'text-amber-400' : 'text-green-400'}`}>
                          {mgML.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell">
                        <MktBadges mkt={p.mkt} />
                      </td>

                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </td>

                      <td className="px-4 py-3 hidden xl:table-cell">
                        <HealthBar p={p} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <Link href={`/dashboard/produtos/${p.id}`}>
                            <button title="Editar" className="p-1.5 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button onClick={() => setCopyProd(p)} title="Copiar anúncio"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-white/[0.06] transition-all">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button title="Duplicar produto"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(p.id)} title="Excluir produto"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04]">
            <p className="text-xs text-slate-600">
              {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers.map((n, i) => n === '…'
                ? <span key={`e${i}`} className="px-1 text-slate-600 text-xs">…</span>
                : <button key={n} onClick={() => setPage(n as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${page === n ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30' : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]'}`}>
                    {n}
                  </button>
              )}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 disabled:opacity-30 hover:bg-white/[0.06] transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CopyModal produto={copyProd} onClose={() => setCopyProd(null)} />

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <X className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Excluir produto?</h3>
            <p className="text-xs text-slate-400 mb-5">Esta ação não pode ser desfeita. O produto e todos os seus dados serão removidos permanentemente.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-300 bg-dark-700 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DB loading indicator */}
      {dbLoading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-xs text-slate-400 shadow-xl">
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
          Sincronizando com banco de dados...
        </div>
      )}
    </div>
  )
}
