/**
 * GET /api/announcements
 * Retorna avisos ativos não expirados, excluindo os que o usuário já dispensou.
 * Filtra por plano do usuário (target_plans vazio = todos).
 */
import { NextResponse } from 'next/server'
import { getAuthUser }  from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface Announcement {
  id:             string
  title:          string
  content:        string
  type:           'info' | 'warning' | 'success' | 'urgent'
  link:           string | null
  is_dismissible: boolean
  starts_at:      string
  expires_at:     string | null
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const now = new Date().toISOString()

  // Fetch user plan
  const { data: profile } = await db
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single()

  const userPlan = profile?.plan ?? null

  // Fetch active announcements
  const { data: announcements, error } = await db
    .from('announcements')
    .select('id, title, content, type, link, is_dismissible, target_plans, starts_at, expires_at')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('starts_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch dismissed by this user
  const { data: dismissed } = await db
    .from('dismissed_announcements')
    .select('announcement_id')
    .eq('user_id', user.id)

  const dismissedIds = new Set((dismissed ?? []).map(d => d.announcement_id))

  // Filter: not dismissed + plan matches
  const visible = (announcements ?? []).filter(a => {
    if (dismissedIds.has(a.id)) return false
    if (a.target_plans && a.target_plans.length > 0 && userPlan) {
      return a.target_plans.includes(userPlan)
    }
    return true
  })

  return NextResponse.json({ announcements: visible })
}
