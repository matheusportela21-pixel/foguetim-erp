import type { LucideIcon } from 'lucide-react'

interface AdminStatsProps {
  icon:  LucideIcon
  label: string
  value: number | string
  sub?:  string
  color?: string
  loading?: boolean
}

export function AdminStats({ icon: Icon, label, value, sub, color = 'text-white', loading }: AdminStatsProps) {
  if (loading) {
    return (
      <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04]" />
          <div className="h-3 w-24 bg-white/[0.04] rounded" />
        </div>
        <div className="h-8 w-16 bg-white/[0.04] rounded mb-1" />
        <div className="h-2.5 w-20 bg-white/[0.04] rounded" />
      </div>
    )
  }

  return (
    <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  )
}
