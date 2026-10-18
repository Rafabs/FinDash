import { useState } from 'react'
import { downloadTemplate } from './data.js'

const FEATURES = [
  ['📊', 'Dashboard inteligente', 'Patrimônio, alocação RF x RV e proventos por mês e por papel, com filtro de período.'],
  ['✏️', 'Tudo editável', 'Edite carteira e extrato direto na tabela. Valores calculados se atualizam sozinhos.'],
  ['🏷️', 'Categorias automáticas', 'Dividendos, rendimentos, aluguel e salário são classificados por você ou pelo app.'],
  ['📋', 'Cole do Excel', 'Copie linhas de qualquer planilha e cole: o app reconhece as colunas e evita duplicatas.'],
  ['📤', 'Exporte em 3 formatos', 'CSV, XLSX e PDF prontos para anexar, guardar ou enviar.'],
  ['🔒', '100% no seu navegador', 'Nenhum dado vai para servidor. Tudo fica salvo só no seu computador.'],
]
const STEPS = [
  ['1', 'Prepare a planilha', 'Use a sua ou baixe o modelo. São 2 abas: Control_Fynn (carteira) e Extrato (entradas).'],
  ['2', 'Importe', 'Arraste o .xlsx (as 2 abas) ou um .csv por vez. O app identifica cada tabela pelo cabeçalho.'],
  ['3', 'Analise e edite', 'Veja o dashboard, ajuste valores, cole novos lançamentos e filtre por período.'],
  ['4', 'Exporte', 'Baixe CSV, XLSX ou PDF quando quiser e continue de onde parou.'],
]
const CART_COLS = [
  ['DATA_APLICACAO', 'Data da compra'], ['QTD_COMPRA', 'Quantidade'], ['PRC_UNIT', 'Preço unitário (em RV, o preço atual do papel)'],
  ['PAPEL', 'Código (ex.: MXRF11) ou N/A em renda fixa'], ['VLR_APLICACAO', 'Total aplicado (RF: calculado · RV: informe)'],
  ['BANCO · TIPO_PRODUTO · PRODUTO', 'Texto livre'], ['TIPO_INV', 'RF ou RV'], ['TOTAL_ATUAL', 'Valor hoje (RV: calculado · RF: informe)'],
  ['ULTIMA_ATUAL', 'Data da última atualização'], ['PERIODO · REND_BRUTO · VAR_PP · IOF', 'Calculadas pelo app (pode deixar em branco)'],
]
const EXT_COLS = [
  ['DATA DE RECEBIMENTO', 'Data da entrada'], ['VALOR DA APLICAÇÃO', 'Valor recebido'], ['ORIGEM · INSTITUIÇÃO · CNPJ / CPF', 'Texto livre'],
  ['TIPO', 'Ex.: DIVIDENDOS 100 MXRF11, SALÁRIO, ALUGUEL'], ['CATEGORIA', 'Opcional: Proventos, Rendimentos, Aluguel, Salário, Outros'],
]
const FAQ = [
  ['Meus dados vão para algum servidor?', 'Não. O app roda inteiro no navegador e salva no armazenamento local. Como limpar o cache apaga esses dados, exporte um XLSX de vez em quando.'],
  ['Posso importar CSV?', 'Pode. Como CSV tem uma única tabela, importe um arquivo por vez (carteira e extrato separados). O XLSX traz as duas abas de uma vez.'],
  ['Qual o formato das datas?', 'AAAA-MM-DD ou DD/MM/AAAA. Valores com ponto decimal na planilha; ao colar, também aceita 1.234,56 e R$.'],
  ['Quero só conhecer, sem planilha.', 'Clique em "Ver com dados de exemplo". Os dados são fictícios e você pode apagar tudo depois no botão Limpar.'],
]

export default function Landing({ onPick, onFile, onDemo }) {
  const [drag, setDrag] = useState(false)
  return (
    <div className="lp">
      <section className="lp-hero">
        <div className="lp-copy">
          <span className="lp-badge">✨ Grátis · sem cadastro · sem servidor</span>
          <h2>Seus investimentos e proventos, <span className="grad">num só painel</span>.</h2>
          <p>Importe sua planilha, edite direto na tela, acompanhe a carteira e os proventos por período e exporte relatórios quando precisar.</p>
          <div className="lp-cta">
            <button onClick={onPick}>⬆ Importar planilha</button>
            <button className="sec" onClick={() => downloadTemplate('xlsx')}>⬇ Baixar modelo .xlsx</button>
            <button className="sec" onClick={onDemo}>👀 Ver com dados de exemplo</button>
          </div>
        </div>
        <div className="lp-mock" aria-hidden="true">
          <div className="m-card big">
            <small>Patrimônio atual</small><b>R$ 128.450,00</b><span className="up">▲ 12,40%</span>
            <div className="m-bars">{[38, 52, 45, 66, 58, 80, 96].map((h, i) => <i key={i} style={{ height: h + '%' }} />)}</div>
          </div>
          <div className="m-card a"><small>Proventos / mês</small><b>R$ 842,10</b></div>
          <div className="m-card b"><div className="m-ring" /><div><small>Alocação</small><b>RF 62%</b></div></div>
        </div>
      </section>

      <div
        className={'lp-drop' + (drag ? ' over' : '')} onClick={onPick}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]) }}
      >
        <span className="lp-up">⬆</span>
        <div><b>Arraste seu arquivo aqui</b><small>ou clique para escolher · .xlsx ou .csv</small></div>
      </div>

      <section>
        <h3 className="lp-h">Como funciona</h3>
        <div className="lp-steps">
          {STEPS.map(([n, t, d]) => <div className="lp-step" key={n}><span>{n}</span><b>{t}</b><p>{d}</p></div>)}
        </div>
      </section>

      <section>
        <h3 className="lp-h">O que você ganha</h3>
        <div className="lp-feats">
          {FEATURES.map(([i, t, d]) => <div className="lp-feat" key={t}><span>{i}</span><b>{t}</b><p>{d}</p></div>)}
        </div>
      </section>

      <section>
        <h3 className="lp-h">Modelos e colunas</h3>
        <p className="lp-sub">Mantenha os cabeçalhos exatamente assim. Baixe um modelo pronto, com exemplos, e substitua pelos seus dados.</p>
        <div className="lp-models">
          <div className="card"><h4>📁 Control_Fynn <small>carteira</small></h4>
            <table><tbody>{CART_COLS.map(([c, d]) => <tr key={c}><td><code>{c}</code></td><td>{d}</td></tr>)}</tbody></table>
            <button className="sec" onClick={() => downloadTemplate('carteira')}>⬇ Modelo CSV da carteira</button></div>
          <div className="card"><h4>🧾 Extrato <small>entradas</small></h4>
            <table><tbody>{EXT_COLS.map(([c, d]) => <tr key={c}><td><code>{c}</code></td><td>{d}</td></tr>)}</tbody></table>
            <button className="sec" onClick={() => downloadTemplate('extrato')}>⬇ Modelo CSV do extrato</button></div>
        </div>
        <div className="lp-cta center"><button onClick={() => downloadTemplate('xlsx')}>⬇ Baixar modelo completo (.xlsx · 2 abas + instruções)</button></div>
      </section>

      <section>
        <h3 className="lp-h">Perguntas frequentes</h3>
        <div className="lp-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>
      <footer className="lp-foot">Fynn Control · feito para rodar no seu navegador 💜</footer>
    </div>
  )
}
