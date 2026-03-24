'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  ShoppingCart, Package, RefreshCw, Search, MapPin, User,
  Truck, ChevronDown, ChevronUp, Printer, AlertCircle, Link2,
} from 'lucide-react'
import type { MLPack, MLPackOrder } from '@/app/api/mercadolivre/packs/route'

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function buyerName(buyer: MLPack['buyer']) {
  if (buyer.first_name || buyer.last_name)
    return `${buyer.first_name ?? ''} ${buyer.last_name ?? ''}`.trim()
  return buyer.nickname || '—'
}

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  paid:              { label: 'Pago',        cls: 'bg-green-400/10 text-green-400'   },
  shipped:           { label: 'Enviado',     cls: 'bg-blue-400/10 text-blue-400'     },
  delivered:         { label: 'Entregue',    cls: 'bg-purple-400/10 text-purple-400' },
  cancelled:         { label: 'Cancelado',   cls: 'bg-red-400/10 text-red-400'       },
  payment_required:  { label: 'Ag. pagto',  cls: 'bg-amber-400/10 text-amber-400'   },
  confirmed:         { label: 'Confirmado',  cls: 'bg-cyan-400/10 text-cyan-400'     },
  in_process:        { label: 'Em processo', cls: 'bg-slate-400/10 text-slate-400'   },
}

/* ── Pack Card ───────────────────────────────────────────────────────────── */
function PackCard({ pack }: { pack: MLPack }) {
  const [expanded, setExpanded] = useState(pack.orders.length > 1)
  const isMulti  = pack.orders.length > 1
  const stCfg    = ORDER_STATUS[pack.orders[0]?.status ?? ''] ?? { label: pack.orders[0]?.status ?? '—', cls: 'bg-slate-500/10 text-slate-400' }

  return (
    <div className={`bg-[#111318] border rounded-xl overflow-hidden transition-all ${isMulti ? 'border-purple-500/20' : 'border-white/[0.06]'}`}>
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          {/* Pack ID + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[11px] font-mono text-slate-500">Pack #{pack.pack_id}</span>
            {isMulti && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">
                🛒 {pack.orders.length} pedidos agrupados
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stCfg.cls}`}>
              {stCfg.label}
            </span>
          </div>

          {/* Buyer + destination */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-1.5">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {buyerName(pack.buyer)}
            </span>
            {pack.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {pack.destination}
              </span>
            )}
          </div>

          {/* Tracking / date */}
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            {pack.tracking_number && (
              <span className="flex items-center gap-1 text-cyan-500 font-mono">
                <Truck className="w-3 h-3" /> {pack.tracking_number}
              </span>
            )}
            <span>{fmtDate(pack.date_created)}</span>
          </div>
        </div>

        {/* Right: total + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-base font-bold text-white">{fmtBRL(pack.total_amount)}</p>
            <p className="text-[10px] text-slate-600">{pack.items_count} item(s)</p>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-600" />
            : <ChevronDown className="w-4 h-4 text-slate-600" />
          }
        </div>
      </div>

      {/* Expanded orders */}
      {expanded && (
        <div className="border-t border-white/[0.05]">
          {pack.orders.map((order: MLPackOrder, i) => {
            const oCfg = ORDER_STATUS[order.status] ?? { label: order.status, cls: 'bg-slate-500/10 text-slate-400' }
            return (
              <div key={order.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-600">#{order.id}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${oCfg.cls}`}>
                      {oCfg.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-white shrink-0">{fmtBRL(order.total_amount)}</span>
                </div>
                <div className="space-y-0.5">
                  {order.items.map((it, j) => (
                    <div key={j} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 truncate pr-2">{it.quantity}× {it.title}</span>
                      <span className="text-slate-500 shrink-0">{fmtBRL(it.unit_price * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.01] border-t border-white/[0.04]">
            {pack.shipment_id && (
              <a
                href={`/api/mercadolivre/shipments/${pack.shipment_id}/label`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> Etiqueta PDF
              </a>
            )}
            <a
              href={`/api/mercadolivre/packs/${pack.pack_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all"
            >
              <Package className="w-3.5 h-3.5" /> Ver detalhes
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function PacksPage() {
  const [packs, setPacks]         = useState<MLPack[]>([])
  const [loading, setLoading]     = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [search, setSearch]       = useState('')
  const [days, setDays]           = useState(30)
  const [filter, setFilter]       = useState<'all' | 'multi' | 'single'>('all')

  const load = useCallback(async (d: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mercadolivre/packs?days=${d}`)
      const data = await res.json() as { connected?: boolean; packs?: MLPack[]; error?: string }
      if (data.connected === false) {
        setConnected(false)
      } else {
        setConnected(true)
        setPacks(data.packs ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(days) }, [days, load])

  const filtered = packs.filter(p => {
    if (filter === 'multi'  && p.orders.length <= 1) return false
    if (filter === 'single' && p.orders.length > 1)  return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        p.pack_id.includes(q) ||
        buyerName(p.buyer).toLowerCase().includes(q) ||
        p.orders.some(o => o.items.some(i => i.title.toLowerCase().includes(q))) ||
        (p.tracking_number?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const kpiTotal    = packs.length
  const kpiMulti    = packs.filter(p => p.orders.length > 1).length
  const kpiReceita  = packs.reduce((s, p) => s + p.total_amount, 0)

  return (
    <div>
      <PageHeader title="Packs" description="Pedidos agrupados do Mercado Livre" />

      <div className="p-4 md:p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: `Packs (${days}d)`,    val: kpiTotal,         color: 'text-white',    icon: ShoppingCart },
            { label: 'Multi-itens',         val: kpiMulti,         color: 'text-purple-400', icon: Package    },
            { label: 'Receita total',       val: fmtBRL(kpiReceita), color: 'text-green-400', icon: null      },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {kpi.icon && <kpi.icon className="w-4 h-4 text-slate-500" />}
                <p className="text-[11px] text-slate-500">{kpi.label}</p>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                {loading
                  ? <span className="inline-block w-12 h-6 bg-white/[0.06] rounded animate-pulse" />
                  : kpi.val}
              </p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pack, comprador, produto..."
              className="pl-8 pr-3 py-1.5 text-xs bg-[#111318] border border-white/[0.08] rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 w-56"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { v: 'all' as const,    l: 'Todos'        },
              { v: 'multi' as const,  l: '🛒 Multi-itens' },
              { v: 'single' as const, l: '1 item'       },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFilter(f.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.v ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {f.l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${days === d ? 'bg-purple-500/15 text-purple-400' : 'text-slate-600 hover:text-slate-400'}`}>
                {d}d
              </button>
            ))}
            <button
              onClick={() => load(days)}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-200 bg-white/[0.04] border border-white/[0.06] rounded-lg transition-all disabled:opacity-50 ml-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {connected === false ? (
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-10 flex flex-col items-center gap-3 text-center">
            <Link2 className="w-10 h-10 text-slate-700" />
            <p className="text-sm font-semibold text-slate-400">Conta Mercado Livre não conectada</p>
            <a href="/dashboard/integracoes" className="text-xs text-indigo-400 hover:underline">
              Ir para Integrações →
            </a>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4 space-y-2 animate-pulse">
                <div className="flex gap-2">
                  <div className="h-4 w-40 bg-white/[0.04] rounded" />
                  <div className="h-4 w-28 bg-white/[0.04] rounded" />
                </div>
                <div className="h-3 w-1/2 bg-white/[0.04] rounded" />
                <div className="h-3 w-1/3 bg-white/[0.04] rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
              <Package className="w-6 h-6 text-slate-600" />
            </div>
            <div className="max-w-sm">
              <p className="text-sm font-semibold text-slate-300 mb-1">
                {search ? 'Nenhum pack encontrado para esta busca' : 'Nenhum pack encontrado'}
              </p>
              <p className="text-xs text-slate-500">
                {search
                  ? 'Tente buscar por outro comprador, produto ou número de pack.'
                  : 'Packs são criados automaticamente pelo Mercado Livre quando um comprador faz múltiplas compras em um mesmo pedido. Eles aparecem aqui automaticamente.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(pack => (
              <PackCard key={pack.pack_id} pack={pack} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
