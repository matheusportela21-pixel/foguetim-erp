/**
 * GET /api/ai/credits/history
 * Histórico de uso de créditos de IA, ordenado por data decrescente.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const { data, error } = await supabaseAdmin()
    .from('ai_credit_usage')
    .select('id, type, input_text, output_text, credits_cost, created_at')
    .eq('user_id', dataOwnerId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    // Tabela pode não existir ainda
    return NextResponse.json({ history: [], total: 0 })
  }

  return NextResponse.json({ history: data ?? [], total: data?.length ?? 0 })
}
