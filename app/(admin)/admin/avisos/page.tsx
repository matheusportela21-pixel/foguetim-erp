'use client'

import { useState, useEffect } from 'react'
import {
  Bell, Plus, Sparkles, Wrench, TrendingUp, Shield,
  Eye, EyeOff, Loader2, Check, X, ChevronDown, ChevronUp,
  Info, AlertTriangle, CheckCircle, Zap,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Announcement {
  id:             string
  title:          string
  content:        string
  type:           string
  link:           string | null
  is_active:      boolean
  is_dismissible: boolean
  target_plans:   string[]
  starts_at:      string
  expires_at:     string | null
  created_at:     string
}

interface ChangelogEntry {
  id:           string
  version:      string
  title:        string
  description:  string
  details:      string | null
  category:     string
  is_published: boolean
  published_at: string
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  info:    { icon: Info,         color: 'text-blue-400 bg-blue-500/10',   label: 'Info'    },
  warning: { icon: AlertTriangle,color: 'text-amber-400 bg-amber-500/10', label: 'Atenção' },
  success: { icon: CheckCircle,  color: 'text-green-400 bg-green-500/10', label: 'Sucesso' },
  urgent:  { icon: Zap,          color: 'text-red-400 bg-red-500/10',     label: 'Urgente' },
}

const CAT_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  feature:     { icon: Sparkles,   color: 'text-purple-400', label: 'Feature'   },
  fix:         { icon: Wrench,     color: 'text-blue-400',   label: 'Correção'  },
  improvement: { icon: TrendingUp, color: 'text-green-400',  label: 'Melhoria'  },
  security:    { icon: Shield,     color: 'text-red-400',    label: 'Segurança' },
}

/* ── Announcement Form ───────────────────────────────────────────────────── */
function AnnouncementForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm]   = useState({ title: '', content: '', type: 'info', link: '', expires_at: '', target_plans: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [saved,  setSaved]  = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/announcements/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:         form.title,
          content:       form.content,
          type:          form.type,
          link:          form.link || null,
          expires_at:    form.expires_at || null,
          target_plans:  form.target_plans ? form.target_plans.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      })
      const d = await res.json() as { error?: string }
      if (!res.ok) throw new Error(d.error ?? 'Erro ao criar')
      setSaved(true)
      setForm({ title: '', content: '', type: 'info', link: '', expires_at: '', target_plans: '' })
      setTimeout(() => { setSaved(false); onSuccess() }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={e => void submit(e)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Título *</label>
          <input
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            required className="input w-full" placeholder="Ex: Nova feature disponível"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            className="input w-full">
            <option value="info">Info</option>
            <option value="success">Sucesso</option>
            <option value="warning">Atenção</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Conteúdo *</label>
        <textarea
          value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
          required rows={2} className="input w-full resize-none" placeholder="Descrição do aviso..."
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Link (opcional)</label>
          <input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
            className="input w-full" placeholder="/dashboard/..." />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expira em (opcional)</label>
          <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
            className="input w-full" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Planos-alvo (vírgula)</label>
          <input value={form.target_plans} onChange={e => setForm(p => ({ ...p, target_plans: e.target.value }))}
            className="input w-full" placeholder="vazio = todos" />
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={saving}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          saved ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
        } disabled:opacity-50`}>
        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando...</>
          : saved ? <><Check className="w-3.5 h-3.5" /> Criado!</>
          : <><Plus className="w-3.5 h-3.5" /> Criar Aviso</>}
      </button>
    </form>
  )
}

/* ── Changelog Form ──────────────────────────────────────────────────────── */
function ChangelogForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm]     = useState({ version: '', title: '', description: '', details: '', category: 'feature', published_at: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [saved,  setSaved]  = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/changelog/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version:      form.version,
          title:        form.title,
          description:  form.description,
          details:      form.details || null,
          category:     form.category,
          published_at: form.published_at ? new Date(form.published_at).toISOString() : undefined,
        }),
      })
      const d = await res.json() as { error?: string }
      if (!res.ok) throw new Error(d.error ?? 'Erro ao criar')
      setSaved(true)
      setForm({ version: '', title: '', description: '', details: '', category: 'feature', published_at: '' })
      setTimeout(() => { setSaved(false); onSuccess() }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={e => void submit(e)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Versão *</label>
          <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
            required className="input w-full" placeholder="1.5.1" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Categoria</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="input w-full">
            <option value="feature">Feature</option>
            <option value="fix">Correção</option>
            <option value="improvement">Melhoria</option>
            <option value="security">Segurança</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data de publicação</label>
          <input type="date" value={form.published_at} onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))}
            className="input w-full" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Título *</label>
        <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          required className="input w-full" placeholder="Ex: Módulo de Estoque" />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição curta *</label>
        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          required className="input w-full" placeholder="Resumo em uma linha..." />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Detalhes (opcional)</label>
        <textarea value={form.details} onChange={e => setForm(p => ({ ...p, details: e.target.value }))}
          rows={3} className="input w-full resize-none" placeholder="Descrição completa, lista de mudanças..." />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={saving}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          saved ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
        } disabled:opacity-50`}>
        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando...</>
          : saved ? <><Check className="w-3.5 h-3.5" /> Criado!</>
          : <><Plus className="w-3.5 h-3.5" /> Criar Nota</>}
      </button>
    </form>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function AdminAvisosPage() {
  const [tab,          setTab]          = useState<'avisos' | 'changelog'>('avisos')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [changelog,    setChangelog]    = useState<ChangelogEntry[]>([])
  const [loadingA,     setLoadingA]     = useState(true)
  const [loadingC,     setLoadingC]     = useState(true)
  const [showFormA,    setShowFormA]    = useState(false)
  const [showFormC,    setShowFormC]    = useState(false)
  const [togglingId,   setTogglingId]   = useState<string | null>(null)

  function loadAnnouncements() {
    setLoadingA(true)
    fetch('/api/announcements/admin')
      .then(r => r.json())
      .then((d: { announcements?: Announcement[] }) => setAnnouncements(d.announcements ?? []))
      .catch(() => { /* silent */ })
      .finally(() => setLoadingA(false))
  }

  function loadChangelog() {
    setLoadingC(true)
    fetch('/api/changelog/admin')
      .then(r => r.json())
      .then((d: { entries?: ChangelogEntry[] }) => setChangelog(d.entries ?? []))
      .catch(() => { /* silent */ })
      .finally(() => setLoadingC(false))
  }

  useEffect(() => { loadAnnouncements(); loadChangelog() }, [])

  async function toggleAnnouncement(id: string, isActive: boolean) {
    setTogglingId(id)
    await fetch(`/api/announcements/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a))
    setTogglingId(null)
  }

  async function toggleChangelog(id: string, isPublished: boolean) {
    setTogglingId(id)
    await fetch(`/api/changelog/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !isPublished }),
    })
    setChangelog(prev => prev.map(c => c.id === id ? { ...c, is_published: !isPublished } : c))
    setTogglingId(null)
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Avisos & Changelog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Gerencie comunicados para os usuários</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800/50 p-1 rounded-xl w-fit border border-white/[0.06]">
        {(['avisos', 'changelog'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t === 'avisos' ? <><Bell className="w-3.5 h-3.5" /> Avisos</> : <><Sparkles className="w-3.5 h-3.5" /> Changelog</>}
          </button>
        ))}
      </div>

      {/* ── Avisos tab ── */}
      {tab === 'avisos' && (
        <div className="space-y-4">
          {/* New form toggle */}
          <div className="dash-card rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <button
              onClick={() => setShowFormA(p => !p)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Criar novo aviso</span>
              </div>
              {showFormA ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {showFormA && (
              <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
                <AnnouncementForm onSuccess={() => { setShowFormA(false); loadAnnouncements() }} />
              </div>
            )}
          </div>

          {/* List */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-bold text-slate-400">
                {announcements.length} aviso{announcements.length !== 1 ? 's' : ''}
              </p>
            </div>
            {loadingA ? (
              <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : announcements.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-600">Nenhum aviso criado ainda</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {announcements.map(a => {
                  const cfg  = TYPE_CFG[a.type] ?? TYPE_CFG.info
                  const Icon = cfg.icon
                  return (
                    <div key={a.id} className={`flex items-start gap-3 px-5 py-4 ${!a.is_active ? 'opacity-50' : ''}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-white">{a.title}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${cfg.color}`}>{cfg.label}</span>
                          {!a.is_active && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 uppercase">Inativo</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{a.content}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-700">Criado: {fmtDate(a.created_at)}</span>
                          {a.expires_at && <span className="text-[10px] text-amber-600">Expira: {fmtDate(a.expires_at)}</span>}
                          {a.link && <span className="text-[10px] text-blue-600 truncate max-w-[120px]">{a.link}</span>}
                          {a.target_plans.length > 0 && (
                            <span className="text-[10px] text-slate-600">{a.target_plans.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => void toggleAnnouncement(a.id, a.is_active)}
                        disabled={togglingId === a.id}
                        className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all disabled:opacity-50"
                        title={a.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {togglingId === a.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : a.is_active ? (
                          <Eye className="w-4 h-4 text-green-400" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Changelog tab ── */}
      {tab === 'changelog' && (
        <div className="space-y-4">
          {/* New form toggle */}
          <div className="dash-card rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <button
              onClick={() => setShowFormC(p => !p)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Criar nova nota de atualização</span>
              </div>
              {showFormC ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {showFormC && (
              <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
                <ChangelogForm onSuccess={() => { setShowFormC(false); loadChangelog() }} />
              </div>
            )}
          </div>

          {/* List */}
          <div className="dash-card rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-bold text-slate-400">
                {changelog.length} entrada{changelog.length !== 1 ? 's' : ''}
              </p>
            </div>
            {loadingC ? (
              <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : changelog.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-600">Nenhuma nota de atualização criada ainda</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {changelog.map(c => {
                  const cfg  = CAT_CFG[c.category] ?? CAT_CFG.feature
                  const Icon = cfg.icon
                  return (
                    <div key={c.id} className={`flex items-start gap-3 px-5 py-4 ${!c.is_published ? 'opacity-50' : ''}`}>
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-slate-500">{c.version}</span>
                          <p className="text-xs font-semibold text-white">{c.title}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${cfg.color}`}>{cfg.label}</span>
                          {!c.is_published && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 uppercase">Despublicado</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{c.description}</p>
                        <span className="text-[10px] text-slate-700">{fmtDate(c.published_at)}</span>
                      </div>
                      <button
                        onClick={() => void toggleChangelog(c.id, c.is_published)}
                        disabled={togglingId === c.id}
                        className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all disabled:opacity-50"
                        title={c.is_published ? 'Despublicar' : 'Publicar'}
                      >
                        {togglingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : c.is_published ? (
                          <Eye className="w-4 h-4 text-green-400" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
