/**
 * POST /api/listings/extract-chrome
 * Receives extracted product data from the Chrome extension and creates a draft listing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function corsResponse(body: object, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  // Auth via Bearer token from extension
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return corsResponse({ error: 'Token necessario' }, 401)
  }

  // Verify token with Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return corsResponse({ error: 'Token invalido ou expirado' }, 401)
  }

  try {
    const body = await req.json()

    const userId = user.id

    // Check for team membership to get data owner
    const { data: teamMember } = await supabaseAdmin()
      .from('team_members')
      .select('owner_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const dataOwnerId = teamMember?.owner_id || userId

    // Validate required fields
    if (!body.title || body.title.trim() === '') {
      return corsResponse({ error: 'Titulo e obrigatorio' }, 400)
    }

    // Create draft
    const { data: draft, error: insertError } = await supabaseAdmin()
      .from('draft_listings')
      .insert({
        user_id: dataOwnerId,
        title: body.title?.trim() || 'Sem titulo',
        description: body.description?.trim() || '',
        price: body.price || 0,
        original_price: body.original_price || null,
        currency: body.currency || 'BRL',
        images: body.images || [],
        brand: body.brand || '',
        sku: body.sku || '',
        ean: body.ean || '',
        condition: body.condition || 'new',
        attributes: body.attributes || {},
        status: 'draft',
        created_by: 'chrome_extension',
        target_channels: [],
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating draft:', insertError)
      return corsResponse({ error: 'Erro ao criar rascunho' }, 500)
    }

    return corsResponse({
      success: true,
      message: 'Anuncio copiado! Veja nos rascunhos.',
      draft_id: draft?.id,
    }, 200)
  } catch (error) {
    console.error('Extract chrome error:', error)
    return corsResponse({ error: 'Erro interno' }, 500)
  }
}
