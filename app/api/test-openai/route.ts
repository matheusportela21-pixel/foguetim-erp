import { NextResponse } from 'next/server'
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'OPENAI_API_KEY não encontrada nas variáveis de ambiente'
    })
  }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Responda apenas: OK' }]
      })
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ success: false, error: err })
    }
    const data = await res.json()
    return NextResponse.json({
      success: true,
      message: 'OpenAI conectada com sucesso!',
      response: data.choices?.[0]?.message?.content
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
