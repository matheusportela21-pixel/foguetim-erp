'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const CONSENT_KEY = 'fgt-cookies-consent'

export default function CookieBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    // Nunca mostrar no dashboard
    if (pathname?.startsWith('/dashboard')) return
    try {
      const saved = localStorage.getItem(CONSENT_KEY)
      if (!saved) setVisible(true)
    } catch {
      // localStorage indisponível — não mostrar
    }
  }, [pathname])

  function accept(choice: 'all' | 'essential') {
    try {
      localStorage.setItem(CONSENT_KEY, choice)
    } catch {
      // silently ignore
    }
    setClosing(true)
    setTimeout(() => setVisible(false), 350)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }
        .cookie-banner-enter { animation: slideUp   0.35s ease forwards; }
        .cookie-banner-exit  { animation: slideDown 0.35s ease forwards; }
      `}</style>

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] ${
          closing ? 'cookie-banner-exit' : 'cookie-banner-enter'
        }`}
        role="dialog"
        aria-live="polite"
        aria-label="Aviso de cookies"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Texto */}
            <p className="text-sm text-gray-700 flex-1">
              🍪{' '}
              Utilizamos cookies essenciais para o funcionamento do site e cookies
              analíticos para melhorar sua experiência. Ao clicar em &ldquo;Aceitar
              todos&rdquo;, você concorda com o uso de todos os cookies conforme
              nossa{' '}
              <a
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 font-medium"
              >
                Política de Privacidade
              </a>
              .
            </p>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => accept('essential')}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Apenas essenciais
              </button>
              <button
                onClick={() => accept('all')}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                Aceitar todos
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
