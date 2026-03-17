'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone, RefreshCw, ExternalLink, Loader2,
  Play, Pause, TrendingUp, MousePointerClick,
  Eye, DollarSign, Target, BarChart2, Star,
  AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react'
import type { MlAdsCampaign } from '@/app/api/mercadolivre/ads/campaigns/route'
import type { MlAdsItem }     from '@/app/api/mercadolivre/ads/items/route'

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

interface Advertiser {
  advertiser_id:   number
  advertiser_name: string
  account_name:    string
  site_id:         string
  error?:          string
}

type Period = 'today' | '7d' | '30d'
type AdsTab = 'all' | 'active' | 'paused' | 'recommended'

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════ */

function fmtBRL(v: number | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
}

function fmtPct(v: number | undefined): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function fmtNum(v: number | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return String(v)
}

function fmtRoas(v: number | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(2)}x`
}

function totalMetric(
  items: MlAdsItem[],
  key: keyof NonNullable<MlAdsItem['metrics_summary']>,
): number {
  return items.reduce((acc, i) => acc + (i.metrics_summary?.[key] ?? 0), 0)
}

function campaignMetric(
  campaigns: MlAdsCampaign[],
  key: keyof NonNullable<MlAdsCampaign['metrics']>,
): number {
  return campaigns.reduce((acc, c) => acc + (c.metrics?.[key] ?? 0), 0)
}

/* ══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

function KpiCard({
  icon: Icon, label, value, sub, color = 'text-white',
}: {
  icon:    React.ElementType
  label:   string
  value:   string
  sub?:    string
  color?:  string
}) {
  return (
    <div className="bg-dark-800 border border-white/[0.06] rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="w-4 h-4 shrink-0" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-600">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border
      ${active
        ? 'bg-green-500/10 text-green-400 border-green-500/30'
        : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-slate-500'}`} />
      {active ? 'Ativo' : 'Pausado'}
    </span>
  )
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const options: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: '7d',    label: '7 dias' },
    { key: '30d',   label: '30 dias' },
  ]
  return (
    <div className="flex gap-1 bg-dark-700 p-1 rounded-lg border border-white/[0.06]">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
            value === key
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   NO ADS ACCOUNT STATE
══════════════════════════════════════════════════════════════════════════ */

function NoAdsAccount() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="text-5xl">📢</div>
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Ative o Product Ads para começar</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          O Product Ads impulsiona seus anúncios nos primeiros resultados de busca do Mercado Livre,
          aumentando visibilidade e vendas.
        </p>
      </div>
      <a
        href="https://www.mercadolivre.com.br/publicidade"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all"
      >
        Ativar no Mercado Livre
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function PublicidadePage() {
  const [advertiser,       setAdvertiser]       = useState<Advertiser | null>(null)
  const [hasAdsAccount,    setHasAdsAccount]    = useState<boolean | null>(null) // null = loading
  const [campaigns,        setCampaigns]        = useState<MlAdsCampaign[]>([])
  const [adsItems,         setAdsItems]         = useState<MlAdsItem[]>([])
  const [period,           setPeriod]           = useState<Period>('7d')
  const [adsTab,           setAdsTab]           = useState<AdsTab>('all')
  const [loading,          setLoading]          = useState(true)
  const [actionLoading,    setActionLoading]    = useState<Record<string | number, boolean>>({})
  const [toast,            setToast]            = useState<{ ok: boolean; msg: string } | null>(null)
  const [debugInfo,        setDebugInfo]        = useState<Record<string, unknown> | null>(null)
  const [apiError,         setApiError]         = useState<string | null>(null)

  /* ── Load ───────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    setDebugInfo(null)

    // 1. Get advertiser
    const advRes = await fetch('/api/mercadolivre/ads/advertiser')
    const adv = await advRes.json() as Advertiser & { debug?: Record<string, unknown> }

    if (adv.debug) setDebugInfo(adv.debug)

    if (!advRes.ok || adv.error === 'NO_ADS_ACCOUNT') {
      setHasAdsAccount(false)
      setApiError(adv.error === 'NO_ADS_ACCOUNT' ? null : (adv.error ?? `HTTP ${advRes.status}`))
      setLoading(false)
      return
    }

    setAdvertiser(adv)
    setHasAdsAccount(true)

    // 2. Load campaigns + items in parallel (advertiser_id vem do conn no servidor)
    const [campRes, itemsRes] = await Promise.allSettled([
      fetch('/api/mercadolivre/ads/campaigns'),
      fetch('/api/mercadolivre/ads/items?limit=100'),
    ])

    if (campRes.status === 'fulfilled' && campRes.value.ok) {
      const d = await campRes.value.json() as { campaigns: MlAdsCampaign[] }
      setCampaigns(d.campaigns ?? [])
    }

    if (itemsRes.status === 'fulfilled' && itemsRes.value.ok) {
      const d = await itemsRes.value.json() as { items: MlAdsItem[] }
      setAdsItems(d.items ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  /* ── Toast helper ───────────────────────────────────────────────────── */
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Campaign toggle ────────────────────────────────────────────────── */
  async function toggleCampaign(campaign: MlAdsCampaign) {
    if (!advertiser) return
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    setActionLoading(prev => ({ ...prev, [campaign.id]: true }))
    try {
      const res = await fetch(`/api/mercadolivre/ads/campaigns/${campaign.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar campanha')
      setCampaigns(prev => prev.map(c =>
        c.id === campaign.id ? { ...c, status: newStatus } : c
      ))
      showToast(true, `Campanha "${campaign.name}" ${newStatus === 'active' ? 'ativada' : 'pausada'}`)
    } catch {
      showToast(false, 'Erro ao atualizar campanha')
    } finally {
      setActionLoading(prev => ({ ...prev, [campaign.id]: false }))
    }
  }

  /* ── Ad item toggle ─────────────────────────────────────────────────── */
  async function toggleAd(item: MlAdsItem) {
    if (!advertiser) return
    const newStatus = item.status === 'active' ? 'paused' : 'active'
    const adId = item.ad_id ?? item.item_id
    setActionLoading(prev => ({ ...prev, [item.item_id]: true }))
    try {
      const res = await fetch(`/api/mercadolivre/ads/items/${item.item_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ad_id: adId, status: newStatus }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar anúncio')
      setAdsItems(prev => prev.map(i =>
        i.item_id === item.item_id ? { ...i, status: newStatus } : i
      ))
      showToast(true, `Anúncio ${newStatus === 'active' ? 'ativado' : 'pausado'}`)
    } catch {
      showToast(false, 'Erro ao atualizar anúncio')
    } finally {
      setActionLoading(prev => ({ ...prev, [item.item_id]: false }))
    }
  }

  /* ── Derived metrics ────────────────────────────────────────────────── */
  const totalCost      = campaignMetric(campaigns, 'cost')
  const totalClicks    = campaignMetric(campaigns, 'clicks')
  const totalPrints    = campaignMetric(campaigns, 'prints')
  const totalRevenue   = campaignMetric(campaigns, 'direct_amount')
  const acos           = totalRevenue > 0 ? totalCost / totalRevenue : 0
  const roas           = totalCost > 0    ? totalRevenue / totalCost : 0
  const ctr            = totalPrints > 0  ? totalClicks / totalPrints : 0

  /* ── Filtered ads ───────────────────────────────────────────────────── */
  const filteredAds = adsItems.filter(i => {
    if (adsTab === 'active')      return i.status === 'active'
    if (adsTab === 'paused')      return i.status === 'paused'
    if (adsTab === 'recommended') return i.recommended
    return true
  })

  /* ── Loading state ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    )
  }

  /* ── No ads account ─────────────────────────────────────────────────── */
  if (hasAdsAccount === false) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Publicidade</h1>
            <p className="text-xs text-slate-500">Product Ads — Mercado Livre</p>
          </div>
        </div>
        {apiError && (
          <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-4">
            <p className="text-red-400 text-sm font-medium">Erro ao conectar com ML Ads: {apiError}</p>
          </div>
        )}
        <div className="bg-dark-800 border border-white/[0.06] rounded-2xl">
          <NoAdsAccount />
        </div>
        {debugInfo && (
          <details className="mt-4">
            <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400">Debug info</summary>
            <pre className="mt-2 text-xs text-slate-500 bg-dark-900 rounded-xl p-4 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
      </div>
    )
  }

  /* ── Main UI ────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium
          ${toast.ok ? 'bg-green-900/90 text-green-300 border border-green-700/50' : 'bg-red-900/90 text-red-300 border border-red-700/50'}`}>
          {toast.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Publicidade</h1>
              {advertiser && (
                <span className="text-xs bg-indigo-900/30 text-indigo-400 border border-indigo-700/30 px-2 py-0.5 rounded-full">
                  {advertiser.advertiser_name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Product Ads — Mercado Livre</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button
            onClick={load}
            className="p-2 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign}        label="Gasto total"   value={fmtBRL(totalCost)}    color="text-white" />
        <KpiCard icon={Target}            label="ACOS"          value={fmtPct(acos)}          color={acos > 0.3 ? 'text-red-400' : 'text-green-400'} sub="Custo/Receita" />
        <KpiCard icon={TrendingUp}        label="ROAS"          value={fmtRoas(roas)}         color={roas >= 4 ? 'text-green-400' : 'text-amber-400'} sub="Retorno/R$1" />
        <KpiCard icon={MousePointerClick} label="Cliques"       value={fmtNum(totalClicks)}   />
        <KpiCard icon={Eye}               label="Impressões"    value={fmtNum(totalPrints)}   />
        <KpiCard icon={BarChart2}         label="CTR"           value={fmtPct(ctr)}           sub="Clique/Impressão" />
      </div>

      {/* ── Campaigns ────────────────────────────────────────────────────── */}
      <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-bold text-white">Campanhas <span className="text-slate-600 font-normal">({campaigns.length})</span></p>
          <a
            href="https://www.mercadolivre.com.br/publicidade"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Nova Campanha
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
            <Megaphone className="w-8 h-8" />
            <p className="text-sm">Nenhuma campanha encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Nome', 'Status', 'Orçamento', 'Gasto', 'ACOS', 'ROAS', 'Cliques', 'Ações'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {campaigns.map(c => {
                  const campAcos = c.metrics?.direct_amount
                    ? (c.metrics.cost ?? 0) / c.metrics.direct_amount
                    : null
                  const campRoas = c.metrics?.cost
                    ? (c.metrics.direct_amount ?? 0) / c.metrics.cost
                    : null
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-slate-200 font-medium max-w-[180px] truncate">{c.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.automatic_budget
                          ? <span className="text-indigo-400 text-xs">Auto</span>
                          : c.budget != null ? fmtBRL(c.budget) + '/d' : '—'
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-300">{fmtBRL(c.metrics?.cost)}</td>
                      <td className="px-4 py-3">
                        <span className={campAcos != null
                          ? campAcos > 0.3 ? 'text-red-400' : 'text-green-400'
                          : 'text-slate-600'}>
                          {campAcos != null ? fmtPct(campAcos) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{campRoas != null ? fmtRoas(campRoas) : '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtNum(c.metrics?.clicks)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleCampaign(c)}
                          disabled={actionLoading[c.id]}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50
                            ${c.status === 'active'
                              ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                            }`}
                        >
                          {actionLoading[c.id]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : c.status === 'active'
                              ? <><Pause className="w-3 h-3" />Pausar</>
                              : <><Play className="w-3 h-3" />Ativar</>
                          }
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Ads Items ─────────────────────────────────────────────────────── */}
      <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-bold text-white">
            Anúncios em Destaque
            <span className="text-slate-600 font-normal ml-1">({filteredAds.length})</span>
          </p>

          {/* Tabs */}
          <div className="flex gap-1 bg-dark-700 p-1 rounded-lg border border-white/[0.06]">
            {([
              { key: 'all' as AdsTab,         label: 'Todos' },
              { key: 'active' as AdsTab,       label: 'Ativos' },
              { key: 'paused' as AdsTab,       label: 'Pausados' },
              { key: 'recommended' as AdsTab,  label: '⭐ ML Recomenda' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAdsTab(key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  adsTab === key
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredAds.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">Nenhum anúncio encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['', 'Título', 'Cliques', 'Custo', 'ACOS', 'Unid.', 'Status', ''].map((h, i) => (
                    <th key={i} className="text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredAds.map(item => {
                  const acosPct = item.metrics_summary?.cost != null && (item.metrics_summary?.direct_items_quantity ?? 0) > 0
                    ? null // acos per item not directly available
                    : null

                  return (
                    <tr key={item.item_id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Thumbnail */}
                      <td className="px-4 py-3 w-10">
                        {item.thumbnail
                          ? <img src={item.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover bg-dark-700" />
                          : <div className="w-9 h-9 rounded-lg bg-dark-700" />
                        }
                      </td>

                      {/* Title + badges */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-slate-200 text-xs font-medium truncate">{item.title || item.item_id}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.recommended && (
                            <span className="text-[9px] bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5" /> Recomendado
                            </span>
                          )}
                          {item.buy_box_winner && (
                            <span className="text-[9px] bg-green-900/30 text-green-400 border border-green-700/30 px-1.5 py-0.5 rounded-full">
                              Buy Box
                            </span>
                          )}
                          {item.catalog_listing && (
                            <span className="text-[9px] bg-blue-900/30 text-blue-400 border border-blue-700/30 px-1.5 py-0.5 rounded-full">
                              Catálogo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-400">{fmtNum(item.metrics_summary?.clicks)}</td>
                      <td className="px-4 py-3 text-slate-300">{fmtBRL(item.metrics_summary?.cost)}</td>
                      <td className="px-4 py-3 text-slate-400">{acosPct != null ? fmtPct(acosPct) : '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtNum(item.metrics_summary?.advertising_items_quantity)}</td>

                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleAd(item)}
                          disabled={actionLoading[item.item_id]}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50
                            ${item.status === 'active'
                              ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                            }`}
                        >
                          {actionLoading[item.item_id]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : item.status === 'active'
                              ? <><Pause className="w-3 h-3" />Pausar</>
                              : <><Play className="w-3 h-3" />Ativar</>
                          }
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
