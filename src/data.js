import * as XLSX from 'xlsx'

// [coluna no banco, tipo, rótulo exibido]
// tipos: text | num | money | date | calc (texto/num calculado) | calcm (valor em R$ calculado)
export const CART = [
  ['DATA_APLICACAO', 'date', 'Data de Aplicação'],
  ['QTD_COMPRA', 'num', 'Qtd.'],
  ['PRC_UNIT', 'money', 'Preço Unitário'],
  ['PAPEL', 'text', 'Papel'],
  ['VLR_APLICACAO', 'money', 'Total Aplicado'],
  ['BANCO', 'text', 'Banco'],
  ['TIPO_PRODUTO', 'text', 'Categoria'],
  ['PRODUTO', 'text', 'Produto'],
  ['TIPO_INV', 'text', 'Tipo'],
  ['TOTAL_ATUAL', 'money', 'Valor Hoje'],
  ['ULTIMA_ATUAL', 'date', 'Atualizado'],
  ['PERIODO', 'calc', 'Duração'],
  ['REND_BRUTO', 'calcm', 'Rendimento'],
  ['VAR_PP', 'calc', 'Variação (%)'],
  ['IOF', 'calc', 'IOF'],
]
export const EXT = [
  ['DATA DE RECEBIMENTO', 'date', 'Data'],
  ['VALOR DA APLICAÇÃO', 'money', 'Valor'],
  ['CATEGORIA', 'select', 'Categoria'],
  ['ORIGEM', 'text', 'Origem', 280],
  ['INSTITUIÇÃO', 'text', 'Instituição', 200],
  ['CNPJ / CPF', 'text', 'CNPJ / CPF', 150],
  ['TIPO', 'text', 'Tipo', 220],
]
export const SHEETS = {
  carteira: { name: 'Control_Fynn', cols: CART },
  extrato: { name: 'Extrato', cols: EXT },
}

const n = (v) => Number(v) || 0

// ---- Extrato: categorias automáticas (editáveis na tabela) ----
export const CATS = ['Proventos', 'Rendimentos', 'Aluguel', 'Salário', 'Venda de Patrimônio', 'Outros']
export function categorize(r) {
  const t = `${r.TIPO || ''} ${r.ORIGEM || ''}`.toUpperCase().trim()
  if (/DIVIDEND|JUROS S\/C|RED\. REND|\bJCP\b/.test(t)) return 'Proventos'
  if (/REND AUT|^REND\b|^JUROS\b/.test(t)) return 'Rendimentos'
  if (/ALUGUEL|\bVAGA\b|AIRBNB/.test(t)) return 'Aluguel'
  if (/SAL[AÁ]RIO|^SAL\b|\bPPLR\b|\bPLR\b|B[OÔ]NUS|RECIS[ÃA]O|RESCIS[ÃA]O|13[ºO°]/.test(t)) return 'Salário'
  if (/NP|\bIMIRIM\b/.test(t)) return 'Venda de Patrimônio'
  return 'Outros'
}
export const withCat = (r) => ({ ...r, CATEGORIA: r.CATEGORIA || categorize(r) })
export const tickerOf = (r) => `${r.TIPO || ''} ${r.ORIGEM || ''}`.match(/\b[A-Z]{4}\d{1,2}\b/)?.[0] || ''

export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100
export const isNum = (t) => t === 'num' || t === 'money'
export const today = () => new Date().toISOString().slice(0, 10)
export const isRV = (r) => r.TIPO_INV === 'RV'
const day = (s) => (s ? new Date(s + 'T00:00:00Z').getTime() : NaN)

// Bloqueios da Carteira. Editáveis: Atualizado, Preço Unitário (só RV) e Valor Hoje (só RF).
const ALWAYS_LOCKED = ['DATA_APLICACAO', 'QTD_COMPRA', 'PAPEL', 'VLR_APLICACAO', 'BANCO', 'TIPO_PRODUTO', 'PRODUTO', 'TIPO_INV']
export const lockedCart = (r, k) => {
  if (ALWAYS_LOCKED.includes(k)) return true
  if (k === 'PRC_UNIT') return !isRV(r)
  if (k === 'TOTAL_ATUAL') return isRV(r)
  return false
}

// Recalcula tudo o que era fórmula na planilha
export function recalcCart(r) {
  const x = { ...r }
  const calc = round2(n(x.QTD_COMPRA) * n(x.PRC_UNIT))
  if (isRV(x)) x.TOTAL_ATUAL = calc // RV: Valor Hoje = Qtd x Preço
  else x.VLR_APLICACAO = calc // RF: Total Aplicado = Qtd x Preço
  const a = day(x.DATA_APLICACAO), b = day(x.ULTIMA_ATUAL)
  const periodo = isNaN(a) || isNaN(b) ? '' : Math.round((b - a) / 864e5)
  const rend = round2(n(x.TOTAL_ATUAL) - n(x.VLR_APLICACAO))
  return {
    ...x,
    PERIODO: periodo,
    REND_BRUTO: rend,
    VAR_PP: n(x.VLR_APLICACAO) ? rend / n(x.VLR_APLICACAO) : 0,
    IOF: isRV(x) ? 'N/A' : periodo !== '' && periodo < 31 ? 'SIM' : 'NÃO',
  }
}


// Lotes de RV com o mesmo PAPEL compartilham Preço Unitário e Atualizado
export const groupable = (r) => isRV(r) && !!r.PAPEL && r.PAPEL !== 'N/A'
export const syncPapel = (rows, src) =>
  rows.map((r) => groupable(r) && r.PAPEL === src.PAPEL
    ? recalcCart({ ...r, PRC_UNIT: src.PRC_UNIT, ULTIMA_ATUAL: src.ULTIMA_ATUAL }) : r)
export function normalizeGroups(rows) {
  const first = {}
  rows.forEach((r) => { if (groupable(r) && !first[r.PAPEL]) first[r.PAPEL] = r })
  return rows.map((r) => (groupable(r) ? syncPapel([r], first[r.PAPEL])[0] : r))
}

const iso = (v) => {
  if (v instanceof Date) return new Date(v.getTime() + 12 * 36e5 - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
  return v == null ? '' : String(v).slice(0, 10)
}

function toRows(ws, cols) {
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
  return raw
    .map((o) => Object.fromEntries(cols.map(([k, t]) => [k, t === 'date' ? iso(o[k]) : isNum(t) ? (o[k] === '' ? '' : n(o[k])) : String(o[k] ?? '').trim()])))
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
    else out.extrato = toRows(first, EXT).map(withCat)
    return out
  }
  const c = find(SHEETS.carteira, 0), e = find(SHEETS.extrato, 1)
  if (c) out.carteira = toRows(c, CART).map(recalcCart)
  if (e) out.extrato = toRows(e, EXT).map(withCat)
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
