import { useEffect, useRef, useState } from 'react'
import Table from './Table.jsx'
import Dashboard, { resumo } from './Dashboard.jsx'
import { SHEETS, importFile, recalcCart, exportCsv, exportXlsx } from './data.js'
import { exportPdf } from './pdf.js'

const KEY = 'fynn-control-v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { carteira: [], extrato: [] } } catch { return { carteira: [], extrato: [] } } }

export default function App() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('dash')
  const input = useRef()

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {} }, [data])

  const onFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    try { const r = await importFile(f); setData((d) => ({ ...d, ...r })) }
    catch { alert('Não foi possível ler o arquivo.') }
    e.target.value = ''
  }

  const edit = (key) => (i, col, val) => setData((d) => ({
    ...d,
    [key]: d[key].map((r, j) => {
      if (j !== i) return r
      let n = { ...r, [col]: val }
      if (key === 'carteira') {
        if (col === 'QTD_COMPRA' || col === 'PRC_UNIT') n.VLR_APLICACAO = +((Number(n.QTD_COMPRA) || 0) * (Number(n.PRC_UNIT) || 0)).toFixed(2)
        n = recalcCart(n)
      }
      return n
    }),
  }))
  const add = (key) => () => setData((d) => ({ ...d, [key]: [...d[key], Object.fromEntries(SHEETS[key].cols.map(([k, t]) => [k, t === 'num' ? 0 : ''])) ] }))
  const del = (key) => (i) => setData((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }))

  return (
    <>
      <header>
        <h1>📊 Fynn Control</h1>
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
        <button onClick={() => input.current.click()}>Importar .xlsx / .csv</button>
        <button className="sec" onClick={() => exportCsv(tab === 'extrato' ? 'extrato' : 'carteira', data[tab === 'extrato' ? 'extrato' : 'carteira'])}>CSV (aba atual)</button>
        <button className="sec" onClick={() => exportXlsx(data)}>XLSX</button>
        <button className="sec" onClick={() => exportPdf(data, resumo(data))}>PDF</button>
      </header>
      <nav>
        {[['dash', 'Dashboard'], ['carteira', 'Carteira'], ['extrato', 'Extrato']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : 'sec'} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <main>
        {tab === 'dash' ? <Dashboard data={data} /> : (
          <Table cols={SHEETS[tab].cols} rows={data[tab]} onEdit={edit(tab)} onAdd={add(tab)} onDelete={del(tab)} />
        )}
      </main>
    </>
  )
}
