'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter }      from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Check, Search, Loader2, AlertCircle,
  Tag, DollarSign, FileText, ImageIcon, Truck, Eye,
  X, ChevronRight, Info, ExternalLink, ChevronLeft, Home,
  Grid3X3,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

interface CategorySuggestion {
  category_id:   string
  category_name: string
  domain_name:   string
  breadcrumb:    string
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

interface PlanConfig {
  enabled:         boolean
  listing_type_id: string
  price:           number
  quantity:        number
}

interface WizardData {
  // Step 1 — Categoria
  category_id:   string
  category_name: string

  // Step 2 — Informações básicas
  title:               string
  condition:           string
  seller_custom_field: string
  ean:                 string

  // Step 3 — Preço & Estoque por plano
  plans: {
    classico: PlanConfig
    premium:  PlanConfig
  }

  // Step 4 — Descrição & Imagens
  description: string
  images:      string[]  // public URLs (after upload)

  // Step 5 — Envio
  free_shipping: boolean
  local_pick_up: boolean
  flex_shipping: boolean

  // Step 6 — Atributos
  attributes: Record<string, string>
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════ */

const INITIAL: WizardData = {
  category_id:         '',
  category_name:       '',
  title:               '',
  condition:           'new',
  seller_custom_field: '',
  ean:                 '',
  plans: {
    classico: { enabled: true,  listing_type_id: 'gold_special', price: 0, quantity: 1 },
    premium:  { enabled: false, listing_type_id: 'gold_pro',     price: 0, quantity: 1 },
  },
  description:  '',
  images:       [],
  free_shipping: false,
  local_pick_up: false,
  flex_shipping: false,
  attributes:   {},
}

const STEPS = [
  { icon: Search,      label: 'Categoria'  },
  { icon: Tag,         label: 'Básico'     },
  { icon: DollarSign,  label: 'Preço'      },
  { icon: FileText,    label: 'Descrição'  },
  { icon: Truck,       label: 'Envio'      },
  { icon: Eye,         label: 'Revisão'    },
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
      // root level
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

function Step1Category({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  const [q, setQ]                       = useState('')
  const [suggestions, setSuggestions]   = useState<CategorySuggestion[]>([])
  const [loading, setLoading]           = useState(false)
  const [searched, setSearched]         = useState(false)
  const [showTree, setShowTree]         = useState(false)
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-search on input change (debounced)
  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setSuggestions([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/mercadolivre/categories/suggest?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const json: unknown = await res.json()
        setSuggestions(Array.isArray(json) ? (json as CategorySuggestion[]) : [])
      }
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(value: string) {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 500)
  }

  function select(id: string, name: string) {
    setData({ ...data, category_id: id, category_name: name })
    setSuggestions([])
    setSearched(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <Label required>Categoria do Produto</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text" value={q}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(q)}
              placeholder="Ex: Camiseta masculina, iPhone 14, Tênis Nike..."
              className={inputCls + ' pl-10'}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
            )}
          </div>
          <button
            onClick={() => setShowTree(true)}
            className="px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.08] text-slate-400 text-xs font-bold hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5 shrink-0"
            title="Navegar por árvore de categorias"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Navegar</span>
          </button>
        </div>
        <Hint>Digite o nome do produto e selecione a categoria. Ou clique em &ldquo;Navegar&rdquo; para explorar a árvore de categorias.</Hint>
      </div>

      {/* Selected category */}
      {data.category_id && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
          <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-xs text-green-300 font-semibold">Categoria selecionada:</span>
          <span className="text-xs text-white flex-1 min-w-0 truncate">{data.category_name}</span>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">({data.category_id})</span>
          <button
            onClick={() => setData({ ...data, category_id: '', category_name: '' })}
            className="ml-1 p-0.5 text-slate-500 hover:text-red-400 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Suggestions */}
      {searched && suggestions.length > 0 && (
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">
            {suggestions.length} sugestão(ões) — clique para selecionar
          </p>
          {suggestions.map(s => (
            <button
              key={s.category_id}
              onClick={() => select(s.category_id, s.breadcrumb || s.category_name)}
              className={`w-full flex flex-col px-3 py-2.5 rounded-xl border transition-all text-left
                ${data.category_id === s.category_id
                  ? 'border-purple-500/40 bg-purple-500/10'
                  : 'border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white font-medium">{s.category_name}</span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">{s.category_id}</span>
              </div>
              {s.breadcrumb && s.breadcrumb !== s.category_name && (
                <span className="text-[10px] text-slate-500 mt-0.5 truncate">{s.breadcrumb}</span>
              )}
              {s.domain_name && (
                <span className="text-[9px] text-slate-600 mt-0.5">{s.domain_name}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {searched && suggestions.length === 0 && !loading && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500">Nenhuma sugestão encontrada.</p>
          <button
            onClick={() => setShowTree(true)}
            className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            Tente navegar pela árvore de categorias →
          </button>
        </div>
      )}

      {/* Tree modal */}
      {showTree && (
        <CategoryTreeModal
          onSelect={select}
          onClose={() => setShowTree(false)}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 2 — BASIC INFO
══════════════════════════════════════════════════════════════════════════ */

function Step2Basic({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <Label required>Título do Anúncio</Label>
        <input
          type="text" value={data.title} maxLength={60}
          onChange={e => setData({ ...data, title: e.target.value })}
          placeholder="Ex: Camiseta Básica Premium 100% Algodão Masculina"
          className={inputCls}
        />
        <div className="flex justify-between mt-1">
          <Hint>Máximo 60 caracteres. Use palavras-chave relevantes.</Hint>
          <span className="text-[10px] text-slate-600">{data.title.length}/60</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label required>Condição</Label>
          <select
            value={data.condition}
            onChange={e => setData({ ...data, condition: e.target.value })}
            className={selectCls}
          >
            <option value="new">Novo</option>
            <option value="used">Usado</option>
            <option value="not_specified">Não especificado</option>
          </select>
        </div>

        <div>
          <Label>SKU Interno</Label>
          <input
            type="text" value={data.seller_custom_field}
            onChange={e => setData({ ...data, seller_custom_field: e.target.value })}
            placeholder="Código interno do produto"
            className={inputCls}
          />
          <Hint>Opcional — apenas para seu controle interno.</Hint>
        </div>
      </div>

      <div>
        <Label>EAN / GTIN (código de barras)</Label>
        <input
          type="text" value={data.ean}
          onChange={e => setData({ ...data, ean: e.target.value.replace(/\D/g, '') })}
          placeholder="7891000000000"
          maxLength={14}
          className={inputCls}
        />
        <Hint>Opcional — 8, 12, 13 ou 14 dígitos. Melhora a indexação do anúncio.</Hint>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 3 — PRICE & STOCK
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

  return (
    <div className={`rounded-2xl border p-5 space-y-4 transition-all ${config.enabled ? 'border-purple-500/30 bg-purple-500/[0.04]' : 'border-white/[0.06] bg-white/[0.01] opacity-60'}`}>
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

function Step3Price({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Ative os planos desejados e configure preço e estoque para cada um. Você pode ter anúncio Clássico e Premium para o mesmo produto.
      </p>
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
      {!data.plans.classico.enabled && !data.plans.premium.enabled && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">Ative ao menos um plano para continuar.</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 4 — DESCRIPTION & IMAGES
══════════════════════════════════════════════════════════════════════════ */


function Step4Description({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  function addImageUrl() {
    setData({ ...data, images: [...data.images, ''] })
  }

  function setUrl(idx: number, url: string) {
    const imgs = [...data.images]
    imgs[idx] = url
    setData({ ...data, images: imgs })
  }

  function removeImage(idx: number) {
    setData({ ...data, images: data.images.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Descrição do Produto</Label>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Info className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="text-[10px] text-blue-300">Apenas texto simples. Sem HTML.</span>
          <span className="text-[10px] text-slate-600 ml-auto">{data.description.length} chars</span>
        </div>
        <textarea
          value={data.description}
          onChange={e => setData({ ...data, description: e.target.value })}
          rows={6}
          placeholder="Descreva o produto detalhadamente: material, tamanho, cor, especificações técnicas..."
          className={inputCls + ' resize-none'}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Imagens</Label>
          {data.images.length < 12 && (
            <button
              onClick={addImageUrl}
              className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              + Adicionar URL de imagem
            </button>
          )}
        </div>
        <Hint>Mínimo 500×500px, fundo branco, JPG ou PNG. Máx 12 imagens.</Hint>

        {/* URL inputs for images */}
        <div className="space-y-2 mt-2">
          {data.images.map((url, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="url" value={url}
                onChange={e => setUrl(idx, e.target.value)}
                placeholder={`https://... (URL pública da imagem ${idx + 1})`}
                className={inputCls + ' flex-1 text-xs'}
              />
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/[0.08] shrink-0" />
              )}
              <button
                onClick={() => removeImage(idx)}
                className="p-2 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {data.images.length === 0 && (
            <button
              onClick={addImageUrl}
              className="w-full py-6 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-white/20 text-slate-600 hover:text-slate-400 text-xs transition-all flex flex-col items-center gap-1.5"
            >
              <ImageIcon className="w-5 h-5" />
              Clique para adicionar URLs de imagens
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 5 — SHIPPING
══════════════════════════════════════════════════════════════════════════ */

function ShippingToggle({ label, desc, value, onChange }: {
  label:    string
  desc:     string
  value:    boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${value ? 'border-green-500/30 bg-green-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}
      onClick={() => onChange(!value)}
    >
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-green-500' : 'bg-dark-700 border border-white/[0.1]'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </div>
  )
}

function Step5Shipping({ data, setData }: { data: WizardData; setData: (d: WizardData) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">Configure as opções de envio para seus anúncios.</p>
      <ShippingToggle
        label="Frete Grátis"
        desc="O frete é por sua conta — aumenta conversão mas reduz margem."
        value={data.free_shipping}
        onChange={v => setData({ ...data, free_shipping: v })}
      />
      <ShippingToggle
        label="Retirada Pessoal"
        desc="Permite que o comprador retire o produto fisicamente."
        value={data.local_pick_up}
        onChange={v => setData({ ...data, local_pick_up: v })}
      />
      <div className={`px-4 py-3.5 rounded-xl border transition-all ${data.flex_shipping ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setData({ ...data, flex_shipping: !data.flex_shipping })}>
          <div>
            <p className="text-sm font-semibold text-white">⚡ Envio Flex</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Entrega no mesmo dia — Mercado Envios Flex.</p>
          </div>
          <div className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${data.flex_shipping ? 'bg-amber-500' : 'bg-dark-700 border border-white/[0.1]'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${data.flex_shipping ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </div>
        {data.flex_shipping && (
          <div className="mt-3 px-3 py-2 bg-amber-500/[0.08] border border-amber-500/20 rounded-lg text-[11px] text-amber-300">
            ⚠️ O Flex exige que você prepare e envie o pedido no mesmo dia de compra.
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   STEP 6 — REVIEW & PUBLISH
══════════════════════════════════════════════════════════════════════════ */

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[10px] text-slate-500 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-white flex-1">{value || <span className="text-slate-600">—</span>}</span>
    </div>
  )
}

function Step6Review({ data }: { data: WizardData }) {
  const activePlans = [
    data.plans.classico.enabled && { name: 'Clássico', config: data.plans.classico },
    data.plans.premium.enabled  && { name: 'Premium',  config: data.plans.premium  },
  ].filter(Boolean) as { name: string; config: PlanConfig }[]

  const COND: Record<string, string> = { new: 'Novo', used: 'Usado', not_specified: 'Não especificado' }

  return (
    <div className="space-y-4">
      <div className="bg-dark-800 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informações Básicas</p>
        </div>
        <div className="px-4 py-2">
          <ReviewRow label="Título"    value={data.title} />
          <ReviewRow label="Categoria" value={<span>{data.category_name} <span className="text-slate-500 font-mono text-[10px]">({data.category_id})</span></span>} />
          <ReviewRow label="Condição"  value={COND[data.condition] ?? data.condition} />
          {data.seller_custom_field && <ReviewRow label="SKU" value={data.seller_custom_field} />}
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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Envio & Imagens</p>
        </div>
        <div className="px-4 py-2">
          <ReviewRow label="Frete Grátis"  value={data.free_shipping  ? 'Sim' : 'Não'} />
          <ReviewRow label="Retirada"      value={data.local_pick_up  ? 'Sim' : 'Não'} />
          <ReviewRow label="Flex"          value={data.flex_shipping   ? '⚡ Ativo' : 'Inativo'} />
          <ReviewRow label="Imagens"       value={data.images.filter(Boolean).length > 0 ? `${data.images.filter(Boolean).length} imagem(s)` : 'Nenhuma'} />
          <ReviewRow label="Descrição"     value={data.description ? `${data.description.length} caracteres` : 'Sem descrição'} />
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
  const [step, setStep]     = useState(0)
  const [data, setData]     = useState<WizardData>(INITIAL)
  const [publishing, setPublishing] = useState(false)
  const [publishLog, setPublishLog] = useState<string[]>([])
  const [publishResult, setPublishResult] = useState<{
    ok: boolean
    results: { plan: string; item_id?: string; permalink?: string; error?: string }[]
  } | null>(null)

  function canAdvance(): boolean {
    switch (step) {
      case 0: return !!data.category_id
      case 1: return data.title.trim().length >= 3
      case 2: return data.plans.classico.enabled || data.plans.premium.enabled
      case 3: return true
      case 4: return true
      case 5: return true
      default: return false
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
          pictures:            data.images.filter(Boolean),
          free_shipping:       data.free_shipping,
          local_pick_up:       data.local_pick_up,
          save_draft:          true,
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

  const isLast = step === STEPS.length - 1

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
            {step === 0 && <Step1Category data={data} setData={setData} />}
            {step === 1 && <Step2Basic    data={data} setData={setData} />}
            {step === 2 && <Step3Price    data={data} setData={setData} />}
            {step === 3 && <Step4Description data={data} setData={setData} />}
            {step === 4 && <Step5Shipping data={data} setData={setData} />}
            {step === 5 && <Step6Review   data={data} />}
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
                  className="mt-2 px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/30 transition-all"
                >
                  Voltar para Produtos
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-amber-400">⚠️ Erro ao criar anúncio(s). Verifique os logs acima.</p>
                <button
                  onClick={() => { setPublishResult(null); setPublishLog([]) }}
                  className="mt-2 text-xs text-slate-400 hover:text-slate-300 underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {!publishResult && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => step > 0 ? setStep(step - 1) : router.push('/dashboard/produtos')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-slate-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </button>

            {isLast ? (
              <button
                onClick={publish}
                disabled={publishing}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 transition-all"
              >
                {publishing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publicando...</>
                ) : (
                  <><Check className="w-3.5 h-3.5" /> Publicar no Mercado Livre</>
                )}
              </button>
            ) : (
              <button
                onClick={() => canAdvance() && setStep(step + 1)}
                disabled={!canAdvance()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Próximo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
