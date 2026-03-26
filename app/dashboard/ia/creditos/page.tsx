'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Coins, Sparkles, Zap, Crown, Loader2,
  Type, FileText, Info, CheckCircle2, Eye, CreditCard,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditBalance {
  remaining: number
  total: number
  used: number
}

interface UsageRecord {
  id: string
  type: 'title' | 'description'
  input: string
  output: string
  credits: number
  created_at: string
}

// ─── Packages ─────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    name: 'Starter',
    credits: 50,
    price: 9.9,
    badge: null,
    gradient: 'from-slate-600 to-slate-500',
    border: 'border-white/[0.06]',
  },
  {
    name: 'Pro',
    credits: 200,
    price: 29.9,
    badge: 'Popular',
    gradient: 'from-primary-600 to-primary-500',
    border: 'border-primary-500/30',
  },
  {
    name: 'Enterprise',
    credits: 500,
    price: 59.9,
    badge: 'Melhor custo',
    gradient: 'from-amber-600 to-amber-500',
    border: 'border-amber-500/30',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreditosIAPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [history, setHistory] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch('/api/ai/credits')
        const data = await res.json()
        setBalance({
          remaining: data.remaining ?? 0,
          total: data.total ?? 0,
          used: data.used ?? 0,
        })
      } catch {
        setBalance({ remaining: 0, total: 0, used: 0 })
      } finally {
        setLoading(false)
      }
    }

    async function fetchHistory() {
      try {
        const res = await fetch('/api/ai/credits/history')
        const data = await res.json()
        setHistory(data.history ?? [])
      } catch {
        setHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchBalance()
    fetchHistory()
  }, [])

  // ─── Progress bar color ───────────────────────────────────────────────────

  function getProgressColor(remaining: number, total: number) {
    if (total === 0) return 'bg-slate-500'
    const pct = remaining / total
    if (pct > 0.5) return 'bg-green-500'
    if (pct > 0.1) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  function getProgressTextColor(remaining: number, total: number) {
    if (total === 0) return 'text-slate-400'
    const pct = remaining / total
    if (pct > 0.5) return 'text-green-400'
    if (pct > 0.1) return 'text-yellow-400'
    return 'text-red-400'
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creditos IA"
        description="Gerencie seus creditos para otimizacao de anuncios com inteligencia artificial."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'IA', href: '/dashboard/ai' },
          { label: 'Creditos' },
        ]}
      />

      {/* ── Credit Balance ──────────────────────────────────────────────────── */}
      <div className="glass-card p-6 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : balance ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Seus creditos</p>
                <p className={`text-2xl font-bold ${getProgressTextColor(balance.remaining, balance.total)}`}>
                  {balance.remaining} <span className="text-base font-normal text-slate-500">restantes</span>
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(balance.remaining, balance.total)}`}
                  style={{ width: `${balance.total > 0 ? (balance.remaining / balance.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{balance.used} usado{balance.used !== 1 ? 's' : ''}</span>
                <span>{balance.remaining}/{balance.total} disponiveis</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Packages ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary-400" />
          Comprar mais creditos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PACKAGES.map(pkg => (
            <div
              key={pkg.name}
              className={`glass-card p-6 relative flex flex-col border ${pkg.border}`}
            >
              {/* Badge */}
              {pkg.badge && (
                <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-500 text-white shadow-glow-sm">
                  {pkg.badge}
                </span>
              )}

              <h3 className="text-white font-bold text-lg mt-1">{pkg.name}</h3>

              <div className="mt-3 space-y-1">
                <p className="text-3xl font-bold text-white">
                  R$ {pkg.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-slate-400">
                  {pkg.credits} edicoes
                </p>
                <p className="text-xs text-slate-500">
                  R$ {(pkg.price / pkg.credits).toFixed(2).replace('.', ',')} por edicao
                </p>
              </div>

              <div className="mt-auto pt-5">
                <button
                  disabled
                  title="Em breve"
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500
                             text-white font-semibold text-sm
                             opacity-40 cursor-not-allowed
                             flex items-center gap-2 justify-center"
                >
                  <Sparkles className="w-4 h-4" />
                  Comprar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300/90 leading-relaxed">
            Sistema de pagamento em implantacao. Entre em contato para adquirir creditos.
          </p>
        </div>
      </div>

      {/* ── Usage History ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-400" />
          Historico de uso
        </h2>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            image="search"
            title="Nenhum uso registrado"
            description="Seus creditos de IA ainda nao foram utilizados. Use o botao de IA no editor de anuncios para comecar."
          />
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Data</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:table-cell">Entrada</th>
                    <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Saida</th>
                    <th className="p-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Creditos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {history.map(record => (
                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        {new Date(record.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3">
                        {record.type === 'title' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400">
                            <Type className="w-3 h-3" />
                            Titulo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400">
                            <FileText className="w-3 h-3" />
                            Descricao
                          </span>
                        )}
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <p className="text-slate-400 truncate max-w-[200px]" title={record.input}>
                          {record.input}
                        </p>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <p className="text-slate-300 truncate max-w-[200px]" title={record.output}>
                          {record.output}
                        </p>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-white font-medium">-{record.credits}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Como funciona
        </h3>
        <ul className="space-y-3">
          {[
            { icon: Sparkles, text: 'Use o botao de IA no editor de anuncios para melhorar titulos e descricoes', color: 'text-primary-400' },
            { icon: Eye, text: 'Visualize a sugestao gratuitamente', color: 'text-green-400' },
            { icon: CheckCircle2, text: 'Pague 1 credito apenas se aceitar a sugestao', color: 'text-blue-400' },
            { icon: Crown, text: 'Creditos nao expiram', color: 'text-amber-400' },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <item.icon className={`w-4 h-4 ${item.color} shrink-0 mt-0.5`} />
              <span className="text-sm text-slate-300 leading-relaxed">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
