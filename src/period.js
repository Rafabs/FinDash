const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const nowYM = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
export const PRESETS = [['month', 'Mês'], ['3m', '3 meses'], ['12m', '12 meses'], ['year', 'Ano'], ['all', 'Tudo'], ['custom', 'Personalizado']]
export const defaultPeriod = () => ({ mode: '12m', month: nowYM(), year: new Date().getFullYear(), from: '', to: '' })

export function rangeOf(p) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth()
  switch (p.mode) {
    case 'month': { const ym = p.month || nowYM(); const [yy, mm] = ym.split('-').map(Number); return { from: `${ym}-01`, to: iso(new Date(yy, mm, 0)) } }
    case '3m': return { from: iso(new Date(y, m - 2, 1)), to: iso(now) }
    case '12m': return { from: iso(new Date(y, m - 11, 1)), to: iso(now) }
    case 'year': return { from: `${p.year}-01-01`, to: `${p.year}-12-31` }
    case 'custom': return { from: p.from || '', to: p.to || '' }
    default: return { from: '', to: '' }
  }
}
export const inRange = (d, { from, to }) => (d ? (!from || d >= from) && (!to || d <= to) : !from && !to)

const br = (s) => (s ? s.split('-').reverse().join('/') : '…')
export function labelOf(p) {
  switch (p.mode) {
    case 'month': { const [y, m] = (p.month || nowYM()).split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
    case '3m': return 'Últimos 3 meses'
    case '12m': return 'Últimos 12 meses'
    case 'year': return `Ano ${p.year}`
    case 'custom': return `${br(p.from)} a ${br(p.to)}`
    default: return 'Todo o período'
  }
}
