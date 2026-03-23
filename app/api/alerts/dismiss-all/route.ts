import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
export async function POST() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error
  await supabaseAdmin().from('alerts').update({ is_dismissed: true, is_read: true }).eq('user_id', dataOwnerId).eq('is_dismissed', false)
  return NextResponse.json({ success: true })
}
