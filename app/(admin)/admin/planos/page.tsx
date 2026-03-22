'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreditCard, RefreshCw, X, TrendingUp, Users, DollarSign } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────── */
interface PlanStat {
  plan: string
  count: number
  price: number
  subtotal: number
}

interface PlansData {
  plans: PlanStat[]
  mrr: number
  total_users: number
  billing_active: boolean
}

interface AdminUser {
  id: string
  name: string
  email: string
  plan: string
  created_at: string
}

/* ── Constants ───────────────────────────────────────────────────────── */
const PLAN_LABELS: Record<string, string> = {
  explorador: 'Explorador',
  piloto: 'Piloto',
  comandante: 'Comandante',
  almirante: 'Almirante',
  enterprise: 'Enterprise',
  missao_espacial: 'Missao Espacial',
}

const PLAN_COLORS: Record<string, string> = {
  explorador: 'bg-slate-500/20 text-slate-400',
  piloto: 'bg-green-500/20 text-green-400',
  comandante: 'bg-blue-500/20 text-blue-400',
  almirante: 'bg-purple-500/20 text-purple-400',
  enterprise: 'bg-red-500/20 text-red-400',
  missao_espacial: 'bg-amber-500/20 text-amber-400',
}

const DISPLAY_PLANS: { plan: string; price: string; color: string }[] = [
  { plan: 'explorador',     price: 'R$0',         color: 'slate' },
  { plan: 'comandante',     price: 'R$49,90/mes', color: 'blue' },
  { plan: 'almirante',      price: 'R$89,90/mes', color: 'purple' },
  { plan: 'missao_espacial', price: 'R$119,90/mes', color: 'amber' },
]

const ALL_PLANS = ['explorador', 'piloto', 'comandante', 'almirante', 'enterprise', 'missao_espacial']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function PlanosPage() {
  const [data, setData] = useState<PlansData | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUser, setModalUser] = useState<AdminUser | null>(null)
  const [newPlan, setNewPlan] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [plansRes, usersRes] = await Promise.all([
      fetch('/api/admin/planos'),
      fetch('/api/admin/users?limit=100'),
    ])
    if (plansRes.ok) setData(await plansRes.json())
    if (usersRes.ok) {
      const json = await usersRes.json()
      setUsers(json.users ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleChangePlan() {
    if (!modalUser || !newPlan || !reason.trim()) return
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/planos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: modalUser.id, plan: newPlan, reason: reason.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Plano alterado com sucesso')
      setModalUser(null)
      setNewPlan('')
      setReason('')
      load()
    } else {
      const err = await res.json()
      setMsg(`Erro: ${err.error}`)
    }
  }

  const planCount = (plan: string) => data?.plans.find(p => p.plan === plan)?.count ?? 0
  const pct = (plan: string) => data && data.total_users > 0
    ? ((planCount(plan) / data.total_users) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Planos & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">Distribuicao de planos, MRR e gestao</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-[#0f1117] border border-white/[0.06] rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DISPLAY_PLANS.map(({ plan, price }) => (
          <div key={plan} className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-200">{planCount(plan)}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-500">{price}</span>
              <span className="text-xs text-slate-500">{pct(plan)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* MRR Card */}
      <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-200">MRR Estimado</h2>
            <p className="text-xs text-slate-500">Monthly Recurring Revenue</p>
          </div>
        </div>

        <div className="text-3xl font-bold text-emerald-400 mb-4">
          {data ? fmtCurrency(data.mrr) : '---'}
        </div>

        <div className="space-y-2 mb-4">
          {data?.plans.filter(p => p.price > 0).map(p => (
            <div key={p.plan} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {PLAN_LABELS[p.plan]} x {p.count}
              </span>
              <span className="text-slate-300 font-mono">{fmtCurrency(p.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
          <TrendingUp className="w-3.5 h-3.5" />
          BILLING_ACTIVE=false &mdash; estimativa baseada nos planos ativos
        </div>
      </div>

      {/* Users table */}
      <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-slate-200">Usuarios por Plano</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Plano</th>
                <th className="px-5 py-3 font-medium">Desde</th>
                <th className="px-5 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-slate-300">{u.name || '---'}</td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${PLAN_COLORS[u.plan] ?? PLAN_COLORS.explorador}`}>
                      {PLAN_LABELS[u.plan] ?? u.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => { setModalUser(u); setNewPlan(u.plan); setReason(''); setMsg('') }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      Alterar plano
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-600">Nenhum usuario</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change plan modal */}
      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f1117] border border-white/[0.08] rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-200">Alterar Plano</h3>
              <button onClick={() => setModalUser(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-400">
              <span className="text-slate-300 font-medium">{modalUser.name || modalUser.email}</span>
              <span className="ml-2 text-xs">({PLAN_LABELS[modalUser.plan] ?? modalUser.plan})</span>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Novo plano</label>
              <select
                value={newPlan}
                onChange={e => setNewPlan(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#080b10] border border-white/[0.08] text-slate-200 focus:outline-none focus:border-blue-500/40"
              >
                {ALL_PLANS.map(p => (
                  <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Motivo</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo da alteracao..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#080b10] border border-white/[0.08] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/40 resize-none"
              />
            </div>

            {msg && (
              <p className={`text-xs ${msg.startsWith('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalUser(null)}
                className="px-4 py-2 text-sm rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePlan}
                disabled={saving || !reason.trim() || newPlan === modalUser.plan}
                className="px-4 py-2 text-sm rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
