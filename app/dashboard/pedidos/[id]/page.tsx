'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Printer, Tag, FileText, XCircle, Copy, Check,
  CheckCircle2, Package, Send, Truck, CircleDollarSign, ScanLine,
  RotateCcw, MapPin, Phone, Mail, User, Star, ExternalLink,
  ClipboardList, TrendingDown, TrendingUp, DollarSign, Plus,
  AlertTriangle, Clock, Square, ChevronRight, Edit3, PackageCheck,
} from 'lucide-react'
import {
  PEDIDOS, STATUS_META, MKT_META,
  type Pedido, type PedidoStatus,
} from '../_data'

// ─── HELPERS ────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}
function fmtDT(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
    + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

// ─── TIMELINE ───────────────────────────────────────────────────────────────

const TIMELINE = [
  { key: 'pago',        label: 'Pago',        icon: CircleDollarSign, statuses: ['pago','separando','embalado','enviado','em_transito','entregue'] },
  { key: 'nf',          label: 'NF Emitida',  icon: FileText,         statuses: ['separando','embalado','enviado','em_transito','entregue'] },
  { key: 'separando',   label: 'Separado',    icon: ScanLine,         statuses: ['embalado','enviado','em_transito','entregue'] },
  { key: 'embalado',    label: 'Embalado',    icon: Package,          statuses: ['enviado','em_transito','entregue'] },
  { key: 'enviado',     label: 'Enviado',     icon: Send,             statuses: ['em_transito','entregue'] },
  { key: 'em_transito', label: 'Em Trânsito', icon: Truck,            statuses: ['entregue'] },
  { key: 'entregue',    label: 'Entregue',    icon: CheckCircle2,     statuses: ['entregue'] },
]

const STATUS_STEP_MAP: Record<string, number> = {
  pago: 0, separando: 2, embalado: 3, enviado: 4, em_transito: 5, entregue: 6,
}

// ─── TOAST ──────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-dark-800 border border-green-500/30 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      <span className="text-sm text-slate-200">{msg}</span>
      <button onClick={onClose} className="text-slate-600 hover:text-slate-400 ml-2">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── STATUS ICON MAP ─────────────────────────────────────────────────────────

function SIcon({ n, c }: { n: string; c: string }) {
  const cls = `w-3.5 h-3.5 ${c}`
  const m: Record<string, JSX.Element> = {
    CircleDollarSign: <CircleDollarSign className={cls} />,
    ScanLine:         <ScanLine className={cls} />,
    Package:          <Package className={cls} />,
    Send:             <Send className={cls} />,
    Truck:            <Truck className={cls} />,
    CheckCircle2:     <CheckCircle2 className={cls} />,
    XCircle:          <XCircle className={cls} />,
    RotateCcw:        <RotateCcw className={cls} />,
  }
  return m[n] ?? null
}

// ─── PAGE ───────────────────────────────────────────────────────────────────

export default function PedidoDetailPage({ params }: { params: { id: string } }) {
  const pedido = PEDIDOS.find(p => p.id === Number(params.id))

  const [statusAtual, setStatusAtual]         = useState<PedidoStatus>(pedido?.status ?? 'pago')
  const [separados, setSeparados]             = useState<number[]>(pedido?.separacaoFeita ? (pedido?.itens.map((_, i) => i) ?? []) : [])
  const [novaObs, setNovaObs]                 = useState('')
  const [rastreio, setRastreio]               = useState(pedido?.envio.codigoRastreio ?? '')
  const [copied, setCopied]                   = useState(false)
  const [copiedAddr, setCopiedAddr]           = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [toast, setToast]                     = useState<string | null>(null)

  if (!pedido) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Pedido não encontrado</p>
          <Link href="/dashboard/pedidos" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar para Pedidos
          </Link>
        </div>
      </div>
    )
  }

  const meta        = STATUS_META[statusAtual]
  const mkt         = MKT_META[pedido.marketplace]
  const currentStep = STATUS_STEP_MAP[statusAtual] ?? 0
  const todosSep    = separados.length === pedido.itens.length
  const valorTotal  = pedido.financeiro.valorProdutos + pedido.financeiro.freteCliente

  const toggleSeparado = (i: number) =>
    setSeparados(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const marcarTodosSep = () =>
    setSeparados(pedido.itens.map((_, i) => i))

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const copyText = (text: string, field: 'rastreio' | 'addr') => {
    navigator.clipboard.writeText(text).catch(() => {})
    if (field === 'rastreio') { setCopied(true); setTimeout(() => setCopied(false), 2000) }
    else { setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 2000) }
    showToast('Copiado para a área de transferência!')
  }

  const enderecoCompleto = `${pedido.cliente.logradouro}, ${pedido.cliente.numero} — ${pedido.cliente.bairro}, ${pedido.cliente.cidade}/${pedido.cliente.uf} · CEP ${pedido.cliente.cep}`

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── TOAST ── */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* ── CANCEL MODAL ── */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-white font-bold text-center mb-2">Cancelar Pedido?</h3>
            <p className="text-slate-400 text-sm text-center mb-5">
              Esta ação marcará o pedido como Cancelado. Verifique com o marketplace antes de prosseguir.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-slate-200 transition-all">
                Voltar
              </button>
              <button onClick={() => {
                setStatusAtual('cancelado')
                setShowCancelModal(false)
                showToast('Pedido marcado como Cancelado')
              }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY HEADER ── */}
      <div className="dash-header sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pedidos"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">Pedido {pedido.numero}</h1>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${meta.bgCor} ${meta.cor}`}>
                <SIcon n={meta.iconName} c={meta.cor} /> {meta.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${mkt.bgCor} ${mkt.cor}`}>
                {mkt.abbr}
              </span>
            </div>
            <p className="text-slate-600 text-xs">{fmtDT(pedido.data)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/20 rounded-xl transition-all">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          <button onClick={() => showToast('Etiqueta de envio gerada!')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/20 rounded-xl transition-all">
            <Tag className="w-3.5 h-3.5" /> Etiqueta
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 cursor-not-allowed border border-white/[0.04] rounded-xl" disabled>
            <FileText className="w-3.5 h-3.5" /> NF-e
            <span className="text-[9px] bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded-full">Breve</span>
          </button>
          <button onClick={() => setShowCancelModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all">
            <XCircle className="w-3.5 h-3.5" /> Cancelar Pedido
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* ── BREADCRUMB ── */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Link href="/dashboard/pedidos" className="hover:text-slate-400 transition-colors">Pedidos</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-400">{pedido.numero}</span>
        </div>

        {/* ── TIMELINE ── */}
        <div className="dash-card rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Histórico do Pedido</h2>
          <div className="relative flex items-start gap-0">
            {TIMELINE.map((step, idx) => {
              const done    = currentStep >= idx
              const current = currentStep === idx
              const Icon    = step.icon
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {idx > 0 && (
                    <div className={`absolute left-0 top-5 w-full h-0.5 -translate-x-1/2 ${done ? 'bg-purple-500' : 'bg-dark-600'}`} />
                  )}
                  {/* Circle */}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? current
                        ? 'bg-purple-500 border-purple-400 ring-4 ring-purple-500/20'
                        : 'bg-purple-600/30 border-purple-500'
                      : 'bg-dark-700 border-dark-600'
                  }`}>
                    <Icon className={`w-4 h-4 ${done ? 'text-white' : 'text-slate-700'}`} />
                  </div>
                  {/* Label */}
                  <div className="mt-2 text-center">
                    <p className={`text-[10px] font-semibold ${done ? 'text-slate-200' : 'text-slate-700'}`}>
                      {step.label}
                    </p>
                    {done && !current && (
                      <p className="text-[9px] text-slate-600">✓</p>
                    )}
                    {current && (
                      <p className="text-[9px] text-purple-400 font-bold">Atual</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* DADOS DO CLIENTE */}
            <div className="dash-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" /> Dados do Cliente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {pedido.cliente.pedidosAnteriores > 0 && (
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-white font-semibold">{pedido.cliente.nome}</p>
                      {pedido.cliente.pedidosAnteriores > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400">
                          ⭐ Cliente Recorrente — {pedido.cliente.pedidosAnteriores + 1}ª compra
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-600" />
                      <span>{pedido.cliente.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>{pedido.cliente.telefone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                      <span>CPF: {pedido.cliente.cpf}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Endereço de Entrega</p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {pedido.cliente.logradouro}, {pedido.cliente.numero}<br />
                    {pedido.cliente.bairro}<br />
                    {pedido.cliente.cidade} / {pedido.cliente.uf}<br />
                    CEP {pedido.cliente.cep}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => copyText(enderecoCompleto, 'addr')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                        copiedAddr ? 'bg-green-500/10 text-green-400' : 'bg-dark-700 text-slate-400 hover:text-slate-200 hover:bg-dark-600'
                      }`}>
                      {copiedAddr ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedAddr ? 'Copiado!' : 'Copiar endereço'}
                    </button>
                    <Link href={`/dashboard/clientes`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-dark-700 text-slate-400 hover:text-purple-400 hover:bg-dark-600 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" /> Ver perfil
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* PRODUTOS */}
            <div className="dash-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" /> Produtos do Pedido
              </h2>
              <div className="space-y-3">
                {pedido.itens.map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-dark-700/50 rounded-xl border border-white/[0.04]">
                    {/* Image placeholder */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-white/[0.06] flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.nome}</p>
                          {item.variacao && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 mt-1 inline-block">
                              {item.variacao}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-white">{fmt(item.precoUnit * item.quantidade)}</p>
                          {item.quantidade > 1 && (
                            <p className="text-[10px] text-slate-600">{item.quantidade}x {fmt(item.precoUnit)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-[10px] text-slate-600">SKU: <span className="text-slate-400">{item.sku}</span></span>
                        <span className="text-[10px] text-slate-600">EAN: <span className="text-slate-400">{item.ean}</span></span>
                        <span className="text-[10px] text-slate-600">Qtd: <span className="text-slate-400">{item.quantidade}</span></span>
                        {item.localizacao && (
                          <span className="text-[10px] flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-slate-600" />
                            <span className="text-cyan-400">{item.localizacao}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LISTA DE SEPARAÇÃO */}
            <div className="rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/[0.03] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-400" /> Lista de Separação
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => showToast('Lista de separação enviada para impressão')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 border border-white/[0.08] rounded-lg hover:text-slate-200 hover:bg-white/[0.04] transition-all">
                    <Printer className="w-3.5 h-3.5" /> Imprimir Lista
                  </button>
                  <button onClick={marcarTodosSep}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all">
                    <PackageCheck className="w-3.5 h-3.5" /> Marcar todos
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {pedido.itens.map((item, i) => {
                  const isSep = separados.includes(i)
                  return (
                    <div key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isSep ? 'bg-green-500/10 border-green-500/20' : 'bg-dark-800/50 border-white/[0.04]'
                      }`}>
                      <button onClick={() => toggleSeparado(i)}>
                        {isSep
                          ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                          : <Square className="w-5 h-5 text-slate-600 hover:text-slate-400 transition-colors" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isSep ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {item.nome}
                          {item.variacao && <span className="text-slate-500"> · {item.variacao}</span>}
                        </p>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-600">SKU: {item.sku}</span>
                          <span className="text-[10px] text-slate-600">Qtd: {item.quantidade}</span>
                          {item.localizacao && (
                            <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {item.localizacao}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {todosSep && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="text-sm text-green-300 font-medium">
                    Todos os itens separados! Avance o status para "Embalado".
                  </span>
                </div>
              )}
            </div>

            {/* FINANCEIRO */}
            <div className="dash-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Financeiro do Pedido
              </h2>
              <div className="space-y-1">
                {/* Receitas */}
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-slate-400">Valor dos Produtos</span>
                  <span className="text-sm font-semibold text-emerald-400">{fmt(pedido.financeiro.valorProdutos)}</span>
                </div>
                {pedido.financeiro.freteCliente > 0 && (
                  <div className="flex justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-sm text-slate-400">Frete (cliente pagou)</span>
                    <span className="text-sm font-semibold text-emerald-400">{fmt(pedido.financeiro.freteCliente)}</span>
                  </div>
                )}
                {/* Custos */}
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-slate-400">Custo dos Produtos</span>
                  <span className="text-sm font-semibold text-red-400">-{fmt(pedido.financeiro.custoProdutos)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-slate-400">Comissão {MKT_META[pedido.marketplace].label} ({pedido.financeiro.comissaoPct}%)</span>
                  <span className="text-sm font-semibold text-red-400">-{fmt(pedido.financeiro.valorProdutos * pedido.financeiro.comissaoPct / 100)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-slate-400">Custo Frete Real</span>
                  <span className="text-sm font-semibold text-red-400">-{fmt(pedido.financeiro.custoFreteReal)}</span>
                </div>
                {pedido.financeiro.tarifaFixa > 0 && (
                  <div className="flex justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-sm text-slate-400">Tarifa Fixa {MKT_META[pedido.marketplace].label}</span>
                    <span className="text-sm font-semibold text-red-400">-{fmt(pedido.financeiro.tarifaFixa)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-slate-400">Imposto (~{pedido.financeiro.impostoPct}%)</span>
                  <span className="text-sm font-semibold text-red-400">-{fmt(pedido.financeiro.valorProdutos * pedido.financeiro.impostoPct / 100)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-sm text-slate-400">Embalagem</span>
                  <span className="text-sm font-semibold text-red-400">-{fmt(pedido.financeiro.embalagem)}</span>
                </div>
                {/* Resultado */}
                <div className={`flex justify-between py-3 px-3 rounded-xl mt-2 ${pedido.financeiro.lucro >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <div>
                    <p className="text-sm font-bold text-white">Lucro Líquido</p>
                    <p className="text-[10px] text-slate-600">após todos os custos</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${pedido.financeiro.lucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmt(pedido.financeiro.lucro)}
                    </p>
                    <p className={`text-sm font-bold ${pedido.financeiro.margem >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pedido.financeiro.margem}% margem
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">

            {/* ENVIO */}
            <div className="dash-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" /> Informações de Envio
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-1">Transportadora</p>
                  <p className="text-sm text-slate-200">{pedido.envio.transportadora}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-1">Código de Rastreamento</p>
                  <div className="flex gap-2">
                    <input
                      value={rastreio}
                      onChange={e => setRastreio(e.target.value)}
                      placeholder="Insira o código de rastreio"
                      className="input-cyber flex-1 text-sm py-2"
                    />
                    <button onClick={() => rastreio && copyText(rastreio, 'rastreio')}
                      className={`px-3 py-2 rounded-xl text-xs transition-all ${
                        copied ? 'bg-green-500/10 text-green-400' : 'bg-dark-700 text-slate-400 hover:text-slate-200 hover:bg-dark-600'
                      }`}>
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {pedido.envio.linkRastreio && (
                  <a href={pedido.envio.linkRastreio} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 w-full rounded-xl bg-dark-700 text-slate-400 hover:text-slate-200 hover:bg-dark-600 transition-all text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> Rastrear na transportadora
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <p className="text-[10px] text-slate-600 font-bold">Peso Total</p>
                    <p className="text-sm text-slate-300">{pedido.envio.pesoTotal} kg</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 font-bold">Dimensões</p>
                    <p className="text-sm text-slate-300">{pedido.envio.comp}×{pedido.envio.larg}×{pedido.envio.alt} cm</p>
                  </div>
                  {pedido.envio.dataPostagem && (
                    <div>
                      <p className="text-[10px] text-slate-600 font-bold">Data de Postagem</p>
                      <p className="text-sm text-slate-300">{fmtDate(pedido.envio.dataPostagem)}</p>
                    </div>
                  )}
                  {pedido.envio.previsaoEntrega && (
                    <div>
                      <p className="text-[10px] text-slate-600 font-bold">Prev. Entrega</p>
                      <p className="text-sm text-slate-300">{fmtDate(pedido.envio.previsaoEntrega)}</p>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-slate-600 font-bold mb-1">Prazo de Postagem</p>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                    pedido.prazoPostagem <= '2026-03-12'
                      ? 'bg-red-500/10 text-red-400'
                      : pedido.prazoPostagem === '2026-03-13'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-dark-700 text-slate-400'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    {fmtDate(pedido.prazoPostagem)}
                    {pedido.prazoPostagem <= '2026-03-12' && ' — HOJE!'}
                    {pedido.prazoPostagem === '2026-03-13' && ' — Amanhã'}
                  </div>
                </div>
              </div>
            </div>

            {/* ATUALIZAR STATUS */}
            <div className="dash-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" /> Atualizar Status
              </h2>
              <div className="space-y-1.5">
                {(['pago','separando','embalado','enviado','em_transito','entregue'] as PedidoStatus[]).map(s => {
                  const m = STATUS_META[s]
                  return (
                    <button key={s}
                      onClick={() => { setStatusAtual(s); showToast(`Status atualizado para ${m.label}`) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        statusAtual === s
                          ? `${m.bgCor} ${m.cor} ring-1 ring-current`
                          : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.04]'
                      }`}>
                      <SIcon n={m.iconName} c={statusAtual === s ? m.cor : 'text-slate-700'} />
                      {m.label}
                      {statusAtual === s && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* OBSERVAÇÕES */}
            <div className="dash-card rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-400" /> Observações Internas
              </h2>
              {pedido.observacoes.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {pedido.observacoes.map(obs => (
                    <div key={obs.id} className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                      <p className="text-xs text-slate-300">{obs.texto}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{obs.usuario} · {fmtDT(obs.data)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-700 mb-3">Nenhuma observação ainda.</p>
              )}
              <textarea
                value={novaObs}
                onChange={e => setNovaObs(e.target.value)}
                placeholder="Adicionar observação interna..."
                className="input-cyber w-full resize-none text-xs h-20 mb-2"
              />
              <button
                onClick={() => {
                  if (!novaObs.trim()) return
                  setNovaObs('')
                  showToast('Observação adicionada!')
                }}
                className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Adicionar Observação
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
