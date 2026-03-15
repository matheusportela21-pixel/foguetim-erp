/**
 * GET /api/mercadolivre/shipping-locations?ml_user_id={id}
 * Busca locais de expedição configurados na conta ML do usuário.
 * Retorna [] em caso de erro para degradação graciosa.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'

export interface ShippingLocation {
  id:   string
  name: string
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const mlUserId = req.nextUrl.searchParams.get('ml_user_id')
  if (!mlUserId) return NextResponse.json([])

  try {
    const data = await mlFetch<unknown>(user.id, `/users/${mlUserId}/shipping_options`)

    // ML may return an object with a nested array, or an array directly
    let rawList: Record<string, unknown>[] = []
    if (Array.isArray(data)) {
      rawList = data as Record<string, unknown>[]
    } else if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>
      const nested = d.shipping_options ?? d.locations ?? d.addresses
      if (Array.isArray(nested)) rawList = nested as Record<string, unknown>[]
    }

    if (rawList.length === 0) return NextResponse.json([])

    const locations: ShippingLocation[] = rawList
      .map(loc => ({
        id:   String(loc.id ?? loc.sender_address_id ?? ''),
        name: String(
          loc.description
          ?? loc.name
          ?? (loc.address_line ?? loc.street_name)
          ?? `Local ${loc.id ?? ''}`,
        ),
      }))
      .filter(l => l.id !== '')

    return NextResponse.json(locations)
  } catch {
    // Non-fatal — page degrades to read-only text
    return NextResponse.json([])
  }
}
