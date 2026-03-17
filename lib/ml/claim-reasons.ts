export const CLAIM_REASON_LABELS: Record<string, string> = {
  // Devolução — produto
  'PDD9939': 'Produto diferente do anunciado',
  'PDD1182': 'Produto com defeito',
  'PDD1183': 'Produto avariado na entrega',
  'PDD1181': 'Produto incompleto',
  // Não recebido
  'PNR1169': 'Produto não recebido',
  'PNR1170': 'Entregue no endereço errado',
  'PNR1171': 'Produto retornado ao remetente',
  // Cancelamentos
  'CNR':     'Cancelamento — produto não recebido',
  'CDA':     'Cancelamento — desistência do comprador',
  // Genérico
  'OTHER':   'Outro motivo',
}

export function getClaimReasonLabel(reason: string): string {
  return CLAIM_REASON_LABELS[reason] ?? reason
}

/** Retorna mensagem de SLA: 48h úteis a partir de date_created */
export function getClaimSLAMessage(dateCreated: string): string {
  const created = new Date(dateCreated).getTime()
  if (isNaN(created)) return ''
  const hoursElapsed   = (Date.now() - created) / (1000 * 3600)
  const hoursRemaining = Math.ceil(48 - hoursElapsed)
  if (hoursRemaining <= 0) return 'Prazo vencido — responda no ML urgentemente'
  return `Responda em até ${hoursRemaining}h para não afetar sua reputação`
}
