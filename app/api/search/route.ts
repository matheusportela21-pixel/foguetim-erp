import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/* ── Static page index ─────────────────────────────────────────────────── */
const SYSTEM_PAGES = [
  { label: 'Dashboard',          href: '/dashboard',                 icon: 'Home' },
  { label: 'Pedidos ML',         href: '/dashboard/pedidos',         icon: 'ShoppingBag' },
  { label: 'Produtos ML',        href: '/dashboard/produtos-ml',     icon: 'Package' },
  { label: 'Pedidos Magalu',     href: '/dashboard/magalu/pedidos',  icon: 'ShoppingCart' },
  { label: 'Produtos Magalu',    href: '/dashboard/magalu/produtos', icon: 'Package' },
  { label: 'Pedidos Shopee',     href: '/dashboard/shopee/pedidos',  icon: 'ShoppingBag' },
  { label: 'Produtos Shopee',    href: '/dashboard/shopee/produtos', icon: 'Package' },
  { label: 'Financeiro',         href: '/dashboard/financeiro',      icon: 'DollarSign' },
  { label: 'DRE',                href: '/dashboard/financeiro/dre',  icon: 'BarChart3' },
  { label: 'Custos',             href: '/dashboard/financeiro/custos', icon: 'Calculator' },
  { label: 'Precificação',       href: '/dashboard/precificacao',    icon: 'Calculator' },
  { label: 'Estoque',            href: '/dashboard/estoque',         icon: 'Archive' },
  { label: 'Armazém',            href: '/dashboard/armazem/overview', icon: 'Warehouse' },
  { label: 'Armazém Produtos',   href: '/dashboard/armazem/produtos', icon: 'Package' },
  { label: 'Mapeamentos',        href: '/dashboard/armazem/mapeamentos', icon: 'ArrowLeftRight' },
  { label: 'Categorias',         href: '/dashboard/armazem/categorias', icon: 'Tag' },
  { label: 'Movimentações',      href: '/dashboard/armazem/movimentacoes', icon: 'ArrowLeftRight' },
  { label: 'Notas de Entrada',   href: '/dashboard/armazem/notas-entrada', icon: 'FileText' },
  { label: 'Localizações',       href: '/dashboard/armazem/localizacoes', icon: 'MapPin' },
  { label: 'Integrações',        href: '/dashboard/integracoes',     icon: 'Link2' },
  { label: 'Equipe',             href: '/dashboard/equipe',          icon: 'Users' },
  { label: 'Configurações',      href: '/dashboard/configuracoes',   icon: 'Settings' },
  { label: 'Notificações',       href: '/dashboard/notificacoes',    icon: 'Bell' },
  { label: 'Reputação',          href: '/dashboard/reputacao',       icon: 'Shield' },
  { label: 'Reviews',            href: '/dashboard/reviews',         icon: 'Star' },
  { label: 'SAC',                href: '/dashboard/sac',             icon: 'MessageSquare' },
  { label: 'Pós-Venda',          href: '/dashboard/pos-venda',       icon: 'MessageCircle' },
  { label: 'Reclamações',        href: '/dashboard/reclamacoes',     icon: 'AlertTriangle' },
  { label: 'Clientes',           href: '/dashboard/clientes',        icon: 'Users' },
  { label: 'Expedição',          href: '/dashboard/expedicao',       icon: 'Truck' },
  { label: 'NF-e',               href: '/dashboard/nfe',             icon: 'FileText' },
  { label: 'Relatórios',         href: '/dashboard/relatorios',      icon: 'Download' },
  { label: 'Calendário',         href: '/dashboard/calendario',      icon: 'Calendar' },
  { label: 'Performance',        href: '/dashboard/performance',     icon: 'BarChart' },
  { label: 'Concorrentes',       href: '/dashboard/concorrentes',    icon: 'Eye' },
  { label: 'Blog',               href: '/dashboard/blog',            icon: 'BookOpen' },
  { label: 'Changelog',          href: '/dashboard/changelog',       icon: 'Sparkles' },
  { label: 'Ajuda',              href: '/dashboard/ajuda',           icon: 'HelpCircle' },
  { label: 'Saúde da Conta',     href: '/dashboard/saude',           icon: 'Activity' },
  { label: 'Vendas por Anúncio', href: '/dashboard/vendas-por-anuncio', icon: 'BarChart3' },
  { label: 'Promoções',          href: '/dashboard/promocoes',       icon: 'Megaphone' },
  { label: 'Devoluções',         href: '/dashboard/devolucoes',      icon: 'RotateCcw' },
  { label: 'Conciliação',        href: '/dashboard/conciliacao',     icon: 'CheckSquare' },
  { label: 'Listagens IA',       href: '/dashboard/listagens',       icon: 'Cpu' },
  { label: 'Magalu Overview',    href: '/dashboard/magalu/overview', icon: 'BarChart3' },
  { label: 'Shopee Overview',    href: '/dashboard/shopee/overview', icon: 'BarChart3' },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    if (!query || query.length < 2) {
      return NextResponse.json({ products: [], orders: [], pages: [] })
    }

    const { userId } = await resolveDataOwner()
    if (!userId) {
      return NextResponse.json({ products: [], orders: [], pages: [] })
    }

    const q = query.toLowerCase()

    // Search pages (static, instant)
    const pages = SYSTEM_PAGES
      .filter(p => p.label.toLowerCase().includes(q))
      .slice(0, 8)

    // Search warehouse products + orders in parallel
    const [productsRes, ordersRes] = await Promise.allSettled([
      supabaseAdmin()
        .from('warehouse_products')
        .select('id, name, sku, ean')
        .eq('user_id', userId)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(5),
      supabaseAdmin()
        .from('orders')
        .select('id, order_id, buyer_name, total, marketplace')
        .eq('user_id', userId)
        .or(`order_id.ilike.%${query}%,buyer_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const products = productsRes.status === 'fulfilled' ? (productsRes.value.data ?? []) : []
    const orders   = ordersRes.status === 'fulfilled'   ? (ordersRes.value.data ?? [])   : []

    return NextResponse.json({ products, orders, pages })
  } catch (err) {
    console.error('[search] error:', err)
    return NextResponse.json({ products: [], orders: [], pages: [] })
  }
}
