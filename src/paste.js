import { categorize } from './data.js'

export const FIELDS = [['DATA DE RECEBIMENTO', 'Data'], ['VALOR DA APLICAÇÃO', 'Valor'], ['ORIGEM', 'Origem'], ['INSTITUIÇÃO', 'Instituição'], ['CNPJ / CPF', 'CNPJ / CPF'], ['TIPO', 'Tipo']]
const HDR = [[/data/i, 0], [/valor|r\$/i, 1], [/origem|descri/i, 2], [/institu|banco/i, 3], [/cnpj|cpf/i, 4], [/tipo/i, 5]]

export function parseTable(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  const sep = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.includes(';')) ? ';' : '\t'
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')))
}

const okDate = (y, m, d) => {
  const dt = new Date(Date.UTC(+y, +m - 1, +d))
  return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +m - 1 && dt.getUTCDate() === +d
    ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : ''
}
export function parseDate(s) {
  s = String(s ?? '').trim()
  let m
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return okDate(m[1], m[2], m[3])
  if ((m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/))) return okDate(m[3].length === 2 ? '20' + m[3] : m[3], m[2], m[1])
  if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(Math.round((Number(s) - 25569) * 864e5)).toISOString().slice(0, 10)
  return ''
}
export function parseMoney(s) {
  let t = String(s ?? '').replace(/R\$|\s/g, '')
  if (!t || /^\d{4}-\d{2}-\d{2}/.test(t)) return ''
  const neg = /^\(.*\)$/.test(t) || t.startsWith('-')
  t = t.replace(/[()-]/g, '')
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  else if (t.includes(',')) t = t.replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(t)) return ''
  return neg ? -Number(t) : Number(t)
}

// Descobre cabeçalho e a que campo cada coluna colada corresponde
export function detect(rows) {
  if (!rows.length) return { hasHeader: false, mapping: [] }
  const ncol = Math.max(...rows.map((r) => r.length))
  const hits = rows[0].map((c) => HDR.find(([re]) => re.test(c))?.[1])
  const mapping = Array(ncol).fill(-1)
  const used = new Set()
  if (hits.filter((v) => v != null).length >= 2) {
    hits.forEach((v, i) => { if (v != null && !used.has(v)) { mapping[i] = v; used.add(v) } })
    return { hasHeader: true, mapping }
  }
  const textOrder = [2, 3, 5]
  const cnpj = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2}/
  for (let c = 0; c < ncol; c++) {
    const cells = rows.map((r) => r[c] ?? '').filter((x) => x !== '')
    if (!cells.length) continue
    const frac = (f) => cells.filter(f).length / cells.length
    let t
    if (!used.has(0) && frac((x) => parseDate(x) !== '') >= 0.7) t = 0
    else if (!used.has(4) && frac((x) => cnpj.test(x)) >= 0.5) t = 4
    else if (!used.has(1) && frac((x) => parseMoney(x) !== '') >= 0.7) t = 1
    else t = textOrder.find((f) => !used.has(f)) ?? -1
    if (t >= 0) { mapping[c] = t; used.add(t) }
  }
  return { hasHeader: false, mapping }
}

export function build(rows, mapping, hasHeader) {
  return (hasHeader ? rows.slice(1) : rows).map((r) => {
    const o = { 'DATA DE RECEBIMENTO': '', 'VALOR DA APLICAÇÃO': '', ORIGEM: '', 'INSTITUIÇÃO': '', 'CNPJ / CPF': '', TIPO: '' }
    mapping.forEach((t, c) => {
      if (t < 0) return
      const v = r[c] ?? ''
      o[FIELDS[t][0]] = t === 0 ? parseDate(v) : t === 1 ? parseMoney(v) : v
    })
    return { ...o, CATEGORIA: categorize(o) }
  })
}
export const isValid = (r) => !!r['DATA DE RECEBIMENTO'] && typeof r['VALOR DA APLICAÇÃO'] === 'number'
export const dupKey = (r) => [r['DATA DE RECEBIMENTO'], r['VALOR DA APLICAÇÃO'], r.ORIGEM, r.TIPO].join('|')
