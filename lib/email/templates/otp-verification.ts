import { baseTemplate } from './base'

const ACTION_LABELS: Record<string, string> = {
  bulk_pause_ml:               'Pausar anúncios em massa no Mercado Livre',
  disconnect_ml:               'Desconectar integração Mercado Livre',
  delete_warehouse_product:    'Excluir produto do armazém',
  bulk_reactivate_ml:          'Reativar anúncios em massa no Mercado Livre',
}

export function otpVerificationTemplate(data: {
  name:           string
  otp:            string
  action_type:    string
  expiryMinutes:  number
}): { subject: string; html: string } {
  const actionLabel = ACTION_LABELS[data.action_type] ?? data.action_type

  const digits = data.otp.split('').map(d =>
    `<span style="display:inline-block;width:40px;height:52px;line-height:52px;text-align:center;font-size:28px;font-weight:700;color:#ffffff;background:#1a1a3e;border:2px solid #2d2d5e;border-radius:8px;margin:0 3px;">${d}</span>`
  ).join('')

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">🔐</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;">Código de verificação</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Olá, ${data.name}!</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#0f1730;border-radius:8px;border:1px solid #2d2d5e;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <p style="color:#6366f1;font-size:12px;font-weight:600;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;">AÇÃO SOLICITADA</p>
        <p style="color:#ffffff;font-size:15px;font-weight:600;margin:0 0 20px 0;">${actionLabel}</p>

        <p style="color:#9ca3af;font-size:13px;margin:0 0 12px 0;text-align:center;">
          Insira este código no Foguetim ERP para confirmar:
        </p>

        <div style="text-align:center;margin:16px 0;">
          ${digits}
        </div>

        <p style="color:#6b7280;font-size:12px;text-align:center;margin:16px 0 0 0;">
          ⏱ Válido por <strong style="color:#9ca3af;">${data.expiryMinutes} minutos</strong>
        </p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#1c1c2e;border-radius:8px;border:1px solid #ff3b6b40;margin-bottom:24px;">
      <tr><td style="padding:16px;">
        <p style="color:#ff6b8a;font-size:13px;font-weight:600;margin:0 0 6px 0;">⚠️ Atenção</p>
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          Se você não solicitou este código, ignore este e-mail e considere alterar sua senha.
          Nunca compartilhe este código com ninguém.
        </p>
      </td></tr>
    </table>

    <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">
      Este código expira automaticamente após ${data.expiryMinutes} minutos.
    </p>
  `

  return {
    subject: `${data.otp} é seu código de verificação — Foguetim ERP`,
    html:    baseTemplate(content, 'Código de verificação — Foguetim ERP'),
  }
}
