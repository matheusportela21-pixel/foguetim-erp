'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { HelpCircle, ChevronDown, MessageCircle, Mail, Book, Rocket, Search, Ticket, X, Loader2, History, BookOpen, ExternalLink, Eye, TrendingUp } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────────────── */

interface HelpArticle {
  id: string
  title: string
  slug: string
  summary: string | null
  tags: string[]
  views_count: number
  helpful_count: number
  updated_at: string
  help_categories: {
    name: string
    slug: string
    color: string
    icon: string | null
  } | null
}

type TicketCategory = 'bug' | 'feature_request' | 'billing' | 'integration' | 'account' | 'performance' | 'other'

const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'bug',             label: 'Bug / Erro'          },
  { value: 'feature_request', label: 'Sugestao'            },
  { value: 'billing',         label: 'Cobranca / Plano'    },
  { value: 'integration',     label: 'Integracao (ML/etc)' },
  { value: 'account',         label: 'Minha conta'         },
  { value: 'performance',     label: 'Performance'         },
  { value: 'other',           label: 'Outro'               },
]

/* ── Color helpers (dark theme) ────────────────────────────────────────── */

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400'  },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400'   },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
  green:   { bg: 'bg-green-500/10',   text: 'text-green-400'   },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400'     },
  purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-400'  },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-400'   },
}

function getCatColor(color?: string) {
  return CATEGORY_COLORS[color ?? 'slate'] ?? CATEGORY_COLORS.slate
}

export default function AjudaPage() {
  const [open, setOpen]     = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // DB-driven articles
  const [articles, setArticles]     = useState<HelpArticle[]>([])
  const [popular, setPopular]       = useState<HelpArticle[]>([])
  const [loading, setLoading]       = useState(true)

  // Ticket modal
  const [showTicket, setShowTicket]   = useState(false)
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketDesc, setTicketDesc]   = useState('')
  const [ticketCat, setTicketCat]     = useState<TicketCategory>('other')
  const [sending, setSending]         = useState(false)
  const [ticketMsg, setTicketMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  // Fetch articles from DB
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [featuredRes, popularRes] = await Promise.all([
          fetch('/api/help/articles?featured=true&limit=20'),
          fetch('/api/help/articles?popular=true&limit=6'),
        ])
        if (featuredRes.ok) {
          const data = await featuredRes.json()
          setArticles(data)
        }
        if (popularRes.ok) {
          const data = await popularRes.json()
          setPopular(data)
        }
      } catch {
        // silently fail — will show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSendTicket() {
    if (!ticketTitle.trim() || !ticketDesc.trim()) return
    setSending(true)
    setTicketMsg(null)
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       ticketTitle.trim(),
          description: ticketDesc.trim(),
          category:    ticketCat,
        }),
      })
      if (res.ok) {
        setTicketMsg({ ok: true, text: 'Ticket aberto! Nossa equipe entrara em contato em breve.' })
        setTicketTitle(''); setTicketDesc(''); setTicketCat('other')
        setTimeout(() => { setShowTicket(false); setTicketMsg(null) }, 2500)
      } else {
        const d = await res.json() as { error?: string }
        setTicketMsg({ ok: false, text: `Erro: ${d.error ?? 'tente novamente'}` })
      }
    } catch {
      setTicketMsg({ ok: false, text: 'Erro de conexao. Tente novamente.' })
    } finally {
      setSending(false)
    }
  }

  // Filter articles by search
  const filtered = articles.filter(a =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.summary ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.tags ?? []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <PageHeader title="Central de Ajuda" description="Artigos, FAQ e suporte" />

      <div className="p-4 md:p-6 space-y-8">

        {/* Link para a Central de Ajuda publica */}
        <Link
          href="/ajuda"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Central de Ajuda</p>
            <p className="text-xs text-slate-500 mt-0.5">Acesse guias completos, tutoriais e artigos sobre todos os modulos do Foguetim</p>
          </div>
          <ExternalLink className="w-4 h-4 text-violet-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Search */}
        <div className="dash-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Como podemos ajudar?</h2>
          <p className="text-sm text-slate-500 mb-5">Pesquise nos artigos ou entre em contato com o suporte.</p>
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar artigos..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-dark-700 border border-white/[0.08] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600/40" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Articles (FAQ replacement) */}
          <div className="lg:col-span-2 space-y-2">
            <p className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              {search ? 'Resultados da busca' : 'Artigos em destaque'}
              {search && <span className="text-slate-600 font-normal ml-2">-- {filtered.length} resultado(s)</span>}
            </p>

            {loading ? (
              <div className="dash-card p-8 rounded-2xl text-center">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Carregando artigos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="dash-card p-8 rounded-2xl text-center">
                <p className="text-sm text-slate-600">
                  {search ? `Nenhum artigo encontrado para "${search}".` : 'Nenhum artigo em destaque ainda.'}
                </p>
              </div>
            ) : filtered.map((article) => {
              const catColor = getCatColor(article.help_categories?.color)
              return (
                <div key={article.id} className="dash-card rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => setOpen(open === article.id ? null : article.id)}
                  >
                    <div className="flex items-center gap-3 pr-4 min-w-0">
                      <span className="text-sm font-semibold text-white truncate">{article.title}</span>
                      {article.help_categories && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${catColor.bg} ${catColor.text}`}>
                          {article.help_categories.name}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open === article.id ? 'rotate-180' : ''}`} />
                  </button>
                  {open === article.id && (
                    <div className="px-5 pb-4 pt-0 space-y-2">
                      {article.summary && (
                        <p className="text-sm text-slate-400 leading-relaxed">{article.summary}</p>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {article.views_count} views
                        </span>
                        {article.help_categories && (
                          <Link
                            href={`/ajuda/${article.help_categories.slug}/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                          >
                            Ler artigo completo <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Artigos Populares */}
            <div className="dash-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <p className="font-bold text-white text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Artigos Populares</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                </div>
              ) : popular.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-2">Nenhum artigo ainda.</p>
              ) : (
                <div className="space-y-2">
                  {popular.map((article, i) => {
                    const catColor = getCatColor(article.help_categories?.color)
                    return (
                      <Link
                        key={article.id}
                        href={article.help_categories ? `/ajuda/${article.help_categories.slug}/${article.slug}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${catColor.bg}`}>
                          <span className={`text-xs font-bold ${catColor.text}`}>{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate group-hover:text-violet-300 transition-colors">{article.title}</p>
                          <p className="text-[10px] text-slate-600">{article.views_count} views</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="dash-card rounded-2xl p-5">
              <p className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Fale com o Suporte</p>
              <div className="space-y-2">
                {[
                  { icon: MessageCircle, label: 'Chat ao vivo', sub: 'Seg-Sex 9h-18h', available: true,  cls: 'text-green-400' },
                  { icon: Mail,          label: 'E-mail',       sub: 'contato@foguetim.com.br', available: true,  cls: 'text-purple-400' },
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
                <button
                  onClick={() => setShowTicket(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <Ticket className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Abrir Ticket</p>
                    <p className="text-[10px] text-slate-500">Resposta em ate 24h</p>
                  </div>
                </button>
                <Link href="/dashboard/ajuda/feedbacks"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition-all">
                  <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center shrink-0">
                    <History className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Meus Feedbacks</p>
                    <p className="text-[10px] text-slate-600">Ver tickets enviados</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket modal */}
      {showTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md bg-dark-900 border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Abrir Ticket de Suporte</h3>
              </div>
              <button onClick={() => { setShowTicket(false); setTicketMsg(null) }}
                className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Assunto *</label>
                <input
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  placeholder="Ex: Erro ao conectar Mercado Livre"
                  className="w-full px-3 py-2 text-sm bg-dark-700 border border-white/[0.08] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/40"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Categoria</label>
                <select
                  value={ticketCat}
                  onChange={e => setTicketCat(e.target.value as TicketCategory)}
                  className="w-full px-3 py-2 text-sm bg-dark-700 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600/40"
                >
                  {TICKET_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Descricao *</label>
                <textarea
                  value={ticketDesc}
                  onChange={e => setTicketDesc(e.target.value)}
                  rows={4}
                  placeholder="Descreva o problema com o maximo de detalhes possivel..."
                  className="w-full px-3 py-2 text-sm bg-dark-700 border border-white/[0.08] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-600/40 resize-none"
                />
              </div>
            </div>

            {ticketMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${ticketMsg.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {ticketMsg.text}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setShowTicket(false); setTicketMsg(null) }}
                className="flex-1 px-4 py-2 text-sm text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] transition-all">
                Cancelar
              </button>
              <button
                onClick={handleSendTicket}
                disabled={!ticketTitle.trim() || !ticketDesc.trim() || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                {sending ? 'Enviando...' : 'Enviar Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
