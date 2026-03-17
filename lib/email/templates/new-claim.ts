import { baseTemplate } from './base'

export function newClaimTemplate(data: {
  sellerName:        string
  claimId:           string | number
  productTitle:      string
  reason:            string
  deadline:          string
  affectsReputation: boolean
}): { subject: string; html: string } {
  const reputationBanner = data.affectsReputation ? `
    <div style="background:#450a0a;border:1px solid #ef4444;border-radius:8px;padding:12px 16px;margin-bottom:20px;text-align:center;">
      <span style="color:#ef4444;font-size:13px;font-weight:600;">
        🔴 Esta reclamação afeta sua reputação no Mercado Livre
      </span>
    </div>` : ''

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
      <h1 style="color:#ef4444;font-size:22px;font-weight:700;margin:0 0 8px 0;">Reclamação aberta</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Ação necessária, ${data.sellerName}</p>
    </div>

    ${reputationBanner}

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d2d5e;">
            <span style="color:#9ca3af;font-size:13px;">Reclamação</span><br>
            <span style="color:#ffffff;font-size:14px;font-weight:600;">#${data.claimId}</span>
          </td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d2d5e;">
            <span style="color:#9ca3af;font-size:13px;">Produto</span><br>
            <span style="color:#ffffff;font-size:14px;">${data.productTitle}</span>
          </td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d2d5e;">
            <span style="color:#9ca3af;font-size:13px;">Motivo</span><br>
            <span style="color:#ffffff;font-size:14px;">${data.reason}</span>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <span style="color:#9ca3af;font-size:13px;">Prazo para resposta</span><br>
            <span style="color:#f59e0b;font-size:14px;font-weight:600;">⏱ ${data.deadline}</span>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;">
      <a href="https://foguetim.com.br/dashboard/reclamacoes"
         style="display:inline-block;background:#ef4444;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Responder reclamação →
      </a>
    </div>
  `

  return {
    subject: `⚠️ Nova reclamação — ${data.productTitle}`,
    html:    baseTemplate(content, 'Nova reclamação'),
  }
}
