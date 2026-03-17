import { getRoleBadge, getRoleLabel, getRoleIcon } from '@/lib/team-roles'

interface RoleBadgeProps {
  role:       string
  showIcon?:  boolean
  className?: string
}

export function RoleBadge({ role, showIcon = true, className = '' }: RoleBadgeProps) {
  const badge = getRoleBadge(role)
  const label = getRoleLabel(role)
  const icon  = getRoleIcon(role)

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge} ${className}`}>
      {showIcon && <span>{icon}</span>}
      {label}
    </span>
  )
}
