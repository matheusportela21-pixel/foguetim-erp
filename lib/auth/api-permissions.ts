/**
 * lib/auth/api-permissions.ts
 * SEC-012: Middleware de permissão server-side para API routes.
 *
 * Uso:
 *   const { userId, error } = await requirePermission('financial:view')
 *   if (error) return error
 */
import { NextResponse }    from 'next/server'
import { getAuthUser }     from '@/lib/server-auth'
import { checkPermission, getOwnerUserId } from '@/lib/team/permissions'

interface PermissionResult {
  /** ID do usuário autenticado */
  userId: string
  /** ID do "dono" dos dados (owner) — se for team member, retorna owner_id */
  dataOwnerId: string
  /** Se presente, retornar imediatamente (401 ou 403) */
  error?: NextResponse
}

/**
 * Verifica auth + permissão em uma API route.
 * Retorna o userId autenticado e o dataOwnerId (resolvido via getOwnerUserId).
 */
export async function requirePermission(
  permission: string,
): Promise<PermissionResult> {
  const user = await getAuthUser()

  if (!user) {
    return {
      userId: '',
      dataOwnerId: '',
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    }
  }

  const allowed = await checkPermission(user.id, permission)
  if (!allowed) {
    return {
      userId: user.id,
      dataOwnerId: '',
      error: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }),
    }
  }

  // SEC-014: Resolver owner_id para queries de dados
  const dataOwnerId = await getOwnerUserId(user.id)

  return { userId: user.id, dataOwnerId }
}

/**
 * SEC-014: Resolve auth + ownership sem checar permissão.
 * Para rotas que já verificam auth via getAuthUser mas precisam de dataOwnerId.
 * Uso:
 *   const { dataOwnerId, error } = await resolveDataOwner()
 *   if (error) return error
 */
export async function resolveDataOwner(): Promise<PermissionResult> {
  const user = await getAuthUser()

  if (!user) {
    return {
      userId: '',
      dataOwnerId: '',
      error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    }
  }

  const dataOwnerId = await getOwnerUserId(user.id)

  return { userId: user.id, dataOwnerId }
}
