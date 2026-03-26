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
  Search, Sun, Moon, Info, AlertTriangle, XCircle, CheckCircle2, Loader2,
  CheckCheck, Bug, Lightbulb, BookOpen, Copy, FileEdit,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import { useConnectedMarketplaces } from '@/lib/hooks/useConnectedMarketplaces'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { useTheme } from '@/context/ThemeContext'
import { megaMenu, mobileMenu } from '@/lib/animations'

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICONS: Record<string, React.ElementType> = {
  Home, Package, ShoppingCart, DollarSign, Bot, BarChart3, Box, Layers,
  ArrowLeftRight, Link2, Tag, Warehouse, MapPin, ShoppingBag, MessageSquare,
  Star, Send, Truck, Calculator, FileText, Receipt, Download, Bell, Cpu,
  Settings, Users, HelpCircle, LogOut, Shield, Plus, ExternalLink,
  Eye, Megaphone, Scale, BarChart, Activity, Archive, Menu, X, ChevronDown,
  Search, Bug, Lightbulb, BookOpen, Copy, FileEdit,
}

// ─── Notification types ─────────────────────────────────────────────────────
interface Notification {
  id:         string
  title:      string
  message:    string
  type:       'info' | 'warning' | 'error' | 'success'
  category:   string
  read:       boolean
  action_url: string | null
  created_at: string
}

const NOTIF_TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  error:   { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-500/10'    },
  success: { icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface MenuItem { label: string; href: string; icon?: string }
interface MenuSection {
  title: string; color?: string; visible?: string
  items?: MenuItem[]; href?: string; icon?: string; isAction?: boolean
}
interface TopMenu {
  label: string; icon: string; href?: string
  items?: MenuItem[]; sections?: MenuSection[]
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
      { label: 'Sincronização', href: '/dashboard/armazem/sincronizacao', icon: 'Activity' },
      { label: 'Categorias',     href: '/dashboard/armazem/categorias',    icon: 'Tag' },
      { label: 'Armazéns',       href: '/dashboard/armazem/armazens',      icon: 'Warehouse' },
      { label: 'Localizações',   href: '/dashboard/armazem/localizacoes',  icon: 'MapPin' },
      { label: 'Copiador',       href: '/dashboard/copiador',              icon: 'Copy' },
      { label: 'Rascunhos',      href: '/dashboard/rascunhos',             icon: 'FileEdit' },
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
          { label: 'Ranking',           href: '/dashboard/ranking' },
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
          { label: 'Overview',   href: '/dashboard/magalu/overview' },
          { label: 'Produtos',   href: '/dashboard/magalu/produtos' },
          { label: 'Pedidos',    href: '/dashboard/magalu/pedidos' },
          { label: 'SAC',        href: '/dashboard/magalu/sac' },
          { label: 'Perguntas',  href: '/dashboard/magalu/perguntas' },
          { label: 'Chat',       href: '/dashboard/magalu/chat' },
          { label: 'Saúde',      href: '/dashboard/magalu/saude' },
          { label: 'Expedição',  href: '/dashboard/magalu/expedicao' },
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
  { label: 'Mensagens', icon: 'MessageSquare', href: '/dashboard/mensagens' },
  {
    label: 'IA', icon: 'Bot',
    items: [
      { label: 'Foguetim AI', href: '/dashboard/ai',            icon: 'MessageSquare' },
      { label: 'Agentes',     href: '/dashboard/agentes',       icon: 'Cpu' },
      { label: 'Alertas',     href: '/dashboard/notificacoes',  icon: 'Bell' },
    ],
  },
  {
    label: 'Blog', icon: 'BookOpen',
    href: '/blog',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { hasML, hasShopee, hasMagalu } = useConnectedMarketplaces()
  const { isOwner: isAdmin } = usePermissions()
  const { theme, setTheme: applyTheme } = useTheme()

  // Menu state
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)

  // Notifications state
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  // Refs
  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const notifsRef = useRef<HTMLDivElement>(null)

  // ── Notifications ──────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async (silent = false) => {
    if (!silent) setLoadingNotifs(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifs(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      // non-critical
    } finally {
      if (!silent) setLoadingNotifs(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchNotifs()
    const id = setInterval(() => fetchNotifs(true), 60_000)
    return () => clearInterval(id)
  }, [user, fetchNotifs])

  async function markRead(id: string, actionUrl: string | null) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (actionUrl) {
      setNotifsOpen(false)
      router.push(actionUrl)
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setMarkingAll(false)
  }

  // ── Keyboard shortcut ⌘K + search ─────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ products: any[]; orders: any[]; pages: any[] }>({ products: [], orders: [], pages: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Visibility helpers ─────────────────────────────────────────────────
  // Show menu items based on marketplace connection status
  const isVisible = useCallback((key?: string) => {
    if (!key) return true
    if (key === 'hasML') return hasML
    if (key === 'hasShopee') return hasShopee
    if (key === 'hasMagalu') return hasMagalu
    return true
  }, [hasML, hasShopee, hasMagalu])

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
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setNotifsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  const handleThemeToggle = () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Platform-aware shortcut label
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform))
  }, [])

  return (
    <>
      {/* ─── Desktop Topbar ────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-space-900/90 backdrop-blur-xl border-b border-space-600/50">
        <div className="max-w-[1440px] mx-auto h-full px-4 md:px-6 flex items-center justify-between">
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
                      {menu.sections && (
                        <div className="flex divide-x divide-space-600">
                          {/* Show message if Canais menu has no connected marketplaces */}
                          {menu.label === 'Canais' && !hasML && !hasShopee && !hasMagalu && (
                            <div className="p-4 text-center min-w-[200px]">
                              <p className="text-sm text-gray-400 mb-2">Nenhum canal conectado</p>
                              <Link href="/dashboard/integracoes" onClick={() => setOpenMenu(null)}
                                className="text-sm text-primary-400 hover:text-primary-300 font-medium">
                                Conectar marketplace →
                              </Link>
                            </div>
                          )}
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
                                    {section.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />}
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.title}</span>
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

          {/* ─── Right side: Search + Theme + Help + Notifications + Profile ─── */}
          <div className="flex items-center gap-1.5">
            {/* Search input (desktop) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-800 border border-space-600 text-sm text-gray-500 hover:text-gray-300 hover:border-space-500 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="w-32 lg:w-40 text-left">Buscar...</span>
              <kbd className="hidden lg:inline text-[10px] font-mono bg-space-700 px-1.5 py-0.5 rounded text-gray-500 border border-space-600">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>

            {/* Search icon (mobile) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-space-700 transition-colors"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme toggle */}
            <button
              onClick={handleThemeToggle}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-space-700 transition-colors"
              title={theme === 'dark' ? 'Modo claro (em breve)' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Help */}
            <Link
              href="/dashboard/ajuda"
              className="hidden sm:flex p-2 rounded-lg text-gray-400 hover:text-white hover:bg-space-700 transition-colors"
              title="Central de Ajuda"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </Link>

            {/* ── Notifications ─────────────────────────────────────────────── */}
            <div className="relative" ref={notifsRef}>
              <button
                onClick={() => { setNotifsOpen(o => !o); if (!notifsOpen) fetchNotifs() }}
                className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-space-700 transition-colors"
                aria-label="Notificações"
              >
                <Bell className={`w-5 h-5 ${notifsOpen ? 'text-primary-400' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifsOpen && (
                  <motion.div
                    variants={megaMenu}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute right-0 mt-1 w-[380px] max-h-[480px] flex flex-col bg-space-800 border border-space-600 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-space-600 shrink-0">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-semibold text-white">Notificações</span>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          disabled={markingAll}
                          className="flex items-center gap-1 text-[11px] text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Marcar todas
                        </button>
                      )}
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto flex-1 divide-y divide-space-600/30">
                      {loadingNotifs ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
                            <div className="w-7 h-7 rounded-lg bg-space-700 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 bg-space-700 rounded w-36" />
                              <div className="h-3 bg-space-700 rounded w-56" />
                              <div className="h-2.5 bg-space-700 rounded w-20" />
                            </div>
                          </div>
                        ))
                      ) : notifs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <Bell className="w-8 h-8 text-gray-700" />
                          <p className="text-xs text-gray-600">Nenhuma notificação</p>
                        </div>
                      ) : (
                        notifs.map(n => {
                          const tc = NOTIF_TYPE_CONFIG[n.type] ?? NOTIF_TYPE_CONFIG.info
                          const NIcon = tc.icon
                          return (
                            <div
                              key={n.id}
                              onClick={() => markRead(n.id, n.action_url)}
                              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-space-700/50 transition-all ${
                                !n.read ? 'bg-primary-900/10' : ''
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg ${tc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                <NIcon className={`w-3.5 h-3.5 ${tc.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-xs font-semibold truncate ${!n.read ? 'text-white' : 'text-gray-300'}`}>
                                    {n.title}
                                  </p>
                                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />}
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mt-0.5">{n.message}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] text-gray-600">{timeAgo(n.created_at)}</span>
                                  {n.action_url && (
                                    <>
                                      <span className="text-[10px] text-gray-700">·</span>
                                      <ExternalLink className="w-2.5 h-2.5 text-primary-500" />
                                      <span className="text-[10px] text-primary-400">Ver</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-space-600 shrink-0">
                      <button
                        onClick={() => { setNotifsOpen(false); router.push('/dashboard/notificacoes') }}
                        className="w-full text-center text-xs text-primary-400 hover:text-primary-300 transition-colors py-0.5"
                      >
                        Ver todas as notificações →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Profile dropdown ────────────────────────────────────────── */}
            <div
              className="relative"
              ref={profileRef}
              onMouseEnter={() => { if (closeTimeout.current) clearTimeout(closeTimeout.current); setProfileOpen(true) }}
              onMouseLeave={() => { closeTimeout.current = setTimeout(() => setProfileOpen(false), 250) }}
            >
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-space-700/50 transition-all ml-1"
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

                      {/* Feedback */}
                      <button
                        onClick={() => {
                          setProfileOpen(false)
                          window.dispatchEvent(new CustomEvent('open-feedback'))
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all"
                      >
                        <Bug className="w-4 h-4" />
                        <span>Enviar Feedback</span>
                      </button>

                      {/* Theme toggle inside menu */}
                      <button
                        onClick={handleThemeToggle}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                          <span>{theme === 'dark' ? 'Modo escuro' : 'Modo claro'}</span>
                        </div>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary-500' : 'bg-gray-600'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${theme === 'dark' ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </button>

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

      {/* ─── Search Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults({ products: [], orders: [], pages: [] }) }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg mx-4 bg-space-800 border border-space-600 rounded-xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-space-600">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar pedidos, produtos, páginas..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                  autoFocus
                  value={searchQuery}
                  onChange={e => {
                    const val = e.target.value
                    setSearchQuery(val)
                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
                    if (val.trim().length < 2) {
                      setSearchResults({ products: [], orders: [], pages: [] })
                      return
                    }
                    setSearchLoading(true)
                    searchTimerRef.current = setTimeout(() => {
                      fetch(`/api/search?q=${encodeURIComponent(val.trim())}`)
                        .then(r => r.json())
                        .then(d => setSearchResults(d))
                        .catch(() => {})
                        .finally(() => setSearchLoading(false))
                    }, 300)
                  }}
                />
                {searchLoading && <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" />}
                <kbd className="text-[10px] font-mono bg-space-700 px-1.5 py-0.5 rounded text-gray-500">ESC</kbd>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {/* Pages */}
                {searchResults.pages.length > 0 && (
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">📄 Páginas</p>
                    <div className="space-y-0.5">
                      {searchResults.pages.map((page: any) => {
                        const Icon = ICONS[page.icon] ?? Home
                        return (
                          <Link key={page.href} href={page.href}
                            onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all">
                            <Icon className="w-4 h-4" />
                            <span>{page.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Products */}
                {searchResults.products.length > 0 && (
                  <div className="p-3 border-t border-space-600/50">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">📦 Produtos</p>
                    <div className="space-y-0.5">
                      {searchResults.products.map((p: any) => (
                        <Link key={p.id} href={`/dashboard/armazem/produtos/${p.id}`}
                          onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all">
                          <Package className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">{p.name}</span>
                            {p.sku && <span className="text-[10px] text-gray-600">SKU: {p.sku}</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {/* Orders */}
                {searchResults.orders.length > 0 && (
                  <div className="p-3 border-t border-space-600/50">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">📋 Pedidos</p>
                    <div className="space-y-0.5">
                      {searchResults.orders.map((o: any) => (
                        <Link key={o.id} href={`/dashboard/pedidos/${o.order_id}`}
                          onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all">
                          <ShoppingBag className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block">#{o.order_id}</span>
                            {o.buyer_name && <span className="text-[10px] text-gray-600">{o.buyer_name}</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {/* Empty state when searching */}
                {searchQuery.length >= 2 && !searchLoading &&
                  searchResults.pages.length === 0 && searchResults.products.length === 0 && searchResults.orders.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-gray-500">Nenhum resultado para &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                )}
                {/* Default quick pages when no query */}
                {searchQuery.length < 2 && (
                  <div className="p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Páginas rápidas</p>
                    <div className="space-y-0.5">
                      {[
                        { label: 'Pedidos',       href: '/dashboard/pedidos',      icon: 'ShoppingBag' },
                        { label: 'Produtos ML',   href: '/dashboard/produtos-ml',  icon: 'Package' },
                        { label: 'Financeiro',    href: '/dashboard/financeiro',   icon: 'DollarSign' },
                        { label: 'Magalu',        href: '/dashboard/magalu/overview', icon: 'BarChart3' },
                        { label: 'Integrações',   href: '/dashboard/integracoes',  icon: 'Link2' },
                        { label: 'Configurações', href: '/dashboard/configuracoes', icon: 'Settings' },
                      ].map(item => {
                        const Icon = ICONS[item.icon]
                        return (
                          <Link key={item.href} href={item.href}
                            onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-space-700 transition-all">
                            {Icon && <Icon className="w-4 h-4" />}
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  { label: 'Ajuda',         href: '/dashboard/ajuda',         icon: 'HelpCircle' },
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
