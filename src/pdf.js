import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SHEETS, totalOf, RES, RK, tickerOf, monthOf } from './data.js'

const money = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const aggregate = (rows, key, val) => {
  const out = new Map()
  rows.forEach((r) => {
    const name = (typeof key === 'function' ? key(r) : r[key]) || 'N/A'
    out.set(name, (out.get(name) || 0) + (Number(typeof val === 'function' ? val(r) : r[val]) || 0))
  })
  return [...out].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function drawChart(doc, title, rows, x, y, w, h, color = [99, 102, 241]) {
  doc.setDrawColor(220, 224, 232)
  doc.roundedRect(x, y, w, h, 2, 2)
  doc.setTextColor(35, 40, 52)
  doc.setFontSize(10)
  doc.text(title, x + 5, y + 8)
  if (!rows.length) {
    doc.setFontSize(8); doc.setTextColor(120, 126, 138); doc.text('Sem dados neste período', x + 5, y + 20); return
  }
  const items = rows.slice(0, 6), max = Math.max(...items.map((r) => Math.abs(r.value)), 1)
  const labelW = Math.min(43, w * 0.34), valueW = 27, barW = w - labelW - valueW - 18
  const rowH = Math.min(8, (h - 16) / items.length)
  doc.setFontSize(7)
  items.forEach((r, i) => {
    const yy = y + 14 + i * rowH
    const label = String(r.name).length > 22 ? String(r.name).slice(0, 20) + '…' : String(r.name)
    doc.setTextColor(70, 76, 88); doc.text(label, x + 5, yy + 3)
    doc.setFillColor(237, 240, 245); doc.roundedRect(x + 5 + labelW, yy, barW, 3.2, 1, 1, 'F')
    doc.setFillColor(...color); doc.roundedRect(x + 5 + labelW, yy, Math.max(0.8, barW * Math.abs(r.value) / max), 3.2, 1, 1, 'F')
    doc.setTextColor(70, 76, 88); doc.text(money(r.value), x + w - 5, yy + 3, { align: 'right' })
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
    ['Despesas por conta', despesasConta],
    ['Despesas por mês', aggregate(dsp.map((r) => ({ mes: monthOf(r.DATA), total: totalOf(r) })), 'mes', 'total').sort((a, b) => a.name.localeCompare(b.name)).slice(-6)],
  ]
  for (let p = 0; p < 2; p++) {
    doc.addPage(); doc.setFontSize(14); doc.setTextColor(35, 40, 52); doc.text('Gráficos do dashboard', 14, 14)
    doc.setFontSize(9); doc.setTextColor(100, 106, 118); doc.text(`Período: ${periodo || 'Todo o período'}`, 14, 20)
    const positions = [[14, 27], [155, 27], [14, 115], [155, 115]]
    charts.slice(p * 4, p * 4 + 4).forEach(([title, rows], i) => drawChart(doc, title, rows, ...positions[i], 128, 80, title.includes('Despesa') ? [239, 68, 68] : [99, 102, 241]))
  }
}

export function exportPdf(data, resumo, periodo) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Fynn Control - Relatório', 14, 14)
  doc.setFontSize(10)
  doc.text(new Date().toLocaleDateString('pt-BR') + (periodo ? `  ·  Período do extrato: ${periodo}` : ''), 14, 20)
  autoTable(doc, { startY: 26, head: [['Indicador', 'Valor']], body: resumo, theme: 'grid' })
  addCharts(doc, data, periodo)
  for (const k of ['carteira', 'extrato']) {
    const cols = SHEETS[k].cols.map(([c]) => c)
    const labels = SHEETS[k].cols.map(([c, , l]) => l ?? c)
    doc.addPage()
    doc.setFontSize(13)
    doc.text(SHEETS[k].name, 14, 14)
    autoTable(doc, {
      startY: 18,
      head: [labels],
      body: data[k].map((r) => cols.map((c) => (c === 'VAR_PP' ? (r[c] * 100).toFixed(2) + '%' : typeof r[c] === 'number' ? r[c].toFixed(2) : r[c] ?? ''))),
      styles: { fontSize: 6 },
    })
  }
  if (data.despesas?.length) {
    doc.addPage()
    doc.setFontSize(13)
    doc.text('Despesas', 14, 14)
    autoTable(doc, {
      startY: 18,
      head: [['Mês', 'Conta', 'Itens', 'Total']],
      body: data.despesas.map((r) => [r.DATA.slice(0, 7).split('-').reverse().join('/'), r.TIPO_CONTA, r.ITENS.map((i) => `${i.NOME || '-'}: ${i.VALOR.toFixed(2)}`).join(' · '), totalOf(r).toFixed(2)]),
      styles: { fontSize: 6 },
    })
  }
  if (data.resgates?.length) {
    doc.addPage()
    doc.setFontSize(13)
    doc.text('Resgates', 14, 14)
    autoTable(doc, {
      startY: 18,
      head: [RES.map(([, , l]) => l)],
      body: data.resgates.map((r) => RES.map(([k, t]) => (t === 'money' ? Number(r[k]).toFixed(2) : t === 'date' ? String(r[k]).split('-').reverse().join('/') : r[k]))),
      styles: { fontSize: 6 },
    })
  }
  doc.save('fynn-control.pdf')
}
