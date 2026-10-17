import { PRESETS } from './period.js'

export default function PeriodFilter({ period, onChange, years = [] }) {
  const set = (patch) => onChange({ ...period, ...patch })
  const ys = [...new Set([...years, period.year])].sort((a, b) => b - a)
  return (
    <div className="pf">
      <div className="seg">
        {PRESETS.map(([k, l]) => <button key={k} className={period.mode === k ? 'on' : ''} onClick={() => set({ mode: k })}>{l}</button>)}
      </div>
      {period.mode === 'month' && <input type="month" value={period.month} onChange={(e) => e.target.value && set({ month: e.target.value })} />}
      {period.mode === 'year' && <select value={period.year} onChange={(e) => set({ year: Number(e.target.value) })}>{ys.map((y) => <option key={y}>{y}</option>)}</select>}
      {period.mode === 'custom' && (<><input type="date" value={period.from} onChange={(e) => set({ from: e.target.value })} /><span className="muted">até</span><input type="date" value={period.to} onChange={(e) => set({ to: e.target.value })} /></>)}
    </div>
  )
}
