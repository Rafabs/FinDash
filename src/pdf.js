import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SHEETS } from './data.js'

export function exportPdf(data, resumo, periodo) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Fynn Control - Relatório', 14, 14)
  doc.setFontSize(10)
  doc.text(new Date().toLocaleDateString('pt-BR') + (periodo ? `  ·  Período do extrato: ${periodo}` : ''), 14, 20)
  autoTable(doc, { startY: 26, head: [['Indicador', 'Valor']], body: resumo, theme: 'grid' })
  for (const k of ['carteira', 'extrato']) {
    const cols = SHEETS[k].cols.map(([c]) => c)
    const labels = SHEETS[k].cols.map(([c, , l]) => l ?? c)
    doc.addPage()
    doc.setFontSize(13)
    doc.text(SHEETS[k].name, 14, 14)
    autoTable(doc, {
      startY: 18,
      head: [labels],
      body: data[k].map((r) => cols.map((c) => (c === 'VAR_PP' ? (r[c] * 100).toFixed(2) + '%' : typeof r[c] === 'number' ? +r[c].toFixed(4) : r[c] ?? ''))),
      styles: { fontSize: 6 },
    })
  }
  doc.save('fynn-control.pdf')
}
