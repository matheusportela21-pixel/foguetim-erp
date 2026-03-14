'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Rocket, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code  = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setMessage('Autorização cancelada ou negada pelo Mercado Livre.')
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('Código de autorização não encontrado.')
      return
    }

    fetch('/api/mercadolivre/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Erro ao conectar com Mercado Livre')
        }
        return res.json()
      })
      .then(data => {
        setStatus('success')
        setMessage(`Conta ${data.nickname} conectada com sucesso!`)
        setTimeout(() => router.push('/dashboard/integracoes'), 2500)
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.message ?? 'Erro inesperado.')
      })
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#03050f]">
      <div className="text-center max-w-sm mx-auto px-6">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
          <Rocket className="w-7 h-7 text-white" style={{ transform: 'rotate(-45deg)' }} />
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Conectando ao Mercado Livre...
            </p>
            <p className="text-xs text-slate-500">Aguarde enquanto processamos a autorização.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Conectado!
            </p>
            <p className="text-xs text-slate-400">{message}</p>
            <p className="text-xs text-slate-600 mt-2">Redirecionando para Integrações...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Erro na conexão
            </p>
            <p className="text-xs text-slate-400 mb-5">{message}</p>
            <button
              onClick={() => router.push('/dashboard/integracoes')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all">
              Voltar para Integrações
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MLCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  )
}
