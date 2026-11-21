import { useState } from 'react'
import { TAB_LABEL, DEFAULTS, ACCENTS, GRADIENTS, PATTERNS, readImage } from './prefs.js'
import { alertDialog } from './dialog.js'

export default function Personalizar({ prefs, onPreview, onSave, onClose }) {
  const [p, setP] = useState(prefs)
  const set = (patch) => { const n = { ...p, ...patch }; setP(n); onPreview(n) }
  const wp = (patch) => set({ wallpaper: { ...p.wallpaper, ...patch } })
  const toggle = (id) => { const h = p.tabs.hidden; set({ tabs: { ...p.tabs, hidden: h.includes(id) ? h.filter((x) => x !== id) : [...h, id] } }) }
  const move = (id, d) => {
    const o = [...p.tabs.order], i = o.indexOf(id), j = i + d
    if (j < 0 || j >= o.length) return
    ;[o[i], o[j]] = [o[j], o[i]]
    set({ tabs: { ...p.tabs, order: o } })
  }
  const pick = async (f) => {
    if (!f) return
    if (!f.type.startsWith('image/') || f.size > 10e6) return alertDialog({ title: 'Papel de parede', icon: '⚠️', message: 'Use uma imagem de até 10 MB.' })
    try { wp({ type: 'image', value: await readImage(f) }) } catch { alertDialog({ title: 'Papel de parede', icon: '⚠️', message: 'Não foi possível ler a imagem.' }) }
  }
  const cls = (on) => (on ? '' : 'sec')

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal prefs" role="dialog" aria-label="Personalizar" onClick={(e) => e.stopPropagation()}>
        <h3>🎨 Personalizar</h3>

        <h4>Tema</h4>
        <div className="prefs-row">
          {[['light', '☀️ Claro'], ['dark', '🌙 Escuro']].map(([t, l]) => <button key={t} className={cls(p.theme === t)} onClick={() => set({ theme: t })}>{l}</button>)}
        </div>

        <h4>Cor de destaque</h4>
        <div className="prefs-row">
          <button className={cls(!p.accent)} onClick={() => set({ accent: '' })}>Padrão</button>
          {ACCENTS.map((c) => <button key={c} className="prefs-dot" style={{ background: c }} aria-label={c} aria-pressed={p.accent === c} onClick={() => set({ accent: c })} />)}
          <input type="color" aria-label="Cor personalizada" value={p.accent || '#00a99d'} onChange={(e) => set({ accent: e.target.value })} />
        </div>

        <h4>Densidade</h4>
        <div className="prefs-row">
          {[['normal', 'Normal'], ['compact', 'Compacta']].map(([d, l]) => <button key={d} className={cls(p.density === d)} onClick={() => set({ density: d })}>{l}</button>)}
        </div>

        <h4>Papel de parede</h4>
        <div className="prefs-row">
          <button className={cls(p.wallpaper.type === 'none')} onClick={() => wp({ type: 'none', value: '' })}>Nenhum</button>
          {GRADIENTS.map((g) => <button key={g} className="prefs-dot" style={{ background: g }} aria-label="Gradiente" aria-pressed={p.wallpaper.value === g} onClick={() => wp({ type: 'gradient', value: g })} />)}
          <input type="color" aria-label="Cor sólida" onChange={(e) => wp({ type: 'color', value: e.target.value })} />
          <label className="prefs-file">🖼️ Imagem<input type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }} /></label>
        </div>
        <div className="prefs-pats">
          {PATTERNS.map((x) => (
            <button key={x.id} className="prefs-pat" style={{ background: x.css }} aria-pressed={p.wallpaper.type === 'pattern' && p.wallpaper.value === x.id} onClick={() => wp({ type: 'pattern', value: x.id, dim: 0 })}><span>{x.name}</span></button>
          ))}
        </div>
        {p.wallpaper.type !== 'none' && (
          <label className="prefs-range">Contraste {Math.round(p.wallpaper.dim * 100)}%
            <input type="range" min="0" max="0.9" step="0.05" value={p.wallpaper.dim} onChange={(e) => wp({ dim: +e.target.value })} />
          </label>
        )}

        <h4>Abas</h4>
        <ul className="prefs-tabs">
          {p.tabs.order.map((id, i) => (
            <li key={id}>
              <label><input type="checkbox" checked={!p.tabs.hidden.includes(id)} disabled={id === 'dash'} onChange={() => toggle(id)} /> {TAB_LABEL[id]}</label>
              <span>
                <button className="icon sm" aria-label="Subir" disabled={!i} onClick={() => move(id, -1)}>↑</button>{' '}
                <button className="icon sm" aria-label="Descer" disabled={i === p.tabs.order.length - 1} onClick={() => move(id, 1)}>↓</button>
              </span>
            </li>
          ))}
        </ul>

        <p className="muted prefs-note">As preferências são salvas no XLSX (aba “Preferências”) e restauradas ao importar.</p>
        <div className="actions">
          <button className="sec" onClick={() => { const n = { ...DEFAULTS, theme: p.theme }; setP(n); onPreview(n) }}>Restaurar padrão</button>
          <button className="sec" onClick={onClose}>Cancelar</button>
          <button onClick={() => onSave(p)}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
