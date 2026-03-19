import Link from 'next/link'
import { Rocket, Home, LayoutDashboard } from 'lucide-react'

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: '#0a0d14' }}
    >
      {/* Glow backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 35% at 50% 30%, rgba(124,58,237,0.10), transparent)',
        }}
      />

      {/* Stars — purely decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        {[
          { top: '12%',  left: '8%',  size: 1.5, delay: '0s'   },
          { top: '22%',  left: '80%', size: 1,   delay: '0.4s' },
          { top: '60%',  left: '5%',  size: 1,   delay: '0.8s' },
          { top: '75%',  left: '90%', size: 1.5, delay: '0.2s' },
          { top: '40%',  left: '93%', size: 1,   delay: '1.1s' },
          { top: '85%',  left: '20%', size: 1,   delay: '0.6s' },
          { top: '15%',  left: '55%', size: 1,   delay: '1.4s' },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              opacity: 0.25,
              animation: `twinkle 2.5s ease-in-out ${s.delay} infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Rocket with float */}
        <div
          style={{ animation: 'float 3.5s ease-in-out infinite' }}
          aria-hidden
        >
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
        </div>

        {/* 404 */}
        <p
          className="text-[80px] font-black leading-none tracking-tight select-none"
          style={{
            fontFamily: 'Sora, sans-serif',
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #6d28d9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </p>

        <div className="flex flex-col gap-2">
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Parece que esse foguete se perdeu...
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            A página que você procura não existe ou foi movida.
            Sem pânico — a base está aqui embaixo.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
            }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8',
            }}
          >
            <Home className="w-4 h-4" />
            Página inicial
          </Link>
        </div>
      </div>
    </main>
  )
}
