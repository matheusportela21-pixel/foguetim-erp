/**
 * POST /api/log-activity
 * Server-side activity logger — captures real client IP from request headers.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action:      string
      category:    string
      description: string
      metadata?:   Record<string, unknown>
      visibility?: string
      user_agent?: string
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ip = getClientIP(req)

    await supabase.from('activity_logs').insert({
      user_id:     user.id,
      action:      body.action,
      category:    body.category,
      description: body.description,
      metadata:    body.metadata ?? {},
      ip_address:  ip === 'unknown' ? null : ip,
      user_agent:  body.user_agent ?? null,
      visibility:  body.visibility ?? 'user',
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Fail silently — logging should never interrupt the user flow
    return NextResponse.json({ ok: false })
  }
}
