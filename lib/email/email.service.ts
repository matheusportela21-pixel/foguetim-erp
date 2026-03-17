/**
 * Serviço de envio de email via SMTP (Locaweb).
 * Remetente: no-reply@foguetim.com.br
 *
 * Variáveis de ambiente necessárias:
 *   SMTP_HOST  — email-ssl.com.br
 *   SMTP_PORT  — 587
 *   SMTP_USER  — no-reply@foguetim.com.br
 *   SMTP_PASS  — (senha do email Locaweb — configurar no Vercel)
 */
import { createTransport } from 'nodemailer'

function getTransporter() {
  return createTransport({
    host:   process.env.SMTP_HOST ?? 'email-ssl.com.br',
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

export async function sendEmail(params: {
  to:      string
  subject: string
  html:    string
}): Promise<boolean> {
  // Em dev sem credenciais, apenas logar
  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'CONFIGURE_NO_VERCEL') {
    console.log('[Email] DEV mode — email não enviado:', params.subject, '→', params.to)
    return true
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from:    '"Foguetim ERP" <no-reply@foguetim.com.br>',
      to:      params.to,
      subject: params.subject,
      html:    params.html,
    })
    console.log('[Email] Enviado:', params.subject, '→', params.to)
    return true
  } catch (err) {
    console.error('[Email] Falha ao enviar:', err)
    return false
  }
}
