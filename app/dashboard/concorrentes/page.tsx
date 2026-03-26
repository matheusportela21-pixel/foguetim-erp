'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Search, ExternalLink, Truck, Shield, ShieldAlert, ShieldOff,
  AlertTriangle, AlertCircle, CheckCircle2, Users, Tag,
  Loader2, Link2, RefreshCw, Star, Activity, BarChart3, TrendingUp,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SellerListing {
  item_id:      string
  title:        string
  price:        number
  sold_quantity:number
  thumbnail:    string
  free_shipping:boolean
  listing_type: string
  condition:    string
  url:          string
}

interface SellerInfo {
  id:                  number
  nickname:            string
  level:               string
  transactions:        number
  claims_rate:         number
  power_seller_status: string | null
}

interface HealthItem {
  item_id:   string
  title:     string
  price:     number
  thumbnail: string
  url:       string
  health:    number | null
  status:    string
  gauge:     'unhealthy' | 'warning'
}

// ─── Display maps ──────────────────────────────────────────────────────────────

const REP_LEVEL: Record<string, { label: string; cls: string }> = {
  green:       { label: 'Verde',    cls: 'bg-green-400/10  text-green-400  ring-1 ring-green-400/20'  },
  light_green: { label: 'Amarelo',  cls: 'bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-400/20' },
  yellow:      { label: 'Laranja',  cls: 'bg-orange-400/10 text-orange-400 ring-1 ring-orange-400/20' },
  orange:      { label: 'Vermelho', cls: 'bg-red-400/10    text-red-400    ring-1 ring-red-400/20'    },
  red:         { label: 'Crítico',  cls: 'bg-red-600/10    text-red-500    ring-1 ring-red-600/20'    },
  unknown:     { label: '—',        cls: 'bg-slate-700/30  text-slate-500'                            },
}

const LISTING_TYPE: Record<string, { label: string; cls: string }> = {
  gold_pro:     { label: 'Premium',   cls: 'bg-amber-400/10  text-amber-300  ring-1 ring-amber-400/20'  },
  gold_special: { label: 'Clássico+', cls: 'bg-yellow-400/10 text-yellow-300 ring-1 ring-yellow-400/20' },
  gold:         { label: 'Clássico',  cls: 'bg-slate-400/10  text-slate-400  ring-1 ring-slate-400/20'  },
}

const CONDITION_LABEL: Record<string, string> = { new: 'Novo', used: 'Usado' }

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum = (v: number) => v.toLocaleString('pt-BR')
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

function getListing(type: string) {
  return LISTING_TYPE[type] ?? { label: type, cls: 'bg-slate-700/30 text-slate-400' }
}
function getLevel(level: string) {
  return REP_LEVEL[level] ?? REP_LEVEL['unknown']
}
function getHealthAction(gauge: 'unhealthy' | 'warning'): string {
  if (gauge === 'unhealthy')
    return 'Anúncio em risco de pausa. Revise título, fotos e informações para evitar suspensão.'
  return 'Anúncio com alerta. Melhore a qualidade do título e adicione mais fotos para aumentar conversão.'
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function NotConnectedCard() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
        <Link2 className="w-7 h-7 text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 text-lg font-semibold mb-1">Mercado Livre não conectado</p>
        <p className="text-slate-500 text-sm max-w-sm">
          Conecte sua conta do Mercado Livre em Integrações para usar o Monitoramento Competitivo.
        </p>
      </div>
      <a
        href="/dashboard/integracoes"
        className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
      >
        Ir para Integrações
      </a>
    </div>
  )
}

// ─── Tab 1: Espionar Concorrente ───────────────────────────────────────────────

function EspiarTab() {
  const [nickname,     setNickname]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [listings,     setListings]     = useState<SellerListing[]>([])
  const [seller,       setSeller]       = useState<SellerInfo | null>(null)
  const [hasSearched,  setHasSearched]  = useState(false)

  const handleSearch = useCallback(async (nick: string) => {
    const n = nick.trim()
    if (!n) return
    setLoading(true)
    setError(null)
    setNotConnected(false)
    setHasSearched(true)
    setListings([])
    setSeller(null)
    try {
      const res  = await fetch(`/api/mercadolivre/concorrentes?nickname=${encodeURIComponent(n)}`)
      const data = await res.json() as {
        error?: string; code?: string
        listings?: SellerListing[]; seller?: SellerInfo | null
      }
      if (data.code === 'NOT_CONNECTED') { setNotConnected(true); return }
      if (data.error) { setError(data.error); return }
      setListings(data.listings ?? [])
      setSeller(data.seller ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  if (notConnected) return <NotConnectedCard />

  return (
    <div className="space-y-5">

      {/* ── Search card ───────────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-5">
        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
          Nickname do Concorrente
        </label>
        <form
          onSubmit={e => { e.preventDefault(); handleSearch(nickname) }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="ex: VENDEDOR123"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 focus:border-purple-600/40 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!nickname.trim() || loading}
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Buscando…' : 'Espiar'}
          </button>
        </form>
        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
          Encontre o nickname na URL do perfil:{' '}
          <span className="text-slate-500 font-mono">
            mercadolivre.com.br/perfil/<span className="text-purple-400">NICKNAME</span>
          </span>
        </p>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* ── Empty initial state ───────────────────────────────────────────── */}
      {!loading && !hasSearched && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
            <Users className="w-7 h-7 text-purple-500/60" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-white mb-1.5">Espione a concorrência</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
              Digite o nickname de um vendedor do Mercado Livre para ver todos os anúncios ativos, preços e reputação.
            </p>
          </div>
        </div>
      )}

      {/* ── No results ────────────────────────────────────────────────────── */}
      {!loading && hasSearched && !error && listings.length === 0 && (
        <div className="glass-card rounded-xl p-16 flex flex-col items-center gap-3">
          <Users className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-semibold">Nenhum anúncio encontrado</p>
          <p className="text-slate-600 text-sm">Verifique se o nickname está correto</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-3 gap-4">

          {/* Seller reputation card */}
          <div className="col-span-1">
            {seller && (
              <div className="glass-card rounded-xl p-4 space-y-4 sticky top-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/15 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{seller.nickname}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getLevel(seller.level).cls}`}>
                      {getLevel(seller.level).label}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Transações</span>
                    <span className="text-slate-200 font-bold tabular-nums">{fmtNum(seller.transactions)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Taxa de Reclamações</span>
                    <span className={`font-bold tabular-nums ${seller.claims_rate > 0.02 ? 'text-red-400' : 'text-green-400'}`}>
                      {fmtPct(seller.claims_rate)}
                    </span>
                  </div>
                  {seller.power_seller_status && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>MercadoLíder</span>
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <Star className="w-3 h-3" />
                        {seller.power_seller_status}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Anúncios visíveis</span>
                    <span className="text-slate-200 font-bold">{listings.length}</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-white/[0.04]">
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Dados de reputação extraídos via API pública do Mercado Livre.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Listings table */}
          <div className="col-span-2">
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Anúncios Ativos</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">{listings.length} resultados · ordenados por relevância</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="px-4 py-2.5 text-left   text-[10px] font-bold text-slate-600 uppercase tracking-wider">Produto</th>
                      <th className="px-4 py-2.5 text-right  text-[10px] font-bold text-slate-600 uppercase tracking-wider">Preço</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Frete</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-2.5 text-right  text-[10px] font-bold text-slate-600 uppercase tracking-wider">Vendas</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map(item => {
                      const listing = getListing(item.listing_type)
                      return (
                        <tr
                          key={item.item_id}
                          className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5 max-w-[220px]">
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
                                  onError={e => { (e.currentTarget as HTMLImageElement).src = '' }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                                  <Tag className="w-4 h-4 text-slate-600" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs text-slate-200 line-clamp-2 leading-tight" title={item.title}>
                                  {item.title}
                                </p>
                                <span className="text-[9px] text-slate-600">
                                  {CONDITION_LABEL[item.condition] ?? item.condition}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-white tabular-nums">{fmtBRL(item.price)}</span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            {item.free_shipping
                              ? <Truck className="w-4 h-4 text-green-400 mx-auto" />
                              : <span className="text-slate-600 text-xs">—</span>
                            }
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.cls}`}>
                              {listing.label}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span className="text-xs text-slate-300 font-semibold tabular-nums">
                              {fmtNum(item.sold_quantity)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-dark-700 hover:bg-purple-600/20 text-slate-500 hover:text-purple-400 border border-white/[0.06] hover:border-purple-500/30 transition-all"
                              title="Ver no ML"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Saúde dos Meus Anúncios ────────────────────────────────────────────

function HealthList({ items }: { items: HealthItem[] }) {
  return (
    <div>
      {items.map(item => (
        <div
          key={item.item_id}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
        >
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
              onError={e => { (e.currentTarget as HTMLImageElement).src = '' }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-slate-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-200 font-medium line-clamp-1 mb-0.5" title={item.title}>
              {item.title}
            </p>
            <div className="flex items-center gap-3 mb-0.5">
              <span className={`flex items-center gap-1 text-[10px] font-bold ${item.gauge === 'unhealthy' ? 'text-red-400' : 'text-amber-400'}`}>
                {item.gauge === 'unhealthy'
                  ? <><AlertCircle className="w-3 h-3" /> Em risco</>
                  : <><AlertTriangle className="w-3 h-3" /> Alerta</>
                }
              </span>
              {item.health !== null && (
                <span className="text-[10px] text-slate-600 tabular-nums">
                  Saúde: {(item.health * 100).toFixed(0)}%
                </span>
              )}
              {item.price > 0 && (
                <span className="text-[10px] text-slate-600 tabular-nums">{fmtBRL(item.price)}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              {getHealthAction(item.gauge)}
            </p>
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-purple-600/20 text-slate-500 hover:text-purple-400 border border-white/[0.06] hover:border-purple-500/30 transition-all text-[10px] font-semibold"
          >
            <ExternalLink className="w-3 h-3" />
            Ver no ML
          </a>
        </div>
      ))}
    </div>
  )
}

function SaudeTab() {
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [unhealthy,    setUnhealthy]    = useState<HealthItem[]>([])
  const [warning,      setWarning]      = useState<HealthItem[]>([])
  const [loaded,       setLoaded]       = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotConnected(false)
    setUnhealthy([])
    setWarning([])
    try {
      const res  = await fetch('/api/mercadolivre/concorrentes?health=true')
      const data = await res.json() as {
        error?: string; code?: string
        unhealthy?: HealthItem[]; warning?: HealthItem[]
      }
      if (data.code === 'NOT_CONNECTED') { setNotConnected(true); return }
      if (data.error) { setError(data.error); return }
      setUnhealthy(data.unhealthy ?? [])
      setWarning(data.warning   ?? [])
      setLoaded(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch ao entrar na aba
  useEffect(() => { fetchHealth() }, [fetchHealth])

  if (notConnected) return <NotConnectedCard />

  const total = unhealthy.length + warning.length

  return (
    <div className="space-y-5">

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Saúde dos Anúncios</h3>
              <p className="text-[11px] text-slate-500">
                {loaded
                  ? total === 0
                    ? 'Todos os anúncios estão saudáveis'
                    : `${total} anúncio${total !== 1 ? 's' : ''} precisa${total !== 1 ? 'm' : ''} de atenção`
                  : 'Verificando anúncios…'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 hover:border-purple-500/30 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* ── All healthy ───────────────────────────────────────────────────── */}
      {!loading && loaded && total === 0 && (
        <div className="glass-card rounded-xl p-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-400" />
          </div>
          <div className="text-center">
            <p className="text-green-400 font-bold text-base mb-1">Tudo certo!</p>
            <p className="text-slate-500 text-sm">Nenhum anúncio com problemas de saúde encontrado.</p>
          </div>
        </div>
      )}

      {/* ── Unhealthy section ─────────────────────────────────────────────── */}
      {!loading && unhealthy.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden border border-red-500/15">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2.5 bg-red-500/5">
            <ShieldOff className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-red-300">Anúncios em Risco</h3>
              <p className="text-[10px] text-red-400/70">
                {unhealthy.length} anúncio{unhealthy.length !== 1 ? 's' : ''} · ação imediata necessária
              </p>
            </div>
          </div>
          <HealthList items={unhealthy} />
        </div>
      )}

      {/* ── Warning section ───────────────────────────────────────────────── */}
      {!loading && warning.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden border border-amber-500/15">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2.5 bg-amber-500/5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-300">Anúncios com Alerta</h3>
              <p className="text-[10px] text-amber-400/70">
                {warning.length} anúncio{warning.length !== 1 ? 's' : ''} · recomenda-se otimização
              </p>
            </div>
          </div>
          <HealthList items={warning} />
        </div>
      )}
    </div>
  )
}

// ─── Tab 3: Analise de Precos ─────────────────────────────────────────────────

interface CompetitorEntry {
  seller_nickname: string
  price:           number
  free_shipping:   boolean
  condition:       string
  url:             string
}

interface CompetitorAnalysis {
  item_id:       string
  title:         string
  your_price:    number
  category_id:   string
  thumbnail:     string
  min_price:     number
  max_price:     number
  avg_price:     number
  total_sellers: number
  your_position: number
  status:        'below' | 'average' | 'above'
  competitors:   CompetitorEntry[]
}

function PriceBar({ min, max, avg, yours }: { min: number; max: number; avg: number; yours: number }) {
  const range = max - min || 1
  const avgPct = ((avg - min) / range) * 100
  const yourPct = Math.min(100, Math.max(0, ((yours - min) / range) * 100))

  return (
    <div className="relative h-2.5 bg-white/[0.06] rounded-full overflow-visible mt-1 mb-3">
      {/* Fill from min to max */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/30 via-amber-500/30 to-red-500/30" />

      {/* Average marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-amber-400/60"
        style={{ left: `${avgPct}%` }}
        title={`Media: ${fmtBRL(avg)}`}
      />

      {/* Your price marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-lg shadow-purple-500/40"
        style={{ left: `${yourPct}%`, transform: 'translate(-50%, -50%)' }}
        title={`Seu preco: ${fmtBRL(yours)}`}
      />

      {/* Labels */}
      <div className="absolute -bottom-4 left-0 text-[9px] text-slate-600">{fmtBRL(min)}</div>
      <div className="absolute -bottom-4 right-0 text-[9px] text-slate-600">{fmtBRL(max)}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'below' | 'average' | 'above' }) {
  const cfg = {
    below:   { label: 'Abaixo da media', cls: 'bg-green-400/10 text-green-400 ring-1 ring-green-400/20' },
    average: { label: 'Na media',        cls: 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20' },
    above:   { label: 'Acima da media',  cls: 'bg-red-400/10   text-red-400   ring-1 ring-red-400/20'   },
  }
  const c = cfg[status]
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>
}

function AnaliseTab() {
  // TODO: PlanGate check — this feature requires Almirante+ plan
  const [itemId, setItemId]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const [analysis, setAnalysis]     = useState<CompetitorAnalysis | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async (id: string) => {
    const trimmed = id.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setNotConnected(false)
    setHasSearched(true)
    setAnalysis(null)
    try {
      const res  = await fetch(`/api/mercadolivre/competitors?item_id=${encodeURIComponent(trimmed)}`)
      const data = await res.json() as {
        error?: string; code?: string
        analysis?: CompetitorAnalysis
      }
      if (data.code === 'NOT_CONNECTED') { setNotConnected(true); return }
      if (data.error) { setError(data.error); return }
      setAnalysis(data.analysis ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  if (notConnected) return <NotConnectedCard />

  return (
    <div className="space-y-5">

      {/* ── Search card ──────────────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-5">
        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
          ID do Anuncio (MLB)
        </label>
        <form
          onSubmit={e => { e.preventDefault(); handleSearch(itemId) }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              placeholder="ex: MLB1234567890"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.06] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 focus:border-purple-600/40 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!itemId.trim() || loading}
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Analisando...' : 'Analisar'}
          </button>
        </form>
        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
          Cole o ID do seu anuncio no Mercado Livre para comparar precos com concorrentes na mesma categoria.
        </p>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* ── Empty initial state ──────────────────────────────────────────── */}
      {!loading && !hasSearched && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-white/[0.06] flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-purple-500/60" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-white mb-1.5">Analise de Precos</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
              Cole o ID de um anuncio seu para ver como seu preco se compara com os concorrentes na mesma categoria.
            </p>
          </div>
        </div>
      )}

      {/* ── No results ───────────────────────────────────────────────────── */}
      {!loading && hasSearched && !error && !analysis && (
        <div className="glass-card rounded-xl p-16 flex flex-col items-center gap-3">
          <BarChart3 className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-semibold">Nenhum concorrente encontrado</p>
          <p className="text-slate-600 text-sm">Verifique se o ID do anuncio esta correto</p>
        </div>
      )}

      {/* ── Analysis result ──────────────────────────────────────────────── */}
      {!loading && analysis && (
        <div className="space-y-4">

          {/* Product header card */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start gap-4">
              {analysis.thumbnail && (
                <img
                  src={analysis.thumbnail}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-dark-700 border border-white/[0.06]"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white line-clamp-2 mb-2">{analysis.title}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block">Seu preco</span>
                    <span className="text-lg font-bold text-white tabular-nums">{fmtBRL(analysis.your_price)}</span>
                  </div>
                  <div className="h-8 w-px bg-white/[0.06]" />
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block">Posicao</span>
                    <span className="text-lg font-bold text-purple-400 tabular-nums">
                      {analysis.your_position}o <span className="text-xs text-slate-500 font-normal">de {analysis.total_sellers} vendedores</span>
                    </span>
                  </div>
                  <div className="h-8 w-px bg-white/[0.06]" />
                  <StatusBadge status={analysis.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Price comparison bar */}
          <div className="glass-card rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Comparativo de Precos
            </h4>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Menor</p>
                <p className="text-sm font-bold text-green-400 tabular-nums">{fmtBRL(analysis.min_price)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Media</p>
                <p className="text-sm font-bold text-amber-400 tabular-nums">{fmtBRL(analysis.avg_price)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Maior</p>
                <p className="text-sm font-bold text-red-400 tabular-nums">{fmtBRL(analysis.max_price)}</p>
              </div>
            </div>
            <PriceBar
              min={analysis.min_price}
              max={analysis.max_price}
              avg={analysis.avg_price}
              yours={analysis.your_price}
            />
          </div>

          {/* Competitors table */}
          {analysis.competitors.length > 0 && (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white">Top 5 Concorrentes</h3>
                <p className="text-[10px] text-slate-600 mt-0.5">Ordenados por preco</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="px-4 py-2.5 text-left   text-[10px] font-bold text-slate-600 uppercase tracking-wider">Vendedor</th>
                      <th className="px-4 py-2.5 text-right  text-[10px] font-bold text-slate-600 uppercase tracking-wider">Preco</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Frete Gratis</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Condicao</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.competitors.map((comp, idx) => {
                      const diff = comp.price - analysis.your_price
                      const diffPct = analysis.your_price > 0
                        ? ((diff / analysis.your_price) * 100).toFixed(1)
                        : '0.0'
                      return (
                        <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-200 font-medium">{comp.seller_nickname}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div>
                              <span className="text-sm font-bold text-white tabular-nums">{fmtBRL(comp.price)}</span>
                              <span className={`block text-[10px] tabular-nums ${
                                diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-slate-500'
                              }`}>
                                {diff > 0 ? '+' : ''}{diffPct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {comp.free_shipping
                              ? <Truck className="w-4 h-4 text-green-400 mx-auto" />
                              : <span className="text-slate-600 text-xs">--</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-slate-400">
                              {comp.condition === 'new' ? 'Novo' : comp.condition === 'used' ? 'Usado' : comp.condition}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-dark-700 hover:bg-purple-600/20 text-slate-500 hover:text-purple-400 border border-white/[0.06] hover:border-purple-500/30 transition-all"
                              title="Ver no ML"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MonitoramentoPage() {
  const [activeTab, setActiveTab] = useState<'espiar' | 'saude' | 'analise'>('espiar')

  const tabs = [
    { id: 'espiar'  as const, label: 'Espionar Concorrente',    icon: Users    },
    { id: 'analise' as const, label: 'Analise de Precos',       icon: BarChart3 },
    { id: 'saude'   as const, label: 'Saude dos Anuncios',      icon: Shield   },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="Monitoramento Competitivo"
        description="Analise concorrentes e monitore a saude dos seus anuncios"
      />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Tab bar ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 bg-dark-800/60 rounded-xl border border-white/[0.04] w-fit">
          {tabs.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  active
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────────── */}
        {activeTab === 'espiar' && <EspiarTab />}
        {activeTab === 'analise' && <AnaliseTab />}
        {activeTab === 'saude' && <SaudeTab />}
      </div>
    </div>
  )
}
