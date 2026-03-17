'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  X, Plug, PlugZap, CheckCircle2, XCircle,
  ChevronDown, User, CreditCard, ShieldCheck,
  Bell, KeyRound, Ban, FileText, MoreVertical,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface AdminUser {
  id:           string
  name:         string
  email:        string
  plan:         string
  role:         string
  created_at:   string
  cancelled_at: string | null
  ml_connected: boolean
}

interface UserDetail {
  user:          Record<string, unknown>
  integrations:  { marketplace: string; connected: boolean; ml_nickname: string | null; created_at: string }[]
  activity:      { action: string; category: string; description: string; created_at: string }[]
  notifications: { title: string; type: string; read: boolean; created_at: string }[]
  cancellations: { reason: string; details: string | null; created_at: string }[]
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const PLAN_LABELS: Record<string, string> = {
  explorador: 'Explorador', piloto: 'Piloto', comandante: 'Comandante',
  almirante: 'Almirante',   enterprise: 'Enterprise',
}
const PLAN_COLORS: Record<string, string> = {
  explorador: '#64748b', piloto: '#3b82f6', comandante: '#8b5cf6',
  almirante: '#f59e0b',  enterprise: '#ef4444',
}
const PLANS    = ['explorador', 'piloto', 'comandante', 'almirante', 'enterprise']
const ROLES    = ['operador', 'supervisor', 'analista_produtos', 'analista_financeiro', 'suporte', 'diretor', 'admin', 'foguetim_support']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/* ── Drawer component ────────────────────────────────────────────────────── */
function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail]       = useState<UserDetail | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newPlan, setNewPlan]     = useState('')
  const [newRole, setNewRole]     = useState('')
  const [reason, setReason]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) setDetail(await res.json())
      setLoading(false)
    }
    load()
  }, [userId])

  async function patch(body: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Salvo com sucesso!')
      setShowPlanModal(false)
      setShowRoleModal(false)
      setReason('')
      setTimeout(() => setMsg(''), 3000)
    } else {
      const d = await res.json()
      setMsg(`Erro: ${d.error}`)
    }
  }

  const u = detail?.user as Record<string, unknown> | undefined

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[520px] bg-[#0f1117] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
              {String(u?.name ?? 'U')[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{String(u?.name ?? '—')}</p>
              <p className="text-xs text-slate-500">{String(u?.email ?? '—')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-slate-600 animate-spin" />
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-500">Erro ao carregar</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {msg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {msg}
              </p>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Plano',   PLAN_LABELS[String(u?.plan ?? '')] ?? String(u?.plan ?? '—')],
                ['Cargo',   String(u?.role ?? '—')],
                ['Cadastro', fmtDate(String(u?.created_at ?? ''))],
                ['Status',  u?.cancelled_at ? 'Cancelado' : 'Ativo'],
                ['CNPJ/CPF', String(u?.document_number ?? '—')],
                ['Telefone', String((u as Record<string, unknown>)?.telefone ?? '—')],
              ].map(([k, v]) => (
                <div key={k} className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-600 mb-0.5">{k}</p>
                  <p className="text-xs font-semibold text-slate-200">{v}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Ações</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowPlanModal(true)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-300 hover:bg-white/[0.07] transition-all">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Alterar plano
                </button>
                <button onClick={() => setShowRoleModal(true)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-300 hover:bg-white/[0.07] transition-all">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Alterar cargo
                </button>
                <button onClick={() => patch({ suspended: !u?.cancelled_at, reason: 'admin_action' })}
                  disabled={saving}
                  className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg text-xs transition-all disabled:opacity-50 ${
                    u?.cancelled_at
                      ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                      : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                  }`}>
                  <Ban className="w-3.5 h-3.5" />
                  {u?.cancelled_at ? 'Reativar conta' : 'Suspender conta'}
                </button>
              </div>
            </div>

            {/* Integrations */}
            {detail.integrations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Integrações</p>
                {detail.integrations.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] rounded-lg">
                    {i.connected
                      ? <Plug className="w-3.5 h-3.5 text-green-400" />
                      : <PlugZap className="w-3.5 h-3.5 text-slate-600" />}
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{i.marketplace}</p>
                      {i.ml_nickname && <p className="text-[10px] text-slate-500">@{i.ml_nickname}</p>}
                    </div>
                    <span className={`ml-auto text-[10px] font-semibold ${i.connected ? 'text-green-400' : 'text-slate-600'}`}>
                      {i.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Activity */}
            {detail.activity.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Últimas Atividades</p>
                <div className="space-y-1">
                  {detail.activity.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white/[0.02] rounded-lg">
                      <FileText className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-300 truncate">{a.description}</p>
                        <p className="text-[10px] text-slate-600">{fmtDatetime(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancellations */}
            {detail.cancellations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Cancelamentos</p>
                {detail.cancellations.map((c, i) => (
                  <div key={i} className="px-3 py-2.5 bg-red-500/[0.06] border border-red-500/[0.12] rounded-lg">
                    <p className="text-xs font-semibold text-red-400">{c.reason}</p>
                    {c.details && <p className="text-[11px] text-slate-500 mt-0.5">{c.details}</p>}
                    <p className="text-[10px] text-slate-600 mt-1">{fmtDate(c.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Change plan modal */}
        {showPlanModal && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="bg-[#111318] border border-white/[0.1] rounded-xl p-5 w-80 space-y-4">
              <h3 className="text-sm font-bold text-white">Alterar Plano</h3>
              <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40">
                <option value="">Selecionar plano...</option>
                {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
              </select>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (obrigatório)"
                rows={2}
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowPlanModal(false)}
                  className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-all">
                  Cancelar
                </button>
                <button onClick={() => patch({ plan: newPlan, reason })} disabled={!newPlan || !reason || saving}
                  className="flex-1 px-3 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change role modal */}
        {showRoleModal && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="bg-[#111318] border border-white/[0.1] rounded-xl p-5 w-80 space-y-4">
              <h3 className="text-sm font-bold text-white">Alterar Cargo</h3>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/40">
                <option value="">Selecionar cargo...</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-all">
                  Cancelar
                </button>
                <button onClick={() => patch({ role: newRole })} disabled={!newRole || saving}
                  className="flex-1 px-3 py-2 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function AdminUsuariosPage() {
  const [users, setUsers]         = useState<AdminUser[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const LIMIT = 25

  const fetchUsers = useCallback(async (p = page, s = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
    if (s)            params.set('search', s)
    if (filterPlan)   params.set('plan', filterPlan)
    if (filterStatus) params.set('status', filterStatus)
    try {
      const res  = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterPlan, filterStatus])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchUsers(1, v), 350)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Usuários</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading
            ? <span className="inline-block h-3.5 w-28 bg-slate-700 animate-pulse rounded align-middle" />
            : `${total} usuários cadastrados`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Nome, email ou CNPJ..."
            className="pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40 w-64"
          />
        </div>
        <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500/40">
          <option value="">Todos os planos</option>
          {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500/40">
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button onClick={() => fetchUsers()} disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-200 bg-[#111318] border border-white/[0.08] rounded-lg transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Usuário', 'Plano', 'Cargo', 'ML', 'Cadastro', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {u.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{u.name || '—'}</p>
                      <p className="text-[11px] text-slate-600">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${PLAN_COLORS[u.plan] ?? '#64748b'}20`, color: PLAN_COLORS[u.plan] ?? '#64748b' }}>
                    {PLAN_LABELS[u.plan] ?? u.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{u.role}</td>
                <td className="px-4 py-3">
                  <span title={u.ml_connected ? 'Mercado Livre conectado' : 'Mercado Livre não conectado'}>
                    {u.ml_connected
                      ? <Plug className="w-3.5 h-3.5 text-green-400" />
                      : <PlugZap className="w-3.5 h-3.5 text-slate-700" />}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.cancelled_at ? 'text-red-400' : 'text-green-400'}`}>
                    {u.cancelled_at ? 'Cancelado' : 'Ativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelectedId(u.id)}
                    className="p-1.5 text-slate-600 hover:text-slate-200 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs text-slate-400">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 text-slate-500 hover:text-slate-200 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selectedId && (
        <UserDrawer userId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
