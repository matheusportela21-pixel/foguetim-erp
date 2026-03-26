/**
 * lib/email/templates/weekly-report.ts
 * Alternative weekly report email template with KPI-focused layout.
 */

export function weeklyReportHTML(data: {
  userName: string
  revenue: number
  orders: number
  ticketMedio: number
  topProduct: string
  stockAlerts: number
  pendingClaims: number
  periodLabel: string
  dashboardUrl: string
  unsubscribeUrl: string
}): string {
  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const atencaoItems: string[] = []
  if (data.pendingClaims > 0) {
    atencaoItems.push(
      `<p style="color:#fca5a5;font-size:13px;margin:4px 0 0 0;">` +
      `&#x1f534; <strong>${data.pendingClaims}</strong> reclamacao(oes) pendente(s)</p>`,
    )
  }
  if (data.stockAlerts > 0) {
    atencaoItems.push(
      `<p style="color:#fbbf24;font-size:13px;margin:4px 0 0 0;">` +
      `&#x26a0;&#xfe0f; <strong>${data.stockAlerts}</strong> alerta(s) de estoque</p>`,
    )
  }

  const atencaoSection = atencaoItems.length > 0
    ? `
    <div style="background:#1a0505;border:1px solid #7f1d1d;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <p style="color:#fca5a5;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">Atencao necessaria</p>
      ${atencaoItems.join('')}
    </div>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="background:#0A0718;color:#e2e8f0;font-family:'Segoe UI',system-ui,sans-serif;padding:40px 20px;margin:0;">
      <div style="max-width:520px;margin:0 auto;">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:24px;">
          <img src="https://www.foguetim.com.br/mascot/timm-waving.png" width="64" alt="Timm" style="display:inline-block;" />
          <h1 style="color:#a78bfa;font-size:20px;margin:8px 0 4px 0;font-weight:700;">Resumo Semanal</h1>
          <p style="color:#94a3b8;font-size:13px;margin:0;">${data.periodLabel}</p>
        </div>

        <p style="color:#94a3b8;font-size:14px;text-align:center;margin:0 0 24px 0;">
          Ola, <strong style="color:#e2e8f0;">${data.userName}</strong>! Aqui esta o resumo da sua operacao.
        </p>

        ${atencaoSection}

        <!-- Faturamento -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin-bottom:12px;">
          <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 6px 0;font-weight:600;">Faturamento</p>
          <p style="color:#10b981;font-size:24px;font-weight:bold;margin:0;">R$ ${fmt(data.revenue)}</p>
        </div>

        <!-- KPIs row -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin-bottom:12px;">
          <tr>
            <td width="50%" style="padding:0 6px 0 0;vertical-align:top;">
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;">
                <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Pedidos</p>
                <p style="color:#e2e8f0;font-size:22px;font-weight:bold;margin:0;">${data.orders}</p>
              </div>
            </td>
            <td width="50%" style="padding:0 0 0 6px;vertical-align:top;">
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;">
                <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Ticket Medio</p>
                <p style="color:#e2e8f0;font-size:22px;font-weight:bold;margin:0;">R$ ${fmt(data.ticketMedio)}</p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Top product -->
        ${data.topProduct ? `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;margin-bottom:16px;">
          <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 6px 0;font-weight:600;">Top Produto</p>
          <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0;">${data.topProduct}</p>
        </div>
        ` : ''}

        <!-- CTA -->
        <a href="${data.dashboardUrl}" style="display:block;text-align:center;background:#7c3aed;color:white;padding:14px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;margin-top:8px;">
          Ver dashboard completo &rarr;
        </a>

        <!-- Footer -->
        <p style="text-align:center;margin-top:24px;color:#475569;font-size:11px;">
          Foguetim ERP &middot; Feito com &#x1f680; em Fortaleza<br/>
          <a href="${data.unsubscribeUrl}" style="color:#475569;">Desativar relatorio semanal</a>
        </p>
      </div>
    </body>
    </html>
  `
}
