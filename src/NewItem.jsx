import { useMemo, useState } from 'react'
import { round2, recalcCart, today, groupable, isPrevidencia, previdenciaFunds, PREV_CATS } from './data.js'

const round6 = (v) => Math.round((Number(v) || 0) * 1e6) / 1e6
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function NewItem({ rows, onSave, onClose }) {
  const [f, setF] = useState({
    TIPO_INV: 'RF', DATA_APLICACAO: today(), ULTIMA_ATUAL: today(), PAPEL: 'N/A', BANCO: '',
    TIPO_PRODUTO: '', PRODUTO: '', QTD_COMPRA: 1, PRC_UNIT: '', VLR_APLICACAO: '', TOTAL_ATUAL: '',
  })
  const [mode, setMode] = useState('invest') // 'invest' | 'aporte' (previdência privada: PGBL/VGBL)
  const [ap, setAp] = useState({ fundo: '', data: today(), valor: '', cota: '' })
  const rv = f.TIPO_INV === 'RV'
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setTipo = (e) => {
    const v = e.target.value
    setF({ ...f, TIPO_INV: v, PAPEL: v === 'RV' ? (f.PAPEL === 'N/A' ? '' : f.PAPEL) : f.PAPEL || 'N/A' })
  }
  const uniq = (k) => [...new Set([...(k === 'TIPO_PRODUTO' ? PREV_CATS : []), ...rows.map((r) => r[k]).filter(Boolean)])]
  const setAporte = (k) => (e) => setAp({ ...ap, [k]: e.target.value })
  const goAporte = () => { setMode('aporte'); setF((x) => ({ ...x, TIPO_INV: 'RV', PAPEL: x.PAPEL === 'N/A' ? '' : x.PAPEL, TIPO_PRODUTO: isPrevidencia(x) && x.TIPO_PRODUTO ? x.TIPO_PRODUTO : 'PGBL', PRODUTO: x.PRODUTO || 'PREVIDÊNCIA PRIVADA' })) }

  // fundos de previdência já lançados (renda variável com papel = nome do fundo): cada aporte novo vira mais um lote do mesmo fundo
  const funds = useMemo(() => previdenciaFunds(rows), [rows])
  const prevCats = [...new Set([...PREV_CATS, ...rows.filter(isPrevidencia).map((r) => r.TIPO_PRODUTO).filter(Boolean)])]
  const fund = funds.find((x) => x.PAPEL === ap.fundo)
  const base = fund || { PAPEL: f.PAPEL, BANCO: f.BANCO, TIPO_PRODUTO: f.TIPO_PRODUTO, PRODUTO: f.PRODUTO }
  const aporte = Number(ap.valor) || 0, cotaInformada = Number(ap.cota) || 0
  // cota usada: a atual do fundo; fundo novo usa a cota informada ou uma cota virtual de R$ 1,00 (cada R$ aportado = 1 unidade)
  const prc = fund ? fund.price : cotaInformada > 0 ? cotaInformada : 1
  const cotas = prc > 0 ? round6(aporte / prc) : 0
  const hojeAporte = round2(cotas * prc)
  const calc = round2((Number(f.QTD_COMPRA) || 0) * (Number(f.PRC_UNIT) || 0))
  const opt = (v, c) => (v === '' ? c : round2(Number(v)))

  const submitAporte = (e) => {
    e.preventDefault()
    if (!(prc > 0) || !(aporte > 0)) return
    const row = {
      DATA_APLICACAO: ap.data, ULTIMA_ATUAL: fund ? fund.date : ap.data,
      PAPEL: String(base.PAPEL).trim(), BANCO: String(base.BANCO).trim(), TIPO_PRODUTO: String(base.TIPO_PRODUTO).trim(), PRODUTO: String(base.PRODUTO).trim(),
      TIPO_INV: 'RV', QTD_COMPRA: cotas, PRC_UNIT: round6(prc), VLR_APLICACAO: round2(aporte), TOTAL_ATUAL: hojeAporte,
    }
    onSave(recalcCart(row)) // o App mantém o preço e a data dos outros aportes do mesmo fundo (mesma cota)
  }

  const submit = (e) => {
    if (mode === 'aporte') return submitAporte(e)
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
        <div className="seg nd-mode" role="tablist" aria-label="Tipo de lançamento">
          <button type="button" className={mode === 'invest' ? 'on' : ''} onClick={() => setMode('invest')}>Investimento</button>
          <button type="button" className={mode === 'aporte' ? 'on' : ''} onClick={goAporte}>🛡️ Aporte de previdência</button>
        </div>
        {mode === 'aporte' ? <>
          <p className="muted nd-help">Previdência privada: cada fundo é um papel e cada aporte mensal vira um item do mesmo fundo, em cotas. O app usa a cota atual do fundo; para atualizar o saldo de todos os fundos de uma vez, use <b>🛡️ Atualizar saldo da previdência</b> na aba Carteira.</p>
          <div className="fgrid">
            <label>Fundo<select value={ap.fundo} onChange={setAporte('fundo')}><option value="">＋ Novo fundo</option>{funds.map((x) => <option key={x.PAPEL} value={x.PAPEL}>{x.PAPEL} · {x.BANCO}</option>)}</select></label>
            {!fund && <>
              {txt('PAPEL', 'Nome do fundo', true)}
              {txt('BANCO', 'Banco / instituição', true)}
              <label>Categoria<select value={f.TIPO_PRODUTO} onChange={set('TIPO_PRODUTO')}>{prevCats.map((c) => <option key={c}>{c}</option>)}</select></label>
              {txt('PRODUTO', 'Produto', true)}
              <label>Valor da cota (opcional)<input type="number" step="any" min="0" placeholder="1,00 (cota virtual)" value={ap.cota} onChange={setAporte('cota')} /></label>
            </>}
            <label>Data do aporte<input type="date" value={ap.data} onChange={setAporte('data')} required /></label>
            <label>Valor do aporte (R$)<input type="number" step="0.01" min="0.01" value={ap.valor} onChange={setAporte('valor')} required /></label>
          </div>
          <p className="hint">
            Cotas compradas: <b>{cotas.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</b> · cota usada: <b>{prc.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}</b> {fund ? '(cota atual do fundo)' : cotaInformada > 0 ? '(informada)' : '(virtual: cada R$ aportado = 1 cota)'} · Valor hoje deste aporte: <b>{brl(hojeAporte)}</b>
            {fund && <> · saldo do fundo depois: <b>{brl(fund.saldo + hojeAporte)}</b></>}
          </p>
        </> : <>
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
        {isPrevidencia(f) && <p className="hint">🛡️ Para aportes mensais de PGBL/VGBL, use o modo <button type="button" className="sec sm" onClick={goAporte}>Aporte de previdência</button>: ele calcula as cotas e atualiza o plano todo.</p>}
        </>}
        <div className="actions">
          <button type="button" className="sec" onClick={onClose}>Cancelar</button>
          <button type="submit">Adicionar</button>
        </div>
      </form>
    </div>
  )
}
