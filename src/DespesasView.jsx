import { useEffect, useMemo, useState } from 'react'
import PeriodFilter from './PeriodFilter.jsx'
import LancarMes from './LancarMes.jsx'
import { totalOf, monthOf, round2 } from './data.js'
import { rangeOf, inRange, labelOf, nowYM } from './period.js'
import { brl } from './Dashboard.jsx'

const PAGE = 50
const pct = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
const mesCurto = (k) => k.slice(5) + '/' + k.slice(2, 4)

function ItemsModal({ row, onSave, onClose }) {
  const [items, setItems] = useState(row.ITENS.map((i) => ({ ...i })))
  const up = (j, p) => setItems((x) => x.map((it, k) => (k === j ? { ...it, ...p } : it)))
  const clean = items.filter((i) => i.VALOR !== '' && !isNaN(Number(i.VALOR))).map((i) => ({ NOME: String(i.NOME).trim(), VALOR: round2(i.VALOR) }))
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{row.TIPO_CONTA} · {mesCurto(monthOf(row.DATA))}</h3>
        <div className="slot-items">
          {items.map((it, j) => (
            <div className="it" key={j}>
              <input className="cell" placeholder="Descrição" value={it.NOME} onChange={(e) => up(j, { NOME: e.target.value })} />
              <div className="money"><span>R$</span><input type="number" step="0.01" value={it.VALOR} onChange={(e) => up(j, { VALOR: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
              {items.length > 1 && <button className="icon" onClick={() => setItems((x) => x.filter((_, k) => k !== j))}>✕</button>}
            </div>
          ))}
          <button className="sec sm" onClick={() => setItems((x) => [...x, { NOME: '', VALOR: '' }])}>+ item</button>
        </div>
        <p className="hint">Total: <b>{brl(totalOf({ ITENS: clean }))}</b></p>
        <div className="actions">
          <button className="sec" onClick={onClose}>Cancelar</button>
          <button disabled={!clean.length} onClick={() => onSave(clean)}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function DespesasView({ rows, period, setPeriod, onUpdate, onDelete, onSaveMonth }) {
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [view, setView] = useState('lista')
  const [lancar, setLancar] = useState(null)
  const [editing, setEditing] = useState(null)
  const range = useMemo(() => rangeOf(period), [period])
  const years = useMemo(() => [...new Set(rows.map((r) => Number(r.DATA.slice(0, 4))))], [rows])
  const types = useMemo(() => {
    const c = {}; rows.forEach((r) => (c[r.TIPO_CONTA] = (c[r.TIPO_CONTA] || 0) + 1))
    return Object.keys(c).sort((a, b) => c[b] - c[a])
  }, [rows])

  const base = useMemo(() => rows.map((r, i) => ({ r, i })).filter(({ r }) => inRange(r.DATA, range)), [rows, range])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return base
      .filter(({ r }) => (!cats.length || cats.includes(r.TIPO_CONTA)) && (!s || `${r.TIPO_CONTA} ${r.ITENS.map((i) => i.NOME).join(' ')}`.toLowerCase().includes(s)))
      .sort((a, b) => b.r.DATA.localeCompare(a.r.DATA) || a.r.TIPO_CONTA.localeCompare(b.r.TIPO_CONTA) || a.i - b.i)
  }, [base, cats, q])

  const stat = useMemo(() => {
    const by = {}, cnt = {}, meses = new Set()
    base.forEach(({ r }) => { by[r.TIPO_CONTA] = (by[r.TIPO_CONTA] || 0) + totalOf(r); cnt[r.TIPO_CONTA] = (cnt[r.TIPO_CONTA] || 0) + 1; meses.add(monthOf(r.DATA)) })
    const list = Object.entries(by).sort((a, b) => b[1] - a[1])
    const total = list.reduce((s, [, v]) => s + v, 0)
    return { by, cnt, list, total, nMeses: meses.size }
  }, [base])
  const top = stat.list.slice(0, 5), resto = stat.list.slice(5).reduce((s, [, v]) => s + v, 0)
  const segs = [...top, ...(resto ? [['Demais', resto]] : [])]
  const pos = segs.reduce((s, [, v]) => s + Math.max(v, 0), 0)

  useEffect(() => setPage(0), [period, cats, q])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const cur = Math.min(page, pages - 1)
  const slice = filtered.slice(cur * PAGE, cur * PAGE + PAGE)
  const toggle = (c) => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  // matriz conta x mês (últimos 24 meses do período)
  const matrix = useMemo(() => {
    if (view !== 'matriz') return null
    const all = [...new Set(filtered.map(({ r }) => monthOf(r.DATA)))].sort()
    const months = all.slice(-24)
    const m = {}
    filtered.forEach(({ r }) => { const k = monthOf(r.DATA); if (!months.includes(k)) return; (m[r.TIPO_CONTA] ||= {})[k] = (m[r.TIPO_CONTA][k] || 0) + totalOf(r) })
    const lines = Object.entries(m).map(([t, v]) => ({ t, v, tot: Object.values(v).reduce((a, b) => a + b, 0), max: Math.max(...Object.values(v)) })).sort((a, b) => b.tot - a.tot)
    const colTot = Object.fromEntries(months.map((k) => [k, lines.reduce((s, l) => s + (l.v[k] || 0), 0)]))
    return { months, lines, colTot, cut: all.length > 24 }
  }, [filtered, view])

  const nextYM = nowYM()

  return (
    <>
      <section className="hero">
        <div className="hero-main">
          <small>Despesas no período</small>
          <strong>{brl(stat.total)}</strong>
          <div className="pills">
            <span className="pill">{base.length} lançamentos</span>
            <span className="pill">Média/mês <b>{brl(stat.nMeses ? stat.total / stat.nMeses : 0)}</b></span>
            {stat.list[0] && <span className="pill">Maior: <b>{stat.list[0][0]}</b></span>}
          </div>
          <div className="pills dim"><span>{labelOf(period)} · {stat.nMeses} {stat.nMeses === 1 ? 'mês' : 'meses'} com lançamentos</span></div>
        </div>
        <div className="hero-alloc">
          <small>Por conta</small>
          <div className="bar">{segs.map(([n, v], i) => <i key={n} className={'c' + i} style={{ width: pos ? (Math.max(v, 0) / pos) * 100 + '%' : 0 }} />)}</div>
          <div className="legend">
            {segs.map(([n, v], i) => <span key={n}><i className={'dot c' + i} />{n} <b>{pos ? pct((Math.max(v, 0) / pos) * 100) : '—'}</b><em>{brl(v)}</em></span>)}
          </div>
        </div>
      </section>

      <div className="toolbar">
        <PeriodFilter period={period} onChange={setPeriod} years={years} />
        <input className="search" placeholder="Buscar conta ou item…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          <button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>Lista</button>
          <button className={view === 'matriz' ? 'on' : ''} onClick={() => setView('matriz')}>Matriz mensal</button>
        </div>
        <button onClick={() => setLancar(nextYM)}>📅 Lançar mês</button>
      </div>
      <div className="chips">
        {types.filter((t) => stat.cnt[t]).map((c) => (
          <button key={c} className={'chip-btn' + (cats.includes(c) ? ' on' : '')} onClick={() => toggle(c)}>{c}<em>{stat.cnt[c]}</em></button>
        ))}
        {cats.length > 0 && <button className="chip-btn" onClick={() => setCats([])}>limpar</button>}
      </div>

      {view === 'lista' ? (
        <>
          <section className="panel">
            <div className="panel-head"><span className="muted">{filtered.length} lançamento{filtered.length === 1 ? '' : 's'} · campos com borda são editáveis · clique nos itens para detalhar</span></div>
            <div className="wrap">
              <datalist id="dl-contas">{types.map((t) => <option key={t} value={t} />)}</datalist>
              <table>
                <thead><tr><th>#</th><th>Mês</th><th>Conta</th><th>Itens</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {slice.map(({ r, i }, n) => (
                    <tr key={i}>
                      <td className="idx">{cur * PAGE + n + 1}</td>
                      <td><input className="cell" type="month" value={monthOf(r.DATA)} onChange={(e) => e.target.value && onUpdate(i, { DATA: e.target.value + '-01' })} /></td>
                      <td><input className="cell" list="dl-contas" style={{ minWidth: 170 }} value={r.TIPO_CONTA} onChange={(e) => onUpdate(i, { TIPO_CONTA: e.target.value })} /></td>
                      <td><button className="items-btn" onClick={() => setEditing(i)}>
                        {r.ITENS.slice(0, 3).map((it, j) => <span className="chip na" key={j}>{it.NOME || '—'} {it.VALOR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>)}
                        {r.ITENS.length > 3 && <span className="chip na">+{r.ITENS.length - 3}</span>}
                      </button></td>
                      <td className="ro r"><b>{brl(totalOf(r))}</b></td>
                      <td><button className="icon danger" title="Excluir" onClick={() => confirm('Excluir este lançamento?') && onDelete(i)}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div className="empty">Nenhum lançamento neste filtro. Use “📅 Lançar mês” para registrar.</div>}
            </div>
          </section>
          <div className="pager">
            <button className="sec" disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹ Anterior</button>
            <span className="muted">Página {cur + 1} de {pages}</span>
            <button className="sec" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Próxima ›</button>
          </div>
        </>
      ) : (
        <section className="panel">
          <div className="panel-head"><span className="muted">Conta × mês · clique em uma célula para lançar/editar aquele mês{matrix?.cut && ' · mostrando os últimos 24 meses'}</span></div>
          <div className="wrap">
            <table className="mx">
              <thead><tr><th>Conta</th>{matrix.months.map((k) => <th key={k} className="r">{mesCurto(k)}</th>)}<th className="r">Total</th></tr></thead>
              <tbody>
                {matrix.lines.map((l) => (
                  <tr key={l.t}>
                    <td className="ro mx-name">{l.t}</td>
                    {matrix.months.map((k) => {
                      const v = l.v[k]
                      return <td key={k} className="ro r mx-c" title={v != null ? brl(v) : ''} onClick={() => setLancar(k)}
                        style={v ? { background: `rgba(239,68,68,${Math.min(0.5, (v / l.max) * 0.5)})` } : undefined}>{v != null ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : ''}</td>
                    })}
                    <td className="ro r"><b>{l.tot.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</b></td>
                  </tr>
                ))}
                <tr className="mx-tot"><td className="ro mx-name"><b>Total</b></td>{matrix.months.map((k) => <td key={k} className="ro r"><b>{matrix.colTot[k].toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</b></td>)}<td className="ro r"><b>{matrix.lines.reduce((s, l) => s + l.tot, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</b></td></tr>
              </tbody>
            </table>
            {!matrix.lines.length && <div className="empty">Sem dados neste filtro.</div>}
          </div>
        </section>
      )}

      {lancar && <LancarMes rows={rows} initialYM={lancar} onClose={() => setLancar(null)} onSave={(ym, novas) => { onSaveMonth(ym, novas); setLancar(null) }} />}
      {editing != null && <ItemsModal row={rows[editing]} onClose={() => setEditing(null)} onSave={(itens) => { onUpdate(editing, { ITENS: itens }); setEditing(null) }} />}
    </>
  )
}
