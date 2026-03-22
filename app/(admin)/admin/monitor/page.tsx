'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, Wifi, WifiOff, AlertTriangle, Clock, Server, RefreshCw,
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────────── */
interface PlatformStatus {
  status: 'online' | 'offline'
  connections: number
  lastError: string | null
  tokenExpires: string | null
}

interface MonitorData {
  mercadolivre: PlatformStatus
  shopee: PlatformStatus
  supabase: { status: 'online'; latency: number }
  errors24h: Array<{
    id: string
    action: string
    category: string
    description: string
    created_at: string
    user_id: string | null
  }>
  systemInfo: {
    version: string
    nodeEnv: string
    uptime: number
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function fmtTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function fmtTokenExpiry(iso: string | null): string {
  if (!iso) return '--'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'Expirado'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

const REFRESH_INTERVAL = 30 // seconds

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AdminMonitorPage() {
  useEffect(() => { document.title = 'Monitor de APIs — Admin Foguetim' }, [])

  const [data, setData] = useState<MonitorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/monitor')
      if (res.ok) {
        const json = await res.json() as MonitorData
        setData(json)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
      setCountdown(REFRESH_INTERVAL)
    }
  }, [])

  // Initial load + auto-refresh
  useEffect(() => {
    load()
    const refreshTimer = setInterval(load, REFRESH_INTERVAL * 1000)
    return () => clearInterval(refreshTimer)
  }, [load])

  // Countdown ticker
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL : prev - 1))
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  /* ── Status card component ─────────────────────────────────────────────── */
  function StatusCard({ title, icon: Icon, platform }: {
    title: string
    icon: React.ElementType
    platform: PlatformStatus
  }) {
    const isOnline = platform.status === 'online'
    return (
      <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">{title}</span>
          </div>
          <span className={`w-2 h-2 rounded-full inline-block ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Status</span>
            <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Conexoes ativas</span>
            <span className="text-slate-200">{platform.connections}</span>
          </div>
          <div className="flex justify-between">
            <span>Token expira em</span>
            <span className="text-slate-200">{fmtTokenExpiry(platform.tokenExpires)}</span>
          </div>
          {platform.lastError && (
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1 text-red-400 mb-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Ultimo erro</span>
              </div>
              <p className="text-slate-400 line-clamp-2">{platform.lastError}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  function SupabaseCard() {
    const latency = data?.supabase.latency ?? 0
    return (
      <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">Supabase</span>
          </div>
          <span className="w-2 h-2 rounded-full inline-block bg-green-500" />
        </div>

        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Status</span>
            <span className="text-green-400">Online</span>
          </div>
          <div className="flex justify-between">
            <span>Latencia</span>
            <span className="text-slate-200">{latency >= 0 ? `${latency}ms` : 'N/A'}</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  const defaultPlatform: PlatformStatus = { status: 'offline', connections: 0, lastError: null, tokenExpires: null }

  return (
    <div className="min-h-screen bg-[#080b10] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-semibold text-slate-200">Monitor de APIs</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>{countdown}s</span>
          </div>
          <button
            onClick={() => { setLoading(true); load() }}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded border border-white/[0.06]"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="Mercado Livre API"
          icon={data?.mercadolivre.status === 'online' ? Wifi : WifiOff}
          platform={data?.mercadolivre ?? defaultPlatform}
        />
        <StatusCard
          title="Shopee API"
          icon={data?.shopee.status === 'online' ? Wifi : WifiOff}
          platform={data?.shopee ?? defaultPlatform}
        />
        <SupabaseCard />
      </div>

      {/* System info bar */}
      {data?.systemInfo && (
        <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl px-5 py-3 flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Server className="w-3 h-3" />
            <span>v{data.systemInfo.version}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            <span>{data.systemInfo.nodeEnv}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Uptime: {fmtUptime(data.systemInfo.uptime)}</span>
          </div>
        </div>
      )}

      {/* Recent errors table */}
      <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-slate-200">Erros recentes (24h)</span>
          {data?.errors24h && (
            <span className="ml-auto text-xs text-slate-500">{data.errors24h.length} registro(s)</span>
          )}
        </div>

        {!data?.errors24h?.length ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Nenhum erro recente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500">
                  <th className="text-left px-5 py-2 font-medium">Timestamp</th>
                  <th className="text-left px-5 py-2 font-medium">Categoria</th>
                  <th className="text-left px-5 py-2 font-medium">Descricao</th>
                  <th className="text-left px-5 py-2 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {data.errors24h.map(err => (
                  <tr
                    key={err.id}
                    className="border-b border-white/[0.06] hover:bg-red-500/[0.04] transition-colors"
                  >
                    <td className="px-5 py-2 text-slate-400 whitespace-nowrap">
                      {fmtTimestamp(err.created_at)}
                    </td>
                    <td className="px-5 py-2">
                      <span className="text-red-400/80">{err.category}</span>
                    </td>
                    <td className="px-5 py-2 text-slate-300 max-w-md truncate">
                      {err.description}
                    </td>
                    <td className="px-5 py-2 text-slate-500 whitespace-nowrap">
                      {err.user_id ? err.user_id.slice(0, 8) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
