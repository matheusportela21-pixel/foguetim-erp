'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Copy, AlertTriangle, Loader2, ChevronDown, ChevronUp,
  X, CheckCircle2, Package, ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedProduct {
  title: string
  description: string
  price: number
  original_price?: number
  images: string[]
  brand?: string
  condition?: string
  sku?: string
  ean?: string
  category?: string
  attributes: Record<string, string>
  source_marketplace: string
  source_url: string
}

// ─── Marketplace colors ──────────────────────────────────────────────────────

const MKT_COLORS: Record<string, { label: string; bg: string; text: string }> = {
  ml:         { label: 'Mercado Livre', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  shopee:     { label: 'Shopee',        bg: 'bg-orange-500/10', text: 'text-orange-400' },
  magalu:     { label: 'Magalu',        bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  amazon:     { label: 'Amazon',        bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  aliexpress: { label: 'AliExpress',    bg: 'bg-red-500/10',    text: 'text-red-400' },
  shein:      { label: 'Shein',         bg: 'bg-purple-500/10', text: 'text-purple-400' },
  americanas: { label: 'Americanas',    bg: 'bg-slate-500/10',  text: 'text-slate-400' },
  kabum:      { label: 'KaBuM',         bg: 'bg-amber-500/10',  text: 'text-amber-400' },
  outro:      { label: 'Outro',         bg: 'bg-gray-500/10',   text: 'text-gray-400' },
}

const SUPPORTED_MARKETPLACES = [
  { key: 'ml',         emoji: '🟡' },
  { key: 'shopee',     emoji: '🟠' },
  { key: 'magalu',     emoji: '🔵' },
  { key: 'amazon',     emoji: '🟢' },
  { key: 'aliexpress', emoji: '🔴' },
  { key: 'shein',      emoji: '🟣' },
  { key: 'americanas', emoji: '⚫' },
  { key: 'kabum',      emoji: '🟤' },
]

const DESTINATION_CHANNELS = ['ml', 'shopee', 'magalu'] as const

type PageState = 'initial' | 'loading' | 'preview' | 'error'

// ─── Component ────────────────────────────────────────────────────────────────

export default function CopiadorPage() {
  const [state, setState] = useState<PageState>('initial')
  const [url, setUrl] = useState('')
  const [product, setProduct] = useState<ExtractedProduct | null>(null)
  const [error, setError] = useState('')

  // Editable fields
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [descExpanded, setDescExpanded] = useState(false)

  // Channels & consent
  const [channels, setChannels] = useState<string[]>([])
  const [authorized, setAuthorized] = useState(false)

  // Saving
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ─── Extract handler ────────────────────────────────────────────────────────

  async function handleExtract() {
    if (!url.trim()) return
    setState('loading')
    setError('')

    try {
      const res = await fetch('/api/listings/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Falha ao extrair dados do anuncio.')
        setState('error')
        return
      }

      const p: ExtractedProduct = data.product
      setProduct(p)
      setTitle(p.title || '')
      setPrice(p.price?.toString() || '')
      setDescription(p.description || '')
      setChannels([])
      setAuthorized(false)
      setSaved(false)
      setState('preview')
    } catch {
      setError('Erro de conexao. Verifique sua internet e tente novamente.')
      setState('error')
    }
  }

  // ─── Save handler ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!product || !authorized) return
    setSaving(true)

    try {
      const res = await fetch('/api/listings/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price) || 0,
          images: product.images,
          brand: product.brand,
          condition: product.condition,
          sku: product.sku,
          ean: product.ean,
          category: product.category,
          attributes: product.attributes,
          source_marketplace: product.source_marketplace,
          source_url: product.source_url,
          target_channels: channels,
          status: 'draft',
        }),
      })

      if (res.ok) {
        setSaved(true)
      }
    } catch {
      // silent fail — user can retry
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setState('initial')
    setUrl('')
    setProduct(null)
    setError('')
    setSaved(false)
  }

  function toggleChannel(ch: string) {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  // ─── Marketplace badge ─────────────────────────────────────────────────────

  function MarketplaceBadge({ mkt, size = 'sm' }: { mkt: string; size?: 'sm' | 'md' }) {
    const c = MKT_COLORS[mkt] || MKT_COLORS.outro
    const cls = size === 'md'
      ? `px-3 py-1.5 text-sm rounded-lg`
      : `px-2 py-0.5 text-xs rounded-md`
    return (
      <span className={`inline-flex items-center font-medium ${c.bg} ${c.text} ${cls}`}>
        {c.label}
      </span>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Copiador de Anuncios"
        description="Copie anuncios de qualquer marketplace e adapte para seus canais."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Copiador' },
        ]}
      />

      {/* Legal disclaimer — mandatory, non-dismissible */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-300/90 leading-relaxed">
          <strong className="text-yellow-400">Aviso importante:</strong> O copiador de anuncios e uma
          ferramenta de auxilio para agilizar o cadastro de produtos. Utilize apenas para copiar anuncios
          de produtos que voce possui autorizacao para comercializar. Respeite os direitos autorais, marcas
          registradas e propriedade intelectual de terceiros. O Foguetim ERP nao se responsabiliza pelo
          uso indevido desta ferramenta.
        </p>
      </div>

      {/* ── Initial state ─────────────────────────────────────────────────────── */}
      {state === 'initial' && (
        <div className="space-y-6">
          {/* URL input */}
          <div className="glass-card p-6 md:p-8 space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Cole o link do anuncio
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExtract()}
                placeholder="https://www.mercadolivre.com.br/produto-exemplo..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                           text-white placeholder-slate-500 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/30
                           transition-all"
              />
              <button
                onClick={handleExtract}
                disabled={!url.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                           text-white font-semibold text-sm
                           hover:shadow-neon-purple transition-all duration-200
                           hover:scale-[1.02] active:scale-[0.98]
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                           flex items-center gap-2 justify-center shrink-0"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
            </div>
          </div>

          {/* Supported marketplaces */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Marketplaces suportados</h3>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_MARKETPLACES.map(m => {
                const c = MKT_COLORS[m.key]
                return (
                  <span
                    key={m.key}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${c.bg} ${c.text}`}
                  >
                    <span>{m.emoji}</span>
                    {c.label}
                  </span>
                )
              })}
            </div>
            <p className="text-xs text-slate-500">
              O Foguetim extrai titulo, descricao, imagens, preco e atributos automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────────────── */}
      {state === 'loading' && (
        <div className="glass-card p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
          <Image
            src="/mascot/timm-thinking.png"
            alt="Timm pensando"
            width={64}
            height={64}
            className="animate-pulse"
          />
          <div className="space-y-2">
            <p className="text-white font-medium">Timm esta analisando o anuncio...</p>
            <p className="text-sm text-slate-400">Isso pode levar alguns segundos.</p>
          </div>

          {/* Shimmer skeleton */}
          <div className="w-full max-w-lg space-y-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 rounded bg-white/[0.04] animate-pulse" style={{ width: `${90 - i * 15}%` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────────── */}
      {state === 'error' && (
        <div className="glass-card p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
          <Image
            src="/mascot/timm-search.png"
            alt="Timm procurando"
            width={64}
            height={64}
          />
          <div className="space-y-2">
            <p className="text-white font-medium">Nao consegui extrair dados deste link.</p>
            <p className="text-sm text-slate-400">
              {error || 'Tente outro link ou verifique se o anuncio esta ativo.'}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                       text-white text-sm font-semibold hover:shadow-neon-purple transition-all
                       hover:scale-[1.02] active:scale-[0.98]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Preview state ─────────────────────────────────────────────────────── */}
      {state === 'preview' && product && (
        <div className="space-y-6">
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

          {/* Origin badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Origem:</span>
            <MarketplaceBadge mkt={product.source_marketplace} size="md" />
          </div>

          {/* Image gallery */}
          {product.images.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-medium text-slate-300">Imagens ({product.images.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {product.images.slice(0, 6).map((img, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-white/[0.03] border border-white/[0.06] overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Imagem ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {product.images.length > 6 && (
                <p className="text-xs text-slate-500">+{product.images.length - 6} imagens adicionais</p>
              )}
            </div>
          )}

          {/* Editable fields */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white">Dados do produto</h3>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Titulo</label>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                           text-white text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <p className="text-xs text-slate-500">{title.length} caracteres</p>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Preco (R$)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full sm:w-48 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                           text-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Descricao</label>
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  {descExpanded ? 'Recolher' : 'Expandir'}
                  {descExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={descExpanded ? 12 : 4}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                           text-white text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
          </div>

          {/* Read-only fields */}
          {(product.brand || product.condition || product.sku || product.ean || product.category) && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Informacoes adicionais</h3>
              <div className="flex flex-wrap gap-2">
                {product.brand && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    Marca: {product.brand}
                  </span>
                )}
                {product.condition && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    Condicao: {product.condition}
                  </span>
                )}
                {product.sku && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    SKU: {product.sku}
                  </span>
                )}
                {product.ean && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    EAN: {product.ean}
                  </span>
                )}
                {product.category && (
                  <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300">
                    Categoria: {product.category}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Attributes */}
          {Object.keys(product.attributes).length > 0 && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white">Atributos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(product.attributes).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <span className="text-slate-500 shrink-0">{key}:</span>
                    <span className="text-slate-300 truncate">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Channel selection */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Canais de destino</h3>
            <div className="flex flex-wrap gap-3">
              {DESTINATION_CHANNELS.map(ch => {
                const c = MKT_COLORS[ch]
                const selected = channels.includes(ch)
                return (
                  <label
                    key={ch}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all
                      ${selected
                        ? `${c.bg} border-current ${c.text}`
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleChannel(ch)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{c.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Authorization checkbox + actions */}
          <div className="glass-card p-6 space-y-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={authorized}
                onChange={e => setAuthorized(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-white/[0.03]
                           text-primary-500 focus:ring-primary-500/40 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors">
                Declaro que tenho autorizacao para comercializar este produto e que o uso desta
                ferramenta e de minha total responsabilidade.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={!authorized || saving || saved}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                           text-white font-semibold text-sm
                           hover:shadow-neon-purple transition-all duration-200
                           hover:scale-[1.02] active:scale-[0.98]
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                           flex items-center gap-2 justify-center"
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
                    <Package className="w-4 h-4" />
                    Salvar como rascunho
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]
                           text-slate-300 text-sm font-medium
                           hover:bg-white/[0.04] transition-all
                           flex items-center gap-2 justify-center"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
