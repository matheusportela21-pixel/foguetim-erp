'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, Calculator, FileText, TrendingUp,
  Rocket, ShoppingCart, FileCheck, Link2, Users, Settings, LogOut,
  Send, UserCheck, BarChart3, HelpCircle, MessagesSquare, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const navGroups = [
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
      { href: '/dashboard/pedidos',      icon: ShoppingCart,    label: 'Pedidos'                },
      { href: '/dashboard/sac',          icon: MessagesSquare,  label: 'SAC',     badge: 'Novo'  },
      { href: '/dashboard/expedicao',    icon: Send,            label: 'Expedição', badge: 'Dev' },
      { href: '/dashboard/nfe',          icon: FileCheck,       label: 'NF-e',    badge: 'Breve' },
      { href: '/dashboard/integracoes',  icon: Link2,           label: 'Integrações'             },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/dashboard/relatorios', icon: BarChart3,   label: 'Relatórios' },
      { href: '/dashboard/reputacao',  icon: ShieldCheck, label: 'Reputação'  },
      { href: '/dashboard/clientes',   icon: UserCheck,   label: 'Clientes'   },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/dashboard/equipe',        icon: Users,      label: 'Equipe'        },
      { href: '/dashboard/configuracoes', icon: Settings,   label: 'Configurações' },
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
  diretor:             'Diretor · Admin',
  supervisor:          'Supervisor',
  analista_produtos:   'Analista de Produtos',
  analista_financeiro: 'Analista Financeiro',
  suporte:             'Suporte',
  operador:            'Operador',
}

const PLAN_LABELS: Record<string, string> = {
  explorador:  'Explorador',
  crescimento: 'Crescimento',
  comandante:  'Comandante',
  enterprise:  'Enterprise',
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile, signOut } = useAuth()

  const initials    = profile?.name
    ? profile.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'MP'
  const displayName = profile?.name ?? 'Usuário'
  const displayRole = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : 'Administrador'
  const displayPlan = profile?.plan ? (PLAN_LABELS[profile.plan] ?? profile.plan) : 'Free'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full bg-dark-900 border-r border-white/[0.06] relative z-20">

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
              {group.items.map(({ href, icon: Icon, label, badge }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <li key={href}>
                    <Link
                      href={href}
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
          <span className="text-[10px] font-bold text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded-full">{displayPlan}</span>
        </div>
        <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden mb-1.5">
          <div className="h-full w-[57%] rounded-full bg-gradient-to-r from-purple-600 to-cyan-500" />
        </div>
        <p className="text-[10px] text-slate-600">Gerencie seu catálogo</p>
      </div>

      {/* User */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-2.5">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
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
  )
}
