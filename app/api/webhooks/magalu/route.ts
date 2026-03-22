/**
 * POST /api/webhooks/magalu
 * Receiver para webhooks do Magalu Marketplace.
 * Processa eventos: order_created, order_updated, product_updated
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Magalu Webhook] Received:', JSON.stringify(body).slice(0, 500))

    const db = supabaseAdmin()

    // Store in webhook_queue for processing
    await db.from('webhook_queue').insert({
      topic:          body.event ?? body.type ?? 'magalu_unknown',
      resource:       JSON.stringify(body.data ?? body),
      user_id:        null,
      application_id: body.seller_id ?? null,
      payload:        body,
      status:         'pending',
      received_at:    new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Magalu Webhook] Error:', err)
    return NextResponse.json({ success: true })
  }
}
