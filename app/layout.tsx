import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: {
    default: 'Foguetim ERP — Gestão completa para vendedores do Mercado Livre',
    template: '%s | Foguetim ERP',
  },
  description: 'Gerencie seus anúncios, pedidos, SAC e métricas do Mercado Livre em um só painel. ERP inteligente para sellers brasileiros.',
  keywords: ['ERP mercado livre', 'gestão anúncios', 'painel vendedor', 'mercado livre ERP', 'gestão marketplace', 'foguetim'],
  authors: [{ name: 'Foguetim ERP' }],
  creator: 'Foguetim ERP',
  metadataBase: new URL('https://foguetim.com.br'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://foguetim.com.br',
    siteName: 'Foguetim ERP',
    title: 'Foguetim ERP — Gestão completa para vendedores do Mercado Livre',
    description: 'Gerencie seus anúncios, pedidos, SAC e métricas do Mercado Livre em um só painel.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Foguetim ERP — Painel de gestão para sellers' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Foguetim ERP — Gestão completa para vendedores do Mercado Livre',
    description: 'Gerencie seus anúncios, pedidos, SAC e métricas do Mercado Livre em um só painel.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://foguetim.com.br',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Foguetim ERP',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'ERP para gestão de vendas no Mercado Livre — anúncios, pedidos, SAC, métricas e precificação em um único painel.',
  url: 'https://foguetim.com.br',
  inLanguage: 'pt-BR',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
    description: 'Plano gratuito disponível',
  },
  provider: {
    '@type': 'Organization',
    name: 'Foguetim ERP',
    url: 'https://foguetim.com.br',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
        <CookieBanner />
      </body>
    </html>
  )
}
