import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://foguetim.com.br'

async function getBlogUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, category_slug')
      .eq('status', 'published')
      .limit(500)

    const { data: cats } = await supabase
      .from('blog_categories')
      .select('slug, created_at')
      .eq('is_visible', true)

    const postUrls = (posts ?? []).map(p => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    const catUrls = (cats ?? []).map(c => ({
      url: `${BASE}/blog/categoria/${c.slug}`,
      lastModified: new Date(c.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    return [...postUrls, ...catUrls]
  } catch {
    return []
  }
}

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
  const [helpUrls, blogUrls] = await Promise.all([getHelpUrls(), getBlogUrls()])

  return [
    { url: BASE,                           lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: `${BASE}/planos`,               lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/ajuda`,                lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/blog`,                 lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/changelog`,            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/sobre`,                lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/integracoes`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/contato`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/termos`,               lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacidade`,          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    ...helpUrls,
    ...blogUrls,
  ]
}
