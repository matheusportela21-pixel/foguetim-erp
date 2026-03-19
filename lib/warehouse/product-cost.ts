/**
 * Helpers de custo de produto para o módulo de armazém.
 *
 * Prioridade: manual_cost → average_cost → last_entry_cost → null
 * Nunca alterar manual_cost automaticamente — é exclusivo do usuário.
 */

export interface WarehouseProductCostFields {
  manual_cost?:     number | null
  average_cost?:    number | null
  last_entry_cost?: number | null
  cost_price?:      number | null
}

/**
 * Retorna o melhor custo disponível para um produto.
 * Ordem de prioridade:
 *   1. manual_cost   — definido pelo usuário, alimenta precificação e relatórios
 *   2. average_cost  — média ponderada calculada automaticamente nas entradas
 *   3. last_entry_cost — último custo de entrada registrado
 *   4. cost_price    — campo legado (retrocompatibilidade)
 */
export function getProductCost(product: WarehouseProductCostFields): number | null {
  if (product.manual_cost     != null) return product.manual_cost
  if (product.average_cost    != null) return product.average_cost
  if (product.last_entry_cost != null) return product.last_entry_cost
  if (product.cost_price      != null) return product.cost_price
  return null
}

/**
 * Recalcula o custo médio ponderado após uma nova entrada.
 *
 * @param currentAvg   Custo médio atual (null se ainda não havia estoque)
 * @param currentQty   Estoque atual ANTES da nova entrada
 * @param entryCost    Custo unitário da nova entrada
 * @param entryQty     Quantidade da nova entrada
 * @returns Novo custo médio ponderado arredondado a 2 casas
 */
export function calcWeightedAverageCost(
  currentAvg:  number | null,
  currentQty:  number,
  entryCost:   number,
  entryQty:    number,
): number {
  if (currentAvg == null || currentQty <= 0) {
    return Math.round(entryCost * 100) / 100
  }
  const newAvg = (currentAvg * currentQty + entryCost * entryQty) / (currentQty + entryQty)
  return Math.round(newAvg * 100) / 100
}

/**
 * Retorna o percentual de variação entre dois custos.
 * Útil para decidir se precisa de confirmação/OTP.
 */
export function costChangePct(oldCost: number, newCost: number): number {
  if (oldCost <= 0) return 1
  return Math.abs(newCost - oldCost) / oldCost
}
