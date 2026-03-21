import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog/', '/ajuda/', '/planos', '/sobre', '/privacidade', '/termos', '/changelog', '/contato', '/integracoes'],
        disallow: ['/dashboard/', '/admin/', '/api/'],
      },
    ],
    sitemap: 'https://www.foguetim.com.br/sitemap.xml',
  }
}
