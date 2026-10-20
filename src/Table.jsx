import { useMemo } from 'react'
import MoneyInput from './MoneyInput.jsx'

const f2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const brl = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', f2)

function show(k, t, v) {
  if (v === '' || v == null) return '—'
  if (k === 'VAR_PP') return (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '') + Math.abs(v * 100).toLocaleString('pt-BR', f2) + '%'
  if (k === 'REND_BRUTO') return (v > 0 ? '+ ' : v < 0 ? '− ' : '') + brl(Math.abs(v))
  if (k === 'PERIODO') return v + (v === 1 ? ' dia' : ' dias')
  if (t === 'money' || t === 'calcm') return brl(v)
  if (t === 'date') return String(v).split('-').reverse().join('/')
  return typeof v === 'number' ? v.toLocaleString('pt-BR', f2) : v
}

// fillTone: destaca rendimento/variação com fundo verde ou vermelho escuro
// onToggleEdit + rowEditing: linhas só editáveis após clicar no lápis
export default function Table({ cols, rows, onEdit, onAdd, onDelete, addLabel = '+ Nova linha', isLocked, groupFn, sharedKeys = [], offset = 0, info, extra, selects, fillTone, rowEditing, onToggleEdit }) {
  // Agrupa lotes do mesmo papel lado a lado (na posição da 1ª ocorrência)
  const list = useMemo(() => {
    if (!groupFn) return rows.map((r, i) => ({ r, i, first: true, span: 1, shared: false }))
    const groups = new Map()
    rows.forEach((r, i) => { if (groupFn(r)) groups.set(r.PAPEL, [...(groups.get(r.PAPEL) || []), i]) })
    const out = [], done = new Set()
    rows.forEach((r, i) => {
      if (!groupFn(r)) return out.push({ r, i, first: true, span: 1, shared: false })
      if (done.has(r.PAPEL)) return
      done.add(r.PAPEL)
      const ids = groups.get(r.PAPEL)
      ids.forEach((gi, n) => out.push({ r: rows[gi], i: gi, first: n === 0, span: ids.length, shared: true }))
    })
    return out
  }, [rows, groupFn])

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="muted">
          {info ?? `${rows.length} registro${rows.length === 1 ? '' : 's'}`}
          {onToggleEdit ? ' · use o lápis para editar uma linha' : ' · campos com borda são editáveis'}
          {groupFn && ' · lotes do mesmo papel compartilham preço e data'}
        </span>
        <div className="ph-actions">{extra}<button onClick={onAdd}>{addLabel}</button></div>
      </div>
      <div className="wrap">
        <table>
          <thead>
            <tr><th>#</th>{cols.map(([k, , l]) => <th key={k}>{l ?? k}</th>)}<th></th></tr>
          </thead>
          <tbody>
            {list.map((e, n) => {
              const { r, i } = e
              const editing = onToggleEdit ? !!rowEditing?.(i) : true
              return (
                <tr key={i} className={e.shared && e.first ? 'gtop' : ''}>
                  <td className="idx">{offset + n + 1}</td>
                  {cols.map(([k, t, , w]) => {
                    const shared = e.shared && sharedKeys.includes(k)
                    if (shared && !e.first) return null
                    const rs = shared ? e.span : undefined
                    const g = shared ? ' grp' : ''
                    const locked = t === 'calc' || t === 'calcm' || isLocked?.(r, k)
                    const right = t === 'money' || t === 'calcm' || t === 'num'
                    if (locked) {
                      if (k === 'IOF')
                        return <td key={k} className="ro"><span className={'chip ' + (r[k] === 'SIM' ? 'warn' : r[k] === 'NÃO' ? 'ok' : 'na')}>{r[k] || '—'}</span></td>
                      if (k === 'PAPEL' && shared)
                        return <td key={k} rowSpan={rs} className="ro grp"><span className="papel">{r[k]}</span>{e.span > 1 && <small>{e.span} lotes</small>}</td>
                      let cls = 'ro' + (right ? ' r' : '') + g
                      if (k === 'VAR_PP' || k === 'REND_BRUTO') {
                        const tone = r[k] > 0 ? ' pos' : r[k] < 0 ? ' neg' : ''
                        if (fillTone && r[k]) { // estilo formatação condicional: fundo suave, ícone à esquerda, valor à direita
                          const a = Math.abs(r[k])
                          const txt = (r[k] < 0 ? '-' : '') + (k === 'VAR_PP' ? (a * 100).toLocaleString('pt-BR', f2) + '%' : brl(a))
                          return (
                            <td key={k} rowSpan={rs} className={'ro fill' + tone}>
                              <div className="tone"><i className={'ar ' + (r[k] > 0 ? 'up' : 'down')}>{r[k] > 0 ? '▲' : '▼'}</i><span>{txt}</span></div>
                            </td>
                          )
                        }
                        cls += tone
                      }
                      return <td key={k} rowSpan={rs} className={cls} title={t === 'num' ? String(r[k]) : undefined}>{show(k, t, r[k])}</td>
                    }
                    if (!editing) { // linha fechada: só leitura (use o lápis)
                      const tone = t === 'money' ? (r[k] > 0 ? ' pos' : r[k] < 0 ? ' neg' : '') : ''
                      return <td key={k} className={'ro' + (right ? ' r' : '') + tone}>{show(k, t, r[k])}</td>
                    }
                    const title = shared && e.span > 1 ? `Altera todos os lotes de ${r.PAPEL}` : undefined
                    if (t === 'money')
                      return (
                        <td key={k} rowSpan={rs} className={g.trim()}>
                          <MoneyInput title={title} value={r[k]} onChange={(v) => onEdit(i, k, v)} />
                        </td>
                      )
                    if (t === 'select')
                      return (
                        <td key={k} rowSpan={rs}>
                          <select className="cell" value={r[k] ?? ''} onChange={(ev) => onEdit(i, k, ev.target.value)}>
                            {!(selects?.[k] || []).includes(r[k]) && <option value={r[k] ?? ''}>{r[k] || '—'}</option>}
                            {(selects?.[k] || []).map((o) => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                      )
                    return (
                      <td key={k} rowSpan={rs} className={g.trim()}>
                        <input
                          className="cell" title={title} style={w ? { minWidth: w } : undefined}
                          type={t === 'date' ? 'date' : t === 'num' ? 'number' : 'text'}
                          step="any" value={r[k] ?? ''}
                          onChange={(ev) => onEdit(i, k, t === 'num' && ev.target.value !== '' ? Number(ev.target.value) : ev.target.value)}
                        />
                      </td>
                    )
                  })}
                  <td className="acts">
                    {onToggleEdit && <button className={'icon' + (editing ? ' ok' : '')} title={editing ? 'Concluir edição' : 'Editar'} onClick={() => onToggleEdit(i)}>{editing ? '✓' : '✏️'}</button>}
                    <button className="icon danger" title="Excluir linha" onClick={() => confirm('Excluir esta linha?') && onDelete(i)}>🗑</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!rows.length && <div className="empty">Sem dados. Importe um arquivo ou adicione um item.</div>}
      </div>
    </section>
  )
}
