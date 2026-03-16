'use client'

import { useState } from 'react'
import { X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export type BulkAction = 'pause' | 'reactivate' | 'close'

export interface BulkProgress {
  done:   number
  errors: number
  total:  number
}

interface Props {
  action:        BulkAction
  selectedCount: number
  onConfirm:     () => void
  onCancel:      () => void
  isLoading:     boolean
  progress?:     BulkProgress
}

const CONFIG = {
  pause: {
    icon:    '⏸',
    title:   'Pausar anúncios',
    barCls:  'bg-indigo-500',
    btnCls:  'bg-amber-600 hover:bg-amber-500 text-white',
    bullets: [
      '✓ Reversível — você pode reativar quando quiser',
      '✓ Anúncios pausados ficam invisíveis para compradores',
      '✓ Histórico de vendas mantido',
    ],
  },
  reactivate: {
    icon:    '▶',
    title:   'Reativar anúncios',
    barCls:  'bg-green-500',
    btnCls:  'bg-green-700 hover:bg-green-600 text-white',
    bullets: [
      '✓ Anúncios voltam a ser visíveis para compradores',
      '✓ Configurações de preço e estoque mantidas',
    ],
  },
  close: {
    icon:    '🔴',
    title:   'Fechar anúncios — AÇÃO IRREVERSÍVEL',
    barCls:  'bg-red-500',
    btnCls:  'bg-red-700 hover:bg-red-600 text-white border border-red-500',
    bullets: [],
  },
} as const

export default function BulkActionModal({
  action, selectedCount, onConfirm, onCancel, isLoading, progress,
}: Props) {
  const [confirmText, setConfirmText] = useState('')
  const cfg        = CONFIG[action]
  const canConfirm = action === 'close' ? confirmText === 'FECHAR' : true
  const processed  = progress ? progress.done + progress.errors : 0
  const pct        = progress ? Math.round((processed / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-dark-800 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-bold text-white text-sm leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            {cfg.icon} {cfg.title}
          </h3>
          {!isLoading && (
            <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 shrink-0 ml-3">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress state */}
        {isLoading && progress ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Processando...</p>
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                <span>{processed} / {progress.total}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${cfg.barCls}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="flex gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-green-400">
                <CheckCircle className="w-3.5 h-3.5" /> {progress.done} concluídos
              </span>
              <span className="flex items-center gap-1.5 text-red-400">
                <XCircle className="w-3.5 h-3.5" /> {progress.errors} erros
              </span>
            </div>
            <p className="text-[11px] text-slate-600">Não feche esta janela.</p>
          </div>
        ) : (
          <>
            {/* Description */}
            <p className="text-sm text-slate-400 mb-4">
              {action === 'close'
                ? <> Você está prestes a <strong className="text-red-400">FECHAR</strong> permanentemente{' '}
                    <strong className="text-white">{selectedCount}</strong> anúncio(s).</>
                : <>Você está prestes a {action === 'pause' ? 'pausar' : 'reativar'}{' '}
                    <strong className="text-white">{selectedCount}</strong> anúncio(s) selecionado(s).</>
              }
            </p>

            {/* Bullets */}
            {cfg.bullets.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {cfg.bullets.map(b => (
                  <p key={b} className="text-xs text-slate-500">{b}</p>
                ))}
              </div>
            )}

            {/* Close-specific warning */}
            {action === 'close' && (
              <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl p-3 mb-4 space-y-1.5">
                <p className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> ATENÇÃO:
                </p>
                <p className="text-xs text-slate-400">• Esta ação <strong>NÃO</strong> pode ser desfeita</p>
                <p className="text-xs text-slate-400">• Anúncios fechados não podem ser reativados pela API</p>
                <p className="text-xs text-slate-400">• O histórico de vendas é mantido</p>
              </div>
            )}

            {/* Double-confirm input for close */}
            {action === 'close' && (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Para confirmar, digite <span className="text-red-400 font-bold">FECHAR</span>:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="FECHAR"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-dark-700 border border-red-500/30 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/50 font-mono"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.04] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${cfg.btnCls}`}
              >
                {action === 'pause'      && `Pausar ${selectedCount} anúncio(s)`}
                {action === 'reactivate' && `Reativar ${selectedCount} anúncio(s)`}
                {action === 'close'      && 'Fechar anúncios →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
