import * as XLSX from 'xlsx'

// [coluna, tipo]  tipo: text | num | date | calc (calculada automaticamente)
export const CART = [
  ['DATA_APLICACAO','date'],['QTD_COMPRA','num'],['PRC_UNIT','num'],['PAPEL','text'],['VLR_APLICACAO','num'],
  ['BANCO','text'],['TIPO_PRODUTO','text'],['PRODUTO','text'],['TIPO_INV','text'],['TOTAL_ATUAL','num'],
  ['ULTIMA_ATUAL','date'],['PERIODO','calc'],['REND_BRUTO','calc'],['VAR_PP','calc'],['IOF','num'],
]
export const EXT = [
  ['DATA DE RECEBIMENTO','date'],['VALOR DA APLICAÇÃO','num'],['ORIGEM','text'],
  ['INSTITUIÇÃO','text'],['CNPJ / CPF','text'],['TIPO','text'],
]
export const SHEETS = {
  carteira: { name: 'Control_Fynn', cols: CART },
  extrato: { name: 'Extrato', cols: EXT },
}

const n = (v) => Number(v) || 0
const day = (s) => (s ? new Date(s + 'T00:00:00Z').getTime() : NaN)

// Recalcula as colunas que eram fórmulas na planilha original
export function recalcCart(r) {
  const a = day(r.DATA_APLICACAO), b = day(r.ULTIMA_ATUAL)
  const rend = n(r.TOTAL_ATUAL) - n(r.VLR_APLICACAO)
  return {
    ...r,
    PERIODO: isNaN(a) || isNaN(b) ? '' : Math.round((b - a) / 864e5),
    REND_BRUTO: rend,
    VAR_PP: n(r.VLR_APLICACAO) ? rend / n(r.VLR_APLICACAO) : 0,
  }
}

const iso = (v) => {
  if (v instanceof Date) return new Date(v.getTime() + 12 * 36e5 - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
  return v == null ? '' : String(v).slice(0, 10)
}

function toRows(ws, cols) {
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
  return raw
    .map((o) => Object.fromEntries(cols.map(([k, t]) => [k, t === 'date' ? iso(o[k]) : t === 'num' ? (o[k] === '' ? '' : n(o[k])) : o[k] ?? ''])))
    .filter((r) => cols.some(([k]) => r[k] !== '' && r[k] != null))
}

// Aceita .xlsx (2 abas) ou .csv (detecta a qual tabela pertence pelo cabeçalho)
export async function importFile(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const out = {}
  const first = wb.Sheets[wb.SheetNames[0]]
  const isCsv = /\.csv$/i.test(file.name)
  const find = (def, idx) => wb.Sheets[def.name] || wb.Sheets[wb.SheetNames[idx]]
  const hasCart = (ws) => ws && Object.keys(ws).some((k) => ws[k]?.v === 'DATA_APLICACAO')
  if (isCsv) {
    if (hasCart(first)) out.carteira = toRows(first, CART).map(recalcCart)
    else out.extrato = toRows(first, EXT)
    return out
  }
  const c = find(SHEETS.carteira, 0), e = find(SHEETS.extrato, 1)
  if (c) out.carteira = toRows(c, CART).map(recalcCart)
  if (e) out.extrato = toRows(e, EXT)
  return out
}

const sheetOf = (rows, cols) => XLSX.utils.json_to_sheet(rows, { header: cols.map(([k]) => k) })

export function exportCsv(key, rows) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetOf(rows, SHEETS[key].cols), SHEETS[key].name)
  XLSX.writeFile(wb, `${SHEETS[key].name}.csv`, { bookType: 'csv' })
}

export function exportXlsx(data) {
  const wb = XLSX.utils.book_new()
  for (const k of ['carteira', 'extrato'])
    XLSX.utils.book_append_sheet(wb, sheetOf(data[k], SHEETS[k].cols), SHEETS[k].name)
  XLSX.writeFile(wb, 'fynn-control.xlsx')
}
