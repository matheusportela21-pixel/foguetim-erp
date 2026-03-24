'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ClaimEvidenceChecklist } from '@/components/ml/ClaimEvidenceChecklist'
import {
  AlertTriangle, Package, ShieldCheck, ExternalLink,
  AlertCircle, Loader2, Link2, RefreshCw, Clock,
  ToggleLeft, ToggleRight, ShieldOff, Zap, FileUp,
  RepeatIcon, MessageSquare, ChevronRight, Info,
  History, ArrowLeft,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClaimOrder {
  product_title:     string
  product_thumbnail: string
  buyer_nickname:    string
  total_amount:      number
  order_date:        string
}

interface ClaimItem {
  claim_id:           string
  order_id:           string
  status:             string
  stage:              string
  stage_label:        string
  reason_id:          string
  reason_label:       string
  date_created:       string
  last_updated:       string
  due_date:           string
  action_responsible: 'seller' | 'buyer' | 'mediator' | null
  days_open:          number
  urgency:            'urgent' | 'warning' | 'normal'
  order:              ClaimOrder
  resolution:         string
}

interface ClaimsSummary {
  total_opened:           number
  total_returns:          number
  total_claims:           number
  urgent:                 number
  warning:                number
  seller_action_required: number
}

interface ClaimDetailData {
  affects_reputation: boolean
  history:  Array<{ date: string; status: string; by?: string; type?: string; from?: string; to?: string }>
  returns:  Array<{ status?: string; type?: string; date_created?: string }>
  detail:   Record<string, unknown> | null
}

type FilterTab    = 'all' | 'returns' | 'claims' | 'urgent'
type StatusToggle = 'opened' | 'closed'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return iso }
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function urgencyStyles(urgency: 'urgent' | 'warning' | 'normal') {
  switch (urgency) {
    case 'urgent':  return { border: 'border-l-4 border-l-red-500/70',    bg: 'bg-red-900/10',    badge: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',       bar: 'bg-red-500'    }
    case 'warning': return { border: 'border-l-4 border-l-yellow-500/70', bg: 'bg-yellow-900/10', badge: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30', bar: 'bg-yellow-500' }
    default:        return { border: 'border-l-4 border-l-slate-700/60',  bg: 'bg-dark-800/40',   badge: 'bg-slate-700/40 text-slate-400',                            bar: 'bg-slate-600'  }
  }
}

const CACHE_KEY    = 'claims_count_cache'
const CACHE_TTL_MS = 5 * 60 * 1000

function saveCacheCount(count: number) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() })) } catch { /* ignore */ }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse p-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-3 h-20 bg-dark-800/40 border-l-4 border-l-slate-700/30" />
      ))}
    </div>
  )
}

function NotConnected() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 px-6">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
        <Link2 className="w-7 h-7 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 text-lg font-semibold mb-1">Mercado Livre não conectado</p>
        <p className="text-slate-500 text-sm max-w-xs">Conecte sua conta do Mercado Livre em Integrações para visualizar as reclamações.</p>
      </div>
      <a href="/dashboard/integracoes" className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
        Ir para Integrações
      </a>
    </div>
  )
}

function EmptyClean() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
      <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-green-400" />
      </div>
      <div className="text-center">
        <p className="text-green-400 font-bold text-lg mb-1">Nenhuma reclamação em aberto!</p>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">Continue assim — responda sempre rápido para manter sua reputação.</p>
      </div>
    </div>
  )
}

function DetailEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
        <ChevronRight className="w-6 h-6 text-slate-600" />
      </div>
      <div>
        <p className="text-slate-400 font-semibold mb-1">Selecione uma reclamação</p>
        <p className="text-slate-600 text-sm">Clique em qualquer item da lista para ver os detalhes, histórico e ações disponíveis.</p>
      </div>
    </div>
  )
}

// ─── Claim list item (compact) ──────────────────────────────────────────────────

function ClaimListItem({
  claim, selected, onClick,
}: { claim: ClaimItem; selected: boolean; onClick: () => void }) {
  const s = urgencyStyles(claim.urgency)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass-card rounded-xl overflow-hidden ${s.border} transition-all hover:brightness-110 ${
        selected ? 'ring-2 ring-purple-500/50 brightness-110' : ''
      }`}
    >
      <div className={`p-3 flex items-start gap-2.5 ${selected ? 'bg-purple-500/5' : s.bg}`}>
        {/* Thumbnail */}
        {claim.order.product_thumbnail ? (
          <img src={claim.order.product_thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-dark-700 border border-white/[0.06]" onError={e => { (e.currentTarget as HTMLImageElement).src = '' }} />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center shrink-0 border border-white/[0.06]">
            <Package className="w-4 h-4 text-slate-600" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-1.5">
            <p className="text-xs font-semibold text-white line-clamp-2 leading-snug flex-1">
              {claim.order.product_title}
            </p>
            {claim.urgency !== 'normal' && (
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.badge} ${claim.urgency === 'urgent' ? 'animate-pulse' : ''}`}>
                {claim.urgency === 'urgent' ? `${claim.days_open}d` : `${claim.days_open}d`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
            <span>{claim.reason_label}</span>
            <span>·</span>
            <span>{claim.stage_label}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {claim.action_responsible === 'seller' && (
              <span className="text-[9px] bg-amber-900/40 text-amber-400 border border-amber-700 px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Sua vez de agir
              </span>
            )}
            {claim.action_responsible === 'mediator' && (
              <span className="text-[9px] bg-blue-900/40 text-blue-400 border border-blue-700 px-1.5 py-0.5 rounded-full">
                ML mediando
              </span>
            )}
            {claim.due_date && (
              <span className="text-[9px] text-slate-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {fmtDate(claim.due_date)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Detail Panel ───────────────────────────────────────────────────────────────

function DetailPanel({
  claim, detail, detailLoading, onUploadEvidence, uploadingEvidence,
}: {
  claim:             ClaimItem
  detail:            ClaimDetailData | null
  detailLoading:     boolean
  onUploadEvidence:  (file: File) => void
  uploadingEvidence: boolean
}) {
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  function toggleItem(item: string) {
    setCheckedItems(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }

  const actionBadge = claim.action_responsible === 'seller'
    ? <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-700 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1"><Zap className="w-3 h-3" /> VOCÊ (vendedor)</span>
    : claim.action_responsible === 'buyer'
    ? <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">Comprador</span>
    : claim.action_responsible === 'mediator'
    ? <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-700 px-2 py-0.5 rounded-full">ML (mediador)</span>
    : <span className="text-xs text-slate-500">—</span>

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Reclamação</p>
          <p className="text-lg font-bold text-white">#{claim.claim_id}</p>
          <p className="text-xs text-slate-500 mt-0.5">Pedido #{claim.order_id}</p>
        </div>
        <a
          href={`https://www.mercadolivre.com.br/disputas/${claim.claim_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-purple-600/20 text-slate-400 hover:text-purple-400 border border-white/[0.06] hover:border-purple-500/30 transition-all text-xs font-semibold"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Ver no ML
        </a>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card rounded-xl p-3 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Afeta reputação</p>
          {detailLoading ? (
            <div className="h-4 w-16 bg-dark-700 rounded animate-pulse" />
          ) : detail ? (
            <p className={`text-sm font-bold ${detail.affects_reputation ? 'text-red-400' : 'text-green-400'}`}>
              {detail.affects_reputation ? '⚠️ SIM' : '✅ NÃO'}
            </p>
          ) : (
            <p className="text-xs text-slate-600">—</p>
          )}
        </div>
        <div className="glass-card rounded-xl p-3 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Responsável agora</p>
          {actionBadge}
        </div>
        {claim.due_date && (
          <div className="glass-card rounded-xl p-3 space-y-1 col-span-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Prazo</p>
            <p className="text-sm font-bold text-amber-400">{fmtDateTime(claim.due_date)}</p>
          </div>
        )}
      </div>

      {/* Product + order */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Produto e pedido</p>
        <div className="flex items-center gap-2.5">
          {claim.order.product_thumbnail ? (
            <img src={claim.order.product_thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/[0.06]" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-dark-700 flex items-center justify-center border border-white/[0.06]">
              <Package className="w-5 h-5 text-slate-600" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white line-clamp-2">{claim.order.product_title}</p>
            <p className="text-xs text-slate-500">Comprador: {claim.order.buyer_nickname}</p>
            {claim.order.total_amount > 0 && (
              <p className="text-xs font-bold text-slate-300">{fmtBRL(claim.order.total_amount)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 text-[10px] text-slate-500 pt-1 border-t border-white/[0.04]">
          <span>Motivo: <span className="text-slate-300 font-medium">{claim.reason_label}</span></span>
          <span>·</span>
          <span>Fase: <span className="text-slate-300">{claim.stage_label}</span></span>
        </div>
      </div>

      {/* Status history */}
      {detailLoading ? (
        <div className="glass-card rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1"><History className="w-3 h-3" /> Histórico</p>
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-dark-700 rounded" />)}
          </div>
        </div>
      ) : (detail?.history.length ?? 0) > 0 ? (
        <div className="glass-card rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
            <History className="w-3 h-3" /> Histórico
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {detail!.history.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5" />
                <div>
                  <p className="text-slate-300">{ev.status ?? ev.to ?? `Etapa ${i + 1}`}</p>
                  <p className="text-[10px] text-slate-600">{fmtDateTime(ev.date)} {ev.by ? `· ${ev.by}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Returns */}
      {(detail?.returns.length ?? 0) > 0 && (
        <div className="glass-card rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
            <RepeatIcon className="w-3 h-3" /> Devolução
          </p>
          {detail!.returns.map((r, i) => (
            <div key={i} className="text-xs space-y-0.5">
              <p className="text-slate-300 font-medium">{r.type ?? 'Devolução'}</p>
              <p className="text-slate-500">Status: <span className="text-slate-400">{r.status ?? '—'}</span></p>
              {r.date_created && <p className="text-slate-600">{fmtDate(r.date_created)}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Ações disponíveis</p>
        <div className="space-y-2">

          {/* Upload evidence */}
          <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={e => {
            const file = e.target.files?.[0]
            if (file) onUploadEvidence(file)
            e.target.value = ''
          }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingEvidence}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/20 hover:border-purple-500/40 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {uploadingEvidence ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
            {uploadingEvidence ? 'Enviando...' : 'Enviar evidência'}
          </button>

          {/* View on ML */}
          <a
            href={`https://www.mercadolivre.com.br/disputas/${claim.claim_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-400 hover:text-slate-200 border border-white/[0.06] text-xs font-semibold transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Responder no ML
          </a>
        </div>
      </div>

      {/* Evidence checklist */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
          <Info className="w-3 h-3" /> Checklist de evidências
        </p>
        <p className="text-[10px] text-slate-600">Marque o que você já preparou para enviar como evidência:</p>
        <ClaimEvidenceChecklist
          reasonId={claim.reason_id}
          checkedItems={checkedItems}
          onToggle={toggleItem}
        />
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function ReclamacoesPage() {
  const [items,             setItems]             = useState<ClaimItem[]>([])
  const [summary,           setSummary]           = useState<ClaimsSummary | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState<string | null>(null)
  const [notConnected,      setNotConnected]      = useState(false)
  const [filterTab,         setFilterTab]         = useState<FilterTab>('all')
  const [statusToggle,      setStatusToggle]      = useState<StatusToggle>('opened')
  const [selectedId,        setSelectedId]        = useState<string | null>(null)
  const [detail,            setDetail]            = useState<ClaimDetailData | null>(null)
  const [detailLoading,     setDetailLoading]     = useState(false)
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [uploadMsg,         setUploadMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  const loadData = useCallback(async (status: StatusToggle, type: FilterTab) => {
    setLoading(true)
    setError(null)
    setNotConnected(false)
    setItems([])
    setSummary(null)
    setSelectedId(null)
    setDetail(null)

    const apiType = type === 'urgent' ? 'all' : type
    try {
      const res  = await fetch(`/api/mercadolivre/reclamacoes?status=${status}&type=${apiType}`)
      const data = await res.json() as {
        error?:   string
        code?:    string
        summary?: ClaimsSummary
        items?:   ClaimItem[]
      }
      if (data.code === 'NOT_CONNECTED') { setNotConnected(true); return }
      if (data.error) { setError(data.error); return }

      const fetchedItems = data.items ?? []
      setItems(fetchedItems)
      setSummary(data.summary ?? null)
      if (status === 'opened') saveCacheCount(data.summary?.total_opened ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData(statusToggle, filterTab) }, [loadData, statusToggle, filterTab])

  // Load detail when selection changes
  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    setDetailLoading(true)
    setDetail(null)
    fetch(`/api/mercadolivre/reclamacoes/${selectedId}`)
      .then(r => r.json())
      .then((d: ClaimDetailData) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  async function handleUploadEvidence(file: File) {
    if (!selectedId) return
    setUploadingEvidence(true)
    setUploadMsg(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/mercadolivre/reclamacoes/${selectedId}/evidencia`, { method: 'POST', body: form })
      if (res.ok) {
        setUploadMsg({ ok: true, text: 'Evidência enviada com sucesso!' })
      } else {
        const d = await res.json()
        setUploadMsg({ ok: false, text: d.error ?? 'Erro ao enviar evidência' })
      }
    } catch {
      setUploadMsg({ ok: false, text: 'Erro ao enviar evidência' })
    } finally {
      setUploadingEvidence(false)
      setTimeout(() => setUploadMsg(null), 5000)
    }
  }

  const filtered = useMemo(() => {
    if (filterTab === 'urgent') return items.filter(c => c.urgency === 'urgent')
    return items
  }, [items, filterTab])

  const selectedClaim = items.find(c => c.claim_id === selectedId) ?? null
  const urgentCount   = summary?.urgent ?? 0
  const sellerCount   = summary?.seller_action_required ?? 0

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all',     label: 'Todas',       count: summary?.total_opened  },
    { id: 'returns', label: 'Devoluções',  count: summary?.total_returns },
    { id: 'claims',  label: 'Reclamações', count: summary?.total_claims  },
    { id: 'urgent',  label: 'Urgentes',    count: urgentCount            },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PageHeader
        title="Devoluções e Reclamações"
        description="Gerencie disputas abertas e evite impacto na sua reputação"
      />

      {notConnected ? (
        <NotConnected />
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: list panel ─────────────────────────────────────────────── */}
          <div className="w-[380px] shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">

            {/* Filters bar */}
            <div className="px-3 pt-3 pb-2 space-y-2 border-b border-white/[0.06]">

              {/* Seller action banner */}
              {!loading && sellerCount > 0 && statusToggle === 'opened' && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  <p className="text-xs text-amber-300 font-semibold">
                    {sellerCount} aguardando sua ação
                  </p>
                </div>
              )}

              {/* Tab filters */}
              <div className="flex items-center gap-1 p-0.5 bg-dark-800/60 rounded-lg border border-white/[0.04]">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      filterTab === tab.id
                        ? tab.id === 'urgent'
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-purple-600 text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`px-1 rounded text-[9px] font-bold ${filterTab === tab.id ? 'bg-white/20' : 'bg-dark-700'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Status toggle + refresh */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStatusToggle(p => p === 'opened' ? 'closed' : 'opened')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-800/60 border border-white/[0.04] text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-all"
                >
                  {statusToggle === 'opened'
                    ? <><ToggleRight className="w-3.5 h-3.5 text-green-400" /> Em aberto</>
                    : <><ToggleLeft className="w-3.5 h-3.5 text-slate-500" /> Encerrados</>
                  }
                </button>
                <button
                  onClick={() => loadData(statusToggle, filterTab)}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-800/60 border border-white/[0.04] text-[11px] text-slate-400 hover:text-slate-200 transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading && <ListSkeleton />}

              {!loading && error && (
                <div className="p-3">
                  <div className="glass-card p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {!loading && !error && filtered.length === 0 && statusToggle === 'opened' && (
                <EmptyState
                  image="celebrate"
                  title="Nenhuma reclamação aberta"
                  description="Tudo limpo! Continue mantendo sua reputação impecável."
                />
              )}

              {!loading && !error && filtered.length === 0 && statusToggle === 'closed' && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <AlertTriangle className="w-7 h-7 text-slate-600" />
                  <p className="text-slate-500 text-xs">Nenhuma reclamação encerrada</p>
                </div>
              )}

              {!loading && !error && filtered.length > 0 && (
                <div className="p-3 space-y-2">
                  {filtered.map(claim => (
                    <ClaimListItem
                      key={claim.claim_id}
                      claim={claim}
                      selected={claim.claim_id === selectedId}
                      onClick={() => setSelectedId(prev => prev === claim.claim_id ? null : claim.claim_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: detail panel ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden relative">
            {uploadMsg && (
              <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg text-xs font-semibold shadow-lg ${
                uploadMsg.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {uploadMsg.text}
              </div>
            )}

            {selectedClaim ? (
              <DetailPanel
                claim={selectedClaim}
                detail={detail}
                detailLoading={detailLoading}
                onUploadEvidence={handleUploadEvidence}
                uploadingEvidence={uploadingEvidence}
              />
            ) : (
              <DetailEmptyState />
            )}
          </div>

        </div>
      )}
    </div>
  )
}
