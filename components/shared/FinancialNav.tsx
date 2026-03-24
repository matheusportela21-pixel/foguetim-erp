'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, FileText, DollarSign, Download } from 'lucide-react'

const TABS = [
  { label: 'Dashboard', href: '/dashboard/financeiro',        icon: BarChart3 },
  { label: 'DRE',       href: '/dashboard/financeiro/dre',    icon: FileText  },
  { label: 'Custos',    href: '/dashboard/financeiro/custos', icon: DollarSign },
  { label: 'Relatórios', href: '/dashboard/relatorios',       icon: Download  },
]

export function FinancialNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {TABS.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              active
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/25'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
