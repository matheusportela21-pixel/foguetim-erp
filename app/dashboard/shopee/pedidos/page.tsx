'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { ShoppingBag, RefreshCw, Loader2, AlertCircle, ExternalLink, Zap, Filter } from 'lucide-react'

interface ShopeeOrder {
  order_sn:     string
  order_status: string
  create_time:  number
  total_amount?: number
  currency?:    string
  buyer_user_id?: number
}

interface OrdersResponse {
  response?: {
    order_list?: ShopeeOrder[]
    more?: boolean
  }
  error?:   string
  message?: string
}

const STATUS_LABELS: Record<string, string> = {
  UNPAID:          'Aguardando Pagamento',
  READY_TO_SHIP:   'Pronto p/ Envio',
  PROCESSED:       'Processando',
  SHIPPED:         'Enviado',
  COMPLETED:       'Concluído',
  IN_CANCEL:       'Em Cancelamento',
  CANCELLED:       'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  UNPAID:          'text-amber-400  bg-amber-400/10',
  READY_TO_SHIP:   'text-blue-400   bg-blue-400/10',
  PROCESSED:       'text-purple-400 bg-purple-400/10',
  SHIPPED:         'text-cyan-400   bg-cyan-400/10',
  COMPLETED:       'text-green-400  bg-green-400/10',
  IN_CANCEL:       'text-orange-400 bg-orange-400/10',
  CANCELLED:       'text-red-400    bg-red-400/10',
}

export default function ShopeePedidosPage() {
  const [data,      setData]      = useState<OrdersResponse | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [days,      setDays]      = useState(7)

  async function loadOrders(d = days) {
    setLoading(true)
    try {
      const res = await fetch(`/api/shopee/orders?days=${d}&page_size=50`)
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

  useEffect(() => { loadOrders() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const orders = data?.response?.order_list ?? []

  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleDateString('pt-BR', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
      hour:  '2-digit',
      minute:'2-digit',
    })
  }

  return (
    <div>
      <Header
        title="Shopee — Pedidos"
        subtitle={`${orders.length} pedidos nos últimos ${days} dias`}
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
              <p className="text-sm text-slate-400">Conecte sua loja para ver seus pedidos aqui.</p>
            </div>
            <a href="/api/shopee/auth"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Conectar Shopee
            </a>
          </div>
        )}

        {/* Filtros */}
        {connected && (
          <div className="flex items-center gap-3">
            <Filter className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <p className="text-xs text-slate-500">Período:</p>
            {[7, 15].map(d => (
              <button
                key={d}
                onClick={() => { setDays(d); loadOrders(d) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  days === d
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-slate-500 border border-white/[0.06] hover:text-slate-200'
                }`}
              >
                {d} dias
              </button>
            ))}

            <button
              onClick={() => loadOrders()}
              className="ml-auto p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && connected !== false && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
          </div>
        )}

        {/* Sem pedidos */}
        {!loading && connected && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-slate-600" />
            <p className="text-slate-500 text-sm">Nenhum pedido nos últimos {days} dias</p>
          </div>
        )}

        {/* Tabela */}
        {!loading && connected && orders.length > 0 && (
          <div className="dash-card rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nº Pedido</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Data</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Comprador</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => (
                    <tr
                      key={order.order_sn}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="text-xs font-mono text-slate-300">{order.order_sn}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[order.order_status] ?? 'text-slate-400 bg-slate-400/10'}`}>
                          {STATUS_LABELS[order.order_status] ?? order.order_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{formatDate(order.create_time)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-500">{order.buyer_user_id ?? '—'}</span>
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
