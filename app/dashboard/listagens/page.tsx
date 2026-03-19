'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { FileText, Wand2, Copy, CheckCheck, RefreshCw, ChevronDown, ChevronUp, Star, Tag, Zap } from 'lucide-react'

// ─── Types & data ──────────────────────────────────────────────────────────────

const PLATFORMS = ['Mercado Livre', 'Shopee', 'Amazon'] as const
type Platform = typeof PLATFORMS[number]

interface ListingOutput {
  titulo: string
  subtitulo: string
  descricao: string
  bullets: string[]
  tags: string[]
  palavrasChave: string
}

const platformTips: Record<Platform, string[]> = {
  'Mercado Livre': [
    'Título com até 60 caracteres • inclua marca e modelo',
    'Use variações para tamanhos/cores',
    'Fotos com fundo branco melhoram conversão',
    'Responda perguntas em até 24h para reputação',
  ],
  'Shopee': [
    'Títulos mais longos performam melhor (até 120 chars)',
    'Use hashtags nas primeiras 24h do anúncio',
    'Lives e vídeos aumentam visibilidade orgânica',
    'Participar de campanhas da plataforma aumenta vendas',
  ],
  'Amazon': [
    'Backend keywords são cruciais para ranqueamento',
    'A+ Content aumenta conversão em até 20%',
    'Bullet points devem focar em benefícios, não specs',
    'Reviews verificados impactam diretamente o Buy Box',
  ],
}

const exampleListings: Record<Platform, ListingOutput> = {
  'Mercado Livre': {
    titulo: 'Carregador 65W GaN Turbo USB-C – ChargeFast – Original NF',
    subtitulo: 'Carrega Notebook, iPhone e Android 3x mais rápido',
    descricao: `✅ CARREGAMENTO TURBO 65W GaN – A tecnologia GaN (Nitreto de Gálio) reduz o calor gerado em até 40% e entrega até 65W de potência real, compatível com MacBook, iPad, iPhone 15, Samsung Galaxy S24 e praticamente qualquer dispositivo USB-C.

⚡ 3 PORTAS SIMULTÂNEAS – 2x USB-C + 1x USB-A. Carregue seu notebook, celular e fone ao mesmo tempo sem redução de velocidade nas portas principais.

🔒 PROTEÇÃO TOTAL – Circuito de proteção contra sobrecarga, sobreaquecimento, sobrecorrente e curto-circuito. Certificações CE, FCC e RoHS.

📦 CONTEÚDO DA EMBALAGEM – 1x Carregador GaN 65W + Cabo USB-C 1m (não incluso) + Manual em Português + Nota Fiscal.

🚀 COMPATÍVEL COM: MacBook Air/Pro, Dell XPS, Lenovo ThinkPad, HP Spectre, iPhone 15/14/13, Samsung Galaxy S24/S23, iPad Pro, Steam Deck, Nintendo Switch e muito mais.`,
    bullets: [
      '65W GaN – Carregamento 3x mais rápido que carregadores convencionais',
      '3 portas simultâneas: 2x USB-C + 1x USB-A sem perda de velocidade',
      'Compatível com MacBook, iPhone 15, Samsung Galaxy, iPad e mais de 500 dispositivos',
      'Proteção múltipla: sobrecarga, sobreaquecimento, curto-circuito',
      'Design compacto 40% menor que carregadores tradicionais de mesma potência',
    ],
    tags: ['carregador 65w', 'gan turbo', 'usb-c', 'carregador macbook', 'carregador samsung', 'carregador iphone 15'],
    palavrasChave: 'carregador 65w gan usb-c turbo macbook iphone samsung galaxy ipad notebook',
  },
  'Shopee': {
    titulo: 'Carregador GaN 65W 3 Portas USB-C Turbo Fast Charge MacBook iPhone Samsung Notebook Original',
    subtitulo: 'Entrega Rápida • Frete Grátis • 12 Meses de Garantia',
    descricao: `🔥 PROMOÇÃO RELÂMPAGO – Aproveite agora!

💨 TECNOLOGIA GaN (Nitreto de Gálio)
Carregue 3x mais rápido com menos calor e mais eficiência energética!

📱 COMPATÍVEL COM TUDO:
→ iPhone 15 Pro Max / 14 / 13 / 12
→ Samsung Galaxy S24 / S23 / Note 20
→ MacBook Air M1/M2/M3
→ iPad Pro / iPad Air
→ Notebooks Dell, HP, Lenovo
→ Qualquer dispositivo USB-C

⚡ ESPECIFICAÇÕES:
• Potência máxima: 65W
• Porta 1 (USB-C1): 45W PD 3.0
• Porta 2 (USB-C2): 20W PD 3.0
• Porta 3 (USB-A): 22.5W QC 3.0

✅ GARANTIA & SUPORTE:
12 meses de garantia direta com o vendedor. Qualquer problema, entre em contato pelo chat!`,
    bullets: [
      '⚡ 65W GaN – Tecnologia avançada com menos calor e mais velocidade',
      '🔌 3 portas: carregue celular, notebook e fone ao mesmo tempo',
      '📱 Universal: iPhone, Samsung, MacBook, iPad, notebooks e +500 dispositivos',
      '🛡️ Proteção inteligente contra sobrecarga e superaquecimento',
      '🎁 Embalagem premium com garantia de 12 meses',
    ],
    tags: ['#carregador65w', '#gancharger', '#fastcharge', '#usbc', '#macbook', '#iphone15', '#samsung'],
    palavrasChave: 'carregador 65w gan usb-c fast charge turbo iphone samsung macbook notebook carregamento rápido',
  },
  'Amazon': {
    titulo: 'ChargeFast Carregador GaN 65W, 3 Portas (2x USB-C + USB-A), Compatível com MacBook Air/Pro, iPhone 15, Samsung Galaxy S24, iPad, Notebooks',
    subtitulo: 'Certificado INMETRO | Proteção Inteligente | Design Compacto',
    descricao: `O Carregador GaN 65W ChargeFast utiliza a mais recente tecnologia de Nitreto de Gálio (GaN) para entregar carregamento de alta velocidade de forma segura e eficiente.

TECNOLOGIA GAN DE PRÓXIMA GERAÇÃO
Ao contrário dos carregadores de silicone tradicionais, o GaN opera em frequências mais altas, reduzindo a resistência elétrica e o calor gerado em até 40%. Resultado: um carregador 40% menor com a mesma potência, mais durável e eficiente energeticamente.

SISTEMA DE DISTRIBUIÇÃO INTELIGENTE DE ENERGIA
O controlador de potência dinâmico detecta automaticamente o dispositivo conectado e distribui a energia ideal para cada porta, garantindo carga máxima mesmo com 3 dispositivos conectados simultaneamente.

COMPATIBILIDADE UNIVERSAL CERTIFICADA
Testado e certificado com mais de 500 dispositivos incluindo: MacBook Pro 16" (M3 Pro), MacBook Air (M1/M2), Dell XPS 15/17, Lenovo ThinkPad X1 Carbon, iPhone 15 Pro Max, Samsung Galaxy S24 Ultra, iPad Pro 12.9" (M2) e muito mais.`,
    bullets: [
      'CARREGAMENTO 65W GENUÍNO: Tecnologia GaN certificada para MacBook Pro 13", Dell XPS, HP Spectre e outros notebooks USB-C – sem limitação de velocidade',
      '3 PORTAS SIMULTÂNEAS SEM THROTTLING: 2x USB-C (45W + 20W) + 1x USB-A (22.5W QC3.0) com distribuição inteligente de energia',
      'PROTEÇÃO MULTICAMADAS: Certificações CE, FCC, RoHS – proteção contra sobrecarga (OVP), sobreaquecimento (OTP), sobrecorrente (OCP) e curto-circuito',
      'DESIGN COMPACTO: 40% menor que carregadores convencionais de 65W, com dobrador de pino retrátil para fácil transporte',
      'GARANTIA E SUPORTE: 12 meses de garantia com suporte técnico especializado em Português',
    ],
    tags: ['carregador usb-c', 'gan charger', 'carregador macbook', 'fast charge', 'carregador notebook'],
    palavrasChave: 'carregador 65w gan usb-c macbook iphone samsung fast charge notebook pd3 qc3',
  },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-lg transition-all ${copied ? 'text-neon-green' : 'text-slate-500 hover:text-neon-blue'}`}
      title="Copiar"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function Section({ title, icon: Icon, content, expandable = false }: {
  title: string; icon: React.ElementType; content: React.ReactNode; expandable?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-neon-blue/10 last:border-b-0">
      <button
        onClick={() => expandable && setOpen(!open)}
        className={`w-full flex items-center gap-2 p-4 text-left ${expandable ? 'hover:bg-white/5' : ''} transition-colors`}
      >
        <Icon className="w-3.5 h-3.5 text-neon-blue flex-shrink-0" />
        <span className="text-xs font-mono uppercase tracking-widest text-slate-500 flex-1">{title}</span>
        {expandable && (open ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />)}
      </button>
      {open && <div className="px-4 pb-4">{content}</div>}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Listagens() {
  const [platform, setPlatform] = useState<Platform>('Mercado Livre')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  // Form state
  const [nome, setNome] = useState('Carregador 65W GaN Turbo')
  const [marca, setMarca] = useState('ChargeFast')
  const [categoria, setCategoria] = useState('Eletrônicos > Carregadores')
  const [diferenciais, setDiferenciais] = useState('3 portas simultâneas, tecnologia GaN, design compacto, compatível com MacBook e iPhone')
  const [publicoAlvo, setPublicoAlvo] = useState('Profissionais, viajantes, usuários de Apple e Android')

  const listing = exampleListings[platform]

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 1800)
  }

  const charCount = listing.titulo.length
  const maxChar = platform === 'Shopee' ? 120 : platform === 'Amazon' ? 200 : 60

  return (
    <div className="min-h-screen">
      <Header title="Gerador de Listagens" subtitle="Crie anúncios otimizados para cada marketplace com IA" />

      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

          {/* Left: Form */}
          <div className="xl:col-span-2 space-y-5">
            {/* Platform selector */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-neon-blue" />Plataforma de Destino
              </h3>
              <div className="space-y-2">
                {PLATFORMS.map(p => {
                  const colors: Record<Platform, string> = {
                    'Mercado Livre': 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
                    'Shopee':        'border-orange-500/50 bg-orange-500/10 text-orange-400',
                    'Amazon':        'border-neon-blue/50 bg-neon-blue/10 text-neon-blue',
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => { setPlatform(p); setGenerated(false) }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                        platform === p ? colors[p] : 'border-white/5 text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${platform === p ? 'bg-current' : 'bg-slate-600'}`} />
                      {p}
                      {platform === p && <CheckCheck className="ml-auto w-3.5 h-3.5" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Product info */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-neon-purple" />Informações do Produto
              </h3>
              {[
                { label: 'Nome do produto', val: nome, set: setNome, placeholder: 'Ex: Carregador 65W GaN' },
                { label: 'Marca', val: marca, set: setMarca, placeholder: 'Ex: ChargeFast' },
                { label: 'Categoria', val: categoria, set: setCategoria, placeholder: 'Ex: Eletrônicos > Carregadores' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">{f.label}</label>
                  <input
                    className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Principais Diferenciais</label>
                <textarea
                  className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm resize-none"
                  rows={3}
                  value={diferenciais}
                  onChange={e => setDiferenciais(e.target.value)}
                  placeholder="Ex: bateria de longa duração, design compacto, garantia de 2 anos..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-mono uppercase tracking-wider">Público-Alvo</label>
                <input
                  className="input-cyber w-full mt-1.5 px-3 py-2.5 rounded-lg text-sm"
                  value={publicoAlvo}
                  onChange={e => setPublicoAlvo(e.target.value)}
                  placeholder="Ex: gamers, profissionais, jovens..."
                />
              </div>
            </div>

            {/* Tips */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-neon-orange" />Dicas para {platform}
              </h3>
              <ul className="space-y-2">
                {platformTips[platform].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-neon-blue mt-0.5 flex-shrink-0">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full btn-primary py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando listagem...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Gerar Listagem Otimizada
                </>
              )}
            </button>
          </div>

          {/* Right: Output */}
          <div className="xl:col-span-3">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neon-blue/10">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-neon-blue" />Listagem Gerada
                  {generated && <span className="badge badge-green">Novo</span>}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(
                      `${listing.titulo}\n\n${listing.descricao}\n\nPalavras-chave: ${listing.palavrasChave}`
                    )}
                    className="dash-btn-ghost px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" />Copiar tudo
                  </button>
                </div>
              </div>

              {/* Title */}
              <Section
                title="Título principal"
                icon={FileText}
                content={
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white font-medium leading-relaxed">{listing.titulo}</p>
                      <CopyButton text={listing.titulo} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-space-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${charCount > maxChar ? 'bg-neon-red' : charCount > maxChar * 0.8 ? 'bg-neon-orange' : 'bg-neon-green'}`}
                          style={{ width: `${Math.min((charCount / maxChar) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono ${charCount > maxChar ? 'text-neon-red' : 'text-slate-500'}`}>
                        {charCount}/{maxChar}
                      </span>
                    </div>
                  </div>
                }
              />

              {/* Subtitle */}
              <Section
                title="Subtítulo / Tagline"
                icon={Tag}
                content={
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-300">{listing.subtitulo}</p>
                    <CopyButton text={listing.subtitulo} />
                  </div>
                }
              />

              {/* Bullets */}
              <Section
                title="Bullet points (benefícios)"
                icon={Star}
                content={
                  <div className="space-y-2">
                    {listing.bullets.map((b, i) => (
                      <div key={i} className="flex items-start gap-2 group">
                        <span className="text-neon-blue text-xs font-mono mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <p className="text-sm text-slate-300 flex-1">{b}</p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={b} />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              />

              {/* Description */}
              <Section
                title="Descrição completa"
                icon={FileText}
                expandable
                content={
                  <div className="relative">
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-space-800/50 rounded-xl p-4 border border-neon-blue/10">
                      {listing.descricao}
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={listing.descricao} />
                    </div>
                  </div>
                }
              />

              {/* Tags & Keywords */}
              <Section
                title="Tags e palavras-chave"
                icon={Tag}
                content={
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-600 font-mono mb-2">TAGS</p>
                      <div className="flex flex-wrap gap-1.5">
                        {listing.tags.map(t => (
                          <span key={t} className="badge badge-purple text-[10px] cursor-pointer hover:bg-neon-purple/20 transition-colors" onClick={() => navigator.clipboard.writeText(t)}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-600 font-mono mb-2">PALAVRAS-CHAVE (backend)</p>
                      <div className="flex items-start gap-2">
                        <p className="text-xs text-slate-400 font-mono flex-1 bg-space-800/50 rounded-lg p-3 border border-neon-blue/10">{listing.palavrasChave}</p>
                        <CopyButton text={listing.palavrasChave} />
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
