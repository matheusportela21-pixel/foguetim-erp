'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter }      from 'next/navigation'
import { usePlan }        from '@/context/PlanContext'
import {
  ArrowLeft, ArrowRight, Check, Search, Loader2, AlertCircle,
  Tag, DollarSign, FileText, ImageIcon, Truck, Eye,
  X, ChevronRight, Info, ExternalLink, ChevronLeft, Home,
  Grid3X3, Package, MapPin, Upload, Star, Sparkles,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

interface CategorySuggestion {
  category_id:   string
  category_name: string
  domain_name:   string
  domain_id?:    string
  breadcrumb:    string
  aiSuggested?:  boolean
  reason?:       string
  confidence?:   number
  is_leaf?:      boolean
}

interface ChildCategory {
  id:   string
  name: string
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
}

interface ShippingLocation {
  id:           string
  name:         string
  address_line?: string
  city?:        string
  state?:       string
  zip_code?:    string
}

interface PlanConfig {
  enabled:         boolean
  listing_type_id: string
  price:           number
  quantity:        number
}

interface WizardData {
  // Step 1 — Título e Categoria
  category_id:   string
  category_name: string
  title:         string

  // Step 2 — Informações Básicas
  condition:           string
  seller_custom_field: string
  ean:                 string
  no_ean:              boolean
  attributes:          Record<string, string>
  // Recondicionado extras
  grading:             string   // 'excellent' | 'good' | 'acceptable'
  warranty_time:       number   // dias (mín 90 para recondicionado)

  // Step 3 — Preço e Logística
  plans: {
    classico: PlanConfig
    premium:  PlanConfig
  }
  package_weight: number   // grams
  package_length: number   // cm
  package_width:  number   // cm
  package_height: number   // cm
  free_shipping:  boolean
  local_pick_up:  boolean
  flex_shipping:  boolean

  // Step 4 — Mídia e Descrição
  description: string
  images:      string[]   // object URLs (blob:) or public https: URLs

  // Step 5 — Local de Expedição
  shipping_location_id: string
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════ */

const INITIAL: WizardData = {
  category_id:          '',
  category_name:        '',
  title:                '',
  condition:            'new',
  seller_custom_field:  '',
  ean:                  '',
  no_ean:               false,
  attributes:           {},
  grading:              '',
  warranty_time:        90,
  plans: {
    classico: { enabled: true,  listing_type_id: 'gold_special', price: 0, quantity: 1 },
    premium:  { enabled: false, listing_type_id: 'gold_pro',     price: 0, quantity: 1 },
  },
  package_weight: 0,
  package_length: 0,
  package_width:  0,
  package_height: 0,
  free_shipping:  false,
  local_pick_up:  false,
  flex_shipping:  false,
  description:    '',
  images:         [],
  shipping_location_id: '',
}

const STEPS = [
  { icon: Tag,       label: 'Título e Categoria'    },
  { icon: Search,    label: 'Informações Básicas'   },
  { icon: DollarSign,label: 'Preço e Logística'     },
  { icon: ImageIcon, label: 'Mídia e Descrição'     },
  { icon: MapPin,    label: 'Local de Expedição'    },
  { icon: Eye,       label: 'Revisão'               },
]

const ML_COMMISSION: Record<string, number> = {
  gold_special: 0.11,
  gold_pro:     0.16,
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcNet(price: number, type: string): number {
  const comm = ML_COMMISSION[type] ?? 0.16
  return price * (1 - comm)
}

/* ══════════════════════════════════════════════════════════════════════════
   PRIMITIVE UI
══════════════════════════════════════════════════════════════════════════ */

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs mb-1.5 font-medium text-slate-400">
      {children}
      {required && (
        <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Obrigatório</span>
      )}
    </label>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-xl bg-dark-700 border border-white/[0.08] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-colors'
const selectCls = inputCls

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-slate-600 mt-1">{children}</p>
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 1 — CATEGORY SEARCH + TREE BROWSER
══════════════════════════════════════════════════════════════════════════ */

/** Tree browser modal — navigable category tree */
function CategoryTreeModal({
  onSelect, onClose,
}: {
  onSelect: (id: string, name: string) => void
  onClose:  () => void
}) {
  const [stack, setStack] = useState<{ id: string; name: string }[]>([])
  const [children, setChildren] = useState<ChildCategory[]>([])
  const [loading, setLoading]   = useState(true)
  const [pathFromRoot, setPathFromRoot] = useState<ChildCategory[]>([])

  const currentId = stack.length > 0 ? stack[stack.length - 1].id : null

  useEffect(() => {
    setLoading(true)
    const url = currentId
      ? `/api/mercadolivre/categories/${currentId}/children`
      : '/api/mercadolivre/categories/root'

    if (!currentId) {
      fetch(url)
        .then(r => r.json() as Promise<ChildCategory[]>)
        .then(list => {
          setChildren(Array.isArray(list) ? list : [])
          setPathFromRoot([])
        })
        .catch(() => setChildren([]))
        .finally(() => setLoading(false))
    } else {
      fetch(url)
        .then(r => r.json() as Promise<{ children: ChildCategory[]; path_from_root: ChildCategory[]; name: string }>)
        .then(d => {
          setChildren(Array.isArray(d.children) ? d.children : [])
          setPathFromRoot(Array.isArray(d.path_from_root) ? d.path_from_root : [])
        })
        .catch(() => setChildren([]))
        .finally(() => setLoading(false))
    }
  }, [currentId])

  function navigate(child: ChildCategory) {
    setStack(prev => [...prev, { id: child.id, name: child.name }])
  }

  function goBack() {
    setStack(prev => prev.slice(0, -1))
  }

  function goRoot() {
    setStack([])
  }

  function handleSelect(cat: ChildCategory) {
    const breadcrumb = pathFromRoot.length > 0
      ? [...pathFromRoot.map(p => p.name), cat.name].join(' > ')
      : cat.name
    onSelect(cat.id, breadcrumb)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0a0d13] border border-white/[0.1] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <p className="text-sm font-bold text-white">Navegar por categorias</p>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.04] shrink-0 flex-wrap">
          <button onClick={goRoot} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white transition-colors">
            <Home className="w-3 h-3" /> Início
          </button>
          {stack.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-slate-700" />
              <button
                onClick={() => setStack(prev => prev.slice(0, i + 1))}
                className="text-[10px] text-slate-400 hover:text-white transition-colors truncate max-w-[120px]"
              >
                {s.name}
              </button>
            </div>
          ))}
        </div>

        {/* Back button */}
        {stack.length > 0 && (
          <button onClick={goBack}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-slate-500 hover:text-slate-300 border-b border-white/[0.04] shrink-0 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar
          </button>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Carregando...</span>
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-500">Nenhuma subcategoria encontrada.</p>
              {currentId && (
                <button
                  onClick={() => {
                    const cur = stack[stack.length - 1]
                    if (cur) {
                      const breadcrumb = pathFromRoot.map(p => p.name).join(' > ') || cur.name
                      onSelect(cur.id, breadcrumb)
                      onClose()
                    }
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all"
                >
                  Selecionar esta categoria
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Select current (if inside a category) */}
              {currentId && (
                <button
                  onClick={() => {
                    const cur = stack[stack.length - 1]
                    if (cur) {
                      const breadcrumb = pathFromRoot.map(p => p.name).join(' > ') || cur.name
                      onSelect(cur.id, breadcrumb)
                      onClose()
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs text-purple-300 hover:bg-purple-500/10 transition-colors mb-1"
                >
                  <Check className="w-3 h-3 shrink-0" />
                  Selecionar &ldquo;{stack[stack.length - 1]?.name}&rdquo;
                </button>
              )}
              {children.map(child => (
                <div key={child.id} className="flex items-center gap-1">
                  <button
                    onClick={() => handleSelect(child)}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.03] text-left transition-all"
                  >
                    <span className="text-sm text-white flex-1">{child.name}</span>
                    <span className="text-[10px] text-slate-600 font-mono shrink-0">{child.id}</span>
                  </button>
                  <button
                    onClick={() => navigate(child)}
                    className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
                    title="Ver subcategorias"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Step1TitleCategory({ data, setData, isPlanAtLeast }: { data: WizardData; setData: (d: WizardData) => void; isPlanAtLeast: (p: string) => boolean }) {
  const [suggestions, setSuggestions]     = useState<CategorySuggestion[]>([])
  const [sugLoading, setSugLoading]       = useState(false)
  const [sugFetched, setSugFetched]       = useState(false)
  const [showTree, setShowTree]           = useState(false)
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [titleImproving, setTitleImproving] = useState(false)
  const [titleSuggestion, setTitleSuggestion] = useState<{ improved_title: string; explanation: string; chars: number } | null>(null)

  const titleLen = data.title.length
  const charCls  = titleLen === 0  ? 'text-slate-600'
                 : titleLen < 10   ? 'text-amber-400'
                 : titleLen > 55   ? 'text-amber-400'
                 : 'text-green-400'

  const fetchSuggestions = useCallback(async (query: string, currentData: WizardData) => {
    if (query.trim().length < 10) {
      setSuggestions([])
      setSugFetched(false)
      return
    }
    setSugLoading(true)
    setSugFetched(true)
    try {
      // 1st attempt: ML domain_discovery (requires auth)
      const res = await fetch(`/api/mercadolivre/categories/suggest?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const json: unknown = await res.json()
        const list = Array.isArray(json) ? (json as CategorySuggestion[]) : []
        if (list.length > 0) {
          setSuggestions(list)
          if (!currentData.category_id) {
            const first = list[0]
            setData({ ...currentData, category_id: first.category_id, category_name: first.breadcrumb || first.category_name })
          }
          setSugLoading(false)
          return
        }
      }

      // 2nd attempt: AI via GPT-4o-mini + domain_discovery
      const aiRes = await fetch('/api/ai/suggest-category', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: query }),
      })
      if (aiRes.ok) {
        const aiJson = await aiRes.json() as {
          suggestions?: {
            category_id:   string
            category_name: string
            domain_id?:    string
            breadcrumb:    string
            reason:        string
            confidence:    number
            is_leaf?:      boolean
            source?:       string
          }[]
        }
        const aiList: CategorySuggestion[] = (aiJson.suggestions ?? []).map(s => ({
          category_id:   s.category_id,
          category_name: s.category_name,
          domain_name:   '',
          domain_id:     s.domain_id ?? '',
          breadcrumb:    s.breadcrumb || s.category_name,
          aiSuggested:   true,
          reason:        s.reason,
          confidence:    s.confidence,
          is_leaf:       s.is_leaf,
        }))
        setSuggestions(aiList)
        if (aiList.length > 0 && !currentData.category_id) {
          const first = aiList[0]
          setData({ ...currentData, category_id: first.category_id, category_name: first.breadcrumb || first.category_name })
        }
      } else {
        setSuggestions([])
      }
    } catch {
      setSuggestions([])
    } finally {
      setSugLoading(false)
    }
  }, [setData])

  function handleTitleChange(value: string) {
    const next: WizardData = { ...data, title: value, category_id: '', category_name: '' }
    setData(next)
    setSuggestions([])
    setSugFetched(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length >= 10) {
      debounceRef.current = setTimeout(() => fetchSuggestions(value, next), 600)
    }
  }

  function selectCategory(id: string, name: string) {
    setData({ ...data, category_id: id, category_name: name })
  }

  function handleTreeSelect(id: string, name: string) {
    setData({ ...data, category_id: id, category_name: name })
    setShowTree(false)
  }

  async function improveTitle() {
    if (data.title.trim().length < 10 || titleImproving) return
    setTitleImproving(true)
    setTitleSuggestion(null)
    try {
      const res = await fetch('/api/ai/improve-title', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: data.title, category: data.category_name }),
      })
      if (res.ok) {
        const json = await res.json() as { improved_title?: string; explanation?: string; chars?: number }
        if (json.improved_title) {
          setTitleSuggestion({ improved_title: json.improved_title, explanation: json.explanation ?? '', chars: json.chars ?? json.improved_title.length })
        }
      }
    } catch {
      // silent
    } finally {
      setTitleImproving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Título ── */}
      <div>
        <Label required>Título do Anúncio</Label>
        <div className="relative">
          <input
            type="text"
            value={data.title}
            maxLength={60}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Ex: Tênis Masculino Marca XLS 42 Branco Esportivo"
            className={inputCls}
            autoFocus
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <Hint>Produto + Marca + Modelo + Especificações. Mínimo 10 caracteres.</Hint>
          <span className={`text-[10px] font-bold tabular-nums ${charCls}`}>{titleLen}/60</span>
        </div>
        {titleLen > 0 && titleLen < 10 && (
          <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Digite mais {10 - titleLen} caractere(s) para buscar categorias automaticamente.
          </p>
        )}

        {/* ── AI Title Improve ── */}
        {titleLen >= 10 && (
          <div className="mt-2">
            <button
              onClick={isPlanAtLeast('almirante') ? improveTitle : undefined}
              disabled={titleImproving || !isPlanAtLeast('almirante')}
              title={!isPlanAtLeast('almirante') ? 'Disponível no plano Almirante ou superior' : ''}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isPlanAtLeast('almirante')
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-60'
                  : 'bg-dark-700 border border-white/[0.08] text-slate-500 cursor-not-allowed'
              }`}
            >
              {titleImproving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Consultando IA...</>
                : <><Sparkles className="w-3.5 h-3.5" /> Melhorar título com IA{!isPlanAtLeast('almirante') && <span className="ml-1 text-[9px] opacity-70">🔒 Almirante+</span>}</>}
            </button>

            {titleSuggestion && (
              <div className="mt-2 p-3 rounded-xl border border-violet-500/30 bg-violet-500/[0.06] space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Sugestão de IA</span>
                </div>
                <p className="text-sm text-white font-medium">&ldquo;{titleSuggestion.improved_title}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-500">{titleSuggestion.explanation}</p>
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2">{titleSuggestion.chars}/60</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleTitleChange(titleSuggestion.improved_title)
                      setTitleSuggestion(null)
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                  >
                    Usar este título
                  </button>
                  <button
                    onClick={() => setTitleSuggestion(null)}
                    className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Categorias sugeridas ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label required>Categoria</Label>
          <button
            onClick={() => setShowTree(true)}
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Grid3X3 className="w-3 h-3" />
            Navegar por todas
          </button>
        </div>

        {/* Status / spinner */}
        {titleLen < 10 && !data.category_id && (
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-dark-700 border border-white/[0.06] text-slate-600">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">Aguardando título para sugerir categorias...</span>
          </div>
        )}

        {sugLoading && (
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-dark-700 border border-white/[0.06] text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="text-xs">Buscando categorias...</span>
          </div>
        )}

        {/* Suggestion radio list */}
        {!sugLoading && sugFetched && suggestions.length > 0 && (
          <div className="space-y-1.5">
            {suggestions.map((s, idx) => {
              const isSelected = data.category_id === s.category_id
              return (
                <button
                  key={s.category_id}
                  onClick={() => selectCategory(s.category_id, s.breadcrumb || s.category_name)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-purple-500/40 bg-purple-500/[0.08]'
                      : 'border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Radio dot */}
                  <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-medium">{s.category_name}</span>
                      {idx === 0 && !s.aiSuggested && (
                        <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full shrink-0">
                          Mais relevante
                        </span>
                      )}
                      {s.aiSuggested && (
                        <span className="text-[9px] font-bold bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Categoria identificada por IA
                        </span>
                      )}
                      {s.aiSuggested && s.is_leaf === true && (
                        <span className="text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full shrink-0">
                          Categoria específica ✓
                        </span>
                      )}
                    </div>
                    {/* Breadcrumb — always shown for AI suggestions */}
                    {s.breadcrumb && s.breadcrumb !== s.category_name && (
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate" title={s.breadcrumb}>{s.breadcrumb}</p>
                    )}
                    {/* AI decision summary */}
                    {s.aiSuggested && s.reason && (
                      <p className="text-[10px] text-violet-400/70 mt-0.5">{s.reason}</p>
                    )}
                    {/* Generic category warning */}
                    {s.aiSuggested && s.is_leaf === false && (
                      <p className="text-[10px] text-amber-400/80 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                        Categoria genérica — considere navegar para uma mais específica
                      </p>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-600 font-mono shrink-0 mt-0.5">{s.category_id}</span>
                </button>
              )
            })}
          </div>
        )}

        {!sugLoading && sugFetched && suggestions.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-slate-500 mb-2">Nenhuma sugestão encontrada para este título.</p>
            <button
              onClick={() => setShowTree(true)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Navegar pela árvore de categorias →
            </button>
          </div>
        )}

        {/* Selected category pill (when selected via tree or after suggestions) */}
        {data.category_id && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl mt-2">
            <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
            <span className="text-xs text-green-300 font-semibold shrink-0">Selecionada:</span>
            <span className="text-xs text-white flex-1 min-w-0 truncate">{data.category_name}</span>
            <span className="text-[10px] text-slate-500 font-mono shrink-0">({data.category_id})</span>
            <button
              onClick={() => setData({ ...data, category_id: '', category_name: '' })}
              className="p-0.5 text-slate-500 hover:text-red-400 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tree modal */}
      {showTree && (
        <CategoryTreeModal
          onSelect={handleTreeSelect}
          onClose={() => setShowTree(false)}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 2 — INFORMAÇÕES BÁSICAS
══════════════════════════════════════════════════════════════════════════ */

const CONDITIONS = [
  { value: 'new',           label: 'Novo',           desc: 'Produto sem uso, na embalagem original.' },
  { value: 'used',          label: 'Usado',          desc: 'Produto já utilizado pelo vendedor.'      },
  { value: 'not_specified', label: 'Recondicionado', desc: 'Produto restaurado ou reformado.'         },
]

function Step2Basic({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const [attrs, setAttrs]         = useState<CategoryAttribute[]>([])
  const [attrsLoading, setAttrsLoading] = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  useEffect(() => {
    if (!data.category_id) { setAttrs([]); return }
    setAttrsLoading(true)
    fetch(`/api/mercadolivre/categories/${data.category_id}/attributes`)
      .then(r => r.json() as Promise<CategoryAttribute[]>)
      .then(list => setAttrs(Array.isArray(list) ? list : []))
      .catch(() => setAttrs([]))
      .finally(() => setAttrsLoading(false))
  }, [data.category_id])

  const requiredAttrs = attrs.filter(a => a.required)
  const optionalAttrs = attrs.filter(a => !a.required)

  function setAttr(id: string, value: string) {
    setData({ ...data, attributes: { ...data.attributes, [id]: value } })
  }

  function renderAttrField(attr: CategoryAttribute, isRequired: boolean) {
    const val = data.attributes[attr.id] ?? ''
    if (attr.values && attr.values.length > 0) {
      return (
        <div key={attr.id}>
          <Label required={isRequired}>{attr.name}</Label>
          <div className="flex flex-wrap gap-1.5">
            {!isRequired && (
              <button
                onClick={() => setAttr(attr.id, 'N/A')}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${val === 'N/A' ? 'border-slate-500 bg-slate-700 text-slate-300' : 'border-white/[0.06] text-slate-600 hover:border-white/[0.15]'}`}
              >
                N/A
              </button>
            )}
            {attr.values.map(v => (
              <button
                key={v.id}
                onClick={() => setAttr(attr.id, v.id)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${val === v.id ? 'border-purple-500/40 bg-purple-500/[0.12] text-purple-300' : 'border-white/[0.06] text-slate-400 hover:border-white/[0.2] hover:text-white'}`}
              >
                {v.name}
              </button>
            ))}
          </div>
          {attr.hint && <Hint>{attr.hint}</Hint>}
        </div>
      )
    }
    return (
      <div key={attr.id}>
        <Label required={isRequired}>{attr.name}</Label>
        <div className="flex gap-2">
          {!isRequired && (
            <button
              onClick={() => setAttr(attr.id, val === 'N/A' ? '' : 'N/A')}
              className={`px-2.5 py-2 rounded-xl text-xs border shrink-0 transition-all ${val === 'N/A' ? 'border-slate-500 bg-slate-700 text-slate-300' : 'border-white/[0.06] text-slate-600 hover:border-white/[0.15]'}`}
            >
              N/A
            </button>
          )}
          <input
            type={attr.type === 'number' ? 'number' : 'text'}
            value={val === 'N/A' ? '' : val}
            maxLength={attr.value_max_length}
            disabled={val === 'N/A'}
            onChange={e => setAttr(attr.id, e.target.value)}
            placeholder={attr.hint ?? attr.name}
            className={inputCls + (val === 'N/A' ? ' opacity-40' : '')}
          />
        </div>
        {attr.hint && <Hint>{attr.hint}</Hint>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Condição */}
      <div>
        <Label required>Condição</Label>
        <div className="grid grid-cols-3 gap-2">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setData({ ...data, condition: c.value })}
              className={`flex flex-col gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${data.condition === c.value ? 'border-purple-500/40 bg-purple-500/[0.08]' : 'border-white/[0.06] hover:border-white/[0.15]'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${data.condition === c.value ? 'border-purple-500 bg-purple-500' : 'border-slate-600'}`}>
                  {data.condition === c.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-xs font-semibold text-white">{c.label}</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-tight">{c.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Aviso: Produto Usado ── */}
      {data.condition === 'used' && (
        <div className="px-4 py-3 bg-blue-500/[0.06] border border-blue-500/20 rounded-xl space-y-1.5">
          <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Produto Usado — Regras do Mercado Livre
          </p>
          <ul className="text-[11px] text-slate-400 space-y-1 pl-5 list-disc">
            <li>Descreva detalhadamente o estado real do produto na descrição</li>
            <li>Informe defeitos, desgastes ou problemas se houver</li>
            <li>Fotos do produto real são obrigatórias (sem fotos genéricas)</li>
            <li>Não inclua a palavra "usado" no título</li>
          </ul>
        </div>
      )}

      {/* ── Aviso + campos: Recondicionado ── */}
      {data.condition === 'not_specified' && (
        <div className="space-y-4">
          <div className="px-4 py-3 bg-blue-500/[0.06] border border-blue-500/20 rounded-xl space-y-1.5">
            <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Produto Recondicionado — Campos obrigatórios
            </p>
            <ul className="text-[11px] text-slate-400 space-y-1 pl-5 list-disc">
              <li>Garantia mínima de 90 dias (obrigatório por lei)</li>
              <li>Grau do produto (obrigatório pelo ML)</li>
            </ul>
          </div>

          {/* Grau */}
          <div>
            <Label required>Grau do Produto</Label>
            <select
              value={data.grading}
              onChange={e => setData({ ...data, grading: e.target.value })}
              className={selectCls}
            >
              <option value="">Selecione o grau *</option>
              <option value="excellent">Excelente — Como novo, sem sinais de uso</option>
              <option value="good">Bom — Funcionando perfeitamente, sinais leves de uso</option>
              <option value="acceptable">Aceitável — Funcionando, sinais visíveis de uso</option>
            </select>
            {!data.grading && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />Grau é obrigatório para produtos recondicionados.</p>}
          </div>

          {/* Garantia */}
          <div>
            <Label required>Tempo de Garantia (dias)</Label>
            <input
              type="number"
              min={90}
              value={data.warranty_time || ''}
              onChange={e => setData({ ...data, warranty_time: Math.max(0, parseInt(e.target.value) || 0) })}
              placeholder="Mínimo 90 dias *"
              className={inputCls}
            />
            {data.warranty_time > 0 && data.warranty_time < 90 && (
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />Garantia mínima de 90 dias para recondicionados.</p>
            )}
            <Hint>Exigido por lei para produtos recondicionados. Mínimo 90 dias.</Hint>
          </div>
        </div>
      )}

      {/* SKU */}
      <div>
        <Label>SKU Interno</Label>
        <input
          type="text"
          value={data.seller_custom_field}
          onChange={e => setData({ ...data, seller_custom_field: e.target.value })}
          placeholder="Código interno do produto"
          className={inputCls}
        />
        <Hint>Opcional — apenas para seu controle interno.</Hint>
      </div>

      {/* EAN */}
      <div>
        <Label required={!data.no_ean}>EAN / GTIN (código de barras)</Label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="no_ean"
            checked={data.no_ean}
            onChange={e => setData({ ...data, no_ean: e.target.checked, ean: '' })}
            className="w-4 h-4 rounded border-white/[0.2] bg-dark-700 accent-purple-500"
          />
          <label htmlFor="no_ean" className="text-xs text-slate-400 cursor-pointer">Não tenho código de barras</label>
        </div>
        {!data.no_ean && (
          <>
            <input
              type="text"
              value={data.ean}
              onChange={e => setData({ ...data, ean: e.target.value.replace(/\D/g, '') })}
              placeholder="7891000000000"
              maxLength={14}
              className={inputCls}
            />
            <Hint>8, 12, 13 ou 14 dígitos. Melhora significativamente a indexação do anúncio.</Hint>
            {data.ean.length > 0 && data.ean.length < 8 && (
              <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                EAN deve ter pelo menos 8 dígitos.
              </p>
            )}
          </>
        )}
      </div>

      {/* Dynamic attributes */}
      {data.category_id && (
        <div className="space-y-4">
          {attrsLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="text-xs">Carregando atributos da categoria...</span>
            </div>
          ) : (
            <>
              {/* Required attrs */}
              {requiredAttrs.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atributos Obrigatórios</p>
                  {requiredAttrs.map(a => renderAttrField(a, true))}
                </div>
              )}

              {/* Optional attrs toggle */}
              {optionalAttrs.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowOptional(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showOptional ? 'rotate-90' : ''}`} />
                    {showOptional ? 'Ocultar' : 'Ver'} atributos opcionais ({optionalAttrs.length})
                  </button>
                  {showOptional && (
                    <div className="space-y-4 mt-4 pl-4 border-l border-white/[0.06]">
                      {optionalAttrs.map(a => renderAttrField(a, false))}
                    </div>
                  )}
                </div>
              )}

              {requiredAttrs.length === 0 && optionalAttrs.length === 0 && (
                <p className="text-xs text-slate-600">Nenhum atributo adicional para esta categoria.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 3 — PREÇO E LOGÍSTICA
══════════════════════════════════════════════════════════════════════════ */

function PlanPriceCard({
  label, type, config, onChange,
}: {
  label:    string
  type:     'classico' | 'premium'
  config:   PlanConfig
  onChange: (c: PlanConfig) => void
}) {
  const net      = calcNet(config.price, config.listing_type_id)
  const commRate = (ML_COMMISSION[config.listing_type_id] ?? 0) * 100
  // type is used for future extensibility
  void type

  return (
    <div className={`rounded-2xl border p-4 space-y-4 transition-all ${config.enabled ? 'border-purple-500/30 bg-purple-500/[0.04]' : 'border-white/[0.06] bg-white/[0.01] opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{config.listing_type_id} · {commRate}% comissão</p>
        </div>
        <button
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className={`relative w-10 h-5 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-dark-700 border border-white/[0.1]'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {config.enabled && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Preço (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
                <input
                  type="number" value={config.price || ''} min={0.01} step={0.01}
                  onChange={e => onChange({ ...config, price: parseFloat(e.target.value) || 0 })}
                  className={inputCls + ' pl-8'}
                />
              </div>
            </div>
            <div>
              <Label required>Estoque</Label>
              <input
                type="number" value={config.quantity || ''} min={1} step={1}
                onChange={e => onChange({ ...config, quantity: Math.max(1, Math.floor(parseFloat(e.target.value) || 1)) })}
                className={inputCls}
              />
            </div>
          </div>

          {config.price > 0 && (
            <div className="px-3 py-2 bg-dark-800 rounded-xl border border-white/[0.06]">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Comissão ML ({commRate}%)</span>
                <span className="text-red-400">-{fmtBRL(config.price * (ML_COMMISSION[config.listing_type_id] ?? 0))}</span>
              </div>
              <div className="flex justify-between text-[11px] mt-1 pt-1 border-t border-white/[0.06]">
                <span className="text-slate-400 font-semibold">Você recebe</span>
                <span className="text-green-400 font-bold">{fmtBRL(net)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DimInput({ label, value, unit, onChange }: { label: string; value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number" min={0} step={unit === 'g' ? 1 : 0.1}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={inputCls + ' pr-10'}
          placeholder="0"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  )
}

function ShippingToggle({ label, desc, value, color = 'green', onChange }: {
  label:    string
  desc:     string
  value:    boolean
  color?:   string
  onChange: (v: boolean) => void
}) {
  const activeCls = color === 'amber'
    ? 'border-amber-500/30 bg-amber-500/[0.04]'
    : 'border-green-500/30 bg-green-500/[0.04]'
  const toggleCls = color === 'amber' ? (value ? 'bg-amber-500' : '') : (value ? 'bg-green-500' : '')

  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${value ? activeCls : 'border-white/[0.06] bg-white/[0.02]'}`}
      onClick={() => onChange(!value)}
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${toggleCls || 'bg-dark-700 border border-white/[0.1]'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </div>
  )
}

function Step3PriceLogistics({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const anyPlanActive = data.plans.classico.enabled || data.plans.premium.enabled
  const anyPlanValid  = (data.plans.classico.enabled && data.plans.classico.price > 0 && data.plans.classico.quantity > 0)
                     || (data.plans.premium.enabled  && data.plans.premium.price  > 0 && data.plans.premium.quantity  > 0)

  // Lowest active price for free-shipping rules
  const activePrices = [
    data.plans.classico.enabled ? data.plans.classico.price : 0,
    data.plans.premium.enabled  ? data.plans.premium.price  : 0,
  ].filter(p => p > 0)
  const lowestPrice = activePrices.length > 0 ? Math.min(...activePrices) : 0

  return (
    <div className="space-y-6">
      {/* ── Embalagem ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Dimensões da Embalagem</p>
        </div>
        <div className="px-3 py-2 bg-blue-500/[0.06] border border-blue-500/20 rounded-xl mb-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-300">Peso máximo: 30 kg. Soma das dimensões: máx. 200 cm. Necessário para cálculo de frete.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DimInput label="Peso" value={data.package_weight} unit="g"  onChange={v => setData({ ...data, package_weight: v })} />
          <DimInput label="Comprimento" value={data.package_length} unit="cm" onChange={v => setData({ ...data, package_length: v })} />
          <DimInput label="Largura"  value={data.package_width}  unit="cm" onChange={v => setData({ ...data, package_width:  v })} />
          <DimInput label="Altura"   value={data.package_height} unit="cm" onChange={v => setData({ ...data, package_height: v })} />
        </div>
        {(data.package_weight === 0) && (
          <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Peso é obrigatório para calcular o frete.
          </p>
        )}
      </div>

      {/* ── Planos ── */}
      <div>
        <p className="text-xs text-slate-500 mb-3">
          Ative os planos desejados e configure preço e estoque para cada um.
        </p>
        <div className="space-y-3">
          <PlanPriceCard
            label="Plano Clássico"
            type="classico"
            config={data.plans.classico}
            onChange={c => setData({ ...data, plans: { ...data.plans, classico: c } })}
          />
          <PlanPriceCard
            label="Plano Premium"
            type="premium"
            config={data.plans.premium}
            onChange={c => setData({ ...data, plans: { ...data.plans, premium: c } })}
          />
        </div>
        {!anyPlanActive && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">Ative ao menos um plano para continuar.</p>
          </div>
        )}
        {anyPlanActive && !anyPlanValid && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">Defina preço e estoque (mínimo 1) para o plano ativo.</p>
          </div>
        )}
      </div>

      {/* ── Frete / envio ── */}
      <div>
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Opções de Envio</p>
        <div className="space-y-2">
          {/* Free shipping with ML 2025 rules */}
          <div>
            <ShippingToggle
              label="Frete Grátis"
              desc={
                lowestPrice > 79  ? 'Obrigatório para este preço — ML pode exigir.' :
                lowestPrice >= 19 ? 'ML banca o custo do frete para você nesta faixa.' :
                lowestPrice > 0   ? 'Você arcará com o custo do frete para este preço.' :
                'O frete é por sua conta — aumenta conversão mas reduz margem.'
              }
              value={data.free_shipping}
              onChange={v => setData({ ...data, free_shipping: v })}
            />
            {/* Contextual alerts */}
            {lowestPrice > 79 && !data.free_shipping && (
              <div className="mt-1.5 flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[11px] text-amber-300">⚠️ Frete grátis obrigatório para produtos acima de R$79. O ML pode exigir na publicação.</p>
              </div>
            )}
            {lowestPrice > 0 && lowestPrice < 19 && data.free_shipping && (
              <div className="mt-1.5 flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[11px] text-amber-300">⚠️ Para preços abaixo de R$19, você arcará com o custo do frete grátis.</p>
              </div>
            )}
            {/* ML rules info */}
            <details className="mt-1.5">
              <summary className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1">
                <Info className="w-3 h-3" /> Regras de Frete Grátis ML 2025
              </summary>
              <div className="mt-1.5 px-3 py-2 bg-blue-500/[0.06] border border-blue-500/20 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-400">• Produtos <span className="text-white font-semibold">&gt; R$79</span>: frete grátis obrigatório (ML pode exigir)</p>
                <p className="text-[10px] text-slate-400">• Produtos <span className="text-white font-semibold">R$19–R$79</span>: ML banca o custo do frete grátis</p>
                <p className="text-[10px] text-slate-400">• Produtos <span className="text-white font-semibold">&lt; R$19</span>: você arca com o custo do frete grátis</p>
              </div>
            </details>
          </div>
          <ShippingToggle
            label="⚡ Envio Flex"
            desc="Entrega no mesmo dia — Mercado Envios Flex."
            value={data.flex_shipping}
            color="amber"
            onChange={v => setData({ ...data, flex_shipping: v })}
          />
          <ShippingToggle
            label="Retirada Pessoal"
            desc="Permite que o comprador retire o produto fisicamente."
            value={data.local_pick_up}
            onChange={v => setData({ ...data, local_pick_up: v })}
          />
        </div>
        {data.flex_shipping && (
          <div className="mt-2 px-3 py-2 bg-amber-500/[0.08] border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
            ⚠️ O Flex exige que você prepare e envie o pedido no mesmo dia de compra.
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 4 — MÍDIA E DESCRIÇÃO
══════════════════════════════════════════════════════════════════════════ */

function Step4MediaDescription({
  data, setData, imageFiles, isPlanAtLeast,
}: {
  data:           WizardData
  setData:        (d: WizardData) => void
  imageFiles:     React.MutableRefObject<File[]>
  isPlanAtLeast:  (p: string) => boolean
}) {
  const [dragOver, setDragOver]         = useState(false)
  const fileInputRef                    = useRef<HTMLInputElement>(null)
  const [descGenerating, setDescGenerating] = useState(false)
  const [descAiBadge, setDescAiBadge]   = useState(false)

  async function generateDescription() {
    if (descGenerating) return
    setDescGenerating(true)
    setDescAiBadge(false)
    try {
      const res = await fetch('/api/ai/generate-description', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: data.title, category: data.category_name, attributes: data.attributes }),
      })
      if (res.ok) {
        const json = await res.json() as { description?: string }
        if (json.description) {
          setData({ ...data, description: json.description })
          setDescAiBadge(true)
        }
      }
    } catch {
      // silent
    } finally {
      setDescGenerating(false)
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const accepted = Array.from(files).filter(f => f.type.startsWith('image/'))
    const remaining = 12 - data.images.length
    const toAdd = accepted.slice(0, remaining)
    if (toAdd.length === 0) return

    const newUrls = toAdd.map(f => URL.createObjectURL(f))
    imageFiles.current = [...imageFiles.current, ...toAdd]
    setData({ ...data, images: [...data.images, ...newUrls] })
  }

  function removeImage(idx: number) {
    const url = data.images[idx]
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
    imageFiles.current = imageFiles.current.filter((_, i) => {
      // find corresponding file index
      const blobUrls = data.images.filter(u => u.startsWith('blob:'))
      const blobIdx  = blobUrls.indexOf(url)
      return i !== blobIdx
    })
    setData({ ...data, images: data.images.filter((_, i) => i !== idx) })
  }

  const validImages = data.images.filter(Boolean)

  return (
    <div className="space-y-6">
      {/* ── Imagens ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label required>Imagens do Produto</Label>
          <span className="text-[10px] text-slate-500">{validImages.length}/12</span>
        </div>

        {/* Requirements */}
        <div className="flex flex-wrap gap-3 mb-3">
          {[
            { ok: validImages.length >= 1,  txt: 'Mín. 1 imagem'    },
            { ok: false,                     txt: 'JPG ou PNG'       },
            { ok: false,                     txt: 'Mín. 500×500 px'  },
            { ok: false,                     txt: 'Máx. 10 MB/foto'  },
            { ok: validImages.length >= 3,  txt: 'Ideal: 3+'         },
          ].map(r => (
            <span key={r.txt} className={`flex items-center gap-1 text-[10px] ${r.ok ? 'text-green-400' : 'text-slate-600'}`}>
              {r.ok ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center">·</span>}
              {r.txt}
            </span>
          ))}
        </div>

        {/* Drop zone */}
        {validImages.length < 12 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
              dragOver ? 'border-purple-500/60 bg-purple-500/[0.06] scale-[1.01]' : 'border-white/[0.1] hover:border-white/[0.25] hover:bg-white/[0.02]'
            }`}
          >
            <Upload className={`w-6 h-6 ${dragOver ? 'text-purple-400' : 'text-slate-600'}`} />
            <p className="text-xs text-slate-500">Arraste imagens aqui ou <span className="text-purple-400">clique para selecionar</span></p>
            <p className="text-[10px] text-slate-700">Fundo branco na primeira imagem recomendado</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />
          </div>
        )}

        {/* Previews */}
        {validImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {data.images.map((url, idx) => (
              url ? (
                <div key={idx} className="relative group aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Imagem ${idx + 1}`}
                    className="w-full h-full object-cover rounded-xl border border-white/[0.08]"
                  />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 rounded-md">
                      <span className="text-[9px] text-yellow-400 font-bold">CAPA</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null
            ))}
          </div>
        )}

        {validImages.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl mt-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-300">Adicione pelo menos uma imagem para continuar.</p>
          </div>
        )}
      </div>

      {/* ── Descrição ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>Descrição do Produto</Label>
          <button
            onClick={isPlanAtLeast('almirante') ? generateDescription : undefined}
            disabled={descGenerating || !isPlanAtLeast('almirante')}
            title={!isPlanAtLeast('almirante') ? 'Disponível no plano Almirante ou superior' : ''}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isPlanAtLeast('almirante')
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-60'
                : 'bg-dark-700 border border-white/[0.08] text-slate-500 cursor-not-allowed'
            }`}
          >
            {descGenerating
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Consultando IA...</>
              : <><Sparkles className="w-3.5 h-3.5" /> Gerar com IA{!isPlanAtLeast('almirante') && <span className="ml-1 text-[9px] opacity-70">🔒 Almirante+</span>}</>}
          </button>
        </div>
        {descAiBadge && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-300">Conteúdo gerado por IA</span>
            </div>
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              Sempre revise antes de publicar. As informações geradas podem não ser precisas. Verifique se correspondem ao seu produto real antes de publicar no ML.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-2">
          {['Material e composição', 'Dimensões reais', 'Modo de uso', 'Compatibilidade', 'Conteúdo da embalagem'].map(tip => (
            <span key={tip} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-500">
              💡 {tip}
            </span>
          ))}
        </div>
        <textarea
          value={data.description}
          onChange={e => setData({ ...data, description: e.target.value.slice(0, 5000) })}
          rows={7}
          placeholder="Descreva o produto detalhadamente: material, tamanho, cor, especificações técnicas, modo de uso..."
          className={inputCls + ' resize-none'}
        />
        <div className="flex items-center justify-between mt-1">
          <Hint>Apenas texto simples, sem HTML. Descrições completas vendem mais.</Hint>
          <span className={`text-[10px] tabular-nums ${data.description.length >= 200 ? 'text-green-400' : 'text-slate-600'}`}>
            {data.description.length}/5000
          </span>
        </div>
        {data.description.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">Sem descrição. Anúncios com descrição detalhada vendem muito mais.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 5 — LOCAL DE EXPEDIÇÃO
══════════════════════════════════════════════════════════════════════════ */

function Step5ShippingLocation({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const [locations, setLocations] = useState<ShippingLocation[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/mercadolivre/shipping-locations')
      .then(r => r.json() as Promise<ShippingLocation[]>)
      .then(list => {
        const l = Array.isArray(list) ? list : []
        setLocations(l)
        // Auto-select if only one
        if (l.length === 1 && !data.shipping_location_id) {
          setData({ ...data, shipping_location_id: l[0].id })
        }
      })
      .catch(() => { setError(true) })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Carregando locais de expedição...</span>
      </div>
    )
  }

  if (error || locations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-semibold">Nenhum local de expedição encontrado</p>
            <p className="text-xs text-slate-500 mt-1">
              Configure seu endereço de expedição nas configurações do Mercado Livre.
            </p>
          </div>
        </div>
        <a
          href="https://www.mercadolivre.com.br/perfil/configuracoes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.1] text-xs text-blue-400 hover:border-blue-400/30 hover:bg-blue-400/[0.04] transition-all w-fit"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Configurar no Mercado Livre
        </a>
        <p className="text-[11px] text-slate-600">Você pode pular esta etapa e configurar o local de expedição depois.</p>
      </div>
    )
  }

  if (locations.length === 1) {
    const loc = locations[0]
    const addressDetail = [loc.address_line, loc.city, loc.state].filter(Boolean).join(', ')
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Local de expedição padrão da sua conta:</p>
        <div className="flex items-start gap-3 px-4 py-3.5 bg-green-500/[0.06] border border-green-500/20 rounded-xl">
          <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{loc.name}</p>
            {addressDetail && <p className="text-[11px] text-slate-400 mt-0.5">{addressDetail}</p>}
            {loc.zip_code && <p className="text-[10px] text-slate-600 mt-0.5">CEP: {loc.zip_code}</p>}
          </div>
        </div>
        <div className="px-3 py-2 bg-dark-700/50 rounded-xl border border-white/[0.05]">
          <p className="text-[11px] text-slate-500">Este é seu endereço cadastrado no ML. Para alterar, acesse suas configurações no Mercado Livre.</p>
        </div>
        <a
          href="https://www.mercadolivre.com.br/perfil/configuracoes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Configurar no Mercado Livre
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Selecione de qual endereço este produto será expedido:</p>
      {locations.map(loc => {
        const addressDetail = [loc.address_line, loc.city, loc.state].filter(Boolean).join(', ')
        return (
          <button
            key={loc.id}
            onClick={() => setData({ ...data, shipping_location_id: loc.id })}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
              data.shipping_location_id === loc.id
                ? 'border-purple-500/40 bg-purple-500/[0.08]'
                : 'border-white/[0.06] hover:border-white/[0.15]'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
              data.shipping_location_id === loc.id ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
            }`}>
              {data.shipping_location_id === loc.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{loc.name}</p>
              {addressDetail && <p className="text-[11px] text-slate-400 mt-0.5">{addressDetail}</p>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 6 — REVISÃO + SAÚDE DO ANÚNCIO
══════════════════════════════════════════════════════════════════════════ */

function calcHealthScore(data: WizardData): { score: number; checks: { label: string; pts: number; ok: boolean; warn: boolean }[] } {
  const imgs = data.images.filter(Boolean)
  const requiredAttrsFilled = Object.values(data.attributes).filter(Boolean).length > 0

  const checks = [
    {
      label: 'Título entre 40 e 60 caracteres',
      pts:   15,
      ok:    data.title.length >= 40 && data.title.length <= 60,
      warn:  data.title.length >= 10 && (data.title.length < 40 || data.title.length > 60),
    },
    {
      label: 'Categoria selecionada',
      pts:   10,
      ok:    !!data.category_id,
      warn:  false,
    },
    {
      label: imgs.length >= 3 ? '3 ou mais imagens' : imgs.length >= 1 ? 'Pelo menos 1 imagem' : 'Nenhuma imagem',
      pts:   imgs.length >= 3 ? 20 : imgs.length >= 1 ? 10 : 0,
      ok:    imgs.length >= 3,
      warn:  imgs.length >= 1 && imgs.length < 3,
    },
    {
      label: 'Descrição com 200+ caracteres',
      pts:   15,
      ok:    data.description.length >= 200,
      warn:  data.description.length > 0 && data.description.length < 200,
    },
    {
      label: 'EAN / código de barras',
      pts:   10,
      ok:    data.ean.length >= 8,
      warn:  data.no_ean,
    },
    {
      label: 'Atributos obrigatórios preenchidos',
      pts:   10,
      ok:    requiredAttrsFilled,
      warn:  false,
    },
    {
      label: 'Peso e dimensões informados',
      pts:   10,
      ok:    data.package_weight > 0 && (data.package_length > 0 || data.package_width > 0 || data.package_height > 0),
      warn:  data.package_weight > 0 && data.package_length === 0 && data.package_width === 0 && data.package_height === 0,
    },
    {
      label: 'Plano com preço definido',
      pts:   10,
      ok:    (data.plans.classico.enabled && data.plans.classico.price > 0)
          || (data.plans.premium.enabled  && data.plans.premium.price  > 0),
      warn:  false,
    },
  ]

  const score = checks.reduce((acc, c) => acc + (c.ok ? c.pts : 0), 0)
  return { score, checks }
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[10px] text-slate-500 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-white flex-1">{value || <span className="text-slate-600">—</span>}</span>
    </div>
  )
}

function Step6Review({ data, onBack }: { data: WizardData; onBack: () => void }) {
  const { score, checks } = calcHealthScore(data)
  const activePlans = [
    data.plans.classico.enabled && { name: 'Clássico', config: data.plans.classico },
    data.plans.premium.enabled  && { name: 'Premium',  config: data.plans.premium  },
  ].filter(Boolean) as { name: string; config: PlanConfig }[]

  const COND: Record<string, string> = { new: 'Novo', used: 'Usado', not_specified: 'Recondicionado' }

  const scoreColor = score >= 80 ? 'text-green-400'
                   : score >= 50 ? 'text-amber-400'
                   : 'text-red-400'
  const barColor   = score >= 80 ? 'bg-green-500'
                   : score >= 50 ? 'bg-amber-500'
                   : 'bg-red-500'
  const scoreLabel = score >= 80 ? 'Ótimo' : score >= 50 ? 'Regular' : 'Fraco'

  return (
    <div className="space-y-5">
      {/* ── Health Score ── */}
      <div className="bg-dark-800 border border-white/[0.06] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Saúde do Anúncio</p>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
            <span className="text-xs text-slate-600">/100</span>
            <span className={`ml-2 text-xs font-bold ${scoreColor}`}>{scoreLabel}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Checks */}
        <div className="space-y-1.5">
          {checks.map(c => (
            <div key={c.label} className="flex items-center gap-2.5">
              <span className="text-base shrink-0 w-5 text-center">
                {c.ok ? '✅' : c.warn ? '⚠️' : '❌'}
              </span>
              <span className={`text-xs flex-1 ${c.ok ? 'text-slate-300' : c.warn ? 'text-amber-400' : 'text-slate-500'}`}>
                {c.label}
              </span>
              <span className={`text-[10px] font-bold tabular-nums ${c.ok ? 'text-green-400' : 'text-slate-700'}`}>
                {c.ok ? `+${c.pts}` : `+0`}
              </span>
            </div>
          ))}
        </div>

        {score < 80 && (
          <button
            onClick={onBack}
            className="mt-4 w-full py-2 rounded-xl border border-amber-500/30 text-xs text-amber-400 hover:bg-amber-500/[0.06] transition-all"
          >
            ← Voltar e corrigir
          </button>
        )}
      </div>

      {/* ── Resumo ── */}
      <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informações Básicas</p>
        </div>
        <div className="px-4 py-2">
          <ReviewRow label="Título"    value={data.title} />
          <ReviewRow label="Categoria" value={<span>{data.category_name} <span className="text-slate-500 font-mono text-[10px]">({data.category_id})</span></span>} />
          <ReviewRow label="Condição"  value={COND[data.condition] ?? data.condition} />
          {data.seller_custom_field && <ReviewRow label="SKU"  value={data.seller_custom_field} />}
          {data.ean && <ReviewRow label="EAN" value={data.ean} />}
        </div>
      </div>

      <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planos de Venda</p>
        </div>
        <div className="px-4 py-2">
          {activePlans.map(({ name, config }) => (
            <ReviewRow
              key={config.listing_type_id}
              label={name}
              value={
                <span>
                  {fmtBRL(config.price)} · {config.quantity} un
                  <span className="text-slate-500 text-[10px] ml-2">
                    (recebe {fmtBRL(calcNet(config.price, config.listing_type_id))})
                  </span>
                </span>
              }
            />
          ))}
        </div>
      </div>

      <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Embalagem & Envio</p>
        </div>
        <div className="px-4 py-2">
          <ReviewRow label="Peso"         value={data.package_weight > 0 ? `${data.package_weight} g` : '—'} />
          <ReviewRow label="Dimensões"    value={[data.package_length, data.package_width, data.package_height].some(Boolean) ? `${data.package_length}×${data.package_width}×${data.package_height} cm` : '—'} />
          <ReviewRow label="Frete Grátis" value={data.free_shipping ? 'Sim' : 'Não'} />
          <ReviewRow label="Flex"         value={data.flex_shipping  ? '⚡ Ativo' : 'Inativo'} />
          <ReviewRow label="Retirada"     value={data.local_pick_up  ? 'Sim' : 'Não'} />
          <ReviewRow label="Imagens"      value={data.images.filter(Boolean).length > 0 ? `${data.images.filter(Boolean).length} imagem(ns)` : 'Nenhuma'} />
          <ReviewRow label="Descrição"    value={data.description ? `${data.description.length} caracteres` : 'Sem descrição'} />
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN WIZARD PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function NovoAnuncioPage() {
  const router  = useRouter()
  const { isPlanAtLeast } = usePlan()
  const [step, setStep]     = useState(0)
  const [data, setData]     = useState<WizardData>(INITIAL)
  const [publishing, setPublishing] = useState(false)
  const [publishLog, setPublishLog] = useState<string[]>([])
  const [publishResult, setPublishResult] = useState<{
    ok: boolean
    results: { plan: string; item_id?: string; permalink?: string; error?: string }[]
  } | null>(null)
  const imageFiles = useRef<File[]>([])

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return data.title.trim().length >= 10 && !!data.category_id
      case 1: {
        const condOk    = !!data.condition
        const eanOk     = data.no_ean || data.ean.length >= 8
        const gradingOk = data.condition !== 'not_specified' || !!data.grading
        const warrantyOk = data.condition !== 'not_specified' || data.warranty_time >= 90
        return condOk && eanOk && gradingOk && warrantyOk
      }
      case 2: {
        const planValid = (data.plans.classico.enabled && data.plans.classico.price > 0 && data.plans.classico.quantity > 0)
                       || (data.plans.premium.enabled  && data.plans.premium.price  > 0 && data.plans.premium.quantity  > 0)
        const weightOk = data.package_weight > 0
        const dimOk    = data.package_length > 0 || data.package_width > 0 || data.package_height > 0
        return planValid && weightOk && dimOk
      }
      case 3:
        return data.images.filter(Boolean).length >= 1
      case 4:
        return true  // shipping location optional (graceful)
      case 5:
        return true
      default:
        return false
    }
  }

  function navError(): string | null {
    switch (step) {
      case 0:
        if (data.title.trim().length < 10) return 'Digite um título com pelo menos 10 caracteres'
        if (!data.category_id)             return 'Selecione uma categoria para continuar'
        return null
      case 1:
        if (!data.condition)               return 'Selecione a condição do produto'
        if (!data.no_ean && data.ean.length > 0 && data.ean.length < 8)
                                           return 'EAN inválido — mínimo 8 dígitos'
        if (!data.no_ean && data.ean.length === 0)
                                           return 'Informe o EAN ou marque "Não tenho código de barras"'
        return null
      case 2: {
        const planValid = (data.plans.classico.enabled && data.plans.classico.price > 0 && data.plans.classico.quantity > 0)
                       || (data.plans.premium.enabled  && data.plans.premium.price  > 0 && data.plans.premium.quantity  > 0)
        if (!planValid)                    return 'Ative um plano e defina preço e estoque'
        if (data.package_weight <= 0)      return 'Informe o peso da embalagem'
        if (data.package_length === 0 && data.package_width === 0 && data.package_height === 0)
                                           return 'Informe pelo menos uma dimensão da embalagem'
        return null
      }
      case 3:
        if (data.images.filter(Boolean).length === 0) return 'Adicione pelo menos uma imagem'
        return null
      default:
        return null
    }
  }

  async function publish() {
    setPublishing(true)
    setPublishLog([])
    const log: string[] = []

    const activePlans = [
      data.plans.classico.enabled && data.plans.classico,
      data.plans.premium.enabled  && data.plans.premium,
    ].filter(Boolean) as PlanConfig[]

    log.push(`Criando ${activePlans.length} anúncio(s) no Mercado Livre...`)
    setPublishLog([...log])

    // Convert blob: URLs — for now pass only https: URLs (blob: means file needs upload after creation)
    const publicImages = data.images.filter(u => u && !u.startsWith('blob:'))
    const hasLocalFiles = imageFiles.current.length > 0

    if (hasLocalFiles && publicImages.length === 0) {
      log.push('ℹ️ Imagens locais serão enviadas após a criação do anúncio...')
      setPublishLog([...log])
    }

    try {
      const res = await fetch('/api/mercadolivre/items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:               data.title.trim(),
          category_id:         data.category_id,
          condition:           data.condition,
          listing_plans:       activePlans.map(p => ({
            listing_type_id: p.listing_type_id,
            price:           p.price,
            quantity:        p.quantity,
          })),
          description:         data.description || undefined,
          seller_custom_field: data.seller_custom_field || undefined,
          pictures:            publicImages,
          free_shipping:       data.free_shipping,
          local_pick_up:       data.local_pick_up,
          save_draft:          true,
          package_weight:      data.package_weight || undefined,
          package_length:      data.package_length || undefined,
          package_width:       data.package_width  || undefined,
          package_height:      data.package_height || undefined,
          attributes: (() => {
            const attrs: { id: string; value_name: string }[] = Object.entries(data.attributes)
              .filter(([, v]) => v && v !== 'N/A')
              .map(([id, value]) => ({ id, value_name: value }))
            if (data.condition === 'not_specified') {
              attrs.push({ id: 'ITEM_CONDITION', value_name: 'Recondicionado' })
              if (data.grading) {
                const gradingLabel = data.grading === 'excellent' ? 'Excelente'
                                   : data.grading === 'good' ? 'Bom' : 'Aceitável'
                attrs.push({ id: 'GRADING', value_name: gradingLabel })
              }
            }
            return attrs
          })(),
          sale_terms: data.condition === 'not_specified' ? [
            { id: 'WARRANTY_TYPE', value_name: 'Garantia do vendedor' },
            { id: 'WARRANTY_TIME', value_name: `${data.warranty_time} dias` },
          ] : undefined,
        }),
      })

      const json: unknown = await res.json()
      const j = json as { results?: { plan: string; item_id?: string; permalink?: string; error?: string }[]; success?: boolean }
      const results = Array.isArray(j.results) ? j.results : []

      for (const r of results) {
        if (r.item_id) {
          log.push(`✅ Anúncio ${r.plan} criado: ${r.item_id}`)
        } else {
          log.push(`❌ ${r.plan}: ${r.error ?? 'Erro desconhecido'}`)
        }
      }

      setPublishLog([...log])
      setPublishResult({ ok: !!j.success, results })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log.push(`❌ Erro: ${msg}`)
      setPublishLog([...log])
      setPublishResult({ ok: false, results: [] })
    } finally {
      setPublishing(false)
    }
  }

  const isLast  = step === STEPS.length - 1
  const errMsg  = navError()

  return (
    <div className="min-h-screen bg-[#03050f]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#03050f]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <button onClick={() => router.push('/dashboard/produtos')} className="hover:text-slate-300 transition-colors shrink-0">
              Produtos
            </button>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-white font-semibold">Criar Anúncio ML</span>
          </div>
          <button
            onClick={() => router.push('/dashboard/produtos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Cancelar
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const done    = i < step
            const current = i === step
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i >= step}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all
                    ${current ? 'text-purple-300 bg-purple-600/20'
                    : done    ? 'text-green-400 hover:bg-white/[0.04] cursor-pointer'
                    :           'text-slate-600 cursor-default'}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
                    ${current ? 'bg-purple-600 text-white'
                    : done    ? 'bg-green-500 text-white'
                    :           'bg-dark-700 border border-white/[0.08] text-slate-600'}`}
                  >
                    {done ? <Check className="w-3 h-3" /> : <span className="text-[8px]">{i + 1}</span>}
                  </div>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${done ? 'bg-green-500/40' : 'bg-white/[0.06]'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden mb-5">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
            {(() => { const Icon = STEPS[step].icon; return <Icon className="w-4 h-4 text-slate-500 shrink-0" /> })()}
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Passo {step + 1} de {STEPS.length} — {STEPS[step].label}
            </p>
          </div>
          <div className="p-5">
            {step === 0 && <Step1TitleCategory     data={data} setData={setData} isPlanAtLeast={isPlanAtLeast} />}
            {step === 1 && <Step2Basic             data={data} setData={setData} />}
            {step === 2 && <Step3PriceLogistics    data={data} setData={setData} />}
            {step === 3 && <Step4MediaDescription  data={data} setData={setData} imageFiles={imageFiles} isPlanAtLeast={isPlanAtLeast} />}
            {step === 4 && <Step5ShippingLocation  data={data} setData={setData} />}
            {step === 5 && <Step6Review            data={data} onBack={() => setStep(s => s - 1)} />}
          </div>
        </div>

        {/* Publish log */}
        {publishLog.length > 0 && (
          <div className="bg-dark-800 border border-white/[0.06] rounded-2xl p-4 mb-5 space-y-1">
            {publishLog.map((l, i) => (
              <p key={i} className={`text-[11px] font-mono ${l.startsWith('✅') ? 'text-green-400' : l.startsWith('❌') ? 'text-red-400' : 'text-slate-400'}`}>{l}</p>
            ))}
          </div>
        )}

        {/* Publish result */}
        {publishResult && (
          <div className={`px-4 py-3.5 rounded-2xl border mb-5 ${publishResult.ok ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
            {publishResult.ok ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-green-400">✅ Anúncio(s) criado(s) com sucesso!</p>
                {publishResult.results.filter(r => r.item_id).map(r => (
                  <div key={r.item_id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{r.plan}: {r.item_id}</span>
                    {r.permalink && (
                      <a href={r.permalink} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => router.push('/dashboard/produtos')}
                  className="mt-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-300 text-xs font-bold hover:bg-green-500/30 transition-all"
                >
                  Ver meus anúncios →
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-amber-400">⚠️ Publicação com erros. Verifique os detalhes acima.</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {!publishResult && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
              )}
              <div className="flex-1" />
              {isLast ? (
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</> : <><Check className="w-4 h-4" /> Publicar Anúncio</>}
                </button>
              ) : (
                <button
                  onClick={() => canAdvance() && setStep(s => s + 1)}
                  disabled={!canAdvance()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {errMsg && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl self-end">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">{errMsg}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
