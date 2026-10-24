import { categorize, CATS } from './data.js'

export const FIELDS = [['DATA DE RECEBIMENTO', 'Data'], ['VALOR DA APLICAÇÃO', 'Valor'], ['ORIGEM', 'Origem'], ['INSTITUIÇÃO', 'Instituição'], ['CNPJ / CPF', 'CNPJ / CPF'], ['TIPO', 'Tipo'], ['CATEGORIA', 'Categoria']]
const HDR = [
  [/(data|dt|receb|pagamento|liquid|cr[eé]dito|movimento|lan[cç]amento|compet[eê]ncia)/i, 0],
  [/(valor|vlr|quantia|montante|r\$)/i, 1],
  [/(origem|descri|hist[oó]rico|memo|favorecido|pagador|refer[eê]ncia)/i, 2],
  [/(institui|banco|corretora|fonte pagadora)/i, 3],
  [/(cnpj|cpf|documento|inscri[cç][aã]o)/i, 4],
  [/(tipo|evento|natureza|opera[cç][aã]o)/i, 5],
  [/(categoria|classifica[cç][aã]o)/i, 6],
]
const cleanHeader = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9$]+/gi, ' ').trim()
const isBlank = (s) => /^(?:—|–|-|n\/?a|)$/i.test(String(s ?? '').trim())
const isDocument = (s) => {
  const digits = String(s ?? '').replace(/\D/g, '')
  return (digits.length === 11 || digits.length === 14) && /^[\d./-]+$/.test(String(s).trim())
}
const TYPE_HINT = /dividend|\bjcp\b|provento|sal[aá]rio|aluguel|resgate|transfer[eê]ncia|\bpix\b|dep[oó]sito|tarifa|venda/i
const INSTITUTION_HINT = /\b(banco|bank|corretora|financeira|pagamentos|investimentos|c[aâ]mbio|s\.a\.?|s\/a)\b/i

export function parseTable(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  const markdown = lines.some((l) => /^\s*\|.*\|\s*$/.test(l))
  if (markdown) return lines
    .filter((l) => !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l))
    .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
      .map((c) => c.trim().replace(/^:|:$/g, '').replace(/^\*\*(.*)\*\*$/, '$1').replace(/^`(.*)`$/, '$1').replace(/^"|"$/g, '')))
  const candidates = [
    { re: /\t+/, rank: 8 },
    { re: /\s*(?:→|⇒|➜|->|=>)\s*/, rank: 7 },
    { re: /\s*;\s*/, rank: 6 },
    { re: /\s+[-–—]\s+/, rank: 5 },
    { re: /,\s+/, rank: 4 }, // vírgula seguida de espaço: não divide os centavos de 750,00
    { re: /\s{2,}/, rank: 3 },
    { re: /\s*,\s*/, rank: 1 },
  ]
  const quality = (rows) => rows.reduce((total, row) => total + row.reduce((s, c) => {
    if (parseDate(c)) return s + 5
    if (isDocument(c)) return s + 5
    if (parseMoney(c) !== '') return s + 3
    if (CATS.some((cat) => cleanHeader(cat) === cleanHeader(c))) return s + 4
    if (TYPE_HINT.test(c) || INSTITUTION_HINT.test(c)) return s + 2
    return s + (String(c).trim() ? 0.1 : 0)
  }, 0), 0)
  let best = null
  for (const [candidateIndex, candidate] of candidates.entries()) {
    if (!lines.some((l) => candidate.re.test(l))) continue
    const rows = lines.map((l) => {
      const cells = l.split(candidate.re).map((c) => c.trim().replace(/^"|"$/g, ''))
      // Em CSV sem espaços, junte de volta a vírgula decimal (ex.: R$750,00,26/12/2026).
      if (candidateIndex === candidates.length - 1) {
        for (let i = 0; i < cells.length - 1; i++) {
          if (/^\d{1,2}$/.test(cells[i + 1]) && parseMoney(cells[i]) !== '' &&
              (cells[i].includes('R$') || /^\d+[.]?\d*$/.test(cells[i]))) {
            cells[i] += ',' + cells[i + 1]
            cells.splice(i + 1, 1)
          }
        }
      }
      return cells
    })
    if (Math.max(...rows.map((r) => r.length)) < 2) continue
    const score = quality(rows) + candidate.rank * rows.length
    if (!best || score > best.score) best = { rows, score }
  }
  if (best) return best.rows

  // Em texto separado por espaços simples, preserve expressões livres como uma célula
  // e só divida quando a linha contém pelo menos dois valores de formato reconhecível.
  return lines.map((line) => {
    const tokens = line.trim().split(/\s+/)
    const cells = []
    let text = []
    const flushText = () => { if (text.length) { cells.push(text.join(' ')); text = [] } }
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const value = token === 'R$' && tokens[i + 1] ? `${token} ${tokens[++i]}` : token
      if (parseDate(value) || isDocument(value) || parseMoney(value) !== '' || CATS.some((cat) => cleanHeader(cat) === cleanHeader(value))) {
        flushText()
        cells.push(value)
      } else text.push(value)
    }
    flushText()
    const recognizable = cells.filter((c) => parseDate(c) || isDocument(c) || parseMoney(c) !== '').length
    return recognizable >= 2 ? cells : [line.trim()]
  })
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
  const hits = rows[0].map((c) => HDR.find(([re]) => re.test(cleanHeader(c)))?.[1])
  const mapping = Array(ncol).fill(-1)
  const used = new Set()
  if (hits.filter((v) => v != null).length >= 2) {
    hits.forEach((v, i) => { if (v != null && !used.has(v)) { mapping[i] = v; used.add(v) } })
    return { hasHeader: true, mapping }
  }
  const textOrder = [2, 3, 5]
  for (let c = 0; c < ncol; c++) {
    const cells = rows.map((r) => r[c] ?? '').filter((x) => !isBlank(x))
    if (!cells.length) continue
    const frac = (f) => cells.filter(f).length / cells.length
    let t
    if (!used.has(0) && frac((x) => parseDate(x) !== '') >= 0.7) t = 0
    else if (!used.has(4) && frac(isDocument) >= 0.5) t = 4
    else if (!used.has(1) && frac((x) => parseMoney(x) !== '') >= 0.7) t = 1
    else if (!used.has(6) && frac((x) => CATS.some((cat) => cleanHeader(cat) === cleanHeader(x))) >= 0.5) t = 6
    else if (!used.has(5) && frac((x) => TYPE_HINT.test(x)) >= 0.5) t = 5
    else if (!used.has(3) && frac((x) => INSTITUTION_HINT.test(x)) >= 0.5) t = 3
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
      const value = isBlank(v) ? '' : v
      o[FIELDS[t][0]] = t === 0 ? parseDate(v) : t === 1 ? parseMoney(v) : value
    })
    return { ...o, CATEGORIA: o.CATEGORIA || categorize(o) }
  })
}
export const isValid = (r) => !!r['DATA DE RECEBIMENTO'] && typeof r['VALOR DA APLICAÇÃO'] === 'number'
export const dupKey = (r) => [r['DATA DE RECEBIMENTO'], r['VALOR DA APLICAÇÃO'], r.ORIGEM, r.TIPO].join('|')
