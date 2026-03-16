'use client'

import Header from '@/components/Header'
import { Send, Package, Printer, QrCode, Clock, CheckCircle, Truck, MapPin } from 'lucide-react'

const shipments = [
  { id: '#ML-48291', produto: 'Óleo Capilar Fio Cabana 100ml',      cliente: 'Ana Beatriz Sousa',  destino: 'Fortaleza, CE',    plat: 'ML',  status: 'aguardando', rastreio: null,          peso: '0.18 kg', prazo: '3 dias' },
  { id: '#ML-48260', produto: 'Hidratante Corporal Zalike 200ml',   cliente: 'Antônio Vieira Neto', destino: 'Fortaleza, CE',    plat: 'ML',  status: 'aguardando', rastreio: null,          peso: '0.22 kg', prazo: '3 dias' },
  { id: '#ML-48211', produto: 'Castilla Condicionador Coco 400ml',  cliente: 'Sebastião Pinheiro',  destino: 'Itapipoca, CE',    plat: 'ML',  status: 'aguardando', rastreio: null,          peso: '0.42 kg', prazo: '4 dias' },
]

const statusMap: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  aguardando: { label: 'Aguardando',  cls: 'text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20',   icon: Clock        },
  etiquetado: { label: 'Etiquetado',  cls: 'text-blue-400 bg-blue-400/10 ring-1 ring-blue-400/20',      icon: QrCode       },
  coletado:   { label: 'Coletado',    cls: 'text-purple-400 bg-purple-400/10 ring-1 ring-purple-400/20', icon: Truck        },
  entregue:   { label: 'Entregue',    cls: 'text-green-400 bg-green-400/10 ring-1 ring-green-400/20',   icon: CheckCircle  },
}

const platClr: Record<string, string> = {
  ML:  'text-amber-400 bg-amber-400/10',
  SP:  'text-orange-400 bg-orange-400/10',
  AMZ: 'text-cyan-400 bg-cyan-400/10',
  VIA: 'text-blue-400 bg-blue-400/10',
}

export default function ExpedicaoPage() {
  const aguardando = shipments.filter(s => s.status === 'aguardando').length
  const etiquetado = shipments.filter(s => s.status === 'etiquetado').length
  const coletado   = shipments.filter(s => s.status === 'coletado').length

  return (
    <div>
      <Header title="Expedição" subtitle="Gerencie envios e etiquetas" />

      <div className="p-6 space-y-6">
        {/* Dev banner */}
        <div className="dash-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-400" style={{ fontFamily: 'Sora, sans-serif' }}>Módulo em Desenvolvimento</p>
              <p className="text-xs text-slate-500">Impressão de etiquetas e integração com transportadoras em breve.</p>
            </div>
            <span className="ml-auto text-[10px] bg-amber-900/30 text-amber-400 px-2 py-1 rounded-full font-bold shrink-0">Q2 2026</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total hoje',   val: shipments.length, color: 'text-purple-400' },
            { label: 'Aguardando',   val: aguardando,       color: 'text-amber-400'  },
            { label: 'Etiquetados',  val: etiquetado,       color: 'text-blue-400'   },
            { label: 'Coletados',    val: coletado,         color: 'text-green-400'  },
          ].map(s => (
            <div key={s.label} className="dash-card p-4 rounded-2xl">
              <p className="text-xs text-slate-600 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'Sora, sans-serif' }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Shipment list */}
        <div className="dash-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
              Envios do Dia
              <span className="text-xs text-amber-400 font-normal ml-2">— dados de exemplo</span>
            </p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-all">
              <Printer className="w-3.5 h-3.5" /> Imprimir etiquetas
            </button>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {shipments.map(s => {
              const st   = statusMap[s.status]
              const Icon = st.icon
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-slate-500">{s.id}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${platClr[s.plat] ?? ''}`}>{s.plat}</span>
                    </div>
                    <p className="text-xs font-medium text-white truncate mt-0.5">{s.produto}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-600" />
                      <p className="text-[10px] text-slate-600">{s.cliente} · {s.destino}</p>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-4 text-xs shrink-0">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-600 mb-0.5">Peso</p>
                      <p className="text-xs font-semibold text-slate-300">{s.peso}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-600 mb-0.5">Prazo</p>
                      <p className="text-xs font-semibold text-slate-300">{s.prazo}</p>
                    </div>
                    {s.rastreio && (
                      <div className="text-center">
                        <p className="text-[9px] text-slate-600 mb-0.5">Rastreio</p>
                        <p className="text-[10px] font-mono text-cyan-400">{s.rastreio}</p>
                      </div>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${st.cls}`}>
                    <Icon className="w-3 h-3" />{st.label}
                  </span>

                  <button className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all shrink-0">
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Features coming */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: QrCode,  title: 'Geração de Etiquetas', desc: 'Gere etiquetas de envio para Correios, Melhor Envio, Loggi e mais com um clique.' },
            { icon: Send,    title: 'Envio em Massa',       desc: 'Processe dezenas de pedidos de uma só vez e imprima todas as etiquetas de uma vez.' },
            { icon: Truck,   title: 'Rastreamento',         desc: 'Acompanhe o status de todos os envios em tempo real sem sair do painel.' },
          ].map(f => (
            <div key={f.title} className="dash-card p-5 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <f.icon className="w-[18px] h-[18px] text-purple-400" />
              </div>
              <p className="font-bold text-white text-sm mb-2">{f.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
