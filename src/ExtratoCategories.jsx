import { useMemo, useState } from 'react'
import { CATS } from './data.js'
import { confirmDialog } from './dialog.js'

const V = 'VALOR DA APLICAÇÃO'
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Gerenciar categorias do Extrato: renomear (ou mesclar) e excluir as categorias criadas por você.
// As categorias padrão ficam protegidas: o app usa algumas delas nos cálculos (ex.: Venda de Patrimônio no saldo).
export default function ExtratoCategories({ rows, categories, onRename, onDelete, onClose }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [moveTo, setMoveTo] = useState('Outros')
  const [error, setError] = useState('')

  const stats = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => { const c = r.CATEGORIA || 'Outros'; const e = m.get(c) || { n: 0, total: 0 }; e.n++; e.total += Number(r[V]) || 0; m.set(c, e) })
    return m
  }, [rows])
  const custom = useMemo(() => [...new Set([...(categories || []), ...stats.keys()])].filter((c) => c && !CATS.includes(c)).sort((a, b) => a.localeCompare(b)), [categories, stats])
  const all = [...CATS, ...custom]
  const info = (name) => stats.get(name) || { n: 0, total: 0 }

  const startEdit = (name) => { setEditing(name); setDraft(name); setDeleting(null); setError('') }
  const startDelete = (name) => { setDeleting(name); setEditing(null); setMoveTo('Outros'); setError('') }
  const saveEdit = async () => {
    const to = draft.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!to) return setError('Digite um nome para a categoria.')
    if (to === editing) { setEditing(null); return }
    const same = all.find((c) => c.toLowerCase() === to.toLowerCase() && c !== editing)
    if (same && !(await confirmDialog({ title: 'Mesclar categorias', icon: '🔀', message: `Já existe a categoria “${same}”.`, detail: `Mesclar os ${info(editing).n} lançamentos de “${editing}” nela?`, confirmLabel: 'Mesclar' }))) return
    onRename(editing, same || to)
    setEditing(null); setError('')
  }
  const confirmDelete = () => { onDelete(deleting, moveTo); setDeleting(null) }

  const row = (name, locked) => {
    const s = info(name)
    return <li key={name} className="cat-row">
      {editing === name ? <>
        <input className="cell" autoFocus value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }} />
        <span className="cat-actions"><button type="button" onClick={saveEdit}>Salvar</button><button type="button" className="sec" onClick={() => setEditing(null)}>Cancelar</button></span>
      </> : deleting === name ? <>
        <span className="cat-del">
          {s.n > 0 ? <>Excluir <b>{name}</b>? Os <b>{s.n}</b> {s.n === 1 ? 'lançamento será movido' : 'lançamentos serão movidos'} para
            <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>{all.filter((c) => c !== name).map((c) => <option key={c} value={c}>{c}</option>)}</select></>
            : <>Excluir <b>{name}</b>? Nenhum lançamento usa esta categoria.</>}
        </span>
        <span className="cat-actions"><button type="button" className="danger" onClick={confirmDelete}>Excluir</button><button type="button" className="sec" onClick={() => setDeleting(null)}>Cancelar</button></span>
      </> : <>
        <span className="cat-name">{locked ? '🔒 ' : ''}{name}<small className="muted"> · {s.n} {s.n === 1 ? 'lançamento' : 'lançamentos'} · {brl(s.total)}</small></span>
        {!locked && <span className="cat-actions"><button type="button" className="sec sm" title="Renomear" onClick={() => startEdit(name)}>✏️ Renomear</button><button type="button" className="sec sm danger" title="Excluir" onClick={() => startDelete(name)}>🗑 Excluir</button></span>}
      </>}
    </li>
  }

  return <div className="overlay" onClick={onClose}><div className="modal cat-modal" role="dialog" aria-modal="true" aria-label="Categorias do Extrato" onClick={(e) => e.stopPropagation()}>
    <h3>🏷️ Categorias do Extrato</h3>
    <p className="muted">Renomeie ou exclua as categorias que você criou. Ao renomear, todos os lançamentos acompanham o novo nome; ao excluir, eles vão para a categoria que você escolher.</p>
    {error && <p className="proj-warn" style={{ margin: '0 0 10px', padding: '6px 10px' }}>{error}</p>}
    <h4 className="cat-title">Suas categorias</h4>
    <ul className="cat-list">{custom.length ? custom.map((c) => row(c, false)) : <li className="muted">Você ainda não criou categorias. Use <b>＋ Categoria</b> na aba Extrato.</li>}</ul>
    <h4 className="cat-title">Padrão (protegidas)</h4>
    <ul className="cat-list">{CATS.map((c) => row(c, true))}</ul>
    <div className="actions"><button type="button" onClick={onClose}>Concluir</button></div>
  </div></div>
}
