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
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return v == null ? '' : String(v).trim().slice(0, 10)
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

// ---------- Modelos para download e dados de exemplo ----------
const TPL_CART = [
  { DATA_APLICACAO: '2025-08-01', QTD_COMPRA: 1, PRC_UNIT: 5000, PAPEL: 'N/A', VLR_APLICACAO: 5000, BANCO: 'BANCO EXEMPLO', TIPO_PRODUTO: 'RDB 100% DO CDI', PRODUTO: 'CONTA REMUNERADA', TIPO_INV: 'RF', TOTAL_ATUAL: 5380.5, ULTIMA_ATUAL: '2026-10-16' },
  { DATA_APLICACAO: '2025-03-10', QTD_COMPRA: 100, PRC_UNIT: 9.8, PAPEL: 'MXRF11', VLR_APLICACAO: 950, BANCO: 'CORRETORA EXEMPLO', TIPO_PRODUTO: 'FUNDOS IMOBILIÁRIOS', PRODUTO: 'MAXI RENDA', TIPO_INV: 'RV', TOTAL_ATUAL: 980, ULTIMA_ATUAL: '2026-10-16' },
]
const TPL_EXT = [
  { 'DATA DE RECEBIMENTO': '2026-10-16', 'VALOR DA APLICAÇÃO': 108.2, ORIGEM: 'VR. RED. RENDIMENTO SOBRE 100 PAPEL MXRF11', 'INSTITUIÇÃO': 'CORRETORA EXEMPLO', 'CNPJ / CPF': '97.521.225/0001-25', TIPO: 'DIVIDENDOS 100 MXRF11' },
  { 'DATA DE RECEBIMENTO': '2026-10-15', 'VALOR DA APLICAÇÃO': 7.45, ORIGEM: 'REND AUT ITAU', 'INSTITUIÇÃO': 'BANCO EXEMPLO', 'CNPJ / CPF': '', TIPO: 'REND AUT ITAU' },
]
// kind: 'xlsx' (2 abas) | 'carteira' (csv) | 'extrato' (csv)
export function downloadTemplate(kind) {
  const ck = CART.filter(([, t]) => t !== 'calc' && t !== 'calcm').map(([k]) => k)
  const ek = EXT.filter(([k]) => k !== 'CATEGORIA').map(([k]) => k)
  const wb = XLSX.utils.book_new()
  if (kind !== 'extrato') XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(TPL_CART, { header: ck }), SHEETS.carteira.name)
  if (kind !== 'carteira') XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(TPL_EXT, { header: ek }), SHEETS.extrato.name)
  if (kind === 'xlsx') XLSX.writeFile(wb, 'modelo-fynn-control.xlsx')
  else XLSX.writeFile(wb, `modelo-${kind}.csv`, { bookType: 'csv' })
}

export function demoData() {
  const now = new Date()
  const p2 = (v) => String(v).padStart(2, '0')
  const at = (m, d) => {
    const x = new Date(now.getFullYear(), now.getMonth() - m, m === 0 ? Math.min(d, now.getDate()) : d)
    return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`
  }
  const ago = (days) => { const x = new Date(now.getTime() - days * 864e5); return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}` }
  const hoje = ago(0)
  const L = (o) => recalcCart({ IOF: '', ...o, ULTIMA_ATUAL: hoje })
  const carteira = normalizeGroups([
    L({ DATA_APLICACAO: ago(365), QTD_COMPRA: 1, PRC_UNIT: 8000, PAPEL: 'N/A', BANCO: 'BANCO DIGITAL', TIPO_PRODUTO: 'RDB 100% DO CDI', PRODUTO: 'CONTA REMUNERADA', TIPO_INV: 'RF', TOTAL_ATUAL: 8912.4 }),
    L({ DATA_APLICACAO: ago(730), QTD_COMPRA: 2.5, PRC_UNIT: 14400, PAPEL: 'N/A', BANCO: 'CORRETORA EXEMPLO', TIPO_PRODUTO: 'TESOURO SELIC', PRODUTO: 'TESOURO SELIC 2029', TIPO_INV: 'RF', TOTAL_ATUAL: 41250.1 }),
    L({ DATA_APLICACAO: ago(10), QTD_COMPRA: 1, PRC_UNIT: 5000, PAPEL: 'N/A', BANCO: 'BANCO DIGITAL', TIPO_PRODUTO: 'CDB 110% DO CDI', PRODUTO: 'CDB LIQUIDEZ DIÁRIA', TIPO_INV: 'RF', TOTAL_ATUAL: 5021.3 }),
    L({ DATA_APLICACAO: ago(420), QTD_COMPRA: 100, PRC_UNIT: 9.8, PAPEL: 'MXRF11', VLR_APLICACAO: 950, BANCO: 'CORRETORA EXEMPLO', TIPO_PRODUTO: 'FUNDOS IMOBILIÁRIOS', PRODUTO: 'MAXI RENDA', TIPO_INV: 'RV' }),
    L({ DATA_APLICACAO: ago(180), QTD_COMPRA: 50, PRC_UNIT: 9.8, PAPEL: 'MXRF11', VLR_APLICACAO: 505, BANCO: 'CORRETORA EXEMPLO', TIPO_PRODUTO: 'FUNDOS IMOBILIÁRIOS', PRODUTO: 'MAXI RENDA', TIPO_INV: 'RV' }),
    L({ DATA_APLICACAO: ago(300), QTD_COMPRA: 10, PRC_UNIT: 158.2, PAPEL: 'KNRI11', VLR_APLICACAO: 1500, BANCO: 'CORRETORA EXEMPLO', TIPO_PRODUTO: 'FUNDOS IMOBILIÁRIOS', PRODUTO: 'KINEA RENDA', TIPO_INV: 'RV' }),
    L({ DATA_APLICACAO: ago(250), QTD_COMPRA: 20, PRC_UNIT: 101.5, PAPEL: 'XPLG11', VLR_APLICACAO: 2100, BANCO: 'CORRETORA EXEMPLO', TIPO_PRODUTO: 'FUNDOS IMOBILIÁRIOS', PRODUTO: 'XP LOG', TIPO_INV: 'RV' }),
  ])
  const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
  const extrato = []
  for (let m = 0; m < 12; m++) {
    const f = 1 + ((m * 7) % 5) / 20
    const prov = (t, q, val, d) => extrato.push({ [D]: at(m, d), [V]: +(val * f).toFixed(2), ORIGEM: `VR. RED. RENDIMENTO SOBRE ${q} PAPEL ${t}`, 'INSTITUIÇÃO': 'CORRETORA EXEMPLO', 'CNPJ / CPF': '', TIPO: `DIVIDENDOS ${q} ${t}` })
    prov('MXRF11', 150, 15, 14); prov('KNRI11', 10, 9, 15); prov('XPLG11', 20, 15, 15)
    extrato.push({ [D]: at(m, 28), [V]: +(7.45 * f).toFixed(2), ORIGEM: 'REND AUT ITAU', 'INSTITUIÇÃO': 'BANCO EXEMPLO', 'CNPJ / CPF': '', TIPO: 'REND AUT ITAU' })
    extrato.push({ [D]: at(m, 5), [V]: 5200, ORIGEM: 'EMPRESA EXEMPLO LTDA', 'INSTITUIÇÃO': 'REMUNERACAO/SALARIO', 'CNPJ / CPF': '', TIPO: 'SALÁRIO' })
  }
  return { carteira, extrato: extrato.map(withCat) }
}

