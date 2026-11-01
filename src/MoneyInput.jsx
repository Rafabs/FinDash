import { useRef, useState } from 'react'
import { round2 } from './data.js'

// Campo de valor em R$: mostra sempre 2 casas quando não está sendo editado.
// Aceita valores negativos (digite "-" ou use o botão ±, útil no celular).
export default function MoneyInput({ value, onChange, placeholder, title, disabled = false }) {
  const [draft, setDraft] = useState(null) // texto em edição (null = fora de edição)
  const ref = useRef(null)
  const hasVal = value !== '' && value != null
  const shown = draft ?? (hasVal ? Number(value).toFixed(2) : '')
  const commit = (txt) => {
    const n = Number(txt.replace(',', '.'))
    onChange(txt === '' || txt === '-' || isNaN(n) ? '' : n)
  }
  const flip = () => {
    if (disabled) return
    if (draft === null) {
      if (hasVal) onChange(round2(-Number(value)))
      else { setDraft('-'); ref.current?.focus() }
      return
    }
    const t = draft.startsWith('-') ? draft.slice(1) : '-' + draft
    setDraft(t); commit(t)
  }
  return (
    <div className="money" title={title}>
      <span>R$</span>
      <input
        ref={ref} type="text" inputMode="decimal" value={shown} placeholder={placeholder} disabled={disabled}
        onFocus={() => setDraft((d) => d ?? (hasVal ? String(value) : ''))}
        onBlur={() => {
          const n = Number((draft ?? '').replace(',', '.'))
          if (draft && draft !== '-' && !isNaN(n)) onChange(round2(n)); else if (draft !== null) onChange('')
          setDraft(null)
        }}
        onChange={(e) => {
          const t = e.target.value
          if (!/^-?\d*[.,]?\d*$/.test(t)) return
          setDraft(t); commit(t)
        }}
      />
      <button type="button" className="sec sm" disabled={disabled} tabIndex={-1} title="Alternar positivo/negativo (abate do total)" onMouseDown={(e) => e.preventDefault()} onClick={flip}>±</button>
    </div>
  )
}
