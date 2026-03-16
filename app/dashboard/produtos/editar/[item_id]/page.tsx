'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Lock, Plus, X, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, AlertCircle, Info, Loader2,
} from 'lucide-react'
import type { MlAttributeUiSection, NormalizedMlAttribute } from '@/lib/ml/attributes/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Picture { id?: string; url?: string; secure_url?: string; source?: string; size?: string }

interface MLItemFull {
  id:                   string
  title:                string
  status:               string
  sold_quantity:        number
  available_quantity:   number
  price:                number
  listing_type_id:      string
  condition:            string
  seller_custom_field:  string | null
  category_id:          string
  category_name:        string | null
  domain_id?:           string
  pictures:             Picture[]
  shipping: {
    free_shipping?: boolean
    local_pick_up?: boolean
    logistic_type?: string
    tags?:          string[]
  }
  attributes:   Array<{ id: string; value_name?: string | null; value_id?: string | null }>
  sale_terms?:  Array<{ id: string; value_name?: string | null }>
  description_text?: string
  catalog_listing?:  boolean
  warranty?:         string | null
}

interface AttrValues { [attrId: string]: string }

type SectionId = 'sec-basic' | 'sec-attrs' | 'sec-listing-info' | 'sec-media' | 'sec-sale' | 'sec-description' | 'sec-shipping' | 'sec-package'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'sec-basic',        label: 'Informação Básica' },
  { id: 'sec-attrs',        label: 'Atributos' },
  { id: 'sec-listing-info', label: 'Informação do Anúncio' },
  { id: 'sec-media',        label: 'Mídia' },
  { id: 'sec-sale',         label: 'Informações de Venda' },
  { id: 'sec-description',  label: 'Descrição' },
  { id: 'sec-shipping',     label: 'Envio' },
  { id: 'sec-package',      label: 'Pacote do Vendedor' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  if (s === 'active')       return { text: 'Ativo',      cls: 'bg-green-900/60 text-green-400 border border-green-700/40' }
  if (s === 'paused')       return { text: 'Pausado',    cls: 'bg-amber-900/60 text-amber-400 border border-amber-700/40' }
  if (s === 'under_review') return { text: 'Em revisão', cls: 'bg-blue-900/60 text-blue-400 border border-blue-700/40' }
  if (s === 'closed')       return { text: 'Fechado',    cls: 'bg-red-900/60 text-red-400 border border-red-700/40' }
  return { text: s, cls: 'bg-dark-700 text-slate-400 border border-white/10' }
}

function listingTypeLabel(lt: string) {
  if (lt === 'gold_pro')     return 'Premium'
  if (lt === 'gold_special') return 'Clássico'
  if (lt === 'free')         return 'Gratuito'
  return lt
}

const INPUT_CLS = 'w-full px-3 py-2 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all'
const LABEL_CLS = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'
const SECTION_CLS = 'dash-card rounded-2xl p-6 space-y-5'
const SECTION_TITLE_CLS = 'text-sm font-bold text-white mb-1' // used in heading

// ─── Attribute Field ──────────────────────────────────────────────────────────

function AttributeField({
  attr, value, onChange,
}: {
  attr: NormalizedMlAttribute
  value: string
  onChange: (v: string) => void
}) {
  const isNA = value === '__NA__'

  if (!attr.is_required && !isNA) {
    // Optional: show "N/A" placeholder that enables editing on click
  }

  const fieldEl = (() => {
    if (attr.value_type === 'boolean') {
      return (
        <div className="flex gap-2">
          {(['Não', 'Sim'] as const).map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(i === 1 ? 'true' : 'false')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                value === (i === 1 ? 'true' : 'false')
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                  : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    if (attr.value_type === 'list' && attr.allowed_values.length > 0) {
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">Selecione...</option>
          {attr.allowed_values.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )
    }

    if (attr.value_type === 'list_multi' && attr.allowed_values.length > 0) {
      const selected = value ? value.split('|').filter(Boolean) : []
      return (
        <div className="space-y-2">
          <select
            value=""
            onChange={e => {
              if (e.target.value && !selected.includes(e.target.value)) {
                onChange([...selected, e.target.value].join('|'))
              }
            }}
            className={INPUT_CLS}
          >
            <option value="">Adicionar...</option>
            {attr.allowed_values.filter(v => !selected.includes(v.id)).map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(sid => {
                const found = attr.allowed_values.find(v => v.id === sid)
                return (
                  <span key={sid} className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/15 border border-purple-500/30 rounded-full text-xs text-purple-300">
                    {found?.name ?? sid}
                    <button type="button" onClick={() => onChange(selected.filter(s => s !== sid).join('|'))}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (attr.value_type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={attr.hint ?? ''}
          className={INPUT_CLS}
        />
      )
    }

    // text / string fallback
    return (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={attr.value_max_length ?? 255}
        placeholder={attr.hint ?? ''}
        className={INPUT_CLS}
      />
    )
  })()

  return (
    <div>
      <label className={LABEL_CLS}>
        {attr.name}
        {attr.is_required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {!attr.is_required && isNA ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="w-full px-3 py-2 rounded-lg text-sm text-left text-slate-600 bg-dark-700/50 border border-white/[0.05] hover:border-white/[0.12] transition-all"
        >
          Não aplicar — clique para preencher
        </button>
      ) : fieldEl}
    </div>
  )
}

// ─── Attributes Section ───────────────────────────────────────────────────────

function AttributesSection({
  sections, attrValues, onAttrChange, loading,
}: {
  sections:     MlAttributeUiSection[]
  attrValues:   AttrValues
  onAttrChange: (id: string, val: string) => void
  loading:      boolean
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['required', 'conditional']))

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando atributos da categoria...
      </div>
    )
  }

  if (sections.length === 0) {
    return <p className="text-sm text-slate-600">Nenhum atributo disponível para esta categoria.</p>
  }

  return (
    <div className="space-y-4">
      {sections.map(sec => {
        const isOpen = expanded.has(sec.id)
        return (
          <div key={sec.id} className="border border-white/[0.06] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(prev => {
                const n = new Set(prev)
                if (n.has(sec.id)) n.delete(sec.id); else n.add(sec.id)
                return n
              })}
              className="w-full flex items-center justify-between px-4 py-3 bg-dark-700/50 hover:bg-dark-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{sec.label}</span>
                <span className="text-[10px] text-slate-500">{sec.attributes.length} campo(s)</span>
                {sec.pending_count > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                    {sec.pending_count} pendente(s)
                  </span>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {isOpen && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {sec.attributes.map(attr => (
                  <AttributeField
                    key={attr.id}
                    attr={attr}
                    value={attrValues[attr.id] ?? (attr.is_required ? '' : '__NA__')}
                    onChange={v => onAttrChange(attr.id, v)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditarAnuncioPage() {
  const { item_id } = useParams<{ item_id: string }>()
  const router      = useRouter()

  // ── Data ──────────────────────────────────────────────────────────────────
  const [item,        setItem]        = useState<MLItemFull | null>(null)
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [attrSections, setAttrSections] = useState<MlAttributeUiSection[]>([])
  const [attrLoading, setAttrLoading] = useState(false)

  // ── Editable fields ───────────────────────────────────────────────────────
  const [title,        setTitle]        = useState('')
  const [price,        setPrice]        = useState('')
  const [stock,        setStock]        = useState('')
  const [description,  setDescription]  = useState('')
  const [condition,    setCondition]    = useState('new')
  const [listingType,  setListingType]  = useState('gold_special')
  const [sku,          setSku]          = useState('')
  const [freeShipping, setFreeShipping] = useState(false)
  const [flex,         setFlex]         = useState(false)
  const [localPickup,  setLocalPickup]  = useState(false)
  const [warranty,     setWarranty]     = useState('')
  const [pkgWeight,    setPkgWeight]    = useState('')
  const [pkgLength,    setPkgLength]    = useState('')
  const [pkgWidth,     setPkgWidth]     = useState('')
  const [pkgHeight,    setPkgHeight]    = useState('')
  const [attrValues,   setAttrValues]   = useState<AttrValues>({})
  const [gtin,         setGtin]         = useState('')
  const [gtinNA,       setGtinNA]       = useState(false)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isSaving,       setIsSaving]       = useState(false)
  const [activeSection,  setActiveSection]  = useState<SectionId>('sec-basic')
  const [toast,          setToast]          = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [saveLog,        setSaveLog]        = useState<string[]>([])
  const [showSaveLog,    setShowSaveLog]    = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const initialRef = useRef<{
    title: string; price: string; stock: string; description: string
    condition: string; listingType: string; sku: string
    freeShipping: boolean; flex: boolean; localPickup: boolean; warranty: string
    pkgWeight: string; pkgLength: string; pkgWidth: string; pkgHeight: string
    attrValues: AttrValues; gtin: string
  } | null>(null)

  // ─── Load item ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!item_id) return
    fetch(`/api/mercadolivre/items/${item_id}`)
      .then(r => r.json())
      .then((d: MLItemFull & { error?: string }) => {
        if (d.error) { setLoadError(d.error); return }
        setItem(d)

        const initTitle       = d.title ?? ''
        const initPrice       = String(d.price ?? '')
        const initStock       = String(d.available_quantity ?? '')
        const initDesc        = d.description_text ?? ''
        const initCondition   = d.condition ?? 'new'
        const initListingType = d.listing_type_id ?? 'gold_special'
        const initSku         = d.seller_custom_field ?? ''
        const initFreeShip    = d.shipping?.free_shipping ?? false
        const initFlex        = d.shipping?.tags?.includes('self_service_in') ?? false
        const initPickup      = d.shipping?.local_pick_up ?? false
        const initWarranty    = d.sale_terms?.find(t => t.id === 'WARRANTY_TYPE')?.value_name ?? ''
        const initGtin        = d.attributes?.find(a => ['GTIN', 'EAN', 'UPC'].includes(a.id))?.value_name ?? ''

        const initAttrValues: AttrValues = {}
        for (const a of d.attributes ?? []) {
          initAttrValues[a.id] = a.value_name ?? a.value_id ?? ''
        }

        setTitle(initTitle); setPrice(initPrice); setStock(initStock)
        setDescription(initDesc); setCondition(initCondition); setListingType(initListingType)
        setSku(initSku); setFreeShipping(initFreeShip); setFlex(initFlex); setLocalPickup(initPickup)
        setWarranty(initWarranty ?? ''); setGtin(initGtin)
        setAttrValues(initAttrValues)

        initialRef.current = {
          title: initTitle, price: initPrice, stock: initStock, description: initDesc,
          condition: initCondition, listingType: initListingType, sku: initSku,
          freeShipping: initFreeShip, flex: initFlex, localPickup: initPickup,
          warranty: initWarranty ?? '', pkgWeight: '', pkgLength: '', pkgWidth: '', pkgHeight: '',
          attrValues: { ...initAttrValues }, gtin: initGtin,
        }

        // Load attributes
        if (d.category_id) {
          setAttrLoading(true)
          fetch('/api/ml/attributes', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              category_id:     d.category_id,
              domain_id:       d.domain_id ?? '',
              item_attributes: d.attributes ?? [],
            }),
          })
            .then(r => r.json())
            .then((ad: { ui_sections?: MlAttributeUiSection[]; error?: string }) => {
              if (ad.ui_sections) setAttrSections(ad.ui_sections)
            })
            .catch(() => { /* non-fatal */ })
            .finally(() => setAttrLoading(false))
        }
      })
      .catch(() => setLoadError('Erro ao carregar anúncio'))
  }, [item_id])

  // ─── Active section via scroll ────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveSection(e.target.id as SectionId)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [item])

  function scrollTo(id: SectionId) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ─── Dirty detection ──────────────────────────────────────────────────────
  const hasChanges = (() => {
    if (!initialRef.current || !item) return false
    const ini = initialRef.current
    return (
      title       !== ini.title       ||
      price       !== ini.price       ||
      stock       !== ini.stock       ||
      description !== ini.description ||
      condition   !== ini.condition   ||
      listingType !== ini.listingType ||
      sku         !== ini.sku         ||
      freeShipping !== ini.freeShipping ||
      flex         !== ini.flex       ||
      localPickup  !== ini.localPickup ||
      warranty     !== ini.warranty   ||
      gtin         !== ini.gtin       ||
      JSON.stringify(attrValues) !== JSON.stringify(ini.attrValues)
    )
  })()

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!item || !hasChanges) return
    setIsSaving(true)
    setSaveLog([])
    setShowSaveLog(true)

    const ini = initialRef.current!
    const log: string[] = []

    async function patch(field: string, value: unknown, label: string) {
      const res = await fetch(`/api/mercadolivre/items/${item_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field, value }),
      })
      const d = await res.json() as { ok?: boolean; error?: string }
      log.push(d.ok ? `✅ ${label}` : `❌ ${label}: ${d.error ?? 'Erro'}`)
      setSaveLog([...log])
    }

    if (title       !== ini.title       && item.sold_quantity === 0) await patch('title', title.trim(), 'Título')
    if (price       !== ini.price)        await patch('price', parseFloat(price), 'Preço')
    if (stock       !== ini.stock)        await patch('stock', parseInt(stock, 10), 'Estoque')
    if (condition   !== ini.condition)    await patch('condition', condition, 'Condição')
    if (listingType !== ini.listingType)  await patch('listing_type_id', listingType, 'Tipo de anúncio')
    if (sku         !== ini.sku)          await patch('seller_custom_field', sku, 'SKU')
    if (freeShipping !== ini.freeShipping) await patch('free_shipping', freeShipping, 'Frete grátis')
    if (flex        !== ini.flex)          await patch('flex_shipping', flex, 'Envio Flex')
    if (localPickup !== ini.localPickup)   await patch('local_pick_up', localPickup, 'Retirada pessoal')
    if (warranty    !== ini.warranty)      await patch('warranty', warranty || null, 'Garantia')

    // Description via separate field
    if (description !== ini.description) await patch('description', description, 'Descrição')

    // Attributes
    if (JSON.stringify(attrValues) !== JSON.stringify(ini.attrValues)) {
      const attrsArray = Object.entries(attrValues)
        .filter(([, v]) => v && v !== '__NA__')
        .map(([id, value_name]) => ({ id, value_name }))
      await patch('attributes', attrsArray, 'Atributos')
    }

    // GTIN
    if (gtin !== ini.gtin && !gtinNA) {
      const gtinAttr = item.attributes?.find(a => ['GTIN', 'EAN', 'UPC'].includes(a.id))
      if (gtinAttr) {
        const attrsArray = [
          ...item.attributes.filter(a => !['GTIN', 'EAN', 'UPC'].includes(a.id)).map(a => ({ id: a.id, value_name: a.value_name ?? '' })),
          { id: gtinAttr.id, value_name: gtin },
        ]
        await patch('attributes', attrsArray, 'EAN/GTIN')
      }
    }

    const allOk = log.every(l => l.startsWith('✅'))

    // Update initialRef to current values on success
    if (allOk) {
      initialRef.current = {
        title, price, stock, description, condition, listingType, sku,
        freeShipping, flex, localPickup, warranty, pkgWeight, pkgLength, pkgWidth, pkgHeight,
        attrValues: { ...attrValues }, gtin,
      }
    }

    setToast({ msg: allOk ? 'Anúncio atualizado com sucesso!' : 'Salvo com erros — veja o log', type: allOk ? 'success' : 'error' })
    setTimeout(() => setToast(null), 4000)
    setIsSaving(false)
  }, [item, item_id, hasChanges, title, price, stock, description, condition, listingType, sku, freeShipping, flex, localPickup, warranty, attrValues, gtin, gtinNA, pkgWeight, pkgLength, pkgWidth, pkgHeight])

  // ─── Render states ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400 font-semibold">{loadError}</p>
        <Link href="/dashboard/produtos" className="text-xs text-purple-400 hover:text-purple-300">
          ← Voltar para Produtos
        </Link>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    )
  }

  const st       = statusLabel(item.status)
  const titleLocked = item.sold_quantity > 0
  const isPremium   = item.listing_type_id === 'gold_pro'

  return (
    <div className="min-h-screen bg-dark-900">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-dark-900/95 backdrop-blur border-b border-white/[0.06]">
        <Link
          href="/dashboard/produtos"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mr-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Produtos
        </Link>
        <span className="text-slate-700">•</span>
        <span className="text-xs text-slate-500 truncate max-w-xs hidden sm:block">
          Mercado Livre User Product / Editar Anúncio
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.text}</span>
        <span className="text-xs text-slate-600">#{item_id}</span>

        {hasChanges && (
          <span className="text-xs text-slate-600 ml-auto mr-2 hidden sm:block">
            Alterações pendentes
          </span>
        )}

        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`ml-auto sm:ml-0 flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            hasChanges && !isSaving
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'
              : 'bg-dark-700 text-slate-600 cursor-not-allowed'
          }`}
        >
          {isSaving
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
            : 'Atualizar'
          }
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-6 px-6 py-6 max-w-[1200px] mx-auto">

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── SEÇÃO 1: Informação Básica ─────────────────────────────── */}
          <section id="sec-basic" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Informação Básica</p>

            {/* Título */}
            <div>
              <label className={LABEL_CLS}>
                Nome do Anúncio <span className="text-red-400">*</span>
              </label>
              {titleLocked ? (
                <div>
                  <div className="relative">
                    <input
                      value={title}
                      disabled
                      className={`${INPUT_CLS} opacity-60 cursor-not-allowed`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                    <Lock className="w-3 h-3 shrink-0" />
                    Título bloqueado — este anúncio já possui{' '}
                    <strong>{item.sold_quantity}</strong>{' '}
                    venda(s). Regra oficial do Mercado Livre.
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={60}
                    className={`${INPUT_CLS} pr-16`}
                    placeholder="Título do anúncio"
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${title.length >= 55 ? 'text-amber-400' : 'text-slate-600'}`}>
                    {title.length}/60
                  </span>
                </div>
              )}
            </div>

            {/* Categoria */}
            <div>
              <label className={LABEL_CLS}>Categoria</label>
              <div className="flex items-start gap-2">
                <input
                  value={item.category_name ?? item.category_id}
                  disabled
                  className={`${INPUT_CLS} flex-1 opacity-60 cursor-not-allowed`}
                />
                <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-600 shrink-0">
                  <Info className="w-3 h-3" />
                  Não pode ser alterada
                </div>
              </div>
            </div>
          </section>

          {/* ── SEÇÃO 2: Atributos ──────────────────────────────────────── */}
          <section id="sec-attrs" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Atributos</p>
            <AttributesSection
              sections={attrSections}
              attrValues={attrValues}
              onAttrChange={(id, val) => setAttrValues(prev => ({ ...prev, [id]: val }))}
              loading={attrLoading}
            />
          </section>

          {/* ── SEÇÃO 3: Informação do Anúncio ──────────────────────────── */}
          <section id="sec-listing-info" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Informação do Anúncio</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Tipo */}
              <div>
                <label className={LABEL_CLS}>Tipo</label>
                <div className="flex gap-3">
                  {(['Simples', 'Variantes'] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={t === 'Simples'}
                        disabled={t === 'Variantes'}
                        readOnly={t === 'Simples'}
                        className="accent-purple-500"
                      />
                      <span className={`text-sm ${t === 'Variantes' ? 'text-slate-600' : 'text-slate-300'}`}>{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className={LABEL_CLS}>SKU</label>
                <input
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="Código interno do produto"
                  className={INPUT_CLS}
                />
              </div>

              {/* Código de barras */}
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>
                  Código de Barras (EAN/GTIN)
                </label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    value={gtinNA ? '' : gtin}
                    onChange={e => setGtin(e.target.value)}
                    disabled={gtinNA}
                    placeholder="EAN/GTIN (8–14 dígitos)"
                    className={`${INPUT_CLS} flex-1 min-w-0 ${gtinNA ? 'opacity-50' : ''}`}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={gtinNA}
                      onChange={e => setGtinNA(e.target.checked)}
                      className="accent-purple-500"
                    />
                    Não tenho agora
                  </label>
                </div>
                {gtin && !/^\d{8,14}$/.test(gtin) && !gtinNA && (
                  <p className="text-xs text-red-400 mt-1">GTIN deve ter 8 a 14 dígitos numéricos</p>
                )}
              </div>
            </div>
          </section>

          {/* ── SEÇÃO 4: Mídia ──────────────────────────────────────────── */}
          <section id="sec-media" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Mídia</p>
            <p className="text-xs text-slate-600 -mt-3">
              Formato JPG/PNG · mínimo 500×500px · primeira foto com fundo branco · sem marcas d&apos;água
            </p>

            <div className="flex flex-wrap gap-3">
              {item.pictures.map((pic, i) => {
                const url = pic.secure_url ?? pic.url ?? pic.source ?? ''
                const sz  = pic.size ?? ''
                return (
                  <div key={i} className="relative w-24 h-24 border border-white/[0.08] rounded-lg overflow-hidden bg-dark-700">
                    {url
                      ? <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">Sem foto</div>
                    }
                    {sz && (
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-black/70 text-slate-400 py-0.5 truncate">
                        {sz}
                      </span>
                    )}
                    {i === 0 && (
                      <span className="absolute top-1 left-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        CAPA
                      </span>
                    )}
                  </div>
                )
              })}

              <button
                type="button"
                className="w-24 h-24 border-2 border-dashed border-white/[0.12] rounded-lg flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-slate-400 hover:border-white/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Adicionar</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-600">{item.pictures.length}/12 imagens</p>
          </section>

          {/* ── SEÇÃO 5: Informações de Venda ───────────────────────────── */}
          <section id="sec-sale" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Informações de Venda</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Plano', 'Canal', 'Preço (R$)', 'Tipo de Anúncio', 'Condição', 'Garantia'].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider py-2 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-white">Plano 1</div>
                      <div className="text-slate-600">{item_id}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked readOnly className="accent-purple-500" />
                        <span className="text-slate-300">Mercado Livre</span>
                      </label>
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="w-28 px-2 py-1.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50"
                        min={0}
                        step={0.01}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={listingType}
                        onChange={e => setListingType(e.target.value)}
                        disabled={isPremium}
                        className="px-2 py-1.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="gold_special">Clássico</option>
                        <option value="gold_pro">Premium</option>
                      </select>
                      {isPremium && (
                        <p className="text-[10px] text-slate-600 mt-0.5">Já é Premium</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={condition}
                        onChange={e => setCondition(e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none"
                      >
                        <option value="new">Novo</option>
                        <option value="used">Usado</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={warranty}
                        onChange={e => setWarranty(e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none"
                      >
                        <option value="">Sem Garantia</option>
                        <option value="Garantia do vendedor">Garantia do Vendedor</option>
                        <option value="Garantia de fábrica">Garantia de Fábrica</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Estoque */}
            <div className="mt-2 pt-4 border-t border-white/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={LABEL_CLS}>Estoque disponível</label>
                <input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  className={INPUT_CLS}
                  min={0}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Vendas realizadas</label>
                <div className={`${INPUT_CLS} opacity-60 cursor-default`}>
                  {item.sold_quantity}
                </div>
              </div>
            </div>

            {listingType !== item.listing_type_id && item.listing_type_id !== 'gold_pro' && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl text-xs text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Upgrade de {listingTypeLabel(item.listing_type_id)} → {listingTypeLabel(listingType)} é irreversível.
              </div>
            )}
          </section>

          {/* ── SEÇÃO 6: Descrição ──────────────────────────────────────── */}
          <section id="sec-description" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Descrição</p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={LABEL_CLS + ' mb-0'}>Plano 1 — {item_id}</label>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={8}
                maxLength={5000}
                placeholder="Descreva o produto detalhadamente..."
                className={`${INPUT_CLS} resize-y`}
              />
              <p className={`text-[11px] mt-1 text-right ${description.length >= 4500 ? 'text-amber-400' : 'text-slate-600'}`}>
                {description.length}/5000
              </p>
            </div>
          </section>

          {/* ── SEÇÃO 7: Envio ──────────────────────────────────────────── */}
          <section id="sec-shipping" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Envio</p>

            <div>
              <label className={LABEL_CLS}>Plano 1 — {item_id}</label>
              <div className="flex flex-col gap-3">
                <select
                  value={item.shipping?.logistic_type ?? 'not_specified'}
                  disabled
                  className={`${INPUT_CLS} opacity-60 cursor-not-allowed`}
                >
                  <option value="fulfillment">Mercado Envios 2 (Full)</option>
                  <option value="not_specified">Mercado Envios Agências</option>
                  <option value="xd_drop_off">Envio Flex</option>
                </select>

                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">ML</span>
                    <input
                      type="checkbox"
                      checked={freeShipping}
                      onChange={e => setFreeShipping(e.target.checked)}
                      className="accent-purple-500"
                    />
                    <span className="text-sm text-slate-300">Frete grátis</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flex}
                      onChange={e => setFlex(e.target.checked)}
                      className="accent-purple-500"
                    />
                    <span className="text-sm text-slate-300">Envio no Mesmo Dia ⚡</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localPickup}
                      onChange={e => setLocalPickup(e.target.checked)}
                      className="accent-purple-500"
                    />
                    <span className="text-sm text-slate-300">Retirada Pessoal</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* ── SEÇÃO 8: Pacote do Vendedor ─────────────────────────────── */}
          <section id="sec-package" className={SECTION_CLS}>
            <p className={SECTION_TITLE_CLS}>Pacote do Vendedor</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Peso */}
              <div>
                <label className={LABEL_CLS}>Peso do Pacote</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={pkgWeight}
                    onChange={e => setPkgWeight(e.target.value)}
                    placeholder="Ex: 500"
                    className={`${INPUT_CLS} flex-1`}
                    min={0}
                    step={1}
                  />
                  <select className="px-2 py-2 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              {/* Dimensões */}
              <div>
                <label className={LABEL_CLS}>Tamanho da Embalagem (cm)</label>
                <div className="flex gap-2 items-center">
                  <input type="number" value={pkgLength} onChange={e => setPkgLength(e.target.value)} placeholder="C" className="w-16 px-2 py-2 rounded-lg text-sm text-center bg-dark-700 border border-white/[0.08] text-slate-200 focus:outline-none" min={0} />
                  <span className="text-slate-600 text-xs">×</span>
                  <input type="number" value={pkgWidth}  onChange={e => setPkgWidth(e.target.value)}  placeholder="L" className="w-16 px-2 py-2 rounded-lg text-sm text-center bg-dark-700 border border-white/[0.08] text-slate-200 focus:outline-none" min={0} />
                  <span className="text-slate-600 text-xs">×</span>
                  <input type="number" value={pkgHeight} onChange={e => setPkgHeight(e.target.value)} placeholder="A" className="w-16 px-2 py-2 rounded-lg text-sm text-center bg-dark-700 border border-white/[0.08] text-slate-200 focus:outline-none" min={0} />
                  <span className="text-xs text-slate-600">cm</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* ── Sticky side nav ─────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-48 shrink-0">
          <nav className="sticky top-20 flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-3">Seções</p>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`text-xs text-left px-3 py-1.5 rounded-lg transition-all ${
                  activeSection === s.id
                    ? 'text-purple-400 bg-purple-900/20 font-semibold'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                {s.label}
              </button>
            ))}

            {/* Save log */}
            {saveLog.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowSaveLog(v => !v)}
                  className="text-[10px] text-slate-600 hover:text-slate-400 px-3 w-full text-left flex items-center justify-between"
                >
                  Log de salvamento
                  {showSaveLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showSaveLog && (
                  <div className="mt-2 px-3 space-y-1">
                    {saveLog.map((l, i) => (
                      <p key={i} className={`text-[10px] leading-relaxed ${l.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                        {l}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </aside>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm font-semibold ${
          toast.type === 'success'
            ? 'bg-green-900/80 border-green-700/50 text-green-300'
            : 'bg-red-900/80 border-red-700/50 text-red-300'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
