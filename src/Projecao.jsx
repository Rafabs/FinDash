import { useEffect, useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { KEY, loadProjectionSettings, buildProjection } from './projection.js'

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mes = (k) => k.slice(5) + '/' + k.slice(2, 4)
const compact = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : String(Math.round(v)))
const TT = { contentStyle: { background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx)' }, cursor: { fill: 'var(--hover)' } }

export default function Projecao({ data, cdi }) {
  const [s, setS] = useState(loadProjectionSettings)
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
        <label className="proj-check"><input type="checkbox" checked={!!s.useKnown} onChange={set('useKnown')} />Considerar parcelas em aberto e despesas já lançadas (faturas futuras)</label>
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
          <thead><tr><th>Mês</th><th>Entradas</th><th>Despesas variáveis</th><th>Parcelas em aberto</th><th>Despesas</th><th>Sobra</th><th>Acumulado</th><th>Patrimônio</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.ym}>
            <td className="ro">{mes(r.ym)}</td><td className="ro">{brl(r.Entradas)}</td><td className="ro">{brl(r.Variaveis)}</td><td className="ro">{brl(r.Parcelas)}</td><td className="ro">{brl(r.Despesas)}</td>
            <td className="ro" style={{ color: r.Sobra < 0 ? 'var(--neg)' : 'var(--pos)', fontWeight: 600 }}>{brl(r.Sobra)}</td>
            <td className="ro" style={{ color: r.Acumulado < 0 ? 'var(--neg)' : undefined }}>{brl(r.Acumulado)}</td><td className="ro">{brl(r.Patrimonio)}</td>
          </tr>)}</tbody>
        </table></div>
        <details className="proj-how"><summary>Como a projeção é calculada</summary>
          <ul>
            <li><b>Entradas:</b> média dos meses completos da base (Extrato, incluindo as vendas de patrimônio, mais a rentabilidade dos resgates), com o seu ajuste em %.</li>
            <li><b>Despesas variáveis:</b> média das despesas da base <i>sem as parcelas</i>, com o seu ajuste. Se o mês futuro já tem despesas lançadas, vale o maior valor entre elas e a média.</li>
            <li><b>Parcelas em aberto:</b> as parcelas de cada mês entram nos meses certos, mas <b>só o que ainda não foi pago</b>: parcelas com baixa (total ou parcial) não entram no cálculo futuro. Quando uma compra termina, a despesa cai sozinha.</li>
            <li><b>Sobra:</b> entradas menos despesas. O <b>acumulado</b> soma as sobras.</li>
            <li><b>Patrimônio:</b> o patrimônio atual da Carteira, rendendo à taxa informada, mais a sobra de cada mês. A linha tracejada mostra o patrimônio só com as sobras.</li>
            <li><b>Mês atual (fatura em aberto):</b> fica fora da base por estar incompleto, mas pode entrar na projeção: o que já foi lançado nele (despesas, parcelas e entradas) vale como piso, e a média completa o restante.</li>
            <li>A projeção é uma estimativa e não considera impostos, inflação nem mudanças de renda. </li>
          </ul>
        </details>
      </div>
    </>}
  </>
}
