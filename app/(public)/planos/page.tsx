'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Rocket, Check, X, ChevronDown, ChevronUp, ArrowRight, Zap, Mail } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────────────────── */
type BillingPeriod = 'monthly' | 'annual'

interface Plan {
  id: string
  name: string
  subtitle: string
  monthlyPrice: number | null
  annualPrice: number | null
  desc: string
  popular: boolean
  cta: string
  ctaHref: string
  color: string
  features: { label: string; included: boolean }[]
}

interface FaqItem {
  q: string
  a: string
}

/* ── Data ───────────────────────────────────────────────────────────────────── */
const plans: Plan[] = [
  {
    id: 'explorador',
    name: 'Explorador',
    subtitle: 'Gratuito',
    monthlyPrice: 0,
    annualPrice: 0,
    desc: 'Para quem está começando no marketplace',
    popular: false,
    cta: 'Começar grátis',
    ctaHref: '/registro',
    color: 'border-slate-200',
    features: [
      { label: '1 integração (Mercado Livre)', included: true },
      { label: 'Até 50 produtos', included: true },
      { label: 'Dashboard básico', included: true },
      { label: 'Pedidos em tempo real', included: true },
      { label: 'Suporte por e-mail', included: true },
      { label: 'SAC integrado', included: false },
      { label: 'Análise de concorrentes', included: false },
      { label: 'Reviews e opiniões', included: false },
      { label: 'Relatórios avançados', included: false },
      { label: 'API access', included: false },
    ],
  },
  {
    id: 'piloto',
    name: 'Piloto',
    subtitle: 'R$29/mês',
    monthlyPrice: 29,
    annualPrice: 23,
    desc: 'Para sellers em crescimento acelerado',
    popular: false,
    cta: 'Começar com 7 dias grátis',
    ctaHref: '/registro?plano=piloto',
    color: 'border-slate-200',
    features: [
      { label: '2 integrações (ML + Shopee)', included: true },
      { label: 'Até 200 produtos', included: true },
      { label: 'Dashboard completo', included: true },
      { label: 'Pedidos em tempo real', included: true },
      { label: 'SAC integrado', included: true },
      { label: 'Análise de concorrentes', included: true },
      { label: 'Suporte prioritário', included: true },
      { label: 'Reviews e opiniões', included: false },
      { label: 'Relatórios avançados', included: false },
      { label: 'API access', included: false },
    ],
  },
  {
    id: 'comandante',
    name: 'Comandante',
    subtitle: 'R$59/mês',
    monthlyPrice: 59,
    annualPrice: 47,
    desc: 'O mais completo para sellers sérios',
    popular: true,
    cta: 'Começar com 7 dias grátis',
    ctaHref: '/registro?plano=comandante',
    color: 'border-purple-500',
    features: [
      { label: '3 integrações (ML + Shopee + Amazon)', included: true },
      { label: 'Até 500 produtos', included: true },
      { label: 'Dashboard completo', included: true },
      { label: 'Pedidos em tempo real', included: true },
      { label: 'SAC integrado', included: true },
      { label: 'Análise de concorrentes', included: true },
      { label: 'Reviews e opiniões', included: true },
      { label: 'Relatórios avançados', included: true },
      { label: 'Suporte prioritário', included: true },
      { label: 'API access', included: false },
    ],
  },
  {
    id: 'almirante',
    name: 'Almirante',
    subtitle: 'R$99/mês',
    monthlyPrice: 99,
    annualPrice: 79,
    desc: 'Para grandes operações de e-commerce',
    popular: false,
    cta: 'Começar com 7 dias grátis',
    ctaHref: '/registro?plano=almirante',
    color: 'border-slate-200',
    features: [
      { label: 'Todas as integrações', included: true },
      { label: 'Produtos ilimitados', included: true },
      { label: 'Tudo do Comandante', included: true },
      { label: 'Relatórios avançados', included: true },
      { label: 'API access', included: true },
      { label: 'Gestor de conta dedicado', included: true },
      { label: 'SLA garantido', included: true },
      { label: 'White-label', included: false },
      { label: 'Multi-conta (até 5 CNPJs)', included: false },
      { label: 'Onboarding personalizado', included: false },
    ],
  },
  {
    id: 'missao',
    name: 'Missão Espacial',
    subtitle: 'Enterprise',
    monthlyPrice: 199,
    annualPrice: 159,
    desc: 'Para empresas com múltiplas contas e necessidades avançadas',
    popular: false,
    cta: 'Falar com vendas',
    ctaHref: '/contato',
    color: 'border-slate-200',
    features: [
      { label: 'Tudo ilimitado', included: true },
      { label: 'Multi-conta (até 5 CNPJs)', included: true },
      { label: 'White-label disponível', included: true },
      { label: 'Suporte 24/7', included: true },
      { label: 'Onboarding personalizado', included: true },
      { label: 'SLA premium', included: true },
      { label: 'API access', included: true },
      { label: 'Relatórios avançados', included: true },
      { label: 'Reviews e opiniões', included: true },
      { label: 'Análise de concorrentes', included: true },
    ],
  },
]

/* ── Comparison table rows ──────────────────────────────────────────────────── */
type ComparisonRow = {
  label: string
  values: (string | boolean)[]
}

const comparisonRows: ComparisonRow[] = [
  { label: 'Integrações',          values: ['1 (ML)', '2 (ML+SP)', '3 (ML+SP+AMZ)', 'Todas', 'Todas'] },
  { label: 'Produtos',             values: ['50', '200', '500', 'Ilimitado', 'Ilimitado'] },
  { label: 'Dashboard',            values: ['Básico', 'Completo', 'Completo', 'Completo', 'Completo'] },
  { label: 'Pedidos em tempo real',values: [true, true, true, true, true] },
  { label: 'SAC integrado',        values: [false, true, true, true, true] },
  { label: 'Análise de concorrentes',values: [false, true, true, true, true] },
  { label: 'Reviews e opiniões',   values: [false, false, true, true, true] },
  { label: 'Relatórios avançados', values: [false, false, true, true, true] },
  { label: 'API access',           values: [false, false, false, true, true] },
  { label: 'Gestor dedicado',      values: [false, false, false, true, true] },
  { label: 'SLA garantido',        values: [false, false, false, true, 'Premium'] },
  { label: 'White-label',          values: [false, false, false, false, true] },
  { label: 'Multi-conta',          values: [false, false, false, false, 'Até 5 CNPJs'] },
  { label: 'Suporte',              values: ['E-mail', 'Prioritário', 'Prioritário', 'Dedicado', '24/7'] },
]

const faqs: FaqItem[] = [
  {
    q: 'Posso trocar de plano a qualquer momento?',
    a: 'Sim, você pode fazer upgrade ou downgrade a qualquer momento. A cobrança é proporcional ao período restante.',
  },
  {
    q: 'O período de teste é gratuito mesmo?',
    a: 'Sim, 7 dias completamente gratuitos, sem necessidade de cartão de crédito para começar.',
  },
  {
    q: 'Quais formas de pagamento são aceitas?',
    a: 'Cartão de crédito, boleto bancário e PIX.',
  },
  {
    q: 'O que acontece com meus dados se eu cancelar?',
    a: 'Seus dados ficam disponíveis por 30 dias após o cancelamento para exportação.',
  },
  {
    q: 'Posso integrar todos os marketplaces no plano Explorador?',
    a: 'O plano Explorador inclui apenas a integração com Mercado Livre. Para Shopee e Amazon, é necessário o plano Piloto ou superior.',
  },
]

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function formatPrice(price: number | null, period: BillingPeriod): string {
  if (price === null) return '—'
  if (price === 0) return 'Grátis'
  return `R$${price}/mês`
}

function PlanPrice({ plan, period }: { plan: Plan; period: BillingPeriod }) {
  const price = period === 'annual' ? plan.annualPrice : plan.monthlyPrice

  if (price === 0) {
    return (
      <div className="mb-1">
        <span className="text-4xl font-bold text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          Grátis
        </span>
      </div>
    )
  }

  if (price === null) return null

  return (
    <div className="mb-1">
      {period === 'annual' && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
        <p className="text-sm text-slate-400 line-through mb-0.5">
          R${plan.monthlyPrice}/mês
        </p>
      )}
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          R${price}
        </span>
        <span className="text-slate-400 text-sm mb-1">/mês</span>
      </div>
      {period === 'annual' && (
        <p className="text-xs text-green-600 font-semibold mt-0.5">Economize 20% no anual</p>
      )}
    </div>
  )
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-green-500 mx-auto" />
  if (value === false) return <X className="w-4 h-4 text-slate-300 mx-auto" />
  return <span className="text-xs text-slate-600 font-medium">{value}</span>
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function PlanosPage() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  return (
    <div className="landing-bg min-h-screen overflow-x-hidden">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center shadow-sm">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Foguetim
            </span>
            <span className="hidden sm:block text-xs font-medium text-slate-400 tracking-wider mt-0.5">ERP</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <Link href="/sobre"       className="hover:text-navy-900 transition-colors">Sobre</Link>
            <Link href="/integracoes" className="hover:text-navy-900 transition-colors">Integrações</Link>
            <Link href="/planos"      className="text-navy-900 font-semibold transition-colors">Planos</Link>
            <Link href="/contato"     className="hover:text-navy-900 transition-colors">Contato</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-navy-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/registro" className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              Começar Grátis
            </Link>
          </div>

          <button className="md:hidden p-2 text-slate-500" onClick={() => setMobileMenu(v => !v)}>
            {mobileMenu ? <X className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-1">
            <Link href="/sobre"       onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">Sobre</Link>
            <Link href="/integracoes" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">Integrações</Link>
            <Link href="/planos"      onClick={() => setMobileMenu(false)} className="block text-sm font-bold text-navy-900 py-2.5">Planos</Link>
            <Link href="/contato"     onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-slate-600 py-2.5">Contato</Link>
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Link href="/login"    className="flex-1 btn-outline py-2.5 rounded-xl text-sm text-center">Entrar</Link>
              <Link href="/registro" className="flex-1 btn-primary py-2.5 rounded-xl text-sm text-center">Cadastrar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-20 pb-12 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-6 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            Planos e Preços
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-navy-900 leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Escolha o plano ideal{' '}
            <span className="text-gradient">para o seu negócio</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
            Comece grátis e escale conforme sua operação cresce. Sem contratos longos, cancele quando quiser.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-2xl p-1 shadow-inner">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                period === 'monthly'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-500 hover:text-navy-900'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setPeriod('annual')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                period === 'annual'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-slate-500 hover:text-navy-900'
              }`}
            >
              Anual
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Economize 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan Cards ───────────────────────────────────────────────────── */}
      <section className="relative z-10 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-start">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`relative landing-card p-6 flex flex-col border-2 ${plan.color} ${
                  plan.popular ? 'ring-2 ring-purple-500 shadow-lg' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className={`text-base font-bold mb-0.5 ${plan.popular ? 'text-purple-700' : 'text-navy-900'}`}>
                    {plan.name}
                  </p>
                  <p className="text-xs text-slate-400 mb-3">{plan.desc}</p>
                  <PlanPrice plan={plan} period={period} />
                </div>

                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-2.5 rounded-xl text-sm font-bold w-full mb-5 transition-all ${
                    plan.popular ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-2 flex-1">
                  {plan.features.map(f => (
                    <li key={f.label} className="flex items-start gap-2 text-xs">
                      {f.included ? (
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${plan.popular ? 'text-purple-500' : 'text-green-500'}`} />
                      ) : (
                        <X className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-300" />
                      )}
                      <span className={f.included ? 'text-slate-600' : 'text-slate-400'}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            Todos os planos pagos incluem 7 dias de teste grátis. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ── Comparison Table ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-purple-600 mb-3 uppercase tracking-wider">Comparativo</p>
            <h2 className="text-3xl font-bold text-navy-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Compare todos os planos
            </h2>
            <p className="text-slate-500 text-sm">Veja em detalhe o que cada plano oferece</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-4 pl-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-48 sticky left-0 bg-white z-10">
                    Funcionalidade
                  </th>
                  {plans.map(plan => (
                    <th
                      key={plan.id}
                      className={`p-4 text-center text-sm font-bold ${
                        plan.popular
                          ? 'text-purple-700 bg-purple-50'
                          : 'text-navy-900 bg-white'
                      }`}
                    >
                      {plan.name}
                      {plan.popular && (
                        <span className="block text-[10px] font-semibold text-purple-500 mt-0.5">MAIS POPULAR</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    <td className="p-4 pl-6 text-sm text-slate-700 font-medium sticky left-0 bg-inherit z-10">
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td
                        key={vi}
                        className={`p-4 text-center ${
                          plans[vi]?.popular ? 'bg-purple-50/40' : ''
                        }`}
                      >
                        <CellValue value={val} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Todos os planos pagos incluem 7 dias de teste grátis. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-cyan-600 mb-3 uppercase tracking-wider">FAQ</p>
            <h2 className="text-3xl font-bold text-navy-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Perguntas frequentes
            </h2>
            <p className="text-slate-500 text-sm">Tem alguma dúvida? Nós respondemos.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="landing-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <span className="font-semibold text-navy-900 text-sm">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-navy-900 to-purple-700 rounded-3xl px-8 py-14 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
                Pronto para decolar?
              </h2>
              <p className="text-white/70 mb-8 max-w-md mx-auto text-sm">
                Comece grátis hoje e veja como o Foguetim transforma a sua operação de marketplace.
              </p>
              <Link href="/registro" className="btn-orange px-8 py-3.5 rounded-2xl text-base font-bold inline-flex items-center gap-2">
                Criar conta grátis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Ainda tem dúvidas? Fale com a nossa equipe →{' '}
              <a href="mailto:contato@foguetim.com.br" className="text-purple-600 font-semibold hover:text-purple-700 transition-colors">
                contato@foguetim.com.br
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-100 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
            <div className="text-center md:text-left space-y-1">
              <p className="font-semibold text-navy-900">© 2026 Foguetim ERP — Todos os direitos reservados.</p>
              <p>Operado por FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA</p>
              <p>CNPJ: 33.685.241/0001-70 | Fortaleza — CE — Brasil</p>
              <a href="mailto:contato@foguetim.com.br" className="hover:text-navy-900 transition-colors">contato@foguetim.com.br</a>
            </div>
            <div className="flex flex-wrap justify-center gap-5">
              <Link href="/" className="hover:text-navy-900 transition-colors">Início</Link>
              <Link href="/sobre" className="hover:text-navy-900 transition-colors">Sobre</Link>
              <Link href="/planos" className="hover:text-navy-900 transition-colors font-semibold text-navy-900">Planos</Link>
              <Link href="/contato" className="hover:text-navy-900 transition-colors">Contato</Link>
              <Link href="/termos" className="hover:text-navy-900 transition-colors">Termos de Uso</Link>
              <Link href="/privacidade" className="hover:text-navy-900 transition-colors">Privacidade</Link>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-6 pt-6 border-t border-slate-100">
            Foguetim é uma plataforma independente. As integrações são realizadas via APIs oficiais de cada marketplace.
          </p>
        </div>
      </footer>
    </div>
  )
}
