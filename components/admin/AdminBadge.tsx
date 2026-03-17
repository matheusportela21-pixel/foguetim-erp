/** Generic badge component for admin UI */

const PLAN_COLORS: Record<string, string> = {
  explorador:      '#64748b',
  piloto:          '#3b82f6',
  crescimento:     '#3b82f6',
  comandante:      '#8b5cf6',
  almirante:       '#f59e0b',
  missao_espacial: '#f59e0b',
  enterprise:      '#ef4444',
}

const PLAN_LABELS: Record<string, string> = {
  explorador:      'Explorador',
  piloto:          'Piloto',
  crescimento:     'Crescimento',
  comandante:      'Comandante',
  almirante:       'Almirante',
  missao_espacial: 'Missão Espacial',
  enterprise:      'Enterprise',
}

export function PlanBadge({ plan }: { plan: string }) {
  const color = PLAN_COLORS[plan] ?? '#64748b'
  const label = PLAN_LABELS[plan] ?? plan
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${color}20`, color }}
    >
      {label}
    </span>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span className="text-xs font-semibold text-green-400">Ativo</span>
    : <span className="text-xs font-semibold text-red-400">Cancelado</span>
}

const TICKET_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open:         { label: 'Aberto',          cls: 'bg-blue-900/40 text-blue-300 ring-1 ring-blue-700/40'     },
  in_progress:  { label: 'Em andamento',    cls: 'bg-orange-900/40 text-orange-300 ring-1 ring-orange-700/40' },
  waiting_user: { label: 'Ag. usuário',     cls: 'bg-yellow-900/40 text-yellow-300 ring-1 ring-yellow-700/40' },
  resolved:     { label: 'Resolvido',       cls: 'bg-green-900/40 text-green-300 ring-1 ring-green-700/40'  },
  closed:       { label: 'Fechado',         cls: 'bg-slate-800 text-slate-500'                               },
}

export function TicketStatusBadge({ status }: { status: string }) {
  const cfg = TICKET_STATUS_CFG[status] ?? { label: status, cls: 'bg-slate-800 text-slate-400' }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  urgent: { label: '🔴 Urgente', color: 'text-red-400'    },
  high:   { label: '🟠 Alta',    color: 'text-orange-400' },
  medium: { label: '🔵 Média',   color: 'text-blue-400'   },
  low:    { label: '⚪ Baixa',   color: 'text-slate-500'  },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CFG[priority] ?? { label: priority, color: 'text-slate-500' }
  return <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
}
