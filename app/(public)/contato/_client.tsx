'use client'

import Link from 'next/link'
import { Rocket, Mail, MapPin, MessageSquare } from 'lucide-react'
import { useState } from 'react'

export default function ContatoPage() {
  const [form, setForm] = useState({ nome: '', email: '', assunto: '', mensagem: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

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
            <Link href="/contato" className="text-navy-900 font-semibold transition-colors">Contato</Link>
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-6 shadow-sm">
            <MessageSquare className="w-3.5 h-3.5" />
            Fale conosco
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-navy-900 leading-tight mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
            Entre em contato
          </h1>
          <p className="text-lg text-slate-500">Estamos aqui para ajudar</p>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8">

          {/* Info sidebar */}
          <div className="md:col-span-2 space-y-5">
            <div className="landing-card p-6 space-y-5">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Informações de contato</h2>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">E-mail</p>
                  <a href="mailto:contato@foguetim.com.br" className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                    contato@foguetim.com.br
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Localização</p>
                  <p className="text-sm font-semibold text-navy-900">Fortaleza — CE — Brasil</p>
                </div>
              </div>
            </div>

            {/* API evaluators note */}
            <div className="landing-card p-6 border-l-4 border-purple-400">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">For API Evaluators</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Foguetim integrates with Mercado Livre via official OAuth 2.0 API.
                For technical inquiries about API integration:{' '}
                <a href="mailto:contato@foguetim.com.br" className="text-purple-600 font-semibold hover:underline">
                  contato@foguetim.com.br
                </a>
              </p>
            </div>
          </div>

          {/* Contact form (visual only) */}
          <div className="md:col-span-3">
            <div className="landing-card p-8">
              <h2 className="text-base font-bold text-navy-900 mb-6" style={{ fontFamily: 'Sora, sans-serif' }}>
                Envie uma mensagem
              </h2>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      Nome
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      placeholder="Seu nome"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-navy-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                      E-mail
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-navy-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Assunto
                  </label>
                  <select
                    name="assunto"
                    value={form.assunto}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                  >
                    <option value="">Selecione um assunto</option>
                    <option value="suporte">Suporte técnico</option>
                    <option value="comercial">Comercial / Planos</option>
                    <option value="parceria">Parceria / Integrações</option>
                    <option value="privacidade">Privacidade de dados</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Mensagem
                  </label>
                  <textarea
                    name="mensagem"
                    value={form.mensagem}
                    onChange={handleChange}
                    placeholder="Como podemos ajudar?"
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-navy-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all resize-none"
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary w-full py-3 rounded-xl text-sm"
                  onClick={() => {
                    window.location.href = `mailto:contato@foguetim.com.br?subject=${encodeURIComponent(form.assunto || 'Contato via site')}&body=${encodeURIComponent(`Nome: ${form.nome}\nE-mail: ${form.email}\n\n${form.mensagem}`)}`
                  }}
                >
                  Enviar mensagem
                </button>

                <p className="text-xs text-slate-400 text-center">
                  Respondemos em até 1 dia útil.
                </p>
              </div>
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
