'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { maskEmail } from '@/lib/mask-email'
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, Download,
  X, Plug, PlugZap, CheckCircle2,
  User, CreditCard, ShieldCheck,
  KeyRound, Ban, FileText, MoreVertical,
  ExternalLink, Loader2, Mail, Trash2, Lock, Unlock,
  Package, Warehouse, ListChecks,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface AdminUser {
  id:               string
  name:             string
  email:            string
  plan:             string
  role:             string
  created_at:       string
  cancelled_at:     string | null
  ml_connected:     boolean
  shopee_connected: boolean
  products_count:   number
  last_sign_in_at:  string | null
  banned_until:     string | null
}

interface UserDetail {
  user:          Record<string, unknown>
  integrations:  { marketplace: string; connected: boolean; ml_nickname: string | null; ml_user_id: string | null; shop_id: string | null; shop_name: string | null; created_at: string }[]
  activity:      { action: string; category: string; description: string; created_at: string }[]
  notifications: { title: string; type: string; read: boolean; created_at: string }[]
  cancellations: { reason: string; details: string | null; created_at: string }[]
  onboarding:    { completed: boolean; current_step: number; steps_completed: Record<string, boolean> } | null
  warehouse:     { products_count: number; warehouses_count: number } | null
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const PLAN_LABELS: Record<string, string> = {
  explorador: 'Explorador', piloto: 'Piloto', comandante: 'Comandante',
  almirante: 'Almirante', missao_espacial: 'Missão Espacial', enterprise: 'Enterprise',
}
const PLAN_COLORS: Record<string, string> = {
  explorador: '#64748b', piloto: '#3b82f6', comandante: '#8b5cf6',
  almirante: '#f59e0b', missao_espacial: '#f97316', enterprise: '#ef4444',
}
const PLANS = ['explorador', 'piloto', 'comandante', 'almirante', 'missao_espacial', 'enterprise']
const ROLES = ['operador', 'supervisor', 'analista_produtos', 'analista_financeiro', 'suporte', 'diretor', 'admin', 'foguetim_support']

const AVATAR_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1']

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo' })
}
function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}m`
}

const SEL = 'px-3 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500/40'
const BTN_ACTION = 'flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-300 hover:bg-white/[0.07] transition-all disabled:opacity-50'
const MODAL_BG = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60'
const MODAL_BOX = 'bg-[#111318] border border-white/[0.1] rounded-xl p-5 w-96 space-y-4 max-h-[90vh] overflow-y-auto'

/* ── Small Modal ─────────────────────────────────────────────────────────── */
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className={MODAL_BG} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={MODAL_BOX}>{children}</div>
    </div>
  )
}

/* ── Drawer ──────────────────────────────────────────────────────────────── */
function UserDrawer({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail]     = useState<UserDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState('')
  const [saving, setSaving]     = useState(false)
  const [impersonating, setImpersonating] = useState(false)

  // Modal states
  const [showPlanModal, setShowPlanModal]       = useState(false)
  const [showRoleModal, setShowRoleModal]       = useState(false)
  const [showBlockModal, setShowBlockModal]     = useState(false)
  const [showEmailModal, setShowEmailModal]     = useState(false)
  const [showResetModal, setShowResetModal]     = useState(false)
  const [showDeleteModal, setShowDeleteModal]   = useState(false)
  const [deleteStep, setDeleteStep]             = useState(1)

  const [newPlan, setNewPlan]         = useState('')
  const [newRole, setNewRole]         = useState('')
  const [reason, setReason]           = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody]     = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/users/${userId}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .finally(() => setLoading(false))
  }, [userId])

  function toast(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  async function patch(body: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { toast('Salvo!'); setShowPlanModal(false); setShowRoleModal(false); setReason(''); onRefresh() }
    else { const d = await res.json(); toast(`Erro: ${d.error}`) }
  }

  async function apiAction(path: string, body: Record<string, unknown>, successMsg: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { toast(successMsg); onRefresh() }
      else { const d = await res.json(); toast(`Erro: ${d.error}`) }
    } catch { toast('Erro de conexão') }
    setSaving(false)
  }

  const u = detail?.user as Record<string, unknown> | undefined
  const isBanned = u?.banned_until && new Date(u.banned_until as string) > new Date()

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[540px] bg-[#0f1117] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: getAvatarColor(String(u?.name ?? '')) }}>
              {getInitials(String(u?.name ?? 'U'))}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{String(u?.name ?? '—')}</p>
              <p className="text-xs text-slate-500">{u?.email ? maskEmail(String(u.email)) : '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-slate-600 animate-spin" /></div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center"><p className="text-sm text-slate-500">Erro ao carregar</p></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {msg && <p className={`text-xs px-3 py-2 rounded-lg ${msg.startsWith('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{msg}</p>}

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Plano', PLAN_LABELS[String(u?.plan ?? '')] ?? String(u?.plan ?? '—')],
                ['Cargo', String(u?.role ?? '—')],
                ['Cadastro', fmtDate(String(u?.created_at ?? ''))],
                ['Status', isBanned ? 'Bloqueado' : u?.cancelled_at ? 'Cancelado' : 'Ativo'],
                ['Último login', timeAgo(u?.last_sign_in_at as string | null)],
                ['CNPJ/CPF', String(u?.document_number ?? '—')],
              ].map(([k, v]) => (
                <div key={k} className="bg-white/[0.03] rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-600 mb-0.5">{k}</p>
                  <p className="text-xs font-semibold text-slate-200">{v}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Ações</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowPlanModal(true)} className={BTN_ACTION}>
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Alterar plano
                </button>
                <button onClick={() => setShowRoleModal(true)} className={BTN_ACTION}>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Alterar cargo
                </button>
                <button onClick={() => setShowBlockModal(true)}
                  className={`${BTN_ACTION} ${isBanned ? '!text-green-400' : '!text-red-400'}`}>
                  {isBanned ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {isBanned ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button onClick={async () => {
                  setImpersonating(true)
                  try {
                    const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Verificação administrativa' }) })
                    const data = await res.json() as { url?: string; error?: string }
                    if (data.url) { window.open(data.url, '_blank'); toast('Impersonação aberta em nova aba') }
                    else toast(`Erro: ${data.error ?? 'Falha'}`)
                  } catch { toast('Erro ao impersonar') }
                  setImpersonating(false)
                }} disabled={impersonating}
                  className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                  {impersonating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />} Impersonar
                </button>
                <button onClick={() => setShowEmailModal(true)} className={BTN_ACTION}>
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Enviar email
                </button>
                <button onClick={() => setShowResetModal(true)} className={BTN_ACTION}>
                  <KeyRound className="w-3.5 h-3.5 text-orange-400" /> Resetar senha
                </button>
                <button onClick={() => { setShowDeleteModal(true); setDeleteStep(1); setConfirmEmail('') }}
                  className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/20 transition-all col-span-2">
                  <Trash2 className="w-3.5 h-3.5" /> Deletar conta
                </button>
              </div>
            </div>

            {/* Marketplaces */}
            {detail.integrations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Marketplaces</p>
                {detail.integrations.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] rounded-lg">
                    {i.connected ? <Plug className="w-3.5 h-3.5 text-green-400" /> : <PlugZap className="w-3.5 h-3.5 text-slate-600" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{i.marketplace}</p>
                      {i.ml_nickname && <p className="text-[10px] text-slate-500">@{i.ml_nickname}</p>}
                      {i.ml_user_id && <p className="text-[10px] text-slate-600 font-mono">ML ID: {i.ml_user_id}</p>}
                      {i.shop_id && <p className="text-[10px] text-slate-600 font-mono">Shop: {i.shop_id} {i.shop_name ? `(${i.shop_name})` : ''}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold ${i.connected ? 'text-green-400' : 'text-slate-600'}`}>
                      {i.connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Warehouse */}
            {detail.warehouse && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Armazém</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] rounded-lg p-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{detail.warehouse.products_count}</p>
                      <p className="text-[10px] text-slate-500">Produtos</p>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{detail.warehouse.warehouses_count}</p>
                      <p className="text-[10px] text-slate-500">Armazéns</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Onboarding */}
            {detail.onboarding && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Onboarding</p>
                <div className="bg-white/[0.03] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-purple-400" />
                      <p className="text-xs text-slate-300">
                        {detail.onboarding.completed ? 'Completo' : `Passo ${detail.onboarding.current_step + 1} de 7`}
                      </p>
                    </div>
                    {detail.onboarding.completed && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${detail.onboarding.completed ? 100 : Math.round(((detail.onboarding.current_step) / 7) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Activity */}
            {detail.activity.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Últimas Atividades</p>
                <div className="space-y-1">
                  {detail.activity.slice(0, 10).map((a, i) => (
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

        {/* ── Modals ── */}
        {/* Plan */}
        <Modal open={showPlanModal} onClose={() => setShowPlanModal(false)}>
          <h3 className="text-sm font-bold text-white">Alterar Plano</h3>
          <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className={`w-full ${SEL}`}>
            <option value="">Selecionar plano...</option>
            {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
          </select>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (obrigatório)" rows={2}
            className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setShowPlanModal(false)} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
            <button onClick={() => patch({ plan: newPlan, reason })} disabled={!newPlan || !reason || saving}
              className="flex-1 px-3 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>

        {/* Role */}
        <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)}>
          <h3 className="text-sm font-bold text-white">Alterar Cargo</h3>
          <select value={newRole} onChange={e => setNewRole(e.target.value)} className={`w-full ${SEL}`}>
            <option value="">Selecionar cargo...</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowRoleModal(false)} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
            <button onClick={() => patch({ role: newRole })} disabled={!newRole || saving}
              className="flex-1 px-3 py-2 text-xs text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50">
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>

        {/* Block / Unblock */}
        <Modal open={showBlockModal} onClose={() => setShowBlockModal(false)}>
          <h3 className="text-sm font-bold text-white">{isBanned ? 'Desbloquear Usuário' : 'Bloquear Usuário'}</h3>
          {isBanned ? (
            <p className="text-xs text-slate-400">Tem certeza que deseja desbloquear este usuário? Ele poderá acessar a plataforma novamente.</p>
          ) : (
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo do bloqueio (obrigatório)" rows={2}
              className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none" />
          )}
          <div className="flex gap-2">
            <button onClick={() => { setShowBlockModal(false); setReason('') }} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
            <button onClick={async () => {
              if (isBanned) await apiAction('desbloquear', {}, 'Usuário desbloqueado!')
              else await apiAction('bloquear', { reason }, 'Usuário bloqueado!')
              setShowBlockModal(false); setReason('')
            }} disabled={(!isBanned && !reason) || saving}
              className={`flex-1 px-3 py-2 text-xs text-white rounded-lg disabled:opacity-50 ${isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {saving ? 'Processando...' : isBanned ? 'Desbloquear' : 'Bloquear'}
            </button>
          </div>
        </Modal>

        {/* Send Email */}
        <Modal open={showEmailModal} onClose={() => setShowEmailModal(false)}>
          <h3 className="text-sm font-bold text-white">Enviar Email</h3>
          <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Assunto"
            className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none" />
          <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Corpo do email (HTML aceito)" rows={5}
            className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setShowEmailModal(false)} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
            <button onClick={async () => {
              await apiAction('email', { subject: emailSubject, body: emailBody }, 'Email enviado!')
              setShowEmailModal(false); setEmailSubject(''); setEmailBody('')
            }} disabled={!emailSubject || !emailBody || saving}
              className="flex-1 px-3 py-2 text-xs text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </Modal>

        {/* Reset Password */}
        <Modal open={showResetModal} onClose={() => setShowResetModal(false)}>
          <h3 className="text-sm font-bold text-white">Resetar Senha</h3>
          <p className="text-xs text-slate-400">Enviar email de redefinição de senha para <span className="text-slate-200">{u?.email ? maskEmail(String(u.email)) : ''}</span>?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowResetModal(false)} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
            <button onClick={async () => { await apiAction('reset-senha', {}, 'Email de redefinição enviado!'); setShowResetModal(false) }} disabled={saving}
              className="flex-1 px-3 py-2 text-xs text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </Modal>

        {/* Delete Account (double confirm) */}
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          {deleteStep === 1 ? (
            <>
              <h3 className="text-sm font-bold text-red-400">Deletar Conta</h3>
              <p className="text-xs text-slate-400">Tem certeza que deseja deletar permanentemente a conta de <span className="text-slate-200">{String(u?.name ?? '')}</span>? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
                <button onClick={() => setDeleteStep(2)} className="flex-1 px-3 py-2 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg">Continuar</button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-red-400">Confirmar Exclusão</h3>
              <p className="text-xs text-slate-400">Digite o email do usuário para confirmar:</p>
              <input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="email@exemplo.com"
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-3 py-2 text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg">Cancelar</button>
                <button onClick={async () => {
                  await apiAction('deletar', { confirm_email: confirmEmail }, 'Conta deletada!')
                  setShowDeleteModal(false); onClose()
                }} disabled={!confirmEmail || saving}
                  className="flex-1 px-3 py-2 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                  {saving ? 'Deletando...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function AdminUsuariosPage() {
  useEffect(() => { document.title = 'Usuários — Admin Foguetim' }, [])
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
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

  function exportCSV() {
    const header = 'Nome,Email,Plano,Cargo,ML,Shopee,Produtos,Último Login,Cadastro,Status'
    const rows = users.map(u =>
      [u.name, u.email, u.plan, u.role, u.ml_connected ? 'Sim' : 'Não', u.shopee_connected ? 'Sim' : 'Não',
        u.products_count, u.last_sign_in_at ?? 'Nunca', fmtDate(u.created_at), u.cancelled_at ? 'Cancelado' : u.banned_until ? 'Bloqueado' : 'Ativo',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `usuarios_foguetim_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Usuários</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? <span className="inline-block h-3.5 w-28 shimmer-load rounded align-middle" /> : `${total} usuários cadastrados`}
          </p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Nome, email ou CNPJ..."
            className="pl-9 pr-4 py-2 text-sm bg-[#111318] border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40 w-64" />
        </div>
        <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1) }} className={SEL}>
          <option value="">Todos os planos</option>
          {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className={SEL}>
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
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Usuário', 'Plano', 'Conexões', 'Produtos', 'Último login', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-4 shimmer-load rounded" /></td>))}</tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-600">Nenhum usuário encontrado</td></tr>
            ) : users.map(u => {
              const isBanned = u.banned_until && new Date(u.banned_until) > new Date()
              return (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedId(u.id)}>
                  {/* Avatar + Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: getAvatarColor(u.name || u.email) }}>
                        {getInitials(u.name || u.email)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{u.name || '—'}</p>
                        <p className="text-[11px] text-slate-600">{maskEmail(u.email)}</p>
                      </div>
                    </div>
                  </td>
                  {/* Plan */}
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${PLAN_COLORS[u.plan] ?? '#64748b'}20`, color: PLAN_COLORS[u.plan] ?? '#64748b' }}>
                      {PLAN_LABELS[u.plan] ?? u.plan}
                    </span>
                  </td>
                  {/* Connections */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {u.ml_connected && <span title="Mercado Livre" className="text-xs">🟡</span>}
                      {u.shopee_connected && <span title="Shopee" className="text-xs">🟠</span>}
                      {!u.ml_connected && !u.shopee_connected && <span className="text-xs text-slate-700">—</span>}
                    </div>
                  </td>
                  {/* Products */}
                  <td className="px-4 py-3 text-xs text-slate-400">{u.products_count}</td>
                  {/* Last login */}
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{timeAgo(u.last_sign_in_at)}</td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isBanned ? 'bg-red-500/10 text-red-400'
                        : u.cancelled_at ? 'bg-orange-500/10 text-orange-400'
                          : 'bg-green-500/10 text-green-400'
                    }`}>
                      {isBanned ? 'Bloqueado' : u.cancelled_at ? 'Cancelado' : 'Ativo'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); setSelectedId(u.id) }}
                      className="p-1.5 text-slate-600 hover:text-slate-200 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-600">{((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total}</p>
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
      {selectedId && <UserDrawer userId={selectedId} onClose={() => setSelectedId(null)} onRefresh={() => fetchUsers()} />}
    </div>
  )
}
