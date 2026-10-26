import { useEffect, useMemo, useState } from 'react'
import MoneyInput from './MoneyInput.jsx'
import { totalOf, monthOf, round2 } from './data.js'
import { nowYM } from './period.js'
import { parseDespesas, norm, EXEMPLO } from './pasteDesp.js'
import { brl } from './Dashboard.jsx'

const SHOW = 100
const FORMATOS = { blocos: 'blocos "rótulo: valor"', tabela: 'tabela', linhas: 'linhas livres' }

// Cola despesas em grupos (blocos, tabela do Excel ou linhas livres), mostra a prévia e adiciona
export default function PasteDespesas({ initial, rows: existing, onSave, onClose }) {
  const types = useMemo(() => [...new Set(existing.map((r) => r.TIPO_CONTA))], [existing])
  const [raw, setRaw] = useState(initial || '')
  const [defYM, setDefYM] = useState(nowYM())
  const parsed = useMemo(() => parseDespesas(raw, types), [raw, types])
  const [recs, setRecs] = useState(parsed.records)
  const [off, setOff] = useState({})
  useEffect(() => { setRecs(parsed.records); setOff({}) }, [parsed])

  const ym = (r) => (r.date ? r.date.slice(0, 7) : defYM)
  const known = useMemo(() => {
    const s = new Set()
    existing.forEach((r) => {
      const m = monthOf(r.DATA), c = norm(r.TIPO_CONTA)
      s.add(`${m}|${c}|${totalOf(r).toFixed(2)}`)
      r.ITENS.forEach((i) => s.add(`${m}|${c}|${Number(i.VALOR).toFixed(2)}`))
    })
    return s
  }, [existing])
  const info = recs.map((r) => ({
    valid: !!r.conta.trim() && typeof r.valor === 'number' && !isNaN(r.valor),
    dup: known.has(`${ym(r)}|${norm(r.conta)}|${Number(r.valor).toFixed(2)}`),
    semData: !r.date,
  }))
  const included = (i) => info[i].valid && (off[i] !== undefined ? !off[i] : !info[i].dup)
  const sel = recs.map((_, i) => i).filter(included)
  const nDup = info.filter((x) => x.valid && x.dup).length
  const nBad = info.filter((x) => !x.valid).length
  const nSemData = recs.filter((r, i) => info[i].valid && !r.date).length
  const total = sel.reduce((s, i) => s + recs[i].valor, 0)
  const nMeses = new Set(sel.map((i) => ym(recs[i]))).size
  const upd = (i, p) => setRecs((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)))

  const save = () => { // junta registros do mesmo mês e conta em uma linha com vários itens
    const map = new Map()
    sel.forEach((i) => {
      const r = recs[i], m = ym(r), conta = r.conta.trim(), k = m + '|' + norm(conta)
      if (!map.has(k)) map.set(k, { DATA: m + '-01', TIPO_CONTA: conta, ITENS: [] })
      map.get(k).ITENS.push({ NOME: (r.desc || conta).trim(), VALOR: round2(r.valor) })
    })
    onSave([...map.values()])
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="lm-head">
          <div>
            <h3>📋 Colar despesas</h3>
            <small className="muted">Cada grupo recebe suas despesas internas. Para colar em blocos, use “grupo” e “despesa dentro do grupo”.</small>
          </div>
          <button className="sec sm" onClick={() => setRaw(EXEMPLO)}>Inserir exemplo</button>
        </div>
        <textarea
          autoFocus={!initial} rows={6} value={raw} onChange={(e) => setRaw(e.target.value)}
          placeholder={'grupo: Cartão de crédito\ndespesa dentro do grupo: Manutenção veicular\nvalor: R$ 1.200,00\npago em: 15/05/2020\n\n— ou uma linha por despesa —\nInternet - R$ 119,90 - 15/05/2020\n\n— ou células copiadas do Excel (grupo · valor · data) —'}
        />

        {recs.length > 0 && (
          <>
            <div className="pd-bar">
              <span>Formato reconhecido: <b>{FORMATOS[parsed.format]}</b></span>
              {nSemData > 0 && (
                <label className="pd-def">Mês dos registros sem data
                  <input type="month" value={defYM} onChange={(e) => e.target.value && setDefYM(e.target.value)} />
                </label>
              )}
            </div>
            <datalist id="dl-contas-p">{types.map((t) => <option key={t} value={t} />)}</datalist>
            <div className="wrap pv">
              <table>
                <thead><tr><th></th><th>Status</th><th>Pago em</th><th>Grupo</th><th>Despesa dentro do grupo</th><th>Valor</th></tr></thead>
                <tbody>
                  {recs.slice(0, SHOW).map((r, i) => (
                    <tr key={i} className={info[i].valid ? '' : 'bad'}>
                      <td><input type="checkbox" disabled={!info[i].valid} checked={included(i)} onChange={(e) => setOff((o) => ({ ...o, [i]: !e.target.checked }))} /></td>
                      <td><span className={'chip ' + (!info[i].valid ? 'warn' : info[i].dup ? 'na' : 'ok')}>{!info[i].valid ? 'incompleta' : info[i].dup ? 'duplicada' : 'nova'}</span></td>
                      <td><input className="cell" type="date" value={r.date} title={r.date ? '' : `Sem data: será lançada em ${defYM.split('-').reverse().join('/')}`} onChange={(e) => upd(i, { date: e.target.value })} /></td>
                      <td><input className="cell" list="dl-contas-p" style={{ minWidth: 150 }} value={r.conta} onChange={(e) => upd(i, { conta: e.target.value })} /></td>
                      <td><input className="cell" style={{ minWidth: 130 }} placeholder="(igual ao grupo)" value={r.desc} onChange={(e) => upd(i, { desc: e.target.value })} /></td>
                      <td><MoneyInput value={r.valor} onChange={(v) => upd(i, { valor: v })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              {recs.length} registro{recs.length === 1 ? '' : 's'} lido{recs.length === 1 ? '' : 's'} · <b>{sel.length}</b> {sel.length === 1 ? 'será adicionado' : 'serão adicionados'}
              {sel.length > 0 && <> ({brl(total)} em {nMeses} {nMeses === 1 ? 'mês' : 'meses'})</>}
              {nDup > 0 && <> · {nDup} duplicada{nDup === 1 ? '' : 's'} (marque para incluir)</>}
              {nBad > 0 && <> · {nBad} incompleta{nBad === 1 ? '' : 's'} (falta grupo ou valor)</>}
              {parsed.ignored.length > 0 && <> · {parsed.ignored.length} linha{parsed.ignored.length === 1 ? '' : 's'} não reconhecida{parsed.ignored.length === 1 ? '' : 's'}</>}
              {recs.length > SHOW && <> · mostrando as {SHOW} primeiras (todas serão adicionadas)</>}
            </p>
          </>
        )}
        {raw.trim() && !recs.length && <p className="hint">Não consegui identificar despesas nesse texto. Use rótulos como “grupo:”, “despesa dentro do grupo:” e “valor:”, ou uma linha por despesa.</p>}

        <div className="actions">
          <button className="sec" onClick={onClose}>Cancelar</button>
          <button disabled={!sel.length} onClick={save}>Adicionar {sel.length || ''} despesa{sel.length === 1 ? '' : 's'}</button>
        </div>
      </div>
    </div>
  )
}
