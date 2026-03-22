'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Rocket, Check, X, ChevronDown, ChevronUp, ArrowRight, Zap } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────────────────── */
type BillingPeriod = 'monthly' | 'annual'

interface PlanCard {
  id:           string
  name:         string
  monthlyPrice: number | null
  annualPrice:  number | null
  desc:         string
  popular:      boolean
  cta:          string
  ctaHref:      string
  color:        string
  badge:        string | null
  features:     { label: string; included: boolean }[]
}

interface CompRow {
  label:   string
  values:  (string | boolean)[]
  section?: string
}

interface FaqItem { q: string; a: string }

/* ── Plans data ─────────────────────────────────────────────────────────────── */
const PLANS: PlanCard[] = [
  {
    id: 'explorador',
    name: 'Explorador',
    monthlyPrice: 0,
    annualPrice: 0,
    desc: 'Para quem está começando no marketplace',
    popular: false,
    cta: 'Começar grátis',
    ctaHref: '/cadastro',
    color: 'border-gray-200',
    badge: null,
    features: [
      { label: 'Até 10 produtos',               included: true  },
      { label: '1 marketplace (Mercado Livre)',  included: true  },
      { label: 'Dashboard básico',              included: true  },
      { label: 'Pedidos em tempo real',          included: true  },
      { label: 'Sugestão de categoria IA',       included: true  },
      { label: 'Suporte por e-mail',             included: true  },
      { label: 'SAC e Reclamações',              included: false },
      { label: 'Precificação avançada',          included: false },
      { label: 'Relatórios',                    included: false },
      { label: 'NF-e',                          included: false },
    ],
  },
  {
    id: 'comandante',
    name: 'Comandante',
    monthlyPrice: 49.90,
    annualPrice: 39.90,
    desc: 'O mais completo para sellers sérios',
    popular: true,
    cta: 'Começar com 7 dias grátis',
    ctaHref: '/cadastro?plan=comandante',
    color: 'border-indigo-500',
    badge: 'MAIS POPULAR',
    features: [
      { label: 'Até 500 produtos',                   included: true  },
      { label: '3 marketplaces',                     included: true  },
      { label: 'Dashboard completo',                 included: true  },
      { label: 'SAC, Reclamações e Reputação',       included: true  },
      { label: 'Precificação e Gerador de listagens',included: true  },
      { label: 'Painel financeiro',                  included: true  },
      { label: 'Relatórios básicos',                 included: true  },
      { label: 'Até 5 usuários',                     included: true  },
      { label: 'Relatórios avançados com IA',        included: false },
      { label: 'NF-e automática',                   included: false },
    ],
  },
  {
    id: 'almirante',
    name: 'Almirante',
    monthlyPrice: 89.90,
    annualPrice: 71.90,
    desc: 'Para grandes operações de e-commerce',
    popular: false,
    cta: 'Começar com 7 dias grátis',
    ctaHref: '/cadastro?plan=almirante',
    color: 'border-gray-200',
    badge: null,
    features: [
      { label: 'Produtos ilimitados',             included: true },
      { label: 'Marketplaces ilimitados',          included: true },
      { label: 'Tudo do Comandante',               included: true },
      { label: 'Relatórios avançados com IA',      included: true },
      { label: 'Melhoria de título e descrição IA',included: true },
      { label: 'NF-e automática',                  included: true },
      { label: 'Espaço do Contador',               included: true },
      { label: 'Até 10 usuários',                  included: true },
      { label: 'Suporte prioritário',              included: true },
      { label: 'Suporte 24/7',                    included: false },
    ],
  },
  {
    id: 'missao_espacial',
    name: 'Missão Espacial',
    monthlyPrice: 119.90,
    annualPrice: 95.90,
    desc: 'Para empresas com operações avançadas',
    popular: false,
    cta: 'Começar com 7 dias grátis',
    ctaHref: '/cadastro?plan=missao_espacial',
    color: 'border-gray-200',
    badge: null,
    features: [
      { label: 'Tudo ilimitado',                  included: true },
      { label: 'Usuários ilimitados',              included: true },
      { label: 'Tudo do Almirante',                included: true },
      { label: 'Suporte 24/7 dedicado',            included: true },
      { label: 'Onboarding personalizado',         included: true },
      { label: 'SLA premium',                      included: true },
      { label: 'Relatórios avançados',             included: true },
      { label: 'Integrações via API',              included: true },
      { label: 'Multi-conta',                      included: true },
      { label: 'Gerente de conta dedicado',        included: true },
    ],
  },
]

/* ── Comparison table ────────────────────────────────────────────────────────── */
const COMPARISON: (CompRow & { section?: string })[] = [
  // Limites
  { label: 'Produtos',      values: ['10', '500', 'Ilimitado', 'Ilimitado'], section: 'LIMITES' },
  { label: 'Marketplaces',  values: ['1', '3', 'Ilimitado', 'Ilimitado'] },
  { label: 'Usuários',      values: ['1', '5', '10', 'Ilimitado'] },
  // Mercado Livre
  { label: 'Gestão de anúncios',    values: [true, true, true, true], section: 'MERCADO LIVRE' },
  { label: 'Edição de anúncios',    values: [false, true, true, true] },
  { label: 'Pedidos',               values: [true, true, true, true] },
  { label: 'SAC / Perguntas',       values: [false, true, true, true] },
  { label: 'Reclamações',           values: [false, true, true, true] },
  { label: 'Reputação',             values: [false, true, true, true] },
  { label: 'Reviews e Opiniões',    values: [false, true, true, true] },
  { label: 'Vendas por Anúncio',    values: [false, true, true, true] },
  { label: 'Performance',           values: [false, true, true, true] },
  // Ferramentas
  { label: 'Precificação',          values: [false, true, true, true], section: 'FERRAMENTAS' },
  { label: 'Gerador de Listagens',  values: [false, true, true, true] },
  { label: 'Calculadora de frete',  values: [false, true, true, true] },
  // Análises
  { label: 'Relatórios básicos',    values: [false, true, true, true], section: 'ANÁLISES' },
  { label: 'Relatórios avançados',  values: [false, false, true, true] },
  // IA
  { label: 'Sugestão de categoria', values: [true, true, true, true], section: 'INTELIGÊNCIA ARTIFICIAL' },
  { label: 'Melhoria de título',    values: [false, false, true, true] },
  { label: 'Geração de descrição',  values: [false, false, true, true] },
  { label: 'SAC com IA',            values: [false, false, true, true] },
  // Financeiro
  { label: 'Financeiro',            values: [false, true, true, true], section: 'FINANCEIRO E FISCAL' },
  { label: 'NF-e (em breve)',        values: [false, false, true, true] },
  { label: 'Espaço do Contador',    values: [false, false, true, true] },
  // Suporte
  { label: 'Suporte por e-mail',    values: [true, true, true, true], section: 'SUPORTE' },
  { label: 'Suporte prioritário',   values: [false, false, true, true] },
  { label: 'Suporte 24/7',          values: [false, false, false, true] },
  { label: '7 dias grátis',         values: [false, true, true, true], section: 'TRIAL' },
]

const FAQS: FaqItem[] = [
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. Você pode cancelar sua assinatura a qualquer momento sem multa ou burocracia. Após o cancelamento, sua conta continua ativa até o fim do período pago.',
  },
  {
    q: 'O que acontece se ultrapassar o limite de produtos?',
    a: 'Você será notificado quando estiver próximo do limite. Não bloqueamos sua conta automaticamente — você terá a opção de fazer upgrade ou arquivar produtos.',
  },
  {
    q: 'Como funciona o desconto anual?',
    a: 'No plano anual você paga 20% menos por mês, com o valor total cobrado de uma vez por ano. Para o Comandante, isso significa R$39,90/mês em vez de R$49,90/mês.',
  },
  {
    q: 'Posso mudar de plano depois?',
    a: 'Sim, você pode fazer upgrade ou downgrade a qualquer momento. O upgrade é imediato; o downgrade entra em vigor no próximo ciclo de cobrança.',
  },
  {
    q: 'O plano gratuito tem limite de tempo?',
    a: 'Não. O plano Explorador é gratuito para sempre — não é um trial. Você pode usar indefinidamente com as limitações do plano (até 10 produtos, 1 marketplace).',
  },
]

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function PlanPrice({ plan, period }: { plan: PlanCard; period: BillingPeriod }) {
  const price = period === 'annual' ? plan.annualPrice : plan.monthlyPrice
  if (price === 0) {
    return (
      <div className="mb-1">
        <span className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Grátis</span>
        <p className="text-xs text-gray-400 mt-1">para sempre</p>
      </div>
    )
  }
  if (price === null) return null
  return (
    <div className="mb-1">
      {period === 'annual' && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
        <p className="text-sm text-gray-400 line-through mb-0.5">R${plan.monthlyPrice.toFixed(2).replace('.', ',')}/mês</p>
      )}
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          R${price.toFixed(2).replace('.', ',')}
        </span>
        <span className="text-gray-400 text-sm mb-1">/mês</span>
      </div>
      {period === 'annual' && (
        <p className="text-xs text-green-600 font-semibold mt-0.5">Economize 20% no anual</p>
      )}
    </div>
  )
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true)  return <Check className="w-4 h-4 text-green-500 mx-auto" />
  if (value === false) return <X    className="w-4 h-4 text-gray-300 mx-auto"  />
  return <span className="text-xs text-gray-600 font-medium">{value}</span>
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function PlanosPage() {
  const [period,     setPeriod]     = useState<BillingPeriod>('monthly')
  const [openFaq,    setOpenFaq]    = useState<number | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  return (
    <div className="landing-bg min-h-screen overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim <span className="text-gray-400 font-medium text-sm">ERP</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/planos"      className="text-gray-900 font-semibold">Planos</Link>
            <Link href="/integracoes" className="hover:text-gray-900 transition-colors">Integrações</Link>
            <Link href="/sobre"       className="hover:text-gray-900 transition-colors">Sobre</Link>
            <Link href="/contato"     className="hover:text-gray-900 transition-colors">Contato</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/cadastro" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              Começar grátis
            </Link>
          </div>

          <button className="md:hidden p-2 text-gray-500" onClick={() => setMobileMenu(v => !v)}>
            {mobileMenu ? <X className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1">
            <Link href="/"            onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Início</Link>
            <Link href="/integracoes" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Integrações</Link>
            <Link href="/sobre"       onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Sobre</Link>
            <Link href="/contato"     onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 py-2.5">Contato</Link>
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <Link href="/login"    className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg text-center">Entrar</Link>
              <Link href="/cadastro" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg text-center transition-colors">Cadastrar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-12 px-6 text-center bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" />
            Planos e Preços
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4 tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Planos simples,{' '}
            <span className="text-gradient">sem surpresas</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-8">
            Escolha o plano ideal para o tamanho da sua operação.
            Comece grátis e escale quando precisar.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${period === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setPeriod('annual')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${period === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Anual
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Economize 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan Cards ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 pb-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl p-6 flex flex-col border-2 shadow-sm ${plan.popular ? `${plan.color} shadow-lg` : plan.color}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className={`text-base font-bold mb-0.5 ${plan.popular ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {plan.name}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">{plan.desc}</p>
                  <PlanPrice plan={plan} period={period} />
                </div>

                <Link
                  href={period === 'annual' && plan.ctaHref !== '/cadastro'
                    ? plan.ctaHref + '&billing=annual'
                    : plan.ctaHref}
                  className={`block text-center py-2.5 rounded-lg text-sm font-bold w-full mb-5 transition-all ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      {f.included ? (
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${plan.popular ? 'text-indigo-500' : 'text-green-500'}`} />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-300" />
                      )}
                      <span className={f.included ? 'text-gray-600' : 'text-gray-400'}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Todos os planos pagos incluem 7 dias de teste grátis. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ── Comparison Table ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Comparativo</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Compare todos os planos
            </h2>
            <p className="text-gray-500 text-sm">Veja em detalhe o que cada plano oferece</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 pl-6 text-xs font-bold text-gray-400 uppercase tracking-wider w-52 sticky left-0 bg-white z-10">
                    Funcionalidade
                  </th>
                  {PLANS.map(plan => (
                    <th
                      key={plan.id}
                      className={`p-4 text-center text-sm font-bold ${plan.popular ? 'text-indigo-700 bg-indigo-50' : 'text-gray-900 bg-white'}`}
                    >
                      {plan.name}
                      {plan.popular && (
                        <span className="block text-[10px] font-semibold text-indigo-500 mt-0.5">MAIS POPULAR</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <>
                    {row.section && (
                      <tr key={`section-${row.section}`} className="bg-gray-50">
                        <td colSpan={5} className="px-6 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100">
                          {row.section}
                        </td>
                      </tr>
                    )}
                    <tr
                      key={row.label}
                      className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="p-4 pl-6 text-sm text-gray-700 font-medium sticky left-0 bg-inherit z-10">
                        {row.label}
                      </td>
                      {row.values.map((val, vi) => (
                        <td
                          key={vi}
                          className={`p-4 text-center ${PLANS[vi]?.popular ? 'bg-indigo-50/40' : ''}`}
                        >
                          <CellValue value={val} />
                        </td>
                      ))}
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Todos os planos pagos incluem 7 dias de teste grátis. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wider">FAQ</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Perguntas frequentes
            </h2>
            <p className="text-gray-500 text-sm">Tem alguma dúvida? Nós respondemos.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-sm">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp   className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Pronto para começar?
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Crie sua conta gratuita e conecte seu Mercado Livre em minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/cadastro" className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3.5 rounded-lg text-base transition-colors">
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="mailto:contato@foguetim.com.br" className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-8 py-3.5 rounded-lg text-base transition-colors">
              Falar com a equipe
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">Sem cartão de crédito. 7 dias grátis nos planos pagos.</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-gray-100 py-10 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400">
            <div className="text-center md:text-left space-y-1">
              <p className="font-semibold text-gray-900">© 2026 Foguetim ERP — Todos os direitos reservados.</p>
              <p>Operado por FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA</p>
              <p>CNPJ: 33.685.241/0001-70 | Fortaleza — CE — Brasil</p>
              <a href="mailto:contato@foguetim.com.br" className="hover:text-gray-900 transition-colors">contato@foguetim.com.br</a>
            </div>
            <div className="flex flex-wrap justify-center gap-5">
              <Link href="/"            className="hover:text-gray-900 transition-colors">Início</Link>
              <Link href="/sobre"       className="hover:text-gray-900 transition-colors">Sobre</Link>
              <Link href="/planos"      className="hover:text-gray-900 transition-colors font-semibold text-gray-900">Planos</Link>
              <Link href="/contato"     className="hover:text-gray-900 transition-colors">Contato</Link>
              <Link href="/termos"      className="hover:text-gray-900 transition-colors">Termos de Uso</Link>
              <Link href="/privacidade" className="hover:text-gray-900 transition-colors">Privacidade</Link>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6 pt-6 border-t border-gray-100">
            Foguetim é uma plataforma independente. As integrações são realizadas via APIs oficiais de cada marketplace.
          </p>
        </div>
      </footer>
    </div>
  )
}
