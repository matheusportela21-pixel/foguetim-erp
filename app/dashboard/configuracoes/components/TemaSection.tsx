'use client'

import { useState } from 'react'
import { Moon, Sun, Monitor, Check } from 'lucide-react'

const THEMES = [
  {
    id: 'dark',
    label: 'Escuro',
    description: 'Tema escuro com acentos neon',
    icon: Moon,
    preview: 'bg-[#0a0d14] border-purple-500/30',
    active: true,
  },
  {
    id: 'light',
    label: 'Claro',
    description: 'Em desenvolvimento',
    icon: Sun,
    preview: 'bg-slate-100 border-slate-300',
    active: false,
  },
  {
    id: 'system',
    label: 'Sistema',
    description: 'Seguir preferencia do SO',
    icon: Monitor,
    preview: 'bg-gradient-to-r from-[#0a0d14] to-slate-100 border-slate-500/30',
    active: false,
  },
]

const ACCENTS = [
  { id: 'purple', label: 'Violeta',  color: 'bg-purple-500', ring: 'ring-purple-400' },
  { id: 'blue',   label: 'Azul',     color: 'bg-blue-500',   ring: 'ring-blue-400' },
  { id: 'cyan',   label: 'Ciano',    color: 'bg-cyan-500',   ring: 'ring-cyan-400' },
  { id: 'green',  label: 'Verde',    color: 'bg-green-500',  ring: 'ring-green-400' },
  { id: 'amber',  label: 'Dourado',  color: 'bg-amber-500',  ring: 'ring-amber-400' },
  { id: 'rose',   label: 'Rosa',     color: 'bg-rose-500',   ring: 'ring-rose-400' },
]

export default function TemaSection() {
  const [selectedTheme, setSelectedTheme] = useState('dark')
  const [selectedAccent, setSelectedAccent] = useState('purple')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Tema</h3>
        <p className="text-xs text-slate-500">Personalize a aparencia do sistema</p>
      </div>

      {/* Theme selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-3">Modo de exibicao</label>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => t.active && setSelectedTheme(t.id)}
              disabled={!t.active}
              className={`relative p-4 rounded-xl border transition-all text-left ${
                selectedTheme === t.id
                  ? 'border-purple-500/50 bg-purple-500/5 ring-1 ring-purple-500/20'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              } ${!t.active ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {selectedTheme === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`w-full h-10 rounded-lg border mb-3 ${t.preview}`} />
              <div className="flex items-center gap-2">
                <t.icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-200">{t.label}</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">{t.description}</p>
              {!t.active && (
                <span className="mt-2 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400 ring-1 ring-amber-700/40">
                  Em breve
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-3">Cor de destaque</label>
        <div className="flex gap-3 flex-wrap">
          {ACCENTS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAccent(a.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                selectedAccent === a.id
                  ? `border-white/[0.15] bg-white/[0.04] ring-1 ${a.ring}/20`
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${a.color} ${
                selectedAccent === a.id ? `ring-2 ${a.ring}/50 ring-offset-2 ring-offset-[#0a0d14]` : ''
              }`} />
              <span className="text-xs text-slate-300">{a.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-700 mt-2">Cores de destaque alternativas serao disponibilizadas em breve.</p>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
          Salvar preferencias
        </button>
      </div>
    </div>
  )
}
