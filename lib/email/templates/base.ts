export function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#12122b;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;border-bottom:2px solid #6366f1;">
              <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                🚀 Foguetim ERP
              </span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background:#12122b;padding:32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d1a;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border-top:1px solid #1e1e3a;">
              <p style="color:#4b5563;font-size:12px;margin:0 0 8px 0;">
                Você está recebendo este email pois ativou as notificações no Foguetim ERP.
              </p>
              <p style="color:#4b5563;font-size:12px;margin:0;">
                <a href="https://foguetim.com.br/dashboard/configuracoes" style="color:#6366f1;text-decoration:none;">Gerenciar notificações</a>
                &nbsp;·&nbsp;
                <a href="https://foguetim.com.br" style="color:#6366f1;text-decoration:none;">Acessar painel</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
