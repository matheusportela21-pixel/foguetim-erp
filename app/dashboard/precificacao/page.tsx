'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import { Calculator, Info, TrendingUp, DollarSign, Package, Truck, Percent, ChevronRight } from 'lucide-react'

// ─── Platform configs ──────────────────────────────────────────────────────────

const PLATFORMS = {
  ML: {
    label: 'Mercado Livre',
    color: '#FFE600',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-500/10',
    comissao: 14,        // % comissão padrão ML Full
    taxaFixa: 6,         // R$ taxa fixa por venda (média)
    freteMedio: 18,      // R$ frete médio
  },
  SP: {
    label: 'Shopee',
    color: '#FF5722',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500/10',
    comissao: 14,
    taxaFixa: 0,
    freteMedio: 12,
  },
  AMZ: {
    label: 'Amazon',
    color: '#00d4ff',
    textColor: 'text-neon-blue',
    borderColor: 'border-neon-blue',
    bgColor: 'bg-neon-blue/10',
    comissao: 15,
    taxaFixa: 0,
    freteMedio: 22,
  },
}

// Simples Nacional faixas aproximadas
const REGIMES = [
  { label: 'Simples Nacional (Anexo I)', aliquota: 6 },
  { label: 'Simples Nacional (Anexo II)', aliquota: 7.25 },
  { label: 'Lucro Presumido', aliquota: 11.33 },
  { label: 'Lucro Real', aliquota: 13.25 },
  { label: 'MEI (isento)', aliquota: 0 },
]

// ─── Calc function ─────────────────────────────────────────────────────────────

function calcPreco(
  custo: number,
  margemDesejada: number,
  comissao: number,
  taxaFixa: number,
  frete: number,
  imposto: number,
  freteGratis: boolean,
) {
  // Preço mínimo = custo + frete + taxa_fixa + (preço * comissao%) + (preço * imposto%) com margem
  // Fórmula: preço = (custo + frete + taxaFixa) / (1 - comissao/100 - imposto/100 - margem/100)
  const freteReal = freteGratis ? frete : 0
  const denominador = 1 - comissao / 100 - imposto / 100 - margemDesejada / 100
  if (denominador <= 0) return { preco: 0, lucro: 0, margem: 0 }
  const preco = (custo + freteReal + taxaFixa) / denominador
  const lucro = preco - custo - freteReal - taxaFixa - (preco * comissao / 100) - (preco * imposto / 100)
  const margem = (lucro / preco) * 100
  return { preco, lucro, margem }
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

function InputGroup({
  label, hint, value, onChange, prefix, suffix, type = 'number',
}: {
  label: string; hint?: string; value: number | string; onChange: (v: number) => void;
  prefix?: string; suffix?: string; type?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">{label}</label>
        {hint && (
          <div className="group relative">
            <Info className="w-3 h-3 text-slate-600 cursor-help" />
            <div className="absolute left-4 bottom-4 z-10 hidden group-hover:block w-48 p-2 rounded-lg glass-card text-[10px] text-slate-300 border border-neon-blue/20">
              {hint}
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">{prefix}</span>}
        <input
          type={type}
          className={`input-cyber w-full py-2.5 rounded-lg text-sm font-mono ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-10' : 'pr-3'}`}
          value={value}
          onChange={e => onChange(+e.target.value)}
          min={0}
          step={0.01}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Platform result card ──────────────────────────────────────────────────────

function PlatformCard({
  platKey, config, result, custo, frete, comissao, imposto, taxaFixa,
}: {
  platKey: string
  config: typeof PLATFORMS[keyof typeof PLATFORMS]
  result: { preco: number; lucro: number; margem: number }
  custo: number; frete: number; comissao: number; imposto: number; taxaFixa: number
}) {
  const breakdown = [
    { label: 'Custo produto',   val: custo,                              color: 'text-slate-400' },
    { label: 'Frete embutido',  val: frete,                              color: 'text-neon-orange' },
    { label: 'Taxa fixa',       val: taxaFixa,                           color: 'text-neon-red' },
    { label: `Comissão (${comissao}%)`, val: result.preco * comissao / 100, color: 'text-neon-red' },
    { label: `Impostos (${imposto}%)`,  val: result.preco * imposto / 100,  color: 'text-neon-red' },
    { label: 'Lucro líquido',   val: result.lucro,                       color: 'text-neon-green' },
  ]

  return (
    <div className={`glass-card rounded-2xl p-5 border ${config.borderColor} border-opacity-30 hover:border-opacity-60 transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full`} style={{ background: config.color }} />
          <span className={`font-semibold ${config.textColor}`}>{config.label}</span>
        </div>
        <span className={`badge ${config.bgColor} ${config.borderColor} ${config.textColor} border`}>{platKey}</span>
      </div>

      {/* Price hero */}
      <div className="text-center py-4 mb-4">
        <p className="text-xs text-slate-500 font-mono mb-1">PREÇO IDEAL DE VENDA</p>
        <p className={`text-4xl font-bold ${config.textColor} font-mono`}>
          {result.preco > 0 ? `R$ ${result.preco.toFixed(2).replace('.', ',')}` : '—'}
        </p>
        {result.preco > 0 && (
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Margem real: <span className="text-neon-green font-semibold">{result.margem.toFixed(1)}%</span>
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-2 border-t border-white/5 pt-3">
        {breakdown.map(b => (
          <div key={b.label} className="flex justify-between text-xs">
            <span className="text-slate-500">{b.label}</span>
            <span className={`font-mono font-medium ${b.color}`}>
              {b.val >= 0 ? `R$ ${b.val.toFixed(2).replace('.', ',')}` : `- R$ ${Math.abs(b.val).toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>

      {/* ROI */}
      {result.preco > 0 && (
        <div className={`mt-4 p-2.5 rounded-xl ${config.bgColor} border ${config.borderColor} border-opacity-20`}>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">ROI sobre custo</span>
            <span className={`font-mono font-bold ${config.textColor}`}>
              {((result.lucro / custo) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Precificacao() {
  const [custo, setCusto] = useState(100)
  const [margemDesejada, setMargemDesejada] = useState(30)
  const [regime, setRegime] = useState(0)
  const [freteGratis, setFreteGratis] = useState(true)

  // Per-platform overrides
  const [overrides, setOverrides] = useState({
    ML:  { comissao: PLATFORMS.ML.comissao, frete: PLATFORMS.ML.freteMedio, taxaFixa: PLATFORMS.ML.taxaFixa },
    SP:  { comissao: PLATFORMS.SP.comissao, frete: PLATFORMS.SP.freteMedio, taxaFixa: PLATFORMS.SP.taxaFixa },
    AMZ: { comissao: PLATFORMS.AMZ.comissao, frete: PLATFORMS.AMZ.freteMedio, taxaFixa: PLATFORMS.AMZ.taxaFixa },
  })

  const imposto = REGIMES[regime].aliquota

  const results = useMemo(() => {
    return Object.entries(overrides).reduce((acc, [key, ov]) => {
      acc[key] = calcPreco(custo, margemDesejada, ov.comissao, ov.taxaFixa, ov.frete, imposto, freteGratis)
      return acc
    }, {} as Record<string, { preco: number; lucro: number; margem: number }>)
  }, [custo, margemDesejada, imposto, freteGratis, overrides])

  return (
    <div className="min-h-screen">
      <Header title="Calculadora de Precificação" subtitle="Calcule o preço ideal por plataforma com margem garantida" />

      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left: Inputs */}
          <div className="xl:col-span-1 space-y-5">
            {/* Base inputs */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-neon-blue" />Dados do Produto
              </h3>
              <div className="space-y-4">
                <InputGroup label="Custo unitário" prefix="R$" value={custo} onChange={setCusto} hint="Custo de aquisição ou produção do produto" />
                <InputGroup label="Margem desejada" suffix="%" value={margemDesejada} onChange={setMargemDesejada} hint="Percentual de margem líquida desejada sobre o preço de venda" />
              </div>
            </div>

            {/* Tax regime */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Percent className="w-4 h-4 text-neon-purple" />Regime Tributário
              </h3>
              <div className="space-y-2">
                {REGIMES.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setRegime(i)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                      regime === i
                        ? 'border-neon-purple/50 bg-neon-purple/10 text-white'
                        : 'border-white/5 hover:border-white/15 text-slate-400'
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className={`font-mono text-xs font-semibold ${regime === i ? 'text-neon-purple' : 'text-slate-600'}`}>
                      {r.aliquota}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Shipping */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-neon-green" />Frete e Comissões
              </h3>

              <div className="mb-4 p-3 rounded-xl bg-space-800/60 border border-neon-blue/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Embutir frete no preço</span>
                  <button
                    onClick={() => setFreteGratis(!freteGratis)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${freteGratis ? 'bg-neon-green/30 border border-neon-green/50' : 'bg-space-700 border border-white/10'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${freteGratis ? 'left-5 bg-neon-green' : 'left-0.5 bg-slate-600'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1 font-mono">
                  {freteGratis ? 'Frete incluso no preço (anunciado como grátis)' : 'Frete cobrado à parte do cliente'}
                </p>
              </div>

              <div className="space-y-4">
                {Object.entries(overrides).map(([key, ov]) => {
                  const cfg = PLATFORMS[key as keyof typeof PLATFORMS]
                  return (
                    <div key={key} className={`p-3 rounded-xl border ${cfg.borderColor} border-opacity-20 space-y-3`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                        <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[10px] text-slate-600 font-mono mb-1">Comissão %</p>
                          <input
                            type="number"
                            className="input-cyber w-full px-2 py-1.5 rounded text-xs font-mono text-center"
                            value={ov.comissao}
                            onChange={e => setOverrides(prev => ({ ...prev, [key]: { ...prev[key as keyof typeof prev], comissao: +e.target.value } }))}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-600 font-mono mb-1">Frete R$</p>
                          <input
                            type="number"
                            className="input-cyber w-full px-2 py-1.5 rounded text-xs font-mono text-center"
                            value={ov.frete}
                            onChange={e => setOverrides(prev => ({ ...prev, [key]: { ...prev[key as keyof typeof prev], frete: +e.target.value } }))}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-600 font-mono mb-1">Taxa R$</p>
                          <input
                            type="number"
                            className="input-cyber w-full px-2 py-1.5 rounded text-xs font-mono text-center"
                            value={ov.taxaFixa}
                            onChange={e => setOverrides(prev => ({ ...prev, [key]: { ...prev[key as keyof typeof prev], taxaFixa: +e.target.value } }))}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="xl:col-span-2 space-y-5">
            {/* Summary */}
            <div className="glass-card rounded-2xl p-5 border border-neon-blue/20">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-neon-blue" />Resumo da Precificação
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(results).map(([key, r]) => {
                  const cfg = PLATFORMS[key as keyof typeof PLATFORMS]
                  return (
                    <div key={key} className={`p-4 rounded-xl ${cfg.bgColor} border ${cfg.borderColor} border-opacity-30 text-center`}>
                      <p className={`text-xs font-semibold ${cfg.textColor} mb-2`}>{cfg.label}</p>
                      <p className={`text-2xl font-bold font-mono ${cfg.textColor}`}>
                        {r.preco > 0 ? `R$ ${r.preco.toFixed(2).replace('.', ',')}` : '—'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        lucro R$ {r.lucro.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per-platform detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(PLATFORMS).map(([key, cfg]) => (
                <PlatformCard
                  key={key}
                  platKey={key}
                  config={cfg}
                  result={results[key]}
                  custo={custo}
                  frete={freteGratis ? overrides[key as keyof typeof overrides].frete : 0}
                  comissao={overrides[key as keyof typeof overrides].comissao}
                  imposto={imposto}
                  taxaFixa={overrides[key as keyof typeof overrides].taxaFixa}
                />
              ))}
            </div>

            {/* Margin simulator table */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-neon-green" />Simulador de Margens
              </h3>
              <p className="text-xs text-slate-500 font-mono mb-4">Como varia o preço com diferentes margens (plataforma selecionada: Mercado Livre)</p>
              <div className="overflow-x-auto">
                <table className="w-full table-cyber text-xs">
                  <thead>
                    <tr className="border-b border-neon-blue/10 text-[10px] font-mono uppercase tracking-wider text-slate-600">
                      <th className="text-left py-2 pr-4">Margem desejada</th>
                      <th className="text-right py-2 px-4">Preço de venda</th>
                      <th className="text-right py-2 px-4">Lucro líquido</th>
                      <th className="text-right py-2 px-4">ROI</th>
                      <th className="text-right py-2 px-4">Margem real</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[10, 15, 20, 25, 30, 35, 40, 50].map(m => {
                      const r = calcPreco(custo, m, overrides.ML.comissao, overrides.ML.taxaFixa, overrides.ML.frete, imposto, freteGratis)
                      const isSelected = m === margemDesejada
                      return (
                        <tr key={m} className={isSelected ? 'bg-neon-blue/5' : ''} onClick={() => setMargemDesejada(m)} style={{ cursor: 'pointer' }}>
                          <td className="py-2.5 pr-4">
                            <span className={`font-mono font-semibold ${isSelected ? 'text-neon-blue' : 'text-slate-400'}`}>
                              {m}%{isSelected && ' ←'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-300">R$ {r.preco.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-neon-green">R$ {r.lucro.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-neon-purple">{((r.lucro / custo) * 100).toFixed(1)}%</td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="flex-1 max-w-16 h-1 bg-space-700 rounded-full overflow-hidden">
                                <div className="h-full bg-neon-green rounded-full" style={{ width: `${Math.min(r.margem, 50) * 2}%` }} />
                              </div>
                              <span className="font-mono text-slate-400">{r.margem.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
