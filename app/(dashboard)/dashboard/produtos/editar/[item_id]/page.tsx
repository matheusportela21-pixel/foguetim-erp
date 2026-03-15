'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter }                       from 'next/navigation'
import {
  ArrowLeft, Save, AlertCircle,
  X, ImageOff, Plus, Info, Loader2, ExternalLink,
  ChevronRight, Tag, Box, Settings, List,
  Zap, UploadCloud,
} from 'lucide-react'
import { uploadImageToML } from '@/lib/ml-image-upload'

/** Attribute schema from /api/mercadolivre/categories/[id]/attributes — defined locally to avoid bracket path issues */
interface CategoryAttribute {
  id:                string
  name:              string
  type:              string   // 'string' | 'number' | 'boolean' | 'list'
  required:          boolean
  isVariation:       boolean
  values?:           { id: string; name: string }[]
  hint?:             string
  value_max_length?: number
}

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

interface Picture {
  id:         string
  url:        string
  secure_url: string
}

interface ItemAttribute {
  id:         string
  name:       string
  value_name: string | null
}

interface SaleTerm {
  id:         string
  name:       string
  value_name: string | null
}

interface PlanData {
  id:                  string
  title:               string
  price:               number
  original_price:      number | null
  available_quantity:  number
  sold_quantity:       number
  status:              string
  permalink:           string
  thumbnail:           string
  pictures:            Picture[]
  listing_type_id:     string
  condition:           string
  date_created:        string
  last_updated:        string
  user_product_id:     string | null
  attributes:          ItemAttribute[]
  shipping: {
    free_shipping?:  boolean
    mode?:           string
    local_pick_up?:  boolean
    logistic_type?:  string
    tags?:           string[]
  }
  seller_custom_field: string | null
  gtin:                string[] | null
  sale_terms:          SaleTerm[]
  buying_mode:         string
  category_id:         string
  description_text:    string
}

interface SiblingsData {
  user_product_id: string | null
  category_id:     string
  plans:           PlanData[]
  attributes:      ItemAttribute[]
  ml_user_id:      number
}

interface PlanEdits {
  price:               number
  available_quantity:  number
  condition:           string
  listing_type_id:     string
  seller_custom_field: string
  free_shipping:       boolean
  flex_shipping:       boolean
  local_pick_up:       boolean
  description_text:    string
  warranty:            string
}

interface PlanChange {
  planId:   string
  planIdx:  number
  field:    string
  label:    string
  from:     string
  to:       string
  apiField: string
  value:    unknown
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════ */

/** Corrected ML listing type labels */
const LISTING_TYPE_LABELS: Record<string, string> = {
  gold_pro:      'Premium',
  gold_special:  'Clássico',
  free:          'Gratuito',
  gold_premium:  'Diamante',
  gold:          'Ouro',
  silver:        'Prata',
  bronze:        'Bronze',
}

function listingLabel(lt: string): string {
  return LISTING_TYPE_LABELS[lt] ?? lt ?? '—'
}

const EDITABLE_LISTING_TYPES = [
  { value: 'gold_pro',     label: 'Premium' },
  { value: 'gold_special', label: 'Clássico' },
]

const CONDITIONS  = ['new', 'used', 'not_specified']
const COND_LABELS: Record<string, string> = { new: 'Novo', used: 'Usado', not_specified: 'Não especificado' }

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusConfig(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active:       { label: 'Ativo',      cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
    paused:       { label: 'Pausado',    cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
    closed:       { label: 'Encerrado', cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
    under_review: { label: 'Em revisão', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  }
  return map[s] ?? { label: s, cls: 'bg-slate-700 text-slate-400 border-slate-600' }
}

/* ══════════════════════════════════════════════════════════════════════════
   PRIMITIVE UI COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Field({ label, changed = false, required = false, children, hint }: {
  label: string; changed?: boolean; required?: boolean; children: React.ReactNode; hint?: string
}) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-xs mb-1.5 font-medium ${changed ? 'text-yellow-400' : 'text-slate-500'}`}>
        {label}
        {required && (
          <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Obrigatório</span>
        )}
        {changed && (
          <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded-full ml-auto">alterado</span>
        )}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, changed, placeholder, readOnly, maxLength }: {
  value: string; onChange?: (v: string) => void; changed?: boolean
  placeholder?: string; readOnly?: boolean; maxLength?: number
}) {
  return (
    <input
      type="text" value={value} readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors
        ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}
        ${changed ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
    />
  )
}

function Toggle({ value, onChange, label, changed }: {
  value: boolean; onChange: (v: boolean) => void; label?: string; changed?: boolean
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-dark-700 border border-white/[0.1]'} ${changed ? 'ring-2 ring-yellow-400/30' : ''}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      {label && <span className="text-xs text-slate-400">{value ? label.split('/')[0] : label.split('/')[1] ?? label.split('/')[0]}</span>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ATTRIBUTE FIELD — renders correct input by attribute type
══════════════════════════════════════════════════════════════════════════ */

function AttributeField({ attr, value, onChange }: {
  attr:     CategoryAttribute
  value:    string
  onChange: (v: string) => void
}) {
  const changed = false // tracked externally

  const cls = `w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
    ${changed ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`

  if (attr.type === 'list' && attr.values?.length) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">— Selecione —</option>
        {attr.values.map(v => (
          <option key={v.id} value={v.name}>{v.name}</option>
        ))}
      </select>
    )
  }

  if (attr.type === 'boolean') {
    return (
      <div className="flex gap-2 pt-1">
        {['Sim', 'Não'].map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all
              ${value === opt ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'border-white/[0.08] text-slate-500 hover:text-slate-300'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  if (attr.type === 'number') {
    return (
      <input
        type="number" value={value}
        onChange={e => onChange(e.target.value)}
        className={cls}
      />
    )
  }

  // Default: string
  return (
    <input
      type="text" value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={attr.value_max_length}
      placeholder={attr.hint ?? `Informe ${attr.name}`}
      className={cls}
    />
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   FLEX WARNING MODAL
══════════════════════════════════════════════════════════════════════════ */

function FlexWarningModal({ onConfirm, onCancel }: {
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/70">
      <div className="bg-dark-800 border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Habilitar Envio Flex?</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Mercado Envios — Entrega Rápida</p>
          </div>
        </div>
        <p className="text-xs text-amber-300 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-3 py-2.5">
          ⚠️ O Flex exige que você prepare e envie o pedido <strong>no mesmo dia</strong>.
          Certifique-se de que consegue cumprir o prazo antes de ativar.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 text-sm font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all">
            Entendo, ativar Flex
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PLAN CARD
══════════════════════════════════════════════════════════════════════════ */

function PlanCard({
  plan, edits, setEdits, idx,
}: {
  plan:     PlanData
  edits:    PlanEdits
  setEdits: (e: PlanEdits) => void
  idx:      number
}) {
  const [showFlexWarning, setShowFlexWarning] = useState(false)
  const sc = statusConfig(plan.status)

  const isFlexActive = plan.shipping?.tags?.includes('self_service_in') ?? false

  function orig<K extends keyof PlanEdits>(key: K): PlanEdits[K] {
    switch (key) {
      case 'price':               return plan.price as PlanEdits[K]
      case 'available_quantity':  return plan.available_quantity as PlanEdits[K]
      case 'condition':           return plan.condition as PlanEdits[K]
      case 'listing_type_id':     return plan.listing_type_id as PlanEdits[K]
      case 'seller_custom_field': return (plan.seller_custom_field ?? '') as PlanEdits[K]
      case 'free_shipping':       return (plan.shipping?.free_shipping ?? false) as PlanEdits[K]
      case 'flex_shipping':       return isFlexActive as PlanEdits[K]
      case 'local_pick_up':       return (plan.shipping?.local_pick_up ?? false) as PlanEdits[K]
      case 'description_text':    return plan.description_text as PlanEdits[K]
      case 'warranty':            return (plan.sale_terms?.find(t => t.id === 'WARRANTY_TYPE')?.value_name ?? '') as PlanEdits[K]
      default:                    return '' as PlanEdits[K]
    }
  }

  function changed<K extends keyof PlanEdits>(key: K) {
    return edits[key] !== orig(key)
  }

  const isFreeType = plan.listing_type_id === 'free'

  return (
    <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-[10px] font-bold text-purple-400">
          {idx + 1}
        </div>
        <div>
          <p className="text-xs font-bold text-white">Plano {idx + 1} — {plan.id}</p>
          <p className="text-[10px] text-slate-500">{listingLabel(plan.listing_type_id)} · {plan.sold_quantity} vendas</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
          <a href={plan.permalink} target="_blank" rel="noopener noreferrer"
            className="p-1 text-slate-600 hover:text-yellow-400 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Row 1: price, listing type, condition, stock */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Preço (R$)" changed={changed('price')}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
              <input
                type="number" value={edits.price} min={0.01} step={0.01}
                onChange={e => setEdits({ ...edits, price: parseFloat(e.target.value) || 0 })}
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                  ${changed('price') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1">Atual: {fmtBRL(plan.price)}</p>
          </Field>

          <Field label="Tipo de anúncio" changed={changed('listing_type_id')}>
            {isFreeType ? (
              <div className="px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.08] text-sm text-slate-400">
                Gratuito <span className="text-[9px] text-slate-600">(não editável)</span>
              </div>
            ) : (
              <select
                value={edits.listing_type_id}
                onChange={e => setEdits({ ...edits, listing_type_id: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                  ${changed('listing_type_id') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
              >
                {EDITABLE_LISTING_TYPES.map(lt => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            )}
            {changed('listing_type_id') && (
              <p className="text-[10px] text-blue-400 mt-1">Conversão gratuita — sem custo adicional</p>
            )}
          </Field>

          <Field label="Condição" changed={changed('condition')}>
            <select
              value={edits.condition}
              onChange={e => setEdits({ ...edits, condition: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                ${changed('condition') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
            >
              {CONDITIONS.map(c => <option key={c} value={c}>{COND_LABELS[c] ?? c}</option>)}
            </select>
          </Field>

          <Field label="Estoque" changed={changed('available_quantity')}>
            <input
              type="number" value={edits.available_quantity} min={0} step={1}
              onChange={e => setEdits({ ...edits, available_quantity: Math.max(0, Math.floor(parseFloat(e.target.value) || 0)) })}
              className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                ${changed('available_quantity') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
            />
            <p className="text-[10px] text-slate-600 mt-1">Atual: {plan.available_quantity}</p>
          </Field>
        </div>

        {/* Row 2: warranty, SKU */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Garantia" changed={changed('warranty')}>
            <TextInput
              value={edits.warranty}
              onChange={v => setEdits({ ...edits, warranty: v })}
              changed={changed('warranty')}
              placeholder="Ex: 12 meses"
            />
          </Field>

          <Field label="SKU do Vendedor" changed={changed('seller_custom_field')}>
            <TextInput
              value={edits.seller_custom_field}
              onChange={v => setEdits({ ...edits, seller_custom_field: v })}
              changed={changed('seller_custom_field')}
              placeholder="Código interno"
            />
          </Field>
        </div>

        {/* Shipping section */}
        <div className="pt-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Envio</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Free shipping */}
            <div className={`px-3 py-2.5 rounded-xl border transition-colors ${changed('free_shipping') ? 'border-yellow-400/20 bg-yellow-400/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Frete Grátis</p>
              <Toggle
                value={edits.free_shipping}
                onChange={v => setEdits({ ...edits, free_shipping: v })}
                label="Sim/Não"
                changed={changed('free_shipping')}
              />
            </div>

            {/* Flex */}
            <div className={`px-3 py-2.5 rounded-xl border transition-colors ${changed('flex_shipping') ? 'border-yellow-400/20 bg-yellow-400/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <p className="text-[10px] font-semibold text-slate-400">Envio Flex</p>
              </div>
              <Toggle
                value={edits.flex_shipping}
                onChange={v => {
                  if (v && !edits.flex_shipping) {
                    setShowFlexWarning(true)
                  } else {
                    setEdits({ ...edits, flex_shipping: v })
                  }
                }}
                label="Ativo/Inativo"
                changed={changed('flex_shipping')}
              />
              <p className="text-[9px] text-slate-600 mt-1">Entrega rápida no mesmo dia</p>
            </div>

            {/* Local pick up */}
            <div className={`px-3 py-2.5 rounded-xl border transition-colors ${changed('local_pick_up') ? 'border-yellow-400/20 bg-yellow-400/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Retirada Pessoal</p>
              <Toggle
                value={edits.local_pick_up}
                onChange={v => setEdits({ ...edits, local_pick_up: v })}
                label="Sim/Não"
                changed={changed('local_pick_up')}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <Field
          label={`Descrição do Plano ${idx + 1}`}
          changed={changed('description_text')}
          hint="Apenas texto simples. Sem HTML, negrito ou formatação especial."
        >
          <div className="flex justify-between mb-1">
            <div className="flex items-start gap-1.5">
              <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-[10px] text-blue-300">Plain text apenas</span>
            </div>
            <span className="text-[10px] text-slate-600">{edits.description_text.length} chars</span>
          </div>
          <textarea
            value={edits.description_text}
            onChange={e => setEdits({ ...edits, description_text: e.target.value })}
            rows={5}
            placeholder="Descrição do produto..."
            className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 resize-none transition-colors
              ${changed('description_text') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
          />
        </Field>
      </div>

      {showFlexWarning && (
        <FlexWarningModal
          onConfirm={() => { setEdits({ ...edits, flex_shipping: true }); setShowFlexWarning(false) }}
          onCancel={() => setShowFlexWarning(false)}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   IMAGE UPLOAD ZONE
══════════════════════════════════════════════════════════════════════════ */

function ImageUploadZone({ itemId, onUploaded }: { itemId: string; onUploaded: () => void }) {
  const inputRef          = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [msg, setMsg]             = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setProgress(0)
    setMsg('')
    const result = await uploadImageToML(file, itemId, pct => setProgress(pct))
    setUploading(false)
    if (result.success) {
      setMsg('✅ Imagem enviada ao Mercado Livre!')
      setTimeout(() => { setMsg(''); onUploaded() }, 2000)
    } else {
      setMsg(`❌ ${result.error}`)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer
        ${dragging ? 'border-purple-500/60 bg-purple-500/[0.05]' : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'}`}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef} type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={onInputChange}
        className="hidden"
      />
      {uploading ? (
        <div className="space-y-2">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Enviando... {progress}%</p>
          <div className="w-full h-1 bg-dark-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <UploadCloud className="w-6 h-6 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">Arraste uma imagem ou <span className="text-purple-400 underline">clique para selecionar</span></p>
          <p className="text-[10px] text-slate-600">JPG ou PNG · Mínimo 500×500px · Máx 10MB · Fundo branco recomendado</p>
        </div>
      )}
      {msg && (
        <p className={`mt-2 text-xs font-semibold ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════════════════════════════════ */

function ConfirmModal({
  changes, onCancel, onConfirm, saving, saveLog,
}: {
  changes:   PlanChange[]
  onCancel:  () => void
  onConfirm: () => void
  saving:    boolean
  saveLog:   string[]
}) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70">
      <div className="bg-dark-800 border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
        <p className="text-sm font-bold text-white">Confirmar alterações no ML</p>

        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {changes.map((c, i) => (
            <div key={i} className="px-3 py-2 bg-white/[0.03] rounded-xl">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                Plano {c.planIdx + 1} ({c.planId}) — {c.label}
              </p>
              {c.field !== 'description_text' ? (
                <p className="text-xs text-slate-300">
                  <span className="line-through text-slate-600">{c.from}</span>
                  {' → '}
                  <span className="text-green-400">{c.to}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400">Descrição atualizada</p>
              )}
            </div>
          ))}
        </div>

        <div className="px-3 py-2.5 bg-blue-500/[0.08] border border-blue-500/[0.15] rounded-xl text-[11px] text-blue-300">
          Estas alterações serão aplicadas diretamente no Mercado Livre. Podem levar alguns minutos para aparecer.
        </div>

        {saveLog.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto bg-black/20 rounded-xl p-3">
            {saveLog.map((l, i) => (
              <p key={i} className={`text-[11px] font-mono ${l.startsWith('✅') ? 'text-green-400' : l.startsWith('❌') ? 'text-red-400' : 'text-slate-400'}`}>{l}</p>
            ))}
          </div>
        )}

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-3.5 h-3.5 accent-purple-500" />
          <span className="text-[11px] text-slate-400">Confirmo que revisei todas as alterações acima</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] transition-all disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!confirmed || saving}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : 'Confirmar e salvar no ML'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function EditarAnuncioPage() {
  const params  = useParams<{ item_id: string }>()
  const router  = useRouter()
  const item_id = params.item_id

  const [data, setData]       = useState<SiblingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Shared root title
  const [rootTitle, setRootTitle]             = useState('')
  const [originalTitle, setOriginalTitle]     = useState('')

  // Per-plan edits
  const [planEdits, setPlanEdits]             = useState<PlanEdits[]>([])
  const [originalEdits, setOriginalEdits]     = useState<PlanEdits[]>([])

  // Category attributes (schema from API)
  const [categoryAttrs, setCategoryAttrs]     = useState<CategoryAttribute[]>([])
  const [attrEdits, setAttrEdits]             = useState<Record<string, string>>({})
  const [originalAttrEdits, setOriginalAttrEdits] = useState<Record<string, string>>({})
  const [attrsLoading, setAttrsLoading]       = useState(false)

  // Image URL add
  const [newImageUrl, setNewImageUrl]         = useState('')
  const [addingImage, setAddingImage]         = useState(false)
  const [imageMsg, setImageMsg]               = useState('')

  // Confirm/save state
  const [showConfirm, setShowConfirm]         = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [saveLog, setSaveLog]                 = useState<string[]>([])
  const [saveResult, setSaveResult]           = useState<{ ok: boolean; msg: string } | null>(null)

  /* ── Load siblings + category attributes ─────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/mercadolivre/items/${item_id}/siblings`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao carregar')
      const d: SiblingsData = json
      setData(d)

      const title = d.plans[0]?.title ?? ''
      setRootTitle(title)
      setOriginalTitle(title)

      const edits: PlanEdits[] = d.plans.map(p => ({
        price:               p.price,
        available_quantity:  p.available_quantity,
        condition:           p.condition,
        listing_type_id:     p.listing_type_id,
        seller_custom_field: p.seller_custom_field ?? '',
        free_shipping:       p.shipping?.free_shipping ?? false,
        flex_shipping:       p.shipping?.tags?.includes('self_service_in') ?? false,
        local_pick_up:       p.shipping?.local_pick_up ?? false,
        description_text:    p.description_text,
        warranty:            p.sale_terms?.find(t => t.id === 'WARRANTY_TYPE')?.value_name ?? '',
      }))
      setPlanEdits(edits)
      setOriginalEdits(JSON.parse(JSON.stringify(edits)))

      // Build initial attr edits from item's attribute values
      const attrs: Record<string, string> = {}
      for (const a of d.attributes) {
        attrs[a.id] = a.value_name ?? ''
      }
      setAttrEdits(attrs)
      setOriginalAttrEdits(JSON.parse(JSON.stringify(attrs)))

      // Fetch category attributes schema
      if (d.category_id) {
        setAttrsLoading(true)
        fetch(`/api/mercadolivre/categories/${d.category_id}/attributes`)
          .then(r => r.json())
          .then((schemaAttrs: CategoryAttribute[]) => {
            setCategoryAttrs(schemaAttrs)
            // Seed any missing attr edits with empty string
            setAttrEdits(prev => {
              const next = { ...prev }
              for (const a of schemaAttrs) {
                if (!(a.id in next)) next[a.id] = ''
              }
              return next
            })
            setOriginalAttrEdits(prev => {
              const next = { ...prev }
              for (const a of schemaAttrs) {
                if (!(a.id in next)) next[a.id] = ''
              }
              return next
            })
          })
          .catch(e => console.error('[category attrs]', e))
          .finally(() => setAttrsLoading(false))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [item_id])

  useEffect(() => { load() }, [load])

  /* ── Compute all changes ─────────────────────────────────────────────── */
  const allChanges: PlanChange[] = []

  if (data) {
    // Root title changes → all plans
    if (rootTitle.trim() !== originalTitle) {
      data.plans.forEach((p, i) => {
        allChanges.push({
          planId: p.id, planIdx: i,
          field: 'title', label: 'Título',
          from: originalTitle, to: rootTitle.trim(),
          apiField: 'title', value: rootTitle.trim(),
        })
      })
    }

    // Per-plan field changes
    data.plans.forEach((plan, i) => {
      const edits = planEdits[i]
      const orig  = originalEdits[i]
      if (!edits || !orig) return

      const fieldMap: {
        key: keyof PlanEdits; label: string; apiField: string; fmt?: (v: unknown) => string
      }[] = [
        { key: 'price',              label: 'Preço',          apiField: 'price',              fmt: v => fmtBRL(v as number) },
        { key: 'available_quantity', label: 'Estoque',        apiField: 'stock'               },
        { key: 'condition',          label: 'Condição',       apiField: 'condition',          fmt: v => COND_LABELS[v as string] ?? String(v) },
        { key: 'listing_type_id',    label: 'Tipo',           apiField: 'listing_type_id',    fmt: v => listingLabel(v as string) },
        { key: 'free_shipping',      label: 'Frete Grátis',   apiField: 'free_shipping',      fmt: v => v ? 'Sim' : 'Não' },
        { key: 'flex_shipping',      label: 'Envio Flex',     apiField: 'flex_shipping',      fmt: v => v ? 'Ativo' : 'Inativo' },
        { key: 'local_pick_up',      label: 'Retirada Pessoal', apiField: 'local_pick_up',   fmt: v => v ? 'Sim' : 'Não' },
        { key: 'description_text',   label: 'Descrição',      apiField: 'description'         },
        { key: 'seller_custom_field',label: 'SKU',            apiField: 'seller_custom_field' },
      ]

      for (const fm of fieldMap) {
        if (edits[fm.key] !== orig[fm.key]) {
          allChanges.push({
            planId:   plan.id,
            planIdx:  i,
            field:    fm.key,
            label:    fm.label,
            from:     fm.fmt ? fm.fmt(orig[fm.key]) : String(orig[fm.key]),
            to:       fm.fmt ? fm.fmt(edits[fm.key]) : String(edits[fm.key]),
            apiField: fm.apiField,
            value:    edits[fm.key],
          })
        }
      }
    })

    // Attribute changes → sent to first plan
    if (data.plans[0]) {
      const changedAttrs = Object.entries(attrEdits).filter(([id, v]) => v !== (originalAttrEdits[id] ?? ''))
      if (changedAttrs.length > 0) {
        const payload = changedAttrs.map(([id, value_name]) => ({ id, value_name }))
        allChanges.push({
          planId:   data.plans[0].id,
          planIdx:  0,
          field:    'attributes',
          label:    `Atributos (${changedAttrs.length} alterado(s))`,
          from:     changedAttrs.map(([id]) => `${id}=${originalAttrEdits[id] ?? '—'}`).join(', '),
          to:       changedAttrs.map(([id, v]) => `${id}=${v}`).join(', '),
          apiField: 'attributes',
          value:    payload,
        })
      }
    }
  }

  const hasChanges = allChanges.length > 0

  /* ── Save ────────────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!data || allChanges.length === 0) return
    setSaving(true)
    setSaveLog([])
    const log: string[] = []

    type PF = 'title' | 'price' | 'stock' | 'status' | 'description' |
              'listing_type_id' | 'condition' | 'seller_custom_field' |
              'free_shipping' | 'flex_shipping' | 'local_pick_up' | 'attributes'

    const apiFieldMap: Record<string, PF> = {
      title:               'title',
      price:               'price',
      stock:               'stock',
      condition:           'condition',
      listing_type_id:     'listing_type_id',
      seller_custom_field: 'seller_custom_field',
      free_shipping:       'free_shipping',
      flex_shipping:       'flex_shipping',
      local_pick_up:       'local_pick_up',
      description:         'description',
      attributes:          'attributes',
    }

    // Group by plan
    const byPlan = new Map<string, PlanChange[]>()
    for (const c of allChanges) {
      const arr = byPlan.get(c.planId) ?? []
      arr.push(c)
      byPlan.set(c.planId, arr)
    }

    for (const [planId, changes] of Array.from(byPlan.entries())) {
      const planIdx = data.plans.findIndex(p => p.id === planId)
      log.push(`Salvando Plano ${planIdx + 1} (${planId})...`)
      setSaveLog([...log])

      for (const c of changes) {
        const patchField = apiFieldMap[c.apiField]
        if (!patchField) continue

        const res = await fetch(`/api/mercadolivre/items/${planId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ field: patchField, value: c.value }),
        })

        if (res.ok) {
          log.push(`  ✅ ${c.label} atualizado`)
        } else {
          const d = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
          log.push(`  ❌ ${c.label}: ${d.error ?? 'Erro'}`)
        }
        setSaveLog([...log])
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    setSaving(false)
    const hasErrors = log.some(l => l.includes('❌'))
    const finalMsg  = hasErrors
      ? '⚠️ Concluído com alguns erros. Verifique acima.'
      : '✅ Todos os planos atualizados com sucesso!'
    log.push(finalMsg)
    setSaveLog([...log])

    if (!hasErrors) {
      setSaveResult({ ok: true, msg: finalMsg })
      setTimeout(() => { setShowConfirm(false); setSaveResult(null); load() }, 3000)
    } else {
      setSaveResult({ ok: false, msg: finalMsg })
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  const firstPlan    = data?.plans[0]
  const titleChanged = rootTitle.trim() !== originalTitle
  const allSold      = data ? data.plans.every(p => p.sold_quantity > 0) : false

  return (
    <div className="min-h-screen bg-[#03050f]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-[#03050f]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <button onClick={() => router.push('/dashboard/produtos')} className="hover:text-slate-300 transition-colors shrink-0">
              Produtos
            </button>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="shrink-0">Mercado Livre</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-white font-semibold truncate">{firstPlan?.title ?? item_id}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {firstPlan && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusConfig(firstPlan.status).cls}`}>
                {statusConfig(firstPlan.status).label}
              </span>
            )}
            <button
              onClick={() => router.push('/dashboard/produtos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cancelar
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!hasChanges || loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Atualizar {hasChanges ? `(${allChanges.length})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {saveResult && (
          <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${saveResult.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
            {saveResult.msg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Carregando dados do anúncio...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Erro ao carregar</p>
            <p className="text-xs text-slate-500 max-w-sm text-center">{error}</p>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-bold hover:bg-white/[0.1] transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : data && (
          <>
            {/* § 1 — Informação Básica */}
            <Section icon={Tag} title="Informação Básica">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Nome do Produto (família)"
                  changed={titleChanged}
                  hint={`${rootTitle.length}/60 caracteres`}
                >
                  {allSold && (
                    <div className="flex items-start gap-1.5 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-amber-400">Todos os planos têm vendas. O ML pode rejeitar a alteração de título.</p>
                    </div>
                  )}
                  <input
                    type="text" value={rootTitle} onChange={e => setRootTitle(e.target.value)} maxLength={60}
                    className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                      ${titleChanged ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
                  />
                </Field>
                <div className="space-y-4">
                  <Field label="Categoria (somente leitura)">
                    <TextInput value={data.category_id} readOnly />
                  </Field>
                  <Field label="User Product ID (somente leitura)">
                    <TextInput value={data.user_product_id ?? '—'} readOnly />
                  </Field>
                </div>
              </div>
            </Section>

            {/* § 2 — Atributos */}
            <Section icon={List} title="Atributos do Produto">
              {attrsLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando atributos da categoria...
                </div>
              ) : categoryAttrs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categoryAttrs.slice(0, 18).map(attr => {
                    const val     = attrEdits[attr.id] ?? ''
                    const origVal = originalAttrEdits[attr.id] ?? ''
                    const changed = val !== origVal
                    return (
                      <Field
                        key={attr.id}
                        label={attr.name}
                        required={attr.required}
                        changed={changed}
                        hint={attr.hint}
                      >
                        <AttributeField
                          attr={attr}
                          value={val}
                          onChange={v => setAttrEdits(prev => ({ ...prev, [attr.id]: v }))}
                        />
                      </Field>
                    )
                  })}
                </div>
              ) : data.attributes.length > 0 ? (
                // Fallback: show readonly values when no schema loaded
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.attributes.slice(0, 12).map(attr => (
                    <div key={attr.id} className="px-3 py-2.5 bg-white/[0.02] rounded-xl">
                      <p className="text-[10px] text-slate-600 mb-0.5">{attr.name}</p>
                      <p className="text-xs font-semibold text-slate-300">{attr.value_name || '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 py-2">Nenhum atributo disponível para esta categoria.</p>
              )}
            </Section>

            {/* § 3 — Mídia */}
            {firstPlan && (
              <Section icon={ImageOff} title="Mídia">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400">
                      {firstPlan.pictures?.length ?? 0}/12 imagens
                    </p>
                    <div className="flex items-start gap-1.5 px-3 py-1.5 bg-blue-500/[0.08] border border-blue-500/[0.15] rounded-lg">
                      <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-300">Primeira imagem deve ter fundo branco puro (min 500×500px)</p>
                    </div>
                  </div>

                  {/* Grid */}
                  {(firstPlan.pictures ?? []).length > 0 && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {(firstPlan.pictures ?? []).map((pic, idx) => (
                        <div key={pic.id} className="relative group aspect-square rounded-xl overflow-hidden bg-dark-700 border border-white/[0.06]">
                          <img
                            src={pic.secure_url.replace('http://', 'https://')}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                          {idx === 0 && (
                            <div className="absolute top-1 left-1 bg-yellow-500 text-[8px] font-bold text-black px-1.5 py-0.5 rounded">Principal</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload from computer */}
                  <ImageUploadZone itemId={item_id} onUploaded={load} />

                  {/* Add by URL */}
                  <div>
                    <p className="text-[10px] text-slate-600 mb-2">Ou adicionar por URL externa:</p>
                    <div className="flex gap-2">
                      <input
                        value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 text-sm rounded-xl bg-dark-700 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                      />
                      <button
                        onClick={async () => {
                          if (!newImageUrl.trim()) return
                          setAddingImage(true)
                          const allUrls = [
                            ...(firstPlan.pictures ?? []).map(p => p.secure_url),
                            newImageUrl.trim(),
                          ]
                          const res = await fetch(`/api/mercadolivre/items/${item_id}/pictures`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ urls: allUrls }),
                          })
                          setAddingImage(false)
                          if (res.ok) {
                            setImageMsg('✅ Imagem adicionada!')
                            setNewImageUrl('')
                            load()
                          } else {
                            const d = await res.json()
                            setImageMsg(`❌ ${d.error}`)
                          }
                          setTimeout(() => setImageMsg(''), 4000)
                        }}
                        disabled={addingImage || !newImageUrl.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
                      >
                        {addingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Adicionar
                      </button>
                    </div>
                    {imageMsg && (
                      <p className={`text-xs mt-1 ${imageMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{imageMsg}</p>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* § 4 — Planos de venda */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 px-1">
                <Settings className="w-4 h-4 text-slate-500" />
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  Informações de Venda — {data.plans.length} plano(s)
                </p>
              </div>
              {data.plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  edits={planEdits[i] ?? {
                    price:               plan.price,
                    available_quantity:  plan.available_quantity,
                    condition:           plan.condition,
                    listing_type_id:     plan.listing_type_id,
                    seller_custom_field: plan.seller_custom_field ?? '',
                    free_shipping:       plan.shipping?.free_shipping ?? false,
                    flex_shipping:       plan.shipping?.tags?.includes('self_service_in') ?? false,
                    local_pick_up:       plan.shipping?.local_pick_up ?? false,
                    description_text:    plan.description_text,
                    warranty:            '',
                  }}
                  setEdits={e => {
                    const next = [...planEdits]
                    next[i] = e
                    setPlanEdits(next)
                  }}
                  idx={i}
                />
              ))}

              <button disabled
                className="w-full py-3 rounded-2xl border border-dashed border-white/[0.08] text-xs text-slate-600 flex items-center justify-center gap-2 cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> Adicionar Plano de Venda
                <span className="ml-1 text-[9px] bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full">Em breve</span>
              </button>
            </div>

            {/* § 5 — Pacote */}
            <Section icon={Box} title="Informações do Pacote">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Peso (g)',          placeholder: '500' },
                  { label: 'Comprimento (cm)',   placeholder: '20'  },
                  { label: 'Largura (cm)',       placeholder: '15'  },
                  { label: 'Altura (cm)',        placeholder: '10'  },
                ].map(f => (
                  <Field key={f.label} label={f.label}>
                    <input
                      type="number" min={0} placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                    />
                  </Field>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 mt-3">Medidas do pacote afetam o cálculo de frete. Disponível em breve via API.</p>
            </Section>
          </>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <ConfirmModal
          changes={allChanges}
          onCancel={() => { if (!saving) { setShowConfirm(false); setSaveLog([]) } }}
          onConfirm={handleSave}
          saving={saving}
          saveLog={saveLog}
        />
      )}
    </div>
  )
}
