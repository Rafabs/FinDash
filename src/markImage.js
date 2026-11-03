import { iconOf, suggestIcon, glyphColor, DEFAULT_COLOR, NO_ICON } from './icons.js'

// Gera o quadradinho da conta (ícone sobre a cor, imagem enviada ou emoji) como PNG, para usar no PDF.
const loadImage = (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src })
function roundedPath(ctx, size, r) {
  ctx.beginPath()
  ctx.moveTo(r, 0); ctx.arcTo(size, 0, size, size, r); ctx.arcTo(size, size, 0, size, r); ctx.arcTo(0, size, 0, 0, r); ctx.arcTo(0, 0, size, 0, r); ctx.closePath()
}
export async function markPng({ logo, icon, color, name }, size = 96) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d'); const radius = size * 0.28
  const l = String(logo || '')
  if (l.startsWith('data:')) { // imagem enviada: cabe dentro do quadrado
    const img = await loadImage(l); if (!img) return null
    ctx.save(); roundedPath(ctx, size, radius); ctx.clip()
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size)
    const k = Math.min(size / img.width, size / img.height)
    ctx.drawImage(img, (size - img.width * k) / 2, (size - img.height * k) / 2, img.width * k, img.height * k)
    ctx.restore()
    return canvas.toDataURL('image/png')
  }
  const chosen = iconOf(l) || (l === NO_ICON ? null : suggestIcon(name))
  const bg = color || (chosen ? DEFAULT_COLOR : '')
  if (bg) { roundedPath(ctx, size, radius); ctx.fillStyle = bg; ctx.fill() }
  if (chosen) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${glyphColor(bg)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${chosen.svg}</svg>`
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
    if (img) ctx.drawImage(img, size * 0.21, size * 0.21, size * 0.58, size * 0.58)
  } else {
    ctx.font = `${size * 0.62}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = bg ? glyphColor(bg) : '#000000'; ctx.fillText(icon || '🧾', size / 2, size / 2 + size * 0.04)
  }
  return canvas.toDataURL('image/png')
}
