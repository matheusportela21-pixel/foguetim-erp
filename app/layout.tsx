import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: {
    default: 'Foguetim ERP — Gerencie Mercado Livre, Shopee e Magalu em um só lugar',
    template: '%s | Foguetim ERP',
  },
  description: 'ERP completo para vendedores de marketplace. Pedidos, produtos, financeiro e SAC do Mercado Livre, Shopee e Magalu unificados. 7 dias grátis.',
  keywords: [
    'ERP marketplace', 'gestão mercado livre', 'controle estoque shopee',
    'ERP vendedor online', 'sistema gestão ecommerce', 'ERP marketplace Brasil',
    'gestão anúncios mercado livre', 'foguetim erp', 'ERP shopee', 'ERP magalu',
    'gestão magalu marketplace', 'gerenciar shopee e mercado livre',
  ],
  authors: [{ name: 'Foguetim ERP' }],
  creator: 'Foguetim ERP',
  metadataBase: new URL('https://www.foguetim.com.br'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://www.foguetim.com.br',
    siteName: 'Foguetim ERP',
    title: 'Foguetim ERP — Gerencie Mercado Livre, Shopee e Magalu em um só lugar',
    description: 'ERP completo para sellers de marketplace. Pedidos, produtos, financeiro e SAC unificados. 7 dias grátis.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Foguetim ERP — ERP para vendedores de marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Foguetim ERP',
    description: 'Gestão completa para vendedores de marketplace. Mercado Livre + Shopee.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: {
    canonical: 'https://www.foguetim.com.br',
  },
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
