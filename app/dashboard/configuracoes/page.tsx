'use client'

import { useState } from 'react'
import {
  Building2, User, Printer, Bell, ShieldCheck, CreditCard, AlertTriangle,
} from 'lucide-react'
import Header from '@/components/Header'
import EmpresaSection     from './components/EmpresaSection'
import ContaSection       from './components/ContaSection'
import ImpressaoSection   from './components/ImpressaoSection'
import NotifSection       from './components/NotifSection'
import SegurancaSection   from './components/SegurancaSection'
import PlanoSection       from './components/PlanoSection'
import DangerSection      from './components/DangerSection'

/* ── Sidebar menu definition ────────────────────────────────────────────────── */
type SectionId =
  | 'empresa'
  | 'conta'
  | 'impressao'
  | 'notificacoes'
  | 'seguranca'
  | 'plano'
  | 'perigo'

interface MenuItem {
  id:      SectionId
  icon:    React.ElementType
  label:   string
  badge?:  string
  danger?: boolean
}

const MENU: MenuItem[] = [
  { id: 'empresa',       icon: Building2,   label: 'Empresa'             },
  { id: 'conta',         icon: User,        label: 'Minha Conta'         },
  { id: 'impressao',     icon: Printer,     label: 'Impressão', badge: 'Em breve' },
  { id: 'notificacoes',  icon: Bell,        label: 'Notificações'        },
  { id: 'seguranca',     icon: ShieldCheck, label: 'Segurança'           },
  { id: 'plano',         icon: CreditCard,  label: 'Plano e Assinatura'  },
  { id: 'perigo',        icon: AlertTriangle, label: 'Zona de Perigo', danger: true },
]

/* ── Section renderer ───────────────────────────────────────────────────────── */
function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case 'empresa':      return <EmpresaSection />
    case 'conta':        return <ContaSection />
    case 'impressao':    return <ImpressaoSection />
    case 'notificacoes': return <NotifSection />
    case 'seguranca':    return <SegurancaSection />
    case 'plano':        return <PlanoSection />
    case 'perigo':       return <DangerSection />
  }
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function ConfigPage() {
  const [active, setActive] = useState<SectionId>('empresa')

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie sua empresa, conta e preferências" />

      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-5 max-w-6xl mx-auto">

          {/* ── Sidebar ── */}
          <aside className="lg:w-56 shrink-0">
            <nav className="dash-card rounded-2xl p-2 lg:sticky lg:top-24">
              {MENU.map(item => {
                const isActive = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      isActive
                        ? item.danger
                          ? 'bg-red-900/20 text-red-300'
                          : 'bg-purple-600/15 text-purple-300'
                        : item.danger
                        ? 'text-red-500/70 hover:text-red-400 hover:bg-red-900/10'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? item.danger ? 'text-red-400' : 'text-purple-400'
                        : item.danger ? 'text-red-600' : 'text-slate-600'
                    }`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* ── Content ── */}
          <main className="flex-1 min-w-0">
            <div className="dash-card rounded-2xl p-6">
              <SectionContent id={active} />
            </div>
          </main>

        </div>
      </div>
    </div>
  )
}
