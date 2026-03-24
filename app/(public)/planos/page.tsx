import type { Metadata } from 'next'
import PlanosClient from './_client'

export const metadata: Metadata = {
  title: 'Planos e Preços',
  description: 'Conheça os planos do Foguetim ERP. De R$19,90 a R$119,90 — encontre o plano ideal para crescer suas vendas no Mercado Livre, Shopee e Magalu.',
  alternates: {
    canonical: 'https://www.foguetim.com.br/planos',
  },
  openGraph: {
    title: 'Planos e Preços | Foguetim ERP',
    description: '4 planos para sellers de marketplace. 7 dias grátis, sem cartão.',
    url: 'https://www.foguetim.com.br/planos',
  },
}

export default function PlanosPage() {
  return <PlanosClient />
}
