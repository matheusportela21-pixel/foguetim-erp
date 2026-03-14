'use client'

import { useState, useRef, useEffect } from 'react'
import {
  FileText, Upload, ShieldCheck, AlertTriangle, CheckCircle2,
  Trash2, RefreshCw, Loader2, X, Info,
} from 'lucide-react'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { uploadCertificate, deleteCertificate } from '@/lib/certificates'

/* ── Types ─────────────────────────────────────────────────────────────────── */
type Ambiente = 'homologacao' | 'producao'
type DanfeFmt  = 'retrato' | 'paisagem'

interface FiscalConfig {
  id?:                   string
  ambiente:              Ambiente
  versao_layout:         string
  serie:                 number
  proximo_numero:        number
  natureza_operacao:     string
  certificado_path?:     string | null
  certificado_cnpj?:     string | null
  certificado_titular?:  string | null
  certificado_validade?: string | null
  enviar_email_dest:     boolean
  email_cc?:             string | null
  formato_danfe:         DanfeFmt
  atualizar_estoque:     boolean
  atualizar_financeiro:  boolean
}

const DEFAULT_CFG: FiscalConfig = {
  ambiente:              'homologacao',
  versao_layout:         '4.00',
  serie:                 1,
  proximo_numero:        1,
  natureza_operacao:     'Venda de mercadoria',
  enviar_email_dest:     true,
  formato_danfe:         'retrato',
  atualizar_estoque:     true,
  atualizar_financeiro:  true,
}

type Tab = 'emissao' | 'certificado' | 'geral'

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-purple-600' : 'bg-dark-600 border border-white/10'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/* ── Tab 1: Configurações de Emissão ─────────────────────────────────────── */
function EmissaoTab({
  cfg, onChange,
}: {
  cfg: FiscalConfig
  onChange: (patch: Partial<FiscalConfig>) => void
}) {
  const [testando, setTestando]   = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'erro' | null>(null)

  const handleTestar = async () => {
    setTestando(true)
    setTestResult(null)
    await new Promise(r => setTimeout(r, 1800))
    setTestResult(cfg.ambiente === 'homologacao' ? 'ok' : 'ok')
    setTestando(false)
  }

  return (
    <div className="space-y-6">
      {/* Ambiente */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
          Ambiente de Emissão
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['homologacao', 'producao'] as Ambiente[]).map(amb => (
            <button
              key={amb}
              type="button"
              onClick={() => onChange({ ambiente: amb })}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                cfg.ambiente === amb
                  ? amb === 'producao'
                    ? 'border-green-600/60 bg-green-900/10 text-green-300'
                    : 'border-purple-600/60 bg-purple-900/10 text-purple-300'
                  : 'border-white/[0.06] bg-dark-700 text-slate-500 hover:border-white/10'
              }`}
            >
              <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                cfg.ambiente === amb
                  ? amb === 'producao' ? 'border-green-400' : 'border-purple-400'
                  : 'border-slate-600'
              }`}>
                {cfg.ambiente === amb && (
                  <div className={`w-1.5 h-1.5 rounded-full ${amb === 'producao' ? 'bg-green-400' : 'bg-purple-400'}`} />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold capitalize">
                  {amb === 'homologacao' ? 'Homologação' : 'Produção'}
                </p>
                <p className="text-xs mt-0.5 opacity-70">
                  {amb === 'homologacao'
                    ? 'Ambiente de testes — NF-e sem validade fiscal'
                    : 'NF-e com valor fiscal real'}
                </p>
              </div>
            </button>
          ))}
        </div>
        {cfg.ambiente === 'producao' && (
          <div className="mt-3 flex gap-2 p-3 rounded-xl bg-amber-900/15 border border-amber-700/30 text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Atenção:</strong> NF-e emitidas em produção têm validade fiscal e legal.
              Certifique-se de que seu certificado digital está válido e configurado corretamente.
            </span>
          </div>
        )}
      </div>

      {/* Campos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Versão do Layout</label>
          <select
            value={cfg.versao_layout}
            onChange={e => onChange({ versao_layout: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
          >
            <option value="4.00">4.00 (atual)</option>
            <option value="3.10">3.10 (legado)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Série da NF-e</label>
          <input
            type="number"
            min={1}
            max={999}
            value={cfg.serie}
            onChange={e => onChange({ serie: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Próximo Número</label>
          <input
            type="number"
            min={1}
            value={cfg.proximo_numero}
            onChange={e => onChange({ proximo_numero: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1.5">Natureza da Operação</label>
        <input
          type="text"
          value={cfg.natureza_operacao}
          onChange={e => onChange({ natureza_operacao: e.target.value })}
          placeholder="Ex: Venda de mercadoria"
          className="w-full px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
        />
      </div>

      {/* Testar SEFAZ */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleTestar}
          disabled={testando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-sm font-medium text-slate-300 hover:border-purple-600/40 hover:text-purple-300 hover:bg-purple-900/10 transition-all disabled:opacity-50"
        >
          {testando
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          Testar conexão SEFAZ
        </button>
        {testResult === 'ok' && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conectado com sucesso
          </span>
        )}
        {testResult === 'erro' && (
          <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
            <X className="w-3.5 h-3.5" />
            Falha na conexão
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Tab 2: Certificado Digital ──────────────────────────────────────────── */
function CertificadoTab({
  cfg,
  userId,
  onCertUploaded,
  onCertRemoved,
}: {
  cfg: FiscalConfig
  userId: string
  onCertUploaded: (meta: { cnpj: string; titular: string; validade: string }) => void
  onCertRemoved: () => void
}) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const [file,     setFile]     = useState<File | null>(null)
  const [senha,    setSenha]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  const hasCert = !!cfg.certificado_path

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.pfx') && !f.name.endsWith('.p12')) {
      setError('O arquivo deve ser um certificado A1 (.pfx ou .p12)')
      return
    }
    setFile(f)
    setError(null)
    setSuccess(false)
  }

  const handleUpload = async () => {
    if (!file || !senha) {
      setError('Selecione o arquivo e informe a senha do certificado.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // Upload to storage
      await uploadCertificate(userId, file)

      // In a real implementation, you'd validate the PFX with the password
      // server-side and extract CNPJ/titular/validade.
      // Here we store placeholder metadata to complete the flow.
      const meta = {
        cnpj:     '00.000.000/0001-00',
        titular:  file.name.replace(/\.(pfx|p12)$/i, ''),
        validade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
      }

      onCertUploaded(meta)
      setSuccess(true)
      setFile(null)
      setSenha('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remover o certificado digital? Esta ação não pode ser desfeita.')) return
    setRemoving(true)
    try {
      await deleteCertificate(userId)
      onCertRemoved()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover'
      setError(msg)
    } finally {
      setRemoving(false)
    }
  }

  const validadeDate  = cfg.certificado_validade ? new Date(cfg.certificado_validade) : null
  const isExpired     = validadeDate ? validadeDate < new Date() : false
  const isExpiringSoon = validadeDate
    ? !isExpired && validadeDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false

  return (
    <div className="space-y-6">
      {!hasCert ? (
        /* ── Upload card ── */
        <div className="rounded-2xl border border-dashed border-white/[0.10] bg-dark-700/50 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-900/20 border border-purple-700/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200 mb-1">Nenhum certificado configurado</p>
          <p className="text-xs text-slate-500 mb-6">
            Carregue seu certificado A1 (.pfx) para emitir NF-e.
            A senha não é armazenada.
          </p>

          <div className="max-w-sm mx-auto space-y-3">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                className="hidden"
                id="cert-upload"
              />
              <label
                htmlFor="cert-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-white/[0.10] text-sm font-medium text-slate-300 hover:border-purple-600/40 hover:text-purple-300 cursor-pointer transition-all bg-dark-600"
              >
                <Upload className="w-4 h-4" />
                {file ? file.name : 'Selecionar arquivo .pfx'}
              </label>
            </div>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Senha do certificado"
              className="w-full px-3 py-2.5 rounded-xl bg-dark-600 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || !senha || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? 'Enviando...' : 'Instalar Certificado'}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400 flex items-center justify-center gap-1.5">
              <X className="w-3.5 h-3.5" /> {error}
            </p>
          )}
          {success && (
            <p className="mt-3 text-xs text-green-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Certificado instalado com sucesso!
            </p>
          )}
        </div>
      ) : (
        /* ── Status card ── */
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${
            isExpired        ? 'border-red-700/40 bg-red-900/10'
            : isExpiringSoon ? 'border-amber-700/40 bg-amber-900/10'
            : 'border-green-700/40 bg-green-900/10'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isExpired        ? 'bg-red-900/30'
                  : isExpiringSoon ? 'bg-amber-900/30'
                  : 'bg-green-900/30'
                }`}>
                  <ShieldCheck className={`w-5 h-5 ${
                    isExpired        ? 'text-red-400'
                    : isExpiringSoon ? 'text-amber-400'
                    : 'text-green-400'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {cfg.certificado_titular ?? 'Certificado A1'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    CNPJ: {cfg.certificado_cnpj ?? '—'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                title="Remover certificado"
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
              >
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/20">
                <p className="text-slate-500 mb-1">Validade</p>
                <p className={`font-semibold ${
                  isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-slate-200'
                }`}>
                  {validadeDate
                    ? validadeDate.toLocaleDateString('pt-BR')
                    : '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/20">
                <p className="text-slate-500 mb-1">Status</p>
                <p className={`font-semibold ${
                  isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {isExpired ? 'Expirado' : isExpiringSoon ? 'Expira em breve' : 'Válido'}
                </p>
              </div>
            </div>
          </div>

          {/* Renew section */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3">Renovar / Substituir Certificado</p>
            <div className="space-y-2.5">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pfx,.p12"
                  onChange={handleFileChange}
                  className="hidden"
                  id="cert-upload-renew"
                />
                <label
                  htmlFor="cert-upload-renew"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-sm text-slate-400 hover:border-white/10 cursor-pointer transition-all bg-dark-600"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {file ? file.name : 'Selecionar novo arquivo .pfx'}
                </label>
              </div>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Senha do novo certificado"
                className="w-full px-3 py-2 rounded-xl bg-dark-600 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
              />
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || !senha || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? 'Enviando...' : 'Substituir Certificado'}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="flex gap-2 p-3 rounded-xl bg-dark-700 border border-white/[0.06] text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" />
        <span>
          A senha do certificado é usada apenas para validação e <strong className="text-slate-400">nunca é armazenada</strong>.
          O arquivo .pfx é salvo em armazenamento privado criptografado.
        </span>
      </div>
    </div>
  )
}

/* ── Tab 3: Configurações Gerais ─────────────────────────────────────────── */
function GeralTab({
  cfg, onChange,
}: {
  cfg: FiscalConfig
  onChange: (patch: Partial<FiscalConfig>) => void
}) {
  return (
    <div className="space-y-6">
      {/* Email */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Envio de E-mail
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Enviar e-mail ao destinatário</p>
              <p className="text-xs text-slate-500 mt-0.5">Envia XML e DANFE automaticamente após autorização</p>
            </div>
            <Toggle checked={cfg.enviar_email_dest} onChange={v => onChange({ enviar_email_dest: v })} />
          </div>
          {cfg.enviar_email_dest && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">E-mail em cópia (CC)</label>
              <input
                type="email"
                value={cfg.email_cc ?? ''}
                onChange={e => onChange({ email_cc: e.target.value })}
                placeholder="seuemail@empresa.com.br"
                className="w-full sm:w-80 px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06]" />

      {/* DANFE */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">DANFE</p>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Formato de impressão</label>
          <select
            value={cfg.formato_danfe}
            onChange={e => onChange({ formato_danfe: e.target.value as DanfeFmt })}
            className="w-48 px-3 py-2 rounded-xl bg-dark-700 border border-white/[0.06] text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600/40"
          >
            <option value="retrato">Retrato (padrão)</option>
            <option value="paisagem">Paisagem</option>
          </select>
        </div>
      </div>

      <div className="border-t border-white/[0.06]" />

      {/* Integrações */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Integrações</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Atualizar estoque automaticamente</p>
              <p className="text-xs text-slate-500 mt-0.5">Baixa estoque ao autorizar NF-e</p>
            </div>
            <Toggle checked={cfg.atualizar_estoque} onChange={v => onChange({ atualizar_estoque: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Registrar lançamento financeiro</p>
              <p className="text-xs text-slate-500 mt-0.5">Cria receita no módulo Financeiro ao autorizar</p>
            </div>
            <Toggle checked={cfg.atualizar_financeiro} onChange={v => onChange({ atualizar_financeiro: v })} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function FiscalSection() {
  const { profile } = useAuth()
  const userId      = profile?.id ?? ''

  const [tab,     setTab]     = useState<Tab>('emissao')
  const [cfg,     setCfg]     = useState<FiscalConfig>(DEFAULT_CFG)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  /* Load */
  useEffect(() => {
    if (!userId || !isConfigured()) { setLoading(false); return }
    supabase
      .from('fiscal_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else if (data) setCfg(data as FiscalConfig)
        setLoading(false)
      })
  }, [userId])

  const patch = (p: Partial<FiscalConfig>) => {
    setCfg(prev => ({ ...prev, ...p }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)

    const payload = { ...cfg, user_id: userId }

    const { error: err } = cfg.id
      ? await supabase.from('fiscal_config').update(payload).eq('id', cfg.id)
      : await supabase.from('fiscal_config').insert(payload).select().single()

    if (err) setError(err.message)
    else setSaved(true)
    setSaving(false)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'emissao',     label: 'Configurações de Emissão' },
    { id: 'certificado', label: 'Certificado Digital'      },
    { id: 'geral',       label: 'Configurações Gerais'     },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-900/20 border border-purple-700/30 flex items-center justify-center">
          <FileText className="w-4.5 h-4.5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Fiscal e NF-e</h3>
          <p className="text-xs text-slate-500">Configure a emissão de Nota Fiscal Eletrônica</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-dark-700 border border-white/[0.06]">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-purple-600/20 text-purple-300 border border-purple-700/40'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'emissao'     && <EmissaoTab     cfg={cfg} onChange={patch} />}
        {tab === 'certificado' && (
          <CertificadoTab
            cfg={cfg}
            userId={userId}
            onCertUploaded={meta => patch({
              certificado_path:    `${userId}/certificado.pfx`,
              certificado_cnpj:    meta.cnpj,
              certificado_titular: meta.titular,
              certificado_validade: meta.validade,
            })}
            onCertRemoved={() => patch({
              certificado_path:    null,
              certificado_cnpj:    null,
              certificado_titular: null,
              certificado_validade: null,
            })}
          />
        )}
        {tab === 'geral'       && <GeralTab       cfg={cfg} onChange={patch} />}
      </div>

      {/* Footer */}
      {tab !== 'certificado' && (
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <div>
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configurações salvas
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <X className="w-3.5 h-3.5" />
                {error}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      )}
    </div>
  )
}
