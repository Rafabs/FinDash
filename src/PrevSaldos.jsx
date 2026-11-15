import { useMemo, useState } from 'react'
import { previdenciaFunds, today } from './data.js'

const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const round6 = (v) => Math.round((Number(v) || 0) * 1e6) / 1e6

// Atualiza o saldo de cada fundo de previdência de uma vez: o app ajusta a cota de todos os aportes do fundo
// (preço = saldo ÷ total de cotas), então o Valor Hoje de cada lote e o rendimento se recalculam sozinhos.
export default function PrevSaldos({ rows, onApply, onClose }) {
  const funds = useMemo(() => previdenciaFunds(rows), [rows])
  const [date, setDate] = useState(today())
  const [saldos, setSaldos] = useState({})
  const num = (k) => { const v = saldos[k]; return v === undefined || v === '' ? null : Number(v) }
  const changed = funds.filter((x) => { const v = num(x.PAPEL); return v !== null && v >= 0 && x.qtd > 0 && Math.abs(v - x.saldo) >= 0.005 })
  const totAtual = funds.reduce((t, x) => t + x.saldo, 0)
  const totNovo = funds.reduce((t, x) => { const v = num(x.PAPEL); return t + (v !== null && v >= 0 ? v : x.saldo) }, 0)
  const save = () => {
    const updates = {}
    changed.forEach((x) => { updates[x.PAPEL] = round6(num(x.PAPEL) / x.qtd) })
    onApply(updates, date)
    onClose()
  }
  return <div className="overlay" onClick={onClose}><div className="modal wide prev-modal" role="dialog" aria-modal="true" aria-label="Atualizar saldo da previdência" onClick={(e) => e.stopPropagation()}>
    <h3>🛡️ Atualizar saldo da previdência</h3>
    <p className="muted">Informe o saldo atual de cada fundo, como aparece no extrato do plano. O app ajusta a cota de todos os aportes do fundo para bater com o saldo, e o valor de cada aporte e o rendimento se recalculam.</p>
    {!funds.length ? <p className="proj-warn">Nenhum fundo de previdência na Carteira ainda. Use <b>＋ Novo item</b> e escolha <b>🛡️ Aporte de previdência</b>.</p> : <>
      <label className="prev-date">Atualizado em<input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
      <div className="wrap"><table className="rt prev-table">
        <thead><tr><th>Fundo</th><th>Aportado</th><th>Cotas</th><th>Saldo atual</th><th>Novo saldo (R$)</th><th>Diferença</th></tr></thead>
        <tbody>{funds.map((x) => {
          const v = num(x.PAPEL), diff = v !== null ? v - x.saldo : 0
          return <tr key={x.PAPEL}>
            <td className="ro"><b>{x.PAPEL}</b><br /><small className="muted">{x.BANCO} · {x.TIPO_PRODUTO} · {x.lots.length} {x.lots.length === 1 ? 'aporte' : 'aportes'}</small></td>
            <td className="ro">{brl(x.aplicado)}</td>
            <td className="ro">{x.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</td>
            <td className="ro">{brl(x.saldo)}</td>
            <td className="ro"><input className="cell" type="number" step="0.01" min="0" placeholder={x.saldo.toFixed(2)} value={saldos[x.PAPEL] ?? ''} onChange={(e) => setSaldos({ ...saldos, [x.PAPEL]: e.target.value })} /></td>
            <td className="ro" style={{ color: diff < 0 ? 'var(--neg)' : diff > 0 ? 'var(--pos)' : undefined }}>{v !== null ? `${diff > 0 ? '+' : ''}${brl(diff)}` : '—'}</td>
          </tr>
        })}</tbody>
        <tfoot><tr><td className="ro"><b>Total</b></td><td className="ro">{brl(funds.reduce((t, x) => t + x.aplicado, 0))}</td><td className="ro"></td><td className="ro"><b>{brl(totAtual)}</b></td><td className="ro"><b>{brl(totNovo)}</b></td><td className="ro">{brl(totNovo - totAtual)}</td></tr></tfoot>
      </table></div>
      <p className="hint">{changed.length ? <>{changed.length} {changed.length === 1 ? 'fundo será atualizado' : 'fundos serão atualizados'}.</> : 'Preencha o novo saldo dos fundos que mudaram; os campos vazios ficam como estão.'}</p>
    </>}
    <div className="actions"><button type="button" className="sec" onClick={onClose}>Cancelar</button><button type="button" disabled={!changed.length} onClick={save}>Atualizar saldos</button></div>
  </div></div>
}
