/**
 * POST /api/ml/categorize
 * Body: { title: string; previous_category_id?: string }
 *    OR { force_category_id: string }   ← skip AI, just load attributes
 *
 * Runs the full engine pipeline:
 * 1. Normalize title
 * 2. domain_discovery candidates
 * 3. Validate tree details (is_leaf, path)
 * 4. AI decision
 * 5. Resolve final category
 * 6. Load all attributes (3 endpoints)
 * Returns CategoryAttributePayload + domain_flow + log
 */
import { NextResponse }              from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { getValidToken }             from '@/lib/mercadolivre'
import {
  normalizeTitleForCategoryDiscovery,
  fetchCategoryCandidates,
  fetchCategoryTreeDetails,
  scoreCategoryCandidatesWithAI,
  resolveFinalCategory,
  loadCategoryAttributes,
  detectSpecialDomainFlow,
}                                    from '@/lib/ml/categorization-engine'
import type {
  CategoryAttributePayload,
  CategorizationLog,
  CategoryCandidate,
}                                    from '@/lib/ml/types'

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const token = await getValidToken(user.id) // null if no ML connection

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  /* ── Mode: force_category_id — skip AI, just load attributes ── */
  const forceCategoryId = typeof body.force_category_id === 'string' ? body.force_category_id : null
  if (forceCategoryId) {
    try {
      // Fetch category details for breadcrumb + domain_id
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const catRes = await fetch(`https://api.mercadolibre.com/categories/${forceCategoryId}`, { headers })
      const catData = catRes.ok
        ? (await catRes.json() as { id?: string; name?: string; path_from_root?: { id: string; name: string }[] })
        : null

      const breadcrumb = catData?.path_from_root?.map((p) => p.name).join(' > ')
        ?? catData?.name ?? forceCategoryId
      const domainId = typeof body.domain_id === 'string' ? body.domain_id : ''

      const attrs = await loadCategoryAttributes(forceCategoryId, domainId, token)

      const payload: CategoryAttributePayload = {
        category: {
          category_id:   forceCategoryId,
          category_name: catData?.name ?? forceCategoryId,
          domain_id:     domainId,
          is_leaf:       true,
          confidence:    1.0,
          breadcrumb,
        },
        required_attributes:    attrs.required,
        conditional_attributes: attrs.conditional,
        optional_attributes:    attrs.optional,
        variation_attributes:   attrs.variation,
        hidden_attributes:      attrs.hidden,
        rejected_attributes:    [],
      }

      return NextResponse.json({
        ...payload,
        domain_flow:      detectSpecialDomainFlow(domainId),
        category_changed: false,
      })
    } catch (err) {
      console.error('[categorize force_category_id]', err)
      return NextResponse.json({ error: 'Erro ao carregar atributos' }, { status: 500 })
    }
  }

  /* ── Mode: title-based full pipeline ── */
  const title               = typeof body.title === 'string' ? body.title.trim() : ''
  const previousCategoryId  = typeof body.previous_category_id === 'string' ? body.previous_category_id : ''

  if (!title || title.length < 3) {
    return NextResponse.json({ error: 'Título muito curto' }, { status: 400 })
  }

  const log: Partial<CategorizationLog> = {
    original_title:    title,
    timestamp:         new Date().toISOString(),
    ambiguity_signals: [],
    rejected_reasons:  [],
  }

  try {
    /* Stage 1 — normalize */
    const normalizedTitle = normalizeTitleForCategoryDiscovery(title)
    log.normalized_title = normalizedTitle

    /* Stage 2 — domain_discovery (requires token) */
    let rawCandidates: CategoryCandidate[] = []
    if (token) {
      rawCandidates = await fetchCategoryCandidates(normalizedTitle, token)
    }

    /* Stage 3 — validate tree details */
    const validatedCandidates = await fetchCategoryTreeDetails(rawCandidates, token)
    log.candidates_received = validatedCandidates

    if (validatedCandidates.length === 0) {
      log.ambiguity_signals!.push('Nenhuma candidata retornada pela API ML')
    }
    const leafCount = validatedCandidates.filter((c) => c.is_leaf).length
    if (leafCount === 0 && validatedCandidates.length > 0) {
      log.ambiguity_signals!.push('Nenhuma candidata é categoria folha')
    }

    /* Stage 4+5 — AI decision + resolve */
    if (validatedCandidates.length === 0) {
      return NextResponse.json({
        error:       'Não foi possível identificar categoria. Use "Navegar por categorias".',
        suggestions: [],
        log,
      })
    }

    const aiDecision   = await scoreCategoryCandidatesWithAI(title, normalizedTitle, validatedCandidates)
    const finalCategory = await resolveFinalCategory(aiDecision, validatedCandidates, token)

    log.final_category = finalCategory.category_id
    log.was_leaf       = finalCategory.is_leaf

    /* Stage 6 — load attributes */
    const attrs = await loadCategoryAttributes(
      finalCategory.category_id,
      finalCategory.domain_id,
      token,
    )

    log.attributes_loaded =
      attrs.required.length + attrs.optional.length + attrs.conditional.length

    const breadcrumb = finalCategory.path_from_root.map((p) => p.name).join(' > ')
      || finalCategory.category_name

    const payload: CategoryAttributePayload = {
      category: {
        category_id:      finalCategory.category_id,
        category_name:    finalCategory.category_name,
        domain_id:        finalCategory.domain_id,
        is_leaf:          finalCategory.is_leaf,
        confidence:       aiDecision.confidence ?? 0.85,
        breadcrumb,
        decision_summary: aiDecision.decision_summary,
      },
      required_attributes:    attrs.required,
      conditional_attributes: attrs.conditional,
      optional_attributes:    attrs.optional,
      variation_attributes:   attrs.variation,
      hidden_attributes:      attrs.hidden,
      rejected_attributes:    [],
    }

    return NextResponse.json({
      ...payload,
      domain_flow:      detectSpecialDomainFlow(finalCategory.domain_id),
      log,
      category_changed: previousCategoryId !== '' && previousCategoryId !== finalCategory.category_id,
    })
  } catch (err) {
    console.error('[categorize]', err)
    return NextResponse.json(
      { error: 'Erro interno na categorização', suggestions: [] },
      { status: 500 },
    )
  }
}
