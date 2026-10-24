import { isRV, RK, tickerOf } from './data.js'
import { norm } from './pasteDesp.js'

const V = 'VALOR DA APLICAÇÃO', D = 'DATA DE RECEBIMENTO'
const n0 = (v) => Number(v) || 0
const validPapel = (r) => r.PAPEL && r.PAPEL !== 'N/A'
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// resgate "FII XP MALLS" ↔ papel XPML11 (produto "XP MALLS"); "RDB 100% DO CDI" ↔ item da carteira
function matchEntity(name, ents) {
  const n = norm(name)
  return ents.find((e) => [e.papel, e.produto, e.tipoProduto].map(norm).some((c) => c && c !== 'n a' && (c === n || (e.kind === 'rv' && c.length >= 5 && n.includes(c)))))
}

// Reúne por produto: lotes da carteira, proventos do extrato e resgates
export function buildProducts(data) {
  const carteira = data.carteira || [], ext = data.extrato || [], res = data.resgates || []
  const map = new Map()
  carteira.forEach((r) => {
    const rv = isRV(r) && validPapel(r)
    const key = rv ? 'rv|' + r.PAPEL : 'rf|' + [r.TIPO_PRODUTO, r.PRODUTO, r.BANCO].map(norm).join('|')
    if (!map.has(key)) map.set(key, { id: key, kind: rv ? 'rv' : 'rf', papel: rv ? r.PAPEL : '', produto: r.PRODUTO || '', tipoProduto: r.TIPO_PRODUTO || '', tipoInv: r.TIPO_INV || '', bancos: new Set(), lotes: [], proventos: [], resgates: [], ativo: true })
    const e = map.get(key); e.lotes.push(r); if (r.BANCO) e.bancos.add(r.BANCO)
  })
  const ents = [...map.values()]
  ents.forEach((e) => {
    e.bancos = [...e.bancos]
    e.title = e.kind === 'rv' ? e.papel : (e.tipoProduto && norm(e.tipoProduto) !== norm(e.produto) ? e.tipoProduto : e.produto || e.tipoProduto)
    e.subtitle = [e.kind === 'rv' || norm(e.produto) !== norm(e.title) ? e.produto : '', e.kind === 'rv' ? e.tipoProduto : '', e.bancos.join(', ')].filter(Boolean).join(' · ')
  })

  const byPapel = new Map(ents.filter((e) => e.kind === 'rv').map((e) => [e.papel, e]))
  const outs = new Map()
  const out = (k, title) => {
    if (!outs.has(k)) outs.set(k, { id: 'out|' + k, kind: 'out', papel: k.startsWith('tk|') ? title : '', produto: '', tipoProduto: '', tipoInv: '', bancos: [], lotes: [], proventos: [], resgates: [], ativo: false, title, subtitle: 'Fora da carteira' })
    return outs.get(k)
  }
  ext.forEach((r) => { if (r.CATEGORIA !== 'Proventos') return; const t = tickerOf(r); if (t) (byPapel.get(t) || out('tk|' + t, t)).proventos.push(r) })
  res.forEach((r) => { const name = String(r.PRODUTO || '').trim(); if (name) (matchEntity(name, ents) || out('rs|' + norm(name), name)).resgates.push(r) })

  const all = [...ents, ...outs.values()]
  const patr = ents.reduce((s, e) => s + e.lotes.reduce((t, r) => t + n0(r.TOTAL_ATUAL), 0), 0)
  const d = new Date(), from12 = iso(new Date(d.getFullYear(), d.getMonth() - 11, 1))
  all.forEach((e) => {
    e.qtd = e.lotes.reduce((s, r) => s + n0(r.QTD_COMPRA), 0)
    e.aplicado = e.lotes.reduce((s, r) => s + n0(r.VLR_APLICACAO), 0)
    e.atual = e.lotes.reduce((s, r) => s + n0(r.TOTAL_ATUAL), 0)
    e.rend = e.atual - e.aplicado
    e.varp = e.aplicado ? e.rend / e.aplicado : 0
    e.preco = e.kind === 'rv' ? n0(e.lotes[0]?.PRC_UNIT) : 0
    e.precoMedio = e.kind === 'rv' && e.qtd ? e.aplicado / e.qtd : 0
    e.share = patr && e.ativo ? e.atual / patr : 0
    const pv = [...e.proventos].sort((a, b) => b[D].localeCompare(a[D]))
    e.provList = pv
    e.provTotal = pv.reduce((s, r) => s + n0(r[V]), 0)
    e.prov12m = pv.filter((r) => r[D] >= from12).reduce((s, r) => s + n0(r[V]), 0)
    e.yoc = e.aplicado ? e.prov12m / e.aplicado : 0
    e.provMaior = pv.reduce((m, r) => Math.max(m, n0(r[V])), 0)
    e.resList = [...e.resgates].sort((a, b) => (b.DATA_RESGATE || '').localeCompare(a.DATA_RESGATE || ''))
    e.resTotal = e.resgates.reduce((s, r) => s + n0(r[RK]), 0)
    e.retorno = e.rend + e.provTotal + e.resTotal
    e.retornoPct = e.aplicado ? e.retorno / e.aplicado : 0
    const apelidos = [e.kind === 'rv' ? 'renda variavel rv' : e.kind === 'rf' ? 'renda fixa rf' : '', /imobil|^fii|\bfii\b/i.test(`${e.tipoProduto} ${e.title}`) ? 'fii fundo imobiliario fundos imobiliarios' : '', e.proventos.length ? 'proventos dividendos' : '', e.resgates.length ? 'resgates resgatado' : ''].join(' ')
    e.hay = norm([e.title, e.subtitle, e.papel, e.produto, e.tipoProduto, e.bancos.join(' '), e.tipoInv, apelidos].join(' '))
  })
  const carteiraOrd = all.filter((e) => e.ativo).sort((a, b) => b.atual - a.atual)
  const fora = all.filter((e) => !e.ativo).sort((a, b) => (b.provTotal + b.resTotal) - (a.provTotal + a.resTotal))
  return [...carteiraOrd, ...fora]
}

// todas as palavras digitadas precisam aparecer; título que começa com o termo vem primeiro
export function searchProducts(all, q) {
  const n = norm(q)
  if (!n) return all
  const words = n.split(' ')
  return all
    .filter((e) => words.every((w) => e.hay.includes(w)))
    .map((e, i) => { const t = norm(e.title); return { e, i, s: t === n ? 0 : t.startsWith(n) ? 1 : t.includes(n) ? 2 : 3 } })
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.e)
}
