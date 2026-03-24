'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Calculator, Plus, UserPlus, FileText, Download, Eye, Trash2,
  Upload, X, CheckCircle2, Loader2, Search, FileCheck, AlertCircle,
  BarChart3, Mail, RefreshCw, ChevronDown, Clock, ShieldOff, Send,
  FilePlus, FileSpreadsheet, BookOpen, TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

/* ── Types ─────────────────────────────────────────────────────────────────── */
type DocType =
  | 'nfe_saida' | 'nfe_entrada' | 'nfce' | 'boleto'
  | 'extrato' | 'guia_das' | 'guia_darf' | 'contrato' | 'outros'

type AccStatus = 'pending' | 'active' | 'revoked'
type TabId = 'documentos' | 'nfe_saida' | 'nfe_entrada' | 'relatorios' | 'acesso'

interface AccountingDoc {
  id:              string
  type:            DocType
  name:            string
  description?:    string | null
  file_url?:       string | null
  file_size?:      number | null
  mime_type?:      string | null
  competencia_mes?: number | null
  competencia_ano?: number | null
  valor?:          number | null
  tags:            string[]
  created_at:      string
}

interface AccountantAccess {
  id:               string
  accountant_email: string
  accountant_name?: string | null
  permissions:      Record<string, boolean>
  status:           AccStatus
  invited_at:       string
  accepted_at?:     string | null
  expires_at?:      string | null
}

interface NfeRow {
  id:          string
  numero:      number
  serie:       number
  status:      string
  dest_nome:   string
  valor_total: number
  created_at:  string
  ambiente:    string
  xml_url?:    string | null
}

/* ── Constants ──────────────────────────────────────────────────────────────── */
const DOC_TYPE_CFG: Record<DocType, { label: string; color: string; bg: string }> = {
  nfe_saida:   { label: 'NF-e Saída',   color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40'   },
  nfe_entrada: { label: 'NF-e Entrada', color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/40'     },
  nfce:        { label: 'NFC-e',        color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/40'     },
  boleto:      { label: 'Boleto',       color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-700/40'   },
  extrato:     { label: 'Extrato',      color: 'text-slate-400',  bg: 'bg-slate-800/60 border-slate-700/40'   },
  guia_das:    { label: 'Guia DAS',     color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/40' },
  guia_darf:   { label: 'Guia DARF',   color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/40' },
  contrato:    { label: 'Contrato',     color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/40' },
  outros:      { label: 'Outros',       color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/40' },
}

const STATUS_ACC_CFG: Record<AccStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/40'  },
  active:   { label: 'Ativo',    color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/40'  },
  revoked:  { label: 'Revogado', color: 'text-red-400',   bg: 'bg-red-900/20 border-red-700/40'     },
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ── DocTypeBadge ───────────────────────────────────────────────────────────── */
function DocTypeBadge({ type }: { type: DocType }) {
  const { label, color, bg } = DOC_TYPE_CFG[type]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color} ${bg}`}>
      {label}
    </span>
  )
}

/* ── Toggle ─────────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-dark-600 border border-white/10'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-1'}`} />
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 1 — Documentos
══════════════════════════════════════════════════════════════════════════════ */
function DocumentosTab({ userId }: { userId: string }) {
  const now = new Date()
  const [docs,      setDocs]      = useState<AccountingDoc[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType | 'todos'>('todos')
  const [mesFilter, setMesFilter] = useState(now.getMonth() + 1)
  const [anoFilter, setAnoFilter] = useState(now.getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)

  const load = async () => {
    if (!userId || !isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('accounting_documents')
      .select('id,type,name,description,file_url,file_size,mime_type,competencia_mes,competencia_ano,valor,tags,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setDocs((data ?? []) as AccountingDoc[])
    setLoading(false)
  }

  useEffect(() => { if (userId) load() }, [userId]) // eslint-disable-line

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir documento?')) return
    setDeleting(id)
    await supabase.from('accounting_documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
    setDeleting(null)
  }

  const filtered = docs.filter(d => {
    const matchType = typeFilter === 'todos' || d.type === typeFilter
    const matchMes  = !d.competencia_mes || d.competencia_mes === mesFilter
    const matchAno  = !d.competencia_ano || d.competencia_ano === anoFilter
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchMes && matchAno && matchSearch
  })

  const typeButtons: Array<{ id: DocType | 'todos'; label: string }> = [
    { id: 'todos',       label: 'Todos'       },
    { id: 'nfe_saida',   label: 'NF-e Saída'  },
    { id: 'nfe_entrada', label: 'NF-e Entrada' },
    { id: 'guia_das',    label: 'Guias'        },
    { id: 'extrato',     label: 'Extratos'     },
    { id: 'outros',      label: 'Outros'       },
  ]

  const anoOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documento..." type="text"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
        </div>
        <div className="flex gap-2">
          <select value={mesFilter} onChange={e => setMesFilter(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={anoFilter} onChange={e => setAnoFilter(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
            {anoOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {typeButtons.map(btn => (
          <button key={btn.id} onClick={() => setTypeFilter(btn.id as DocType | 'todos')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              typeFilter === btn.id
                ? 'bg-purple-600/20 text-purple-300 border-purple-700/40'
                : 'bg-dark-700 text-slate-500 border-white/[0.06] hover:text-slate-300'
            }`}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="dash-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-dark-700 border border-white/[0.06] flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
            <p className="text-sm font-semibold text-slate-400 mb-1">Nenhum documento encontrado</p>
            <p className="text-xs text-slate-600">Adicione documentos contábeis para organizar sua contabilidade.</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all">
              <Plus className="w-4 h-4" /> Adicionar documento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Competência</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Upload</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(doc => (
                  <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap"><DocTypeBadge type={doc.type} /></td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-slate-200 truncate font-medium">{doc.name}</p>
                      {doc.description && <p className="text-xs text-slate-600 truncate">{doc.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {doc.competencia_mes && doc.competencia_ano
                        ? `${MESES[doc.competencia_mes - 1]} ${doc.competencia_ano}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200 font-medium whitespace-nowrap">
                      {doc.valor != null ? fmt(doc.valor) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(doc.created_at)}
                      {doc.file_size && <span className="ml-1 text-slate-600">({fmtSize(doc.file_size)})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {doc.file_url && (
                          <>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                              title="Visualizar" className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all">
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <a href={doc.file_url} download title="Download"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                          title="Excluir" className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/10 transition-all">
                          {deleting === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <UploadDocModal userId={userId} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}
    </div>
  )
}

/* ── Upload Doc Modal ───────────────────────────────────────────────────────── */
function UploadDocModal({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const now = new Date()
  const fileRef = useRef<HTMLInputElement>(null)

  const [type,    setType]    = useState<DocType>('outros')
  const [name,    setName]    = useState('')
  const [desc,    setDesc]    = useState('')
  const [mes,     setMes]     = useState(now.getMonth() + 1)
  const [ano,     setAno]     = useState(now.getFullYear())
  const [valor,   setValor]   = useState('')
  const [tag,     setTag]     = useState('')
  const [tags,    setTags]    = useState<string[]>([])
  const [file,    setFile]    = useState<File | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const addTag = () => {
    const t = tag.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTag('')
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError(null)

    let fileUrl: string | null = null
    let fileSize: number | null = null
    let mimeType: string | null = null

    if (file && isConfigured()) {
      const path = `${userId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('accounting-docs').upload(path, file, { upsert: false })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('accounting-docs').getPublicUrl(path)
      fileUrl  = urlData.publicUrl
      fileSize = file.size
      mimeType = file.type
    }

    const payload = {
      user_id: userId, type, name: name.trim(), description: desc || null,
      file_url: fileUrl, file_size: fileSize, mime_type: mimeType,
      competencia_mes: mes, competencia_ano: ano,
      valor: valor ? parseFloat(valor.replace(',', '.')) : null,
      tags,
    }

    const { error: dbErr } = await supabase.from('accounting_documents').insert(payload)
    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    onSaved()
  }

  const anoOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
  const maxSize = 10 * 1024 * 1024

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-dark-800 border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-bold text-slate-100">Adicionar Documento</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-600 hover:text-slate-300 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Tipo *</label>
            <select value={type} onChange={e => setType(e.target.value as DocType)}
              className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
              {(Object.keys(DOC_TYPE_CFG) as DocType[]).map(t => (
                <option key={t} value={t}>{DOC_TYPE_CFG[t].label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Nome *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: DAS Março 2026"
              className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Descrição</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Descrição opcional..."
              className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 resize-none" />
          </div>

          {/* Competência + Valor */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Mês</label>
              <select value={mes} onChange={e => setMes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m.slice(0, 3)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Ano</label>
              <select value={ano} onChange={e => setAno(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                {anoOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">Valor (R$)</label>
              <input type="text" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
            </div>
          </div>

          {/* File */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Arquivo (PDF, XML, XLSX, JPG — máx. 10 MB)</label>
            <input ref={fileRef} type="file" accept=".pdf,.xml,.xlsx,.jpg,.jpeg,.png" className="hidden" id="doc-file"
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > maxSize) { setError('Arquivo excede 10 MB.'); return }
                setFile(f); setError(null)
              }} />
            <label htmlFor="doc-file"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/[0.10] bg-dark-700 text-sm text-slate-400 hover:border-purple-600/40 hover:text-purple-300 cursor-pointer transition-all">
              <Upload className="w-4 h-4 shrink-0" />
              {file ? `${file.name} (${fmtSize(file.size)})` : 'Selecionar arquivo'}
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input type="text" value={tag} onChange={e => setTag(e.target.value)} placeholder="Adicionar tag..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                className="flex-1 px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
              <button type="button" onClick={addTag} className="px-3 py-2 rounded-xl bg-dark-600 border border-white/[0.06] text-sm text-slate-400 hover:text-slate-200 transition-all">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/20 text-purple-400 border border-purple-700/30">
                    {t}
                    <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="hover:text-red-400 transition-colors"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="flex items-center gap-1.5 text-xs text-red-400"><X className="w-3.5 h-3.5" />{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm font-medium text-slate-400 hover:text-slate-200 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 2 — NF-e de Saída
══════════════════════════════════════════════════════════════════════════════ */
function NfeSaidaTab({ userId }: { userId: string }) {
  const now = new Date()
  const [nfes,    setNfes]    = useState<NfeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mes,     setMes]     = useState(now.getMonth() + 1)
  const [ano,     setAno]     = useState(now.getFullYear())

  useEffect(() => {
    if (!userId || !isConfigured()) { setLoading(false); return }
    const start = `${ano}-${String(mes).padStart(2, '0')}-01`
    const endMes = mes === 12 ? 1 : mes + 1
    const endAno = mes === 12 ? ano + 1 : ano
    const end = `${endAno}-${String(endMes).padStart(2, '0')}-01`

    supabase
      .from('nfe')
      .select('id,numero,serie,status,dest_nome,valor_total,created_at,ambiente,xml_url')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setNfes((data ?? []) as NfeRow[]); setLoading(false) })
  }, [userId, mes, ano])

  const autorizadas = nfes.filter(n => n.status === 'autorizada')
  const valorTotal  = autorizadas.reduce((s, n) => s + n.valor_total, 0)
  const anoOptions  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-4">
      {/* Period + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-2">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
            {anoOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-sm text-slate-400 hover:text-slate-200 hover:border-white/10 transition-all">
            <Download className="w-4 h-4" /> Exportar XML do mês
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-sm text-slate-400 hover:text-slate-200 hover:border-white/10 transition-all">
            <FileSpreadsheet className="w-4 h-4" /> Exportar relatório
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total emitido',    value: nfes.length,        icon: FileText },
          { label: 'Autorizadas',      value: autorizadas.length, icon: CheckCircle2 },
          { label: 'Valor autorizado', value: fmt(valorTotal),    icon: TrendingUp },
        ].map(k => (
          <div key={k.label} className="dash-card rounded-2xl p-4 flex items-center gap-3">
            <k.icon className="w-4 h-4 text-green-400 shrink-0" />
            <div><p className="text-[11px] text-slate-500">{k.label}</p><p className="text-base font-bold text-slate-100">{k.value}</p></div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="dash-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
        ) : nfes.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16">
            <FileCheck className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">Nenhuma NF-e emitida em {MESES[mes - 1]} {ano}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nº</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Destinatário</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">XML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {nfes.map(nfe => (
                  <tr key={nfe.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-200 font-semibold">{String(nfe.numero).padStart(6, '0')}</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">{nfe.dest_nome}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-200 whitespace-nowrap">{fmt(nfe.valor_total)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(nfe.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        nfe.status === 'autorizada' ? 'text-green-400 bg-green-900/20 border-green-700/40'
                        : nfe.status === 'cancelada' ? 'text-red-400 bg-red-900/20 border-red-700/40'
                        : 'text-amber-400 bg-amber-900/20 border-amber-700/40'
                      }`}>{nfe.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {nfe.xml_url
                        ? <a href={nfe.xml_url} download className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all inline-flex"><Download className="w-3.5 h-3.5" /></a>
                        : <span className="text-xs text-slate-700">—</span>}
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

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 3 — NF-e de Entrada
══════════════════════════════════════════════════════════════════════════════ */
function NfeEntradaTab({ userId }: { userId: string }) {
  const [docs,    setDocs]    = useState<AccountingDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [saving,  setSaving]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    if (!userId || !isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('accounting_documents')
      .select('id,type,name,description,file_url,file_size,valor,competencia_mes,competencia_ano,tags,created_at')
      .eq('user_id', userId)
      .eq('type', 'nfe_entrada')
      .order('created_at', { ascending: false })
    setDocs((data ?? []) as AccountingDoc[])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId]) // eslint-disable-line

  const handleImport = async () => {
    if (!xmlFile) return
    setSaving(true)
    const now = new Date()
    const payload = {
      user_id: userId, type: 'nfe_entrada' as DocType,
      name: xmlFile.name.replace('.xml', ''),
      file_size: xmlFile.size, mime_type: 'application/xml',
      competencia_mes: now.getMonth() + 1, competencia_ano: now.getFullYear(), tags: [],
    }
    await supabase.from('accounting_documents').insert(payload)
    setSaving(false); setShowImport(false); setXmlFile(null)
    load()
  }

  return (
    <div className="space-y-4">
      {/* Instruction banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-900/10 border border-blue-700/30">
        <FileCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-300 mb-0.5">NF-e de Entrada</p>
          <p className="text-xs text-blue-500/80">
            Importe os XMLs das NF-e recebidas de fornecedores para manter o controle de entradas e facilitar a escrituração contábil.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-all">
          <FilePlus className="w-4 h-4" /> Importar XML
        </button>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowImport(false)} />
          <div className="relative z-10 w-full max-w-sm bg-dark-800 border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-100">Importar XML de NF-e</h3>
              <button onClick={() => setShowImport(false)} className="p-1 rounded-lg text-slate-600 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <input ref={fileRef} type="file" accept=".xml" className="hidden" id="xml-import"
              onChange={e => setXmlFile(e.target.files?.[0] ?? null)} />
            <label htmlFor="xml-import"
              className="flex items-center gap-2 w-full px-3 py-3 rounded-xl border border-dashed border-white/[0.10] bg-dark-700 text-sm text-slate-400 hover:border-blue-600/40 hover:text-blue-300 cursor-pointer transition-all mb-4">
              <Upload className="w-4 h-4 shrink-0" />
              {xmlFile ? xmlFile.name : 'Selecionar arquivo XML'}
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowImport(false)} className="flex-1 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-400 hover:text-slate-200">Cancelar</button>
              <button onClick={handleImport} disabled={!xmlFile || saving}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="dash-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16">
            <FilePlus className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-500 mb-1">Nenhuma NF-e de entrada importada</p>
            <p className="text-xs text-slate-600">Importe os XMLs de notas recebidas de fornecedores.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Competência</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-slate-200 font-medium truncate max-w-[200px]">{doc.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {doc.competencia_mes && doc.competencia_ano ? `${MESES[doc.competencia_mes - 1]} ${doc.competencia_ano}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200 font-medium">{doc.valor != null ? fmt(doc.valor) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(doc.created_at)}</td>
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

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 4 — Relatórios Contábeis
══════════════════════════════════════════════════════════════════════════════ */
function RelatoriosTab() {
  const [notifEmail, setNotifEmail] = useState('')
  const [notifModal, setNotifModal] = useState<string | null>(null)
  const [notifSent,  setNotifSent]  = useState(false)

  const relatorios: Array<{ id: string; icon: React.ElementType; title: string; desc: string; color: string; bg: string }> = [
    { id: 'dre',         icon: BarChart3,      title: 'DRE Simplificado',           desc: 'Receita bruta, deduções (taxas ML/Shopee/Amazon) e receita líquida por período', color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30' },
    { id: 'livro_caixa', icon: BookOpen,       title: 'Livro Caixa',                desc: 'Movimentações financeiras com entradas e saídas do período selecionado',          color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/30'     },
    { id: 'resumo_nfe',  icon: FileCheck,      title: 'Resumo de NF-e',             desc: 'Lista completa de notas fiscais emitidas em Excel com todos os campos fiscais',   color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/30'   },
    { id: 'vendas_mp',   icon: TrendingUp,     title: 'Vendas por Marketplace',     desc: 'Receita separada por plataforma (Mercado Livre, Shopee, Amazon) para apuração',  color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-700/30'     },
  ]

  const handleNotif = async () => {
    if (!notifEmail.trim()) return
    setNotifSent(true)
    setNotifEmail('')
    setTimeout(() => { setNotifSent(false); setNotifModal(null) }, 2500)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Relatórios contábeis gerados a partir dos seus dados de vendas e financeiro.
        Em breve disponíveis para download em PDF e Excel.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {relatorios.map(r => (
          <div key={r.id} className="dash-card rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${r.bg}`}>
                <r.icon className={`w-5 h-5 ${r.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{r.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
            <button onClick={() => setNotifModal(r.id)}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-white/10 transition-all">
              <Download className="w-3.5 h-3.5" /> Gerar relatório
            </button>
          </div>
        ))}
      </div>

      {/* "Em breve" notification modal */}
      {notifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setNotifModal(null)} />
          <div className="relative z-10 w-full max-w-sm bg-dark-800 border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            {notifSent ? (
              <div className="flex flex-col items-center text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
                <p className="text-sm font-semibold text-slate-200">Você será notificado!</p>
                <p className="text-xs text-slate-500 mt-1">Assim que o relatório estiver disponível, enviaremos por email.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-100">Relatório em breve</h3>
                  <button onClick={() => setNotifModal(null)} className="p-1 rounded-lg text-slate-600 hover:text-slate-300"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Este relatório está em desenvolvimento. Informe seu e-mail para ser notificado quando estiver disponível.
                </p>
                <input type="email" value={notifEmail} onChange={e => setNotifEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                  className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40 mb-3" />
                <button onClick={handleNotif} disabled={!notifEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white disabled:opacity-40 transition-all">
                  <Mail className="w-4 h-4" /> Notificar-me
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ABA 5 — Acesso do Contador
══════════════════════════════════════════════════════════════════════════════ */
const DEFAULT_PERMS = {
  view_nfe:           true,
  view_financial:     true,
  view_reports:       true,
  download_documents: true,
  view_nfe_entrada:   true,
  view_banking:       false,
}

function AcessoTab({ userId }: { userId: string }) {
  const [list,    setList]    = useState<AccountantAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [invName, setInvName] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [perms,   setPerms]   = useState<Record<string, boolean>>(DEFAULT_PERMS)
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = async () => {
    if (!userId || !isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('accountant_access')
      .select('id,accountant_email,accountant_name,permissions,status,invited_at,accepted_at,expires_at')
      .eq('user_id', userId)
      .order('invited_at', { ascending: false })
    setList((data ?? []) as AccountantAccess[])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId]) // eslint-disable-line

  const handleInvite = async () => {
    if (!invEmail.trim() || !invName.trim()) { setError('Nome e e-mail são obrigatórios.'); return }
    setSending(true); setError(null)
    const { error: err } = await supabase.from('accountant_access').insert({
      user_id: userId, accountant_email: invEmail.trim(), accountant_name: invName.trim(), permissions: perms,
    })
    if (err) setError(err.message)
    else { setSent(true); setInvName(''); setInvEmail(''); setPerms(DEFAULT_PERMS); load() }
    setSending(false)
    setTimeout(() => setSent(false), 3000)
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revogar acesso deste contador?')) return
    setRevoking(id)
    await supabase.from('accountant_access').update({ status: 'revoked' }).eq('id', id)
    setList(prev => prev.map(a => a.id === id ? { ...a, status: 'revoked' } : a))
    setRevoking(null)
  }

  const permLabels: Array<{ key: string; label: string }> = [
    { key: 'view_nfe',           label: 'Visualizar NF-e emitidas'      },
    { key: 'view_financial',     label: 'Visualizar relatórios financeiros' },
    { key: 'download_documents', label: 'Baixar documentos'              },
    { key: 'view_nfe_entrada',   label: 'Visualizar NF-e de entrada'     },
    { key: 'view_banking',       label: 'Visualizar dados bancários'     },
  ]

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="dash-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-purple-900/20 border border-purple-700/30 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">Convide seu contador</p>
            <p className="text-xs text-slate-500">Acesso somente leitura, sem necessidade de senha da sua conta</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Nome do contador *</label>
            <input type="text" value={invName} onChange={e => setInvName(e.target.value)} placeholder="João da Silva"
              className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">E-mail do contador *</label>
            <input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="contador@escritorio.com.br"
              className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
          </div>
        </div>

        {/* Permissions */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-3">Permissões</p>
          <div className="space-y-2.5">
            {permLabels.map(p => (
              <div key={p.key} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{p.label}</span>
                <Toggle checked={!!perms[p.key]} onChange={v => setPerms(prev => ({ ...prev, [p.key]: v }))} />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="flex items-center gap-1.5 text-xs text-red-400"><X className="w-3.5 h-3.5" />{error}</p>}
        {sent  && <p className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle2 className="w-3.5 h-3.5" />Convite enviado com sucesso!</p>}

        <div className="flex justify-end">
          <button onClick={handleInvite} disabled={sending || !invEmail.trim() || !invName.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all disabled:opacity-40">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>

        <p className="text-[11px] text-slate-600 border-t border-white/[0.06] pt-3">
          O acesso do contador é somente leitura. Ele não pode fazer alterações na sua conta.
        </p>
      </div>

      {/* Invited list */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contadores convidados</p>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
        ) : list.length === 0 ? (
          <div className="dash-card rounded-2xl p-6 text-center">
            <p className="text-sm text-slate-500">Nenhum contador convidado ainda.</p>
          </div>
        ) : (
          <div className="dash-card rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contador</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Desde</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {list.map(acc => {
                  const sc = STATUS_ACC_CFG[acc.status]
                  return (
                    <tr key={acc.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="text-slate-200 font-medium">{acc.accountant_name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{acc.accountant_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sc.color} ${sc.bg}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(acc.invited_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {acc.status !== 'revoked' && (
                            <>
                              <button title="Reenviar convite"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all">
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleRevoke(acc.id)} disabled={revoking === acc.id}
                                title="Revogar acesso"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/10 transition-all">
                                {revoking === acc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
const ADMIN_ROLES = ['admin', 'super_admin', 'owner', 'foguetim_support']

export default function ContadorPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const userId = profile?.id ?? ''
  const now = new Date()

  useEffect(() => {
    if (profile !== null && !ADMIN_ROLES.includes(profile.role)) {
      router.replace('/dashboard')
    }
  }, [profile, router])

  const [tab,          setTab]          = useState<TabId>('documentos')
  const [showUpload,   setShowUpload]   = useState(false)
  const [showInvite,   setShowInvite]   = useState(false)
  const [kpis,         setKpis]         = useState({ docs: 0, nfeSaida: 0, nfeEntrada: 0, guias: 0 })
  const [kpiLoading,   setKpiLoading]   = useState(true)

  useEffect(() => {
    if (!userId || !isConfigured()) { setKpiLoading(false); return }
    const mes = now.getMonth() + 1
    const ano  = now.getFullYear()
    const start = `${ano}-${String(mes).padStart(2, '0')}-01`
    const endMes = mes === 12 ? 1 : mes + 1
    const endAno = mes === 12 ? ano + 1 : ano
    const end = `${endAno}-${String(endMes).padStart(2, '0')}-01`

    Promise.all([
      supabase.from('accounting_documents').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('competencia_mes', mes).eq('competencia_ano', ano),
      supabase.from('nfe').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'autorizada').gte('created_at', start).lt('created_at', end),
      supabase.from('accounting_documents').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('type', 'nfe_entrada').eq('competencia_mes', mes).eq('competencia_ano', ano),
      supabase.from('accounting_documents').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('type', ['guia_das', 'guia_darf']).eq('competencia_mes', mes).eq('competencia_ano', ano),
    ]).then(([docs, nfeSaida, nfeEntrada, guias]) => {
      setKpis({ docs: docs.count ?? 0, nfeSaida: nfeSaida.count ?? 0, nfeEntrada: nfeEntrada.count ?? 0, guias: guias.count ?? 0 })
      setKpiLoading(false)
    })
  }, [userId]) // eslint-disable-line

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: 'documentos',  label: 'Documentos',        icon: FileText    },
    { id: 'nfe_saida',   label: 'NF-e Saída',        icon: FileCheck   },
    { id: 'nfe_entrada', label: 'NF-e Entrada',       icon: FilePlus    },
    { id: 'relatorios',  label: 'Relatórios',         icon: BarChart3   },
    { id: 'acesso',      label: 'Acesso do Contador', icon: UserPlus    },
  ]

  const kpiCards = [
    { label: 'Documentos este mês',  value: kpis.docs,       icon: FileText,  color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30' },
    { label: 'NF-e de Saída',        value: kpis.nfeSaida,   icon: FileCheck, color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/30'   },
    { label: 'NF-e de Entrada',      value: kpis.nfeEntrada, icon: FilePlus,  color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/30'     },
    { label: 'Guias em aberto',      value: kpis.guias,      icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/30' },
  ]

  return (
    <div>
      <PageHeader title="Espaço do Contador" description="Documentos e relatórios organizados para sua contabilidade" />

      <div className="p-4 md:p-6 space-y-5">

        {/* Action bar */}
        <div className="flex items-center gap-3 justify-end">
          <button onClick={() => { setTab('acesso'); setShowInvite(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-sm font-medium text-slate-400 hover:text-slate-200 hover:border-white/10 transition-all">
            <UserPlus className="w-4 h-4" /> Convidar contador
          </button>
          <button onClick={() => { setTab('documentos'); setShowUpload(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all">
            <Plus className="w-4 h-4" /> Adicionar documento
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map(k => (
            <div key={k.label} className="dash-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${k.bg}`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 truncate">{k.label}</p>
                  {kpiLoading
                    ? <div className="h-5 w-8 bg-dark-600 rounded animate-pulse mt-0.5" />
                    : <p className="text-xl font-bold text-slate-100 leading-tight">{k.value}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto pb-0.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-purple-600/15 text-purple-300 border border-purple-700/40'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}>
              <t.icon className="w-3.5 h-3.5 shrink-0" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'documentos'  && <DocumentosTab  userId={userId} />}
        {tab === 'nfe_saida'   && <NfeSaidaTab    userId={userId} />}
        {tab === 'nfe_entrada' && <NfeEntradaTab  userId={userId} />}
        {tab === 'relatorios'  && <RelatoriosTab  />}
        {tab === 'acesso'      && <AcessoTab       userId={userId} />}

        {/* Upload modal triggered from header button */}
        {showUpload && tab === 'documentos' && (
          <UploadDocModal userId={userId} onClose={() => setShowUpload(false)} onSaved={() => setShowUpload(false)} />
        )}

      </div>
    </div>
  )
}
