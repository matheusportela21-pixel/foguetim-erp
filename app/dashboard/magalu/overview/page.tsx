'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
  ShoppingBag, Package, TrendingUp, AlertCircle,
  RefreshCw, ExternalLink, Loader2, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

interface MagaluStatus {
  connected:    boolean
  seller_id?:   string | null
  seller_name?: string | null
}

interface KPIs {
  totalProducts: number
  totalOrders:   number
}

export default function MagaluOverviewPage() {
  const [status,  setStatus]  = useState<MagaluStatus | null>(null)
  const [kpis,    setKpis]    = useState<KPIs>({ totalProducts: 0, totalOrders: 0 })
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const [statusRes, prodsRes, ordersRes] = await Promise.all([
        fetch('/api/magalu/status').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/magalu/products?offset=0&limit=1').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/magalu/orders?offset=0&limit=1').then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      if (statusRes) setStatus(statusRes)

      setKpis({
        totalProducts: prodsRes?.total ?? 0,
        totalOrders:   ordersRes?.total ?? 0,
      })
    } catch { /* silencia */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div className="space-y-6">
      <Header title="Magalu" subtitle="Visão geral da sua loja no Magazine Luiza" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#0086ff] animate-spin" />
        </div>
      ) : !status?.connected ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-4">Magalu não conectado</p>
          <Link href="/dashboard/integracoes" className="text-sm text-[#0086ff] hover:underline">
            Ir para Integrações →
          </Link>
        </div>
      ) : (
        <>
          {/* Connection info */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0086ff]/20 flex items-center justify-center text-lg">
                  🔵
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{status.seller_name ?? 'Seller Magalu'}</p>
                  <p className="text-xs text-slate-500">ID: {status.seller_id ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 bg-green-500/10 text-green-400 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
                <button onClick={loadData} className="p-2 text-slate-500 hover:text-slate-200 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Package, label: 'Produtos', value: String(kpis.totalProducts), color: 'text-[#0086ff]', bg: 'bg-[#0086ff]/10', href: '/dashboard/magalu/produtos' },
              { icon: ShoppingBag, label: 'Pedidos', value: String(kpis.totalOrders), color: 'text-[#0086ff]', bg: 'bg-[#0086ff]/10', href: '/dashboard/magalu/pedidos' },
              { icon: TrendingUp, label: 'Status', value: 'Produção', color: 'text-green-400', bg: 'bg-green-500/10', href: '#' },
            ].map(k => (
              <Link key={k.label} href={k.href} className="glass-card p-4 hover:bg-white/[0.04] transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <k.icon className={`w-4 h-4 ${k.color}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">{k.label}</p>
                    <p className="text-lg font-bold text-white">{k.value}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick links */}
          <div className="glass-card p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Links rápidos</p>
            <div className="flex flex-wrap gap-2">
              <a href="https://universo.magalu.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-400 hover:text-[#0086ff] transition-colors">
                <ExternalLink className="w-3 h-3" /> Portal Magalu
              </a>
              <Link href="/dashboard/magalu/produtos"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-400 hover:text-[#0086ff] transition-colors">
                <Package className="w-3 h-3" /> Ver Produtos
              </Link>
              <Link href="/dashboard/magalu/pedidos"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-400 hover:text-[#0086ff] transition-colors">
                <ShoppingBag className="w-3 h-3" /> Ver Pedidos
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
