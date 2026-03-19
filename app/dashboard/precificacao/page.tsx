'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calculator, Info, TrendingUp, Package, Truck, Percent,
  AlertTriangle, Zap, ChevronDown, RefreshCw, Search,
  CheckCircle2, XCircle, Minus, ArrowUpRight, ArrowDownRight,
  ToggleLeft, ToggleRight, Layers, Lock, Unlock, Settings2,
  CircleDollarSign, Scale, BarChart3,
} from 'lucide-react'
import Header from '@/components/Header'
import {
  calcSuggestedPrice, calcMarginFromPrice,
  type PricingInput, type PricingResult, type ListingType, type ShippingMode, type ReputationLevel,
} from '@/lib/pricing/pricing-engine'
import { ML_CATEGORY_COMMISSIONS, ML_REPUTATION_SHIPPING } from '@/lib/pricing/ml-tariffs'

// ─── Regimes tributários ───────────────────────────────────────────────────────
const REGIMES = [
  { label: 'Simples Nacional — Anexo I (Comércio)', aliquota: 6.0  },
  { label: 'Simples Nacional — Anexo II (Indústria)', aliquota: 7.25 },
  { label: 'Lucro Presumido',                         aliquota: 11.33 },
  { label: 'Lucro Real',                              aliquota: 13.25 },
  { label: 'MEI (isento)',                            aliquota: 0   },
]

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusDot({ status }: { status: PricingResult['marginStatus'] }) {
  if (status === 'healthy') return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
  if (status === 'tight')   return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
  return <span className="w-2 h-2 rounded-full bg-red-400 inline-block animate-pulse" />
}

function Tip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <Info className="w-3 h-3 text-slate-600 cursor-help" />
      <div className="absolute left-4 bottom-4 z-20 hidden group-hover:block w-52 p-2.5 rounded-lg bg-[#1a2035] border border-white/10 text-[10px] text-slate-300 leading-relaxed shadow-xl">
        {text}
      </div>
    </div>
  )
}

interface NumInputProps {
  label: string; tip?: string; value: number; onChange: (v: number) => void
  prefix?: string; suffix?: string; step?: number; locked?: boolean
}
function NumInput({ label, tip, value, onChange, prefix, suffix, step = 0.01, locked }: NumInputProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</label>
        {tip && <Tip text={tip} />}
        {locked && <Lock className="w-3 h-3 text-slate-700" />}
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
        <input
          type="number"
          min={0} step={step}
          value={value}
          onChange={e => onChange(+e.target.value)}
          disabled={locked}
          className={`dash-input w-full py-2 rounded-lg text-sm font-mono ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-10' : 'pr-3'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Barra de breakdown empilhada ─────────────────────────────────────────────
function BreakdownBar({ result }: { result: PricingResult }) {
  const { items } = result.breakdown
  const price = result.suggestedPrice
  if (price <= 0) return null

  return (
    <div>
      {/* Barra empilhada */}
      <div className="flex h-5 rounded-lg overflow-hidden gap-px mb-3">
        {items.map(item => (
          <div
            key={item.key}
            style={{ width: `${Math.max(item.pct, 0)}%`, background: item.color }}
            title={`${item.label}: ${fmtBRL(item.value)} (${item.pct.toFixed(1)}%)`}
            className="transition-all duration-300 min-w-[2px]"
          />
        ))}
      </div>
      {/* Legenda */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
            <span className="text-[11px] text-slate-500 flex-1 truncate">{item.label}</span>
            <span className={`text-[11px] font-mono font-semibold ${item.isProfit ? 'text-emerald-400' : 'text-slate-400'}`}>
              {fmtBRL(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tabela simulação de margens ──────────────────────────────────────────────
function MarginTable({ base, onSelectMargin, targetMargin }: {
  base: PricingInput
  onSelectMargin: (m: number) => void
  targetMargin: number
}) {
  const margins = [5, 10, 15, 20, 25, 30, 35, 40, 50]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/[0.05]">
            {['Margem alvo', 'Preço ideal', 'Lucro/und.', 'Break-even', 'ROI', 'Status'].map(h => (
              <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {margins.map(m => {
            const r = calcSuggestedPrice({ ...base, targetMarginPct: m })
            const sel = m === targetMargin
            return (
              <tr
                key={m}
                onClick={() => onSelectMargin(m)}
                className={`cursor-pointer border-b border-white/[0.03] transition-colors hover:bg-white/[0.03] ${sel ? 'bg-violet-500/[0.07]' : ''}`}
              >
                <td className="py-2 pr-3">
                  <span className={`font-mono font-bold ${sel ? 'text-violet-400' : 'text-slate-400'}`}>{m}%{sel ? ' ←' : ''}</span>
                </td>
                <td className="py-2 pr-3 font-mono text-slate-300">{r.suggestedPrice > 0 ? fmtBRL(r.suggestedPrice) : '—'}</td>
                <td className="py-2 pr-3 font-mono text-emerald-400">{r.netProfit > 0 ? fmtBRL(r.netProfit) : <span className="text-red-400">{fmtBRL(r.netProfit)}</span>}</td>
                <td className="py-2 pr-3 font-mono text-slate-500">{r.breakEvenPrice > 0 ? fmtBRL(r.breakEvenPrice) : '—'}</td>
                <td className="py-2 pr-3 font-mono text-violet-400">{r.roi.toFixed(1)}%</td>
                <td className="py-2">
                  {r.marginStatus === 'healthy' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {r.marginStatus === 'tight'   && <Minus         className="w-3.5 h-3.5 text-amber-400"   />}
                  {r.marginStatus === 'loss'    && <XCircle       className="w-3.5 h-3.5 text-red-400"    />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PrecificacaoPage() {
  useEffect(() => { document.title = 'Precificação — Foguetim ERP' }, [])

  // ── Modo ────────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'manual' | 'auto'>('manual')

  // ── Estado do contexto ML (modo auto) ───────────────────────────────────────
  const [mlConnected,  setMlConnected]  = useState(false)
  const [categories,   setCategories]   = useState(ML_CATEGORY_COMMISSIONS)
  const [mlLoading,    setMlLoading]    = useState(false)
  const [mlRepLabel,   setMlRepLabel]   = useState<string | null>(null)

  // ── Inputs ──────────────────────────────────────────────────────────────────
  const [productCost,    setProductCost]    = useState(100)
  const [packagingCost,  setPackagingCost]  = useState(5)
  const [otherCosts,     setOtherCosts]     = useState(0)
  const [taxPct,         setTaxPct]         = useState(6)
  const [marketingPct,   setMarketingPct]   = useState(0)
  const [affiliatePct,   setAffiliatePct]   = useState(0)
  const [targetMargin,   setTargetMargin]   = useState(20)

  // ML
  const [listingType,    setListingType]    = useState<ListingType>('classic')
  const [shippingMode,   setShippingMode]   = useState<ShippingMode>('free_shipping')
  const [reputation,     setReputation]     = useState<ReputationLevel>('none')
  const [categoryIdx,    setCategoryIdx]    = useState(0)
  const [manualCommPct,  setManualCommPct]  = useState<number | null>(null)
  const [productWeightG, setProductWeightG] = useState<number | null>(null)
  const [pkgWeightG,     setPkgWeightG]     = useState<number | null>(null)
  const [manualShipping, setManualShipping] = useState<number | null>(null)
  const [isFull,         setIsFull]         = useState(false)
  const [fullHandling,   setFullHandling]   = useState(5.5)
  const [fullStorage,    setFullStorage]    = useState(0.8)
  const [currentMLPrice, setCurrentMLPrice] = useState<number | null>(null)

  // Regime tributário
  const [regimeIdx, setRegimeIdx]   = useState(0)
  const [showRegimes, setShowRegimes] = useState(false)
  const [catSearch,  setCatSearch]    = useState('')

  // Aba resultado
  const [resultTab, setResultTab] = useState<'result' | 'breakdown' | 'simulator'>('result')

  // ── Buscar contexto ML ao entrar no modo auto ────────────────────────────────
  useEffect(() => {
    if (mode !== 'auto') return
    setMlLoading(true)
    fetch('/api/precificacao/contexto')
      .then(r => r.json())
      .then(data => {
        setMlConnected(!!data.mlConnected)
        if (data.categories?.length) setCategories(data.categories)
        if (data.reputation?.label)   setMlRepLabel(data.reputation.label)
        if (data.reputation?.level)   setReputation(data.reputation.level as ReputationLevel)
      })
      .catch(() => {})
      .finally(() => setMlLoading(false))
  }, [mode])

  // ── Comissão efetiva ─────────────────────────────────────────────────────────
  const activeCat = categories[categoryIdx] ?? categories[0]
  const commissionPct = manualCommPct !== null
    ? manualCommPct
    : listingType === 'premium' ? (activeCat?.premiumPct ?? 17) : (activeCat?.classicPct ?? 12)

  // ── Input do engine ──────────────────────────────────────────────────────────
  const engineInput: PricingInput = useMemo(() => ({
    productCost,
    packagingCost,
    otherCosts,
    taxPct: REGIMES[regimeIdx].aliquota,
    marketingPct,
    affiliatePct,
    listingType,
    categoryCommissionPct: commissionPct,
    categoryId:    null,
    categoryName:  activeCat?.categoryName ?? null,
    sellerReputation: reputation,
    shippingMode,
    productWeightG,
    packagingWeightG: pkgWeightG,
    lengthCm:   null, widthCm: null, heightCm: null,
    manualShippingCost: manualShipping,
    isFull,
    fullHandlingCost: fullHandling,
    fullStorageCost:  fullStorage,
    targetMarginPct:  targetMargin,
    currentMLPrice,
  }), [
    productCost, packagingCost, otherCosts, regimeIdx, marketingPct, affiliatePct,
    listingType, commissionPct, activeCat, reputation, shippingMode,
    productWeightG, pkgWeightG, manualShipping, isFull, fullHandling, fullStorage,
    targetMargin, currentMLPrice,
  ])

  const result: PricingResult = useMemo(() => calcSuggestedPrice(engineInput), [engineInput])

  // ── Margin color helper ──────────────────────────────────────────────────────
  const marginColor = result.marginStatus === 'healthy' ? 'text-emerald-400'
                    : result.marginStatus === 'tight'   ? 'text-amber-400'
                    : 'text-red-400'

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Header
        title="Precificação Inteligente"
        subtitle="Simule preços com as tarifas reais do Mercado Livre"
      />

      <div className="p-4 lg:p-6 xl:p-8 space-y-6 max-w-[1600px]">

        {/* ── Modo toggle ─────────────────────────────────────────────────── */}
        <div className="dash-card rounded-xl p-1 flex gap-1 max-w-xs">
          {(['manual', 'auto'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m === 'manual' ? <><Calculator className="w-3.5 h-3.5" /> Manual</> : <><Zap className="w-3.5 h-3.5" /> Automático</>}
            </button>
          ))}
        </div>

        {/* ML desconectado no modo auto */}
        {mode === 'auto' && !mlLoading && !mlConnected && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-400 mb-1">Conta ML não conectada</p>
              <p className="text-xs text-slate-500">No modo automático, o Foguetim busca categoria, comissão e preço atual direto da API do ML. Conecte sua conta em <span className="text-violet-400">Integrações</span> para ativar. Usando modo manual como fallback.</p>
            </div>
          </div>
        )}

        {mlRepLabel && mode === 'auto' && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Reputação ML detectada: <span className="text-emerald-400 font-semibold">{mlRepLabel}</span>
          </div>
        )}

        {/* ── Grid principal ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">

          {/* ═══════════════════════════════════════════════════════════════
              COLUNA ESQUERDA — Inputs
          ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">

            {/* Produto */}
            <div className="dash-card rounded-xl p-4 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Package className="w-4 h-4 text-violet-400" /> Produto
              </h3>
              <NumInput label="Custo unitário" prefix="R$" value={productCost} onChange={setProductCost}
                tip="Custo de aquisição ou produção do produto" />
              <NumInput label="Embalagem" prefix="R$" value={packagingCost} onChange={setPackagingCost}
                tip="Caixa, plástico-bolha, lacre, etiqueta (por unidade)" />
              <NumInput label="Outros custos" prefix="R$" value={otherCosts} onChange={setOtherCosts}
                tip="Mão de obra de picking/packing, rateio operacional" />
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Margem desejada</label>
                  <Tip text="Percentual de margem líquida desejada sobre o preço de venda" />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={60} step={1} value={targetMargin}
                    onChange={e => setTargetMargin(+e.target.value)}
                    className="flex-1 h-1 accent-violet-500"
                  />
                  <input
                    type="number" min={0} max={100} step={1} value={targetMargin}
                    onChange={e => setTargetMargin(+e.target.value)}
                    className="dash-input w-16 py-1.5 px-2 rounded-lg text-sm font-mono text-center"
                  />
                  <span className="text-slate-500 text-sm">%</span>
                </div>
              </div>
            </div>

            {/* Regime tributário */}
            <div className="dash-card rounded-xl p-4">
              <button
                onClick={() => setShowRegimes(v => !v)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Percent className="w-4 h-4 text-blue-400" /> Regime Tributário
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-blue-400">{REGIMES[regimeIdx].aliquota}%</span>
                  <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${showRegimes ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {showRegimes && (
                <div className="mt-3 space-y-1.5">
                  {REGIMES.map((r, i) => (
                    <button key={i} onClick={() => { setRegimeIdx(i); setTaxPct(r.aliquota); setShowRegimes(false) }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-all ${
                        regimeIdx === i ? 'bg-blue-500/10 border border-blue-500/30 text-white' : 'text-slate-400 hover:bg-white/[0.04]'
                      }`}>
                      <span>{r.label}</span>
                      <span className={`font-mono text-xs ${regimeIdx === i ? 'text-blue-400' : 'text-slate-600'}`}>{r.aliquota}%</span>
                    </button>
                  ))}
                </div>
              )}
              {!showRegimes && (
                <p className="mt-2 text-xs text-slate-500">{REGIMES[regimeIdx].label}</p>
              )}
            </div>

            {/* Custos adicionais */}
            <div className="dash-card rounded-xl p-4 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <BarChart3 className="w-4 h-4 text-orange-400" /> Custos Adicionais
              </h3>
              <NumInput label="Marketing / Ads" suffix="%" value={marketingPct} onChange={setMarketingPct}
                tip="% sobre o preço para anúncios patrocinados, Product Ads ou campanha externa" step={0.5} />
              <NumInput label="Afiliado / Influenciador" suffix="%" value={affiliatePct} onChange={setAffiliatePct}
                tip="% de comissão paga a afiliados ou influenciadores" step={0.5} />
            </div>

            {/* Mercado Livre */}
            <div className="dash-card rounded-xl p-4 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <CircleDollarSign className="w-4 h-4 text-yellow-400" /> Mercado Livre
              </h3>

              {/* Tipo de anúncio */}
              <div>
                <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">Tipo de anúncio</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['classic', 'premium'] as const).map(t => (
                    <button key={t} onClick={() => { setListingType(t); setManualCommPct(null) }}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                        listingType === t
                          ? t === 'classic' ? 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-400' : 'bg-violet-500/15 border border-violet-500/40 text-violet-400'
                          : 'border border-white/[0.06] text-slate-500 hover:border-white/15'
                      }`}>
                      {t === 'classic' ? 'Clássico' : 'Premium'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoria */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Categoria</label>
                  {manualCommPct !== null && (
                    <button onClick={() => setManualCommPct(null)} className="text-[10px] text-violet-400 hover:underline flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Usar tabela
                    </button>
                  )}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input
                    value={catSearch} onChange={e => setCatSearch(e.target.value)}
                    placeholder="Filtrar categoria..."
                    className="dash-input w-full pl-8 pr-3 py-2 rounded-lg text-xs"
                  />
                </div>
                <select
                  value={categoryIdx}
                  onChange={e => { setCategoryIdx(+e.target.value); setManualCommPct(null) }}
                  className="dash-input w-full py-2 px-3 rounded-lg text-xs"
                  size={1}
                >
                  {categories
                    .filter(c => !catSearch || c.categoryName.toLowerCase().includes(catSearch.toLowerCase()))
                    .map((c, i) => (
                      <option key={i} value={categories.indexOf(c)}>
                        {c.categoryName} — {listingType === 'classic' ? c.classicPct : c.premiumPct}%
                      </option>
                    ))}
                </select>
                <p className="mt-1.5 text-[10px] text-slate-600">
                  Comissão: <span className="text-yellow-400 font-semibold">{commissionPct}%</span>
                  {manualCommPct !== null && <span className="text-violet-400 ml-1">(manual)</span>}
                </p>
              </div>

              {/* Comissão manual */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Comissão manual</label>
                  <Tip text="Informe a comissão exata se souber. Sobrescreve a tabela por categoria." />
                  {manualCommPct !== null && <Lock className="w-3 h-3 text-violet-400" />}
                </div>
                <input
                  type="number" min={0} max={50} step={0.5}
                  value={manualCommPct ?? ''}
                  placeholder={`${commissionPct}% (tabela)`}
                  onChange={e => setManualCommPct(e.target.value === '' ? null : +e.target.value)}
                  className="dash-input w-full py-2 px-3 rounded-lg text-sm font-mono"
                />
              </div>

              {/* Reputação */}
              <div>
                <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">Sua reputação</label>
                <select
                  value={reputation}
                  onChange={e => setReputation(e.target.value as ReputationLevel)}
                  className="dash-input w-full py-2 px-3 rounded-lg text-xs"
                >
                  {ML_REPUTATION_SHIPPING.map(r => (
                    <option key={r.level} value={r.level}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Frete */}
              <div>
                <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-2 block">Frete</label>
                <div className="space-y-1.5 mb-3">
                  {([
                    ['free_shipping', 'Frete grátis (embutido no preço)'],
                    ['seller_pays',   'Vendedor paga, cobra do comprador'],
                    ['buyer_pays',    'Comprador paga frete'],
                  ] as [ShippingMode, string][]).map(([v, lbl]) => (
                    <button key={v} onClick={() => setShippingMode(v)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all ${
                        shippingMode === v ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'text-slate-500 hover:bg-white/[0.03] border border-transparent'
                      }`}>
                      <Truck className="w-3 h-3 shrink-0" /> {lbl}
                    </button>
                  ))}
                </div>
                {shippingMode !== 'buyer_pays' && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumInput label="Peso produto (g)" value={productWeightG ?? 0} onChange={v => setProductWeightG(v > 0 ? v : null)} step={10}
                      tip="Peso do produto sem embalagem, em gramas" />
                    <NumInput label="Peso embalagem (g)" value={pkgWeightG ?? 0} onChange={v => setPkgWeightG(v > 0 ? v : null)} step={10}
                      tip="Peso da embalagem (caixa + enchimento), em gramas" />
                  </div>
                )}
                {shippingMode !== 'buyer_pays' && !productWeightG && (
                  <div className="mt-2">
                    <NumInput label="Frete estimado (manual)" prefix="R$" value={manualShipping ?? 18} onChange={v => setManualShipping(v)}
                      tip="Use se não tiver o peso. Para cálculo preciso, informe o peso acima." />
                    <p className="text-[10px] text-amber-400 mt-1">Informe o peso do produto para cálculo automático de frete</p>
                  </div>
                )}
                {result.shippingIsAuto && (
                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Frete calculado: {fmtBRL(result.shippingCost)} ({result.effectiveWeightG}g)
                  </p>
                )}
              </div>

              {/* Full */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Full / Fulfillment
                  </label>
                  <button onClick={() => setIsFull(v => !v)} className="p-0.5">
                    {isFull
                      ? <ToggleRight className="w-7 h-7 text-violet-400" />
                      : <ToggleLeft  className="w-7 h-7 text-slate-600"  />}
                  </button>
                </div>
                {isFull && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <NumInput label="Handling (R$)" prefix="R$" value={fullHandling} onChange={setFullHandling}
                      tip="Taxa de expedição Full por envio (R$)" />
                    <NumInput label="Armazenagem (R$)" prefix="R$" value={fullStorage} onChange={setFullStorage}
                      tip="Custo de armazenagem Full por unidade/30 dias" />
                  </div>
                )}
              </div>

              {/* Preço atual ML */}
              <div>
                <NumInput label="Preço atual no ML" prefix="R$" value={currentMLPrice ?? 0} onChange={v => setCurrentMLPrice(v > 0 ? v : null)}
                  tip="Preencha para ver o comparativo com o preço ideal calculado" />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              COLUNA DIREITA — Resultado
          ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">

            {/* ── Card principal ─────────────────────────────────────────── */}
            <div className="dash-card rounded-xl overflow-hidden">
              {/* Header com preço sugerido */}
              <div className="p-5 border-b border-white/[0.05]" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.04))' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">Preço ideal de venda</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl font-black text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {result.suggestedPrice > 0 ? fmtBRL(result.suggestedPrice) : '—'}
                      </p>
                      <StatusDot status={result.marginStatus} />
                    </div>
                    {result.suggestedPrice > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Break-even: <span className="text-slate-400">{fmtBRL(result.breakEvenPrice)}</span>
                        <span className="mx-2 text-slate-700">·</span>
                        Frete: <span className="text-slate-400">{result.shippingCost > 0 ? fmtBRL(result.shippingCost) : '—'}</span>
                        <span className="mx-2 text-slate-700">·</span>
                        Taxa fixa ML: <span className="text-slate-400">{fmtBRL(result.fixedFee)}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Margem líquida</p>
                    <p className={`text-3xl font-black ${marginColor}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                      {result.realMarginPct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">ROI: <span className="text-violet-400">{result.roi.toFixed(1)}%</span></p>
                  </div>
                </div>

                {/* Lucro por venda */}
                {result.netProfit !== 0 && (
                  <div className={`mt-4 flex items-center justify-between p-3 rounded-xl ${result.netProfit > 0 ? 'bg-emerald-500/[0.07] border border-emerald-500/20' : 'bg-red-500/[0.07] border border-red-500/20'}`}>
                    <span className="text-xs text-slate-400">Lucro líquido por unidade</span>
                    <span className={`text-lg font-black font-mono ${result.netProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtBRL(result.netProfit)}
                    </span>
                  </div>
                )}

                {/* Comparativo ML */}
                {result.mlComparison && (
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-600 mb-0.5">Preço atual no ML</p>
                      <p className="text-sm font-mono font-bold text-slate-300">{fmtBRL(result.mlComparison.currentPrice)}</p>
                    </div>
                    <div className="text-center px-3 border-x border-white/[0.05]">
                      <p className="text-[10px] text-slate-600 mb-0.5">Diferença</p>
                      <div className={`flex items-center gap-1 text-sm font-mono font-bold ${result.mlComparison.delta > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {result.mlComparison.delta > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {fmtBRL(Math.abs(result.mlComparison.delta))}
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-[10px] text-slate-600 mb-0.5">Variação</p>
                      <p className={`text-sm font-mono font-bold ${result.mlComparison.deltaPct > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {result.mlComparison.deltaPct > 0 ? '+' : ''}{result.mlComparison.deltaPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/[0.05]">
                {([
                  ['result',    Scale,    'Resumo'],
                  ['breakdown', BarChart3, 'Breakdown'],
                  ['simulator', TrendingUp,'Simulador'],
                ] as [typeof resultTab, React.ElementType, string][]).map(([tab, Icon, lbl]) => (
                  <button key={tab} onClick={() => setResultTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all ${
                      resultTab === tab ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-500 hover:text-slate-300'
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {lbl}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {resultTab === 'result' && (
                  <div className="space-y-3">
                    {/* Grid de KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Comissão ML',    value: fmtBRL(result.suggestedPrice * result.commissionPct / 100), sub: `${result.commissionPct}%`, color: 'text-orange-400' },
                        { label: 'Imposto',         value: fmtBRL(result.suggestedPrice * REGIMES[regimeIdx].aliquota / 100), sub: `${REGIMES[regimeIdx].aliquota}%`, color: 'text-red-400' },
                        { label: 'Frete',           value: fmtBRL(result.shippingCost), sub: result.shippingIsAuto ? 'auto' : 'manual', color: 'text-purple-400' },
                        { label: 'Taxa fixa ML',    value: fmtBRL(result.fixedFee), sub: result.suggestedPrice < 79 ? 'aplicada' : 'não aplicada', color: 'text-rose-400' },
                      ].map(k => (
                        <div key={k.label} className="dash-card rounded-lg p-3">
                          <p className="text-[10px] text-slate-600 mb-1">{k.label}</p>
                          <p className={`text-sm font-mono font-bold ${k.color}`}>{k.value}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{k.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Aviso de margem */}
                    {result.marginStatus === 'loss' && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/[0.07] border border-red-500/20">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">Margem negativa — o preço sugerido não cobre todos os custos com a margem configurada. Reduza custos ou diminua a margem-alvo.</p>
                      </div>
                    )}

                    {/* Warnings da engine */}
                    {result.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/15">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-500">{w}</p>
                      </div>
                    ))}

                    {/* Disclaimer */}
                    <p className="text-[10px] text-slate-700 leading-relaxed pt-1">
                      Comissões e tarifas baseadas em médias de jan/2025. Consulte a Central de Vendedores do ML para valores atualizados da sua categoria.
                    </p>
                  </div>
                )}

                {resultTab === 'breakdown' && (
                  <div>
                    {result.suggestedPrice > 0
                      ? <BreakdownBar result={result} />
                      : <p className="text-sm text-slate-500 text-center py-4">Preencha o custo do produto para ver o breakdown.</p>
                    }
                  </div>
                )}

                {resultTab === 'simulator' && (
                  <MarginTable
                    base={engineInput}
                    onSelectMargin={setTargetMargin}
                    targetMargin={targetMargin}
                  />
                )}
              </div>
            </div>

            {/* ── Regras salvas (stub) ────────────────────────────────────── */}
            <div className="dash-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Settings2 className="w-4 h-4 text-slate-400" /> Regras de Precificação
                </h3>
                <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full font-semibold">Em breve</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Salve seus parâmetros como regra reutilizável. Quando ativada, o Foguetim calculará o preço ideal automaticamente e <strong className="text-slate-400">sugerirá ajustes</strong> — você decide se aplica. Nunca altera preços no ML sem sua confirmação.
              </p>
              <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <ToggleLeft className="w-6 h-6 text-slate-700" />
                <p className="text-xs text-slate-600">Precificação automática <span className="text-slate-700">(desativada)</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
