import { useEffect, useState } from 'react'

// Guia rápido exibido no primeiro acesso: explica cada aba para quem está começando.
// A chave abaixo fica no localStorage; apagando os dados do site, o guia volta a aparecer.
export const TOUR_KEY = 'fynn-tour-v1'
export const tourSeen = () => { try { return localStorage.getItem(TOUR_KEY) === '1' } catch { return true } }
export const markTourSeen = () => { try { localStorage.setItem(TOUR_KEY, '1') } catch { /* sem armazenamento */ } }

const STEPS = [
  { icon: '👋', title: 'Bem-vindo(a) ao Fynn Control', sub: 'Em 2 minutos você conhece o sistema.', items: [
    'O sistema organiza **investimentos, entradas e despesas** a partir de planilhas (Excel ou CSV). Não precisa de cadastro nem de servidor.',
    '**Seus dados ficam só neste navegador.** Nada é enviado para a internet.',
    'O **arquivo XLSX é o seu banco de dados**: use **⬆ Importar** para abrir a sua planilha e **XLSX** para exportar uma cópia.',
    'Ainda não tem planilha? Na página inicial há **modelos para baixar** e **dados de exemplo** para você explorar.',
  ] },
  { icon: '🧭', title: 'Barra superior', sub: 'Os botões que valem para o sistema inteiro.', items: [
    '**⬆ Importar**: abre uma planilha (.xlsx, .xls ou .csv) e preenche as abas.',
    '**🔍 Buscar** (ou `Ctrl+K`, ou a tecla `/`): procura qualquer papel ou produto e mostra os detalhes.',
    '**CSV**, **XLSX** e **PDF**: exportam a aba atual, todos os dados ou um relatório com gráficos e totais.',
    '**Limpar** apaga todos os dados salvos neste navegador. **☀️/🌙** troca o tema claro e escuro. **❓** abre este guia de novo.',
  ] },
  { icon: '📊', title: 'Dashboard', sub: 'A visão geral da sua vida financeira.', items: [
    'Mostra **patrimônio, total investido, rendimento** e a divisão entre renda fixa (RF) e variável (RV).',
    'Traz gráficos de **proventos por mês, entradas × despesas** e **despesas por grupo e por categoria**, com percentuais.',
    'Use o **filtro de período** no topo para escolher os meses analisados.',
    'Em **Despesas por categoria**, **clique numa barra** para ver todas as despesas daquela categoria.',
  ] },
  { icon: '🔮', title: 'Projeção', sub: 'O que deve acontecer nos próximos meses.', items: [
    'Estima as **entradas, despesas e a sobra de cada mês** a partir da **média dos últimos 3, 6 ou 12 meses**.',
    'As **parcelas em aberto** e as despesas já lançadas nos meses futuros entram nos meses certos. Parcelas que já tiveram **baixa** não entram.',
    'Ajuste as **premissas**: reajuste das entradas e das despesas (%), meses a projetar e o **rendimento do patrimônio** (dá para usar o CDI atual).',
    'Veja o **fluxo de caixa**, a **evolução do patrimônio** e os **meses no vermelho**. No **PDF**, a projeção sai na última página. É uma estimativa, sem impostos nem inflação.',
  ] },
  { icon: '💹', title: 'Renda por papel', sub: 'Quanto cada ativo de renda variável rendeu.', items: [
    'Mostra, para cada papel, quanto ele pagou em **proventos nos últimos 12 meses** em relação ao valor aplicado (o *yield on cost*).',
    'Serve para **comparar quais papéis pagam melhor** e quanto você recebe, em média, por mês.',
    'Há um gráfico com os maiores yields e uma tabela que você pode **ordenar** e **filtrar por ticker**.',
  ] },
  { icon: '💼', title: 'Carteira', sub: 'Seus investimentos, com os cálculos prontos.', items: [
    'Lista seus ativos de **renda fixa (RF)** e **renda variável (RV)**. Rendimento e variação são **calculados automaticamente**.',
    'A aba abre **🔒 travada** para evitar erros de digitação. Use **🔓 Destravar** para editar; ao sair da aba, ela trava de novo.',
    'Se você tem vários lotes do mesmo papel, **editar o preço de um atualiza todos**.',
    'No topo ficam o patrimônio, o total investido, o rendimento e a alocação RF × RV.',
  ] },
  { icon: '🧾', title: 'Extrato', sub: 'Todo o dinheiro que entra.', items: [
    'Registra **proventos, rendimentos, aluguel, salário** e outras entradas. As categorias são reconhecidas **automaticamente**; você pode criar as suas em **＋ Categoria** e **renomear ou excluir** em **🏷️ Gerenciar categorias**.',
    'Filtre por **período, categoria** ou texto. Clique no cabeçalho de uma coluna para **ordenar**.',
    'Use **Colar dados** para copiar uma tabela do Excel ou Google Sheets: o sistema reconhece as colunas e avisa sobre **duplicatas**.',
    'As linhas ficam travadas: para alterar, clique no **lápis ✏️** da linha.',
  ] },
  { icon: '💸', title: 'Despesas — o básico', sub: 'Suas contas organizadas por grupo.', items: [
    'As despesas ficam em **grupos** (ex.: *Cartão de crédito*) e cada grupo tem as **despesas de dentro** (ex.: *Manutenção veicular*).',
    'Cada conta tem uma **subpágina**: clique no cartão da conta para ver o histórico e lançar novas despesas. Em **🎨 Ícone e cor**, personalize a conta.',
    'O assistente **📅 Lançar mês** sugere as contas recorrentes e mostra o valor anterior como referência.',
    'Em **📋 Colar despesas** (ou `Ctrl+V` na aba) você cola vários registros de uma vez.',
    'Para editar uma linha, use o **lápis ✏️**. Para mudar uma despesa de grupo, **arraste-a** para outro grupo do mesmo mês.',
  ] },
  { icon: '🧩', title: 'Despesas — recursos avançados', sub: 'Para quando você já pegou o jeito.', items: [
    '**Valores negativos** (estornos, descontos) **abatem** do total da fatura. Digite `-` antes do valor ou use o botão **±**.',
    '**Despesas parceladas**: em qualquer conta (cartão, financiamento, mensalidade…), o total é dividido em parcelas mensais, com categoria se quiser, e você acompanha o que já foi pago.',
    '**Categorias por item**: classifique cada despesa (ex.: *Amazon — Compras Online*). O sistema sugere a categoria quando a descrição já foi usada.',
    '**Grupo dentro de grupo**: no lápis ✏️, use *Dentro do grupo* (ex.: *Condomínio* dentro de *Aluguel*). O total sobe para o grupo principal.',
    'Os **cartões acima da lista** mostram o **valor total, pago, a pagar e futuro** do que está filtrado (período, grupos e busca na lupa).',
  ] },
  { icon: '🏁', title: 'Resgates', sub: 'O lucro dos investimentos que você resgatou.', items: [
    'Registra os resgates com a **rentabilidade** obtida até a data (o lucro, que pode ser negativo).',
    'Esse valor **soma-se às entradas** no Extrato, no fluxo de caixa e no saldo do Dashboard.',
    'Filtre por **período e produto**. A tabela é paginada e editável pelo lápis ✏️.',
  ] },
  { icon: '📝', title: 'Notas', sub: 'Seu bloco de anotações.', items: [
    'Escreva anotações sobre seus investimentos com **fonte, tamanho, negrito, itálico, sublinhado e cores**.',
    'Tudo é **salvo automaticamente** neste navegador e também vai **dentro do XLSX** quando você exporta.',
  ] },
  { icon: '✅', title: 'Dicas finais', sub: 'Para não perder nada do que você fez.', items: [
    '**Exporte o XLSX com frequência.** Ele é o seu backup: se você limpar os dados do navegador, o que não foi exportado se perde.',
    'Nas tabelas, **clique no cabeçalho** para ordenar, **marque linhas** para excluir várias de uma vez e escolha quantos **itens por página** ver.',
    'No celular, as abas viram uma **barra inferior que rola para o lado** e as tabelas viram **cartões**.',
    'Clique em **❓** a qualquer momento para rever este guia.',
  ] },
]

const rich = (text) => text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/).map((part, i) => {
  if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
  if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
  if (part.startsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
  return part
})

export default function Tour({ onClose }) {
  const [i, setI] = useState(0)
  const step = STEPS[i], last = i === STEPS.length - 1
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, STEPS.length - 1))
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="overlay" onClick={onClose}><div className="modal tour" role="dialog" aria-modal="true" aria-label="Guia rápido" onClick={(e) => e.stopPropagation()}>
    <div className="tour-top"><span className="tour-count">Passo {i + 1} de {STEPS.length}</span><button type="button" className="sec sm" onClick={onClose}>{last ? 'Fechar' : 'Pular guia'}</button></div>
    <div className="tour-head"><span className="tour-ic" aria-hidden="true">{step.icon}</span><div><h3>{step.title}</h3><p className="muted">{step.sub}</p></div></div>
    <ul className="tour-list">{step.items.map((t, k) => <li key={k}>{rich(t)}</li>)}</ul>
    <div className="tour-dots">{STEPS.map((s, k) => <button key={s.title} type="button" className={k === i ? 'on' : ''} aria-label={`Ir para ${s.title}`} title={s.title} onClick={() => setI(k)} />)}</div>
    <div className="actions">
      <button type="button" className="sec" disabled={i === 0} onClick={() => setI(i - 1)}>← Anterior</button>
      {last ? <button type="button" onClick={onClose}>Concluir ✓</button> : <button type="button" onClick={() => setI(i + 1)}>Próximo →</button>}
    </div>
  </div></div>
}
