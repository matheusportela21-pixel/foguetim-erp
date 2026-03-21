'use client'

import { AlertTriangle } from 'lucide-react'

/**
 * Banner de aviso de ambiente sandbox da Shopee.
 * Renderiza quando NEXT_PUBLIC_SHOPEE_ENV não é 'prod'.
 * Quando a integração for aprovada pela Shopee e ir para produção,
 * defina NEXT_PUBLIC_SHOPEE_ENV=prod para remover o banner automaticamente.
 */
export default function ShopeeSandboxBanner() {
  const isProd = process.env.NEXT_PUBLIC_SHOPEE_ENV === 'prod'
  if (isProd) return null

  return (
    <div className="bg-orange-950/30 border border-orange-800/40 rounded-lg p-3 mb-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0" />
      <div>
        <p className="text-sm font-medium text-orange-300">Ambiente de teste (Sandbox)</p>
        <p className="text-xs text-orange-400/70">
          A integração Shopee está em modo de teste. Dados são do ambiente sandbox da Shopee e
          podem não refletir sua loja real. Quando a Shopee aprovar o app, mudaremos para produção.
        </p>
      </div>
    </div>
  )
}
