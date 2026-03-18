'use client'

import { usePathname } from 'next/navigation'
import MobileWarning from './MobileWarning'

// Pages where we show the mobile warning
const COMPLEX_PATHS = [
  '/dashboard/produtos-ml',
  '/dashboard/pedidos',
  '/dashboard/financeiro',
  '/dashboard/relatorios',
  '/dashboard/vendas-por-anuncio',
  '/dashboard/concorrentes',
]

export default function DashboardMobileWarning() {
  const pathname = usePathname()
  if (!COMPLEX_PATHS.some(p => pathname.startsWith(p))) return null
  return <MobileWarning />
}
