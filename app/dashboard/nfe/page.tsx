'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Plus, Search, Download, Eye, XCircle,
  CheckCircle2, Clock, AlertTriangle, Loader2, ShieldCheck,
  AlertCircle, RefreshCw, X, Calculator,
} from 'lucide-react'
import Header from '@/components/Header'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

/* ── Types ─────────────────────────────────────────────────────────────────── */
type NfeStatus = 'rascunho' | 'pendente' | 'autorizada' | 'cancelada' | 'denegada' | 'erro'
type Ambiente  = 'homologacao' | 'producao'

interface Nfe {
  id:              string
  numero:          number
  serie:           number
  chave_acesso?:   string | null
  ambiente:        Ambiente
  status:          NfeStatus
  dest_nome:       string
  dest_cnpj_cpf?:  string | null
  valor_total:     number
  xml_url?:        string | null
  danfe_url?:      string | null
  created_at:      string
  data_autorizacao?: string | null
}

interface FiscalCfg {
  certificado_path?: string | null
  ambiente: Ambiente
}

/* ── Status config ─────────────────────────────────────────────────────────── */
const STATUS_CFG: Record<NfeStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  rascunho:   { label: 'Rascunho',   icon: FileText,      color: 'text-slate-400',  bg: 'bg-slate-800/60 border-slate-700/40'   },
  pendente:   { label: 'Pendente',   icon: Clock,         color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/40'   },
  autorizada: { label: 'Autorizada', icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40'   },
  cancelada:  { label: 'Cancelada',  icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/40'       },
  denegada:   { label: 'Denegada',   icon: AlertCircle,   color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/40' },
  erro:       { label: 'Erro',       icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/40'       },
}

const ALL_STATUSES: NfeStatus[] = ['rascunho', 'pendente', 'autorizada', 'cancelada', 'denegada', 'erro']

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/* ── Status badge ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: NfeStatus }) {
  const { label, icon: Icon, color, bg } = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color} ${bg}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

/* ── Nova NF-e Modal ─────────────────────────────────────────────────────── */
function NovaNfeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-dark-800 border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-100">Nova NF-e</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-600 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-900/20 border border-purple-700/30 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-purple-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200 mb-2">Em desenvolvimento</p>
          <p className="text-xs text-slate-500 max-w-xs">
            O emissor de NF-e está sendo desenvolvido. Em breve você poderá emitir notas fiscais
            diretamente pela plataforma, integrado ao SEFAZ.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-900/30 text-purple-400 border border-purple-700/40">
              Integração SEFAZ
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-900/30 text-blue-400 border border-blue-700/40">
              XML automático
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-900/30 text-green-400 border border-green-700/40">
              DANFE PDF
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-dark-700 border border-white/[0.06] text-sm font-medium text-slate-400 hover:text-slate-200 transition-all"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function NfePage() {
  const { profile } = useAuth()
  const userId = profile?.id ?? ''

  const [nfes,         setNfes]         = useState<Nfe[]>([])
  const [fiscalCfg,    setFiscalCfg]    = useState<FiscalCfg | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<NfeStatus | 'todas'>('todas')
  const [showModal,    setShowModal]    = useState(false)

  const load = async (showRefresh = false) => {
    if (!userId || !isConfigured()) { setLoading(false); return }
    if (showRefresh) setRefreshing(true)

    const [nfeRes, cfgRes] = await Promise.all([
      supabase
        .from('nfe')
        .select('id,numero,serie,chave_acesso,ambiente,status,dest_nome,dest_cnpj_cpf,valor_total,xml_url,danfe_url,created_at,data_autorizacao')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('fiscal_config')
        .select('certificado_path,ambiente')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    if (nfeRes.data)  setNfes(nfeRes.data as Nfe[])
    if (cfgRes.data)  setFiscalCfg(cfgRes.data as FiscalCfg)

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { if (userId) load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasCert = !!fiscalCfg?.certificado_path

  /* KPIs */
  const total       = nfes.length
  const autorizadas = nfes.filter(n => n.status === 'autorizada').length
  const pendentes   = nfes.filter(n => n.status === 'pendente').length
  const valorTotal  = nfes.filter(n => n.status === 'autorizada').reduce((s, n) => s + n.valor_total, 0)

  /* Filtered */
  const filtered = nfes.filter(n => {
    const matchSearch = !search
      || n.dest_nome.toLowerCase().includes(search.toLowerCase())
      || String(n.numero).includes(search)
      || (n.dest_cnpj_cpf ?? '').includes(search)
      || (n.chave_acesso  ?? '').includes(search)
    const matchStatus = filterStatus === 'todas' || n.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>
      <Header title="NF-e" subtitle="Notas Fiscais Eletrônicas" />

      <div className="p-4 md:p-6 space-y-5">

        {/* Setup banner — shown only when cert is missing */}
        {!loading && !hasCert && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-900/10 border border-amber-700/30">
            <div className="w-9 h-9 rounded-xl bg-amber-900/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">Certificado digital não configurado</p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                Configure seu certificado A1 em{' '}
                <a href="/dashboard/configuracoes" className="underline hover:text-amber-300">
                  Configurações → Fiscal e NF-e
                </a>{' '}
                para começar a emitir notas fiscais.
              </p>
            </div>
          </div>
        )}

        {/* KPI cards */}
        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total emitido',    value: total,          Icon: FileText,      color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30' },
              { label: 'Autorizadas',      value: autorizadas,    Icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/30'   },
              { label: 'Pendentes',        value: pendentes,      Icon: Clock,         color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/30'   },
              { label: 'Valor autorizado', value: fmt(valorTotal), Icon: FileText,     color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/30'     },
            ].map(k => (
              <div key={k.label} className="dash-card rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${k.bg}`}>
                    <k.Icon className={`w-4 h-4 ${k.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 truncate">{k.label}</p>
                    <p className="text-lg font-bold text-slate-100 leading-tight">{k.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="dash-card rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por destinatário, número ou chave..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                title="Atualizar"
                className="p-2 rounded-xl border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all"
              >
                <Plus className="w-4 h-4" />
                Nova NF-e
              </button>
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('todas')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                filterStatus === 'todas'
                  ? 'bg-purple-600/20 text-purple-300 border-purple-700/40'
                  : 'bg-dark-700 text-slate-500 border-white/[0.06] hover:border-white/10 hover:text-slate-300'
              }`}
            >
              Todas ({total})
            </button>
            {ALL_STATUSES.map(s => {
              const count = nfes.filter(n => n.status === s).length
              if (count === 0) return null
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    filterStatus === s
                      ? `${STATUS_CFG[s].bg} ${STATUS_CFG[s].color}`
                      : 'bg-dark-700 text-slate-500 border-white/[0.06] hover:border-white/10 hover:text-slate-300'
                  }`}
                >
                  {STATUS_CFG[s].label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Table / Empty state */}
        <div className="dash-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center py-20 px-4">
              <div className="w-14 h-14 rounded-2xl bg-dark-700 border border-white/[0.06] flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-slate-700" />
              </div>
              <p className="text-sm font-semibold text-slate-400 mb-1">
                {search || filterStatus !== 'todas' ? 'Nenhum resultado encontrado' : 'Nenhuma NF-e emitida'}
              </p>
              <p className="text-xs text-slate-600 max-w-xs">
                {search || filterStatus !== 'todas'
                  ? 'Tente ajustar os filtros ou a busca.'
                  : 'Clique em "Nova NF-e" para emitir sua primeira nota fiscal eletrônica.'}
              </p>
              {!search && filterStatus === 'todas' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nova NF-e
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nº / Série</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Destinatário</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ambiente</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(nfe => (
                    <tr key={nfe.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-slate-200 font-semibold">{String(nfe.numero).padStart(6, '0')}</p>
                        <p className="text-xs text-slate-600">Série {nfe.serie}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {fmtDate(nfe.created_at)}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-slate-200 truncate">{nfe.dest_nome}</p>
                        {nfe.dest_cnpj_cpf && (
                          <p className="text-xs text-slate-600 font-mono">{nfe.dest_cnpj_cpf}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-200 whitespace-nowrap">
                        {fmt(nfe.valor_total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={nfe.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          nfe.ambiente === 'producao'
                            ? 'text-green-400 bg-green-900/20 border-green-700/40'
                            : 'text-slate-400 bg-slate-800/60 border-slate-700/40'
                        }`}>
                          {nfe.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            title="Visualizar"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {nfe.danfe_url && (
                            <a
                              href={nfe.danfe_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Baixar DANFE"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {nfe.status === 'autorizada' && (
                            <>
                              <button
                                title="Enviar para Espaço do Contador"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-purple-400 hover:bg-purple-900/10 transition-all"
                              >
                                <Calculator className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Cancelar NF-e"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/10 transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {showModal && <NovaNfeModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
