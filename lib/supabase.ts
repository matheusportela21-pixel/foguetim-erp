import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Singleton browser client
export const supabase = createBrowserClient(url, key)

/** Returns true only when real Supabase credentials are configured */
export function isConfigured(): boolean {
  return !!url && !!key && !url.includes('your-project-id')
}
