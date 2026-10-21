// Ordenação de tabelas: asc -> desc -> sem ordenação; vazios sempre por último
const coll = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
export const nextSort = (cur, key) => (!cur || cur.key !== key ? { key, dir: 'asc' } : cur.dir === 'asc' ? { key, dir: 'desc' } : null)
const empty = (v) => v === '' || v == null || (typeof v === 'number' && isNaN(v))

export function sortItems(items, sort, getVal, typeOf = () => 'text') {
  if (!sort) return items
  const t = typeOf(sort.key), m = sort.dir === 'asc' ? 1 : -1
  return [...items].sort((x, y) => {
    const a = getVal(x, sort.key), b = getVal(y, sort.key)
    if (empty(a) && empty(b)) return 0
    if (empty(a)) return 1
    if (empty(b)) return -1
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * m
    if (t === 'date') return (a < b ? -1 : a > b ? 1 : 0) * m
    return coll.compare(String(a), String(b)) * m
  })
}
