'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter }    from 'next/navigation'
import {
  ArrowLeft, Save, AlertCircle, X, Plus, Info, Loader2, ExternalLink,
  ChevronRight, Zap, CheckCircle2, XCircle, AlertTriangle,
  Image as ImageIcon, UploadCloud, Copy, Eye, EyeOff, Package,
  Tag, FileText, Truck, BarChart2, Settings, List, ShoppingBag,
} from 'lucide-react'
import { uploadImageToML } from '@/lib/ml-image-upload'

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

interface Picture {
  id:         string
  url:        string
  secure_url: string
  size?:      string   // "WxH"
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

interface ShippingData {
  free_shipping?: boolean
  mode?:          string
  local_pick_up?: boolean
  logistic_type?: string
  tags?:          string[]
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
  shipping:            ShippingData
  seller_custom_field: string | null
  gtin:                string[] | null
  sale_terms:          SaleTerm[]
  buying_mode:         string
  category_id:         string
  description_text:    string
  catalog_listing?:    boolean
  catalog_product_id?: string | null
}

interface SiblingsData {
  user_product_id: string | null
  category_id:     string
  plans:           PlanData[]
  attributes:      ItemAttribute[]
  ml_user_id:      number
}

interface CategoryAttribute {
  id:               string
  name:             string
  type:             string
  required:         boolean
  isVariation:      boolean
  values?:          { id: string; name: string }[]
  hint?:            string
  value_max_length?: number
  tags?:            string[]
}

interface PlanEdits {
  price:               number
  stock:               number
  condition:           string
  listing_type_id:     string
  seller_custom_field: string
  warranty:            string
  free_shipping:       boolean
  flex_shipping:       boolean
  local_pick_up:       boolean
  description:         string
}

interface SharedEdits {
  title:      string
  ean:        string
  pkg_weight: string
  pkg_length: string
  pkg_width:  string
  pkg_height: string
}

interface ChangeItem {
  id:          string
  planId:      string
  planLabel:   string
  label:       string
  fromDisplay: string
  toDisplay:   string
}

interface ShippingLocation {
  id:   string
  name: string
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════════════════════════════════ */

const EXCLUDED_ATTR_IDS = new Set([
  'ALPHANUMERIC_MODEL', 'SELLER_SKU', 'GTIN', 'EAN',
  'PACKAGE_LENGTH', 'PACKAGE_WIDTH', 'PACKAGE_HEIGHT', 'PACKAGE_WEIGHT',
  'ITEM_CONDITION',
])

const LISTING_TYPE_LABELS: Record<string, string> = {
  gold_pro:     'Premium',
  gold_special: 'Clássico',
  free:         'Gratuito',
  gold_premium: 'Diamante',
  gold:         'Ouro',
  silver:       'Prata',
  bronze:       'Bronze',
}

const CONDITION_LABELS: Record<string, string> = {
  new:           'Novo',
  used:          'Usado',
  not_specified: 'Não especificado',
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:       { label: 'Ativo',      cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  paused:       { label: 'Pausado',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  closed:       { label: 'Encerrado', cls: 'bg-red-500/15   text-red-400   border-red-500/30'   },
  under_review: { label: 'Em revisão', cls: 'bg-blue-500/15  text-blue-400  border-blue-500/30'  },
}

const NAV_SECTIONS = [
  { id: 's1', label: 'Informação Básica'   },
  { id: 's2', label: 'Atributos'           },
  { id: 's3', label: 'Info do Anúncio'    },
  { id: 's4', label: 'Mídia'              },
  { id: 's5', label: 'Inf. de Venda'     },
  { id: 's6', label: 'Descrição'          },
  { id: 's7', label: 'Envio'              },
  { id: 's8', label: 'Pacote'             },
  { id: 's9', label: 'Saúde do Anúncio'  },
]

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function listingLabel(lt: string) { return LISTING_TYPE_LABELS[lt] ?? lt }
function condLabel(c: string)     { return CONDITION_LABELS[c] ?? c }

function getWarranty(plan: PlanData): string {
  return plan.sale_terms?.find(t => t.id === 'WARRANTY_TYPE')?.value_name ?? ''
}

function getFlexActive(plan: PlanData): boolean {
  return plan.shipping?.tags?.includes('self_service_in') ?? false
}

function parsePicSize(size?: string): { w: number; h: number } | null {
  if (!size) return null
  const parts = size.split('x')
  if (parts.length !== 2) return null
  const w = parseInt(parts[0], 10)
  const h = parseInt(parts[1], 10)
  return isNaN(w) || isNaN(h) ? null : { w, h }
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/* ══════════════════════════════════════════════════════════════════════════
   PRIMITIVE UI
══════════════════════════════════════════════════════════════════════════ */

const inputCls  = 'w-full px-3 py-2 text-sm rounded-lg bg-dark-700 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-colors'
const selectCls = inputCls

function SectionCard({ id, title, icon: Icon, sectionRef, children }: {
  id:         string
  title:      string
  icon:       React.ElementType
  sectionRef: (el: HTMLDivElement | null) => void
  children:   React.ReactNode
}) {
  return (
    <div id={id} ref={sectionRef} className="bg-dark-800 border border-white/[0.06] rounded-xl overflow-hidden scroll-mt-20">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({ label, required, changed, hint, children }: {
  label:    string
  required?: boolean
  changed?:  boolean
  hint?:     string
  children:  React.ReactNode
}) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-xs mb-1.5 font-medium ${changed ? 'text-yellow-400' : 'text-slate-500'}`}>
        {label}
        {required && <span className="text-[9px] font-bold bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">*</span>}
        {changed  && <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded ml-auto">alterado</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ATTRIBUTE FIELD with N/A button
══════════════════════════════════════════════════════════════════════════ */

function AttrField({ attr, value, isNA, onChange, onToggleNA }: {
  attr:       CategoryAttribute
  value:      string
  isNA:       boolean
  onChange:   (v: string) => void
  onToggleNA: () => void
}) {
  const naBtn = !attr.required && (
    <button
      onClick={onToggleNA}
      title="Marcar como não aplicável"
      className={`shrink-0 text-[10px] px-2 py-1 rounded transition-all ${
        isNA
          ? 'bg-amber-900/40 text-amber-400 border border-amber-700'
          : 'bg-dark-700 text-slate-500 border border-white/[0.08] hover:bg-dark-600'
      }`}
    >
      N/A
    </button>
  )

  if (attr.type === 'list' && Array.isArray(attr.values) && attr.values.length > 0) {
    return (
      <div className="flex gap-2">
        <select
          value={isNA ? '' : value}
          onChange={e => onChange(e.target.value)}
          disabled={isNA}
          className={selectCls + ' flex-1' + (isNA ? ' opacity-40 cursor-not-allowed' : '')}
        >
          <option value="">— Selecione —</option>
          {attr.values.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
        </select>
        {naBtn}
      </div>
    )
  }

  if (attr.type === 'boolean') {
    return (
      <div className="flex gap-2">
        {(['Sim', 'Não'] as const).map(opt => (
          <button
            key={opt}
            onClick={() => !isNA && onChange(opt)}
            disabled={isNA}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              !isNA && value === opt
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
            } ${isNA ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {opt}
          </button>
        ))}
        {naBtn}
      </div>
    )
  }

  if (attr.type === 'number') {
    return (
      <div className="flex gap-2">
        <input
          type="number" value={isNA ? '' : value}
          onChange={e => onChange(e.target.value)}
          disabled={isNA}
          placeholder={isNA ? 'N/A' : attr.hint ?? ''}
          className={inputCls + ' flex-1' + (isNA ? ' opacity-40 cursor-not-allowed' : '')}
        />
        {naBtn}
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <input
        type="text" value={isNA ? '' : value}
        onChange={e => onChange(e.target.value)}
        disabled={isNA}
        maxLength={attr.value_max_length}
        placeholder={isNA ? 'N/A' : (attr.hint ?? `Informe ${attr.name}`)}
        className={inputCls + ' flex-1' + (isNA ? ' opacity-40 cursor-not-allowed' : '')}
      />
      {naBtn}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PLAN TAG
══════════════════════════════════════════════════════════════════════════ */

function PlanTag({ plan, short }: { plan: PlanData; short?: boolean }) {
  const sc = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG['closed']
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-slate-500">{plan.id}</span>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sc.cls}`}>{sc.label}</span>
      {!short && (
        <span className="text-[9px] text-slate-600">{listingLabel(plan.listing_type_id)}</span>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════════════════════════════════ */

function ConfirmModal({ changes, saving, saveLog, onConfirm, onCancel }: {
  changes:   ChangeItem[]
  saving:    boolean
  saveLog:   string[]
  onConfirm: () => void
  onCancel:  () => void
}) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">Confirmar {changes.length} alteração(ões)</p>
          <button onClick={onCancel} disabled={saving} className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {changes.map(c => (
            <div key={c.id} className="px-3 py-2 bg-white/[0.03] rounded-lg">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                {c.planLabel} — {c.label}
              </p>
              <p className="text-xs text-slate-300">
                <span className="line-through text-slate-600">{c.fromDisplay || '—'}</span>
                {' → '}
                <span className="text-green-400">{c.toDisplay || '—'}</span>
              </p>
            </div>
          ))}
        </div>

        {saveLog.length > 0 && (
          <div className="bg-black/30 rounded-xl p-3 max-h-36 overflow-y-auto space-y-0.5">
            {saveLog.map((l, i) => (
              <p key={i} className={`text-[11px] font-mono ${l.startsWith('✅') ? 'text-green-400' : l.startsWith('❌') ? 'text-red-400' : 'text-slate-400'}`}>{l}</p>
            ))}
          </div>
        )}

        <div className="px-3 py-2.5 bg-blue-500/[0.07] border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
          Estas alterações serão aplicadas diretamente no Mercado Livre. Podem levar alguns minutos para aparecer.
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-3.5 h-3.5 accent-purple-500" />
          <span className="text-[11px] text-slate-400">Confirmo que revisei todas as alterações acima</span>
        </label>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 py-2.5 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] disabled:opacity-50 transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!confirmed || saving}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : 'Confirmar e salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   INLINE TOGGLE
══════════════════════════════════════════════════════════════════════════ */

function Toggle({ value, onChange, label, changed }: {
  value: boolean; onChange: (v: boolean) => void; label?: string; changed?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-dark-700 border border-white/[0.1]'} ${changed ? 'ring-2 ring-yellow-400/30' : ''}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      {label && <span className="text-xs text-slate-400">{value ? label.split('/')[0] : (label.split('/')[1] ?? label.split('/')[0])}</span>}
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

  /* ── data loading ─────────────────────────────────────────────────────── */
  const [data, setData]               = useState<SiblingsData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttribute[]>([])
  const [attrsLoading, setAttrsLoading]   = useState(false)
  const [showAllAttrs, setShowAllAttrs]   = useState(false)

  /* ── shipping locations ───────────────────────────────────────────────── */
  const [shippingLocations, setShippingLocations]     = useState<ShippingLocation[]>([])
  const [shippingLocationId, setShippingLocationId]   = useState('')

  /* ── shared edits ─────────────────────────────────────────────────────── */
  const [shared, setShared]         = useState<SharedEdits>({ title: '', ean: '', pkg_weight: '', pkg_length: '', pkg_width: '', pkg_height: '' })
  const [origShared, setOrigShared] = useState<SharedEdits>({ title: '', ean: '', pkg_weight: '', pkg_length: '', pkg_width: '', pkg_height: '' })

  /* ── per-plan edits ───────────────────────────────────────────────────── */
  const [planEdits, setPlanEdits]       = useState<Record<string, PlanEdits>>({})
  const [origPlanEdits, setOrigPlanEdits] = useState<Record<string, PlanEdits>>({})

  /* ── attribute edits ──────────────────────────────────────────────────── */
  const [attrEdits, setAttrEdits]       = useState<Record<string, string>>({})
  const [origAttrEdits, setOrigAttrEdits] = useState<Record<string, string>>({})
  const [naAttrs, setNaAttrs]           = useState<Set<string>>(new Set<string>())

  /* ── pictures ─────────────────────────────────────────────────────────── */
  const [pictures, setPictures]       = useState<Picture[]>([])
  const [origPictures, setOrigPictures] = useState<Picture[]>([])
  const [newImageUrl, setNewImageUrl]   = useState('')
  const [addImgOpen, setAddImgOpen]     = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const [imgMsg, setImgMsg]             = useState('')
  const uploadInputRef = useRef<HTMLInputElement>(null)

  /* ── save/confirm ─────────────────────────────────────────────────────── */
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveLog, setSaveLog]         = useState<string[]>([])
  const [saveResult, setSaveResult]   = useState<{ ok: boolean; msg: string } | null>(null)

  /* ── nav ──────────────────────────────────────────────────────────────── */
  const [activeSection, setActiveSection] = useState('s1')
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY + 120
      for (const { id } of NAV_SECTIONS) {
        const el = sectionRefs.current[id]
        if (!el) continue
        const { top, bottom } = el.getBoundingClientRect()
        const absTop    = top    + window.scrollY
        const absBottom = bottom + window.scrollY
        if (scrollY >= absTop && scrollY < absBottom) {
          setActiveSection(id)
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── load ─────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/mercadolivre/items/${item_id}/siblings`)
      const json = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error(String(json.error ?? 'Erro ao carregar'))
      if (json.error && (!Array.isArray(json.plans) || (json.plans as unknown[]).length === 0)) {
        throw new Error(String(json.error))
      }

      const d: SiblingsData = {
        user_product_id: json.user_product_id as string | null,
        category_id:     String(json.category_id ?? ''),
        plans:           Array.isArray(json.plans)      ? json.plans      as PlanData[]      : [],
        attributes:      Array.isArray(json.attributes) ? json.attributes as ItemAttribute[] : [],
        ml_user_id:      Number(json.ml_user_id ?? 0),
      }
      setData(d)

      // Shared: title + EAN (from attributes array, fallback to gtin field)
      const title = d.plans[0]?.title ?? ''
      const attrs = Array.isArray(d.attributes) ? d.attributes : []
      const eanFromAttrs = attrs.find(
        (a: ItemAttribute) => ['GTIN', 'EAN', 'BARCODE'].includes(a.id),
      )?.value_name ?? ''
      const skuFromAttrs = attrs.find(
        (a: ItemAttribute) => a.id === 'SELLER_SKU' || a.id === 'SKU',
      )?.value_name ?? ''

      const s: SharedEdits = {
        title,
        ean:        eanFromAttrs || d.plans[0]?.gtin?.[0] || '',
        pkg_weight: '',
        pkg_length: '',
        pkg_width:  '',
        pkg_height: '',
      }
      // Extract package dims from first plan attributes
      for (const a of attrs) {
        if (a.id === 'PACKAGE_WEIGHT') s.pkg_weight = a.value_name ?? ''
        if (a.id === 'PACKAGE_LENGTH') s.pkg_length = a.value_name ?? ''
        if (a.id === 'PACKAGE_WIDTH')  s.pkg_width  = a.value_name ?? ''
        if (a.id === 'PACKAGE_HEIGHT') s.pkg_height = a.value_name ?? ''
      }
      setShared(s)
      setOrigShared(JSON.parse(JSON.stringify(s)) as SharedEdits)

      // Per-plan edits
      const pe: Record<string, PlanEdits> = {}
      for (const plan of d.plans) {
        pe[plan.id] = {
          price:               plan.price,
          stock:               plan.available_quantity,
          condition:           plan.condition,
          listing_type_id:     plan.listing_type_id,
          seller_custom_field: plan.seller_custom_field ?? skuFromAttrs,
          warranty:            getWarranty(plan),
          free_shipping:       plan.shipping?.free_shipping ?? false,
          flex_shipping:       getFlexActive(plan),
          local_pick_up:       plan.shipping?.local_pick_up ?? false,
          description:         plan.description_text ?? '',
        }
      }
      setPlanEdits(JSON.parse(JSON.stringify(pe)) as Record<string, PlanEdits>)
      setOrigPlanEdits(JSON.parse(JSON.stringify(pe)) as Record<string, PlanEdits>)

      // Attribute edits from item attributes (current values of this item)
      const ae: Record<string, string> = {}
      for (const a of attrs) {
        if (!EXCLUDED_ATTR_IDS.has(a.id)) {
          ae[a.id] = a.value_name ?? ''
        }
      }
      setAttrEdits(JSON.parse(JSON.stringify(ae)) as Record<string, string>)
      setOrigAttrEdits(JSON.parse(JSON.stringify(ae)) as Record<string, string>)

      // Pictures from first plan
      const pics = Array.isArray(d.plans[0]?.pictures) ? d.plans[0].pictures : []
      setPictures(pics)
      setOrigPictures(pics)

      // Fetch category breadcrumb name from public ML API
      if (d.category_id) {
        fetch(`https://api.mercadolibre.com/categories/${d.category_id}`)
          .then(r => r.ok
            ? r.json() as Promise<{ name?: string; path_from_root?: { id: string; name: string }[] }>
            : Promise.resolve({ name: undefined }),
          )
          .then(cat => {
            const breadcrumb = cat.path_from_root?.map(c => c.name).join(' > ') ?? cat.name
            setCategoryName(breadcrumb ?? d.category_id)
          })
          .catch(() => setCategoryName(d.category_id))
      }

      // Fetch category attributes schema (route handles filtering; page excludes dedicated fields)
      if (d.category_id) {
        setAttrsLoading(true)
        fetch(`/api/mercadolivre/categories/${d.category_id}/attributes`)
          .then(r => r.json() as Promise<unknown>)
          .then((raw: unknown) => {
            const schema: CategoryAttribute[] = Array.isArray(raw) ? (raw as CategoryAttribute[]) : []
            // Only exclude attrs handled by dedicated fields (SKU, EAN, package, condition)
            const filtered = schema.filter(a => !EXCLUDED_ATTR_IDS.has(a.id))
            setCategoryAttrs(filtered)
            // Seed attr edits for attrs not yet in the map
            setAttrEdits(prev => {
              const next = { ...prev }
              for (const a of filtered) {
                if (!(a.id in next)) next[a.id] = ''
              }
              return next
            })
            setOrigAttrEdits(prev => {
              const next = { ...prev }
              for (const a of filtered) {
                if (!(a.id in next)) next[a.id] = ''
              }
              return next
            })
          })
          .catch(() => { /* non-fatal */ })
          .finally(() => setAttrsLoading(false))
      }

      // Fetch shipping locations (graceful — falls back to read-only text if unavailable)
      if (d.ml_user_id) {
        fetch(`/api/mercadolivre/shipping-locations?ml_user_id=${d.ml_user_id}`)
          .then(r => r.json() as Promise<ShippingLocation[]>)
          .then(locs => {
            if (Array.isArray(locs) && locs.length > 0) {
              setShippingLocations(locs)
              setShippingLocationId(locs[0].id)
            }
          })
          .catch(() => { /* non-fatal */ })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [item_id])

  useEffect(() => { void load() }, [load])

  /* ── change detection ─────────────────────────────────────────────────── */
  const allChanges = useMemo<ChangeItem[]>(() => {
    if (!data) return []
    const changes: ChangeItem[] = []

    // Title (shared → all plans)
    if (shared.title.trim() !== origShared.title.trim()) {
      for (const plan of data.plans) {
        changes.push({
          id:          `title-${plan.id}`,
          planId:      plan.id,
          planLabel:   `Plano ${plan.id}`,
          label:       'Título',
          fromDisplay: origShared.title,
          toDisplay:   shared.title.trim(),
        })
      }
    }

    // EAN (→ first plan attributes)
    if (shared.ean !== origShared.ean && data.plans[0]) {
      changes.push({
        id:          'ean',
        planId:      data.plans[0].id,
        planLabel:   'Produto',
        label:       'EAN/GTIN',
        fromDisplay: origShared.ean || '—',
        toDisplay:   shared.ean   || '(remover)',
      })
    }

    // Category attributes (→ first plan)
    const changedAttrs = Object.entries(attrEdits).filter(([id, val]) => {
      const isNA    = naAttrs.has(id)
      const origVal = origAttrEdits[id] ?? ''
      const hadVal  = origVal.trim() !== ''
      if (isNA && hadVal)       return true   // removing a value
      if (!isNA && val !== origVal) return true
      return false
    })
    if (changedAttrs.length > 0 && data.plans[0]) {
      changes.push({
        id:          'attrs',
        planId:      data.plans[0].id,
        planLabel:   'Produto',
        label:       `Atributos (${changedAttrs.length} campo(s))`,
        fromDisplay: changedAttrs.map(([id]) => `${id}=${origAttrEdits[id] || '—'}`).join(', '),
        toDisplay:   changedAttrs.map(([id, v]) => naAttrs.has(id) ? `${id}=N/A` : `${id}=${v}`).join(', '),
      })
    }

    // Package (→ first plan attributes)
    const pkgFields: { key: keyof SharedEdits; attrId: string; label: string }[] = [
      { key: 'pkg_weight', attrId: 'PACKAGE_WEIGHT', label: 'Peso (g)'      },
      { key: 'pkg_length', attrId: 'PACKAGE_LENGTH', label: 'Comprimento (cm)' },
      { key: 'pkg_width',  attrId: 'PACKAGE_WIDTH',  label: 'Largura (cm)'  },
      { key: 'pkg_height', attrId: 'PACKAGE_HEIGHT', label: 'Altura (cm)'   },
    ]
    for (const f of pkgFields) {
      if (shared[f.key] !== origShared[f.key] && data.plans[0]) {
        changes.push({
          id:          `pkg-${f.attrId}`,
          planId:      data.plans[0].id,
          planLabel:   'Produto',
          label:       `Pacote — ${f.label}`,
          fromDisplay: origShared[f.key] || '—',
          toDisplay:   shared[f.key]   || '(remover)',
        })
      }
    }

    // Pictures (→ first plan)
    const picsDirty = pictures.length !== origPictures.length ||
      pictures.some((p, i) => p.secure_url !== origPictures[i]?.secure_url)
    if (picsDirty && data.plans[0]) {
      changes.push({
        id:          'pictures',
        planId:      data.plans[0].id,
        planLabel:   'Produto',
        label:       'Imagens',
        fromDisplay: `${origPictures.length} imagem(s)`,
        toDisplay:   `${pictures.length} imagem(s)`,
      })
    }

    // Per-plan fields
    for (const plan of data.plans) {
      const e = planEdits[plan.id]
      const o = origPlanEdits[plan.id]
      if (!e || !o) continue

      const planLabel = `Plano ${plan.id}`

      if (e.price !== o.price) {
        changes.push({ id: `${plan.id}-price`,    planId: plan.id, planLabel, label: 'Preço',           fromDisplay: fmtBRL(o.price),       toDisplay: fmtBRL(e.price) })
      }
      if (e.stock !== o.stock) {
        changes.push({ id: `${plan.id}-stock`,    planId: plan.id, planLabel, label: 'Estoque',         fromDisplay: String(o.stock),        toDisplay: String(e.stock) })
      }
      if (e.condition !== o.condition) {
        changes.push({ id: `${plan.id}-cond`,     planId: plan.id, planLabel, label: 'Condição',        fromDisplay: condLabel(o.condition), toDisplay: condLabel(e.condition) })
      }
      if (e.listing_type_id !== o.listing_type_id) {
        changes.push({ id: `${plan.id}-type`,     planId: plan.id, planLabel, label: 'Tipo',            fromDisplay: listingLabel(o.listing_type_id), toDisplay: listingLabel(e.listing_type_id) })
      }
      if (e.seller_custom_field !== o.seller_custom_field) {
        changes.push({ id: `${plan.id}-sku`,      planId: plan.id, planLabel, label: 'SKU',             fromDisplay: o.seller_custom_field || '—', toDisplay: e.seller_custom_field || '—' })
      }
      if (e.warranty !== o.warranty) {
        changes.push({ id: `${plan.id}-warranty`, planId: plan.id, planLabel, label: 'Garantia',        fromDisplay: o.warranty || '—',      toDisplay: e.warranty || '—' })
      }
      if (e.free_shipping !== o.free_shipping) {
        changes.push({ id: `${plan.id}-free`,     planId: plan.id, planLabel, label: 'Frete Grátis',    fromDisplay: o.free_shipping ? 'Sim' : 'Não', toDisplay: e.free_shipping ? 'Sim' : 'Não' })
      }
      if (e.flex_shipping !== o.flex_shipping) {
        changes.push({ id: `${plan.id}-flex`,     planId: plan.id, planLabel, label: 'Envio Flex',      fromDisplay: o.flex_shipping ? 'Ativo' : 'Inativo', toDisplay: e.flex_shipping ? 'Ativo' : 'Inativo' })
      }
      if (e.local_pick_up !== o.local_pick_up) {
        changes.push({ id: `${plan.id}-pickup`,   planId: plan.id, planLabel, label: 'Retirada Pessoal', fromDisplay: o.local_pick_up ? 'Sim' : 'Não', toDisplay: e.local_pick_up ? 'Sim' : 'Não' })
      }
      if (e.description !== o.description) {
        changes.push({ id: `${plan.id}-desc`,     planId: plan.id, planLabel, label: 'Descrição',       fromDisplay: `${o.description.length} chars`, toDisplay: `${e.description.length} chars` })
      }
    }

    return changes
  }, [data, shared, origShared, planEdits, origPlanEdits, attrEdits, origAttrEdits, naAttrs, pictures, origPictures])

  /* ── health score ─────────────────────────────────────────────────────── */
  const health = useMemo(() => {
    if (!data || data.plans.length === 0) return { score: 0, checks: [] }
    const firstPlan   = data.plans[0]
    const firstPlanE  = planEdits[firstPlan.id]
    const desc        = firstPlanE?.description ?? ''
    const mainPicSize = parsePicSize(pictures[0]?.size)

    type HealthCheck = { id: string; label: string; ok: boolean; points: number; tip: string }
    const checks: HealthCheck[] = [
      {
        id:     'title_length',
        label:  'Título otimizado (40-60 chars)',
        ok:     shared.title.length >= 40 && shared.title.length <= 60,
        points: 15,
        tip:    `Seu título tem ${shared.title.length} chars. Ideal: 40-60.`,
      },
      {
        id:     'has_description',
        label:  'Descrição preenchida (≥ 100 chars)',
        ok:     desc.length >= 100,
        points: 20,
        tip:    'Adicione uma descrição com pelo menos 100 caracteres.',
      },
      {
        id:     'has_images',
        label:  'Ao menos 3 imagens',
        ok:     pictures.length >= 3,
        points: 20,
        tip:    'Adicione pelo menos 3 imagens do produto.',
      },
      {
        id:     'main_image_hd',
        label:  'Imagem principal ≥ 800×800px',
        ok:     mainPicSize !== null && mainPicSize.w >= 800 && mainPicSize.h >= 800,
        points: 15,
        tip:    mainPicSize ? `Imagem atual: ${mainPicSize.w}×${mainPicSize.h}px.` : 'Tamanho da imagem não disponível.',
      },
      {
        id:     'has_ean',
        label:  'Código de barras (EAN/GTIN)',
        ok:     shared.ean.trim() !== '',
        points: 10,
        tip:    'EAN/GTIN melhora a visibilidade no catálogo ML.',
      },
      {
        id:     'required_attrs',
        label:  'Atributos obrigatórios preenchidos',
        ok:     categoryAttrs
          .filter(a => a.required)
          .every(a => (attrEdits[a.id] ?? '').trim() !== '' && !naAttrs.has(a.id)),
        points: 20,
        tip:    'Preencha todos os atributos obrigatórios da categoria.',
      },
    ]

    const score = checks.reduce((sum, c) => sum + (c.ok ? c.points : 0), 0)
    return { score, checks }
  }, [data, shared, planEdits, pictures, categoryAttrs, attrEdits, naAttrs])

  /* ── save ─────────────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!data || allChanges.length === 0) return
    setSaving(true)
    setSaveLog([])
    const log: string[] = []

    type PFAPI = 'title' | 'price' | 'stock' | 'condition' | 'listing_type_id' |
                 'seller_custom_field' | 'warranty' | 'free_shipping' | 'flex_shipping' |
                 'local_pick_up' | 'description' | 'attributes' | 'pictures'

    async function patch(planId: string, field: PFAPI, value: unknown, label: string) {
      log.push(`  Salvando ${label} (${planId})...`)
      setSaveLog(Array.from(log))
      const res = await fetch(`/api/mercadolivre/items/${planId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field, value }),
      })
      if (res.ok) {
        log.push(`  ✅ ${label} atualizado`)
      } else {
        const d = await res.json().catch(() => ({ error: 'Erro' })) as { error?: string }
        log.push(`  ❌ ${label}: ${d.error ?? 'Erro'}`)
      }
      setSaveLog(Array.from(log))
      await delay(1000)
    }

    const firstPlanId = data.plans[0]?.id ?? ''

    // 1. Title → all plans
    if (shared.title.trim() !== origShared.title.trim()) {
      for (const plan of data.plans) {
        await patch(plan.id, 'title', shared.title.trim(), 'Título')
      }
    }

    // 2. Merge: EAN + category attrs + package → first plan attributes in ONE call
    const attrPayload: { id: string; value_name: string | null }[] = []

    if (shared.ean !== origShared.ean) {
      attrPayload.push({ id: 'GTIN', value_name: shared.ean || null })
    }
    for (const [id, val] of Object.entries(attrEdits)) {
      const isNA    = naAttrs.has(id)
      const origVal = origAttrEdits[id] ?? ''
      if (isNA && origVal.trim() !== '') {
        attrPayload.push({ id, value_name: null })
      } else if (!isNA && val !== origVal) {
        attrPayload.push({ id, value_name: val || null })
      }
    }
    const pkgMap: { id: string; key: keyof SharedEdits }[] = [
      { id: 'PACKAGE_WEIGHT', key: 'pkg_weight' },
      { id: 'PACKAGE_LENGTH', key: 'pkg_length' },
      { id: 'PACKAGE_WIDTH',  key: 'pkg_width'  },
      { id: 'PACKAGE_HEIGHT', key: 'pkg_height' },
    ]
    for (const { id, key } of pkgMap) {
      if (shared[key] !== origShared[key]) {
        attrPayload.push({ id, value_name: shared[key] || null })
      }
    }
    if (attrPayload.length > 0 && firstPlanId) {
      await patch(firstPlanId, 'attributes', attrPayload, `Atributos (${attrPayload.length})`)
    }

    // 3. Pictures → first plan
    const picsDirty = pictures.length !== origPictures.length ||
      pictures.some((p, i) => p.secure_url !== origPictures[i]?.secure_url)
    if (picsDirty && firstPlanId) {
      await patch(firstPlanId, 'pictures', pictures.map(p => p.secure_url), 'Imagens')
    }

    // 4. Per-plan fields
    for (const plan of data.plans) {
      const e = planEdits[plan.id]
      const o = origPlanEdits[plan.id]
      if (!e || !o) continue

      log.push(`Plano ${plan.id}:`)
      setSaveLog(Array.from(log))

      if (e.price !== o.price)                         await patch(plan.id, 'price',               e.price,               'Preço')
      if (e.stock !== o.stock)                         await patch(plan.id, 'stock',               e.stock,               'Estoque')
      if (e.condition !== o.condition)                 await patch(plan.id, 'condition',           e.condition,           'Condição')
      if (e.listing_type_id !== o.listing_type_id)     await patch(plan.id, 'listing_type_id',     e.listing_type_id,     'Tipo de anúncio')
      if (e.seller_custom_field !== o.seller_custom_field) await patch(plan.id, 'seller_custom_field', e.seller_custom_field, 'SKU')
      if (e.warranty !== o.warranty)                   await patch(plan.id, 'warranty',             e.warranty,            'Garantia')
      if (e.free_shipping !== o.free_shipping)         await patch(plan.id, 'free_shipping',       e.free_shipping,       'Frete Grátis')
      if (e.flex_shipping !== o.flex_shipping)         await patch(plan.id, 'flex_shipping',       e.flex_shipping,       'Envio Flex')
      if (e.local_pick_up !== o.local_pick_up)         await patch(plan.id, 'local_pick_up',       e.local_pick_up,       'Retirada Pessoal')
      if (e.description !== o.description)             await patch(plan.id, 'description',         e.description,         'Descrição')
    }

    setSaving(false)
    const hasErrors = log.some(l => l.includes('❌'))
    const finalMsg  = hasErrors ? '⚠️ Concluído com erros. Verifique acima.' : '✅ Todas as alterações salvas com sucesso!'
    log.push(finalMsg)
    setSaveLog(Array.from(log))
    setSaveResult({ ok: !hasErrors, msg: finalMsg })

    if (!hasErrors) {
      setTimeout(() => { setShowConfirm(false); setSaveResult(null); void load() }, 3000)
    }
  }

  /* ── image add ────────────────────────────────────────────────────────── */
  function addImageByUrl() {
    const url = newImageUrl.trim()
    if (!url) return
    const pseudo: Picture = { id: `new-${Date.now()}`, url, secure_url: url }
    setPictures(prev => [...prev, pseudo])
    setNewImageUrl('')
    setAddImgOpen(false)
  }

  async function handleFileUpload(file: File) {
    setImgUploading(true)
    setImgMsg('')
    const result = await uploadImageToML(file, item_id, () => {})
    setImgUploading(false)
    if (result.success) {
      // Upload route already pushed picture to ML — reload to get updated list
      try {
        const r = await fetch(`/api/mercadolivre/items/${item_id}`)
        const j = await r.json() as { pictures?: Picture[] }
        if (Array.isArray(j.pictures)) {
          setPictures(j.pictures)
          setOrigPictures(j.pictures)
        }
      } catch { /* non-fatal */ }
      setImgMsg('✅ Imagem adicionada')
      setTimeout(() => setImgMsg(''), 3000)
    } else {
      setImgMsg(`❌ ${result.error ?? 'Erro ao enviar'}`)
      setTimeout(() => setImgMsg(''), 5000)
    }
    setAddImgOpen(false)
  }

  /* ── helpers ──────────────────────────────────────────────────────────── */
  const firstPlan   = data?.plans[0]
  const isCatalog   = !!(firstPlan?.catalog_listing || firstPlan?.catalog_product_id)
  const hasSold     = data ? data.plans.some(p => p.sold_quantity > 0) : false
  const hasChanges  = allChanges.length > 0
  const sc = firstPlan ? (STATUS_CONFIG[firstPlan.status] ?? STATUS_CONFIG['closed']) : null

  /* ── attrs to show ────────────────────────────────────────────────────── */
  const shownAttrs = useMemo(() => {
    if (showAllAttrs) return categoryAttrs
    // "Recommended": required OR catalog_required OR currently filled with a value
    return categoryAttrs.filter(a => {
      if (a.required) return true
      const tags = Array.isArray(a.tags) ? a.tags : []
      if (tags.includes('catalog_required'))      return true
      if ((attrEdits[a.id] ?? '').trim() !== '') return true
      return false
    })
  }, [categoryAttrs, showAllAttrs, attrEdits])

  const hiddenAttrsCount = categoryAttrs.length - shownAttrs.length

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-dark-950">
      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-dark-950/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <button onClick={() => router.push('/dashboard/produtos')} className="hover:text-slate-300 transition-colors shrink-0">
              Produtos
            </button>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="shrink-0 text-slate-400">Mercado Livre</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-white font-semibold truncate">{firstPlan?.title ?? item_id}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sc && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
            )}
            <button onClick={() => router.push('/dashboard/produtos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all">
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

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32 gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">Carregando dados do anúncio...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Erro ao carregar</p>
            <p className="text-xs text-slate-500 max-w-sm text-center">{error}</p>
            <button onClick={() => void load()} className="px-4 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-bold hover:bg-white/[0.1] transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : data && (
          <div className="flex gap-6">
            {/* ── Main content ────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Save result banner */}
              {saveResult && (
                <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${saveResult.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  {saveResult.msg}
                </div>
              )}

              {/* Catalog banner */}
              {isCatalog && (
                <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/[0.07] border border-blue-500/20 rounded-xl">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-300 mb-0.5">📋 Anúncio de Catálogo</p>
                    <p className="text-[11px] text-blue-400">
                      Título, imagens e atributos são controlados pelo ML. Você pode editar: preço, estoque, condição e garantia.
                    </p>
                  </div>
                </div>
              )}

              {/* ── § 1 Informação Básica ─────────────────────────────── */}
              <SectionCard id="s1" title="Informação Básica" icon={Tag}
                sectionRef={el => { sectionRefs.current['s1'] = el }}>
                <div className="space-y-4">
                  <FieldRow
                    label="Título da Família"
                    required
                    changed={shared.title.trim() !== origShared.title.trim()}
                    hint={isCatalog ? 'Controlado pelo catálogo ML' : `${shared.title.length}/60 caracteres`}
                  >
                    {!isCatalog && hasSold && (
                      <div className="flex items-start gap-1.5 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-400">Planos com vendas. O ML pode rejeitar a alteração de título.</p>
                      </div>
                    )}
                    <input
                      type="text" value={shared.title} maxLength={60}
                      onChange={isCatalog ? undefined : e => setShared(s => ({ ...s, title: e.target.value }))}
                      readOnly={isCatalog}
                      className={inputCls + (isCatalog ? ' opacity-50 cursor-not-allowed' : '')}
                    />
                  </FieldRow>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldRow label="Categoria">
                      <div className="flex gap-2">
                        <input readOnly value={categoryName || data.category_id} className={inputCls + ' flex-1 opacity-70'} />
                        <span className="text-[10px] font-mono text-slate-600 self-center shrink-0">{data.category_id}</span>
                      </div>
                    </FieldRow>
                    <FieldRow label="User Product ID">
                      <input readOnly value={data.user_product_id ?? '—'} className={inputCls + ' opacity-70'} />
                    </FieldRow>
                  </div>
                </div>
              </SectionCard>

              {/* ── § 2 Atributos ────────────────────────────────────── */}
              <SectionCard id="s2" title="Atributos" icon={List}
                sectionRef={el => { sectionRefs.current['s2'] = el }}>
                {attrsLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 text-xs py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando atributos...
                  </div>
                ) : categoryAttrs.length > 0 ? (
                  <div className="space-y-4">
                    {shownAttrs.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {shownAttrs.map(attr => {
                          const val     = attrEdits[attr.id] ?? ''
                          const origVal = origAttrEdits[attr.id] ?? ''
                          const isNA    = naAttrs.has(attr.id)
                          const changed = isNA ? (origVal.trim() !== '') : (val !== origVal)
                          return (
                            <FieldRow key={attr.id} label={attr.name} required={attr.required} changed={changed} hint={attr.hint}>
                              <AttrField
                                attr={attr}
                                value={val}
                                isNA={isNA}
                                onChange={v => setAttrEdits(prev => ({ ...prev, [attr.id]: v }))}
                                onToggleNA={() => setNaAttrs(prev => {
                                  const next = new Set<string>(Array.from(prev))
                                  if (next.has(attr.id)) next.delete(attr.id)
                                  else next.add(attr.id)
                                  return next
                                })}
                              />
                            </FieldRow>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-1">
                        Nenhum atributo obrigatório nesta categoria.{' '}
                        {hiddenAttrsCount > 0 && 'Use o botão abaixo para ver todos os opcionais.'}
                      </p>
                    )}
                    {/* Toggle show all */}
                    {(showAllAttrs || hiddenAttrsCount > 0) && (
                      <button
                        onClick={() => setShowAllAttrs(v => !v)}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showAllAttrs ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showAllAttrs
                          ? 'Mostrar apenas obrigatórios e preenchidos'
                          : `▼ Ver todos os atributos (${categoryAttrs.length})`}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 py-2">Nenhum atributo disponível para esta categoria.</p>
                )}
              </SectionCard>

              {/* ── § 3 Informação do Anúncio ─────────────────────────── */}
              <SectionCard id="s3" title="Informação do Anúncio" icon={Settings}
                sectionRef={el => { sectionRefs.current['s3'] = el }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRow label="Tipo de Anúncio">
                    <input readOnly value={firstPlan?.buying_mode === 'classified' ? 'Classificado' : 'Simples'} className={inputCls + ' opacity-70'} />
                    <p className="text-[10px] text-slate-600 mt-1">Somente leitura</p>
                  </FieldRow>
                  <FieldRow
                    label="SKU do Vendedor"
                    changed={data.plans.some(p => (planEdits[p.id]?.seller_custom_field ?? '') !== (origPlanEdits[p.id]?.seller_custom_field ?? ''))}
                  >
                    <input
                      type="text"
                      value={planEdits[data.plans[0]?.id ?? '']?.seller_custom_field ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        setPlanEdits(prev => {
                          const next = { ...prev }
                          for (const plan of data.plans) {
                            if (next[plan.id]) next[plan.id] = { ...next[plan.id], seller_custom_field: v }
                          }
                          return next
                        })
                      }}
                      placeholder="Código interno do produto"
                      className={inputCls}
                    />
                    <p className="text-[10px] text-slate-600 mt-1">Aplicado a todos os planos</p>
                  </FieldRow>
                  <FieldRow
                    label="EAN / GTIN (código de barras)"
                    changed={shared.ean !== origShared.ean}
                  >
                    <input
                      type="text"
                      value={shared.ean}
                      onChange={e => setShared(s => ({ ...s, ean: e.target.value.replace(/\D/g, '') }))}
                      placeholder="7891000000000"
                      maxLength={14}
                      className={inputCls}
                    />
                    <p className="text-[10px] text-slate-600 mt-1">8, 12, 13 ou 14 dígitos. Melhora indexação.</p>
                  </FieldRow>
                  <FieldRow label="Local de Expedição">
                    {shippingLocations.length > 1 ? (
                      <select
                        value={shippingLocationId}
                        onChange={e => setShippingLocationId(e.target.value)}
                        className={selectCls}
                      >
                        {shippingLocations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        readOnly
                        value={shippingLocations[0]?.name ?? 'Configurado na conta ML'}
                        className={inputCls + ' opacity-70'}
                      />
                    )}
                    <p className="text-[10px] text-slate-600 mt-1">Gerenciado na conta do Mercado Livre</p>
                  </FieldRow>
                </div>
              </SectionCard>

              {/* ── § 4 Mídia ─────────────────────────────────────────── */}
              <SectionCard id="s4" title="Mídia" icon={ImageIcon}
                sectionRef={el => { sectionRefs.current['s4'] = el }}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      <span className={pictures.length === 0 ? 'text-red-400' : 'text-white font-semibold'}>{pictures.length}</span>
                      /12 imagens
                    </p>
                    <button
                      onClick={() => setAddImgOpen(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.09] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Imagem
                    </button>
                  </div>

                  {/* Add image panel */}
                  {addImgOpen && (
                    <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-3">
                      <p className="text-xs font-semibold text-slate-400">Adicionar via URL</p>
                      <div className="flex gap-2">
                        <input
                          type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addImageByUrl()}
                          placeholder="https://example.com/imagem.jpg"
                          className={inputCls + ' flex-1 text-xs'}
                        />
                        <button onClick={addImageByUrl} disabled={!newImageUrl.trim()}
                          className="px-3 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-all">
                          Adicionar
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[10px] text-slate-600">ou</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-white/20 cursor-pointer transition-all text-xs text-slate-500 hover:text-slate-300"
                        onClick={() => uploadInputRef.current?.click()}
                      >
                        <UploadCloud className="w-4 h-4" />
                        {imgUploading ? 'Enviando...' : 'Clique para fazer upload do computador'}
                        <input ref={uploadInputRef} type="file" accept="image/jpeg,image/png" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); e.target.value = '' }} />
                      </div>
                      {imgMsg && (
                        <p className={`text-xs font-semibold ${imgMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{imgMsg}</p>
                      )}
                    </div>
                  )}

                  {/* Image grid */}
                  {pictures.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {pictures.map((pic, idx) => {
                        const dims = parsePicSize(pic.size)
                        return (
                          <div key={pic.id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/[0.08] bg-dark-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pic.url || pic.secure_url} alt={`Imagem ${idx + 1}`} className="w-full h-full object-cover" />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setPictures(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/40 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <a href={pic.secure_url || pic.url} target="_blank" rel="noopener noreferrer"
                                className="p-1 rounded-full bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 transition-colors">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 text-[7px] font-bold bg-purple-600 text-white px-1 rounded">CAPA</span>
                            )}
                            {dims && (
                              <span className="absolute bottom-1 left-1 right-1 text-[7px] text-slate-400 text-center leading-none">{dims.w}×{dims.h}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 rounded-xl border-2 border-dashed border-white/[0.06]">
                      <p className="text-xs text-slate-600">Nenhuma imagem. Adicione ao menos 1.</p>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-600">Mínimo 500×500px. Primeira foto: fundo branco recomendado.</p>
                </div>
              </SectionCard>

              {/* ── § 5 Informações de Venda ─────────────────────────── */}
              <SectionCard id="s5" title="Informações de Venda" icon={ShoppingBag}
                sectionRef={el => { sectionRefs.current['s5'] = el }}>
                <div className="space-y-5">
                  {data.plans.map((plan, planIdx) => {
                    const e  = planEdits[plan.id]
                    const o  = origPlanEdits[plan.id]
                    if (!e || !o) return null
                    const ch = (k: keyof PlanEdits) => e[k] !== o[k]
                    const isFree = plan.listing_type_id === 'free'
                    return (
                      <div key={plan.id} className="border border-white/[0.06] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300">Plano {planIdx + 1}</span>
                            <PlanTag plan={plan} />
                          </div>
                          <a href={plan.permalink} target="_blank" rel="noopener noreferrer"
                            className="p-1 text-slate-600 hover:text-yellow-400 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FieldRow label="Preço (R$)" changed={ch('price')}>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                              <input
                                type="number" value={e.price || ''} min={0.01} step={0.01}
                                onChange={ev => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], price: parseFloat(ev.target.value) || 0 } }))}
                                className={inputCls + ' pl-8'}
                              />
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1">Atual: {fmtBRL(plan.price)}</p>
                          </FieldRow>

                          <FieldRow label="Tipo" changed={ch('listing_type_id')}>
                            {isFree ? (
                              <input readOnly value="Gratuito (não editável)" className={inputCls + ' opacity-60'} />
                            ) : (
                              <select value={e.listing_type_id}
                                onChange={ev => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], listing_type_id: ev.target.value } }))}
                                className={selectCls}>
                                <option value="gold_special">Clássico</option>
                                <option value="gold_pro">Premium</option>
                              </select>
                            )}
                          </FieldRow>

                          <FieldRow label="Condição" changed={ch('condition')}>
                            <select value={e.condition}
                              onChange={ev => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], condition: ev.target.value } }))}
                              className={selectCls}>
                              <option value="new">Novo</option>
                              <option value="used">Usado</option>
                              <option value="not_specified">Não especificado</option>
                            </select>
                          </FieldRow>

                          <FieldRow label="Estoque" changed={ch('stock')}>
                            <input
                              type="number" value={e.stock || ''} min={0} step={1}
                              onChange={ev => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], stock: Math.max(0, Math.floor(parseFloat(ev.target.value) || 0)) } }))}
                              className={inputCls}
                            />
                            <p className="text-[10px] text-slate-600 mt-1">Atual: {plan.available_quantity}</p>
                          </FieldRow>

                          <FieldRow label="Garantia" changed={ch('warranty')}>
                            <input type="text" value={e.warranty}
                              onChange={ev => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], warranty: ev.target.value } }))}
                              placeholder="Ex: 12 meses"
                              className={inputCls}
                            />
                          </FieldRow>

                          {/* Copy to all plans */}
                          {data.plans.length > 1 && (
                            <div className="col-span-2 md:col-span-4 pt-1">
                              <p className="text-[10px] text-slate-600 mb-2">Copiar para todos os planos:</p>
                              <div className="flex flex-wrap gap-2">
                                {(['price', 'stock', 'condition', 'warranty'] as const).map(field => {
                                  const labels: Record<string, string> = { price: 'Preço', stock: 'Estoque', condition: 'Condição', warranty: 'Garantia' }
                                  return (
                                    <button key={field}
                                      onClick={() => {
                                        const val = e[field]
                                        setPlanEdits(prev => {
                                          const next = { ...prev }
                                          for (const p of data.plans) {
                                            if (next[p.id]) next[p.id] = { ...next[p.id], [field]: val }
                                          }
                                          return next
                                        })
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded hover:bg-white/[0.07] transition-all">
                                      <Copy className="w-2.5 h-2.5" /> {labels[field]}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>

              {/* ── § 6 Descrição ────────────────────────────────────── */}
              <SectionCard id="s6" title="Descrição" icon={FileText}
                sectionRef={el => { sectionRefs.current['s6'] = el }}>
                <div className="space-y-4">
                  {data.plans.map((plan, planIdx) => {
                    const e  = planEdits[plan.id]
                    const o  = origPlanEdits[plan.id]
                    if (!e || !o) return null
                    const changed = e.description !== o.description
                    return (
                      <div key={plan.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">Plano {planIdx + 1}</span>
                            <PlanTag plan={plan} short />
                          </div>
                          <div className="flex items-center gap-2">
                            {changed && <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded">alterado</span>}
                            {data.plans.length > 1 && planIdx === 0 && (
                              <button
                                onClick={() => {
                                  const desc = e.description
                                  setPlanEdits(prev => {
                                    const next = { ...prev }
                                    for (const p of data.plans) {
                                      if (next[p.id]) next[p.id] = { ...next[p.id], description: desc }
                                    }
                                    return next
                                  })
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                Copiar para todos os planos
                              </button>
                            )}
                            <span className="text-[10px] text-slate-600">{e.description.length}/5000</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Info className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="text-[10px] text-blue-300">Apenas texto simples. Sem HTML.</span>
                        </div>
                        <textarea
                          value={e.description} rows={5} maxLength={5000}
                          onChange={ev => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], description: ev.target.value } }))}
                          placeholder="Descreva o produto detalhadamente..."
                          className={inputCls + ' resize-none'}
                        />
                      </div>
                    )
                  })}
                </div>
              </SectionCard>

              {/* ── § 7 Envio ────────────────────────────────────────── */}
              <SectionCard id="s7" title="Envio" icon={Truck}
                sectionRef={el => { sectionRefs.current['s7'] = el }}>
                <div className="space-y-5">
                  {data.plans.map((plan, planIdx) => {
                    const e = planEdits[plan.id]
                    const o = origPlanEdits[plan.id]
                    if (!e || !o) return null
                    return (
                      <div key={plan.id} className="border border-white/[0.06] rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-400">Plano {planIdx + 1}</span>
                          <PlanTag plan={plan} short />
                          <span className="text-[10px] text-slate-600 ml-auto">{plan.shipping?.mode ?? 'me2'} · {plan.shipping?.logistic_type ?? '—'}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className={`px-3 py-2.5 rounded-xl border transition-all ${e.free_shipping !== o.free_shipping ? 'border-yellow-400/20 bg-yellow-400/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                            <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Frete Grátis</p>
                            <Toggle value={e.free_shipping} onChange={v => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], free_shipping: v } }))} label="Sim/Não" changed={e.free_shipping !== o.free_shipping} />
                          </div>

                          <div className={`px-3 py-2.5 rounded-xl border transition-all ${e.flex_shipping !== o.flex_shipping ? 'border-yellow-400/20 bg-yellow-400/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <p className="text-[10px] font-semibold text-slate-400">Envio Flex</p>
                            </div>
                            <Toggle value={e.flex_shipping} onChange={v => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], flex_shipping: v } }))} label="Ativo/Inativo" changed={e.flex_shipping !== o.flex_shipping} />
                            {e.flex_shipping && (
                              <p className="text-[9px] text-amber-400 mt-1.5">⚠️ Exige preparo e envio no mesmo dia do pedido</p>
                            )}
                          </div>

                          <div className={`px-3 py-2.5 rounded-xl border transition-all ${e.local_pick_up !== o.local_pick_up ? 'border-yellow-400/20 bg-yellow-400/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                            <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Retirada Pessoal</p>
                            <Toggle value={e.local_pick_up} onChange={v => setPlanEdits(prev => ({ ...prev, [plan.id]: { ...prev[plan.id], local_pick_up: v } }))} label="Sim/Não" changed={e.local_pick_up !== o.local_pick_up} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>

              {/* ── § 8 Pacote ───────────────────────────────────────── */}
              <SectionCard id="s8" title="Pacote do Vendedor" icon={Package}
                sectionRef={el => { sectionRefs.current['s8'] = el }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {([
                    { key: 'pkg_weight', label: 'Peso',         unit: 'g',  placeholder: '500' },
                    { key: 'pkg_length', label: 'Comprimento',  unit: 'cm', placeholder: '20'  },
                    { key: 'pkg_width',  label: 'Largura',      unit: 'cm', placeholder: '15'  },
                    { key: 'pkg_height', label: 'Altura',       unit: 'cm', placeholder: '10'  },
                  ] as { key: keyof SharedEdits; label: string; unit: string; placeholder: string }[]).map(f => (
                    <FieldRow key={f.key} label={`${f.label} (${f.unit})`} changed={shared[f.key] !== origShared[f.key]}>
                      <div className="relative">
                        <input
                          type="number" min={0} value={shared[f.key]}
                          onChange={e => setShared(s => ({ ...s, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className={inputCls}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">{f.unit}</span>
                      </div>
                    </FieldRow>
                  ))}
                </div>
              </SectionCard>

              {/* ── § 9 Saúde do Anúncio ─────────────────────────────── */}
              <SectionCard id="s9" title="Saúde do Anúncio" icon={BarChart2}
                sectionRef={el => { sectionRefs.current['s9'] = el }}>
                <div className="space-y-4">
                  {/* Score */}
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-bold font-mono ${health.score >= 80 ? 'text-green-400' : health.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {health.score}
                      <span className="text-sm text-slate-500 font-normal">/100</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${health.score >= 80 ? 'bg-green-500' : health.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${health.score}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {health.score >= 80 ? '🟢 Anúncio bem otimizado' : health.score >= 60 ? '🟡 Pode melhorar' : '🔴 Precisa de atenção'}
                      </p>
                    </div>
                  </div>

                  {/* Checks */}
                  <div className="space-y-2">
                    {health.checks.map(c => (
                      <div key={c.id} className="flex items-start gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
                        {c.ok
                          ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          : <XCircle     className="w-4 h-4 text-red-400   shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${c.ok ? 'text-slate-300' : 'text-slate-400'}`}>{c.label}</p>
                          {!c.ok && <p className="text-[10px] text-slate-600 mt-0.5">{c.tip}</p>}
                        </div>
                        <span className={`text-[10px] font-bold shrink-0 ${c.ok ? 'text-green-400' : 'text-slate-600'}`}>
                          {c.ok ? `+${c.points}` : `0/${c.points}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

            </div>

            {/* ── Right Sticky Nav ────────────────────────────────────── */}
            <div className="w-44 shrink-0 hidden lg:block">
              <div className="sticky top-20 space-y-0.5">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-2">Seções</p>
                {NAV_SECTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const el = sectionRefs.current[s.id]
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      activeSection === s.id
                        ? 'text-purple-400 bg-purple-500/10 font-semibold'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}

                {/* Mini health indicator */}
                <div className="mt-4 px-2.5 py-2 bg-dark-800 border border-white/[0.06] rounded-xl">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1.5">Saúde</p>
                  <div className={`text-lg font-bold font-mono ${health.score >= 80 ? 'text-green-400' : health.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {health.score}<span className="text-[10px] text-slate-600 font-normal">/100</span>
                  </div>
                  <div className="h-1 bg-dark-700 rounded-full mt-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${health.score >= 80 ? 'bg-green-500' : health.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${health.score}%` }} />
                  </div>
                </div>

                {/* Changes indicator */}
                {hasChanges && (
                  <div className="mt-2 px-2.5 py-2 bg-yellow-400/[0.06] border border-yellow-400/20 rounded-xl">
                    <p className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest mb-0.5">Alterações</p>
                    <p className="text-sm font-bold text-yellow-400">{allChanges.length}</p>
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="mt-1.5 w-full py-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg hover:bg-yellow-400/20 transition-all"
                    >
                      Salvar agora
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Modal ─────────────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmModal
          changes={allChanges}
          saving={saving}
          saveLog={saveLog}
          onConfirm={() => void handleSave()}
          onCancel={() => { if (!saving) { setShowConfirm(false); setSaveLog([]) } }}
        />
      )}
    </div>
  )
}
