'use client'

import { Bell, Search, LogOut } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="dash-header sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-xl">
      <div>
        <h2 className="text-lg font-bold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-44 pl-9 pr-4 py-2 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 focus:border-purple-600/40 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-orange-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
            3
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 ml-1 border-l border-white/[0.06]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            MP
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-200 leading-tight">Matheus Portela</p>
            <p className="text-[10px] text-slate-600">Diretor</p>
          </div>
          <Link href="/" className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] transition-all ml-1">
            <LogOut className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
