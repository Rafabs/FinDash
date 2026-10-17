const fmt = (k, v) => {
  if (v === '' || v == null) return ''
  if (k === 'VAR_PP') return (v * 100).toFixed(2) + '%'
  return typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : v
}

export default function Table({ cols, rows, onEdit, onAdd, onDelete }) {
  return (
    <>
      <button onClick={onAdd} style={{ marginBottom: 8 }}>+ Nova linha</button>
      <div className="wrap">
        <table>
          <thead>
            <tr><th>#</th>{cols.map(([k]) => <th key={k}>{k}</th>)}<th></th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                {cols.map(([k, t]) =>
                  t === 'calc' ? (
                    <td key={k} className="calc">{fmt(k, r[k])}</td>
                  ) : (
                    <td key={k}>
                      <input
                        type={t === 'date' ? 'date' : t === 'num' ? 'number' : 'text'}
                        step="any"
                        value={r[k] ?? ''}
                        onChange={(e) => onEdit(i, k, t === 'num' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
                      />
                    </td>
                  )
                )}
                <td><button className="sec" onClick={() => onDelete(i)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">Sem dados. Importe um arquivo ou adicione uma linha.</div>}
      </div>
    </>
  )
}
