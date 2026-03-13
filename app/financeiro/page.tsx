'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownRight, CreditCard, Wallet, BarChart3, Calendar,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Mock data ────────────────────────────────────────────────────────────────

const monthlyData = [
  { mes: 'Out/24', receita: 48200, custo: 28100, despesas: 6400, lucro: 13700 },
  { mes: 'Nov/24', receita: 62100, custo: 34500, despesas: 7200, lucro: 20400 },
  { mes: 'Dez/24', receita: 91400, custo: 48200, despesas: 9100, lucro: 34100 },
  { mes: 'Jan/25', receita: 53800, custo: 31000, despesas: 6800, lucro: 16000 },
  { mes: 'Fev/25', receita: 71200, custo: 38700, despesas: 7500, lucro: 25000 },
  { mes: 'Mar/25', receita: 84600, custo: 44100, despesas: 8200, lucro: 32300 },
]

const dailyData = Array.from({ length: 30 }, (_, i) => ({
  dia: `${i + 1}/03`,
  receita: Math.floor(Math.random() * 4000 + 1500),
  pedidos: Math.floor(Math.random() * 50 + 20),
}))

const expenseCategories = [
  { name: 'Custo de mercadorias (CMV)', valor: 44100, pct: 52.1, color: '#ff3b6b' },
  { name: 'Frete e logística',           valor: 8200,  pct: 9.7,  color: '#ff8c00' },
  { name: 'Comissões plataformas',        valor: 11200, pct: 13.2, color: '#a855f7' },
  { name: 'Impostos (Simples Nacional)',  valor: 5900,  pct: 6.9,  color: '#00d4ff' },
  { name: 'Marketing e tráfego',          valor: 4100,  pct: 4.8,  color: '#00ff88' },
  { name: 'Operacional e outros',         valor: 2800,  pct: 3.3,  color: '#60a5fa' },
]

const platformRevenue = [
  { plat: 'Mercado Livre', receita: 43992, pedidos: 667, ticket: 65.96, margem: 38.2 },
  { plat: 'Shopee',        receita: 23688, pedidos: 359, ticket: 65.98, margem: 35.8 },
  { plat: 'Amazon',        receita: 16920, pedidos: 258, ticket: 65.58, margem: 41.2 },
]

const cashflowData = [
  { semana: 'S1 Mar', entradas: 18400, saidas: 12100, saldo: 6300 },
  { semana: 'S2 Mar', entradas: 22100, saidas: 14500, saldo: 7600 },
  { semana: 'S3 Mar', entradas: 19800, saidas: 11800, saldo: 8000 },
  { semana: 'S4 Mar', entradas: 24300, saidas: 13900, saldo: 10400 },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card rounded-xl p-3 text-xs border border-neon-blue/30">
        <p className="text-slate-300 font-semibold mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-mono">
            {p.name}: R$ {p.value?.toLocaleString('pt-BR')}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function KpiCard({
  title, value, change, changeLabel, icon: Icon, color,
}: {
  title: string; value: string; change: number; changeLabel: string;
  icon: React.ElementType; color: 'blue' | 'green' | 'red' | 'purple'
}) {
  const isUp = change >= 0
  const colorMap = {
    blue:   'from-neon-blue/20   to-transparent border-neon-blue/20   text-neon-blue',
    green:  'from-neon-green/20  to-transparent border-neon-green/20  text-neon-green',
    red:    'from-neon-red/20    to-transparent border-neon-red/20    text-neon-red',
    purple: 'from-neon-purple/20 to-transparent border-neon-purple/20 text-neon-purple',
  }
  return (
    <div className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${colorMap[color]} border`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${colorMap[color]}`}><Icon className="w-4 h-4" /></div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-neon-green' : 'text-neon-red'}`}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{title}</p>
      <p className="text-[10px] text-slate-600 font-mono mt-0.5">{changeLabel}</p>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Financeiro() {
  const [period, setPeriod] = useState<'mes' | 'trimestre' | 'ano'>('mes')
  const [view, setView] = useState<'visao-geral' | 'plataformas' | 'fluxo'>('visao-geral')

  const cur = monthlyData[monthlyData.length - 1]
  const prev = monthlyData[monthlyData.length - 2]
  const changeReceita = ((cur.receita - prev.receita) / prev.receita) * 100
  const changeLucro   = ((cur.lucro   - prev.lucro)   / prev.lucro)   * 100
  const changeCusto   = ((cur.custo   - prev.custo)   / prev.custo)   * 100
  const margemLiquida = (cur.lucro / cur.receita) * 100

  return (
    <div className="min-h-screen">
      <Header title="Painel Financeiro" subtitle="Receitas, custos e lucratividade do seu negócio" />

      <div className="p-6 lg:p-8 space-y-6">

        {/* Period selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-space-800/60 rounded-xl p-1 border border-neon-blue/10">
            {(['mes', 'trimestre', 'ano'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  period === p ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'mes' ? 'Este mês' : p === 'trimestre' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>

          <div className="flex bg-space-800/60 rounded-xl p-1 border border-neon-blue/10 ml-auto">
            {[
              { key: 'visao-geral', label: 'Visão Geral' },
              { key: 'plataformas', label: 'Por Plataforma' },
              { key: 'fluxo',       label: 'Fluxo de Caixa' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key as typeof view)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  view === v.key ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Receita bruta" value={`R$ ${cur.receita.toLocaleString('pt-BR')}`}
            change={changeReceita} changeLabel="vs. mês anterior"
            icon={DollarSign} color="blue"
          />
          <KpiCard
            title="Lucro líquido" value={`R$ ${cur.lucro.toLocaleString('pt-BR')}`}
            change={changeLucro} changeLabel={`margem ${margemLiquida.toFixed(1)}%`}
            icon={TrendingUp} color="green"
          />
          <KpiCard
            title="Custo total (CMV)" value={`R$ ${cur.custo.toLocaleString('pt-BR')}`}
            change={changeCusto} changeLabel="custo de mercadorias"
            icon={TrendingDown} color="red"
          />
          <KpiCard
            title="Despesas operacionais" value={`R$ ${cur.despesas.toLocaleString('pt-BR')}`}
            change={3.2} changeLabel="frete, mkt, operacional"
            icon={CreditCard} color="purple"
          />
        </div>

        {/* ─── Visão Geral ─── */}
        {view === 'visao-geral' && (
          <div className="space-y-6">
            {/* Main area chart */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-white">Receita × Custos × Lucro</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Últimos 6 meses</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {[
                      { id: 'colorReceita', color: '#00d4ff' },
                      { id: 'colorCusto',   color: '#ff3b6b' },
                      { id: 'colorLucro',   color: '#00ff88' },
                    ].map(g => (
                      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={g.color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={g.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" />
                  <XAxis dataKey="mes" tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#00d4ff" strokeWidth={2} fill="url(#colorReceita)" />
                  <Area type="monotone" dataKey="custo"   name="Custos"  stroke="#ff3b6b" strokeWidth={2} fill="url(#colorCusto)" />
                  <Area type="monotone" dataKey="lucro"   name="Lucro"   stroke="#00ff88" strokeWidth={2} fill="url(#colorLucro)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense breakdown */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-5">
                  <Wallet className="w-4 h-4 text-neon-red" />Composição de Custos
                </h3>
                <div className="space-y-3">
                  {expenseCategories.map(e => (
                    <div key={e.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{e.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-300">R$ {e.valor.toLocaleString('pt-BR')}</span>
                          <span className="font-mono font-semibold w-10 text-right" style={{ color: e.color }}>{e.pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-space-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${e.pct}%`, background: e.color, boxShadow: `0 0 8px ${e.color}50` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-neon-blue/10 flex justify-between text-sm">
                  <span className="text-slate-400">Total de custos</span>
                  <span className="font-mono font-bold text-neon-red">
                    R$ {expenseCategories.reduce((s, e) => s + e.valor, 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Daily revenue chart */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-5">
                  <Calendar className="w-4 h-4 text-neon-blue" />Receita Diária – Março
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 9 }} axisLine={false} tickLine={false}
                      interval={4} />
                    <YAxis tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v/1000).toFixed(1)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="receita" name="Receita" fill="rgba(0,212,255,0.5)" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ─── Por Plataforma ─── */}
        {view === 'plataformas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {platformRevenue.map(p => {
                const colors: Record<string, { text: string; border: string; bg: string }> = {
                  'Mercado Livre': { text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/5' },
                  'Shopee':        { text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/5' },
                  'Amazon':        { text: 'text-neon-blue',  border: 'border-neon-blue/30',  bg: 'bg-neon-blue/5' },
                }
                const c = colors[p.plat]
                return (
                  <div key={p.plat} className={`glass-card rounded-2xl p-5 border ${c.border} ${c.bg}`}>
                    <h3 className={`font-semibold ${c.text} mb-4`}>{p.plat}</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Receita', val: `R$ ${p.receita.toLocaleString('pt-BR')}` },
                        { label: 'Pedidos', val: p.pedidos.toLocaleString('pt-BR') },
                        { label: 'Ticket médio', val: `R$ ${p.ticket.toFixed(2)}` },
                        { label: 'Margem líquida', val: `${p.margem}%` },
                      ].map(m => (
                        <div key={m.label} className="flex justify-between text-sm">
                          <span className="text-slate-400">{m.label}</span>
                          <span className={`font-mono font-semibold ${c.text}`}>{m.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[10px] text-slate-600 font-mono mb-1">Participação na receita</p>
                      <div className="h-1.5 bg-space-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full`} style={{
                          width: `${(p.receita / platformRevenue.reduce((s, x) => s + x.receita, 0)) * 100}%`,
                          background: c.text.includes('yellow') ? '#FFE600' : c.text.includes('orange') ? '#FF5722' : '#00d4ff',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-6">
                <BarChart3 className="w-4 h-4 text-neon-purple" />Receita por Plataforma — Histórico
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={monthlyData.map(m => ({
                    mes: m.mes,
                    'Mercado Livre': Math.floor(m.receita * 0.52),
                    'Shopee':        Math.floor(m.receita * 0.28),
                    'Amazon':        Math.floor(m.receita * 0.20),
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: 'rgba(148,163,184,0.7)', fontSize: 11 }} />
                  <Bar dataKey="Mercado Livre" fill="rgba(255,230,0,0.7)"  radius={[3,3,0,0]} />
                  <Bar dataKey="Shopee"        fill="rgba(255,87,34,0.7)"  radius={[3,3,0,0]} />
                  <Bar dataKey="Amazon"        fill="rgba(0,212,255,0.7)"  radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ─── Fluxo de Caixa ─── */}
        {view === 'fluxo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de entradas', val: `R$ ${cashflowData.reduce((s,c)=>s+c.entradas,0).toLocaleString('pt-BR')}`, color: 'text-neon-green' },
                { label: 'Total de saídas',   val: `R$ ${cashflowData.reduce((s,c)=>s+c.saidas,0).toLocaleString('pt-BR')}`,   color: 'text-neon-red' },
                { label: 'Saldo acumulado',   val: `R$ ${cashflowData.reduce((s,c)=>s+c.saldo,0).toLocaleString('pt-BR')}`,   color: 'text-neon-blue' },
                { label: 'Melhor semana',     val: 'S4 Mar',  color: 'text-neon-purple' },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-mono">{s.label}</p>
                  <p className={`text-xl font-bold font-mono mt-1 ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-6">
                <Wallet className="w-4 h-4 text-neon-green" />Fluxo de Caixa — Março 2025
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashflowData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(148,163,184,0.7)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="entradas" name="Entradas" fill="rgba(0,255,136,0.6)" radius={[4,4,0,0]} />
                  <Bar dataKey="saidas"   name="Saídas"   fill="rgba(255,59,107,0.6)" radius={[4,4,0,0]} />
                  <Bar dataKey="saldo"    name="Saldo"    fill="rgba(0,212,255,0.6)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full table-cyber text-sm">
                  <thead>
                    <tr className="border-b border-neon-blue/10 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                      <th className="text-left py-2 px-3">Período</th>
                      <th className="text-right py-2 px-3">Entradas</th>
                      <th className="text-right py-2 px-3">Saídas</th>
                      <th className="text-right py-2 px-3">Saldo</th>
                      <th className="text-right py-2 px-3">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflowData.map((c, i) => {
                      const prev = i > 0 ? cashflowData[i-1].saldo : c.saldo
                      const change = ((c.saldo - prev) / prev) * 100
                      return (
                        <tr key={c.semana}>
                          <td className="py-3 px-3 font-mono text-xs text-slate-400">{c.semana}</td>
                          <td className="py-3 px-3 text-right font-mono text-xs text-neon-green">R$ {c.entradas.toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-3 text-right font-mono text-xs text-neon-red">R$ {c.saidas.toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-neon-blue">R$ {c.saldo.toLocaleString('pt-BR')}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-xs font-mono font-semibold flex items-center justify-end gap-1 ${change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(change).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
