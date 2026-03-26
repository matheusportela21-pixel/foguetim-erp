'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import OtpConfirmation from '@/components/security/OtpConfirmation'
import {
  CheckCircle, RefreshCw, Zap, Truck, ChevronDown, ChevronUp,
  Eye, EyeOff, ExternalLink, Copy, AlertCircle, X, Globe, HelpCircle,
  Loader2, CheckCircle2, Star, Plus, Trash2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiStatus = 'nao_configurado' | 'credenciais_salvas' | 'conectado' | 'token_expirado'

interface MktEntry {
  id: string
  name: string
  logo: string
  color: string
  connected: boolean
  products: number
  lastSync: string | null
  share?: string
  soon?: boolean
  apiStatus: ApiStatus
  clientId: string
  clientSecret: string
  accessToken: string
  webhookUrl: string
  guideUrl: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const API_STATUS_META: Record<ApiStatus, { label: string; cls: string; dot: string }> = {
  nao_configurado:    { label: 'Não configurado',    cls: 'text-slate-500',  dot: 'bg-slate-600'  },
  credenciais_salvas: { label: 'Credenciais salvas', cls: 'text-amber-400',  dot: 'bg-amber-400'  },
  conectado:          { label: 'Conectado',          cls: 'text-green-400',  dot: 'bg-green-400'  },
  token_expirado:     { label: 'Token expirado',     cls: 'text-red-400',    dot: 'bg-red-400'    },
}

const INIT_MKT: MktEntry[] = [
  { id: 'ml',      name: 'Mercado Livre',    logo: '🟡', color: 'border-amber-500/30 bg-amber-500/5',    connected: false, products: 0, lastSync: null, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'shopee',  name: 'Shopee',           logo: '🟠', color: 'border-orange-500/30 bg-orange-500/5',  connected: false, products: 0, lastSync: null, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'magalu',  name: 'Magalu',           logo: '🔷', color: 'border-blue-500/30 bg-blue-500/5',      connected: false, products: 0, lastSync: null, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: 'https://universo.magalu.com' },
  { id: 'tiktok',  name: 'TikTok Shop',      logo: '⬛', color: 'border-slate-500/30 bg-slate-500/5',    connected: false, products: 0, lastSync: null, soon: true, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'ame',     name: 'Americanas',       logo: '🔴', color: 'border-red-500/30 bg-red-500/5',        connected: false, products: 0, lastSync: null, soon: true, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'cb',      name: 'Casas Bahia',      logo: '🟢', color: 'border-green-500/30 bg-green-500/5',    connected: false, products: 0, lastSync: null, soon: true, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'ns',      name: 'Nuvemshop',        logo: '☁️', color: 'border-indigo-500/30 bg-indigo-500/5',  connected: false, products: 0, lastSync: null, soon: true, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'tray',    name: 'Tray',             logo: '🟤', color: 'border-yellow-800/30 bg-yellow-900/5',  connected: false, products: 0, lastSync: null, soon: true, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'li',      name: 'Loja Integrada',   logo: '🟣', color: 'border-purple-500/30 bg-purple-500/5',  connected: false, products: 0, lastSync: null, soon: true, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
  { id: 'ali',     name: 'AliExpress',       logo: '🟥', color: 'border-rose-500/30 bg-rose-500/5',      connected: false, products: 0, lastSync: null, soon: true, apiStatus: 'nao_configurado', clientId: '', clientSecret: '', accessToken: '', webhookUrl: '', guideUrl: '#' },
]

const fretes = [
  { name: 'Melhor Envio', desc: 'Multi-transportadora', logo: '📦', connected: false, soon: true },
  { name: 'Correios',     desc: 'PAC, SEDEX e mais',    logo: '🏣', connected: false, soon: true },
  { name: 'Loggi',        desc: 'Entregas expressas',   logo: '🚀', connected: false, soon: true },
  { name: 'Total Express',desc: 'Fretes regionais',     logo: '🚛', connected: false, soon: true },
  { name: 'Jadlog',       desc: 'Encomendas B2B',       logo: '📮', connected: false, soon: true },
  { name: 'Kangu',        desc: 'Coleta em pontos',     logo: '📍', connected: false, soon: true },
]

const erps = [
  { name: 'Tiny',      desc: 'Gestão de e-commerce',   logo: '🔵' },
  { name: 'Omie',      desc: 'Gestão financeira',      logo: '🟣' },
  { name: 'Yampi',     desc: 'Plataforma de vendas',   logo: '🟡' },
  { name: 'Nuvemshop', desc: 'Loja virtual',           logo: '🔷' },
  { name: 'Tray',      desc: 'Plataforma de vendas',   logo: '🟤' },
  { name: 'Loja Integrada', desc: 'Hub multicanal',    logo: '🟣' },
]

const WEBHOOK_EVENTS = [
  'Novo pedido recebido',
  'Mudança de status do pedido',
  'Pergunta recebida (SAC)',
  'Avaliação publicada',
  'Estoque abaixo do mínimo',
  'Produto aprovado/reprovado',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 font-mono"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

function CopyInput({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div className="relative">
      <input readOnly value={value}
        className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-dark-800 border border-white/[0.04] text-slate-500 font-mono cursor-default" />
      {value && (
        <button onClick={copy}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
          <Copy className={`w-3.5 h-3.5 ${copied ? 'text-green-400' : ''}`} />
        </button>
      )}
    </div>
  )
}

// ─── Authorize Modal ──────────────────────────────────────────────────────────

function AuthorizeModal({ mkt, onClose }: { mkt: MktEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{mkt.logo}</span>
            <h3 className="font-bold text-white text-sm">Autorizar {mkt.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            A integração via API será disponibilizada quando o sistema estiver em servidor de produção.
            Suas credenciais foram salvas e serão ativadas automaticamente.
          </p>
        </div>

        <div className="space-y-3 text-xs text-slate-400">
          <p>O fluxo de autorização funciona da seguinte forma:</p>
          <ol className="space-y-1.5 list-decimal list-inside text-slate-500">
            <li>Você será redirecionado para {mkt.name} para fazer login</li>
            <li>Autorize o Foguetim ERP a acessar sua conta</li>
            <li>O Access Token será gerado automaticamente</li>
            <li>A sincronização de produtos e pedidos iniciará em minutos</li>
          </ol>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-dark-700 hover:bg-white/[0.06] border border-white/[0.06] transition-all">
            Fechar
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
            <ExternalLink className="w-3.5 h-3.5" /> Aguardando produção
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Marketplace Card ─────────────────────────────────────────────────────────

function MktCard({
  mk,
  onUpdate,
  onSync,
  syncing,
}: {
  mk: MktEntry
  onUpdate: (id: string, patch: Partial<MktEntry>) => void
  onSync: (id: string) => void
  syncing: string | null
}) {
  const [showApi, setShowApi] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [enabledWebhooks, setEnabledWebhooks] = useState<string[]>([])
  const meta = API_STATUS_META[mk.apiStatus]

  const saveCredentials = () => {
    if (mk.clientId || mk.clientSecret) {
      onUpdate(mk.id, { apiStatus: 'credenciais_salvas' })
    }
  }

  return (
    <div className={`dash-card rounded-2xl border ${mk.color} overflow-hidden`}>
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl shrink-0">
              {mk.logo}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-white text-sm">{mk.name}</p>
                {mk.soon && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-900/50 text-purple-400">Breve</span>}
              </div>
              {mk.connected ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] text-green-400">{mk.products} produtos · {mk.lastSync}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <span className={`text-[10px] ${meta.cls}`}>{meta.label}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 shrink-0 items-center">
            {mk.connected && (
              <button onClick={() => onSync(mk.id)}
                title="Sincronizar agora"
                className={`p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 transition-all ${syncing === mk.id ? 'animate-spin text-purple-400' : ''}`}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowApi(s => !s)}
              title="Configuração de API"
              className={`p-1.5 rounded-lg border border-white/[0.06] transition-all ${showApi ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-slate-500 hover:text-slate-200'}`}>
              <Zap className="w-3.5 h-3.5" />
            </button>
            {!mk.soon && (
              <button onClick={() => onUpdate(mk.id, { connected: !mk.connected })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mk.connected
                    ? 'bg-dark-700 border border-white/[0.06] text-slate-400 hover:text-red-400'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}>
                {mk.connected ? 'Desconectar' : 'Conectar'}
              </button>
            )}
          </div>
        </div>

        {/* Stats when connected */}
        {mk.connected && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Produtos',     val: mk.products },
              { label: 'Pedidos/dia',  val: mk.id === 'ml' ? 28 : 19 },
              { label: 'Participação', val: mk.share ?? '—' },
            ].map(s => (
              <div key={s.label} className="bg-dark-700 rounded-lg p-2">
                <p className="text-[9px] text-slate-600">{s.label}</p>
                <p className="text-xs font-bold text-white">{s.val}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Config panel */}
      {showApi && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-3 bg-dark-800/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Configuração de API</p>
            <a href={mk.guideUrl}
              className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              <HelpCircle className="w-3 h-3" /> Como obter credenciais
            </a>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Client ID</label>
            <input
              value={mk.clientId}
              onChange={e => onUpdate(mk.id, { clientId: e.target.value })}
              placeholder="Ex: APP-1234567890"
              className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 font-mono"
            />
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Client Secret</label>
            <SecretInput
              value={mk.clientSecret}
              onChange={v => onUpdate(mk.id, { clientSecret: v })}
              placeholder="••••••••••••••••••••"
            />
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Access Token
              <span className="ml-2 normal-case font-normal text-slate-700">(preenchido automaticamente após autorizar)</span>
            </label>
            <CopyInput value={mk.accessToken} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveCredentials}
              disabled={!mk.clientId && !mk.clientSecret}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-dark-700 border border-white/[0.06] hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              Salvar credenciais
            </button>
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Autorizar
            </button>
          </div>

          {/* Webhooks toggle */}
          <div>
            <button
              onClick={() => setShowWebhooks(s => !s)}
              className="flex items-center gap-2 w-full text-left py-2 border-t border-white/[0.04]">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex-1">Webhooks</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-400">Avançado — Em Breve</span>
              {showWebhooks ? <ChevronUp className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
            </button>

            {showWebhooks && (
              <div className="space-y-3 pt-1 opacity-60 pointer-events-none select-none">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">URL do Webhook</label>
                  <input
                    value={mk.webhookUrl}
                    readOnly
                    placeholder="https://seusite.com.br/webhook/foguetim"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-dark-700 border border-white/[0.06] text-slate-500 placeholder:text-slate-600 font-mono" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Eventos</p>
                  <div className="space-y-1.5">
                    {WEBHOOK_EVENTS.map(ev => (
                      <label key={ev} className="flex items-center gap-2 text-xs text-slate-400 cursor-not-allowed">
                        <input type="checkbox"
                          checked={enabledWebhooks.includes(ev)}
                          readOnly
                          className="rounded border-slate-600 accent-purple-500" />
                        {ev}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAuthModal && <AuthorizeModal mkt={mk} onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface ShopeeConnectionInfo {
  id:            string
  shop_id:       number
  shop_name:     string
  account_label: string | null
  is_primary:    boolean
  expires_at:    string
  connected:     boolean
}

interface MagaluConnectionInfo {
  id:            string
  seller_id:     string
  seller_name:   string
  account_label: string | null
  is_primary:    boolean
  expires_at:    string
  connected:     boolean
}

interface MLStatus {
  connected:   boolean
  nickname?:   string
  ml_user_id?: number
}

interface MLConnectionInfo {
  id:            string
  ml_user_id:    number
  ml_nickname:   string
  account_label: string | null
  is_primary:    boolean
  expires_at:    string
  connected:     boolean
}

function IntegracoesContent() {
  const searchParams = useSearchParams()
  const [mks, setMks]         = useState<MktEntry[]>(INIT_MKT)
  const [fts, setFts]         = useState(fretes)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [mlStatus, setMlStatus]         = useState<MLStatus | null>(null)
  const [mlConnections, setMlConnections] = useState<MLConnectionInfo[]>([])
  const [mlLoading, setMlLoading]       = useState(true)
  const [mlDisconnecting, setMlDisconnecting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [otpDisconnectId, setOtpDisconnectId] = useState<string | null>(null)

  // Shopee state
  const [shopeeConnections, setShopeeConnections] = useState<ShopeeConnectionInfo[]>([])
  const [shopeeLoading, setShopeeLoading]         = useState(true)
  const [shopeeDisconnecting, setShopeeDisconnecting] = useState<string | null>(null)

  // Magalu state
  const [magaluConnections, setMagaluConnections] = useState<MagaluConnectionInfo[]>([])
  const [magaluLoading, setMagaluLoading]         = useState(true)
  const [magaluDisconnecting, setMagaluDisconnecting] = useState<string | null>(null)

  // Handle ?connected=true or ?ml_error=... from OAuth redirect
  useEffect(() => {
    const connected        = searchParams.get('connected')
    const mlError          = searchParams.get('ml_error')
    const shopeeConnected  = searchParams.get('shopee_connected')
    const shopeeError      = searchParams.get('shopee_error')

    const clearCache = () => { try { sessionStorage.removeItem('connected_marketplaces_cache') } catch { /* ignore */ } }

    if (connected === 'true') {
      const nickname = searchParams.get('nickname') ?? ''
      setToast({ type: 'success', msg: `Mercado Livre conectado${nickname ? ` como ${nickname}` : ''}!` })
      clearCache()
      window.history.replaceState({}, '', '/dashboard/integracoes')
    } else if (mlError) {
      setToast({ type: 'error', msg: `Erro ao conectar ML: ${decodeURIComponent(mlError)}` })
      window.history.replaceState({}, '', '/dashboard/integracoes')
    } else if (shopeeConnected === 'true') {
      const shop = searchParams.get('shop') ?? ''
      setToast({ type: 'success', msg: `Shopee conectada${shop ? ` — ${shop}` : ''}!` })
      clearCache()
      window.history.replaceState({}, '', '/dashboard/integracoes')
    } else if (shopeeError) {
      setToast({ type: 'error', msg: `Erro ao conectar Shopee: ${decodeURIComponent(shopeeError)}` })
      window.history.replaceState({}, '', '/dashboard/integracoes')
    } else if (searchParams.get('magalu_connected') === 'true') {
      setToast({ type: 'success', msg: 'Magalu conectado com sucesso!' })
      clearCache()
      window.history.replaceState({}, '', '/dashboard/integracoes')
    } else if (searchParams.get('magalu_error')) {
      setToast({ type: 'error', msg: `Erro ao conectar Magalu: ${decodeURIComponent(searchParams.get('magalu_error')!)}` })
      window.history.replaceState({}, '', '/dashboard/integracoes')
    }
  }, [searchParams])

  // Auto-dismiss toast after 5s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // Load real ML connection status on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/mercadolivre/status').then(r => r.json()),
      fetch('/api/mercadolivre/connections').then(r => r.json()),
    ])
      .then(([status, connsData]: [MLStatus, { connections?: MLConnectionInfo[] }]) => {
        setMlStatus(status)
        setMlConnections(connsData.connections ?? [])
        if (status.connected) {
          setMks(prev => prev.map(m =>
            m.id === 'ml'
              ? { ...m, connected: true, apiStatus: 'conectado' }
              : m
          ))
        }
      })
      .catch(() => setMlStatus({ connected: false }))
      .finally(() => setMlLoading(false))
  }, [])

  // Load Shopee connection status
  useEffect(() => {
    fetch('/api/shopee/status')
      .then(r => r.json())
      .then((data: { connected: boolean; connections?: ShopeeConnectionInfo[] }) => {
        setShopeeConnections(data.connections ?? [])
      })
      .catch(() => {})
      .finally(() => setShopeeLoading(false))
  }, [])

  // Load Magalu connection status
  useEffect(() => {
    fetch('/api/magalu/status')
      .then(r => r.json())
      .then((data: { connected: boolean; connections?: MagaluConnectionInfo[] }) => {
        setMagaluConnections(data.connections ?? [])
        if (data.connected) {
          setMks(prev => prev.map(m =>
            m.id === 'magalu' ? { ...m, connected: true, apiStatus: 'conectado' } : m
          ))
        }
      })
      .catch(() => {})
      .finally(() => setMagaluLoading(false))
  }, [])

  function clearMarketplaceCache() {
    try { sessionStorage.removeItem('connected_marketplaces_cache') } catch { /* ignore */ }
  }

  async function disconnectShopeeAccount(connectionId: string) {
    setShopeeDisconnecting(connectionId)
    try {
      await fetch(`/api/shopee/connections?id=${connectionId}`, { method: 'DELETE' })
      const remaining = shopeeConnections.filter(c => c.id !== connectionId)
      setShopeeConnections(remaining)
      clearMarketplaceCache()
      setToast({ type: 'success', msg: 'Loja Shopee desconectada com sucesso.' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao desconectar loja Shopee.' })
    } finally {
      setShopeeDisconnecting(null)
    }
  }

  async function disconnectMagaluAccount(connectionId: string) {
    setMagaluDisconnecting(connectionId)
    try {
      await fetch(`/api/magalu/connections?id=${connectionId}`, { method: 'DELETE' })
      const remaining = magaluConnections.filter(c => c.id !== connectionId)
      setMagaluConnections(remaining)
      if (remaining.length === 0) {
        setMks(prev => prev.map(m =>
          m.id === 'magalu' ? { ...m, connected: false, apiStatus: 'nao_configurado' } : m
        ))
      }
      clearMarketplaceCache()
      setToast({ type: 'success', msg: 'Conta Magalu desconectada com sucesso.' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao desconectar conta Magalu.' })
    } finally {
      setMagaluDisconnecting(null)
    }
  }

  async function disconnectMLAccount(connectionId: string) {
    setMlDisconnecting(connectionId)
    try {
      await fetch(`/api/mercadolivre/connections?id=${connectionId}`, { method: 'DELETE' })
      const remaining = mlConnections.filter(c => c.id !== connectionId)
      setMlConnections(remaining)
      if (remaining.length === 0) {
        setMlStatus({ connected: false })
        setMks(prev => prev.map(m =>
          m.id === 'ml' ? { ...m, connected: false, apiStatus: 'nao_configurado' } : m
        ))
      }
      clearMarketplaceCache()
      setToast({ type: 'success', msg: 'Conta desconectada com sucesso.' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao desconectar conta.' })
    } finally {
      setMlDisconnecting(null)
    }
  }

  async function setPrimary(connectionId: string) {
    await fetch(`/api/mercadolivre/connections?id=${connectionId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ set_primary: true }),
    })
    setMlConnections(prev => prev.map(c => ({ ...c, is_primary: c.id === connectionId })))
  }

  function sync(id: string) {
    if (id === 'ml') {
      // Real sync: refresh token + fetch orders/products
      setSyncing(id)
      fetch('/api/mercadolivre/refresh', { method: 'POST' })
        .finally(() => setSyncing(null))
    } else {
      setSyncing(id)
      setTimeout(() => setSyncing(null), 2000)
    }
  }

  function updateMk(id: string, patch: Partial<MktEntry>) {
    setMks(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  function toggleFt(name: string) {
    setFts(prev => prev.map(f => f.name === name ? { ...f, connected: !f.connected } : f))
  }

  const connectedCount = mks.filter(m => m.connected).length + (shopeeConnections.length > 0 ? 1 : 0) + (magaluConnections.length > 0 ? 1 : 0)

  return (
    <div>
      <PageHeader title="Integrações" description="Conecte seus canais de venda e ferramentas" />

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all ${
          toast.type === 'success'
            ? 'bg-green-900/90 border-green-500/30 text-green-300'
            : 'bg-red-900/90 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 text-white/40 hover:text-white/80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-8">

        {/* ── Marketplaces ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Marketplaces</h3>
              <p className="text-xs text-slate-600 mt-0.5">Conecte suas lojas e configure as APIs para sincronização automática</p>
            </div>
            <span className="text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full font-semibold">
              {connectedCount}/{mks.length} conectados
            </span>
          </div>

          {/* ML — active integration */}
          <div className="mb-4">
            {mks.filter(mk => mk.id === 'ml').map(mk => {
              if (mk.id === 'ml') {
                // ML card with multi-account support
                return (
                  <div key="ml" className={`dash-card rounded-2xl border border-l-4 border-l-yellow-500 ${mk.color} overflow-hidden col-span-full md:col-span-2 xl:col-span-3`}>
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl shrink-0">
                            🟡
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">Mercado Livre</p>
                            {mlLoading ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                                <span className="text-[10px] text-slate-600">Verificando...</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                {mlConnections.length === 0
                                  ? 'Não conectado'
                                  : `${mlConnections.length} conta${mlConnections.length > 1 ? 's' : ''} conectada${mlConnections.length > 1 ? 's' : ''}`
                                }
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {mlStatus?.connected && (
                            <button onClick={() => sync('ml')}
                              title="Sincronizar agora"
                              className={`p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 transition-all ${syncing === 'ml' ? 'animate-spin text-purple-400' : ''}`}>
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a href="/api/mercadolivre/auth"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all">
                            <Plus className="w-3 h-3" />
                            {mlConnections.length === 0 ? 'Conectar' : 'Adicionar conta'}
                          </a>
                        </div>
                      </div>

                      {/* Connected accounts list */}
                      {!mlLoading && mlConnections.length > 0 && (
                        <div className="space-y-2">
                          {mlConnections.map(conn => (
                            <div key={conn.id}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                                conn.is_primary
                                  ? 'border-amber-500/30 bg-amber-500/5'
                                  : 'border-white/[0.04] bg-white/[0.02]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                  <span className="text-sm">🟡</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-bold text-white truncate">
                                      {conn.account_label ?? conn.ml_nickname}
                                    </p>
                                    {conn.is_primary && (
                                      <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
                                        <Star className="w-2.5 h-2.5" /> Principal
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-600 font-mono">{conn.ml_nickname}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {!conn.is_primary && (
                                  <button
                                    onClick={() => setPrimary(conn.id)}
                                    title="Definir como conta principal"
                                    className="p-1.5 text-slate-600 hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-500/10"
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setOtpDisconnectId(conn.id)}
                                  disabled={mlDisconnecting === conn.id}
                                  title="Desconectar esta conta"
                                  className="p-1.5 text-slate-600 hover:text-red-400 disabled:opacity-50 transition-colors rounded-lg hover:bg-red-500/10"
                                >
                                  {mlDisconnecting === conn.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              return null
            })}
          </div>

          {/* Shopee — active integration */}
          <div className="mb-4">
            <div className="dash-card rounded-2xl border border-l-4 border-l-orange-500 border-orange-500/30 bg-orange-500/5 overflow-hidden">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl shrink-0">🟠</div>
                    <div>
                      <p className="font-bold text-white text-sm">Shopee</p>
                      {shopeeLoading ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                          <span className="text-[10px] text-slate-600">Verificando...</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {shopeeConnections.length === 0
                            ? 'Não conectada'
                            : `${shopeeConnections.length} loja${shopeeConnections.length > 1 ? 's' : ''} conectada${shopeeConnections.length > 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {shopeeConnections.length > 0 && (
                      <button
                        onClick={() => { setSyncing('shopee'); fetch('/api/shopee/refresh', { method: 'POST' }).finally(() => setSyncing(null)) }}
                        title="Sincronizar agora"
                        className={`p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 transition-all ${syncing === 'shopee' ? 'animate-spin text-orange-400' : ''}`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <a
                      href="/api/shopee/auth"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-400 text-white transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      {shopeeConnections.length === 0 ? 'Conectar' : 'Adicionar loja'}
                    </a>
                  </div>
                </div>

                {/* Connected shops list */}
                {!shopeeLoading && shopeeConnections.length > 0 && (
                  <div className="space-y-2">
                    {shopeeConnections.map(conn => (
                      <div key={conn.id}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                          conn.is_primary
                            ? 'border-orange-500/30 bg-orange-500/5'
                            : 'border-white/[0.04] bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                            <span className="text-sm">🟠</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-white truncate">
                                {conn.account_label ?? conn.shop_name}
                              </p>
                              {conn.is_primary && (
                                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-900/40 text-orange-400">
                                  <Star className="w-2.5 h-2.5" /> Principal
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-600 font-mono">Shop ID: {conn.shop_id}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => disconnectShopeeAccount(conn.id)}
                            disabled={shopeeDisconnecting === conn.id}
                            title="Desconectar esta loja"
                            className="p-1.5 text-slate-600 hover:text-red-400 disabled:opacity-50 transition-colors rounded-lg hover:bg-red-500/10"
                          >
                            {shopeeDisconnecting === conn.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Magalu — active integration */}
          <div className="mb-4">
            <div className="dash-card rounded-2xl border border-l-4 border-l-blue-500 border-blue-500/30 bg-blue-500/5 overflow-hidden">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl shrink-0">🔷</div>
                    <div>
                      <p className="font-bold text-white text-sm">Magalu</p>
                      {magaluLoading ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                          <span className="text-[10px] text-slate-600">Verificando...</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {magaluConnections.length === 0
                            ? 'Não conectado'
                            : `${magaluConnections.length} conta${magaluConnections.length > 1 ? 's' : ''} conectada${magaluConnections.length > 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {magaluConnections.length > 0 && (
                      <button
                        onClick={() => { setSyncing('magalu'); fetch('/api/magalu/refresh', { method: 'POST' }).finally(() => setSyncing(null)) }}
                        title="Sincronizar agora"
                        className={`p-1.5 rounded-lg border border-white/[0.06] text-slate-500 hover:text-slate-200 transition-all ${syncing === 'magalu' ? 'animate-spin text-blue-400' : ''}`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <a
                      href="/api/magalu/auth"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      {magaluConnections.length === 0 ? 'Conectar' : 'Adicionar conta'}
                    </a>
                  </div>
                </div>

                {/* Connected accounts list */}
                {!magaluLoading && magaluConnections.length > 0 && (
                  <div className="space-y-2">
                    {magaluConnections.map(conn => (
                      <div key={conn.id}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                          conn.is_primary
                            ? 'border-blue-500/30 bg-blue-500/5'
                            : 'border-white/[0.04] bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <span className="text-sm">🔷</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-white truncate">
                                {conn.account_label ?? conn.seller_name}
                              </p>
                              {conn.is_primary && (
                                <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-900/40 text-blue-400">
                                  <Star className="w-2.5 h-2.5" /> Principal
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-600 font-mono">Seller: {conn.seller_id}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => disconnectMagaluAccount(conn.id)}
                            disabled={magaluDisconnecting === conn.id}
                            title="Desconectar esta conta"
                            className="p-1.5 text-slate-600 hover:text-red-400 disabled:opacity-50 transition-colors rounded-lg hover:bg-red-500/10"
                          >
                            {magaluDisconnecting === conn.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coming soon marketplaces */}
          <div>
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>Em breve</span>
              <span className="flex-1 h-px bg-white/[0.04]" />
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'amazon',  name: 'Amazon',      color: 'border-amber-500/15 bg-amber-500/5',   logo: '📦', desc: 'Amazon Brasil e FBA'              },
                { id: 'shopify', name: 'Shopify',      color: 'border-green-500/15 bg-green-500/5',   logo: '🟢', desc: 'Loja virtual Shopify'             },
                { id: 'tiktok',  name: 'TikTok Shop',  color: 'border-slate-500/15 bg-slate-500/5',   logo: '🎵', desc: 'Social commerce TikTok'           },
                { id: 'ame',     name: 'Americanas',   color: 'border-red-500/15 bg-red-500/5',       logo: '🔴', desc: 'Marketplace Americanas/B2W'       },
                { id: 'cb',      name: 'Casas Bahia',  color: 'border-blue-700/15 bg-blue-700/5',     logo: '🏠', desc: 'Via Varejo e Casas Bahia'         },
                { id: 'ns',      name: 'Nuvemshop',    color: 'border-indigo-500/15 bg-indigo-500/5', logo: '☁',  desc: 'Loja virtual e multicanal'        },
              ].map(m => (
                <div key={m.id} className={`glass-card rounded-xl border ${m.color} p-4 opacity-50 flex items-center justify-between group hover:opacity-60 transition-opacity`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg shrink-0">
                      {m.logo}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">{m.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <p className="text-[10px] text-slate-600">{m.desc}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-slate-800/60 text-slate-500 ring-1 ring-white/[0.06] shrink-0">
                    Em breve
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Plataformas de Frete ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-slate-500" />
            <div>
              <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Plataformas de Frete</h3>
              <p className="text-xs text-slate-600 mt-0.5">Gerencie suas transportadoras e calcule fretes automaticamente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fts.map(f => (
              <div key={f.name} className="dash-card rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{f.logo}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-white">{f.name}</p>
                      </div>
                      <p className="text-[10px] text-slate-600">{f.desc}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40">
                    Em breve
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ERPs & Ferramentas ── */}
        <div>
          <div className="mb-4">
            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>ERPs & Ferramentas</h3>
            <p className="text-xs text-slate-600 mt-0.5">Integrações com outros sistemas em desenvolvimento</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {erps.map(e => (
              <div key={e.name} className="dash-card rounded-2xl p-4 text-center opacity-70 hover:opacity-90 transition-opacity cursor-default">
                <div className="text-3xl mb-3">{e.logo}</div>
                <p className="text-xs font-bold text-white mb-1">{e.name}</p>
                <p className="text-[10px] text-slate-600 mb-3">{e.desc}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-400">Em breve</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── API Info card ── */}
        <div className="dash-card rounded-2xl p-5 border border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                API Foguetim ERP
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Acesse seus dados via API REST. Gerencie produtos, pedidos e estoque programaticamente.
                Documentação completa disponível em produção.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                  GET https://api.foguetim.com.br/v1/produtos
                </span>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40">
                  Em produção — em breve
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {otpDisconnectId && (
        <OtpConfirmation
          actionType="disconnect_ml"
          targetId={otpDisconnectId}
          onVerified={() => { const id = otpDisconnectId; setOtpDisconnectId(null); disconnectMLAccount(id) }}
          onCancel={() => setOtpDisconnectId(null)}
          title="Desconectar Mercado Livre"
          description="Esta ação removerá a integração com esta conta. Digite o código enviado ao seu e-mail para confirmar."
        />
      )}
    </div>
  )
}

export default function IntegracoesPage() {
  return (
    <Suspense>
      <IntegracoesContent />
    </Suspense>
  )
}
