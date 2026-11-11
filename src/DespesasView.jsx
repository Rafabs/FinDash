import { useEffect, useMemo, useRef, useState } from 'react'
import PeriodFilter from './PeriodFilter.jsx'
import LancarMes from './LancarMes.jsx'
import PasteDespesas from './PasteDespesas.jsx'
import { totalOf, monthOf, round2, expenseBreakdown, groupParents, groupPath } from './data.js'
import { rangeOf, inRange, labelOf, nowYM } from './period.js'
import { brl } from './Dashboard.jsx'
import MoneyInput from './MoneyInput.jsx'
import { nextSort, sortItems } from './sort.js'
import Pager, { usePageSize } from './Pager.jsx'
import SearchField from './SearchField.jsx'
import IconPicker from './IconPicker.jsx'
import AccountMark from './AccountMark.jsx'
import { ICON_PREFIX, suggestIcon } from './icons.js'

const pct = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
const mesCurto = (k) => k.slice(5) + '/' + k.slice(2, 4)
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const dataCurta = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : ''
const confirmInstallmentPayment = (item, row) => {
  const paid = Math.min(Number(item.VALOR) || 0, Number(item.PARCELAMENTO?.valorPago) || 0)
  const remaining = Math.max(0, (Number(item.VALOR) || 0) - paid)
  return confirm(`Confirmar a baixa da parcela ${item.PARCELAMENTO?.numero}/${item.PARCELAMENTO?.quantidade}?\n${item.NOME || 'Parcela'} · ${mesCurto(monthOf(row.DATA))}\nValor a quitar: ${brl(remaining)}\nO pagamento será registrado hoje.`)
}

function InstallmentModal({ accounts, initialYM, initialAccount = 'CARTÃO DE CRÉDITO', catByName, onClose, onSave }) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [account, setAccount] = useState(initialAccount)
  const [total, setTotal] = useState('')
  const [count, setCount] = useState('2')
  const [firstMonth, setFirstMonth] = useState(initialYM)
  const n = Math.max(2, Math.min(120, Number(count) || 0))
  const amount = Number(String(total).replace(',', '.'))
  const save = () => {
    if (!description.trim() || !account.trim() || total === '' || !Number.isFinite(amount) || amount === 0 || !firstMonth || n < 2) return
    const cents = Math.round(amount * 100), base = Math.floor(cents / n), remainder = cents - base * n
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const rows = Array.from({ length: n }, (_, i) => {
      const date = new Date(Number(firstMonth.slice(0, 4)), Number(firstMonth.slice(5, 7)) - 1 + i, 1)
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const value = (base + (i < remainder ? 1 : 0)) / 100
      return { DATA: `${ym}-01`, TIPO_CONTA: account.trim(), ITENS: [{ NOME: `${description.trim()} (${i + 1}/${n})`, VALOR: value, ...(category.trim() ? { CATEGORIA: category.trim() } : {}), PARCELAMENTO: { id, numero: i + 1, quantidade: n, valorPago: 0 } }] }
    })
    onSave(rows)
  }
  return <div className="overlay" onClick={onClose}><div className="modal installment-modal" onClick={(e) => e.stopPropagation()}>
    <h3>＋ Nova despesa parcelada</h3><p className="muted">O valor total será dividido entre os meses (faturas do cartão, parcelas de financiamento, mensalidades, seguros…) na conta que você escolher. Use valor negativo para um abatimento parcelado (estorno, desconto).</p>
    <div className="account-name-field">
      <label>Descrição da compra</label><input className="cell" autoFocus placeholder="Ex.: Notebook, Seguro do carro, IPTU" value={description} onChange={(e) => { const v = e.target.value; setDescription(v); if (!category && catByName?.get(v.trim().toLowerCase())) setCategory(catByName.get(v.trim().toLowerCase())) }} />
      <label>Categoria (opcional)</label><input className="cell" list="dl-categorias" placeholder="Ex.: Compras Online" value={category} onChange={(e) => setCategory(e.target.value)} />
      <label>Conta (grupo)</label><input className="cell" list="installment-accounts" value={account} onChange={(e) => setAccount(e.target.value)} /><datalist id="installment-accounts">{accounts.map((a) => <option key={a.name} value={a.name} />)}</datalist>
      <label>Valor total</label><MoneyInput value={total} onChange={setTotal} />
      <label>Quantidade de parcelas</label><input className="cell" type="number" min="2" max="120" value={count} onChange={(e) => setCount(e.target.value)} />
      <label>Mês da primeira parcela</label><input className="cell" type="month" value={firstMonth} onChange={(e) => setFirstMonth(e.target.value)} />
    </div>
    {amount !== 0 && Number.isFinite(amount) && n >= 2 && <p className="hint">{n} parcelas · {amount < 0 ? 'abatimento de ' : ''}aproximadamente {brl(round2(amount / n))} por mês · total {brl(amount)}</p>}
    <div className="actions"><button className="sec" onClick={onClose}>Cancelar</button><button disabled={!description.trim() || !account.trim() || total === '' || !Number.isFinite(amount) || amount === 0 || n < 2 || !firstMonth} onClick={save}>Criar parcelas</button></div>
  </div></div>
}

// Campo "Dentro do grupo": confirma ao sair do campo ou com Enter; volta ao valor anterior se for recusado
function ParentField({ value, onCommit }) {
  const [v, setV] = useState(value || '')
  useEffect(() => setV(value || ''), [value])
  const commit = () => { if (v.trim() !== (value || '') && onCommit(v.trim()) === false) setV(value || '') }
  return <input className="cell" list="dl-contas" placeholder="Dentro do grupo… (opcional)" title="Coloque este grupo dentro de outro grupo (deixe vazio para ser um grupo principal)" style={{ marginTop: 4 }} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
}

// Totais de uma lista de despesas {it, ym, g}: pago = parcela: valor já baixado / demais: pago se o mês já chegou
function summarizeExpenses(list, currentMonth) {
  const by = new Map(), groups = new Set()
  let total = 0, pago = 0, pend = 0, fut = 0, abertas = 0, abertasValor = 0
  list.forEach(({ it, ym, g }) => {
    const v = Number(it.VALOR) || 0, nm = String(it.NOME || '').trim() || '(Sem descrição)'
    const futuro = ym > currentMonth
    const pg = it.PARCELAMENTO ? Math.min(v, Number(it.PARCELAMENTO.valorPago) || 0) : futuro ? 0 : v
    const pd = Math.max(0, v - pg)
    total += v; pago += pg; pend += pd
    if (futuro) fut += pd
    if (it.PARCELAMENTO && pd > 0) { abertas++; abertasValor += pd }
    if (g) groups.add(g)
    const e = by.get(nm) || { name: nm, total: 0, count: 0 }
    e.total += v; e.count++; by.set(nm, e)
  })
  return { total: round2(total), pago: round2(pago), pend: round2(pend), fut: round2(fut), abertas, abertasValor: round2(abertasValor), nGroups: groups.size, n: list.length, names: [...by.values()].map((e) => ({ ...e, total: round2(e.total) })).sort((x, y) => Math.abs(y.total) - Math.abs(x.total)) }
}

function ItemsModal({ row, onSave, onClose, catByName }) {
  const [items, setItems] = useState(row.ITENS.map((i) => ({ ...i })))
  const up = (j, p) => setItems((x) => x.map((it, k) => (k === j ? { ...it, ...p } : it)))
  const clean = items.filter((i) => i.VALOR !== '' && !isNaN(Number(i.VALOR))).map(({ CATEGORIA, ...i }) => {
    const categoria = String(CATEGORIA || '').trim()
    return { ...i, NOME: String(i.NOME).trim(), VALOR: round2(i.VALOR), ...(categoria ? { CATEGORIA: categoria } : {}) }
  })
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{row.TIPO_CONTA} · {mesCurto(monthOf(row.DATA))}</h3>
        <div className="slot-items">
          {items.map((it, j) => (
            <div className="it" key={j}>
              <input className="cell" placeholder="Descrição" value={it.NOME} onChange={(e) => up(j, { NOME: e.target.value, ...(!it.CATEGORIA && catByName?.get(e.target.value.trim().toLowerCase()) ? { CATEGORIA: catByName.get(e.target.value.trim().toLowerCase()) } : {}) })} />
              <input className="cell" list="dl-categorias" placeholder="Categoria (opcional)" style={{ minWidth: 150 }} value={it.CATEGORIA || ''} onChange={(e) => up(j, { CATEGORIA: e.target.value })} />
              <MoneyInput value={it.VALOR} onChange={(v) => up(j, { VALOR: v })} />
              {it.PARCELAMENTO && <label className="installment-paid-field">Pago neste mês<MoneyInput value={String(it.PARCELAMENTO.valorPago || 0)} onChange={(v) => up(j, { PARCELAMENTO: { ...it.PARCELAMENTO, valorPago: round2(Math.max(0, Math.min(Number(it.VALOR) || 0, Number(v) || 0))), dataPagamento: Number(v) > 0 ? hojeISO() : '' } })} />{it.PARCELAMENTO.dataPagamento && <small>Baixada em {dataCurta(it.PARCELAMENTO.dataPagamento)}</small>}<button type="button" className="sec sm" disabled={Number(it.PARCELAMENTO.valorPago) >= Number(it.VALOR)} onClick={() => confirmInstallmentPayment(it, row) && up(j, { PARCELAMENTO: { ...it.PARCELAMENTO, valorPago: round2(Number(it.VALOR) || 0), dataPagamento: hojeISO() } })}>✓ {Number(it.PARCELAMENTO.valorPago) > 0 ? 'Quitar restante hoje' : 'Dar baixa hoje'}</button></label>}
              {items.length > 1 && <button className="icon" onClick={() => setItems((x) => x.filter((_, k) => k !== j))}>✕</button>}
            </div>
          ))}
          <button className="sec sm" onClick={() => setItems((x) => [...x, { NOME: '', VALOR: '' }])}>+ item</button>
        </div>
        <p className="hint">Total: <b>{brl(totalOf({ ITENS: clean }))}</b></p>
        <div className="actions">
          <button className="sec" onClick={onClose}>Cancelar</button>
          <button disabled={!clean.length} onClick={() => onSave(clean)}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function DespesasView({ rows, accounts = [], onAddAccount, onUpdateAccount, period, setPeriod, onUpdate, onDelete, onMoveItem, onSaveMonth, onAddRows }) {
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [view, setView] = useState('lista')
  const [lancar, setLancar] = useState(null)
  const [editing, setEditing] = useState(null)
  const [sort, setSort] = useState(null)
  const [size, setSize] = usePageSize()
  const [mxSort, setMxSort] = useState(null)
  const [pasting, setPasting] = useState(null) // texto colado (abre o modal de colagem)
  const [openRows, setOpenRows] = useState(() => new Set()) // linhas abertas pelo lápis
  const [selected, setSelected] = useState(() => new Set())
  const [locked, setLocked] = useState(true)
  const [dragSource, setDragSource] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [moveMessage, setMoveMessage] = useState('')
  const [heroDetail, setHeroDetail] = useState(null)
  const [accountPage, setAccountPage] = useState(null)
  const [newAccount, setNewAccount] = useState(false)
  const [installmentModal, setInstallmentModal] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountIcon, setAccountIcon] = useState('🧾')
  const [accountLogo, setAccountLogo] = useState('')
  const logoInput = useRef(null)
  const [accountColor, setAccountColor] = useState('')
  const [picker, setPicker] = useState(null) // 'new' (criando conta) | 'current' (conta aberta)
  const [quickItem, setQuickItem] = useState('')
  const [quickCat, setQuickCat] = useState('')
  const [quickValue, setQuickValue] = useState('')
  const [quickMonth, setQuickMonth] = useState(nowYM())
  const range = useMemo(() => rangeOf(period), [period])
  const years = useMemo(() => [...new Set(rows.map((r) => Number(r.DATA.slice(0, 4))))], [rows])
  const types = useMemo(() => {
    const c = {}; rows.forEach((r) => (c[r.TIPO_CONTA] = (c[r.TIPO_CONTA] || 0) + 1))
    return Object.keys(c).sort((a, b) => c[b] - c[a])
  }, [rows])

  const parents = useMemo(() => groupParents(rows), [rows])
  // categoria mais recente usada para cada descrição (sugestão automática) e lista de categorias
  const { catByName, catList } = useMemo(() => {
    const map = new Map(), all = new Set()
    ;[...rows].sort((a, b) => String(a.DATA).localeCompare(String(b.DATA))).forEach((r) => r.ITENS.forEach((it) => {
      const c = String(it.CATEGORIA || '').trim()
      if (c) {
        all.add(c)
        const nm = String(it.NOME || '').trim().toLowerCase()
        map.set(nm, c)
        const base = nm.replace(/\s*\(\d+\/\d+\)$/, '') // "notebook (3/6)" também sugere para "notebook"
        if (base && base !== nm) map.set(base, c)
      }
    }))
    return { catByName: map, catList: [...all].sort((a, b) => a.localeCompare(b)) }
  }, [rows])
  const setParent = (group, parent) => {
    const name = String(group || '').trim(), p = String(parent || '').trim()
    if (p && p === name) { setMoveMessage('Um grupo não pode ficar dentro dele mesmo.'); return false }
    if (p && groupPath(p, parents).includes(name)) { setMoveMessage(`“${p}” já está dentro de “${name}”.`); return false }
    rows.forEach((r, k) => { if (String(r.TIPO_CONTA || '').trim() === name && String(r.PAI || '') !== p) onUpdate(k, { PAI: p }) })
    setMoveMessage(p ? `“${name}” agora está dentro de “${p}”.` : `“${name}” voltou a ser um grupo principal.`)
    return true
  }

  const currentMonth = nowYM()
  const includeFuture = !range.to || range.to.slice(0, 7) >= currentMonth
  const base = useMemo(() => rows.map((r, i) => ({ r, i })).filter(({ r }) => inRange(r.DATA, range) || (includeFuture && monthOf(r.DATA) > currentMonth)), [rows, range, includeFuture, currentMonth])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return base
      .filter(({ r }) => !cats.length || cats.includes(r.TIPO_CONTA))
      .map(({ r, i }) => {
        const groupMatches = !!s && groupPath(String(r.TIPO_CONTA || '').trim(), parents).join(' ').toLowerCase().includes(s)
        const items = r.ITENS
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => !s || groupMatches || String(item.NOME || '').toLowerCase().includes(s) || String(item.CATEGORIA || '').toLowerCase().includes(s))
        return { r, i, items, total: totalOf({ ITENS: items.map(({ item }) => item) }) }
      })
      .filter(({ r, items }) => items.length > 0 || (!s && r.ITENS.length === 0)) // mantém grupos vazios visíveis (alvo de arrastar)
      .sort((a, b) => b.r.DATA.localeCompare(a.r.DATA) || a.r.TIPO_CONTA.localeCompare(b.r.TIPO_CONTA) || a.i - b.i)
  }, [base, cats, q, parents])

  // resultado da busca: total das despesas encontradas (no período e em todo o histórico)
  const searchSummary = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return null
    const summarize = (list) => summarizeExpenses(list, currentMonth)
    const hit = (r, it) => groupPath(String(r.TIPO_CONTA || '').trim(), parents).join(' ').toLowerCase().includes(s) || String(it.NOME || '').toLowerCase().includes(s) || String(it.CATEGORIA || '').toLowerCase().includes(s)
    return {
      period: summarize(filtered.flatMap(({ r, items }) => items.map(({ item }) => ({ it: item, ym: monthOf(r.DATA), g: r.TIPO_CONTA })))),
      all: summarize(rows.filter((r) => !cats.length || cats.includes(r.TIPO_CONTA)).flatMap((r) => r.ITENS.filter((it) => hit(r, it)).map((it) => ({ it, ym: monthOf(r.DATA), g: r.TIPO_CONTA })))),
    }
  }, [q, filtered, rows, cats, parents, currentMonth])

  const sorted = useMemo(() => sortItems(filtered, sort, (x, k) => (k === 'TOTAL' ? x.total : x.r[k]), (k) => (k === 'DATA' ? 'date' : k === 'TOTAL' ? 'money' : 'text')), [filtered, sort])

  // indicadores do que está filtrado (período, grupos marcados e busca)
  const filterStats = useMemo(() => summarizeExpenses(filtered.flatMap(({ r, items }) => items.map(({ item }) => ({ it: item, ym: monthOf(r.DATA), g: r.TIPO_CONTA }))), currentMonth), [filtered, currentMonth])
  // indicadores das linhas marcadas nas caixinhas (valem para todas as páginas; com busca ativa, só os itens encontrados)
  const selectionStats = useMemo(() => {
    if (!selected.size) return null
    const byIndex = new Map(filtered.map((entry) => [entry.i, entry]))
    const list = []
    selected.forEach((i) => {
      const r = rows[i]; if (!r) return
      const items = byIndex.has(i) ? byIndex.get(i).items.map(({ item }) => item) : r.ITENS
      items.forEach((it) => list.push({ it, ym: monthOf(r.DATA), g: r.TIPO_CONTA }))
    })
    return summarizeExpenses(list, currentMonth)
  }, [selected, filtered, rows, currentMonth])
  const cardStats = selectionStats || filterStats
  const detailRows = useMemo(() => q.trim()
    ? filtered.map(({ r, items }) => ({ ...r, ITENS: items.map(({ item }) => item) }))
    : base.map(({ r }) => r), [base, filtered, q])
  const breakdown = useMemo(() => expenseBreakdown(detailRows, parents), [detailRows, parents])
  const stat = useMemo(() => {
    const summaryRows = q.trim() ? filtered : base
    const meses = new Set(summaryRows.filter(({ r }) => monthOf(r.DATA) <= currentMonth).map(({ r }) => monthOf(r.DATA)))
    const cnt = {}
    summaryRows.forEach(({ r }) => { cnt[r.TIPO_CONTA] = (cnt[r.TIPO_CONTA] || 0) + 1 })
    const currentRows = summaryRows.filter(({ r }) => monthOf(r.DATA) <= currentMonth)
    const futureRows = summaryRows.filter(({ r }) => monthOf(r.DATA) > currentMonth)
    const total = breakdown.reduce((s, group) => s + group.total, 0)
    const itemsOf = (entry) => entry.items ? entry.items.map(({ item }) => item) : entry.r.ITENS
    const paidAheadOf = (entry) => itemsOf(entry).reduce((s, item) => {
      const installment = item.PARCELAMENTO
      return s + (installment?.dataPagamento && installment.dataPagamento.slice(0, 7) < monthOf(entry.r.DATA)
        ? Math.min(Number(item.VALOR) || 0, Number(installment.valorPago) || 0) : 0)
    }, 0)
    const pendingOf = (entry) => itemsOf(entry).reduce((s, item) => {
      const value = Number(item.VALOR) || 0
      return s + (value < 0 ? value : Math.max(0, value - (Number(item.PARCELAMENTO?.valorPago) || 0)))
    }, 0)
    const periodTotal = currentRows.reduce((s, entry) => s + (entry.total ?? totalOf(entry.r)), 0) + futureRows.reduce((s, entry) => s + paidAheadOf(entry), 0)
    const futureTotal = futureRows.reduce((s, entry) => s + pendingOf(entry), 0)
    const futureCount = futureRows.filter((entry) => pendingOf(entry) > 0).length
    return { total, periodTotal, futureTotal, futureCount, nMeses: meses.size, cnt, list: breakdown.map((group) => [group.name, group.total]) }
  }, [base, breakdown, filtered, q, currentMonth])
  const top = breakdown.slice(0, 5)
  const remaining = breakdown.slice(5)
  const resto = remaining.reduce((s, group) => s + group.total, 0)
  const segs = [...top.map((group) => [group.name, group.total]), ...(resto ? [['Demais', resto]] : [])]
  const pos = stat.total
  const detailGroup = heroDetail?.type === 'group' ? breakdown.find((group) => group.name === heroDetail.name) : null

  useEffect(() => setPage(0), [period, cats, q, sort, size])
  const pages = Math.max(1, Math.ceil(sorted.length / size))
  const cur = Math.min(page, pages - 1)
  const slice = sorted.slice(cur * size, cur * size + size)
  const toggleOpen = (g) => setOpenRows((x) => { const n = new Set(x); n.has(g) ? n.delete(g) : n.add(g); return n })
  const del = (g) => { if (!locked) { setOpenRows(new Set()); onDelete(g) } }
  const allSelected = slice.length > 0 && slice.every(({ i }) => selected.has(i))
  const deleteSelected = () => { const ids = [...selected].sort((a, b) => b - a); if (!locked && ids.length && confirm(`Excluir ${ids.length} itens selecionados?`)) { ids.forEach(del); setSelected(new Set()) } }
  const canDropOn = (from, to) => !locked && from != null && from.row !== to &&
    rows[from.row] && rows[from.row].ITENS[from.item] && rows[to] &&
    monthOf(rows[from.row].DATA) === monthOf(rows[to].DATA)
  const dropItem = (to) => {
    if (!canDropOn(dragSource, to)) {
      if (dragSource && dragSource.row !== to) setMoveMessage('Solte em outro grupo do mesmo mês.')
      return
    }
    const item = rows[dragSource.row].ITENS[dragSource.item]
    const target = rows[to]
    onMoveItem(dragSource.row, dragSource.item, to)
    setMoveMessage(`“${item.NOME || 'Despesa'}” movida para ${target.TIPO_CONTA}.`)
    setDragSource(null)
    setDragOver(null)
  }
  const toggleLock = () => {
    setLocked((value) => !value)
    setOpenRows(new Set())
    setDragSource(null)
    setDragOver(null)
    setMoveMessage('')
  }
  const th = (k, label, right, cur, set) => (
    <th key={k} className={'sortable' + (right ? ' r' : '') + (cur?.key === k ? ' on' : '')} onClick={() => set((s) => nextSort(s, k))} title="Clique para ordenar">
      {label}<i className="si">{cur?.key === k ? (cur.dir === 'asc' ? '▲' : '▼') : '↕'}</i>
    </th>
  )
  const toggle = (c) => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  // matriz conta x mês (últimos 24 meses do período)
  const matrix = useMemo(() => {
    if (view !== 'matriz') return null
    const all = [...new Set(filtered.map(({ r }) => monthOf(r.DATA)))].sort()
    const months = all.slice(-24)
    const m = {}
    filtered.forEach(({ r, total }) => { const k = monthOf(r.DATA); if (!months.includes(k)) return; (m[r.TIPO_CONTA] ||= {})[k] = (m[r.TIPO_CONTA][k] || 0) + total })
    const lines = Object.entries(m).map(([t, v]) => ({ t, v, tot: Object.values(v).reduce((a, b) => a + b, 0), max: Math.max(...Object.values(v)) })).sort((a, b) => b.tot - a.tot)
    const colTot = Object.fromEntries(months.map((k) => [k, lines.reduce((s, l) => s + (l.v[k] || 0), 0)]))
    return { months, lines, colTot, cut: all.length > 24 }
  }, [filtered, view])

  const nextYM = nowYM()

  // Ctrl+V fora de um campo abre a colagem de despesas
  useEffect(() => {
    if (locked || lancar || editing != null || pasting !== null) return
    const h = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const t = e.clipboardData?.getData('text')
      if (t && t.trim()) { e.preventDefault(); setPasting(t) }
    }
    window.addEventListener('paste', h)
    return () => window.removeEventListener('paste', h)
  }, [locked, lancar, editing, pasting])
  const mxLines = useMemo(() => (matrix ? sortItems(matrix.lines, mxSort, (l, k) => (k === 't' ? l.t : k === 'tot' ? l.tot : l.v[k]), (k) => (k === 't' ? 'text' : 'money')) : []), [matrix, mxSort])

  const accountCards = useMemo(() => {
    const known = new Map(accounts.map((a) => [a.name.toLocaleLowerCase(), a]))
    rows.forEach((r) => { const name = String(r.TIPO_CONTA || '').trim(); if (name && !known.has(name.toLocaleLowerCase())) known.set(name.toLocaleLowerCase(), { name, icon: '🧾' }) })
    return [...known.values()].map((a) => {
      const accountRows = rows.filter((r) => String(r.TIPO_CONTA || '').toLocaleLowerCase() === a.name.toLocaleLowerCase())
      return { ...a, count: accountRows.length, total: accountRows.reduce((s, r) => s + totalOf(r), 0) }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [accounts, rows])
  const currentAccount = accountCards.find((a) => a.name.toLocaleLowerCase() === accountPage?.toLocaleLowerCase())
  const currentRows = currentAccount ? rows.map((r, i) => ({ r, i })).filter(({ r }) => String(r.TIPO_CONTA || '').toLocaleLowerCase() === currentAccount.name.toLocaleLowerCase()).sort((a, b) => b.r.DATA.localeCompare(a.r.DATA)) : []
  const createAccount = () => {
    const name = accountName.trim()
    if (!name) return
    if (accountCards.some((a) => a.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      if (accountLogo || accountColor) onUpdateAccount({ name, icon: accountIcon || '🧾', ...(accountLogo ? { logo: accountLogo } : {}), ...(accountColor ? { color: accountColor } : {}) })
      setAccountPage(name); setNewAccount(false); return
    }
    onAddAccount({ name, icon: accountIcon || '🧾', logo: accountLogo || (suggestIcon(name) ? ICON_PREFIX + suggestIcon(name).id : ''), ...(accountColor ? { color: accountColor } : {}) })
    setAccountName(''); setAccountIcon('🧾'); setAccountLogo(''); setAccountColor(''); setNewAccount(false); setAccountPage(name)
  }
  const readLogo = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Escolha um arquivo de imagem.'); return }
    let svgUrl = ''
    try {
      let bitmap
      if (file.type === 'image/svg+xml') { // SVG é desenhado por <img> e convertido em imagem (WebP) como os demais
        svgUrl = URL.createObjectURL(file)
        const img = new Image(); img.src = svgUrl; await img.decode()
        bitmap = { source: img, width: img.naturalWidth || 512, height: img.naturalHeight || 512 }
        if (bitmap.width < 512 && bitmap.height < 512) { const k = 512 / Math.max(bitmap.width, bitmap.height); bitmap.width = Math.round(bitmap.width * k); bitmap.height = Math.round(bitmap.height * k) }
      } else { const b = await createImageBitmap(file); bitmap = { source: b, width: b.width, height: b.height, close: () => b.close() } }
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      canvas.getContext('2d').drawImage(bitmap.source, 0, 0, canvas.width, canvas.height)
      bitmap.close?.()
      const logo = canvas.toDataURL('image/webp', 0.82)
      if (accountPage && currentAccount) onUpdateAccount({ name: currentAccount.name, icon: currentAccount.icon || '🧾', logo })
      else setAccountLogo(logo)
    } catch { alert('Não foi possível carregar essa imagem. Tente PNG, JPG, WebP ou SVG.') }
    finally { if (svgUrl) URL.revokeObjectURL(svgUrl) }
  }
  const addToAccount = () => {
    const value = Number(String(quickValue).replace(',', '.'))
    if (!quickItem.trim() || !Number.isFinite(value) || !quickMonth) return
    onAddRows([{ DATA: quickMonth + '-01', TIPO_CONTA: currentAccount.name, ITENS: [{ NOME: quickItem.trim(), VALOR: round2(value), ...((quickCat.trim() || catByName.get(quickItem.trim().toLowerCase())) ? { CATEGORIA: quickCat.trim() || catByName.get(quickItem.trim().toLowerCase()) } : {}) }] }])
    setQuickItem(''); setQuickValue(''); setQuickCat('')
  }
  const markInstallmentPaid = (rowIndex, itemIndex) => {
    if (locked) return
    const row = rows[rowIndex]
    const item = row?.ITENS?.[itemIndex]
    if (!item?.PARCELAMENTO) return
    if (Number(item.PARCELAMENTO.valorPago) >= Number(item.VALOR)) return
    if (!confirmInstallmentPayment(item, row)) return
    const ITENS = row.ITENS.map((current, index) => index === itemIndex
      ? { ...current, PARCELAMENTO: { ...current.PARCELAMENTO, valorPago: round2(Number(current.VALOR) || 0), dataPagamento: hojeISO() } }
      : current)
    onUpdate(rowIndex, { ITENS })
  }

  const isCardAccount = /cart[aã]o|cr[eé]dit/i.test(currentAccount?.name || '')
  // o mesmo seletor aparece na tela da conta e na lista de contas (sempre por cima do que estiver aberto)
  const iconPicker = picker && <IconPicker
    logo={picker === 'new' ? accountLogo : currentAccount?.logo} color={picker === 'new' ? accountColor : currentAccount?.color}
    name={picker === 'new' ? accountName : currentAccount?.name} icon={picker === 'new' ? accountIcon : currentAccount?.icon}
    onClose={() => setPicker(null)}
    onChange={(patch) => {
      if (picker === 'new') { if (patch.logo !== undefined) setAccountLogo(patch.logo); if (patch.color !== undefined) setAccountColor(patch.color) }
      else if (currentAccount) onUpdateAccount({ name: currentAccount.name, icon: currentAccount.icon || '🧾', ...patch })
    }} />
  const categoryDatalist = <datalist id="dl-categorias">{catList.map((c) => <option key={c} value={c} />)}</datalist>

  if (accountPage) return (
    <section className="expense-account-page">
      <div className="expense-account-page-nav"><button className="sec" onClick={() => setAccountPage(null)}>← Todas as contas</button><button className={'sec lock' + (locked ? '' : ' open')} onClick={toggleLock}>{locked ? '🔒 Edição travada' : '🔓 Edição liberada'}</button></div>
      <div className="expense-account-hero card">
        <button type="button" className="expense-account-brand" onClick={() => !locked && logoInput.current?.click()} title={locked ? 'Destrave a edição para alterar a logo' : 'Adicionar ou trocar logo'} disabled={locked}>
          <AccountMark logo={currentAccount?.logo} icon={currentAccount?.icon} color={currentAccount?.color} name={currentAccount?.name} />
          <small>Enviar imagem</small>
        </button>
        <button type="button" className="sec sm" disabled={locked} title={locked ? 'Destrave a edição para alterar o ícone' : 'Escolher o ícone e a cor de fundo'} onClick={() => setPicker('current')}>🎨 Ícone e cor</button>
        <input ref={logoInput} className="expense-logo-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { readLogo(e.target.files?.[0]); e.target.value = '' }} />
        <div className="expense-account-title"><small className="muted">SUBPÁGINA DA CONTA</small><h2>{currentAccount?.name || accountPage}</h2><p className="muted">Acompanhe os lançamentos e valores desta conta em um só lugar.</p></div>
        <div className="expense-account-total"><small>Total histórico</small><b>{brl(currentAccount?.total || 0)}</b><small>{currentAccount?.count || 0} lançamentos</small></div>
      </div>
      <section className="card expense-quick-add">
        <div><h3>＋ Novo lançamento</h3><p className="muted">Adicione uma despesa diretamente nesta conta.</p></div>
        <label>Mês<input type="month" value={quickMonth} onChange={(e) => setQuickMonth(e.target.value)} /></label>
        <label>Descrição<input className="cell" placeholder="Ex.: Plano de internet" value={quickItem} onChange={(e) => setQuickItem(e.target.value)} /></label>
        <label>Categoria<input className="cell" list="dl-categorias" placeholder="Ex.: Compras Online (opcional)" value={quickCat} onChange={(e) => setQuickCat(e.target.value)} /></label>
        <label>Valor<MoneyInput value={quickValue} onChange={setQuickValue} /></label>
        <button disabled={locked || !quickItem.trim() || quickValue === ''} title={locked ? 'Destrave a edição para adicionar despesas' : ''} onClick={addToAccount}>Adicionar à conta</button>
      </section>
      <section className="card expense-quick-add"><div><h3>{isCardAccount ? '💳 Compra parcelada' : '🗓️ Despesa parcelada'}</h3><p className="muted">{isCardAccount ? 'Distribua uma compra entre as faturas mensais deste cartão.' : 'Divida uma despesa em parcelas mensais nesta conta (financiamento, mensalidade, seguro, IPTU…).'}</p></div><button disabled={locked} title={locked ? 'Destrave a edição para adicionar despesas' : ''} onClick={() => setInstallmentModal(true)}>{isCardAccount ? '＋ Nova compra parcelada' : '＋ Nova despesa parcelada'}</button></section>
      <section className="panel expense-history-panel">
        <div className="panel-head"><div><h3>Histórico</h3><small className="muted">Todos os lançamentos de {currentAccount?.name || accountPage}</small></div><span className="expense-history-count">{currentRows.length} registro{currentRows.length === 1 ? '' : 's'}</span></div>
        <div className="wrap"><table className="rt"><thead><tr><th>Mês</th><th>Despesas</th><th>Total</th></tr></thead><tbody>
          {currentRows.map(({ r, i }) => <tr key={i}><td className="ro"><span className="expense-history-month">{monthOf(r.DATA).split('-').reverse().join('/')}</span></td><td><div className="account-history-items">{r.ITENS.map((it, j) => {
            const paid = Math.min(Number(it.VALOR) || 0, Number(it.PARCELAMENTO?.valorPago) || 0)
            const credit = (Number(it.VALOR) || 0) < 0
            const unpaid = it.PARCELAMENTO && !credit && paid < (Number(it.VALOR) || 0)
            return <div className="account-history-item" key={j}><span className="chip na">{it.NOME || 'Despesa'} · {brl(Number(it.VALOR) || 0)}</span>{it.PARCELAMENTO && <div className="installment-row-action"><small>{credit ? 'Abatimento · sem baixa' : unpaid ? `Pendente · ${brl((Number(it.VALOR) || 0) - paid)}` : `✓ Paga${it.PARCELAMENTO.dataPagamento ? ` em ${dataCurta(it.PARCELAMENTO.dataPagamento)}` : ''}`}</small><button type="button" className="sec sm" disabled={locked || !unpaid} title={locked ? 'Destrave a edição para dar baixa' : ''} onClick={() => markInstallmentPaid(i, j)}>{paid ? 'Quitar restante hoje' : 'Dar baixa hoje'}</button></div>}</div>
          })}</div></td><td className="ro"><b>{brl(totalOf(r))}</b></td></tr>)}
          {!currentRows.length && <tr><td colSpan="3" className="empty">Ainda não há lançamentos. Adicione o primeiro acima.</td></tr>}
        </tbody></table></div>
      </section>
      {installmentModal && <InstallmentModal accounts={accountCards} catByName={catByName} initialYM={nextYM} initialAccount={currentAccount?.name} onClose={() => setInstallmentModal(false)} onSave={(novas) => { onAddRows(novas); setInstallmentModal(false) }} />}
      {categoryDatalist}
      {iconPicker}
    </section>
  )

  return (
    <>
      <section className="expense-accounts-section">
        <div className="expense-accounts-heading"><div><h2>Contas</h2><p className="muted">Abra uma subpágina para acompanhar cada conta. Os lançamentos ficam integrados às Despesas.</p></div><button disabled={locked} title={locked ? 'Destrave a edição para criar uma conta' : ''} onClick={() => setNewAccount(true)}>＋ Criar subpágina</button></div>
        <div className="expense-account-grid">
          {accountCards.map((a) => <button type="button" className="expense-account-card card" key={a.name} onClick={() => setAccountPage(a.name)}><span className="expense-account-icon"><AccountMark logo={a.logo} icon={a.icon} color={a.color} name={a.name} /></span><span className="expense-account-card-info"><b>{a.name}</b><small>{a.count} lançamentos</small></span><strong>{brl(a.total)}</strong><span className="expense-account-arrow">→</span></button>)}
          {!accountCards.length && <div className="empty">Nenhuma conta criada ainda. Crie uma subpágina para começar.</div>}
        </div>
      </section>
      {categoryDatalist}
      {newAccount && <div className="overlay" onClick={() => setNewAccount(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><h3>Criar subpágina de conta</h3><p className="muted">Personalize a conta com um ícone ou uma imagem e adicione os lançamentos quando quiser.</p><div className="account-create-fields"><button type="button" className="account-logo-picker" onClick={() => logoInput.current?.click()}><AccountMark logo={accountLogo} icon={accountIcon} color={accountColor} name={accountName} /><small>{accountLogo ? 'Trocar imagem' : '＋ Enviar imagem'}</small></button><button type="button" className="sec sm" onClick={() => setPicker('new')}>🎨 Ícone e cor</button><input ref={logoInput} className="expense-logo-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { readLogo(e.target.files?.[0]); e.target.value = '' }} /><div className="account-name-field"><label>Nome da conta</label><input className="cell" autoFocus placeholder="Ex.: VIVO (INTERNET)" value={accountName} onChange={(e) => setAccountName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createAccount()} /><label>Ícone alternativo</label><input className="cell" aria-label="Ícone da conta" value={accountIcon} maxLength={4} onChange={(e) => setAccountIcon(e.target.value)} /></div></div><div className="actions"><button className="sec" onClick={() => setNewAccount(false)}>Cancelar</button><button disabled={!accountName.trim()} onClick={createAccount}>Criar subpágina</button></div></div></div>}
      {iconPicker}
      <section className="hero">
        <div className="hero-main">
          <small>{q.trim() ? 'Total encontrado' : stat.futureCount ? 'Período + despesas futuras' : 'Despesas no período'}</small>
          <strong>{brl(stat.total)}</strong>
          <div className="pills">
            <span className="pill">Até hoje <b>{brl(stat.periodTotal)}</b></span>
            <span className="pill">Futuras em aberto · {stat.futureCount} contas <b>{brl(stat.futureTotal)}</b></span>
            <span className="pill">Média/mês <b>{brl(stat.nMeses ? stat.periodTotal / stat.nMeses : 0)}</b></span>
            {stat.list[0] && <span className="pill">Maior: <b>{stat.list[0][0]}</b></span>}
          </div>
          <div className="pills dim"><span>{labelOf(period)} até o mês atual, mais os lançamentos futuros</span></div>
        </div>
        <div className="hero-alloc">
          <small>Por grupo</small>
          <div className="bar">{segs.map(([n, v], i) => <i key={n} className={'c' + i} style={{ width: pos > 0 ? (Math.max(v, 0) / pos) * 100 + '%' : 0 }} />)}</div>
          <div className="legend">
            {segs.map(([name, value], i) => (
              <button
                key={name}
                type="button"
                className="hero-legend-item"
                aria-expanded={name === 'Demais' ? heroDetail?.type === 'remaining' : heroDetail?.name === name}
                onClick={() => setHeroDetail((current) => {
                  if (name === 'Demais') return current?.type === 'remaining' ? null : { type: 'remaining' }
                  return current?.name === name ? null : { type: 'group', name }
                })}
              >
                <i className={'dot c' + i} />{name}
                <b>{pos ? pct((value / pos) * 100) : '—'}</b>
                <em>{brl(value)}</em>
              </button>
            ))}
          </div>
          {heroDetail && (
            <div className="hero-breakdown">
              <div className="hero-breakdown-head">
                <b>{detailGroup ? detailGroup.name : 'Demais grupos'}</b>
                <button type="button" className="hero-breakdown-close" onClick={() => setHeroDetail(null)}>Fechar</button>
              </div>
              {heroDetail.type === 'remaining' ? (
                <div className="hero-breakdown-list">
                  {remaining.map((group) => (
                    <button type="button" key={group.name} onClick={() => setHeroDetail({ type: 'group', name: group.name })}>
                      <span>{group.name}</span><b>{pos ? pct((group.total / pos) * 100) : '—'}</b><em>{brl(group.total)}</em>
                    </button>
                  ))}
                  {!remaining.length && <small>Nenhum outro grupo neste período.</small>}
                </div>
              ) : detailGroup ? (
                <div className="hero-breakdown-list">
                  {detailGroup.categories?.length > 0 && <>
                    <small>Por categoria</small>
                    {detailGroup.categories.map((c) => (
                      <div key={'cat-' + c.name}>
                        <span>{c.name}</span>
                        <b>{detailGroup.total ? pct((c.total / detailGroup.total) * 100) : '—'}</b>
                        <em>{brl(c.total)}</em>
                      </div>
                    ))}
                    <small>Por despesa</small>
                  </>}
                  {detailGroup.items.map((item) => (
                    <div key={item.name}>
                      <span>{item.name}</span>
                      <b>{detailGroup.total ? pct((item.total / detailGroup.total) * 100) : '—'}</b>
                      <small>{stat.total ? pct((item.total / stat.total) * 100) : '—'} do total</small>
                      <em>{brl(item.total)}</em>
                    </div>
                  ))}
                  {!detailGroup.items.length && <small>Nenhuma despesa detalhada neste grupo.</small>}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <div className="toolbar">
        <PeriodFilter period={period} onChange={setPeriod} years={years} />
        <SearchField placeholder="Buscar grupo ou despesa…" value={q} onChange={setQ} />
        <div className="seg">
          <button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>Lista</button>
          <button className={view === 'matriz' ? 'on' : ''} onClick={() => setView('matriz')}>Matriz mensal</button>
        </div>
        <button className={'sec lock' + (locked ? '' : ' open')} onClick={toggleLock} title={locked ? 'Clique para liberar a edição' : 'Clique para travar a edição'}>{locked ? '🔒 Edição travada' : '🔓 Edição liberada'}</button>
        <button className="sec" disabled={locked} title={locked ? 'Destrave a edição para adicionar despesas' : ''} onClick={() => setPasting('')}>📋 Colar despesas</button>
        <button disabled={locked} title={locked ? 'Destrave a edição para adicionar despesas' : ''} onClick={() => setLancar(nextYM)}>📅 Lançar mês</button>
      </div>
      {searchSummary && <div className="search-summary">
        <span>🔎 “{q.trim()}”</span>
        <span><b className="big">{brl(searchSummary.period.total)}</b> <small>em {searchSummary.period.n.toLocaleString('pt-BR')} {searchSummary.period.n === 1 ? 'lançamento' : 'lançamentos'} no período</small></span>
        {searchSummary.all.n !== searchSummary.period.n && <span><b>{brl(searchSummary.all.total)}</b> <small>em todo o histórico ({searchSummary.all.n.toLocaleString('pt-BR')})</small></span>}
        {searchSummary.period.names.length > 1 && <div className="search-summary-names">
          {searchSummary.period.names.slice(0, 8).map((e) => <span key={e.name} className="chip na">{e.name} · {brl(e.total)}{e.count > 1 ? ` (${e.count}×)` : ''}</span>)}
          {searchSummary.period.names.length > 8 && <span className="chip na">+{searchSummary.period.names.length - 8}</span>}
        </div>}
      </div>}
      <div className="chips">
        {types.filter((t) => stat.cnt[t]).map((c) => (
          <button key={c} className={'chip-btn' + (cats.includes(c) ? ' on' : '')} onClick={() => toggle(c)}>{c}<em>{stat.cnt[c]}</em></button>
        ))}
        {cats.length > 0 && <button className="chip-btn" onClick={() => setCats([])}>limpar</button>}
      </div>

      {(cardStats.n > 0 || selectionStats) && <>
      {selectionStats && <div className="sel-bar"><span>☑ <b>{selected.size.toLocaleString('pt-BR')}</b> {selected.size === 1 ? 'linha selecionada' : 'linhas selecionadas'}: os valores abaixo são só da seleção</span><button type="button" className="sec sm" onClick={() => setSelected(new Set())}>Limpar seleção</button></div>}
      <div className="cards desp-cards">
        <div className="card kpi"><span className="ic">💰</span><small>Valor total</small><b>{brl(cardStats.total)}</b><small>{cardStats.n.toLocaleString('pt-BR')} {cardStats.n === 1 ? 'lançamento' : 'lançamentos'}{cardStats.nGroups ? ` · ${cardStats.nGroups} ${cardStats.nGroups === 1 ? 'grupo' : 'grupos'}` : ''}</small></div>
        <div className="card kpi"><span className="ic">✅</span><small>Valor pago</small><b className="pos">{brl(cardStats.pago)}</b><small>{cardStats.total ? `${(cardStats.pago / cardStats.total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total` : '—'}</small></div>
        <div className="card kpi"><span className="ic">⏳</span><small>A pagar</small><b>{brl(cardStats.pend)}</b><small>em aberto, atual e futuro</small></div>
        <div className="card kpi"><span className="ic">🔮</span><small>Valor futuro</small><b>{brl(cardStats.fut)}</b><small>meses após o atual</small></div>
        <div className="card kpi"><span className="ic">🧾</span><small>Parcelas em aberto</small><b>{cardStats.abertas.toLocaleString('pt-BR')}</b><small>{brl(cardStats.abertasValor)} a pagar</small></div>
        <div className="card kpi"><span className="ic">📊</span><small>Média por lançamento</small><b>{brl(cardStats.n ? cardStats.total / cardStats.n : 0)}</b><small>{selectionStats ? 'da seleção' : labelOf(period)}</small></div>
      </div></>}
      {view === 'lista' ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <span className="muted">{filtered.length} lançamento{filtered.length === 1 ? '' : 's'} · cada grupo pode conter várias despesas · {locked ? 'edição travada' : 'arraste uma despesa para outra conta do mesmo mês'}</span>
              <div className="ph-actions">
                {selected.size > 0 && <><span className="muted">{selected.size} selecionados</span><button className="sec danger" disabled={locked} title={locked ? 'Destrave a edição para excluir' : ''} onClick={deleteSelected}>Excluir selecionados</button><button className="sec" onClick={() => setSelected(new Set())}>Limpar seleção</button></>}
              </div>
            </div>
            {moveMessage && <p className="hint move-message">{moveMessage}</p>}
            <div className="wrap">
              <datalist id="dl-contas">{types.map((t) => <option key={t} value={t} />)}</datalist>
              <table className="rt desp-table">
                <thead><tr>
                  <th><input aria-label="Selecionar todos os itens visíveis" type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(slice.map(({ i }) => i)))} /></th>
                  {th('DATA', 'Mês', false, sort, setSort)}
                  {th('TIPO_CONTA', 'Grupo', false, sort, setSort)}
                  <th>Despesas do grupo</th>
                  {th('TOTAL', 'Total', true, sort, setSort)}
                  <th></th>
                </tr></thead>
                <tbody>
                  {slice.map(({ r, i, items, total }, n) => {
                    const ed = !locked && openRows.has(i)
                    const chips = (
                      <>
                        {items.map(({ item: it, index: j }) => (
                          <span
                            className={'chip na' + (!locked ? ' draggable-expense' : '')}
                            key={j}
                            draggable={!locked}
                            title={!locked ? `Arraste “${it.NOME || 'Despesa'}” para outra conta do mesmo mês` : undefined}
                            onDragStart={(e) => {
                              if (locked) { e.preventDefault(); return }
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', `${i}:${j}`)
                              setDragSource({ row: i, item: j })
                              setMoveMessage('')
                            }}
                            onDragEnd={() => { setDragSource(null); setDragOver(null) }}
                          >
                            {it.NOME || '—'}{it.CATEGORIA && <em className="chip-cat"> ({it.CATEGORIA})</em>} {Number(it.VALOR).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{it.PARCELAMENTO?.dataPagamento && Number(it.PARCELAMENTO.valorPago) >= Number(it.VALOR) ? ' · ✓ paga' : ''}
                          </span>
                        ))}
                        {!items.length && <span className="muted">Sem despesas · arraste uma aqui</span>}
                      </>
                    )
                    return (
                      <tr
                        key={i}
                        className={dragOver === i ? 'expense-drop-target' : ''}
                        onDragOver={(e) => {
                          if (canDropOn(dragSource, i)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(i) }
                        }}
                        onDragLeave={() => { if (dragOver === i) setDragOver(null) }}
                        onDrop={(e) => { e.preventDefault(); dropItem(i) }}
                      >
                        <td className="idx"><input aria-label={`Selecionar lançamento ${cur * size + n + 1}`} type="checkbox" checked={selected.has(i)} onChange={() => setSelected((s) => { const x = new Set(s); x.has(i) ? x.delete(i) : x.add(i); return x })} /></td>
                        <td className={ed ? '' : 'ro'} data-label="Mês">{ed
                          ? <input className="cell" type="month" value={monthOf(r.DATA)} onChange={(e) => e.target.value && onUpdate(i, { DATA: e.target.value + '-01' })} />
                          : monthOf(r.DATA).split('-').reverse().join('/')}</td>
                        <td className={ed ? '' : 'ro'} data-label="Grupo">{ed
                          ? <><input className="cell" list="dl-contas" value={r.TIPO_CONTA} onChange={(e) => onUpdate(i, { TIPO_CONTA: e.target.value })} /><ParentField value={parents.get(String(r.TIPO_CONTA || '').trim()) || ''} onCommit={(p) => setParent(r.TIPO_CONTA, p)} /></>
                          : <>{r.TIPO_CONTA}{parents.get(String(r.TIPO_CONTA || '').trim()) && <small className="muted" style={{ display: 'block' }}>↳ dentro de {groupPath(String(r.TIPO_CONTA || '').trim(), parents).slice(0, -1).join(' › ')}</small>}</>}</td>
                        <td className={ed ? '' : 'ro'} data-label="Despesas do grupo">{ed
                          ? <button className="items-btn" title="Editar despesas do grupo" onClick={() => setEditing(i)}>{chips}</button>
                          : <div className="items-static">{chips}</div>}</td>
                        <td className="ro r" data-label="Total"><b>{brl(total)}</b></td>
                        <td className="acts">
                          <button className={'icon' + (ed ? ' ok' : '')} disabled={locked} title={locked ? 'Destrave a edição para editar' : ed ? 'Concluir edição' : 'Editar'} onClick={() => toggleOpen(i)}>{ed ? '✓' : '✏️'}</button>
                          <button className="icon danger" disabled={locked} title={locked ? 'Destrave a edição para excluir' : 'Excluir'} onClick={() => confirm('Excluir este lançamento?') && del(i)}>🗑</button>
                        </td>
                        
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filtered.length && <div className="empty">Nenhum lançamento neste filtro. Use “📅 Lançar mês” para registrar.</div>}
            </div>
          </section>
      <Pager page={cur} pages={pages} total={sorted.length} size={size} onPage={setPage} onSize={setSize} />
        </>
      ) : (
        <section className="panel">
          <div className="panel-head"><span className="muted">Grupo × mês · clique em uma célula para lançar/editar aquele mês · clique no cabeçalho para ordenar{matrix?.cut && ' · mostrando os últimos 24 meses'}</span></div>
          <div className="wrap">
            <table className="mx">
              <thead><tr>{th('t', 'Grupo', false, mxSort, setMxSort)}{matrix.months.map((k) => th(k, mesCurto(k), true, mxSort, setMxSort))}{th('tot', 'Total', true, mxSort, setMxSort)}</tr></thead>
              <tbody>
                {mxLines.map((l) => (
                  <tr key={l.t}>
                    <td className="ro mx-name">{groupPath(String(l.t || '').trim(), parents).join(' › ')}</td>
                    {matrix.months.map((k) => {
                      const v = l.v[k]
                      return <td key={k} className="ro r mx-c" title={locked ? 'Destrave a edição para lançar neste mês' : v != null ? brl(v) : ''} onClick={() => !locked && setLancar(k)}
                        style={v ? { background: `rgba(239,68,68,${Math.max(0, Math.min(0.32, (v / l.max) * 0.32))})` } : undefined}>{v != null ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                    })}
                    <td className="ro r"><b>{l.tot.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>
                  </tr>
                ))}
                <tr className="mx-tot"><td className="ro mx-name"><b>Total</b></td>{matrix.months.map((k) => <td key={k} className="ro r"><b>{matrix.colTot[k].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td>)}<td className="ro r"><b>{matrix.lines.reduce((s, l) => s + l.tot, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td></tr>
              </tbody>
            </table>
            {!matrix.lines.length && <div className="empty">Sem dados neste filtro.</div>}
          </div>
        </section>
      )}

      {pasting !== null && <PasteDespesas initial={pasting} rows={rows} onClose={() => setPasting(null)} onSave={(novas) => { onAddRows(novas); setPasting(null) }} />}
      {lancar && <LancarMes rows={rows} initialYM={lancar} onClose={() => setLancar(null)} onSave={(ym, novas) => { onSaveMonth(ym, novas); setLancar(null) }} />}
      {editing != null && <ItemsModal row={rows[editing]} catByName={catByName} onClose={() => setEditing(null)} onSave={(itens) => { onUpdate(editing, { ITENS: itens }); setEditing(null) }} />}
    </>
  )
}
