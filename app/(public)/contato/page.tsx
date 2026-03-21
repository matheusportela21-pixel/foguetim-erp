import type { Metadata } from 'next'
import ContatoClient from './_client'

export const metadata: Metadata = {
  title: 'Contato',
  description: 'Fale com a equipe do Foguetim ERP. Tire dúvidas, solicite suporte ou envie sugestões para melhorar sua gestão no Mercado Livre.',
  alternates: {
    canonical: 'https://www.foguetim.com.br/contato',
  },
  openGraph: {
    title: 'Contato | Foguetim ERP',
    description: 'Fale com a equipe do Foguetim ERP. Tire dúvidas ou solicite suporte.',
    url: 'https://www.foguetim.com.br/contato',
  },
}

export default function ContatoPage() {
  return <ContatoClient />
}
