import * as XLSX from 'xlsx'
import { prefsToRows, prefsFromRows } from './prefs.js'

// [coluna no banco, tipo, rótulo exibido]
// tipos: text | num | money | date | calc (texto/num calculado) | calcm (valor em R$ calculado)
export const CART = [
  ['DATA_APLICACAO', 'date', 'Data de Aplicação'],
  ['QTD_COMPRA', 'num', 'Qtd.'],
  ['PRC_UNIT', 'money', 'Preço Unitário'],
  ['PAPEL', 'text', 'Papel'],
  ['VLR_APLICACAO', 'money', 'Total Aplicado'],
  ['CUSTO_MEDIO', 'calcm', 'Custo Médio'],
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
// Resgates: rentabilidade (lucro) obtida até a data do resgate; soma-se às entradas
export const RK = 'RENTABILIDADE ATÉ DATA RESGATE'
export const RES = [
  ['DATA_RESGATE', 'date', 'Data'],
  ['PRODUTO', 'text', 'Produto', 260],
  [RK, 'money', 'Rentabilidade'],
]
export const SHEETS = {
  carteira: { name: 'Control_Fynn', cols: CART },
  extrato: { name: 'Extrato', cols: EXT },
  despesas: { name: 'Despesas', cols: [] },
  resgates: { name: 'Resgates', cols: RES },
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
// Previdência privada: categorias PGBL e VGBL (aportes mensais viram lotes de um mesmo plano, em cotas)
export const PREV_CATS = ['PGBL', 'VGBL']
// reconhece PGBL, VGBL e "PREVIDÊNCIA PRIVADA" na categoria ou no produto
export const isPrevidencia = (r) => [r?.TIPO_PRODUTO, r?.PRODUTO].some((v) => /\b(PGBL|VGBL)\b|PREVID[EÊ]NCIA/i.test(String(v || '').normalize('NFC')))
// fundos de previdência da Carteira (renda variável com papel = nome do fundo), com saldo, cotas e cota atual
export function previdenciaFunds(rows) {
  const m = new Map()
  ;(rows || []).filter((r) => isPrevidencia(r) && groupable(r)).forEach((r) => {
    const fd = m.get(r.PAPEL) || { PAPEL: r.PAPEL, BANCO: r.BANCO, TIPO_PRODUTO: r.TIPO_PRODUTO, PRODUTO: r.PRODUTO, lots: [], saldo: 0, aplicado: 0, qtd: 0, price: 0, date: '' }
    fd.lots.push(r)
    fd.saldo += Number(r.TOTAL_ATUAL) || 0; fd.aplicado += Number(r.VLR_APLICACAO) || 0; fd.qtd += Number(r.QTD_COMPRA) || 0
    if (String(r.ULTIMA_ATUAL) >= fd.date) { fd.date = String(r.ULTIMA_ATUAL); fd.price = Number(r.PRC_UNIT) || 0 }
    m.set(r.PAPEL, fd)
  })
  return [...m.values()].sort((x, y) => String(x.PAPEL).localeCompare(String(y.PAPEL)))
}
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
// Custo médio (preço médio) de cada papel de renda variável, como em FIIs e ações:
// total aplicado ÷ quantidade, somando todos os lotes do mesmo papel. Renda fixa fica em branco.
// É calculado na hora de exibir/exportar (não é gravado), então acompanha qualquer aporte ou exclusão.
export function withAvgCost(rows) {
  const acc = {}
  rows.forEach((r) => { if (groupable(r)) { const a = (acc[r.PAPEL] ||= { v: 0, q: 0 }); a.v += n(r.VLR_APLICACAO); a.q += n(r.QTD_COMPRA) } })
  return rows.map((r) => ({ ...r, CUSTO_MEDIO: groupable(r) && acc[r.PAPEL].q > 0 ? Math.round((acc[r.PAPEL].v / acc[r.PAPEL].q) * 1e4) / 1e4 : '' }))
}

const iso = (v) => {
  if (v instanceof Date) return new Date(v.getTime() + 12 * 36e5 - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return v == null ? '' : String(v).trim().slice(0, 10)
}

// ---- Despesas: aba "larga" (DATA, VALOR, TIPO_CONTA, COTA_1, VALOR, COTA_2, VALOR, ...) ----
// No app: { DATA: 'AAAA-MM-01', TIPO_CONTA, ITENS: [{ NOME, VALOR }] } (o total é sempre a soma dos itens)
export const monthOf = (s) => String(s || '').slice(0, 7)
export const totalOf = (r) => round2((r.ITENS || []).reduce((t, i) => t + (Number(i.VALOR) || 0), 0))
export const installmentItems = (rows) => (rows || []).flatMap((r, rowIndex) => (r.ITENS || []).flatMap((item, itemIndex) => item.PARCELAMENTO ? [{ ...item.PARCELAMENTO, descricao: item.NOME, valor: Number(item.VALOR) || 0, conta: r.TIPO_CONTA, mes: monthOf(r.DATA), rowIndex, itemIndex }] : []))
// Grupo dentro de grupo: cada linha pode ter PAI (nome do grupo onde ela está). O pai vale para o grupo
// inteiro (todas as linhas com o mesmo nome); a linha mais recente com PAI define. Ciclos são ignorados.
export function groupParents(rows) {
  const raw = new Map()
  ;[...(rows || [])].sort((a, b) => String(a.DATA).localeCompare(String(b.DATA))).forEach((r) => {
    const g = String(r.TIPO_CONTA || '').trim(), p = String(r.PAI || '').trim()
    if (g && p) raw.set(g, p)
  })
  const out = new Map()
  raw.forEach((p, g) => {
    const seen = new Set([g]); let cur = p, ok = true
    while (cur) { if (seen.has(cur)) { ok = false; break } seen.add(cur); cur = raw.get(cur) }
    if (ok) out.set(g, p)
  })
  return out
}
// caminho do grupo da raiz até ele, ex.: ['ALUGUEL', 'CONDOMÍNIO']
export function groupPath(name, parents) {
  const path = [name]; const seen = new Set(path); let cur = parents?.get(name)
  while (cur && !seen.has(cur)) { path.unshift(cur); seen.add(cur); cur = parents.get(cur) }
  return path
}
export function expenseBreakdown(rows, parentsArg) {
  const parents = parentsArg || groupParents(rows)
  const groups = new Map()
  rows.forEach((row) => {
    const own = String(row.TIPO_CONTA || '').trim() || 'N/A'
    const path = groupPath(own, parents)
    const name = path[0] // o total sobe para o grupo principal (sem contar duas vezes)
    const prefix = path.slice(1).join(' › ')
    if (!groups.has(name)) groups.set(name, { name, total: 0, items: new Map(), cats: new Map() })
    const group = groups.get(name)
    ;(row.ITENS || []).forEach((item) => {
      const base = String(item.NOME || '').trim() || '(Sem descrição)'
      const itemName = prefix ? `${prefix} › ${base}` : base
      const value = Number(item.VALOR) || 0
      group.total += value
      group.items.set(itemName, (group.items.get(itemName) || 0) + value)
      const cat = String(item.CATEGORIA || '').trim()
      group.cats.set(cat, (group.cats.get(cat) || 0) + value)
    })
  })
  return [...groups.values()]
    .map((group) => ({
      name: group.name,
      total: round2(group.total),
      items: [...group.items].map(([name, value]) => ({ name, total: round2(value) })).sort((a, b) => b.total - a.total),
      // subtotal por categoria (só quando o grupo tem algum item categorizado)
      categories: [...group.cats.keys()].some(Boolean)
        ? [...group.cats].map(([name, value]) => ({ name: name || 'Sem categoria', total: round2(value) })).sort((a, b) => b.total - a.total)
        : [],
    }))
    .sort((a, b) => b.total - a.total)
}
// Junta linhas novas na fatura que já existe (mesma conta e mesmo mês): as parcelas e os lançamentos entram como
// itens da linha existente. Se o mês ainda não tem fatura dessa conta, a linha nova é criada.
export function mergeExpenseRows(rows, novas) {
  const key = (r) => `${String(r.TIPO_CONTA || '').trim().toLocaleLowerCase()}|${monthOf(r.DATA)}`
  const out = [...(rows || [])]
  ;(novas || []).forEach((n) => {
    const i = out.findIndex((r) => key(r) === key(n))
    if (i < 0) { out.push(n); return }
    const itens = [...(out[i].ITENS || []), ...(n.ITENS || [])]
    out[i] = { ...out[i], ITENS: itens, ...(out[i].VALOR != null ? { VALOR: totalOf({ ITENS: itens }) } : {}) }
  })
  return out
}

export function moveExpenseItem(rows, fromRow, itemIndex, toRow) {
  const source = rows[fromRow], target = rows[toRow]
  if (fromRow === toRow || !source || !target || monthOf(source.DATA) !== monthOf(target.DATA)) return rows
  const item = source.ITENS[itemIndex]
  if (!item) return rows
  const next = [...rows]
  next[toRow] = { ...target, ITENS: [...target.ITENS, item] }
  next[fromRow] = { ...source, ITENS: source.ITENS.filter((_, i) => i !== itemIndex) } // o grupo de origem pode ficar vazio
  return next
}

// ---------- Baixa (pagamento) de despesas ----------
// Itens novos nascem "a pagar" (PAGAMENTO.pago = false) e só contam como pagos depois da baixa.
// Itens antigos, sem PAGAMENTO, mantêm a regra anterior (pagos quando o mês já chegou); parcelas usam PARCELAMENTO.valorPago.
export const itemPaid = (it, ym, currentMonth) => {
  const v = Number(it.VALOR) || 0
  if (it.PARCELAMENTO) return Math.min(v, Number(it.PARCELAMENTO.valorPago) || 0)
  if (it.PAGAMENTO) return v < 0 || it.PAGAMENTO.pago ? v : 0
  return ym > currentMonth ? 0 : v
}
export const payDate = (it) => it.PARCELAMENTO?.dataPagamento || it.PAGAMENTO?.data || ''
export const payPatch = (it, date) => (it.PARCELAMENTO
  ? { PARCELAMENTO: { ...it.PARCELAMENTO, valorPago: round2(Number(it.VALOR) || 0), dataPagamento: date } }
  : { PAGAMENTO: { pago: true, data: date } })
export const reopenPatch = (it) => (it.PARCELAMENTO
  ? { PARCELAMENTO: { ...it.PARCELAMENTO, valorPago: 0, dataPagamento: '' } }
  : { PAGAMENTO: { pago: false } })
const curYM = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}` }
export const payStatus = (it, ym, cur = curYM()) => {
  const v = Number(it.VALOR) || 0
  return v < 0 ? 'Abatimento' : !v ? '' : itemPaid(it, ym, cur) >= v ? 'Paga' : 'Pendente'
}

function toDespesas(ws) {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
  if (!aoa.length || !aoa[0].includes('TIPO_CONTA')) return null
  const parcelColumns = new Map()
  aoa[0].forEach((header, column) => {
    const match = String(header || '').match(/^PARCELAMENTO_(\d+)$/)
    if (match) parcelColumns.set(Number(match[1]), column)
  })
  const catColumns = new Map()
  aoa[0].forEach((header, column) => {
    const match = String(header || '').trim().match(/^CATEGORIA[_ ]?(\d+)$/i)
    if (match) catColumns.set(Number(match[1]), column)
  })
  const payColumns = new Map()
  aoa[0].forEach((header, column) => {
    const match = String(header || '').match(/^PAGAMENTO_(\d+)$/)
    if (match) payColumns.set(Number(match[1]), column)
  })
  const paiCol = aoa[0].indexOf('GRUPO_PAI')
  const itemColumnsEnd = Math.min(aoa[0].length, ...parcelColumns.values(), ...payColumns.values(), ...catColumns.values(), ...(paiCol >= 0 ? [paiCol] : []))
  const out = []
  aoa.slice(1).forEach((row) => {
    const data = iso(row[0]), tipo = String(row[2] ?? '').trim()
    if (!data || !tipo) return
    const itens = []
    for (let k = 3; k < itemColumnsEnd; k += 2) {
      const v = row[k + 1]
      if (v === null || v === undefined || v === '' || isNaN(Number(v))) continue // linhas "vazias" do mês futuro são ignoradas
      const item = { NOME: String(row[k] ?? '').trim(), VALOR: round2(v) }
      const catColumn = catColumns.get((k - 3) / 2 + 1)
      const categoria = catColumn == null ? '' : String(row[catColumn] ?? '').trim()
      if (categoria) item.CATEGORIA = categoria.slice(0, 60)
      const metadataColumn = parcelColumns.get((k - 3) / 2 + 1)
      const rawMetadata = metadataColumn == null ? null : row[metadataColumn]
      if (rawMetadata) {
        try {
          const metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata
          const numero = Number(metadata?.numero), quantidade = Number(metadata?.quantidade)
          if (metadata && typeof metadata.id === 'string' && Number.isInteger(numero) && Number.isInteger(quantidade) && numero >= 1 && quantidade >= 2 && numero <= quantidade) {
            item.PARCELAMENTO = {
              id: metadata.id.slice(0, 120), numero, quantidade,
              valorPago: round2(Math.max(0, Math.min(item.VALOR, Number(metadata.valorPago) || 0))),
              ...(typeof metadata.dataPagamento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(metadata.dataPagamento) ? { dataPagamento: metadata.dataPagamento } : {}),
            }
          }
        } catch { /* mantém a despesa mesmo se metadados ocultos estiverem inválidos */ }
      }
      const payColumn = payColumns.get((k - 3) / 2 + 1)
      const rawPay = payColumn == null ? null : row[payColumn]
      if (rawPay && !item.PARCELAMENTO) {
        try {
          const m = typeof rawPay === 'string' ? JSON.parse(rawPay) : rawPay
          if (m && typeof m.pago === 'boolean') item.PAGAMENTO = { pago: m.pago, ...(m.pago && typeof m.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.data) ? { data: m.data } : {}) }
        } catch { /* ignora metadado inválido */ }
      }
      itens.push(item)
    }
    const pai = paiCol >= 0 ? String(row[paiCol] ?? '').trim() : ''
    if (itens.length) out.push({ DATA: monthOf(data) + '-01', TIPO_CONTA: tipo, ...(pai ? { PAI: pai } : {}), ITENS: itens })
  })
  return out
}

// Aba "Despesas por categoria" (editável no Excel): preenche a categoria dos itens que ainda não têm,
// casando por mês + grupo + item (+ valor; se o valor mudou, ignora o valor).
function applyCategorySheet(despesas, ws) {
  const mesOf = (v) => v instanceof Date || typeof v === 'number' ? monthOf(iso(v)) : /^\d{4}-\d{2}/.test(String(v)) ? String(v).slice(0, 7) : monthOf(iso(v))
  const norm = (v) => String(v ?? '').trim().toLowerCase()
  const exact = new Map(), loose = new Map()
  XLSX.utils.sheet_to_json(ws, { defval: '' }).forEach((r) => {
    const cat = String(r.CATEGORIA ?? '').trim()
    if (!cat || !r.ITEM) return
    const base = `${mesOf(r['MÊS'] ?? r.MES)}|${norm(r.GRUPO)}|${norm(r.ITEM)}`
    ;[[exact, `${base}|${round2(r.VALOR)}`], [loose, base]].forEach(([map, key]) => map.set(key, [...(map.get(key) || []), cat]))
  })
  const take = (map, key) => { const q = map.get(key); return q?.length ? q.shift() : '' }
  despesas.forEach((row) => row.ITENS.forEach((item) => {
    if (item.CATEGORIA) return
    const base = `${monthOf(row.DATA)}|${norm(row.TIPO_CONTA)}|${norm(item.NOME)}`
    const cat = take(exact, `${base}|${round2(item.VALOR)}`) || take(loose, base)
    if (cat) item.CATEGORIA = cat.slice(0, 60)
  }))
}

function despSheet(rows, includeParcelMetadata = false) {
  const maxN = Math.max(12, ...rows.map((r) => r.ITENS.length))
  const head = ['DATA', 'VALOR', 'TIPO_CONTA']
  for (let k = 1; k <= maxN; k++) head.push(`COTA_${k}`, 'VALOR')
  if (includeParcelMetadata) for (let k = 1; k <= maxN; k++) head.push(`PARCELAMENTO_${k}`)
  const withPay = includeParcelMetadata && rows.some((r) => r.ITENS.some((i) => i.PAGAMENTO))
  if (withPay) for (let k = 1; k <= maxN; k++) head.push(`PAGAMENTO_${k}`)
  const withItemCat = rows.some((r) => r.ITENS.some((i) => i.CATEGORIA))
  if (withItemCat) for (let k = 1; k <= maxN; k++) head.push(`CATEGORIA_${k}`)
  const withParent = rows.some((r) => r.PAI)
  if (withParent) head.push('GRUPO_PAI')
  const aoa = [head, ...rows.map((r) => [
    r.DATA, totalOf(r), r.TIPO_CONTA,
    ...Array.from({ length: maxN }, (_, k) => [r.ITENS[k]?.NOME ?? null, r.ITENS[k]?.VALOR ?? null]).flat(),
    ...(includeParcelMetadata ? Array.from({ length: maxN }, (_, k) => r.ITENS[k]?.PARCELAMENTO ? JSON.stringify(r.ITENS[k].PARCELAMENTO) : null) : []),
    ...(withPay ? Array.from({ length: maxN }, (_, k) => r.ITENS[k]?.PAGAMENTO ? JSON.stringify(r.ITENS[k].PAGAMENTO) : null) : []),
    ...(withItemCat ? Array.from({ length: maxN }, (_, k) => r.ITENS[k]?.CATEGORIA || null) : []),
    ...(withParent ? [r.PAI || null] : []),
  ])]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  if (includeParcelMetadata) ws['!cols'] = [
    ...Array.from({ length: 3 + 2 * maxN }, () => ({})),
    ...Array.from({ length: maxN }, () => ({ hidden: true })),
    ...(withPay ? Array.from({ length: maxN }, () => ({ hidden: true })) : []),
    ...(withItemCat ? Array.from({ length: maxN }, () => ({})) : []),
    ...(withParent ? [{}] : []),
  ]
  rows.forEach((r, i) => { // mantém a fórmula de soma da sua planilha
    const cells = Array.from({ length: maxN }, (_, k) => XLSX.utils.encode_col(4 + 2 * k) + (i + 2)).join('+')
    ws['B' + (i + 2)] = { t: 'n', v: totalOf(r), f: `SUM(${cells})` }
  })
  return ws
}

function toRows(ws, cols) {
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
  return raw
    .map((o) => Object.fromEntries(cols.map(([k, t]) => [k, t === 'date' ? iso(o[k]) : isNum(t) ? (o[k] === '' ? '' : n(o[k])) : String(o[k] ?? '').trim()])))
    .filter((r) => cols.some(([k]) => r[k] !== '' && r[k] != null))
}

const NOTES_FORMAT_MARKER = 'FYNN_CONTROL_NOTES_HTML_V1'
function toNotes(ws) {
  if (ws?.A1?.v !== 'NOTAS') return null
  const result = { text: String(ws.A2?.v ?? '') }
  if (ws.B1?.v === NOTES_FORMAT_MARKER && typeof ws.B2?.v === 'string') result.html = ws.B2.v
  return result
}

// Aceita .xlsx com múltiplas abas ou .csv (detecta a tabela pelo cabeçalho)
export async function importFile(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const out = {}
  const first = wb.Sheets[wb.SheetNames[0]]
  const isCsv = /\.csv$/i.test(file.name)
  const find = (def, idx) => wb.Sheets[def.name] || wb.Sheets[wb.SheetNames[idx]]
  const hasHdr = (ws, h) => ws && Object.keys(ws).some((k) => ws[k]?.v === h)
  if (isCsv) {
    if (hasHdr(first, 'DATA_APLICACAO')) out.carteira = toRows(first, CART).map(recalcCart)
    else if (hasHdr(first, 'TIPO_CONTA')) out.despesas = toDespesas(first) || []
    else if (hasHdr(first, 'DATA_RESGATE')) out.resgates = toRows(first, RES)
    else out.extrato = toRows(first, EXT).map(withCat)
    return out
  }
  const c = find(SHEETS.carteira, 0), e = find(SHEETS.extrato, 1)
  if (c) out.carteira = toRows(c, CART).map(recalcCart)
  if (e) out.extrato = toRows(e, EXT).map(withCat)
  const dsp = wb.Sheets[SHEETS.despesas.name] || (wb.SheetNames[2] ? wb.Sheets[wb.SheetNames[2]] : null)
  const dd = dsp && toDespesas(dsp)
  const categorySheet = wb.Sheets['Despesas por categoria']
  if (dd && categorySheet) applyCategorySheet(dd, categorySheet)
  if (dd) out.despesas = dd
  const accountsSheet = wb.Sheets['Contas de despesas']
  if (accountsSheet) out.contasDespesas = XLSX.utils.sheet_to_json(accountsSheet, { defval: '' })
    .map((r) => ({ name: String(r.NOME || '').trim(), icon: String(r.ICONE || '🧾').trim() || '🧾', logo: String(r.LOGO || ''), ...(String(r.COR || '').trim() ? { color: String(r.COR).trim() } : {}) }))
    .filter((r) => r.name)
  const rs = wb.Sheets[SHEETS.resgates.name] || (wb.SheetNames[3] ? wb.Sheets[wb.SheetNames[3]] : null)
  if (rs && hasHdr(rs, 'DATA_RESGATE')) out.resgates = toRows(rs, RES)
  const noteSheet = wb.Sheets.Notas
  const notes = toNotes(noteSheet)
  if (notes !== null) {
    out.notas = notes.text
    out.notasHtml = notes.html || ''
  }
  const prefSheet = wb.Sheets['Preferências']
  if (prefSheet) out.prefs = prefsFromRows(XLSX.utils.sheet_to_json(prefSheet, { header: 1, defval: '' }).slice(1))
  return out
}

const sheetOf = (rows, cols) => XLSX.utils.json_to_sheet(rows, { header: cols.map(([k]) => k) })

export function exportCsv(key, rows) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, key === 'despesas' ? despSheet(rows) : sheetOf(rows, SHEETS[key].cols), SHEETS[key].name)
  XLSX.writeFile(wb, `${SHEETS[key].name}.csv`, { bookType: 'csv' })
}

export function exportXlsx(data) {
  const wb = XLSX.utils.book_new()
  for (const k of ['carteira', 'extrato'])
    XLSX.utils.book_append_sheet(wb, sheetOf(data[k], SHEETS[k].cols), SHEETS[k].name)
  if (data.despesas?.length) XLSX.utils.book_append_sheet(wb, despSheet(data.despesas, true), SHEETS.despesas.name)
  if (data.contasDespesas?.length) XLSX.utils.book_append_sheet(wb, sheetOf(data.contasDespesas.map((a) => ({ NOME: a.name, ICONE: a.icon || '🧾', LOGO: a.logo || '', COR: a.color || '' })), [['NOME'], ['ICONE'], ['LOGO'], ['COR']]), 'Contas de despesas')
  if (data.resgates?.length) XLSX.utils.book_append_sheet(wb, sheetOf(data.resgates, RES), SHEETS.resgates.name)
  const noteSheet = XLSX.utils.aoa_to_sheet([
    ['NOTAS', NOTES_FORMAT_MARKER],
    [data.notas || '', data.notasHtml || ''],
  ])
  noteSheet['!cols'] = [{ wch: 100 }, { hidden: true }]
  XLSX.utils.book_append_sheet(wb, noteSheet, 'Notas')
  // relatório legível das categorias (só leitura: a importação lê as colunas CATEGORIA_n da aba Despesas)
  if (data.despesas?.some((r) => r.ITENS.some((i) => i.CATEGORIA || i.PAGAMENTO))) {
    const lines = [...data.despesas].sort((x, y) => String(y.DATA).localeCompare(String(x.DATA)))
      .flatMap((r) => r.ITENS.map((i) => [monthOf(r.DATA), r.TIPO_CONTA, i.NOME, i.CATEGORIA || '', Number(i.VALOR) || 0, payStatus(i, monthOf(r.DATA)), payDate(i)]))
    const catSheet = XLSX.utils.aoa_to_sheet([['MÊS', 'GRUPO', 'ITEM', 'CATEGORIA', 'VALOR', 'STATUS', 'DATA_PAGAMENTO'], ...lines])
    catSheet['!cols'] = [{ wch: 10 }, { wch: 24 }, { wch: 32 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, catSheet, 'Despesas por categoria')
  }
  if (data.prefs) {
    const ps = XLSX.utils.aoa_to_sheet(prefsToRows(data.prefs))
    ps['!cols'] = [{ wch: 22 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, ps, 'Preferências')
  }
  XLSX.writeFile(wb, 'fynn-control.xlsx', { cellStyles: true })
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
const TPL_RES = [
  { DATA_RESGATE: '2026-09-30', PRODUTO: 'RDB APLICAÇÃO', [RK]: 74.01 },
  { DATA_RESGATE: '2026-08-12', PRODUTO: 'TESOURO SELIC 2029', [RK]: 435.65 },
]
const TPL_DESP = [
  { DATA: '2026-09-01', TIPO_CONTA: 'CONDOMÍNIO', ITENS: [{ NOME: 'COND.', VALOR: 420 }, { NOME: 'ÁGUA', VALOR: 52.3 }, { NOME: 'GÁS', VALOR: 27.9 }] },
  { DATA: '2026-09-01', TIPO_CONTA: 'INTERNET', ITENS: [{ NOME: 'VIVO', VALOR: 119.9 }] },
  { DATA: '2026-09-01', TIPO_CONTA: 'CARTÃO DE CRÉDITO', ITENS: [{ NOME: 'ITAÚ', VALOR: 1180.4 }] },
  { DATA: '2026-09-01', TIPO_CONTA: 'CARTÃO DE CRÉDITO', ITENS: [{ NOME: 'NUBANK', VALOR: 640.15 }] },
]
// kind: 'xlsx' (5 abas) | 'carteira' | 'extrato' | 'despesas' | 'resgates' (csv)
export function downloadTemplate(kind) {
  const ck = CART.filter(([, t]) => t !== 'calc' && t !== 'calcm').map(([k]) => k)
  const ek = EXT.filter(([k]) => k !== 'CATEGORIA').map(([k]) => k)
  const make = {
    carteira: () => XLSX.utils.json_to_sheet(TPL_CART, { header: ck }),
    extrato: () => XLSX.utils.json_to_sheet(TPL_EXT, { header: ek }),
    despesas: () => despSheet(TPL_DESP),
    resgates: () => XLSX.utils.json_to_sheet(TPL_RES, { header: RES.map(([k]) => k) }),
  }
  const wb = XLSX.utils.book_new()
  ;(kind === 'xlsx' ? ['carteira', 'extrato', 'despesas', 'resgates'] : [kind]).forEach((k) => XLSX.utils.book_append_sheet(wb, make[k](), SHEETS[k].name))
  if (kind === 'xlsx') {
    const notes = XLSX.utils.aoa_to_sheet([['NOTAS', NOTES_FORMAT_MARKER], ['', '']])
    notes['!cols'] = [{ wch: 100 }, { hidden: true }]
    XLSX.utils.book_append_sheet(wb, notes, 'Notas')
  }
  if (kind === 'xlsx') XLSX.writeFile(wb, 'modelo-fynn-control.xlsx', { cellStyles: true })
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
  const despesas = []
  for (let m = 0; m < 12; m++) {
    const f = 1 + ((m * 7) % 5) / 20
    const mes = at(m, 1).slice(0, 7) + '-01'
    const add = (tipo, itens) => despesas.push({ DATA: mes, TIPO_CONTA: tipo, ITENS: itens.map(([NOME, v]) => ({ NOME, VALOR: +v.toFixed(2) })) })
    add('ALUGUEL', [['ALUGUEL', 1800]])
    add('CONDOMÍNIO', [['COND.', 420], ['ÁGUA', 55 * f], ['GÁS', 28 * f]])
    add('ENERGIA ELÉTRICA', [['TUSD', 38 * f], ['TE', 31 * f], ['COSIP', 9.66]])
    add('INTERNET', [['VIVO', 119.9]])
    add('MERCADO', [['MERCAD', 820 * f]])
    add('CARTÃO DE CRÉDITO', [['ITAÚ', 1100 * f]])
    add('CARTÃO DE CRÉDITO', [['NUBANK', 640 * f]])
    add('TRANSPORTE', [['TRANSP.', 260]])
  }
  const resgates = []
  const prods = [['RDB APLICAÇÃO', 74], ['TESOURO SELIC 2029', 190], ['AÇÃO FRACIONÁRIA', 3.2]]
  for (let m = 0; m < 12; m++) {
    prods.forEach(([p, base], n) => {
      if ((m + n) % 2) return
      resgates.push({ DATA_RESGATE: at(m, 20 + n), PRODUTO: p, [RK]: +(base * (0.8 + ((m * 5 + n * 3) % 7) / 10)).toFixed(2) })
    })
  }
  return { carteira, extrato: extrato.map(withCat), despesas, resgates }
}
