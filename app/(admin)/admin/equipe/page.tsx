'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, UserPlus, X, Shield, Trash2, Crown } from 'lucide-react'
import { ROLE_LABELS, ROLE_BADGE, ROLE_HIERARCHY, type FoguetimRole } from '@/lib/team-roles'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface TeamMember {
  id:         string
  user_id:    string
  email:      string
  name:       string
  role:       FoguetimRole
  is_active:  boolean
  notes:      string | null
  created_at: string
}

const ROLES = Object.keys(ROLE_HIERARCHY) as FoguetimRole[]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const ROLE_ICONS: Partial<Record<FoguetimRole, React.ElementType>> = {
  super_admin: Crown,
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminEquipePage() {
  const [members, setMembers]   = useState<TeamMember[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<FoguetimRole | ''>('')
  const [showInvite, setShowInvite] = useState(false)
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null)

  // Invite form
  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName]   = useState('')
  const [invRole, setInvRole]   = useState<FoguetimRole>('support_junior')
  const [invNotes, setInvNotes] = useState('')
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/team')
      if (res.ok) {
        const d = await res.json() as { team: TeamMember[] }
        setMembers(d.team ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleInvite() {
    if (!invEmail.trim() || !invRole) return
    setInviting(true)
    const res = await fetch('/api/admin/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: invEmail, name: invName, role: invRole, notes: invNotes }),
    })
    const data = await res.json() as { error?: string }
    setInviting(false)
    if (res.ok) {
      setMsg({ ok: true, text: 'Membro adicionado com sucesso!' })
      setShowInvite(false)
      setInvEmail(''); setInvName(''); setInvRole('support_junior'); setInvNotes('')
      load()
    } else {
      setMsg({ ok: false, text: `Erro: ${data.error}` })
    }
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleRoleChange(id: string, role: FoguetimRole) {
    await fetch(`/api/admin/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    load()
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remover ${name} da equipe?`)) return
    await fetch(`/api/admin/team/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = filter ? members.filter(m => m.role === filter) : members

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Equipe Foguetim
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{members.length} membro(s) na equipe interna</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-200 bg-white/[0.04] border border-white/[0.06] rounded-lg transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all">
            <UserPlus className="w-4 h-4" />
            Convidar membro
          </button>
        </div>
      </div>

      {msg && (
        <p className={`text-xs px-3 py-2 rounded-lg border ${msg.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {msg.text}
        </p>
      )}

      {/* Role filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === '' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
          Todos ({members.length})
        </button>
        {ROLES.map(r => {
          const cfg = ROLE_LABELS[r]
          const count = members.filter(m => m.role === r).length
          if (count === 0) return null
          return (
            <button key={r} onClick={() => setFilter(r === filter ? '' : r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === r ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Nome / Email', 'Cargo', 'Nível', 'Desde', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-600">
                  Nenhum membro na equipe ainda
                </td>
              </tr>
            ) : filtered.map(m => {
              const cfg = ROLE_LABELS[m.role]
              const RoleIcon = ROLE_ICONS[m.role]
              const isOwner  = m.role === 'super_admin'
              return (
                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                        {m.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          {m.name}
                          {RoleIcon && <RoleIcon className="w-3 h-3 text-amber-400" />}
                        </p>
                        <p className="text-[11px] text-slate-600">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[m.role]}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    Nível {ROLE_HIERARCHY[m.role]}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {fmtDate(m.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <span
                        className="text-[10px] text-slate-600 italic"
                        title="Proprietário da plataforma — ações restritas"
                      >
                        Proprietário
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value as FoguetimRole)}
                          className="px-2 py-1 text-xs bg-[#1a1f2e] border border-white/[0.08] rounded-lg text-slate-300 focus:outline-none"
                        >
                          {ROLES.filter(r => r !== 'super_admin').map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemove(m.id, m.name)}
                          className="p-1.5 text-slate-700 hover:text-red-400 transition-colors"
                          title="Remover da equipe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Permissions legend */}
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> Hierarquia de Cargos
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ROLES.map(r => {
            const cfg = ROLE_LABELS[r]
            return (
              <div key={r} className="flex items-start gap-2.5 p-3 bg-white/[0.02] rounded-lg">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${ROLE_BADGE[r]}`}>
                  N{ROLE_HIERARCHY[r]}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{cfg.label}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{cfg.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111318] border border-white/[0.1] rounded-xl p-6 w-96 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Convidar membro</h3>
              <button onClick={() => setShowInvite(false)} className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">O usuário já deve ter uma conta no Foguetim.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">E-mail *</label>
                <input value={invEmail} onChange={e => setInvEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome (opcional)</label>
                <input value={invName} onChange={e => setInvName(e.target.value)}
                  placeholder="Nome do membro"
                  className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cargo *</label>
                <select value={invRole} onChange={e => setInvRole(e.target.value as FoguetimRole)}
                  className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/40">
                  {ROLES.filter(r => r !== 'super_admin').map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r].label} — {ROLE_LABELS[r].description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Observações</label>
                <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} rows={2}
                  placeholder="Anotações internas..."
                  className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowInvite(false)}
                className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.07] transition-all">
                Cancelar
              </button>
              <button onClick={handleInvite} disabled={!invEmail.trim() || inviting}
                className="flex-1 px-3 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all disabled:opacity-50">
                {inviting ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
