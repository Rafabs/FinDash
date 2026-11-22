import { useEffect, useMemo, useRef, useState } from 'react'
import Table from './Table.jsx'
import NewItem from './NewItem.jsx'
import Dashboard, { resumo, brl } from './Dashboard.jsx'
import ExtratoView from './ExtratoView.jsx'
import DespesasView from './DespesasView.jsx'
import ResgatesView from './ResgatesView.jsx'
import PasteModal from './PasteModal.jsx'
import { defaultPeriod, rangeOf, inRange, labelOf, nowYM } from './period.js'
import CartHero from './CartHero.jsx'
import Landing from './Landing.jsx'
import ProductSearch from './ProductSearch.jsx'
import RendaPorPapel from './RendaPorPapel.jsx'
import NotesEditor from './NotesEditor.jsx'
import Tour, { tourSeen, markTourSeen } from './Tour.jsx'
import Projecao from './Projecao.jsx'
import ExtratoCategories from './ExtratoCategories.jsx'
import PrevSaldos from './PrevSaldos.jsx'
import DialogHost from './DialogHost.jsx'
import { confirmDialog, alertDialog } from './dialog.js'
import { CATS, SHEETS, importFile, recalcCart, exportCsv, exportXlsx, lockedCart, groupable, syncPapel, normalizeGroups, categorize, today, demoData, moveExpenseItem, isPrevidencia, withAvgCost, isRV, itemPaid, mergeExpenseRows } from './data.js'
import { exportPdf } from './pdf.js'
import PdfModal from './PdfModal.jsx'
import { VERSION } from './version.js'
import { EMPTY_META, loadMeta, saveMeta, fmtDT, canPick, pickHandle, readHandle, saveHandle, loadHandle, clearHandle } from './fileMeta.js'
import { scopeRows, scopeSummary } from './pdfScope.js'
import Personalizar from './Personalizar.jsx'
import { loadPrefs, applyPrefs, TAB_LABEL } from './prefs.js'
import { CDI_CACHE_KEY, fetchLatestCdi, readCachedCdi, fetchLatestSelic, readCachedSelic, SELIC_CACHE_KEY } from './market.js'

// rótulos curtos da barra de abas no celular
const TAB_SHORT = { renda: 'Renda' }
const TAB_ICONS = { dash: '📊', projecao: '🔮', renda: '💹', carteira: '💼', extrato: '🧾', despesas: '💸', resgates: '🏁', notas: '📝' }
const KEY = 'fynn-control-v1'
const load = () => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY)) || {}
    return { carteira: normalizeGroups((d.carteira || []).map(recalcCart)), extrato: (d.extrato || []).map((r) => ({ ...r, CATEGORIA: r.CATEGORIA || categorize(r) })), categoriasExtrato: d.categoriasExtrato || [], despesas: d.despesas || [], contasDespesas: d.contasDespesas || [], resgates: d.resgates || [], notas: d.notas || '', notasHtml: d.notasHtml || '' }
  } catch { return { carteira: [], extrato: [], categoriasExtrato: [], despesas: [], contasDespesas: [], resgates: [], notas: '', notasHtml: '' } }
}

export default function App() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('dash')
  const input = useRef()
  const [modal, setModal] = useState(false)
  const [paste, setPaste] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [prevOpen, setPrevOpen] = useState(false) // janela "Atualizar saldo da previdência"
  const [catManager, setCatManager] = useState(false) // janela "Categorias do Extrato"
  // guia rápido: abre no primeiro acesso (ou com ?tour=1 na URL) e pelo botão ❓
  const [tour, setTour] = useState(() => !tourSeen() || /[?&]tour=1\b/.test(location.search))
  const closeTour = () => { markTourSeen(); setTour(false) }
  // no celular a barra de abas rola: mantém a aba ativa à vista
  useEffect(() => { document.querySelector('.tabs button.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) }, [tab])
  const [cartLocked, setCartLocked] = useState(true) // Carteira começa travada (evita digitação indevida)
  const [cartEditing, setCartEditing] = useState(() => new Set()) // linhas da Carteira abertas no lápis (edição completa)
  const [cdi, setCdi] = useState(readCachedCdi)
  const [cdiStatus, setCdiStatus] = useState('loading')
  const [selic, setSelic] = useState(readCachedSelic)
  const [selicStatus, setSelicStatus] = useState('loading')
  useEffect(() => { if (tab !== 'carteira') setCartLocked(true) }, [tab])
  useEffect(() => { setCartEditing(new Set()) }, [tab, cartLocked, data.carteira.length]) // índices mudam ao excluir/adicionar/travar // sai da aba = trava de novo
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

  // Ctrl+K (ou "/" fora de um campo) abre a busca de produtos
  useEffect(() => {
    const h = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable // inclui o editor de Notas
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) }
      else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // dados do período para o PDF (despesas do mês atual para trás + futuras, como na tela)
  const pdfData = () => {
    const range = rangeOf(period), label = labelOf(period)
    const currentMonth = nowYM()
    const includeFuture = !range.to || range.to.slice(0, 7) >= currentMonth
    const extP = data.extrato.filter((r) => inRange(r['DATA DE RECEBIMENTO'], range))
      .sort((x, y) => (y['DATA DE RECEBIMENTO'] || '').localeCompare(x['DATA DE RECEBIMENTO'] || ''))
    const allDesp = data.despesas || []
    const despP = allDesp.filter((r) => inRange(r.DATA, range) && r.DATA.slice(0, 7) <= currentMonth).sort((x, y) => y.DATA.localeCompare(x.DATA))
    const despFuturas = includeFuture ? allDesp.filter((r) => r.DATA.slice(0, 7) > currentMonth).sort((x, y) => y.DATA.localeCompare(x.DATA)) : []
    const resP = (data.resgates || []).filter((r) => inRange(r.DATA_RESGATE, range)).sort((x, y) => (y.DATA_RESGATE || '').localeCompare(x.DATA_RESGATE || ''))
    return { label, currentMonth, extP, despP, despFuturas, despesasPdf: [...despP, ...despFuturas], resP }
  }
  // scope = null: relatório completo · { kind: 'grupo' | 'categoria', name }: só as despesas daquela conta/categoria
  const doPdf = (scope = null) => {
    const { label, currentMonth, extP, despP, despFuturas, despesasPdf, resP } = pdfData()
    if (scope) {
      const rows = scopeRows(despesasPdf, scope)
      const sm = scopeSummary(rows, currentMonth)
      exportPdf({ ...data, despesas: rows },
        [['Total previsto', brl(sm.previsto)], ['Pago', brl(sm.pago), 'pos'], ['A pagar', brl(sm.pendente)], ['Lançamentos', String(sm.count)]],
        label, {}, { somenteDespesas: true, titulo: scope.kind === 'categoria' ? `Categoria · ${scope.name}` : scope.name })
      return
    }
    const indicadoresResumo = resumo(data, extP, label, despP, resP).map(([l, v]) => [l, v])
    if (despFuturas.length) {
      const previsto = despFuturas.reduce((s, r) => s + r.ITENS.reduce((t, i) => t + (Number(i.VALOR) || 0), 0), 0)
      const pago = despFuturas.reduce((s, r) => s + r.ITENS.reduce((t, i) => t + itemPaid(i, r.DATA.slice(0, 7), currentMonth), 0), 0)
      indicadoresResumo.push(['Despesas futuras · previsto', brl(previsto)])
      indicadoresResumo.push(['Despesas futuras · pago', brl(pago)])
      indicadoresResumo.push(['Despesas futuras · pendente', brl(Math.max(0, previsto - pago))])
    }
    exportPdf({ ...data, carteira: carteiraView, extrato: extP, despesas: despesasPdf, despesasFuturas: despFuturas, resgates: resP, projectionData: { carteira: data.carteira, extrato: data.extrato, despesas: data.despesas, resgates: data.resgates } }, indicadoresResumo, label, { cdi, selic })
  }
  const updDesp = (i, patch) => setData((d) => ({ ...d, despesas: d.despesas.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  const delDesp = (i) => setData((d) => ({ ...d, despesas: d.despesas.filter((_, j) => j !== i) }))
  const moveDespItem = (fromRow, itemIndex, toRow) => setData((d) => {
    const despesas = moveExpenseItem(d.despesas, fromRow, itemIndex, toRow)
    return despesas === d.despesas ? d : { ...d, despesas }
  })
  const addDesp = (novas) => setData((d) => ({ ...d, despesas: [...d.despesas, ...novas] }))
  const appendDesp = (novas) => setData((d) => ({ ...d, despesas: mergeExpenseRows(d.despesas, novas) })) // parcelas e lançamentos da conta entram na fatura do mês
  const addExpenseAccount = (account) => setData((d) => ({ ...d, contasDespesas: [...(d.contasDespesas || []), account] }))
  const updateExpenseAccount = (account) => setData((d) => {
    const current = d.contasDespesas || []
    const i = current.findIndex((a) => a.name.toLocaleLowerCase() === account.name.toLocaleLowerCase())
    return { ...d, contasDespesas: i < 0 ? [...current, account] : current.map((a, j) => j === i ? { ...a, ...account } : a) }
  })
  const saveMonth = (ym, novas) => setData((d) => ({ ...d, despesas: [...d.despesas.filter((r) => r.DATA.slice(0, 7) !== ym), ...novas] }))
  const addExtratoCategory = (name) => setData((d) => ({ ...d, categoriasExtrato: [...new Set([...(d.categoriasExtrato || []), name])] }))
  // saldo dos fundos de previdência: ajusta a cota (preço) de todos os aportes do fundo e a data de atualização
  const applyPrevSaldos = (updates, date) => setData((d) => ({
    ...d,
    carteira: d.carteira.map((r) => (updates[r.PAPEL] != null && isPrevidencia(r) && groupable(r) ? recalcCart({ ...r, PRC_UNIT: updates[r.PAPEL], ULTIMA_ATUAL: date }) : r)),
  }))
  // renomear (ou mesclar em outra) e excluir categorias do Extrato; os lançamentos acompanham
  const renameExtratoCategory = (from, to) => setData((d) => ({
    ...d,
    extrato: d.extrato.map((r) => (r.CATEGORIA === from ? { ...r, CATEGORIA: to } : r)),
    categoriasExtrato: [...new Set((d.categoriasExtrato || []).filter((c) => c !== from).concat(CATS.includes(to) ? [] : [to]))],
  }))
  const deleteExtratoCategory = (name, moveTo) => setData((d) => ({
    ...d,
    extrato: d.extrato.map((r) => (r.CATEGORIA === name ? { ...r, CATEGORIA: moveTo } : r)),
    categoriasExtrato: (d.categoriasExtrato || []).filter((c) => c !== name),
  }))
  const addResgate = () => setData((d) => ({ ...d, resgates: [...d.resgates, { DATA_RESGATE: today(), PRODUTO: '', 'RENTABILIDADE ATÉ DATA RESGATE': 0 }] }))
  const addExtrato = () => setData((d) => ({ ...d, extrato: [...d.extrato, { 'DATA DE RECEBIMENTO': today(), 'VALOR DA APLICAÇÃO': 0, CATEGORIA: 'Outros', ORIGEM: '', 'INSTITUIÇÃO': '', 'CNPJ / CPF': '', TIPO: '' }] }))
  // preferências do usuário (tema, cor, papel de parede, densidade, abas): salvas no navegador e na aba "Preferências" do XLSX
  const [prefs, setPrefs] = useState(loadPrefs)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [sideMini, setSideMini] = useState(() => { try { return localStorage.getItem('fynn-sidebar-v1') === '1' } catch { return false } }) // menu lateral recolhido (só ícones)
  const toggleSide = () => setSideMini((v) => { try { localStorage.setItem('fynn-sidebar-v1', v ? '0' : '1') } catch {} return !v })
  const goHome = () => { setTab('dash'); window.scrollTo({ top: 0, behavior: 'smooth' }) } // clicar na logo ou em FYNN CONTROL volta ao Dashboard
  useEffect(() => { // altura do cabeçalho: o menu lateral fixa logo abaixo dele
    const h = document.querySelector('header')
    if (!h) return
    const set = () => document.documentElement.style.setProperty('--hdr-h', `${h.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(h)
    return () => ro.disconnect()
  }, [])
  // arquivo carregado: nome, quando foi carregado e quando os dados foram editados pela última vez
  const [fileMeta, setFileMeta] = useState(loadMeta)
  const fileHandle = useRef(null) // arquivo aberto pelo seletor: permite recarregar direto do disco
  const skipEdit = useRef(false) // a próxima mudança em `data` vem de carregar/limpar, não de uma edição
  const prevData = useRef(data)
  useEffect(() => { loadHandle().then((h) => { if (h && !fileHandle.current) fileHandle.current = h }) }, [])
  useEffect(() => { // qualquer mudança nos dados (item, valor, nota…) atualiza a hora da última edição
    if (prevData.current === data) return
    prevData.current = data
    if (skipEdit.current) { skipEdit.current = false; return }
    setFileMeta((m) => { const n = { ...m, editedAt: Date.now() }; saveMeta(n); return n })
  }, [data])
  const theme = prefs.theme
  useEffect(() => { applyPrefs(prefs) }, [prefs])

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {} }, [data])

  useEffect(() => {
    const controller = new AbortController()
    fetchLatestCdi(controller.signal)
      .then((quote) => {
        setCdi(quote)
        setCdiStatus('ready')
        try { localStorage.setItem(CDI_CACHE_KEY, JSON.stringify(quote)) } catch {}
      })
      .catch((error) => { if (error.name !== 'AbortError') setCdiStatus('error') })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchLatestSelic(controller.signal)
      .then((quote) => {
        setSelic(quote)
        setSelicStatus('ready')
        try { localStorage.setItem(SELIC_CACHE_KEY, JSON.stringify(quote)) } catch {}
      })
      .catch((error) => { if (error.name !== 'AbortError') setSelicStatus('error') })
    return () => controller.abort()
  }, [])

  const carteiraView = useMemo(() => withAvgCost(data.carteira).map((r, i) => (cartEditing.has(i) ? { ...r, __edit: true } : r)), [data.carteira, cartEditing]) // com o Custo Médio por papel (só para exibir e exportar)
  const empty = !data.carteira.length && !data.extrato.length && !data.despesas?.length && !data.resgates?.length && !data.notas?.trim()
  const hasFinancialData = data.carteira.length || data.extrato.length || data.despesas?.length || data.resgates?.length
  const visibleTabs = prefs.tabs.order.filter((id) => !prefs.tabs.hidden.includes(id))
  useEffect(() => { if (!empty && !visibleTabs.includes(tab)) setTab('dash') }, [visibleTabs.join(), empty])
  const COUNTS = { carteira: data.carteira.length, extrato: data.extrato.length, despesas: data.despesas.length, resgates: data.resgates.length }
  const handleFile = async (f, handle = null) => {
    if (!f) return
    try {
      const { prefs: imported, ...r } = await importFile(f)
      if (r.carteira) r.carteira = normalizeGroups(r.carteira)
      if (!r.carteira?.length && !r.extrato?.length && !r.despesas?.length && !r.resgates?.length && r.notas == null) return alertDialog({ title: 'Importação', icon: '📄', message: 'Nenhuma linha reconhecida.', detail: 'Confira se os cabeçalhos da planilha seguem o modelo.' })
      skipEdit.current = true
      setData((d) => ({ ...d, ...r, categoriasExtrato: r.extrato ? [...new Set([...(d.categoriasExtrato || []), ...(r.extrato || []).map((x) => x.CATEGORIA).filter(Boolean)])] : d.categoriasExtrato }))
      if (imported) setPrefs(imported)
      const meta = { name: f.name, loadedAt: Date.now(), editedAt: null, diskAt: f.lastModified || null }
      setFileMeta(meta); saveMeta(meta)
      fileHandle.current = handle
      if (handle) saveHandle(handle); else clearHandle()
      setTab(r.notas?.trim() ? 'notas' : 'dash')
    } catch { alertDialog({ title: 'Importação', icon: '⚠️', message: 'Não foi possível ler o arquivo.', detail: 'Use uma planilha .xlsx, .xls ou .csv.' }) }
  }
  const onFile = (e) => { handleFile(e.target.files[0]); e.target.value = '' }
  const resetFile = () => { fileHandle.current = null; clearHandle(); setFileMeta({ ...EMPTY_META }); saveMeta({ ...EMPTY_META }) }
  // importar: com seletor do navegador guarda a "alça" do arquivo (para recarregar); sem ele, usa o campo de arquivo
  const openFile = async () => {
    if (!canPick()) return input.current.click()
    try { const h = await pickHandle(); handleFile(await h.getFile(), h) } catch (e) { if (e?.name !== 'AbortError') input.current.click() }
  }
  // recarregar: lê de novo o arquivo do disco (descarta o que foi editado depois do carregamento)
  const reloadFile = async () => {
    if (fileMeta.editedAt && !(await confirmDialog({ title: 'Recarregar arquivo', message: 'Recarregar descarta as alterações feitas depois do último carregamento.', detail: `Última edição: ${fmtDT(fileMeta.editedAt)}. Exporte o XLSX antes se quiser guardá-las.`, confirmLabel: 'Recarregar', danger: true }))) return
    try {
      let h = fileHandle.current
      if (!h && canPick()) h = await pickHandle() // primeira vez: escolhe o arquivo; depois é um clique só
      if (!h) return input.current.click() // navegador sem acesso ao disco: escolha o arquivo de novo
      await handleFile(await readHandle(h), h)
    } catch (e) {
      if (e?.name === 'AbortError') return
      alertDialog({ title: 'Recarregar arquivo', icon: '⚠️', message: 'Não foi possível ler o arquivo.', detail: 'Ele pode ter sido movido ou renomeado, ou a permissão foi negada. Use ⬆ Importar para escolher de novo.' })
    }
  }
  // lápis da Carteira: abre a linha para editar todos os campos (menos os calculados)
  const toggleCartRow = (i) => {
    if (cartLocked) return alertDialog({ title: 'Edição travada', icon: '🔒', message: 'Destrave a edição para editar um item.', detail: 'Use o botão “🔓 Destravar” acima da tabela.' })
    setCartEditing((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })
  }
  const lockedCartRow = (r, k) => (r.__edit ? (isRV(r) ? k === 'TOTAL_ATUAL' : k === 'VLR_APLICACAO') : lockedCart(r, k))
  const cartCols = SHEETS.carteira.cols.map((c) => (c[0] === 'TIPO_INV' ? [c[0], 'select', c[2]] : c)) // Tipo vira lista (RF/RV) na edição
  const clearAll = async () => { if (await confirmDialog({ title: 'Limpar todos os dados', message: 'Apagar todos os dados salvos neste navegador?', detail: 'Exporte o XLSX antes se quiser guardar uma cópia. Esta ação não pode ser desfeita.', confirmLabel: 'Apagar tudo', danger: true })) { skipEdit.current = true; resetFile(); setData({ carteira: [], extrato: [], categoriasExtrato: [], despesas: [], contasDespesas: [], resgates: [], notas: '', notasHtml: '' }); setTab('dash') } }

  const edit = (key) => (i, col, val) => setData((d) => {
    let rows = d[key].map((r, j) => (j !== i ? r : key === 'carteira' ? recalcCart({ ...r, [col]: val }) : { ...r, [col]: val }))
    // editar preço/atualizado de um lote atualiza todos os lotes do mesmo papel
    if (key === 'carteira' && (col === 'PRC_UNIT' || col === 'ULTIMA_ATUAL') && groupable(rows[i])) rows = syncPapel(rows, rows[i])
    if (key === 'carteira' && (col === 'PAPEL' || col === 'TIPO_INV')) rows = normalizeGroups(rows) // lote que muda de papel/tipo assume o preço do grupo
    return { ...d, [key]: rows }
  })
  const add = (key) => () => setData((d) => ({ ...d, [key]: [...d[key], Object.fromEntries(SHEETS[key].cols.map(([k, t]) => [k, t === 'num' ? 0 : ''])) ] }))
  const del = (key) => (i) => setData((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }))

  return (
    <>
      <header>
        <div className="brand" role="link" tabIndex={0} title="Ir para o Dashboard" aria-label="Fynn Control: ir para o Dashboard" onClick={goHome} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome() } }}><span className="logo"><svg viewBox="0 0 64 64" width="22" height="22"><rect x="14" y="36" width="9" height="14" rx="3" fill="#fff" opacity=".65" /><rect x="27.5" y="26" width="9" height="24" rx="3" fill="#fff" opacity=".85" /><rect x="41" y="14" width="9" height="36" rx="3" fill="#fff" /></svg></span><div><h1>Fynn Control</h1><small>Carteira de investimentos</small></div></div>
        {!empty && (fileMeta.name || fileMeta.editedAt) && (
          <div className="filebar" title={`Arquivo: ${fileMeta.name || 'dados do navegador'}\nCarregado: ${fmtDT(fileMeta.loadedAt)}\nÚltima edição: ${fileMeta.editedAt ? fmtDT(fileMeta.editedAt) : 'nenhuma'}${fileMeta.diskAt ? `\nArquivo no disco modificado em: ${fmtDT(fileMeta.diskAt)}` : ''}`}>
            <span className="file-name">📄 {fileMeta.name || 'Dados do navegador'}</span>
            <span className="file-times">
              {fileMeta.loadedAt && <small>Carregado {fmtDT(fileMeta.loadedAt)}</small>}
              <small className={fileMeta.editedAt ? 'dirty' : ''}>{fileMeta.editedAt ? `Editado ${fmtDT(fileMeta.editedAt, fileMeta.loadedAt)}` : 'Sem edições'}</small>
            </span>
            {fileMeta.name && <button className="icon" title="Recarregar o arquivo do disco" aria-label="Recarregar arquivo" onClick={reloadFile}>🔄</button>}
          </div>
        )}
        <div className="actions">
          <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
          <button onClick={openFile}>⬆ Importar</button>
          {!empty && <>
          {hasFinancialData && <>
            <button className="sec" title="Buscar produto (Ctrl+K)" onClick={() => setSearchOpen(true)}>🔍 Buscar</button>
            <button className="sec" onClick={() => { const key = ['extrato', 'despesas', 'resgates'].includes(tab) ? tab : 'carteira'; exportCsv(key, key === 'carteira' ? carteiraView : data[key]) }}>CSV</button>
          </>}
          <button className="sec" onClick={() => exportXlsx({ ...data, carteira: carteiraView, prefs })}>XLSX</button>
          {hasFinancialData && <button className="sec" onClick={() => setPdfOpen(true)}>PDF</button>}
          <button className="sec" title="Apagar todos os dados" onClick={clearAll}>Limpar</button>
          </>}
          <button className="icon" title="Guia rápido: como usar cada aba" aria-label="Guia rápido" onClick={() => setTour(true)}>❓</button>
          <button className="icon" title="Personalizar" aria-label="Personalizar" onClick={() => setPrefsOpen(true)}>🎨</button>
          <button className="icon" title="Alternar tema" onClick={() => setPrefs({ ...prefs, theme: theme === 'dark' ? 'light' : 'dark' })}>{theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </header>
      {empty && tab !== 'notas' ? <Landing onPick={openFile} onFile={handleFile} onDemo={() => { skipEdit.current = true; resetFile(); setData(demoData()) }} onNotes={() => setTab('notas')} /> : (<>
      <div className={'shell' + (sideMini ? ' side-mini' : '')}>
      <nav className="tabs" aria-label="Seções do app">
        {visibleTabs.map((k) => (
          <button key={k} className={tab === k ? 'on' : ''} title={TAB_LABEL[k]} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}><span className="ti">{TAB_ICONS[k]}</span><span className="tl tl-full">{TAB_LABEL[k]}</span><span className="tl tl-short">{TAB_SHORT[k] || TAB_LABEL[k]}</span>{COUNTS[k] != null && <em>{COUNTS[k]}</em>}</button>
        ))}
        <button type="button" className="side-toggle" title={sideMini ? 'Expandir menu' : 'Recolher menu'} aria-label={sideMini ? 'Expandir menu' : 'Recolher menu'} onClick={toggleSide}>{sideMini ? '»' : '«'}</button>
      </nav>
      <main>
        {tab === 'dash' && <Dashboard data={data} period={period} setPeriod={setPeriod} cdi={cdi} cdiStatus={cdiStatus} selic={selic} selicStatus={selicStatus} />}
        {tab === 'projecao' && <Projecao data={data} cdi={cdi} />}
        {tab === 'renda' && <RendaPorPapel data={data} />}
        {tab === 'carteira' && (
          <>
            <CartHero rows={data.carteira} />
            <Table
              cols={cartCols} selects={{ TIPO_INV: ['RF', 'RV'] }} rows={carteiraView} onEdit={edit('carteira')} onDelete={del('carteira')}
              onAdd={() => setModal(true)} onDeleteMany={(ids) => ids.forEach(del('carteira'))} addLabel="+ Novo item" isLocked={lockedCartRow} groupFn={cartEditing.size ? undefined : groupable} rowEditing={(i) => cartEditing.has(i)} onToggleEdit={toggleCartRow} quickEdit={!cartLocked} fillTone locked={cartLocked} onToggleLock={() => setCartLocked((v) => !v)}
              sharedKeys={['PAPEL', 'PRC_UNIT', 'CUSTO_MEDIO', 'ULTIMA_ATUAL']}
              extra={data.carteira.some(isPrevidencia) && <button className="sec" title="Atualizar o saldo de todos os fundos de previdência de uma vez" onClick={() => setPrevOpen(true)}>🛡️ Atualizar saldo da previdência</button>}
            />
          </>
        )}
        {empty && tab === 'notas' && <div className="notes-back"><button className="sec" onClick={() => setTab('dash')}>← Voltar à página inicial</button></div>}
        {tab === 'extrato' && (<>
          <ExtratoView resgates={data.resgates} rows={data.extrato} categories={data.categoriasExtrato || []} onAddCategory={addExtratoCategory} onManageCategories={() => setCatManager(true)} period={period} setPeriod={setPeriod} onEdit={edit('extrato')} onDelete={del('extrato')} onAdd={addExtrato} onPaste={() => setPaste('')} />
        </>)}
        {tab === 'despesas' && (
          <DespesasView rows={data.despesas} accounts={data.contasDespesas || []} onAddAccount={addExpenseAccount} onUpdateAccount={updateExpenseAccount} period={period} setPeriod={setPeriod} onUpdate={updDesp} onDelete={delDesp} onMoveItem={moveDespItem} onSaveMonth={saveMonth} onAddRows={addDesp} onAppendRows={appendDesp} />
        )}
        {tab === 'resgates' && (
          <ResgatesView rows={data.resgates} period={period} setPeriod={setPeriod} onEdit={edit('resgates')} onDelete={del('resgates')} onAdd={addResgate} />
        )}
        {tab === 'notas' && (
          <section className="card notes-card">
            <div className="notes-head">
              <div><h2>Notas</h2><p className="muted">Anotações pessoais sobre seus investimentos. Formate o texto pela barra de ferramentas; tudo é salvo automaticamente e preservado no XLSX.</p></div>
            </div>
            <NotesEditor text={data.notas} html={data.notasHtml} onChange={({ text, html }) => setData((d) => ({ ...d, notas: text, notasHtml: html }))} />
          </section>
        )}
      </main>
      </div></>)}
      <footer className="app-version" title="Fynn Control">v{VERSION}</footer>
      {tour && <Tour onClose={closeTour} />}
      <DialogHost />
      {pdfOpen && <PdfModal despesas={pdfData().despesasPdf} periodLabel={labelOf(period)} onClose={() => setPdfOpen(false)} onExport={(scope) => { setPdfOpen(false); doPdf(scope) }} />}
      {prefsOpen && <Personalizar prefs={prefs} onPreview={(p) => applyPrefs(p, false)} onSave={(p) => { setPrefs(p); setPrefsOpen(false) }} onClose={() => { applyPrefs(prefs, false); setPrefsOpen(false) }} />}
      {prevOpen && <PrevSaldos rows={data.carteira} onApply={applyPrevSaldos} onClose={() => setPrevOpen(false)} />}
      {catManager && <ExtratoCategories rows={data.extrato} categories={data.categoriasExtrato || []} onRename={renameExtratoCategory} onDelete={deleteExtratoCategory} onClose={() => setCatManager(false)} />}
      {searchOpen && hasFinancialData && <ProductSearch data={data} onClose={() => setSearchOpen(false)} />}
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
