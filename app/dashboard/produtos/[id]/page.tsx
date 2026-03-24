'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  ArrowLeft, Save, Send, AlertTriangle, X, Plus, GripVertical,
  ToggleLeft, ToggleRight, ChevronDown, Package, Ruler, FileText,
  Layers, DollarSign, RefreshCw, ExternalLink, Tag, Globe,
  ImageOff, Star, Link2, CheckCircle2, AlertCircle, Info, Copy,
  TrendingDown, TrendingUp, LogIn, LogOut, Truck, Sparkles, Loader2,
} from 'lucide-react'
import {
  produtos as mockProdutos, calcPreco, calcFreteAuto, MKT_RULES, MKT_COLOR, MKT_STATUS_META,
  STATUS_META, MARCA_COLOR, CATEGORIAS, TAGS_LIST, MKTS, UNIDADES, GARANTIAS,
  CONDICOES, TIPOS_EMB, healthScore, margem,
  type Produto, type Status, type MKT, type MktStatus, type Unidade,
  type Garantia, type Condicao, type TipoEmb, type MktListing,
} from '../_data'
import { useAuth } from '@/lib/auth-context'
import { getProduct, createProduct, updateProduct, saveProductMarketplaces, saveStockMovement } from '@/lib/db/products'
import { logActivity } from '@/lib/activity-log'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'geral',        label: 'Dados Gerais',  icon: FileText   },
  { id: 'imagens',      label: 'Imagens',        icon: ImageOff   },
  { id: 'precificacao', label: 'Precificação',   icon: DollarSign },
  { id: 'estoque',      label: 'Estoque',        icon: Package    },
  { id: 'fiscal',       label: 'Dados Fiscais',  icon: FileText   },
  { id: 'dimensoes',    label: 'Dimensões',      icon: Ruler      },
  { id: 'marketplaces', label: 'Marketplaces',   icon: Globe      },
  { id: 'variacoes',    label: 'Variações',      icon: Layers     },
] as const
type TabId = typeof TABS[number]['id']

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[99] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${type === 'success' ? 'bg-green-950 border-green-500/30 text-green-300' : 'bg-red-950 border-red-500/30 text-red-300'}`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="font-bold text-white text-sm mb-1">Alterações não salvas</h3>
        <p className="text-xs text-slate-400 mb-5">Tem certeza? Todas as alterações feitas serão perdidas.</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-300 bg-dark-700 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            Continuar editando
          </button>
          <Link href="/dashboard/produtos" className="flex-1">
            <button onClick={onConfirm}
              className="w-full py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all">
              Descartar
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Stock Move Modal ─────────────────────────────────────────────────────────

interface StockMove { tipo: 'entrada'|'saida'; qtd: number; motivo: string; data: string; usuario: string }

function StockModal({ tipo, onClose, onConfirm }: {
  tipo: 'entrada' | 'saida'
  onClose: () => void
  onConfirm: (m: StockMove) => void
}) {
  const [qtd, setQtd]       = useState(1)
  const [motivo, setMotivo]  = useState('')
  const motivosEntrada = ['Compra fornecedor', 'Devolução cliente', 'Ajuste manual', 'Produção']
  const motivosSaida   = ['Venda', 'Perda/avaria', 'Ajuste manual', 'Amostra']
  const motivos = tipo === 'entrada' ? motivosEntrada : motivosSaida
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tipo === 'entrada' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {tipo === 'entrada' ? <LogIn className="w-5 h-5 text-green-400" /> : <LogOut className="w-5 h-5 text-red-400" />}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">{tipo === 'entrada' ? 'Dar Entrada' : 'Dar Saída'}</h3>
            <p className="text-xs text-slate-500">Registrar movimentação de estoque</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Quantidade</label>
            <input type="number" min={1} value={qtd} onChange={e => setQtd(Math.max(1, parseInt(e.target.value)||1))}
              className="w-full px-3 py-2 rounded-xl text-sm bg-dark-700 border border-white/[0.06] text-white focus:outline-none focus:ring-1 focus:ring-purple-600/40 tabular-nums" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Motivo</label>
            <div className="flex gap-1.5 flex-wrap">
              {motivos.map(m => (
                <button key={m} onClick={() => setMotivo(m)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${motivo === m ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30' : 'text-slate-500 bg-dark-700 hover:text-slate-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 bg-dark-700 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            Cancelar
          </button>
          <button
            disabled={!motivo}
            onClick={() => onConfirm({ tipo, qtd, motivo, data: new Date().toLocaleDateString('pt-BR'), usuario: 'Matheus P.' })}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tipo === 'entrada' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} text-white disabled:opacity-40 disabled:cursor-not-allowed`}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared form atoms ────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-700 mt-1">{hint}</p>}
    </div>
  )
}

function CyInput({ value, onChange, placeholder, type='text', mono=false }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 ${mono ? 'font-mono' : ''}`} />
  )
}

function CySelect<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value as T)}
        className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40 cursor-pointer">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
    </div>
  )
}

function NumInput({ value, onChange, prefix, suffix, step=0.01, min }: {
  value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number; min?: number
}) {
  return (
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-xs text-slate-500 pointer-events-none z-10">{prefix}</span>}
      <input type="number" step={step} min={min ?? 0} value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`w-full py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40 tabular-nums ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`} />
      {suffix && <span className="absolute right-3 text-xs text-slate-500 pointer-events-none">{suffix}</span>}
    </div>
  )
}

function CharCounter({ value, max, warn=0.8 }: { value: string; max: number; warn?: number }) {
  const len = value.length
  const cls = len > max ? 'text-red-400' : len > max * warn ? 'text-amber-400' : 'text-slate-600'
  return (
    <p className={`text-[10px] text-right mt-1 tabular-nums ${cls}`}>
      {len} / {max}
    </p>
  )
}

// ─── Tab: Dados Gerais ────────────────────────────────────────────────────────

function TabGeral({ p, onChange }: { p: Produto; onChange: (patch: Partial<Produto>) => void }) {
  const [tagInput, setTagInput] = useState('')
  const addTag = (tag: string) => { if (tag && !p.tags.includes(tag)) onChange({ tags: [...p.tags, tag] }); setTagInput('') }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Nome */}
      <div className="md:col-span-2">
        <Field label="Nome / Título do Produto">
          <CyInput value={p.nome} onChange={v => onChange({ nome: v })} placeholder="Ex: Shampoo Marca 400ml — máx 60 chars" />
          <CharCounter value={p.nome} max={60} />
        </Field>
      </div>

      {/* Descrição */}
      <div className="md:col-span-2">
        <Field label="Descrição Completa">
          <textarea value={p.descricao} onChange={e => onChange({ descricao: e.target.value })}
            placeholder="Descreva o produto detalhadamente: benefícios, ingredientes, modo de uso..."
            rows={6}
            className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
          <CharCounter value={p.descricao} max={5000} warn={0.9} />
        </Field>
      </div>

      {/* Descrição Curta */}
      <div className="md:col-span-2">
        <Field label="Descrição Curta" hint="Usada no Shopee, Mercado Livre e plataformas com limite menor.">
          <textarea value={p.descricaoCurta} onChange={e => onChange({ descricaoCurta: e.target.value })}
            placeholder="Resumo de 1-2 frases..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
          <CharCounter value={p.descricaoCurta} max={200} />
        </Field>
      </div>

      {/* Marca (texto livre) */}
      <Field label="Marca">
        <CyInput value={p.marca} onChange={v => onChange({ marca: v })} placeholder="Ex: Fio Cabana" />
      </Field>

      {/* Categoria */}
      <Field label="Categoria">
        <CySelect value={p.categoria as any} onChange={v => onChange({ categoria: v })} options={CATEGORIAS as any} />
      </Field>

      {/* SKU */}
      <Field label="SKU (Cód. Interno)">
        <CyInput value={p.sku} onChange={v => onChange({ sku: v })} placeholder="Ex: PROD-001" mono />
      </Field>

      {/* EAN */}
      <Field label="EAN / GTIN">
        <CyInput value={p.ean} onChange={v => onChange({ ean: v })} placeholder="Ex: 7891234560001" mono />
      </Field>

      {/* Unidade */}
      <Field label="Unidade de Medida">
        <CySelect value={p.unidade} onChange={v => onChange({ unidade: v as Unidade })} options={UNIDADES as any} />
      </Field>

      {/* Condição */}
      <Field label="Condição">
        <CySelect value={p.condicao} onChange={v => onChange({ condicao: v as Condicao })} options={CONDICOES as any} />
      </Field>

      {/* Garantia */}
      <Field label="Garantia">
        <CySelect value={p.garantia} onChange={v => onChange({ garantia: v as Garantia })} options={GARANTIAS as any} />
      </Field>

      {/* Status */}
      <Field label="Status">
        <div className="flex gap-2 flex-wrap">
          {(['ativo','inativo','pausado','rascunho'] as Status[]).map(s => (
            <button key={s} onClick={() => onChange({ status: s })}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${p.status === s ? STATUS_META[s].cls + ' border-current/20' : 'text-slate-600 bg-dark-700 border-transparent hover:text-slate-400'}`}>
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </Field>

      {/* Tags */}
      <div className="md:col-span-2">
        <Field label="Tags">
          <div className="flex gap-1.5 flex-wrap mb-2">
            {p.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20">
                {tag}
                <button onClick={() => onChange({ tags: p.tags.filter(t => t !== tag) })} className="text-purple-500 hover:text-purple-300 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-xs">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag(tagInput)}
                placeholder="Digite e pressione Enter..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {TAGS_LIST.filter(t => !p.tags.includes(t)).slice(0, 5).map(t => (
                <button key={t} onClick={() => addTag(t)}
                  className="text-[9px] font-semibold text-slate-500 bg-dark-700 px-2 py-1 rounded-full border border-white/[0.06] hover:text-slate-300 hover:border-white/20 transition-all">
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </Field>
      </div>
    </div>
  )
}

// ─── Tab: Imagens ─────────────────────────────────────────────────────────────

function TabImagens({ p, onChange }: { p: Produto; onChange: (patch: Partial<Produto>) => void }) {
  const [urlInput, setUrlInput]     = useState('')
  const [urlPreview, setUrlPreview] = useState('')

  const addByUrl = () => {
    if (urlInput && p.imagens.length < 10) {
      onChange({ imagens: [...p.imagens, urlInput] })
      setUrlInput(''); setUrlPreview('')
    }
  }

  const removeImg = (i: number) => onChange({ imagens: p.imagens.filter((_, idx) => idx !== i) })
  const setPrimary = (i: number) => {
    const imgs = [...p.imagens]
    const [item] = imgs.splice(i, 1)
    imgs.unshift(item)
    onChange({ imagens: imgs })
  }

  return (
    <div className="space-y-5">
      {/* Counter + tip */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${p.imagens.length >= 10 ? 'text-red-400' : 'text-slate-500'}`}>
          {p.imagens.length} / 10 imagens
        </span>
        <span className="text-[10px] text-slate-700">Recomendado: 1200×1200px, fundo branco · JPG, PNG, WEBP</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {p.imagens.map((img, i) => (
          <div key={i} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${i === 0 ? 'border-purple-500/60' : 'border-white/[0.06] hover:border-white/20'}`}>
            <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
            {/* Order badge */}
            <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-dark-900/80 text-[9px] font-bold text-slate-400 rounded-full flex items-center justify-center">{i+1}</span>
            {/* Primary badge */}
            {i === 0 && <span className="absolute top-1.5 left-1.5 text-[8px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded">Principal</span>}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              {i !== 0 && (
                <button onClick={() => setPrimary(i)} title="Definir como principal"
                  className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 hover:text-amber-300">
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
              <button className="p-1.5 bg-dark-700 rounded-lg text-slate-300 hover:text-white cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => removeImg(i)}
                className="p-1.5 bg-red-500/20 rounded-lg text-red-400 hover:text-red-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {p.imagens.length < 10 && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-white/[0.08] hover:border-purple-500/40 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-purple-400 cursor-pointer">
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Upload</span>
            <input type="file" accept="image/*" className="hidden" />
          </label>
        )}
      </div>

      {/* URL input */}
      <div className="dash-card p-4 rounded-xl border border-white/[0.06]">
        <p className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-slate-500" /> Adicionar por URL
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input value={urlInput} onChange={e => { setUrlInput(e.target.value); setUrlPreview(e.target.value) }}
              placeholder="https://exemplo.com/imagem.jpg"
              className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 font-mono" />
          </div>
          <button onClick={addByUrl} disabled={!urlInput || p.imagens.length >= 10}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Adicionar
          </button>
        </div>
        {urlPreview && (
          <div className="mt-3 flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/[0.06] bg-dark-700 flex items-center justify-center shrink-0">
              <img src={urlPreview} alt="preview"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg/>'; }} />
            </div>
            <span className="text-[10px] text-slate-600 font-mono truncate max-w-xs">{urlPreview}</span>
          </div>
        )}
      </div>

      {p.imagens.length === 0 && (
        <div className="border-2 border-dashed border-white/[0.08] rounded-2xl p-12 text-center">
          <ImageOff className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-1">Arraste imagens ou clique para upload</p>
          <p className="text-xs text-slate-700">Ou adicione por URL acima</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Precificação ────────────────────────────────────────────────────────

function TabPrecificacao({ p, onChange }: { p: Produto; onChange: (patch: Partial<Produto>) => void }) {
  const [autoMode, setAutoMode] = useState(p.precoVenda === 0)
  const [manualPrecos, setManualPrecos] = useState<Partial<Record<MKT, number>>>({})

  const freteAuto = calcFreteAuto(p.compEmb, p.largEmb, p.altEmb, p.pesoEmb)
  const dimsFilled = p.compEmb > 0 && p.largEmb > 0 && p.altEmb > 0 && p.pesoEmb > 0
  const pesoCubado = dimsFilled ? (p.compEmb * p.largEmb * p.altEmb) / 6000 : 0
  const pesoCobrado = dimsFilled ? Math.max(p.pesoEmb, pesoCubado) : 0

  const rows = MKTS.map(m => {
    const r = MKT_RULES[m]
    const frete = dimsFilled ? freteAuto : r.frete
    const auto  = calcPreco(p, m, frete)
    const manual = manualPrecos[m] ?? (p.mkt[m]?.precoManual ?? 0)
    const preco  = autoMode ? auto : (manual || auto)
    const taxaVar = (r.comissao + p.marketing + (p.influenciador ?? 0) + p.imposto) / 100
    const custoFix = p.custo + p.embalagem + p.variados + frete + r.tarifa
    const lucro = preco * (1 - taxaVar) - custoFix
    const mg = preco > 0 ? Math.round((lucro / preco) * 1000) / 10 : 0
    return { m, r, frete, auto, manual, preco, mg }
  })

  const avgPreco   = rows.length ? rows.reduce((s, r) => s + r.preco, 0) / rows.length : 0
  const avgMargem  = rows.length ? rows.reduce((s, r) => s + r.mg, 0) / rows.length : 0
  const custoTotal = p.custo + p.embalagem + p.variados

  function MargemIcon({ mg }: { mg: number }) {
    if (mg >= 30) return <span title="Margem excelente">✅</span>
    if (mg >= 15) return <span title="Margem apertada">⚠️</span>
    return <span title="Margem negativa ou crítica">🔴</span>
  }

  return (
    <div className="space-y-6">
      {/* Auto / Manual */}
      <div className="flex items-center gap-4 p-4 dash-card rounded-xl border border-white/[0.06]">
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Modo de Precificação</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {autoMode ? 'Automático — preço calculado pelo sistema.' : 'Manual — você define o preço por marketplace.'}
          </p>
        </div>
        <button onClick={() => setAutoMode(m => !m)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-dark-700 hover:bg-white/[0.06] transition-all">
          {autoMode
            ? <><ToggleRight className="w-5 h-5 text-purple-400" /><span className="text-purple-300">Automático</span></>
            : <><ToggleLeft  className="w-5 h-5 text-slate-600" /><span className="text-slate-500">Manual</span></>}
        </button>
      </div>

      {/* Dimensions warning */}
      {!dimsFilled && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">Preencha as dimensões na aba <strong>Dimensões</strong> para cálculo automático de frete.</p>
        </div>
      )}

      {/* Cost inputs */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Composição de Custo</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Custo Produto"><NumInput value={p.custo} onChange={v => onChange({ custo: v })} prefix="R$" /></Field>
          <Field label="Embalagem"><NumInput value={p.embalagem} onChange={v => onChange({ embalagem: v })} prefix="R$" /></Field>
          <Field label="Variados"><NumInput value={p.variados} onChange={v => onChange({ variados: v })} prefix="R$" /></Field>
          <Field label="Marketing"><NumInput value={p.marketing} onChange={v => onChange({ marketing: v })} suffix="%" step={0.5} /></Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Field label="Influenciador"><NumInput value={p.influenciador ?? 0} onChange={v => onChange({ influenciador: v })} suffix="%" step={0.5} /></Field>
          <Field label="Imposto"><NumInput value={p.imposto} onChange={v => onChange({ imposto: v })} suffix="%" step={0.5} /></Field>
          <Field label="Margem Desejada"><NumInput value={p.margem} onChange={v => onChange({ margem: v })} suffix="%" step={1} /></Field>
        </div>
      </div>

      {/* Per-marketplace table */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preços por Marketplace</p>
        {dimsFilled && (
          <p className="text-[10px] text-slate-600 mb-2">
            Frete calculado automaticamente: <span className="text-white font-semibold">R$ {freteAuto.toFixed(2)}</span>
            {' '}(peso cobrado: <span className="text-white">{pesoCobrado.toFixed(3)} kg</span>)
          </p>
        )}
        <div className="dash-card rounded-xl overflow-x-auto border border-white/[0.06]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Marketplace','Comissão','Frete','Preço Sugerido','Margem','Preço Manual'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map(({ m, r, frete, auto, manual, preco, mg }) => {
                const active = p.mkt[m]?.enabled
                return (
                  <tr key={m} className={`transition-colors ${active ? 'hover:bg-white/[0.02]' : 'opacity-40'}`}>
                    <td className="px-4 py-3">
                      <div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${MKT_COLOR[m]}`}>{m}</span>
                        <p className="text-[9px] text-slate-600 mt-0.5">{r.freteInfo}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{r.comissao + (p.marketing ?? 0) + (p.influenciador ?? 0) + p.imposto}%</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400">R$ {frete.toFixed(2)}</span>
                      {dimsFilled && <span className="text-[8px] text-green-500 ml-1">auto</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white tabular-nums">R$ {auto.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className={`font-bold tabular-nums ${mg < 15 ? 'text-red-400' : mg < 30 ? 'text-amber-400' : 'text-green-400'}`}>{mg.toFixed(1)}%</span>
                        <MargemIcon mg={mg} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {!autoMode && (
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">R$</span>
                          <input type="number" step="0.01" value={manual || ''} placeholder={auto.toFixed(2)}
                            onChange={e => setManualPrecos(prev => ({ ...prev, [m]: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs bg-dark-700 border border-white/[0.06] text-white focus:outline-none focus:ring-1 focus:ring-purple-600/40 tabular-nums" />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Custo Total',      val: `R$ ${custoTotal.toFixed(2)}`,  cls: 'text-white'         },
          { label: 'Preço Médio',      val: `R$ ${avgPreco.toFixed(2)}`,    cls: 'text-white'         },
          { label: 'Margem Média',     val: `${avgMargem.toFixed(1)}%`,     cls: avgMargem < 15 ? 'text-red-400' : avgMargem < 30 ? 'text-amber-400' : 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="dash-card p-3 rounded-xl border border-white/[0.06] text-center">
            <p className="text-[10px] text-slate-600 mb-1">{s.label}</p>
            <p className={`text-base font-bold tabular-nums ${s.cls}`}>{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Estoque ─────────────────────────────────────────────────────────────

interface MoveEntry { data: string; tipo: string; qtd: number; motivo: string; saldo: number; usuario: string }

function TabEstoque({ p, onChange, productId, userId, userName }: {
  p: Produto; onChange: (patch: Partial<Produto>) => void
  productId?: number; userId?: string; userName?: string
}) {
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [stockModal, setStockModal]   = useState<'entrada'|'saida'|null>(null)
  const [moves, setMoves]             = useState<MoveEntry[]>([
    { data: '12/03/2026', tipo: 'Saída',   qtd: -3,  motivo: 'Venda ML',       saldo: p.estoqueReal,     usuario: 'Matheus P.' },
    { data: '11/03/2026', tipo: 'Saída',   qtd: -1,  motivo: 'Venda SP',       saldo: p.estoqueReal + 3, usuario: 'Sistema'     },
    { data: '10/03/2026', tipo: 'Entrada', qtd: +50, motivo: 'Compra fornec.', saldo: p.estoqueReal + 4, usuario: 'Matheus P.' },
    { data: '08/03/2026', tipo: 'Saída',   qtd: -5,  motivo: 'Venda ML',       saldo: p.estoqueReal - 46,usuario: 'Sistema'     },
  ])

  const desynced = p.estoqueReal !== p.estoqueVirtual

  const handleMove = async (move: any) => {
    const delta = move.tipo === 'entrada' ? move.qtd : -move.qtd
    const newReal = Math.max(0, p.estoqueReal + delta)
    onChange({ estoqueReal: newReal, estoqueVirtual: syncEnabled ? newReal : p.estoqueVirtual })
    setMoves(prev => [{
      data: move.data, tipo: move.tipo === 'entrada' ? 'Entrada' : 'Saída',
      qtd: delta, motivo: move.motivo, saldo: newReal, usuario: move.usuario,
    }, ...prev])
    setStockModal(null)
    if (productId && userId) {
      await saveStockMovement(productId, userId, move.tipo, move.qtd, move.motivo, userName ?? 'Sistema')
    }
  }

  return (
    <div className="space-y-5">
      {/* Desync banner */}
      {desynced && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/8">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300 flex-1">
            Estoques desincronizados — Real: <strong>{p.estoqueReal}</strong> · Virtual: <strong>{p.estoqueVirtual}</strong>
          </p>
          <button onClick={() => onChange({ estoqueVirtual: p.estoqueReal })}
            className="px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Sincronizar
          </button>
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="Estoque Real" hint="Quantidade física no depósito">
          <NumInput value={p.estoqueReal} onChange={v => onChange({ estoqueReal: Math.floor(v) })} step={1} />
        </Field>
        <Field label="Estoque Virtual" hint="Disponível para venda (descontando reservas)">
          <NumInput value={p.estoqueVirtual} onChange={v => onChange({ estoqueVirtual: Math.floor(v) })} step={1} />
        </Field>
        <Field label="Estoque Mínimo" hint="Alerta ao atingir">
          <NumInput value={p.estoqueMinimo} onChange={v => onChange({ estoqueMinimo: Math.floor(v) })} step={1} />
        </Field>
      </div>

      {/* Actions + sync */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStockModal('entrada')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/20 transition-all">
          <LogIn className="w-3.5 h-3.5" /> Dar Entrada
        </button>
        <button onClick={() => setStockModal('saida')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 transition-all">
          <LogOut className="w-3.5 h-3.5" /> Dar Saída
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Sincronização automática</span>
          <button onClick={() => setSyncEnabled(s => !s)}>
            {syncEnabled ? <ToggleRight className="w-7 h-7 text-purple-400" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Histórico */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Histórico de Movimentações</p>
        <div className="dash-card rounded-xl overflow-x-auto border border-white/[0.06]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Data','Tipo','Qtd.','Motivo','Saldo','Usuário'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {moves.map((mv, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-slate-500 tabular-nums">{mv.data}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${mv.tipo === 'Entrada' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{mv.tipo}</span>
                  </td>
                  <td className={`px-4 py-2.5 font-bold tabular-nums ${mv.qtd > 0 ? 'text-green-400' : 'text-red-400'}`}>{mv.qtd > 0 ? '+' : ''}{mv.qtd}</td>
                  <td className="px-4 py-2.5 text-slate-400">{mv.motivo}</td>
                  <td className="px-4 py-2.5 font-semibold text-white tabular-nums">{Math.max(0, mv.saldo)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{mv.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {stockModal && <StockModal tipo={stockModal} onClose={() => setStockModal(null)} onConfirm={handleMove} />}
    </div>
  )
}

// ─── Tab: Fiscal ──────────────────────────────────────────────────────────────

function TabFiscal({ p, onChange }: { p: Produto; onChange: (patch: Partial<Produto>) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="NCM" hint="Nomenclatura Comum do Mercosul">
          <CyInput value={p.ncm} onChange={v => onChange({ ncm: v })} placeholder="3305.10.00" mono />
        </Field>
        <Field label="CFOP" hint="Código Fiscal de Operações">
          <CyInput value={p.cfop} onChange={v => onChange({ cfop: v })} placeholder="5405" mono />
        </Field>
        <Field label="CEST" hint="Substituição Tributária">
          <CyInput value={p.cest} onChange={v => onChange({ cest: v })} placeholder="Ex: 17.006.00" mono />
        </Field>
        <Field label="Origem">
          <CySelect value={p.origem as any} onChange={v => onChange({ origem: v })}
            options={['Nacional','Estrangeira - Importação Direta','Estrangeira - Adq. Mercado Interno'] as any} />
        </Field>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Alíquotas</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['icms','ipi','pis','cofins'] as const).map(k => (
            <Field key={k} label={k.toUpperCase()}>
              <NumInput value={p[k]} onChange={v => onChange({ [k]: v })} suffix="%" step={0.01} />
            </Field>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/15">
        <p className="text-[10px] text-blue-400 font-semibold">ℹ️ ICMS — CE: 12% para operações interestaduais com destino ao Ceará (ICMS destino).</p>
      </div>

      <Field label="Informações Adicionais do Contribuinte">
        <textarea value={p.infAdicionais} onChange={e => onChange({ infAdicionais: e.target.value })}
          placeholder="Ex: Produto isento de IPI conforme Decreto nº..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
      </Field>

      <p className="text-xs text-slate-700 bg-dark-700 rounded-xl p-3 border border-white/[0.04]">
        📋 A emissão de NF-e está em desenvolvimento — integração com SEFAZ prevista para Q2 2026.
      </p>
    </div>
  )
}

// ─── Tab: Dimensões ───────────────────────────────────────────────────────────

function BoxSVG({ c, l, a }: { c: number; l: number; a: number }) {
  const sc = 60
  const maxDim = Math.max(c, l, a, 1)
  const cN = (c / maxDim) * sc; const lN = (l / maxDim) * sc; const aN = (a / maxDim) * sc
  const depth = 16
  return (
    <svg viewBox="0 0 160 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Front face */}
      <rect x={40} y={40} width={cN} height={aN} fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.5)" strokeWidth="1" />
      {/* Top face (parallelogram) */}
      <polygon points={`${40},${40} ${40+depth},${40-depth/2} ${40+cN+depth},${40-depth/2} ${40+cN},${40}`}
        fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.35)" strokeWidth="1" />
      {/* Right face (parallelogram) */}
      <polygon points={`${40+cN},${40} ${40+cN+depth},${40-depth/2} ${40+cN+depth},${40+aN-depth/2} ${40+cN},${40+aN}`}
        fill="rgba(168,85,247,0.06)" stroke="rgba(168,85,247,0.25)" strokeWidth="1" />
      {/* Dimension labels */}
      <text x={40 + cN/2} y={40 + aN + 10} fill="rgba(148,163,184,0.8)" fontSize="8" textAnchor="middle">{c}cm</text>
      <text x={40 + cN + depth + 6} y={40 + aN/2 + 3} fill="rgba(148,163,184,0.8)" fontSize="8" textAnchor="start">{l}cm</text>
      <text x={30} y={40 + aN/2 + 3} fill="rgba(148,163,184,0.8)" fontSize="8" textAnchor="end">{a}cm</text>
    </svg>
  )
}

function TabDimensoes({ p, onChange }: { p: Produto; onChange: (patch: Partial<Produto>) => void }) {
  const pesoCubado  = p.compEmb > 0 ? (p.compEmb * p.largEmb * p.altEmb) / 6000 : 0
  const pesoCobrado = Math.max(p.pesoEmb, pesoCubado)
  const volume      = p.compEmb * p.largEmb * p.altEmb / 1000

  return (
    <div className="space-y-5">
      {/* Product dims */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dimensões do Produto</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Comprimento"><NumInput value={p.compProd} onChange={v => onChange({ compProd: v })} suffix="cm" /></Field>
          <Field label="Largura">    <NumInput value={p.largProd} onChange={v => onChange({ largProd: v })} suffix="cm" /></Field>
          <Field label="Altura">     <NumInput value={p.altProd}  onChange={v => onChange({ altProd: v })}  suffix="cm" /></Field>
          <Field label="Peso">       <NumInput value={p.pesoProd} onChange={v => onChange({ pesoProd: v })} suffix="kg" step={0.001} /></Field>
        </div>
      </div>

      {/* Packaging dims + 3D preview */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Embalagem</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <Field label="Tipo">
              <CySelect value={p.tipoEmb} onChange={v => onChange({ tipoEmb: v as TipoEmb })} options={TIPOS_EMB as any} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Comprimento"><NumInput value={p.compEmb} onChange={v => onChange({ compEmb: v })} suffix="cm" /></Field>
              <Field label="Largura">    <NumInput value={p.largEmb} onChange={v => onChange({ largEmb: v })} suffix="cm" /></Field>
              <Field label="Altura">     <NumInput value={p.altEmb}  onChange={v => onChange({ altEmb: v })}  suffix="cm" /></Field>
              <Field label="Peso emb.">  <NumInput value={p.pesoEmb} onChange={v => onChange({ pesoEmb: v })} suffix="kg" step={0.001} /></Field>
            </div>
          </div>
          {/* 3D box SVG */}
          <div className="flex items-center justify-center">
            <div className="w-36 h-28">
              {p.compEmb > 0 && p.largEmb > 0 && p.altEmb > 0
                ? <BoxSVG c={p.compEmb} l={p.largEmb} a={p.altEmb} />
                : <div className="w-full h-full flex items-center justify-center">
                    <p className="text-xs text-slate-700 text-center">Preencha as dimensões para visualização 3D</p>
                  </div>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {p.compEmb > 0 && (
        <div className="dash-card p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Peso Real',    val: `${(p.pesoProd + p.pesoEmb).toFixed(3)} kg`, tip: 'Produto + embalagem' },
            { label: 'Peso Cubado',  val: `${pesoCubado.toFixed(3)} kg`,               tip: '(C×L×A) / 6000'     },
            { label: 'Peso Cobrado', val: `${pesoCobrado.toFixed(3)} kg`,              tip: 'Maior entre real e cubado', hi: true },
            { label: 'Volume',       val: `${volume.toFixed(2)} L`,                    tip: 'Volume da embalagem' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] text-slate-500 mb-0.5">{s.label}</p>
              <p className={`text-base font-bold ${s.hi ? 'text-purple-300' : 'text-white'}`}>{s.val}</p>
              <p className="text-[9px] text-slate-700">{s.tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Marketplaces ────────────────────────────────────────────────────────

const MKT_TITLE_LIMIT: Record<MKT, number> = {
  ML: 60, SP: 120, AMZ: 200, MAG: 150, TKT: 255,
  AME: 200, CB: 200, NS: 200, TRY: 200, LI: 200, ALI: 128,
}

const MKT_DESC_LIMIT: Record<MKT, number> = {
  ML: 50000, SP: 3000, AMZ: 2000, MAG: 4000, TKT: 5000,
  AME: 0, CB: 0, NS: 0, TRY: 0, LI: 0, ALI: 0,
}

function FieldStatus({ value, max }: { value: string; max: number }) {
  if (max === 0) return null
  const len = value.length
  if (len === 0) return <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" title="Vazio" />
  if (len > max) return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title={`${len}/${max} — Excedeu o limite`} />
  if (len > max * 0.9) return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title={`${len}/${max} — Próximo do limite`} />
  return <span className="w-2 h-2 rounded-full bg-green-400 inline-block" title={`${len}/${max} — OK`} />
}

function AIBadge() {
  return (
    <span title="Em breve: a IA vai adaptar automaticamente seu texto para as regras de cada marketplace"
      className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30 select-none cursor-default">
      <Sparkles className="w-2.5 h-2.5" /> IA — Em Breve
    </span>
  )
}

interface CopyModalState {
  targetMkt: MKT; srcMkt: MKT
  copyTitulo: boolean; copyDescricao: boolean; copyCategoria: boolean
}

function TabMarketplaces({ p, onChange }: { p: Produto; onChange: (patch: Partial<Produto>) => void }) {
  const [openMkts, setOpenMkts] = useState<MKT[]>(() => MKTS.filter(m => p.mkt[m]?.enabled))
  const [copyModal, setCopyModal] = useState<CopyModalState | null>(null)

  const patchMkt = useCallback((m: MKT, patch: Partial<MktListing>) =>
    onChange({ mkt: { ...p.mkt, [m]: { ...p.mkt[m], ...patch } } }),
    [p.mkt, onChange])

  const toggleMkt = (m: MKT) => {
    const newEnabled = !(p.mkt[m]?.enabled)
    patchMkt(m, { enabled: newEnabled })
    if (newEnabled) setOpenMkts(prev => prev.includes(m) ? prev : [...prev, m])
    else setOpenMkts(prev => prev.filter(x => x !== m))
  }

  const toggleOpen = (m: MKT) =>
    setOpenMkts(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const applyCopy = () => {
    if (!copyModal) return
    const { targetMkt, srcMkt, copyTitulo, copyDescricao, copyCategoria } = copyModal
    const src = p.mkt[srcMkt]
    if (!src) return
    const patch: Partial<MktListing> = {}
    if (copyTitulo && src.titulo) patch.titulo = src.titulo
    if (copyDescricao && src.descricao) patch.descricao = src.descricao
    if (copyCategoria && src.categoria) patch.categoria = src.categoria
    patchMkt(targetMkt, patch)
    setCopyModal(null)
  }

  const enabledMkts = MKTS.filter(m => p.mkt[m]?.enabled)
  const enabledCount = enabledMkts.length

  const copyWarnings: string[] = copyModal ? (() => {
    const src = p.mkt[copyModal.srcMkt]
    const warns: string[] = []
    if (copyModal.copyTitulo && src?.titulo) {
      const limit = MKT_TITLE_LIMIT[copyModal.targetMkt]
      if (src.titulo.length > limit)
        warns.push(`Título tem ${src.titulo.length} chars, limite do ${MKT_RULES[copyModal.targetMkt].nome} é ${limit}. Será necessário reduzir.`)
    }
    if (copyModal.copyDescricao && src?.descricao) {
      const limit = MKT_DESC_LIMIT[copyModal.targetMkt]
      if (limit > 0 && src.descricao.length > limit)
        warns.push(`Descrição tem ${src.descricao.length} chars, limite é ${limit}. Será necessário reduzir.`)
    }
    return warns
  })() : []

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-white">
            Publicado em {enabledCount} de {MKTS.length} marketplaces
          </span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {enabledMkts.map(m => {
            const st = p.mkt[m]?.status
            const dot = st === 'ativo' ? 'bg-green-400' : st === 'pendente' ? 'bg-amber-400' : st === 'pausado' ? 'bg-yellow-600' : 'bg-slate-600'
            return (
              <span key={m} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${MKT_COLOR[m]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{m}
              </span>
            )
          })}
          {enabledCount === 0 && <span className="text-xs text-slate-600">Nenhum ativado</span>}
        </div>
        {MKTS.length - enabledCount > 0 && (
          <span className="text-[11px] text-slate-600">{MKTS.length - enabledCount} não configurados</span>
        )}
      </div>

      {/* Toggle bar */}
      <div className="flex gap-2 flex-wrap">
        {MKTS.map(m => {
          const enabled = p.mkt[m]?.enabled ?? false
          return (
            <button key={m} onClick={() => toggleMkt(m)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                enabled
                  ? `${MKT_COLOR[m]} border-current/30`
                  : 'text-slate-600 bg-dark-700 border-transparent hover:text-slate-400 hover:bg-dark-600'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-current' : 'bg-slate-700'}`} />
              {MKT_RULES[m].nome}
            </button>
          )
        })}
      </div>

      {/* Accordions for enabled marketplaces */}
      {MKTS.filter(m => p.mkt[m]?.enabled).map(m => {
        const listing = p.mkt[m]!
        const isOpen = openMkts.includes(m)
        const autoPreco = calcPreco(p, m)
        const titleLimit = MKT_TITLE_LIMIT[m]
        const descLimit = MKT_DESC_LIMIT[m]
        const otherEnabled = enabledMkts.filter(x => x !== m)

        return (
          <div key={m} className="dash-card rounded-xl border border-white/[0.08] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-all"
              onClick={() => toggleOpen(m)}>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${MKT_COLOR[m]}`}>{m}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{MKT_RULES[m].nome}</p>
                {listing.titulo && <p className="text-[11px] text-slate-600 truncate">{listing.titulo}</p>}
              </div>
              {listing.status && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${MKT_STATUS_META[listing.status].cls}`}>
                  {MKT_STATUS_META[listing.status].label}
                </span>
              )}
              {listing.link && (
                <a href={listing.link} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button onClick={e => { e.stopPropagation(); toggleMkt(m) }} className="shrink-0">
                <ToggleRight className="w-7 h-7 text-purple-400" />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
              <div className="px-4 pb-5 border-t border-white/[0.04] space-y-5 pt-4">

                {/* Copy from another marketplace */}
                {otherEnabled.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-600">Copiar de:</span>
                    {otherEnabled.map(src => (
                      <button key={src}
                        onClick={() => setCopyModal({ targetMkt: m, srcMkt: src, copyTitulo: true, copyDescricao: true, copyCategoria: false })}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all hover:opacity-80 ${MKT_COLOR[src]} border-current/20`}>
                        {src}
                      </button>
                    ))}
                  </div>
                )}

                {/* Read-only strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-dark-800 rounded-xl p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">SKU</p>
                    <p className="text-xs font-mono text-slate-400">{p.sku || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">EAN</p>
                    <p className="text-xs font-mono text-slate-400">{p.ean || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">Estoque</p>
                    <p className="text-xs text-slate-400">{p.estoqueReal} un.</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">Peso emb.</p>
                    <p className="text-xs text-slate-400">{p.pesoEmb ? `${p.pesoEmb}kg` : '—'}</p>
                  </div>
                </div>

                {/* Price + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preço Manual (R$)" hint={`Sugerido: R$ ${autoPreco.toFixed(2)}`}>
                    <NumInput value={listing.precoManual ?? 0} onChange={v => patchMkt(m, { precoManual: v })} prefix="R$" />
                  </Field>
                  <Field label="Status">
                    <CySelect value={(listing.status ?? 'ativo') as MktStatus}
                      onChange={v => patchMkt(m, { status: v as MktStatus })}
                      options={['ativo', 'pausado', 'pendente', 'reprovado'] as MktStatus[]} />
                  </Field>
                </div>

                {/* Título (all marketplaces) */}
                <Field label={`Título ${m} (${titleLimit} chars)`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <FieldStatus value={listing.titulo ?? ''} max={titleLimit} />
                    <span className="text-[10px] text-slate-600">{(listing.titulo ?? '').length} / {titleLimit}</span>
                    <div className="ml-auto"><AIBadge /></div>
                  </div>
                  <input value={listing.titulo ?? ''} onChange={e => patchMkt(m, { titulo: e.target.value })}
                    placeholder={`Título otimizado para ${MKT_RULES[m].nome}...`}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
                </Field>

                {/* ML-specific */}
                {m === 'ML' && <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Tipo de Anúncio">
                      <CySelect value={listing.tipoAnuncio ?? 'classico'}
                        onChange={v => patchMkt(m, { tipoAnuncio: v as 'classico'|'premium' })}
                        options={['classico', 'premium'] as any} />
                    </Field>
                    <Field label="Condição">
                      <CySelect value={p.condicao} onChange={v => onChange({ condicao: v as Condicao })} options={CONDICOES as any} />
                    </Field>
                    <Field label="Frete ML Envios">
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => patchMkt(m, { freteML: !listing.freteML })}>
                          {listing.freteML ? <ToggleRight className="w-6 h-6 text-purple-400" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
                        </button>
                        <span className="text-xs text-slate-400">{listing.freteML ? 'ML Envios ativo' : 'Por conta do vendedor'}</span>
                      </div>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ID do Anúncio ML">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder="MLB1234567" mono />
                    </Field>
                    <Field label="Link do Anúncio">
                      <CyInput value={listing.link ?? ''} onChange={v => patchMkt(m, { link: v })} placeholder="https://produto.mercadolivre.com.br/..." />
                    </Field>
                  </div>
                  <Field label="Categoria ML">
                    <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Ex: Beleza e Cuidado Pessoal > Cabelos" />
                  </Field>
                </>}

                {/* SP-specific */}
                {m === 'SP' && <>
                  <Field label="Descrição Curta Shopee (500 chars)">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FieldStatus value={listing.descCurta ?? ''} max={500} />
                      <span className="text-[10px] text-slate-600">{(listing.descCurta ?? '').length} / 500</span>
                    </div>
                    <textarea value={listing.descCurta ?? ''} onChange={e => patchMkt(m, { descCurta: e.target.value })}
                      placeholder="Resumo curto exibido na busca..." rows={2}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Frete Grátis Shopee">
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => patchMkt(m, { freteGratis: !listing.freteGratis })}>
                          {listing.freteGratis ? <ToggleRight className="w-6 h-6 text-purple-400" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
                        </button>
                        <span className="text-xs text-slate-400">{listing.freteGratis ? 'Frete grátis ativo' : 'Frete padrão'}</span>
                      </div>
                    </Field>
                    <Field label="Categoria Shopee">
                      <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Ex: Beleza & Cuidado Pessoal" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ID do Anúncio Shopee">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder="SP123456" mono />
                    </Field>
                    <Field label="Link do Anúncio">
                      <CyInput value={listing.link ?? ''} onChange={v => patchMkt(m, { link: v })} placeholder="https://shopee.com.br/..." />
                    </Field>
                  </div>
                </>}

                {/* AMZ-specific */}
                {m === 'AMZ' && <>
                  <Field label="Bullet Points (até 5, 500 chars cada)">
                    {[0, 1, 2, 3, 4].map(i => {
                      const bullets = listing.bullets ?? ['', '', '', '', '']
                      const val = bullets[i] ?? ''
                      return (
                        <div key={i} className="flex items-start gap-2 mb-2">
                          <span className="text-[10px] font-bold text-slate-700 w-4 shrink-0 mt-2">{i + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <FieldStatus value={val} max={500} />
                              <span className="text-[10px] text-slate-600">{val.length} / 500</span>
                            </div>
                            <input value={val}
                              onChange={e => {
                                const nb = [...(listing.bullets ?? ['', '', '', '', ''])]
                                nb[i] = e.target.value
                                patchMkt(m, { bullets: nb })
                              }}
                              placeholder={`Benefício ${i + 1}...`}
                              className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
                          </div>
                        </div>
                      )
                    })}
                  </Field>
                  <Field label="Termos de Busca Backend (250 chars)" hint="Invisíveis ao comprador, usados para ranking.">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FieldStatus value={listing.backendKw ?? ''} max={250} />
                      <span className="text-[10px] text-slate-600">{(listing.backendKw ?? '').length} / 250</span>
                    </div>
                    <textarea value={listing.backendKw ?? ''} onChange={e => patchMkt(m, { backendKw: e.target.value })}
                      placeholder="palavras chave separadas por espaço..." rows={2}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
                  </Field>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Fulfillment">
                      <CySelect value={listing.fulfillment ?? 'FBM'}
                        onChange={v => patchMkt(m, { fulfillment: v as 'FBA'|'FBM' })}
                        options={['FBA', 'FBM'] as any} />
                    </Field>
                    <Field label="ASIN">
                      <CyInput value={listing.asin ?? ''} onChange={v => patchMkt(m, { asin: v })} placeholder="B0XXXXXXXX" mono />
                    </Field>
                    <Field label="Categoria Amazon">
                      <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Health & Beauty" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ID do Anúncio Amazon">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder="B0XXXXX" mono />
                    </Field>
                    <Field label="Link do Anúncio">
                      <CyInput value={listing.link ?? ''} onChange={v => patchMkt(m, { link: v })} placeholder="https://amazon.com.br/dp/..." />
                    </Field>
                  </div>
                </>}

                {/* MAG-specific */}
                {m === 'MAG' && <>
                  <Field label="Categoria Magalu">
                    <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Ex: Beleza e Perfumaria" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ID do Anúncio">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder="MAG12345" mono />
                    </Field>
                    <Field label="Link do Anúncio">
                      <CyInput value={listing.link ?? ''} onChange={v => patchMkt(m, { link: v })} placeholder="https://magazineluiza.com.br/..." />
                    </Field>
                  </div>
                </>}

                {/* TKT-specific */}
                {m === 'TKT' && <>
                  <Field label="Tags do Produto (até 10)">
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {(listing.tagsProd ?? []).map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-slate-700 px-2 py-1 rounded-full">
                          {tag}
                          <button onClick={() => patchMkt(m, { tagsProd: listing.tagsProd!.filter((_, idx) => idx !== i) })}
                            className="text-slate-500 hover:text-red-400 transition-colors"><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                    {(listing.tagsProd ?? []).length < 10 && (
                      <input placeholder="Adicionar tag... (Enter)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim()
                            if (val) patchMkt(m, { tagsProd: [...(listing.tagsProd ?? []), val] });
                            (e.target as HTMLInputElement).value = ''
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ID do Anúncio TikTok">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder="TKT123456" mono />
                    </Field>
                    <Field label="Categoria TikTok">
                      <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Beauty & Personal Care" />
                    </Field>
                  </div>
                </>}

                {/* AME/CB-specific */}
                {(m === 'AME' || m === 'CB') && <>
                  <Field label="Categoria">
                    <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Ex: Beleza e Perfumaria" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ID do Anúncio">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder={`${m}12345`} mono />
                    </Field>
                    <Field label="Link do Anúncio">
                      <CyInput value={listing.link ?? ''} onChange={v => patchMkt(m, { link: v })}
                        placeholder={m === 'AME' ? 'https://americanas.com.br/...' : 'https://casasbahia.com.br/...'} />
                    </Field>
                  </div>
                </>}

                {/* NS/TRY/LI-specific */}
                {(m === 'NS' || m === 'TRY' || m === 'LI') && <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="URL Amigável (slug)">
                      <CyInput value={listing.slug ?? ''} onChange={v => patchMkt(m, { slug: v })} placeholder="nome-do-produto" mono />
                    </Field>
                    <Field label="Produto em Destaque">
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => patchMkt(m, { destaque: !listing.destaque })}>
                          {listing.destaque ? <ToggleRight className="w-6 h-6 text-purple-400" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
                        </button>
                        <span className="text-xs text-slate-400">{listing.destaque ? 'Em destaque' : 'Normal'}</span>
                      </div>
                    </Field>
                  </div>
                  <Field label="Meta Description SEO (160 chars)">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FieldStatus value={listing.seoMeta ?? ''} max={160} />
                      <span className="text-[10px] text-slate-600">{(listing.seoMeta ?? '').length} / 160</span>
                    </div>
                    <textarea value={listing.seoMeta ?? ''} onChange={e => patchMkt(m, { seoMeta: e.target.value })}
                      placeholder="Descrição para buscadores (Google)..." rows={2}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
                  </Field>
                  <Field label="Tags / Palavras-chave SEO">
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {(listing.tagsSEO ?? []).map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
                          {tag}
                          <button onClick={() => patchMkt(m, { tagsSEO: listing.tagsSEO!.filter((_, idx) => idx !== i) })}
                            className="text-indigo-500 hover:text-red-400 transition-colors"><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                    <input placeholder="Tag SEO... (Enter)"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim()
                          if (val) patchMkt(m, { tagsSEO: [...(listing.tagsSEO ?? []), val] });
                          (e.target as HTMLInputElement).value = ''
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Categoria da Loja">
                      <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Ex: Cabelos" />
                    </Field>
                    <Field label="ID / Ref. do Produto">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder={`${m}12345`} mono />
                    </Field>
                  </div>
                  <Field label="Link do Produto">
                    <CyInput value={listing.link ?? ''} onChange={v => patchMkt(m, { link: v })} placeholder="https://loja.com.br/..." />
                  </Field>
                </>}

                {/* ALI-specific */}
                {m === 'ALI' && <>
                  <Field label="Título em Inglês (128 chars)">
                    <div className="flex items-center gap-2 mb-1.5">
                      <FieldStatus value={listing.tituloEN ?? ''} max={128} />
                      <span className="text-[10px] text-slate-600">{(listing.tituloEN ?? '').length} / 128</span>
                      <div className="ml-auto"><AIBadge /></div>
                    </div>
                    <input value={listing.tituloEN ?? ''} onChange={e => patchMkt(m, { tituloEN: e.target.value })}
                      placeholder="Product title in English..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 font-mono" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Categoria AliExpress">
                      <CyInput value={listing.categoria ?? ''} onChange={v => patchMkt(m, { categoria: v })} placeholder="Hair Care" />
                    </Field>
                    <Field label="ID do Produto">
                      <CyInput value={listing.anuncioId ?? ''} onChange={v => patchMkt(m, { anuncioId: v })} placeholder="ALI123456" mono />
                    </Field>
                  </div>
                </>}

                {/* Description field */}
                {descLimit > 0 ? (
                  <Field label={`Descrição ${m} (${descLimit.toLocaleString('pt-BR')} chars)`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FieldStatus value={listing.descricao ?? ''} max={descLimit} />
                      <span className="text-[10px] text-slate-600">{(listing.descricao ?? '').length} / {descLimit.toLocaleString('pt-BR')}</span>
                      <div className="ml-auto"><AIBadge /></div>
                    </div>
                    <textarea value={listing.descricao ?? ''} onChange={e => patchMkt(m, { descricao: e.target.value })}
                      placeholder={`Descrição otimizada para ${MKT_RULES[m].nome}...`} rows={6}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-y" />
                  </Field>
                ) : (
                  <Field label={`Descrição ${m} (aceita HTML)`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-slate-600">{(listing.descricao ?? '').length} chars</span>
                      <div className="ml-auto"><AIBadge /></div>
                    </div>
                    <textarea value={listing.descricao ?? ''} onChange={e => patchMkt(m, { descricao: e.target.value })}
                      placeholder={`Descrição para ${MKT_RULES[m].nome} (aceita HTML)...`} rows={6}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-y font-mono" />
                  </Field>
                )}

                {/* Tips note */}
                <div className="bg-dark-800 rounded-xl px-3 py-2.5 border border-white/[0.04]">
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-500">💡 {MKT_RULES[m].nome}:</span>{' '}
                    {m === 'ML' && 'Sem HTML na descrição. Títulos entre 57–60 chars têm melhor performance. Tipo Premium aumenta visibilidade.'}
                    {m === 'SP' && 'Keyword no início do título. Sem asteriscos na descrição. Estrutura ideal: keyword → público → prova social → CTA.'}
                    {m === 'AMZ' && 'Bullet points são essenciais — destaque benefícios. Backend keywords são invisíveis mas impactam o ranking.'}
                    {m === 'MAG' && 'Títulos claros e objetivos. Fotos com fundo branco são obrigatórias. Comissão de 16%.'}
                    {m === 'TKT' && 'Keywords populares no título. Vídeo do produto é fortemente recomendado. Comissão baixa (5%).'}
                    {(m === 'AME' || m === 'CB') && 'Plataformas Via — descrição aceita HTML. Boas fotos são essenciais. Comissão de 16%.'}
                    {(m === 'NS' || m === 'TRY' || m === 'LI') && 'Loja própria — sem comissão. Otimize para SEO com meta description e slug amigável.'}
                    {m === 'ALI' && 'Título em português E inglês obrigatório. Público internacional — destaque qualidade e envio.'}
                  </p>
                  <p className="text-[10px] text-slate-700 mt-1">{MKT_RULES[m].freteInfo}</p>
                </div>

                {/* Stock sync + obs */}
                <div className="flex items-center gap-2">
                  <button onClick={() => patchMkt(m, { estoqueSync: !listing.estoqueSync })}>
                    {listing.estoqueSync ? <ToggleRight className="w-6 h-6 text-purple-400" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
                  </button>
                  <span className="text-xs text-slate-400">Sincronizar estoque automaticamente</span>
                </div>
                <Field label="Observações internas">
                  <CyInput value={listing.obs ?? ''} onChange={v => patchMkt(m, { obs: v })} placeholder="Notas para a equipe..." />
                </Field>
              </div>
            )}
          </div>
        )
      })}

      {enabledCount === 0 && (
        <div className="dash-card rounded-xl border border-white/[0.04] p-12 text-center">
          <Globe className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhum marketplace ativado</p>
          <p className="text-xs text-slate-700 mt-1">Use os botões acima para ativar os canais de venda</p>
        </div>
      )}

      {/* Copy Modal */}
      {copyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setCopyModal(null)}>
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm">Copiar de {MKT_RULES[copyModal.srcMkt].nome}</h3>
              <button onClick={() => setCopyModal(null)} className="text-slate-600 hover:text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Para: <span className={`font-bold px-2 py-0.5 rounded ${MKT_COLOR[copyModal.targetMkt]}`}>
                {MKT_RULES[copyModal.targetMkt].nome}
              </span>
            </p>
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Fonte</p>
              <div className="flex gap-1.5 flex-wrap">
                {enabledMkts.filter(x => x !== copyModal.targetMkt).map(src => (
                  <button key={src}
                    onClick={() => setCopyModal(prev => prev ? { ...prev, srcMkt: src } : null)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                      copyModal.srcMkt === src
                        ? `${MKT_COLOR[src]} border-current/30`
                        : 'text-slate-600 bg-dark-700 border-transparent hover:text-slate-400'
                    }`}>{src}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Campos a copiar</p>
              {([
                { key: 'copyTitulo' as const, label: 'Título' },
                { key: 'copyDescricao' as const, label: 'Descrição' },
                { key: 'copyCategoria' as const, label: 'Categoria' },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={copyModal[key]}
                    onChange={e => setCopyModal(prev => prev ? { ...prev, [key]: e.target.checked } : null)}
                    className="rounded border-slate-600 accent-purple-500" />
                  <span className="text-xs text-slate-300">{label}</span>
                </label>
              ))}
            </div>
            {copyWarnings.length > 0 && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 space-y-1">
                {copyWarnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-amber-400">⚠️ {w}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setCopyModal(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 bg-dark-700 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                Cancelar
              </button>
              <button onClick={applyCopy}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all">
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Variações ───────────────────────────────────────────────────────────

function TabVariacoes() {
  return (
    <div className="relative">
      {/* Mockup preview (greyed out) */}
      <div className="opacity-30 pointer-events-none select-none space-y-4">
        <div className="dash-card rounded-xl p-4 border border-white/[0.06]">
          <p className="text-xs font-bold text-slate-400 mb-3">Atributos da Variação</p>
          <div className="flex gap-2 flex-wrap">
            {['Volume: 100ml','Volume: 200ml','Volume: 300ml'].map(v => (
              <span key={v} className="text-[10px] font-semibold px-2.5 py-1 bg-purple-600/20 text-purple-300 rounded-full border border-purple-500/20">{v}</span>
            ))}
            <button className="text-[10px] font-semibold px-2.5 py-1 bg-dark-700 text-slate-500 rounded-full border border-white/[0.06]">+ Adicionar valor</button>
          </div>
        </div>
        <div className="dash-card rounded-xl overflow-x-auto border border-white/[0.06]">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/[0.04]">
              {['Variação','SKU Filho','Preço','Estoque','Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-white/[0.04]">
              {['100ml','200ml','300ml'].map((v,i) => (
                <tr key={v}><td className="px-4 py-3 text-slate-400">{v}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">FIO-001-{v}</td>
                  <td className="px-4 py-3 text-white">R$ {(39.90 + i*10).toFixed(2)}</td>
                  <td className="px-4 py-3 text-white">{20 - i*5}</td>
                  <td className="px-4 py-3"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-green-400 bg-green-400/10">Ativo</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-center bg-dark-900/90 backdrop-blur-sm rounded-2xl p-8 border border-white/[0.06]">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-7 h-7 text-purple-400" />
          </div>
          <p className="font-bold text-white text-sm mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Variações em Desenvolvimento</p>
          <p className="text-xs text-slate-500 max-w-xs">Gerencie cor, tamanho e volume com estoque por SKU filho.</p>
          <span className="mt-4 inline-block text-[10px] bg-purple-900/50 text-purple-400 px-3 py-1.5 rounded-full font-bold">Q2 2026</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProdutoEditPage({ params }: { params: { id: string } }) {
  const { id } = params
  const isNew  = id === 'novo'
  const router = useRouter()
  const { user, profile } = useAuth()

  const blankProduct: Produto = {
    id: 0, sku: '', ean: '', nome: 'Novo Produto',
    descricao: '', descricaoCurta: '',
    marca: 'Fio Cabana', categoria: CATEGORIAS[0],
    tags: [], status: 'rascunho', condicao: 'Novo', unidade: 'UN', garantia: 'Sem garantia',
    custo: 0, embalagem: 0, variados: 0, marketing: 3, influenciador: 0, imposto: 6, margem: 30, precoVenda: 0,
    estoqueReal: 0, estoqueVirtual: 0, estoqueMinimo: 5,
    ncm: '', cfop: '5405', origem: 'Nacional', cest: '', icms: 12, ipi: 0, pis: 1.65, cofins: 7.6, infAdicionais: '',
    compProd: 0, largProd: 0, altProd: 0, pesoProd: 0,
    compEmb: 0, largEmb: 0, altEmb: 0, pesoEmb: 0, tipoEmb: 'Caixa',
    imagens: [],
    mkt: Object.fromEntries(MKTS.map(m => [m, {
      enabled: false, anuncioId: null, link: null, status: null,
      precoManual: 0, estoqueSync: true, categoria: '', obs: '',
      titulo: '', descricao: '',
    }])) as Partial<Record<MKT, MktListing>>,
    criadoEm: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0],
  }

  const mockInitial = isNew ? blankProduct : (mockProdutos.find(p => p.id === parseInt(id)) ?? blankProduct)

  const [produto,     setProduto]    = useState<Produto>(mockInitial)
  const [activeTab,   setActiveTab]  = useState<TabId>('geral')
  const [unsaved,     setUnsaved]    = useState(false)
  const [toast,       setToast]      = useState<{ msg: string; type: 'success'|'error' } | null>(null)
  const [showConfirm, setShowConfirm]= useState(false)
  const [pageLoading, setPageLoading]= useState(!isNew)
  const [saving,      setSaving]     = useState(false)

  // Load product from DB (skip for new products and dev-user)
  useEffect(() => {
    if (isNew || !user || user.id === 'dev-user') { setPageLoading(false); return }
    const numId = parseInt(id)
    if (isNaN(numId)) { setPageLoading(false); return }
    getProduct(numId, user.id)
      .then(p => { if (p) setProduto(p) })
      .finally(() => setPageLoading(false))
  }, [id, isNew, user?.id])

  const patch = (p: Partial<Produto>) => { setProduto(prev => ({ ...prev, ...p })); setUnsaved(true) }

  const handleSave = async (publish: boolean) => {
    if (!user) return
    setSaving(true)
    const saved = { ...produto, status: (publish ? 'ativo' : produto.status) as Produto['status'] }
    try {
      if (isNew) {
        const created = await createProduct(saved, user.id)
        if (!created) { setToast({ msg: 'Erro ao criar produto.', type: 'error' }); return }
        await saveProductMarketplaces(created.id, saved.mkt, user.id)
        setUnsaved(false)
        void logActivity({
          action: 'create_product', category: 'products',
          description: `Produto criado: ${saved.nome}`,
          metadata: { id: created.id, sku: saved.sku, status: saved.status },
        })
        setToast({ msg: 'Produto criado com sucesso!', type: 'success' })
        setTimeout(() => router.replace(`/dashboard/produtos/${created.id}`), 1000)
      } else {
        const ok = await updateProduct(saved, user.id)
        if (!ok) { setToast({ msg: 'Erro ao salvar produto.', type: 'error' }); return }
        await saveProductMarketplaces(saved.id, saved.mkt, user.id)
        setUnsaved(false)
        void logActivity({
          action: publish ? 'publish_product' : 'update_product', category: 'products',
          description: publish ? `Produto publicado: ${saved.nome}` : `Produto atualizado: ${saved.nome}`,
          metadata: { id: saved.id, sku: saved.sku },
        })
        setToast({ msg: publish ? 'Produto salvo e publicado!' : 'Rascunho salvo!', type: 'success' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (unsaved) setShowConfirm(true)
    // else navigate — Next.js Link handles it
  }

  const { score: hs, checks } = healthScore(produto)
  const mc = MARCA_COLOR[produto.marca] ?? 'text-slate-400 bg-slate-400/10'

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'Novo Produto' : produto.nome}
        description={isNew ? 'Cadastro de produto' : `SKU ${produto.sku} · ${produto.marca}`}
      />

      <div className="p-4 md:p-6 space-y-4">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Link href="/dashboard/produtos" className="hover:text-slate-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Produtos
          </Link>
          <span>/</span>
          <span className="text-slate-400 truncate max-w-xs">{produto.nome}</span>
        </div>

        {/* Meta row */}
        {!isNew && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${mc}`}>{produto.marca}</span>
            <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${STATUS_META[produto.status].cls}`}>{STATUS_META[produto.status].label}</span>
            <span className="text-xs text-slate-600">Atualizado em {produto.updatedAt}</span>
            {unsaved && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Alterações não salvas
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${activeTab === tab.id ? 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/30' : 'text-slate-500 hover:text-slate-300 bg-dark-700'}`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === 'variacoes' && <span className="text-[8px] text-amber-400 bg-amber-400/10 px-1 rounded font-bold">Em breve</span>}
            </button>
          ))}
        </div>

        {/* Tab content — fade transition */}
        <div key={activeTab} className="dash-card rounded-2xl p-6 animate-in fade-in duration-150">
          {activeTab === 'geral'        && <TabGeral        p={produto} onChange={patch} />}
          {activeTab === 'imagens'      && <TabImagens      p={produto} onChange={patch} />}
          {activeTab === 'precificacao' && <TabPrecificacao p={produto} onChange={patch} />}
          {activeTab === 'estoque'      && <TabEstoque      p={produto} onChange={patch} productId={produto.id || undefined} userId={user?.id} userName={profile?.name} />}
          {activeTab === 'fiscal'       && <TabFiscal       p={produto} onChange={patch} />}
          {activeTab === 'dimensoes'    && <TabDimensoes    p={produto} onChange={patch} />}
          {activeTab === 'marketplaces' && <TabMarketplaces p={produto} onChange={patch} />}
          {activeTab === 'variacoes'    && <TabVariacoes />}
        </div>

        {/* Fixed bottom bar */}
        <div className="sticky bottom-0 z-20 -mx-6 -mb-6">
          <div className="flex items-center justify-between px-6 py-4 bg-dark-900/95 backdrop-blur border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              {unsaved ? (
                <button onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-dark-700 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                  Cancelar
                </button>
              ) : (
                <Link href="/dashboard/produtos">
                  <button className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-dark-700 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                    Voltar
                  </button>
                </Link>
              )}
              {unsaved && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-amber-400 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Não salvo
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave(false)} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-dark-700 text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-all disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar Rascunho
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Salvar e Publicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals + Toast */}
      {showConfirm && <ConfirmModal onConfirm={() => {}} onCancel={() => setShowConfirm(false)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
