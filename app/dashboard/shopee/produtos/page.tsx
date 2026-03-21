'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { Package, Search, RefreshCw, Loader2, AlertCircle, ExternalLink, Zap } from 'lucide-react'

interface ShopeeItem {
  item_id:     number
  item_name:   string
  item_status: string
  price?:      number
  stock?:      number
}

interface ProductsResponse {
  response?: {
    item?:       ShopeeItem[]
    total_count?: number
    has_next_page?: boolean
    next_offset?: number
  }
  error?:   string
  message?: string
}

const STATUS_LABELS: Record<string, string> = {
  NORMAL:  'Ativo',
  BANNED:  'Banido',
  DELETED: 'Excluído',
  UNLIST:  'Inativo',
}

const STATUS_COLORS: Record<string, string> = {
  NORMAL:  'text-green-400 bg-green-400/10',
  BANNED:  'text-red-400 bg-red-400/10',
  DELETED: 'text-slate-500 bg-slate-500/10',
  UNLIST:  'text-amber-400 bg-amber-400/10',
}

export default function ShopeeProdutosPage() {
  const [data,       setData]       = useState<ProductsResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [connected,  setConnected]  = useState<boolean | null>(null)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('NORMAL')

  async function loadProducts(status = filter) {
    setLoading(true)
    try {
      const res = await fetch(`/api/shopee/products?item_status=${status}&page_size=50`)
      const json = await res.json()
      if (json.error === 'Shopee não conectada') {
        setConnected(false)
        return
      }
      setConnected(true)
      setData(json)
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProducts() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const items = data?.response?.item ?? []
  const filtered = items.filter(i =>
    !search || i.item_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <Header
        title="Shopee — Produtos"
        subtitle={`${data?.response?.total_count ?? 0} anúncios na Shopee`}
      />

      <div className="p-6 space-y-5">

        {/* Não conectado */}
        {!loading && connected === false && (
          <div className="dash-card rounded-2xl p-8 border border-orange-500/20 bg-orange-500/5 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <p className="font-bold text-white mb-1">Shopee não conectada</p>
              <p className="text-sm text-slate-400">Conecte sua loja para ver seus produtos aqui.</p>
            </div>
            <a href="/api/shopee/auth"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Conectar Shopee
            </a>
          </div>
        )}

        {/* Filtros */}
        {connected && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['NORMAL', 'UNLIST', 'BANNED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setFilter(s); loadProducts(s) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === s
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-slate-500 border border-white/[0.06] hover:text-slate-200'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}

              <button
                onClick={() => loadProducts()}
                className="p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && connected !== false && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
          </div>
        )}

        {/* Sem resultados */}
        {!loading && connected && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-slate-600" />
            <p className="text-slate-500 text-sm">Nenhum produto encontrado</p>
          </div>
        )}

        {/* Tabela */}
        {!loading && connected && filtered.length > 0 && (
          <div className="dash-card rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Produto</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">ID</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr
                      key={item.item_id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-orange-400" />
                          </div>
                          <p className="text-xs font-medium text-slate-200 line-clamp-2 max-w-xs">{item.item_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-500">{item.item_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[item.item_status] ?? 'text-slate-400 bg-slate-400/10'}`}>
                          {STATUS_LABELS[item.item_status] ?? item.item_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
