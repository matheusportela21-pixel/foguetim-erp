'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  MessageCircle, Clock, CheckCircle, AlertCircle,
  Loader2, ChevronDown, ExternalLink, RefreshCw,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Question {
  id: string
  product: string
  question: string
  answer?: string | null
  date: string
  status: 'unanswered' | 'answered'
  portal_url?: string
}

interface QuestionsResponse {
  available: boolean
  questions?: Question[]
  total?: number
  unanswered?: number
  answered?: number
  avg_response_time?: string
}

type Tab = 'all' | 'unanswered' | 'answered'

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
      <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MagaluPerguntasPage() {
  const [data, setData] = useState<QuestionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/magalu/questions')
      const json: QuestionsResponse = await res.json()
      setData(json)
    } catch {
      setData({ available: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQuestions() }, [])

  /* ---- loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0086FF]" />
      </div>
    )
  }

  /* ---- unavailable ---- */
  if (!data?.available) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Perguntas"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Magalu', href: '/dashboard/magalu/overview' },
            { label: 'Perguntas' },
          ]}
        />
        <EmptyState
          image="standing"
          title="Perguntas Magalu — recurso indisponível"
          description="O endpoint de Perguntas & Respostas não está disponível na API Magalu atual. Gerencie perguntas diretamente pelo Portal do Seller."
          action={{ label: 'Abrir Portal Magalu', href: 'https://seller.magalu.com' }}
        />
      </div>
    )
  }

  /* ---- filter ---- */
  const questions = data.questions ?? []
  const filtered = questions.filter((q) => {
    if (tab === 'unanswered') return q.status === 'unanswered'
    if (tab === 'answered') return q.status === 'answered'
    return true
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'unanswered', label: 'Sem Resposta' },
    { key: 'answered', label: 'Respondidas' },
  ]

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    } catch { return iso }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Perguntas"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Magalu', href: '/dashboard/magalu/overview' },
          { label: 'Perguntas' },
        ]}
        actions={
          <button
            onClick={fetchQuestions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-space-700 border border-space-600 text-sm text-gray-300
                       hover:bg-space-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={MessageCircle} label="Total Perguntas" value={data.total ?? 0} color="#0086FF" />
        <KpiCard icon={AlertCircle}   label="Sem Resposta"    value={data.unanswered ?? 0} color="#EF4444" />
        <KpiCard icon={CheckCircle}   label="Respondidas"     value={data.answered ?? 0}   color="#22C55E" />
        <KpiCard icon={Clock}         label="Tempo Médio"     value={data.avg_response_time ?? '—'} color="#F59E0B" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-space-800 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-[#0086FF] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-space-600 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1.5fr_110px_120px_100px] gap-4 px-5 py-3
                        bg-space-800 text-xs uppercase tracking-wide text-gray-400 font-semibold">
          <span>Produto</span>
          <span>Pergunta</span>
          <span>Data</span>
          <span>Status</span>
          <span className="text-right">Ação</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            Nenhuma pergunta encontrada.
          </div>
        ) : (
          filtered.map((q) => {
            const open = expandedId === q.id
            return (
              <div key={q.id} className="border-t border-space-600">
                {/* Row */}
                <button
                  onClick={() => setExpandedId(open ? null : q.id)}
                  className="w-full grid grid-cols-[1fr_1.5fr_110px_120px_100px] gap-4 px-5 py-4
                             text-left text-sm hover:bg-space-800/50 transition-colors items-center"
                >
                  <span className="text-white truncate">{q.product}</span>
                  <span className="text-gray-300 truncate">{q.question}</span>
                  <span className="text-gray-400">{fmtDate(q.date)}</span>
                  <span>
                    {q.status === 'unanswered' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                                       bg-red-500/15 text-red-400 text-xs font-medium">
                        Sem resposta
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                                       bg-green-500/15 text-green-400 text-xs font-medium">
                        Respondida
                      </span>
                    )}
                  </span>
                  <span className="flex justify-end">
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {/* Expanded */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    open ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-1 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Pergunta completa</p>
                      <p className="text-sm text-gray-200">{q.question}</p>
                    </div>
                    {q.answer && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Resposta</p>
                        <p className="text-sm text-green-300">{q.answer}</p>
                      </div>
                    )}
                    {q.status === 'unanswered' && (
                      <a
                        href={q.portal_url ?? 'https://seller.magalu.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                                   bg-[#0086FF] text-white text-sm font-semibold
                                   hover:bg-[#006FD6] transition-colors"
                      >
                        Responder <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
