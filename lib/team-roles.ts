export const ROLE_HIERARCHY = {
  owner:            6,
  admin:            5,
  foguetim_support: 4,
  support:          3,
  analyst:          2,
  viewer:           1,
} as const

export type FoguetimRole = keyof typeof ROLE_HIERARCHY

export const ROLE_LABELS: Record<FoguetimRole, { label: string; color: string; description: string }> = {
  owner:            { label: 'Owner',          color: 'purple', description: 'Acesso total à plataforma' },
  admin:            { label: 'Admin',           color: 'red',    description: 'Administrador geral' },
  foguetim_support: { label: 'Suporte Sênior', color: 'orange', description: 'Suporte avançado' },
  support:          { label: 'Suporte',         color: 'blue',   description: 'Atendimento ao usuário' },
  analyst:          { label: 'Analista',        color: 'green',  description: 'Análise de dados' },
  viewer:           { label: 'Visualizador',    color: 'gray',   description: 'Apenas leitura' },
}

export const ROLE_BADGE: Record<FoguetimRole, string> = {
  owner:            'bg-purple-900/40 text-purple-300 ring-1 ring-purple-700/40',
  admin:            'bg-red-900/40 text-red-300 ring-1 ring-red-700/40',
  foguetim_support: 'bg-orange-900/40 text-orange-300 ring-1 ring-orange-700/40',
  support:          'bg-blue-900/40 text-blue-300 ring-1 ring-blue-700/40',
  analyst:          'bg-green-900/40 text-green-300 ring-1 ring-green-700/40',
  viewer:           'bg-slate-800/60 text-slate-400 ring-1 ring-slate-700/40',
}

export const ROLE_PERMISSIONS: Record<FoguetimRole, Record<string, boolean>> = {
  owner: {
    can_manage_team:       true,
    can_delete_users:      true,
    can_edit_users:        true,
    can_view_all_data:     true,
    can_manage_plans:      true,
    can_send_notifications: true,
    can_view_logs:         true,
    can_manage_tickets:    true,
    can_access_admin:      true,
    can_impersonate:       true,
  },
  admin: {
    can_manage_team:       true,
    can_delete_users:      false,
    can_edit_users:        true,
    can_view_all_data:     true,
    can_manage_plans:      true,
    can_send_notifications: true,
    can_view_logs:         true,
    can_manage_tickets:    true,
    can_access_admin:      true,
    can_impersonate:       false,
  },
  foguetim_support: {
    can_manage_team:       false,
    can_delete_users:      false,
    can_edit_users:        true,
    can_view_all_data:     true,
    can_manage_plans:      false,
    can_send_notifications: true,
    can_view_logs:         true,
    can_manage_tickets:    true,
    can_access_admin:      true,
    can_impersonate:       false,
  },
  support: {
    can_manage_team:       false,
    can_delete_users:      false,
    can_edit_users:        false,
    can_view_all_data:     false,
    can_manage_plans:      false,
    can_send_notifications: false,
    can_view_logs:         false,
    can_manage_tickets:    true,
    can_access_admin:      true,
    can_impersonate:       false,
  },
  analyst: {
    can_manage_team:       false,
    can_delete_users:      false,
    can_edit_users:        false,
    can_view_all_data:     true,
    can_manage_plans:      false,
    can_send_notifications: false,
    can_view_logs:         true,
    can_manage_tickets:    false,
    can_access_admin:      true,
    can_impersonate:       false,
  },
  viewer: {
    can_manage_team:       false,
    can_delete_users:      false,
    can_edit_users:        false,
    can_view_all_data:     false,
    can_manage_plans:      false,
    can_send_notifications: false,
    can_view_logs:         false,
    can_manage_tickets:    false,
    can_access_admin:      true,
    can_impersonate:       false,
  },
}

export function canDo(role: FoguetimRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false
}

export function isHigherOrEqual(a: FoguetimRole, b: FoguetimRole): boolean {
  return ROLE_HIERARCHY[a] >= ROLE_HIERARCHY[b]
}
