import { useEffect, useRef, useState } from 'react'
import Table from './Table.jsx'
import NewItem from './NewItem.jsx'
import Dashboard, { resumo } from './Dashboard.jsx'
import ExtratoView from './ExtratoView.jsx'
import PasteModal from './PasteModal.jsx'
import { defaultPeriod, rangeOf, inRange, labelOf } from './period.js'
import CartHero from './CartHero.jsx'
import { SHEETS, importFile, recalcCart, exportCsv, exportXlsx, lockedCart, groupable, syncPapel, normalizeGroups, categorize, today } from './data.js'
import { exportPdf } from './pdf.js'

const KEY = 'fynn-control-v1'
const load = () => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY)) || {}
    return { carteira: normalizeGroups((d.carteira || []).map(recalcCart)), extrato: (d.extrato || []).map((r) => ({ ...r, CATEGORIA: r.CATEGORIA || categorize(r) })) }
  } catch { return { carteira: [], extrato: [] } }
}
const initTheme = () => { try { return localStorage.getItem('fynn-theme') } catch {} return null }

export default function App() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('dash')
  const input = useRef()
  const [modal, setModal] = useState(false)
  const [paste, setPaste] = useState(null)
  const [period, setPeriod] = useState(defaultPeriod)

  // Ctrl+V fora de um campo, na aba Extrato, abre a colagem interativa
  useEffect(() => {
    if (tab !== 'extrato' || paste !== null) return
    const h = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      const t = e.clipboardData?.getData('text')
      if (t && t.trim()) { e.preventDefault(); setPaste(t) }
    }
    window.addEventListener('paste', h)
    return () => window.removeEventListener('paste', h)
  }, [tab, paste])

  const doPdf = () => {
    const range = rangeOf(period), label = labelOf(period)
    const extP = data.extrato.filter((r) => inRange(r['DATA DE RECEBIMENTO'], range))
      .sort((x, y) => (y['DATA DE RECEBIMENTO'] || '').localeCompare(x['DATA DE RECEBIMENTO'] || ''))
    exportPdf({ ...data, extrato: extP }, resumo(data, extP, label).map(([l, v]) => [l, v]), label)
  }
  const addExtrato = () => setData((d) => ({ ...d, extrato: [...d.extrato, { 'DATA DE RECEBIMENTO': today(), 'VALOR DA APLICAÇÃO': 0, CATEGORIA: 'Outros', ORIGEM: '', 'INSTITUIÇÃO': '', 'CNPJ / CPF': '', TIPO: '' }] }))
  const [theme, setTheme] = useState(() => initTheme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('fynn-theme', theme) } catch {}
  }, [theme])

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {} }, [data])

  const onFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    try {
      const r = await importFile(f)
      if (r.carteira) r.carteira = normalizeGroups(r.carteira)
      setData((d) => ({ ...d, ...r }))
    }
    catch { alert('Não foi possível ler o arquivo.') }
    e.target.value = ''
  }

  const edit = (key) => (i, col, val) => setData((d) => {
    let rows = d[key].map((r, j) => (j !== i ? r : key === 'carteira' ? recalcCart({ ...r, [col]: val }) : { ...r, [col]: val }))
    // editar preço/atualizado de um lote atualiza todos os lotes do mesmo papel
    if (key === 'carteira' && (col === 'PRC_UNIT' || col === 'ULTIMA_ATUAL') && groupable(rows[i])) rows = syncPapel(rows, rows[i])
    return { ...d, [key]: rows }
  })
  const add = (key) => () => setData((d) => ({ ...d, [key]: [...d[key], Object.fromEntries(SHEETS[key].cols.map(([k, t]) => [k, t === 'num' ? 0 : ''])) ] }))
  const del = (key) => (i) => setData((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }))

  return (
    <>
      <header>
        <div className="brand"><span className="logo">F</span><div><h1>Fynn Control</h1><small>Carteira de investimentos</small></div></div>
        <div className="actions">
          <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
          <button onClick={() => input.current.click()}>⬆ Importar</button>
          <button className="sec" onClick={() => exportCsv(tab === 'extrato' ? 'extrato' : 'carteira', data[tab === 'extrato' ? 'extrato' : 'carteira'])}>CSV</button>
          <button className="sec" onClick={() => exportXlsx(data)}>XLSX</button>
          <button className="sec" onClick={doPdf}>PDF</button>
          <button className="icon" title="Alternar tema" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </header>
      <nav className="tabs">
        {[['dash', 'Dashboard', null], ['carteira', 'Carteira', data.carteira.length], ['extrato', 'Extrato', data.extrato.length]].map(([k, l, c]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{c != null && <em>{c}</em>}</button>
        ))}
      </nav>
      <main>
        {tab === 'dash' && <Dashboard data={data} period={period} setPeriod={setPeriod} />}
        {tab === 'carteira' && (
          <>
            <CartHero rows={data.carteira} />
            <Table
              cols={SHEETS.carteira.cols} rows={data.carteira} onEdit={edit('carteira')} onDelete={del('carteira')}
              onAdd={() => setModal(true)} addLabel="+ Novo item" isLocked={lockedCart} groupFn={groupable}
              sharedKeys={['PAPEL', 'PRC_UNIT', 'ULTIMA_ATUAL']}
            />
          </>
        )}
        {tab === 'extrato' && (
          <ExtratoView rows={data.extrato} period={period} setPeriod={setPeriod} onEdit={edit('extrato')} onDelete={del('extrato')} onAdd={addExtrato} onPaste={() => setPaste('')} />
        )}
      </main>
      {paste !== null && (
        <PasteModal initial={paste} existing={data.extrato} onClose={() => setPaste(null)}
          onSave={(rows) => { setData((d) => ({ ...d, extrato: [...d.extrato, ...rows] })); setPaste(null) }} />
      )}
      {modal && (
        <NewItem rows={data.carteira} onClose={() => setModal(false)}
          onSave={(row) => {
            setData((d) => {
              const rows = [...d.carteira, row]
              return { ...d, carteira: groupable(row) ? syncPapel(rows, row) : rows }
            })
            setModal(false)
          }} />
      )}
    </>
  )
}
