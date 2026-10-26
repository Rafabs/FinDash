import { useEffect, useMemo, useState } from 'react'
import PeriodFilter from './PeriodFilter.jsx'
import LancarMes from './LancarMes.jsx'
import PasteDespesas from './PasteDespesas.jsx'
import { totalOf, monthOf, round2, expenseBreakdown } from './data.js'
import { rangeOf, inRange, labelOf, nowYM } from './period.js'
import { brl } from './Dashboard.jsx'
import MoneyInput from './MoneyInput.jsx'
import { nextSort, sortItems } from './sort.js'
import Pager, { usePageSize } from './Pager.jsx'

const pct = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
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
              <MoneyInput value={it.VALOR} onChange={(v) => up(j, { VALOR: v })} />
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

export default function DespesasView({ rows, period, setPeriod, onUpdate, onDelete, onMoveItem, onSaveMonth, onAddRows }) {
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [view, setView] = useState('lista')
  const [lancar, setLancar] = useState(null)
  const [editing, setEditing] = useState(null)
  const [sort, setSort] = useState(null)
  const [size, setSize] = usePageSize()
  const [mxSort, setMxSort] = useState(null)
  const [pasting, setPasting] = useState(null) // texto colado (abre o modal de colagem)
  const [openRows, setOpenRows] = useState(() => new Set()) // linhas abertas pelo lápis
  const [selected, setSelected] = useState(() => new Set())
  const [locked, setLocked] = useState(true)
  const [dragSource, setDragSource] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [moveMessage, setMoveMessage] = useState('')
  const [heroDetail, setHeroDetail] = useState(null)
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
      .filter(({ r }) => !cats.length || cats.includes(r.TIPO_CONTA))
      .map(({ r, i }) => {
        const groupMatches = !!s && r.TIPO_CONTA.toLowerCase().includes(s)
        const items = r.ITENS
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => !s || groupMatches || String(item.NOME || '').toLowerCase().includes(s))
        return { r, i, items, total: totalOf({ ITENS: items.map(({ item }) => item) }) }
      })
      .filter(({ items }) => items.length > 0)
      .sort((a, b) => b.r.DATA.localeCompare(a.r.DATA) || a.r.TIPO_CONTA.localeCompare(b.r.TIPO_CONTA) || a.i - b.i)
  }, [base, cats, q])

  const sorted = useMemo(() => sortItems(filtered, sort, (x, k) => (k === 'TOTAL' ? x.total : x.r[k]), (k) => (k === 'DATA' ? 'date' : k === 'TOTAL' ? 'money' : 'text')), [filtered, sort])

  const detailRows = useMemo(() => q.trim()
    ? filtered.map(({ r, items }) => ({ ...r, ITENS: items.map(({ item }) => item) }))
    : base.map(({ r }) => r), [base, filtered, q])
  const breakdown = useMemo(() => expenseBreakdown(detailRows), [detailRows])
  const stat = useMemo(() => {
    const summaryRows = q.trim() ? filtered : base
    const meses = new Set(summaryRows.map(({ r }) => monthOf(r.DATA)))
    const cnt = {}
    summaryRows.forEach(({ r }) => { cnt[r.TIPO_CONTA] = (cnt[r.TIPO_CONTA] || 0) + 1 })
    const total = breakdown.reduce((s, group) => s + group.total, 0)
    return { total, nMeses: meses.size, cnt, list: breakdown.map((group) => [group.name, group.total]) }
  }, [base, breakdown, filtered, q])
  const top = breakdown.slice(0, 5)
  const remaining = breakdown.slice(5)
  const resto = remaining.reduce((s, group) => s + group.total, 0)
  const segs = [...top.map((group) => [group.name, group.total]), ...(resto ? [['Demais', resto]] : [])]
  const pos = stat.total
  const detailGroup = heroDetail?.type === 'group' ? breakdown.find((group) => group.name === heroDetail.name) : null

  useEffect(() => setPage(0), [period, cats, q, sort, size])
  const pages = Math.max(1, Math.ceil(sorted.length / size))
  const cur = Math.min(page, pages - 1)
  const slice = sorted.slice(cur * size, cur * size + size)
  const toggleOpen = (g) => setOpenRows((x) => { const n = new Set(x); n.has(g) ? n.delete(g) : n.add(g); return n })
  const del = (g) => { if (!locked) { setOpenRows(new Set()); onDelete(g) } }
  const allSelected = slice.length > 0 && slice.every(({ i }) => selected.has(i))
  const deleteSelected = () => { const ids = [...selected].sort((a, b) => b - a); if (!locked && ids.length && confirm(`Excluir ${ids.length} itens selecionados?`)) { ids.forEach(del); setSelected(new Set()) } }
  const canDropOn = (from, to) => !locked && from != null && from.row !== to &&
    rows[from.row] && rows[from.row].ITENS[from.item] && rows[to] &&
    monthOf(rows[from.row].DATA) === monthOf(rows[to].DATA) &&
    rows[from.row].TIPO_CONTA !== rows[to].TIPO_CONTA
  const dropItem = (to) => {
    if (!canDropOn(dragSource, to)) {
      if (dragSource && dragSource.row !== to) setMoveMessage('Solte em uma conta diferente do mesmo mês.')
      return
    }
    const item = rows[dragSource.row].ITENS[dragSource.item]
    const target = rows[to]
    onMoveItem(dragSource.row, dragSource.item, to)
    setMoveMessage(`“${item.NOME || 'Despesa'}” movida para ${target.TIPO_CONTA}.`)
    setDragSource(null)
    setDragOver(null)
  }
  const toggleLock = () => {
    setLocked((value) => !value)
    setOpenRows(new Set())
    setDragSource(null)
    setDragOver(null)
    setMoveMessage('')
  }
  const th = (k, label, right, cur, set) => (
    <th key={k} className={'sortable' + (right ? ' r' : '') + (cur?.key === k ? ' on' : '')} onClick={() => set((s) => nextSort(s, k))} title="Clique para ordenar">
      {label}<i className="si">{cur?.key === k ? (cur.dir === 'asc' ? '▲' : '▼') : '↕'}</i>
    </th>
  )
  const toggle = (c) => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  // matriz conta x mês (últimos 24 meses do período)
  const matrix = useMemo(() => {
    if (view !== 'matriz') return null
    const all = [...new Set(filtered.map(({ r }) => monthOf(r.DATA)))].sort()
    const months = all.slice(-24)
    const m = {}
    filtered.forEach(({ r, total }) => { const k = monthOf(r.DATA); if (!months.includes(k)) return; (m[r.TIPO_CONTA] ||= {})[k] = (m[r.TIPO_CONTA][k] || 0) + total })
    const lines = Object.entries(m).map(([t, v]) => ({ t, v, tot: Object.values(v).reduce((a, b) => a + b, 0), max: Math.max(...Object.values(v)) })).sort((a, b) => b.tot - a.tot)
    const colTot = Object.fromEntries(months.map((k) => [k, lines.reduce((s, l) => s + (l.v[k] || 0), 0)]))
    return { months, lines, colTot, cut: all.length > 24 }
  }, [filtered, view])

  const nextYM = nowYM()

  // Ctrl+V fora de um campo abre a colagem de despesas
  useEffect(() => {
    if (locked || lancar || editing != null || pasting !== null) return
    const h = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const t = e.clipboardData?.getData('text')
      if (t && t.trim()) { e.preventDefault(); setPasting(t) }
    }
    window.addEventListener('paste', h)
    return () => window.removeEventListener('paste', h)
  }, [locked, lancar, editing, pasting])
  const mxLines = useMemo(() => (matrix ? sortItems(matrix.lines, mxSort, (l, k) => (k === 't' ? l.t : k === 'tot' ? l.tot : l.v[k]), (k) => (k === 't' ? 'text' : 'money')) : []), [matrix, mxSort])

  return (
    <>
      <section className="hero">
        <div className="hero-main">
          <small>{q.trim() ? 'Total encontrado' : 'Despesas no período'}</small>
          <strong>{brl(stat.total)}</strong>
          <div className="pills">
            <span className="pill">{q.trim() ? filtered.length : base.length} lançamentos</span>
            <span className="pill">Média/mês <b>{brl(stat.nMeses ? stat.total / stat.nMeses : 0)}</b></span>
            {stat.list[0] && <span className="pill">Maior: <b>{stat.list[0][0]}</b></span>}
          </div>
          <div className="pills dim"><span>{labelOf(period)} · {stat.nMeses} {stat.nMeses === 1 ? 'mês' : 'meses'} com lançamentos</span></div>
        </div>
        <div className="hero-alloc">
          <small>Por grupo</small>
          <div className="bar">{segs.map(([n, v], i) => <i key={n} className={'c' + i} style={{ width: pos ? (Math.max(v, 0) / pos) * 100 + '%' : 0 }} />)}</div>
          <div className="legend">
            {segs.map(([name, value], i) => (
              <button
                key={name}
                type="button"
                className="hero-legend-item"
                aria-expanded={name === 'Demais' ? heroDetail?.type === 'remaining' : heroDetail?.name === name}
                onClick={() => setHeroDetail((current) => {
                  if (name === 'Demais') return current?.type === 'remaining' ? null : { type: 'remaining' }
                  return current?.name === name ? null : { type: 'group', name }
                })}
              >
                <i className={'dot c' + i} />{name}
                <b>{pos ? pct((value / pos) * 100) : '—'}</b>
                <em>{brl(value)}</em>
              </button>
            ))}
          </div>
          {heroDetail && (
            <div className="hero-breakdown">
              <div className="hero-breakdown-head">
                <b>{detailGroup ? detailGroup.name : 'Demais grupos'}</b>
                <button type="button" className="hero-breakdown-close" onClick={() => setHeroDetail(null)}>Fechar</button>
              </div>
              {heroDetail.type === 'remaining' ? (
                <div className="hero-breakdown-list">
                  {remaining.map((group) => (
                    <button type="button" key={group.name} onClick={() => setHeroDetail({ type: 'group', name: group.name })}>
                      <span>{group.name}</span><b>{pos ? pct((group.total / pos) * 100) : '—'}</b><em>{brl(group.total)}</em>
                    </button>
                  ))}
                  {!remaining.length && <small>Nenhum outro grupo neste período.</small>}
                </div>
              ) : detailGroup ? (
                <div className="hero-breakdown-list">
                  {detailGroup.items.map((item) => (
                    <div key={item.name}>
                      <span>{item.name}</span>
                      <b>{detailGroup.total ? pct((item.total / detailGroup.total) * 100) : '—'}</b>
                      <small>{stat.total ? pct((item.total / stat.total) * 100) : '—'} do total</small>
                      <em>{brl(item.total)}</em>
                    </div>
                  ))}
                  {!detailGroup.items.length && <small>Nenhuma despesa detalhada neste grupo.</small>}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <div className="toolbar">
        <PeriodFilter period={period} onChange={setPeriod} years={years} />
        <input className="search" placeholder="Buscar grupo ou despesa…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          <button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>Lista</button>
          <button className={view === 'matriz' ? 'on' : ''} onClick={() => setView('matriz')}>Matriz mensal</button>
        </div>
        <button className={'sec lock' + (locked ? '' : ' open')} onClick={toggleLock} title={locked ? 'Clique para liberar a edição' : 'Clique para travar a edição'}>{locked ? '🔒 Edição travada' : '🔓 Edição liberada'}</button>
        <button className="sec" disabled={locked} title={locked ? 'Destrave a edição para adicionar despesas' : ''} onClick={() => setPasting('')}>📋 Colar despesas</button>
        <button disabled={locked} title={locked ? 'Destrave a edição para adicionar despesas' : ''} onClick={() => setLancar(nextYM)}>📅 Lançar mês</button>
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
            <div className="panel-head">
              <span className="muted">{filtered.length} lançamento{filtered.length === 1 ? '' : 's'} · cada grupo pode conter várias despesas · {locked ? 'edição travada' : 'arraste uma despesa para outra conta do mesmo mês'}</span>
              <div className="ph-actions">
                {selected.size > 0 && <><span className="muted">{selected.size} selecionados</span><button className="sec danger" disabled={locked} title={locked ? 'Destrave a edição para excluir' : ''} onClick={deleteSelected}>Excluir selecionados</button><button className="sec" onClick={() => setSelected(new Set())}>Limpar seleção</button></>}
              </div>
            </div>
            {moveMessage && <p className="hint move-message">{moveMessage}</p>}
            <div className="wrap">
              <datalist id="dl-contas">{types.map((t) => <option key={t} value={t} />)}</datalist>
              <table className="rt">
                <thead><tr>
                  <th><input aria-label="Selecionar todos os itens visíveis" type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(slice.map(({ i }) => i)))} /></th>
                  {th('DATA', 'Mês', false, sort, setSort)}
                  {th('TIPO_CONTA', 'Grupo', false, sort, setSort)}
                  <th>Despesas do grupo</th>
                  {th('TOTAL', 'Total', true, sort, setSort)}
                  <th></th>
                </tr></thead>
                <tbody>
                  {slice.map(({ r, i, items, total }, n) => {
                    const ed = !locked && openRows.has(i)
                    const chips = (
                      <>
                        {items.map(({ item: it, index: j }) => (
                          <span
                            className={'chip na' + (!locked ? ' draggable-expense' : '')}
                            key={j}
                            draggable={!locked}
                            title={!locked ? `Arraste “${it.NOME || 'Despesa'}” para outra conta do mesmo mês` : undefined}
                            onDragStart={(e) => {
                              if (locked) { e.preventDefault(); return }
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', `${i}:${j}`)
                              setDragSource({ row: i, item: j })
                              setMoveMessage('')
                            }}
                            onDragEnd={() => { setDragSource(null); setDragOver(null) }}
                          >
                            {it.NOME || '—'} {Number(it.VALOR).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ))}
                      </>
                    )
                    return (
                      <tr
                        key={i}
                        className={dragOver === i ? 'expense-drop-target' : ''}
                        onDragOver={(e) => {
                          if (canDropOn(dragSource, i)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(i) }
                        }}
                        onDragLeave={() => { if (dragOver === i) setDragOver(null) }}
                        onDrop={(e) => { e.preventDefault(); dropItem(i) }}
                      >
                        <td className="idx"><input aria-label={`Selecionar lançamento ${cur * size + n + 1}`} type="checkbox" checked={selected.has(i)} onChange={() => setSelected((s) => { const x = new Set(s); x.has(i) ? x.delete(i) : x.add(i); return x })} /></td>
                        <td className={ed ? '' : 'ro'} data-label="Mês">{ed
                          ? <input className="cell" type="month" value={monthOf(r.DATA)} onChange={(e) => e.target.value && onUpdate(i, { DATA: e.target.value + '-01' })} />
                          : monthOf(r.DATA).split('-').reverse().join('/')}</td>
                        <td className={ed ? '' : 'ro'} data-label="Grupo">{ed
                          ? <input className="cell" list="dl-contas" style={{ minWidth: 170 }} value={r.TIPO_CONTA} onChange={(e) => onUpdate(i, { TIPO_CONTA: e.target.value })} />
                          : r.TIPO_CONTA}</td>
                        <td className={ed ? '' : 'ro'} data-label="Despesas do grupo">{ed
                          ? <button className="items-btn" title="Editar despesas do grupo" onClick={() => setEditing(i)}>{chips}</button>
                          : <div className="items-static">{chips}</div>}</td>
                        <td className="ro r" data-label="Total"><b>{brl(total)}</b></td>
                        <td className="acts">
                          <button className={'icon' + (ed ? ' ok' : '')} disabled={locked} title={locked ? 'Destrave a edição para editar' : ed ? 'Concluir edição' : 'Editar'} onClick={() => toggleOpen(i)}>{ed ? '✓' : '✏️'}</button>
                          <button className="icon danger" disabled={locked} title={locked ? 'Destrave a edição para excluir' : 'Excluir'} onClick={() => confirm('Excluir este lançamento?') && del(i)}>🗑</button>
                        </td>
                        
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filtered.length && <div className="empty">Nenhum lançamento neste filtro. Use “📅 Lançar mês” para registrar.</div>}
            </div>
          </section>
      <Pager page={cur} pages={pages} total={sorted.length} size={size} onPage={setPage} onSize={setSize} />
        </>
      ) : (
        <section className="panel">
          <div className="panel-head"><span className="muted">Grupo × mês · clique em uma célula para lançar/editar aquele mês · clique no cabeçalho para ordenar{matrix?.cut && ' · mostrando os últimos 24 meses'}</span></div>
          <div className="wrap">
            <table className="mx">
              <thead><tr>{th('t', 'Grupo', false, mxSort, setMxSort)}{matrix.months.map((k) => th(k, mesCurto(k), true, mxSort, setMxSort))}{th('tot', 'Total', true, mxSort, setMxSort)}</tr></thead>
              <tbody>
                {mxLines.map((l) => (
                  <tr key={l.t}>
                    <td className="ro mx-name">{l.t}</td>
                    {matrix.months.map((k) => {
                      const v = l.v[k]
                      return <td key={k} className="ro r mx-c" title={locked ? 'Destrave a edição para lançar neste mês' : v != null ? brl(v) : ''} onClick={() => !locked && setLancar(k)}
                        style={v ? { background: `rgba(239,68,68,${Math.min(0.32, (v / l.max) * 0.32)})` } : undefined}>{v != null ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                    })}
                    <td className="ro r"><b>{l.tot.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
                  </tr>
                ))}
                <tr className="mx-tot"><td className="ro mx-name"><b>Total</b></td>{matrix.months.map((k) => <td key={k} className="ro r"><b>{matrix.colTot[k].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>)}<td className="ro r"><b>{matrix.lines.reduce((s, l) => s + l.tot, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td></tr>
              </tbody>
            </table>
            {!matrix.lines.length && <div className="empty">Sem dados neste filtro.</div>}
          </div>
        </section>
      )}

      {pasting !== null && <PasteDespesas initial={pasting} rows={rows} onClose={() => setPasting(null)} onSave={(novas) => { onAddRows(novas); setPasting(null) }} />}
      {lancar && <LancarMes rows={rows} initialYM={lancar} onClose={() => setLancar(null)} onSave={(ym, novas) => { onSaveMonth(ym, novas); setLancar(null) }} />}
      {editing != null && <ItemsModal row={rows[editing]} onClose={() => setEditing(null)} onSave={(itens) => { onUpdate(editing, { ITENS: itens }); setEditing(null) }} />}
    </>
  )
}
