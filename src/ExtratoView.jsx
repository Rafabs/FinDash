import { useEffect, useMemo, useState } from 'react'
import Table from './Table.jsx'
import PeriodFilter from './PeriodFilter.jsx'
import { EXT, CATS, RK } from './data.js'
import { rangeOf, inRange, labelOf } from './period.js'
import { brl } from './Dashboard.jsx'

const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
const PAGE = 50
const pct = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

export default function ExtratoView({ resgates = [], rows, period, setPeriod, onEdit, onDelete, onAdd, onPaste }) {
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const range = useMemo(() => rangeOf(period), [period])
  const years = useMemo(() => [...new Set(rows.map((r) => Number(String(r[D]).slice(0, 4))).filter(Boolean))], [rows])

  const base = useMemo(() => rows.map((r, i) => ({ r, i })).filter(({ r }) => inRange(r[D], range)), [rows, range])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return base
      .filter(({ r }) => (!cats.length || cats.includes(r.CATEGORIA)) && (!s || `${r.ORIGEM} ${r.TIPO} ${r['INSTITUIÇÃO']}`.toLowerCase().includes(s)))
      .sort((a, b) => (b.r[D] || '').localeCompare(a.r[D] || '') || b.i - a.i)
  }, [base, cats, q])

  const byCat = useMemo(() => {
    const m = Object.fromEntries(CATS.map((c) => [c, 0]))
    const cnt = Object.fromEntries(CATS.map((c) => [c, 0]))
    base.forEach(({ r }) => { const c = CATS.includes(r.CATEGORIA) ? r.CATEGORIA : 'Outros'; m[c] += Number(r[V]) || 0; cnt[c]++ })
    return { m, cnt }
  }, [base])
  const resTotal = useMemo(() => resgates.filter((r) => inRange(r.DATA_RESGATE, range)).reduce((s, r) => s + (Number(r[RK]) || 0), 0), [resgates, range])
  const segs = [...CATS.map((c) => [c, byCat.m[c]]), ['Resgates', resTotal]] // resgates somam às entradas
  const total = segs.reduce((s, [, v]) => s + v, 0)
  const pos = segs.reduce((s, [, v]) => s + Math.max(v, 0), 0)

  useEffect(() => setPage(0), [period, cats, q])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const cur = Math.min(page, pages - 1)
  const slice = filtered.slice(cur * PAGE, cur * PAGE + PAGE)
  const toggle = (c) => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))
  const add = () => { setCats([]); setQ(''); onAdd() }

  return (
    <>
      <section className="hero">
        <div className="hero-main">
          <small>Entradas no período</small>
          <strong>{brl(total)}</strong>
          <div className="pills">
            <span className="pill">{base.length} lançamentos</span>
            <span className="pill">Proventos <b>{brl(byCat.m.Proventos)}</b></span>
            <span className="pill">Rendimentos <b>{brl(byCat.m.Rendimentos)}</b></span>
            <span className="pill">Resgates <b>{brl(resTotal)}</b></span>
          </div>
          <div className="pills dim"><span>{labelOf(period)}</span></div>
        </div>
        <div className="hero-alloc">
          <small>Por categoria</small>
          <div className="bar">{segs.map(([c, v], i) => <i key={c} className={'c' + i} style={{ width: pos ? (Math.max(v, 0) / pos) * 100 + '%' : 0 }} />)}</div>
          <div className="legend">
            {segs.map(([c, v], i) => (
              <span key={c}><i className={'dot c' + i} />{c} <b>{pos ? pct((Math.max(v, 0) / pos) * 100) : '—'}</b><em>{brl(v)}</em></span>
            ))}
          </div>
        </div>
      </section>

      <div className="toolbar">
        <PeriodFilter period={period} onChange={setPeriod} years={years} />
        <input className="search" placeholder="Buscar origem, tipo ou instituição…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        {CATS.map((c, i) => (
          <button key={c} className={'chip-btn' + (cats.includes(c) ? ' on' : '')} onClick={() => toggle(c)}>
            <i className={'dot c' + i} />{c}<em>{byCat.cnt[c]}</em>
          </button>
        ))}
        {cats.length > 0 && <button className="chip-btn" onClick={() => setCats([])}>limpar</button>}
      </div>

      <Table
        cols={EXT} rows={slice.map((x) => x.r)} offset={cur * PAGE} selects={{ CATEGORIA: CATS }}
        onEdit={(n, k, v) => onEdit(slice[n].i, k, v)} onDelete={(n) => onDelete(slice[n].i)}
        onAdd={add} addLabel="+ Novo lançamento"
        info={`${filtered.length} lançamento${filtered.length === 1 ? '' : 's'}`}
        extra={<button className="sec" onClick={onPaste}>📋 Colar dados</button>}
      />
      <div className="pager">
        <button className="sec" disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹ Anterior</button>
        <span className="muted">Página {cur + 1} de {pages}</span>
        <button className="sec" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Próxima ›</button>
      </div>
    </>
  )
}
