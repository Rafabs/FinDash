import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import PeriodFilter from './PeriodFilter.jsx'
import { MarkSvg } from './AccountMark.jsx'
import { CATS, tickerOf, totalOf, monthOf, RK, installmentItems } from './data.js'
import { rangeOf, inRange, labelOf, nowYM } from './period.js'

const COLORS = ['#00d2be', '#c4cad1', '#ffb020', '#ff4d6a', '#5ba7ff', '#7b8794', '#2ee6a6']
const CAT_COLORS = ['#00d2be', '#c4cad1', '#ffb020', '#5ba7ff', '#7b8794', '#2ee6a6']
const DESP_COLORS = ['#00d2be', '#c4cad1', '#ffb020', '#ff4d6a', '#5ba7ff', '#7b8794']
const TT = { contentStyle: { background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx)' }, cursor: { fill: 'var(--hover)' } }
const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
// eixo do gráfico "Despesas por grupo": ícone da conta (sobre a cor escolhida) + nome
function GroupTick({ x, y, payload, markOf }) {
  const name = String(payload.value)
  return <g transform={`translate(${x},${y})`}>
    <MarkSvg {...markOf(name)} x={-138} y={-8} size={16} />
    <text x={-116} y={4} fontSize={11} style={{ fill: 'var(--tx)' }}>{name.length > 16 ? name.slice(0, 15) + '…' : name}</text>
  </g>
}
// percentuais dos gráficos
const pctOf = (v, total) => (total ? ((Number(v) || 0) / total * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '')
const sumOfNumbers = (p) => Object.entries(p || {}).filter(([k, v]) => k !== 'name' && typeof v === 'number').reduce((t, [, v]) => t + v, 0)
const pieLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
  if (!(percent >= 0.03)) return null
  const a = -midAngle * Math.PI / 180, r = outerRadius + 14
  return <text x={cx + r * Math.cos(a)} y={cy + r * Math.sin(a)} style={{ fill: 'var(--tx)' }} fontSize={11} textAnchor={Math.cos(a) >= 0 ? 'start' : 'end'} dominantBaseline="central">{(percent * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</text>
}
const pieTip = (total) => (v, n) => [`${brl(v)} · ${pctOf(v, total)}`, n]
const pieLegend = (total) => (value, entry) => <span style={{ color: 'var(--tx)' }}>{value} · {pctOf(entry?.payload?.value, total)}</span>
function formatBcbDate(value) {
  const [day, month, year] = String(value || '').split('/')
  return day && month && year ? `${day}/${month}/${year}` : value
}

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

export default function Dashboard({ data, period, setPeriod, cdi, cdiStatus, selic, selicStatus }) {
  const [catSel, setCatSel] = useState(null) // categoria aberta no gráfico "Despesas por categoria"
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
  const currentMonth = nowYM()
  const nMes = keys.length ? Math.max(1, monthsBetween(keys[0], range.to && range.to.slice(0, 7) < currentMonth ? range.to.slice(0, 7) : currentMonth)) : 1

  const porPapel = group(prov, (r) => tickerOf(r) || 'Outros', V).slice(0, 10)
  const porCat = [...group(ext, 'CATEGORIA', V), ...(totRes ? [{ name: 'Resgates', value: +totRes.toFixed(2) }] : [])]
  const porTipo = group(carteira, 'TIPO_INV', 'TOTAL_ATUAL')
  const porBanco = group(carteira, 'BANCO', 'TOTAL_ATUAL')
  // ---- despesas e fluxo de caixa ----
  const dsp = useMemo(() => (data.despesas || []).filter((r) => inRange(r.DATA, range)), [data.despesas, range])
  const totDesp = dsp.reduce((t, r) => t + totalOf(r), 0)
  const mesesDesp = new Set(dsp.map((r) => monthOf(r.DATA))).size
  const porConta = group(dsp.map((r) => ({ c: r.TIPO_CONTA, v: totalOf(r) })), 'c', 'v')
  const markOf = (name) => ({ ...((data.contasDespesas || []).find((a) => String(a.name || '').toLocaleLowerCase() === name.toLocaleLowerCase()) || {}), name })
  // despesas por categoria do item (só aparece quando existe alguma categoria no período)
  const porCategoria = useMemo(() => {
    const map = new Map(); let any = false
    dsp.forEach((r) => r.ITENS.forEach((it) => {
      const c = String(it.CATEGORIA || '').trim(); if (c) any = true
      const k = c || 'Sem categoria'; map.set(k, (map.get(k) || 0) + (Number(it.VALOR) || 0))
    }))
    return any ? [...map].map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value) : []
  }, [dsp])
  const catItems = useMemo(() => {
    if (!catSel) return []
    const out = []
    dsp.forEach((r) => r.ITENS.forEach((it) => {
      if ((String(it.CATEGORIA || '').trim() || 'Sem categoria') !== catSel) return
      out.push({ date: r.DATA, grupo: r.TIPO_CONTA, nome: it.NOME || '—', valor: Number(it.VALOR) || 0, parcela: it.PARCELAMENTO ? `${it.PARCELAMENTO.numero}/${it.PARCELAMENTO.quantidade}` : '' })
    }))
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.valor - a.valor)
  }, [catSel, dsp])
  const totCatSel = catItems.reduce((t, x) => t + x.valor, 0)
  // totais para os percentuais (sempre sobre o conjunto inteiro, não só os itens exibidos)
  const totTipo = sum(porTipo, 'value'), totBanco = sum(porBanco, 'value'), totPorCat = sum(porCat, 'value')
  const totProvPapel = sum(prov, V), totConta = sum(porConta, 'value'), totCategoria = sum(porCategoria, 'value')
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
  const parcelamentos = useMemo(() => installmentItems(data.despesas), [data.despesas])
  const parcelasFuturas = useMemo(() => {
    const todayMonth = nowYM()
    const map = new Map()
    parcelamentos.filter((x) => x.mes >= todayMonth).forEach((x) => {
      const row = map.get(x.mes) || { mes: x.mes, previsto: 0, pago: 0, pagoAntecipado: 0, pendente: 0, quantidade: 0 }
      row.previsto += x.valor
      const valorPago = Math.min(x.valor, Number(x.valorPago) || 0)
      row.pago += valorPago
      if (x.dataPagamento && x.dataPagamento.slice(0, 7) < x.mes) row.pagoAntecipado += valorPago
      row.pendente += Math.max(0, x.valor - valorPago)
      row.quantidade += 1
      map.set(x.mes, row)
    })
    return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(0, 12)
  }, [parcelamentos])
  const tip = (v) => brl(v)
  const mesTick = (k) => k.slice(5) + '/' + k.slice(2, 4)

  return (
    <>
      <div className="cards">
        {resumo(data).slice(0, 4).map(([l, v, tone, ic]) => (
          <div className="card kpi" key={l}><span className="ic">{ic}</span><small>{l}</small><b className={tone}>{v}</b></div>
        ))}
        <div className="card kpi" title="Taxa CDI anualizada, série 4389 do Banco Central do Brasil">
          <span className="ic">％</span><small>CDI anualizado</small>
          <b>{cdi ? `${cdi.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% a.a.` : cdiStatus === 'loading' ? 'Carregando…' : 'Indisponível'}</b>
          <small>{cdi ? `${cdiStatus === 'error' ? 'Último dado salvo' : 'Referência'}: ${formatBcbDate(cdi.date)} · BCB` : cdiStatus === 'error' ? 'Não foi possível atualizar' : 'Consultando Banco Central'}</small>
        </div>
        <div className="card kpi" title="Meta Selic definida pelo Copom, série 432 do Banco Central do Brasil">
          <span className="ic">％</span><small>Meta Selic · Copom</small>
          <b>{selic ? `${selic.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% a.a.` : selicStatus === 'loading' ? 'Carregando…' : 'Indisponível'}</b>
          <small>{selic ? `${selicStatus === 'error' ? 'Último dado salvo' : 'Vigente desde'}: ${formatBcbDate(selic.date)} · BCB` : selicStatus === 'error' ? 'Não foi possível atualizar' : 'Consultando Banco Central'}</small>
        </div>
      </div>
      <div className="grid">
        <div className="card"><h3>Alocação (RF x RV)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={porTipo} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none" label={pieLabel} labelLine={false}>{porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % 7]} />)}</Pie><Tooltip formatter={pieTip(totTipo)} {...TT} /><Legend formatter={pieLegend(totTipo)} /></PieChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Patrimônio por banco</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porBanco} layout="vertical" margin={{ right: 48 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip formatter={(v, n) => [`${brl(v)} · ${pctOf(v, totBanco)}`, n]} {...TT} /><Bar dataKey="value" fill="#00d2be" radius={[0, 6, 6, 0]}><LabelList dataKey="value" position="right" formatter={(v) => pctOf(v, totBanco)} style={{ fill: 'var(--tx)' }} fontSize={11} /></Bar></BarChart>
          </ResponsiveContainer></div>
      </div>
      {parcelasFuturas.length > 0 && <section className="panel expense-history-panel"><div className="panel-head"><div><h3>Previsão de parcelas</h3><small className="muted">Compromissos futuros no cartão · dê baixa antecipada na edição da fatura em Despesas</small></div><span className="expense-history-count">{parcelasFuturas.length} meses</span></div><div className="wrap"><table className="rt"><thead><tr><th>Mês</th><th>Parcelas</th><th>Previsto</th><th>Pago</th><th>Pago antecipado</th><th>Pendente</th></tr></thead><tbody>{parcelasFuturas.map((x) => <tr key={x.mes}><td className="ro">{x.mes.slice(5)}/{x.mes.slice(2, 4)}</td><td className="ro">{x.quantidade}</td><td className="ro">{brl(x.previsto)}</td><td className="ro">{brl(x.pago)}</td><td className="ro">{brl(x.pagoAntecipado)}</td><td className="ro"><b>{brl(x.pendente)}</b></td></tr>)}</tbody></table></div></section>}

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
            <BarChart data={porMes}><CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mesTick} fontSize={11} minTickGap={16} /><YAxis fontSize={11} /><Tooltip formatter={(v, n, e) => [`${brl(v)} · ${pctOf(v, sumOfNumbers(e?.payload))}`, n]} labelFormatter={mesTick} {...TT} /><Legend />
              <Bar dataKey="Proventos" stackId="a" fill="#00d2be" /><Bar dataKey="Rendimentos" stackId="a" fill="#c4cad1" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Proventos por papel (top 10)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porPapel} margin={{ top: 18 }}><CartesianGrid vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v, n) => [`${brl(v)} · ${pctOf(v, totProvPapel)}`, n]} {...TT} /><Bar dataKey="value" fill="#ffb020" radius={[6, 6, 0, 0]}><LabelList dataKey="value" position="top" formatter={(v) => pctOf(v, totProvPapel)} style={{ fill: 'var(--tx)' }} fontSize={11} /></Bar></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Entradas por categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={porCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none" label={pieLabel} labelLine={false}>{porCat.map((d, i) => <Cell key={i} fill={(d.name === 'Resgates' ? '#0ea5e9' : CAT_COLORS[CATS.indexOf(d.name)]) || '#7b8794'} />)}</Pie><Tooltip formatter={pieTip(totPorCat)} {...TT} /><Legend formatter={pieLegend(totPorCat)} /></PieChart>
          </ResponsiveContainer></div>
      </div>

      <div className="sec-head">
        <div><h2>Despesas e fluxo de caixa</h2><small className="muted">{labelOf(period)} · entradas incluem resgates e não incluem “Venda de Patrimônio”</small></div>
      </div>
      <div className="cards">
        <div className="card kpi"><span className="ic">🧾</span><small>Despesas no período</small><b>{brl(totDesp)}</b></div>
        <div className="card kpi"><span className="ic">📆</span><small>Média mensal · {mesesDesp || 0} {mesesDesp === 1 ? 'mês' : 'meses'}</small><b>{brl(mesesDesp ? totDesp / mesesDesp : 0)}</b></div>
        <div className="card kpi"><span className="ic">🔥</span><small>Maior grupo{porConta[0] ? ' · ' + brl(porConta[0].value) : ''}</small><b>{porConta[0]?.name || '—'}</b></div>
        <div className="card kpi"><span className="ic">⚖️</span><small>Saldo (entradas − despesas)</small><b className={saldo > 0 ? 'pos' : saldo < 0 ? 'neg' : ''}>{brl(saldo)}</b></div>
      </div>
      <div className="grid">
        <div className="card"><h3>Entradas x Despesas por mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fluxo}><CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mesTick} fontSize={11} minTickGap={16} /><YAxis fontSize={11} /><Tooltip formatter={(v, n, e) => [n === 'Despesas' && e?.payload?.Entradas > 0 ? `${brl(v)} · ${pctOf(v, e.payload.Entradas)} das entradas` : brl(v), n]} labelFormatter={mesTick} {...TT} /><Legend />
              <Bar dataKey="Entradas" fill="#c4cad1" radius={[6, 6, 0, 0]} /><Bar dataKey="Despesas" fill="#ff4d6a" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Despesas por grupo</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porConta.slice(0, 8)} layout="vertical" margin={{ right: 48 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={140} interval={0} tick={<GroupTick markOf={markOf} />} /><Tooltip formatter={(v, n) => [`${brl(v)} · ${pctOf(v, totConta)}`, n]} {...TT} /><Bar dataKey="value" fill="#ff4d6a" radius={[0, 6, 6, 0]}><LabelList dataKey="value" position="right" formatter={(v) => pctOf(v, totConta)} style={{ fill: 'var(--tx)' }} fontSize={11} /></Bar></BarChart>
          </ResponsiveContainer></div>
        {porCategoria.length > 0 && <div className="card"><h3>Despesas por categoria</h3><small className="muted">Clique numa barra para ver todas as despesas da categoria</small>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porCategoria.slice(0, 8)} layout="vertical" margin={{ right: 48 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={140} fontSize={11} interval={0} tickFormatter={(v) => (String(v).length > 20 ? String(v).slice(0, 19) + '…' : v)} /><Tooltip formatter={(v, n) => [`${brl(v)} · ${pctOf(v, totCategoria)}`, n]} {...TT} /><Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => setCatSel((cur) => (cur === d?.name ? null : d?.name))}>{porCategoria.slice(0, 8).map((d) => <Cell key={d.name} fill={d.name === catSel ? '#e09400' : '#ffb020'} />)}<LabelList dataKey="value" position="right" formatter={(v) => pctOf(v, totCategoria)} style={{ fill: 'var(--tx)' }} fontSize={11} /></Bar></BarChart>
          </ResponsiveContainer></div>}
        {catSel && catItems.length > 0 && <section className="panel expense-history-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-head"><div><h3>{catSel}</h3><small className="muted">{catItems.length} {catItems.length === 1 ? 'despesa' : 'despesas'} · {pctOf(totCatSel, totDesp)} das despesas do período · {labelOf(period)}</small></div><button type="button" className="sec sm" onClick={() => setCatSel(null)}>Fechar ✕</button></div>
          <div className="wrap"><table className="rt"><thead><tr><th>Mês</th><th>Grupo</th><th>Despesa</th><th>Valor</th></tr></thead>
            <tbody>{catItems.map((x, i) => <tr key={i}><td className="ro">{mesTick(monthOf(x.date))}</td><td className="ro"><svg width="16" height="16" style={{ verticalAlign: 'middle', marginRight: 6 }}><MarkSvg {...markOf(String(x.grupo))} size={16} /></svg>{x.grupo}</td><td className="ro">{x.nome}{x.parcela ? ` (${x.parcela})` : ''}</td><td className="ro">{brl(x.valor)}</td></tr>)}</tbody>
            <tfoot><tr><td className="ro" colSpan={3}><b>Total</b></td><td className="ro"><b>{brl(totCatSel)}</b></td></tr></tfoot></table></div>
        </section>}
        <div className="card"><h3>Despesas por mês (principais grupos)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={empilhado}><CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mesTick} fontSize={11} minTickGap={16} /><YAxis fontSize={11} /><Tooltip formatter={(v, n, e) => [`${brl(v)} · ${pctOf(v, sumOfNumbers(e?.payload))} do mês`, n]} labelFormatter={mesTick} {...TT} />
              {empCats.map((c, i) => <Bar key={c} dataKey={c} stackId="d" fill={DESP_COLORS[i % 6]} />)}</BarChart>
          </ResponsiveContainer></div>
      </div>
    </>
  )
}
