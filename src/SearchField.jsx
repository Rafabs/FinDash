export default function SearchField({ value, onChange, placeholder, autoFocus = false }) {
  return (
    <div className="search-field">
      <input className="search" autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button type="button" className="search-clear" aria-label="Limpar busca" title="Limpar busca" onClick={() => onChange('')}>×</button>}
    </div>
  )
}
