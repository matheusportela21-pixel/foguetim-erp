'use client'

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Loader2, CheckCircle2, AlertTriangle, Info, X, Plus, Trash2,
  ExternalLink, Bot, Package, Save, Send, ChevronRight,
  ImageIcon, Video, Tag, ShoppingCart, FileText, Boxes,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomAttribute {
  name: string
  value: string
}

interface ListingFormData {
  // Section 1: Info
  marketplaces: string[]
  title: string
  description: string
  condition: 'novo' | 'usado' | 'recondicionado'
  origin: 'nacional' | 'importado'
  supplierUrl: string
  // Section 2: Attributes
  brand: string
  model: string
  warrantyValue: number
  warrantyUnit: 'meses' | 'anos' | 'dias'
  anvisa: string
  anvisaNA: boolean
  mapa: string
  mapaNA: boolean
  anatel: string
  anatelNA: boolean
  customAttributes: CustomAttribute[]
  // Section 3: Sale
  saleType: 'simples' | 'variantes'
  originalPrice: string
  salePrice: string
  quantity: string
  sku: string
  ean: string
  noEan: boolean
  lengthCm: string
  widthCm: string
  heightCm: string
  weightG: string
  // Section 4: Media
  images: string[]
  videoUrl: string
}

interface EanResult {
  ean: string
  name: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MKT_COLORS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ml:     { label: 'Mercado Livre', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  shopee: { label: 'Shopee',        bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  magalu: { label: 'Magalu',        bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
}

const COMMISSIONS: Record<string, { rate: number; shipping: number; label: string }> = {
  ml:     { rate: 12, shipping: 18, label: 'Mercado Livre' },
  shopee: { rate: 14, shipping: 12, label: 'Shopee' },
  magalu: { rate: 16, shipping: 0,  label: 'Magalu' },
}

const SECTIONS = [
  { id: 'info',      label: 'Informacao Basica', icon: FileText },
  { id: 'atributos', label: 'Atributos',         icon: Tag },
  { id: 'venda',     label: 'Info de Venda',      icon: ShoppingCart },
  { id: 'midia',     label: 'Midia',             icon: ImageIcon },
] as const

const INPUT_CLS = `w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm
  focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/30 transition-all
  placeholder-slate-500`

const LABEL_CLS = 'block text-xs font-medium text-slate-400 mb-1.5'

const DEFAULT_FORM: ListingFormData = {
  marketplaces: ['ml'],
  title: '',
  description: '',
  condition: 'novo',
  origin: 'nacional',
  supplierUrl: '',
  brand: '',
  model: '',
  warrantyValue: 0,
  warrantyUnit: 'meses',
  anvisa: '',
  anvisaNA: false,
  mapa: '',
  mapaNA: false,
  anatel: '',
  anatelNA: false,
  customAttributes: [],
  saleType: 'simples',
  originalPrice: '',
  salePrice: '',
  quantity: '1',
  sku: '',
  ean: '',
  noEan: false,
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  weightG: '',
  images: [],
  videoUrl: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Tip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex ml-1">
      <Info className="w-3.5 h-3.5 text-slate-600 cursor-help" />
      <div className="absolute left-5 bottom-3 z-30 hidden group-hover:block w-56 p-2.5 rounded-lg bg-[#1a2035] border border-white/10 text-[10px] text-slate-300 leading-relaxed shadow-xl">
        {text}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

function NovoAnuncioContent() {
  const searchParams = useSearchParams()
  const draftId = searchParams.get('draft')

  const [formData, setFormData] = useState<ListingFormData>({ ...DEFAULT_FORM })
  const [activeSection, setActiveSection] = useState('info')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(!!draftId)

  // EAN modal
  const [showEanModal, setShowEanModal] = useState(false)
  const [eanLoading, setEanLoading] = useState(false)
  const [eanResults, setEanResults] = useState<EanResult[]>([])
  const [selectedEan, setSelectedEan] = useState('')

  // AI modal
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiField, setAiField] = useState<'title' | 'description'>('title')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiUsageId, setAiUsageId] = useState('')

  // Section refs
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // ─── Scroll spy ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.3 }
    )

    const ids = SECTIONS.map(s => s.id)
    ids.forEach((id) => {
      const el = sectionRefs.current[id]
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // ─── Load draft ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!draftId) return
    setLoadingDraft(true)

    fetch(`/api/listings/drafts/${draftId}`)
      .then(res => res.json())
      .then(data => {
        if (data.draft) {
          const d = data.draft
          setFormData(prev => ({
            ...prev,
            title: d.title || '',
            description: d.description || '',
            brand: d.brand || '',
            salePrice: d.price?.toString() || '',
            sku: d.sku || '',
            ean: d.ean || '',
            images: d.images || [],
            marketplaces: d.target_channels || ['ml'],
            condition: d.condition || 'novo',
          }))
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoadingDraft(false))
  }, [draftId])

  // ─── Form updater ────────────────────────────────────────────────────────────

  const updateField = useCallback(<K extends keyof ListingFormData>(key: K, value: ListingFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }, [])

  // ─── Toggle marketplace ──────────────────────────────────────────────────────

  function toggleMarketplace(key: string) {
    setFormData(prev => {
      const has = prev.marketplaces.includes(key)
      return {
        ...prev,
        marketplaces: has
          ? prev.marketplaces.filter(m => m !== key)
          : [...prev.marketplaces, key],
      }
    })
    setSaved(false)
  }

  // ─── Custom attributes ──────────────────────────────────────────────────────

  function addCustomAttribute() {
    updateField('customAttributes', [...formData.customAttributes, { name: '', value: '' }])
  }

  function updateCustomAttribute(index: number, field: 'name' | 'value', val: string) {
    const updated = [...formData.customAttributes]
    updated[index] = { ...updated[index], [field]: val }
    updateField('customAttributes', updated)
  }

  function removeCustomAttribute(index: number) {
    updateField('customAttributes', formData.customAttributes.filter((_, i) => i !== index))
  }

  // ─── Image URLs ──────────────────────────────────────────────────────────────

  function addImageUrl() {
    if (formData.images.length >= 10) return
    updateField('images', [...formData.images, ''])
  }

  function updateImageUrl(index: number, url: string) {
    const updated = [...formData.images]
    updated[index] = url
    updateField('images', updated)
  }

  function removeImage(index: number) {
    updateField('images', formData.images.filter((_, i) => i !== index))
  }

  // ─── Price simulation ────────────────────────────────────────────────────────

  const priceSimulation = useMemo(() => {
    const price = parseFloat(formData.salePrice)
    if (!price || price <= 0) return null

    return formData.marketplaces.map(mkt => {
      const cfg = COMMISSIONS[mkt]
      if (!cfg) return null
      const commissionValue = price * cfg.rate / 100
      const shipping = cfg.shipping
      const taxRate = 0 // user can configure later
      const taxes = price * taxRate / 100
      const youReceive = price - commissionValue - shipping - taxes
      return {
        key: mkt,
        label: cfg.label,
        rate: cfg.rate,
        commissionValue,
        shipping,
        taxes,
        youReceive,
      }
    }).filter(Boolean) as Array<{
      key: string
      label: string
      rate: number
      commissionValue: number
      shipping: number
      taxes: number
      youReceive: number
    }>
  }, [formData.salePrice, formData.marketplaces])

  const bestChannel = useMemo(() => {
    if (!priceSimulation || priceSimulation.length === 0) return null
    return priceSimulation.reduce((best, ch) => ch.youReceive > best.youReceive ? ch : best, priceSimulation[0])
  }, [priceSimulation])

  // ─── EAN lookup ──────────────────────────────────────────────────────────────

  async function handleEanLookup() {
    setShowEanModal(true)
    setEanLoading(true)
    setEanResults([])
    setSelectedEan('')

    try {
      const res = await fetch('/api/products/lookup-ean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.title, brand: formData.brand }),
      })
      const data = await res.json()
      setEanResults(data.results ?? [])
    } catch {
      setEanResults([])
    } finally {
      setEanLoading(false)
    }
  }

  function applyEan() {
    if (selectedEan) {
      updateField('ean', selectedEan)
    }
    setShowEanModal(false)
  }

  // ─── AI improve ──────────────────────────────────────────────────────────────

  async function handleAiImprove(field: 'title' | 'description') {
    setAiField(field)
    setShowAiModal(true)
    setAiLoading(true)
    setAiSuggestion('')
    setAiUsageId('')

    const text = field === 'title' ? formData.title : formData.description

    try {
      const res = await fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: field,
          text,
          marketplace: formData.marketplaces[0] || 'ml',
        }),
      })
      const data = await res.json()
      setAiSuggestion(data.suggestion ?? '')
      setAiUsageId(data.usage_id ?? '')
    } catch {
      setAiSuggestion('')
    } finally {
      setAiLoading(false)
    }
  }

  async function acceptAiSuggestion() {
    if (aiUsageId) {
      fetch('/api/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true, usage_id: aiUsageId }),
      }).catch(() => { /* silent */ })
    }
    updateField(aiField, aiSuggestion)
    setShowAiModal(false)
  }

  // ─── Save draft ──────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    setSaving(true)
    try {
      const method = draftId ? 'PATCH' : 'POST'
      const url = draftId ? `/api/listings/drafts/${draftId}` : '/api/listings/drafts'

      const body = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.salePrice) || null,
        original_price: parseFloat(formData.originalPrice) || null,
        images: formData.images.filter(Boolean),
        brand: formData.brand || null,
        model: formData.model || null,
        condition: formData.condition,
        origin: formData.origin,
        sku: formData.sku || null,
        ean: formData.noEan ? null : (formData.ean || null),
        quantity: parseInt(formData.quantity) || 1,
        target_channels: formData.marketplaces,
        supplier_url: formData.supplierUrl || null,
        warranty_value: formData.warrantyValue || null,
        warranty_unit: formData.warrantyUnit,
        anvisa: formData.anvisaNA ? null : (formData.anvisa || null),
        mapa: formData.mapaNA ? null : (formData.mapa || null),
        anatel: formData.anatelNA ? null : (formData.anatel || null),
        custom_attributes: formData.customAttributes.filter(a => a.name && a.value),
        dimensions: {
          length_cm: parseFloat(formData.lengthCm) || null,
          width_cm: parseFloat(formData.widthCm) || null,
          height_cm: parseFloat(formData.heightCm) || null,
          weight_g: parseFloat(formData.weightG) || null,
        },
        video_url: formData.videoUrl || null,
        status: 'draft',
        created_by: 'manual',
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSaved(true)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  // ─── Scroll to section ──────────────────────────────────────────────────────

  function scrollToSection(id: string) {
    const el = sectionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title={draftId ? 'Editar Rascunho' : 'Novo Anuncio'}
        description="Preencha as informacoes do produto para criar um anuncio nos marketplaces."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Rascunhos', href: '/dashboard/rascunhos' },
          { label: draftId ? 'Editar' : 'Novo' },
        ]}
      />

      {/* Success toast */}
      {saved && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <p className="text-sm text-green-300">Rascunho salvo com sucesso!</p>
          </div>
          <Link
            href="/dashboard/rascunhos"
            className="text-sm font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            Ver rascunhos <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="flex gap-6">
        {/* ── Scroll spy sidebar ──────────────────────────────────────────────── */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-1">
            {SECTIONS.map(s => {
              const Icon = s.icon
              const isActive = activeSection === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                    ${isActive
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent'
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-8 pb-28">

          {/* ══════════════════════════════════════════════════════════════════════
               SECTION 1: Informacao Basica
             ══════════════════════════════════════════════════════════════════════ */}
          <section
            id="info"
            ref={el => { sectionRefs.current.info = el }}
            className="glass-card p-6 md:p-8 space-y-6"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              Informacao Basica
            </h2>

            {/* Marketplaces */}
            <div className="space-y-2">
              <label className={LABEL_CLS}>Marketplaces de destino</label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(MKT_COLORS).map(([key, c]) => {
                  const selected = formData.marketplaces.includes(key)
                  return (
                    <label
                      key={key}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all
                        ${selected
                          ? `${c.bg} ${c.border} ${c.text}`
                          : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMarketplace(key)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{c.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={LABEL_CLS}>Titulo</label>
                <span className={`text-xs ${formData.title.length > 100 ? 'text-red-400' : 'text-slate-500'}`}>
                  {formData.title.length}/100
                </span>
              </div>
              <div className="relative">
                <textarea
                  value={formData.title}
                  onChange={e => updateField('title', e.target.value)}
                  rows={2}
                  maxLength={100}
                  placeholder="Ex: Kit 3 Pares de Meias Esportivas Algodao Cano Medio"
                  className={`${INPUT_CLS} resize-none pr-12`}
                />
                <button
                  onClick={() => handleAiImprove('title')}
                  disabled={!formData.title.trim()}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-primary-500/10 text-primary-400
                             hover:bg-primary-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Melhorar com IA"
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Descricao</label>
              <div className="relative">
                <textarea
                  value={formData.description}
                  onChange={e => updateField('description', e.target.value)}
                  rows={6}
                  placeholder="Descreva seu produto com detalhes: material, tamanho, funcionalidades..."
                  className={`${INPUT_CLS} resize-y pr-12`}
                />
                <button
                  onClick={() => handleAiImprove('description')}
                  disabled={!formData.description.trim()}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-primary-500/10 text-primary-400
                             hover:bg-primary-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Melhorar com IA"
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-600">Dica: use linhas em branco para separar paragrafos. Os marketplaces formatam o texto automaticamente.</p>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <label className={LABEL_CLS}>Condicao</label>
              <div className="flex gap-3">
                {([
                  { key: 'novo', label: 'Novo' },
                  { key: 'usado', label: 'Usado' },
                  { key: 'recondicionado', label: 'Recondicionado' },
                ] as const).map(opt => (
                  <label
                    key={opt.key}
                    className={`px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-all
                      ${formData.condition === opt.key
                        ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value={opt.key}
                      checked={formData.condition === opt.key}
                      onChange={() => updateField('condition', opt.key)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Origin */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Origem</label>
              <select
                value={formData.origin}
                onChange={e => updateField('origin', e.target.value as 'nacional' | 'importado')}
                className={`${INPUT_CLS} w-full sm:w-64`}
              >
                <option value="nacional">Nacional</option>
                <option value="importado">Importado</option>
              </select>
            </div>

            {/* Supplier URL */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Link do Fornecedor <span className="text-slate-600">(opcional)</span></label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.supplierUrl}
                  onChange={e => updateField('supplierUrl', e.target.value)}
                  placeholder="https://fornecedor.com.br/produto"
                  className={`${INPUT_CLS} flex-1`}
                />
                {formData.supplierUrl && (
                  <a
                    href={formData.supplierUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]
                               text-slate-300 text-sm font-medium hover:bg-white/[0.04] transition-all
                               flex items-center gap-1.5 shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visitar
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════════════
               SECTION 2: Atributos
             ══════════════════════════════════════════════════════════════════════ */}
          <section
            id="atributos"
            ref={el => { sectionRefs.current.atributos = el }}
            className="glass-card p-6 md:p-8 space-y-6"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary-400" />
              Atributos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Brand */}
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>
                  Marca <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={e => updateField('brand', e.target.value)}
                  placeholder="Ex: Nike, Samsung..."
                  className={INPUT_CLS}
                />
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Modelo</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={e => updateField('model', e.target.value)}
                  placeholder="Ex: Air Max 90"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Warranty */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Garantia</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min={0}
                  value={formData.warrantyValue || ''}
                  onChange={e => updateField('warrantyValue', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={`${INPUT_CLS} w-24`}
                />
                <select
                  value={formData.warrantyUnit}
                  onChange={e => updateField('warrantyUnit', e.target.value as 'meses' | 'anos' | 'dias')}
                  className={`${INPUT_CLS} w-32`}
                >
                  <option value="meses">Meses</option>
                  <option value="anos">Anos</option>
                  <option value="dias">Dias</option>
                </select>
              </div>
            </div>

            {/* Regulations */}
            <div className="space-y-4 p-4 rounded-xl border border-yellow-500/10 bg-yellow-500/[0.02]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Regulamentacao
              </h3>

              {/* ANVISA */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className={`text-xs font-medium ${formData.anvisaNA ? 'text-slate-600' : 'text-slate-400'}`}>
                    ANVISA
                  </label>
                  <Tip text="Registro na ANVISA obrigatorio para cosmeticos, alimentos, suplementos e produtos de saude." />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.anvisa}
                    onChange={e => updateField('anvisa', e.target.value)}
                    disabled={formData.anvisaNA}
                    placeholder="Numero do registro"
                    className={`${INPUT_CLS} flex-1 ${formData.anvisaNA ? 'opacity-30 cursor-not-allowed' : ''}`}
                  />
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.anvisaNA}
                      onChange={e => updateField('anvisaNA', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                                 text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                    />
                    <span className="text-xs text-slate-500">Nao se aplica</span>
                  </label>
                </div>
                {!formData.anvisaNA && !formData.anvisa && (
                  <p className="text-[10px] text-yellow-500/70">Sem registro ANVISA, o anuncio pode ser bloqueado em categorias regulamentadas.</p>
                )}
              </div>

              {/* MAPA */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className={`text-xs font-medium ${formData.mapaNA ? 'text-slate-600' : 'text-slate-400'}`}>
                    MAPA
                  </label>
                  <Tip text="Ministerio da Agricultura: obrigatorio para racao, sementes, fertilizantes e produtos agropecuarios." />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.mapa}
                    onChange={e => updateField('mapa', e.target.value)}
                    disabled={formData.mapaNA}
                    placeholder="Numero do registro"
                    className={`${INPUT_CLS} flex-1 ${formData.mapaNA ? 'opacity-30 cursor-not-allowed' : ''}`}
                  />
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mapaNA}
                      onChange={e => updateField('mapaNA', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                                 text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                    />
                    <span className="text-xs text-slate-500">Nao se aplica</span>
                  </label>
                </div>
                {!formData.mapaNA && !formData.mapa && (
                  <p className="text-[10px] text-yellow-500/70">Sem registro MAPA, o anuncio pode ser bloqueado em categorias agropecuarias.</p>
                )}
              </div>

              {/* ANATEL */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className={`text-xs font-medium ${formData.anatelNA ? 'text-slate-600' : 'text-slate-400'}`}>
                    ANATEL
                  </label>
                  <Tip text="Homologacao ANATEL obrigatoria para celulares, fones bluetooth, roteadores e equipamentos de telecomunicacao." />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formData.anatel}
                    onChange={e => updateField('anatel', e.target.value)}
                    disabled={formData.anatelNA}
                    placeholder="Numero da homologacao"
                    className={`${INPUT_CLS} flex-1 ${formData.anatelNA ? 'opacity-30 cursor-not-allowed' : ''}`}
                  />
                  <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.anatelNA}
                      onChange={e => updateField('anatelNA', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                                 text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                    />
                    <span className="text-xs text-slate-500">Nao se aplica</span>
                  </label>
                </div>
                {!formData.anatelNA && !formData.anatel && (
                  <p className="text-[10px] text-yellow-500/70">Sem homologacao ANATEL, o anuncio pode ser bloqueado para eletronicos de telecomunicacao.</p>
                )}
              </div>
            </div>

            {/* Custom attributes */}
            <div className="space-y-3">
              <label className={LABEL_CLS}>Atributos personalizados</label>
              {formData.customAttributes.map((attr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={attr.name}
                    onChange={e => updateCustomAttribute(i, 'name', e.target.value)}
                    placeholder="Nome (ex: Cor)"
                    className={`${INPUT_CLS} flex-1`}
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={e => updateCustomAttribute(i, 'value', e.target.value)}
                    placeholder="Valor (ex: Preto)"
                    className={`${INPUT_CLS} flex-1`}
                  />
                  <button
                    onClick={() => removeCustomAttribute(i)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addCustomAttribute}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/[0.1]
                           text-sm text-slate-400 hover:text-primary-400 hover:border-primary-500/30
                           hover:bg-primary-500/5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar atributo
              </button>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════════════
               SECTION 3: Informacoes de Venda
             ══════════════════════════════════════════════════════════════════════ */}
          <section
            id="venda"
            ref={el => { sectionRefs.current.venda = el }}
            className="glass-card p-6 md:p-8 space-y-6"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-400" />
              Informacoes de Venda
            </h2>

            {/* Sale type */}
            <div className="space-y-2">
              <label className={LABEL_CLS}>Tipo de anuncio</label>
              <div className="flex gap-3">
                <label
                  className={`px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-all
                    ${formData.saleType === 'simples'
                      ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]'
                    }`}
                >
                  <input
                    type="radio"
                    name="saleType"
                    value="simples"
                    checked={formData.saleType === 'simples'}
                    onChange={() => updateField('saleType', 'simples')}
                    className="sr-only"
                  />
                  Simples
                </label>
                <label
                  className="px-4 py-2 rounded-xl border border-white/[0.06] text-sm font-medium
                             text-slate-600 cursor-not-allowed flex items-center gap-2 opacity-40"
                >
                  <input type="radio" disabled className="sr-only" />
                  <Boxes className="w-4 h-4" />
                  Com Variantes
                  <span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded">Em breve</span>
                </label>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>Preco Original <span className="text-slate-600">(opcional, riscado)</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.originalPrice}
                    onChange={e => updateField('originalPrice', e.target.value)}
                    placeholder="0,00"
                    className={`${INPUT_CLS} pl-11`}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>
                  Preco de Venda <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.salePrice}
                    onChange={e => updateField('salePrice', e.target.value)}
                    placeholder="0,00"
                    className={`${INPUT_CLS} pl-11`}
                  />
                </div>
              </div>
            </div>

            {/* Quantity + SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>
                  Quantidade <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={e => updateField('quantity', e.target.value)}
                  className={`${INPUT_CLS} w-32`}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={LABEL_CLS}>SKU</label>
                  <span className="text-xs text-slate-600">{formData.sku.length}/60</span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  value={formData.sku}
                  onChange={e => updateField('sku', e.target.value)}
                  placeholder="Codigo interno do produto"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* EAN */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>EAN / GTIN</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={formData.ean}
                  onChange={e => updateField('ean', e.target.value)}
                  disabled={formData.noEan}
                  placeholder="7891234567890"
                  className={`${INPUT_CLS} flex-1 ${formData.noEan ? 'opacity-30 cursor-not-allowed' : ''}`}
                />
                <button
                  onClick={handleEanLookup}
                  disabled={formData.noEan || !formData.title.trim()}
                  className="px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]
                             text-slate-300 text-sm font-medium hover:bg-white/[0.04] transition-all
                             flex items-center gap-1.5 shrink-0
                             disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Auto-preencher
                </button>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.noEan}
                  onChange={e => updateField('noEan', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                             text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-500">Nao tenho EAN</span>
              </label>
              {formData.noEan && (
                <div className="flex items-start gap-2 mt-2 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300/90">
                    Anuncios sem EAN podem ter menor visibilidade e nao aparecer no catalogo dos marketplaces.
                  </p>
                </div>
              )}
            </div>

            {/* Package dimensions */}
            <div className="space-y-2">
              <label className={LABEL_CLS}>Dimensoes do Pacote</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-600">Comprimento (cm)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={formData.lengthCm}
                    onChange={e => updateField('lengthCm', e.target.value)}
                    placeholder="0"
                    className={INPUT_CLS}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-600">Largura (cm)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={formData.widthCm}
                    onChange={e => updateField('widthCm', e.target.value)}
                    placeholder="0"
                    className={INPUT_CLS}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-600">Altura (cm)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={formData.heightCm}
                    onChange={e => updateField('heightCm', e.target.value)}
                    placeholder="0"
                    className={INPUT_CLS}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-600">Peso (g)</span>
                  <input
                    type="number"
                    min={0}
                    value={formData.weightG}
                    onChange={e => updateField('weightG', e.target.value)}
                    placeholder="0"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </div>

            {/* Price simulation */}
            {priceSimulation && priceSimulation.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl border border-primary-500/10 bg-primary-500/[0.02]">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-400" />
                  Simulacao de Preco
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {priceSimulation.map(sim => {
                    const mktColor = MKT_COLORS[sim.key]
                    const isBest = bestChannel?.key === sim.key && priceSimulation.length > 1
                    return (
                      <div
                        key={sim.key}
                        className={`p-4 rounded-xl border space-y-2
                          ${isBest
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-white/[0.06] bg-white/[0.02]'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${mktColor?.text ?? 'text-slate-300'}`}>
                            {sim.label}
                          </span>
                          {isBest && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                              Melhor
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-500">
                            <span>Comissao ({sim.rate}%)</span>
                            <span className="text-slate-400">-{fmtBRL(sim.commissionValue)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Frete estimado</span>
                            <span className="text-slate-400">-{fmtBRL(sim.shipping)}</span>
                          </div>
                          {sim.taxes > 0 && (
                            <div className="flex justify-between text-slate-500">
                              <span>Impostos</span>
                              <span className="text-slate-400">-{fmtBRL(sim.taxes)}</span>
                            </div>
                          )}
                          <div className="pt-1.5 border-t border-white/[0.06] flex justify-between font-medium">
                            <span className="text-slate-300">Voce recebe</span>
                            <span className={isBest ? 'text-green-400' : 'text-white'}>
                              {fmtBRL(sim.youReceive)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-slate-600">
                  Simulacao estimada. Configure impostos na pagina de Precificacao para resultados mais precisos.
                </p>
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════════════════
               SECTION 4: Midia
             ══════════════════════════════════════════════════════════════════════ */}
          <section
            id="midia"
            ref={el => { sectionRefs.current.midia = el }}
            className="glass-card p-6 md:p-8 space-y-6"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-400" />
              Midia
            </h2>

            {/* Images */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={LABEL_CLS}>Imagens ({formData.images.length}/10)</label>
                <p className="text-[10px] text-slate-600">A primeira imagem sera a capa do anuncio</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.images.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-500">
                      {i === 0 ? 'Capa' : i + 1}
                    </div>
                    <input
                      type="url"
                      value={url}
                      onChange={e => updateImageUrl(i, e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className={`${INPUT_CLS} flex-1`}
                    />
                    {url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Preview ${i + 1}`}
                        className="w-10 h-10 rounded-lg object-cover bg-white/[0.03] border border-white/[0.06] shrink-0"
                      />
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {formData.images.length < 10 && (
                <button
                  onClick={addImageUrl}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/[0.1]
                             text-sm text-slate-400 hover:text-primary-400 hover:border-primary-500/30
                             hover:bg-primary-500/5 transition-all w-full justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar imagem
                </button>
              )}
            </div>

            {/* Video */}
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  Link do Video <span className="text-slate-600">(opcional)</span>
                </span>
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={e => updateField('videoUrl', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={INPUT_CLS}
              />
            </div>
          </section>
        </div>
      </div>

      {/* ── Sticky action bar ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-[#03050f]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            href="/dashboard/rascunhos"
            className="px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]
                       text-slate-300 text-sm font-medium hover:bg-white/[0.04] transition-all
                       flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !formData.title.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                         text-white font-semibold text-sm
                         hover:shadow-neon-purple transition-all duration-200
                         hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                         flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvo
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar rascunho
                </>
              )}
            </button>

            <div className="group relative">
              <button
                disabled
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-500
                           text-white font-semibold text-sm opacity-40 cursor-not-allowed
                           flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Publicar
              </button>
              <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block
                              px-3 py-2 rounded-lg bg-[#1a2035] border border-white/10
                              text-xs text-slate-400 whitespace-nowrap shadow-xl">
                Publicacao direta em breve
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── EAN Lookup Modal ──────────────────────────────────────────────────── */}
      {showEanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEanModal(false)} />
          <div className="relative w-full max-w-md mx-4 bg-[#0A0718] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Buscar EAN</h3>
                <button
                  onClick={() => setShowEanModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {eanLoading ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                  <Image
                    src="/mascot/timm-thinking.png"
                    alt="Timm pensando"
                    width={48}
                    height={48}
                    className="animate-pulse"
                  />
                  <p className="text-sm text-slate-400">
                    Buscando EAN para &quot;{formData.title.substring(0, 40)}...&quot;
                  </p>
                </div>
              ) : eanResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {eanResults.map((r, i) => (
                      <label
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${selectedEan === r.ean
                            ? 'border-primary-500/30 bg-primary-500/10'
                            : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                      >
                        <input
                          type="radio"
                          name="ean-select"
                          value={r.ean}
                          checked={selectedEan === r.ean}
                          onChange={() => setSelectedEan(r.ean)}
                          className="sr-only"
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-white font-mono">{r.ean}</p>
                          <p className="text-xs text-slate-400 truncate">{r.name}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300/90">Verifique se o EAN corresponde ao seu produto.</p>
                  </div>

                  <button
                    onClick={applyEan}
                    disabled={!selectedEan}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                               text-white font-semibold text-sm
                               hover:shadow-neon-purple transition-all
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Usar selecionado
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 space-y-3">
                  <Image
                    src="/mascot/timm-search.png"
                    alt="Timm procurando"
                    width={48}
                    height={48}
                  />
                  <p className="text-sm text-slate-400">Nenhum EAN encontrado para este produto.</p>
                  <p className="text-xs text-slate-600">Tente melhorar o titulo e a marca do produto.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Improve Modal ──────────────────────────────────────────────────── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiModal(false)} />
          <div className="relative w-full max-w-xl mx-4 bg-[#0A0718] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary-400" />
                  Melhorar {aiField === 'title' ? 'Titulo' : 'Descricao'}
                </h3>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {aiLoading ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                  <Image
                    src="/mascot/timm-thinking.png"
                    alt="Timm pensando"
                    width={64}
                    height={64}
                    className="animate-pulse"
                  />
                  <p className="text-sm text-slate-300">Timm esta pensando...</p>
                </div>
              ) : aiSuggestion ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">Original</label>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-sm text-slate-400 min-h-[80px] whitespace-pre-wrap">
                        {aiField === 'title' ? formData.title : formData.description}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-primary-400">Sugestao do Timm</label>
                      <div className="p-3 rounded-xl bg-primary-500/5 border border-primary-500/20 text-sm text-white min-h-[80px] whitespace-pre-wrap">
                        {aiSuggestion}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAiModal(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]
                                 text-slate-300 text-sm font-medium hover:bg-white/[0.04] transition-all"
                    >
                      Cancelar (gratis)
                    </button>
                    <button
                      onClick={acceptAiSuggestion}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                                 text-white font-semibold text-sm hover:shadow-neon-purple transition-all"
                    >
                      Usar sugestao (1 credito)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 space-y-3">
                  <Image
                    src="/mascot/timm-search.png"
                    alt="Timm"
                    width={48}
                    height={48}
                  />
                  <p className="text-sm text-slate-400">Nao foi possivel gerar uma sugestao.</p>
                  <button
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]
                               text-slate-300 text-sm hover:bg-white/[0.04] transition-all"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NovoAnuncioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>}>
      <NovoAnuncioContent />
    </Suspense>
  )
}
