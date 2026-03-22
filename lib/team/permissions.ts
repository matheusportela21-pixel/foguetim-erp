/**
 * lib/team/permissions.ts
 * Sistema de roles e permissões para multi-usuário.
 *
 * Abordagem MVP: membros herdam dados do owner_id.
 * getOwnerUserId(userId) resolve: se membro → owner_id; se owner → próprio id.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Role Permissions Map ────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  diretor: ['*'],

  supervisor: [
    'dashboard:view',
    'orders:view', 'orders:manage',
    'products:view', 'products:edit',
    'inventory:view', 'inventory:manage',
    'financial:view',
    'sac:view', 'sac:respond',
    'shipping:view', 'shipping:manage',
    'reports:view',
    'team:view',
  ],

  analista_produtos: [
    'dashboard:view',
    'products:view', 'products:edit', 'products:create',
    'inventory:view',
    'pricing:view', 'pricing:edit',
    'mappings:view', 'mappings:manage',
  ],

  analista_financeiro: [
    'dashboard:view',
    'financial:view', 'financial:manage',
    'dre:view',
    'costs:view', 'costs:manage',
    'reports:view', 'reports:export',
    'billing:view',
  ],

  suporte: [
    'dashboard:view',
    'sac:view', 'sac:respond',
    'orders:view',
    'products:view',
    'customers:view',
  ],

  operador: [
    'dashboard:view',
    'orders:view', 'orders:manage',
    'shipping:view', 'shipping:manage',
    'inventory:view', 'inventory:manage',
    'products:view',
  ],
}

export const ROLE_LABELS: Record<string, string> = {
  diretor:              'Diretor',
  supervisor:           'Supervisor',
  analista_produtos:    'Analista de Produtos',
  analista_financeiro:  'Analista Financeiro',
  suporte:              'Suporte ao Cliente',
  operador:             'Operador',
}

export const ROLE_COLORS: Record<string, string> = {
  diretor:              'text-purple-400 bg-purple-400/10',
  supervisor:           'text-cyan-400 bg-cyan-400/10',
  analista_produtos:    'text-blue-400 bg-blue-400/10',
  analista_financeiro:  'text-green-400 bg-green-400/10',
  suporte:              'text-amber-400 bg-amber-400/10',
  operador:             'text-slate-400 bg-slate-400/10',
}

export const TEAM_ROLES = ['supervisor', 'analista_produtos', 'analista_financeiro', 'suporte', 'operador'] as const

// All possible permissions for the UI
export const ALL_PERMISSIONS = [
  { key: 'dashboard:view',     label: 'Ver dashboard' },
  { key: 'orders:view',        label: 'Ver pedidos' },
  { key: 'orders:manage',      label: 'Gerenciar pedidos' },
  { key: 'products:view',      label: 'Ver produtos' },
  { key: 'products:edit',      label: 'Editar produtos' },
  { key: 'products:create',    label: 'Criar produtos' },
  { key: 'inventory:view',     label: 'Ver estoque' },
  { key: 'inventory:manage',   label: 'Gerenciar estoque' },
  { key: 'pricing:view',       label: 'Ver precificação' },
  { key: 'pricing:edit',       label: 'Editar precificação' },
  { key: 'financial:view',     label: 'Ver financeiro' },
  { key: 'financial:manage',   label: 'Gerenciar financeiro' },
  { key: 'dre:view',           label: 'Ver DRE' },
  { key: 'costs:view',         label: 'Ver custos' },
  { key: 'costs:manage',       label: 'Gerenciar custos' },
  { key: 'sac:view',           label: 'Ver SAC' },
  { key: 'sac:respond',        label: 'Responder SAC' },
  { key: 'shipping:view',      label: 'Ver expedição' },
  { key: 'shipping:manage',    label: 'Gerenciar expedição' },
  { key: 'reports:view',       label: 'Ver relatórios' },
  { key: 'reports:export',     label: 'Exportar relatórios' },
  { key: 'billing:view',       label: 'Ver faturamento' },
  { key: 'customers:view',     label: 'Ver clientes' },
  { key: 'mappings:view',      label: 'Ver mapeamentos' },
  { key: 'mappings:manage',    label: 'Gerenciar mapeamentos' },
  { key: 'team:view',          label: 'Ver equipe' },
  { key: 'team:manage',        label: 'Gerenciar equipe' },
]

// ─── Permission Check ────────────────────────────────────────────────────────

/** Check if a role + overrides grants a specific permission */
export function hasPermission(
  role: string,
  overrides: Record<string, boolean> | null | undefined,
  permission: string,
): boolean {
  // Diretor has all permissions
  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) return false
  if (rolePerms.includes('*')) return true

  // Check overrides first
  if (overrides) {
    if (overrides[permission] === true) return true
    if (overrides[permission] === false) return false
  }

  // Check wildcard match (e.g. 'orders:*' matches 'orders:view')
  const [domain] = permission.split(':')
  if (rolePerms.includes(`${domain}:*`)) return true

  return rolePerms.includes(permission)
}

// ─── Server-side helpers ─────────────────────────────────────────────────────

interface TeamMembership {
  owner_id:    string
  role:        string
  permissions: Record<string, boolean> | null
  status:      string
}

/**
 * Resolve the owner user_id for data access.
 * If userId is a team member → returns owner_id (data belongs to owner).
 * If userId is the owner → returns own id.
 */
export async function getOwnerUserId(userId: string): Promise<string> {
  const db = supabaseAdmin()

  const { data } = await db
    .from('team_members')
    .select('owner_id, status')
    .eq('member_user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (data?.owner_id) return data.owner_id
  return userId // user is the owner
}

/**
 * Get team role and permissions for a user.
 * Returns null if user is the owner (has all permissions).
 */
export async function getUserTeamRole(userId: string): Promise<TeamMembership | null> {
  const db = supabaseAdmin()

  const { data } = await db
    .from('team_members')
    .select('owner_id, role, permissions, status')
    .eq('member_user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  return data as TeamMembership | null
}

/**
 * Check if a user has a specific permission.
 * Owner (diretor) always returns true.
 * Team members are checked against their role + overrides.
 */
export async function checkPermission(userId: string, permission: string): Promise<boolean> {
  const membership = await getUserTeamRole(userId)

  // Not a team member → they're the owner → full access
  if (!membership) return true

  return hasPermission(membership.role, membership.permissions, permission)
}
