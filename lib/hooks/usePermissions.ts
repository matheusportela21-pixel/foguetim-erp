'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ROLE_PERMISSIONS, hasPermission } from '@/lib/team/permissions'

export interface PermissionsState {
  can:         (permission: string) => boolean
  role:        string
  isOwner:     boolean
  permissions: string[]
  loading:     boolean
}

/**
 * Hook que retorna as permissões do usuário logado.
 * Se é dono da conta (não é membro de ninguém): tem todas as permissões.
 * Se é membro: permissões baseadas no role + overrides.
 */
export function usePermissions(): PermissionsState {
  const { profile } = useAuth()
  const [teamData, setTeamData] = useState<{
    role: string
    isOwner: boolean
    overrides: Record<string, boolean> | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) { setLoading(false); return }

    // Check session cache
    try {
      const raw = sessionStorage.getItem('team_permissions_cache')
      if (raw) {
        const parsed = JSON.parse(raw) as { role: string; isOwner: boolean; overrides: Record<string, boolean> | null; ts: number }
        if (Date.now() - parsed.ts < 5 * 60 * 1000) {
          setTeamData(parsed)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore */ }

    fetch('/api/team')
      .then(r => r.json())
      .then(d => {
        const data = {
          role: profile.role ?? 'diretor',
          isOwner: d.isOwner ?? true,
          overrides: null as Record<string, boolean> | null,
        }

        // If user is a member (not owner), find their role from members list
        if (!d.isOwner && Array.isArray(d.members)) {
          const self = d.members.find((m: { member_user_id: string }) => m.member_user_id === profile.id)
          if (self) {
            data.role = self.role
            data.overrides = self.permissions ?? null
          }
        }

        setTeamData(data)

        try {
          sessionStorage.setItem('team_permissions_cache', JSON.stringify({ ...data, ts: Date.now() }))
        } catch { /* ignore */ }
      })
      .catch(() => {
        // Default: owner with all permissions
        setTeamData({ role: 'diretor', isOwner: true, overrides: null })
      })
      .finally(() => setLoading(false))
  }, [profile?.id, profile?.role])

  const role    = teamData?.role ?? 'diretor'
  const isOwner = teamData?.isOwner ?? true
  const overrides = teamData?.overrides ?? null

  const can = (permission: string): boolean => {
    if (isOwner) return true
    return hasPermission(role, overrides, permission)
  }

  // Build full permissions list for the current role
  const rolePerms = ROLE_PERMISSIONS[role] ?? []
  const allPerms = rolePerms.includes('*')
    ? ['*']
    : rolePerms.filter(p => !overrides || overrides[p] !== false)
        .concat(Object.entries(overrides ?? {}).filter(([, v]) => v).map(([k]) => k))

  return { can, role, isOwner, permissions: allPerms, loading }
}
