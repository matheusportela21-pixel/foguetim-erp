'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter }              from 'next/navigation'
import {
  ArrowLeft, Save, RefreshCw, AlertCircle, CheckCircle2,
  X, ImageOff, Plus, Info, Package, Loader2, ExternalLink,
  ChevronRight, Tag, Truck, Box, FileText, Settings, List,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Picture {
  id:         string
  url:        string
  secure_url: string
}

interface Attribute {
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
  attributes:          Attribute[]
  shipping:            { free_shipping?: boolean; mode?: string; local_pick_up?: boolean }
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
  attributes:      Attribute[]
  ml_user_id:      number
}

/* ── Editable plan state ─────────────────────────────────────────────────── */
interface PlanEdits {
  price:               number
  available_quantity:  number
  condition:           string
  listing_type_id:     string
  seller_custom_field: string
  free_shipping:       boolean
  description_text:    string
  warranty:            string
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function listingLabel(lt: string) {
  if (lt?.includes('gold_special') || lt?.includes('gold_pro')) return 'Premium'
  if (lt?.includes('gold'))   return 'Clássico'
  if (lt?.includes('silver')) return 'Gratuita'
  return lt ?? '—'
}

function statusConfig(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active:       { label: 'Ativo',       cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
    paused:       { label: 'Pausado',     cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
    closed:       { label: 'Encerrado',   cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
    under_review: { label: 'Em revisão',  cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  }
  return map[s] ?? { label: s, cls: 'bg-slate-700 text-slate-400 border-slate-600' }
}

const CONDITIONS  = ['new', 'used', 'not_specified']
const COND_LABELS: Record<string, string> = { new: 'Novo', used: 'Usado', not_specified: 'Não especificado' }

const LISTING_TYPES = [
  { value: 'gold_special', label: 'Premium' },
  { value: 'gold_pro',     label: 'Gold Pro' },
  { value: 'gold',         label: 'Clássico' },
  { value: 'silver',       label: 'Gratuita' },
]

/* ── Section wrapper ─────────────────────────────────────────────────────── */
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

/* ── Field component ─────────────────────────────────────────────────────── */
function Field({ label, changed = false, children, hint }: {
  label: string; changed?: boolean; children: React.ReactNode; hint?: string
}) {
  return (
    <div>
      <label className={`block text-xs mb-1.5 font-medium ${changed ? 'text-yellow-400' : 'text-slate-500'}`}>
        {label} {changed && <span className="text-[9px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded-full ml-1">alterado</span>}
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

function NumberInput({ value, onChange, changed, min = 0, step = 1 }: {
  value: number; onChange: (v: number) => void; changed?: boolean; min?: number; step?: number
}) {
  return (
    <input
      type="number" value={value} min={min} step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
        ${changed ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
    />
  )
}

/* ── Plan card ───────────────────────────────────────────────────────────── */
function PlanCard({
  plan, edits, setEdits, idx,
}: {
  plan:     PlanData
  edits:    PlanEdits
  setEdits: (e: PlanEdits) => void
  idx:      number
}) {
  const sc = statusConfig(plan.status)

  function field<K extends keyof PlanEdits>(key: K) {
    const original = key === 'price'              ? plan.price
                   : key === 'available_quantity' ? plan.available_quantity
                   : key === 'condition'          ? plan.condition
                   : key === 'listing_type_id'    ? plan.listing_type_id
                   : key === 'seller_custom_field'? plan.seller_custom_field ?? ''
                   : key === 'free_shipping'      ? (plan.shipping?.free_shipping ?? false)
                   : key === 'description_text'   ? plan.description_text
                   : key === 'warranty'           ? (plan.sale_terms?.find(t => t.id === 'WARRANTY_TYPE')?.value_name ?? '')
                   : ''
    return edits[key] !== original
  }

  const warranty = edits.warranty
  const sellerSku = edits.seller_custom_field

  return (
    <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Plan header */}
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

      {/* Plan fields */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Price */}
          <Field label="Preço (R$)" changed={field('price')}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
              <input
                type="number" value={edits.price} min={0.01} step={0.01}
                onChange={e => setEdits({ ...edits, price: parseFloat(e.target.value) || 0 })}
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                  ${field('price') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1">Atual: {fmtBRL(plan.price)}</p>
          </Field>

          {/* Listing type */}
          <Field label="Tipo de anúncio" changed={field('listing_type_id')}>
            <select
              value={edits.listing_type_id}
              onChange={e => setEdits({ ...edits, listing_type_id: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                ${field('listing_type_id') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
            >
              {LISTING_TYPES.map(lt => (
                <option key={lt.value} value={lt.value}>{lt.label}</option>
              ))}
            </select>
          </Field>

          {/* Condition */}
          <Field label="Condição" changed={field('condition')}>
            <select
              value={edits.condition}
              onChange={e => setEdits({ ...edits, condition: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border text-white focus:outline-none focus:ring-1 transition-colors
                ${field('condition') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
            >
              {CONDITIONS.map(c => <option key={c} value={c}>{COND_LABELS[c] ?? c}</option>)}
            </select>
          </Field>

          {/* Stock */}
          <Field label="Estoque" changed={field('available_quantity')}>
            <NumberInput
              value={edits.available_quantity}
              onChange={v => setEdits({ ...edits, available_quantity: Math.max(0, Math.floor(v)) })}
              changed={field('available_quantity')}
              min={0} step={1}
            />
            <p className="text-[10px] text-slate-600 mt-1">Atual: {plan.available_quantity}</p>
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Warranty */}
          <Field label="Garantia" changed={field('warranty')}>
            <TextInput
              value={warranty}
              onChange={v => setEdits({ ...edits, warranty: v })}
              changed={field('warranty')}
              placeholder="Ex: 12 meses"
            />
          </Field>

          {/* SKU */}
          <Field label="SKU do Vendedor" changed={field('seller_custom_field')}>
            <TextInput
              value={sellerSku}
              onChange={v => setEdits({ ...edits, seller_custom_field: v })}
              changed={field('seller_custom_field')}
              placeholder="Código interno"
            />
          </Field>

          {/* Free shipping */}
          <Field label="Frete grátis" changed={field('free_shipping')}>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setEdits({ ...edits, free_shipping: !edits.free_shipping })}
                className={`relative w-10 h-5 rounded-full transition-colors ${edits.free_shipping ? 'bg-green-500' : 'bg-dark-700 border border-white/[0.1]'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${edits.free_shipping ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-slate-400">{edits.free_shipping ? 'Sim' : 'Não'}</span>
            </div>
          </Field>
        </div>

        {/* Description */}
        <Field
          label={`Descrição do Plano ${idx + 1}`}
          changed={field('description_text')}
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
              ${field('description_text') ? 'border-yellow-400/40 focus:ring-yellow-400/30' : 'border-white/[0.08] focus:ring-purple-500/30'}`}
          />
        </Field>
      </div>
    </div>
  )
}

/* ── Confirmation modal ──────────────────────────────────────────────────── */
interface PlanChange {
  planId:  string
  planIdx: number
  field:   string
  label:   string
  from:    string
  to:      string
  apiField: string
  value:   unknown
}

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

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
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
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {saveLog.map((l, i) => (
              <p key={i} className={`text-[11px] ${l.startsWith('✅') ? 'text-green-400' : l.startsWith('❌') ? 'text-red-400' : 'text-slate-400'}`}>{l}</p>
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

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function EditarAnuncioPage() {
  const params   = useParams<{ item_id: string }>()
  const router   = useRouter()
  const item_id  = params.item_id

  const [data, setData]       = useState<SiblingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Shared title state (same across all plans — product root title)
  const [rootTitle, setRootTitle]         = useState('')
  const [originalTitle, setOriginalTitle] = useState('')

  // Per-plan edits
  const [planEdits, setPlanEdits]   = useState<PlanEdits[]>([])
  const [originalEdits, setOriginalEdits] = useState<PlanEdits[]>([])

  // Add image URL state
  const [newImageUrl, setNewImageUrl]   = useState('')
  const [addingImage, setAddingImage]   = useState(false)
  const [imageMsg, setImageMsg]         = useState('')

  // Confirm/save state
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveLog, setSaveLog]         = useState<string[]>([])
  const [saveResult, setSaveResult]   = useState<{ ok: boolean; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/mercadolivre/items/${item_id}/siblings`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao carregar')
      const d: SiblingsData = json
      setData(d)

      // Set root title from first plan
      const title = d.plans[0]?.title ?? ''
      setRootTitle(title)
      setOriginalTitle(title)

      // Build per-plan edits
      const edits: PlanEdits[] = d.plans.map(p => ({
        price:               p.price,
        available_quantity:  p.available_quantity,
        condition:           p.condition,
        listing_type_id:     p.listing_type_id,
        seller_custom_field: p.seller_custom_field ?? '',
        free_shipping:       p.shipping?.free_shipping ?? false,
        description_text:    p.description_text,
        warranty:            p.sale_terms?.find(t => t.id === 'WARRANTY_TYPE')?.value_name ?? '',
      }))
      setPlanEdits(edits)
      setOriginalEdits(JSON.parse(JSON.stringify(edits)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [item_id])

  useEffect(() => { load() }, [load])

  /* Compute all changes ─────────────────────────────────────────────────── */
  const allChanges: PlanChange[] = []

  if (data) {
    // Root title change applies to all plans
    if (rootTitle.trim() !== originalTitle) {
      data.plans.forEach((p, i) => {
        allChanges.push({
          planId:   p.id,
          planIdx:  i,
          field:    'title',
          label:    'Título',
          from:     originalTitle,
          to:       rootTitle.trim(),
          apiField: 'title',
          value:    rootTitle.trim(),
        })
      })
    }

    data.plans.forEach((plan, i) => {
      const edits = planEdits[i]
      const orig  = originalEdits[i]
      if (!edits || !orig) return

      const fieldMap: { key: keyof PlanEdits; label: string; apiField: string; fmt?: (v: unknown) => string }[] = [
        { key: 'price',               label: 'Preço',          apiField: 'price',              fmt: v => fmtBRL(v as number) },
        { key: 'available_quantity',  label: 'Estoque',        apiField: 'available_quantity'  },
        { key: 'condition',           label: 'Condição',       apiField: 'condition',          fmt: v => COND_LABELS[v as string] ?? String(v) },
        { key: 'listing_type_id',     label: 'Tipo',           apiField: 'listing_type_id',    fmt: v => listingLabel(v as string) },
        { key: 'free_shipping',       label: 'Frete grátis',   apiField: 'free_shipping',      fmt: v => v ? 'Sim' : 'Não' },
        { key: 'description_text',    label: 'Descrição',      apiField: 'description'         },
        { key: 'seller_custom_field', label: 'SKU',            apiField: 'seller_custom_field' },
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
  }

  const hasChanges = allChanges.length > 0

  /* Save ────────────────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!data || allChanges.length === 0) return
    setSaving(true)
    setSaveLog([])
    const log: string[] = []

    // Group changes by plan
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

      // Separate description from item fields
      const itemFields = changes.filter(c => c.apiField !== 'description')
      const descChange = changes.find(c =>  c.apiField === 'description')

      // Build item patch
      if (itemFields.length > 0) {
        const body: Record<string, unknown> = {}
        for (const c of itemFields) {
          if (c.apiField === 'free_shipping') {
            body.shipping = { free_shipping: c.value as boolean }
          } else {
            body[c.apiField] = c.value
          }
        }
        // Use PATCH route for each field
        for (const c of itemFields) {
          const field = c.apiField === 'available_quantity' ? 'stock'
                      : c.apiField === 'listing_type_id'    ? 'status'  // treated differently
                      : c.apiField as 'title' | 'price' | 'stock' | 'status'

          // Map to our PATCH fields
          type PatchField = 'title' | 'price' | 'stock' | 'status' | 'description'
          const fieldMap: Record<string, PatchField> = {
            title:               'title',
            price:               'price',
            available_quantity:  'stock',
            status:              'status',
          }
          const patchField = fieldMap[c.apiField]
          if (!patchField) continue

          const res = await fetch(`/api/mercadolivre/items/${planId}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ field: patchField, value: c.value }),
          })
          if (res.ok) {
            log.push(`  ✅ ${c.label} atualizado`)
          } else {
            const d = await res.json()
            log.push(`  ❌ ${c.label}: ${d.error ?? 'Erro'}`)
          }
          setSaveLog([...log])
          // Rate limit: 1s between PUTs
          await new Promise(r => setTimeout(r, 1000))
        }
      }

      // Patch description separately
      if (descChange) {
        const res = await fetch(`/api/mercadolivre/items/${planId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ field: 'description', value: descChange.value }),
        })
        if (res.ok) {
          log.push(`  ✅ Descrição atualizada`)
        } else {
          const d = await res.json()
          log.push(`  ❌ Descrição: ${d.error ?? 'Erro'}`)
        }
        setSaveLog([...log])
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    setSaving(false)
    const hasErrors = log.some(l => l.includes('❌'))
    const finalMsg  = hasErrors ? '⚠️ Concluído com alguns erros. Verifique acima.' : '✅ Todos os planos atualizados com sucesso!'
    log.push(finalMsg)
    setSaveLog([...log])

    if (!hasErrors) {
      setSaveResult({ ok: true, msg: finalMsg })
      setTimeout(() => { setShowConfirm(false); setSaveResult(null); load() }, 3000)
    } else {
      setSaveResult({ ok: false, msg: finalMsg })
    }
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  const firstPlan   = data?.plans[0]
  const titleChanged = rootTitle.trim() !== originalTitle
  const allSold      = data ? data.plans.every(p => p.sold_quantity > 0) : false

  return (
    <div className="min-h-screen bg-[#03050f]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-[#03050f]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <button onClick={() => router.push('/dashboard/produtos')} className="hover:text-slate-300 transition-colors shrink-0">
              Produtos
            </button>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="shrink-0">Mercado Livre</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-white font-semibold truncate">{firstPlan?.title ?? item_id}</span>
          </div>

          {/* Status + actions */}
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
            {/* Section 1 — Informação Básica */}
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

            {/* Section 2 — Atributos */}
            {data.attributes.length > 0 && (
              <Section icon={List} title="Atributos do Produto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.attributes.slice(0, 12).map(attr => (
                    <div key={attr.id} className="px-3 py-2.5 bg-white/[0.02] rounded-xl">
                      <p className="text-[10px] text-slate-600 mb-0.5">{attr.name}</p>
                      <p className="text-xs font-semibold text-slate-300">{attr.value_name || '—'}</p>
                    </div>
                  ))}
                </div>
                {data.attributes.length > 12 && (
                  <p className="text-[10px] text-slate-600 mt-3">+{data.attributes.length - 12} atributos não exibidos</p>
                )}
              </Section>
            )}

            {/* Section 3 — Mídia */}
            {firstPlan && (
              <Section icon={ImageOff} title="Mídia">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400">
                      {firstPlan.pictures?.length ?? 0}/12 imagens
                    </p>
                    <div className="flex items-start gap-1.5 px-3 py-1.5 bg-blue-500/[0.08] border border-blue-500/[0.15] rounded-lg">
                      <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-300">A primeira imagem deve ter fundo branco puro (min 500×500px)</p>
                    </div>
                  </div>

                  {/* Image grid */}
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

                  {/* Add image */}
                  <div className="flex gap-2">
                    <input
                      value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                      placeholder="URL da nova imagem (https://...)"
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
                    <p className={`text-xs ${imageMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{imageMsg}</p>
                  )}
                </div>
              </Section>
            )}

            {/* Section 4 — Planos de venda */}
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
                    price: plan.price,
                    available_quantity: plan.available_quantity,
                    condition: plan.condition,
                    listing_type_id: plan.listing_type_id,
                    seller_custom_field: plan.seller_custom_field ?? '',
                    free_shipping: plan.shipping?.free_shipping ?? false,
                    description_text: plan.description_text,
                    warranty: '',
                  }}
                  setEdits={e => {
                    const next = [...planEdits]
                    next[i] = e
                    setPlanEdits(next)
                  }}
                  idx={i}
                />
              ))}

              {/* Add plan — coming soon */}
              <button disabled
                className="w-full py-3 rounded-2xl border border-dashed border-white/[0.08] text-xs text-slate-600 flex items-center justify-center gap-2 cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> Adicionar Plano de Venda
                <span className="ml-1 text-[9px] bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full">Em breve</span>
              </button>
            </div>

            {/* Section 5 — Package info */}
            <Section icon={Box} title="Informações do Pacote">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Peso (g)',      placeholder: '500'   },
                  { label: 'Comprimento (cm)', placeholder: '20' },
                  { label: 'Largura (cm)',  placeholder: '15'    },
                  { label: 'Altura (cm)',   placeholder: '10'    },
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
