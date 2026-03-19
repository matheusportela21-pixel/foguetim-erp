/**
 * POST /api/feedback — thin wrapper over support_tickets for quick user feedback
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { type?: string; page?: string; description: string }

    if (!body.description?.trim()) {
      return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 })
    }

    const typeLabel: Record<string, string> = {
      bug:             'Bug Report',
      feature_request: 'Sugestão',
      other:           'Feedback',
    }
    const category = body.type === 'bug' ? 'bug' : body.type === 'feature_request' ? 'feature_request' : 'other'
    const priority  = body.type === 'bug' ? 'high' : body.type === 'feature_request' ? 'medium' : 'low'
    const pageTag   = body.page ? ` [${body.page}]` : ''
    const title     = `${typeLabel[body.type ?? 'other'] ?? 'Feedback'}${pageTag}`

    const { data, error } = await supabaseAdmin()
      .from('support_tickets')
      .insert({
        user_id:     user.id,
        title,
        description: body.description.trim(),
        category,
        priority,
        status:      'open',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ticket: data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
