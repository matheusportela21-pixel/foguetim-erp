/**
 * lib/certificates.ts
 * Helpers for securely uploading / downloading A1 digital certificates (.pfx)
 * to/from a PRIVATE Supabase Storage bucket named "certificates".
 *
 * The password is NEVER stored. Only certificate metadata is persisted in
 * the fiscal_config table after a successful validation.
 */

import { supabase } from './supabase'

const BUCKET = 'certificates'

/** Build the storage path for a user's certificate */
function certPath(userId: string): string {
  return `${userId}/certificado.pfx`
}

/**
 * Upload a .pfx certificate file to private storage.
 * Returns the storage path on success, throws on error.
 */
export async function uploadCertificate(
  userId: string,
  file: File,
): Promise<string> {
  const path = certPath(userId)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: 'application/x-pkcs12',
      upsert: true,
    })

  if (error) throw new Error(`Erro ao enviar certificado: ${error.message}`)

  return path
}

/**
 * Generate a short-lived signed URL to download the certificate.
 * Use for local processing only — never expose to the client UI.
 */
export async function getCertificateSignedUrl(
  userId: string,
  expiresInSeconds = 60,
): Promise<string> {
  const path = certPath(userId)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(`Erro ao gerar URL do certificado: ${error?.message}`)
  }

  return data.signedUrl
}

/**
 * Delete the certificate from storage (e.g. when the user removes it).
 */
export async function deleteCertificate(userId: string): Promise<void> {
  const path = certPath(userId)

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path])

  if (error) throw new Error(`Erro ao remover certificado: ${error.message}`)
}

/**
 * Check whether a certificate file exists in storage for the given user.
 */
export async function certificateExists(userId: string): Promise<boolean> {
  const path = certPath(userId)
  const dir  = `${userId}/`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(dir, { limit: 10 })

  if (error || !data) return false
  return data.some(f => `${dir}${f.name}` === path)
}
