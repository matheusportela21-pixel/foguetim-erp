'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Wrench, Plug, Users, Ticket, CheckCircle2, XCircle, Loader2, Terminal } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface ToolsData {
  ml: {
    connected: number
    status:    string
    last_sync: string | null
  }
  platform: {
    total_users:  number
    open_tickets: number
    maintenance:  boolean
  }
}

interface ActionResult {
  ok:      boolean
  message: string
  ts?:     string
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'} shrink-0`} />
  )
}

function ToolCard({
  icon: Icon, title, description, actionLabel, onAction, loading, result,
}: {
  icon: React.ElementType
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  loading: boolean
  result: ActionResult | null
}) {
  return (
    <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">{title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onAction}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.07] transition-all disabled:opacity-50"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Terminal className="w-3.5 h-3.5" />
        }
        {actionLabel}
      </button>
      {result && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          result.ok
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {result.ok
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            : <XCircle className="w-3.5 h-3.5 shrink-0" />
          }
          <span>{result.message}</span>
          {result.ts && <span className="ml-auto text-[10px] opacity-60 font-mono">{new Date(result.ts).toLocaleTimeString('pt-BR')}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminFerramentasPage() {
  const [data, setData]       = useState<ToolsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pingLoading, setPingLoading] = useState(false)
  const [pingResult, setPingResult]   = useState<ActionResult | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tools')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function runAction(action: string): Promise<ActionResult> {
    const res = await fetch('/api/admin/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json() as { ok?: boolean; message?: string; ts?: string; error?: string }
    if (res.ok) return { ok: true, message: json.message ?? 'OK', ts: json.ts }
    return { ok: false, message: json.error ?? 'Erro desconhecido' }
  }

  async function handlePing() {
    setPingLoading(true)
    setPingResult(null)
    const r = await runAction('ping')
    setPingResult(r)
    setPingLoading(false)
    setTimeout(() => setPingResult(null), 6000)
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Ferramentas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Status das integrações e ações administrativas</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:text-slate-200 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Status cards */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Status da Plataforma</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ML Integration */}
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Plug className="w-4 h-4 text-green-400" />
              <p className="text-xs text-slate-500">Mercado Livre</p>
              {!loading && data && (
                <StatusDot ok={data.ml.connected > 0} />
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-7 w-16 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-white tabular-nums">{data?.ml.connected ?? 0}</p>
                <p className="text-xs text-slate-600 mt-1">contas conectadas</p>
                {data?.ml.last_sync && (
                  <p className="text-[10px] text-slate-700 mt-1 font-mono">
                    sync: {new Date(data.ml.last_sync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Users */}
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-slate-500">Usuários</p>
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <>
                <p className="text-3xl font-bold text-white tabular-nums">{data?.platform.total_users ?? 0}</p>
                <p className="text-xs text-slate-600 mt-1">total na plataforma</p>
              </>
            )}
          </div>

          {/* Tickets */}
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-slate-500">Tickets Abertos</p>
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-white/[0.04] rounded animate-pulse" />
            ) : (
              <>
                <p className={`text-3xl font-bold tabular-nums ${(data?.platform.open_tickets ?? 0) > 0 ? 'text-orange-400' : 'text-white'}`}>
                  {data?.platform.open_tickets ?? 0}
                </p>
                <p className="text-xs text-slate-600 mt-1">aguardando atendimento</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Maintenance mode */}
      {data && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Modo Manutenção</h2>
          <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot ok={!data.platform.maintenance} />
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {data.platform.maintenance ? 'Manutenção ativa' : 'Plataforma operacional'}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {data.platform.maintenance
                    ? 'Usuários veem aviso de indisponibilidade'
                    : 'Todos os serviços rodando normalmente'}
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              data.platform.maintenance
                ? 'bg-red-900/40 text-red-300 ring-1 ring-red-700/40'
                : 'bg-green-900/40 text-green-300 ring-1 ring-green-700/40'
            }`}>
              {data.platform.maintenance ? 'MANUTENÇÃO' : 'ONLINE'}
            </span>
          </div>
        </section>
      )}

      {/* Tool actions */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Ações</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToolCard
            icon={Wrench}
            title="Ping"
            description="Verifica se as APIs internas estão respondendo corretamente."
            actionLabel="Executar ping"
            onAction={handlePing}
            loading={pingLoading}
            result={pingResult}
          />
          {/* Placeholder for future tools */}
          <div className="bg-[#0d1117] border border-dashed border-white/[0.06] rounded-xl p-5 flex items-center justify-center">
            <p className="text-xs text-slate-700 text-center">Mais ferramentas em breve</p>
          </div>
        </div>
      </section>
    </div>
  )
}
