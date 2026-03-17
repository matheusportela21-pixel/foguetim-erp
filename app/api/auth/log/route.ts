/**
 * POST /api/auth/log
 * Registra eventos de autenticação com captura de IP real.
 * Usado pelo client-side (login/logout) para garantir que o IP seja capturado server-side.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP    = req.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIP)    return realIP
  return 'unknown'
}

interface LogBody {
  action:      string
  category:    string
  description: string
  metadata?:   Record<string, unknown>
  visibility?: string
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: LogBody
  try {
    body = await req.json() as LogBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const ip        = getClientIP(req)
  const userAgent = req.headers.get('user-agent')?.slice(0, 200) ?? null

  try {
    await supabaseAdmin().from('activity_logs').insert({
      user_id:    user.id,
      action:     body.action,
      category:   body.category,
      description: body.description,
      metadata:   { ...(body.metadata ?? {}), ip },
      ip_address: ip,
      user_agent: userAgent,
      visibility: body.visibility ?? 'user',
    })
  } catch (err) {
    console.error('[auth/log]', err)
    // Non-fatal: logging should never block auth flow
  }

  return NextResponse.json({ ok: true })
}
