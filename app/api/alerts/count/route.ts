import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getUnreadAlertCount } from '@/lib/alerts/helpers'
export const dynamic = 'force-dynamic'
export async function GET() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return NextResponse.json({ count: 0 })
  const count = await getUnreadAlertCount(dataOwnerId)
  return NextResponse.json({ count })
}
