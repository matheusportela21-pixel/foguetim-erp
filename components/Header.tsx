'use client'

import { Bell, Search, Sun, Moon, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/context/ThemeContext'
import { useSidebar } from '@/context/SidebarContext'

interface HeaderProps {
  title: string
  subtitle?: string
}

const ROLE_LABELS: Record<string, string> = {
  diretor: 'Diretor', director: 'Diretor',
  supervisor: 'Supervisor',
  analista_produtos: 'Analista de Produtos', analyst_products: 'Analista de Produtos',
  analista_financeiro: 'Analista Financeiro', analyst_financial: 'Analista Financeiro',
  suporte: 'Suporte', support: 'Suporte',
  operador: 'Operador', operator: 'Operador',
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { toggle } = useSidebar()

  const initials    = profile?.name
    ? profile.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'MP'
  const displayName = profile?.name ?? 'Usuário'
  const displayRole = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : 'Administrador'

  return (
    <header className="dash-header sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          aria-label="Abrir menu"
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base md:text-lg font-bold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search — hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-44 pl-9 pr-4 py-2 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 focus:border-purple-600/40 transition-all"
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          className="p-2 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-orange-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
            3
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 ml-1 border-l border-white/[0.06]">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-200 leading-tight">{displayName}</p>
            <p className="text-[10px] text-slate-600 capitalize">{displayRole}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
