// Faturas e comprovantes (anexos). Os arquivos NÃO vão para o XLSX nem para a internet: ficam em pastas do seu computador
// e o XLSX guarda só o caminho RELATIVO à pasta (ex.: 2026-11/cartao.pdf). Há duas pastas: a das FATURAS (boletos) e a dos
// COMPROVANTES, que é opcional (sem ela, os comprovantes usam a pasta das faturas). Cada pasta é escolhida uma vez por aparelho.
import { putHandle, getHandleByKey, delHandle } from './fileMeta.js'

const IMG = ['png', 'jpg', 'jpeg', 'jfif', 'webp', 'gif', 'bmp', 'svg', 'avif']
const EXT = /\.(pdf|png|jpe?g|jfif|webp|gif|bmp|svg|avif)$/i
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif' }

// ---------- caminhos ----------
export const extOf = (p) => (String(p || '').match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase()
export const isPdf = (p) => extOf(p) === 'pdf'
export const isImage = (p) => IMG.includes(extOf(p))
export const baseName = (p) => String(p || '').split('/').pop()
// barras normais, sem "./" nem barra no começo
export const normPath = (p) => String(p ?? '').replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '').replace(/\/{2,}/g, '/').trim()
// vários caminhos na mesma célula do XLSX, separados por "|"
export const splitPaths = (s) => String(s ?? '').split('|').map(normPath).filter(Boolean)
export const joinPaths = (list) => (list || []).map(normPath).filter(Boolean).join('|')

// comprovantes de uma linha (conta + mês): um só para todos os itens. Aceita também os comprovantes por item da versão anterior
export const rowComprovantes = (r) => [...new Set([...(r?.COMPROVANTES || []), ...(r?.ITENS || []).flatMap((i) => i.COMPROVANTES || [])])]

// identifica a linha (conta + mês) de uma despesa
export const rowKey = (r) => `${String(r?.DATA || '').slice(0, 7)}|${String(r?.TIPO_CONTA || '').trim().toLowerCase()}`
// arquivos já anexados: Map caminho(minúsculo) -> [{ key, label }] das linhas que o usam, separado por tipo (fatura / comprovante)
export function buildUsed(rows) {
  const out = { fatura: new Map(), comprovante: new Map() }
  const add = (slot, p, r) => {
    const k = normPath(p).toLowerCase()
    if (!k) return
    if (!out[slot].has(k)) out[slot].set(k, [])
    out[slot].get(k).push({ key: rowKey(r), label: `${r.TIPO_CONTA} · ${String(r.DATA).slice(0, 7)}` })
  }
  ;(rows || []).forEach((r) => { (r.FATURAS || []).forEach((p) => add('fatura', p, r)); rowComprovantes(r).forEach((p) => add('comprovante', p, r)) })
  return out
}

// ---------- estado das pastas (fatura e comprovante) ----------
const SLOTS = ['fatura', 'comprovante']
const KEYS = { fatura: 'anexos-root', comprovante: 'anexos-root-comprovante' }
const other = (s) => (s === 'comprovante' ? 'fatura' : 'comprovante')
const blank = () => ({ handle: null, mem: null, name: '', granted: false }) // handle: Chrome/Edge/Opera (lembrada); mem: Firefox/Safari (só na sessão)
const R = { fatura: blank(), comprovante: blank() }
const slotState = (r) => ({ name: r.name, mode: r.mem ? 'sessao' : r.handle ? 'pasta' : 'nenhuma', connected: !!(r.mem || (r.handle && r.granted)), needsPermission: !!(r.handle && !r.granted), count: r.mem ? r.mem.size : null })
const compute = () => {
  const fatura = slotState(R.fatura), comprovante = slotState(R.comprovante)
  const connected = fatura.connected || comprovante.connected
  return { fatura, comprovante, connected, needsPermission: !connected && (fatura.needsPermission || comprovante.needsPermission) }
}
let snap = compute()
const listeners = new Set()
const emit = () => { snap = compute(); listeners.forEach((f) => f()) }
export const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f) }
export const getSnapshot = () => snap
// pasta que vale para o tipo: a própria; sem ela, a outra (assim dá para usar uma pasta só)
export const sourceSlot = (state, slot) => (state[slot].connected ? slot : state[other(slot)].connected ? other(slot) : null)

export const canDir = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

export async function initAnexos() {
  await Promise.all(SLOTS.map(async (s) => {
    if (R[s].handle || R[s].mem) return
    const h = await getHandleByKey(KEYS[s])
    if (!h) return
    R[s].handle = h; R[s].name = h.name || ''
    try { R[s].granted = (await h.queryPermission?.({ mode: 'read' })) === 'granted' } catch { R[s].granted = false }
  }))
  emit()
}
export async function pickFolder(slot) {
  const h = await window.showDirectoryPicker({ id: `fynn-anexos-${slot}`, mode: 'read' })
  R[slot] = { handle: h, mem: null, name: h.name, granted: true }
  await putHandle(KEYS[slot], h)
  emit()
  return h.name
}
export async function reconnect(slot) {
  const r = R[slot]
  if (!r?.handle) return false
  try { r.granted = (await r.handle.requestPermission({ mode: 'read' })) === 'granted' } catch { r.granted = false }
  emit()
  return r.granted
}
// navegadores sem acesso a pastas: <input type="file" webkitdirectory> entrega os arquivos da pasta de uma vez
export function loadFromInput(slot, fileList) {
  const map = new Map()
  let root = ''
  ;[...(fileList || [])].forEach((f) => {
    const segs = normPath(f.webkitRelativePath).split('/')
    if (segs.length < 2) return
    root = segs[0]
    const rel = segs.slice(1).join('/')
    if (EXT.test(rel) && !rel.split('/').some((s) => s.startsWith('.'))) map.set(rel.toLowerCase(), { file: f, path: rel })
  })
  if (!root) return null
  R[slot] = { handle: null, mem: map, name: root, granted: false }
  emit()
  return root
}
export async function forgetFolder(slot) {
  R[slot] = blank()
  await delHandle(KEYS[slot])
  emit()
}

// ---------- leitura ----------
const fail = (code, slot) => Object.assign(new Error(code), { code, slot })
// aceita o caminho relativo, com o nome da pasta na frente ou até um caminho completo do Windows (usa o que vem depois da pasta)
const candidates = (path, rootName) => {
  const segs = normPath(path).split('/').filter(Boolean)
  const out = [segs]
  const k = rootName ? segs.findIndex((s) => s.toLowerCase() === rootName.toLowerCase()) : -1
  if (k >= 0 && k < segs.length - 1) out.push(segs.slice(k + 1))
  return out.filter((c) => c.length)
}
async function child(dir, name, wantDir) {
  try { return wantDir ? await dir.getDirectoryHandle(name) : await dir.getFileHandle(name) } catch (e) {
    if (e?.name !== 'NotFoundError' && e?.name !== 'TypeMismatchError') throw e
  }
  for await (const [n, h] of dir.entries()) { // o Windows ignora maiúsculas e minúsculas: aceita o mesmo aqui
    if (n.toLowerCase() === name.toLowerCase() && h.kind === (wantDir ? 'directory' : 'file')) return h
  }
  throw fail('nao-encontrado')
}
async function findIn(root, path) {
  for (const segs of candidates(path, root.name)) {
    try {
      if (root.mem) {
        const hit = root.mem.get(segs.join('/').toLowerCase())
        if (hit) return hit.file
        continue
      }
      let dir = root.handle
      for (const seg of segs.slice(0, -1)) dir = await child(dir, seg, true)
      return await (await child(dir, segs[segs.length - 1], false)).getFile()
    } catch (e) { if (e?.code !== 'nao-encontrado' && e?.name !== 'NotFoundError') throw e }
  }
  return null
}
// o navegador pode retirar a permissão de leitura no meio da sessão: marca a pasta como "precisa reconectar"
const guard = (slot, e) => {
  if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') { R[slot].granted = false; emit(); return fail('permissao', slot) }
  return e
}
// procura primeiro na pasta do tipo (fatura ou comprovante) e depois na outra
export async function resolveFile(path, slot = 'fatura') {
  const s = getSnapshot()
  const order = [slot, other(slot)].filter((k) => s[k].connected)
  if (!order.length) {
    const need = [slot, other(slot)].find((k) => s[k].needsPermission)
    throw fail(need ? 'permissao' : 'nao-conectada', need)
  }
  for (const k of order) {
    let f = null
    try { f = await findIn(R[k], path) } catch (e) { throw guard(k, e) }
    if (f) return f
  }
  throw fail(s[slot].needsPermission ? 'permissao' : 'nao-encontrado', s[slot].needsPermission ? slot : undefined)
}
// lista os PDFs e imagens da pasta do tipo (ou da outra, se esta não existir): caminhos relativos, para escolher o anexo.
// Devolve também quantos arquivos foram lidos e os tipos ignorados, para explicar uma lista vazia.
export async function listFiles(slot = 'fatura', limit = 5000, own = false) { // own: só a pasta do próprio tipo, sem cair na outra
  const k = own ? (getSnapshot()[slot].connected ? slot : null) : sourceSlot(getSnapshot(), slot)
  const res = { files: [], total: 0, ignored: {}, truncated: false, from: k }
  if (!k) return res
  const r = R[k]
  const byName = (x, y) => x.localeCompare(y, 'pt-BR')
  const add = (name, rel) => {
    res.total += 1
    if (EXT.test(name)) res.files.push(rel)
    else { const e = (name.match(/\.([^.]+)$/)?.[1] || 'sem extensão').toLowerCase(); res.ignored[e] = (res.ignored[e] || 0) + 1 }
  }
  if (r.mem) { r.mem.forEach((x) => add(x.path, x.path)); res.files.sort(byName); return res }
  const walk = async (dir, prefix, depth) => {
    for await (const [name, h] of dir.entries()) {
      if (res.files.length >= limit) { res.truncated = true; return }
      if (h.kind === 'file') add(name, prefix + name)
      else if (depth < 8 && !name.startsWith('.')) await walk(h, `${prefix}${name}/`, depth + 1)
    }
  }
  try { await walk(r.handle, '', 0) } catch (e) { throw guard(k, e) }
  res.files.sort(byName)
  return res
}

// ---------- escolher o arquivo no explorador do computador ----------
export const canPickFile = () => typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
// Chrome/Edge/Opera: abre o explorador já dentro da pasta do tipo e devolve o caminho RELATIVO à pasta; se o arquivo
// estiver fora das pastas conectadas, devolve só o nome
export async function pickFileInFolder(slot = 'fatura') {
  const s = getSnapshot()
  const order = [slot, other(slot)].filter((k) => R[k].handle && s[k].connected)
  const [fh] = await window.showOpenFilePicker({
    multiple: false,
    startIn: order.length ? R[order[0]].handle : 'documents',
    types: [{ description: 'PDF e imagens', accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg', '.jfif', '.webp', '.gif', '.bmp', '.svg', '.avif'] } }],
  })
  for (const k of order) {
    let rel = null
    try { rel = await R[k].handle.resolve(fh) } catch (e) { throw guard(k, e) }
    if (rel?.length) return { path: rel.join('/'), slot: k, name: fh.name }
  }
  return { path: null, name: fh.name }
}
// Firefox/Safari (pasta lida na sessão): acha o arquivo escolhido pelo nome dentro das pastas conectadas
export function findByName(file, slot = 'fatura') {
  const name = String(file?.name || '').toLowerCase()
  for (const k of [slot, other(slot)]) {
    const mem = R[k].mem
    if (!mem) continue
    const hits = [...mem.values()].filter((x) => baseName(x.path).toLowerCase() === name)
    const hit = hits.find((x) => x.file.size === file.size) || hits[0]
    if (hit) return hit.path
  }
  return null
}

// descobre o tipo REAL pelo começo do arquivo: a extensão pode estar errada (ex.: PDF renomeado para .png não vira imagem)
export async function sniffKind(file) {
  try {
    const b = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
    const at = (i, s) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0))
    const head = String.fromCharCode(...b)
    if (head.includes('%PDF-')) return 'pdf'
    if (b[0] === 0x89 && at(1, 'PNG')) return 'png'
    if (b[0] === 0xff && b[1] === 0xd8) return 'jpg'
    if (at(0, 'GIF8')) return 'gif'
    if (at(0, 'RIFF') && at(8, 'WEBP')) return 'webp'
    if (at(0, 'BM')) return 'bmp'
    if (head.slice(4, 12) === 'ftypavif') return 'avif'
    if (/^\s*(<\?xml|<svg)/i.test(head)) return 'svg'
  } catch { /* segue pela extensão */ }
  return ''
}
// endereço temporário (blob:) para mostrar o arquivo; quem chama deve liberar com URL.revokeObjectURL
export async function openUrl(path, slot = 'fatura') {
  const file = await resolveFile(path, slot)
  const ext = ['jpeg', 'jfif'].includes(extOf(path)) ? 'jpg' : extOf(path)
  const real = await sniffKind(file)
  const kind = real || (ext === 'pdf' || IMG.includes(ext) ? ext : '')
  const type = MIME[kind] || file.type || 'application/octet-stream'
  return { url: URL.createObjectURL(new Blob([file], { type })), name: baseName(path), size: file.size, type, kind, ext, mismatch: !!real && real !== ext }
}
