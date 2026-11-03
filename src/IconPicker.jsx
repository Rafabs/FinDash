import { useState } from 'react'
import AccountMark from './AccountMark.jsx'
import { ICONS, ICON_PREFIX, NO_ICON, COLOR_PRESETS, DEFAULT_COLOR } from './icons.js'

// Janela para escolher o ícone genérico e a cor de fundo da conta. onChange recebe { logo } ou { color }.
export default function IconPicker({ logo, color, name, icon, onChange, onClose }) {
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const list = ICONS.filter((i) => !s || [i.nome, ...i.apelidos].some((x) => x.toLowerCase().includes(s)))
  const current = color || DEFAULT_COLOR
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
    <h3>🎨 Ícone e cor da conta</h3>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span className="icon-preview"><AccountMark logo={logo} icon={icon} color={color} name={name} /></span>
      <div className="icon-colors">
        {COLOR_PRESETS.map((c) => <button key={c} type="button" className={`icon-swatch${c.toLowerCase() === current.toLowerCase() ? ' on' : ''}`} style={{ background: c }} title={c} aria-label={`Cor ${c}`} onClick={() => onChange({ color: c })} />)}
        <label className="icon-swatch icon-custom" title="Outra cor">＋<input type="color" aria-label="Escolher outra cor" value={/^#[\da-f]{6}$/i.test(current) ? current : DEFAULT_COLOR} onChange={(e) => onChange({ color: e.target.value })} /></label>
      </div>
    </div>
    <input className="cell" autoFocus placeholder="Buscar ícone… (ex.: casa, internet, carro)" value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="icon-grid">
      {list.map((i) => <button key={i.id} type="button" className="sec" title={i.nome} onClick={() => onChange({ logo: ICON_PREFIX + i.id })}>
        <span className="icon-preview small"><AccountMark logo={ICON_PREFIX + i.id} color={color} /></span><small>{i.nome}</small>
      </button>)}
      {!list.length && <p className="muted">Nenhum ícone encontrado.</p>}
    </div>
    <div className="actions"><button className="sec" onClick={() => onChange({ logo: NO_ICON })}>Usar emoji</button><button className="sec" onClick={() => onChange({ color: '' })}>Cor padrão</button><button onClick={onClose}>Concluir</button></div>
  </div></div>
}
