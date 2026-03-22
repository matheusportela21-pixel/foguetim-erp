import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: {
    default: 'Foguetim ERP — Gestão completa para vendedores de marketplace',
    template: '%s | Foguetim ERP',
  },
  description: 'Controle estoque, anúncios, pedidos e financeiro do Mercado Livre e Shopee em um só lugar. ERP gratuito para vendedores brasileiros.',
  keywords: [
    'ERP marketplace', 'gestão mercado livre', 'controle estoque shopee',
    'ERP vendedor online', 'sistema gestão ecommerce', 'ERP marketplace Brasil',
    'gestão anúncios mercado livre', 'foguetim erp', 'ERP shopee',
  ],
  authors: [{ name: 'Foguetim ERP' }],
  creator: 'Foguetim ERP',
  metadataBase: new URL('https://www.foguetim.com.br'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://www.foguetim.com.br',
    siteName: 'Foguetim ERP',
    title: 'Foguetim ERP — O ERP do vendedor de marketplace',
    description: 'Controle tudo num só lugar. Mercado Livre + Shopee. Comece grátis.',
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
