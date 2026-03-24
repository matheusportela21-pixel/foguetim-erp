'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCountUp } from '@/lib/animations'

export interface KpiCardProps {
  label:       string
  value:       number | string | null
  /** If provided, animates from 0 to value as integer */
  animate?:    boolean
  /** BRL currency format */
  currency?:   boolean
  /** Percentage trend vs previous period */
  trend?:      number | null
  trendLabel?: string
  icon:        React.ElementType
  iconColor?:  string
  /** e.g. "bg-primary-500/10" */
  iconBg?:     string
  loading?:    boolean
  prefix?:     string
  suffix?:     string
  /** Extra info below trend */
  sub?:        string
  href?:       string
  className?:  string
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtNum(v: number) {
  return v.toLocaleString('pt-BR')
}

function TrendBadge({ trend, label }: { trend: number; label?: string }) {
  const isUp    = trend > 0
  const isFlat  = trend === 0
  const color   = isFlat ? 'text-slate-400' : isUp ? 'text-emerald-400' : 'text-red-400'
  const bg      = isFlat ? 'bg-slate-500/10' : isUp ? 'bg-emerald-500/10' : 'bg-red-500/10'
  const Icon    = isFlat ? Minus : isUp ? TrendingUp : TrendingDown
  const sign    = isUp ? '+' : ''

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${color} ${bg}`}>
      <Icon className="w-3 h-3" />
      {sign}{trend.toFixed(1)}%
      {label && <span className="text-[10px] opacity-70">{label}</span>}
    </span>
  )
}

/* ── Skeleton ──────────────────────────────────────────────────────── */
function KpiSkeleton({ className }: { className?: string }) {
  return (
    <div className={`glass-card p-5 rounded-2xl animate-pulse ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 bg-white/5 rounded" />
        <div className="w-9 h-9 rounded-xl bg-white/5" />
      </div>
      <div className="h-7 w-28 bg-white/5 rounded mb-2" />
      <div className="h-2.5 w-20 bg-white/5 rounded" />
    </div>
  )
}

/* ── Animated value ────────────────────────────────────────────────── */
function AnimatedValue({
  value, currency, prefix, suffix,
}: {
  value: number; currency?: boolean; prefix?: string; suffix?: string
}) {
  const count = useCountUp(value, 900)
  const formatted = currency ? fmtBRL(count) : fmtNum(count)
  return <>{prefix}{formatted}{suffix}</>
}

/* ── KpiCard ───────────────────────────────────────────────────────── */
export function KpiCard({
  label, value, animate, currency, trend, trendLabel,
  icon: Icon, iconColor = 'text-primary-400',
  iconBg = 'bg-primary-500/10', loading, prefix, suffix,
  sub, href, className,
}: KpiCardProps) {

  if (loading) return <KpiSkeleton className={className} />

  const Wrapper = href
    ? ({ children }: { children: React.ReactNode }) =>
        <a href={href} className="block group/kpi">{children}</a>
    : ({ children }: { children: React.ReactNode }) =>
        <div className="group/kpi">{children}</div>

  const numericValue = typeof value === 'number' ? value : null

  return (
    <Wrapper>
      <motion.div
        className={`glass-card p-5 rounded-2xl transition-all duration-200
          group-hover/kpi:border-primary-500/25 group-hover/kpi:shadow-glow-sm
          ${className ?? ''}`}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-slate-400 font-medium leading-tight">{label}</p>
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} style={{ width: 18, height: 18 }} />
          </div>
        </div>

        {/* Value */}
        <p className="text-2xl font-bold text-white font-display tracking-tight mb-1.5">
          {numericValue !== null && animate
            ? <AnimatedValue value={numericValue} currency={currency} prefix={prefix} suffix={suffix} />
            : typeof value === 'string' || value === null
              ? (value ?? '—')
              : currency
                ? fmtBRL(numericValue!)
                : `${prefix ?? ''}${fmtNum(numericValue!)}${suffix ?? ''}`
          }
        </p>

        {/* Trend + sub */}
        <div className="flex items-center gap-2 flex-wrap">
          {trend !== null && trend !== undefined && (
            <TrendBadge trend={trend} label={trendLabel} />
          )}
          {sub && (
            <span className="text-[11px] text-slate-500">{sub}</span>
          )}
        </div>
      </motion.div>
    </Wrapper>
  )
}

export default KpiCard
