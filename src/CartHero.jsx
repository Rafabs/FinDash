import { brl } from './Dashboard.jsx'

const sum = (rows, f) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0)
const pct = (v, d = 2) => Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%'

export default function CartHero({ rows }) {
  const aplicado = sum(rows, (r) => r.VLR_APLICACAO)
  const atual = sum(rows, (r) => r.TOTAL_ATUAL)
  const rend = atual - aplicado
  const variacao = aplicado ? (rend / aplicado) * 100 : 0
  const rf = sum(rows.filter((r) => r.TIPO_INV !== 'RV'), (r) => r.TOTAL_ATUAL)
  const rv = atual - rf
  const rfp = atual ? (rf / atual) * 100 : 0
  const papeis = new Set(rows.filter((r) => r.TIPO_INV === 'RV' && r.PAPEL && r.PAPEL !== 'N/A').map((r) => r.PAPEL)).size
  const iof = rows.filter((r) => r.IOF === 'SIM').length
  const dir = rend > 0 ? 'up' : rend < 0 ? 'down' : ''
  const arrow = rend > 0 ? '▲' : rend < 0 ? '▼' : '•'
  const sign = rend > 0 ? '+ ' : rend < 0 ? '− ' : ''

  return (
    <section className="hero">
      <div className="hero-main">
        <small>Patrimônio atual</small>
        <strong>{brl(atual)}</strong>
        <div className="pills">
          <span className="pill">Investido <b>{brl(aplicado)}</b></span>
          <span className={'pill ' + dir}>Rendimento <b>{arrow} {sign}{brl(Math.abs(rend))}</b></span>
          <span className={'pill ' + dir}>{arrow} <b>{pct(variacao)}</b></span>
        </div>
        <div className="pills dim">
          <span>{rows.length} itens</span><span>·</span><span>{papeis} papéis em RV</span>
          {iof > 0 && <><span>·</span><span>{iof} com IOF</span></>}
        </div>
      </div>
      <div className="hero-alloc">
        <small>Alocação</small>
        <div className="bar"><i className="rf" style={{ width: rfp + '%' }} /><i className="rv" style={{ width: atual ? 100 - rfp + '%' : 0 }} /></div>
        <div className="legend">
          <span><i className="dot rf" />Renda Fixa <b>{pct(rfp)}</b><em>{brl(rf)}</em></span>
          <span><i className="dot rv" />Renda Variável <b>{pct(atual ? 100 - rfp : 0)}</b><em>{brl(rv)}</em></span>
        </div>
      </div>
    </section>
  )
}
