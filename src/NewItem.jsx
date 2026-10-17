import { useState } from 'react'
import { round2, recalcCart, today } from './data.js'

export default function NewItem({ rows, onSave, onClose }) {
  const [f, setF] = useState({
    TIPO_INV: 'RF', DATA_APLICACAO: today(), ULTIMA_ATUAL: today(), PAPEL: 'N/A', BANCO: '',
    TIPO_PRODUTO: '', PRODUTO: '', QTD_COMPRA: 1, PRC_UNIT: '', VLR_APLICACAO: '', TOTAL_ATUAL: '',
  })
  const rv = f.TIPO_INV === 'RV'
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setTipo = (e) => {
    const v = e.target.value
    setF({ ...f, TIPO_INV: v, PAPEL: v === 'RV' ? (f.PAPEL === 'N/A' ? '' : f.PAPEL) : f.PAPEL || 'N/A' })
  }
  const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))]
  const calc = round2((Number(f.QTD_COMPRA) || 0) * (Number(f.PRC_UNIT) || 0))
  const opt = (v, c) => (v === '' ? c : round2(Number(v)))

  const submit = (e) => {
    e.preventDefault()
    const row = { ...f, QTD_COMPRA: Number(f.QTD_COMPRA), PRC_UNIT: round2(Number(f.PRC_UNIT)) }
    if (rv) { row.TOTAL_ATUAL = calc; row.VLR_APLICACAO = opt(f.VLR_APLICACAO, calc) }
    else { row.VLR_APLICACAO = calc; row.TOTAL_ATUAL = opt(f.TOTAL_ATUAL, calc) }
    onSave(recalcCart(row))
  }

  const txt = (k, label, req) => (
    <label>{label}
      <input list={'dl-' + k} value={f[k]} onChange={set(k)} required={req} />
      <datalist id={'dl-' + k}>{uniq(k).map((v) => <option key={v} value={v} />)}</datalist>
    </label>
  )

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Novo item da carteira</h3>
        <div className="fgrid">
          <label>Tipo<select value={f.TIPO_INV} onChange={setTipo}><option>RF</option><option>RV</option></select></label>
          <label>Data de Aplicação<input type="date" value={f.DATA_APLICACAO} onChange={set('DATA_APLICACAO')} required /></label>
          {txt('PAPEL', 'Papel', rv)}
          {txt('BANCO', 'Banco', true)}
          {txt('TIPO_PRODUTO', 'Categoria', true)}
          {txt('PRODUTO', 'Produto', true)}
          <label>Qtd.<input type="number" step="any" value={f.QTD_COMPRA} onChange={set('QTD_COMPRA')} required /></label>
          <label>Preço Unitário (R$)<input type="number" step="0.01" value={f.PRC_UNIT} onChange={set('PRC_UNIT')} required /></label>
          {rv
            ? <label>Total Aplicado (R$)<input type="number" step="0.01" placeholder={calc || ''} value={f.VLR_APLICACAO} onChange={set('VLR_APLICACAO')} /></label>
            : <label>Valor Hoje (R$)<input type="number" step="0.01" placeholder={calc || ''} value={f.TOTAL_ATUAL} onChange={set('TOTAL_ATUAL')} /></label>}
          <label>Atualizado em<input type="date" value={f.ULTIMA_ATUAL} onChange={set('ULTIMA_ATUAL')} required /></label>
                  </div>
        <p className="hint">
          {rv ? 'RV: o Valor Hoje é calculado (Qtd. × Preço) e o Preço Unitário segue editável.'
              : 'RF: o Total Aplicado é calculado (Qtd. × Preço) e o Valor Hoje segue editável.'}
          {' '}Calculado: <b>R$ {calc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
        </p>
        <div className="actions">
          <button type="button" className="sec" onClick={onClose}>Cancelar</button>
          <button type="submit">Adicionar</button>
        </div>
      </form>
    </div>
  )
}
