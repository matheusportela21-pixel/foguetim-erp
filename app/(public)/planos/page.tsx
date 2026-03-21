import type { Metadata } from 'next'
import PlanosClient from './_client'

export const metadata: Metadata = {
  title: 'Planos e Preços',
  description: 'Conheça os planos do Foguetim ERP. Do gratuito ao Enterprise, encontre o plano ideal para crescer suas vendas no Mercado Livre.',
  alternates: {
    canonical: 'https://www.foguetim.com.br/planos',
  },
  openGraph: {
    title: 'Planos e Preços | Foguetim ERP',
    description: 'Do plano gratuito ao Enterprise — escolha o melhor para o seu negócio no Mercado Livre.',
    url: 'https://www.foguetim.com.br/planos',
  },
}

export default function PlanosPage() {
  return <PlanosClient />
}
