// Recomendações: regras simples e explicáveis, calculadas só com os dados do app (nada sai do navegador).
// Cada recomendação mostra o motivo (números) e o que fazer. Não é recomendação de investimento personalizada.
import { monthOf, itemPaid, dueStatus, isRV, isPrevidencia, categorize } from './data.js'
import { addMonths } from './projection.js'
import { buildProducts } from './products.js'

const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
const n0 = (v) => Number(v) || 0
const p2 = (v) => String(v).padStart(2, '0')
export const money = (v) => `R$ ${n0(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const money0 = (v) => `R$ ${Math.round(n0(v)).toLocaleString('pt-BR')}`
const pct = (v, d = 1) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
const nm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(\d+\/\d+\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0 }
const shortYM = (ym) => `${ym.slice(5)}/${ym.slice(0, 4)}`

export const PERFIS = {
  conservador: { label: 'Conservador', rv: 15, reservaMeses: 12 },
  moderado: { label: 'Moderado', rv: 30, reservaMeses: 6 },
  arrojado: { label: 'Arrojado', rv: 60, reservaMeses: 6 },
}
export const PRIORIDADES = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }
export const TIPOS = { gasto: 'Gastos', alocacao: 'Reserva e alocação', risco: 'Riscos', organizacao: 'Organização', insight: 'Insights' }

// gastos que costumam ser cortáveis (o usuário pode trocar a lista)
const DISC = /lazer|restaurante|delivery|ifood|assinatur|streaming|compras? online|e-?commerce|viagem|entretenimento|cinema|\bbar\b|vestu|roupa|presente|hobby|jogo|beleza|eletr[oô]nic|casa$/i
export const isDiscricionaria = (cat) => DISC.test(String(cat || ''))
const ESSENCIAL = /aluguel|condom[ií]nio|energia|\bluz\b|[áa]gua|\bg[áa]s\b|internet|fibra|telefon|celular|banda larga|plano de sa[úu]de|iptu|seguro|escola|curso|faculdade|financ|imposto|mensalidade|cosip|tusd|estacionamento|garagem/i
const ISENTO_IR = /\b(LCI|LCA|LCD|CRI|CRA)\b/i // renda fixa isenta de IR para pessoa física
const LIQUIDO = /liquidez di[aá]ria|conta remunerada|tesouro selic|\bselic\b|\brdb\b|caixinha|poupan/i
const SOBERANO = /tesouro/i

// ---------- cenário de juros ----------
export function cenarioJuros(selic, cdi) {
  const s = selic?.value, c = cdi?.value
  if (!(s > 0) && !(c > 0)) return null
  const ref = s > 0 ? s : c
  const rendimento = c > 0 ? 10000 * ((1 + c / 100) ** (1 / 12) - 1) : null
  const nivel = ref >= 12 ? 'alto' : ref >= 9 ? 'medio' : 'baixo'
  const leitura = {
    alto: 'Juros altos: a renda fixa pós-fixada paga bem. Priorize reserva em liquidez diária e evite dívidas e parcelamentos com juros, que ficam caros.',
    medio: 'Juros em patamar elevado: a renda fixa continua atrativa. Vale equilibrar a reserva com prazos maiores (LCI/LCA, Tesouro IPCA+) e manter alguma renda variável.',
    baixo: 'Juros menores: a renda fixa rende menos. Avalie diversificar com renda variável e fundos imobiliários, dentro do seu perfil.',
  }[nivel]
  return { nivel, selic: s || null, cdi: c || null, leitura, rendimento10k: rendimento }
}

// simulador: economia mensal aplicada por N meses (juros compostos, antes do IR)
export function simular({ economiaMensal, meses, taxaAnual }) {
  const rm = (1 + n0(taxaAnual) / 100) ** (1 / 12) - 1
  const total = economiaMensal * meses
  const final = rm > 0 ? economiaMensal * (((1 + rm) ** meses - 1) / rm) : total
  return { total, final, rendimento: final - total }
}

export function analyze({ data, cdi, selic, settings = {}, now = new Date() }) {
  const cur = `${now.getFullYear()}-${p2(now.getMonth() + 1)}`
  const perfilKey = PERFIS[settings.perfil] ? settings.perfil : 'moderado'
  const perfil = PERFIS[perfilKey]
  const cdiV = n0(cdi?.value), selicV = n0(selic?.value)
  const extrato = data.extrato || [], despesas = data.despesas || [], carteira = data.carteira || []

  // ---------- histórico mensal ----------
  const hist = {}
  const slot = (k) => (hist[k] ||= { ent: 0, desp: 0, parc: 0 })
  extrato.forEach((r) => { if (r[D] && (r.CATEGORIA || categorize(r)) !== 'Venda de Patrimônio') slot(String(r[D]).slice(0, 7)).ent += n0(r[V]) })
  const catMonth = {} // categoria -> mês -> valor
  const items = [] // todos os itens de despesa com o mês
  despesas.forEach((r) => {
    const ym = monthOf(r.DATA), m = slot(ym)
    ;(r.ITENS || []).forEach((it) => {
      const v = n0(it.VALOR)
      m.desp += v
      if (it.PARCELAMENTO) m.parc += v
      const cat = String(it.CATEGORIA || '').trim() || 'Sem categoria'
      ;((catMonth[cat] ||= {})[ym] = (catMonth[cat][ym] || 0) + v)
      items.push({ r, it, ym, v, cat })
    })
  })
  const past = Object.keys(hist).filter((k) => k < cur && (hist[k].ent || hist[k].desp)).sort()
  const baseMonths = past.length ? Array.from({ length: 6 }, (_, i) => addMonths(cur, -(i + 1))).filter((k) => k >= past[0]) : []
  const nBase = baseMonths.length
  const avg = (f) => (nBase ? baseMonths.reduce((t, k) => t + f(hist[k] || { ent: 0, desp: 0, parc: 0 }), 0) / nBase : 0)
  const renda = avg((m) => m.ent), gasto = avg((m) => m.desp), gastoParc = avg((m) => m.parc)
  const sobra = renda - gasto
  const taxa = renda > 0 ? sobra / renda : null
  const lm = addMonths(cur, -1), prev3 = [2, 3, 4].map((i) => addMonths(cur, -i)).filter((k) => nBase && k >= past[0])

  // ---------- categorias e gastos supérfluos ----------
  const catAvg = Object.entries(catMonth).map(([nome, byM]) => ({ nome, media: nBase ? baseMonths.reduce((t, k) => t + (byM[k] || 0), 0) / nBase : 0 })).filter((c) => c.media > 0).sort((a, b) => b.media - a.media)
  const discSet = Array.isArray(settings.discricionarias) ? new Set(settings.discricionarias.map((c) => c.toLowerCase())) : null
  const ehDisc = (cat) => (discSet ? discSet.has(cat.toLowerCase()) : isDiscricionaria(cat))
  const categorias = catAvg.map((c) => ({ ...c, disc: ehDisc(c.nome) }))
  const disc = categorias.filter((c) => c.disc).reduce((t, c) => t + c.media, 0)

  // ---------- carteira ----------
  const patrimonio = carteira.reduce((t, r) => t + n0(r.TOTAL_ATUAL), 0)
  const classe = (r) => (isPrevidencia(r) ? 'prev' : isRV(r) ? 'rv' : 'rf')
  const porClasse = { rf: 0, rv: 0, prev: 0 }
  carteira.forEach((r) => { porClasse[classe(r)] += n0(r.TOTAL_ATUAL) })
  const liquidez = carteira.filter((r) => classe(r) === 'rf' && LIQUIDO.test(`${r.TIPO_PRODUTO || ''} ${r.PRODUTO || ''}`)).reduce((t, r) => t + n0(r.TOTAL_ATUAL), 0)
  const reservaAlvo = perfil.reservaMeses * gasto
  const reservaMeses = gasto > 0 ? liquidez / gasto : null
  const rvPct = patrimonio ? porClasse.rv / patrimonio : 0
  const produtos = buildProducts(data).filter((e) => e.ativo)

  const recs = []
  const add = (r) => recs.push({ evidencias: [], impacto: null, acao: null, ...r })
  const M = { cur, renda, gasto, gastoParc, sobra, taxa, meses: nBase, patrimonio, liquidez, reservaMeses, reservaAlvo, reservaMesesAlvo: perfil.reservaMeses, disc, discPct: renda > 0 ? disc / renda : null, rvPct, rfPct: patrimonio ? porClasse.rf / patrimonio : 0, prevPct: patrimonio ? porClasse.prev / patrimonio : 0, porClasse }

  // ---------- 1) contas vencidas e do mês ----------
  const abertos = items.map((x) => ({ ...x, st: dueStatus(x.it, x.ym, cur), aberto: x.v - itemPaid(x.it, x.ym, cur) })).filter((x) => (x.st === 'vencida' || x.st === 'vence') && x.aberto > 0)
  const venc = abertos.filter((x) => x.st === 'vencida'), vmes = abertos.filter((x) => x.st === 'vence')
  const sum = (a) => a.reduce((t, x) => t + x.aberto, 0)
  const lista = (a) => [...a].sort((x, y) => y.aberto - x.aberto).slice(0, 8).map((x) => `${x.it.NOME || 'Despesa'} (${x.r.TIPO_CONTA} · ${shortYM(x.ym)}): ${money(x.aberto)}`)
  if (venc.length) add({ id: 'vencidas', tipo: 'gasto', prioridade: 'alta', icon: '⏰', titulo: `${venc.length} despesa${venc.length > 1 ? 's' : ''} vencida${venc.length > 1 ? 's' : ''} sem baixa`, resumo: `Há ${money(sum(venc))} em despesas de meses anteriores sem pagamento registrado. Se já pagou, dê a baixa; se não, regularize para evitar juros e multa.`, evidencias: lista(venc), impacto: { label: `${money(sum(venc))} em aberto`, valor: sum(venc) }, acao: { tab: 'despesas', label: 'Ver em Despesas' } })
  if (vmes.length) {
    const cobre = liquidez >= sum(vmes)
    add({ id: 'vence-mes', tipo: 'gasto', prioridade: 'media', icon: '📅', titulo: `${vmes.length} despesa${vmes.length > 1 ? 's' : ''} para pagar neste mês`, resumo: `Faltam ${money(sum(vmes))} em despesas do mês atual. ${liquidez ? (cobre ? 'Sua reserva em liquidez diária cobre esse valor.' : 'Esse valor é maior que a sua reserva em liquidez diária: confira o fluxo do mês.') : 'Separe esse valor antes do vencimento.'}`, evidencias: lista(vmes), impacto: { label: money(sum(vmes)), valor: sum(vmes) }, acao: { tab: 'despesas', label: 'Ver em Despesas' } })
  }

  // ---------- 2) quanto sobra por mês ----------
  if (nBase && renda <= 0 && gasto > 0) add({ id: 'sem-renda', tipo: 'organizacao', prioridade: 'media', icon: '🧾', titulo: 'Cadastre suas entradas para medir a sobra', resumo: 'Há despesas no histórico, mas nenhuma entrada no Extrato. Sem elas não dá para calcular a taxa de poupança nem sugerir quanto aportar.', acao: { tab: 'extrato', label: 'Ir para o Extrato' } })
  if (taxa != null) {
    const meta = renda * 0.2
    if (sobra < 0) add({ id: 'deficit', tipo: 'gasto', prioridade: 'alta', icon: '🚨', titulo: 'Você gasta mais do que recebe', resumo: `Nos últimos ${nBase} meses a média de despesas (${money(gasto)}) passou a de entradas (${money(renda)}), um déficit de ${money(-sobra)} por mês. Cortar gastos supérfluos e renegociar contas fixas vem antes de qualquer investimento.`, impacto: { label: `déficit ${money(-sobra)}/mês`, valor: -sobra * 12 }, acao: { tab: 'despesas', label: 'Ver Despesas' } })
    else if (taxa < 0.1) add({ id: 'poupanca-baixa', tipo: 'gasto', prioridade: 'media', icon: '📉', titulo: `Taxa de poupança baixa (${pct(taxa)})`, resumo: `Sobram ${money(sobra)} por mês (${pct(taxa)} da renda). Uma meta comum é guardar cerca de 20%: ${money(meta)}. Faltam ${money(meta - sobra)} por mês, que podem sair dos gastos supérfluos.`, impacto: { label: `+${money(meta - sobra)}/mês para chegar a 20%`, valor: (meta - sobra) * 12 }, acao: { tab: 'despesas', label: 'Ver Despesas' } })
    else if (taxa < 0.2) add({ id: 'poupanca-quase', tipo: 'insight', prioridade: 'baixa', icon: '🌱', titulo: `Taxa de poupança de ${pct(taxa)}: perto da meta de 20%`, resumo: `Você guarda ${money(sobra)} por mês. Para chegar a 20% da renda (${money(meta)}) faltam ${money(meta - sobra)} por mês, algo que os gastos supérfluos costumam cobrir.`, impacto: { label: `+${money(meta - sobra)}/mês para 20%`, valor: (meta - sobra) * 12 }, acao: { tab: 'despesas', label: 'Ver Despesas' } })
    else add({ id: 'poupanca-boa', tipo: 'insight', prioridade: 'baixa', icon: '✅', titulo: `Boa taxa de poupança (${pct(taxa)})`, resumo: `Você guarda cerca de ${money(sobra)} por mês. O ponto agora é dar destino a esse valor: veja o plano da sobra abaixo.` })
  }

  // ---------- 3) assinaturas e gastos recorrentes pequenos ----------
  const porNome = new Map()
  items.forEach((x) => { if (x.v > 0 && !x.it.PARCELAMENTO) { const k = nm(x.it.NOME); if (k) { if (!porNome.has(k)) porNome.set(k, { nome: x.it.NOME, cat: x.cat, meses: new Map() }); porNome.get(k).meses.set(x.ym, (porNome.get(k).meses.get(x.ym) || 0) + x.v) } } })
  const recorrentes = []
  porNome.forEach((e, k) => {
    const ult = [...e.meses.keys()].sort().at(-1)
    if (!ult || ult < addMonths(cur, -2)) return // não aparece há mais de 2 meses
    const vals = [...e.meses.values()], md = median(vals)
    const cv = md ? Math.max(...vals.map((x) => Math.abs(x - md))) / md : 1 // assinatura de verdade cobra o mesmo valor todo mês
    const assin = /assinatur|streaming/i.test(e.cat)
    if (!ESSENCIAL.test(e.nome) && (assin || ([1, 2, 3, 4].filter((i) => e.meses.has(addMonths(cur, -i))).length >= 3 && cv <= 0.03 && md <= 250 && !ESSENCIAL.test(e.cat)))) recorrentes.push({ nome: e.nome, valor: e.meses.get(ult) || md })
  })
  if (recorrentes.length >= 2) {
    const tot = recorrentes.reduce((t, x) => t + x.valor, 0)
    add({ id: 'assinaturas', tipo: 'gasto', prioridade: tot >= 200 ? 'media' : 'baixa', icon: '🔁', titulo: `${recorrentes.length} cobranças recorrentes pequenas somam ${money(tot)}/mês`, resumo: `Assinaturas e serviços fixos custam ${money(tot * 12)} por ano. Revise quais você realmente usa: cada R$ 100 cancelados por mês viram R$ 1.200 por ano.`, evidencias: recorrentes.sort((a, b) => b.valor - a.valor).slice(0, 10).map((x) => `${x.nome}: ${money(x.valor)}/mês`), impacto: { label: `${money(tot * 12)}/ano`, valor: tot * 12 }, acao: { tab: 'despesas', label: 'Ver em Despesas' } })
  }

  // ---------- 4) categoria que subiu no último mês ----------
  if (prev3.length >= 2 && hist[lm]) {
    const subiu = Object.entries(catMonth).map(([cat, byM]) => {
      const ult = byM[lm] || 0, base = prev3.reduce((t, k) => t + (byM[k] || 0), 0) / prev3.length
      return { cat, ult, base, delta: ult - base }
    }).filter((c) => c.delta >= 150 && (c.base > 0 ? c.ult >= c.base * 1.25 : c.ult >= 300) && c.cat !== 'Sem categoria').sort((a, b) => b.delta - a.delta).slice(0, 3)
    subiu.forEach((c) => {
      const top = items.filter((x) => x.ym === lm && x.cat === c.cat && x.v > 0).sort((a, b) => b.v - a.v).slice(0, 4).map((x) => `${x.it.NOME}: ${money(x.v)}`)
      add({ id: `cat-subiu:${c.cat.toLowerCase()}`, tipo: 'gasto', prioridade: 'media', icon: '📈', titulo: `${c.cat} subiu em ${shortYM(lm)}`, resumo: c.base > 0 ? `Gasto de ${money(c.ult)} contra a média de ${money(c.base)} dos 3 meses anteriores (+${pct(c.ult / c.base - 1, 0)}, ${money(c.delta)} a mais). Veja se foi pontual ou se virou hábito.` : `Gasto novo de ${money(c.ult)} em ${shortYM(lm)}, sem registro nos 3 meses anteriores.`, evidencias: top, impacto: { label: `+${money(c.delta)} no mês`, valor: c.delta }, acao: { tab: 'despesas', label: 'Ver em Despesas' } })
    })
  }

  // ---------- 5) peso dos gastos supérfluos ----------
  if (disc > 0 && (renda > 0 ? disc / renda >= 0.15 : gasto > 0 && disc / gasto >= 0.25)) {
    const sev = renda > 0 && disc / renda >= 0.25
    add({ id: 'discricionarios', tipo: 'gasto', prioridade: sev ? 'alta' : 'media', icon: '✂️', titulo: `Gastos supérfluos somam ${money(disc)}/mês${renda > 0 ? ` (${pct(disc / renda, 0)} da renda)` : ''}`, resumo: `Cortar 15% desses gastos libera ${money(disc * 0.15)} por mês (${money(disc * 0.15 * 12)} por ano) sem mexer nas contas essenciais. Use o simulador abaixo para ver quanto isso rende.`, evidencias: categorias.filter((c) => c.disc).slice(0, 8).map((c) => `${c.nome}: ${money(c.media)}/mês`), impacto: { label: `até ${money(disc * 0.15 * 12)}/ano`, valor: disc * 0.15 * 12 }, acao: { tab: 'despesas', label: 'Ver em Despesas' } })
  }

  // ---------- 6) itens fora da curva e cobranças repetidas ----------
  const fora = []
  porNome.forEach((e) => {
    const ult = e.meses.get(lm), hist2 = [...e.meses.entries()].filter(([k]) => k < lm).map(([, v]) => v)
    if (ult && hist2.length >= 3) { const md = median(hist2); if (md > 0 && ult >= md * 1.5 && ult - md >= 100) fora.push({ nome: e.nome, ult, md }) }
  })
  if (fora.length) add({ id: 'fora-da-curva', tipo: 'gasto', prioridade: 'baixa', icon: '🔎', titulo: `${fora.length} despesa${fora.length > 1 ? 's' : ''} acima do normal em ${shortYM(lm)}`, resumo: 'Estes itens custaram bem mais que a mediana dos meses anteriores. Confira se houve erro de cobrança, reajuste ou consumo fora do comum.', evidencias: fora.sort((a, b) => (b.ult - b.md) - (a.ult - a.md)).slice(0, 6).map((x) => `${x.nome}: ${money(x.ult)} (normal ≈ ${money(x.md)})`), acao: { tab: 'despesas', label: 'Ver em Despesas' } })
  const dups = []
  despesas.filter((r) => monthOf(r.DATA) >= addMonths(cur, -3)).forEach((r) => {
    const c = new Map()
    ;(r.ITENS || []).forEach((it) => { const v = n0(it.VALOR); if (v >= 20 && !it.PARCELAMENTO) { const k = `${nm(it.NOME)}|${v}`; c.set(k, [...(c.get(k) || []), it]) } })
    c.forEach((list) => { if (list.length > 1) dups.push(`${r.TIPO_CONTA} · ${shortYM(monthOf(r.DATA))}: ${list[0].NOME} ${money(list[0].VALOR)} aparece ${list.length}×`) })
  })
  if (dups.length) add({ id: 'duplicadas', tipo: 'gasto', prioridade: 'media', icon: '👯', titulo: 'Possíveis cobranças duplicadas', resumo: 'Há itens com o mesmo nome e valor repetidos na mesma fatura. Podem ser compras iguais ou lançamento em dobro.', evidencias: dups.slice(0, 6), acao: { tab: 'despesas', label: 'Ver em Despesas' } })

  // ---------- 7) parcelamentos ----------
  const parcelas = new Map()
  items.forEach((x) => {
    const p = x.it.PARCELAMENTO
    if (!p || x.ym < cur) return
    const id = p.id || nm(x.it.NOME)
    const e = parcelas.get(id) || { nome: String(x.it.NOME).replace(/\s*\(\d+\/\d+\)\s*$/, ''), valor: x.v, restam: 0, fim: x.ym }
    if (x.v - Math.min(x.v, n0(p.valorPago)) > 0) e.restam += 1 // parcela ainda sem baixa completa
    if (x.ym > e.fim) e.fim = x.ym
    parcelas.set(id, e)
  })
  const ativas = [...parcelas.values()].filter((e) => e.restam > 0)
  const parcAtual = items.filter((x) => x.ym === cur && x.it.PARCELAMENTO && x.v > 0).reduce((t, x) => t + x.v, 0)
  if (ativas.length && renda > 0 && parcAtual / renda >= 0.15) {
    const r = parcAtual / renda
    add({ id: 'parcelas', tipo: 'gasto', prioridade: r >= 0.3 ? 'alta' : 'media', icon: '💳', titulo: `Parcelas comprometem ${pct(r, 0)} da renda`, resumo: `Neste mês ${money(parcAtual)} da sua renda já estão comprometidos com parcelas. Evite novos parcelamentos até esse peso cair; o que vence antes libera dinheiro primeiro.`, evidencias: ativas.sort((a, b) => a.fim.localeCompare(b.fim)).slice(0, 8).map((e) => `${e.nome}: ${money(e.valor)}/mês · faltam ${e.restam} parcela${e.restam > 1 ? 's' : ''} (até ${shortYM(e.fim)})`), impacto: { label: `${money(parcAtual)}/mês`, valor: parcAtual * 12 }, acao: { tab: 'despesas', label: 'Ver em Despesas' } })
  }
  const termina = new Map()
  ativas.forEach((e) => { termina.set(e.fim, (termina.get(e.fim) || 0) + e.valor) })
  const proximo = [...termina.entries()].filter(([ym]) => ym > cur && ym <= addMonths(cur, 8)).sort((a, b) => a[0].localeCompare(b[0]))[0]
  if (proximo) add({ id: 'parcelas-terminam', tipo: 'insight', prioridade: 'baixa', icon: '🎯', titulo: `Em ${shortYM(addMonths(proximo[0], 1))}, ${money(proximo[1])}/mês ficam livres`, resumo: `As últimas parcelas de ${ativas.filter((e) => e.fim === proximo[0]).map((e) => e.nome).join(', ')} vencem em ${shortYM(proximo[0])}. Combine desde já que esse valor vai direto para investimento, antes de virar gasto novo.`, impacto: { label: `${money(proximo[1] * 12)}/ano`, valor: proximo[1] * 12 }, acao: { tab: 'projecao', label: 'Ver Projeção' } })

  // ---------- 8) despesas sem categoria ----------
  const ult3 = items.filter((x) => x.ym >= addMonths(cur, -3) && x.ym < cur && x.v > 0)
  const totU = ult3.reduce((t, x) => t + x.v, 0), semC = ult3.filter((x) => x.cat === 'Sem categoria').reduce((t, x) => t + x.v, 0)
  if (totU > 0 && semC / totU >= 0.3 && semC >= 300) add({ id: 'sem-categoria', tipo: 'organizacao', prioridade: 'baixa', icon: '🏷️', titulo: `${pct(semC / totU, 0)} das despesas estão sem categoria`, resumo: `${money(semC)} dos últimos 3 meses não têm categoria. Categorizar deixa estas recomendações mais precisas (por exemplo, achar o que é supérfluo).`, acao: { tab: 'despesas', label: 'Categorizar em Despesas' } })

  // ---------- 9) reserva de emergência ----------
  const cenario = cenarioJuros(selic, cdi)
  if (gasto > 0 && carteira.length) {
    const falta = Math.max(0, reservaAlvo - liquidez), prazo = sobra > 0 && falta > 0 ? Math.ceil(falta / sobra) : null
    const dica = cenario && cenario.cdi ? ` Hoje o CDI está em ${cenario.cdi.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.a.: Tesouro Selic ou CDB de liquidez diária pagando 100% do CDI ou mais servem bem.` : ''
    if (reservaMeses < 3) add({ id: 'reserva', tipo: 'alocacao', prioridade: 'alta', icon: '🛟', titulo: `Reserva de emergência cobre só ${reservaMeses.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mês${reservaMeses >= 1.95 ? 'es' : ''}`, resumo: `Você tem ${money(liquidez)} em liquidez diária e gasta cerca de ${money(gasto)} por mês. Para o perfil ${perfil.label.toLowerCase()}, o alvo é ${perfil.reservaMeses} meses (${money(reservaAlvo)}); faltam ${money(falta)}.${prazo ? ` Com a sobra atual (${money(sobra)}/mês) leva cerca de ${prazo} mês${prazo > 1 ? 'es' : ''}.` : ''}${dica}`, impacto: { label: `faltam ${money(falta)}`, valor: falta }, acao: { tab: 'carteira', label: 'Ver Carteira' } })
    else if (reservaMeses < perfil.reservaMeses) add({ id: 'reserva', tipo: 'alocacao', prioridade: 'media', icon: '🛟', titulo: `Reserva de emergência em ${reservaMeses.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de ${perfil.reservaMeses} meses`, resumo: `Faltam ${money(falta)} para o alvo do perfil ${perfil.label.toLowerCase()}.${prazo ? ` Com a sobra atual leva cerca de ${prazo} mês${prazo > 1 ? 'es' : ''}.` : ''}${dica}`, impacto: { label: `faltam ${money(falta)}`, valor: falta }, acao: { tab: 'carteira', label: 'Ver Carteira' } })
    else if (reservaMeses > perfil.reservaMeses * 1.7) { const exc = liquidez - perfil.reservaMeses * 1.3 * gasto; if (exc > 1000) add({ id: 'reserva-excesso', tipo: 'alocacao', prioridade: 'baixa', icon: '💤', titulo: `Cerca de ${money0(exc)} parados em liquidez diária`, resumo: `Sua reserva cobre ${reservaMeses.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses, acima do alvo de ${perfil.reservaMeses}. O excedente pode ir para prazos maiores (LCI/LCA, Tesouro IPCA+) ou para a parte de renda variável do seu perfil.`, impacto: { label: `${money0(exc)} a realocar`, valor: exc }, acao: { tab: 'carteira', label: 'Ver Carteira' } }) }
  }

  // ---------- 10) alocação e riscos ----------
  if (patrimonio > 0) {
    const alvoRv = perfil.rv, dif = rvPct * 100 - alvoRv
    if (Math.abs(dif) >= 10) {
      const valor = Math.abs(dif / 100) * patrimonio, meses = sobra > 0 ? Math.ceil(valor / sobra) : null
      if (dif > 0) add({ id: 'rv-acima', tipo: 'risco', prioridade: dif >= 25 ? 'alta' : 'media', icon: '⚖️', titulo: `Renda variável em ${pct(rvPct, 0)}, acima do alvo de ${alvoRv}% do perfil ${perfil.label.toLowerCase()}`, resumo: `Ações, FIIs e ETFs somam ${money(porClasse.rv)}. Para voltar ao alvo faltaria direcionar cerca de ${money0(valor)} para renda fixa${meses ? `; só com novos aportes (${money0(sobra)}/mês) leva uns ${meses} meses, sem precisar vender` : ''}.`, evidencias: [`Renda fixa: ${pct(M.rfPct, 0)}`, `Renda variável: ${pct(rvPct, 0)}`, `Previdência: ${pct(M.prevPct, 0)}`], acao: { tab: 'carteira', label: 'Ver Carteira' } })
      else add({ id: 'rv-abaixo', tipo: 'alocacao', prioridade: 'baixa', icon: '⚖️', titulo: `Renda variável em ${pct(rvPct, 0)}, abaixo do alvo de ${alvoRv}% do perfil ${perfil.label.toLowerCase()}`, resumo: `Para chegar ao alvo, cerca de ${money0(valor)} iriam para renda variável (ações, FIIs, ETFs)${meses ? `. Só com novos aportes (${money0(sobra)}/mês) são uns ${meses} meses, sem vender nada` : ''}. Faça isso aos poucos e só depois da reserva de emergência.`, evidencias: [`Renda fixa: ${pct(M.rfPct, 0)}`, `Renda variável: ${pct(rvPct, 0)}`, `Previdência: ${pct(M.prevPct, 0)}`], acao: { tab: 'carteira', label: 'Ver Carteira' } })
    }
    const conc = produtos.filter((e) => e.kind === 'rv' ? e.share >= 0.15 : !SOBERANO.test(`${e.tipoProduto} ${e.produto}`) && e.share >= 0.3).sort((a, b) => b.share - a.share)
    if (conc.length) add({ id: 'concentracao', tipo: 'risco', prioridade: conc[0].share >= 0.25 ? 'alta' : 'media', icon: '🎯', titulo: `${conc[0].title} concentra ${pct(conc[0].share, 0)} da carteira`, resumo: 'Muito dinheiro num só papel ou produto aumenta o risco. Novos aportes podem ir para outros ativos até a posição pesar menos (referência comum: menos de 15% por papel de renda variável).', evidencias: conc.slice(0, 6).map((e) => `${e.title}: ${money(e.atual)} (${pct(e.share, 0)})`), acao: { tab: 'carteira', label: 'Ver Carteira' } })
    // FGC: R$ 250 mil por CPF por instituição
    const porBanco = new Map()
    carteira.filter((r) => classe(r) === 'rf' && !SOBERANO.test(`${r.TIPO_PRODUTO} ${r.PRODUTO}`) && r.BANCO).forEach((r) => porBanco.set(r.BANCO, (porBanco.get(r.BANCO) || 0) + n0(r.TOTAL_ATUAL)))
    const acima = [...porBanco.entries()].filter(([, v]) => v > 250000)
    if (acima.length) add({ id: 'fgc', tipo: 'risco', prioridade: 'alta', icon: '🏦', titulo: 'Valor acima da garantia do FGC numa instituição', resumo: 'O FGC garante até R$ 250 mil por CPF em cada instituição financeira. O que passa disso fica sem garantia: considere distribuir entre instituições.', evidencias: acima.map(([b, v]) => `${b}: ${money(v)} (excede ${money(v - 250000)})`), acao: { tab: 'carteira', label: 'Ver Carteira' } })
    // posições no prejuízo
    const perd = produtos.filter((e) => e.kind === 'rv' && e.varp <= -0.1 && e.atual >= 500).sort((a, b) => a.varp - b.varp)
    if (perd.length) add({ id: 'prejuizo', tipo: 'risco', prioridade: 'baixa', icon: '🔻', titulo: `${perd.length} posição${perd.length > 1 ? 'ões' : ''} de renda variável com queda de 10% ou mais`, resumo: 'Vale rever o motivo de ter comprado: a tese continua valendo? Isto não é sugestão de vender; só um lembrete para decidir com calma, sem aportar por impulso.', evidencias: perd.slice(0, 6).map((e) => `${e.title}: ${pct(e.varp, 1)} sobre o custo (${money(e.rend)})`), acao: { tab: 'carteira', label: 'Ver Carteira' } })
    // renda fixa abaixo do CDI
    if (cdiV > 0) {
      const lentas = carteira.filter((r) => classe(r) === 'rf' && n0(r.VLR_APLICACAO) >= 1000 && n0(r.PERIODO) >= 90).map((r) => ({ r, ann: (n0(r.TOTAL_ATUAL) / n0(r.VLR_APLICACAO)) ** (365 / n0(r.PERIODO)) - 1 })).filter((x) => x.ann < (cdiV / 100) * 0.9 * (ISENTO_IR.test(`${x.r.TIPO_PRODUTO} ${x.r.PRODUTO}`) ? 0.85 : 1)) // isentas de IR: compara com o CDI já descontado de 15%
      if (lentas.length) add({ id: 'abaixo-cdi', tipo: 'alocacao', prioridade: 'media', icon: '🐢', titulo: `${lentas.length} aplicaç${lentas.length > 1 ? 'ões' : 'ão'} de renda fixa rendendo menos que o CDI`, resumo: `Rentabilidade bruta anualizada abaixo de 90% do CDI (${cdiV.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.a.). Pode ser o tipo de título (IPCA+ e prefixados oscilam na marcação a mercado), valor desatualizado ou taxa fraca: confira antes de decidir.`, evidencias: lentas.sort((a, b) => a.ann - b.ann).slice(0, 6).map((x) => `${x.r.PRODUTO || x.r.TIPO_PRODUTO}: ${pct(x.ann, 1)} a.a. (${money(x.r.TOTAL_ATUAL)})`), acao: { tab: 'carteira', label: 'Ver Carteira' } })
    }
    // IOF
    const iof = carteira.filter((r) => r.IOF === 'SIM' && n0(r.VLR_APLICACAO) >= 1000)
    if (iof.length) add({ id: 'iof', tipo: 'alocacao', prioridade: 'baixa', icon: '🕒', titulo: 'Aplicações ainda no prazo do IOF', resumo: 'Resgatar antes de 30 dias de aplicação paga IOF. Se não precisa do dinheiro agora, espere a data abaixo.', evidencias: iof.map((r) => { const d = new Date(`${String(r.DATA_APLICACAO).slice(0, 10)}T12:00:00`); d.setDate(d.getDate() + 31); return `${r.PRODUTO || r.TIPO_PRODUTO}: ${money(r.TOTAL_ATUAL)} · sem IOF a partir de ${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}` }), acao: { tab: 'carteira', label: 'Ver Carteira' } })
    // valores desatualizados
    const ultimas = carteira.map((r) => String(r.ULTIMA_ATUAL || '').slice(0, 10)).filter(Boolean).sort()
    const antiga = ultimas[ultimas.length - 1]
    if (antiga) { const dias = Math.round((now - new Date(`${antiga}T12:00:00`)) / 864e5); if (dias > 30) add({ id: 'carteira-antiga', tipo: 'organizacao', prioridade: 'baixa', icon: '🗓️', titulo: `Carteira sem atualização há ${dias} dias`, resumo: 'As análises de alocação e rentabilidade dependem dos valores atuais. Atualize preços e saldos para as recomendações refletirem a realidade.', acao: { tab: 'carteira', label: 'Atualizar Carteira' } }) }
    // renda passiva
    const prov12 = extrato.filter((r) => (r.CATEGORIA || categorize(r)) === 'Proventos' && String(r[D] || '') >= `${addMonths(cur, -11)}-01`).reduce((t, r) => t + n0(r[V]), 0)
    const yRv = porClasse.rv > 0 ? prov12 / porClasse.rv : 0
    if (prov12 > 0 && gasto > 0) add({ id: 'renda-passiva', tipo: 'insight', prioridade: 'baixa', icon: '💹', titulo: `Proventos cobrem ${pct(prov12 / 12 / gasto, 1)} das suas despesas`, resumo: `Nos últimos 12 meses os proventos somaram ${money(prov12)} (média de ${money(prov12 / 12)} por mês). Reinvesti-los acelera esse número.${yRv > 0 ? ` Com o rendimento atual da renda variável (${pct(yRv, 1)} ao ano), cobrir 100% das despesas pediria cerca de ${money0((gasto * 12) / yRv)} investidos.` : ''}`, acao: { tab: 'renda', label: 'Ver Renda por papel' } })
    // PGBL
    const temPgbl = carteira.some((r) => /\bPGBL\b/i.test(`${r.TIPO_PRODUTO} ${r.PRODUTO}`))
    if (!temPgbl && taxa != null && taxa >= 0.1 && renda > 0) add({ id: 'pgbl', tipo: 'insight', prioridade: 'baixa', icon: '🧮', titulo: 'PGBL pode reduzir o imposto de renda', resumo: 'Quem faz a declaração completa pode deduzir aportes em PGBL de até 12% da renda bruta anual. O benefício é adiar o imposto, e depende do seu caso. Converse com um contador antes de decidir.' })
  }

  // ---------- plano para a sobra mensal ----------
  const plano = []
  if (nBase && sobra > 0) {
    let resto = sobra
    if (sum(venc)) { plano.push({ titulo: 'Regularize o que está vencido', detalhe: `${money(sum(venc))} em despesas sem baixa: pague ou negocie primeiro.`, valor: Math.min(resto, sum(venc)), unico: true }) }
    const falta = Math.max(0, reservaAlvo - liquidez)
    if (carteira.length && gasto > 0 && falta > 0) { const meses = Math.ceil(falta / sobra); plano.push({ titulo: 'Complete a reserva de emergência', detalhe: `Aporte a sobra inteira em liquidez diária por cerca de ${meses} mês${meses > 1 ? 'es' : ''} (faltam ${money(falta)}).`, valor: resto }); resto = 0 }
    if (resto > 0 && patrimonio > 0) {
      const dif = rvPct * 100 - perfil.rv
      if (dif <= -5) plano.push({ titulo: 'Aumente a renda variável aos poucos', detalhe: `Está em ${pct(rvPct, 0)} e o alvo é ${perfil.rv}%. Divida o aporte mensal entre FIIs, ações e ETFs que você já acompanha.`, valor: resto })
      else if (dif >= 5) plano.push({ titulo: 'Direcione novos aportes para renda fixa', detalhe: `A renda variável está em ${pct(rvPct, 0)}, acima do alvo de ${perfil.rv}%. Aporte em renda fixa até reequilibrar, sem vender.`, valor: resto })
      else plano.push({ titulo: 'Mantenha a proporção da carteira', detalhe: `A alocação está perto do alvo do perfil ${perfil.label.toLowerCase()}. Distribua o aporte nas mesmas proporções, inclusive previdência se fizer sentido para você.`, valor: resto })
    } else if (resto > 0) plano.push({ titulo: 'Comece a investir a sobra', detalhe: 'Ainda não há carteira cadastrada: registre seus investimentos para receber um plano de alocação.', valor: resto })
  } else if (nBase && sobra <= 0) plano.push({ titulo: 'Primeiro, feche o déficit', detalhe: 'Sem sobra mensal não há o que investir. Corte os gastos supérfluos e renegocie contas fixas.', valor: 0 })

  const ordem = { alta: 0, media: 1, baixa: 2 }
  recs.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade] || (b.impacto?.valor || 0) - (a.impacto?.valor || 0))
  return { metrics: M, recs, plano, contexto: cenario, categorias, perfil: perfilKey, temDados: !!(nBase || carteira.length || venc.length || vmes.length) }
}
