import Link from 'next/link'
import Image from 'next/image'
import { Building2, MapPin, Mail, Package, Shield, BarChart2, Star, Zap, Globe, Rocket } from 'lucide-react'

export const metadata = {
  title: 'Sobre o Foguetim — Foguetim ERP',
  description: 'Conheça a empresa por trás do Foguetim ERP, nossa missão e nossas integrações com marketplaces.',
  alternates: {
    canonical: 'https://www.foguetim.com.br/sobre',
  },
  openGraph: {
    title: 'Sobre o Foguetim | Foguetim ERP',
    description: 'Conheça a empresa por trás do Foguetim ERP, nossa missão e nossas integrações com marketplaces.',
    url: 'https://www.foguetim.com.br/sobre',
  },
}

const whatWeDo = [
  {
    icon: Package,
    title: 'Gestão Integrada',
    desc: 'Centralize pedidos, produtos e métricas de todos os marketplaces em um só lugar.',
  },
  {
    icon: Shield,
    title: 'APIs Oficiais',
    desc: 'Integrações via APIs oficiais com OAuth 2.0, garantindo segurança e confiabilidade.',
  },
  {
    icon: BarChart2,
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
    badgeCls: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
  },
  {
    name: 'Shopee',
    color: '#f97316',
    dot: 'bg-orange-400',
    detail: 'Integração ativa via API oficial Shopee, OAuth 2.0',
    badge: 'Disponível',
    badgeCls: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
  },
]

export default function SobrePage() {
  return (
    <div className="bg-[#0A0718] text-slate-100 stars-bg min-h-screen overflow-x-hidden">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0A0718]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Foguetim" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-lg text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim <span className="text-slate-500 font-medium text-sm">ERP</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <Link href="/planos" className="hover:text-white transition-colors">Planos</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/sobre" className="text-white transition-colors">Sobre</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors px-4 py-2">Entrar</Link>
            <Link href="/cadastro" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Começar grátis</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-6">
            <Building2 className="w-3.5 h-3.5" />
            Nossa empresa
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Sobre o Foguetim
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            A plataforma de gestão de marketplaces que acelera o seu negócio
          </p>
          <div className="mt-8 flex justify-center">
            <Image src="/mascot/timm-standing.png" alt="Timm" width={200} height={200} />
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="relative z-10 py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Informações da Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Razão Social</p>
                  <p className="text-sm font-semibold text-white leading-snug">
                    FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">CNPJ</p>
                  <p className="text-sm font-semibold text-white">33.685.241/0001-70</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Localização</p>
                  <p className="text-sm font-semibold text-white">Fortaleza — CE — Brasil</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">E-mail</p>
                  <a href="mailto:contato@foguetim.com.br" className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                    contato@foguetim.com.br
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-3xl mx-auto glass-card p-8">
          <p className="text-sm font-semibold text-violet-400 mb-3 uppercase tracking-wider">Nossa História</p>
          <h2 className="text-2xl font-bold text-white mb-5" style={{ fontFamily: 'Sora, sans-serif' }}>
            Feito por vendedores, para vendedores
          </h2>
          <p className="text-base text-slate-400 leading-relaxed mb-4">
            O Foguetim nasceu da necessidade real de um vendedor de marketplace em Fortaleza, CE. Cansado de ferramentas
            genéricas que não entendiam o dia a dia do e-commerce brasileiro, decidimos construir um ERP feito por
            vendedores, para vendedores.
          </p>
          <p className="text-base text-slate-400 leading-relaxed">
            Controle de estoque, integração com Mercado Livre, precificação inteligente, expedição, pós-venda — tudo
            num só lugar, sem complicação e sem planilha.
          </p>
        </div>
      </section>

      {/* Nosso Diferencial */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">Nosso Diferencial</p>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Focado no vendedor brasileiro
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Star,
                title: 'Multi-armazém e Multi-conta',
                desc: 'Gerencie várias contas do Mercado Livre e múltiplos armazéns num único painel, sem precisar trocar de aba.',
              },
              {
                icon: Globe,
                title: 'Precificação com tarifas reais',
                desc: 'Calcule seus preços considerando as tarifas reais do ML — frete, comissão, impostos — e nunca mais venda no prejuízo.',
              },
              {
                icon: Zap,
                title: 'ML + Shopee + mais',
                desc: 'Mercado Livre e Shopee integrados. Amazon e mais plataformas a caminho. Um ERP que cresce com o seu negócio.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card p-7">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">O que fazemos</p>
            <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Ferramentas para o seller moderno
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {whatWeDo.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card p-7">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-orange-400 mb-3 uppercase tracking-wider">Parceiros</p>
            <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
              Nossas Integrações
            </h2>
            <p className="text-slate-400 text-sm">Conexão direta via APIs oficiais com os maiores marketplaces do Brasil.</p>
          </div>

          <div className="space-y-4">
            {integrations.map(int => (
              <div key={int.name} className="glass-card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-semibold text-sm"
                    style={{ color: int.color }}
                  >
                    <span className={`w-2 h-2 rounded-full inline-block ${int.dot}`} />
                    {int.name}
                  </span>
                  <p className="text-sm text-slate-400 hidden sm:block">{int.detail}</p>
                </div>
                <span className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold ${int.badgeCls}`}>
                  {int.badge}
                </span>
              </div>
            ))}
          </div>

          {/* English note for API evaluators */}
          <div className="mt-8 glass-card p-6 border-l-4 border-violet-500">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">For API Evaluators &amp; Partners</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Foguetim integrates with marketplaces via official OAuth 2.0 APIs.
              Mercado Livre is integrated via the official MercadoLibre API (MLB), using standard OAuth 2.0.
              Other marketplaces are coming soon.
              All OAuth tokens are stored encrypted and can be revoked by the user at any time.{' '}
              <a href="mailto:contato@foguetim.com.br" className="text-violet-400 font-semibold hover:underline">
                Contact: contato@foguetim.com.br
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto glass-card p-12 border-violet-500/20">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Comece a usar o Foguetim hoje
          </h2>
          <p className="text-slate-400 mb-8 text-base">
            Plano gratuito disponível. Sem cartão de crédito. Cancele quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold px-8 py-3.5 rounded-xl hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg text-sm"
            >
              <Rocket className="w-4 h-4" />
              Começar grátis
            </Link>
            <Link
              href="/planos"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Ver planos e preços →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-[#060512] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/logo.png" alt="Foguetim" width={32} height={32} className="rounded-lg" />
                <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim ERP</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                O ERP do marketplace brasileiro. Do armazém ao cliente, tudo num só lugar.
              </p>
              <div className="text-xs text-slate-600 space-y-1">
                <p>FIO CABANA IND. E COM. DE CONF. LTDA</p>
                <p>CNPJ: 33.685.241/0001-70</p>
                <p>Fortaleza — CE — Brasil</p>
              </div>
            </div>

            {/* Empresa */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Empresa</p>
              <ul className="space-y-2.5">
                <li><Link href="/sobre" className="text-sm text-slate-500 hover:text-white transition-colors">Sobre</Link></li>
                <li><Link href="/blog" className="text-sm text-slate-500 hover:text-white transition-colors">Blog</Link></li>
                <li><a href="mailto:contato@foguetim.com.br" className="text-sm text-slate-500 hover:text-white transition-colors">E-mail</a></li>
              </ul>
            </div>

            {/* Produto */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Produto</p>
              <ul className="space-y-2.5">
                <li><Link href="/planos" className="text-sm text-slate-500 hover:text-white transition-colors">Planos</Link></li>
                <li><Link href="/integracoes" className="text-sm text-slate-500 hover:text-white transition-colors">Integrações</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Legal</p>
              <ul className="space-y-2.5">
                <li><Link href="/termos" className="text-sm text-slate-500 hover:text-white transition-colors">Termos</Link></li>
                <li><Link href="/privacidade" className="text-sm text-slate-500 hover:text-white transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 text-center sm:text-left">
              <p>© {new Date().getFullYear()} Foguetim ERP. Todos os direitos reservados.</p>
              <p className="mt-0.5">Feito em Fortaleza, CE</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
