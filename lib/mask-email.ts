/**
 * Masks an email address for LGPD-compliant display.
 * "matheus.portela21@gmail.com" → "m***************1@gmail.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***'
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  if (local.length <= 2) return '*'.repeat(local.length) + '@' + domain
  return local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + '@' + domain
}
