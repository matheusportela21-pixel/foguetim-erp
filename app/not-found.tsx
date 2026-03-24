'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Home, LayoutDashboard, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NotFound() {
  const [imgErr, setImgErr] = useState(false)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-space-900 stars-bg relative overflow-hidden">
      {/* Glow backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 35% at 50% 30%, rgba(124,58,237,0.12), transparent)',
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Timm floating */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          {!imgErr ? (
            <Image
              src="/mascot/timm-404.png"
              alt="Timm perdido"
              width={160}
              height={160}
              className="object-contain drop-shadow-xl"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.20), rgba(79,70,229,0.12))',
                border: '1px solid rgba(124,58,237,0.30)',
                boxShadow: '0 0 48px rgba(124,58,237,0.15)',
              }}
            >
              <Rocket className="w-10 h-10 text-violet-400 -rotate-12" />
            </div>
          )}
        </motion.div>

        {/* 404 */}
        <p className="text-[80px] font-black leading-none tracking-tight select-none font-display text-gradient-violet">
          404
        </p>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-white font-display">
            Timm procurou por toda a galáxia...
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            A página que você procura não existe ou foi movida.
            Sem pânico — a base está aqui embaixo.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-primary-600 to-primary-500 shadow-glow-sm
                       hover:shadow-neon-purple transition-all active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold
                       bg-space-800 border border-space-600 text-slate-400
                       hover:text-white hover:border-space-500 transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Página inicial
          </Link>
        </div>
      </div>
    </main>
  )
}
