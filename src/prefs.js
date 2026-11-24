export const PREFS_KEY = 'fynn-prefs-v1'
export const TABS = [['dash', 'Dashboard'], ['projecao', 'Projeção'], ['renda', 'Renda por papel'], ['carteira', 'Carteira'], ['extrato', 'Extrato'], ['despesas', 'Despesas'], ['resgates', 'Resgates'], ['notas', 'Notas']]
export const TAB_LABEL = Object.fromEntries(TABS)
export const ACCENTS = ['#00a99d', '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
export const GRADIENTS = ['linear-gradient(135deg,#4f46e5,#06b6d4)', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#10b981,#065f46)', 'linear-gradient(135deg,#0f172a,#334155)']
// fundos pré-definidos (o valor salvo é só o id; cores seguem o tema via --wp-fg)
const L = 'rgba(var(--wp-fg),.07)', M = 'rgba(var(--wp-fg),.12)'
export const PATTERNS = [
  { id: 'grid', name: 'Grade', css: `linear-gradient(${L} 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,${L} 1px,transparent 1px) 0 0/32px 32px,var(--bg)` },
  { id: 'blueprint', name: 'Projeto', css: `linear-gradient(${M} 1px,transparent 1px) 0 0/120px 120px,linear-gradient(90deg,${M} 1px,transparent 1px) 0 0/120px 120px,linear-gradient(${L} 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,${L} 1px,transparent 1px) 0 0/24px 24px,var(--bg)` },
  { id: 'dots', name: 'Pontos', css: `radial-gradient(${M} 1.5px,transparent 1.6px) 0 0/22px 22px,var(--bg)` },
  { id: 'lines', name: 'Linhas', css: `repeating-linear-gradient(0deg,${L} 0 1px,transparent 1px 14px),var(--bg)` },
  { id: 'diagonal', name: 'Diagonal', css: `repeating-linear-gradient(45deg,${L} 0 1px,transparent 1px 14px),var(--bg)` },
  { id: 'hatch', name: 'Traços cruzados', css: `repeating-linear-gradient(45deg,${L} 0 1px,transparent 1px 16px),repeating-linear-gradient(-45deg,${L} 0 1px,transparent 1px 16px),var(--bg)` },
  { id: 'checker', name: 'Xadrez', css: `conic-gradient(rgba(var(--wp-fg),.05) 25%,transparent 0 50%,rgba(var(--wp-fg),.05) 0 75%,transparent 0) 0 0/48px 48px,var(--bg)` },
  { id: 'aurora', name: 'Aurora', css: `radial-gradient(700px 420px at 12% 8%,color-mix(in srgb,var(--ac) 28%,transparent),transparent 65%),radial-gradient(800px 520px at 92% 92%,color-mix(in srgb,#7c3aed 24%,transparent),transparent 65%),var(--bg)` },
  { id: 'spot', name: 'Foco', css: `radial-gradient(900px 600px at 50% 0%,color-mix(in srgb,var(--ac) 20%,transparent),transparent 70%),var(--bg)` },
]
const PATTERN_CSS = Object.fromEntries(PATTERNS.map((x) => [x.id, x.css]))

// accent '' = cor padrão do tema
export const DEFAULTS = { version: 1, theme: 'light', accent: '', density: 'normal', anexosPasta: '', anexosPastaComprovante: '', wallpaper: { type: 'none', value: '', dim: 0.5 }, tabs: { order: TABS.map((t) => t[0]), hidden: [] } }

const sysTheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const migrate = (p) => p // ganchos para versões futuras do schema
const fix = (p) => {
  const ids = TABS.map((t) => t[0]), o = p.tabs?.order || []
  return {
    ...DEFAULTS, ...p,
    wallpaper: { ...DEFAULTS.wallpaper, ...p.wallpaper },
    tabs: { order: [...o.filter((i) => ids.includes(i)), ...ids.filter((i) => !o.includes(i))], hidden: (p.tabs?.hidden || []).filter((i) => i !== 'dash' && ids.includes(i)) },
  }
}

export const loadPrefs = () => {
  let p = {}
  try { p = migrate(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) } catch {}
  if (!p.theme) { try { p.theme = localStorage.getItem('fynn-theme') } catch {} }
  p.theme ||= sysTheme()
  return fix(p)
}

export const applyPrefs = (p, persist = true) => {
  const r = document.documentElement, w = p.wallpaper
  r.dataset.theme = p.theme
  r.dataset.density = p.density
  r.dataset.wp = w.type
  if (p.accent) {
    r.style.setProperty('--ac', p.accent)
    r.style.setProperty('--ac2', `color-mix(in srgb, ${p.accent} 82%, #000)`)
  } else {
    r.style.removeProperty('--ac')
    r.style.removeProperty('--ac2')
  }
  r.style.setProperty('--wp-dim', w.dim)
  r.style.setProperty('--wp', w.type === 'image' ? `url("${w.value}") center/cover no-repeat` : w.type === 'none' ? 'transparent' : w.type === 'pattern' ? PATTERN_CSS[w.value] || 'transparent' : w.value)
  if (!persist) return
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); localStorage.setItem('fynn-theme', p.theme) } catch {}
  window.dispatchEvent(new CustomEvent('preferences:changed', { detail: p }))
}

export const readImage = (file, max = 1600) => new Promise((ok, no) => {
  const img = new Image(), u = URL.createObjectURL(file)
  img.onload = () => {
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas')
    c.width = img.width * k; c.height = img.height * k
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.75))
  }
  img.onerror = () => { URL.revokeObjectURL(u); no() }
  img.src = u
})

// ---------- XLSX (aba "Preferências") ----------
const CHUNK = 30000 // limite da célula do Excel: 32767
const split = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)
const okWp = {
  image: /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/,
  color: /^#[0-9a-f]{3,8}$/i,
  gradient: /^linear-gradient\([#0-9a-z%,.\s()-]+\)$/i,
}

export const prefsToRows = (p) => {
  const w = p.wallpaper
  const rows = [['CHAVE', 'VALOR'], ['version', p.version], ['theme', p.theme], ['accent', p.accent], ['density', p.density], ['anexos.pasta', p.anexosPasta || ''], ['anexos.pasta.comprovante', p.anexosPastaComprovante || ''],
    ['tabs.order', p.tabs.order.join(',')], ['tabs.hidden', p.tabs.hidden.join(',')], ['wallpaper.type', w.type], ['wallpaper.dim', w.dim]]
  for (let i = 0, n = 0; i < w.value.length; i += CHUNK, n++) rows.push([`wallpaper.value.${n}`, w.value.slice(i, i + CHUNK)])
  return rows
}

// planilha é entrada não confiável: tudo é validado antes de virar CSS
export const prefsFromRows = (rows) => {
  const m = {}, parts = []
  rows.forEach(([k, v]) => {
    k = String(k ?? '')
    if (k.startsWith('wallpaper.value.')) parts[+k.slice(16)] = String(v ?? '')
    else m[k] = v
  })
  const type = m['wallpaper.type'], value = parts.join(''), dim = parseFloat(m['wallpaper.dim'])
  const valid = type === 'pattern' ? value in PATTERN_CSS : okWp[type]?.test(value)
  return fix(migrate({
    version: Number(m.version) || 1,
    theme: m.theme === 'dark' ? 'dark' : 'light',
    accent: /^#[0-9a-f]{6}$/i.test(m.accent) ? m.accent : '',
    density: m.density === 'compact' ? 'compact' : 'normal',
    anexosPasta: String(m['anexos.pasta'] ?? '').trim().slice(0, 120),
    anexosPastaComprovante: String(m['anexos.pasta.comprovante'] ?? '').trim().slice(0, 120),
    wallpaper: { type: valid ? type : 'none', value: valid ? value : '', dim: Number.isFinite(dim) ? Math.min(0.9, Math.max(0, dim)) : 0.5 },
    tabs: { order: split(m['tabs.order']), hidden: split(m['tabs.hidden']) },
  }))
}
