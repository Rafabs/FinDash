import { useState } from 'react'
import { round2 } from './data.js'

// Campo de valor em R$: mostra sempre 2 casas quando não está sendo editado
export default function MoneyInput({ value, onChange, placeholder, title }) {
  const [focus, setFocus] = useState(false)
  const hasVal = value !== '' && value != null
  const shown = focus || !hasVal ? (value ?? '') : Number(value).toFixed(2)
  return (
    <div className="money" title={title}>
      <span>R$</span>
      <input
        type="number" step="0.01" value={shown} placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={(e) => { setFocus(false); const v = e.target.value; if (v !== '' && round2(Number(v)) !== Number(v)) onChange(round2(Number(v))) }}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    </div>
  )
}
