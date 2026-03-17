'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, Calculator, FileText, TrendingUp,
  Rocket, ShoppingCart, FileCheck, Link2, Users, Settings, LogOut,
  Send, UserCheck, BarChart3, HelpCircle, MessagesSquare, ShieldCheck, Star,
  AlertTriangle, BarChart2, Bell, Megaphone, Shield, ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import { useSidebar } from '@/context/SidebarContext'

type NavItem = { href: string; icon: React.ElementType; label: string; badge?: string; roles?: string[] }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard'    },
      { href: '/dashboard/produtos',     icon: Package,          label: 'Produtos'     },
      { href: '/dashboard/precificacao', icon: Calculator,       label: 'Precificação' },
      { href: '/dashboard/listagens',    icon: FileText,         label: 'Listagens'    },
      { href: '/dashboard/financeiro',   icon: TrendingUp,       label: 'Financeiro'   },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/dashboard/pedidos',      icon: ShoppingCart,    label: 'Pedidos'                 },
      { href: '/dashboard/sac',           icon: MessagesSquare,  label: 'SAC',          badge: 'Novo'  },
      { href: '/dashboard/reclamacoes',  icon: AlertTriangle,   label: 'Reclamações'                },
      { href: '/dashboard/expedicao',    icon: Send,            label: 'Expedição', badge: 'Dev'  },
      { href: '/dashboard/nfe',          icon: FileCheck,       label: 'NF-e'                  },
      { href: '/dashboard/integracoes',  icon: Link2,           label: 'Integrações'              },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/dashboard/publicidade',         icon: Megaphone,   label: 'Publicidade', badge: 'Beta', roles: ['admin', 'foguetim_support'] },
      { href: '/dashboard/performance',        icon: BarChart2,   label: 'Performance'         },
      { href: '/dashboard/relatorios',         icon: BarChart3,   label: 'Relatórios'          },
      { href: '/dashboard/reputacao',          icon: ShieldCheck, label: 'Reputação'           },
      { href: '/dashboard/vendas-por-anuncio', icon: TrendingUp,  label: 'Vendas por Anúncio'  },
      { href: '/dashboard/concorrentes',       icon: Users,       label: 'Concorrentes'        },
      { href: '/dashboard/reviews',            icon: Star,        label: 'Reviews'             },
      { href: '/dashboard/clientes',           icon: UserCheck,   label: 'Clientes'            },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/dashboard/equipe',          icon: Users,       label: 'Equipe'         },
      { href: '/dashboard/contador',        icon: Calculator,  label: 'Contador'       },
      { href: '/dashboard/notificacoes',    icon: Bell,        label: 'Notificações'   },
      { href: '/dashboard/configuracoes',   icon: Settings,    label: 'Configurações'  },
    ],
  },
  {
    label: 'Suporte',
    items: [
      { href: '/dashboard/ajuda', icon: HelpCircle, label: 'Central de Ajuda' },
    ],
  },
]

const badgeColors: Record<string, string> = {
  Dev:   'bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40',
  Breve: 'bg-purple-900/40 text-purple-400 ring-1 ring-purple-700/40',
  Novo:  'bg-green-900/40 text-green-400 ring-1 ring-green-700/40',
}

const ROLE_LABELS: Record<string, string> = {
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
  // Active plans
  explorador:      { label: 'Explorador',      limit: 10,       badge: 'text-slate-400 bg-slate-900/30'   },
  comandante:      { label: 'Comandante',       limit: 500,      badge: 'text-indigo-400 bg-indigo-900/30' },
  almirante:       { label: 'Almirante',        limit: Infinity, badge: 'text-purple-400 bg-purple-900/30' },
  missao_espacial: { label: 'Missão Espacial',  limit: Infinity, badge: 'text-amber-400 bg-amber-900/30'   },
  enterprise:      { label: 'Enterprise',       limit: Infinity, badge: 'text-amber-400 bg-amber-900/30'   },
  // Legacy aliases — kept for DB compatibility
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
  const displayName = profile?.name ?? 'Usuário'
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
      : 'Carregando...'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
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
          'w-60 flex-shrink-0 flex flex-col h-full bg-dark-900 border-r border-white/[0.06]',
          // Mobile: fixed drawer, slides in from left
          'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
          // Desktop: relative (normal flow), always visible
          'md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center shadow-neon-purple group-hover:scale-105 transition-transform">
              <Rocket className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <p className="font-bold text-base text-white leading-none" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim</p>
              <p className="text-[10px] text-slate-600 mt-0.5 font-medium">ERP v1.0</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest px-2 mb-2">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.filter(item =>
                  !item.roles || item.roles.includes(profile?.role ?? '')
                ).map(({ href, icon: Icon, label, badge }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  const isReclamacoes = href === '/dashboard/reclamacoes'
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={close}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                          active
                            ? 'nav-active'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'nav-active-icon' : 'text-slate-600 group-hover:text-slate-400'}`} />
                        <span className="flex-1 truncate">{label}</span>
                        {badge && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColors[badge] ?? 'bg-slate-800 text-slate-500'}`}>
                            {badge}
                          </span>
                        )}
                        {isReclamacoes && claimCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-400 ring-1 ring-red-700/40 animate-pulse">
                            {claimCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Plan widget */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-dark-700 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">Plano Ativo</p>
            {profile === null ? (
              <div className="h-4 w-16 bg-dark-600 animate-pulse rounded-full" />
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
          {profile === null ? (
            <div className="h-3 w-28 bg-dark-600 animate-pulse rounded mt-1" />
          ) : (
            <>
              {!unlimited && (
                <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-500"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              )}
              <p className="text-[10px] text-slate-600">{countText}</p>
              {/* Upgrade CTA — only for limited plans */}
              {!unlimited && (
                <Link
                  href="/planos"
                  className="mt-1.5 block text-[10px] font-semibold text-purple-500 hover:text-purple-400 transition-colors"
                >
                  Fazer upgrade →
                </Link>
              )}
            </>
          )}
        </div>

        {/* Admin button */}
        {(profile?.role === 'admin' || profile?.role === 'foguetim_support') && (
          <div className="px-3 pb-2">
            <Link
              href="/admin"
              onClick={close}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium bg-indigo-950/50 text-indigo-400 border border-indigo-800/40 hover:bg-indigo-900/50 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">Painel Admin</span>
              <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
            </Link>
          </div>
        )}

        {/* User */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2.5">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-600 truncate">{displayRole}</p>
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
