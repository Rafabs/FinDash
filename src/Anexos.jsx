import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, sourceSlot, initAnexos, canDir, canPickFile, pickFolder, pickFileInFolder, findByName, reconnect, loadFromInput, forgetFolder, listFiles, openUrl, baseName, normPath, rowComprovantes, rowKey, buildUsed } from './anexos.js'

// Faturas e comprovantes: janela de visualização, escolha do arquivo e pastas de anexos.
// Há duas pastas: a das FATURAS (boletos) e a dos COMPROVANTES (opcional; sem ela usa a das faturas).
// Os caminhos (relativos à pasta do tipo) ficam nos dados e no XLSX; veja anexos.js.
const Ctx = createContext(null)
export const useAnexosUI = () => useContext(Ctx)
const useFolder = () => useSyncExternalStore(subscribe, getSnapshot)
const SLOT_NAME = { fatura: 'das faturas', comprovante: 'dos comprovantes' }

export function AnexosProvider({ rows, hints = {}, onFolder, children }) {
  const state = useFolder()
  const used = useMemo(() => buildUsed(rows), [rows]) // arquivos que já estão anexados a alguma fatura ou comprovante
  const [viewer, setViewer] = useState(null) // { items: [{ path, label, slot }], index }
  const [picker, setPicker] = useState(null) // { title, hints, slot, resolve }
  const [folder, setFolder] = useState(false)
  useEffect(() => { initAnexos() }, [])
  const hintKey = `${hints.fatura || ''}|${hints.comprovante || ''}`
  const api = useMemo(() => ({
    state, hints,
    view: (items, index = 0) => setViewer({ items, index }),
    pick: (opts) => new Promise((resolve) => setPicker({ ...opts, resolve })),
    openFolder: () => setFolder(true),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, hintKey])
  const closePicker = (path) => { picker?.resolve(path || null); setPicker(null) }
  return (
    <Ctx.Provider value={api}>
      {children}
      {viewer && <AnexoViewer items={viewer.items} start={viewer.index} onClose={() => setViewer(null)} onSetup={() => { setViewer(null); setFolder(true) }} />}
      {picker && <AnexoPicker title={picker.title} hints={picker.hints} slot={picker.slot} selfKey={picker.selfKey} used={used} onPick={closePicker} onClose={() => closePicker(null)} onSetup={() => setFolder(true)} />}
      {folder && <FolderModal hints={hints} onFolder={onFolder} onClose={() => setFolder(false)} />}
    </Ctx.Provider>
  )
}

// ---------- imagem com zoom: roda do mouse, + e −, arrastar, duplo clique e pinça no celular ----------
const ZMAX = 8
function ZoomImage({ src, alt, onError }) {
  const box = useRef(null)
  const [t, setT] = useState({ s: 1, x: 0, y: 0 })
  const tr = useRef(t)
  tr.current = t
  const pts = useRef(new Map()) // ponteiros ativos (1 = arrastar, 2 = pinça)
  const pinch = useRef(0)
  useEffect(() => { setT({ s: 1, x: 0, y: 0 }) }, [src])
  // limita o arraste para a imagem não sair do quadro
  const clamp = (s, x, y) => {
    const el = box.current
    if (!el || s <= 1) return { s: Math.max(1, s), x: 0, y: 0 }
    const mx = (el.clientWidth * (s - 1)) / 2, my = (el.clientHeight * (s - 1)) / 2
    return { s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) }
  }
  // (cx, cy): ponto, contado a partir do centro do quadro, que deve ficar parado durante o zoom
  const zoomTo = (ns, cx = 0, cy = 0) => {
    const { s, x, y } = tr.current
    const n = Math.max(1, Math.min(ZMAX, ns)), k = n / s
    setT(clamp(n, cx - (cx - x) * k, cy - (cy - y) * k))
  }
  const rel = (px, py) => { const r = box.current.getBoundingClientRect(); return [px - r.left - r.width / 2, py - r.top - r.height / 2] }
  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const wheel = (e) => { e.preventDefault(); zoomTo(tr.current.s * Math.exp(-e.deltaY * 0.0018), ...rel(e.clientX, e.clientY)) }
    el.addEventListener('wheel', wheel, { passive: false })
    const key = (e) => {
      if (e.target?.closest?.('input,textarea,select')) return
      if (e.key === '+' || e.key === '=') zoomTo(tr.current.s * 1.25)
      else if (e.key === '-') zoomTo(tr.current.s / 1.25)
      else if (e.key === '0') setT({ s: 1, x: 0, y: 0 })
    }
    window.addEventListener('keydown', key)
    return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key) }
  }, [])
  const down = (e) => { box.current.setPointerCapture?.(e.pointerId); pts.current.set(e.pointerId, [e.clientX, e.clientY]); pinch.current = 0 }
  const move = (e) => {
    const prev = pts.current.get(e.pointerId)
    if (!prev) return
    pts.current.set(e.pointerId, [e.clientX, e.clientY])
    if (pts.current.size === 2) {
      const [p, q] = [...pts.current.values()]
      const d = Math.hypot(p[0] - q[0], p[1] - q[1])
      if (pinch.current) zoomTo((tr.current.s * d) / pinch.current, ...rel((p[0] + q[0]) / 2, (p[1] + q[1]) / 2))
      pinch.current = d
    } else if (tr.current.s > 1) {
      const { s, x, y } = tr.current
      setT(clamp(s, x + e.clientX - prev[0], y + e.clientY - prev[1]))
    }
  }
  const up = (e) => { pts.current.delete(e.pointerId); pinch.current = 0 }
  const zoomed = t.s > 1
  return (
    <>
      <div ref={box} className={`anexo-zoom${zoomed ? ' zoomed' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={(e) => (zoomed ? setT({ s: 1, x: 0, y: 0 }) : zoomTo(2.5, ...rel(e.clientX, e.clientY)))}>
        <img src={src} alt={alt} draggable={false} onError={onError} style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }} />
      </div>
      <div className="anexo-zoom-bar" role="group" aria-label="Zoom">
        <button type="button" className="sec sm" onClick={() => zoomTo(t.s / 1.25)} disabled={!zoomed} aria-label="Diminuir" title="Diminuir (−)">−</button>
        <span className="anexo-zoom-pct">{Math.round(t.s * 100)}%</span>
        <button type="button" className="sec sm" onClick={() => zoomTo(t.s * 1.25)} disabled={t.s >= ZMAX} aria-label="Aumentar" title="Aumentar (+)">+</button>
        <button type="button" className="sec sm" onClick={() => setT({ s: 1, x: 0, y: 0 })} disabled={!zoomed} title="Ajustar à tela (0)">Ajustar</button>
      </div>
    </>
  )
}

// ---------- visualizador ----------
function AnexoViewer({ items, start, onClose, onSetup }) {
  const [i, setI] = useState(start)
  const [res, setRes] = useState({ loading: true })
  const [tick, setTick] = useState(0)
  const [imgErro, setImgErro] = useState(false)
  const item = items[i]
  useEffect(() => { setImgErro(false) }, [item.path])
  useEffect(() => {
    let alive = true, url = null
    setRes({ loading: true })
    openUrl(item.path, item.slot).then((r) => { if (!alive) URL.revokeObjectURL(r.url); else { url = r.url; setRes(r) } }).catch((e) => alive && setRes({ error: e?.code || 'erro', slot: e?.slot || item.slot, detail: [e?.name, e?.message].filter(Boolean).join(': ') }))
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [item.path, item.slot, tick])
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
      else if (e.key === 'ArrowRight') setI((v) => Math.min(items.length - 1, v + 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [items.length, onClose])

  const msg = {
    'nao-conectada': 'A pasta de anexos não está conectada neste navegador.',
    permissao: 'O navegador pede a permissão de leitura da pasta de anexos de novo.',
    'nao-encontrado': 'Arquivo não encontrado nas pastas de anexos.',
    erro: 'Não foi possível abrir o arquivo.',
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal anexo-viewer" role="dialog" aria-modal="true" aria-label="Anexo" onClick={(e) => e.stopPropagation()}>
        <div className="anexo-viewer-head">
          <h3 title={item.path}>{item.label ? `${item.label} · ` : ''}{baseName(item.path)}</h3>
          {items.length > 1 && <>
            <button type="button" className="sec sm" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Anterior">◀</button>
            <small className="muted">{i + 1}/{items.length}</small>
            <button type="button" className="sec sm" disabled={i === items.length - 1} onClick={() => setI(i + 1)} aria-label="Próximo">▶</button>
          </>}
          {res.url && <a className="anexo-btn" href={res.url} target="_blank" rel="noopener noreferrer">↗ Nova aba</a>}
          {res.url && <a className="anexo-btn" href={res.url} download={res.mismatch ? `${baseName(item.path).replace(/\.[^.]+$/, '')}.${res.kind}` : baseName(item.path)}>⬇ Baixar</a>}
          <button type="button" className="sec sm" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="anexo-viewer-body">
          {res.loading && <p className="muted">Abrindo…</p>}
          {res.error && (
            <div className="anexo-msg">
              <b>{msg[res.error] || msg.erro}</b>
              <code>{item.path}</code>
              {res.error === 'erro' && res.detail && <small className="muted">{res.detail}</small>}
              {res.error === 'permissao'
                ? <button type="button" onClick={async () => { if (await reconnect(res.slot || 'fatura')) setTick((t) => t + 1) }}>🔓 Reconectar pasta</button>
                : <button type="button" onClick={onSetup}>📁 Pastas de anexos</button>}
            </div>
          )}
          {res.url && res.kind === 'pdf' && <iframe className="anexo-frame" src={res.url} title={baseName(item.path)} />}
          {res.url && ['png', 'jpg', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(res.kind) && !imgErro && <ZoomImage src={res.url} alt={baseName(item.path)} onError={() => setImgErro(true)} />}
          {res.url && (imgErro || !res.kind) && <div className="anexo-msg"><b>{imgErro ? 'O navegador não conseguiu exibir esta imagem (arquivo corrompido ou formato sem suporte).' : 'Formato não reconhecido: não dá para mostrar este arquivo aqui.'}</b><span className="muted">Use “Nova aba” ou “Baixar”.</span></div>}
        </div>
        {res.mismatch && <p className="anexo-warn">⚠️ Este arquivo é {String(res.kind).toUpperCase()}, mas o nome termina em .{res.ext}. Renomear a extensão não converte o arquivo; ele foi aberto pelo tipo real.</p>}
        {res.url && <small className="muted anexo-meta">{item.path} · {res.type} · {res.size < 1048576 ? `${Math.max(1, Math.round(res.size / 1024))} KB` : `${(res.size / 1048576).toFixed(1)} MB`}</small>}
      </div>
    </div>
  )
}

// ---------- escolher o arquivo dentro da pasta do tipo ----------
function AnexoPicker({ title, hints = [], slot = 'fatura', selfKey, used, onPick, onClose, onSetup }) {
  const state = useFolder()
  const src = sourceSlot(state, slot) // pasta do tipo; sem ela, a outra
  const [info, setInfo] = useState(null) // { files, total, ignored, truncated }
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [manual, setManual] = useState('')
  const [n, setN] = useState(0) // "Atualizar"
  const [showUsed, setShowUsed] = useState(false) // mostrar também o que já está anexado em outras faturas
  const [dup, setDup] = useState(null) // arquivo escolhido que já está anexado em outra linha: pede confirmação
  const input = useRef(null)
  useEffect(() => {
    let alive = true
    setInfo(null)
    if (!src) { setInfo({ files: [], total: 0, ignored: {} }); return undefined }
    listFiles(slot).then((r) => alive && setInfo(r)).catch((e) => alive && (setInfo({ files: [], total: 0, ignored: {} }), setErr(e?.code === 'permissao' ? 'O navegador pediu a permissão da pasta de novo. Use “Reconectar”.' : `Não foi possível ler a pasta${e?.name ? ` (${e.name})` : ''}.`)))
    return () => { alive = false }
  }, [src, slot, n, state.fatura.connected, state.comprovante.connected, state.fatura.name, state.comprovante.name])
  const files = info?.files
  // com uma pasta só (comprovantes sem pasta própria), fatura e comprovante saem da mesma pasta: um arquivo usado como um não serve como o outro
  const sameFolder = !!sourceSlot(state, 'fatura') && sourceSlot(state, 'fatura') === sourceSlot(state, 'comprovante')
  const usedBy = (p) => {
    const k = normPath(p).toLowerCase()
    const out = []
    for (const sl of sameFolder ? ['fatura', 'comprovante'] : [slot]) (used?.[sl]?.get(k) || []).forEach((u) => { if (u.key !== selfKey) out.push(u.label) })
    return [...new Set(out)]
  }
  const hiddenCount = useMemo(() => (files || []).filter((p) => usedBy(p).length).length, [files, used, sameFolder, selfKey, slot]) // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (p) => { const by = usedBy(p); if (by.length) setDup({ path: p, by }); else onPick(p) }
  const hintKey = hints.join('|')
  const ranked = useMemo(() => {
    const toks = hintKey.split('|').map((h) => h.trim().toLowerCase()).filter((h) => h.length > 1)
    const needle = q.trim().toLowerCase()
    return (files || []).filter((p) => (!needle || p.toLowerCase().includes(needle)) && (showUsed || !usedBy(p).length))
      .map((p) => ({ p, s: toks.reduce((a, t) => a + (p.toLowerCase().includes(t) ? 1 : 0), 0) }))
      .sort((a, b) => b.s - a.s || a.p.localeCompare(b.p, 'pt-BR'))
  }, [files, q, hintKey, showUsed, used, sameFolder, selfKey, slot]) // eslint-disable-line react-hooks/exhaustive-deps
  const needPerm = !src && (state.fatura.needsPermission || state.comprovante.needsPermission)
  const reconnectAny = () => reconnect(state[slot].needsPermission ? slot : state.fatura.needsPermission ? 'fatura' : 'comprovante')
  const handleMode = !!src && state[src].mode === 'pasta'
  // explorador do computador, já dentro da pasta (Chrome/Edge/Opera) ou campo de arquivo (Firefox/Safari)
  const browse = async () => {
    setErr('')
    if (!(canPickFile() && handleMode)) { input.current?.click(); return }
    try {
      const r = await pickFileInFolder(slot)
      if (r.path) choose(r.path)
      else setErr(`O arquivo “${r.name}” está fora das pastas conectadas. Escolha um arquivo dentro de “${state[src].name}” ou conecte a pasta certa em 📎 Anexos.`)
    } catch (e) { if (e?.name !== 'AbortError') setErr('Não foi possível abrir o explorador de arquivos.') }
  }
  const onFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const p = findByName(f, slot)
    if (p) choose(p)
    else setErr(`O arquivo “${f.name}” não está na pasta conectada${src ? ` (“${state[src].name}”)` : ''}. Conecte a pasta onde ele está.`)
  }
  const ignoredTxt = info ? Object.entries(info.ignored || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([e, c]) => `.${e} (${c})`).join(', ') : ''
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal anexo-picker" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>📎 {title}</h3>
        {src ? (
          <>
            <p className="muted anexo-note">Pasta {SLOT_NAME[src]}: <b>{state[src].name}</b> · {info ? `${files.length} ${files.length === 1 ? 'PDF/imagem' : 'PDFs/imagens'}${info.truncated ? '+' : ''} de ${info.total} arquivo${info.total === 1 ? '' : 's'}` : 'lendo…'}{src !== slot && ` (a pasta ${SLOT_NAME[slot]} não foi escolhida; usando esta)`}</p>
            <div className="prefs-row">
              <button type="button" onClick={browse}>📂 Procurar no computador</button>
              <button type="button" className="sec" onClick={() => setN((v) => v + 1)} title="Ler a pasta de novo">↻ Atualizar lista</button>
              <button type="button" className="sec" onClick={onSetup} title="Trocar as pastas de anexos">📁 Pastas</button>
              <input ref={input} type="file" hidden accept="application/pdf,image/*" onChange={onFile} />
            </div>
            <input className="cell" placeholder="Buscar na lista pelo nome ou pasta…" value={q} onChange={(e) => setQ(e.target.value)} />
            {hiddenCount > 0 && (
              <label className="anexo-used-toggle">
                <input type="checkbox" checked={showUsed} onChange={(e) => setShowUsed(e.target.checked)} />
                {showUsed ? `Mostrando os ${hiddenCount} já anexados em outras faturas` : `${hiddenCount} arquivo${hiddenCount === 1 ? ' já anexado' : 's já anexados'} em outras faturas ${hiddenCount === 1 ? 'oculto' : 'ocultos'}. Mostrar`}
              </label>
            )}
            <div className="anexo-list">
              {ranked.slice(0, 200).map(({ p, s }) => { const by = usedBy(p); return <button type="button" key={p} className={`anexo-item${by.length ? ' used' : ''}`} onClick={() => choose(p)}><span>{p}</span>{by.length ? <em className="used" title={by.join(', ')}>já anexado</em> : s > 0 && <em>sugerido</em>}</button> })}
              {info && !ranked.length && (
                <p className="muted">{info.total > 0 && !files.length
                  ? `Foram lidos ${info.total} arquivo(s), mas nenhum PDF ou imagem. Tipos encontrados: ${ignoredTxt || '—'}.`
                  : q.trim() ? 'Nenhum arquivo combina com a busca.' : 'Nenhum PDF ou imagem na pasta. Use “Procurar no computador” ou digite o caminho abaixo.'}</p>
              )}
              {ranked.length > 200 && <p className="muted">Mostrando 200 de {ranked.length}. Use a busca para filtrar.</p>}
            </div>
          </>
        ) : (
          <div className="anexo-note">
            <p>{needPerm ? 'O navegador pede a permissão de leitura da pasta de anexos de novo.' : `Conecte a pasta ${SLOT_NAME[slot]} para escolher o arquivo.`}</p>
            <button type="button" onClick={needPerm ? reconnectAny : onSetup}>{needPerm ? '🔓 Reconectar pasta' : '📁 Conectar pasta'}</button>
          </div>
        )}
        {dup && (
          <div className="anexo-warn">
            <b>Este arquivo já está anexado em: {dup.by.join('; ')}.</b> Usar o mesmo arquivo em duas faturas pode contar o pagamento duas vezes.
            <span className="anexo-dup-actions"><button type="button" className="sec sm" onClick={() => onPick(dup.path)}>Anexar mesmo assim</button><button type="button" className="sec sm" onClick={() => setDup(null)}>Escolher outro</button></span>
          </div>
        )}
        {err && <p className="anexo-warn">{err} {err.includes('Reconectar') && <button type="button" className="sec sm" onClick={reconnectAny}>🔓 Reconectar</button>}</p>}
        <label className="anexo-manual">Ou digite o caminho relativo à pasta {SLOT_NAME[slot]}
          <span className="anexo-manual-row">
            <input className="cell" placeholder="2026-11/cartao.pdf" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) onPick(manual.trim()) }} />
            <button type="button" className="sec" disabled={!manual.trim()} onClick={() => onPick(manual.trim())}>Usar</button>
          </span>
        </label>
        <div className="actions"><button type="button" className="sec" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  )
}

// ---------- pastas de anexos: um cartão para as faturas e outro para os comprovantes ----------
function FolderCard({ slot, icon, title, optional, hint, onFolder }) {
  const state = useFolder()
  const s = state[slot]
  const input = useRef(null)
  const [info, setInfo] = useState(null)
  const [err, setErr] = useState('')
  const inherits = optional && !s.connected && !s.needsPermission && state.fatura.connected // comprovante sem pasta própria usa a das faturas
  useEffect(() => {
    let alive = true
    setInfo(null)
    if (s.connected) listFiles(slot, 5000, true).then((r) => alive && setInfo(r)).catch(() => alive && setInfo({ files: [], total: 0, ignored: {} }))
    return () => { alive = false }
  }, [s.connected, s.name, slot])
  const choose = async () => {
    setErr('')
    try { const name = await pickFolder(slot); onFolder?.(slot, name) } catch (e) { if (e?.name !== 'AbortError') setErr('Não foi possível abrir a pasta.') }
  }
  const tone = s.connected ? 'on' : s.needsPermission ? 'perm' : inherits ? 'inherit' : 'off'
  const pill = { on: 'Conectada', perm: 'Falta permissão', inherit: 'Usa a pasta das faturas', off: 'Não definida' }[tone]
  const n = info?.files.length
  return (
    <div className={`folder-card ${tone}`}>
      <div className="folder-card-head">
        <span className="folder-ic" aria-hidden="true">{icon}</span>
        <div><b>{title}</b>{optional && <small>opcional</small>}</div>
        <span className={`folder-pill ${tone}`}>{pill}</span>
      </div>
      <div className="folder-name">{s.name ? `📁 ${s.name}` : inherits ? `📁 ${state.fatura.name}` : '—'}</div>
      <p className="folder-meta">
        {s.connected ? (info ? `${n} ${n === 1 ? 'PDF/imagem' : 'PDFs/imagens'} de ${info.total} arquivo${info.total === 1 ? '' : 's'}${s.mode === 'sessao' ? ' · só nesta sessão' : ''}` : 'lendo a pasta…')
          : s.needsPermission ? 'A pasta está salva, mas o navegador pede a permissão de leitura de novo.'
            : inherits ? 'Os comprovantes são procurados na pasta das faturas. Escolha outra pasta se eles ficam em outro lugar.'
              : optional ? 'Se os comprovantes ficam em outro lugar, escolha a pasta deles.' : 'Escolha a pasta onde ficam os boletos e as faturas.'}
      </p>
      {hint && !s.connected && <p className="folder-hint">Este arquivo usa a pasta <b>{hint}</b>: escolha a pasta com esse nome.</p>}
      <div className="folder-actions">
        {s.needsPermission && <button type="button" onClick={() => reconnect(slot)}>🔓 Reconectar</button>}
        {canDir()
          ? <button type="button" className={s.needsPermission || s.connected || inherits ? 'sec' : ''} onClick={choose}>{s.name ? '📁 Trocar pasta' : '📁 Escolher pasta'}</button>
          : <>
            <button type="button" className={s.connected ? 'sec' : ''} onClick={() => input.current?.click()}>{s.name ? '📁 Trocar pasta' : '📁 Escolher pasta'}</button>
            <input ref={input} type="file" hidden webkitdirectory="" directory="" multiple onChange={(e) => { const name = loadFromInput(slot, e.target.files); if (name) onFolder?.(slot, name); e.target.value = '' }} />
          </>}
        {s.name && <button type="button" className="sec" onClick={async () => { await forgetFolder(slot); onFolder?.(slot, '') }}>{optional ? 'Usar a das faturas' : 'Esquecer'}</button>}
      </div>
      {err && <p className="folder-hint" style={{ color: 'var(--neg)' }}>{err}</p>}
      {info && n > 0 && (
        <details className="folder-files">
          <summary>Ver arquivos ({n}{info.truncated ? '+' : ''})</summary>
          <ul>{info.files.slice(0, 40).map((p) => <li key={p}>{p}</li>)}{n > 40 && <li className="muted">…e mais {n - 40}</li>}</ul>
        </details>
      )}
      {info && info.total > 0 && n === 0 && <p className="folder-hint">Nenhum PDF ou imagem nesta pasta. Tipos encontrados: {Object.entries(info.ignored || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([e, c]) => `.${e} (${c})`).join(', ')}.</p>}
    </div>
  )
}

function FolderModal({ hints, onFolder, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal anexo-folder" role="dialog" aria-modal="true" aria-label="Pastas de anexos" onClick={(e) => e.stopPropagation()}>
        <h3>📁 Pastas de anexos</h3>
        <p className="muted anexo-note">Escolha onde estão os arquivos. Pode ser <b>uma pasta só</b> (deixe a dos comprovantes sem escolher) ou <b>uma pasta para cada tipo</b>.</p>
        <div className="folder-grid">
          <FolderCard slot="fatura" icon="📄" title="Faturas (boletos)" hint={hints.fatura} onFolder={onFolder} />
          <FolderCard slot="comprovante" icon="🧾" title="Comprovantes" optional hint={hints.comprovante} onFolder={onFolder} />
        </div>
        <details className="anexo-how">
          <summary>Como funciona</summary>
          <p>Os arquivos <b>ficam no seu computador</b>: o XLSX guarda só o <b>caminho dentro da pasta</b>. Para funcionar em outro PC, leve as pastas junto com o XLSX (OneDrive, Drive…) e conecte-as de novo.</p>
          <p>Se o arquivo não estiver na pasta do tipo, o app procura na outra. O app só lê os arquivos: não copia, move nem apaga.</p>
          {!canDir() && <p className="muted">Este navegador não guarda as pastas entre sessões: escolha-as de novo ao abrir o app (Chrome, Edge e Opera lembram).</p>}
        </details>
        <div className="actions"><button type="button" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  )
}

// ---------- campo de anexos (fatura ou comprovante de uma linha) ----------
export function AnexosField({ label, icon = '📎', slot = 'fatura', selfKey, value, onChange, hints = [], locked = false, single = false }) {
  const ui = useAnexosUI()
  const list = Array.isArray(value) ? value : []
  if (!ui || (locked && !list.length)) return null
  const add = async () => {
    const p = await ui.pick({ title: `Anexar ${label.toLowerCase()}`, hints, slot, selfKey })
    if (p && !list.includes(p)) onChange([...list, p])
  }
  return (
    <div className="anexos-field">
      <span className="anexos-label">{icon} {label}</span>
      {list.map((p, k) => (
        <span className="anexo-chip" key={p}>
          <button type="button" className="anexo-open" title={p} onClick={() => ui.view(list.map((x) => ({ path: x, label, slot })), k)}>{baseName(p)}</button>
          {!locked && <button type="button" className="anexo-x" aria-label="Remover anexo" title="Remover (o arquivo continua na pasta)" onClick={() => onChange(list.filter((x) => x !== p))}>✕</button>}
        </span>
      ))}
      {!locked && !(single && list.length) && <button type="button" className="sec sm" onClick={add}>＋ Anexar</button>}
    </div>
  )
}

// fatura e comprovante da linha (conta + mês) lado a lado: um de cada, valendo para todos os itens
export function AnexosBar({ row, onChange, locked = false }) {
  const base = [String(row.DATA || '').slice(0, 7), row.TIPO_CONTA]
  const fat = row.FATURAS || [], comp = rowComprovantes(row)
  if (locked && !fat.length && !comp.length) return null
  return (
    <div className="anexos-bar">
      <AnexosField single slot="fatura" selfKey={rowKey(row)} label="Fatura" icon="📄" value={fat} onChange={(v) => onChange({ FATURAS: v })} hints={[...base, 'fatura', 'boleto']} locked={locked} />
      <AnexosField single slot="comprovante" selfKey={rowKey(row)} label="Comprovante" icon="🧾" value={comp} onChange={(v) => onChange({ COMPROVANTES: v })} hints={[...base, 'comprovante']} locked={locked} />
    </div>
  )
}

// atalhos de leitura na lista de despesas: fatura e comprovante da linha, lado a lado
export function AnexoBadges({ row }) {
  const ui = useAnexosUI()
  if (!ui) return null
  const faturas = row.FATURAS || [], comps = rowComprovantes(row)
  if (!faturas.length && !comps.length) return null
  const open = (list, label, slot) => ui.view(list.map((p) => ({ path: p, label: `${label} · ${row.TIPO_CONTA}`, slot })), 0)
  return (
    <div className="anexo-badges">
      {faturas.length > 0 && <button type="button" className="anexo-open" onClick={() => open(faturas, 'Fatura', 'fatura')}>📄 Fatura{faturas.length > 1 ? ` (${faturas.length})` : ''}</button>}
      {comps.length > 0 && <button type="button" className="anexo-open" onClick={() => open(comps, 'Comprovante', 'comprovante')}>🧾 Comprovante{comps.length > 1 ? ` (${comps.length})` : ''}</button>}
    </div>
  )
}
