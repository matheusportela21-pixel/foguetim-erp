'use client'

import { useState, useCallback } from 'react'
import { Monitor, Smartphone, Globe, Clock, ShieldCheck, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'

/* ── Mock data ──────────────────────────────────────────────────────────────── */
interface Session {
  id: string
  device: string
  browser: string
  location: string
  icon: 'desktop' | 'mobile'
  lastSeen: string
  current: boolean
}

interface AccessLog {
  id: string
  date: string
  time: string
  ip: string
  location: string
  status: 'success' | 'failed'
}

const MOCK_SESSIONS: Session[] = [
  { id: '1', device: 'Windows 11', browser: 'Chrome 122',   location: 'Fortaleza, CE', icon: 'desktop', lastSeen: 'Agora',     current: true  },
  { id: '2', device: 'iPhone 15',  browser: 'Safari Mobile', location: 'Fortaleza, CE', icon: 'mobile',  lastSeen: '2h atrás',  current: false },
  { id: '3', device: 'macOS 14',   browser: 'Firefox 123',  location: 'São Paulo, SP', icon: 'desktop', lastSeen: '3d atrás',  current: false },
]

const MOCK_LOGS: AccessLog[] = [
  { id: '1', date: '14/03/2026', time: '09:32', ip: '177.x.x.x', location: 'Fortaleza, CE', status: 'success' },
  { id: '2', date: '13/03/2026', time: '18:45', ip: '177.x.x.x', location: 'Fortaleza, CE', status: 'success' },
  { id: '3', date: '12/03/2026', time: '14:10', ip: '177.x.x.x', location: 'Fortaleza, CE', status: 'success' },
  { id: '4', date: '11/03/2026', time: '08:55', ip: '189.x.x.x', location: 'São Paulo, SP', status: 'failed'  },
  { id: '5', date: '10/03/2026', time: '22:17', ip: '177.x.x.x', location: 'Fortaleza, CE', status: 'success' },
]

export default function SegurancaSection() {
  const { profile, signOut } = useAuth()
  const [revoking, setRevoking] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const handleRevokeSessions = async () => {
    if (!isConfigured() || !profile?.id) {
      showToast('success', 'Sessões encerradas! (modo dev)')
      return
    }
    setRevoking(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw new Error(error.message)
      showToast('success', 'Todas as outras sessões foram encerradas.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao encerrar sessões.')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Segurança
        </h3>
        <p className="text-xs text-slate-600">Gerencie sessões ativas e visualize histórico de acessos</p>
      </div>

      {/* ── Sessões ativas ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sessões Ativas</p>
          <button
            onClick={() => void handleRevokeSessions()}
            disabled={revoking}
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {revoking ? 'Encerrando...' : 'Encerrar todas as outras sessões'}
          </button>
        </div>

        <div className="dash-card rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {MOCK_SESSIONS.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
                {s.icon === 'desktop'
                  ? <Monitor className="w-4 h-4 text-slate-500" />
                  : <Smartphone className="w-4 h-4 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-200 truncate">{s.device} · {s.browser}</p>
                  {s.current && (
                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-400 ring-1 ring-green-700/30">
                      Atual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Globe className="w-3 h-3" /> {s.location}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="w-3 h-3" /> {s.lastSeen}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-700 italic">* Dados de sessão são ilustrativos. A integração completa estará disponível em breve.</p>
      </div>

      {/* ── Histórico de acessos ── */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico de Acessos (Últimos 5)</p>
        <div className="dash-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Data/Hora</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">IP</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Local</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {MOCK_LOGS.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-slate-400 text-xs">{log.date} {log.time}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs hidden sm:table-cell font-mono">{log.ip}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell">{log.location}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.status === 'success'
                        ? 'bg-green-900/30 text-green-400 ring-1 ring-green-700/30'
                        : 'bg-red-900/30 text-red-400 ring-1 ring-red-700/30'
                    }`}>
                      {log.status === 'success' ? 'Sucesso' : 'Falha'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-700 italic">* Histórico de acessos é ilustrativo. Dados reais disponíveis em breve.</p>
      </div>

      {/* ── 2FA ── */}
      <div className="dash-card rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Autenticação em Dois Fatores (2FA)</p>
            <p className="text-xs text-slate-600 mt-0.5">Adicione uma camada extra de segurança à sua conta</p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-900/30 text-amber-400 ring-1 ring-amber-700/30">
          Em breve
        </span>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
