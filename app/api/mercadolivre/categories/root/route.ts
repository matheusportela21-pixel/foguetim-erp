/**
 * GET /api/mercadolivre/categories/root
 * Returns top-level ML categories for MLB site.
 * Falls back to hardcoded list if API is unavailable.
 */
import { NextResponse } from 'next/server'

export interface RootCategory {
  id:   string
  name: string
}

interface MLRootCategory {
  id?:   string
  name?: string
}

const ROOT_CATEGORIES_FALLBACK: RootCategory[] = [
  { id: 'MLB1246',   name: 'Beleza e Cuidado Pessoal'   },
  { id: 'MLB1430',   name: 'Calçados, Roupas e Bolsas'  },
  { id: 'MLB1132',   name: 'Brinquedos e Hobbies'       },
  { id: 'MLB1743',   name: 'Carros, Motos e Outros'     },
  { id: 'MLB1574',   name: 'Casa, Móveis e Decoração'   },
  { id: 'MLB1051',   name: 'Celulares e Telefones'      },
  { id: 'MLB1500',   name: 'Construção'                 },
  { id: 'MLB5726',   name: 'Eletrodomésticos'           },
  { id: 'MLB1000',   name: 'Eletrônicos, Áudio e Vídeo' },
  { id: 'MLB1276',   name: 'Esportes e Fitness'         },
  { id: 'MLB263532', name: 'Ferramentas'                },
  { id: 'MLB1403',   name: 'Alimentos e Bebidas'        },
  { id: 'MLB1384',   name: 'Bebês'                      },
  { id: 'MLB1039',   name: 'Câmeras e Acessórios'       },
  { id: 'MLB1071',   name: 'Animais'                    },
  { id: 'MLB5672',   name: 'Acessórios para Veículos'   },
  { id: 'MLB12404',  name: 'Indústria e Comércio'       },
  { id: 'MLB1459',   name: 'Imóveis'                    },
]

export async function GET() {
  try {
    const res = await fetch(
      'https://api.mercadolibre.com/sites/MLB/categories',
      { next: { revalidate: 3600 } },
    )

    if (res.ok) {
      const raw: unknown = await res.json()
      if (Array.isArray(raw) && raw.length > 0) {
        const categories: RootCategory[] = (raw as MLRootCategory[])
          .filter(c => c && c.id && c.name)
          .map(c => ({ id: String(c.id), name: String(c.name) }))
        if (categories.length > 0) return NextResponse.json(categories)
      }
    }
  } catch {
    // fall through to hardcoded
  }

  return NextResponse.json(ROOT_CATEGORIES_FALLBACK)
}
