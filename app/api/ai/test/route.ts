/**
 * GET /api/ai/test
 * Valida que a ANTHROPIC_API_KEY está configurada e a API responde.
 * Admin-only.
 */
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'ANTHROPIC_API_KEY não encontrada nas variáveis de ambiente.' },
      { status: 500 },
    )
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages:   [{ role: 'user', content: 'Responda apenas: "Foguetim AI online!"' }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { ok: false, error: `Anthropic retornou ${res.status}`, detail: body },
        { status: 502 },
      )
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>
      usage:   { input_tokens: number; output_tokens: number }
      model:   string
    }

    const text = data.content.find(c => c.type === 'text')?.text ?? ''

    return NextResponse.json({
      ok:          true,
      response:    text,
      model:       data.model,
      tokens_used: data.usage.input_tokens + data.usage.output_tokens,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
