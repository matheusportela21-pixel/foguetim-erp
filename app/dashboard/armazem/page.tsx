'use client'

import { Warehouse, Package, Layers, ArrowLeftRight, Link2, Tag, Building2, MapPin, FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'

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

export default function ArmazemPage() {
  return (
    <div>
      <Header title="Armazém" subtitle="Central de gestão do seu estoque interno" />

      <div className="p-6 space-y-6">
        {/* Hero card */}
        <div className="glass-card p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Warehouse className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200 mb-1">Módulo Armazém</h2>
            <p className="text-sm text-slate-500 max-w-xl">
              Gerencie seu catálogo interno de produtos, controle o estoque por localização e vincule
              seus produtos aos anúncios em qualquer marketplace. Os dados do armazém são a fonte
              de verdade — os marketplaces refletem o que está aqui.
            </p>
          </div>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {MODULES.map(({ href, icon: Icon, label, description, color, iconColor, badge }) => (
            <Link
              key={href}
              href={href}
              className={`glass-card p-4 bg-gradient-to-br ${color} border transition-all group flex flex-col gap-3`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center ${iconColor}`}>
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
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
