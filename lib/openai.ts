const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function callOpenAI(
  systemPrompt: string,
  userMessage:  string,
  maxTokens = 500
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'gpt-4o-mini',
      max_tokens:  maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } }
    throw new Error(err.error?.message ?? 'Erro na API OpenAI')
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}
