/**
 * GET /api/shopee/test-sign
 * Rota de diagnóstico — testa 3 variações de baseString + sign.
 * REMOVER após confirmar qual variação funciona.
 */
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getShopeeBaseUrl, SHOPEE_PATH_AUTH } from '@/lib/shopee/config'

const REDIRECT = 'https://app.foguetim.com.br/api/shopee/callback'
const BASE_URL  = () => getShopeeBaseUrl()

function hmac(key: string, msg: string): string {
  return createHmac('sha256', key).update(msg).digest('hex')
}

function buildUrl(partnerId: string, timestamp: number, sign: string): string {
  return `${BASE_URL()}${SHOPEE_PATH_AUTH}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(REDIRECT)}`
}

export async function GET() {
  const partnerId  = (process.env.SHOPEE_PARTNER_ID  ?? '').trim()
  const partnerKey = (process.env.SHOPEE_PARTNER_KEY ?? '').trim()
  const timestamp  = Math.floor(Date.now() / 1000)

  // ── VARIAÇÃO A ────────────────────────────────────────────────────────────
  // Nosso método atual: concatenação de string pura
  // baseString = "1229750/api/v2/shop/auth_partner1774105654"
  const baseA = `${partnerId}${SHOPEE_PATH_AUTH}${timestamp}`
  const signA  = hmac(partnerKey, baseA)
  const signA_upper = signA.toUpperCase()

  // ── VARIAÇÃO B ────────────────────────────────────────────────────────────
  // partnerId forçado como Number depois de volta para string
  // Garante que não há diferença de representação (ex: "01229750" vs "1229750")
  const partnerIdNum = Number(partnerId)
  const baseB = `${partnerIdNum}${SHOPEE_PATH_AUTH}${timestamp}`
  const signB  = hmac(partnerKey, baseB)

  // ── VARIAÇÃO C ────────────────────────────────────────────────────────────
  // redirect incluído na baseString (visto em alguns SDKs antigos)
  // baseString = partnerId + path + timestamp + redirectUrl
  const baseC = `${partnerId}${SHOPEE_PATH_AUTH}${timestamp}${REDIRECT}`
  const signC  = hmac(partnerKey, baseC)

  // ── VARIAÇÃO D ────────────────────────────────────────────────────────────
  // redirect URL-encoded incluído na baseString
  const baseD = `${partnerId}${SHOPEE_PATH_AUTH}${timestamp}${encodeURIComponent(REDIRECT)}`
  const signD  = hmac(partnerKey, baseD)

  // ── charCode scan (detecta caracteres invisíveis) ─────────────────────────
  const suspicious = partnerKey.split('')
    .map((c, i) => ({ i, code: c.charCodeAt(0), char: c }))
    .filter(({ code }) => code < 32 || code > 126)

  return NextResponse.json({
    // Info geral
    partnerId,
    partnerIdAsNumber:    Number(partnerId),
    partnerIdSameWhenNum: partnerId === String(Number(partnerId)),
    partnerKeyLength:     partnerKey.length,
    partnerKeyFirst4:     partnerKey.slice(0, 4),
    partnerKeyLast4:      partnerKey.slice(-4),
    allCharCodesOk:       suspicious.length === 0,
    suspiciousChars:      suspicious,
    timestamp,
    path:    SHOPEE_PATH_AUTH,
    baseUrl: BASE_URL(),

    // ── As 4 variações ──────────────────────────────────────────────────────
    variacoes: {
      A: {
        descricao:  'Padrão atual: string pura  → partnerId + path + timestamp',
        baseString: baseA,
        sign:       signA,
        signUpper:  signA_upper,
        url:        buildUrl(partnerId, timestamp, signA),
        urlUpper:   buildUrl(partnerId, timestamp, signA_upper),
      },
      B: {
        descricao:  'partnerId forçado para Number (garante sem zero-padding)',
        baseString: baseB,
        sign:       signB,
        difereDaA:  signB !== signA,
        url:        buildUrl(partnerId, timestamp, signB),
      },
      C: {
        descricao:  'redirect sem encoding incluído na baseString',
        baseString: baseC,
        sign:       signC,
        url:        buildUrl(partnerId, timestamp, signC),
      },
      D: {
        descricao:  'redirect URL-encoded incluído na baseString',
        baseString: baseD,
        sign:       signD,
        url:        buildUrl(partnerId, timestamp, signD),
      },
    },

    // Instrução: cole cada uma das 4 urls no navegador e veja qual a Shopee aceita
    instrucao: 'Cole cada url no navegador. A que redirecionar para tela de login da Shopee sem error_sign é a correta.',
  })
}
