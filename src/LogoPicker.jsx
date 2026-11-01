import { useState } from 'react'
import { LOGO_PREFIX } from './logos.js'

// Janela para escolher um logo do banco (com busca). onPick recebe "banco:<id>" ou '' para remover.
export default function LogoPicker({ bank, onPick, onClose }) {
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const list = bank.logos.filter((l) => !s || [l.nome, ...l.apelidos].some((x) => String(x).toLowerCase().includes(s)))
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
    <h3>🖼️ Banco de logos</h3>
    <input className="cell" autoFocus placeholder="Buscar logo…" value={q} onChange={(e) => setQ(e.target.value)} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8, margin: '12px 0', maxHeight: '50vh', overflowY: 'auto' }}>
      {list.map((l) => <button key={l.id} type="button" className="sec" title={l.nome} onClick={() => onPick(LOGO_PREFIX + l.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 8 }}>
        <img src={l.src} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} /><small style={{ textAlign: 'center', overflowWrap: 'anywhere' }}>{l.nome}</small>
      </button>)}
      {!list.length && <p className="muted">{bank.logos.length ? 'Nenhum logo encontrado.' : 'Banco de logos indisponível (sem internet?). Você ainda pode enviar uma imagem sua.'}</p>}
    </div>
    <div className="actions"><button className="sec" onClick={() => onPick('')}>Remover logo</button><button className="sec" onClick={onClose}>Fechar</button></div>
  </div></div>
}
