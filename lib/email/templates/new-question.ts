import { baseTemplate } from './base'

export function newQuestionTemplate(data: {
  sellerName:   string
  questionId:   string | number
  questionText: string
  itemTitle:    string
  buyerName?:   string
}): { subject: string; html: string } {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">❓</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;">Nova pergunta recebida</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Responda rápido para aumentar sua conversão, ${data.sellerName}!</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d2d5e;">
            <span style="color:#9ca3af;font-size:13px;">Anúncio</span><br>
            <span style="color:#ffffff;font-size:14px;font-weight:500;">${data.itemTitle}</span>
          </td></tr>
          ${data.buyerName ? `
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d2d5e;">
            <span style="color:#9ca3af;font-size:13px;">Comprador</span><br>
            <span style="color:#ffffff;font-size:14px;">${data.buyerName}</span>
          </td></tr>` : ''}
          <tr><td style="padding:12px 0;">
            <span style="color:#9ca3af;font-size:13px;">Pergunta</span><br>
            <div style="background:#0d0d1a;border-left:3px solid #6366f1;border-radius:4px;padding:12px 16px;margin-top:8px;">
              <span style="color:#e2e8f0;font-size:15px;line-height:1.5;">"${data.questionText}"</span>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;">
      <a href="https://foguetim.com.br/dashboard/sac"
         style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Responder no Foguetim →
      </a>
    </div>
  `

  return {
    subject: `❓ Nova pergunta — ${data.itemTitle}`,
    html:    baseTemplate(content, 'Nova pergunta recebida'),
  }
}
