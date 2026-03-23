import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error
  const { id } = await params
  await supabaseAdmin().from('alerts').update({ is_read: true }).eq('id', id).eq('user_id', dataOwnerId)
  return NextResponse.json({ success: true })
}
