import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'Foguetim ERP — Seu e-commerce em órbita',
  description: 'ERP completo para sellers de marketplace. Gerencie produtos, precificação, listagens e finanças em um único painel.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <CookieBanner />
      </body>
    </html>
  )
}
