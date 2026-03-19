'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log para debug — remover em produção ou trocar por Sentry
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: '#0a0d14' }}
    >
      {/* Subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 40% 30% at 50% 25%, rgba(239,68,68,0.07), transparent)',
        }}
      />

      <div className="relative flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.25)',
            boxShadow: '0 0 32px rgba(239,68,68,0.10)',
          }}
        >
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Algo deu errado
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Ocorreu um erro inesperado nesta página.
            Você pode tentar novamente ou voltar ao Dashboard.
          </p>
          {error.digest && (
            <p className="text-[11px] text-slate-700 mt-1 font-mono">
              ref: {error.digest}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8',
            }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
