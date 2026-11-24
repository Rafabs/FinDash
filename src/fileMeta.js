// Arquivo carregado: nome, data/hora do carregamento e da última edição, e recarga do disco
// (File System Access API no Chrome/Edge/Opera; nos demais navegadores o arquivo é escolhido de novo)
const META_KEY = 'fynn-file-v1'
export const EMPTY_META = { name: '', loadedAt: null, editedAt: null, diskAt: null }

export const loadMeta = () => {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY))
    if (!m || typeof m !== 'object') return { ...EMPTY_META }
    return { name: String(m.name || ''), loadedAt: Number(m.loadedAt) || null, editedAt: Number(m.editedAt) || null, diskAt: Number(m.diskAt) || null }
  } catch { return { ...EMPTY_META } }
}
export const saveMeta = (m) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)) } catch {} }

const p2 = (n) => String(n).padStart(2, '0')
// "21/11/2026 14:02"; com sameDayAs, no mesmo dia mostra só "14:35"
export const fmtDT = (ms, sameDayAs) => {
  if (!ms) return '—'
  const d = new Date(ms), hora = `${p2(d.getHours())}:${p2(d.getMinutes())}`
  if (sameDayAs && new Date(sameDayAs).toDateString() === d.toDateString()) return hora
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${hora}`
}

// ---------- seletor de arquivo com "alça" (permite reler o arquivo do disco) ----------
export const canPick = () => typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
const PICK = { multiple: false, types: [{ description: 'Planilhas (.xlsx, .xls, .csv)', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'] } }] }
export const pickHandle = async () => (await window.showOpenFilePicker(PICK))[0]
export async function readHandle(handle) {
  if (typeof handle.queryPermission === 'function' && (await handle.queryPermission({ mode: 'read' })) !== 'granted') {
    if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') throw new Error('permissão negada')
  }
  return handle.getFile()
}

// a alça fica no IndexedDB para o botão continuar funcionando depois de fechar a aba
const idb = () => new Promise((ok, no) => {
  const r = indexedDB.open('fynn-control', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('handles')
  r.onsuccess = () => ok(r.result)
  r.onerror = () => no(r.error)
})
const withStore = async (mode, fn) => {
  try {
    const db = await idb()
    return await new Promise((ok) => { const tx = db.transaction('handles', mode); const out = fn(tx.objectStore('handles')); tx.oncomplete = () => ok(out?.result ?? null); tx.onerror = () => ok(null); tx.onabort = () => ok(null) })
  } catch { return null }
}
export const saveHandle = (h) => withStore('readwrite', (s) => s.put(h, 'last'))
export const clearHandle = () => withStore('readwrite', (s) => s.delete('last'))
export const loadHandle = () => withStore('readonly', (s) => s.get('last'))

// alças extras (ex.: pasta de anexos), cada uma na sua chave
export const putHandle = (key, h) => withStore('readwrite', (s) => s.put(h, key))
export const getHandleByKey = (key) => withStore('readonly', (s) => s.get(key))
export const delHandle = (key) => withStore('readwrite', (s) => s.delete(key))
