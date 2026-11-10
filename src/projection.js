import { monthOf, RK } from './data.js'
import { nowYM } from './period.js'

const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0 }
export const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}` }

export const KEY = 'fynn-proj-v1'
export const DEFAULTS = { base: '6', horizon: '12', adjEnt: '0', adjDesp: '0', rate: '0', useKnown: true, includeCurrent: true }
export const loadProjectionSettings = () => { try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) } } catch { return DEFAULTS } }

// Projeção mês a mês (função pura, fácil de testar).
//  - base: média dos últimos N meses completos de entradas e de despesas
//  - despesas = variáveis (média sem parcelas) + parcelas já lançadas em cada mês futuro
//  - patrimônio = patrimônio atual rendendo a taxa informada + a sobra de cada mês
//  - o mês atual (fatura em aberto) fica fora da base, mas entra na projeção: o que já foi lançado vale como piso
export function buildProjection(data, s, cur = nowYM(), cdiMonthly = 0) {
  const hist = {}
  const slot = (k) => (hist[k] ||= { ent: 0, desp: 0, parc: 0, parcAberta: 0 })
  ;(data.extrato || []).forEach((r) => { if (r[D]) slot(String(r[D]).slice(0, 7)).ent += Number(r[V]) || 0 })
  ;(data.resgates || []).forEach((r) => { if (r.DATA_RESGATE) slot(String(r.DATA_RESGATE).slice(0, 7)).ent += Number(r[RK]) || 0 })
  ;(data.despesas || []).forEach((r) => {
    const m = slot(monthOf(r.DATA))
    ;(r.ITENS || []).forEach((it) => {
      const v = Number(it.VALOR) || 0
      m.desp += v
      if (it.PARCELAMENTO) {
        m.parc += v
        // só o que está em aberto: parcelas com baixa (valor já pago) saem do cálculo futuro; abatimentos (negativos) permanecem
        m.parcAberta += v < 0 ? v : Math.max(0, v - (Number(it.PARCELAMENTO.valorPago) || 0))
      }
    })
  })
  const past = Object.keys(hist).filter((k) => k < cur && (hist[k].ent || hist[k].desp)).sort()
  const baseN = Math.max(1, Math.round(num(s.base)) || 6), horizon = Math.max(1, Math.round(num(s.horizon)) || 12)
  const baseMonths = past.length ? Array.from({ length: baseN }, (_, i) => addMonths(cur, -(i + 1))).filter((k) => k >= past[0]) : []
  const n = baseMonths.length
  const avg = (f) => (n ? baseMonths.reduce((t, k) => t + f(hist[k] || { ent: 0, desp: 0, parc: 0, parcAberta: 0 }), 0) / n : 0)
  const avgEnt = avg((m) => m.ent), avgDesp = avg((m) => m.desp), avgVar = avg((m) => m.desp - m.parc), avgParc = avg((m) => m.parc)
  const first = s.includeCurrent === false ? 1 : 0
  const adjEnt = 1 + num(s.adjEnt) / 100, adjDesp = 1 + num(s.adjDesp) / 100
  const rate = num(s.rate) / 100, rm = (1 + rate) ** (1 / 12) - 1
  const start = (data.carteira || []).reduce((t, r) => t + (Number(r.TOTAL_ATUAL) || 0), 0)
  let acum = 0, patr = start, patr0 = start
  const rows = Array.from({ length: horizon }, (_, i) => {
    const ym = addMonths(cur, i + first), known = hist[ym] || { ent: 0, desp: 0, parc: 0, parcAberta: 0 }
    const ent = Math.max(avgEnt * adjEnt, s.useKnown ? known.ent : 0)
    const variavel = Math.max(avgVar * adjDesp, s.useKnown ? known.desp - known.parc : 0)
    const parcelas = s.useKnown ? known.parcAberta : 0
    const desp = variavel + parcelas, sobra = ent - desp
    acum += sobra; patr = patr * (1 + rm) + sobra; patr0 += sobra
    const r2 = (x) => Math.round(x * 100) / 100
    return { ym, name: ym, Entradas: r2(ent), Variaveis: r2(variavel), Parcelas: r2(parcelas), Despesas: r2(desp), Sobra: r2(sobra), Acumulado: r2(acum), Patrimonio: r2(patr), SemRendimento: r2(patr0) }
  })
  return { rows, n, avgEnt, avgDesp, avgVar, avgParc, start, cdiMonthly }
}
