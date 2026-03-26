import Link from 'next/link'
import Image from 'next/image'
import { Chrome, Download, Puzzle, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react'

export const metadata = {
  title: 'Extensao Chrome — Foguetim ERP',
  description: 'Copie anuncios de qualquer marketplace com um clique usando a extensao Chrome do Foguetim ERP. Mercado Livre, Shopee, Magalu, Amazon e mais.',
  alternates: {
    canonical: 'https://www.foguetim.com.br/extensao',
  },
  openGraph: {
    title: 'Extensao Chrome | Foguetim ERP',
    description: 'Copie anuncios de qualquer marketplace com um clique direto do navegador.',
    url: 'https://www.foguetim.com.br/extensao',
  },
}

const steps = [
  { num: '01', title: 'Instale a extensao', desc: 'Baixe o arquivo e instale no Chrome em modo desenvolvedor.' },
  { num: '02', title: 'Faca login', desc: 'Use suas credenciais do Foguetim ERP para autenticar.' },
  { num: '03', title: 'Navegue no marketplace', desc: 'Acesse qualquer anuncio no Mercado Livre, Shopee, Magalu ou outros.' },
  { num: '04', title: 'Clique em copiar', desc: 'Um botao aparece na pagina do anuncio. Clique para extrair todos os dados.' },
  { num: '05', title: 'Veja nos rascunhos', desc: 'O anuncio aparece automaticamente nos seus rascunhos no Foguetim.' },
]

const marketplaces = [
  { name: 'Mercado Livre', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { name: 'Shopee', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { name: 'Magalu', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { name: 'Amazon', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { name: 'AliExpress', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { name: 'Shein', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { name: 'Americanas', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { name: 'KaBuM', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
]

const installSteps = [
  'Baixe o arquivo .zip clicando no botao abaixo',
  'Extraia o conteudo em uma pasta no seu computador',
  'Abra o Chrome e acesse chrome://extensions',
  'Ative o "Modo do desenvolvedor" no canto superior direito',
  'Clique em "Carregar sem compactacao" e selecione a pasta extraida',
  'A extensao aparecera na barra de ferramentas do Chrome',
]

export default function ExtensaoPage() {
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
            <Link href="/cadastro" className="bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Comecar gratis</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-6">
            <Chrome className="w-3.5 h-3.5" />
            Extensao para Chrome
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Copie anuncios com{' '}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">um clique</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed mb-8">
            Navegue em qualquer marketplace, encontre um produto interessante e importe todos os dados para o Foguetim automaticamente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/downloads/foguetim-chrome-extension.zip"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Download className="w-5 h-5" />
              Baixar extensao
            </a>
            <p className="text-xs text-slate-500">Em breve na Chrome Web Store</p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-orange-400 mb-3 uppercase tracking-wider">Como funciona</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              5 passos simples
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Da instalacao ao rascunho pronto em menos de um minuto.
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.num} className="glass-card rounded-xl p-6 flex items-start gap-5">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-orange-400">{step.num}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplaces suportados */}
      <section className="relative z-10 py-20 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-orange-400 mb-3 uppercase tracking-wider">Compatibilidade</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Marketplaces suportados
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Extraia dados de produtos dos principais marketplaces do Brasil e do mundo.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {marketplaces.map((mp) => (
              <div key={mp.name} className={`rounded-xl border p-4 text-center ${mp.color}`}>
                <p className="text-sm font-semibold">{mp.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instalacao */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-orange-400 mb-3 uppercase tracking-wider">Instalacao</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Como instalar (modo desenvolvedor)
            </h2>
          </div>

          <div className="glass-card rounded-xl p-8 space-y-4">
            {installSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="/downloads/foguetim-chrome-extension.zip"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Download className="w-5 h-5" />
              Baixar extensao
            </a>
            <p className="text-xs text-slate-500 mt-3">Em breve na Chrome Web Store</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Foguetim" width={24} height={24} className="rounded-md" />
            <span className="text-sm text-slate-500">Foguetim ERP</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <Link href="/termos" className="hover:text-slate-400 transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-slate-400 transition-colors">Privacidade</Link>
            <Link href="/contato" className="hover:text-slate-400 transition-colors">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
