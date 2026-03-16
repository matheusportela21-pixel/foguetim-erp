import Link from 'next/link'
import { Rocket, Zap, Shield, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Integrações — Foguetim ERP',
  description: 'Conecte seus marketplaces com segurança via APIs oficiais. Mercado Livre, Shopee e Amazon.',
}

const integrations = [
  {
    name: 'Mercado Livre',
    color: '#f59e0b',
    dot: 'bg-amber-400',
    headline: 'Integração ativa',
    detail: 'Autenticação OAuth 2.0 via API oficial MLB',
    badge: 'Disponível',
    badgeCls: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    features: [
      'Integração via API oficial MercadoLibre (MLB)',
      'Autenticação OAuth 2.0 padrão',
      'Gestão completa de anúncios e pedidos',
      'Métricas e relatórios de vendas',
    ],
  },
  {
    name: 'Shopee',
    color: '#f97316',
    dot: 'bg-orange-400',
    headline: 'Integração em desenvolvimento',
    detail: 'Disponível em breve',
    badge: 'Em breve',
    badgeCls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    features: [
      'Integração em desenvolvimento',
      'Sincronize produtos, pedidos e estoque quando disponível',
    ],
  },
  {
    name: 'Amazon',
    color: '#0ea5e9',
    dot: 'bg-sky-400',
    headline: 'Em desenvolvimento',
    detail: 'Disponível em breve',
    badge: 'Em breve',
    badgeCls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    features: [
      'Integração em desenvolvimento',
      'Mais detalhes em breve',
    ],
  },
]

export default function IntegracoesPage() {
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
            <Link href="/sobre" className="hover:text-navy-900 transition-colors">Sobre</Link>
            <Link href="/integracoes" className="text-navy-900 font-semibold transition-colors">Integrações</Link>
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
            <Zap className="w-3.5 h-3.5" />
            APIs oficiais
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-navy-900 leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Integrações
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Conecte seus marketplaces com segurança via APIs oficiais
          </p>
        </div>
      </section>

      {/* Integration cards */}
      <section className="relative z-10 py-10 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {integrations.map(int => (
              <div key={int.name} className="landing-card p-7 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 font-bold text-sm"
                    style={{ color: int.color }}
                  >
                    <span className={`w-2 h-2 rounded-full inline-block ${int.dot}`} />
                    {int.name}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${int.badgeCls}`}>
                    {int.badge}
                  </span>
                </div>

                <h3 className="font-bold text-navy-900 text-base mb-1">{int.headline}</h3>
                <p className="text-sm text-slate-500 mb-6">{int.detail}</p>

                <ul className="space-y-2.5 mt-auto">
                  {int.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical section for API evaluators */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="landing-card p-8 border-l-4 border-purple-400">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="text-base font-bold text-navy-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                For API Evaluators &amp; Partners
              </h2>
            </div>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                Foguetim integrates with marketplaces via official OAuth 2.0 APIs:
              </p>

              <ul className="space-y-3 pl-4">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-navy-900">Mercado Livre:</strong> Integrated via official MercadoLibre
                    API (MLB). Uses standard OAuth 2.0.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-navy-900">Other marketplaces:</strong> Coming soon.
                  </span>
                </li>
              </ul>

              <p>
                All OAuth tokens are stored encrypted and can be revoked by the user at any time.
              </p>

              <p className="font-semibold text-navy-900">
                Contact:{' '}
                <a href="mailto:contato@foguetim.com.br" className="text-purple-600 hover:text-purple-700 transition-colors">
                  contato@foguetim.com.br
                </a>
              </p>
            </div>
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
