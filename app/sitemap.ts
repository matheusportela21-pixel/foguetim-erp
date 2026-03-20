import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://foguetim.com.br'

async function getHelpUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: articles } = await supabase
      .from('help_articles')
      .select('slug, updated_at, help_categories!inner(slug)')
      .eq('is_published', true)
      .limit(200)

    return (articles ?? []).map(a => ({
      url: `${BASE}/ajuda/${(a.help_categories as unknown as {slug:string}).slug}/${a.slug}`,
      lastModified: new Date(a.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const helpUrls = await getHelpUrls()

  return [
    { url: BASE,                           lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: `${BASE}/planos`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/ajuda`,                lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/sobre`,                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/integracoes`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/contato`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/termos`,               lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacidade`,          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    ...helpUrls,
  ]
}
