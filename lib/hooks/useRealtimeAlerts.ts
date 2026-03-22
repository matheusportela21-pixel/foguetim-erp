'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

/**
 * Hook que monitora alertas em tempo real via Supabase Realtime.
 * Atualiza contagem de alertas não lidos instantaneamente.
 * Também faz polling a cada 60s como fallback.
 */
export function useRealtimeAlerts() {
  const { profile } = useAuth()
  const [alertCount, setAlertCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts/count')
      if (res.ok) {
        const data = await res.json()
        setAlertCount(data.count ?? 0)
      }
    } catch { /* silencia */ }
  }, [])

  useEffect(() => {
    if (!profile?.id) return

    // Initial fetch
    fetchCount()

    // Polling fallback (every 60s)
    const interval = setInterval(fetchCount, 60_000)

    // Supabase Realtime subscription
    const channel = supabase
      .channel(`alerts-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        // New alert arrived — increment count
        setAlertCount(prev => prev + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'alerts',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        // Alert updated (read/dismissed) — refetch count
        fetchCount()
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [profile?.id, fetchCount])

  return { alertCount, refreshAlerts: fetchCount }
}
