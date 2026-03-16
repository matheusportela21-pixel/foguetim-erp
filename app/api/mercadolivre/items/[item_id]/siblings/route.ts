/**
 * GET /api/mercadolivre/items/[item_id]/siblings
 * Retorna todos os planos de venda (anúncios irmãos) vinculados ao
 * mesmo user_product_id, incluindo dados completos + descrição de cada um.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

type Params = { params: { item_id: string } }

interface MLItemRaw {
  id:                 string
  title:              string
  price:              number
  original_price:     number | null
  available_quantity: number
  sold_quantity:      number
  status:             string
  permalink:          string
  thumbnail:          string
  pictures:           { id: string; url: string; secure_url: string }[]
  listing_type_id:    string
  condition:          string
  date_created:       string
  last_updated:       string
  user_product_id:    string | null
  attributes:         {
    id:            string
    name:          string
    value_name:    string | null
    value_struct?: { number?: number; unit?: string } | null
    value_id?:     string | null
  }[]
  shipping:           Record<string, unknown>
  seller_custom_field: string | null
  gtin:               string[] | null
  sale_terms:         { id: string; name: string; value_name: string | null }[]
  buying_mode:        string
  site_id:            string
  category_id:        string
  domain_id?:         string
  variations:         unknown[]
  tags:               string[]
}

interface PlanData extends MLItemRaw {
  description_text: string
}

async function fetchWithToken(token: string, url: string): Promise<Response> {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado', notConnected: true }, { status: 200 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { item_id } = params

  try {
    // 1. Fetch the root item to get user_product_id
    const rootRes = await fetchWithToken(token, `${ML_API_BASE}/items/${item_id}`)
    if (!rootRes.ok) {
      throw new Error(`ML API ${rootRes.status}: ${await rootRes.text()}`)
    }
    const rootItem: MLItemRaw = await rootRes.json()

    // 2. Find sibling item IDs via user_product_id
    let siblingIds: string[] = [item_id]

    if (rootItem.user_product_id) {
      const searchRes = await fetchWithToken(
        token,
        `${ML_API_BASE}/users/${conn.ml_user_id}/items/search?user_product_id=${rootItem.user_product_id}&limit=50`
      )
      if (searchRes.ok) {
        const searchData: unknown = await searchRes.json()
        const results = (searchData as { results?: unknown })?.results
        if (Array.isArray(results) && results.length > 0) {
          siblingIds = results.filter((r): r is string => typeof r === 'string')
        }
      }
    }

    // 3. Fetch details + description for all siblings in parallel
    const planPromises = siblingIds.map(async (id): Promise<PlanData> => {
      const [itemRes, descRes] = await Promise.allSettled([
        fetchWithToken(token, `${ML_API_BASE}/items/${id}`),
        fetchWithToken(token, `${ML_API_BASE}/items/${id}/description`),
      ])

      let itemData: MLItemRaw
      if (itemRes.status === 'fulfilled' && itemRes.value.ok) {
        itemData = await itemRes.value.json() as MLItemRaw
      } else {
        // Fallback: use root item data for the root ID
        itemData = id === item_id ? rootItem : { ...rootItem, id }
      }

      let descriptionText = ''
      if (descRes.status === 'fulfilled' && descRes.value.ok) {
        const descData: { plain_text: string } = await descRes.value.json()
        descriptionText = descData.plain_text ?? ''
      }

      return { ...itemData, description_text: descriptionText }
    })

    const plans = await Promise.all(planPromises)

    // 4. Use attributes from root item (already fetched in step 1)
    // GET /items/{id} includes the complete attributes array with value_name and value_struct
    const attributes = Array.isArray(rootItem.attributes) ? rootItem.attributes : []

    console.log('[siblings GET] item_id:', item_id)
    console.log('[siblings GET] attributes total:', attributes.length)
    console.log('[siblings GET] EAN/GTIN attrs:', JSON.stringify(
      attributes.filter(a => ['GTIN', 'EAN', 'UPC', 'ISBN', 'MPN', 'SELLER_SKU'].includes(a.id))
    ))
    console.log('[siblings GET] seller_custom_field:', rootItem.seller_custom_field)
    console.log('[siblings GET] gtin:', rootItem.gtin)
    console.log('[siblings GET] sold_quantity:', rootItem.sold_quantity)
    console.log('[siblings GET] domain_id:', rootItem.domain_id)

    return NextResponse.json({
      user_product_id: rootItem.user_product_id,
      category_id:     rootItem.category_id,
      domain_id:       rootItem.domain_id ?? '',
      plans,
      attributes,
      ml_user_id:      conn.ml_user_id,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[siblings GET]', msg)
    // Return degraded 200 so the page can show a friendlier error
    return NextResponse.json({
      error: msg,
      user_product_id: null,
      category_id:     '',
      plans:           [],
      attributes:      [],
      ml_user_id:      0,
    }, { status: 200 })
  }
}
