'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Loader2, AlertTriangle } from 'lucide-react'

interface PricePoint {
  price:          number
  previous_price: number
  recorded_at:    string
  source:         string
}

interface Props {
  productId: string
  channel?: string
  days?: number
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PriceHistoryChart({ productId, channel = 'ml', days = 90 }: Props) {
  const [data, setData]       = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo]       = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/products/price-history?product_id=${productId}&channel=${channel}&days=${days}`)
      .then(r => r.json())
      .then(d => {
        setData(d.history ?? [])
        setDemo(d.demo ?? false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId, channel, days])

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 flex items-center justify-center h-[280px]">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center h-[280px] gap-3">
        <AlertTriangle className="w-8 h-8 text-slate-600" />
        <p className="text-sm text-slate-500">Sem dados de historico de precos</p>
      </div>
    )
  }

  const chartData = data.map(p => ({
    date:  formatDate(p.recorded_at),
    price: p.price,
    raw:   p.recorded_at,
  }))

  const firstPrice = data[0].price
  const lastPrice  = data[data.length - 1].price
  const variation  = lastPrice - firstPrice
  const variationPct = firstPrice > 0 ? ((variation / firstPrice) * 100).toFixed(1) : '0.0'
  const isUp = variation > 0

  const prices = data.map(p => p.price)
  const minY = Math.floor(Math.min(...prices) * 0.95)
  const maxY = Math.ceil(Math.max(...prices) * 1.05)

  return (
    <div className="glass-card rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Historico de Precos</h3>
          {demo && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20">
              DEMO
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isUp ? (
            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-green-400" />
          )}
          <span className={`text-xs font-bold tabular-nums ${isUp ? 'text-red-400' : 'text-green-400'}`}>
            {isUp ? '+' : ''}{variationPct}%
          </span>
          <span className="text-[10px] text-slate-600 ml-1">ultimos {days} dias</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `R$${v}`}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e1e2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              formatter={(value: number) => [fmtBRL(value), 'Preco']}
              labelFormatter={(label: string) => label}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#a78bfa', stroke: '#1e1e2e', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
        <div className="text-center flex-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Min</p>
          <p className="text-xs font-bold text-slate-300 tabular-nums">{fmtBRL(Math.min(...prices))}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Media</p>
          <p className="text-xs font-bold text-slate-300 tabular-nums">
            {fmtBRL(prices.reduce((a, b) => a + b, 0) / prices.length)}
          </p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Max</p>
          <p className="text-xs font-bold text-slate-300 tabular-nums">{fmtBRL(Math.max(...prices))}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Atual</p>
          <p className="text-xs font-bold text-white tabular-nums">{fmtBRL(lastPrice)}</p>
        </div>
      </div>
    </div>
  )
}
