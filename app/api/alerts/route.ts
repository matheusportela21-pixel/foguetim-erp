/**
 * GET /api/alerts — list alerts (filters: type, severity, is_read, channel)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp       = new URL(req.url).searchParams
  const type     = sp.get('type')
  const severity = sp.get('severity')
  const isRead   = sp.get('is_read')
  const channel  = sp.get('channel')
  const limit    = Math.min(100, Number(sp.get('limit') ?? '50'))
  const offset   = Number(sp.get('offset') ?? '0')

  let query = supabaseAdmin()
    .from('alerts')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type)     query = query.eq('type', type)
  if (severity) query = query.eq('severity', severity)
  if (isRead === 'true')  query = query.eq('is_read', true)
  if (isRead === 'false') query = query.eq('is_read', false)
  if (channel)  query = query.eq('channel', channel)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ alerts: data ?? [], total: count ?? 0 })
}
