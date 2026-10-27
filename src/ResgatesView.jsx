import { useEffect, useMemo, useRef, useState } from 'react'
import Table from './Table.jsx'
import PeriodFilter from './PeriodFilter.jsx'
import { RES, RK } from './data.js'
import { nextSort, sortItems } from './sort.js'
import Pager, { usePageSize } from './Pager.jsx'
import SearchField from './SearchField.jsx'
import { rangeOf, inRange, labelOf } from './period.js'
import { brl } from './Dashboard.jsx'

const pct = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
const val = (r) => Number(r[RK]) || 0

export default function ResgatesView({ rows, period, setPeriod, onEdit, onDelete, onAdd }) {
  const [prods, setProds] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState(null)
  const [size, setSize] = usePageSize()
  const [editing, setEditing] = useState(() => new Set()) // índices em edição (lápis)
  const wantEdit = useRef(false)
  const range = useMemo(() => rangeOf(period), [period])
  const years = useMemo(() => [...new Set(rows.map((r) => Number(String(r.DATA_RESGATE).slice(0, 4))).filter(Boolean))], [rows])

  const base = useMemo(() => rows.map((r, i) => ({ r, i })).filter(({ r }) => inRange(r.DATA_RESGATE, range)), [rows, range])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return base
      .filter(({ r }) => (!prods.length || prods.includes(r.PRODUTO)) && (!s || String(r.PRODUTO).toLowerCase().includes(s)))
      .sort((a, b) => (b.r.DATA_RESGATE || '').localeCompare(a.r.DATA_RESGATE || '') || b.i - a.i)
  }, [base, prods, q])

  const sorted = useMemo(() => sortItems(filtered, sort, (x, k) => x.r[k], (k) => RES.find((c) => c[0] === k)?.[1]), [filtered, sort])

  const stat = useMemo(() => {
    const by = {}, cnt = {}
    let ganhos = 0, perdas = 0
    base.forEach(({ r }) => {
      const v = val(r), p = r.PRODUTO || 'Sem produto'
      by[p] = (by[p] || 0) + v; cnt[p] = (cnt[p] || 0) + 1
      if (v >= 0) ganhos += v; else perdas += v
    })
    const list = Object.entries(by).sort((a, b) => b[1] - a[1])
    return { by, cnt, list, total: ganhos + perdas, ganhos, perdas }
  }, [base])
  const top = stat.list.slice(0, 5)
  const resto = stat.list.slice(5).reduce((s, [, v]) => s + v, 0)
  const segs = [...top, ...(stat.list.length > 5 ? [['Demais', resto]] : [])]
  const pos = segs.reduce((s, [, v]) => s + Math.max(v, 0), 0)
  const dir = stat.total > 0 ? 'up' : stat.total < 0 ? 'down' : ''

  useEffect(() => setPage(0), [period, prods, q, sort, size])
  const pages = Math.max(1, Math.ceil(sorted.length / size))
  const cur = Math.min(page, pages - 1)
  const slice = sorted.slice(cur * size, cur * size + size)
  const toggle = (c) => setProds((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))
  const toggleEdit = (g) => setEditing((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n })
  const add = () => { wantEdit.current = true; setSort(null); setProds([]); setQ(''); setPage(0); setPeriod((p) => ({ ...p, mode: 'all' })); onAdd() }
  // o resgate recém-criado já abre em modo de edição
  useEffect(() => { if (wantEdit.current) { wantEdit.current = false; toggleEdit(rows.length - 1) } }, [rows.length])
  const del = (g) => { setEditing(new Set()); onDelete(g) }

  return (
    <>
      <section className="hero">
        <div className="hero-main">
          <small>Rentabilidade resgatada no período</small>
          <strong>{brl(stat.total)}</strong>
          <div className="pills">
            <span className="pill">{base.length} resgates</span>
            <span className={'pill ' + dir}>{stat.total > 0 ? '▲' : stat.total < 0 ? '▼' : '•'} soma às entradas</span>
            <span className="pill">Ganhos <b>{brl(stat.ganhos)}</b></span>
            {stat.perdas < 0 && <span className="pill">Perdas <b>{brl(stat.perdas)}</b></span>}
          </div>
          <div className="pills dim"><span>{labelOf(period)}</span></div>
        </div>
        <div className="hero-alloc">
          <small>Por produto</small>
          <div className="bar">{segs.map(([n, v], i) => <i key={n} className={'c' + i} style={{ width: pos ? (Math.max(v, 0) / pos) * 100 + '%' : 0 }} />)}</div>
          <div className="legend">
            {segs.map(([n, v], i) => <span key={n}><i className={'dot c' + i} />{n} <b>{pos ? pct((Math.max(v, 0) / pos) * 100) : '—'}</b><em>{brl(v)}</em></span>)}
          </div>
        </div>
      </section>

      <div className="toolbar">
        <PeriodFilter period={period} onChange={setPeriod} years={years} />
        <SearchField placeholder="Buscar produto…" value={q} onChange={setQ} />
      </div>
      <div className="chips">
        {stat.list.map(([c]) => (
          <button key={c} className={'chip-btn' + (prods.includes(c) ? ' on' : '')} onClick={() => toggle(c)}>{c}<em>{stat.cnt[c]}</em></button>
        ))}
        {prods.length > 0 && <button className="chip-btn" onClick={() => setProds([])}>limpar</button>}
      </div>

      <Table
        cols={RES} rows={slice.map((x) => x.r)} offset={cur * size} toneMoney sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))}
        onEdit={(n, k, v) => onEdit(slice[n].i, k, v)} onDelete={(n) => del(slice[n].i)}
        onDeleteMany={(ns) => ns.map((n) => slice[n].i).sort((a, b) => b - a).forEach(del)}
        rowEditing={(n) => editing.has(slice[n].i)} onToggleEdit={(n) => toggleEdit(slice[n].i)}
        onAdd={add} addLabel="+ Novo resgate"
        info={`${filtered.length} resgate${filtered.length === 1 ? '' : 's'}`}
      />
      <Pager page={cur} pages={pages} total={sorted.length} size={size} onPage={setPage} onSize={setSize} />
    </>
  )
}
