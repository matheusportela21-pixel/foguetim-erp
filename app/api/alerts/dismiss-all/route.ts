import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  await supabaseAdmin().from('alerts').update({ is_dismissed: true, is_read: true }).eq('user_id', user.id).eq('is_dismissed', false)
  return NextResponse.json({ success: true })
}
