import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import PeriodFilter from './PeriodFilter.jsx'
import { CATS, tickerOf, totalOf, monthOf, RK } from './data.js'
import { rangeOf, inRange, labelOf } from './period.js'

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#22c55e']
const CAT_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#22c55e', '#c084fc', '#94a3b8']
const DESP_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#22c55e', '#94a3b8']
const TT = { contentStyle: { background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx)' }, cursor: { fill: 'var(--hover)' } }
const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'

export const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const sum = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
const group = (rows, key, val) => {
  const m = {}
  rows.forEach((r) => { const g = (typeof key === 'function' ? key(r) : r[key]) || 'N/A'; m[g] = (m[g] || 0) + (Number(r[val]) || 0) })
  return Object.entries(m).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value)
}
const monthsBetween = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma) + 1 }
const fillMonths = (map) => {
  const keys = Object.keys(map).sort()
  if (!keys.length) return []
  const out = []
  let [y, m] = keys[0].split('-').map(Number)
  const [ye, me] = keys[keys.length - 1].split('-').map(Number)
  while (y < ye || (y === ye && m <= me)) {
    const k = `${y}-${String(m).padStart(2, '0')}`
    out.push({ name: k, Proventos: +(map[k]?.Proventos || 0).toFixed(2), Rendimentos: +(map[k]?.Rendimentos || 0).toFixed(2) })
    if (++m > 12) { m = 1; y++ }
  }
  return out
}

const fillGen = (map, fields) => {
  const keys = Object.keys(map).sort()
  if (!keys.length) return []
  const out = []
  let [y, m] = keys[0].split('-').map(Number)
  const [ye, me] = keys[keys.length - 1].split('-').map(Number)
  while (y < ye || (y === ye && m <= me)) {
    const k = `${y}-${String(m).padStart(2, '0')}`
    out.push({ name: k, ...Object.fromEntries(fields.map((f) => [f, +(map[k]?.[f] || 0).toFixed(2)])) })
    if (++m > 12) { m = 1; y++ }
  }
  return out
}

// ext = lançamentos do período (para o PDF); proventos = só categoria "Proventos"
export function resumo(d, ext = d.extrato, label = 'período', dsp = d.despesas || [], res = d.resgates || []) {
  const aplicado = sum(d.carteira, 'VLR_APLICACAO'), atual = sum(d.carteira, 'TOTAL_ATUAL')
  const rend = atual - aplicado
  const tone = rend > 0 ? 'pos' : rend < 0 ? 'neg' : ''
  return [
    ['Total aplicado', brl(aplicado), '', '💼'], ['Patrimônio atual', brl(atual), '', '🏦'],
    ['Rendimento bruto', brl(rend), tone, '📈'],
    ['Variação', aplicado ? (rend > 0 ? '+' : '') + ((rend / aplicado) * 100).toFixed(2).replace('.', ',') + '%' : '-', tone, '％'],
    [`Proventos (${label})`, brl(sum(ext.filter((r) => r.CATEGORIA === 'Proventos'), V)), '', '💰'],
    [`Despesas (${label})`, brl(dsp.reduce((t, r) => t + totalOf(r), 0)), '', '🧾'],
    [`Resgates (${label})`, brl(sum(res, RK)), '', '🏁'],
  ]
}

export default function Dashboard({ data, period, setPeriod }) {
  const { carteira, extrato } = data
  const range = useMemo(() => rangeOf(period), [period])
  const ext = useMemo(() => extrato.filter((r) => r[D] && inRange(r[D], range)), [extrato, range])

  // ---- resgates: a rentabilidade resgatada soma-se às entradas ----
  const res = useMemo(() => (data.resgates || []).filter((r) => r.DATA_RESGATE && inRange(r.DATA_RESGATE, range)), [data.resgates, range])
  const totRes = sum(res, RK)
  const years = useMemo(() => [...new Set(extrato.map((r) => Number(String(r[D]).slice(0, 4))).filter(Boolean))], [extrato])

  const prov = ext.filter((r) => r.CATEGORIA === 'Proventos')
  const rendC = ext.filter((r) => r.CATEGORIA === 'Rendimentos')
  const totProv = sum(prov, V), totRend = sum(rendC, V)

  const monthsMap = {}
  ;[...prov, ...rendC].forEach((r) => {
    const k = r[D].slice(0, 7)
    monthsMap[k] = monthsMap[k] || { Proventos: 0, Rendimentos: 0 }
    monthsMap[k][r.CATEGORIA] += Number(r[V]) || 0
  })
  const porMes = fillMonths(monthsMap)
  const keys = Object.keys(monthsMap).sort()
  const nowYM = new Date().toISOString().slice(0, 7)
  const nMes = keys.length ? Math.max(1, monthsBetween(keys[0], range.to && range.to.slice(0, 7) < nowYM ? range.to.slice(0, 7) : nowYM)) : 1

  const porPapel = group(prov, (r) => tickerOf(r) || 'Outros', V).slice(0, 10)
  const porCat = [...group(ext, 'CATEGORIA', V), ...(totRes ? [{ name: 'Resgates', value: +totRes.toFixed(2) }] : [])]
  const porTipo = group(carteira, 'TIPO_INV', 'TOTAL_ATUAL')
  const porBanco = group(carteira, 'BANCO', 'TOTAL_ATUAL')
  // ---- despesas e fluxo de caixa ----
  const dsp = useMemo(() => (data.despesas || []).filter((r) => inRange(r.DATA, range)), [data.despesas, range])
  const totDesp = dsp.reduce((t, r) => t + totalOf(r), 0)
  const mesesDesp = new Set(dsp.map((r) => monthOf(r.DATA))).size
  const porConta = group(dsp.map((r) => ({ c: r.TIPO_CONTA, v: totalOf(r) })), 'c', 'v')
  const entradas = ext.filter((r) => r.CATEGORIA !== 'Venda de Patrimônio')
  const totEntr = sum(entradas, V) + totRes
  const saldo = totEntr - totDesp
  const fluxoMap = {}
  entradas.forEach((r) => { const k = r[D].slice(0, 7); (fluxoMap[k] ||= {}).Entradas = (fluxoMap[k].Entradas || 0) + (Number(r[V]) || 0) })
  res.forEach((r) => { const k = r.DATA_RESGATE.slice(0, 7); (fluxoMap[k] ||= {}).Entradas = (fluxoMap[k].Entradas || 0) + (Number(r[RK]) || 0) })
  dsp.forEach((r) => { const k = monthOf(r.DATA); (fluxoMap[k] ||= {}).Despesas = (fluxoMap[k].Despesas || 0) + totalOf(r) })
  const fluxo = fillGen(fluxoMap, ['Entradas', 'Despesas'])
  const top5 = porConta.slice(0, 5).map((x) => x.name)
  const empMap = {}
  dsp.forEach((r) => { const k = monthOf(r.DATA), c = top5.includes(r.TIPO_CONTA) ? r.TIPO_CONTA : 'Demais'; (empMap[k] ||= {})[c] = (empMap[k][c] || 0) + totalOf(r) })
  const empCats = [...top5, ...(porConta.length > 5 ? ['Demais'] : [])]
  const empilhado = fillGen(empMap, empCats)
  const tip = (v) => brl(v)
  const mesTick = (k) => k.slice(5) + '/' + k.slice(2, 4)

  return (
    <>
      <div className="cards">
        {resumo(data).slice(0, 4).map(([l, v, tone, ic]) => (
          <div className="card kpi" key={l}><span className="ic">{ic}</span><small>{l}</small><b className={tone}>{v}</b></div>
        ))}
      </div>
      <div className="grid">
        <div className="card"><h3>Alocação (RF x RV)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={porTipo} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">{porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % 7]} />)}</Pie><Tooltip formatter={tip} {...TT} /><Legend /></PieChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Patrimônio por banco</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porBanco} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip formatter={tip} {...TT} /><Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} /></BarChart>
          </ResponsiveContainer></div>
      </div>

      <div className="sec-head">
        <div><h2>Proventos e entradas</h2><small className="muted">{labelOf(period)}</small></div>
        <PeriodFilter period={period} onChange={setPeriod} years={years} />
      </div>
      <div className="cards">
        <div className="card kpi"><span className="ic">💰</span><small>Proventos (dividendos, FIIs, JCP)</small><b>{brl(totProv)}</b></div>
        <div className="card kpi"><span className="ic">🏧</span><small>Rendimento de conta</small><b>{brl(totRend)}</b></div>
        <div className="card kpi"><span className="ic">📆</span><small>Média mensal · {nMes} {nMes === 1 ? 'mês' : 'meses'}</small><b>{brl(totProv / nMes)}</b></div>
        <div className="card kpi"><span className="ic">🏁</span><small>Resgates (rentabilidade)</small><b className={totRes > 0 ? 'pos' : totRes < 0 ? 'neg' : ''}>{brl(totRes)}</b></div>
        <div className="card kpi"><span className="ic">🏆</span><small>Maior pagador{porPapel[0] ? ' · ' + brl(porPapel[0].value) : ''}</small><b>{porPapel[0]?.name || '—'}</b></div>
      </div>
      <div className="grid">
        <div className="card"><h3>Proventos por mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porMes}><CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mesTick} fontSize={11} minTickGap={16} /><YAxis fontSize={11} /><Tooltip formatter={tip} labelFormatter={mesTick} {...TT} /><Legend />
              <Bar dataKey="Proventos" stackId="a" fill="#6366f1" /><Bar dataKey="Rendimentos" stackId="a" fill="#14b8a6" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Proventos por papel (top 10)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porPapel}><CartesianGrid vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={tip} {...TT} /><Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Entradas por categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={porCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">{porCat.map((d, i) => <Cell key={i} fill={(d.name === 'Resgates' ? '#0ea5e9' : CAT_COLORS[CATS.indexOf(d.name)]) || '#94a3b8'} />)}</Pie><Tooltip formatter={tip} {...TT} /><Legend /></PieChart>
          </ResponsiveContainer></div>
      </div>

      <div className="sec-head">
        <div><h2>Despesas e fluxo de caixa</h2><small className="muted">{labelOf(period)} · entradas incluem resgates e não incluem “Venda de Patrimônio”</small></div>
      </div>
      <div className="cards">
        <div className="card kpi"><span className="ic">🧾</span><small>Despesas no período</small><b>{brl(totDesp)}</b></div>
        <div className="card kpi"><span className="ic">📆</span><small>Média mensal · {mesesDesp || 0} {mesesDesp === 1 ? 'mês' : 'meses'}</small><b>{brl(mesesDesp ? totDesp / mesesDesp : 0)}</b></div>
        <div className="card kpi"><span className="ic">🔥</span><small>Maior conta{porConta[0] ? ' · ' + brl(porConta[0].value) : ''}</small><b>{porConta[0]?.name || '—'}</b></div>
        <div className="card kpi"><span className="ic">⚖️</span><small>Saldo (entradas − despesas)</small><b className={saldo > 0 ? 'pos' : saldo < 0 ? 'neg' : ''}>{brl(saldo)}</b></div>
      </div>
      <div className="grid">
        <div className="card"><h3>Entradas x Despesas por mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fluxo}><CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mesTick} fontSize={11} minTickGap={16} /><YAxis fontSize={11} /><Tooltip formatter={tip} labelFormatter={mesTick} {...TT} /><Legend />
              <Bar dataKey="Entradas" fill="#14b8a6" radius={[6, 6, 0, 0]} /><Bar dataKey="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Despesas por conta</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porConta.slice(0, 8)} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={120} fontSize={11} /><Tooltip formatter={tip} {...TT} /><Bar dataKey="value" fill="#ef4444" radius={[0, 6, 6, 0]} /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Despesas por mês (principais contas)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={empilhado}><CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mesTick} fontSize={11} minTickGap={16} /><YAxis fontSize={11} /><Tooltip formatter={tip} labelFormatter={mesTick} {...TT} />
              {empCats.map((c, i) => <Bar key={c} dataKey={c} stackId="d" fill={DESP_COLORS[i % 6]} />)}</BarChart>
          </ResponsiveContainer></div>
      </div>
    </>
  )
}
