import { useEffect, useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { monthOf, RK } from './data.js'
import { nowYM } from './period.js'

const D = 'DATA DE RECEBIMENTO', V = 'VALOR DA APLICAÇÃO'
const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const mes = (k) => k.slice(5) + '/' + k.slice(2, 4)
const compact = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : String(Math.round(v)))
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}` }
const TT = { contentStyle: { background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx)' }, cursor: { fill: 'var(--hover)' } }

const KEY = 'fynn-proj-v1'
const DEFAULTS = { base: '6', horizon: '12', adjEnt: '0', adjDesp: '0', rate: '0', useKnown: true, includeCurrent: true }
const loadSettings = () => { try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) } } catch { return DEFAULTS } }

// Projeção mês a mês (função pura, fácil de testar).
//  - base: média dos últimos N meses completos de entradas e de despesas
//  - despesas = variáveis (média sem parcelas) + parcelas já lançadas em cada mês futuro
//  - patrimônio = patrimônio atual rendendo a taxa informada + a sobra de cada mês
//  - o mês atual (fatura em aberto) fica fora da base, mas entra na projeção: o que já foi lançado vale como piso
export function buildProjection(data, s, cur = nowYM(), cdiMonthly = 0) {
  const hist = {}
  const slot = (k) => (hist[k] ||= { ent: 0, desp: 0, parc: 0 })
  ;(data.extrato || []).forEach((r) => { if (r.CATEGORIA !== 'Venda de Patrimônio' && r[D]) slot(String(r[D]).slice(0, 7)).ent += Number(r[V]) || 0 })
  ;(data.resgates || []).forEach((r) => { if (r.DATA_RESGATE) slot(String(r.DATA_RESGATE).slice(0, 7)).ent += Number(r[RK]) || 0 })
  ;(data.despesas || []).forEach((r) => {
    const m = slot(monthOf(r.DATA))
    ;(r.ITENS || []).forEach((it) => { const v = Number(it.VALOR) || 0; m.desp += v; if (it.PARCELAMENTO) m.parc += v })
  })
  const past = Object.keys(hist).filter((k) => k < cur && (hist[k].ent || hist[k].desp)).sort()
  const baseN = Math.max(1, Math.round(num(s.base)) || 6), horizon = Math.max(1, Math.round(num(s.horizon)) || 12)
  const baseMonths = past.length ? Array.from({ length: baseN }, (_, i) => addMonths(cur, -(i + 1))).filter((k) => k >= past[0]) : []
  const n = baseMonths.length
  const avg = (f) => (n ? baseMonths.reduce((t, k) => t + f(hist[k] || { ent: 0, desp: 0, parc: 0 }), 0) / n : 0)
  const avgEnt = avg((m) => m.ent), avgDesp = avg((m) => m.desp), avgVar = avg((m) => m.desp - m.parc), avgParc = avg((m) => m.parc)
  const first = s.includeCurrent === false ? 1 : 0
  const adjEnt = 1 + num(s.adjEnt) / 100, adjDesp = 1 + num(s.adjDesp) / 100
  const rate = num(s.rate) / 100, rm = (1 + rate) ** (1 / 12) - 1
  const start = (data.carteira || []).reduce((t, r) => t + (Number(r.TOTAL_ATUAL) || 0), 0)
  let acum = 0, patr = start, patr0 = start
  const rows = Array.from({ length: horizon }, (_, i) => {
    const ym = addMonths(cur, i + first), known = hist[ym] || { ent: 0, desp: 0, parc: 0 }
    const ent = Math.max(avgEnt * adjEnt, s.useKnown ? known.ent : 0)
    const variavel = Math.max(avgVar * adjDesp, s.useKnown ? known.desp - known.parc : 0)
    const parcelas = s.useKnown ? known.parc : 0
    const desp = variavel + parcelas, sobra = ent - desp
    acum += sobra; patr = patr * (1 + rm) + sobra; patr0 += sobra
    const r2 = (x) => Math.round(x * 100) / 100
    return { ym, name: ym, Entradas: r2(ent), Variaveis: r2(variavel), Parcelas: r2(parcelas), Despesas: r2(desp), Sobra: r2(sobra), Acumulado: r2(acum), Patrimonio: r2(patr), SemRendimento: r2(patr0) }
  })
  return { rows, n, avgEnt, avgDesp, avgVar, avgParc, start, cdiMonthly }
}

export default function Projecao({ data, cdi }) {
  const [s, setS] = useState(loadSettings)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* sem armazenamento */ } }, [s])
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const p = useMemo(() => buildProjection(data, s), [data, s])
  const { rows, n } = p
  const sobraMedia = rows.length ? rows.reduce((t, r) => t + r.Sobra, 0) / rows.length : 0
  const negativos = rows.filter((r) => r.Sobra < 0)
  const last = rows[rows.length - 1]
  const delta = last ? last.Patrimonio - p.start : 0

  return <>
    <div className="card proj-controls">
      <h3>Premissas da projeção</h3>
      <div className="proj-grid">
        <label>Base de cálculo<select value={s.base} onChange={set('base')}><option value="3">Média dos últimos 3 meses</option><option value="6">Média dos últimos 6 meses</option><option value="12">Média dos últimos 12 meses</option></select></label>
        <label>Meses a projetar<select value={s.horizon} onChange={set('horizon')}><option value="6">6 meses</option><option value="12">12 meses</option><option value="24">24 meses</option><option value="36">36 meses</option></select></label>
        <label>Ajuste nas entradas (%)<input type="number" step="1" value={s.adjEnt} onChange={set('adjEnt')} /></label>
        <label>Ajuste nas despesas (%)<input type="number" step="1" value={s.adjDesp} onChange={set('adjDesp')} /></label>
        <label>Rendimento do patrimônio (% a.a.)<span className="proj-inline"><input type="number" step="0.1" value={s.rate} onChange={set('rate')} />{cdi && <button type="button" className="sec sm" title="Usar a taxa CDI atual" onClick={() => setS((x) => ({ ...x, rate: String(cdi.value) }))}>CDI {cdi.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</button>}</span></label>
        <label className="proj-check"><input type="checkbox" checked={!!s.useKnown} onChange={set('useKnown')} />Considerar parcelas e despesas já lançadas (faturas futuras)</label>
        <label className="proj-check"><input type="checkbox" checked={s.includeCurrent !== false} onChange={set('includeCurrent')} />Incluir o mês atual (fatura em aberto) na projeção</label>
      </div>
      <p className="proj-note">Base: {n ? `${n} ${n === 1 ? 'mês completo' : 'meses completos'} de histórico` : 'sem histórico'}. Valores em reais, sem impostos e sem inflação. Rendimento a 0% não considera valorização, só as sobras.</p>
    </div>

    {!n && <div className="card proj-warn">Ainda não há entradas ou despesas em meses anteriores para servir de base. Importe uma planilha ou lance dados para ver a projeção.</div>}
    {n > 0 && n < 3 && <div className="card proj-warn">Poucos meses de histórico ({n}): a projeção pode ficar imprecisa.</div>}

    {n > 0 && <>
      <div className="cards">
        <div className="card kpi"><span className="ic">💰</span><small>Entradas médias (base)</small><b>{brl(p.avgEnt)}</b><small>por mês</small></div>
        <div className="card kpi"><span className="ic">🧾</span><small>Despesas médias (base)</small><b>{brl(p.avgDesp)}</b><small>{brl(p.avgParc)} em parcelas</small></div>
        <div className="card kpi"><span className="ic">📈</span><small>Sobra média projetada</small><b className={sobraMedia < 0 ? 'neg' : 'pos'}>{brl(sobraMedia)}</b><small>por mês</small></div>
        <div className="card kpi"><span className="ic">🏦</span><small>Patrimônio em {rows.length} meses</small><b>{brl(last?.Patrimonio)}</b><small className={delta < 0 ? 'neg' : 'pos'}>{delta >= 0 ? '+' : ''}{brl(delta)} sobre hoje</small></div>
        <div className="card kpi"><span className="ic">⚠️</span><small>Meses no vermelho</small><b className={negativos.length ? 'neg' : 'pos'}>{negativos.length}</b><small>{negativos.length ? `1º em ${mes(negativos[0].ym)}` : 'nenhum no período'}</small></div>
      </div>

      <div className="grid">
        <div className="card"><h3>Fluxo de caixa projetado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mes} fontSize={11} minTickGap={16} /><YAxis fontSize={11} tickFormatter={compact} width={52} />
              <Tooltip formatter={(v, name) => [brl(v), name]} labelFormatter={mes} {...TT} /><Legend />
              <Bar dataKey="Entradas" fill="#00d2be" radius={[4, 4, 0, 0]} /><Bar dataKey="Despesas" fill="#ff4d6a" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Sobra" stroke="#c4cad1" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer></div>
        <div className="card"><h3>Patrimônio projetado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs><linearGradient id="projPatr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d2be" stopOpacity={0.45} /><stop offset="100%" stopColor="#00d2be" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid vertical={false} /><XAxis dataKey="name" tickFormatter={mes} fontSize={11} minTickGap={16} /><YAxis fontSize={11} tickFormatter={compact} width={52} domain={['auto', 'auto']} />
              <Tooltip formatter={(v, name) => [brl(v), name]} labelFormatter={mes} {...TT} /><Legend />
              <Area type="monotone" dataKey="Patrimonio" name="Patrimônio" stroke="#00d2be" strokeWidth={2} fill="url(#projPatr)" />
              <Line type="monotone" dataKey="SemRendimento" name="Só com as sobras" stroke="#c4cad1" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer></div>
      </div>

      <div className="card"><h3>Projeção mês a mês</h3>
        <div className="wrap"><table className="rt">
          <thead><tr><th>Mês</th><th>Entradas</th><th>Despesas variáveis</th><th>Parcelas lançadas</th><th>Despesas</th><th>Sobra</th><th>Acumulado</th><th>Patrimônio</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.ym}>
            <td className="ro">{mes(r.ym)}</td><td className="ro">{brl(r.Entradas)}</td><td className="ro">{brl(r.Variaveis)}</td><td className="ro">{brl(r.Parcelas)}</td><td className="ro">{brl(r.Despesas)}</td>
            <td className="ro" style={{ color: r.Sobra < 0 ? 'var(--neg)' : 'var(--pos)', fontWeight: 600 }}>{brl(r.Sobra)}</td>
            <td className="ro" style={{ color: r.Acumulado < 0 ? 'var(--neg)' : undefined }}>{brl(r.Acumulado)}</td><td className="ro">{brl(r.Patrimonio)}</td>
          </tr>)}</tbody>
        </table></div>
        <details className="proj-how"><summary>Como a projeção é calculada</summary>
          <ul>
            <li><b>Entradas:</b> média dos meses completos da base (Extrato mais a rentabilidade dos resgates, sem &quot;Venda de Patrimônio&quot;), com o seu ajuste em %.</li>
            <li><b>Despesas variáveis:</b> média das despesas da base <i>sem as parcelas</i>, com o seu ajuste. Se o mês futuro já tem despesas lançadas, vale o maior valor entre elas e a média.</li>
            <li><b>Parcelas lançadas:</b> as parcelas de cada mês futuro entram nos meses certos. Quando uma compra termina de ser paga, a despesa cai sozinha.</li>
            <li><b>Sobra:</b> entradas menos despesas. O <b>acumulado</b> soma as sobras.</li>
            <li><b>Patrimônio:</b> o patrimônio atual da Carteira, rendendo à taxa informada, mais a sobra de cada mês. A linha tracejada mostra o patrimônio só com as sobras.</li>
            <li><b>Mês atual (fatura em aberto):</b> fica fora da base por estar incompleto, mas pode entrar na projeção: o que já foi lançado nele (despesas, parcelas e entradas) vale como piso, e a média completa o restante.</li>
            <li>A projeção é uma estimativa e não considera impostos, inflação nem mudanças de renda. Parcelas já pagas antecipadamente continuam contando no mês em que vencem.</li>
          </ul>
        </details>
      </div>
    </>}
  </>
}
