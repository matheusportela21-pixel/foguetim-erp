/**
 * POST /api/email/test
 * Envia um email de teste para o usuário autenticado.
 * Útil para validar as configurações SMTP.
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { sendEmail } from '@/lib/email/email.service'
import { newOrderTemplate } from '@/lib/email/templates/new-order'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.email) return NextResponse.json({ error: 'Usuário sem email' }, { status: 400 })

  const { subject, html } = newOrderTemplate({
    sellerName:   'Vendedor',
    orderId:      '2000015318174092',
    productTitle: 'Kit Produto Exemplo',
    quantity:     2,
    price:        139.80,
    buyerName:    'João Silva',
    city:         'Fortaleza',
    state:        'CE',
  })

  const ok = await sendEmail({ to: user.email, subject, html })

  return NextResponse.json({
    success: ok,
    message: ok
      ? `Email enviado para ${user.email}! Verifique sua caixa.`
      : 'Falha ao enviar — verifique as variáveis SMTP no Vercel.',
  })
}
