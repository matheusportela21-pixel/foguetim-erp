'use client'

import { useState, useEffect } from 'react'

export interface ConnectedMarketplaces {
  hasML:      boolean
  hasShopee:  boolean
  hasMagalu:  boolean
  loading:    boolean
}

/**
 * Hook que detecta quais marketplaces o usuário tem conectados.
 * Busca em paralelo /api/mercadolivre/status, /api/shopee/status e /api/magalu/status.
 * Resultado cacheado na sessão por 5 minutos (sessionStorage) para evitar
 * requests redundantes entre navegações dentro do dashboard.
 */
export function useConnectedMarketplaces(): ConnectedMarketplaces {
  const [hasML,     setHasML]     = useState(false)
  const [hasShopee, setHasShopee] = useState(false)
  const [hasMagalu, setHasMagalu] = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    // Check session cache
    try {
      const raw = sessionStorage.getItem('connected_marketplaces_cache')
      if (raw) {
        const parsed = JSON.parse(raw) as { hasML: boolean; hasShopee: boolean; hasMagalu: boolean; ts: number }
        if (Date.now() - parsed.ts < 5 * 60 * 1000) {
          setHasML(parsed.hasML)
          setHasShopee(parsed.hasShopee)
          setHasMagalu(parsed.hasMagalu)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore */ }

    Promise.all([
      fetch('/api/mercadolivre/status').then(r => r.json()).catch(() => ({ connected: false })),
      fetch('/api/shopee/status').then(r => r.json()).catch(() => ({ connected: false })),
      fetch('/api/magalu/status').then(r => r.json()).catch(() => ({ connected: false })),
    ]).then(([ml, shopee, magalu]: [{ connected: boolean }, { connected: boolean }, { connected: boolean }]) => {
      const mlOk     = !!ml?.connected
      const shopeeOk = !!shopee?.connected
      const magaluOk = !!magalu?.connected

      setHasML(mlOk)
      setHasShopee(shopeeOk)
      setHasMagalu(magaluOk)

      // Write cache
      try {
        sessionStorage.setItem('connected_marketplaces_cache', JSON.stringify({
          hasML:     mlOk,
          hasShopee: shopeeOk,
          hasMagalu: magaluOk,
          ts:        Date.now(),
        }))
      } catch { /* ignore */ }
    }).finally(() => setLoading(false))
  }, [])

  return { hasML, hasShopee, hasMagalu, loading }
}
