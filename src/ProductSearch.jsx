import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { buildProducts, searchProducts } from './products.js'
import { brl } from './Dashboard.jsx'
import { RK } from './data.js'

const V = 'VALOR DA APLICAÇÃO', D = 'DATA DE RECEBIMENTO'
const f2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const pct = (v) => (v > 0 ? '+' : '') + (v * 100).toLocaleString('pt-BR', f2) + '%'
const dt = (s) => (s ? String(s).split('-').reverse().join('/') : '—')
const tone = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '')
const mesTick = (k) => k.slice(5) + '/' + k.slice(2, 4)
const tip = { contentStyle: { background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx)' }, cursor: { fill: 'var(--hover)' } }

function badge(e) {
  if (!e.ativo) return ['out', 'Fora da carteira']
  return e.kind === 'rv' ? ['rv', 'RV'] : ['rf', 'RF']
}

function provMensal(e) { // últimos 36 meses com meses vazios zerados
  const m = {}
  e.proventos.forEach((r) => { const k = r[D].slice(0, 7); m[k] = (m[k] || 0) + (Number(r[V]) || 0) })
  const keys = Object.keys(m).sort()
  if (!keys.length) return []
  const out = []
  let [y, mo] = keys[0].split('-').map(Number)
  const [ye, me] = keys[keys.length - 1].split('-').map(Number)
  while (y < ye || (y === ye && mo <= me)) {
    const k = `${y}-${String(mo).padStart(2, '0')}`
    out.push({ name: k, value: +(m[k] || 0).toFixed(2) })
    if (++mo > 12) { mo = 1; y++ }
  }
  return out.slice(-36)
}

function Detail({ e, onBack, onClose }) {
  const [b, label] = badge(e)
  const mensal = useMemo(() => provMensal(e), [e])
  const nProv = e.provList.length
  const kpis = [
    e.ativo && ['Valor hoje', brl(e.atual), ''],
    e.ativo && ['Total aplicado', brl(e.aplicado), ''],
    e.ativo && ['Rendimento', `${brl(e.rend)} (${pct(e.varp)})`, tone(e.rend)],
    e.ativo && ['Participação na carteira', (e.share * 100).toLocaleString('pt-BR', f2) + '%', ''],
    e.kind === 'rv' && ['Quantidade', e.qtd.toLocaleString('pt-BR', f2), ''],
    e.kind === 'rv' && ['Preço atual', brl(e.preco), ''],
    e.kind === 'rv' && ['Preço médio pago', brl(e.precoMedio), e.preco && e.precoMedio ? tone(e.preco - e.precoMedio) : ''],
    nProv > 0 && ['Proventos recebidos', brl(e.provTotal), ''],
    nProv > 0 && ['Proventos (12 meses)', brl(e.prov12m), ''],
    nProv > 0 && e.ativo && ['Yield on cost (12m)', (e.yoc * 100).toLocaleString('pt-BR', f2) + '%', ''],
    e.resgates.length > 0 && ['Resgates (rentabilidade)', `${brl(e.resTotal)} em ${e.resgates.length}`, tone(e.resTotal)],
    e.ativo && (nProv > 0 || e.resgates.length > 0) && ['Retorno total', `${brl(e.retorno)} (${pct(e.retornoPct)})`, tone(e.retorno)],
  ].filter(Boolean)

  return (
    <>
      <div className="pdet-top">
        <button className="sec sm" onClick={onBack}>← Buscar outro</button>
        <button className="icon" title="Fechar" onClick={onClose}>✕</button>
      </div>
      <div className="pdet-head">
        <div>
          <h3>{e.title}</h3>
          <small className="muted">{e.subtitle || '—'}</small>
        </div>
        <div className="pdet-badges">
          <span className={'pbadge ' + b}>{label}</span>
          {e.ativo && e.tipoInv && e.kind === 'rf' && <span className="pbadge rf">Renda fixa</span>}
          {nProv > 0 && <span className="pbadge prov">{nProv} proventos</span>}
        </div>
      </div>

      <div className="cards pdet-kpis">
        {kpis.map(([l, v, t]) => <div className="card kpi" key={l}><small>{l}</small><b className={t}>{v}</b></div>)}
      </div>

      {e.lotes.length > 0 && (
        <section className="pdet-sec">
          <h4>Lotes na carteira ({e.lotes.length})</h4>
          <div className="wrap pdet-wrap">
            <table className="rt">
              <thead><tr><th>Data</th><th>Qtd.</th><th>Preço unit.</th><th>Aplicado</th><th>Valor hoje</th><th>Rendimento</th><th>Variação</th><th>Duração</th></tr></thead>
              <tbody>
                {e.lotes.map((r, i) => {
                  const rend = (Number(r.TOTAL_ATUAL) || 0) - (Number(r.VLR_APLICACAO) || 0)
                  return (
                    <tr key={i}>
                      <td data-label="Data">{dt(r.DATA_APLICACAO)}</td>
                      <td data-label="Qtd.">{(Number(r.QTD_COMPRA) || 0).toLocaleString('pt-BR', f2)}</td>
                      <td data-label="Preço unit.">{brl(r.PRC_UNIT)}</td>
                      <td data-label="Aplicado">{brl(r.VLR_APLICACAO)}</td>
                      <td data-label="Valor hoje">{brl(r.TOTAL_ATUAL)}</td>
                      <td data-label="Rendimento" className={'t-' + tone(rend)}>{brl(rend)}</td>
                      <td data-label="Variação" className={'t-' + tone(r.VAR_PP)}>{pct(r.VAR_PP || 0)}</td>
                      <td data-label="Duração">{r.PERIODO !== '' && r.PERIODO != null ? r.PERIODO + ' dias' : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {nProv > 0 && (
        <section className="pdet-sec">
          <h4>Proventos recebidos</h4>
          <div className="pdet-prov">
            <div className="card" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={mensal}><CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mesTick} fontSize={10} minTickGap={14} /><YAxis fontSize={10} width={42} /><Tooltip formatter={(v) => brl(v)} labelFormatter={mesTick} {...tip} /><Bar dataKey="value" fill="#6366f1" radius={[5, 5, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="pdet-list">
              {e.provList.slice(0, 8).map((r, i) => <li key={i}><span>{dt(r[D])}</span><b>{brl(r[V])}</b></li>)}
              {nProv > 8 && <li className="muted"><span>+ {nProv - 8} pagamentos anteriores</span></li>}
              <li className="tot"><span>Maior pagamento</span><b>{brl(e.provMaior)}</b></li>
              <li className="tot"><span>Média por pagamento</span><b>{brl(e.provTotal / nProv)}</b></li>
            </ul>
          </div>
        </section>
      )}

      {e.resgates.length > 0 && (
        <section className="pdet-sec">
          <h4>Resgates ({e.resgates.length})</h4>
          <ul className="pdet-list wide">
            {e.resList.slice(0, 10).map((r, i) => <li key={i}><span>{dt(r.DATA_RESGATE)}</span><span className="muted">{r.PRODUTO}</span><b className={'t-' + tone(r[RK])}>{brl(r[RK])}</b></li>)}
            {e.resList.length > 10 && <li className="muted"><span>+ {e.resList.length - 10} resgates anteriores</span></li>}
          </ul>
        </section>
      )}
      {!e.ativo && <p className="hint">Este produto não está mais na carteira atual. Os dados vêm dos proventos do Extrato e/ou dos Resgates.</p>}
    </>
  )
}

export default function ProductSearch({ data, onClose }) {
  const all = useMemo(() => buildProducts(data), [data])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [act, setAct] = useState(0)
  const list = useMemo(() => searchProducts(all, q), [all, q])
  const box = useRef(null)
  useEffect(() => setAct(0), [q])
  useEffect(() => { box.current?.querySelector('.ps-item.on')?.scrollIntoView({ block: 'nearest' }) }, [act])

  // teclado global (o campo de busca some quando o detalhe abre)
  useEffect(() => {
    const h = (ev) => {
      if (ev.key === 'Escape') return sel ? setSel(null) : onClose()
      if (sel) return
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setAct((a) => Math.min(a + 1, list.length - 1)) }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); setAct((a) => Math.max(a - 1, 0)) }
      if (ev.key === 'Enter' && list[act]) setSel(list[act])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sel, list, act, onClose])
  const nAtivos = list.filter((e) => e.ativo).length

  const item = (e, i) => {
    const [b, label] = badge(e)
    return (
      <button key={e.id} className={'ps-item' + (i === act ? ' on' : '')} onMouseEnter={() => setAct(i)} onClick={() => setSel(e)}>
        <span className={'pbadge ' + b}>{label}</span>
        <span className="ps-main"><b>{e.title}</b><small>{e.subtitle || '—'}</small></span>
        <span className="ps-side">
          {e.ativo ? <><b>{brl(e.atual)}</b><small className={'t-' + tone(e.rend)}>{pct(e.varp)}</small></>
            : <><b>{e.provTotal ? brl(e.provTotal) : brl(e.resTotal)}</b><small>{e.provTotal ? 'em proventos' : 'em resgates'}</small></>}
        </span>
      </button>
    )
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide ps" onClick={(e) => e.stopPropagation()}>
        {sel ? <Detail e={sel} onBack={() => setSel(null)} onClose={onClose} /> : (
          <>
            <div className="ps-input">
              <span>🔍</span>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto, papel ou banco… (ex.: MXRF11, tesouro, RDB, banco xp)" />
              <button className="icon" onClick={onClose} title="Fechar (Esc)">✕</button>
            </div>
            <div className="ps-list" ref={box}>
              {list.length === 0 && <div className="empty">Nada encontrado para “{q}”. Tente o código do papel, o nome do produto ou o banco.</div>}
              {nAtivos > 0 && <div className="ps-group">{q ? 'Na carteira' : 'Maiores posições'} · {nAtivos}</div>}
              {list.map((e, i) => (e.ativo ? item(e, i) : null))}
              {list.length > nAtivos && <div className="ps-group">Fora da carteira (proventos e resgates) · {list.length - nAtivos}</div>}
              {list.map((e, i) => (!e.ativo ? item(e, i) : null))}
            </div>
            <p className="hint ps-foot">↑↓ navegar · Enter abrir · Esc fechar · dados da sua carteira, proventos e resgates</p>
          </>
        )}
      </div>
    </div>
  )
}
