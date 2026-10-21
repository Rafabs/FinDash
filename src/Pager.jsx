import { useState } from 'react'

export const SIZES = [20, 30, 40, 50, 100, 200]
const KEY = 'fynn-pagesize'

// quantidade de linhas por página (padrão 40), lembrada entre as abas e sessões
export function usePageSize() {
  const [size, setS] = useState(() => {
    try { const v = Number(localStorage.getItem(KEY)); return SIZES.includes(v) ? v : 40 } catch { return 40 }
  })
  const setSize = (v) => { setS(v); try { localStorage.setItem(KEY, String(v)) } catch {} }
  return [size, setSize]
}

export default function Pager({ page, pages, total, size, onPage, onSize }) {
  const from = total ? page * size + 1 : 0
  const to = Math.min(total, (page + 1) * size)
  return (
    <div className="pager">
      <span className="muted pg-info">{from}–{to} de {total}</span>
      <div className="pg-nav">
        <button className="sec" disabled={page === 0} onClick={() => onPage(page - 1)}>‹ Anterior</button>
        <span className="muted">Página {page + 1} de {pages}</span>
        <button className="sec" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Próxima ›</button>
      </div>
      <label className="pg-size">
        <span className="muted">Itens por página</span>
        <select value={size} onChange={(e) => onSize(Number(e.target.value))}>
          {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    </div>
  )
}
