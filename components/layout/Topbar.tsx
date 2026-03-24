'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home, Package, ShoppingCart, DollarSign, Bot,
  BarChart3, Box, Layers, ArrowLeftRight, Link2, Tag,
  Warehouse, MapPin, ShoppingBag, MessageSquare, Star,
  Send, Truck, Calculator, FileText, Receipt, Download,
  Bell, Cpu, Settings, Users, HelpCircle, LogOut, Shield,
  Menu, X, ChevronDown, ChevronRight, Plus, ExternalLink,
  Eye, Megaphone, Scale, BarChart, Activity, Archive,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import { useConnectedMarketplaces } from '@/lib/hooks/useConnectedMarketplaces'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { megaMenu, mobileMenu } from '@/lib/animations'

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  Home, Package, ShoppingCart, DollarSign, Bot, BarChart3, Box, Layers,
  ArrowLeftRight, Link2, Tag, Warehouse, MapPin, ShoppingBag, MessageSquare,
  Star, Send, Truck, Calculator, FileText, Receipt, Download, Bell, Cpu,
  Settings, Users, HelpCircle, LogOut, Shield, Plus, ExternalLink,
  Eye, Megaphone, Scale, BarChart, Activity, Archive, Menu, X, ChevronDown,
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface MenuItem {
  label: string
  href: string
  icon?: string
}

interface MenuSection {
  title: string
  color?: string
  visible?: string // 'hasML' | 'hasShopee' | 'hasMagalu'
  items?: MenuItem[]
  href?: string
  icon?: string
  isAction?: boolean
}

interface TopMenu {
  label: string
  icon: string
  href?: string          // direct link (no dropdown)
  items?: MenuItem[]     // simple dropdown
  sections?: MenuSection[] // mega-menu with sections
}

// ─── Menu config ─────────────────────────────────────────────────────────────

const TOPBAR_MENUS: TopMenu[] = [
  { label: 'Home', icon: 'Home', href: '/dashboard' },
  {
    label: 'Armazém', icon: 'Package',
    items: [
      { label: 'Visão Geral',    href: '/dashboard/armazem',               icon: 'BarChart3' },
      { label: 'Produtos',       href: '/dashboard/armazem/produtos',      icon: 'Box' },
      { label: 'Estoque',        href: '/dashboard/armazem/estoque',       icon: 'Layers' },
      { label: 'Movimentações',  href: '/dashboard/armazem/movimentacoes', icon: 'ArrowLeftRight' },
      { label: 'Mapeamentos',    href: '/dashboard/armazem/mapeamentos',   icon: 'Link2' },
      { label: 'Categorias',     href: '/dashboard/armazem/categorias',    icon: 'Tag' },
      { label: 'Armazéns',       href: '/dashboard/armazem/armazens',      icon: 'Warehouse' },
      { label: 'Localizações',   href: '/dashboard/armazem/localizacoes',  icon: 'MapPin' },
    ],
  },
  {
    label: 'Canais', icon: 'ShoppingCart',
    sections: [
      {
        title: 'Mercado Livre', color: '#FFE600', visible: 'hasML',
        items: [
          { label: 'Pedidos',          href: '/dashboard/pedidos' },
          { label: 'Produtos',         href: '/dashboard/produtos-ml' },
          { label: 'SAC',              href: '/dashboard/sac' },
          { label: 'Expedição',        href: '/dashboard/expedicao' },
          { label: 'Precificação',     href: '/dashboard/precificacao' },
          { label: 'Reputação',        href: '/dashboard/reputacao' },
          { label: 'Performance',      href: '/dashboard/performance' },
          { label: 'Conciliação',      href: '/dashboard/conciliacao' },
          { label: 'Vendas/Anúncio',   href: '/dashboard/vendas-por-anuncio' },
          { label: 'Reviews',          href: '/dashboard/reviews' },
          { label: 'Clientes',         href: '/dashboard/clientes' },
          { label: 'Devoluções',       href: '/dashboard/devolucoes' },
        ],
      },
      {
        title: 'Shopee', color: '#EE4D2D', visible: 'hasShopee',
        items: [
          { label: 'Overview',  href: '/dashboard/shopee/overview' },
          { label: 'Produtos',  href: '/dashboard/shopee/produtos' },
          { label: 'Pedidos',   href: '/dashboard/shopee/pedidos' },
        ],
      },
      {
        title: 'Magalu', color: '#0086FF', visible: 'hasMagalu',
        items: [
          { label: 'Overview',  href: '/dashboard/magalu/overview' },
          { label: 'Produtos',  href: '/dashboard/magalu/produtos' },
          { label: 'Pedidos',   href: '/dashboard/magalu/pedidos' },
        ],
      },
      { title: 'Conectar canal', icon: 'Plus', href: '/dashboard/integracoes', isAction: true },
    ],
  },
  {
    label: 'Financeiro', icon: 'DollarSign',
    items: [
      { label: 'Dashboard',  href: '/dashboard/financeiro',        icon: 'BarChart' },
      { label: 'DRE',        href: '/dashboard/financeiro/dre',    icon: 'FileText' },
      { label: 'Custos',     href: '/dashboard/financeiro/custos', icon: 'Receipt' },
      { label: 'Relatórios', href: '/dashboard/relatorios',        icon: 'Download' },
    ],
  },
  {
    label: 'IA', icon: 'Bot',
    items: [
      { label: 'Foguetim AI', href: '/dashboard/ai',            icon: 'MessageSquare' },
      { label: 'Agentes',     href: '/dashboard/agentes',       icon: 'Cpu' },
      { label: 'Alertas',     href: '/dashboard/notificacoes',  icon: 'Bell' },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { hasML, hasShopee, hasMagalu } = useConnectedMarketplaces()
  const { isOwner: isAdmin } = usePermissions()

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)

  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Fetch unread alerts
  useEffect(() => {
    if (!user) return
    fetch('/api/notifications?unread=true&limit=1')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setAlertCount(d.count ?? d.unread ?? 0))
      .catch(() => {})
  }, [user])

  // Check visibility of channel sections
  const isVisible = useCallback((key?: string) => {
    if (!key) return true
    if (key === 'hasML') return hasML
    if (key === 'hasShopee') return hasShopee
    if (key === 'hasMagalu') return hasMagalu
    return true
  }, [hasML, hasShopee, hasMagalu])

  // Handle hover open/close with delays
  const handleMenuEnter = (label: string) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current)
    openTimeout.current = setTimeout(() => setOpenMenu(label), 80)
  }

  const handleMenuLeave = () => {
    if (openTimeout.current) clearTimeout(openTimeout.current)
    closeTimeout.current = setTimeout(() => setOpenMenu(null), 250)
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Is active check
  const isActive = (href?: string) => {
    if (!href) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const isMenuActive = (menu: TopMenu) => {
    if (menu.href) return isActive(menu.href)
    if (menu.items) return menu.items.some(i => isActive(i.href))
    if (menu.sections) return menu.sections.some(s => s.items?.some(i => isActive(i.href)))
    return false
  }

  const userInitials = user?.user_metadata?.name
    ? user.user_metadata.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const fullName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Usuário'
  const firstName = fullName.split(' ')[0]

  const handleLogout = async () => {
    if (isConfigured()) await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ─── Desktop Topbar ────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-space-900/90 backdrop-blur-xl border-b border-space-600/50">
        <div className="max-w-[1440px] mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
            <Image
              src="/mascot/timm-standing.png"
              alt="Timm"
              width={32}
              height={32}
              className="object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
            />
            <span className="hidden sm:inline text-lg font-display font-bold bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
              Foguetim
            </span>
          </Link>

          {/* Nav items — desktop only */}
          <nav className="hidden md:flex items-center gap-1 ml-8" ref={menuRef}>
            {TOPBAR_MENUS.map(menu => (
              <div
                key={menu.label}
                className="relative"
                onMouseEnter={() => menu.href ? undefined : handleMenuEnter(menu.label)}
                onMouseLeave={handleMenuLeave}
              >
                {menu.href ? (
                  <Link
                    href={menu.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isMenuActive(menu)
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-space-700/50'
                    }`}
                  >
                    {React.createElement(ICONS[menu.icon] ?? Home, { className: 'w-4 h-4' })}
                    <span>{menu.label}</span>
                    {isMenuActive(menu) && (
                      <motion.div layoutId="topbar-indicator" className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" />
                    )}
                  </Link>
                ) : (
                  <button
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isMenuActive(menu) || openMenu === menu.label
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-space-700/50'
                    }`}
                  >
                    {React.createElement(ICONS[menu.icon] ?? Home, { className: 'w-4 h-4' })}
                    <span>{menu.label}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openMenu === menu.label ? 'rotate-180' : ''}`} />
                    {isMenuActive(menu) && (
                      <motion.div layoutId="topbar-indicator" className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" />
                    )}
                  </button>
                )}

                {/* Dropdown / Mega-menu */}
                <AnimatePresence>
                  {openMenu === menu.label && !menu.href && (
                    <motion.div
                      variants={megaMenu}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={`absolute top-full left-0 mt-1 bg-space-800 border border-space-600 rounded-xl shadow-card-lg overflow-hidden ${
                        menu.sections ? 'min-w-[520px]' : 'min-w-[220px]'
                      }`}
                      onMouseEnter={() => { if (closeTimeout.current) clearTimeout(closeTimeout.current) }}
                      onMouseLeave={handleMenuLeave}
                    >
                      {/* Simple dropdown */}
                      {menu.items && (
                        <div className="p-2">
                          {menu.items.map(item => {
                            const Icon = ICONS[item.icon ?? '']
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpenMenu(null)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                                  isActive(item.href) ? 'text-white bg-space-700' : 'text-gray-400 hover:text-white hover:bg-space-700'
                                }`}
                              >
                                {Icon && <Icon className="w-4 h-4" />}
                                <span>{item.label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}

                      {/* Mega-menu with sections */}
                      {menu.sections && (
                        <div className="flex divide-x divide-space-600">
                          {menu.sections.filter(s => isVisible(s.visible)).map(section => (
                            <div key={section.title} className={`p-3 ${section.isAction ? 'flex items-center' : 'min-w-[160px]'}`}>
                              {section.isAction ? (
                                <Link
                                  href={section.href ?? '/dashboard/integracoes'}
                                  onClick={() => setOpenMenu(null)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-primary-400 hover:text-primary-300 hover:bg-space-700 rounded-lg transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>{section.title}</span>
                                </Link>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                                    {section.color && (
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                                    )}
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                      {section.title}
                                    </span>
                                  </div>
                                  {section.items?.map(item => (
                                    <Link
                                      key={item.href}
                                      href={item.href}
                                      onClick={() => setOpenMenu(null)}
                                      className={`block px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                                        isActive(item.href) ? 'text-white bg-space-700' : 'text-gray-400 hover:text-white hover:bg-space-700'
                                      }`}
                                    >
                                      {item.label}
                                    </Link>
                                  ))}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link href="/dashboard/notificacoes" className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-space-700/50 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold">
                  {userInitials}
                </div>
                <span className="hidden lg:block text-sm font-medium text-gray-300">
                  {firstName}
                </span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    variants={megaMenu}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute top-full right-0 mt-1 w-64 bg-space-800 border border-space-600 rounded-xl shadow-card-lg overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-space-600">
                      <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    {/* Nav links */}
                    <div className="p-2">
                      {[
                        { label: 'Configurações', href: '/dashboard/configuracoes', icon: 'Settings' },
                        { label: 'Equipe',        href: '/dashboard/equipe',        icon: 'Users' },
                        { label: 'Integrações',   href: '/dashboard/integracoes',   icon: 'Link2' },
                        { label: 'Ajuda',         href: '/dashboard/ajuda',         icon: 'HelpCircle' },
                      ].map(item => {
                        const Icon = ICONS[item.icon]
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all"
                          >
                            {Icon && <Icon className="w-4 h-4" />}
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Painel Admin</span>
                        </Link>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-space-600 p-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile full-screen menu ────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenu}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-space-900/98 backdrop-blur-xl pt-16 overflow-y-auto md:hidden"
          >
            <div className="p-4 space-y-1">
              {TOPBAR_MENUS.map(menu => (
                <div key={menu.label}>
                  {menu.href ? (
                    <Link
                      href={menu.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isMenuActive(menu) ? 'text-white bg-space-700' : 'text-gray-400'
                      }`}
                    >
                      {React.createElement(ICONS[menu.icon] ?? Home, { className: 'w-5 h-5' })}
                      <span>{menu.label}</span>
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => setMobileExpanded(mobileExpanded === menu.label ? null : menu.label)}
                        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isMenuActive(menu) ? 'text-white bg-space-800' : 'text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {React.createElement(ICONS[menu.icon] ?? Home, { className: 'w-5 h-5' })}
                          <span>{menu.label}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${mobileExpanded === menu.label ? 'rotate-90' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {mobileExpanded === menu.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-8 pb-2 space-y-0.5">
                              {menu.items?.map(item => (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={`block px-4 py-2 rounded-lg text-sm transition-all ${
                                    isActive(item.href) ? 'text-white bg-space-700' : 'text-gray-500 hover:text-gray-300'
                                  }`}
                                >
                                  {item.label}
                                </Link>
                              ))}
                              {menu.sections?.filter(s => isVisible(s.visible)).map(section => (
                                <div key={section.title} className="pt-2">
                                  {!section.isAction && (
                                    <div className="flex items-center gap-2 px-4 py-1">
                                      {section.color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: section.color }} />}
                                      <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{section.title}</span>
                                    </div>
                                  )}
                                  {section.items?.map(item => (
                                    <Link
                                      key={item.href}
                                      href={item.href}
                                      onClick={() => setMobileOpen(false)}
                                      className={`block px-4 py-2 rounded-lg text-sm transition-all ${
                                        isActive(item.href) ? 'text-white bg-space-700' : 'text-gray-500 hover:text-gray-300'
                                      }`}
                                    >
                                      {item.label}
                                    </Link>
                                  ))}
                                  {section.isAction && (
                                    <Link
                                      href={section.href ?? '/dashboard/integracoes'}
                                      onClick={() => setMobileOpen(false)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm text-primary-400"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      {section.title}
                                    </Link>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              ))}

              {/* Mobile profile links */}
              <div className="border-t border-space-600 mt-4 pt-4 space-y-1">
                {[
                  { label: 'Configurações', href: '/dashboard/configuracoes', icon: 'Settings' },
                  { label: 'Equipe',        href: '/dashboard/equipe',        icon: 'Users' },
                  { label: 'Integrações',   href: '/dashboard/integracoes',   icon: 'Link2' },
                ].map(item => {
                  const Icon = ICONS[item.icon]
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-white transition-all"
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
