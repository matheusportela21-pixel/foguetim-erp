import { Suspense } from 'react'
import type { Metadata } from 'next'
import SearchContent from './_client'

export const metadata: Metadata = {
  title: 'Busca | Central de Ajuda | Foguetim ERP',
  description: 'Busque artigos e guias na Central de Ajuda do Foguetim ERP.',
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        Carregando busca...
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
