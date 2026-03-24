import Link from 'next/link'
import Image from 'next/image'
import { Lock, Shield } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade — Foguetim ERP',
  description: 'Política de Privacidade da plataforma Foguetim ERP, em conformidade com a LGPD.',
}

const sections = [
  {
    id: 'responsavel',
    title: '1. Responsável pelo Tratamento',
    content:
      'FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA, CNPJ: 33.685.241/0001-70, Fortaleza — CE — Brasil.',
    email: 'contato@foguetim.com.br',
  },
  {
    id: 'dados-coletados',
    title: '2. Dados Coletados',
    content:
      'Nome, e-mail, dados da empresa (CNPJ, razão social), tokens OAuth dos marketplaces (armazenados com criptografia), dados de uso e informações de cobrança.',
  },
  {
    id: 'finalidade',
    title: '3. Finalidade',
    content:
      'Prestação dos serviços contratados, integração com marketplaces autorizados pelo usuário, comunicações sobre a conta e melhorias da plataforma.',
  },
  {
    id: 'compartilhamento',
    title: '4. Compartilhamento',
    content:
      'Não vendemos dados a terceiros. Dados são compartilhados apenas com provedores de infraestrutura (Supabase, Vercel) sob contratos de confidencialidade, e com marketplaces conforme autorizado via OAuth.',
  },
  {
    id: 'seguranca',
    title: '5. Segurança',
    content:
      'Criptografia em trânsito (HTTPS/TLS) e em repouso. Autenticação via Supabase Auth com padrões modernos de segurança.',
  },
  {
    id: 'lgpd',
    title: '6. Direitos do Usuário — LGPD',
    content:
      'Conforme Lei nº 13.709/2018, o usuário tem direito a acessar, corrigir e solicitar exclusão de seus dados, além de revogar autorizações OAuth a qualquer momento.',
    highlight: true,
  },
  {
    id: 'retencao',
    title: '7. Retenção',
    content:
      'Dados retidos enquanto a conta estiver ativa. Após exclusão, removidos em até 30 dias.',
  },
  {
    id: 'cookies',
    title: '8. Cookies',
    content:
      'Utilizamos cookies estritamente necessários para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento para publicidade.',
  },
  {
    id: 'contato',
    title: '9. Contato para Privacidade',
    content: '',
    email: 'contato@foguetim.com.br',
  },
]

export default function PrivacidadePage() {
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
            <Lock className="w-3.5 h-3.5" />
            Documento legal
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Política de Privacidade
          </h1>
          <p className="text-sm text-slate-500">Última atualização: Março 2026</p>

          {/* LGPD Badge */}
          <div className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Em conformidade com a LGPD — Lei nº 13.709/2018</span>
          </div>
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
              <div
                key={section.id}
                id={section.id}
                className={`glass-card p-7 scroll-mt-24 ${section.highlight ? 'border-green-500/30 ring-1 ring-green-500/10' : ''}`}
              >
                <h2 className="text-base font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {section.title}
                </h2>
                {section.highlight && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold mb-3">
                    <Shield className="w-3 h-3" />
                    LGPD
                  </div>
                )}
                {section.content && (
                  <p className="text-sm text-slate-400 leading-relaxed">{section.content}</p>
                )}
                {section.email && (
                  <a href={`mailto:${section.email}`} className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors block mt-2">
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
