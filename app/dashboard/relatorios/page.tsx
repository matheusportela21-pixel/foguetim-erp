'use client'

import Header from '@/components/Header'
import { BarChart3, TrendingUp, Package, Users, DollarSign, ShoppingCart, Star, Zap, FileDown, Clock } from 'lucide-react'

const reports = [
  {
    icon: TrendingUp,   title: 'Relatório de Vendas',
    desc: 'Análise completa de receita, ticket médio e crescimento por período.',
    tags: ['Mensal', 'Semanal', 'Diário'], available: true, ai: false,
  },
  {
    icon: Package,      title: 'Performance de Produtos',
    desc: 'Ranking de produtos mais vendidos, giro de estoque e margem por SKU.',
    tags: ['Produtos', 'Estoque'], available: true, ai: false,
  },
  {
    icon: BarChart3,    title: 'Relatório por Marketplace',
    desc: 'Comparativo de performance entre ML, Shopee, Amazon e demais canais.',
    tags: ['Canais', 'Comparativo'], available: true, ai: false,
  },
  {
    icon: DollarSign,   title: 'Análise Financeira',
    desc: 'Breakdown de custos, comissões, frete e lucratividade líquida.',
    tags: ['Financeiro', 'Custos'], available: true, ai: false,
  },
  {
    icon: Users,        title: 'Relatório de Clientes',
    desc: 'LTV, taxa de recompra, segmentação e clientes em risco de churn.',
    tags: ['CRM', 'Fidelidade'], available: false, ai: false,
  },
  {
    icon: ShoppingCart, title: 'Funil de Pedidos',
    desc: 'Taxa de cancelamento, devoluções e gargalos operacionais.',
    tags: ['Operações', 'Qualidade'], available: false, ai: false,
  },
  {
    icon: Star,         title: 'Insights IA — Previsão de Demanda',
    desc: 'Previsão de vendas para os próximos 30 dias baseada em histórico e sazonalidade.',
    tags: ['IA', 'Previsão'], available: false, ai: true,
  },
  {
    icon: Zap,          title: 'Insights IA — Otimização de Preços',
    desc: 'Sugestões de ajuste de preços para maximizar margem e competitividade.',
    tags: ['IA', 'Precificação'], available: false, ai: true,
  },
  {
    icon: TrendingUp,   title: 'Insights IA — Análise de Concorrência',
    desc: 'Monitoramento automático de concorrentes nos marketplaces conectados.',
    tags: ['IA', 'Mercado'], available: false, ai: true,
  },
]

const quickStats = [
  { label: 'Receita do mês',    val: 'R$ 52.800', delta: '+11,8%', color: 'text-green-400' },
  { label: 'Lucro líquido',     val: 'R$ 24.700', delta: '+14,4%', color: 'text-green-400' },
  { label: 'Ticket médio',      val: 'R$ 86,30',  delta: '+3,2%',  color: 'text-green-400' },
  { label: 'Taxa cancelamento', val: '4,2%',       delta: '-0,8%',  color: 'text-red-400'   },
]

export default function RelatoriosPage() {
  return (
    <div>
      <Header title="Relatórios" subtitle="Análises e insights do seu negócio" />

      <div className="p-6 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map(s => (
            <div key={s.label} className="dash-card p-4 rounded-2xl">
              <p className="text-xs text-slate-600 mb-1">{s.label}</p>
              <p className="text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{s.val}</p>
              <p className={`text-xs font-semibold mt-1 ${s.color}`}>{s.delta} vs. mês anterior</p>
            </div>
          ))}
        </div>

        {/* Reports grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Relatórios Disponíveis</h3>
            <span className="text-xs text-slate-600">{reports.filter(r => r.available).length} disponíveis · {reports.filter(r => !r.available).length} em breve</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map(r => (
              <div key={r.title} className={`dash-card rounded-2xl p-5 transition-all ${r.available ? 'hover:border-purple-500/30' : 'opacity-60'} ${r.ai ? 'border border-purple-500/20 bg-purple-500/5' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.ai ? 'bg-purple-500/20' : 'bg-dark-700'}`}>
                    <r.icon className={`w-[18px] h-[18px] ${r.ai ? 'text-purple-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {r.ai && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30">
                        IA
                      </span>
                    )}
                    {!r.available && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
                        Em breve
                      </span>
                    )}
                  </div>
                </div>

                <p className="font-bold text-white text-sm mb-1.5">{r.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{r.desc}</p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {r.tags.map(t => (
                      <span key={t} className="text-[9px] font-medium text-slate-600 bg-dark-700 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>

                  {r.available ? (
                    <button className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors shrink-0">
                      <FileDown className="w-3.5 h-3.5" /> Gerar
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock className="w-3 h-3" /> Breve
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI teaser */}
        <div className="dash-card rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-cyan-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim IA — Em breve</p>
              <p className="text-xs text-slate-500">Análises preditivas para o seu e-commerce</p>
            </div>
            <span className="ml-auto text-[10px] bg-purple-900/50 text-purple-400 px-2 py-1 rounded-full font-bold">Q3 2026</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              'Previsão de demanda por SKU e sazonalidade',
              'Detecção automática de oportunidades de precificação',
              'Alertas de anomalias em vendas e estoque',
            ].map(f => (
              <div key={f} className="bg-dark-700 rounded-xl p-3">
                <p className="text-xs text-slate-400 leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
