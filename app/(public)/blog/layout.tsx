/**
 * app/(public)/blog/layout.tsx
 * Server Component — editorial blog layout with dark premium Navbar + Footer.
 * Uses Inter (body) + Playfair Display (headings) via CSS variables.
 */
import Link from 'next/link'
import { Inter, Playfair_Display } from 'next/font/google'
import { Search } from 'lucide-react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear()

  return (
    <div className={`${inter.variable} ${playfair.variable} font-sans min-h-screen bg-[#0A0718] stars-bg flex flex-col`}>
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0A0718]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">F</span>
            </div>
            <span className="font-bold text-white hidden sm:block" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim</span>
          </Link>

          <span className="text-white/20 hidden sm:block select-none">|</span>

          <Link
            href="/blog"
            className="text-sm font-semibold text-violet-400 hover:text-violet-300 hidden sm:block whitespace-nowrap transition-colors"
          >
            Blog
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search — links to search page (Server Component safe) */}
          <Link
            href="/blog/busca"
            aria-label="Buscar no blog"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:block">Buscar...</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/planos"
              className="text-sm text-slate-400 hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Planos
            </Link>
            <Link
              href="/sobre"
              className="text-sm text-slate-400 hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Sobre
            </Link>
          </nav>

          <Link
            href="https://app.foguetim.com.br/login"
            className="text-sm text-slate-300 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition-colors font-medium shrink-0"
          >
            Entrar
          </Link>
          <Link
            href="https://app.foguetim.com.br/cadastro"
            className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-colors font-medium shrink-0"
          >
            Cadastrar
          </Link>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#060512] border-t border-white/5 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand column */}
            <div>
              <Link href="/" className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-black">F</span>
                </div>
                <span className="font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Foguetim</span>
              </Link>
              <p className="text-sm text-slate-500 leading-relaxed">
                Blog do Foguetim — Conteúdo para vendedores online. Estratégias, dicas e novidades do e-commerce brasileiro.
              </p>
            </div>

            {/* Links úteis */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Links úteis</h3>
              <ul className="space-y-2.5">
                {[
                  { label: 'Blog', href: '/blog' },
                  { label: 'Central de Ajuda', href: '/ajuda' },
                  { label: 'Planos', href: '/planos' },
                  { label: 'Changelog', href: '/changelog' },
                ].map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-400 hover:text-violet-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sobre */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Sobre</h3>
              <ul className="space-y-2.5">
                {[
                  { label: 'Sobre nós', href: '/sobre' },
                  { label: 'Contato', href: '/contato' },
                  { label: 'Privacidade', href: '/privacidade' },
                ].map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-400 hover:text-violet-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
            <span>© {year} Foguetim ERP. Todos os direitos reservados.</span>
            <a
              href="https://www.foguetim.com.br"
              className="hover:text-violet-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Leia mais em foguetim.com.br
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
