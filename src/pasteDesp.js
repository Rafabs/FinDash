import { parseDate, parseMoney as parseMoneyRaw } from './paste.js'

// aceita "r$ 150,00", "R$150", "150,00" (maiúsculas ou minúsculas)
const parseMoney = (s) => parseMoneyRaw(String(s ?? '').replace(/r\$/gi, 'R$'))

// ---------- utilidades ----------
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9$ ]+/g, ' ').replace(/\s+/g, ' ').trim()

// rótulos aceitos para cada campo (despesa/custo/conta..., valor/preço..., pago em/pagamento...)
const FIELD_RES = [
  ['data', /(pag|data|venc|quit|compet|refer|^mes\b)/],
  ['valor', /(valor|preco|total|quantia|montante|vlr|^r\$)/],
  ['conta', /(despesa|custo|conta|gasto|tipo|categoria)/],
  ['desc', /(descri|item|obs|detalhe|nome|cota)/],
]
export const fieldOf = (key) => {
  const k = norm(key)
  if (!k || k.length > 32) return null
  for (const [f, re] of FIELD_RES) if (re.test(k)) return f
  return null
}

const MES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 }
// além de dd/mm/aaaa e aaaa-mm-dd: "05/2020", "15/05" (ano atual), "maio/2020", "maio de 2020"
export function parseDateLoose(s) {
  const t = String(s ?? '').trim()
  if (!t) return ''
  const d = parseDate(t)
  if (d) return d
  let m
  if ((m = t.match(/^(\d{1,2})[/.-](\d{4})$/))) return `${m[2]}-${m[1].padStart(2, '0')}-01`
  if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})$/))) return parseDate(`${m[1]}/${m[2]}/${new Date().getFullYear()}`)
  if ((m = norm(t).match(/^([a-z]{3,9})(?: de)? ?(\d{4})$/)) && MES[m[1].slice(0, 3)]) return `${m[2]}-${String(MES[m[1].slice(0, 3)]).padStart(2, '0')}-01`
  return ''
}

// "energia" -> "ENERGIA ELÉTRICA" quando já existe uma conta parecida; senão MAIÚSCULAS
export function matchConta(name, types = []) {
  const raw = String(name ?? '').trim()
  if (!raw) return ''
  const n = norm(raw)
  const exact = types.find((t) => norm(t) === n)
  if (exact) return exact
  const part = types.filter((t) => { const tn = norm(t); return n.length >= 4 && (tn.startsWith(n) || n.startsWith(tn) || tn.split(' ').includes(n)) })
  return part.length === 1 ? part[0] : raw.toUpperCase()
}

// ---------- extração ----------
const TXT_DATE = /\b(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?(?:\s+de)?[\s/.-]*\d{4}\b/i
const DATE_RE = /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})/
function fromFree(line) { // "Energia elétrica - R$ 150,00 - 15/05/2020" (ordem livre)
  let rest = line
  let date = ''
  const tm = rest.match(TXT_DATE) // "maio/2020", "mai de 2020"
  if (tm) { date = parseDateLoose(tm[0]); rest = rest.replace(tm[0], ' ') }
  const dm = !date && rest.match(DATE_RE)
  if (dm) { date = parseDateLoose(dm[1]); rest = rest.replace(dm[0], ' ') }
  const nums = [...rest.matchAll(/(?:R\$\s*)?-?\d[\d.]*(?:,\d{1,2})?/gi)]
  const pick = nums.find((m) => /R\$/i.test(m[0])) || [...nums].reverse().find((m) => /,\d/.test(m[0])) || nums[nums.length - 1]
  let valor = ''
  if (pick) { valor = parseMoney(pick[0]); rest = rest.replace(pick[0], ' ') }
  const conta = rest.replace(/R\$/gi, ' ').replace(/[|;·–—]+/g, ' ').replace(/(^|\s)[-:](?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim()
  return { date, valor, conta, desc: '' }
}

function fromCells(cells, map) {
  const r = { date: '', valor: '', conta: '', desc: '' }
  if (map) { // com cabeçalho
    cells.forEach((c, i) => {
      const f = map[i]
      if (f === 'data') r.date = parseDateLoose(c)
      else if (f === 'valor') r.valor = parseMoney(c)
      else if (f) r[f] = c.trim()
    })
    return r
  }
  const texts = [] // sem cabeçalho: reconhece pelo conteúdo de cada célula
  cells.forEach((c) => {
    if (!c.trim()) return
    const d = parseDateLoose(c)
    if (d && !r.date) { r.date = d; return }
    const v = parseMoney(c)
    if (v !== '' && r.valor === '') { r.valor = v; return }
    texts.push(c.trim())
  })
  r.conta = texts[0] || ''
  r.desc = texts[1] || ''
  return r
}

// Interpreta texto colado em 3 formatos: blocos "rótulo: valor", tabela (Excel) ou linhas livres
export function parseDespesas(text, types = []) {
  const lines = String(text ?? '').replace(/\r/g, '').split('\n')
  const filled = lines.filter((l) => l.trim())
  if (!filled.length) return { records: [], ignored: [], format: '' }
  const kv = (l) => { const m = l.match(/^\s*([^:=\t]{1,32}?)\s*[:=]\s*(.*)$/); return m ? { val: m[2].trim(), f: fieldOf(m[1]) } : null }
  const known = filled.filter((l) => kv(l)?.f).length
  const ignored = []
  let recs = [], format

  if (known >= 2 && known >= filled.length / 2) {
    format = 'blocos'
    let cur = {}
    const flush = () => { if (Object.keys(cur).length) recs.push({ date: parseDateLoose(cur.data), valor: parseMoney(cur.valor), conta: cur.conta || '', desc: cur.desc || '' }); cur = {} }
    lines.forEach((l) => {
      if (!l.trim()) return flush()
      const k = kv(l)
      if (!k?.f) return ignored.push(l.trim())
      if (cur[k.f] !== undefined) flush() // campo repetido = começou outro registro
      cur[k.f] = k.val
    })
    flush()
  } else if (filled.filter((l) => l.includes('\t') || l.includes(';')).length >= filled.length / 2) {
    format = 'tabela'
    const sep = filled.some((l) => l.includes('\t')) ? '\t' : ';'
    const rows = filled.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')))
    const hdr = rows[0].map((c) => fieldOf(c))
    const hasHeader = hdr.filter(Boolean).length >= 2 && rows[0].every((c) => parseMoney(c) === '' && !parseDateLoose(c))
    const map = hasHeader ? hdr : null
    recs = (hasHeader ? rows.slice(1) : rows).map((c) => fromCells(c, map))
  } else {
    format = 'linhas'
    recs = filled.map(fromFree)
  }
  recs = recs.filter((r) => r.conta || r.valor !== '' || r.date).map((r) => ({ ...r, conta: matchConta(r.conta, types), desc: r.desc.trim() }))
  return { records: recs, ignored, format }
}

export const EXEMPLO = `despesa: energia elétrica
valor: R$ 150,00
pago em: 15/05/2020

custo: internet
preço: R$ 119,90
pagamento: 15/05/2020`
