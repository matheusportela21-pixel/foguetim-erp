'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Send, RefreshCw, Users, User, CreditCard } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
type NotifType     = 'info' | 'warning' | 'error' | 'success'
type NotifCategory = 'system' | 'orders' | 'claims' | 'products' | 'financial' | 'integration'
type Target        = 'all' | 'plan' | 'user'

interface HistoryItem {
  id:         string
  admin_id:   string
  details:    {
    title:   string
    target:  string
    plan?:   string
    user_id?: string
    count:   number
  }
  created_at: string
  users:      { name: string; email: string } | null
}

const PLANS = ['explorador', 'piloto', 'comandante', 'almirante', 'enterprise']
const PLAN_LABELS: Record<string, string> = {
  explorador: 'Explorador', piloto: 'Piloto', comandante: 'Comandante',
  almirante: 'Almirante', enterprise: 'Enterprise',
}

const TYPE_BG: Record<NotifType, string> = {
  info:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  error:   'bg-red-500/10 border-red-500/20 text-red-400',
  success: 'bg-green-500/10 border-green-500/20 text-green-400',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminNotificacoesPage() {
  // Form state
  const [target, setTarget]       = useState<Target>('all')
  const [plan, setPlan]           = useState('')
  const [userId, setUserId]       = useState('')
  const [title, setTitle]         = useState('')
  const [message, setMessage]     = useState('')
  const [type, setType]           = useState<NotifType>('info')
  const [category, setCategory]   = useState<NotifCategory>('system')
  const [actionUrl, setActionUrl] = useState('')
  const [sending, setSending]     = useState(false)
  const [result, setResult]       = useState<{ ok: boolean; msg: string } | null>(null)

  // History
  const [history, setHistory]     = useState<HistoryItem[]>([])
  const [loadingH, setLoadingH]   = useState(true)

  const loadHistory = useCallback(async () => {
    setLoadingH(true)
    try {
      const res = await fetch('/api/admin/notify')
      if (res.ok) {
        const d = await res.json()
        setHistory(d.history ?? [])
      }
    } finally {
      setLoadingH(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function handleSend() {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setResult(null)
    const body: Record<string, unknown> = {
      target, title, message, type, category,
    }
    if (target === 'plan'  && plan)   body.plan    = plan
    if (target === 'user'  && userId) body.user_id = userId
    if (actionUrl.trim())             body.action_url = actionUrl.trim()

    const res = await fetch('/api/admin/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSending(false)
    if (res.ok) {
      setResult({ ok: true, msg: `✅ Notificação enviada para ${data.sent} usuário(s)` })
      setTitle(''); setMessage(''); setActionUrl('')
      loadHistory()
    } else {
      setResult({ ok: false, msg: `❌ Erro: ${data.error}` })
    }
  }

  const canSend = title.trim() && message.trim() &&
    (target !== 'plan' || plan) &&
    (target !== 'user' || userId)

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Notificações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Envie alertas e comunicados para seus usuários</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Nova notificação</p>

          {/* Target */}
          <div>
            <label className="block text-xs text-slate-500 mb-2">Destinatário</label>
            <div className="flex gap-2">
              {([
                { v: 'all',  icon: Users,       label: 'Todos'    },
                { v: 'plan', icon: CreditCard,   label: 'Por plano'},
                { v: 'user', icon: User,         label: 'Usuário'  },
              ] as const).map(opt => (
                <button key={opt.v} onClick={() => setTarget(opt.v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all flex-1 justify-center ${
                    target === opt.v
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300'
                  }`}>
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plan selector */}
          {target === 'plan' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Plano</label>
              <select value={plan} onChange={e => setPlan(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500/40">
                <option value="">Selecionar plano...</option>
                {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
              </select>
            </div>
          )}

          {/* User ID */}
          {target === 'user' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">ID do usuário</label>
              <input value={userId} onChange={e => setUserId(e.target.value)}
                placeholder="UUID do usuário"
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Manutenção programada"
              className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Mensagem *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Descreva o conteúdo da notificação..."
              className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40 resize-none"
            />
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as NotifType)}
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500/40">
                <option value="info">Info</option>
                <option value="success">Sucesso</option>
                <option value="warning">Alerta</option>
                <option value="error">Erro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value as NotifCategory)}
                className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500/40">
                <option value="system">Sistema</option>
                <option value="orders">Pedidos</option>
                <option value="integration">Integração</option>
                <option value="financial">Financeiro</option>
                <option value="products">Produtos</option>
                <option value="claims">Reclamações</option>
              </select>
            </div>
          </div>

          {/* Action URL */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">URL de ação (opcional)</label>
            <input value={actionUrl} onChange={e => setActionUrl(e.target.value)}
              placeholder="Ex: /dashboard/integracoes"
              className="w-full px-3 py-2 text-sm bg-[#1a1f2e] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40"
            />
          </div>

          {/* Result */}
          {result && (
            <p className={`text-xs px-3 py-2 rounded-lg border ${result.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {result.msg}
            </p>
          )}

          <button onClick={handleSend} disabled={!canSend || sending}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all">
            <Send className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Enviar notificação'}
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Preview</p>
            <div className={`flex items-start gap-3 p-3 border rounded-xl ${TYPE_BG[type]}`}>
              <Bell className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{title || 'Título da notificação'}</p>
                <p className="text-xs mt-0.5 opacity-80">{message || 'Mensagem da notificação aparecerá aqui...'}</p>
                {actionUrl && <p className="text-xs mt-1 underline opacity-70">Ver detalhes →</p>}
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-3">
              Destinatário: {target === 'all' ? 'Todos os usuários ativos' : target === 'plan' ? `Plano ${PLAN_LABELS[plan] ?? '—'}` : `Usuário ${userId || '—'}`}
            </p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Histórico de Envios</p>
          <button onClick={loadHistory} disabled={loadingH}
            className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingH ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="bg-[#111318] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Enviado por', 'Título', 'Destinatário', 'Enviados', 'Data'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loadingH ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">
                    Nenhuma notificação enviada ainda
                  </td>
                </tr>
              ) : history.map(h => (
                <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-200">{h.users?.name ?? 'Admin'}</p>
                    <p className="text-[10px] text-slate-600">{h.users?.email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 max-w-[180px] truncate">{h.details?.title}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {h.details?.target === 'all'  ? 'Todos'
                    : h.details?.target === 'plan' ? `Plano ${PLAN_LABELS[h.details.plan ?? ''] ?? h.details.plan}`
                    : `Usuário`}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 font-semibold">{h.details?.count ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(h.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
