/**
 * POST /api/webhooks/mercadolivre
 * Receives ML webhook notifications.
 * ML sends: { resource: "/orders/123", user_id: 456, topic: "orders", application_id: 789, attempts: 1, sent: "...", received: "..." }
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topic, resource, user_id } = body

    console.log('[ML Webhook]', topic, resource, user_id)

    // TODO: process topics: orders, items, questions, payments
    // For each topic, fetch updated data from ML API and sync to Supabase

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

// ML may also send GET for validation during webhook registration
export async function GET() {
  return NextResponse.json({ ok: true, service: 'foguetim-ml-webhook' })
}
