import { baseTemplate } from './base'

export interface MonthlyReportEmailData {
  month:          string   // 'YYYY-MM'
  monthLabel:     string   // 'Março 2026'
  score:          number
  total_achados:  number
  criticos:       number
  altos:          number
  custo_usd:      number
  reunioes:       number
  top_riscos:     string[]
  conquistas:     string[]
  report_url:     string
  pdf_url:        string
}

export function monthlyReportTemplate(data: MonthlyReportEmailData): string {
  const scoreColor = data.score >= 80 ? '#22c55e' : data.score >= 60 ? '#f59e0b' : '#ef4444'
  const criticosBadge = data.criticos > 0
    ? `<span style="background:#7f1d1d;color:#fca5a5;padding:2px 8px;border-radius:4px;font-size:12px;">${data.criticos} críticos</span>`
    : ''

  const topRiscos = data.top_riscos.length > 0
    ? data.top_riscos.slice(0, 3).map((r, i) =>
        `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e1e3a;">${i + 1}. ${r}</td></tr>`
      ).join('')
    : '<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Nenhum risco crítico identificado</td></tr>'

  const conquistasList = data.conquistas.length > 0
    ? data.conquistas.slice(0, 3).map(c =>
        `<li style="padding:3px 0;color:#86efac;font-size:13px;">✓ ${c}</li>`
      ).join('')
    : '<li style="color:#64748b;font-size:13px;">—</li>'

  const content = `
    <!-- Título -->
    <h2 style="color:#a78bfa;font-size:20px;font-weight:700;margin:0 0 4px 0;">
      📊 Relatório Mensal
    </h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px 0;">${data.monthLabel}</p>

    <!-- Score de Saúde -->
    <div style="background:#1e1e3a;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:1px;">Score de Saúde</p>
      <p style="color:${scoreColor};font-size:48px;font-weight:800;margin:0;font-family:monospace;">${data.score}</p>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">/100</p>
    </div>

    <!-- KPIs -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="50%" style="padding:4px;">
          <div style="background:#1e1e3a;border-radius:8px;padding:14px;text-align:center;">
            <p style="color:#64748b;font-size:11px;margin:0 0 4px 0;text-transform:uppercase;">Achados</p>
            <p style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0;">${data.total_achados}</p>
            ${criticosBadge ? `<div style="margin-top:4px;">${criticosBadge}</div>` : ''}
          </div>
        </td>
        <td width="50%" style="padding:4px;">
          <div style="background:#1e1e3a;border-radius:8px;padding:14px;text-align:center;">
            <p style="color:#64748b;font-size:11px;margin:0 0 4px 0;text-transform:uppercase;">Custo Total</p>
            <p style="color:#a78bfa;font-size:22px;font-weight:700;margin:0;font-family:monospace;">$${data.custo_usd.toFixed(4)}</p>
            <p style="color:#64748b;font-size:11px;margin:2px 0 0 0;">~R$${(data.custo_usd * 5.85).toFixed(2)}</p>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:4px;">
          <div style="background:#1e1e3a;border-radius:8px;padding:14px;text-align:center;">
            <p style="color:#64748b;font-size:11px;margin:0 0 4px 0;text-transform:uppercase;">Altos</p>
            <p style="color:#fb923c;font-size:22px;font-weight:700;margin:0;">${data.altos}</p>
          </div>
        </td>
        <td width="50%" style="padding:4px;">
          <div style="background:#1e1e3a;border-radius:8px;padding:14px;text-align:center;">
            <p style="color:#64748b;font-size:11px;margin:0 0 4px 0;text-transform:uppercase;">Reuniões</p>
            <p style="color:#34d399;font-size:22px;font-weight:700;margin:0;">${data.reunioes}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top Riscos -->
    <div style="background:#1e1e3a;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="color:#f87171;font-size:13px;font-weight:600;margin:0 0 10px 0;">🔴 Principais Riscos</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${topRiscos}
      </table>
    </div>

    <!-- Conquistas -->
    <div style="background:#1e1e3a;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="color:#4ade80;font-size:13px;font-weight:600;margin:0 0 10px 0;">✅ Conquistas do Mês</p>
      <ul style="margin:0;padding-left:0;list-style:none;">
        ${conquistasList}
      </ul>
    </div>

    <!-- Botões de ação -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:4px;">
          <a href="${data.report_url}" style="display:block;background:#6366f1;color:#ffffff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
            Ver Relatório Completo
          </a>
        </td>
        <td width="50%" style="padding:4px;">
          <a href="${data.pdf_url}" style="display:block;background:#1e1e3a;color:#a78bfa;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;border:1px solid #3730a3;">
            Baixar PDF
          </a>
        </td>
      </tr>
    </table>
  `

  return baseTemplate(content, `Relatório Mensal ${data.monthLabel} — Foguetim ERP`)
}
