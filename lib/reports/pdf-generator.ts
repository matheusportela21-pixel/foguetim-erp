/**
 * PDF Report Generator — jspdf + jspdf-autotable
 * Runs entirely client-side (browser only).
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return iso }
}

function nowStr() {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Shared header / footer ─────────────────────────────────────────────────

async function buildBase(title: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header bar
  doc.setFillColor(13, 15, 26)
  doc.rect(0, 0, 210, 20, 'F')

  // Logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('Foguetim ERP', 14, 13)

  // Title
  doc.setFontSize(9)
  doc.setTextColor(180, 180, 220)
  doc.text(title, 14, 19)

  // Generated at
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 160)
  doc.text(`Gerado em ${nowStr()}`, 196, 13, { align: 'right' })

  return doc
}

function addFooter(doc: Awaited<ReturnType<typeof buildBase>>, pageCount: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 160)
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(`Página ${i} de ${pageCount}`, 196, 292, { align: 'right' })
    doc.text('Foguetim ERP — Confidencial', 14, 292)
  }
}

// ── Shared autoTable options ────────────────────────────────────────────────

function tableStyles() {
  return {
    headStyles: {
      fillColor: [30, 20, 60] as [number, number, number],
      textColor: [200, 180, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 8,
    },
    bodyStyles: {
      textColor: [220, 220, 240] as [number, number, number],
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [18, 18, 32] as [number, number, number],
    },
    styles: {
      fillColor: [13, 15, 26] as [number, number, number],
      lineColor: [40, 40, 70] as [number, number, number],
      lineWidth: 0.1,
    },
    margin: { left: 14, right: 14 },
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. DRE Report
// ══════════════════════════════════════════════════════════════════════════════

export interface DREReportData {
  periodStart: string
  periodEnd: string
  revenue:    { ml: number; shopee: number; magalu: number; total: number }
  deductions: { commissions_ml: number; commissions_shopee: number; commissions_magalu: number; shipping: number; taxes: number; total: number }
  netRevenue:  number
  cmv:         { total: number; coveragePct: number }
  grossProfit: number; grossMarginPct: number
  operationalExpenses: number
  operationalProfit: number; operationalMarginPct: number
  netProfit: number; netMarginPct: number
  ordersCount: number; ticketMedio: number
  productProfitability?: { title: string; revenue: number; profit: number; marginPct: number; quantity: number }[]
}

export async function generateDREPDF(data: DREReportData) {
  const doc = await buildBase(`DRE — ${fmtDate(data.periodStart)} a ${fmtDate(data.periodEnd)}`)
  const autoTable = (await import('jspdf-autotable')).default

  // Period subtitle
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(200, 180, 255)
  doc.text('Demonstrativo de Resultados do Exercício', 14, 29)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 190)
  doc.text(`Período: ${fmtDate(data.periodStart)} — ${fmtDate(data.periodEnd)}  |  Pedidos: ${data.ordersCount}  |  Ticket médio: ${fmtBRL(data.ticketMedio)}`, 14, 35)

  // KPI boxes
  const kpis = [
    { label: 'Receita Bruta',   value: fmtBRL(data.revenue.total),   color: [80, 200, 120] as [number, number, number] },
    { label: 'Lucro Bruto',     value: fmtBRL(data.grossProfit),      color: data.grossProfit >= 0 ? [80, 200, 120] as [number, number, number] : [255, 80, 100] as [number, number, number] },
    { label: 'Lucro Líquido',   value: fmtBRL(data.netProfit),        color: data.netProfit >= 0 ? [80, 200, 120] as [number, number, number] : [255, 80, 100] as [number, number, number] },
    { label: 'Margem Líquida',  value: `${data.netMarginPct.toFixed(1)}%`, color: data.netMarginPct >= 0 ? [80, 200, 120] as [number, number, number] : [255, 80, 100] as [number, number, number] },
  ]
  kpis.forEach((k, i) => {
    const x = 14 + i * 46
    doc.setFillColor(20, 18, 40)
    doc.roundedRect(x, 39, 43, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140, 140, 180)
    doc.text(k.label, x + 3, 46)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...k.color)
    doc.text(k.value, x + 3, 53)
  })

  // DRE table
  const rows: (string | number)[][] = [
    ['(+) Receita Bruta ML',         fmtBRL(data.revenue.ml)],
    ['(+) Receita Bruta Shopee',      fmtBRL(data.revenue.shopee)],
    ['(+) Receita Bruta Magalu',      fmtBRL(data.revenue.magalu)],
    ['(=) Receita Bruta Total',       fmtBRL(data.revenue.total)],
    ['(-) Comissões ML',              fmtBRL(-data.deductions.commissions_ml)],
    ['(-) Comissões Shopee',          fmtBRL(-data.deductions.commissions_shopee)],
    ['(-) Comissões Magalu',          fmtBRL(-data.deductions.commissions_magalu)],
    ['(-) Fretes',                    fmtBRL(-data.deductions.shipping)],
    ['(-) Impostos',                  fmtBRL(-data.deductions.taxes)],
    ['(=) Receita Líquida',           fmtBRL(data.netRevenue)],
    ['(-) CMV',                       fmtBRL(-data.cmv.total)],
    [`(=) Lucro Bruto (${data.grossMarginPct.toFixed(1)}%)`, fmtBRL(data.grossProfit)],
    ['(-) Despesas Operacionais',     fmtBRL(-data.operationalExpenses)],
    [`(=) Resultado Operacional (${data.operationalMarginPct.toFixed(1)}%)`, fmtBRL(data.operationalProfit)],
    [`(=) Lucro Líquido (${data.netMarginPct.toFixed(1)}%)`, fmtBRL(data.netProfit)],
  ]

  autoTable(doc, {
    startY: 62,
    head: [['Descrição', 'Valor']],
    body: rows,
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      const content = String(data.cell.raw ?? '')
      if (content.startsWith('(=)')) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [200, 180, 255]
      }
    },
    ...tableStyles(),
  })

  // Product profitability
  if (data.productProfitability?.length) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(200, 180, 255)
    doc.text('Rentabilidade por Produto', 14, finalY)

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Produto', 'Qtd', 'Receita', 'Lucro', 'Margem']],
      body: data.productProfitability.slice(0, 20).map(p => [
        p.title.length > 45 ? p.title.slice(0, 42) + '...' : p.title,
        p.quantity,
        fmtBRL(p.revenue),
        fmtBRL(p.profit),
        `${p.marginPct.toFixed(1)}%`,
      ]),
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      ...tableStyles(),
    })
  }

  addFooter(doc, doc.getNumberOfPages())
  doc.save(`DRE_${data.periodStart ?? 'relatorio'}.pdf`)
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Estoque Report
// ══════════════════════════════════════════════════════════════════════════════

export interface EstoqueReportItem {
  title: string
  sku?: string
  available_quantity: number
  level: string
  listing_id?: string
  permalink?: string
}

export interface EstoqueReportData {
  items: EstoqueReportItem[]
  totals: { total: number; ruptura: number; alerta: number; normal: number; excesso: number }
  generatedAt?: string
}

export async function generateEstoquePDF(data: EstoqueReportData) {
  const doc = await buildBase('Relatório de Estoque')
  const autoTable = (await import('jspdf-autotable')).default

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(200, 180, 255)
  doc.text('Posição de Estoque', 14, 29)

  // KPI boxes
  const kpis = [
    { label: 'Total',   value: String(data.totals.total),   color: [150, 150, 200] as [number, number, number] },
    { label: 'Ruptura', value: String(data.totals.ruptura), color: [255, 80, 100]  as [number, number, number] },
    { label: 'Alerta',  value: String(data.totals.alerta),  color: [255, 180, 60]  as [number, number, number] },
    { label: 'Normal',  value: String(data.totals.normal),  color: [80, 200, 120]  as [number, number, number] },
  ]
  kpis.forEach((k, i) => {
    const x = 14 + i * 46
    doc.setFillColor(20, 18, 40)
    doc.roundedRect(x, 33, 43, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140, 140, 180)
    doc.text(k.label, x + 3, 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...k.color)
    doc.text(k.value, x + 3, 46)
  })

  const levelLabel: Record<string, string> = {
    ruptura: 'Ruptura', alerta: 'Alerta', normal: 'Normal', excesso: 'Excesso',
  }

  autoTable(doc, {
    startY: 54,
    head: [['Produto', 'SKU', 'Estoque', 'Status']],
    body: data.items.map(i => [
      i.title.length > 55 ? i.title.slice(0, 52) + '...' : i.title,
      i.sku ?? i.listing_id ?? '—',
      i.available_quantity,
      levelLabel[i.level] ?? i.level,
    ]),
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'center' },
    },
    didParseCell: (data) => {
      const val = String(data.cell.raw ?? '')
      if (data.column.index === 3) {
        if (val === 'Ruptura') data.cell.styles.textColor = [255, 100, 100]
        else if (val === 'Alerta') data.cell.styles.textColor = [255, 180, 60]
        else if (val === 'Normal') data.cell.styles.textColor = [80, 200, 120]
        else if (val === 'Excesso') data.cell.styles.textColor = [100, 160, 255]
      }
    },
    ...tableStyles(),
  })

  addFooter(doc, doc.getNumberOfPages())
  doc.save(`Estoque_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. Pedidos Report
// ══════════════════════════════════════════════════════════════════════════════

export interface PedidoReportItem {
  id: string | number
  date: string
  buyer: string
  items: string
  status: string
  marketplace: string
  total: number
}

export interface PedidosReportData {
  pedidos: PedidoReportItem[]
  totals: { count: number; receita: number; ticket_medio: number }
  period?: string
}

export async function generatePedidosPDF(data: PedidosReportData) {
  const doc = await buildBase('Relatório de Pedidos')
  const autoTable = (await import('jspdf-autotable')).default

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(200, 180, 255)
  doc.text('Pedidos', 14, 29)
  if (data.period) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140, 140, 180)
    doc.text(data.period, 14, 35)
  }

  const kpis = [
    { label: 'Pedidos',      value: String(data.totals.count),          color: [150, 150, 200] as [number, number, number] },
    { label: 'Receita',      value: fmtBRL(data.totals.receita),        color: [80, 200, 120]  as [number, number, number] },
    { label: 'Ticket Médio', value: fmtBRL(data.totals.ticket_medio),   color: [100, 160, 255] as [number, number, number] },
  ]
  const startY = data.period ? 39 : 33
  kpis.forEach((k, i) => {
    const x = 14 + i * 62
    doc.setFillColor(20, 18, 40)
    doc.roundedRect(x, startY, 59, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140, 140, 180)
    doc.text(k.label, x + 3, startY + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...k.color)
    doc.text(k.value, x + 3, startY + 13)
  })

  autoTable(doc, {
    startY: startY + 22,
    head: [['#', 'Data', 'Comprador', 'Itens', 'Canal', 'Status', 'Total']],
    body: data.pedidos.map(p => [
      String(p.id).slice(-8),
      fmtDate(p.date),
      p.buyer.length > 20 ? p.buyer.slice(0, 18) + '..' : p.buyer,
      p.items.length > 30 ? p.items.slice(0, 28) + '..' : p.items,
      p.marketplace,
      p.status,
      fmtBRL(p.total),
    ]),
    columnStyles: { 6: { halign: 'right' } },
    ...tableStyles(),
  })

  addFooter(doc, doc.getNumberOfPages())
  doc.save(`Pedidos_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. Financeiro / Vendas Report
// ══════════════════════════════════════════════════════════════════════════════

export interface FinanceiroReportData {
  period?: string
  receita_bruta: number
  taxas: number
  receita_liquida: number
  pedidos: number
  ticket_medio: number
  periods?: { label: string; receita_bruta: number; taxas: number; receita_liquida: number }[]
}

export async function generateFinanceiroPDF(data: FinanceiroReportData) {
  const doc = await buildBase('Relatório Financeiro')
  const autoTable = (await import('jspdf-autotable')).default

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(200, 180, 255)
  doc.text('Resumo Financeiro', 14, 29)
  if (data.period) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140, 140, 180)
    doc.text(data.period, 14, 35)
  }

  const kpis = [
    { label: 'Receita Bruta',    value: fmtBRL(data.receita_bruta),    color: [80, 200, 120]  as [number, number, number] },
    { label: 'Taxas',            value: fmtBRL(data.taxas),            color: [255, 100, 100] as [number, number, number] },
    { label: 'Receita Líquida',  value: fmtBRL(data.receita_liquida),  color: [100, 160, 255] as [number, number, number] },
    { label: 'Pedidos',          value: String(data.pedidos),           color: [150, 150, 200] as [number, number, number] },
    { label: 'Ticket Médio',     value: fmtBRL(data.ticket_medio),     color: [200, 180, 255] as [number, number, number] },
  ]
  const startY = data.period ? 39 : 33
  kpis.forEach((k, i) => {
    const col  = i % 3
    const row  = Math.floor(i / 3)
    const x = 14 + col * 62
    const y = startY + row * 20
    doc.setFillColor(20, 18, 40)
    doc.roundedRect(x, y, 59, 16, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140, 140, 180)
    doc.text(k.label, x + 3, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...k.color)
    doc.text(k.value, x + 3, y + 13)
  })

  const tableStartY = startY + (kpis.length > 3 ? 44 : 22)

  // Summary table
  autoTable(doc, {
    startY: tableStartY,
    head: [['Item', 'Valor']],
    body: [
      ['Receita Bruta Total', fmtBRL(data.receita_bruta)],
      ['(-) Taxas e Comissões', fmtBRL(-data.taxas)],
      ['(=) Receita Líquida', fmtBRL(data.receita_liquida)],
      ['Total de Pedidos', String(data.pedidos)],
      ['Ticket Médio', fmtBRL(data.ticket_medio)],
    ],
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      const content = String(data.cell.raw ?? '')
      if (content.startsWith('(=)')) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [200, 180, 255]
      }
    },
    ...tableStyles(),
  })

  // Per-period breakdown if available
  if (data.periods?.length) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(200, 180, 255)
    doc.text('Evolução por Período', 14, finalY)

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Período', 'Receita Bruta', 'Taxas', 'Receita Líquida']],
      body: data.periods.map(p => [
        p.label,
        fmtBRL(p.receita_bruta),
        fmtBRL(p.taxas),
        fmtBRL(p.receita_liquida),
      ]),
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      ...tableStyles(),
    })
  }

  addFooter(doc, doc.getNumberOfPages())
  doc.save(`Financeiro_${new Date().toISOString().slice(0, 10)}.pdf`)
}
