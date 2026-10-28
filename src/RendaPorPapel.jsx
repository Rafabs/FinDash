import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildProducts } from './products.js'
import { brl } from './Dashboard.jsx'

const fmtPct = (v) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
const money = (v) => brl(v)

export default function RendaPorPapel({ data }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'yoc', dir: 'desc' })
  const allRows = useMemo(() => buildProducts(data)
    .filter((e) => e.ativo && e.kind === 'rv')
    .map((e) => ({ ...e, mediaMensal: e.prov12m / 12 })), [data])
  const rows = useMemo(() => allRows
    .filter((e) => e.title.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))
    .sort((a, b) => (a[sort.key] - b[sort.key]) * (sort.dir === 'asc' ? 1 : -1)), [allRows, query, sort])
  const invested = allRows.reduce((s, e) => s + e.aplicado, 0)
  const income = allRows.reduce((s, e) => s + e.prov12m, 0)
  const weightedYield = invested ? income / invested : 0
  const chart = [...allRows].filter((e) => e.prov12m > 0).sort((a, b) => b.prov12m - a.prov12m).slice(0, 8).map((e) => ({ name: e.title, yoc: +(e.yoc * 100).toFixed(2) }))
  const chooseSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  return <>
    <section className="renda-intro">
      <div><span className="renda-eyebrow">RENDA DA CARTEIRA</span><h2>Yield on cost por papel</h2>
        <p>Quanto cada posição gerou em proventos nos últimos 12 meses, em relação ao valor aplicado.</p></div>
      <div className="renda-period">Janela móvel · últimos 12 meses</div>
    </section>
    <div className="cards renda-kpis">
      <div className="card kpi"><span className="ic">💰</span><small>Proventos recebidos · 12 meses</small><b>{money(income)}</b></div>
      <div className="card kpi"><span className="ic">💼</span><small>Valor aplicado nos papéis</small><b>{money(invested)}</b></div>
      <div className="card kpi"><span className="ic">％</span><small>Yield on cost ponderado</small><b className="pos">{fmtPct(weightedYield)}</b></div>
      <div className="card kpi"><span className="ic">📆</span><small>Média mensal de proventos</small><b>{money(income / 12)}</b></div>
    </div>
    <div className="grid renda-grid">
      <section className="card renda-chart"><h3>Yield por papel</h3><small className="muted">Papéis com proventos no período · maiores 8</small>
        {chart.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={chart} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 4 }}><CartesianGrid horizontal={false} /><XAxis type="number" unit="%" fontSize={11} /><YAxis type="category" dataKey="name" width={76} fontSize={11} /><Tooltip formatter={(v) => fmtPct(v / 100)} /><Bar dataKey="yoc" name="Yield on cost" fill="#14b8a6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer> : <div className="renda-empty">Ainda não há proventos associados a papéis nos últimos 12 meses.</div>}
      </section>
      <section className="card renda-note"><span className="renda-note-icon">ⓘ</span><div><h3>Como ler este indicador</h3><p>Yield on cost = proventos recebidos nos últimos 12 meses ÷ valor aplicado registrado para o papel.</p><p>O cálculo usa o valor aplicado atual da carteira. Ele ajuda a comparar a renda histórica entre posições e não estima pagamentos futuros.</p></div></section>
    </div>
    <section className="card renda-table-card">
      <div className="renda-table-head"><div><h3>Renda por papel</h3><small className="muted">{rows.length} {rows.length === 1 ? 'papel' : 'papéis'} · valores em reais</small></div>
        <input className="search renda-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por ticker…" aria-label="Filtrar por ticker" />
      </div>
      {rows.length ? <div className="renda-table-wrap"><table className="renda-table"><thead><tr><th>Papel</th><th className="renda-sort" onClick={() => chooseSort('aplicado')}>Valor aplicado ↕</th><th className="renda-sort" onClick={() => chooseSort('prov12m')}>Proventos · 12m ↕</th><th>Média mensal</th><th className="renda-sort" onClick={() => chooseSort('yoc')}>Yield on cost ↕</th></tr></thead>
        <tbody>{rows.map((e) => <tr key={e.id}><td><b className="renda-ticker">{e.title}</b><small>{e.subtitle || 'Renda variável'}</small></td><td data-label="Valor aplicado">{money(e.aplicado)}</td><td data-label="Proventos · 12m">{money(e.prov12m)}</td><td data-label="Média mensal">{money(e.mediaMensal)}</td><td data-label="Yield on cost"><span className="renda-yield">{fmtPct(e.yoc)}</span></td></tr>)}</tbody></table></div> : <div className="renda-empty">{query ? 'Nenhum papel encontrado com esse ticker.' : 'Adicione papéis à carteira e associe os proventos pelo ticker para acompanhar o yield.'}</div>}
    </section>
  </>
}
