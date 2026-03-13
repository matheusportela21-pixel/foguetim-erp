'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { useTheme, type AccentColor, type DashTheme } from '@/context/ThemeContext'
import { Building2, User, Bell, Palette, CreditCard, Check } from 'lucide-react'

const tabs = [
  { id: 'empresa',   icon: Building2, label: 'Empresa'       },
  { id: 'perfil',    icon: User,      label: 'Perfil'         },
  { id: 'plano',     icon: CreditCard,label: 'Plano'          },
  { id: 'notif',     icon: Bell,      label: 'Notificações'   },
  { id: 'aparencia', icon: Palette,   label: 'Aparência'      },
]

const accentOptions: { id: AccentColor; label: string; cls: string }[] = [
  { id: 'purple', label: 'Roxo',     cls: 'bg-purple-500' },
  { id: 'cyan',   label: 'Ciano',    cls: 'bg-cyan-500'   },
  { id: 'blue',   label: 'Azul',     cls: 'bg-blue-500'   },
  { id: 'orange', label: 'Laranja',  cls: 'bg-orange-500' },
  { id: 'green',  label: 'Verde',    cls: 'bg-green-500'  },
]

export default function ConfigPage() {
  const [tab, setTab]     = useState('empresa')
  const [saved, setSaved] = useState(false)
  const { theme, accent, setTheme, setAccent } = useTheme()

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <Header title="Configurações" subtitle="Personalize sua conta e empresa" />

      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <div className="lg:w-56 shrink-0">
            <div className="dash-card rounded-2xl p-2">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    tab === t.id ? 'bg-purple-600/15 text-purple-300' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}>
                  <t.icon className={`w-4 h-4 ${tab === t.id ? 'text-purple-400' : 'text-slate-600'}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {tab === 'empresa' && (
              <div className="dash-card rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Dados da Empresa</h3>
                  <p className="text-xs text-slate-600">Informações do seu negócio</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Nome fantasia',  val: 'SkinCenter Cosméticos',         key: 'nome' },
                    { label: 'Razão social',   val: 'SKINCENTER COMERCIO LTDA',      key: 'razao' },
                    { label: 'CNPJ',           val: '47.382.910/0001-54',            key: 'cnpj' },
                    { label: 'E-mail',         val: 'contato@skincenter.ce.com.br',  key: 'email' },
                    { label: 'Telefone',       val: '(85) 9 9876-5432',              key: 'tel' },
                    { label: 'Cidade',         val: 'Fortaleza, CE',                 key: 'cidade' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{f.label}</label>
                      <input type="text" defaultValue={f.val}
                        className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40 transition-all" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Regime tributário</label>
                    <select className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                      <option>Simples Nacional</option>
                      <option>Lucro Presumido</option>
                      <option>Lucro Real</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Setor principal</label>
                    <select className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40">
                      <option>Cosméticos / Beleza</option>
                      <option>Eletrônicos</option>
                      <option>Moda</option>
                      <option>Casa & Decoração</option>
                    </select>
                  </div>
                </div>
                <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">
                  {saved ? <><Check className="w-4 h-4" /> Salvo!</> : 'Salvar alterações'}
                </button>
              </div>
            )}

            {tab === 'perfil' && (
              <div className="dash-card rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Meu Perfil</h3>
                  <p className="text-xs text-slate-600">Informações da sua conta de usuário</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-900 to-purple-700 flex items-center justify-center text-xl font-bold text-white">MP</div>
                  <div>
                    <p className="font-bold text-white">Matheus Portela</p>
                    <p className="text-xs text-slate-500">matheus.portela21@gmail.com</p>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full mt-1 inline-block">Diretor · Admin</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Nome completo', val: 'Matheus Portela' },
                    { label: 'E-mail',        val: 'matheus.portela21@gmail.com' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{f.label}</label>
                      <input type="text" defaultValue={f.val}
                        className="w-full px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40 transition-all" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nova senha (deixe em branco para não alterar)</label>
                  <input type="password" placeholder="••••••••"
                    className="w-full max-w-sm px-3 py-2.5 rounded-lg text-sm bg-dark-700 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-600/40 transition-all" />
                </div>
                <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">
                  {saved ? <><Check className="w-4 h-4" /> Salvo!</> : 'Salvar alterações'}
                </button>
              </div>
            )}

            {tab === 'plano' && (
              <div className="dash-card rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="font-bold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Plano Atual</h3>
                  <p className="text-xs text-slate-600">Gerencie sua assinatura</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/20 to-cyan-600/10 rounded-2xl p-5 border border-purple-500/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Plano atual</p>
                      <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Comandante</p>
                      <p className="text-purple-400 font-bold mt-1">R$49,90<span className="text-slate-500 text-xs font-normal">/mês</span></p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 ring-1 ring-green-400/20">Ativo</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <p className="text-xs text-slate-500 mb-1">Uso de produtos</p>
                    <div className="h-2 bg-dark-600 rounded-full overflow-hidden mb-1">
                      <div className="h-full w-[57%] rounded-full bg-gradient-to-r from-purple-600 to-cyan-500" />
                    </div>
                    <p className="text-xs text-slate-600">2.847 / 5.000 produtos</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">Fazer upgrade</button>
                  <button className="px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-white/[0.08] hover:bg-white/[0.04] transition-all">Ver histórico de faturas</button>
                </div>
              </div>
            )}

            {tab === 'notif' && (
              <div className="dash-card rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="font-bold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Notificações</h3>
                  <p className="text-xs text-slate-600">Configure como deseja ser notificado</p>
                </div>
                {[
                  { label: 'Novos pedidos',          sub: 'Notificar ao receber pedido novo', on: true  },
                  { label: 'Estoque baixo',           sub: 'Alertar quando estoque for crítico', on: true  },
                  { label: 'Relatório semanal',       sub: 'Receber resumo toda segunda-feira', on: true  },
                  { label: 'Atualizações do sistema', sub: 'Novidades e melhorias do Foguetim', on: false },
                  { label: 'Marketing',               sub: 'Dicas e conteúdos sobre e-commerce', on: false },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-white">{n.label}</p>
                      <p className="text-xs text-slate-600">{n.sub}</p>
                    </div>
                    <button className={`w-10 h-[22px] rounded-full transition-all relative ${n.on ? 'bg-purple-600' : 'bg-dark-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${n.on ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'aparencia' && (
              <div className="dash-card rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Aparência</h3>
                  <p className="text-xs text-slate-600">Personalize o visual do painel</p>
                </div>

                {/* Theme toggle */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-3">Tema do painel</p>
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    {([
                      { id: 'dark'  as DashTheme, label: 'Escuro', preview: 'bg-dark-900', inner: 'bg-dark-700' },
                      { id: 'light' as DashTheme, label: 'Claro',  preview: 'bg-slate-100', inner: 'bg-white border border-slate-200' },
                    ] as const).map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === t.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/[0.08] hover:border-white/[0.15]'
                        }`}>
                        <div className={`w-full h-8 rounded-lg ${t.preview} relative overflow-hidden`}>
                          <div className={`absolute left-2 top-2 h-2 w-8 rounded-sm ${t.inner}`} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {theme === t.id && <Check className="w-3 h-3 text-purple-400" />}
                          <span className={`text-xs font-semibold ${theme === t.id ? 'text-purple-300' : 'text-slate-500'}`}>{t.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent color */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-3">Cor de destaque</p>
                  <div className="flex gap-3 flex-wrap">
                    {accentOptions.map(c => (
                      <button key={c.id} onClick={() => setAccent(c.id)}
                        title={c.label}
                        className={`w-9 h-9 rounded-full ${c.cls} flex items-center justify-center transition-all ${
                          accent === c.id ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-dark-800 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'
                        }`}>
                        {accent === c.id && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Cor selecionada: <span className="text-slate-400 font-medium capitalize">{accent}</span></p>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-xs text-slate-600">As preferências de aparência são salvas automaticamente no navegador.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
