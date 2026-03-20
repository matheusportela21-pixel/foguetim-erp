'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, XCircle,
  FileText, Bell, LogOut, Shield, ChevronRight,
  Ticket, UserCog, Wrench, Webhook, Megaphone, Bot,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const ADMIN_ROLE_LABELS: Record<string, string> = {
  admin:            'Administrador',
  super_admin:      'Super Admin',
  owner:            'Proprietário',
  foguetim_support: 'Suporte Foguetim',
}

const NAV = [
  { href: '/admin',               icon: LayoutDashboard, label: 'Visão Geral'     },
  { href: '/admin/usuarios',      icon: Users,           label: 'Usuários'         },
  { href: '/admin/equipe',        icon: UserCog,         label: 'Equipe'           },
  { href: '/admin/tickets',       icon: Ticket,          label: 'Tickets'          },
  { href: '/admin/cancelamentos', icon: XCircle,         label: 'Cancelamentos'    },
  { href: '/admin/notificacoes',  icon: Bell,            label: 'Notificações'     },
  { href: '/admin/avisos',        icon: Megaphone,       label: 'Avisos & Changelog'},
  { href: '/admin/logs',          icon: FileText,        label: 'Logs do Sistema'  },
  { href: '/admin/ferramentas',   icon: Wrench,          label: 'Ferramentas'      },
  { href: '/admin/webhooks',      icon: Webhook,         label: 'Webhooks ML'      },
  { href: '/admin/agentes',       icon: Bot,             label: 'Agentes de IA'    },
]

function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { profile } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen bg-[#0f1117] border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim
            </p>
            <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">Admin</span>
          </div>
          <span className="ml-auto text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">
            INTERNO
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map(item => {
          const Icon   = item.icon
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                active
                  ? 'bg-red-600/20 text-red-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-red-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
              {item.label}
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-red-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
        >
          <LayoutDashboard className="w-4 h-4 shrink-0 text-slate-600" />
          Voltar ao Dashboard
        </Link>
        <div className="px-3 py-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-red-600/30 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
            {(profile?.name || profile?.email)?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300 truncate">
              {profile?.name || profile?.email?.split('@')[0] || 'Admin'}
            </p>
            <p className="text-[10px] text-red-400 uppercase tracking-wide">
              {profile?.role ? (ADMIN_ROLE_LABELS[profile.role] ?? profile.role) : 'Admin'}
            </p>
          </div>
          <button onClick={handleLogout} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="flex h-screen overflow-hidden bg-[#080b10] text-slate-200">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
