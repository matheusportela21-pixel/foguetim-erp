/**
 * lib/services/anthropic.ts
 * Serviço de chamada à API Anthropic.
 * Use APENAS em código server-side (API routes).
 * A API key nunca é exposta no frontend.
 */

export interface AnthropicMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface AnthropicResponse {
  content:  Array<{ type: string; text: string }>
  usage:    { input_tokens: number; output_tokens: number }
  model:    string
  /** Custo estimado em USD (calculado localmente) */
  costUsd:  number
}

export interface CallOptions {
  model?:        string
  maxTokens?:    number
  systemPrompt?: string
  messages:      AnthropicMessage[]
  temperature?:  number
}

/** Preços por milion tokens (USD) — claude-sonnet-4-20250514 */
const PRICE_INPUT_PER_MTOK  = 3    // $3 / MTok
const PRICE_OUTPUT_PER_MTOK = 15   // $15 / MTok

const DEFAULT_MODEL      = 'claude-sonnet-4-20250514'
const DEFAULT_MAX_TOKENS = 2000

/**
 * Chama a API Anthropic e retorna a resposta parseada com uso de tokens.
 * Throws com mensagem clara em caso de erro de autenticação, rate limit ou API down.
 */
export async function callAnthropic(options: CallOptions): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não está configurada nas variáveis de ambiente.')
  }

  const model     = options.model      ?? DEFAULT_MODEL
  const maxTokens = options.maxTokens  ?? DEFAULT_MAX_TOKENS

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages:   options.messages,
  }
  if (options.systemPrompt) {
    body.system = options.systemPrompt
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    if (res.status === 401) {
      throw new Error(`ANTHROPIC_API_KEY inválida ou sem permissão. (401) ${errBody}`)
    }
    if (res.status === 429) {
      throw new Error(`Rate limit Anthropic atingido. Tente novamente em alguns instantes. (429)`)
    }
    throw new Error(`Anthropic API erro ${res.status}: ${errBody}`)
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>
    usage:   { input_tokens: number; output_tokens: number }
    model:   string
  }

  const costUsd =
    (data.usage.input_tokens  / 1_000_000) * PRICE_INPUT_PER_MTOK +
    (data.usage.output_tokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK

  return {
    content: data.content,
    usage:   data.usage,
    model:   data.model,
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
  }
}

/**
 * Extrai o texto da primeira mensagem de uma resposta Anthropic.
 */
export function extractText(res: AnthropicResponse): string {
  return res.content.find(c => c.type === 'text')?.text ?? ''
}
