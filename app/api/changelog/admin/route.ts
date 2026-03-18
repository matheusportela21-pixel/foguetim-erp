/**
 * GET  /api/changelog/admin — lista todas as entradas (admin)
 * POST /api/changelog/admin — cria nova entrada
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'owner', 'foguetim_support']

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin()
    .from('users').select('role').eq('id', userId).single()
  return data?.role && ADMIN_ROLES.includes(data.role)
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin()
    .from('changelog')
    .select('*')
    .order('published_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() as Record<string, unknown> }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { version, title, description, details, category, published_at } = body
  if (!version || !title || !description) {
    return NextResponse.json({ error: 'version, title e description são obrigatórios' }, { status: 400 })
  }

  const validCats = ['feature', 'fix', 'improvement', 'security']
  if (category && !validCats.includes(category as string)) {
    return NextResponse.json({ error: 'category inválida' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('changelog')
    .insert({
      version:      version as string,
      title:        title as string,
      description:  description as string,
      details:      (details as string) ?? null,
      category:     (category as string) ?? 'feature',
      published_at: (published_at as string) ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
