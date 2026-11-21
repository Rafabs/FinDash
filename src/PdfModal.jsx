import { useMemo, useState } from 'react'
import { brl } from './Dashboard.jsx'
import { nowYM } from './period.js'
import { scopeOptions, scopeRows, scopeSummary } from './pdfScope.js'

// Escolha do que exportar: relatório completo ou só uma conta/categoria de despesas
export default function PdfModal({ despesas, periodLabel, onClose, onExport }) {
  const opts = useMemo(() => scopeOptions(despesas), [despesas])
  const [mode, setMode] = useState('full')
  const [pick, setPick] = useState('') // 'grupo:NOME' ou 'categoria:NOME'
  const hasScopes = opts.groups.length > 0
  const cut = pick.indexOf(':')
  const scope = mode === 'one' && cut > 0 ? { kind: pick.slice(0, cut), name: pick.slice(cut + 1) } : null
  const sum = useMemo(() => (scope ? scopeSummary(scopeRows(despesas, scope), nowYM()) : null), [despesas, pick, mode])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pdf-modal" role="dialog" aria-modal="true" aria-label="Exportar PDF" onClick={(e) => e.stopPropagation()}>
        <h3>📄 Exportar PDF</h3>
        <p className="muted pdf-period">Período: {periodLabel}</p>

        <label className="pdf-opt">
          <input type="radio" name="pdf-mode" checked={mode === 'full'} onChange={() => setMode('full')} />
          <span><b>Relatório completo</b><small>Carteira, extrato, despesas, resgates, gráficos e projeção</small></span>
        </label>
        <label className={`pdf-opt${hasScopes ? '' : ' off'}`}>
          <input type="radio" name="pdf-mode" disabled={!hasScopes} checked={mode === 'one'} onChange={() => setMode('one')} />
          <span><b>Somente uma conta ou categoria de despesas</b><small>{hasScopes ? 'Ex.: Cartão de crédito, Internet e afins' : 'Sem despesas no período escolhido'}</small></span>
        </label>

        {mode === 'one' && (
          <select className="cell" aria-label="Conta ou categoria" value={pick} onChange={(e) => setPick(e.target.value)} autoFocus>
            <option value="">Escolha…</option>
            <optgroup label="Contas / grupos">
              {opts.groups.map((g) => <option key={g.name} value={`grupo:${g.name}`}>{g.label}</option>)}
            </optgroup>
            {opts.cats.length > 0 && (
              <optgroup label="Categorias dos itens">
                {opts.cats.map((c) => <option key={c} value={`categoria:${c}`}>{c}</option>)}
              </optgroup>
            )}
          </select>
        )}

        {sum && (
          <div className="pdf-sum">
            <span>{sum.count} lançamento{sum.count === 1 ? '' : 's'}</span>
            <span>Previsto <b>{brl(sum.previsto)}</b></span>
            <span>Pago <b>{brl(sum.pago)}</b></span>
            <span>A pagar <b>{brl(sum.pendente)}</b></span>
          </div>
        )}

        <div className="actions">
          <button type="button" className="sec" onClick={onClose}>Cancelar</button>
          <button type="button" disabled={mode === 'one' && !scope} onClick={() => onExport(scope)}>Exportar PDF</button>
        </div>
      </div>
    </div>
  )
}
