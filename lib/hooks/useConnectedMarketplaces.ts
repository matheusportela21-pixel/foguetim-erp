'use client'

import { useState, useEffect } from 'react'

export interface ConnectedMarketplaces {
  hasML:      boolean
  hasShopee:  boolean
  loading:    boolean
}

/**
 * Hook que detecta quais marketplaces o usuário tem conectados.
 * Busca em paralelo /api/mercadolivre/status e /api/shopee/status.
 * Resultado cacheado na sessão por 5 minutos (sessionStorage) para evitar
 * requests redundantes entre navegações dentro do dashboard.
 */
export function useConnectedMarketplaces(): ConnectedMarketplaces {
  const [hasML,     setHasML]     = useState(false)
  const [hasShopee, setHasShopee] = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    // Check session cache
    try {
      const raw = sessionStorage.getItem('connected_marketplaces_cache')
      if (raw) {
        const parsed = JSON.parse(raw) as { hasML: boolean; hasShopee: boolean; ts: number }
        if (Date.now() - parsed.ts < 5 * 60 * 1000) {
          setHasML(parsed.hasML)
          setHasShopee(parsed.hasShopee)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore */ }

    Promise.all([
      fetch('/api/mercadolivre/status').then(r => r.json()).catch(() => ({ connected: false })),
      fetch('/api/shopee/status').then(r => r.json()).catch(() => ({ connected: false })),
    ]).then(([ml, shopee]: [{ connected: boolean }, { connected: boolean }]) => {
      const mlOk     = !!ml?.connected
      const shopeeOk = !!shopee?.connected

      setHasML(mlOk)
      setHasShopee(shopeeOk)

      // Write cache
      try {
        sessionStorage.setItem('connected_marketplaces_cache', JSON.stringify({
          hasML:     mlOk,
          hasShopee: shopeeOk,
          ts:        Date.now(),
        }))
      } catch { /* ignore */ }
    }).finally(() => setLoading(false))
  }, [])

  return { hasML, hasShopee, loading }
}
