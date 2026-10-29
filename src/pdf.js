import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SHEETS, totalOf, RES, RK, tickerOf, monthOf, expenseBreakdown } from './data.js'
import { nowYM } from './period.js'

const money = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PDF_COLORS = {
  ink: [31, 41, 55],
  muted: [107, 114, 128],
  brand: [79, 70, 229],
  line: [229, 231, 235],
  stripe: [248, 250, 252],
}
const tableStyles = {
  theme: 'plain',
  styles: { font: 'helvetica', fontSize: 8, textColor: PDF_COLORS.ink, lineColor: PDF_COLORS.line, lineWidth: 0.2, cellPadding: 3.5, overflow: 'linebreak', valign: 'middle' },
  headStyles: { fillColor: [35, 40, 62], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: [35, 40, 62], cellPadding: 4.5 },
  alternateRowStyles: { fillColor: PDF_COLORS.stripe },
  margin: { left: 14, right: 14, bottom: 16 },
}
const datePt = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value ?? '')
}
const tableValue = (value, type, key) => {
  if (value == null || value === '') return ''
  if (key === 'VAR_PP') return `${(Number(value) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  if (type === 'date') return datePt(value)
  if (type === 'money' || type === 'calcm') return money(value)
  if (type === 'num') return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 4 })
  if (typeof value === 'number') return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  return String(value)
}
function sectionHeading(doc, eyebrow, title, subtitle) {
  doc.setFillColor(...PDF_COLORS.brand)
  doc.rect(14, 12, 2, 13, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.brand)
  doc.text(eyebrow.toUpperCase(), 20, 15)
  doc.setFontSize(16); doc.setTextColor(...PDF_COLORS.ink)
  doc.text(title, 20, 22)
  if (subtitle) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.muted); doc.text(subtitle, 20, 28) }
}
const aggregate = (rows, key, val) => {
  const out = new Map()
  rows.forEach((r) => {
    const name = (typeof key === 'function' ? key(r) : r[key]) || 'N/A'
    out.set(name, (out.get(name) || 0) + (Number(typeof val === 'function' ? val(r) : r[val]) || 0))
  })
  return [...out].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function drawChart(doc, title, rows, x, y, w, h, color = [99, 102, 241]) {
  doc.setFillColor(255, 255, 255); doc.setDrawColor(...PDF_COLORS.line); doc.setLineWidth(0.35)
  doc.roundedRect(x, y, w, h, 3, 3, 'FD')
  doc.setFillColor(...color); doc.roundedRect(x + 5, y + 5, 2, 5, 1, 1, 'F')
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_COLORS.ink); doc.setFontSize(9)
  doc.text(title, x + 10, y + 9)
  if (!rows.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.muted); doc.text('Sem dados neste período', x + 10, y + 22); return
  }
  const items = rows.slice(0, 6), max = Math.max(...items.map((r) => Math.abs(r.value)), 1)
  const labelW = Math.min(43, w * 0.34), valueW = 27, barW = w - labelW - valueW - 18
  const rowH = Math.min(8, (h - 20) / items.length)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  items.forEach((r, i) => {
    const yy = y + 16 + i * rowH
    const label = String(r.name).length > 22 ? String(r.name).slice(0, 20) + '…' : String(r.name)
    doc.setTextColor(...PDF_COLORS.muted); doc.text(label, x + 5, yy + 3)
    doc.setFillColor(237, 240, 245); doc.roundedRect(x + 5 + labelW, yy, barW, 3.2, 1, 1, 'F')
    doc.setFillColor(...color); doc.roundedRect(x + 5 + labelW, yy, Math.max(0.8, barW * Math.abs(r.value) / max), 3.2, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_COLORS.ink); doc.text(money(r.value), x + w - 5, yy + 3, { align: 'right' }); doc.setFont('helvetica', 'normal')
  })
}

function addCharts(doc, data, periodo) {
  const carteira = data.carteira || [], ext = data.extrato || [], dsp = data.despesas || [], res = data.resgates || []
  const valor = 'VALOR DA APLICAÇÃO'
  const months = new Map()
  ext.forEach((r) => {
    const m = monthOf(r['DATA DE RECEBIMENTO'])
    if (!m || !['Proventos', 'Rendimentos'].includes(r.CATEGORIA)) return
    const entry = months.get(m) || { Proventos: 0, Rendimentos: 0 }
    entry[r.CATEGORIA] += Number(r[valor]) || 0; months.set(m, entry)
  })
  const cats = aggregate(ext, 'CATEGORIA', valor)
  const resTotal = res.reduce((s, r) => s + (Number(r[RK]) || 0), 0)
  if (resTotal) cats.push({ name: 'Resgates', value: resTotal })
  const flow = new Map()
  ext.filter((r) => r.CATEGORIA !== 'Venda de Patrimônio').forEach((r) => {
    const m = monthOf(r['DATA DE RECEBIMENTO']); if (m) flow.set(m, { ...(flow.get(m) || {}), Entradas: (flow.get(m)?.Entradas || 0) + (Number(r[valor]) || 0) })
  })
  res.forEach((r) => { const m = monthOf(r.DATA_RESGATE); if (m) flow.set(m, { ...(flow.get(m) || {}), Entradas: (flow.get(m)?.Entradas || 0) + (Number(r[RK]) || 0) }) })
  dsp.forEach((r) => { const m = monthOf(r.DATA); if (m) flow.set(m, { ...(flow.get(m) || {}), Despesas: (flow.get(m)?.Despesas || 0) + totalOf(r) }) })
  const despesasConta = aggregate(dsp.map((r) => ({ conta: r.TIPO_CONTA, total: totalOf(r) })), 'conta', 'total').slice(0, 6)
  const charts = [
    ['Alocação por tipo de investimento', aggregate(carteira, 'TIPO_INV', 'TOTAL_ATUAL')],
    ['Patrimônio por banco', aggregate(carteira, 'BANCO', 'TOTAL_ATUAL')],
    ['Proventos por mês', [...months].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([name, v]) => ({ name: name.slice(5) + '/' + name.slice(2, 4), value: v.Proventos + v.Rendimentos }))],
    ['Proventos por papel (top 6)', aggregate(ext.filter((r) => r.CATEGORIA === 'Proventos'), (r) => tickerOf(r) || 'Outros', valor)],
    ['Entradas por categoria', cats],
    ['Saldo mensal (entradas − despesas)', [...flow].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([name, v]) => ({ name: name.slice(5) + '/' + name.slice(2, 4), value: (v.Entradas || 0) - (v.Despesas || 0) }))],
    ['Despesas por grupo', despesasConta],
    ['Despesas por mês', aggregate(dsp.map((r) => ({ mes: monthOf(r.DATA), total: totalOf(r) })), 'mes', 'total').sort((a, b) => a.name.localeCompare(b.name)).slice(-6)],
  ]
  for (let p = 0; p < 2; p++) {
    doc.addPage()
    sectionHeading(doc, `Análise visual · ${p + 1}/2`, 'Indicadores do período', `Período: ${periodo || 'Todo o período'}`)
    const positions = [[14, 32], [155, 32], [14, 112], [155, 112]]
    charts.slice(p * 4, p * 4 + 4).forEach(([title, rows], i) => drawChart(doc, title, rows, ...positions[i], 128, 80, title.includes('Despesa') ? [239, 68, 68] : [99, 102, 241]))
  }
}

export function exportPdf(data, resumo, periodo, indicadores = {}) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFillColor(35, 40, 62); doc.rect(0, 0, pageWidth, 62, 'F')
  doc.setFillColor(...PDF_COLORS.brand); doc.rect(0, 0, pageWidth, 3, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(190, 194, 214)
  doc.text('FYNN CONTROL   /   RELATÓRIO FINANCEIRO', 14, 17)
  doc.setFontSize(24); doc.setTextColor(255, 255, 255)
  doc.text('Visão geral da carteira', 14, 33)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(210, 213, 226)
  doc.text(`Período: ${periodo || 'Todo o período'}`, 14, 42)
  doc.setFontSize(8); doc.setTextColor(190, 194, 214)
  doc.text('Documento criado em', pageWidth - 14, 20, { align: 'right' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255)
  doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - 14, 29, { align: 'right' })
  const cards = resumo.slice(0, 4)
  const gap = 5, cardW = (pageWidth - 28 - gap * 3) / 4, cardY = 52, cardH = 31
  cards.forEach(([label, value, tone], i) => {
    const x = 14 + i * (cardW + gap)
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...PDF_COLORS.line); doc.roundedRect(x, cardY, cardW, cardH, 2.5, 2.5, 'FD')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.muted); doc.text(String(label), x + 5, cardY + 10)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    const positive = String(tone || '').includes('pos'), negative = String(tone || '').includes('neg')
    doc.setTextColor(...(positive ? [5, 150, 105] : negative ? [220, 38, 38] : PDF_COLORS.ink))
    doc.text(String(value), x + 5, cardY + 22)
  })
  if (resumo.length > 4) {
    autoTable(doc, {
      ...tableStyles, startY: 93,
      head: [['Outros indicadores', 'Valor']], body: resumo.slice(4).map(([label, value]) => [label, value]),
      tableWidth: 150,
      columnStyles: { 0: { cellWidth: 75, fontStyle: 'bold' }, 1: { halign: 'right', fontStyle: 'bold' } },
      styles: { ...tableStyles.styles, fontSize: 8, cellPadding: 3 },
    })
  }
  const cdi = indicadores.cdi
  const selic = indicadores.selic
  const cdiX = 174, cdiY = 93, cdiW = pageWidth - cdiX - 14
  doc.setFillColor(255, 255, 255); doc.setDrawColor(...PDF_COLORS.line)
  doc.roundedRect(cdiX, cdiY, cdiW, 49, 3, 3, 'FD')
  doc.setFillColor(...PDF_COLORS.brand); doc.roundedRect(cdiX + 6, cdiY + 7, 2, 6, 1, 1, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.ink)
  doc.text('Taxas de referência', cdiX + 12, cdiY + 12)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...PDF_COLORS.muted)
  doc.text('CDI anualizado', cdiX + 6, cdiY + 22)
  doc.text('Meta Selic · Copom', cdiX + 60, cdiY + 22)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...PDF_COLORS.brand)
  doc.text(cdi ? `${cdi.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—', cdiX + 6, cdiY + 33)
  doc.text(selic ? `${selic.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—', cdiX + 60, cdiY + 33)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...PDF_COLORS.muted)
  doc.text(cdi ? `${cdi.date} · BCB SGS 4389` : 'Sem cotação', cdiX + 6, cdiY + 41)
  doc.text(selic ? `${selic.date} · BCB SGS 432` : 'Sem cotação', cdiX + 60, cdiY + 41)
  doc.text('Taxas anuais; datas correspondem às últimas observações disponíveis.', cdiX + 6, cdiY + 46)
  addCharts(doc, data, periodo)
  for (const k of ['carteira', 'extrato']) {
    const cols = SHEETS[k].cols.map(([c]) => c)
    const labels = SHEETS[k].cols.map(([c, , l]) => l ?? c)
    doc.addPage()
    sectionHeading(doc, 'Dados detalhados', SHEETS[k].name, `${data[k].length.toLocaleString('pt-BR')} registros`)
    const definitions = SHEETS[k].cols.map(([, type]) => type)
    autoTable(doc, {
      ...tableStyles,
      startY: 34,
      head: [labels],
      body: data[k].map((r) => cols.map((c, i) => tableValue(r[c], definitions[i], c))),
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2.5 },
      columnStyles: Object.fromEntries(definitions.map((type, i) => [i, type === 'money' || type === 'calcm' || type === 'num' ? { halign: 'right' } : {}])),
    })
  }
  if (data.despesas?.length) {
    doc.addPage()
    const currentMonth = nowYM()
    const futuras = data.despesas.filter((r) => monthOf(r.DATA) > currentMonth)
    sectionHeading(doc, 'Dados detalhados', 'Despesas', `${data.despesas.length.toLocaleString('pt-BR')} registros · ${futuras.length} contas futuras`)
    autoTable(doc, {
      ...tableStyles,
      startY: 34,
      head: [['Mês', 'Grupo', 'Despesas / parcelas', 'Previsto', 'Pago', 'Pendente']],
      body: data.despesas.map((r) => {
        const futuro = monthOf(r.DATA) > currentMonth
        const previsto = totalOf(r)
        const pago = r.ITENS.reduce((sum, item) => {
          const valor = Number(item.VALOR) || 0
          return sum + (item.PARCELAMENTO ? Math.min(valor, Number(item.PARCELAMENTO.valorPago) || 0) : futuro ? 0 : valor)
        }, 0)
        const itens = r.ITENS.map((item) => {
          const parcela = item.PARCELAMENTO
          const baixadaEm = parcela?.dataPagamento ? `; baixada em ${datePt(parcela.dataPagamento)}` : ''
          const sufixo = parcela ? ` (${parcela.numero}/${parcela.quantidade}; pago ${money(parcela.valorPago)}${baixadaEm})` : ''
          return `${item.NOME || '-'}: ${money(item.VALOR)}${sufixo}`
        }).join(' · ')
        return [`${datePt(r.DATA).slice(3)}${futuro ? ' · prevista' : ''}`, r.TIPO_CONTA, itens, money(previsto), money(pago), money(Math.max(0, previsto - pago))]
      }),
      columnStyles: { 0: { cellWidth: 27 }, 1: { cellWidth: 38 }, 3: { halign: 'right', cellWidth: 31 }, 4: { halign: 'right', cellWidth: 29 }, 5: { halign: 'right', cellWidth: 31, fontStyle: 'bold' } },
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2.5 },
    })
    const grupos = expenseBreakdown(data.despesas)
    const totalDespesas = grupos.reduce((s, group) => s + group.total, 0)
    const groupHeaderRows = new Set()
    let rowIndex = 0
    grupos.forEach((group) => {
      groupHeaderRows.add(rowIndex)
      rowIndex += group.items.length + 1
    })
    let breakdownStart = doc.lastAutoTable.finalY + 10
    let breakdownHasHeading = false
    if (breakdownStart > doc.internal.pageSize.getHeight() - 35) {
      doc.addPage()
      sectionHeading(doc, 'Despesas', 'Composição por grupo', 'Participação de cada grupo e despesa no total')
      breakdownStart = 34
      breakdownHasHeading = true
    }
    if (!breakdownHasHeading) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      doc.setTextColor(...PDF_COLORS.ink)
      doc.text('Detalhamento percentual por grupo e despesa', 14, breakdownStart)
    }
    autoTable(doc, {
      startY: breakdownStart + 4,
      head: [['Grupo / despesa', 'Total', '% do grupo', '% das despesas']],
      body: grupos.flatMap((group) => [
        [
          group.name,
          money(group.total),
          '100,00%',
          totalDespesas ? (group.total / totalDespesas * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '—',
        ],
        ...group.items.map((item) => [
          `   ${item.name}`,
          money(item.total),
          group.total ? (item.total / group.total * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '—',
          totalDespesas ? (item.total / totalDespesas * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '—',
        ]),
      ]),
      ...tableStyles,
      headStyles: tableStyles.headStyles,
      styles: { ...tableStyles.styles, fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === 'body' && groupHeaderRows.has(data.row.index)) data.cell.styles.fontStyle = 'bold'
      },
    })
  }
  if (data.resgates?.length) {
    doc.addPage()
    sectionHeading(doc, 'Dados detalhados', 'Resgates', `${data.resgates.length.toLocaleString('pt-BR')} registros`)
    autoTable(doc, {
      ...tableStyles,
      startY: 34,
      head: [RES.map(([, , l]) => l)],
      body: data.resgates.map((r) => RES.map(([k, t]) => tableValue(r[k], t, k))),
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2.5 },
    })
  }
  const pageCount = doc.internal.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFillColor(...PDF_COLORS.brand)
    doc.rect(0, 0, pageWidth, 3, 'F')
    doc.setDrawColor(...PDF_COLORS.line)
    doc.setLineWidth(0.25)
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text('Fynn Control  ·  Relatório financeiro', 14, pageHeight - 6)
    doc.text(`${page} / ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' })
  }
  doc.save('fynn-control.pdf')
}
