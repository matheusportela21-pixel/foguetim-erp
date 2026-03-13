'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type DashTheme = 'dark' | 'light'
export type AccentColor = 'purple' | 'cyan' | 'blue' | 'orange' | 'green'

interface ThemeCtxType {
  theme: DashTheme
  accent: AccentColor
  setTheme: (t: DashTheme) => void
  setAccent: (a: AccentColor) => void
}

const ThemeCtx = createContext<ThemeCtxType>({
  theme: 'dark', accent: 'purple',
  setTheme: () => {}, setAccent: () => {},
})

const VALID_ACCENTS: AccentColor[] = ['purple', 'cyan', 'blue', 'orange', 'green']

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]   = useState<DashTheme>('dark')
  const [accent, setAccentState] = useState<AccentColor>('purple')
  const [mounted, setMounted]    = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = localStorage.getItem('fgt-theme') as DashTheme | null
    const a = localStorage.getItem('fgt-accent') as AccentColor | null
    if (t === 'dark' || t === 'light') setThemeState(t)
    if (a && VALID_ACCENTS.includes(a)) setAccentState(a)
  }, [])

  function setTheme(t: DashTheme) {
    setThemeState(t)
    localStorage.setItem('fgt-theme', t)
  }

  function setAccent(a: AccentColor) {
    setAccentState(a)
    localStorage.setItem('fgt-accent', a)
  }

  const appliedTheme  = mounted ? theme  : 'dark'
  const appliedAccent = mounted ? accent : 'purple'

  return (
    <ThemeCtx.Provider value={{ theme, accent, setTheme, setAccent }}>
      <div className={`dash-root theme-${appliedTheme} accent-${appliedAccent}`}>
        {children}
      </div>
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
