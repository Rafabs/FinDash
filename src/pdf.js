import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SHEETS, totalOf, RES, RK, tickerOf, monthOf, expenseBreakdown } from './data.js'
import { markPng } from './markImage.js'
import { buildProjection, loadProjectionSettings } from './projection.js'
import { nowYM } from './period.js'

const money = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PDF_COLORS = {
  ink: [17, 24, 28],
  muted: [107, 114, 128],
  brand: [0, 137, 127],
  line: [229, 231, 235],
  stripe: [248, 250, 252],
}
const tableStyles = {
  theme: 'plain',
  styles: { font: 'helvetica', fontSize: 8, textColor: PDF_COLORS.ink, lineColor: PDF_COLORS.line, lineWidth: 0.2, cellPadding: 3.5, overflow: 'linebreak', valign: 'middle' },
  headStyles: { fillColor: [14, 18, 22], textColor: [255, 255, 255], fontStyle: 'bold', lineColor: [14, 18, 22], cellPadding: 4.5 },
  alternateRowStyles: { fillColor: PDF_COLORS.stripe },
  footStyles: { fillColor: [220, 244, 241], textColor: PDF_COLORS.ink, fontStyle: 'bold', lineColor: PDF_COLORS.line },
  showFoot: 'lastPage',
  margin: { left: 14, right: 14, bottom: 16 },
}
// linha de totais no fim da tabela: soma só as colunas de valor indicadas
const sumOf = (rows, key) => rows.reduce((t, r) => t + (Number(r[key]) || 0), 0)
const totalsRow = (cols, rows, sumKeys, label) => cols.map((c, i) => (i === 0 ? label : sumKeys.includes(c) ? money(sumOf(rows, c)) : ''))
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

// ícones das contas (um PNG por grupo), usados nos gráficos e tabelas de despesas
const accountOf = (contas, name) => (contas || []).find((a) => String(a.name || '').toLocaleLowerCase() === String(name || '').toLocaleLowerCase()) || {}
async function buildMarks(data) {
  const names = new Set((data.despesas || []).map((r) => r.TIPO_CONTA))
  expenseBreakdown(data.despesas || []).forEach((g) => names.add(g.name))
  const marks = new Map()
  await Promise.all([...names].filter(Boolean).map(async (name) => {
    try { const png = await markPng({ ...accountOf(data.contasDespesas, name), name }, 96); if (png) marks.set(name, png) } catch { /* sem ícone */ }
  }))
  return marks
}
const drawMark = (doc, marks, name, x, y, size) => { const png = marks?.get(String(name)); if (png) doc.addImage(png, 'PNG', x, y, size, size, 'mark:' + name) }
const hasMark = (marks, name) => !!marks?.get(String(name))
const pctText = (v, total) => (total ? (v / total * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '—')

function drawChart(doc, title, rows, x, y, w, h, color = [0, 169, 157], marks = null) {
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
    const mark = hasMark(marks, r.name)
    const limit = mark ? 17 : 22
    const label = String(r.name).length > limit ? String(r.name).slice(0, limit - 2) + '…' : String(r.name)
    if (mark) drawMark(doc, marks, r.name, x + 5, yy - 0.3, 3.8)
    doc.setTextColor(...PDF_COLORS.muted); doc.text(label, x + 5 + (mark ? 5 : 0), yy + 3)
    doc.setFillColor(237, 240, 245); doc.roundedRect(x + 5 + labelW, yy, barW, 3.2, 1, 1, 'F')
    doc.setFillColor(...color); doc.roundedRect(x + 5 + labelW, yy, Math.max(0.8, barW * Math.abs(r.value) / max), 3.2, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_COLORS.ink); doc.text(money(r.value), x + w - 5, yy + 3, { align: 'right' }); doc.setFont('helvetica', 'normal')
  })
}

const SUM_KEYS = { carteira: ['VLR_APLICACAO', 'TOTAL_ATUAL', 'REND_BRUTO'], extrato: ['VALOR DA APLICAÇÃO'] }

// ---------- Projeção (última página) ----------
const compactBrl = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : String(Math.round(v)))
const mesCurto = (ym) => ym.slice(5) + '/' + ym.slice(2, 4)
function chartFrame(doc, title, x, y, w, h, legend = []) {
  doc.setFillColor(255, 255, 255); doc.setDrawColor(...PDF_COLORS.line); doc.setLineWidth(0.25)
  doc.roundedRect(x, y, w, h, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.ink)
  doc.text(title, x + 5, y + 7)
  let lx = x + w - 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  ;[...legend].reverse().forEach(([label, color]) => {
    const tw = doc.getTextWidth(label)
    doc.setTextColor(...PDF_COLORS.muted); doc.text(label, lx - tw, y + 7)
    doc.setFillColor(...color); doc.rect(lx - tw - 4, y + 4.6, 2.6, 2.6, 'F')
    lx -= tw + 9
  })
}
function drawProjectionFlow(doc, rows, x, y, w, h) {
  const teal = [0, 169, 157], red = [255, 77, 106]
  chartFrame(doc, 'Fluxo de caixa projetado', x, y, w, h, [['Entradas', teal], ['Despesas', red]])
  const px = x + 17, py = y + 13, pw = w - 23, ph = h - 25
  const max = Math.max(1, ...rows.map((r) => Math.max(r.Entradas, r.Despesas)))
  doc.setFontSize(6.5); doc.setLineWidth(0.15)
  for (let i = 0; i <= 4; i++) {
    const yy = py + ph - (ph * i) / 4
    doc.setDrawColor(...PDF_COLORS.line); doc.line(px, yy, px + pw, yy)
    doc.setTextColor(...PDF_COLORS.muted); doc.text(compactBrl((max * i) / 4), px - 2, yy + 1.2, { align: 'right' })
  }
  const gw = pw / rows.length, bw = Math.min(6, gw * 0.36), step = Math.max(1, Math.ceil(rows.length / 12))
  rows.forEach((r, i) => {
    const cx = px + gw * i + gw / 2
    doc.setFillColor(...teal); doc.rect(cx - bw - 0.3, py + ph - (ph * r.Entradas) / max, bw, (ph * r.Entradas) / max, 'F')
    doc.setFillColor(...red); doc.rect(cx + 0.3, py + ph - (ph * Math.max(r.Despesas, 0)) / max, bw, (ph * Math.max(r.Despesas, 0)) / max, 'F')
    if (i % step === 0) { doc.setTextColor(...PDF_COLORS.muted); doc.text(mesCurto(r.ym), cx, py + ph + 5, { align: 'center' }) }
  })
}
function drawProjectionPatrimony(doc, rows, x, y, w, h) {
  const teal = [0, 169, 157], silver = [150, 158, 168]
  chartFrame(doc, 'Patrimônio projetado', x, y, w, h, [['Com rendimento', teal], ['Só com as sobras', silver]])
  const px = x + 17, py = y + 13, pw = w - 23, ph = h - 25
  const vals = rows.flatMap((r) => [r.Patrimonio, r.SemRendimento])
  let min = Math.min(...vals), max = Math.max(...vals)
  if (max === min) { max += 1; min -= 1 }
  const pad = (max - min) * 0.08; min -= pad; max += pad
  doc.setFontSize(6.5); doc.setLineWidth(0.15)
  for (let i = 0; i <= 4; i++) {
    const yy = py + ph - (ph * i) / 4
    doc.setDrawColor(...PDF_COLORS.line); doc.line(px, yy, px + pw, yy)
    doc.setTextColor(...PDF_COLORS.muted); doc.text(compactBrl(min + ((max - min) * i) / 4), px - 2, yy + 1.2, { align: 'right' })
  }
  const at = (i, v) => [px + (rows.length > 1 ? (pw * i) / (rows.length - 1) : pw / 2), py + ph - (ph * (v - min)) / (max - min)]
  const line = (key, color, dash) => {
    doc.setDrawColor(...color); doc.setLineWidth(dash ? 0.4 : 0.7); doc.setLineDashPattern(dash ? [2, 1.5] : [], 0)
    for (let i = 1; i < rows.length; i++) { const [x1, y1] = at(i - 1, rows[i - 1][key]), [x2, y2] = at(i, rows[i][key]); doc.line(x1, y1, x2, y2) }
    doc.setLineDashPattern([], 0)
  }
  line('SemRendimento', silver, true); line('Patrimonio', teal, false)
  const step = Math.max(1, Math.ceil(rows.length / 12))
  rows.forEach((r, i) => { if (i % step === 0) { const [cx] = at(i, 0); doc.setTextColor(...PDF_COLORS.muted); doc.text(mesCurto(r.ym), cx, py + ph + 5, { align: 'center' }) } })
}
function addProjection(doc, data, settings) {
  const p = buildProjection(data, settings)
  if (!p.n) return
  const rows = p.rows, last = rows[rows.length - 1], sum = (k) => rows.reduce((t, r) => t + r[k], 0)
  const sobraMedia = sum('Sobra') / rows.length, negativos = rows.filter((r) => r.Sobra < 0)
  doc.addPage()
  const sign = (v) => `${Number(v) > 0 ? '+' : ''}${Number(v) || 0}%`
  sectionHeading(doc, 'Projeção', 'Projeção de entradas, despesas e patrimônio',
    `Base: média dos últimos ${p.n} ${p.n === 1 ? 'mês completo' : 'meses completos'} · ajuste de entradas ${sign(settings.adjEnt)} e de despesas ${sign(settings.adjDesp)} · rendimento ${Number(settings.rate) || 0}% a.a.${settings.useKnown ? ' · inclui parcelas em aberto e despesas já lançadas' : ''}`)
  // indicadores
  const kpis = [
    ['Entradas médias (base)', money(p.avgEnt), 'por mês'],
    ['Despesas médias (base)', money(p.avgDesp), `${money(p.avgParc)} em parcelas`],
    ['Sobra média projetada', money(sobraMedia), 'por mês'],
    [`Patrimônio em ${rows.length} meses`, money(last.Patrimonio), `${last.Patrimonio - p.start >= 0 ? '+' : ''}${money(last.Patrimonio - p.start)} sobre hoje`],
    ['Meses no vermelho', String(negativos.length), negativos.length ? `1º em ${mesCurto(negativos[0].ym)}` : 'nenhum no período'],
  ]
  const gap = 4, kw = (doc.internal.pageSize.getWidth() - 28 - gap * 4) / 5
  kpis.forEach(([label, value, note], i) => {
    const kx = 14 + i * (kw + gap)
    doc.setFillColor(...PDF_COLORS.stripe); doc.setDrawColor(...PDF_COLORS.line); doc.setLineWidth(0.25)
    doc.roundedRect(kx, 34, kw, 19, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...PDF_COLORS.muted); doc.text(label, kx + 4, 39.5)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5)
    doc.setTextColor(...((i === 2 && sobraMedia < 0) || (i === 4 && negativos.length) ? [214, 32, 63] : PDF_COLORS.ink)); doc.text(value, kx + 4, 46)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...PDF_COLORS.muted); doc.text(note, kx + 4, 50.5)
  })
  // gráficos
  const cw = (doc.internal.pageSize.getWidth() - 28 - 6) / 2
  drawProjectionFlow(doc, rows, 14, 57, cw, 46)
  drawProjectionPatrimony(doc, rows, 14 + cw + 6, 57, cw, 46)
  // tabela mês a mês
  autoTable(doc, {
    ...tableStyles,
    startY: 108,
    head: [['Mês', 'Entradas', 'Despesas variáveis', 'Parcelas em aberto', 'Despesas', 'Sobra', 'Acumulado', 'Patrimônio']],
    body: rows.map((r) => [mesCurto(r.ym), money(r.Entradas), money(r.Variaveis), money(r.Parcelas), money(r.Despesas), money(r.Sobra), money(r.Acumulado), money(r.Patrimonio)]),
    foot: [['Total', money(sum('Entradas')), money(sum('Variaveis')), money(sum('Parcelas')), money(sum('Despesas')), money(sum('Sobra')), money(last.Acumulado), money(last.Patrimonio)]],
    columnStyles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((c) => [c, { halign: 'right' }])),
    styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 1.4 },
    didParseCell: (h) => {
      if (h.section !== 'body' && h.column.index >= 1) h.cell.styles.halign = 'right'
      if (h.section === 'body' && h.column.index === 5 && rows[h.row.index]?.Sobra < 0) h.cell.styles.textColor = [214, 32, 63]
      if (h.section === 'body' && h.column.index === 6 && rows[h.row.index]?.Acumulado < 0) h.cell.styles.textColor = [214, 32, 63]
    },
  })
  const noteY = doc.lastAutoTable.finalY + 6
  if (noteY < doc.internal.pageSize.getHeight() - 16) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...PDF_COLORS.muted)
    doc.text('Estimativa baseada no histórico. Parcelas já pagas (com baixa) não entram; não considera impostos, inflação nem mudanças de renda.', 14, noteY)
  }
}

function addCharts(doc, data, periodo, marks) {
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
    charts.slice(p * 4, p * 4 + 4).forEach(([title, rows], i) => drawChart(doc, title, rows, ...positions[i], 128, 80, title.includes('Despesa') ? [255, 77, 106] : [0, 169, 157], title === 'Despesas por grupo' ? marks : null))
  }
}

export async function exportPdf(data, resumo, periodo, indicadores = {}) {
  const marks = await buildMarks(data)
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
  addCharts(doc, data, periodo, marks)
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
      foot: data[k].length ? [(() => {
        const row = totalsRow(cols, data[k], SUM_KEYS[k] || [], 'Total')
        const vi = cols.indexOf('VAR_PP')
        if (k === 'carteira' && vi >= 0 && sumOf(data[k], 'VLR_APLICACAO')) row[vi] = tableValue(sumOf(data[k], 'REND_BRUTO') / sumOf(data[k], 'VLR_APLICACAO'), 'calc', 'VAR_PP')
        return row
      })()] : undefined,
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2.5 },
      columnStyles: Object.fromEntries(definitions.map((type, i) => [i, type === 'money' || type === 'calcm' || type === 'num' ? { halign: 'right' } : {}])),
    })
  }
  if (data.despesas?.length) {
    doc.addPage()
    const currentMonth = nowYM()
    const futuras = data.despesas.filter((r) => monthOf(r.DATA) > currentMonth)
    sectionHeading(doc, 'Dados detalhados', 'Despesas', `${data.despesas.length.toLocaleString('pt-BR')} registros · ${futuras.length} contas futuras`)
    const calcDesp = (r) => {
      const futuro = monthOf(r.DATA) > currentMonth
      const previsto = totalOf(r)
      const pago = r.ITENS.reduce((sum, item) => {
        const valor = Number(item.VALOR) || 0
        return sum + (item.PARCELAMENTO ? Math.min(valor, Number(item.PARCELAMENTO.valorPago) || 0) : futuro ? 0 : valor)
      }, 0)
      return { futuro, previsto, pago, pendente: Math.max(0, previsto - pago) }
    }
    const calcs = data.despesas.map(calcDesp)
    const somar = (list, k) => list.reduce((t, c) => t + c[k], 0)
    const ateHoje = calcs.filter((c) => !c.futuro)
    autoTable(doc, {
      ...tableStyles,
      startY: 34,
      head: [['Mês', 'Grupo', 'Despesas / parcelas', 'Previsto', 'Pago', 'Pendente']],
      body: data.despesas.map((r, idx) => {
        const { futuro, previsto, pago, pendente } = calcs[idx]
        const itens = r.ITENS.map((item) => {
          const parcela = item.PARCELAMENTO
          const baixadaEm = parcela?.dataPagamento ? `; baixada em ${datePt(parcela.dataPagamento)}` : ''
          const sufixo = parcela ? ` (${parcela.numero}/${parcela.quantidade}; pago ${money(parcela.valorPago)}${baixadaEm})` : ''
          return `${item.NOME || '-'}${item.CATEGORIA ? ` (${item.CATEGORIA})` : ''}: ${money(item.VALOR)}${sufixo}`
        }).join(' · ')
        return [`${datePt(r.DATA).slice(3)}${futuro ? ' · prevista' : ''}`, r.TIPO_CONTA, itens, money(previsto), money(pago), money(pendente)]
      }),
      foot: [
        ['Total geral', '', `${calcs.length.toLocaleString('pt-BR')} lançamentos`, money(somar(calcs, 'previsto')), money(somar(calcs, 'pago')), money(somar(calcs, 'pendente'))],
        ...(ateHoje.length < calcs.length ? [['Até o mês atual', '', `${ateHoje.length.toLocaleString('pt-BR')} lançamentos`, money(somar(ateHoje, 'previsto')), money(somar(ateHoje, 'pago')), money(somar(ateHoje, 'pendente'))]] : []),
      ],
      columnStyles: { 0: { cellWidth: 27 }, 1: { cellWidth: 38 }, 3: { halign: 'right', cellWidth: 31 }, 4: { halign: 'right', cellWidth: 29 }, 5: { halign: 'right', cellWidth: 31, fontStyle: 'bold' } },
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2.5 },
      didParseCell: (h) => { if (h.section === 'body' && h.column.index === 1 && hasMark(marks, h.cell.raw)) h.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, right: 2.5, left: 8.5 } },
      didDrawCell: (h) => { if (h.section === 'body' && h.column.index === 1) drawMark(doc, marks, h.cell.raw, h.cell.x + 2, h.cell.y + 2.2, 4.2) },
    })
    const grupos = expenseBreakdown(data.despesas)
    const totalDespesas = grupos.reduce((s, group) => s + group.total, 0)
    const groupHeaderRows = new Set()
    const groupAtRow = new Map()
    let rowIndex = 0
    grupos.forEach((group) => {
      groupHeaderRows.add(rowIndex)
      groupAtRow.set(rowIndex, group.name)
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
      foot: [['Total das despesas', money(totalDespesas), '', totalDespesas ? '100,00%' : '—']],
      ...tableStyles,
      headStyles: tableStyles.headStyles,
      styles: { ...tableStyles.styles, fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === 'body' && groupHeaderRows.has(data.row.index)) {
          data.cell.styles.fontStyle = 'bold'
          if (data.column.index === 0 && hasMark(marks, groupAtRow.get(data.row.index))) data.cell.styles.cellPadding = { top: 2, bottom: 2, right: 2, left: 9 }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0 && groupAtRow.has(data.row.index)) drawMark(doc, marks, groupAtRow.get(data.row.index), data.cell.x + 2, data.cell.y + (data.cell.height - 4.4) / 2, 4.4)
      },
    })
    // subtotal por categoria dentro de cada grupo (só grupos com itens categorizados)
    const comCategorias = grupos.filter((group) => group.categories?.length)
    if (comCategorias.length) {
      let catStart = doc.lastAutoTable.finalY + 10
      if (catStart > doc.internal.pageSize.getHeight() - 45) {
        doc.addPage()
        sectionHeading(doc, 'Despesas', 'Categorias dos itens', 'Subtotal por categoria dentro de cada grupo')
        catStart = 34
      } else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.ink)
        doc.text('Subtotal por categoria dentro de cada grupo', 14, catStart)
        catStart += 4
      }
      const catGroupAtRow = new Map()
      let catRow = 0
      const catBody = comCategorias.flatMap((group) => {
        catGroupAtRow.set(catRow, group.name)
        catRow += group.categories.length + 1
        return [
          [group.name, money(group.total), '100,00%'],
          ...group.categories.map((cat) => [`   ${cat.name}`, money(cat.total), pctText(cat.total, group.total)]),
        ]
      })
      autoTable(doc, {
        startY: catStart,
        head: [['Grupo / categoria', 'Total', '% do grupo']],
        body: catBody,
        ...tableStyles,
        headStyles: tableStyles.headStyles,
        styles: { ...tableStyles.styles, fontSize: 8 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.section === 'body' && catGroupAtRow.has(data.row.index)) {
            data.cell.styles.fontStyle = 'bold'
            if (data.column.index === 0 && hasMark(marks, catGroupAtRow.get(data.row.index))) data.cell.styles.cellPadding = { top: 2, bottom: 2, right: 2, left: 9 }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0 && catGroupAtRow.has(data.row.index)) drawMark(doc, marks, catGroupAtRow.get(data.row.index), data.cell.x + 2, data.cell.y + (data.cell.height - 4.4) / 2, 4.4)
        },
      })
    }
  }
  if (data.resgates?.length) {
    doc.addPage()
    sectionHeading(doc, 'Dados detalhados', 'Resgates', `${data.resgates.length.toLocaleString('pt-BR')} registros`)
    autoTable(doc, {
      ...tableStyles,
      startY: 34,
      head: [RES.map(([, , l]) => l)],
      body: data.resgates.map((r) => RES.map(([k, t]) => tableValue(r[k], t, k))),
      foot: [totalsRow(RES.map(([k]) => k), data.resgates, [RK], 'Total')],
      columnStyles: { 2: { halign: 'right' } },
      styles: { ...tableStyles.styles, fontSize: 7, cellPadding: 2.5 },
    })
  }
  addProjection(doc, data, loadProjectionSettings()) // projeção na última página
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
