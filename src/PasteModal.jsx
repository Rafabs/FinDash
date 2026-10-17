import { useEffect, useMemo, useState } from 'react'
import { CATS } from './data.js'
import { FIELDS, parseTable, detect, build, isValid, dupKey } from './paste.js'

const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
const SHOW = 100

export default function PasteModal({ initial, existing, onSave, onClose }) {
  const [raw, setRaw] = useState(initial || '')
  const table = useMemo(() => parseTable(raw), [raw])
  const det = useMemo(() => detect(table), [table])
  const [mapping, setMapping] = useState(det.mapping)
  const [hasHeader, setHasHeader] = useState(det.hasHeader)
  useEffect(() => { setMapping(det.mapping); setHasHeader(det.hasHeader) }, [det])
  const built = useMemo(() => build(table, mapping, hasHeader), [table, mapping, hasHeader])
  const [rows, setRows] = useState(built)
  const [off, setOff] = useState({})
  useEffect(() => { setRows(built); setOff({}) }, [built])

  const known = useMemo(() => new Set(existing.map(dupKey)), [existing])
  const info = rows.map((r) => ({ valid: isValid(r), dup: known.has(dupKey(r)) }))
  const included = (i) => info[i].valid && (off[i] !== undefined ? !off[i] : !info[i].dup)
  const nInc = rows.filter((_, i) => included(i)).length
  const nDup = info.filter((x) => x.valid && x.dup).length
  const nBad = info.filter((x) => !x.valid).length

  const upd = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const ncol = mapping.length

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h3>Colar dados no Extrato</h3>
        <textarea
          autoFocus={!initial} rows={4} value={raw} onChange={(e) => setRaw(e.target.value)}
          placeholder="Copie células do Excel / Google Sheets e cole aqui (Ctrl+V). Ex.: Data · Valor · Origem · Instituição · CNPJ/CPF · Tipo"
        />
        {table.length > 0 && (
          <>
            <div className="mapgrid">
              {Array.from({ length: ncol }, (_, c) => (
                <label key={c}>
                  <span className="muted">Coluna {c + 1}: {(table[hasHeader ? 1 : 0]?.[c] || '').slice(0, 22) || '—'}</span>
                  <select value={mapping[c]} onChange={(e) => setMapping((m) => m.map((x, j) => (j === c ? Number(e.target.value) : x)))}>
                    <option value={-1}>— ignorar —</option>
                    {FIELDS.map(([, l], t) => <option key={t} value={t}>{l}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <label className="chk"><input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> A primeira linha é cabeçalho</label>

            <div className="wrap pv">
              <table>
                <thead><tr><th></th><th>Status</th><th>Data</th><th>Valor</th><th>Categoria</th><th>Origem</th><th>Instituição</th><th>CNPJ / CPF</th><th>Tipo</th></tr></thead>
                <tbody>
                  {rows.slice(0, SHOW).map((r, i) => (
                    <tr key={i} className={info[i].valid ? '' : 'bad'}>
                      <td><input type="checkbox" disabled={!info[i].valid} checked={included(i)} onChange={(e) => setOff((o) => ({ ...o, [i]: !e.target.checked }))} /></td>
                      <td><span className={'chip ' + (!info[i].valid ? 'warn' : info[i].dup ? 'na' : 'ok')}>{!info[i].valid ? 'inválida' : info[i].dup ? 'duplicada' : 'nova'}</span></td>
                      <td><input className="cell" type="date" value={r[D]} onChange={(e) => upd(i, D, e.target.value)} /></td>
                      <td><input className="cell" type="number" step="0.01" value={r[V]} onChange={(e) => upd(i, V, e.target.value === '' ? '' : Number(e.target.value))} /></td>
                      <td><select className="cell" value={r.CATEGORIA} onChange={(e) => upd(i, 'CATEGORIA', e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></td>
                      {['ORIGEM', 'INSTITUIÇÃO', 'CNPJ / CPF', 'TIPO'].map((k) => (
                        <td key={k}><input className="cell" style={{ minWidth: 150 }} value={r[k]} onChange={(e) => upd(i, k, e.target.value)} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              {rows.length} linhas lidas · <b>{nInc}</b> serão adicionadas · {nDup} duplicadas (ignoradas, marque para incluir) · {nBad} inválidas (sem data ou valor)
              {rows.length > SHOW && ` · mostrando as ${SHOW} primeiras (todas serão adicionadas)`}
            </p>
          </>
        )}
        <div className="actions">
          <button type="button" className="sec" onClick={onClose}>Cancelar</button>
          <button disabled={!nInc} onClick={() => onSave(rows.filter((_, i) => included(i)))}>Adicionar {nInc || ''} linha{nInc === 1 ? '' : 's'}</button>
        </div>
      </div>
    </div>
  )
}
