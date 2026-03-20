/**
 * GET /api/admin/agentes/export/pdf
 *   ?report_id=XXX    → PDF de relatório individual
 *   ?meeting_id=XXX   → PDF de ata de reunião
 *   ?type=monthly&month=YYYY-MM → PDF relatório mensal consolidado
 *
 * Gerado server-side com jsPDF + jsPDF-AutoTable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'
// jsPDF is a CJS module — dynamic import needed in edge-compatible env
// We use Node runtime (not edge) so direct import works

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Color helpers ────────────────────────────────────────────────────────────

const SEV_HEX: Record<string, [number, number, number]> = {
  critica: [239, 68,  68 ],
  alta:    [249, 115, 22 ],
  media:   [234, 179, 8  ],
  baixa:   [59,  130, 246],
}

function sevColor(sev: string): [number, number, number] {
  return SEV_HEX[(sev ?? '').toLowerCase()] ?? SEV_HEX['baixa']
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

// ── PDF Builder ──────────────────────────────────────────────────────────────

async function buildReportPdf(reportId: string): Promise<ArrayBuffer> {
  const { jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const db = supabaseAdmin()
  const { data: report, error } = await db
    .from('ai_agent_reports')
    .select('*, ai_agents(nome, slug, categoria)')
    .eq('id', reportId)
    .single()

  if (error || !report) throw new Error('Relatório não encontrado')

  const ag      = report.ai_agents as { nome: string; slug: string; categoria: string } | null
  const achados = (report.achados ?? []) as Array<{ titulo?: string; descricao?: string; severidade?: string; sugestao?: string; modulo_afetado?: string }>

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18

  // ── Header ──
  doc.setFillColor(15, 17, 23)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('FOGUETIM ERP', margin, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('RELATÓRIO DE AGENTE DE IA', margin, 20)
  doc.text(fmtDate(new Date().toISOString()), pageW - margin, 20, { align: 'right' })

  let y = 38

  // ── Info box ──
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(margin, y, pageW - margin * 2, 34, 3, 3, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(ag?.nome ?? 'Agente', margin + 5, y + 9)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  const infoLines = [
    `Categoria: ${ag?.categoria ?? '—'}  |  Slug: ${ag?.slug ?? '—'}`,
    `Data: ${fmtDate(report.created_at)}  |  Duração: ${report.tempo_execucao_ms}ms`,
    `Tokens: ${report.tokens_input + report.tokens_output}  |  Custo: $${(report.custo_usd ?? 0).toFixed(6)}`,
  ]
  infoLines.forEach((l, i) => doc.text(l, margin + 5, y + 18 + i * 6))
  y += 42

  // ── Resumo ──
  const [sr, sg, sb] = sevColor(report.severidade_max)
  doc.setFillColor(sr, sg, sb)
  doc.setGState(doc.GState({ opacity: 0.15 }))
  doc.roundedRect(margin, y, pageW - margin * 2, 4 + doc.splitTextToSize(report.resumo ?? '', pageW - margin * 2 - 10).length * 5, 2, 2, 'F')
  doc.setGState(doc.GState({ opacity: 1 }))
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(sr, sg, sb)
  doc.text('RESUMO EXECUTIVO', margin + 5, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  const resumoLines = doc.splitTextToSize(report.resumo ?? '—', pageW - margin * 2 - 10)
  doc.text(resumoLines, margin + 5, y + 13)
  y += 14 + resumoLines.length * 5 + 6

  // ── Achados ──
  if (achados.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(`Achados (${achados.length})`, margin, y)
    y += 6

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Severidade', 'Título', 'Módulo', 'Sugestão']],
      body: achados.map((a, i) => [
        String(i + 1),
        (a.severidade ?? '—').toUpperCase(),
        a.titulo    ?? '—',
        a.modulo_afetado ?? '—',
        a.sugestao  ?? '—',
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 55 },
        3: { cellWidth: 30 },
        4: { cellWidth: 55 },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const sev = (achados[data.row.index]?.severidade ?? '').toLowerCase()
          const [cr, cg, cb] = sevColor(sev)
          doc.setTextColor(cr, cg, cb)
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
        }
      },
    })
  }

  // ── Footer ──
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(15, 17, 23)
    doc.rect(0, pageH - 12, pageW, 12, 'F')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text('Gerado automaticamente pelo Foguetim ERP | foguetim.com.br', margin, pageH - 4)
    doc.text(`Página ${p}/${totalPages}`, pageW - margin, pageH - 4, { align: 'right' })
  }

  return doc.output('arraybuffer') as ArrayBuffer
}

async function buildMeetingPdf(meetingId: string): Promise<ArrayBuffer> {
  const { jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const db = supabaseAdmin()
  const { data: meeting, error } = await db
    .from('ai_agent_meetings')
    .select('*')
    .eq('id', meetingId)
    .single()

  if (error || !meeting) throw new Error('Reunião não encontrada')

  const decisoes     = (meeting.decisoes      ?? []) as Array<{ titulo?: string; severidade?: string; agente_origem?: string; acao_sugerida?: string; status?: string }>
  const passos       = (meeting.proximos_passos ?? []) as Array<{ acao?: string; prazo_sugerido?: string; responsavel?: string; status?: string }>
  const participantes = (meeting.participantes ?? []) as string[]

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18

  // ── Capa ──
  doc.setFillColor(15, 17, 23)
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F')
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FOGUETIM ERP', pageW / 2, 60, { align: 'center' })
  doc.setFontSize(13)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text('ATA DE REUNIÃO DE AGENTES DE IA', pageW / 2, 72, { align: 'center' })
  doc.setFontSize(18)
  doc.setTextColor(167, 139, 250)
  doc.setFont('helvetica', 'bold')
  doc.text(meeting.titulo ?? 'Reunião', pageW / 2, 100, { align: 'center' })
  doc.setFontSize(10)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtDate(meeting.created_at), pageW / 2, 112, { align: 'center' })
  doc.text(`${participantes.length} agentes participaram`, pageW / 2, 120, { align: 'center' })

  // ── Página 2: Conteúdo ──
  doc.addPage()
  let y = margin

  // Resumo Executivo
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Resumo Executivo', margin, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  const resumoLines = doc.splitTextToSize(meeting.resumo_executivo ?? '—', pageW - margin * 2)
  doc.text(resumoLines, margin, y)
  y += resumoLines.length * 5 + 8

  // Top Prioridades
  if (decisoes.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Top Prioridades', margin, y)
    y += 5
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Prioridade', 'Severidade', 'Agente', 'Ação', 'Status']],
      body: decisoes.slice(0, 5).map((d, i) => [
        String(i + 1),
        d.titulo ?? '—',
        (d.severidade ?? '—').toUpperCase(),
        d.agente_origem ?? '—',
        d.acao_sugerida ?? '—',
        d.status ?? 'pendente',
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  }

  // Próximos Passos
  if (passos.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Próximos Passos', margin, y)
    y += 5
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['✓', 'Ação', 'Responsável', 'Prazo', 'Status']],
      body: passos.map(p => [
        p.status === 'concluido' ? '✓' : '○',
        p.acao ?? '—',
        p.responsavel ?? '—',
        p.prazo_sugerido ?? '—',
        p.status ?? 'pendente',
      ]),
      headStyles: { fillColor: [21, 128, 61], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    })
  }

  // Footer on all pages
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFillColor(15, 17, 23)
    doc.rect(0, pageH - 12, pageW, 12, 'F')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text('Gerado automaticamente pelo Foguetim ERP | foguetim.com.br', margin, pageH - 4)
    doc.text(`Página ${p}/${totalPages}`, pageW - margin, pageH - 4, { align: 'right' })
  }

  return doc.output('arraybuffer') as ArrayBuffer
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp         = req.nextUrl.searchParams
  const reportId   = sp.get('report_id')  ?? ''
  const meetingId  = sp.get('meeting_id') ?? ''

  try {
    let pdfBytes: ArrayBuffer
    let filename: string

    if (reportId) {
      pdfBytes = await buildReportPdf(reportId)
      filename  = `relatorio-${reportId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`
    } else if (meetingId) {
      pdfBytes = await buildMeetingPdf(meetingId)
      filename  = `ata-reuniao-${meetingId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`
    } else {
      return NextResponse.json({ error: 'Informe report_id ou meeting_id' }, { status: 400 })
    }

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
