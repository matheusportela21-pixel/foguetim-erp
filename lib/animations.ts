'use client'

import { Variants } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

// ─── Page transitions ────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export const fadeInUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ─── Lists / Cards stagger ──────────────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

// ─── Hover effects ──────────────────────────────────────────────────────────

export const hoverScale = {
  whileHover: { scale: 1.02, transition: { duration: 0.2 } },
  whileTap:   { scale: 0.98 },
}

export const hoverGlow = {
  whileHover: { boxShadow: '0 0 20px rgba(124,58,237,0.2)', transition: { duration: 0.3 } },
}

// ─── Slide in (menus, drawers) ──────────────────────────────────────────────

export const slideIn: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.15 } },
}

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit:    { opacity: 0, x: 20, transition: { duration: 0.15 } },
}

// ─── Mega menu ──────────────────────────────────────────────────────────────

export const megaMenu: Variants = {
  hidden:  { opacity: 0, y: -8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -5, transition: { duration: 0.1 } },
}

// ─── Mobile menu ────────────────────────────────────────────────────────────

export const mobileMenu: Variants = {
  hidden:  { opacity: 0, x: '-100%' },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, x: '-100%', transition: { duration: 0.2 } },
}

// ─── Count up hook ──────────────────────────────────────────────────────────

export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  const ref = useRef(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = ref.current
    const diff = target - start
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      const current = Math.round(start + diff * eased)
      setValue(current)
      if (progress < 1) requestAnimationFrame(tick)
      else ref.current = target
    }

    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}

// ─── Drawer variants ────────────────────────────────────────────────────────

export const drawerOverlay: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
}

export const drawerContent: Variants = {
  hidden:  { x: '100%' },
  visible: { x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { x: '100%', transition: { duration: 0.2 } },
}
