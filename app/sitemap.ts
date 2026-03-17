import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://foguetim.com.br',             lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: 'https://foguetim.com.br/planos',       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: 'https://foguetim.com.br/sobre',        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://foguetim.com.br/integracoes',  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://foguetim.com.br/contato',      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://foguetim.com.br/termos',       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: 'https://foguetim.com.br/privacidade',  lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
