'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, Calculator, FileText, TrendingUp,
  Rocket, ShoppingCart, FileCheck, Link2, Users, Settings, LogOut,
  Send, UserCheck, BarChart3, HelpCircle, MessagesSquare, ShieldCheck, Star,
  AlertTriangle, BarChart2, Bell, Megaphone, Shield, ExternalLink, MessageSquare, Tag, Scale, Archive, Activity, Calendar,
  DollarSign, ChevronDown, ChevronRight, Zap,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import { useSidebar } from '@/context/SidebarContext'

type NavItem = { href: string; icon: React.ElementType; label: string; badge?: string; roles?: string[]; disabled?: boolean }
type NavGroup = {
  label: string
  marketplaceDot?: string // color for dot indicator e.g. 'bg-yellow-400'
  items: NavItem[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

const navGroups: NavGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard'   },
      { href: '/dashboard/financeiro', icon: TrendingUp,      label: 'Financeiro'  },
      { href: '/dashboard/calendario', icon: Calendar,        label: 'Calendário'  },
    ],
  },
  {
    label: 'Mercado Livre',
    marketplaceDot: 'bg-yellow-400',
    collapsible: true,
    defaultCollapsed: false,
    items: [
      { href: '/dashboard/pedidos',      icon: ShoppingCart,  label: 'Pedidos'        },
      { href: '/dashboard/produtos-ml',  icon: Package,       label: 'Produtos'       },
      { href: '/dashboard/estoque',      icon: Archive,       label: 'Estoque'        },
      { href: '/dashboard/precificacao', icon: Calculator,    label: 'Precificação'   },
      { href: '/dashboard/promocoes',    icon: Tag,           label: 'Promoções'      },
      { href: '/dashboard/pos-venda',    icon: MessageSquare, label: 'Pós-Venda'      },
      { href: '/dashboard/expedicao',    icon: Send,          label: 'Expedição'      },
      { href: '/dashboard/reputacao',    icon: ShieldCheck,   label: 'Reputação'      },
      { href: '/dashboard/performance',  icon: BarChart2,     label: 'Performance'    },
      { href: '/dashboard/saude',        icon: Activity,      label: 'Saúde da Conta' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/dashboard/vendas-por-anuncio', icon: TrendingUp, label: 'Vendas por Anúncio' },
      { href: '/dashboard/concorrentes',       icon: Users,      label: 'Concorrentes'        },
      { href: '/dashboard/reviews',            icon: Star,       label: 'Reviews'             },
      { href: '/dashboard/relatorios',         icon: BarChart3,  label: 'Relatórios'          },
      { href: '/dashboard/clientes',           icon: UserCheck,  label: 'Clientes'            },
      { href: '/dashboard/publicidade',        icon: Megaphone,  label: 'Publicidade', badge: 'Beta', roles: ['admin', 'foguetim_support'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard/integracoes',   icon: Link2,      label: 'Integrações'      },
      { href: '/dashboard/equipe',        icon: Users,      label: 'Equipe'           },
      { href: '/dashboard/notificacoes',  icon: Bell,       label: 'Notificações'     },
      { href: '/dashboard/configuracoes', icon: Settings,   label: 'Configurações'    },
      { href: '/dashboard/conciliacao',   icon: Scale,      label: 'Conciliação',     roles: ['admin', 'super_admin', 'owner', 'foguetim_support', 'diretor', 'director'] },
      { href: '/dashboard/nfe',           icon: FileCheck,  label: 'NF-e',            roles: ['admin', 'super_admin', 'owner', 'foguetim_support'] },
      { href: '/dashboard/ajuda',         icon: HelpCircle, label: 'Central de Ajuda' },
    ],
  },
  {
    label: 'Shopee',
    marketplaceDot: 'bg-orange-400',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { href: '/dashboard/shopee', icon: Zap, label: 'Em breve', badge: 'Breve', disabled: true },
    ],
  },
  {
    label: 'Amazon',
    marketplaceDot: 'bg-blue-400',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { href: '/dashboard/amazon', icon: Zap, label: 'Em breve', badge: 'Breve', disabled: true },
    ],
  },
]

const badgeColors: Record<string, string> = {
  Dev:   'bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40',
  Breve: 'bg-purple-900/40 text-purple-400 ring-1 ring-purple-700/40',
  Novo:  'bg-green-900/40 text-green-400 ring-1 ring-green-700/40',
  Beta:  'bg-blue-900/40 text-blue-400 ring-1 ring-blue-700/40',
}

const ROLE_LABELS: Record<string, string> = {
  admin:               'Administrador',
  super_admin:         'Super Admin',
  owner:               'Proprietário',
  foguetim_support:    'Suporte Foguetim',
  diretor:             'Diretor',
  supervisor:          'Supervisor',
  analista_produtos:   'Analista de Produtos',
  analista_financeiro: 'Analista Financeiro',
  suporte:             'Suporte',
  operador:            'Operador',
  director:            'Diretor',
  analyst_products:    'Analista de Produtos',
  analyst_financial:   'Analista Financeiro',
  support:             'Suporte',
  operator:            'Operador',
}

interface PlanCfg { label: string; limit: number; badge: string }

const PLAN_CONFIG: Record<string, PlanCfg> = {
  explorador:      { label: 'Explorador',      limit: 10,       badge: 'text-slate-400 bg-slate-900/30'   },
  comandante:      { label: 'Comandante',       limit: 500,      badge: 'text-indigo-400 bg-indigo-900/30' },
  almirante:       { label: 'Almirante',        limit: Infinity, badge: 'text-purple-400 bg-purple-900/30' },
  missao_espacial: { label: 'Missão Espacial',  limit: Infinity, badge: 'text-amber-400 bg-amber-900/30'   },
  enterprise:      { label: 'Enterprise',       limit: Infinity, badge: 'text-amber-400 bg-amber-900/30'   },
  explorer:        { label: 'Explorador',       limit: 10,       badge: 'text-slate-400 bg-slate-900/30'   },
  piloto:          { label: 'Piloto',            limit: 200,      badge: 'text-blue-400 bg-blue-900/30'     },
  crescimento:     { label: 'Crescimento',       limit: 200,      badge: 'text-blue-400 bg-blue-900/30'     },
  commander:       { label: 'Comandante',        limit: 500,      badge: 'text-indigo-400 bg-indigo-900/30' },
  admiral:         { label: 'Almirante',         limit: Infinity, badge: 'text-purple-400 bg-purple-900/30' },
}

const DEFAULT_PLAN: PlanCfg = {
  label: 'Explorador', limit: 10, badge: 'text-slate-400 bg-slate-900/30',
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile, signOut } = useAuth()
  const { isOpen, close }    = useSidebar()

  const [productCount, setProductCount] = useState<number | null>(null)
  const [claimCount,   setClaimCount]   = useState<number>(0)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navGroups.forEach(g => {
      if (g.collapsible && g.defaultCollapsed) initial[g.label] = true
    })
    return initial
  })

  useEffect(() => {
    if (!profile?.id || !isConfigured()) return
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .then(({ count }) => setProductCount(count ?? 0))
  }, [profile?.id])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('claims_count_cache')
      if (!raw) return
      const parsed = JSON.parse(raw) as { count: number; ts: number }
      if (Date.now() - parsed.ts < 5 * 60 * 1000) {
        setClaimCount(parsed.count)
      }
    } catch { /* ignore */ }
  }, [])

  const initials    = profile?.name
    ? profile.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'MP'
  const displayName = profile?.name || profile?.email?.split('@')[0] || 'Usuário'
  const displayRole = profile?.role
    ? (ROLE_LABELS[profile.role] ?? profile.role)
    : 'Administrador'

  const planCfg   = profile?.plan ? (PLAN_CONFIG[profile.plan] ?? DEFAULT_PLAN) : DEFAULT_PLAN
  const unlimited  = !isFinite(planCfg.limit)
  const barPct     = unlimited
    ? 100
    : productCount !== null
      ? Math.min(100, Math.round((productCount / planCfg.limit) * 100))
      : 0
  const countText  = unlimited
    ? 'Ilimitado'
    : productCount !== null
      ? `${productCount} / ${planCfg.limit} produtos`
      : '...'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={[
          'w-60 flex-shrink-0 flex flex-col h-full bg-[var(--bg-sidebar,#10141d)] border-r border-white/[0.06]',
          'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a1f4e] to-[#6c3fa0] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-none tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim</p>
              <p className="text-[9px] text-slate-600 mt-0.5 font-medium tracking-wide uppercase">ERP · v1.0</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navGroups.map(group => {
            const isCollapsed = collapsedGroups[group.label] ?? false
            const visibleItems = group.items.filter(item =>
              !item.roles || item.roles.includes(profile?.role ?? '')
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label}>
                {/* Group header */}
                <button
                  onClick={() => group.collapsible ? toggleGroup(group.label) : undefined}
                  className={`w-full flex items-center gap-1.5 px-2 mb-1 ${group.collapsible ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
                >
                  {group.marketplaceDot && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${group.marketplaceDot}`} />
                  )}
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex-1 text-left">
                    {group.label}
                  </p>
                  {group.collapsible && (
                    isCollapsed
                      ? <ChevronRight className="w-3 h-3 text-slate-700" />
                      : <ChevronDown className="w-3 h-3 text-slate-700" />
                  )}
                </button>

                {!isCollapsed && (
                  <ul className="space-y-0.5">
                    {visibleItems.map(({ href, icon: Icon, label, badge, disabled }) => {
                      const active = !disabled && (pathname === href || (href !== '/dashboard' && pathname.startsWith(href)))
                      const isPosVenda = href === '/dashboard/pos-venda'
                      return (
                        <li key={href}>
                          {disabled ? (
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none">
                              <Icon className="w-4 h-4 shrink-0 text-slate-700" />
                              <span className="flex-1 truncate text-slate-600">{label}</span>
                              {badge && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColors[badge] ?? 'bg-slate-800 text-slate-500'}`}>
                                  {badge}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Link
                              href={href}
                              onClick={close}
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all group ${
                                active
                                  ? 'nav-active'
                                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                              }`}
                            >
                              <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'nav-active-icon' : 'text-slate-600 group-hover:text-slate-400'}`} />
                              <span className="flex-1 truncate">{label}</span>
                              {badge && badge !== 'Breve' && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColors[badge] ?? 'bg-slate-800 text-slate-500'}`}>
                                  {badge}
                                </span>
                              )}
                              {isPosVenda && claimCount > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-400 ring-1 ring-orange-700/40 animate-pulse">
                                  {claimCount}
                                </span>
                              )}
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>

        {/* Plan widget */}
        <div className="mx-2.5 mb-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] text-slate-700 font-semibold uppercase tracking-wider">Plano</p>
            {profile === null ? (
              <div className="h-4 w-16 bg-white/[0.05] animate-pulse rounded-full" />
            ) : (
              <Link
                href="/planos"
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full hover:opacity-80 transition-opacity ${planCfg.badge}`}
                title="Ver planos disponíveis"
              >
                {planCfg.label}
              </Link>
            )}
          </div>
          {profile !== null && (
            <>
              {!unlimited && (
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-500"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              )}
              <p className="text-[9px] text-slate-700">{countText}</p>
              {!unlimited && (
                <Link
                  href="/planos"
                  className="mt-1 block text-[9px] font-semibold text-purple-500 hover:text-purple-400 transition-colors"
                >
                  Fazer upgrade →
                </Link>
              )}
            </>
          )}
        </div>

        {/* Admin button */}
        {(profile?.role === 'admin' || profile?.role === 'foguetim_support') && (
          <div className="px-2.5 pb-2">
            <Link
              href="/admin"
              onClick={close}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/50 text-indigo-400 border border-indigo-800/40 hover:bg-indigo-900/50 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">Painel Admin</span>
              <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
            </Link>
          </div>
        )}

        {/* User */}
        <div className="px-2.5 pb-3 border-t border-white/[0.06] pt-2.5">
          <div className="flex items-center gap-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a1f4e] to-[#6c3fa0] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate leading-none">{displayName}</p>
              <p className="text-[9px] text-slate-600 truncate mt-0.5">{displayRole}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
