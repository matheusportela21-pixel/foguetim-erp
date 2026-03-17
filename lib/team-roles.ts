export const ROLE_HIERARCHY = {
  super_admin:   6,
  admin:         5,
  supervisor:    4,
  support_senior: 3,
  support_mid:   2,
  support_junior: 1,
} as const

export type FoguetimRole = keyof typeof ROLE_HIERARCHY

export const ROLE_LABELS: Record<FoguetimRole, {
  label: string; icon: string; color: string; description: string
}> = {
  super_admin: {
    label: 'Super Admin', icon: '👑', color: 'purple',
    description: 'Acesso total — proprietário da plataforma',
  },
  admin: {
    label: 'Administrador', icon: '🔴', color: 'red',
    description: 'Administração geral da plataforma',
  },
  supervisor: {
    label: 'Supervisor', icon: '🟠', color: 'orange',
    description: 'Supervisão de equipe e operações',
  },
  support_senior: {
    label: 'Suporte Sênior', icon: '🔵', color: 'blue',
    description: 'Suporte avançado e operações',
  },
  support_mid: {
    label: 'Suporte Pleno', icon: '🟢', color: 'green',
    description: 'Suporte intermediário',
  },
  support_junior: {
    label: 'Suporte Júnior', icon: '⚪', color: 'gray',
    description: 'Suporte básico ao usuário',
  },
}

export const ROLE_BADGE: Record<FoguetimRole, string> = {
  super_admin:   'bg-purple-900/40 text-purple-300 ring-1 ring-purple-700/40',
  admin:         'bg-red-900/40 text-red-300 ring-1 ring-red-700/40',
  supervisor:    'bg-orange-900/40 text-orange-300 ring-1 ring-orange-700/40',
  support_senior:'bg-blue-900/40 text-blue-300 ring-1 ring-blue-700/40',
  support_mid:   'bg-green-900/40 text-green-300 ring-1 ring-green-700/40',
  support_junior:'bg-slate-800/60 text-slate-400 ring-1 ring-slate-700/40',
}

export const ROLE_PERMISSIONS: Record<FoguetimRole, Record<string, boolean>> = {
  super_admin: {
    can_manage_team:        true,
    can_delete_users:       true,
    can_edit_users:         true,
    can_view_all_data:      true,
    can_manage_plans:       true,
    can_send_notifications: true,
    can_view_logs:          true,
    can_manage_tickets:     true,
    can_access_admin:       true,
    can_impersonate:        true,
    can_use_tools:          true,
  },
  admin: {
    can_manage_team:        true,
    can_delete_users:       false,
    can_edit_users:         true,
    can_view_all_data:      true,
    can_manage_plans:       true,
    can_send_notifications: true,
    can_view_logs:          true,
    can_manage_tickets:     true,
    can_access_admin:       true,
    can_impersonate:        false,
    can_use_tools:          true,
  },
  supervisor: {
    can_manage_team:        false,
    can_delete_users:       false,
    can_edit_users:         true,
    can_view_all_data:      true,
    can_manage_plans:       false,
    can_send_notifications: false,
    can_view_logs:          true,
    can_manage_tickets:     true,
    can_access_admin:       true,
    can_impersonate:        false,
    can_use_tools:          false,
  },
  support_senior: {
    can_manage_team:        false,
    can_delete_users:       false,
    can_edit_users:         true,
    can_view_all_data:      false,
    can_manage_plans:       false,
    can_send_notifications: false,
    can_view_logs:          true,
    can_manage_tickets:     true,
    can_access_admin:       true,
    can_impersonate:        false,
    can_use_tools:          false,
  },
  support_mid: {
    can_manage_team:        false,
    can_delete_users:       false,
    can_edit_users:         false,
    can_view_all_data:      false,
    can_manage_plans:       false,
    can_send_notifications: false,
    can_view_logs:          false,
    can_manage_tickets:     true,
    can_access_admin:       true,
    can_impersonate:        false,
    can_use_tools:          false,
  },
  support_junior: {
    can_manage_team:        false,
    can_delete_users:       false,
    can_edit_users:         false,
    can_view_all_data:      false,
    can_manage_plans:       false,
    can_send_notifications: false,
    can_view_logs:          false,
    can_manage_tickets:     true,
    can_access_admin:       true,
    can_impersonate:        false,
    can_use_tools:          false,
  },
}

export function getRoleBadge(role: string): string {
  return ROLE_BADGE[role as FoguetimRole] ?? 'bg-slate-800/60 text-slate-400 ring-1 ring-slate-700/40'
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as FoguetimRole]?.label ?? role
}

export function getRoleIcon(role: string): string {
  return ROLE_LABELS[role as FoguetimRole]?.icon ?? '⚪'
}

export function canDo(role: FoguetimRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false
}

export function isHigherOrEqual(a: FoguetimRole, b: FoguetimRole): boolean {
  return ROLE_HIERARCHY[a] >= ROLE_HIERARCHY[b]
}

export const ALL_ROLES = Object.keys(ROLE_HIERARCHY) as FoguetimRole[]
