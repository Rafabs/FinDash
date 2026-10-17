import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const COLORS = ['#2f6fed', '#18a999', '#f2a541', '#e4572e', '#8e5ef0', '#6c757d', '#3ba55d']
export const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const sum = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
const group = (rows, key, val) => {
  const m = {}
  rows.forEach((r) => { const g = (typeof key === 'function' ? key(r) : r[key]) || 'N/A'; m[g] = (m[g] || 0) + (Number(r[val]) || 0) })
  return Object.entries(m).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value)
}

export function resumo(d) {
  const aplicado = sum(d.carteira, 'VLR_APLICACAO'), atual = sum(d.carteira, 'TOTAL_ATUAL')
  return [
    ['Total aplicado', brl(aplicado)], ['Patrimônio atual', brl(atual)],
    ['Rendimento bruto', brl(atual - aplicado)],
    ['Variação', aplicado ? (((atual - aplicado) / aplicado) * 100).toFixed(2) + '%' : '-'],
    ['Proventos recebidos', brl(sum(d.extrato, 'VALOR DA APLICAÇÃO'))],
  ]
}

export default function Dashboard({ data }) {
  const { carteira, extrato } = data
  const porTipo = group(carteira, 'TIPO_INV', 'TOTAL_ATUAL')
  const porBanco = group(carteira, 'BANCO', 'TOTAL_ATUAL')
  const porMes = group(extrato.filter((r) => r['DATA DE RECEBIMENTO']), (r) => r['DATA DE RECEBIMENTO'].slice(0, 7), 'VALOR DA APLICAÇÃO').sort((a, b) => a.name.localeCompare(b.name))
  const porPapel = group(extrato, (r) => (r.TIPO.match(/\b[A-Z]{4}\d{2}\b/) || ['Outros'])[0], 'VALOR DA APLICAÇÃO').slice(0, 10)
  const tip = (v) => brl(v)

  return (
    <>
      <div className="cards">
        {resumo(data).map(([l, v]) => <div className="card" key={l}><small>{l}</small><b>{v}</b></div>)}
      </div>
      <div className="grid">
        <div className="card"><h3>Alocação (RF x RV)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={porTipo} dataKey="value" nameKey="name" label>{porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % 7]} />)}</Pie><Tooltip formatter={tip} /></PieChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Patrimônio por banco</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porBanco} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip formatter={tip} /><Bar dataKey="value" fill="#2f6fed" /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Proventos por mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porMes}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={tip} /><Bar dataKey="value" fill="#18a999" /></BarChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Proventos por papel (top 10)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porPapel}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={tip} /><Bar dataKey="value" fill="#f2a541" /></BarChart>
          </ResponsiveContainer></div>
      </div>
    </>
  )
}
