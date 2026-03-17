import { baseTemplate } from './base'

export function weeklySummaryTemplate(data: {
  sellerName:        string
  weekStart:         string   // "10/03/2026"
  weekEnd:           string   // "16/03/2026"

  // Vendas
  totalPedidos:      number
  receitaBruta:      number
  receitaLiquida:    number
  ticketMedio:       number

  // Comparação semana anterior
  pedidosVariacao:   number   // % vs semana anterior
  receitaVariacao:   number   // % vs semana anterior

  // Operacional
  reclamacoesAbertas:  number
  perguntasPendentes:  number
  enviosPendentes:     number

  // Top produto
  topProduto?: {
    title:     string
    quantidade: number
    receita:   number
  }
}): { subject: string; html: string } {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  function variacao(pct: number): string {
    if (pct === 0) return '<span style="color:#6b7280;font-size:12px;">→ 0%</span>'
    const arrow = pct > 0 ? '↑' : '↓'
    const color = pct > 0 ? '#4ade80' : '#f87171'
    return `<span style="color:${color};font-size:12px;font-weight:700;">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`
  }

  // ── Atenção necessária ─────────────────────────────────────────────────────
  const atencaoItems: string[] = []
  if (data.reclamacoesAbertas > 0) {
    atencaoItems.push(
      `🔴 <strong>${data.reclamacoesAbertas}</strong> reclamação(ões) aberta(s) — responda antes do prazo`,
    )
  }
  if (data.perguntasPendentes > 0) {
    atencaoItems.push(
      `🟡 <strong>${data.perguntasPendentes}</strong> pergunta(s) sem resposta`,
    )
  }
  if (data.enviosPendentes > 0) {
    atencaoItems.push(
      `📦 <strong>${data.enviosPendentes}</strong> envio(s) pendente(s) de postagem`,
    )
  }

  const atencaoSection = atencaoItems.length > 0
    ? `
    <div style="background:#1a0505;border:1px solid #7f1d1d;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#fca5a5;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">⚠️ Atenção necessária</p>
      ${atencaoItems.map(item =>
        `<p style="color:#fca5a5;font-size:13px;margin:4px 0 0 0;">${item}</p>`,
      ).join('')}
    </div>`
    : ''

  // ── Top produto ────────────────────────────────────────────────────────────
  const topProdutoSection = data.topProduto
    ? `
    <div style="background:#071a0f;border:1px solid #166534;border-radius:10px;padding:16px 20px;margin-top:20px;">
      <p style="color:#86efac;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 8px 0;">⭐ Top produto da semana</p>
      <p style="color:#f0fdf4;font-size:14px;font-weight:600;margin:0 0 6px 0;">${data.topProduto.title}</p>
      <p style="color:#86efac;font-size:13px;margin:0;">
        ${data.topProduto.quantidade} unidades &nbsp;·&nbsp; R$ ${fmt(data.topProduto.receita)}
      </p>
    </div>`
    : ''

  // ── Período label ──────────────────────────────────────────────────────────
  const months = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const [wsd, wsm, wsy] = data.weekStart.split('/')
  const [wed] = data.weekEnd.split('/')
  const periodoLabel = `${parseInt(wsd)} a ${parseInt(wed)} de ${months[parseInt(wsm)] ?? wsm} de ${wsy}`

  // ── Content ────────────────────────────────────────────────────────────────
  const content = `
    <!-- Hero -->
    <div style="text-align:center;padding:8px 0 28px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);border-radius:12px;padding:10px 22px;margin-bottom:16px;">
        <span style="font-size:13px;font-weight:800;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">📊 Resumo da Semana</span>
      </div>
      <p style="color:#c4b5fd;font-size:20px;font-weight:700;margin:0 0 6px 0;">${periodoLabel}</p>
      <p style="color:#6b7280;font-size:14px;margin:0;">Olá, ${data.sellerName}! Aqui está o resumo da sua operação.</p>
    </div>

    ${atencaoSection}

    <!-- KPIs 2x2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;">
      <tr>
        <td width="50%" style="padding:0 6px 6px 0;vertical-align:top;">
          <div style="background:#0d0d28;border:1px solid #1e1b4b;border-radius:10px;padding:18px;text-align:center;">
            <p style="color:#818cf8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px 0;">Pedidos</p>
            <p style="color:#e0e7ff;font-size:30px;font-weight:800;margin:0 0 6px 0;line-height:1;">${data.totalPedidos}</p>
            ${variacao(data.pedidosVariacao)}
          </div>
        </td>
        <td width="50%" style="padding:0 0 6px 6px;vertical-align:top;">
          <div style="background:#071a0a;border:1px solid #14532d;border-radius:10px;padding:18px;text-align:center;">
            <p style="color:#4ade80;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px 0;">Receita Bruta</p>
            <p style="color:#dcfce7;font-size:18px;font-weight:800;margin:0 0 6px 0;line-height:1.2;">R$ ${fmt(data.receitaBruta)}</p>
            ${variacao(data.receitaVariacao)}
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:6px 6px 0 0;vertical-align:top;">
          <div style="background:#0d0d28;border:1px solid #1e1b4b;border-radius:10px;padding:18px;text-align:center;">
            <p style="color:#a5b4fc;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px 0;">Ticket Médio</p>
            <p style="color:#e0e7ff;font-size:20px;font-weight:800;margin:0;line-height:1.2;">R$ ${fmt(data.ticketMedio)}</p>
          </div>
        </td>
        <td width="50%" style="padding:6px 0 0 6px;vertical-align:top;">
          <div style="background:#071612;border:1px solid #064e3b;border-radius:10px;padding:18px;text-align:center;">
            <p style="color:#6ee7b7;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 8px 0;">Receita Líquida</p>
            <p style="color:#d1fae5;font-size:20px;font-weight:800;margin:0;line-height:1.2;">R$ ${fmt(data.receitaLiquida)}</p>
          </div>
        </td>
      </tr>
    </table>

    ${topProdutoSection}

    <!-- CTA -->
    <div style="text-align:center;margin-top:28px;padding-top:24px;border-top:1px solid #1e1e3a;">
      <a
        href="https://foguetim.com.br/dashboard"
        style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#6366f1 100%);color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;"
      >
        Ver relatório completo →
      </a>
    </div>
  `

  return {
    subject: `📊 Resumo da semana — ${periodoLabel} | Foguetim`,
    html:    baseTemplate(content, 'Resumo semanal Foguetim'),
  }
}
