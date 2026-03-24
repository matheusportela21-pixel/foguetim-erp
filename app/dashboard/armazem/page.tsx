'use client'

import { useEffect, useState } from 'react'
import {
  Warehouse, Package, Layers, ArrowLeftRight, Link2, Tag,
  Building2, MapPin, FileText, ChevronRight, AlertTriangle,
  TrendingUp, DollarSign, Unlink,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'

// ─── Module grid data (unchanged) ────────────────────────────────────────────

const MODULES = [
  {
    href: '/dashboard/armazem/produtos',
    icon: Package,
    label: 'Produtos',
    description: 'Catálogo interno com SKU, variações, kits e fichas completas',
    color: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40',
    iconColor: 'text-violet-400',
  },
  {
    href: '/dashboard/armazem/estoque',
    icon: Layers,
    label: 'Estoque',
    description: 'Posição atual por produto, armazém e localização',
    color: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40',
    iconColor: 'text-cyan-400',
  },
  {
    href: '/dashboard/armazem/movimentacoes',
    icon: ArrowLeftRight,
    label: 'Movimentações',
    description: 'Histórico completo de entradas, saídas e ajustes',
    color: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
    iconColor: 'text-amber-400',
  },
  {
    href: '/dashboard/armazem/mapeamentos',
    icon: Link2,
    label: 'Mapeamentos',
    description: 'Vínculos entre produtos do armazém e anúncios nos marketplaces',
    color: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40',
    iconColor: 'text-emerald-400',
  },
  {
    href: '/dashboard/armazem/categorias',
    icon: Tag,
    label: 'Categorias',
    description: 'Organização interna por categorias e subcategorias',
    color: 'from-pink-500/10 to-pink-500/5 border-pink-500/20 hover:border-pink-500/40',
    iconColor: 'text-pink-400',
  },
  {
    href: '/dashboard/armazem/armazens',
    icon: Building2,
    label: 'Armazéns',
    description: 'Gerencie múltiplos centros de distribuição',
    color: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40',
    iconColor: 'text-blue-400',
  },
  {
    href: '/dashboard/armazem/localizacoes',
    icon: MapPin,
    label: 'Localizações',
    description: 'Ruas, corredores, prateleiras e boxes do armazém',
    color: 'from-orange-500/10 to-orange-500/5 border-orange-500/20 hover:border-orange-500/40',
    iconColor: 'text-orange-400',
  },
  {
    href: '/dashboard/armazem/notas-entrada',
    icon: FileText,
    label: 'Notas de Entrada',
    description: 'Upload e processamento de NF-e de compra (Beta)',
    color: 'from-slate-500/10 to-slate-500/5 border-slate-500/20 hover:border-slate-500/40',
    iconColor: 'text-slate-400',
    badge: 'Beta',
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type MovementType =
  | 'entrada_manual' | 'saida_manual' | 'venda' | 'cancelamento' | 'ajuste'
  | 'transferencia_entrada' | 'transferencia_saida' | 'recebimento_nf'
  | 'devolucao' | 'kit_baixa'

interface RecentMovement {
  id: number
  movement_type: MovementType
  quantity_change: number
  created_at: string
  product: { id: number; sku: string; name: string } | null
  warehouse: { id: number; name: string } | null
}

interface KPIs {
  productCount: number
  totalStock: number
  totalValue: number
  unmappedCount: number
}

// ─── Movement type labels ─────────────────────────────────────────────────────

const MOVEMENT_META: Record<MovementType, { label: string; category: 'entrada' | 'saida' | 'neutro' }> = {
  entrada_manual:        { label: 'Entrada Manual',        category: 'entrada' },
  saida_manual:          { label: 'Saída Manual',          category: 'saida'   },
  venda:                 { label: 'Venda',                 category: 'saida'   },
  cancelamento:          { label: 'Cancelamento',          category: 'entrada' },
  ajuste:                { label: 'Ajuste',                category: 'neutro'  },
  transferencia_entrada: { label: 'Transferência Entrada', category: 'neutro'  },
  transferencia_saida:   { label: 'Transferência Saída',   category: 'neutro'  },
  recebimento_nf:        { label: 'Recebimento NF-e',      category: 'entrada' },
  devolucao:             { label: 'Devolução',             category: 'entrada' },
  kit_baixa:             { label: 'Baixa de Kit',          category: 'saida'   },
}

const CATEGORY_CLASS: Record<'entrada' | 'saida' | 'neutro', string> = {
  entrada: 'bg-emerald-900/40 text-emerald-400',
  saida:   'bg-red-900/40 text-red-400',
  neutro:  'bg-cyan-900/40 text-cyan-400',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArmazemPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [alerts, setAlerts] = useState<{ ruptura: number; unmapped: number }>({ ruptura: 0, unmapped: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, movRes] = await Promise.all([
          fetch('/api/armazem/produtos?limit=200'),
          fetch('/api/armazem/movimentacoes?limit=5'),
        ])

        // Products + KPIs
        if (prodRes.ok) {
          const prodData = await prodRes.json()
          const products: Array<{
            id: number
            cost_price?: number | null
            mappings?: unknown[]
            inventory?: Array<{ available_qty: number; warehouse_id: number }>
          }> = prodData.data ?? []
          const productCount: number = prodData.total ?? products.length

          let totalStock = 0
          let totalValue = 0
          let rupturaCount = 0
          let unmappedCount = 0

          for (const p of products) {
            const inv = p.inventory ?? []
            const pTotal = inv.reduce((sum: number, i: { available_qty: number }) => sum + (i.available_qty ?? 0), 0)
            totalStock += pTotal
            if (p.cost_price != null) {
              totalValue += pTotal * (p.cost_price as number)
            }
            if (inv.length > 0 && pTotal === 0) rupturaCount++
            if (!p.mappings || (p.mappings as unknown[]).length === 0) unmappedCount++
          }

          setKpis({ productCount, totalStock, totalValue, unmappedCount })
          setAlerts({ ruptura: rupturaCount, unmapped: unmappedCount })
        }

        // Recent movements
        if (movRes.ok) {
          const movData = await movRes.json()
          setRecentMovements(movData.data ?? [])
        }
      } catch {
        // silently fail — data will just be empty
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // ─── KPI cards config ─────────────────────────────────────────────────────

  const kpiCards = kpis
    ? [
        {
          label: 'Total de Produtos',
          value: kpis.productCount.toLocaleString('pt-BR'),
          icon: Package,
          iconClass: 'text-violet-400',
          bgClass: 'bg-violet-500/10',
          borderClass: 'border-violet-500/20',
        },
        {
          label: 'Total em Estoque',
          value: kpis.totalStock.toLocaleString('pt-BR') + ' un.',
          icon: Layers,
          iconClass: 'text-cyan-400',
          bgClass: 'bg-cyan-500/10',
          borderClass: 'border-cyan-500/20',
        },
        {
          label: 'Valor Estimado',
          value: kpis.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          icon: DollarSign,
          iconClass: 'text-emerald-400',
          bgClass: 'bg-emerald-500/10',
          borderClass: 'border-emerald-500/20',
        },
        {
          label: 'Sem Mapeamento',
          value: kpis.unmappedCount.toLocaleString('pt-BR'),
          icon: Unlink,
          iconClass: kpis.unmappedCount > 0 ? 'text-amber-400' : 'text-slate-500',
          bgClass: kpis.unmappedCount > 0 ? 'bg-amber-500/10' : 'bg-white/[0.03]',
          borderClass: kpis.unmappedCount > 0 ? 'border-amber-500/30' : 'border-white/[0.06]',
        },
      ]
    : null

  return (
    <div className="min-h-screen bg-[#03050f]">
      <PageHeader title="Armazém" description="Central de gestão do seu estoque interno" />

      <div className="p-6 space-y-6">

        {/* ── KPI bar ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading || !kpiCards
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-4 space-y-3">
                  <div className="animate-pulse bg-white/[0.04] rounded h-8 w-8" />
                  <div className="animate-pulse bg-white/[0.04] rounded h-4 w-2/3" />
                  <div className="animate-pulse bg-white/[0.04] rounded h-6 w-1/2" />
                </div>
              ))
            : kpiCards.map(card => {
                const Icon = card.icon
                return (
                  <div key={card.label} className={`glass-card p-4 border ${card.borderClass} flex flex-col gap-2`}>
                    <div className={`w-8 h-8 rounded-lg ${card.bgClass} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${card.iconClass}`} />
                    </div>
                    <p className="text-xs text-slate-500">{card.label}</p>
                    <p className="text-lg font-semibold text-slate-100 leading-tight">{card.value}</p>
                  </div>
                )
              })}
        </div>

        {/* ── Alerts ── */}
        {!loading && (alerts.ruptura > 0 || alerts.unmapped > 0) && (
          <div className="space-y-2">
            {alerts.ruptura > 0 && (
              <Link
                href="/dashboard/armazem/estoque"
                className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15 hover:border-red-500/30 transition-colors group"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs text-red-300">
                  {alerts.ruptura} produto{alerts.ruptura !== 1 ? 's' : ''} com ruptura de estoque
                </span>
                <ChevronRight className="w-3 h-3 text-red-400/40 ml-auto group-hover:text-red-400 transition-colors" />
              </Link>
            )}
            {alerts.unmapped > 0 && (
              <Link
                href="/dashboard/armazem/mapeamentos"
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:border-amber-500/30 transition-colors group"
              >
                <Unlink className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300">
                  {alerts.unmapped} produto{alerts.unmapped !== 1 ? 's' : ''} sem mapeamento para marketplace
                </span>
                <ChevronRight className="w-3 h-3 text-amber-400/40 ml-auto group-hover:text-amber-400 transition-colors" />
              </Link>
            )}
          </div>
        )}

        {/* ── Hero card + Recent movements (side by side on large screens) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hero */}
          <div className="glass-card p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Warehouse className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-200 mb-1">Módulo Armazém</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Gerencie seu catálogo interno de produtos, controle o estoque por localização e vincule
                seus produtos aos anúncios em qualquer marketplace. Os dados do armazém são a fonte
                de verdade — os marketplaces refletem o que está aqui.
              </p>
            </div>
          </div>

          {/* Recent movements */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Movimentações Recentes</p>
              </div>
              <Link href="/dashboard/armazem/movimentacoes" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Ver todas →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white/[0.04] rounded h-8 w-full" />
                ))}
              </div>
            ) : recentMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ArrowLeftRight className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs text-slate-600">Nenhuma movimentação ainda</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentMovements.map(m => {
                  const meta = MOVEMENT_META[m.movement_type as MovementType]
                  const isPositive = m.quantity_change > 0
                  const isNegative = m.quantity_change < 0
                  return (
                    <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      {meta && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${CATEGORY_CLASS[meta.category]}`}>
                          {meta.label}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
                        {m.product?.name ?? '—'}
                      </span>
                      <span className={`text-xs font-mono font-semibold shrink-0 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-500'}`}>
                        {isPositive ? `+${m.quantity_change}` : String(m.quantity_change)}
                      </span>
                      <span className="text-[10px] text-slate-600 shrink-0">
                        {new Date(m.created_at).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Module grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {MODULES.map(({ href, icon: Icon, label, description, color, iconColor, badge }) => (
            <Link
              key={href}
              href={href}
              className={`glass-card p-4 bg-gradient-to-br ${color} border transition-all group flex flex-col gap-3`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center ${iconColor}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                {badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-900/40 text-blue-400 ring-1 ring-blue-700/40">
                    {badge}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors mb-0.5">{label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                <span>Acessar</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
