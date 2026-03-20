/**
 * lib/crypto.ts
 * Criptografia AES-256-GCM para tokens sensíveis armazenados no banco.
 *
 * Formato do ciphertext: "enc:<iv_hex>:<tag_hex>:<data_hex>"
 * Fallback: strings sem o prefixo "enc:" são tratadas como plaintext legado.
 *
 * Setup:
 *   ENCRYPTION_KEY=<64 hex chars = 32 bytes>
 *   Gerar com: openssl rand -hex 32
 */

const ENC_PREFIX = 'enc:'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length < 64) {
    throw new Error(
      '[crypto] ENCRYPTION_KEY ausente ou inválida. ' +
      'Gere com: openssl rand -hex 32 e adicione ao .env.local e Vercel.'
    )
  }
  return Buffer.from(hex.slice(0, 64), 'hex')
}

/**
 * Criptografa um valor plaintext com AES-256-GCM.
 * Retorna string no formato "enc:<iv_hex>:<tag_hex>:<data_hex>".
 */
export async function encrypt(plaintext: string): Promise<string> {
  // Use Node.js crypto (available in Next.js server-side)
  const { createCipheriv, randomBytes } = await import('crypto')

  const key = getKey()
  const iv  = randomBytes(12) // 96-bit IV recomendado para GCM

  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Descriptografa um valor criptografado com AES-256-GCM.
 * Aceita o formato "enc:<iv_hex>:<tag_hex>:<data_hex>".
 * Strings sem o prefixo "enc:" são retornadas como plaintext (fallback para dados legados).
 */
export async function decrypt(ciphertext: string): Promise<string> {
  // Fallback para tokens plaintext legados (antes da criptografia)
  if (!ciphertext.startsWith(ENC_PREFIX)) {
    return ciphertext
  }

  const { createDecipheriv } = await import('crypto')

  const key  = getKey()
  const rest = ciphertext.slice(ENC_PREFIX.length)
  const parts = rest.split(':')

  if (parts.length !== 3) {
    throw new Error('[crypto] Formato de ciphertext inválido')
  }

  const [ivHex, tagHex, dataHex] = parts
  const iv        = Buffer.from(ivHex,  'hex')
  const tag       = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(dataHex, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Verifica se um valor já está criptografado.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX)
}
