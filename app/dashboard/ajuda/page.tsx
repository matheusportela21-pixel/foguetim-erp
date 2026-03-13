'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { HelpCircle, ChevronDown, MessageCircle, Mail, Book, Video, Rocket, Search } from 'lucide-react'

const faqs = [
  {
    q: 'Como conectar minha conta do Mercado Livre?',
    a: 'Acesse Integrações > Marketplaces e clique em "Conectar" ao lado do Mercado Livre. Você será redirecionado para autorizar o acesso. O processo leva menos de 1 minuto.',
  },
  {
    q: 'Como a precificação é calculada?',
    a: 'Acesse o módulo Precificação, informe o custo do produto e o Foguetim calcula automaticamente comissão, frete, imposto e margem desejada para cada marketplace, sugerindo o preço ideal.',
  },
  {
    q: 'Posso importar meu catálogo em massa?',
    a: 'A importação em massa via planilha CSV está em desenvolvimento (Q2 2026). Por enquanto, você pode cadastrar produtos individualmente no módulo Produtos.',
  },
  {
    q: 'Qual é a diferença entre os planos?',
    a: 'O plano Explorador é gratuito (até 100 produtos), Comandante (R$49,90/mês) suporta até 5.000 produtos e 3 canais, e Almirante (R$99,90/mês) é ilimitado com acesso à API e IA.',
  },
  {
    q: 'Como funciona a geração de listagens?',
    a: 'No módulo Listagens, informe as características do seu produto e o Foguetim gera automaticamente título otimizado, descrição, bullet points e tags para cada marketplace com base em boas práticas de SEO.',
  },
  {
    q: 'Os dados são seguros?',
    a: 'Sim. Todos os dados são criptografados em trânsito (TLS 1.3) e em repouso (AES-256). Realizamos backups automáticos diários e seguimos as diretrizes da LGPD.',
  },
  {
    q: 'Como cancelar minha assinatura?',
    a: 'Você pode cancelar a qualquer momento em Configurações > Plano > Ver histórico de faturas. O acesso continua até o fim do período pago, sem multas ou cobranças adicionais.',
  },
  {
    q: 'O Foguetim emite Nota Fiscal?',
    a: 'A integração com SEFAZ para emissão de NF-e está em desenvolvimento com previsão para Q2 2026. Por enquanto, você pode usar o Bling ou Tiny como integração externa (em breve).',
  },
]

const tutorials = [
  { icon: Rocket,  title: 'Primeiros Passos',        dur: '3 min',  done: true  },
  { icon: Book,    title: 'Configurando Produtos',   dur: '5 min',  done: true  },
  { icon: Video,   title: 'Conectando Marketplaces', dur: '4 min',  done: false },
  { icon: Video,   title: 'Usando a Precificação',   dur: '6 min',  done: false },
  { icon: Video,   title: 'Gerando Listagens',       dur: '5 min',  done: false },
]

export default function AjudaPage() {
  const [open, setOpen]     = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filtered = faqs.filter(f =>
    !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <Header title="Central de Ajuda" subtitle="Tutoriais, FAQ e suporte" />

      <div className="p-6 space-y-8">
        {/* Search */}
        <div className="dash-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Como podemos ajudar?</h2>
          <p className="text-sm text-slate-500 mb-5">Pesquise nas perguntas frequentes ou entre em contato com o suporte.</p>
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar dúvidas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-dark-700 border border-white/[0.08] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAQ */}
          <div className="lg:col-span-2 space-y-2">
            <p className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Perguntas Frequentes
              {search && <span className="text-slate-600 font-normal ml-2">— {filtered.length} resultado(s)</span>}
            </p>
            {filtered.length === 0 ? (
              <div className="dash-card p-8 rounded-2xl text-center">
                <p className="text-sm text-slate-600">Nenhuma pergunta encontrada para "{search}".</p>
              </div>
            ) : filtered.map((faq, i) => (
              <div key={i} className="dash-card rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && (
                  <div className="px-5 pb-4 pt-0">
                    <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Tutorials */}
            <div className="dash-card rounded-2xl p-5">
              <p className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Tutoriais</p>
              <div className="space-y-2">
                {tutorials.map((t, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${t.done ? 'opacity-60' : 'hover:bg-white/[0.04] cursor-pointer'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.done ? 'bg-green-500/10' : 'bg-dark-700'}`}>
                      <t.icon className={`w-3.5 h-3.5 ${t.done ? 'text-green-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-slate-600">{t.dur}</p>
                    </div>
                    {t.done && (
                      <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">Feito</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="dash-card rounded-2xl p-5">
              <p className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Fale com o Suporte</p>
              <div className="space-y-2">
                {[
                  { icon: MessageCircle, label: 'Chat ao vivo', sub: 'Seg–Sex · 9h–18h', available: true,  cls: 'text-green-400' },
                  { icon: Mail,          label: 'E-mail',       sub: 'suporte@foguetim.com.br', available: true,  cls: 'text-purple-400' },
                ].map(c => (
                  <button key={c.label} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${c.available ? 'border-white/[0.08] hover:bg-white/[0.04]' : 'border-white/[0.04] opacity-50 cursor-default'}`}>
                    <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                      <c.icon className={`w-4 h-4 ${c.cls}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-white">{c.label}</p>
                      <p className="text-[10px] text-slate-600">{c.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="dash-card rounded-xl p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-xs font-semibold text-white">Todos os sistemas operacionais</p>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 ml-4">Uptime 99.98% · Última verificação: agora</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
