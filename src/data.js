import * as XLSX from 'xlsx'
import { prefsToRows, prefsFromRows } from './prefs.js'
import { splitPaths, joinPaths, rowComprovantes } from './anexos.js'

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
// Situação de cada despesa (por mês): paga · vencida (mês passado sem baixa) · vence esse mês · a vencer (mês futuro)
export const DUE_LABEL = { paga: 'PAGA', vencida: 'VENCIDA', vence: 'VENCE ESSE MÊS', avencer: 'A VENCER' }
export const dueStatus = (it, ym, cur = curYM()) => {
  const v = Number(it.VALOR) || 0
  if (!v) return ''
  if (v < 0) return 'credito' // abatimento: sem baixa
  if (itemPaid(it, ym, cur) >= v) return 'paga'
  return ym < cur ? 'vencida' : ym === cur ? 'vence' : 'avencer'
}
// situação da fatura (linha): a mais urgente entre os itens; 'paga' só quando tudo foi pago
export const rowDueStatus = (items, ym, cur = curYM()) => {
  const found = new Set((items || []).map((i) => dueStatus(i, ym, cur)))
  return ['vencida', 'vence', 'avencer', 'paga'].find((k) => found.has(k)) || ''
}
const DUE_XLSX = { paga: 'Paga', vencida: 'Vencida', vence: 'Vence este mês', avencer: 'A vencer', credito: 'Abatimento' }
export const payStatus = (it, ym, cur = curYM()) => DUE_XLSX[dueStatus(it, ym, cur)] || ''

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
  const compColumns = new Map() // COMPROVANTE_n (versão anterior, um por item): vira o comprovante da linha
  aoa[0].forEach((header, column) => {
    const match = String(header || '').trim().match(/^COMPROVANTE[_ ]?(\d+)$/i)
    if (match) compColumns.set(Number(match[1]), column)
  })
  const paiCol = aoa[0].indexOf('GRUPO_PAI')
  const faturaCol = aoa[0].findIndex((h) => String(h || '').trim().toUpperCase() === 'FATURA') // caminhos da fatura da linha (relativos à pasta de anexos)
  const comprovanteCol = aoa[0].findIndex((h) => String(h || '').trim().toUpperCase() === 'COMPROVANTE') // comprovante único da linha
  const itemColumnsEnd = Math.min(aoa[0].length, ...parcelColumns.values(), ...payColumns.values(), ...catColumns.values(), ...compColumns.values(), ...(paiCol >= 0 ? [paiCol] : []), ...(faturaCol >= 0 ? [faturaCol] : []), ...(comprovanteCol >= 0 ? [comprovanteCol] : []))
  const out = []
  aoa.slice(1).forEach((row) => {
    const data = iso(row[0]), tipo = String(row[2] ?? '').trim()
    if (!data || !tipo) return
    const itens = []
    const comprovantesItens = []
    for (let k = 3; k < itemColumnsEnd; k += 2) {
      const v = row[k + 1]
      if (v === null || v === undefined || v === '' || isNaN(Number(v))) continue // linhas "vazias" do mês futuro são ignoradas
      const item = { NOME: String(row[k] ?? '').trim(), VALOR: round2(v) }
      const catColumn = catColumns.get((k - 3) / 2 + 1)
      const categoria = catColumn == null ? '' : String(row[catColumn] ?? '').trim()
      if (categoria) item.CATEGORIA = categoria.slice(0, 60)
      const compColumn = compColumns.get((k - 3) / 2 + 1)
      const comprovantes = compColumn == null ? [] : splitPaths(row[compColumn])
      comprovantesItens.push(...comprovantes)
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
    const faturas = faturaCol >= 0 ? splitPaths(row[faturaCol]) : []
    const comprovantes = [...new Set([...(comprovanteCol >= 0 ? splitPaths(row[comprovanteCol]) : []), ...comprovantesItens])]
    if (itens.length) out.push({ DATA: monthOf(data) + '-01', TIPO_CONTA: tipo, ...(pai ? { PAI: pai } : {}), ...(faturas.length ? { FATURAS: faturas } : {}), ...(comprovantes.length ? { COMPROVANTES: comprovantes } : {}), ITENS: itens })
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
  const withFatura = rows.some((r) => r.FATURAS?.length)
  if (withFatura) head.push('FATURA')
  const withComprov = rows.some((r) => rowComprovantes(r).length)
  if (withComprov) head.push('COMPROVANTE')
  const aoa = [head, ...rows.map((r) => [
    r.DATA, totalOf(r), r.TIPO_CONTA,
    ...Array.from({ length: maxN }, (_, k) => [r.ITENS[k]?.NOME ?? null, r.ITENS[k]?.VALOR ?? null]).flat(),
    ...(includeParcelMetadata ? Array.from({ length: maxN }, (_, k) => r.ITENS[k]?.PARCELAMENTO ? JSON.stringify(r.ITENS[k].PARCELAMENTO) : null) : []),
    ...(withPay ? Array.from({ length: maxN }, (_, k) => r.ITENS[k]?.PAGAMENTO ? JSON.stringify(r.ITENS[k].PAGAMENTO) : null) : []),
    ...(withItemCat ? Array.from({ length: maxN }, (_, k) => r.ITENS[k]?.CATEGORIA || null) : []),
    ...(withParent ? [r.PAI || null] : []),
    ...(withFatura ? [joinPaths(r.FATURAS) || null] : []),
    ...(withComprov ? [joinPaths(rowComprovantes(r)) || null] : []),
  ])]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  if (includeParcelMetadata) ws['!cols'] = [
    ...Array.from({ length: 3 + 2 * maxN }, () => ({})),
    ...Array.from({ length: maxN }, () => ({ hidden: true })),
    ...(withPay ? Array.from({ length: maxN }, () => ({ hidden: true })) : []),
    ...(withItemCat ? Array.from({ length: maxN }, () => ({})) : []),
    ...(withParent ? [{}] : []),
    ...(withFatura ? [{ wch: 40 }] : []),
    ...(withComprov ? [{ wch: 40 }] : []),
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
  if (data.despesas?.some((r) => r.FATURAS?.length || rowComprovantes(r).length || r.ITENS.some((i) => i.CATEGORIA || i.PAGAMENTO))) {
    const lines = [...data.despesas].sort((x, y) => String(y.DATA).localeCompare(String(x.DATA)))
      .flatMap((r) => r.ITENS.map((i) => [monthOf(r.DATA), r.TIPO_CONTA, i.NOME, i.CATEGORIA || '', Number(i.VALOR) || 0, payStatus(i, monthOf(r.DATA)), payDate(i), joinPaths(r.FATURAS), joinPaths(rowComprovantes(r))]))
    const catSheet = XLSX.utils.aoa_to_sheet([['MÊS', 'GRUPO', 'ITEM', 'CATEGORIA', 'VALOR', 'STATUS', 'DATA_PAGAMENTO', 'FATURA', 'COMPROVANTE'], ...lines])
    catSheet['!cols'] = [{ wch: 10 }, { wch: 24 }, { wch: 32 }, { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 40 }]
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

// Dados de exemplo: tudo relativo à data de hoje (sempre parece atual) e sem números aleatórios.
// Cobre os recursos do app: renda fixa e variável, FIIs, ações, ETFs, previdência (PGBL/VGBL), proventos,
// categorias do extrato, grupos dentro de grupos, categorias por item, parcelamentos, baixa e situação das despesas.
export function demoData() {
  const now = new Date()
  const p2 = (v) => String(v).padStart(2, '0')
  const fmt = (x) => `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`
  // dia d (até 28) de "m meses atrás" (m negativo = meses futuros); no mês atual não passa de hoje
  const at = (m, d) => fmt(new Date(now.getFullYear(), now.getMonth() - m, m === 0 ? Math.min(d, now.getDate()) : d))
  const ago = (days) => fmt(new Date(now.getTime() - days * 864e5))
  const ym = (m) => at(m, 1).slice(0, 7)
  const calMonth = (m) => new Date(now.getFullYear(), now.getMonth() - m, 1).getMonth() + 1
  const wave = (m) => 1 + ((((m + 24) * 7) % 5) / 20) // variação mensal fixa, de 1,00 a 1,20
  const hoje = ago(0)

  // ---------- Carteira ----------
  const L = (o) => recalcCart({ IOF: '', ...o, ULTIMA_ATUAL: hoje })
  const rf = (dias, qtd, prc, banco, tipo, prod, atual) => L({ DATA_APLICACAO: ago(dias), QTD_COMPRA: qtd, PRC_UNIT: prc, PAPEL: 'N/A', BANCO: banco, TIPO_PRODUTO: tipo, PRODUTO: prod, TIPO_INV: 'RF', TOTAL_ATUAL: atual })
  const rv = (dias, qtd, custo, papel, tipo, prod, preco) => L({ DATA_APLICACAO: ago(dias), QTD_COMPRA: qtd, PRC_UNIT: preco, PAPEL: papel, VLR_APLICACAO: +(qtd * custo).toFixed(2), BANCO: 'CORRETORA EXEMPLO', TIPO_PRODUTO: tipo, PRODUTO: prod, TIPO_INV: 'RV' })
  const FII = 'FUNDOS IMOBILIÁRIOS'
  // previdência: cada aporte mensal é um lote do mesmo fundo; a cota cresce ~0,65% ao mês
  const prev = (papel, tipo, aporte, meses, cotaHoje) => Array.from({ length: meses }, (_, i) => {
    const k = meses - 1 - i
    const cota = cotaHoje / 1.0065 ** k
    return L({ DATA_APLICACAO: at(k, 10), QTD_COMPRA: +(aporte / cota).toFixed(4), PRC_UNIT: cotaHoje, PAPEL: papel, VLR_APLICACAO: aporte, BANCO: 'BANCO EXEMPLO', TIPO_PRODUTO: tipo, PRODUTO: 'PREVIDÊNCIA PRIVADA', TIPO_INV: 'RV' })
  })
  const carteira = normalizeGroups([
    rf(540, 1, 12000, 'BANCO DIGITAL', 'RDB 100% DO CDI', 'CONTA REMUNERADA', 14180.55),
    rf(900, 3, 14400, 'CORRETORA EXEMPLO', 'TESOURO SELIC', 'TESOURO SELIC 2029', 51964.2),
    rf(420, 1, 25000, 'CORRETORA EXEMPLO', 'TESOURO IPCA+', 'TESOURO IPCA+ 2035', 27610.8),
    rf(210, 1, 10000, 'BANCO EXEMPLO', 'LCI 95% DO CDI', 'LCI CARTEIRA IMOBILIÁRIA', 10870.3),
    rf(150, 1, 8000, 'BANCO EXEMPLO', 'LCA 92% DO CDI', 'LCA AGRONEGÓCIO', 8541.12),
    rf(75, 1, 3000, 'BANCO DIGITAL', 'CDB PRÉ 12,5% A.A.', 'CDB PREFIXADO 2027', 3071.4),
    rf(12, 1, 5000, 'BANCO DIGITAL', 'CDB 110% DO CDI', 'CDB LIQUIDEZ DIÁRIA', 5036.9), // menos de 31 dias: IOF SIM
    rv(420, 100, 9.8, 'MXRF11', FII, 'MAXI RENDA', 10.12), rv(180, 50, 9.9, 'MXRF11', FII, 'MAXI RENDA', 10.12),
    rv(300, 10, 158.2, 'KNRI11', FII, 'KINEA RENDA', 161.4), rv(90, 5, 160.1, 'KNRI11', FII, 'KINEA RENDA', 161.4),
    rv(250, 20, 101.5, 'XPLG11', FII, 'XP LOG', 99.8),
    rv(200, 8, 158.9, 'HGLG11', FII, 'CSHG LOGÍSTICA', 156),
    rv(160, 15, 112.5, 'VISC11', FII, 'VINCI SHOPPING CENTERS', 114.2),
    rv(380, 200, 9.05, 'ITSA4', 'AÇÕES', 'ITAÚSA', 10.38), rv(120, 100, 9.9, 'ITSA4', 'AÇÕES', 'ITAÚSA', 10.38),
    rv(330, 60, 27.8, 'BBAS3', 'AÇÕES', 'BANCO DO BRASIL', 25.4), // um papel no prejuízo
    rv(270, 40, 36.5, 'WEGE3', 'AÇÕES', 'WEG', 41.2),
    rv(200, 80, 35.2, 'PETR4', 'AÇÕES', 'PETROBRAS', 38.9),
    rv(240, 15, 310, 'IVVB11', 'ETF', 'S&P 500', 347),
    rv(140, 20, 118, 'BOVA11', 'ETF', 'IBOVESPA', 126.5),
    ...prev('PREV EXEMPLO MULTIMERCADO', 'VGBL', 1000, 8, 1.064),
    ...prev('PREV EXEMPLO RENDA FIXA', 'PGBL', 600, 5, 1.031),
  ])

  // ---------- Extrato (12 meses) ----------
  const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
  const extrato = []
  const ent = (m, d, valor, origem, inst, tipo, extra = {}) => extrato.push({ [D]: at(m, d), [V]: +valor.toFixed(2), ORIGEM: origem, 'INSTITUIÇÃO': inst, 'CNPJ / CPF': '', TIPO: tipo, ...extra })
  for (let m = 0; m < 12; m++) {
    const f = wave(m), mo = calMonth(m)
    const fii = (t, q, val, d) => ent(m, d, val * f, `VR. RED. RENDIMENTO SOBRE ${q} PAPEL ${t}`, 'CORRETORA EXEMPLO', `DIVIDENDOS ${q} ${t}`)
    fii('MXRF11', 150, 15, 14); fii('KNRI11', 15, 12, 15); fii('XPLG11', 20, 15.6, 15); fii('VISC11', 15, 11.4, 15)
    if (m <= 6) fii('HGLG11', 8, 8.8, 15)
    if (m % 3 === 1) ent(m, 18, 28.5 * f, 'JCP 300 ITSA4', 'CORRETORA EXEMPLO', 'JCP 300 ITSA4')
    if (m % 3 === 2 && m <= 11) ent(m, 18, 41.2 * f, 'DIVIDENDOS 60 BBAS3', 'CORRETORA EXEMPLO', 'DIVIDENDOS 60 BBAS3')
    if (m % 3 === 0) ent(m, 18, 12.8 * f, 'JCP 40 WEGE3', 'CORRETORA EXEMPLO', 'JCP 40 WEGE3')
    if (m % 3 === 1 && m <= 6) ent(m, 20, 96.4 * f, 'DIVIDENDOS 80 PETR4', 'CORRETORA EXEMPLO', 'DIVIDENDOS 80 PETR4')
    ent(m, 28, 7.45 * f, 'REND AUT ITAU', 'BANCO EXEMPLO', 'REND AUT ITAU')
    ent(m, 5, 5200, 'EMPRESA EXEMPLO LTDA', 'REMUNERACAO/SALARIO', 'SALÁRIO')
    ent(m, 10, 1450, 'ALUGUEL APTO 12 - INQUILINO', 'BANCO EXEMPLO', 'ALUGUEL')
    if (mo === 3 || mo === 9) ent(m, 22, 3800, 'PLR EMPRESA EXEMPLO', 'REMUNERACAO/SALARIO', 'PLR')
    if (mo === 12) ent(m, 20, 2600, '13º SALARIO EMPRESA EXEMPLO', 'REMUNERACAO/SALARIO', '13º SALÁRIO')
    if (m === 2 || m === 5 || m === 8) ent(m, 24, 1200, 'PROJETO DESIGN CLIENTE EXEMPLO', 'BANCO EXEMPLO', 'FREELANCE', { CATEGORIA: 'Freelance' }) // categoria criada pelo usuário
  }
  ent(7, 16, 22000, 'VENDA DE VEÍCULO', 'BANCO EXEMPLO', 'TRANSFERÊNCIA', { CATEGORIA: 'Venda de Patrimônio' }) // fica fora do saldo

  // ---------- Despesas ----------
  const PARC = [['NOTEBOOK', 10, 389.9, 2, 'Eletrônicos'], ['GELADEIRA', 12, 215, 6, 'Casa'], ['VIAGEM DE FÉRIAS', 6, 520, 1, 'Lazer'], ['SOFÁ', 5, 330, 0, 'Casa']]
  const parcelas = (m) => PARC.flatMap(([nome, n, v, ini, cat]) => {
    const num = ini - m + 1
    if (num < 1 || num > n) return []
    const pago = m >= 1 ? v : nome === 'GELADEIRA' && m === 0 ? 100 : 0 // uma parcela do mês atual com pagamento parcial
    return [[`${nome} (${num}/${n})`, v, cat, { PARCELAMENTO: { id: `demo-${nome.toLowerCase().replace(/\W+/g, '-')}`, numero: num, quantidade: n, valorPago: pago, ...(pago ? { dataPagamento: at(m, 12) } : {}) } }]]
  })
  // situação: meses antigos (2+) seguem a regra antiga (pagos); mês passado e atual têm baixa; meses futuros ficam "a vencer"
  const stat = (m, o) => {
    if (o.PAGAMENTO) return { PAGAMENTO: o.PAGAMENTO }
    if (o.legacy || m >= 2) return {}
    if (m < 0) return { PAGAMENTO: { pago: false } }
    return { PAGAMENTO: o.paga === false ? { pago: false } : { pago: true, data: at(m, o.d || 10) } }
  }
  const despesas = []
  for (let m = 11; m >= -7; m--) {
    const f = wave(m), mes = `${ym(m)}-01`, mo = calMonth(m), atual = m >= 0, prox = m >= -3
    const add = (conta, itens, pai) => {
      const its = itens.map(([NOME, v, CATEGORIA, o = {}]) => ({ NOME, VALOR: +v.toFixed(2), ...(CATEGORIA ? { CATEGORIA } : {}), ...(o.PARCELAMENTO ? { PARCELAMENTO: o.PARCELAMENTO } : stat(m, o)) }))
      if (its.length) despesas.push({ DATA: mes, TIPO_CONTA: conta, ...(pai ? { PAI: pai } : {}), ITENS: its })
    }
    if (prox) {
      add('MORADIA', [['SEGURO RESIDENCIAL', 62, 'Moradia', { d: 8 }], ...(mo <= 10 ? [['IPTU', 187.4, 'Impostos', { d: 8 }]] : [])])
      add('ALUGUEL', [['ALUGUEL', m < 6 ? 1890 : 1800, 'Moradia', { d: 5 }]], 'MORADIA')
      add('CONDOMÍNIO', [['COND.', 420, 'Moradia', { d: 10, paga: m !== 0 }], ...(atual ? [['ÁGUA', 55 * f, 'Contas', { d: 10, paga: m !== 0 }], ['GÁS', 28 * f, 'Contas', { d: 10, paga: m !== 0 }]] : [])], 'MORADIA')
      if (atual) add('ENERGIA ELÉTRICA', [['TUSD', 38 * f, 'Contas', { d: 15, paga: m > 1 }], ['TE', 31 * f, 'Contas', { d: 15, paga: m > 1 }], ['COSIP', 9.66, 'Contas', { d: 15, paga: m > 1 }]], 'MORADIA')
      add('INTERNET', [['VIVO FIBRA', 119.9, 'Assinaturas', { d: 10 }]], 'MORADIA')
      add('SAÚDE', [['PLANO DE SAÚDE', m < 4 ? 520 : 480, 'Saúde', { d: 7, paga: m !== 1 }], ...(atual && m % 4 === 1 ? [['CONSULTA', 250, 'Saúde', { d: 18 }]] : [])])
      add('EDUCAÇÃO', [['CURSO DE INGLÊS', 310, 'Educação', { d: 6 }]])
    }
    if (atual) {
      add('MERCADO', [['SUPERMERCADO', 820 * f, 'Alimentação', { d: 20 }], ['FEIRA', 95 * f, 'Alimentação', { d: 20 }]])
      add('TRANSPORTE', [['COMBUSTÍVEL', 260 * f, 'Transporte', { d: 14 }], ['ESTACIONAMENTO', 45, 'Transporte', { d: 14 }]])
      add('LAZER', [['RESTAURANTES', 280 * f, 'Lazer', { d: 16 }], ...(m % 2 === 0 ? [['CINEMA', 64, 'Lazer', { d: 16 }]] : [])])
    }
    if (m === -1) add('TRANSPORTE', [['SEGURO AUTO (ANUAL)', 1850, 'Transporte', { PAGAMENTO: { pago: true, data: ago(2) } }]]) // pago antecipadamente
    add('CARTÃO DE CRÉDITO', [
      ...(atual ? [['MERCADO LIVRE', 189 * f, 'Compras Online', { d: 12, paga: m !== 0 }], ['UBER', 64 * f, 'Transporte', { d: 12, paga: m !== 0 }], ['IFOOD', 142 * f, 'Alimentação', { d: 12, paga: m !== 0 }],
        ['NETFLIX', 55.9, 'Assinaturas', { d: 12, paga: m !== 0 }], ['SPOTIFY', 21.9, 'Assinaturas', { d: 12, paga: m !== 0 }], ['FARMÁCIA', 88 * f, 'Saúde', { d: 12, paga: m !== 0 }]] : []),
      ...(m === 3 ? [['ESTORNO COMPRA', -89.9, 'Compras Online', { legacy: true }]] : []), // abatimento: sem baixa
      ...parcelas(m),
    ])
  }
  const contasDespesas = [
    ['MORADIA', '🏡', '#f59e0b'], ['ALUGUEL', '🏠', '#f59e0b'], ['CONDOMÍNIO', '🏢', '#fb923c'], ['ENERGIA ELÉTRICA', '💡', '#eab308'], ['INTERNET', '🌐', '#0ea5e9'],
    ['MERCADO', '🛒', '#22c55e'], ['SAÚDE', '🩺', '#ef4444'], ['TRANSPORTE', '🚗', '#64748b'], ['EDUCAÇÃO', '🎓', '#6366f1'], ['LAZER', '🎬', '#ec4899'], ['CARTÃO DE CRÉDITO', '💳', '#8b5cf6'],
  ].map(([name, icon, color]) => ({ name, icon, color }))

  // ---------- Resgates ----------
  const resgates = []
  const prods = [['RDB APLICAÇÃO', 74], ['TESOURO SELIC 2029', 190], ['LCI CARTEIRA IMOBILIÁRIA', 120], ['AÇÃO FRACIONÁRIA', 3.2]]
  for (let m = 0; m < 12; m++) {
    prods.forEach(([p, base], n) => {
      if ((m + n) % 2) return
      resgates.push({ DATA_RESGATE: at(m, 20 + n), PRODUTO: p, [RK]: +(base * (0.8 + ((m * 5 + n * 3) % 7) / 10)).toFixed(2) })
    })
  }

  // ---------- Notas ----------
  const notas = 'Metas do ano\n- Reserva de emergência: 6 meses de despesas\n- Aportar R$ 1.000 por mês na previdência (VGBL)\n- Quitar o parcelamento do notebook\n\nLembretes\n- Condomínio vence dia 10\n- Revisar o plano de saúde em dezembro'
  const notasHtml = '<h3>Metas do ano</h3><ul><li>Reserva de emergência: 6 meses de despesas</li><li>Aportar R$ 1.000 por mês na previdência (VGBL)</li><li>Quitar o parcelamento do notebook</li></ul><h3>Lembretes</h3><ul><li>Condomínio vence dia 10</li><li>Revisar o plano de saúde em dezembro</li></ul>'

  return { carteira, extrato: extrato.map(withCat), categoriasExtrato: ['Freelance'], despesas, contasDespesas, resgates, notas, notasHtml }
}
