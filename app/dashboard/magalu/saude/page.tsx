'use client'

import { useState, useEffect } from 'react'
import {
  Activity, TrendingUp, AlertTriangle, CheckCircle,
  ThumbsUp, Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

/* ── Types ───────────────────────────────────────────────────────────────── */

interface SkuScore {
  produto: string
  sku:     string
  score:   number
  status:  'Excelente' | 'Bom' | 'Baixo'
  sugestoes: string
}

interface ScoresData {
  available: boolean
  averageScore?: number
  distribution?: { excelente: number; bom: number; baixo: number }
  items?: SkuScore[]
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const MAGALU_BLUE = '#0086FF'

function scoreBadge(score: number) {
  if (score > 8) return { label: 'Excelente', bg: 'bg-green-500/10', text: 'text-green-400', ring: 'ring-green-500/30', bar: 'from-green-500 to-green-400' }
  if (score >= 6) return { label: 'Bom', bg: 'bg-yellow-500/10', text: 'text-yellow-400', ring: 'ring-yellow-500/30', bar: 'from-yellow-500 to-yellow-400' }
  return { label: 'Baixo', bg: 'bg-red-500/10', text: 'text-red-400', ring: 'ring-red-500/30', bar: 'from-red-500 to-red-400' }
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-800 rounded-lg" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="glass-card rounded-2xl h-28 bg-slate-900" />
        ))}
      </div>
      <div className="glass-card rounded-2xl h-64 bg-slate-900" />
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function MagaluSaudePage() {
  const [data, setData] = useState<ScoresData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/magalu/scores')
      .then(r => r.json())
      .then((d: ScoresData) => setData(d))
      .catch(() => setData({ available: false }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />

  if (!data?.available) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader
          title="Saúde dos Anúncios"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Magalu', href: '/dashboard/magalu/overview' },
            { label: 'Saúde' },
          ]}
        />
        <EmptyState
          image="standing"
          title="Score de Saúde — aguardando aprovação"
          description="O Score de Saúde precisa da aprovação do scope portfolio-scores pela Magalu. Já solicitamos — deve ser liberado em breve."
          action={{ label: 'Voltar ao overview', href: '/dashboard/magalu/overview' }}
        />
      </div>
    )
  }

  const { averageScore = 0, distribution = { excelente: 0, bom: 0, baixo: 0 }, items = [] } = data
  const total = distribution.excelente + distribution.bom + distribution.baixo || 1
  const pctExc = (distribution.excelente / total) * 100
  const pctBom = (distribution.bom / total) * 100
  const pctBai = (distribution.baixo / total) * 100
  const avgBadge = scoreBadge(averageScore)

  const kpis = [
    { label: 'Score Médio', value: `${averageScore.toFixed(1)}`, icon: Activity,        color: 'text-[#0086FF] bg-[#0086FF]/10' },
    { label: 'Excelentes',  value: `${distribution.excelente}`,  icon: CheckCircle,     color: 'text-green-400 bg-green-500/10' },
    { label: 'Bons',        value: `${distribution.bom}`,        icon: ThumbsUp,        color: 'text-yellow-400 bg-yellow-500/10' },
    { label: 'Baixos',      value: `${distribution.baixo}`,      icon: AlertTriangle,   color: 'text-red-400 bg-red-500/10' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Saúde dos Anúncios"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Magalu', href: '/dashboard/magalu/overview' },
          { label: 'Saúde' },
        ]}
      />

      {/* ── Score Overview ── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${MAGALU_BLUE}15` }}>
              <span className={`text-2xl font-bold ${avgBadge.text}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                {averageScore.toFixed(1)}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-400">Score médio dos anúncios</p>
              <p className="text-xs text-slate-600 mt-0.5">Escala de 0 a 10</p>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-green-400 font-semibold">Excelente {pctExc.toFixed(0)}%</span>
              <span className="text-xs text-yellow-400 font-semibold">Bom {pctBom.toFixed(0)}%</span>
              <span className="text-xs text-red-400 font-semibold">Baixo {pctBai.toFixed(0)}%</span>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-white/[0.06]">
              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pctExc}%` }} />
              <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${pctBom}%` }} />
              <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${pctBai}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card rounded-2xl p-4 flex flex-col gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-space-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Produto</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sugestões</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-space-600">
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    Nenhum SKU encontrado
                  </td>
                </tr>
              )}
              {items.map((item, idx) => {
                const badge = scoreBadge(item.score)
                const barWidth = (item.score / 10) * 100
                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium max-w-[200px] truncate">
                      {item.produto}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold tabular-nums ${badge.text}`}>
                          {item.score.toFixed(1)}
                        </span>
                        <div className="w-20 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${badge.bar} transition-all duration-500`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${badge.bg} ${badge.text} ${badge.ring}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px]">
                      {item.sugestoes || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
