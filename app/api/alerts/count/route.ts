import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getUnreadAlertCount } from '@/lib/alerts/helpers'
export const dynamic = 'force-dynamic'
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ count: 0 })
  const count = await getUnreadAlertCount(user.id)
  return NextResponse.json({ count })
}
