import Link from 'next/link'
import { Rocket, Lock } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade — Foguetim ERP',
  description: 'Política de Privacidade da plataforma Foguetim ERP, em conformidade com a LGPD.',
}

const sections = [
  {
    title: '1. Responsável pelo Tratamento',
    content:
      'FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA, CNPJ: 33.685.241/0001-70, Fortaleza — CE — Brasil.',
    email: 'contato@foguetim.com.br',
  },
  {
    title: '2. Dados Coletados',
    content:
      'Nome, e-mail, dados da empresa (CNPJ, razão social), tokens OAuth dos marketplaces (armazenados com criptografia), dados de uso e informações de cobrança.',
  },
  {
    title: '3. Finalidade',
    content:
      'Prestação dos serviços contratados, integração com marketplaces autorizados pelo usuário, comunicações sobre a conta e melhorias da plataforma.',
  },
  {
    title: '4. Compartilhamento',
    content:
      'Não vendemos dados a terceiros. Dados são compartilhados apenas com provedores de infraestrutura (Supabase, Vercel) sob contratos de confidencialidade, e com marketplaces conforme autorizado via OAuth.',
  },
  {
    title: '5. Segurança',
    content:
      'Criptografia em trânsito (HTTPS/TLS) e em repouso. Autenticação via Supabase Auth com padrões modernos de segurança.',
  },
  {
    title: '6. Direitos do Usuário — LGPD',
    content:
      'Conforme Lei nº 13.709/2018, o usuário tem direito a acessar, corrigir e solicitar exclusão de seus dados, além de revogar autorizações OAuth a qualquer momento.',
  },
  {
    title: '7. Retenção',
    content:
      'Dados retidos enquanto a conta estiver ativa. Após exclusão, removidos em até 30 dias.',
  },
  {
    title: '8. Cookies',
    content:
      'Utilizamos cookies estritamente necessários para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento para publicidade.',
  },
  {
    title: '9. Contato para Privacidade',
    content: '',
    email: 'contato@foguetim.com.br',
  },
]

export default function PrivacidadePage() {
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
            <Link href="/integracoes" className="hover:text-navy-900 transition-colors">Integrações</Link>
            <Link href="/contato" className="hover:text-navy-900 transition-colors">Contato</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="https://app.foguetim.com.br/login" className="text-sm font-semibold text-slate-600 hover:text-navy-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="https://app.foguetim.com.br/cadastro" className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-10 px-6 text-center bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            Documento legal
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-navy-900 leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Política de Privacidade
          </h1>
          <p className="text-sm text-slate-400">Última atualização: 14 de março de 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="landing-card p-7">
              <h2 className="text-base font-bold text-navy-900 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                {section.title}
              </h2>
              {section.content && (
                <p className="text-sm text-slate-600 leading-relaxed">{section.content}</p>
              )}
              {section.email && (
                <a href={`mailto:${section.email}`} className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors block mt-2">
                  {section.email}
                </a>
              )}
            </div>
          ))}
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
