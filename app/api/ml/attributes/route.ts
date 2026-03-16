/**
 * POST /api/ml/attributes
 * Body: {
 *   category_id:      string
 *   domain_id:        string
 *   item_attributes?: Array<{ id: string; value_name?: string; value_id?: string }>
 * }
 *
 * Runs the full attribute engine pipeline:
 * 1. Load raw attributes from 3 ML endpoints
 * 2. Classify into sections / identifiers / variations
 * 3. Build whitelist
 * Returns MlAttributeEngineState payload for the UI.
 */
import { NextResponse }                     from 'next/server'
import { getAuthUser }                      from '@/lib/server-auth'
import { getValidToken }                    from '@/lib/mercadolivre'
import { buildAttributeEngineState }        from '@/lib/ml/attributes/ml-attribute-engine.service'
import {
  extractIdentifierFields,
  extractVariationFields,
  buildAttributeUiSections,
}                                           from '@/lib/ml/attributes/ml-attribute-classifier.service'
import { buildAttributeWhitelist }          from '@/lib/ml/attributes/ml-attribute-whitelist.service'
import type {
  MlIdentifierField,
  MlVariationField,
  MlAttributeUiSection,
  MlRejectedAttribute,
  MlAttributeEngineLog,
}                                           from '@/lib/ml/attributes/types'

interface RequestBody {
  category_id:       string
  domain_id?:        string
  item_attributes?:  Array<{ id: string; value_name?: string | null; value_id?: string | null }>
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Conexão com ML não encontrada' }, { status: 400 })

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { category_id, domain_id = '', item_attributes = [] } = body

  if (!category_id || typeof category_id !== 'string') {
    return NextResponse.json({ error: 'category_id obrigatório' }, { status: 400 })
  }

  try {
    /* ── 1. Engine principal ─────────────────────────────────────────────── */
    const { attributes, identifiers, rejected, log } = await buildAttributeEngineState(
      category_id,
      domain_id,
      token,
      item_attributes,
    )

    /* ── 2. Classificar ──────────────────────────────────────────────────── */
    const requiredIds = new Set(
      attributes.filter((a) => a.is_required).map((a) => a.id),
    )

    const identifierFields: MlIdentifierField[] = extractIdentifierFields(
      identifiers.map((r) => ({
        id:    r.id   as string,
        name:  r.name as string | undefined,
        tags:  r.tags as Record<string, boolean> | string[] | undefined,
      })),
      item_attributes.map((a) => ({ id: a.id, value_name: a.value_name ?? undefined })),
      requiredIds,
    )

    const variationFields: MlVariationField[] = extractVariationFields(attributes)

    const uiSections: MlAttributeUiSection[] = buildAttributeUiSections(attributes)

    /* ── 3. Whitelist ────────────────────────────────────────────────────── */
    const whitelist = buildAttributeWhitelist(attributes, category_id)

    const fullLog: MlAttributeEngineLog = {
      category_id,
      domain_id,
      total_loaded:      log.total_loaded      ?? 0,
      total_required:    log.total_required     ?? 0,
      total_conditional: log.total_conditional  ?? 0,
      total_variation:   log.total_variation    ?? 0,
      total_rejected:    log.total_rejected     ?? 0,
      rejected_reasons:  log.rejected_reasons   ?? {},
      timestamp:         log.timestamp          ?? new Date().toISOString(),
    }

    return NextResponse.json({
      category_id,
      domain_id,
      ui_sections:     uiSections,
      identifiers:     identifierFields,
      variation_fields: variationFields,
      whitelist_size:  whitelist.allowed_ids.size,
      rejected:        rejected satisfies MlRejectedAttribute[],
      log:             fullLog,
    })
  } catch (err) {
    console.error('[ml/attributes]', err)
    return NextResponse.json({ error: 'Erro interno na engine de atributos' }, { status: 500 })
  }
}
