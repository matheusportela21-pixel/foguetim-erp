/**
 * Timezone helpers for Foguetim ERP.
 * All user-facing dates must use America/Sao_Paulo (BRT = UTC-3 / UTC-2 in summer).
 * Database operations remain in UTC — only DISPLAY needs conversion.
 */

export const FOGUETIM_TIMEZONE = 'America/Sao_Paulo'

/**
 * Returns a Date object representing the current moment in Brasília time.
 * Useful when you need .getHours(), .getDay(), etc. in BRT.
 */
export function getBrasiliaDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: FOGUETIM_TIMEZONE }))
}

/**
 * Returns the current hour (0-23) in Brasília timezone.
 */
export function getBrasiliaHour(): number {
  return parseInt(
    new Date().toLocaleString('en-US', {
      timeZone: FOGUETIM_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }),
    10,
  )
}

/**
 * Returns greeting based on current Brasília time.
 * Safe to call from client components (useEffect) — do NOT call on server.
 */
export function getGreeting(): string {
  const hour = getBrasiliaHour()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Formats a date for display in Brazilian Portuguese with Brasília timezone.
 * @example formatBrasiliaDate() → "terça-feira, 17 de março de 2026"
 */
export function formatBrasiliaDate(date?: Date | string | null): string {
  const d = date ? new Date(date) : new Date()
  return d.toLocaleDateString('pt-BR', {
    timeZone: FOGUETIM_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Formats a date for display in short Brazilian format.
 * @example formatBrasiliaDateShort('2026-03-17') → "17/03/2026"
 */
export function formatBrasiliaDateShort(date?: Date | string | null): string {
  const d = date ? new Date(date) : new Date()
  return d.toLocaleDateString('pt-BR', {
    timeZone: FOGUETIM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Formats a date+time for display in Brazilian format.
 * @example formatBrasiliaDateTime('2026-03-17T15:30:00Z') → "17/03/2026, 12:30"
 */
export function formatBrasiliaDateTime(date?: Date | string | null): string {
  const d = date ? new Date(date) : new Date()
  return d.toLocaleString('pt-BR', {
    timeZone: FOGUETIM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats only the time portion in Brasília timezone.
 * @example formatBrasiliaTime('2026-03-17T18:00:00Z') → "15:00"
 */
export function formatBrasiliaTime(date?: Date | string | null): string {
  const d = date ? new Date(date) : new Date()
  return d.toLocaleTimeString('pt-BR', {
    timeZone: FOGUETIM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Returns today's date string (YYYY-MM-DD) in Brasília timezone.
 * Useful for comparisons and date pickers.
 */
export function getBrasiliaDateString(): string {
  const d = getBrasiliaDate()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Calculates how many days from today (Brasília) until a target date (YYYY-MM-DD).
 * Returns negative if the date has passed.
 */
export function daysUntil(dateStr: string): number {
  const today = getBrasiliaDateString()
  const todayMs = new Date(today + 'T00:00:00').getTime()
  const targetMs = new Date(dateStr + 'T00:00:00').getTime()
  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24))
}
