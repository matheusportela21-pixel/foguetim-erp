'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Users, Plus, Search, RefreshCw, Edit3, Trash2, X,
  Mail, Shield, Loader2, UserPlus, UserCheck, UserX,
  Clock, Check, Ban,
} from 'lucide-react'
import { ROLE_LABELS, ROLE_COLORS, TEAM_ROLES, ROLE_PERMISSIONS, ALL_PERMISSIONS, hasPermission } from '@/lib/team/permissions'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface TeamMember {
  id: string; owner_id: string; member_user_id: string | null
  email: string; name: string; role: string
  permissions: Record<string, boolean> | null
  status: string; invited_at: string; accepted_at: string | null; last_active_at: string | null
}

interface TeamInvite {
  id: string; email: string; name: string | null; role: string
  token: string; expires_at: string; status: string; created_at: string
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1']
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function getColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function timeAgo(iso: string | null) {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Check }> = {
  active:   { label: 'Ativo',       color: 'bg-green-500/10 text-green-400', icon: UserCheck },
  pending:  { label: 'Pendente',    color: 'bg-amber-500/10 text-amber-400', icon: Clock },
  disabled: { label: 'Desabilitado', color: 'bg-red-500/10 text-red-400',    icon: Ban },
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function EquipePage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  // Modals
  const [showInvite, setShowInvite] = useState(false)
  const [showPerms, setShowPerms]   = useState<TeamMember | null>(null)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'operador' })
  const [sending, setSending]       = useState(false)
  const [msg, setMsg]               = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadTeam = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team')
      if (res.ok) {
        const d = await res.json()
        setMembers(d.members ?? [])
        setInvites(d.invites ?? [])
        setIsOwner(d.isOwner ?? false)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTeam() }, [loadTeam])

  function toast(type: 'success' | 'error', text: string) {
    setMsg({ type, text }); setTimeout(() => setMsg(null), 4000)
  }

  async function sendInvite() {
    if (!inviteForm.email || !inviteForm.role) return
    setSending(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const d = await res.json()
      if (res.ok) { toast('success', d.message); setShowInvite(false); setInviteForm({ email: '', name: '', role: 'operador' }); loadTeam() }
      else toast('error', d.error)
    } catch { toast('error', 'Erro ao enviar convite') }
    finally { setSending(false) }
  }

  async function removeMember(id: string) {
    if (!confirm('Remover este membro da equipe?')) return
    await fetch(`/api/team/members/${id}`, { method: 'DELETE' })
    loadTeam()
    toast('success', 'Membro removido')
  }

  async function toggleDisable(m: TeamMember) {
    const endpoint = m.status === 'disabled' ? 'enable' : 'disable'
    await fetch(`/api/team/members/${m.id}/${endpoint}`, { method: 'POST' })
    loadTeam()
    toast('success', m.status === 'disabled' ? 'Membro reabilitado' : 'Membro desabilitado')
  }

  async function revokeInvite(token: string) {
    await fetch(`/api/team/invite/${token}/revoke`, { method: 'DELETE' })
    loadTeam()
    toast('success', 'Convite revogado')
  }

  async function savePermissions(m: TeamMember, perms: Record<string, boolean>) {
    await fetch(`/api/team/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: perms }),
    })
    loadTeam(); setShowPerms(null)
    toast('success', 'Permissões atualizadas')
  }

  const activeMembers = members.filter(m => m.status === 'active').length
  const pendingMembers = members.filter(m => m.status === 'pending').length
  const filtered = search
    ? members.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
    : members

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Equipe" description="Gerencie os membros da sua equipe" />
        {isOwner && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors">
            <UserPlus className="w-4 h-4" /> Convidar membro
          </button>
        )}
      </div>

      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-xs ${msg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Membros', value: members.length, icon: Users, color: 'text-purple-400' },
          { label: 'Ativos',        value: activeMembers,  icon: UserCheck, color: 'text-green-400' },
          { label: 'Pendentes',     value: pendingMembers, icon: Clock, color: 'text-amber-400' },
          { label: 'Convites',      value: invites.length, icon: Mail, color: 'text-blue-400' },
        ].map(k => (
          <div key={k.label} className="glass-card px-4 py-3 flex items-center gap-3">
            <k.icon className={`w-5 h-5 ${k.color}`} />
            <div>
              <p className="text-[11px] text-slate-500">{k.label}</p>
              <p className="text-lg font-bold text-white">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none" />
        </div>
        <button onClick={loadTeam} disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-200 bg-[#111318] border border-white/[0.08] rounded-lg disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Members Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Membro', 'Cargo', 'Status', 'Último acesso', isOwner ? 'Ações' : ''].filter(Boolean).map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 shimmer-load rounded" /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-600">Nenhum membro encontrado</td></tr>
            ) : filtered.map(m => {
              const st = STATUS_CFG[m.status] ?? STATUS_CFG.pending
              return (
                <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: getColor(m.name || m.email) }}>
                        {getInitials(m.name || m.email)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{m.name || '—'}</p>
                        <p className="text-[11px] text-slate-600">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? 'text-slate-400 bg-slate-400/10'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                      <st.icon className="w-3 h-3" /> {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(m.last_active_at ?? m.accepted_at)}</td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowPerms(m)} className="p-1.5 text-slate-500 hover:text-purple-400 transition-colors" title="Permissões">
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleDisable(m)} className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors"
                          title={m.status === 'disabled' ? 'Reabilitar' : 'Desabilitar'}>
                          {m.status === 'disabled' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => removeMember(m.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Remover">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && isOwner && (
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Convites pendentes</p>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 bg-white/[0.02] rounded-lg">
              <div>
                <p className="text-xs text-slate-300">{inv.email}</p>
                <p className="text-[10px] text-slate-600">{ROLE_LABELS[inv.role] ?? inv.role} · Expira em {timeAgo(inv.expires_at)}</p>
              </div>
              <button onClick={() => revokeInvite(inv.token)} className="text-xs text-red-400 hover:underline">Revogar</button>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={e => { if (e.target === e.currentTarget) setShowInvite(false) }}>
          <div className="bg-[#111318] border border-white/[0.1] rounded-xl p-6 w-96 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Convidar novo membro</h3>
              <button onClick={() => setShowInvite(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email *</label>
              <input value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="fulano@email.com"
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome</label>
              <input value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo"
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cargo *</label>
              <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none">
                {TEAM_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <p className="text-[11px] text-slate-600">O convidado receberá um email com link para criar conta e acessar o sistema.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowInvite(false)} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
              <button onClick={sendInvite} disabled={!inviteForm.email || sending}
                className="flex-1 px-3 py-2 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5">
                {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                {sending ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPerms && (
        <PermissionsModal member={showPerms} onClose={() => setShowPerms(null)} onSave={savePermissions} />
      )}
    </div>
  )
}

/* ── Permissions Modal ───────────────────────────────────────────────────── */
function PermissionsModal({ member, onClose, onSave }: {
  member: TeamMember; onClose: () => void
  onSave: (m: TeamMember, perms: Record<string, boolean>) => void
}) {
  const rolePerms = ROLE_PERMISSIONS[member.role] ?? []
  const isWildcard = rolePerms.includes('*')
  const [overrides, setOverrides] = useState<Record<string, boolean>>(member.permissions ?? {})

  function toggle(key: string) {
    setOverrides(prev => {
      const next = { ...prev }
      if (next[key] === true) delete next[key]
      else if (next[key] === false) delete next[key]
      else {
        // If role has it → override to false (remove), else → override to true (add)
        const roleHas = isWildcard || rolePerms.includes(key) || rolePerms.includes(key.split(':')[0] + ':*')
        next[key] = !roleHas
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#111318] border border-white/[0.1] rounded-xl p-6 w-[440px] max-h-[80vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Permissões de {member.name}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Cargo: {ROLE_LABELS[member.role] ?? member.role}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-1">
          {ALL_PERMISSIONS.map(p => {
            const roleHas = hasPermission(member.role, null, p.key)
            const effective = hasPermission(member.role, overrides, p.key)
            const isOverridden = overrides[p.key] !== undefined

            return (
              <label key={p.key} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] cursor-pointer group">
                <input type="checkbox" checked={effective} onChange={() => toggle(p.key)}
                  className="w-3.5 h-3.5 accent-purple-500 cursor-pointer" />
                <span className={`text-xs ${effective ? 'text-slate-200' : 'text-slate-600'}`}>
                  {p.label}
                </span>
                {roleHas && !isOverridden && (
                  <span className="text-[9px] text-slate-700 ml-auto">(cargo)</span>
                )}
                {isOverridden && (
                  <span className={`text-[9px] ml-auto ${overrides[p.key] ? 'text-green-500' : 'text-red-500'}`}>
                    {overrides[p.key] ? '(adicionado)' : '(removido)'}
                  </span>
                )}
              </label>
            )
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
          <button onClick={() => onSave(member, overrides)}
            className="flex-1 px-3 py-2 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center gap-1.5">
            <Check className="w-3 h-3" /> Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
