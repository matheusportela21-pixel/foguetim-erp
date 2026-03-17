import { baseTemplate } from './base'

export function weeklySummaryTemplate(data: {
  sellerName:          string
  weekStart:           string   // ex: "10/03"
  weekEnd:             string   // ex: "16/03"
  totalOrders:         number
  totalRevenue:        number
  pendingQuestions:    number
  answeredQuestions:   number
  openClaims:          number
  topProductTitle?:    string
  topProductRevenue?:  number
  topProductUnits?:    number
}): { subject: string; html: string } {
  const revenueStr = data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const topRevStr  = data.topProductRevenue
    ? data.topProductRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : null

  const claimsAlert = data.openClaims > 0 ? `
    <div style="background:#450a0a;border:1px solid #ef4444;border-radius:8px;padding:12px 16px;margin-bottom:20px;text-align:center;">
      <span style="color:#ef4444;font-size:13px;font-weight:600;">
        🔴 Você tem ${data.openClaims} reclamação(ões) aberta(s) — responda antes do prazo
      </span>
    </div>` : ''

  const topProductSection = data.topProductTitle ? `
    <div style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;padding:16px;margin-top:16px;">
      <p style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px 0;">⭐ Top produto da semana</p>
      <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 4px 0;">${data.topProductTitle}</p>
      <p style="color:#10b981;font-size:13px;margin:0;">
        ${data.topProductUnits ? `${data.topProductUnits} unidades` : ''} ${topRevStr ? `· R$ ${topRevStr}` : ''}
      </p>
    </div>` : ''

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">📊</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;">Resumo semanal</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0;">${data.weekStart} a ${data.weekEnd} · Olá, ${data.sellerName}!</p>
    </div>

    ${claimsAlert}

    <!-- KPIs -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="33%" style="padding:4px;">
          <div style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;padding:16px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0 0 6px 0;">Pedidos</p>
            <p style="color:#6366f1;font-size:28px;font-weight:800;margin:0;">${data.totalOrders}</p>
          </div>
        </td>
        <td width="33%" style="padding:4px;">
          <div style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;padding:16px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0 0 6px 0;">Receita</p>
            <p style="color:#10b981;font-size:20px;font-weight:800;margin:0;">R$ ${revenueStr}</p>
          </div>
        </td>
        <td width="33%" style="padding:4px;">
          <div style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;padding:16px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0 0 6px 0;">Reclamações</p>
            <p style="color:${data.openClaims > 0 ? '#ef4444' : '#10b981'};font-size:28px;font-weight:800;margin:0;">${data.openClaims}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Perguntas -->
    <div style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;padding:16px;margin-bottom:16px;">
      <p style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px 0;">Perguntas</p>
      <table width="100%"><tr>
        <td>
          <p style="color:#10b981;font-size:18px;font-weight:700;margin:0 0 2px 0;">${data.answeredQuestions}</p>
          <p style="color:#9ca3af;font-size:12px;margin:0;">Respondidas</p>
        </td>
        <td>
          <p style="color:${data.pendingQuestions > 0 ? '#f59e0b' : '#10b981'};font-size:18px;font-weight:700;margin:0 0 2px 0;">${data.pendingQuestions}</p>
          <p style="color:#9ca3af;font-size:12px;margin:0;">Pendentes</p>
        </td>
      </tr></table>
    </div>

    ${topProductSection}

    <div style="text-align:center;margin-top:24px;">
      <a href="https://foguetim.com.br/dashboard"
         style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Ver painel completo →
      </a>
    </div>
  `

  return {
    subject: `📊 Resumo semanal Foguetim — ${data.weekStart} a ${data.weekEnd}`,
    html:    baseTemplate(content, 'Resumo semanal'),
  }
}
