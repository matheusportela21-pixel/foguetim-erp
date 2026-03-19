'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Shield, X } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────────────── */
interface OtpConfirmationProps {
  actionType: string
  targetType?: string
  targetId?: string
  onVerified: () => void
  onCancel: () => void
  title: string
  description: string
}

type Phase = 'idle' | 'requesting' | 'verifying' | 'blocked'

/* ── Component ───────────────────────────────────────────────────────────── */
export default function OtpConfirmation({
  actionType,
  targetType,
  targetId,
  onVerified,
  onCancel,
  title,
  description,
}: OtpConfirmationProps) {
  const [digits, setDigits]             = useState<string[]>(Array(6).fill(''))
  const [otpId, setOtpId]               = useState<string | null>(null)
  const [phase, setPhase]               = useState<Phase>('idle')
  const [error, setError]               = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)
  const [cooldown, setCooldown]         = useState(0)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const code = digits.join('')
  const isComplete = code.length === 6 && digits.every(d => d !== '')

  /* ── helpers ── */
  function startCooldown() {
    setCooldown(60)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  /* ── request OTP ── */
  const requestOtp = useCallback(async () => {
    setPhase('requesting')
    setError(null)
    try {
      const res = await fetch('/api/security/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          target_type: targetType ?? null,
          target_id: targetId ?? null,
        }),
      })
      const data = await res.json() as { otp_id?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao solicitar código')
      setOtpId(data.otp_id ?? null)
      startCooldown()
      setPhase('idle')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao solicitar código')
      setPhase('idle')
    }
  }, [actionType, targetType, targetId])

  /* ── mount: auto-request ── */
  useEffect(() => {
    requestOtp()
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [requestOtp])

  /* ── auto-submit on complete ── */
  useEffect(() => {
    if (isComplete && phase === 'idle') {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete])

  /* ── verify ── */
  async function handleVerify() {
    if (!isComplete || !otpId) return
    setPhase('verifying')
    setError(null)
    try {
      const res = await fetch('/api/security/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_id: otpId, code }),
      })
      const data = await res.json() as {
        verified?: boolean
        blocked?: boolean
        attempts_left?: number
        error?: string
      }

      if (data.blocked) {
        setPhase('blocked')
        setError('Conta bloqueada por excesso de tentativas. Tente novamente mais tarde.')
        return
      }

      if (data.verified) {
        setPhase('idle')
        onVerified()
        return
      }

      const remaining = data.attempts_left ?? null
      setAttemptsLeft(remaining)
      setError(data.error ?? 'Código incorreto. Verifique e tente novamente.')
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
      setPhase('idle')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao verificar código')
      setPhase('idle')
    }
  }

  /* ── resend ── */
  async function handleResend() {
    if (cooldown > 0 || phase === 'requesting') return
    setDigits(Array(6).fill(''))
    setError(null)
    setAttemptsLeft(null)
    await requestOtp()
    inputRefs.current[0]?.focus()
  }

  /* ── digit input handlers ── */
  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = clean
    setDigits(next)
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
        const next = [...digits]
        next[index - 1] = ''
        setDigits(next)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = Array(6).fill('')
    pasted.split('').forEach((char, i) => { next[i] = char })
    setDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  const isLoading = phase === 'requesting' || phase === 'verifying'
  const isBlocked = phase === 'blocked'

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm rounded-2xl p-6 space-y-5 relative">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          aria-label="Cancelar"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        {/* Icon + header */}
        <div className="flex flex-col items-center text-center gap-3 pt-1">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
            isBlocked
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-violet-500/10 border-violet-500/30'
          }`}>
            <Shield className={`w-7 h-7 ${isBlocked ? 'text-red-400' : 'text-violet-400'}`} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-['Sora']">{title}</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs">{description}</p>
          </div>
        </div>

        {/* OTP inputs */}
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={isLoading || isBlocked}
              className={`w-10 h-12 text-center text-lg font-bold rounded-xl border transition-all
                input-cyber
                ${digit ? 'border-violet-500/50 text-violet-300' : ''}
                ${error ? 'border-red-500/40' : ''}
                disabled:opacity-40 disabled:cursor-not-allowed
                focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20`}
              aria-label={`Dígito ${i + 1}`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* Attempts warning */}
        {attemptsLeft !== null && attemptsLeft < 5 && !isBlocked && (
          <p className="text-center text-[11px] text-amber-400">
            {attemptsLeft} {attemptsLeft === 1 ? 'tentativa restante' : 'tentativas restantes'}
          </p>
        )}

        {/* Verify button */}
        {!isBlocked && (
          <button
            onClick={handleVerify}
            disabled={!isComplete || isLoading || !otpId}
            className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {phase === 'verifying' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              'Verificar código'
            )}
          </button>
        )}

        {/* Resend */}
        {!isBlocked && (
          <div className="text-center">
            {cooldown > 0 ? (
              <p className="text-xs text-slate-600">
                Reenviar em <span className="text-slate-400 font-medium">{cooldown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={phase === 'requesting'}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed underline underline-offset-2"
              >
                {phase === 'requesting' ? 'Enviando...' : 'Reenviar código'}
              </button>
            )}
          </div>
        )}

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
