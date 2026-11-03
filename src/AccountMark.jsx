import { iconOf, suggestIcon, glyphColor, DEFAULT_COLOR, NO_ICON } from './icons.js'

// Marca da conta: imagem enviada, ícone genérico sobre a cor escolhida, ou o emoji da conta.
// Sem escolha explícita, sugere um ícone pelo nome da conta (ex.: "Aluguel" -> casa).
export default function AccountMark({ logo, icon, color, name }) {
  const l = String(logo || '')
  if (l.startsWith('data:')) return <span className="acc-mark"><img src={l} alt="" /></span>
  const chosen = iconOf(l) || (l === NO_ICON ? null : suggestIcon(name))
  if (chosen) {
    const bg = color || DEFAULT_COLOR
    return <span className="acc-mark" style={{ background: bg, color: glyphColor(bg) }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: chosen.svg }} />
    </span>
  }
  return <span className="acc-mark acc-emoji" style={color ? { background: color, color: glyphColor(color) } : undefined}>{icon || '🧾'}</span>
}

// Mesma marca, desenhada dentro de um <svg> (eixos dos gráficos do Dashboard).
export function MarkSvg({ logo, icon, color, name, x = 0, y = 0, size = 16 }) {
  const l = String(logo || '')
  if (l.startsWith('data:')) return <image href={l} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
  const chosen = iconOf(l) || (l === NO_ICON ? null : suggestIcon(name))
  const bg = color || (chosen ? DEFAULT_COLOR : '')
  return <g>
    <rect x={x} y={y} width={size} height={size} rx={size * 0.28} fill={bg || 'transparent'} />
    {chosen
      ? <svg x={x + size * 0.21} y={y + size * 0.21} width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke={glyphColor(bg)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: chosen.svg }} />
      : <text x={x + size / 2} y={y + size * 0.74} textAnchor="middle" fontSize={size * 0.62} fill={bg ? glyphColor(bg) : 'currentColor'}>{icon || '🧾'}</text>}
  </g>
}
