/**
 * POST /api/webhooks/shopee
 * Receiver para push notifications da Shopee.
 * Processa eventos: order_status, return_created, chat_message
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Shopee Webhook] Received:', JSON.stringify(body).slice(0, 500))

    const db = supabaseAdmin()

    // Store in webhook_queue for processing
    await db.from('webhook_queue').insert({
      topic:          body.type ?? body.push_type ?? 'shopee_unknown',
      resource:       JSON.stringify(body.data ?? body),
      user_id:        null, // Shopee doesn't send our user_id — need to look up by shop_id
      application_id: body.partner_id ?? null,
      payload:        body,
      status:         'pending',
      received_at:    new Date().toISOString(),
    })

    // Always return 200 to acknowledge
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Shopee Webhook] Error:', err)
    return NextResponse.json({ success: true }) // Still 200 to prevent retries
  }
}
