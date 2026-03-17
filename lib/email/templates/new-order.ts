import { baseTemplate } from './base'

export function newOrderTemplate(data: {
  sellerName:   string
  orderId:      string | number
  productTitle: string
  quantity:     number
  price:        number
  buyerName:    string
  city:         string
  state:        string
}): { subject: string; html: string } {
  const priceStr = data.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">🛒</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;">Novo pedido recebido!</h1>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Boa notícia, ${data.sellerName}!</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#1a1a3e;border-radius:8px;border:1px solid #2d2d5e;margin-bottom:24px;">
      <tr><td style="padding:20px;">
        <p style="color:#6366f1;font-size:12px;font-weight:600;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;">PEDIDO</p>
        <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px 0;">#${data.orderId}</p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d2d5e;">
            <span style="color:#9ca3af;font-size:13px;">Produto</span><br>
            <span style="color:#ffffff;font-size:14px;font-weight:500;">${data.productTitle}</span>
          </td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #2d2d5e;">
            <table width="100%"><tr>
              <td>
                <span style="color:#9ca3af;font-size:13px;">Quantidade</span><br>
                <span style="color:#ffffff;font-size:14px;">${data.quantity}×</span>
              </td>
              <td align="right">
                <span style="color:#9ca3af;font-size:13px;">Valor</span><br>
                <span style="color:#10b981;font-size:18px;font-weight:700;">R$ ${priceStr}</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <span style="color:#9ca3af;font-size:13px;">Comprador</span><br>
            <span style="color:#ffffff;font-size:14px;">${data.buyerName} — ${data.city}/${data.state}</span>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;">
      <a href="https://foguetim.com.br/dashboard/pedidos"
         style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
        Ver pedido no Foguetim →
      </a>
    </div>
  `

  return {
    subject: `🛒 Novo pedido #${data.orderId} — R$ ${priceStr}`,
    html:    baseTemplate(content, 'Novo pedido recebido'),
  }
}
