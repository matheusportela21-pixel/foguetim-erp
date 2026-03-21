/**
 * GET /api/admin/agentes/export/zip
 * Gera um ZIP com PDFs individuais dos relatórios filtrados.
 *
 * Query params:
 *   after    — ISO date (default: 30d atrás)
 *   before   — ISO date (default: now)
 *   agentes  — slug[] separados por vírgula
 *   severidade — filtro de severidade_max
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'
// Import jsPDF + autoTable for PDF generation inside ZIP
// (duplicated logic — avoids circular dependency with pdf route)

export const dynamic    = 'force-dynamic'
export const runtime    = 'nodejs'
export const maxDuration = 60

async function buildSimpleReportPdf(report: Record<string, unknown>): Promise<Buffer> {
  const { jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const ag      = report.ai_agents as { nome: string; slug: string; categoria: string } | null
  const achados = (report.achados ?? []) as Array<{ titulo?: string; descricao?: string; severidade?: string; sugestao?: string; modulo_afetado?: string }>

  const SEV_HEX: Record<string, [number, number, number]> = {
    critica: [220, 38,  38 ],
    alta:    [234, 88,  12 ],
    media:   [202, 138, 4  ],
    baixa:   [37,  99,  235],
  }
  function sevColor(sev: string): [number, number, number] {
    return SEV_HEX[(sev ?? '').toLowerCase()] ?? SEV_HEX['baixa']!
  }

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 18

  // Header
  doc.setFillColor(15, 17, 23)
  doc.rect(0, 0, pageW, 26, 'F')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('FOGUETIM ERP', margin, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('RELATÓRIO DE AGENTE DE IA', margin, 19)
  doc.text(new Date(report.created_at as string).toLocaleDateString('pt-BR'), pageW - margin, 19, { align: 'right' })

  let y = 34

  // Info box
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 3, 3, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(ag?.nome ?? 'Agente', margin + 4, y + 8)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`Categoria: ${ag?.categoria ?? '—'}  |  Slug: ${ag?.slug ?? '—'}`, margin + 4, y + 16)
  doc.text(`Tokens: ${Number(report.tokens_input ?? 0) + Number(report.tokens_output ?? 0)}  |  Custo: $${Number(report.custo_usd ?? 0).toFixed(6)}`, margin + 4, y + 22)
  y += 36

  // Resumo
  const [sr, sg, sb] = sevColor(report.severidade_max as string)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(sr, sg, sb)
  doc.text('RESUMO EXECUTIVO', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  const resumoLines = doc.splitTextToSize(String(report.resumo ?? '—'), pageW - margin * 2)
  doc.text(resumoLines, margin, y)
  y += resumoLines.length * 5 + 6

  // Achados
  if (achados.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(`Achados (${achados.length})`, margin, y)
    y += 5
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head:   [['#', 'Severidade', 'Título', 'Módulo', 'Sugestão']],
      body:   achados.map((a, i) => [
        String(i + 1),
        (a.severidade ?? '—').toUpperCase(),
        a.titulo ?? '—',
        a.modulo_afetado ?? '—',
        a.sugestao ?? '—',
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.5, textColor: [40, 40, 40] },
      columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 20 }, 2: { cellWidth: 52 }, 3: { cellWidth: 28 }, 4: { cellWidth: 52 } },
    })
  }

  // Footer
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const h = doc.internal.pageSize.getHeight()
    doc.setFillColor(15, 17, 23)
    doc.rect(0, h - 10, pageW, 10, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Foguetim ERP | foguetim.com.br', margin, h - 3)
    doc.text(`Pág ${p}/${totalPages}`, pageW - margin, h - 3, { align: 'right' })
  }

  return Buffer.from(doc.output('arraybuffer'))
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp       = req.nextUrl.searchParams
  const after    = sp.get('after')    ?? new Date(Date.now() - 30 * 86_400_000).toISOString()
  const before   = sp.get('before')   ?? new Date().toISOString()
  const agentes  = sp.get('agentes')?.split(',').filter(Boolean) ?? []
  const severidade = sp.get('severidade') ?? ''
  const reportIds = sp.get('report_ids')?.split(',').filter(Boolean) ?? []

  const db = supabaseAdmin()

  let query = db
    .from('ai_agent_reports')
    .select('id, resumo, severidade_max, status, achados, custo_usd, tokens_input, tokens_output, tempo_execucao_ms, created_at, ai_agents(nome, slug, categoria)')
    .gte('created_at', after)
    .lte('created_at', before)
    .order('created_at', { ascending: false })
    .limit(50) // safety cap for ZIP size

  if (severidade) query = query.eq('severidade_max', severidade)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let reports = (data ?? []) as Record<string, unknown>[]
  if (agentes.length > 0) {
    reports = reports.filter(r => agentes.includes((r.ai_agents as { slug: string } | null)?.slug ?? ''))
  }
  if (reportIds.length > 0) {
    reports = reports.filter(r => reportIds.includes(String(r.id ?? '')))
  }

  if (reports.length === 0) {
    return NextResponse.json({ error: 'Nenhum relatório encontrado para os filtros' }, { status: 404 })
  }

  // Build ZIP in memory
  const archiver = (await import('archiver')).default
  const { PassThrough } = await import('stream')

  const pass    = new PassThrough()
  const chunks: Buffer[] = []
  pass.on('data', (chunk: Buffer) => chunks.push(chunk))

  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.pipe(pass)

  // Index file
  const indiceLines = reports.map(r => {
    const ag = r.ai_agents as { nome: string } | null
    return `${String(r.created_at).slice(0, 10)} — ${ag?.nome ?? 'Agente'} — ${String(r.severidade_max)} — ${String(r.id).slice(0, 8)}`
  })
  archive.append(indiceLines.join('\n'), { name: 'indice.txt' })

  // PDFs
  for (const report of reports) {
    try {
      const pdf = await buildSimpleReportPdf(report)
      const ag  = report.ai_agents as { slug: string } | null
      const name = `${String(report.created_at).slice(0, 10)}_${ag?.slug ?? 'agente'}_${String(report.id).slice(0, 8)}.pdf`
      archive.append(pdf, { name })
    } catch { /* skip failed report */ }
  }

  await archive.finalize()

  // Wait for PassThrough to finish
  await new Promise<void>(resolve => pass.on('end', resolve))
  const zipBuffer = Buffer.concat(chunks)

  const month = new Date(after).toISOString().slice(0, 7)
  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="foguetim-relatorios-${month}.zip"`,
      'Cache-Control':       'no-store',
    },
  })
}
