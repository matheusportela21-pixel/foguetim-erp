'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/ajuda/busca?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">F</span>
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">Foguetim</span>
          </Link>
          <span className="text-gray-300 hidden sm:block">|</span>
          <Link
            href="/ajuda"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block whitespace-nowrap"
          >
            Central de Ajuda
          </Link>
          <form onSubmit={handleSearch} className="flex-1 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar artigos..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-300 transition-all"
            />
          </form>
          <div className="flex items-center gap-3 ml-auto shrink-0">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 hidden sm:block">
              Meu painel
            </Link>
            <Link
              href="/login"
              className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors font-medium"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© 2025 Foguetim ERP. Todos os direitos reservados.</span>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-gray-900">Início</Link>
            <Link href="/planos" className="hover:text-gray-900">Planos</Link>
            <Link href="/sobre" className="hover:text-gray-900">Sobre</Link>
            <Link href="/contato" className="hover:text-gray-900">Contato</Link>
            <Link href="/privacidade" className="hover:text-gray-900">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
