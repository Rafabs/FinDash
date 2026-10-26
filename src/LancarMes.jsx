import { useMemo, useRef, useState } from 'react'
import { monthOf, totalOf, round2 } from './data.js'
import { brl } from './Dashboard.jsx'
import { nowYM } from './period.js'
import MoneyInput from './MoneyInput.jsx'

const keyOf = (r) => r.TIPO_CONTA + '|' + (r.ITENS[0]?.NOME || '')

// Monta as contas do mês: o que já foi lançado + as contas recorrentes dos últimos 3 meses que ainda faltam
function build(rows, ym, nid) {
  const months = [...new Set(rows.map((r) => monthOf(r.DATA)))].sort()
  let ref = months.filter((m) => m < ym).slice(-3).reverse()
  if (!ref.length) ref = months.filter((m) => m !== ym).slice(-3).reverse()
  const tmpl = {} // chave -> linhas modelo (valor mais recente de cada ocorrência)
  ref.forEach((m) => {
    const cnt = {}
    rows.filter((r) => monthOf(r.DATA) === m).forEach((r) => {
      const k = keyOf(r)
      cnt[k] = (cnt[k] || 0) + 1
      const arr = (tmpl[k] ||= [])
      if (arr.length < cnt[k]) arr.push(r)
    })
  })
  const prevItem = (p, nome) => p?.ITENS.find((i) => i.NOME === nome)?.VALOR ?? ''

  const slots = rows.filter((r) => monthOf(r.DATA) === ym).map((r) => {
    const p = tmpl[keyOf(r)]?.shift()
    return { id: nid(), TIPO_CONTA: r.TIPO_CONTA, ITENS: r.ITENS.map((i) => ({ NOME: i.NOME, VALOR: i.VALOR, prev: prevItem(p, i.NOME) })) }
  })
  Object.values(tmpl).flat().forEach((p) =>
    slots.push({ id: nid(), TIPO_CONTA: p.TIPO_CONTA, ITENS: p.ITENS.map((i) => ({ NOME: i.NOME, VALOR: '', prev: i.VALOR })) }))
  return { slots, prevYM: ref[0] }
}

export default function LancarMes({ rows, initialYM, onSave, onClose }) {
  const counter = useRef(0)
  const nid = () => ++counter.current
  const [ym, setYm] = useState(initialYM || nowYM())
  const [state, setState] = useState(() => build(rows, initialYM || nowYM(), nid))
  const { slots, prevYM } = state
  const setSlots = (fn) => setState((s) => ({ ...s, slots: fn(s.slots) }))
  const types = useMemo(() => [...new Set(rows.map((r) => r.TIPO_CONTA))], [rows])

  const changeMonth = (v) => { if (!v) return; setYm(v); setState(build(rows, v, nid)) }
  const upSlot = (id, patch) => setSlots((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const upItem = (id, j, patch) => setSlots((ss) => ss.map((s) => (s.id === id ? { ...s, ITENS: s.ITENS.map((it, k) => (k === j ? { ...it, ...patch } : it)) } : s)))
  const filled = (s) => s.ITENS.some((i) => i.VALOR !== '')
  const slotTotal = (s) => totalOf({ ITENS: s.ITENS.filter((i) => i.VALOR !== '') })
  const total = slots.reduce((t, s) => t + slotTotal(s), 0)
  const nFilled = slots.filter(filled).length

  const copyPrev = () => setSlots((ss) => ss.map((s) => ({ ...s, ITENS: s.ITENS.map((i) => (i.VALOR === '' && i.prev !== '' ? { ...i, VALOR: i.prev } : i)) })))
  const addSlot = () => setSlots((ss) => [...ss, { id: nid(), TIPO_CONTA: '', ITENS: [{ NOME: '', VALOR: '', prev: '' }] }])

  const save = () => {
    const out = slots
      .map((s) => ({
        DATA: ym + '-01', TIPO_CONTA: s.TIPO_CONTA.trim(),
        ITENS: s.ITENS.filter((i) => i.VALOR !== '' && !isNaN(Number(i.VALOR))).map((i) => ({ NOME: String(i.NOME).trim(), VALOR: round2(i.VALOR) })),
      }))
      .filter((r) => r.TIPO_CONTA && r.ITENS.length)
    onSave(ym, out)
  }
  const label = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="lm-head">
          <div>
            <h3>📅 Lançar despesas do mês</h3>
            <small className="muted">
              {prevYM ? `Grupos sugeridos a partir dos últimos meses (até ${prevYM.split('-').reverse().join('/')}). ` : 'Sem meses anteriores para usar de base. '}
              Deixe em branco o que não houve; só o que tiver valor é salvo.
            </small>
          </div>
          <input type="month" value={ym} onChange={(e) => changeMonth(e.target.value)} />
        </div>

        <div className="lm-bar">
          <span><b>{nFilled}</b> de {slots.length} contas preenchidas · <b>{brl(total)}</b> em {label}</span>
          <div className="ph-actions">
            <button className="sec" onClick={copyPrev} disabled={!prevYM}>↩ Copiar últimos valores</button>
            <button className="sec" onClick={addSlot}>+ Grupo</button>
          </div>
        </div>

        <datalist id="dl-contas">{types.map((t) => <option key={t} value={t} />)}</datalist>
        <div className="lm-list">
          {slots.map((s) => (
            <div className={'slot' + (filled(s) ? ' done' : '')} key={s.id}>
              <div className="slot-h">
                <input className="cell slot-name" list="dl-contas" placeholder="Grupo (ex.: Cartão de crédito)" value={s.TIPO_CONTA} onChange={(e) => upSlot(s.id, { TIPO_CONTA: e.target.value })} />
                <b>{brl(slotTotal(s))}</b>
                <button className="icon danger" title="Remover conta" onClick={() => setSlots((ss) => ss.filter((x) => x.id !== s.id))}>🗑</button>
              </div>
              <div className="slot-items">
                {s.ITENS.map((it, j) => (
                  <div className="it" key={j}>
                    <input className="cell" placeholder="Despesa dentro do grupo" value={it.NOME} onChange={(e) => upItem(s.id, j, { NOME: e.target.value })} />
                    <MoneyInput value={it.VALOR} placeholder={it.prev !== '' ? Number(it.prev).toFixed(2) : '0.00'} onChange={(v) => upItem(s.id, j, { VALOR: v })} />
                    {s.ITENS.length > 1 && <button className="icon" title="Remover item" onClick={() => upSlot(s.id, { ITENS: s.ITENS.filter((_, k) => k !== j) })}>✕</button>}
                  </div>
                ))}
                <button className="sec sm" onClick={() => upSlot(s.id, { ITENS: [...s.ITENS, { NOME: '', VALOR: '', prev: '' }] })}>+ Despesa no grupo</button>
              </div>
            </div>
          ))}
          {!slots.length && <div className="empty">Nenhum grupo ainda. Clique em “+ Grupo” para começar.</div>}
        </div>

        <div className="actions">
          <button type="button" className="sec" onClick={onClose}>Cancelar</button>
          <button onClick={save}>Salvar {label}</button>
        </div>
      </div>
    </div>
  )
}
