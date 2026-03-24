'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  ShoppingBag, Package, TrendingUp, Star, AlertCircle,
  RefreshCw, ExternalLink, Loader2, Zap,
} from 'lucide-react'
import Link from 'next/link'

interface ShopInfo {
  shop_name?:     string
  shop_status?:   string
  item_limit?:    number
  description?:   string
}

interface ShopeeStatus {
  connected:  boolean
  shop_name?: string | null
  shop_id?:   number | null
}

interface PerformanceData {
  response?: {
    overall_performance?: string
    listing_violations?: number
    non_fulfillment_rate?: { my_shop_non_fulfillment_rate?: number }
    late_shipment_rate?:   { my_shop_late_shipment_rate?: number }
    return_refund_rate?:   { my_shop_return_refund_rate?: number }
    response_rate?:        { my_shop_response_rate?: number }
  }
}

export default function ShopeeOverviewPage() {
  const [status,      setStatus]      = useState<ShopeeStatus | null>(null)
  const [shopInfo,    setShopInfo]    = useState<ShopInfo | null>(null)
  const [performance, setPerformance] = useState<PerformanceData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [syncing,     setSyncing]     = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [st, info, perf] = await Promise.allSettled([
        fetch('/api/shopee/status').then(r => r.json()),
        fetch('/api/shopee/shop/info').then(r => r.json()),
        fetch('/api/shopee/shop/performance').then(r => r.json()),
      ])

      if (st.status    === 'fulfilled') setStatus(st.value)
      if (info.status  === 'fulfilled') setShopInfo(info.value?.response ?? null)
      if (perf.status  === 'fulfilled') setPerformance(perf.value ?? null)
    } catch { /* silencia — UI mostra estado vazio */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function sync() {
    setSyncing(true)
    try { await fetch('/api/shopee/refresh', { method: 'POST' }) }
    catch { /* silencia */ }
    finally { setSyncing(false) }
  }

  const perf = performance?.response
  const connected = status?.connected

  return (
    <div>
      <PageHeader
        title="Shopee — Visão Geral"
        description={status?.shop_name ? `Loja: ${status.shop_name}` : 'Painel da sua loja Shopee'}
      />

      <div className="p-6 space-y-6">

        {/* Não conectado */}
        {!loading && !connected && (
          <div className="dash-card rounded-2xl p-8 border border-orange-500/20 bg-orange-500/5 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <p className="font-bold text-white text-lg mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                Shopee não conectada
              </p>
              <p className="text-sm text-slate-400 max-w-sm">
                Conecte sua loja Shopee para ver pedidos, produtos e métricas de performance aqui.
              </p>
            </div>
            <a
              href="/api/shopee/auth"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" /> Conectar Shopee
            </a>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
          </div>
        )}

        {/* Conectado */}
        {!loading && connected && (
          <>
            {/* Header com sync */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl">🟠</div>
                <div>
                  <p className="font-bold text-white text-sm">{status?.shop_name ?? 'Minha loja'}</p>
                  <p className="text-[10px] text-green-400">Conectada · Shop ID {status?.shop_id}</p>
                </div>
              </div>
              <button
                onClick={sync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 border border-white/[0.06] hover:text-slate-200 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-orange-400' : ''}`} />
                Sincronizar
              </button>
            </div>

            {/* KPIs de Performance */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: 'Taxa Não-Envio',
                  value: perf?.non_fulfillment_rate?.my_shop_non_fulfillment_rate != null
                    ? `${(perf.non_fulfillment_rate.my_shop_non_fulfillment_rate * 100).toFixed(1)}%`
                    : '—',
                  icon: AlertCircle,
                  color: 'text-red-400',
                  bg:   'bg-red-500/10',
                },
                {
                  label: 'Envio Atrasado',
                  value: perf?.late_shipment_rate?.my_shop_late_shipment_rate != null
                    ? `${(perf.late_shipment_rate.my_shop_late_shipment_rate * 100).toFixed(1)}%`
                    : '—',
                  icon: TrendingUp,
                  color: 'text-amber-400',
                  bg:   'bg-amber-500/10',
                },
                {
                  label: 'Devolução/Reembolso',
                  value: perf?.return_refund_rate?.my_shop_return_refund_rate != null
                    ? `${(perf.return_refund_rate.my_shop_return_refund_rate * 100).toFixed(1)}%`
                    : '—',
                  icon: ShoppingBag,
                  color: 'text-purple-400',
                  bg:   'bg-purple-500/10',
                },
                {
                  label: 'Taxa de Resposta',
                  value: perf?.response_rate?.my_shop_response_rate != null
                    ? `${(perf.response_rate.my_shop_response_rate * 100).toFixed(1)}%`
                    : '—',
                  icon: Star,
                  color: 'text-green-400',
                  bg:   'bg-green-500/10',
                },
              ].map(kpi => (
                <div key={kpi.label} className="dash-card rounded-2xl p-4 border border-white/[0.06]">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <p className="text-xl font-bold text-white">{kpi.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Performance geral */}
            {perf?.overall_performance && (
              <div className={`dash-card rounded-2xl p-4 border flex items-center gap-3 ${
                perf.overall_performance === 'GOOD'
                  ? 'border-green-500/20 bg-green-500/5'
                  : perf.overall_performance === 'NORMAL'
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  perf.overall_performance === 'GOOD' ? 'bg-green-500/10' :
                  perf.overall_performance === 'NORMAL' ? 'bg-amber-500/10' : 'bg-red-500/10'
                }`}>
                  <Star className={`w-5 h-5 ${
                    perf.overall_performance === 'GOOD' ? 'text-green-400' :
                    perf.overall_performance === 'NORMAL' ? 'text-amber-400' : 'text-red-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Performance Geral: {perf.overall_performance === 'GOOD' ? 'Boa ✓' :
                    perf.overall_performance === 'NORMAL' ? 'Normal' : 'Baixa ⚠️'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Avaliação Shopee da sua loja</p>
                </div>
              </div>
            )}

            {/* Links rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/dashboard/shopee/produtos"
                className="dash-card rounded-2xl p-4 border border-white/[0.06] flex items-center gap-3 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Package className="w-4.5 h-4.5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Produtos</p>
                  <p className="text-[10px] text-slate-500">Seus anúncios na Shopee</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400 transition-colors" />
              </Link>

              <Link
                href="/dashboard/shopee/pedidos"
                className="dash-card rounded-2xl p-4 border border-white/[0.06] flex items-center gap-3 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-4.5 h-4.5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Pedidos</p>
                  <p className="text-[10px] text-slate-500">Pedidos recentes da loja</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400 transition-colors" />
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
