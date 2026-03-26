/**
 * POST /api/listings/migrate/check-duplicates
 * Verifica quais SKUs já existem no canal de destino.
 *
 * Body: { skus: string[], destination: 'ml' | 'magalu' }
 * Return: { existing_skus: string[], checked: number }
 *
 * SOMENTE LEITURA — nenhuma ação de escrita.
 * Rate-limited: max 10 requisições concorrentes ao ML.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_SKUS } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

/* ─── Concurrency limiter ──────────────────────────────────────────────────── */

async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
): Promise<T[]> {
  const results: T[] = []
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++
      results[currentIndex] = await tasks[currentIndex]()
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/* ─── ML: checar duplicatas por SKU ────────────────────────────────────────── */

async function checkMLDuplicates(
  dataOwnerId: string,
  skus: string[],
): Promise<string[]> {
  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) throw new Error('ML não conectado')

  const token = await getValidToken(dataOwnerId)
  if (!token) throw new Error('Token ML inválido — reconecte sua conta')

  const auth = { Authorization: `Bearer ${token}` }
  const existingSkus: string[] = []

  const tasks = skus.map((sku) => async () => {
    try {
      const url = `${ML_API_BASE}/users/${conn.ml_user_id}/items/search?seller_sku=${encodeURIComponent(sku)}`
      const res = await fetch(url, { headers: auth })
      if (!res.ok) return

      const data = await res.json()
      const results: string[] = data.results ?? []
      if (results.length > 0) {
        existingSkus.push(sku)
      }
    } catch {
      // Ignora erros individuais — SKU será considerado como não existente
    }
  })

  await withConcurrencyLimit(tasks, 10)
  return existingSkus
}

/* ─── Magalu: checar duplicatas por SKU ────────────────────────────────────── */

async function checkMagaluDuplicates(
  dataOwnerId: string,
  skus: string[],
): Promise<string[]> {
  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) throw new Error('Magalu não conectado')

  const existingSkus: string[] = []

  const tasks = skus.map((sku) => async () => {
    try {
      // Tenta buscar o SKU diretamente
      const path = MAGALU_PATH_SKUS + `/${encodeURIComponent(sku)}`
      await magaluGet(path, tokenData.accessToken, tokenData.sellerId)
      // Se não lançou erro, o SKU existe
      existingSkus.push(sku)
    } catch {
      // 404 ou erro = SKU não existe no Magalu
    }
  })

  await withConcurrencyLimit(tasks, 10)
  return existingSkus
}

/* ─── Handler POST ─────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  let body: { skus?: string[]; destination?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { skus, destination } = body

  if (!Array.isArray(skus) || skus.length === 0) {
    return NextResponse.json({ error: 'Lista de SKUs é obrigatória' }, { status: 400 })
  }

  if (!destination || !['ml', 'magalu'].includes(destination)) {
    return NextResponse.json({ error: 'Destino inválido. Use: ml ou magalu' }, { status: 400 })
  }

  // Limitar tamanho da lista para evitar abuso
  if (skus.length > 200) {
    return NextResponse.json({ error: 'Máximo de 200 SKUs por verificação' }, { status: 400 })
  }

  try {
    const existingSkus = destination === 'ml'
      ? await checkMLDuplicates(dataOwnerId, skus)
      : await checkMagaluDuplicates(dataOwnerId, skus)

    return NextResponse.json({
      existing_skus: existingSkus,
      checked: skus.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Migrate check-duplicates POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
