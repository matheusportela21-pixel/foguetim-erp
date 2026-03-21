/**
 * lib/services/agent-context.ts
 * Injects global system context into every agent's system prompt
 * to reduce false positives from lack of context.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

async function sc(p: Promise<{ count: number | null; error: unknown }>): Promise<number> {
  try { const { count } = await p; return count ?? 0 } catch { return 0 }
}

export async function getGlobalContext(): Promise<string> {
  const db = supabaseAdmin()

  const [mlConnections, mlListings, warehouseProducts, orders, users] = await Promise.all([
    sc(db.from('marketplace_connections').select('*', { count: 'exact', head: true }).eq('connected', true) as unknown as Promise<{ count: number | null; error: unknown }>),
    sc(db.from('ml_listings').select('*', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null; error: unknown }>),
    sc(db.from('warehouse_products').select('*', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null; error: unknown }>),
    sc(db.from('orders').select('*', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null; error: unknown }>),
    sc(db.from('users').select('*', { count: 'exact', head: true }) as unknown as Promise<{ count: number | null; error: unknown }>),
  ])

  const fase = mlListings > 0 ? 'OPERACIONAL' : mlConnections > 0 ? 'CONFIGURAÇÃO' : 'INICIAL'
  const armazem = warehouseProducts > 0 ? 'EM USO' : 'NÃO UTILIZADO (módulo opcional)'

  return `
ESTADO ATUAL DO SISTEMA (gerado automaticamente):
- Contas ML conectadas: ${mlConnections}
- Anúncios ML (ml_listings): ${mlListings}
- Produtos no armazém: ${warehouseProducts}
- Pedidos (orders): ${orders}
- Usuários cadastrados: ${users}
- Fase do sistema: ${fase}
- Módulo Armazém: ${armazem}

REGRAS OBRIGATÓRIAS DE SEVERIDADE:
- CRÍTICA: sistema PAROU de funcionar, dados corrompidos, segurança comprometida, falha de autenticação confirmada
- ALTA: funcionalidade importante degradada, falhas recorrentes confirmadas
- MÉDIA: melhorias necessárias, riscos potenciais identificados
- BAIXA: sugestões, otimizações, oportunidades de melhoria
- NÃO marque como CRÍTICO: tabelas vazias em sistema novo, features não utilizadas, tokens sendo renovados normalmente
- NÃO marque como ALTO: volumes baixos esperados, ausência de dados opcionais
- O sistema é NOVO — volumes baixos e tabelas vazias são ESPERADOS e NORMAIS
`
}
