'use client'

/**
 * components/OnboardingWizard.tsx
 *
 * Wizard de onboarding para novos usuários.
 * Aparece automaticamente 1s após o primeiro acesso ao /dashboard.
 *
 * 7 passos: welcome → profile → marketplace → warehouse → mapping → explore → done
 *
 * Também renderiza um checklist persistente no dashboard enquanto não concluído.
 */

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  X, ChevronRight, ChevronLeft, Check, Rocket, User, Store,
  Package, Link2, Compass, PartyPopper, Loader2, ArrowRight,
} from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface OnboardingState {
  completed:       boolean
  dismissed:       boolean
  current_step:    number
  steps_completed: Record<string, boolean>
}

interface Step {
  id:       string
  title:    string
  subtitle: string
  icon:     React.ElementType
  color:    string
}

// ─── Definição dos passos ──────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id:       'welcome',
    title:    'Bem-vindo ao Foguetim!',
    subtitle: 'Seu ERP para vender mais nos marketplaces brasileiros.',
    icon:     Rocket,
    color:    'text-blue-400',
  },
  {
    id:       'profile',
    title:    'Complete seu perfil',
    subtitle: 'Adicione seu nome e dados básicos para personalizar a experiência.',
    icon:     User,
    color:    'text-purple-400',
  },
  {
    id:       'marketplace',
    title:    'Conecte um marketplace',
    subtitle: 'Sincronize seus anúncios com Mercado Livre, Shopee e outros.',
    icon:     Store,
    color:    'text-yellow-400',
  },
  {
    id:       'warehouse',
    title:    'Cadastre seus produtos',
    subtitle: 'Crie seu catálogo de produtos no armazém central do Foguetim.',
    icon:     Package,
    color:    'text-green-400',
  },
  {
    id:       'mapping',
    title:    'Mapeie seus anúncios',
    subtitle: 'Conecte os produtos do armazém aos anúncios dos marketplaces.',
    icon:     Link2,
    color:    'text-cyan-400',
  },
  {
    id:       'explore',
    title:    'Explore o sistema',
    subtitle: 'Conheça os módulos de pedidos, financeiro, precificação e mais.',
    icon:     Compass,
    color:    'text-orange-400',
  },
  {
    id:       'done',
    title:    'Tudo pronto!',
    subtitle: 'Seu Foguetim está configurado. Bons negócios!',
    icon:     PartyPopper,
    color:    'text-green-400',
  },
]

const TOTAL_STEPS = STEPS.length - 1 // "done" é o último, não conta como passo navegável

// ─── Conteúdo de cada passo ────────────────────────────────────────────────

function StepContent({ step, stepsCompleted }: { step: Step; stepsCompleted: Record<string, boolean> }) {
  const Icon = step.icon

  if (step.id === 'welcome') {
    return (
      <div className="text-center space-y-4">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20`}>
          <Icon className="w-10 h-10 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            {step.title}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {step.subtitle}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { label: 'Marketplaces', value: 'ML + Shopee' },
            { label: 'Armazém', value: 'Multi-canal' },
            { label: 'Pedidos', value: 'Unificados' },
          ].map(item => (
            <div key={item.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Este assistente vai te guiar pelos primeiros passos em menos de 5 minutos.
        </p>
      </div>
    )
  }

  if (step.id === 'profile') {
    const done = stepsCompleted.profile
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Perfil do usuário</p>
            <p className="text-xs text-slate-500">Nome, empresa e dados de contato</p>
          </div>
          {done && <Check className="w-5 h-5 text-green-400 ml-auto" />}
        </div>
        <p className="text-xs text-slate-500 text-center">
          Acesse <span className="text-purple-400">Configurações → Perfil</span> para preencher seus dados.
        </p>
        <Link
          href="/dashboard/configuracoes"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-sm font-medium transition-colors"
        >
          Ir para Configurações <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  if (step.id === 'marketplace') {
    const mlDone      = stepsCompleted.marketplace
    const shopeeDone  = stepsCompleted.marketplace

    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-400 text-center">
          Conecte ao menos um marketplace para começar a sincronizar anúncios e pedidos.
        </p>
        {[
          { name: 'Mercado Livre', icon: '🛒', color: 'yellow', href: '/dashboard/configuracoes?tab=marketplaces' },
          { name: 'Shopee',        icon: '🛍️', color: 'orange', href: '/dashboard/configuracoes?tab=marketplaces' },
        ].map(mkt => (
          <Link
            key={mkt.name}
            href={mkt.href}
            className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl transition-colors group"
          >
            <span className="text-2xl">{mkt.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{mkt.name}</p>
              <p className="text-xs text-slate-500">Clique para conectar</p>
            </div>
            {(mlDone || shopeeDone) ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            )}
          </Link>
        ))}
        {(mlDone || shopeeDone) && (
          <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> Marketplace conectado com sucesso!
          </p>
        )}
      </div>
    )
  }

  if (step.id === 'warehouse') {
    const done = stepsCompleted.warehouse
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-400 text-center">
          O armazém é o catálogo central do Foguetim. Cadastre seus produtos uma vez e conecte a vários marketplaces.
        </p>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
          {[
            'Nome, SKU e EAN do produto',
            'Estoque e preço de custo',
            'Fotos e descrição centralizada',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
              {item}
            </div>
          ))}
        </div>
        {done ? (
          <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> Você já tem produtos no armazém!
          </p>
        ) : (
          <Link
            href="/dashboard/armazem/produtos/novo"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-300 text-sm font-medium transition-colors"
          >
            Cadastrar primeiro produto <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    )
  }

  if (step.id === 'mapping') {
    const done = stepsCompleted.mapping
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-400 text-center">
          Mapear conecta seus produtos do armazém aos anúncios dos marketplaces, habilitando sincronização de estoque e preço.
        </p>
        <div className="flex items-center gap-2 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
          <div className="text-2xl">✨</div>
          <p className="text-xs text-slate-400">
            O Foguetim usa IA para sugerir mapeamentos automaticamente por SKU, EAN e nome do produto.
          </p>
        </div>
        {done ? (
          <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> Você já tem mapeamentos configurados!
          </p>
        ) : (
          <Link
            href="/dashboard/armazem/mapeamentos"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-sm font-medium transition-colors"
          >
            Ir para Mapeamentos <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    )
  }

  if (step.id === 'explore') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-400 text-center">
          O Foguetim tem muito mais para explorar. Veja alguns módulos disponíveis:
        </p>
        {[
          { icon: '📦', name: 'Pedidos',       desc: 'Todos os pedidos em um lugar',       href: '/dashboard/pedidos'      },
          { icon: '💰', name: 'Financeiro',    desc: 'Receita, custos e margem real',       href: '/dashboard/financeiro'   },
          { icon: '🏷️', name: 'Precificação',  desc: 'Calcule preços com margem segura',   href: '/dashboard/precificacao' },
          { icon: '📢', name: 'Anúncios',      desc: 'Gerencie listagens e campanhas',     href: '/dashboard/anuncios'     },
        ].map(item => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 p-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors group"
          >
            <span className="text-lg">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white">{item.name}</p>
              <p className="text-xs text-slate-500 truncate">{item.desc}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    )
  }

  if (step.id === 'done') {
    return (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-green-500/10 border border-green-500/20">
          <PartyPopper className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Tudo pronto!
          </h2>
          <p className="text-slate-400 text-sm">
            Seu Foguetim está configurado e pronto para uso. Boas vendas!
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { emoji: '🚀', text: 'Gestão unificada' },
            { emoji: '📊', text: 'Dados em tempo real' },
            { emoji: '🤖', text: 'Automações ativas' },
            { emoji: '💪', text: 'Pronto para vender' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <span className="text-lg">{item.emoji}</span>
              <span className="text-xs text-slate-300">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// ─── Progress dots ─────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-5 h-1.5 bg-blue-400'
              : i < current
              ? 'w-1.5 h-1.5 bg-blue-400/50'
              : 'w-1.5 h-1.5 bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Modal wizard ──────────────────────────────────────────────────────────

interface WizardModalProps {
  state:       OnboardingState
  onClose:     () => void
  onDismiss:   () => void
  onComplete:  () => void
  onStepChange: (step: number, stepId: string) => void
}

function WizardModal({ state, onClose, onDismiss, onComplete, onStepChange }: WizardModalProps) {
  const [current, setCurrent] = useState(state.current_step ?? 0)
  const [saving,  setSaving]  = useState(false)

  const step      = STEPS[current] ?? STEPS[0]
  const isFirst   = current === 0
  const isDone    = current >= STEPS.length - 1
  const isPreDone = current === STEPS.length - 2 // "explore" step, antes de "done"

  function goNext() {
    const next = Math.min(current + 1, STEPS.length - 1)
    setCurrent(next)
    onStepChange(next, STEPS[next].id)
  }

  function goPrev() {
    const prev = Math.max(current - 1, 0)
    setCurrent(prev)
    onStepChange(prev, STEPS[prev].id)
  }

  async function handleFinish() {
    setSaving(true)
    await onComplete()
    setSaving(false)
    onClose()
  }

  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04]`}>
              <Icon className={`w-4 h-4 ${step.color}`} />
            </div>
            <span className="text-xs font-medium text-slate-500">
              {isDone ? 'Concluído' : `Passo ${current + 1} de ${TOTAL_STEPS}`}
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] transition-all"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        {!isDone && (
          <div className="px-5 pt-4">
            <ProgressDots current={current} total={TOTAL_STEPS} />
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-5">
          <StepContent step={step} stepsCompleted={state.steps_completed} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5 pt-1 gap-3">
          {/* Botão voltar ou pular */}
          {isFirst ? (
            <button
              onClick={onDismiss}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-3 py-2"
            >
              Pular por agora
            </button>
          ) : isDone ? (
            <div /> // vazio
          ) : (
            <button
              onClick={goPrev}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          )}

          {/* Botão próximo / concluir */}
          {isDone ? (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Ir para o Dashboard
            </button>
          ) : (
            <button
              onClick={isPreDone ? goNext : goNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
            >
              {isPreDone ? 'Finalizar' : 'Próximo'}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Checklist card (persistente no dashboard) ────────────────────────────

interface ChecklistCardProps {
  state:     OnboardingState
  onReopen:  () => void
  onDismiss: () => void
}

const CHECKLIST_STEPS = STEPS.filter(s => s.id !== 'done' && s.id !== 'welcome')

function ChecklistCard({ state, onReopen, onDismiss }: ChecklistCardProps) {
  const completedCount = CHECKLIST_STEPS.filter(s => state.steps_completed[s.id]).length
  const progress       = Math.round((completedCount / CHECKLIST_STEPS.length) * 100)
  const allDone        = completedCount === CHECKLIST_STEPS.length

  if (state.dismissed && !allDone) return null // se dispensou, não mostra
  if (state.completed) return null

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/[0.06] mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Rocket className="w-4 h-4 text-blue-400" />
            Primeiros passos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {completedCount} de {CHECKLIST_STEPS.length} passos concluídos
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onReopen}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Abrir guia
          </button>
          <button
            onClick={onDismiss}
            className="p-1 rounded text-slate-600 hover:text-slate-400 transition-colors"
            aria-label="Fechar checklist"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 bg-white/[0.05] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Lista de passos */}
      <div className="space-y-2">
        {CHECKLIST_STEPS.map(step => {
          const done = !!state.steps_completed[step.id]
          const Icon = step.icon
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 text-xs transition-opacity ${done ? 'opacity-50' : 'opacity-100'}`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                done ? 'bg-green-500/20' : 'bg-white/[0.04] border border-white/[0.08]'
              }`}>
                {done
                  ? <Check className="w-3 h-3 text-green-400" />
                  : <Icon className={`w-3 h-3 ${step.color}`} />
                }
              </div>
              <span className={done ? 'line-through text-slate-600' : 'text-slate-400'}>
                {step.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────

interface OnboardingWizardProps {
  isAdmin?: boolean
}

export default function OnboardingWizard({ isAdmin = false }: OnboardingWizardProps) {
  const [state,        setState]        = useState<OnboardingState | null>(null)
  const [showWizard,   setShowWizard]   = useState(false)
  const [loading,      setLoading]      = useState(true)

  // ── Carrega estado do onboarding ──────────────────────────────────────

  const loadState = useCallback(async () => {
    try {
      const [stateRes, checkRes] = await Promise.all([
        fetch('/api/onboarding').then(r => r.json()) as Promise<OnboardingState>,
        fetch('/api/onboarding/check').then(r => r.json()) as Promise<{ merged: Record<string, boolean> }>,
      ])

      // Merge steps detectados automaticamente
      const merged: OnboardingState = {
        ...stateRes,
        steps_completed: {
          ...stateRes.steps_completed,
          ...checkRes.merged,
        },
      }
      setState(merged)
      return merged
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) { setLoading(false); return }

    // Check localStorage first — if dismissed locally, skip API call
    if (localStorage.getItem('fgt-onboarding-dismissed') === '1') {
      setLoading(false)
      return
    }

    loadState().then(s => {
      if (!s) return
      // Dispara wizard automaticamente após 1s se não completou nem dispensou
      if (!s.completed && !s.dismissed) {
        const timer = setTimeout(() => setShowWizard(true), 1000)
        return () => clearTimeout(timer)
      }
    })
  }, [isAdmin, loadState])

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleDismiss() {
    setShowWizard(false)
    localStorage.setItem('fgt-onboarding-dismissed', '1')
    await fetch('/api/onboarding/dismiss', { method: 'POST' })
    setState(prev => prev ? { ...prev, dismissed: true } : prev)
  }

  async function handleComplete() {
    localStorage.setItem('fgt-onboarding-dismissed', '1')
    await fetch('/api/onboarding/complete', { method: 'POST' })
    setState(prev => prev ? { ...prev, completed: true } : prev)
  }

  async function handleStepChange(step: number, stepId: string) {
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_step:    step,
        steps_completed: { [stepId]: true },
      }),
    })
    setState(prev => prev ? {
      ...prev,
      current_step:    step,
      steps_completed: { ...prev.steps_completed, [stepId]: true },
    } : prev)
  }

  function handleReopen() {
    setShowWizard(true)
    // Reseta dismissed para mostrar o wizard novamente
    setState(prev => prev ? { ...prev, dismissed: false } : prev)
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (isAdmin || loading || !state) return null
  if (state.completed) return null

  return (
    <>
      {/* Checklist persistente no dashboard */}
      <ChecklistCard
        state={state}
        onReopen={handleReopen}
        onDismiss={handleDismiss}
      />

      {/* Modal do wizard */}
      {showWizard && (
        <WizardModal
          state={state}
          onClose={() => setShowWizard(false)}
          onDismiss={handleDismiss}
          onComplete={handleComplete}
          onStepChange={handleStepChange}
        />
      )}
    </>
  )
}
