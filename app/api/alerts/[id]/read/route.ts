import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id } = await params
  await supabaseAdmin().from('alerts').update({ is_read: true }).eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}
