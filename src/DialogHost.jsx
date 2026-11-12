import { useEffect, useRef, useState } from 'react'
import { registerDialogHost } from './dialog.js'

// Desenha, uma por vez, as janelas pedidas por confirmDialog() e alertDialog().
// Esc cancela, Enter confirma; clicar fora cancela (em avisos, apenas fecha).
export default function DialogHost() {
  const [queue, setQueue] = useState([])
  const okRef = useRef(null), cancelRef = useRef(null)
  useEffect(() => registerDialogHost((d) => setQueue((q) => [...q, d])), [])
  const cur = queue[0]
  useEffect(() => {
    if (!cur) return undefined
    const finish = (value) => { cur.resolve(value); setQueue((q) => q.slice(1)) }
    ;(cur.danger && cur.kind === 'confirm' ? cancelRef : okRef).current?.focus() // em ações perigosas, o foco começa em Cancelar
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); finish(cur.kind === 'alert') } }
    window.addEventListener('keydown', onKey)
    cur.finish = finish
    return () => window.removeEventListener('keydown', onKey)
  }, [cur])
  if (!cur) return null
  const isConfirm = cur.kind === 'confirm'
  const icon = cur.icon || (cur.danger ? '⚠️' : isConfirm ? '❓' : 'ℹ️')
  const lines = String(cur.message || '').split('\n').filter(Boolean)
  const close = (value) => cur.finish(value)
  return <div className="overlay dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(!isConfirm) }}>
    <div className={`modal dialog${cur.danger ? ' danger' : ''}`} role={isConfirm ? 'dialog' : 'alertdialog'} aria-modal="true" aria-label={cur.title || (isConfirm ? 'Confirmar' : 'Aviso')}>
      <div className="dialog-head"><span className="dialog-ic" aria-hidden="true">{icon}</span><h3>{cur.title || (isConfirm ? 'Confirmar' : 'Aviso')}</h3></div>
      <div className="dialog-body">{lines.map((t, i) => <p key={i}>{t}</p>)}</div>
      {cur.detail && <p className="muted dialog-detail">{cur.detail}</p>}
      <div className="actions">
        {isConfirm && <button type="button" className="sec" ref={cancelRef} onClick={() => close(false)}>{cur.cancelLabel || 'Cancelar'}</button>}
        <button type="button" className={cur.danger ? 'danger' : ''} ref={okRef} onClick={() => close(true)}>{cur.confirmLabel || (isConfirm ? 'Confirmar' : 'OK')}</button>
      </div>
    </div>
  </div>
}
