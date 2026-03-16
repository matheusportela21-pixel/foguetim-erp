import Link from 'next/link'
import { Rocket, Building2, MapPin, Mail, Package, Shield, BarChart2, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Sobre o Foguetim — Foguetim ERP',
  description: 'Conheça a empresa por trás do Foguetim ERP, nossa missão e nossas integrações com marketplaces.',
}

const whatWeDo = [
  {
    icon: Package,
    color: 'bg-blue-50 text-blue-600',
    title: 'Gestão Integrada',
    desc: 'Centralize pedidos, produtos e métricas de todos os marketplaces em um só lugar.',
  },
  {
    icon: Shield,
    color: 'bg-purple-50 text-purple-600',
    title: 'APIs Oficiais',
    desc: 'Integrações via APIs oficiais com OAuth 2.0, garantindo segurança e confiabilidade.',
  },
  {
    icon: BarChart2,
    color: 'bg-cyan-50 text-cyan-600',
    title: 'Inteligência',
    desc: 'Relatórios, análise de concorrentes, reviews e muito mais para decisões baseadas em dados.',
  },
]

const integrations = [
  {
    name: 'Mercado Livre',
    color: '#f59e0b',
    dot: 'bg-amber-400',
    detail: 'Integração ativa via API oficial MLB, OAuth 2.0',
    badge: 'Disponível',
    badgeCls: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  },
  {
    name: 'Shopee',
    color: '#f97316',
    dot: 'bg-orange-400',
    detail: 'Integração em desenvolvimento',
    badge: 'Em breve',
    badgeCls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  {
    name: 'Amazon',
    color: '#0ea5e9',
    dot: 'bg-sky-400',
    detail: 'Em desenvolvimento',
    badge: 'Em breve',
    badgeCls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
]

export default function SobrePage() {
  return (
    <div className="landing-bg min-h-screen overflow-x-hidden">

      {/* Navbar */}
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
            <Link href="/sobre" className="text-navy-900 font-semibold transition-colors">Sobre</Link>
            <Link href="/integracoes" className="hover:text-navy-900 transition-colors">Integrações</Link>
            <Link href="/contato" className="hover:text-navy-900 transition-colors">Contato</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-navy-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/registro" className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-6 shadow-sm">
            <Building2 className="w-3.5 h-3.5" />
            Nossa empresa
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-navy-900 leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Sobre o Foguetim
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            A plataforma de gestão de marketplaces que acelera o seu negócio
          </p>
        </div>
      </section>

      {/* Company Info */}
      <section className="relative z-10 py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="landing-card p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Informações da Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Razão Social</p>
                  <p className="text-sm font-semibold text-navy-900 leading-snug">
                    FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">CNPJ</p>
                  <p className="text-sm font-semibold text-navy-900">33.685.241/0001-70</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Localização</p>
                  <p className="text-sm font-semibold text-navy-900">Fortaleza — CE — Brasil</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">E-mail</p>
                  <a href="mailto:contato@foguetim.com.br" className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                    contato@foguetim.com.br
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="relative z-10 py-10 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-purple-600 mb-3 uppercase tracking-wider">Nossa Missão</p>
          <p className="text-lg text-slate-700 leading-relaxed">
            O Foguetim nasceu da necessidade real de vendedores de marketplace que precisavam de uma ferramenta
            integrada, inteligente e acessível para gerenciar suas operações nos maiores marketplaces do Brasil.
          </p>
        </div>
      </section>

      {/* What We Do */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-cyan-600 mb-3 uppercase tracking-wider">O que fazemos</p>
            <h2 className="text-3xl font-bold text-navy-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Ferramentas para o seller moderno
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {whatWeDo.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="landing-card p-7">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2 text-base">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-orange-500 mb-3 uppercase tracking-wider">Parceiros</p>
            <h2 className="text-3xl font-bold text-navy-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Nossas Integrações
            </h2>
            <p className="text-slate-500 text-sm">Conexão direta via APIs oficiais com os maiores marketplaces do Brasil.</p>
          </div>

          <div className="space-y-4">
            {integrations.map(int => (
              <div key={int.name} className="landing-card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 font-semibold text-sm"
                    style={{ color: int.color }}
                  >
                    <span className={`w-2 h-2 rounded-full inline-block ${int.dot}`} />
                    {int.name}
                  </span>
                  <p className="text-sm text-slate-500 hidden sm:block">{int.detail}</p>
                </div>
                <span className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold ${int.badgeCls}`}>
                  {int.badge}
                </span>
              </div>
            ))}
          </div>

          {/* English note for API evaluators */}
          <div className="mt-8 landing-card p-6 border-l-4 border-purple-400">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">For API Evaluators &amp; Partners</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Foguetim integrates with marketplaces via official OAuth 2.0 APIs.
              Mercado Livre is integrated via the official MercadoLibre API (MLB), using standard OAuth 2.0.
              Other marketplaces are coming soon.
              All OAuth tokens are stored encrypted and can be revoked by the user at any time.{' '}
              <a href="mailto:contato@foguetim.com.br" className="text-purple-600 font-semibold hover:underline">
                Contact: contato@foguetim.com.br
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
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
              <Link href="/sobre" className="hover:text-navy-900 transition-colors">Sobre</Link>
              <Link href="/termos" className="hover:text-navy-900 transition-colors">Termos de Uso</Link>
              <Link href="/privacidade" className="hover:text-navy-900 transition-colors">Política de Privacidade</Link>
              <Link href="/contato" className="hover:text-navy-900 transition-colors">Contato</Link>
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
