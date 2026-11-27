import { useMemo, useState } from 'react'
import { PERFIS, PRIORIDADES, TIPOS, simular, money } from './recommend.js'

const PERFIL_TXT = { conservador: 'prioriza segurança e liquidez', moderado: 'equilibra segurança e crescimento', arrojado: 'aceita mais oscilação em busca de retorno' }
const pct = (v, d = 1) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`

// Recomendações automáticas a partir dos dados do app: gastos, reserva, alocação e riscos
export default function Recomendacoes({ analysis, prefs, onPrefs, onGo, cdi }) {
  const { metrics: M, recs, plano, contexto, categorias } = analysis
  const [filtro, setFiltro] = useState('todas')
  const [verOcultas, setVerOcultas] = useState(false)
  const [corte, setCorte] = useState(15) // simulador: % de corte nos gastos supérfluos
  const [meses, setMeses] = useState(24)
  const [pctCdi, setPctCdi] = useState(100)
  const ocultas = prefs.recoOcultas || []
  const ativas = useMemo(() => recs.filter((r) => !ocultas.includes(r.id)), [recs, ocultas])
  const lista = (verOcultas ? recs : ativas).filter((r) => filtro === 'todas' || r.tipo === filtro)
  const contagem = (t) => ativas.filter((r) => t === 'todas' || r.tipo === t).length
  const ocultar = (id) => onPrefs({ ...prefs, recoOcultas: [...new Set([...ocultas, id])] })
  const mostrar = (id) => onPrefs({ ...prefs, recoOcultas: ocultas.filter((x) => x !== id) })

  const discSel = categorias.filter((c) => c.disc).map((c) => c.nome)
  const alternar = (nome) => onPrefs({ ...prefs, recoDiscricionarias: discSel.includes(nome) ? discSel.filter((x) => x !== nome) : [...discSel, nome] })
  const taxaCdi = cdi?.value > 0 ? cdi.value * (pctCdi / 100) : 10 * (pctCdi / 100) // sem CDI, usa 10% a.a. como referência
  const eco = M.disc * (corte / 100)
  const sim = simular({ economiaMensal: eco, meses, taxaAnual: taxaCdi })
  const alta = ativas.filter((r) => r.prioridade === 'alta').length

  if (!analysis.temDados) {
    return <section className="card reco-vazio"><h2>💡 Recomendações</h2><p className="muted">Cadastre entradas, despesas e investimentos para receber recomendações personalizadas.</p></section>
  }

  return <>
    <section className="reco-intro">
      <div>
        <span className="renda-eyebrow">RECOMENDAÇÕES</span>
        <h2>O que fazer com o seu dinheiro agora</h2>
        <p>Sugestões calculadas com os seus próprios dados (despesas, extrato e carteira) e com os juros de hoje. {alta ? <b>{alta} {alta > 1 ? 'pedem' : 'pede'} atenção primeiro.</b> : 'Nada urgente no momento.'}</p>
      </div>
      <label className="renda-period">Seu perfil
        <select value={analysis.perfil} onChange={(e) => onPrefs({ ...prefs, recoPerfil: e.target.value })}>{Object.entries(PERFIS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</select>
        <small className="muted">{PERFIL_TXT[analysis.perfil]}: reserva de {PERFIS[analysis.perfil].reservaMeses} meses e {PERFIS[analysis.perfil].rv}% em renda variável</small>
      </label>
    </section>

    <div className="cards reco-kpis">
      <div className="card kpi"><span className="ic">💰</span><small>Sobra média por mês</small><b className={M.sobra < 0 ? 'neg' : 'pos'}>{money(M.sobra)}</b><small className="muted">{M.taxa != null ? `${pct(M.taxa)} da renda · últimos ${M.meses} meses` : 'sem entradas no Extrato'}</small></div>
      <div className="card kpi"><span className="ic">🛟</span><small>Reserva de emergência</small><b className={M.reservaMeses != null && M.reservaMeses < 3 ? 'neg' : ''}>{M.reservaMeses != null ? `${M.reservaMeses.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses` : '—'}</b><small className="muted">alvo: {M.reservaMesesAlvo} meses · {money(M.liquidez)} em liquidez</small></div>
      <div className="card kpi"><span className="ic">✂️</span><small>Gastos supérfluos</small><b>{money(M.disc)}</b><small className="muted">{M.discPct != null ? `${pct(M.discPct, 0)} da renda por mês` : 'por mês'}</small></div>
      <div className="card kpi"><span className="ic">⚖️</span><small>Renda variável na carteira</small><b>{pct(M.rvPct, 0)}</b><small className="muted">alvo {PERFIS[analysis.perfil].rv}% · renda fixa {pct(M.rfPct, 0)}</small></div>
    </div>

    {contexto && (
      <section className={`card reco-cenario ${contexto.nivel}`}>
        <div className="reco-cenario-nums">
          {contexto.selic && <span><small>Selic</small><b>{contexto.selic.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.a.</b></span>}
          {contexto.cdi && <span><small>CDI</small><b>{contexto.cdi.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.a.</b></span>}
          {contexto.rendimento10k != null && <span><small>R$ 10 mil a 100% do CDI</small><b>≈ {money(contexto.rendimento10k)}/mês</b><small className="muted">bruto, antes do IR</small></span>}
        </div>
        <p><b>Cenário de juros.</b> {contexto.leitura}</p>
      </section>
    )}

    {plano.length > 0 && (
      <section className="card reco-plano">
        <h3>Para onde vai a sua sobra</h3>
        <small className="muted">Ordem sugerida com base nos seus números atuais</small>
        <ol>{plano.map((p, i) => <li key={i}><div><b>{p.titulo}</b><span>{p.detalhe}</span></div>{p.valor > 0 && <em>{money(p.valor)}{p.unico ? '' : '/mês'}</em>}</li>)}</ol>
      </section>
    )}

    <div className="chips reco-filtros" role="group" aria-label="Filtrar recomendações">
      {[['todas', 'Todas'], ...Object.entries(TIPOS)].map(([k, l]) => <button key={k} type="button" className={`chip-btn${filtro === k ? ' on' : ''}`} onClick={() => setFiltro(k)}>{l}<em>{contagem(k)}</em></button>)}
      {ocultas.length > 0 && <button type="button" className={`chip-btn${verOcultas ? ' on' : ''}`} onClick={() => setVerOcultas((v) => !v)}>{verOcultas ? 'Esconder ocultas' : `Mostrar ocultas (${ocultas.length})`}</button>}
    </div>

    <div className="reco-lista">
      {lista.map((r) => {
        const oculta = ocultas.includes(r.id)
        return (
          <article key={r.id} className={`reco-card ${r.prioridade}${oculta ? ' oculta' : ''}`}>
            <header>
              <span className="reco-ic" aria-hidden="true">{r.icon}</span>
              <div className="reco-tit"><h3>{r.titulo}</h3><div className="reco-tags"><span className={`reco-prio ${r.prioridade}`}>{PRIORIDADES[r.prioridade]}</span><span className="reco-tipo">{TIPOS[r.tipo]}</span></div></div>
              {r.impacto && <span className="reco-impacto">{r.impacto.label}</span>}
            </header>
            <p>{r.resumo}</p>
            {r.evidencias.length > 0 && <details open={r.prioridade === 'alta'}><summary>Ver detalhes ({r.evidencias.length})</summary><ul>{r.evidencias.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
            <footer>
              {r.acao && <button type="button" className="sec sm" onClick={() => onGo(r.acao.tab)}>{r.acao.label} →</button>}
              {oculta ? <button type="button" className="sec sm" onClick={() => mostrar(r.id)}>Voltar a mostrar</button> : <button type="button" className="sec sm" title="Esconder esta recomendação" onClick={() => ocultar(r.id)}>Ocultar</button>}
            </footer>
          </article>
        )
      })}
      {!lista.length && <p className="card muted reco-nada">{filtro === 'todas' ? 'Nenhuma recomendação ativa. Bom sinal!' : 'Nada nesta categoria.'}</p>}
    </div>

    <section className="card reco-sim">
      <h3>Simulador: e se eu cortar os gastos supérfluos?</h3>
      <small className="muted">Quanto vira, aplicando a economia todo mês. Valores brutos, antes do imposto de renda.</small>
      <div className="reco-sim-grid">
        <label>Cortar {corte}% dos supérfluos<input type="range" min="0" max="50" step="5" value={corte} onChange={(e) => setCorte(+e.target.value)} /></label>
        <label>Por {meses} meses<input type="range" min="6" max="60" step="6" value={meses} onChange={(e) => setMeses(+e.target.value)} /></label>
        <label>Rendendo {pctCdi}% do CDI{cdi?.value > 0 ? ` (${taxaCdi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% a.a.)` : ' (CDI indisponível: usando 10% a.a. como referência)'}<input type="range" min="80" max="130" step="5" value={pctCdi} onChange={(e) => setPctCdi(+e.target.value)} /></label>
      </div>
      <div className="reco-sim-out">
        <span><small>Economia por mês</small><b>{money(eco)}</b></span>
        <span><small>Você guarda em {meses} meses</small><b>{money(sim.total)}</b></span>
        <span><small>Com rendimento</small><b className="pos">{money(sim.final)}</b><small className="muted">+{money(sim.rendimento)} de juros</small></span>
      </div>
      <details className="reco-disc">
        <summary>O que conta como supérfluo? ({discSel.length} categoria{discSel.length === 1 ? '' : 's'})</summary>
        <p className="muted">Marque as categorias que você aceitaria cortar. A escolha fica salva no XLSX.</p>
        <div className="reco-disc-grid">{categorias.map((c) => <label key={c.nome}><input type="checkbox" checked={c.disc} onChange={() => alternar(c.nome)} /> {c.nome} <small className="muted">{money(c.media)}/mês</small></label>)}</div>
        {Array.isArray(prefs.recoDiscricionarias) && <button type="button" className="sec sm" onClick={() => onPrefs({ ...prefs, recoDiscricionarias: null })}>Voltar ao automático</button>}
      </details>
    </section>

    <p className="muted reco-aviso">As recomendações são automáticas e usam só os dados que você cadastrou; não consideram sua idade, objetivos, impostos nem o mercado em detalhe, e não substituem a orientação de um profissional. Rentabilidade passada não garante resultado futuro.</p>
  </>
}
