/** SLA indicator based on ticket priority and creation time */

const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high:   24,
  medium: 72,
  low:    168,
}

interface SLAIndicatorProps {
  priority:   string
  createdAt:  string
  status:     string
}

export function SLAIndicator({ priority, createdAt, status }: SLAIndicatorProps) {
  if (status === 'resolved' || status === 'closed') {
    return <span className="text-[10px] text-slate-600">—</span>
  }

  const slaHours  = SLA_HOURS[priority] ?? 72
  const elapsed   = (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  const remaining = slaHours - elapsed
  const pct       = Math.min(100, (elapsed / slaHours) * 100)

  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 ring-1 ring-red-700/40 animate-pulse">
        ⏰ Vencido
      </span>
    )
  }

  if (remaining < 2) {
    const mins = Math.round(remaining * 60)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300 ring-1 ring-yellow-700/40">
        ⚠️ {mins}min
      </span>
    )
  }

  const color = pct > 80 ? 'bg-orange-900/40 text-orange-300 ring-orange-700/40' : 'bg-green-900/40 text-green-300 ring-green-700/40'
  const label = remaining < 24
    ? `${Math.round(remaining)}h`
    : `${Math.round(remaining / 24)}d`

  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${color}`}>
      {label}
    </span>
  )
}
