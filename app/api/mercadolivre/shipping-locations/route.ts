/**
 * GET /api/mercadolivre/shipping-locations?ml_user_id={id}
 * Busca o endereço de expedição da conta ML do usuário.
 * Tenta warehouses primeiro; fallback para endereço do perfil do usuário.
 * Retorna [] em caso de erro para degradação graciosa.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'

export interface ShippingLocation {
  id:           string
  name:         string
  address_line: string
  city:         string
  state:        string
  zip_code:     string
}

interface MLUserAddress {
  city?:         string
  state?:        string
  zip_code?:     string
  street_name?:  string
  street_number?: string | number
}

interface MLUserData {
  id?:             number
  address?:        { city?: string; state?: string }
  seller_address?: MLUserAddress
}

interface MLWarehouse {
  id?:      string | number
  name?:    string
  address?: MLUserAddress
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const mlUserId = req.nextUrl.searchParams.get('ml_user_id')
  if (!mlUserId) return NextResponse.json([])

  try {
    // Option 1: try warehouses / depósitos
    try {
      const warehouses = await mlFetch<unknown>(user.id, `/users/${mlUserId}/warehouses`)
      let rawList: MLWarehouse[] = []
      if (Array.isArray(warehouses)) {
        rawList = warehouses as MLWarehouse[]
      } else if (warehouses && typeof warehouses === 'object') {
        const w = warehouses as Record<string, unknown>
        const nested = w.warehouses ?? w.results ?? w.data
        if (Array.isArray(nested)) rawList = nested as MLWarehouse[]
      }

      if (rawList.length > 0) {
        const locations: ShippingLocation[] = rawList
          .map(w => {
            const addr = w.address
            const street = addr?.street_name
              ? `${addr.street_name}${addr.street_number ? `, ${addr.street_number}` : ''}`
              : 'Endereço não configurado'
            return {
              id:           String(w.id ?? ''),
              name:         String(w.name ?? `Depósito ${w.id ?? ''}`),
              address_line: street,
              city:         addr?.city ?? '',
              state:        addr?.state ?? '',
              zip_code:     addr?.zip_code ?? '',
            }
          })
          .filter(l => l.id !== '')

        if (locations.length > 0) return NextResponse.json(locations)
      }
    } catch { /* fallback to user profile */ }

    // Option 2: use seller address from user profile
    const userData = await mlFetch<MLUserData>(user.id, `/users/${mlUserId}`)
    if (!userData || typeof userData !== 'object') return NextResponse.json([])

    const sa = userData.seller_address
    const street = sa?.street_name
      ? `${sa.street_name}${sa.street_number ? `, ${sa.street_number}` : ''}`
      : 'Endereço do perfil ML'

    const city  = sa?.city  ?? userData.address?.city  ?? ''
    const state = sa?.state ?? userData.address?.state ?? ''

    return NextResponse.json([{
      id:           String(userData.id ?? mlUserId),
      name:         city && state ? `${city}, ${state}` : 'Endereço cadastrado no ML',
      address_line: street,
      city,
      state,
      zip_code: sa?.zip_code ?? '',
    }] as ShippingLocation[])
  } catch {
    return NextResponse.json([])
  }
}
