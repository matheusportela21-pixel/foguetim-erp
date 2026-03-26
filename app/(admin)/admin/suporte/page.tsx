'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  Heart,
  Users,
  FileText,
  Activity,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface UserResult {
  id: string
  name: string | null
  email: string
  plan: string | null
  role: string | null
  created_at: string
  cancelled_at: string | null
  marketplaces: string[]
  marketplace_count: number
  product_count: number
  last_activity: { created_at: string; action: string } | null
}

interface HealthResult {
  supabase: 'ok' | 'error'
  ml: { active: number; expiring: number }
  shopee: { active: number; expiring: number }
  lastCron: string | null
}

/* ------------------------------------------------------------------ */
/*  Plan badge colors                                                  */
/* ------------------------------------------------------------------ */
const PLAN_COLORS: Record<string, string> = {
  explorador: 'bg-slate-500/20 text-slate-400',
  piloto: 'bg-green-500/20 text-green-400',
  comandante: 'bg-blue-500/20 text-blue-400',
  almirante: 'bg-purple-500/20 text-purple-400',
  enterprise: 'bg-red-500/20 text-red-400',
  missao_espacial: 'bg-amber-500/20 text-amber-400',
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SuportePage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [health, setHealth] = useState<HealthResult | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const healthTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---- Search ---- */
  async function handleSearch() {
    const q = query.trim()
    if (q.length < 2) return
    setSearching(true)
    setSearchError('')
    try {
      const res = await fetch(`/api/admin/suporte?action=search&q=${encodeURIComponent(q)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro na busca')
      setUsers(json.users ?? [])
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Erro desconhecido')
      setUsers(null)
    } finally {
      setSearching(false)
    }
  }

  /* ---- Health ---- */
  async function handleHealth() {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/admin/suporte?action=health')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setHealth(json)
      // Auto-clear after 60s
      if (healthTimer.current) clearTimeout(healthTimer.current)
      healthTimer.current = setTimeout(() => setHealth(null), 60_000)
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Suporte</h1>
        <p className="text-sm text-slate-400 mt-1">
          Ferramentas de suporte e diagnostico
        </p>
      </div>

      {/* ============================================================ */}
      {/*  User Search                                                  */}
      {/* ============================================================ */}
      <section className="rounded-xl border border-white/[0.06] bg-[#080b10] p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          Buscar Usuario
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Email ou nome do usuario..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-[#0f1117] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-white/[0.12] transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={searching || query.trim().length < 2}
            className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-sm font-medium text-slate-300 hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchError && (
          <p className="text-sm text-red-400 mt-3">{searchError}</p>
        )}

        {/* Results */}
        {users !== null && (
          <div className="mt-4 space-y-3">
            {users.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Nenhum resultado encontrado
              </p>
            ) : (
              users.map((u) => <UserCard key={u.id} user={u} />)
            )}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/*  Health Check                                                 */}
      {/* ============================================================ */}
      <section className="rounded-xl border border-white/[0.06] bg-[#080b10] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Heart className="w-4 h-4 text-slate-500" />
            Saude do Sistema
          </h2>
          <button
            onClick={handleHealth}
            disabled={healthLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] text-sm text-slate-300 hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            {healthLoading ? 'Verificando...' : 'Verificar Saude do Sistema'}
          </button>
        </div>

        {health && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Supabase */}
            <div className="rounded-lg border border-white/[0.06] bg-[#0f1117] p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.supabase === 'ok' ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-sm font-medium text-slate-200">Supabase</span>
              </div>
              <p className="text-xs text-slate-400">
                {health.supabase === 'ok' ? 'Conectado' : 'Erro de conexao'}
              </p>
            </div>

            {/* ML */}
            <div className="rounded-lg border border-white/[0.06] bg-[#0f1117] p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.ml.expiring > 0 ? 'bg-amber-400' : 'bg-green-400'
                  }`}
                />
                <span className="text-sm font-medium text-slate-200">Mercado Livre</span>
              </div>
              <p className="text-xs text-slate-400">
                {health.ml.active} conexoes ativas, {health.ml.expiring} expirando
              </p>
            </div>

            {/* Shopee */}
            <div className="rounded-lg border border-white/[0.06] bg-[#0f1117] p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.shopee.expiring > 0 ? 'bg-amber-400' : 'bg-green-400'
                  }`}
                />
                <span className="text-sm font-medium text-slate-200">Shopee</span>
              </div>
              <p className="text-xs text-slate-400">
                {health.shopee.active} conexoes ativas, {health.shopee.expiring} expirando
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/*  Quick Actions                                                */}
      {/* ============================================================ */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          Acesso Rapido
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickLink href="/admin/usuarios" icon={Users} label="Usuarios" />
          <QuickLink href="/admin/logs" icon={FileText} label="Logs" />
          <QuickLink href="/admin/monitor" icon={Activity} label="Monitor" />
        </div>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  User Card                                                          */
/* ------------------------------------------------------------------ */
function UserCard({ user }: { user: UserResult }) {
  const initials = (user.name ?? user.email)[0]?.toUpperCase() ?? '?'
  const plan = user.plan ?? 'explorador'
  const planStyle = PLAN_COLORS[plan] ?? PLAN_COLORS.explorador

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0f1117] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Avatar + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {user.name ?? 'Sem nome'}
          </p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded-full font-medium ${planStyle}`}>
          {plan}
        </span>
        {user.role && user.role !== 'user' && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
            {user.role}
          </span>
        )}
        {user.marketplaces.includes('mercadolivre') && (
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">ML</span>
        )}
        {user.marketplaces.includes('shopee') && (
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">Shopee</span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{user.product_count} produtos</span>
        {user.last_activity && (
          <span>
            Ativo{' '}
            {new Date(user.last_activity.created_at).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/admin/usuarios?user=${user.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-slate-300 hover:bg-white/[0.1] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Ver no Admin
        </Link>
        <button
          onClick={() => alert('Funcionalidade de reset de senha sera implementada em breve. Por enquanto, o usuario pode redefinir via "Esqueci minha senha" na tela de login.')}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-slate-400 hover:bg-white/[0.1] transition-colors"
        >
          Reset Senha
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quick Link Card                                                    */
/* ------------------------------------------------------------------ */
function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#080b10] p-4 hover:bg-white/[0.03] transition-colors group"
    >
      <Icon className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 text-slate-600 ml-auto" />
    </Link>
  )
}
