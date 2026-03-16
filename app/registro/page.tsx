'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Rocket, Eye, EyeOff, AlertCircle, Loader2, Check,
  Package, BarChart2, Zap, Shield, ShoppingCart,
} from 'lucide-react'

// ── Masks ─────────────────────────────────────────────────────────────────────

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
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

// ── Validators ────────────────────────────────────────────────────────────────

function validateCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calcDigit = (str: string, weights: number[]): number => {
    const sum = Array.from(str).reduce((acc, ch, i) => acc + parseInt(ch) * weights[i], 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return (
    calcDigit(d.slice(0, 12), w1) === parseInt(d[12]) &&
    calcDigit(d.slice(0, 13), w2) === parseInt(d[13])
  )
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const calcDigit = (str: string, weight: number): number => {
    const sum = Array.from(str).reduce((acc, ch, i) => acc + parseInt(ch) * (weight - i), 0)
    const r = (sum * 10) % 11
    return r >= 10 ? 0 : r
  }
  return (
    calcDigit(d.slice(0, 9), 10) === parseInt(d[9]) &&
    calcDigit(d.slice(0, 10), 11) === parseInt(d[10])
  )
}

// ── Password strength ─────────────────────────────────────────────────────────

interface StrengthResult { score: number; label: string; barColor: string; textColor: string }

function getPasswordStrength(pwd: string): StrengthResult {
  if (!pwd) return { score: 0, label: '', barColor: '', textColor: '' }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score: 1, label: 'Fraca',  barColor: 'bg-red-500',   textColor: 'text-red-400'   }
  if (score <= 3) return { score: 2, label: 'Média',  barColor: 'bg-amber-500', textColor: 'text-amber-400' }
  return              { score: 3, label: 'Forte',  barColor: 'bg-green-500', textColor: 'text-green-400' }
}

// ── Static data ───────────────────────────────────────────────────────────────

const SEGMENTS = [
  'Cosméticos e Beleza',
  'Moda e Vestuário',
  'Eletrônicos',
  'Casa e Decoração',
  'Alimentos e Bebidas',
  'Esporte e Lazer',
  'Saúde e Bem-estar',
  'Outros',
]

const PLANS = [
  {
    id:      'explorador',
    name:    'Explorador',
    price:   'Grátis',
    desc:    'Até 10 produtos · 1 marketplace',
    popular: false,
    trial:   false,
  },
  {
    id:      'comandante',
    name:    'Comandante',
    price:   'R$49,90/mês',
    desc:    'Até 500 produtos · Todos os módulos',
    popular: true,
    trial:   true,
  },
]

const BENEFITS = [
  { icon: Rocket,       text: 'Conecte seu Mercado Livre em minutos' },
  { icon: Package,      text: 'Gerencie produtos, pedidos e estoque em um só lugar' },
  { icon: BarChart2,    text: 'Métricas e relatórios em tempo real' },
  { icon: Zap,          text: 'Geração de listagens com inteligência artificial' },
  { icon: Shield,       text: 'Dados protegidos com SSL e criptografia' },
  { icon: ShoppingCart, text: 'Sem cartão de crédito para o plano gratuito' },
]

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0a0b14] border border-white/[0.07] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/50 focus:border-purple-600/50 transition-all'

const SECTION_LABEL_CLS =
  'text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2 after:flex-1 after:h-px after:bg-white/[0.05]'

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1 text-[11px] text-red-400 mt-1.5">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  )
}

function CheckingSpinner() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegistroPage() {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [razaoSocial, setRazaoSocial] = useState('')
  const [docType,     setDocType]     = useState<'cnpj' | 'cpf'>('cnpj')
  const [docNumber,   setDocNumber]   = useState('')
  const [whatsapp,    setWhatsapp]    = useState('')
  const [segment,     setSegment]     = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [plan,        setPlan]        = useState('explorador')
  const [terms,       setTerms]       = useState(false)
  const [loading,     setLoading]     = useState(false)

  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [checking, setChecking] = useState<Record<string, boolean>>({})

  // ── Error helpers ──────────────────────────────────────────────────────────

  const setFieldError = (field: string, msg: string) =>
    setErrors(prev => ({ ...prev, [field]: msg }))

  const clearFieldError = (field: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })

  // ── Duplicate check ────────────────────────────────────────────────────────

  const checkDuplicate = async (apiField: string, uiField: string, value: string) => {
    if (!value) return
    setChecking(prev => ({ ...prev, [uiField]: true }))
    try {
      const res  = await fetch('/api/auth/verificar-duplicata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: apiField, value }),
      })
      const data = await res.json() as { exists: boolean; message?: string }
      if (data.exists && data.message) {
        setFieldError(uiField, data.message)
      } else {
        clearFieldError(uiField)
      }
    } catch { /* ignore network errors silently */ }
    setChecking(prev => ({ ...prev, [uiField]: false }))
  }

  // ── Field handlers ─────────────────────────────────────────────────────────

  const handleDocChange = (v: string) => {
    setDocNumber(docType === 'cnpj' ? maskCNPJ(v) : maskCPF(v))
    clearFieldError('docNumber')
  }

  const handleDocBlur = () => {
    const digits   = docNumber.replace(/\D/g, '')
    const complete = docType === 'cnpj' ? digits.length === 14 : digits.length === 11
    const valid    = docType === 'cnpj' ? validateCNPJ(docNumber) : validateCPF(docNumber)
    if (complete && !valid) {
      setFieldError('docNumber', docType === 'cnpj' ? 'CNPJ inválido' : 'CPF inválido')
      return
    }
    if (complete && valid) {
      void checkDuplicate('document_number', 'docNumber', digits)
    }
  }

  const handleWhatsappChange = (v: string) => {
    setWhatsapp(maskPhone(v))
    clearFieldError('whatsapp')
  }

  const handleWhatsappBlur = () => {
    const digits = whatsapp.replace(/\D/g, '')
    if (digits.length >= 10) void checkDuplicate('whatsapp', 'whatsapp', digits)
  }

  const handleEmailBlur = () => {
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      void checkDuplicate('email', 'email', email)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const ve: Record<string, string> = {}

    if (!razaoSocial.trim()) ve.razaoSocial = 'Campo obrigatório'

    const docDigits  = docNumber.replace(/\D/g, '')
    const docLen     = docType === 'cnpj' ? 14 : 11
    if (docDigits.length !== docLen) {
      ve.docNumber = `${docType.toUpperCase()} incompleto`
    } else if (docType === 'cnpj' ? !validateCNPJ(docNumber) : !validateCPF(docNumber)) {
      ve.docNumber = `${docType.toUpperCase()} inválido`
    }

    const wDigits = whatsapp.replace(/\D/g, '')
    if (wDigits.length < 10) ve.whatsapp = 'WhatsApp inválido'

    if (!segment)                                              ve.segment    = 'Selecione um segmento'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ve.email      = 'E-mail inválido'
    if (password.length < 8)                                  ve.password   = 'Senha deve ter pelo menos 8 caracteres'
    if (password !== confirmPwd)                              ve.confirmPwd = 'As senhas não coincidem'
    if (!terms)                                               ve.terms      = 'Você deve aceitar os termos para continuar'

    // Merge new validations with existing onBlur API errors
    const allErrors = { ...errors, ...ve }
    setErrors(allErrors)

    const relevantFields = ['razaoSocial', 'docNumber', 'whatsapp', 'segment', 'email', 'password', 'confirmPwd', 'terms']
    if (relevantFields.some(k => allErrors[k])) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/registrar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          password,
          razao_social:    razaoSocial.trim(),
          document_type:   docType,
          document_number: docDigits,
          whatsapp:        wDigits,
          segment,
          plan,
        }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || data.error) {
        setFieldError('form', data.error ?? 'Erro ao criar conta. Tente novamente.')
        setLoading(false)
        return
      }
      window.location.href = '/login?success=1'
    } catch {
      setFieldError('form', 'Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  const strength = getPasswordStrength(password)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-[#080b1a] via-[#141b40] to-[#3b1f6a] p-12 relative overflow-hidden">
        {/* Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 22 }, (_, i) => {
            const phi = 0.618033988749895
            return (
              <div
                key={i}
                className="absolute rounded-full bg-white animate-twinkle"
                style={{
                  left:           `${((i * phi * 100) % 100).toFixed(1)}%`,
                  top:            `${((i * phi * phi * 100 + i * 2) % 100).toFixed(1)}%`,
                  width:          1 + (i % 2),
                  height:         1 + (i % 2),
                  animationDelay: `${((i * phi * 6) % 5).toFixed(1)}s`,
                  opacity:        0.5,
                }}
              />
            )
          })}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-purple-500/10" />
          <div className="absolute bottom-0 -left-10 w-80 h-80 rounded-full bg-blue-500/8" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Rocket className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Foguetim ERP
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-7 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <Rocket className="w-7 h-7 text-white" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Decole seu<br />e-commerce
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-xs">
            Crie sua conta grátis e comece a gerenciar seus marketplaces hoje.
          </p>
          <div className="space-y-3.5">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white/70" />
                </div>
                <p className="text-sm text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">© 2026 Foguetim ERP</p>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#03050f]">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a1040] to-purple-700 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
          </Link>

          <div className="w-full max-w-md">

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white mb-1.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                Criar sua conta
              </h1>
              <p className="text-sm text-slate-500">Comece grátis, sem cartão de crédito</p>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-7">

              {/* ── SEÇÃO: DADOS DA EMPRESA ───────────────────────────────── */}
              <div>
                <p className={SECTION_LABEL_CLS}>Dados da Empresa</p>
                <div className="space-y-3.5">

                  {/* Razão Social */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Razão Social / Nome Completo *
                    </label>
                    <input
                      type="text"
                      name="razao-social-reg"
                      autoComplete="off"
                      value={razaoSocial}
                      onChange={e => { setRazaoSocial(e.target.value); clearFieldError('razaoSocial') }}
                      placeholder="Ex: João Silva ou Empresa LTDA"
                      className={INPUT_CLS}
                    />
                    {errors.razaoSocial && <FieldError msg={errors.razaoSocial} />}
                  </div>

                  {/* Tipo de documento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tipo de Documento *
                    </label>
                    <div className="flex w-fit rounded-xl overflow-hidden border border-white/[0.07]">
                      {(['cnpj', 'cpf'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { setDocType(type); setDocNumber(''); clearFieldError('docNumber') }}
                          className={`px-6 py-2 text-sm font-bold transition-all ${
                            docType === type
                              ? 'bg-purple-600 text-white'
                              : 'bg-[#0a0b14] text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Número do documento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      {docType === 'cnpj' ? 'CNPJ *' : 'CPF *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="doc-number-reg"
                        autoComplete="off"
                        value={docNumber}
                        onChange={e => handleDocChange(e.target.value)}
                        onBlur={handleDocBlur}
                        placeholder={docType === 'cnpj' ? '00.000.000/0001-00' : '000.000.000-00'}
                        className={INPUT_CLS}
                      />
                      {checking.docNumber && <CheckingSpinner />}
                    </div>
                    {errors.docNumber && <FieldError msg={errors.docNumber} />}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      WhatsApp *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        name="whatsapp-reg"
                        autoComplete="off"
                        value={whatsapp}
                        onChange={e => handleWhatsappChange(e.target.value)}
                        onBlur={handleWhatsappBlur}
                        placeholder="(00) 00000-0000"
                        className={INPUT_CLS}
                      />
                      {checking.whatsapp && <CheckingSpinner />}
                    </div>
                    {errors.whatsapp && <FieldError msg={errors.whatsapp} />}
                  </div>

                  {/* Segmento */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Segmento *
                    </label>
                    <select
                      name="segment-reg"
                      value={segment}
                      onChange={e => { setSegment(e.target.value); clearFieldError('segment') }}
                      className={`${INPUT_CLS} appearance-none cursor-pointer`}
                    >
                      <option value="" disabled>Selecione seu segmento...</option>
                      {SEGMENTS.map(s => (
                        <option key={s} value={s} className="bg-[#0d0f1a] text-slate-200">{s}</option>
                      ))}
                    </select>
                    {errors.segment && <FieldError msg={errors.segment} />}
                  </div>

                </div>
              </div>

              {/* ── SEÇÃO: DADOS DE ACESSO ────────────────────────────────── */}
              <div>
                <p className={SECTION_LABEL_CLS}>Dados de Acesso</p>
                <div className="space-y-3.5">

                  {/* E-mail */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      E-mail *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email-reg"
                        autoComplete="off"
                        value={email}
                        onChange={e => { setEmail(e.target.value); clearFieldError('email') }}
                        onBlur={handleEmailBlur}
                        placeholder="seu@email.com"
                        className={INPUT_CLS}
                      />
                      {checking.email && <CheckingSpinner />}
                    </div>
                    {errors.email && <FieldError msg={errors.email} />}
                  </div>

                  {/* Senha */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Senha * <span className="normal-case font-normal text-slate-600">(mínimo 8 caracteres)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        name="password-reg"
                        autoComplete="new-password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); clearFieldError('password') }}
                        placeholder="Mínimo 8 caracteres"
                        className={INPUT_CLS}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3].map(s => (
                            <div
                              key={s}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                s <= strength.score ? strength.barColor : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-[10px] font-semibold ${strength.textColor}`}>
                          Senha {strength.label}
                        </p>
                      </div>
                    )}
                    {errors.password && <FieldError msg={errors.password} />}
                  </div>

                  {/* Confirmar senha */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Confirmar Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        name="confirm-password-reg"
                        autoComplete="new-password"
                        value={confirmPwd}
                        onChange={e => { setConfirmPwd(e.target.value); clearFieldError('confirmPwd') }}
                        placeholder="Repita sua senha"
                        className={INPUT_CLS}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPwd && confirmPwd !== password && !errors.confirmPwd && (
                      <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        As senhas não coincidem
                      </p>
                    )}
                    {errors.confirmPwd && <FieldError msg={errors.confirmPwd} />}
                  </div>

                </div>
              </div>

              {/* ── SEÇÃO: PLANO ──────────────────────────────────────────── */}
              <div>
                <p className={SECTION_LABEL_CLS}>Qual plano deseja?</p>
                <div className="space-y-2">
                  {PLANS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all ${
                        plan === p.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/[0.07] bg-[#0d0f1a]/60 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          plan === p.id ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                        }`}>
                          {plan === p.id && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-white">{p.name}</span>
                            {p.popular && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                Popular
                              </span>
                            )}
                            {p.trial && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                                7 dias grátis
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ml-2 ${plan === p.id ? 'text-purple-400' : 'text-slate-400'}`}>
                        {p.price}
                      </span>
                    </button>
                  ))}

                  <p className="text-[11px] text-slate-600 pt-1 pl-1">
                    Planos Almirante e Missão Espacial?{' '}
                    <Link href="/contato" className="text-purple-500 hover:text-purple-400 transition-colors">
                      Fale com vendas
                    </Link>
                  </p>
                </div>
              </div>

              {/* ── TERMOS ────────────────────────────────────────────────── */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    role="checkbox"
                    aria-checked={terms}
                    tabIndex={0}
                    onClick={() => { setTerms(v => !v); clearFieldError('terms') }}
                    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { setTerms(v => !v); clearFieldError('terms') } }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                      terms ? 'border-purple-500 bg-purple-500' : 'border-slate-600'
                    }`}
                  >
                    {terms && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs text-slate-500 leading-relaxed">
                    Declaro ter lido e aceito os{' '}
                    <Link
                      href="/termos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
                    >
                      Termos de Uso
                    </Link>
                    {' '}e a{' '}
                    <Link
                      href="/privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
                    >
                      Política de Privacidade
                    </Link>
                  </span>
                </label>
                {errors.terms && <FieldError msg={errors.terms} />}
              </div>

              {/* ── FORM ERROR ────────────────────────────────────────────── */}
              {errors.form && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {errors.form}
                </div>
              )}

              {/* ── SUBMIT ────────────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700 transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</>
                  : 'Criar minha conta gratuitamente →'
                }
              </button>

            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              Já tem conta?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">
                Entrar
              </Link>
            </p>

          </div>
        </div>
      </div>

    </div>
  )
}
