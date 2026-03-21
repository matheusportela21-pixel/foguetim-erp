/**
 * GET /api/shopee/test-sign
 * Rota de diagnóstico temporária — detecta problemas na geração do sign.
 * REMOVER após confirmar que a assinatura está correta.
 */
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getShopeeBaseUrl, SHOPEE_PATH_AUTH } from '@/lib/shopee/config'

export async function GET() {
  const rawPartnerId  = process.env.SHOPEE_PARTNER_ID  ?? ''
  const rawPartnerKey = process.env.SHOPEE_PARTNER_KEY ?? ''

  const partnerId  = rawPartnerId.trim()
  const partnerKey = rawPartnerKey.trim()
  const timestamp  = Math.floor(Date.now() / 1000)

  // Base string exatamente como a Shopee especifica
  const baseString = `${partnerId}${SHOPEE_PATH_AUTH}${timestamp}`

  const sign = createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex')

  // ── Análise de caracteres invisíveis na partner key ───────────────────────
  const charCodes    = rawPartnerKey.split('').map(c => c.charCodeAt(0))
  const suspicious   = charCodes
    .map((code, i) => ({ i, code, char: rawPartnerKey[i] }))
    .filter(({ code }) => code < 32 || code > 126)

  // Caracteres da rawPartnerId também
  const idCharCodes  = rawPartnerId.split('').map(c => c.charCodeAt(0))
  const idSuspicious = idCharCodes
    .map((code, i) => ({ i, code, char: rawPartnerId[i] }))
    .filter(({ code }) => code < 32 || code > 126)

  return NextResponse.json({
    // Identificadores
    partnerId,
    partnerIdRawLength:    rawPartnerId.length,
    partnerIdTrimLength:   partnerId.length,
    partnerIdSuspicious:   idSuspicious,

    // Key
    partnerKeyRawLength:   rawPartnerKey.length,
    partnerKeyTrimLength:  partnerKey.length,
    partnerKeyFirst4:      partnerKey.slice(0, 4),
    partnerKeyLast4:       partnerKey.slice(-4),
    partnerKeySuspicious:  suspicious,    // [] = limpa, [{i,code,char}] = tem caractere oculto
    allCharCodesOk:        suspicious.length === 0 && idSuspicious.length === 0,

    // Assinatura
    timestamp,
    path:        SHOPEE_PATH_AUTH,
    baseString,
    sign,
    signLength:  sign.length,  // deve ser sempre 64

    // Ambiente
    baseUrl:     getShopeeBaseUrl(),
    shopeeEnv:   process.env.SHOPEE_ENV ?? 'test (padrão)',

    // URL completa que seria gerada (para comparar com API Test Tool da Shopee)
    authUrl: `${getShopeeBaseUrl()}${SHOPEE_PATH_AUTH}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=https%3A%2F%2Fapp.foguetim.com.br%2Fapi%2Fshopee%2Fcallback`,
  })
}
