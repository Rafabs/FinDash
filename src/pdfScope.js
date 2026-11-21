// Escopo do PDF só de despesas: uma conta/grupo (com os grupos de dentro dele) ou uma categoria de item
import { groupParents, groupPath, totalOf, itemPaid } from './data.js'

const norm = (s) => String(s || '').trim().toLocaleLowerCase()

// opções disponíveis nas despesas informadas
export function scopeOptions(rows) {
  const all = rows || []
  const parents = groupParents(all)
  const names = [...new Set(all.map((r) => String(r.TIPO_CONTA || '').trim()).filter(Boolean))]
  const groups = names.map((name) => ({ name, label: groupPath(name, parents).join(' › ') })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  const cats = [...new Set(all.flatMap((r) => (r.ITENS || []).map((i) => String(i.CATEGORIA || '').trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return { groups, cats }
}

// scope = { kind: 'grupo' | 'categoria', name }; sem scope devolve tudo
export function scopeRows(rows, scope) {
  const all = rows || []
  if (!scope) return all
  const key = norm(scope.name)
  if (scope.kind === 'categoria') {
    return all.flatMap((r) => {
      const itens = (r.ITENS || []).filter((i) => norm(i.CATEGORIA) === key)
      return itens.length ? [{ ...r, ITENS: itens, VALOR: totalOf({ ITENS: itens }) }] : []
    })
  }
  const parents = groupParents(all)
  return all
    .filter((r) => groupPath(String(r.TIPO_CONTA || '').trim(), parents).some((g) => norm(g) === key))
    .map((r) => (norm(r.TIPO_CONTA) === key ? { ...r, PAI: '' } : r)) // o grupo escolhido vira a raiz do relatório
}

export function scopeSummary(rows, currentMonth) {
  let previsto = 0, pago = 0, pendente = 0
  rows.forEach((r) => {
    const p = totalOf(r), g = (r.ITENS || []).reduce((s, i) => s + itemPaid(i, String(r.DATA).slice(0, 7), currentMonth), 0)
    previsto += p; pago += g; pendente += Math.max(0, p - g)
  })
  return { previsto, pago, pendente, count: rows.length }
}
