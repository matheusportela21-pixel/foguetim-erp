'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, ChevronDown, ChevronUp, Search, CheckCircle,
  Circle, AlertCircle, RefreshCw, X, Save, Loader2,
} from 'lucide-react'
import {
  DATAS_COMEMORATIVAS_2026, CATEGORIA_CONFIG, getUpcomingEvents, formatEventDate,
  type DataComemorativa, type CategoriaData,
} from '@/lib/data/datas-comemorativas'
import { daysUntil, getBrasiliaDateString } from '@/lib/utils/timezone'

/* ── Types ───────────────────────────────────────────────────────────── */

type PlanStatus = 'sem_planejamento' | 'em_preparacao' | 'pronto'

interface ChecklistItem { label: string; checked: boolean }

interface PromotionPlan {
  id?:       string
  event_id:  string
  status:    PlanStatus
  notes:     string
  checklist: ChecklistItem[]
}

/* ── Default checklist ───────────────────────────────────────────────── */

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: 'Revisar estoque dos produtos em destaque',      checked: false },
  { label: 'Ajustar preços/promoções no ML',               checked: false },
  { label: 'Preparar banners e fotos especiais',           checked: false },
  { label: 'Planejar anúncios patrocinados',               checked: false },
]

/* ── Status config ───────────────────────────────────────────────────── */

const STATUS_CFG: Record<PlanStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  sem_planejamento: { label: 'Sem planejamento', icon: Circle,       color: 'text-slate-500',  bg: 'bg-slate-800'        },
  em_preparacao:    { label: 'Em preparação',    icon: AlertCircle,  color: 'text-yellow-400', bg: 'bg-yellow-900/30'    },
  pronto:           { label: 'Pronto',           icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-900/20'     },
}

/* ── Countdown badge ─────────────────────────────────────────────────── */

function CountdownBadge({ days }: { days: number }) {
  if (days < 0) {
    return <span className="text-[10px] font-medium text-slate-600">Passou há {Math.abs(days)} dia{Math.abs(days) !== 1 ? 's' : ''}</span>
  }
  if (days === 0) return <span className="text-[10px] font-bold text-red-400 animate-pulse">Hoje!</span>
  const color = days <= 7 ? 'text-red-400' : days <= 30 ? 'text-yellow-400' : 'text-slate-500'
  return <span className={`text-[10px] font-medium ${color}`}>Em {days} dia{days !== 1 ? 's' : ''}</span>
}

/* ── Category badge ──────────────────────────────────────────────────── */

function CategoriaBadge({ categoria }: { categoria: CategoriaData }) {
  const cfg = CATEGORIA_CONFIG[categoria]
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

/* ── Plan status badge ───────────────────────────────────────────────── */

function StatusBadge({ status }: { status: PlanStatus }) {
  const cfg = STATUS_CFG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  )
}

/* ── Plan drawer ─────────────────────────────────────────────────────── */

interface PlanDrawerProps {
  event:   DataComemorativa
  plan:    PromotionPlan
  onSave:  (plan: PromotionPlan) => Promise<void>
  onClose: () => void
}

function PlanDrawer({ event, plan: initialPlan, onSave, onClose }: PlanDrawerProps) {
  const [plan,    setPlan]    = useState<PromotionPlan>(initialPlan)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const days = daysUntil(event.data)

  function toggleCheck(i: number) {
    const checklist = plan.checklist.map((c, idx) => idx === i ? { ...c, checked: !c.checked } : c)
    setPlan(p => ({ ...p, checklist }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(plan)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const catCfg = CATEGORIA_CONFIG[event.categoria]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0d1117] border-l border-white/[0.08] z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className={`p-5 border-b border-white/[0.06] ${catCfg.bg}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{event.icone}</span>
                <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {event.nome}
                </h2>
              </div>
              <p className="text-xs text-slate-400">{formatEventDate(event.data)}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <CategoriaBadge categoria={event.categoria} />
                <CountdownBadge days={days} />
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Status do planejamento</p>
            <div className="flex flex-col gap-1.5">
              {(Object.entries(STATUS_CFG) as [PlanStatus, typeof STATUS_CFG[PlanStatus]][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button
                    key={key}
                    onClick={() => setPlan(p => ({ ...p, status: key }))}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all border ${
                      plan.status === key
                        ? `${cfg.bg} ${cfg.color} border-current/30 ring-1 ring-current/20`
                        : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {cfg.label}
                    {plan.status === key && <span className="ml-auto text-[10px] opacity-60">✓ selecionado</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Checklist de preparação</p>
            <div className="space-y-1.5">
              {plan.checklist.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                    item.checked
                      ? 'bg-green-600 border-green-600'
                      : 'border-slate-600 bg-transparent'
                  }`}>
                    {item.checked && <span className="text-[9px] text-white font-bold">✓</span>}
                  </div>
                  <span className={`text-sm transition-colors ${item.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Anotações</p>
            <textarea
              value={plan.notes}
              onChange={e => setPlan(p => ({ ...p, notes: e.target.value }))}
              placeholder="O que vou fazer nesta data? Quais produtos destacar? Metas de venda..."
              rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-purple-600/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {/* Tip */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[11px] font-semibold text-slate-400 mb-1">💡 Dica</p>
            <p className="text-xs text-slate-500 leading-relaxed">{event.dica}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-green-600/20 text-green-400'
                : 'bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50'
            }`}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Event row ───────────────────────────────────────────────────────── */

interface EventRowProps {
  event:   DataComemorativa
  plan?:   PromotionPlan
  days:    number
  onPlan:  (event: DataComemorativa) => void
}

function EventRow({ event, plan, days, onPlan }: EventRowProps) {
  const [tipOpen, setTipOpen] = useState(false)
  const isPast   = days < 0
  const catCfg   = CATEGORIA_CONFIG[event.categoria]
  const planStatus: PlanStatus = plan?.status ?? 'sem_planejamento'

  return (
    <div className={`dash-card rounded-xl overflow-hidden transition-all ${isPast ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3 p-3.5">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${catCfg.bg} ${catCfg.border} border`}>
          {event.icone}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <p className="text-sm font-semibold text-slate-200 truncate">{event.nome}</p>
            <CategoriaBadge categoria={event.categoria} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-slate-600">{formatEventDate(event.data)}</p>
            <CountdownBadge days={days} />
          </div>
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={planStatus} />
          <button
            onClick={() => setTipOpen(o => !o)}
            className="p-1.5 text-slate-600 hover:text-slate-300 transition-colors"
            title="Ver dica"
          >
            {tipOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onPlan(event)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
          >
            Planejar
          </button>
        </div>
      </div>

      {/* Tip collapsible */}
      {tipOpen && (
        <div className="px-4 pb-3 pt-0">
          <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[11px] text-slate-500 leading-relaxed">💡 {event.dica}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function CalendarioPage() {
  const [plans,         setPlans]         = useState<PromotionPlan[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [filterCat,     setFilterCat]     = useState<CategoriaData | 'all'>('all')
  const [showPast,      setShowPast]      = useState(false)
  const [search,        setSearch]        = useState('')
  const [activeEvent,   setActiveEvent]   = useState<DataComemorativa | null>(null)
  const [today,         setToday]         = useState('')

  useEffect(() => { setToday(getBrasiliaDateString()) }, [])

  const loadPlans = useCallback(async () => {
    try {
      const res  = await fetch('/api/promocoes/planos')
      const json = await res.json() as { plans?: PromotionPlan[] }
      setPlans(json.plans ?? [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])

  function getPlan(eventId: string): PromotionPlan | undefined {
    return plans.find(p => p.event_id === eventId)
  }

  function getOrDefaultPlan(event: DataComemorativa): PromotionPlan {
    return getPlan(event.id) ?? {
      event_id:  event.id,
      status:    'sem_planejamento',
      notes:     '',
      checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
    }
  }

  async function handleSave(plan: PromotionPlan) {
    setSaving(true)
    try {
      const res  = await fetch('/api/promocoes/planos', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(plan),
      })
      const json = await res.json() as { plan?: PromotionPlan }
      if (json.plan) {
        setPlans(ps => {
          const existing = ps.findIndex(p => p.event_id === plan.event_id)
          if (existing >= 0) {
            const updated = [...ps]
            updated[existing] = json.plan!
            return updated
          }
          return [...ps, json.plan!]
        })
      }
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  // Compute days from state (avoid SSR mismatch)
  const allEvents   = getUpcomingEvents()
  const todayStr    = today || getBrasiliaDateString()

  const filtered = allEvents.filter(e => {
    const days = daysUntil(e.data)
    if (!showPast && days < 0) return false
    if (filterCat !== 'all' && e.categoria !== filterCat) return false
    if (search && !e.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Split upcoming from past
  const upcoming = filtered.filter(e => daysUntil(e.data) >= 0)
  const past     = filtered.filter(e => daysUntil(e.data) < 0)

  // Next event for highlight card
  const nextEvent = allEvents.find(e => daysUntil(e.data) >= 0)
  const nextDays  = nextEvent ? daysUntil(nextEvent.data) : null

  const totalPlanned = plans.filter(p => p.status !== 'sem_planejamento').length

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Calendário Comercial
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Planeje suas promoções e não perca nenhuma data importante do e-commerce
          </p>
          {totalPlanned > 0 && (
            <p className="text-xs text-purple-400 mt-1">{totalPlanned} data{totalPlanned !== 1 ? 's' : ''} com planejamento ativo</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-600 hidden sm:block">2026</span>
          <button
            onClick={loadPlans}
            disabled={loading || saving}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] border border-white/[0.06] transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Next event highlight ── */}
      {nextEvent && nextDays !== null && (
        <div
          className={`rounded-2xl p-5 border ${CATEGORIA_CONFIG[nextEvent.categoria].bg} ${CATEGORIA_CONFIG[nextEvent.categoria].border}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Próxima data</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{nextEvent.icone}</span>
                <div>
                  <h2 className={`text-lg font-bold ${CATEGORIA_CONFIG[nextEvent.categoria].color}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                    {nextEvent.nome}
                  </h2>
                  <p className="text-sm text-slate-400">{formatEventDate(nextEvent.data)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-lg">{nextEvent.dica}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-4xl font-bold tabular-nums ${CATEGORIA_CONFIG[nextEvent.categoria].color}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                {nextDays}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">dia{nextDays !== 1 ? 's' : ''} restante{nextDays !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setActiveEvent(nextEvent)}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                Preparar promoção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar data..."
            className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-600/50 transition-colors"
          />
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'mega', 'alta', 'media', 'nicho'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterCat === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/[0.04] text-slate-500 hover:text-slate-200 border border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              {cat === 'all' ? 'Todos' : CATEGORIA_CONFIG[cat].label}
            </button>
          ))}
        </div>

        {/* Show past toggle */}
        <button
          onClick={() => setShowPast(p => !p)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            showPast
              ? 'bg-slate-700 text-slate-300 border-slate-600'
              : 'bg-white/[0.04] text-slate-600 border-white/[0.06] hover:text-slate-300'
          }`}
        >
          {showPast ? 'Ocultar passadas' : 'Mostrar passadas'}
        </button>
      </div>

      {/* ── Upcoming events ── */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3].map(i => (
            <div key={i} className="dash-card rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : upcoming.length === 0 && !showPast ? (
        <div className="dash-card rounded-2xl p-8 text-center">
          <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhuma data encontrada com os filtros atuais</p>
          <button onClick={() => { setFilterCat('all'); setSearch('') }} className="text-xs text-purple-400 hover:text-purple-300 mt-2">
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map(event => (
            <EventRow
              key={event.id}
              event={event}
              plan={getPlan(event.id)}
              days={daysUntil(event.data)}
              onPlan={setActiveEvent}
            />
          ))}
        </div>
      )}

      {/* ── Past events ── */}
      {showPast && past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Datas passadas</p>
          {past.map(event => (
            <EventRow
              key={event.id}
              event={event}
              plan={getPlan(event.id)}
              days={daysUntil(event.data)}
              onPlan={setActiveEvent}
            />
          ))}
        </div>
      )}

      {/* ── Plan drawer ── */}
      {activeEvent && (
        <PlanDrawer
          event={activeEvent}
          plan={getOrDefaultPlan(activeEvent)}
          onSave={handleSave}
          onClose={() => setActiveEvent(null)}
        />
      )}
    </div>
  )
}
