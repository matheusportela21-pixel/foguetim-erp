/**
 * GET /api/shopee/debug-sign
 *
 * ROTA DE DIAGNÓSTICO — apenas para depurar o error_sign da Shopee.
 * Remove este arquivo após confirmar que a assinatura está correta.
 *
 * Retorna: base string, sign gerado, e a URL de auth completa para teste manual.
 *
 * NUNCA expor em produção — retorna dados sensíveis de diagnóstico.
 */
import { NextResponse } from 'next/server'
import { getShopeeEnv, getShopeeBaseUrl, SHOPEE_PATH_AUTH } from '@/lib/shopee/config'
import { shopeeSign, nowTs } from '@/lib/shopee/sign'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Rota de diagnóstico desativada em produção' }, { status: 403 })
  }

  try {
    const { partnerId, partnerKey, redirectUri } = getShopeeEnv()
    const timestamp = nowTs()

    // Base string exatamente como calculada
    const baseString = `${partnerId}${SHOPEE_PATH_AUTH}${timestamp}`
    const sign = shopeeSign(partnerKey, partnerId, SHOPEE_PATH_AUTH, timestamp)

    const params = new URLSearchParams({
      partner_id: String(partnerId),
      timestamp:  String(timestamp),
      sign,
      redirect:   redirectUri,
    })

    const authUrl = `${getShopeeBaseUrl()}${SHOPEE_PATH_AUTH}?${params.toString()}`

    return NextResponse.json({
      // Dados para diagnóstico
      partnerId,
      partnerKeyLength:   partnerKey.length,
      partnerKeyPreview:  `${partnerKey.slice(0, 8)}…${partnerKey.slice(-8)}`,
      partnerKeyHex:      Buffer.from(partnerKey).toString('hex').slice(0, 32) + '…',
      redirectUri,
      env:                process.env.SHOPEE_ENV ?? 'test (padrão)',
      baseUrl:            getShopeeBaseUrl(),

      // Assinatura
      timestamp,
      baseString,
      sign,

      // URL completa para colar no navegador
      authUrl,

      // Verificação: o partner_id na base string deve ser idêntico ao da URL
      consistent: baseString.startsWith(String(partnerId)) &&
                  authUrl.includes(`partner_id=${partnerId}`) &&
                  authUrl.includes(`timestamp=${timestamp}`) &&
                  authUrl.includes(`sign=${sign}`),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
