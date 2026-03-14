'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Check, AlertCircle, Upload, X, ImageIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase, isConfigured } from '@/lib/supabase'
import type { ExtendedProfile } from '../types'
import { INPUT_CLS, LABEL_CLS } from '../types'

/* ── Constants ─────────────────────────────────────────────────────────────── */

const UF_LIST = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
]

const SEGMENTS = [
  { value: 'modas_vestuario',        label: 'Moda e vestuário' },
  { value: 'eletronicos_tecnologia', label: 'Eletrônicos e tecnologia' },
  { value: 'beleza_cosmeticos',      label: 'Beleza e cosméticos' },
  { value: 'casa_decoracao',         label: 'Casa e decoração' },
  { value: 'alimentos_bebidas',      label: 'Alimentos e bebidas' },
  { value: 'saude_bem_estar',        label: 'Saúde e bem-estar' },
  { value: 'esportes_lazer',         label: 'Esportes e lazer' },
  { value: 'brinquedos_games',       label: 'Brinquedos e games' },
  { value: 'pet_shop',               label: 'Pet shop' },
  { value: 'ferramentas_construcao', label: 'Ferramentas e construção' },
  { value: 'livros_papelaria',       label: 'Livros e papelaria' },
  { value: 'automoveis_pecas',       label: 'Automóveis e peças' },
  { value: 'joias_acessorios',       label: 'Joias e acessórios' },
  { value: 'outros',                 label: 'Outros' },
]

const REGIMES = [
  { value: 'simples_i',       label: 'Simples Nacional (Anexo I) — 6%' },
  { value: 'simples_ii',      label: 'Simples Nacional (Anexo II) — 6%' },
  { value: 'simples_iii',     label: 'Simples Nacional (Anexo III) — 6%' },
  { value: 'simples_iv',      label: 'Simples Nacional (Anexo IV) — 4,5%' },
  { value: 'simples_v',       label: 'Simples Nacional (Anexo V) — 15,5%' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real',      label: 'Lucro Real' },
  { value: 'mei',             label: 'MEI' },
]

/* ── Masks ─────────────────────────────────────────────────────────────────── */

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}

function maskWhatsApp(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/* ── Validators ─────────────────────────────────────────────────────────────── */

function validateCNPJ(raw: string): boolean {
  const n = raw.replace(/\D/g, '')
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false
  const calc = (str: string, weights: number[]): number => {
    let sum = 0
    for (let i = 0; i < weights.length; i++) sum += Number(str[i]) * weights[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = calc(n, [5,4,3,2,9,8,7,6,5,4,3,2])
  const d2 = calc(n, [6,5,4,3,2,9,8,7,6,5,4,3,2])
  return Number(n[12]) === d1 && Number(n[13]) === d2
}

function validateCPF(raw: string): boolean {
  const n = raw.replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false
  const calc = (str: string, len: number): number => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(str[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return Number(n[9]) === calc(n, 9) && Number(n[10]) === calc(n, 10)
}

/* ── ViaCEP ─────────────────────────────────────────────────────────────────── */

interface ViaCepResponse {
  erro?: boolean
  uf?: string
  localidade?: string
  bairro?: string
  logradouro?: string
}

/* ── Form state ─────────────────────────────────────────────────────────────── */

interface EmpresaForm {
  razao_social: string
  nome_fantasia: string
  document_type: 'cnpj' | 'cpf'
  document_number: string
  inscricao_estadual: string
  inscricao_estadual_isento: boolean
  inscricao_municipal: string
  cnae: string
  regime_tributario: string
  segment: string
  cep: string
  uf: string
  cidade: string
  bairro: string
  endereco: string
  numero: string
  complemento: string
  pessoa_contato: string
  telefone: string
  whatsapp: string
  email_contato: string
  site: string
  logo_url: string
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function EmpresaSection() {
  const { profile } = useAuth()
  const p = profile as unknown as ExtendedProfile

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docError, setDocError]   = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [toast, setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const [form, setForm] = useState<EmpresaForm>({
    razao_social:              p?.razao_social ?? '',
    nome_fantasia:             p?.nome_fantasia ?? '',
    document_type:             p?.document_type ?? 'cnpj',
    document_number:           p?.document_number ?? '',
    inscricao_estadual:        p?.inscricao_estadual ?? '',
    inscricao_estadual_isento: p?.inscricao_estadual_isento ?? false,
    inscricao_municipal:       p?.inscricao_municipal ?? '',
    cnae:                      p?.cnae ?? '',
    regime_tributario:         p?.regime_tributario ?? '',
    segment:                   p?.segment ?? '',
    cep:                       p?.cep ?? '',
    uf:                        p?.uf ?? '',
    cidade:                    p?.cidade ?? '',
    bairro:                    p?.bairro ?? '',
    endereco:                  p?.endereco ?? '',
    numero:                    p?.numero ?? '',
    complemento:               p?.complemento ?? '',
    pessoa_contato:            p?.pessoa_contato ?? '',
    telefone:                  p?.telefone ?? '',
    whatsapp:                  p?.whatsapp ?? '',
    email_contato:             p?.email ?? '',
    site:                      p?.site ?? '',
    logo_url:                  p?.logo_url ?? '',
  })

  // Re-init when profile loads
  useEffect(() => {
    if (!profile) return
    const pr = profile as unknown as ExtendedProfile
    setForm(f => ({
      ...f,
      razao_social:              pr.razao_social ?? f.razao_social,
      nome_fantasia:             pr.nome_fantasia ?? f.nome_fantasia,
      document_type:             pr.document_type ?? f.document_type,
      document_number:           pr.document_number ?? f.document_number,
      inscricao_estadual:        pr.inscricao_estadual ?? f.inscricao_estadual,
      inscricao_estadual_isento: pr.inscricao_estadual_isento ?? f.inscricao_estadual_isento,
      inscricao_municipal:       pr.inscricao_municipal ?? f.inscricao_municipal,
      cnae:                      pr.cnae ?? f.cnae,
      regime_tributario:         pr.regime_tributario ?? f.regime_tributario,
      segment:                   pr.segment ?? f.segment,
      cep:                       pr.cep ?? f.cep,
      uf:                        pr.uf ?? f.uf,
      cidade:                    pr.cidade ?? f.cidade,
      bairro:                    pr.bairro ?? f.bairro,
      endereco:                  pr.endereco ?? f.endereco,
      numero:                    pr.numero ?? f.numero,
      complemento:               pr.complemento ?? f.complemento,
      pessoa_contato:            pr.pessoa_contato ?? f.pessoa_contato,
      telefone:                  pr.telefone ?? f.telefone,
      whatsapp:                  pr.whatsapp ?? f.whatsapp,
      email_contato:             pr.email ?? f.email_contato,
      site:                      pr.site ?? f.site,
      logo_url:                  pr.logo_url ?? f.logo_url,
    }))
  }, [profile])

  const set = (key: keyof EmpresaForm, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }))

  /* ── CEP Lookup ──────────────────────────────────────────────────────── */
  const lookupCep = useCallback(async (raw: string) => {
    const clean = raw.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json() as ViaCepResponse
      if (data.erro) { showToast('error', 'CEP não encontrado.'); return }
      setForm(f => ({
        ...f,
        uf:       data.uf        ?? f.uf,
        cidade:   data.localidade ?? f.cidade,
        bairro:   data.bairro    ?? f.bairro,
        endereco: data.logradouro ?? f.endereco,
      }))
    } catch {
      showToast('error', 'Erro ao buscar CEP. Verifique sua conexão.')
    } finally {
      setCepLoading(false)
    }
  }, [showToast])

  /* ── Logo Upload ──────────────────────────────────────────────────────── */
  const handleLogoFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      showToast('error', 'Apenas JPG ou PNG são aceitos.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Arquivo muito grande. Máximo 2 MB.')
      return
    }

    const checkDimensions = (f: File): Promise<boolean> =>
      new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = e => {
          const img = new Image()
          img.onload = () => resolve(img.width >= 120 && img.height >= 58)
          img.src = e.target?.result as string
        }
        reader.readAsDataURL(f)
      })

    const ok = await checkDimensions(file)
    if (!ok) { showToast('error', 'Dimensões mínimas: 120×58 px.'); return }

    if (!isConfigured() || !profile?.id) {
      // Preview only in dev mode
      const reader = new FileReader()
      reader.onload = e => set('logo_url', e.target?.result as string)
      reader.readAsDataURL(file)
      return
    }

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `${profile.id}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('company-logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw new Error(upErr.message)
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(path)
      set('logo_url', publicUrl)
      showToast('success', 'Logo enviada com sucesso!')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao enviar logo.')
    } finally {
      setUploading(false)
    }
  }, [profile, showToast])

  /* ── Save ──────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    const docClean = form.document_number.replace(/\D/g, '')
    const valid = form.document_type === 'cnpj' ? validateCNPJ(docClean) : validateCPF(docClean)
    if (docClean && !valid) {
      setDocError(`${form.document_type.toUpperCase()} inválido.`)
      return
    }
    setDocError('')

    if (!isConfigured() || !profile?.id) {
      showToast('success', 'Dados salvos com sucesso! (modo dev)')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          razao_social:              form.razao_social,
          nome_fantasia:             form.nome_fantasia,
          document_type:             form.document_type,
          document_number:           form.document_number.replace(/\D/g, ''),
          inscricao_estadual:        form.inscricao_estadual_isento ? null : form.inscricao_estadual,
          inscricao_estadual_isento: form.inscricao_estadual_isento,
          inscricao_municipal:       form.inscricao_municipal,
          cnae:                      form.cnae,
          regime_tributario:         form.regime_tributario,
          segment:                   form.segment,
          cep:                       form.cep.replace(/\D/g, ''),
          uf:                        form.uf,
          cidade:                    form.cidade,
          bairro:                    form.bairro,
          endereco:                  form.endereco,
          numero:                    form.numero,
          complemento:               form.complemento,
          pessoa_contato:            form.pessoa_contato,
          telefone:                  form.telefone,
          whatsapp:                  form.whatsapp,
          site:                      form.site,
          logo_url:                  form.logo_url,
        })
        .eq('id', profile.id)
      if (error) throw new Error(error.message)
      showToast('success', 'Dados salvos com sucesso!')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-white text-base mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
          Dados da Empresa
        </h3>
        <p className="text-xs text-slate-600">Informações fiscais e de contato do seu negócio</p>
      </div>

      {/* ── Identificação ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Identificação</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Razão Social <span className="text-red-400">*</span></label>
            <input className={INPUT_CLS} value={form.razao_social}
              onChange={e => set('razao_social', e.target.value)} placeholder="Nome jurídico da empresa" />
          </div>
          <div>
            <label className={LABEL_CLS}>Nome Fantasia</label>
            <input className={INPUT_CLS} value={form.nome_fantasia}
              onChange={e => set('nome_fantasia', e.target.value)} placeholder="Nome comercial" />
          </div>
        </div>

        {/* Doc type toggle */}
        <div>
          <label className={LABEL_CLS}>Tipo de Pessoa</label>
          <div className="flex gap-4">
            {(['cnpj', 'cpf'] as const).map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="doc_type" value={t} checked={form.document_type === t}
                  onChange={() => { set('document_type', t); set('document_number', ''); setDocError('') }}
                  className="accent-purple-500" />
                <span className="text-sm text-slate-300 uppercase font-semibold">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>
              {form.document_type === 'cnpj' ? 'CNPJ' : 'CPF'}{' '}
              <span className="text-red-400">*</span>
            </label>
            <input
              className={`${INPUT_CLS} ${docError ? 'border-red-500/60' : ''}`}
              value={form.document_number}
              onChange={e => {
                const masked = form.document_type === 'cnpj'
                  ? maskCNPJ(e.target.value)
                  : maskCPF(e.target.value)
                set('document_number', masked)
                setDocError('')
              }}
              onBlur={() => {
                const clean = form.document_number.replace(/\D/g, '')
                if (!clean) return
                const ok = form.document_type === 'cnpj' ? validateCNPJ(clean) : validateCPF(clean)
                if (!ok) setDocError(`${form.document_type.toUpperCase()} inválido.`)
              }}
              placeholder={form.document_type === 'cnpj' ? '00.000.000/0001-00' : '000.000.000-00'}
            />
            {docError && <p className="text-xs text-red-400 mt-1">{docError}</p>}
          </div>
          <div>
            <label className={LABEL_CLS}>CNAE</label>
            <input className={INPUT_CLS} value={form.cnae}
              onChange={e => set('cnae', e.target.value)} placeholder="ex: 4789-0/99" />
          </div>
        </div>

        {/* Inscrições */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Inscrição Estadual</label>
            <input
              className={INPUT_CLS}
              value={form.inscricao_estadual_isento ? '' : form.inscricao_estadual}
              onChange={e => set('inscricao_estadual', e.target.value)}
              disabled={form.inscricao_estadual_isento}
              placeholder={form.inscricao_estadual_isento ? 'Isento' : 'Número da IE'}
            />
            <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
              <input type="checkbox"
                checked={form.inscricao_estadual_isento}
                onChange={e => set('inscricao_estadual_isento', e.target.checked)}
                className="accent-purple-500" />
              <span className="text-xs text-slate-500">Isento</span>
            </label>
          </div>
          <div>
            <label className={LABEL_CLS}>Inscrição Municipal</label>
            <input className={INPUT_CLS} value={form.inscricao_municipal}
              onChange={e => set('inscricao_municipal', e.target.value)} placeholder="Número do IM" />
          </div>
        </div>

        {/* Regime + Segmento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Regime Tributário</label>
            <select className={INPUT_CLS} value={form.regime_tributario}
              onChange={e => set('regime_tributario', e.target.value)}>
              <option value="">Selecione...</option>
              {REGIMES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Segmento</label>
            <select className={INPUT_CLS} value={form.segment}
              onChange={e => set('segment', e.target.value)}>
              <option value="">Selecione...</option>
              {SEGMENTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <div className="border-t border-white/[0.05]" />

      {/* ── Endereço ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Endereço</legend>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLS}>CEP <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                className={INPUT_CLS}
                value={form.cep}
                onChange={e => set('cep', maskCep(e.target.value))}
                onBlur={e => lookupCep(e.target.value)}
                placeholder="00000-000"
              />
              {cepLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400 animate-spin" />
              )}
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>UF <span className="text-red-400">*</span></label>
            <select className={INPUT_CLS} value={form.uf} onChange={e => set('uf', e.target.value)}>
              <option value="">Selecione</option>
              {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Cidade <span className="text-red-400">*</span></label>
            <input className={INPUT_CLS} value={form.cidade} onChange={e => set('cidade', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLS}>Bairro <span className="text-red-400">*</span></label>
            <input className={INPUT_CLS} value={form.bairro} onChange={e => set('bairro', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Logradouro <span className="text-red-400">*</span></label>
            <input className={INPUT_CLS} value={form.endereco} onChange={e => set('endereco', e.target.value)}
              placeholder="Rua, Avenida, etc." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Número <span className="text-red-400">*</span></label>
            <input className={INPUT_CLS} value={form.numero} onChange={e => set('numero', e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLS}>Complemento</label>
            <input className={INPUT_CLS} value={form.complemento} onChange={e => set('complemento', e.target.value)}
              placeholder="Sala, Andar, etc." />
          </div>
        </div>
      </fieldset>

      <div className="border-t border-white/[0.05]" />

      {/* ── Contato ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contato</legend>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Pessoa de Contato</label>
            <input className={INPUT_CLS} value={form.pessoa_contato}
              onChange={e => set('pessoa_contato', e.target.value)} placeholder="Nome do responsável" />
          </div>
          <div>
            <label className={LABEL_CLS}>Telefone</label>
            <input className={INPUT_CLS} value={form.telefone}
              onChange={e => set('telefone', maskPhone(e.target.value))} placeholder="(00) 0000-0000" />
          </div>
          <div>
            <label className={LABEL_CLS}>WhatsApp</label>
            <input className={INPUT_CLS} value={form.whatsapp}
              onChange={e => set('whatsapp', maskWhatsApp(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label className={LABEL_CLS}>E-mail de Contato</label>
            <input type="email" className={INPUT_CLS} value={form.email_contato}
              onChange={e => set('email_contato', e.target.value)} placeholder="contato@empresa.com" />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL_CLS}>Site</label>
            <input type="url" className={INPUT_CLS} value={form.site}
              onChange={e => set('site', e.target.value)} placeholder="https://www.empresa.com.br" />
          </div>
        </div>
      </fieldset>

      <div className="border-t border-white/[0.05]" />

      {/* ── Logo ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Logo da Empresa</legend>
        <p className="text-xs text-slate-600">JPG ou PNG · Mínimo 120×58 px · Máximo 2 MB</p>

        {/* Preview */}
        {form.logo_url && (
          <div className="flex items-center gap-4 mb-3">
            <div className="w-28 h-14 rounded-xl bg-dark-700 border border-white/[0.08] flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <button
              type="button"
              onClick={() => set('logo_url', '')}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Remover
            </button>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) void handleLogoFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
            dragOver
              ? 'border-purple-500 bg-purple-500/5'
              : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-600" />
          )}
          <p className="text-sm text-slate-500">
            {uploading ? 'Enviando...' : 'Arraste a imagem aqui ou clique para selecionar'}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void handleLogoFile(file)
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Alterar imagem
        </button>
      </fieldset>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!profile) return
            const pr = profile as unknown as ExtendedProfile
            setForm(f => ({ ...f, razao_social: pr.razao_social ?? f.razao_social }))
          }}
          className="px-5 py-2.5 rounded-xl text-sm text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-all"
        >
          Cancelar
        </button>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold text-white transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success'
            ? <Check className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
