/**
 * Utilitários de geração de PDF para o Foguetim ERP.
 * Funções exportadas: generateMonthlyPDF
 * (generateReportPDF e generateMeetingPDF estão em /api/admin/agentes/export/pdf/route.ts)
 */
export const runtime = 'nodejs'

// ── Color helpers ─────────────────────────────────────────────────────────────

const SEV_HEX: Record<string, [number, number, number]> = {
  critica: [220, 38,  38 ],
  alta:    [234, 88,  12 ],
  media:   [202, 138, 4  ],
  baixa:   [37,  99,  235],
}

function sevColor(sev: string): [number, number, number] {
  return SEV_HEX[(sev ?? '').toLowerCase()] ?? SEV_HEX['baixa']!
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MonthlyStats {
  month:             string
  total_reports:     number
  total_achados:     number
  criticos:          number
  altos:             number
  medios:            number
  baixos:            number
  score_medio:       number
  custo_total_usd:   number
  reunioes_total:    number
  top_agents:        Array<{ nome: string; slug: string; categoria: string; achados: number; custo: number }>
  top_problems:      Array<{ titulo: string; severidade: string; agent: string; count: number }>
  costs_by_category: Array<{ categoria: string; custo: number; pct: number }>
  weeks:             Array<{ label: string; critica: number; alta: number; media: number; baixa: number }>
  resumo_executivo?: string
}

// ── Mini bar helper ───────────────────────────────────────────────────────────

function miniBar(pct: number, width = 40): string {
  const filled = Math.round((pct / 100) * width)
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, width - filled)) + ` ${pct}%`
}

// ── generateMonthlyPDF ────────────────────────────────────────────────────────

export async function generateMonthlyPDF(stats: MonthlyStats): Promise<ArrayBuffer> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const label = monthLabel(stats.month)

  // ── Página 1: Capa ──────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20

  // Background escuro
  doc.setFillColor(13, 13, 26)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Linha de destaque
  doc.setFillColor(99, 102, 241)
  doc.rect(0, pageH * 0.4 - 1, pageW, 2, 'F')

  // Logo
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FOGUETIM ERP', pageW / 2, 70, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('RELATÓRIO MENSAL DE INTELIGÊNCIA', pageW / 2, 82, { align: 'center' })

  // Mês destaque
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(167, 139, 250)
  doc.text(label.charAt(0).toUpperCase() + label.slice(1), pageW / 2, 110, { align: 'center' })

  // KPIs na capa
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225)
  const kpis = [
    `${stats.total_reports} relatórios gerados`,
    `${stats.total_achados} achados (${stats.criticos} críticos, ${stats.altos} altos)`,
    `Score médio: ${stats.score_medio}/100`,
    `Custo total: US$ ${stats.custo_total_usd.toFixed(4)}`,
    `${stats.reunioes_total} ata(s) de reunião`,
  ]
  kpis.forEach((k, i) => doc.text(k, pageW / 2, 130 + i * 9, { align: 'center' }))

  // Footer capa
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(`Gerado em ${fmtDate(new Date().toISOString())}`, pageW / 2, pageH - 12, { align: 'center' })

  // ── Página 2: Resumo Executivo + Score + Achados ────────────────────────────
  doc.addPage()
  doc.setFillColor(13, 13, 26)
  doc.rect(0, 0, pageW, pageH, 'F')

  let y = margin

  // Header
  doc.setFillColor(18, 18, 43)
  doc.rect(0, 0, pageW, 14, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FOGUETIM ERP', margin, 9)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(`Relatório Mensal — ${label}`, pageW - margin, 9, { align: 'right' })
  y = 24

  // Resumo executivo
  if (stats.resumo_executivo) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(167, 139, 250)
    doc.text('Resumo Executivo', margin, y)
    y += 6

    doc.setFillColor(30, 27, 75)
    const resumoLines = doc.splitTextToSize(stats.resumo_executivo, pageW - margin * 2 - 10)
    const boxH = resumoLines.length * 5 + 12
    doc.roundedRect(margin, y, pageW - margin * 2, boxH, 3, 3, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(203, 213, 225)
    doc.text(resumoLines, margin + 5, y + 7)
    y += boxH + 8
  }

  // Score + achados por severidade (lado a lado)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Métricas do Mês', margin, y)
  y += 5

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de relatórios',   String(stats.total_reports)],
      ['Achados críticos',      String(stats.criticos)],
      ['Achados altos',         String(stats.altos)],
      ['Achados médios',        String(stats.medios)],
      ['Achados baixos',        String(stats.baixos)],
      ['Score médio de saúde',  `${stats.score_medio}/100`],
      ['Custo total USD',       `$${stats.custo_total_usd.toFixed(6)}`],
      ['Reuniões realizadas',   String(stats.reunioes_total)],
    ],
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [203, 213, 225], fillColor: [18, 18, 43] },
    alternateRowStyles: { fillColor: [24, 24, 52] },
    columnStyles: { 0: { fontStyle: 'bold' } },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const labels: Record<string, [number, number, number]> = {
          'Achados críticos': [220, 38, 38],
          'Achados altos':    [234, 88, 12],
          'Achados médios':   [202, 138, 4],
          'Achados baixos':   [37, 99, 235],
          'Score médio de saúde': [34, 197, 94],
        }
        const cell = data.cell.raw as string
        if (labels[cell]) {
          const [r, g, b] = labels[cell]!
          doc.setTextColor(r, g, b)
        }
      }
    },
  })

  // ── Página 3: Métricas Visuais ───────────────────────────────────────────────
  doc.addPage()
  doc.setFillColor(13, 13, 26)
  doc.rect(0, 0, pageW, pageH, 'F')
  doc.setFillColor(18, 18, 43)
  doc.rect(0, 0, pageW, 14, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FOGUETIM ERP', margin, 9)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text('Métricas Visuais', pageW - margin, 9, { align: 'right' })

  y = 24

  // Achados por semana
  if (stats.weeks.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(167, 139, 250)
    doc.text('Achados por Semana', margin, y)
    y += 5
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Semana', 'Críticos', 'Altos', 'Médios', 'Baixos', 'Total']],
      body: stats.weeks.map(w => [
        w.label,
        String(w.critica),
        String(w.alta),
        String(w.media),
        String(w.baixa),
        String(w.critica + w.alta + w.media + w.baixa),
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [203, 213, 225], fillColor: [18, 18, 43] },
      alternateRowStyles: { fillColor: [24, 24, 52] },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Custo por categoria
  if (stats.costs_by_category.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(167, 139, 250)
    doc.text('Custo por Grupo de Agentes', margin, y)
    y += 5
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Categoria', 'Custo USD', 'Distribuição']],
      body: stats.costs_by_category.map(c => [
        c.categoria,
        `$${c.custo.toFixed(6)}`,
        miniBar(c.pct),
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7, textColor: [203, 213, 225], fillColor: [18, 18, 43], font: 'courier' },
      alternateRowStyles: { fillColor: [24, 24, 52] },
      columnStyles: { 2: { font: 'courier', fontSize: 7 } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Top agentes
  if (stats.top_agents.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(167, 139, 250)
    doc.text('Top Agentes por Achados', margin, y)
    y += 5
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Agente', 'Categoria', 'Achados', 'Custo USD']],
      body: stats.top_agents.slice(0, 8).map((a, i) => [
        `${i + 1}. ${a.nome}`,
        a.categoria,
        String(a.achados),
        `$${a.custo.toFixed(6)}`,
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [203, 213, 225], fillColor: [18, 18, 43] },
      alternateRowStyles: { fillColor: [24, 24, 52] },
    })
  }

  // Top problemas — nova página se necessário
  if (stats.top_problems.length > 0) {
    doc.addPage()
    doc.setFillColor(13, 13, 26)
    doc.rect(0, 0, pageW, pageH, 'F')
    doc.setFillColor(18, 18, 43)
    doc.rect(0, 0, pageW, 14, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('FOGUETIM ERP', margin, 9)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text('Top Problemas', pageW - margin, 9, { align: 'right' })

    y = 24
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(167, 139, 250)
    doc.text('Problemas Mais Críticos do Mês', margin, y)
    y += 5

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Problema', 'Agente', 'Severidade', 'Ocorrências']],
      body: stats.top_problems.slice(0, 10).map((p, i) => [
        String(i + 1),
        p.titulo,
        p.agent,
        p.severidade.toUpperCase(),
        String(p.count),
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [203, 213, 225], fillColor: [18, 18, 43] },
      alternateRowStyles: { fillColor: [24, 24, 52] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 70 }, 3: { cellWidth: 24 }, 4: { cellWidth: 22 } },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const sev = (stats.top_problems[data.row.index]?.severidade ?? '').toLowerCase()
          const [r, g, b] = sevColor(sev)
          doc.setTextColor(r, g, b)
          doc.setFont('helvetica', 'bold')
        }
      },
    })
  }

  // ── Footer em todas as páginas ───────────────────────────────────────────────
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const h = doc.internal.pageSize.getHeight()
    if (p > 1) {
      doc.setFillColor(13, 13, 26)
      doc.rect(0, h - 10, pageW, 10, 'F')
      doc.setDrawColor(30, 41, 59)
      doc.line(margin, h - 10, pageW - margin, h - 10)
      doc.setFontSize(7)
      doc.setTextColor(71, 85, 105)
      doc.setFont('helvetica', 'normal')
      doc.text('Gerado automaticamente pelo Foguetim ERP | foguetim.com.br', margin, h - 3)
      doc.text(`Página ${p}/${totalPages}`, pageW - margin, h - 3, { align: 'right' })
    }
  }

  return doc.output('arraybuffer') as ArrayBuffer
}
