import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildProducts } from './products.js'
import { brl } from './Dashboard.jsx'

const fmtPct = (v) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
const money = (v) => brl(v)
const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
const PERIODS = [['3', '3 meses'], ['6', '6 meses'], ['12', '12 meses'], ['24', '24 meses'], ['36', '36 meses'], ['todos', 'Todo o histórico']]
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// primeiro dia do mês, n-1 meses atrás (n=12: mesma janela de antes)
const fromDate = (n) => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth() - (n - 1), 1)) }

export default function RendaPorPapel({ data }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'yocAnual', dir: 'desc' })
  const [period, setPeriod] = useState('12') // janela dos proventos: 3, 6, 12, 24, 36 meses ou todo o histórico
  const base = useMemo(() => buildProducts(data).filter((e) => e.ativo && e.kind === 'rv'), [data])
  // meses da janela: fixo, ou (todo o histórico) do primeiro provento até hoje
  const nMonths = useMemo(() => {
    if (period !== 'todos') return Number(period)
    const first = base.flatMap((e) => e.provList).map((r) => String(r[D] || '')).filter(Boolean).sort()[0]
    if (!first) return 12
    const now = new Date()
    return Math.max(1, (now.getFullYear() - Number(first.slice(0, 4))) * 12 + now.getMonth() + 1 - Number(first.slice(5, 7)) + 1)
  }, [base, period])
  const allRows = useMemo(() => {
    const from = period === 'todos' ? '' : fromDate(Number(period))
    return base.map((e) => {
      const prov = e.provList.filter((r) => !from || r[D] >= from).reduce((t, r) => t + (Number(r[V]) || 0), 0)
      return { ...e, prov, yoc: e.aplicado ? prov / e.aplicado : 0, yocAnual: e.aplicado ? (prov * 12) / nMonths / e.aplicado : 0, mediaMensal: prov / nMonths }
    })
  }, [base, period, nMonths])
  const label = period === 'todos' ? 'todo o histórico' : `últimos ${period} meses`
  const short = period === 'todos' ? 'tudo' : `${period}m`
  const rows = useMemo(() => allRows
    .filter((e) => e.title.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))
    .sort((a, b) => (a[sort.key] - b[sort.key]) * (sort.dir === 'asc' ? 1 : -1)), [allRows, query, sort])
  const invested = allRows.reduce((s, e) => s + e.aplicado, 0)
  const income = allRows.reduce((s, e) => s + e.prov, 0)
  const weightedYield = invested ? (income * 12) / nMonths / invested : 0 // anualizado
  const chart = [...allRows].filter((e) => e.prov > 0).sort((a, b) => b.prov - a.prov).slice(0, 8).map((e) => ({ name: e.title, yoc: +(e.yocAnual * 100).toFixed(2) }))
  const chooseSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  return <>
    <section className="renda-intro">
      <div><span className="renda-eyebrow">RENDA DA CARTEIRA</span><h2>Yield on cost por papel</h2>
        <p>Quanto cada posição gerou em proventos nos {label}, em relação ao valor aplicado.</p></div>
      <label className="renda-period">Período dos proventos <select value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    </section>
    <div className="cards renda-kpis">
      <div className="card kpi"><span className="ic">💰</span><small>Proventos recebidos · {period === 'todos' ? 'histórico' : `${period} meses`}</small><b>{money(income)}</b></div>
      <div className="card kpi"><span className="ic">💼</span><small>Valor aplicado nos papéis</small><b>{money(invested)}</b></div>
      <div className="card kpi"><span className="ic">％</span><small>Yield on cost ponderado · a.a.</small><b className="pos">{fmtPct(weightedYield)}</b></div>
      <div className="card kpi"><span className="ic">📆</span><small>Média mensal de proventos</small><b>{money(income / nMonths)}</b></div>
    </div>
    <div className="grid renda-grid">
      <section className="card renda-chart"><h3>Yield por papel</h3><small className="muted">Papéis com proventos no período · maiores 8 · yield anualizado</small>
        {chart.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={chart} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 4 }}><CartesianGrid horizontal={false} /><XAxis type="number" unit="%" fontSize={11} /><YAxis type="category" dataKey="name" width={76} fontSize={11} /><Tooltip formatter={(v) => fmtPct(v / 100)} /><Bar dataKey="yoc" name="Yield on cost anualizado" fill="#00d2be" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer> : <div className="renda-empty">Ainda não há proventos associados a papéis no período ({label}).</div>}
      </section>
      <section className="card renda-note"><span className="renda-note-icon">ⓘ</span><div><h3>Como ler este indicador</h3><p>Yield on cost = proventos recebidos no período escolhido ÷ valor aplicado registrado para o papel. O <b>yield a.a.</b> converte o período para 12 meses (proventos × 12 ÷ meses do período).</p><p>O cálculo usa o valor aplicado atual da carteira. Ele ajuda a comparar a renda histórica entre posições e não estima pagamentos futuros.</p></div></section>
    </div>
    <section className="card renda-table-card">
      <div className="renda-table-head"><div><h3>Renda por papel</h3><small className="muted">{rows.length} {rows.length === 1 ? 'papel' : 'papéis'} · valores em reais</small></div>
        <input className="search renda-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por ticker…" aria-label="Filtrar por ticker" />
      </div>
      {rows.length ? <div className="renda-table-wrap"><table className="renda-table"><thead><tr><th>Papel</th><th className="renda-sort" onClick={() => chooseSort('aplicado')}>Valor aplicado ↕</th><th className="renda-sort" onClick={() => chooseSort('prov')}>Proventos · {short} ↕</th><th>Média mensal</th><th className="renda-sort" onClick={() => chooseSort('yoc')}>Yield no período ↕</th><th className="renda-sort" onClick={() => chooseSort('yocAnual')}>Yield a.a. ↕</th></tr></thead>
        <tbody>{rows.map((e) => <tr key={e.id}><td><b className="renda-ticker">{e.title}</b><small>{e.subtitle || 'Renda variável'}</small></td><td data-label="Valor aplicado">{money(e.aplicado)}</td><td data-label={`Proventos · ${short}`}>{money(e.prov)}</td><td data-label="Média mensal">{money(e.mediaMensal)}</td><td data-label="Yield no período">{fmtPct(e.yoc)}</td><td data-label="Yield a.a."><span className="renda-yield">{fmtPct(e.yocAnual)}</span></td></tr>)}</tbody></table></div> : <div className="renda-empty">{query ? 'Nenhum papel encontrado com esse ticker.' : 'Adicione papéis à carteira e associe os proventos pelo ticker para acompanhar o yield.'}</div>}
    </section>
  </>
}
