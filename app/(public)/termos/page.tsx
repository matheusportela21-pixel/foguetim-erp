import Link from 'next/link'
import Image from 'next/image'
import { FileText } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso — Foguetim ERP',
  description: 'Termos de Uso da plataforma Foguetim ERP.',
}

const sections = [
  {
    id: 'plataforma',
    title: '1. Sobre a Plataforma',
    content:
      'O Foguetim é uma plataforma SaaS de gestão de marketplaces desenvolvida e operada pela FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA, CNPJ: 33.685.241/0001-70, com sede em Fortaleza — CE — Brasil.',
  },
  {
    id: 'aceitacao',
    title: '2. Aceitação dos Termos',
    content:
      'Ao criar uma conta e utilizar os serviços do Foguetim, o usuário concorda integralmente com estes Termos de Uso e com nossa Política de Privacidade.',
  },
  {
    id: 'servicos',
    title: '3. Descrição dos Serviços',
    content:
      'O Foguetim oferece ferramentas de gestão de e-commerce, incluindo integração com marketplaces via APIs oficiais, controle de produtos, pedidos, estoque, métricas e relatórios. O acesso aos marketplaces é feito exclusivamente mediante autorização OAuth concedida pelo próprio usuário.',
  },
  {
    id: 'uso',
    title: '4. Uso Aceitável',
    content:
      'O usuário compromete-se a utilizar a plataforma apenas para fins legítimos de gestão do seu negócio. É vedado o uso para atividades fraudulentas ou violação das políticas dos marketplaces integrados.',
  },
  {
    id: 'dados',
    title: '5. Propriedade dos Dados',
    content:
      'Os dados das contas dos marketplaces pertencem ao usuário. O Foguetim acessa esses dados exclusivamente mediante autorização OAuth, podendo esta ser revogada a qualquer momento pelo usuário.',
  },
  {
    id: 'planos',
    title: '6. Planos e Pagamentos',
    content:
      'Os serviços são oferecidos nos planos Explorador (gratuito), Comandante (R$49,90/mês) e Enterprise. Detalhes na página de Planos.',
  },
  {
    id: 'responsabilidade',
    title: '7. Limitação de Responsabilidade',
    content:
      'O Foguetim não se responsabiliza por indisponibilidades das APIs dos marketplaces integrados ou alterações em suas políticas.',
  },
  {
    id: 'modificacoes',
    title: '8. Modificações',
    content:
      'Estes termos podem ser alterados a qualquer momento mediante notificação por e-mail.',
  },
  {
    id: 'lei',
    title: '9. Lei Aplicável',
    content:
      'Estes termos são regidos pelas leis brasileiras, com foro na comarca de Fortaleza — CE.',
  },
  {
    id: 'contato',
    title: '10. Contato',
    content: '',
    email: 'contato@foguetim.com.br',
  },
]

export default function TermosPage() {
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
            <Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors px-4 py-2">Entrar</Link>
            <Link href="/cadastro" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Começar grátis</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-10 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-6">
            <FileText className="w-3.5 h-3.5" />
            Documento legal
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Termos de Uso
          </h1>
          <p className="text-sm text-slate-500">Última atualização: Março 2026</p>
        </div>
      </section>

      {/* Content with sidebar */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-5xl mx-auto flex gap-8">
          {/* Table of contents sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 glass-card p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Índice</p>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-slate-400 hover:text-white transition-colors py-1 truncate"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-6">
            {sections.map((section) => (
              <div key={section.id} id={section.id} className="glass-card p-7 scroll-mt-24">
                <h2 className="text-base font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {section.title}
                </h2>
                {section.content && (
                  <p className="text-sm text-slate-400 leading-relaxed">{section.content}</p>
                )}
                {section.email && (
                  <a href={`mailto:${section.email}`} className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                    {section.email}
                  </a>
                )}
              </div>
            ))}
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
