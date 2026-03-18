'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload, Lock, AlertTriangle, CheckCircle2, XCircle, X, ExternalLink } from 'lucide-react'
import Header from '@/components/Header'
import { useAuth } from '@/lib/auth-context'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

interface Invoice {
  id: number
  supplier_name: string
  invoice_number: string
  invoice_key: string | null
  total_amount: number
  status: 'uploaded' | 'processing' | 'pending_resolution' | 'completed' | 'error'
  is_beta: boolean
  created_at: string
  items: { id: number }[]
}

interface ToastState { message: string; type: 'success' | 'error' }

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border
      ${toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-200' : 'bg-red-900/80 border-red-500/30 text-red-200'}`}>
      {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-200"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

const STATUS_MAP: Record<Invoice['status'], { label: string; cls: string }> = {
  uploaded:           { label: 'Enviado',     cls: 'bg-blue-900/40 text-blue-400' },
  processing:         { label: 'Processando', cls: 'bg-amber-900/40 text-amber-400' },
  pending_resolution: { label: 'Pendente',    cls: 'bg-orange-900/40 text-orange-400' },
  completed:          { label: 'Concluído',   cls: 'bg-emerald-900/40 text-emerald-400' },
  error:              { label: 'Erro',        cls: 'bg-red-900/40 text-red-400' },
}

export default function NotasEntradaPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [invoices, setInvoices]       = useState<Invoice[]>([])
  const [loading, setLoading]         = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [toast, setToastState]        = useState<ToastState | null>(null)

  const isAdmin = profile !== undefined && profile !== null && profile.role && ADMIN_ROLES.includes(profile.role)

  function setToast(t: ToastState) {
    setToastState(t)
    setTimeout(() => setToastState(null), 3000)
  }

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/armazem/notas-entrada')
      if (!r.ok) return
      const d = await r.json()
      setInvoices(d.data ?? d.invoices ?? [])
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchInvoices()
  }, [isAdmin, fetchInvoices])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('xml', file)
      const r = await fetch('/api/armazem/notas-entrada/upload', { method: 'POST', body: formData })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Erro ao processar NF-e')
      const invoiceId = d.invoice?.id ?? d.id
      if (invoiceId) {
        router.push(`/dashboard/armazem/notas-entrada/${invoiceId}`)
      } else {
        setToast({ message: 'NF-e enviada com sucesso!', type: 'success' })
        fetchInvoices()
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Access guard ───────────────────────────────────────────────────────────

  if (profile === null) {
    return (
      <div>
        <Header title="Notas de Entrada" subtitle="NF-e de compra — Beta" />
        <div className="p-6">
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Acesso restrito</h3>
            <p className="text-sm text-slate-500 max-w-sm">Esta funcionalidade está disponível apenas para administradores.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div>
        <Header title="Notas de Entrada" subtitle="NF-e de compra — Beta" />
        <div className="p-6">
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Acesso restrito</h3>
            <p className="text-sm text-slate-500 max-w-sm">Esta funcionalidade está disponível apenas para administradores do sistema.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Notas de Entrada" subtitle="Upload e processamento de NF-e de compra" />

      <div className="p-6 space-y-4">
        {/* Beta warning */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400 mb-0.5">Funcionalidade Beta</p>
            <p className="text-xs text-amber-300/70">
              O processamento de NF-e de entrada está em desenvolvimento. Faça upload do XML da nota fiscal
              para processar os itens e dar entrada automática no estoque.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading ? 'Carregando...' : `${invoices.length} nota${invoices.length !== 1 ? 's' : ''} de entrada`}
          </p>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload XML
                </>
              )}
            </button>
            {uploadError && (
              <p className="text-xs text-red-400 max-w-xs text-right">{uploadError}</p>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Invoices table */}
        {!loading && invoices.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Fornecedor', 'Nº Nota', 'Valor Total', 'Itens', 'Status', 'Data', 'Ações'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const status = STATUS_MAP[inv.status] ?? { label: inv.status, cls: 'bg-slate-900/40 text-slate-400' }
                    return (
                      <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-200 font-medium">{inv.supplier_name || '—'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">{inv.invoice_number || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-300">
                          {inv.total_amount != null
                            ? inv.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{inv.items?.length ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(inv.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/dashboard/armazem/notas-entrada/${inv.id}`}
                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            Abrir
                            <ExternalLink className="w-3 h-3" />
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

        {/* Empty state */}
        {!loading && invoices.length === 0 && (
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Nenhuma nota de entrada</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Faça upload do XML da NF-e de compra para dar entrada no estoque automaticamente
              e vincular os itens aos produtos do armazém.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="glass-card p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-10 bg-white/[0.04] rounded-lg" />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast toast={toast} onClose={() => setToastState(null)} />}
    </div>
  )
}
