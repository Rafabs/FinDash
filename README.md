# 📊 Fynn Control
 
Painel pessoal de **investimentos, proventos e despesas** que roda inteiro no navegador.
Você importa a sua planilha (`.xlsx` ou `.csv`), edita os dados direto na tela, acompanha o dashboard por período e exporta quando quiser.
 
> **Privacidade:** não existe servidor nem banco de dados. Os seus dados ficam apenas no `localStorage` do navegador e nunca são enviados para lugar nenhum. A única consulta externa é pública e não leva nada seu: o **CDI** e a **meta Selic** vêm da API do Banco Central.
 
---
 
## ✨ Funcionalidades
 
**Geral**
- Importação de `.xlsx` (dados e notas) ou `.csv` (uma tabela por arquivo, reconhecida pelo cabeçalho)
- Exportação em **CSV**, **XLSX** e **PDF** (com resumo, **gráficos** e tabelas, todas com linha de **totais** no fim)
- **Busca de produtos** (🔍 no topo, `Ctrl+K` ou `/`; a barra só abre a busca fora de campos de texto, então pode ser digitada normalmente nas Notas): veja detalhes de qualquer papel ou produto (veja [Busca de produtos](#-busca-de-produtos))
- **Seleção múltipla**: marque várias linhas com o checkbox e exclua de uma vez
- Tabelas com **ordenação por cabeçalho** (clique: crescente → decrescente → original; vale para o conjunto filtrado, não só para a página)
- **Itens por página** configurável (20, 30, 40, 50, 100 ou 200; padrão 40) no Extrato, Despesas e Resgates, e a escolha fica salva
- Linhas do Extrato, Despesas e Resgates ficam travadas e só editam pelo **lápis ✏️**
- Tema **claro e escuro** (segue o sistema e lembra a sua escolha)
- **Versão para celular**: abas viram barra inferior, tabelas viram cartões e janelas sobem de baixo da tela
- Abas: **Dashboard**, **Projeção**, **Renda por papel**, **Carteira**, **Extrato**, **Despesas**, **Resgates** e **Notas**
- Landing page com explicação, modelos para download e dados de exemplo
- **Guia rápido** no primeiro acesso, explicando cada aba para quem está começando; o botão **❓** do topo abre o guia de novo (veja [Guia rápido e limpeza de dados](#-guia-rápido-e-limpeza-de-dados))
- Dados salvos automaticamente no navegador
- **Notas pessoais formatadas**: fonte, tamanho, negrito, itálico, sublinhado e cores; salvas automaticamente e preservadas no XLSX
**Carteira**
- Itens de renda fixa (RF) e variável (RV) com cálculos automáticos
- Colunas travadas conforme o tipo (veja [Regras da Carteira](#-regras-da-carteira))
- **Trava geral de edição**: a aba abre **🔒 travada**; o botão **🔓 Destravar** libera os campos editáveis e a exclusão. Ao sair da aba, ela trava de novo
- Lotes do mesmo papel mesclados: editar o preço de um atualiza todos
- Rendimento e variação coloridos (▲ verde / ▼ vermelho) e linhas alternadas
- Painel no topo com patrimônio, total investido, rendimento e alocação RF x RV
**Extrato (entradas)**
- Categorias automáticas: Proventos, Rendimentos, Aluguel, Salário e Outros (mais "Venda de Patrimônio", escolhida manualmente)
- Filtro por **período**, categoria e busca em texto (com botão para limpar)
- **Categorias personalizadas**: crie as suas com **＋ Categoria**; elas aparecem nos filtros, na tabela, no painel e ficam salvas no XLSX
- Tabela paginada e editável
- **Colar dados** do Excel/Google Sheets com reconhecimento automático das colunas, prévia editável e detecção de duplicatas
**Projeção**
- Estima, mês a mês, **entradas, despesas, sobra e acumulado**, e a **evolução do patrimônio**, em 6, 12, 24 ou 36 meses
- Base: **média dos últimos 3, 6 ou 12 meses completos** de entradas (Extrato, **incluindo as vendas de patrimônio**, mais a rentabilidade dos resgates) e de despesas
- **Despesas** = variáveis (média sem as parcelas) + **parcelas em aberto** de cada mês; **parcelas com baixa (total ou parcial) não entram**, só o saldo ainda não pago, e quando uma compra parcelada termina, a despesa cai sozinha. Opcionalmente, despesas já lançadas nos meses futuros valem se forem maiores que a média
- **Premissas:** ajuste das entradas e das despesas (%), horizonte e **rendimento do patrimônio** (% a.a., com atalho para o CDI atual). Ficam salvas no navegador
- **Patrimônio** = patrimônio atual da Carteira rendendo à taxa informada + a sobra de cada mês; a linha tracejada mostra só as sobras. O padrão é 0% a.a., para não contar duas vezes o que já entra como proventos e rendimentos no Extrato
- **PDF:** a Projeção sai na **última página** do relatório (indicadores, gráficos e tabela mês a mês, com totais), usando as premissas que estão salvas na aba
- Mostra indicadores (médias da base, sobra média, patrimônio final, meses no vermelho), dois gráficos e a tabela mês a mês. É uma estimativa: não considera impostos, inflação nem mudança de renda
**Renda por papel** (*yield on cost*)
- Mostra quanto cada papel de renda variável rendeu em proventos nos **últimos 12 meses** em relação ao valor aplicado
- Indicadores: proventos em 12 meses, valor aplicado, *yield on cost* ponderado da carteira e média mensal
- Gráfico com os 8 maiores yields e tabela ordenável (valor aplicado, proventos, média mensal e yield), com filtro por ticker
- Veja a explicação do indicador em [Renda por papel](#-renda-por-papel)
**Resgates**
- Resgates de investimentos com a **rentabilidade** obtida até a data do resgate (lucro, pode ser negativo)
- Esse valor **soma-se às entradas** (Extrato, fluxo de caixa e saldo do dashboard)
- Filtros por período, produto e busca, com tabela editável e paginada
**Despesas**
- Despesas organizadas em **grupos** (ex.: *Cartão de crédito*) com as **despesas de dentro do grupo** (ex.: *Manutenção veicular*)
- **Mover despesas**: arraste uma despesa para **qualquer outro grupo do mesmo mês**. O grupo de origem pode ficar vazio (ele continua na lista, pronto para receber novas despesas) e o destino pode ter o mesmo nome do grupo de origem
- **Grupo dentro de grupo**: no lápis ✏️ da linha, use **"Dentro do grupo…"** (ex.: *Condomínio* dentro de *Aluguel*). O vínculo vale para o grupo inteiro e para os meses seguintes; no resumo, os totais do filho sobem para o grupo principal sem contar duas vezes. O app recusa vínculos circulares (veja [Grupos dentro de grupos](#-grupos-dentro-de-grupos))
- **Valores negativos (abatimentos)**: estornos e descontos entram com valor negativo e **abatem do total da fatura**. Digite `-` antes do valor ou use o botão **±** ao lado do campo (útil no celular)
- **Despesas parceladas em qualquer conta**: na página de cada conta (cartão, financiamento, mensalidades, seguros, IPTU…), divida o total em parcelas mensais, com **categoria** opcional (inclusive valor negativo, para abatimentos parcelados), e acompanhe o valor pago em cada parcela. As parcelas entram na Projeção, no Dashboard e no PDF
- **Categorias por item (subitens)**: classifique cada despesa, por exemplo *Amazon (Compras Online)*, *Nissan (Manutenção Veículo)*, *Shell (Abastecimento)*. A categoria é sugerida automaticamente quando a descrição já foi usada antes, aparece ao lado do item e, no detalhe do grupo, o app mostra o **subtotal por categoria** (veja a seção *Categorias por item*)
- **Indicadores do filtro**: acima da lista, cartões no estilo do Dashboard mostram **valor total, valor pago, a pagar, valor futuro, parcelas em aberto e média por lançamento** do que está filtrado (período, grupos marcados e busca). Ao usar a lupa, também aparecem o total de todo o histórico e os totais por item. A busca encontra pela categoria do item e pelo nome do grupo
- **Contas com ícone e cor**: cada conta tem um **ícone genérico** (65 opções, como casa, carro, internet, cartão) sobre uma **cor de fundo** que você escolhe, ou uma imagem sua (PNG, JPG, WebP ou SVG). Sem escolha, o app sugere o ícone pelo nome da conta (veja a seção *Ícones das contas*)
- Lista, **matriz mensal** (grupo × mês) e filtros, com o total do que foi filtrado e o percentual de cada categoria. A lista se ajusta à largura da tela, sem barra de rolagem horizontal
- Assistente **📅 Lançar mês**: sugere as contas recorrentes dos últimos 3 meses, mostra o valor anterior como referência e permite copiar os últimos valores
- **📋 Colar despesas** (ou `Ctrl+V` na aba): cole vários registros de uma vez; o app entende texto em blocos (`grupo:` / `despesa dentro do grupo:` / `valor:` / `pago em:`), tabelas do Excel e linhas livres (veja [Colar despesas](#-colar-despesas))
**Dashboard**
- Patrimônio, alocação e patrimônio por banco
- **CDI anualizado** e **meta Selic** (Banco Central), com a data de referência; sem internet, mostra o último valor salvo
- Proventos por mês e por papel, média mensal e maior pagador
- Despesas por grupo e por mês, entradas (com resgates) × despesas e saldo do período
- **Percentuais nos gráficos**: as pizzas mostram o percentual em cada fatia e na legenda; as barras por grupo, categoria, banco e papel mostram o percentual do total na ponta da barra; nos gráficos mensais, o balão mostra o percentual de cada parte no mês (nas despesas do fluxo de caixa, o percentual em relação às entradas)
- **Despesas por grupo** e **Despesas por categoria** mostram **todos** os itens (o gráfico rola quando são muitos). **Despesas por mês** permite escolher **agrupar por grupo ou por categoria** e **quantas séries mostrar** (Top 5, 10, 15 ou Todos); o restante vira *Demais*
- **Despesas por categoria**: clique numa barra para abrir a lista com **todas as despesas daquela categoria** (mês, grupo, despesa, valor e total). Clique de novo na barra, ou em **Fechar**, para recolher
- Resgates do período como indicador próprio e como fatia em "Entradas por categoria"
- Os mesmos gráficos saem no **PDF**, respeitando o período escolhido
---
 
## 🧰 Tecnologias
 
| Uso | Biblioteca |
|---|---|
| Interface | [React 18](https://react.dev) + [Vite](https://vitejs.dev) |
| Leitura/escrita de planilhas | [SheetJS (`xlsx`)](https://sheetjs.com) |
| Gráficos | [Recharts](https://recharts.org) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| Deploy | GitHub Actions + GitHub Pages |
 
---
 
## 🚀 Como rodar localmente
 
Pré-requisito: [Node.js](https://nodejs.org) 18 ou superior.
 
```bash
# 1. instalar as dependências (só na primeira vez)
npm install
 
# 2. iniciar o servidor de desenvolvimento
npm run dev
```
 
Abra o endereço exibido no terminal (normalmente `http://localhost:5173`).
 
| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com atualização automática |
| `npm run build` | Gera a versão final na pasta `dist/` |
| `npm run preview` | Serve a pasta `dist/` localmente para testar como ficará publicado |
 
> 💡 Se o projeto estiver numa pasta sincronizada pelo OneDrive, mova-o para outro lugar (ex.: `C:\dev\`). A pasta `node_modules` tem milhares de arquivos e deixa a sincronização lenta.
 
---
 
## 🌐 Publicar no GitHub Pages
 
O repositório já inclui o workflow `.github/workflows/deploy.yml`.
 
1. Crie um repositório no GitHub e envie o projeto (incluindo a pasta `.github`).
2. No repositório, vá em **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
3. A cada `push` na branch `main`, o site é compilado e publicado em:
   `https://rafabs.github.io/FinDash/`
Por que funciona em qualquer subpasta: o `vite.config.js` usa `base: './'` (caminhos relativos) e o app não usa rotas por URL, apenas abas internas. Por isso não há erro 404 ao recarregar a página.
 
---
 
## 📥 Formato da planilha
 
O arquivo `.xlsx` tem as abas de dados `Control_Fynn`, `Extrato`, `Despesas`, `Resgates` e `Notas`, mais `Contas de despesas` e `Despesas por categoria` (opcionais, criadas pelo app quando necessárias). Mantenha os cabeçalhos **exatamente** como abaixo. Na tela inicial do app há botões para baixar um modelo pronto (`.xlsx` completo ou CSV de cada tabela).
 
Datas aceitas: `AAAA-MM-DD` ou `DD/MM/AAAA`.
 
### Aba `Control_Fynn` (carteira)
 
| Coluna | Descrição |
|---|---|
| `DATA_APLICACAO` | Data da compra |
| `QTD_COMPRA` | Quantidade |
| `PRC_UNIT` | Preço unitário (em RV, o preço atual do papel) |
| `PAPEL` | Código (ex.: `MXRF11`) ou `N/A` em renda fixa |
| `VLR_APLICACAO` | Total aplicado |
| `BANCO`, `TIPO_PRODUTO`, `PRODUTO` | Texto livre |
| `TIPO_INV` | `RF` ou `RV` |
| `TOTAL_ATUAL` | Valor hoje |
| `ULTIMA_ATUAL` | Data da última atualização |
| `PERIODO`, `REND_BRUTO`, `VAR_PP`, `IOF` | **Calculadas pelo app** (podem ficar em branco) |
 
### Aba `Extrato` (entradas)
 
| Coluna | Descrição |
|---|---|
| `DATA DE RECEBIMENTO` | Data da entrada |
| `VALOR DA APLICAÇÃO` | Valor recebido |
| `CATEGORIA` | Opcional. Se vazia, o app classifica sozinho |
| `ORIGEM`, `INSTITUIÇÃO`, `CNPJ / CPF`, `TIPO` | Texto livre |
 
### Aba `Despesas` (contas do mês)
 
Cada linha é **um mês + um tipo de conta**, com quantos itens forem necessários:
 
| Coluna | Descrição |
|---|---|
| `DATA` | Mês da conta (use o dia 1) |
| `VALOR` | Total do mês (o app recalcula como a soma dos itens) |
| `TIPO_CONTA` | Ex.: `CONDOMÍNIO`, `INTERNET`, `CARTÃO DE CRÉDITO` |
| `COTA_1`, `VALOR`, `COTA_2`, `VALOR`, … | Itens da conta (nome + valor; o valor pode ser negativo para abatimentos) |
| `PARCELAMENTO_1`, `PARCELAMENTO_2`, … | Colunas ocultas, escritas pelo app na exportação completa, com os dados das parcelas de cada item (não edite) |
| `CATEGORIA_1`, `CATEGORIA_2`, … | Categoria do item correspondente (`COTA_1` ↔ `CATEGORIA_1`). Opcional; as colunas só aparecem quando existe alguma categoria |
| `GRUPO_PAI` | Opcional. Nome do grupo em que este grupo está "dentro" (ex.: `ALUGUEL` para a conta `CONDOMÍNIO`) |
 
A mesma conta pode aparecer em mais de uma linha no mesmo mês (por exemplo, dois cartões). Linhas sem nenhum valor são ignoradas.
 
### Aba `Contas de despesas` (opcional)
 
Guarda o ícone e o logo de cada conta da aba Despesas.
 
| Coluna | Descrição |
|---|---|
| `NOME` | Nome da conta (igual ao `TIPO_CONTA`) |
| `ICONE` | Emoji usado quando não há logo (padrão `🧾`) |
| `LOGO` | `icone:<id>` (ícone genérico, ex.: `icone:casa`), `icone:` (sem ícone, usa o emoji) ou uma imagem enviada por você, guardada como texto (data URL) |
| `COR` | Cor de fundo do ícone, em hexadecimal (ex.: `#ea580c`); vazio usa a cor padrão |
 
### Aba `Despesas por categoria` (opcional)
 
Relatório legível, criado na exportação quando existe alguma categoria: uma linha por item, com `MÊS`, `GRUPO`, `ITEM`, `CATEGORIA` e `VALOR`. Serve para consulta e tabelas dinâmicas. Ao importar, o app usa essa aba para **preencher a categoria de itens que ainda estão sem categoria** (casando por mês, grupo, item e valor). Para **trocar** uma categoria que já existe, edite as colunas `CATEGORIA_n` da aba `Despesas`.
 
### Aba `Resgates`
 
| Coluna | Descrição |
|---|---|
| `DATA_RESGATE` | Data do resgate |
| `PRODUTO` | Produto resgatado (ex.: `RDB APLICAÇÃO`, `TESOURO SELIC 2029`) |
| `RENTABILIDADE ATÉ DATA RESGATE` | Lucro obtido até o resgate (negativo em caso de prejuízo). É este valor que soma às entradas |
 
### Aba `Notas`
 
A aba `Notas` guarda o texto escrito no editor do app. O texto legível fica na célula `A2`; a formatação é armazenada em metadados na coluna oculta `B` para ser restaurada ao importar o arquivo. Arquivos antigos sem essa aba ou sem formatação continuam sendo aceitos.
 
---
 
## 📐 Regras da Carteira
 
| Campo | RF | RV |
|---|---|---|
| **Total Aplicado** (`VLR_APLICACAO`) | Calculado: Qtd. × Preço (travado) | Informado na criação (travado depois) |
| **Preço Unitário** (`PRC_UNIT`) | Travado | **Editável** (preço atual do papel) |
| **Valor Hoje** (`TOTAL_ATUAL`) | **Editável** | Calculado: Qtd. × Preço (travado) |
| **IOF** | `SIM` se a duração for menor que 31 dias, senão `NÃO` | `N/A` |
 
Também ficam sempre travados: data de aplicação, quantidade, papel, banco, categoria, produto, tipo, duração, rendimento e variação. Só **Atualizado** é editável nos dois tipos. Novos itens entram pelo botão **+ Novo item**.
 
- **Duração** = Atualizado − Data de Aplicação (em dias)
- **Rendimento** = Valor Hoje − Total Aplicado
- **Variação** = Rendimento ÷ Total Aplicado
Os lotes de RV com o mesmo `PAPEL` compartilham **Preço Unitário** e **Atualizado**. Editar um deles atualiza todos e recalcula o Valor Hoje de cada lote.
 
---
 
## 🏷️ Categorias do Extrato
 
Atribuídas automaticamente na importação (a partir de `TIPO` e `ORIGEM`) e editáveis na tabela:
 
| Categoria | Reconhece |
|---|---|
| Proventos | dividendos, FIIs, JCP / juros sobre capital |
| Rendimentos | rendimento de conta remunerada (`REND AUT`) |
| Aluguel | aluguel, vaga, Airbnb |
| Salário | salário, 13º, PLR/PPLR, bônus, rescisão |
| Venda de Patrimônio | **manual** (não é atribuída automaticamente) |
| Outros | todo o resto |
 
No dashboard, os **proventos** consideram apenas a categoria *Proventos*.
 
**Entradas** = lançamentos do Extrato + rentabilidade dos **Resgates**. É esse total que aparece no painel do Extrato e no fluxo de caixa. No saldo (entradas − despesas), a categoria *Venda de Patrimônio* fica de fora.
 
**Editar e excluir categorias:** na aba Extrato, o botão **🏷️ Gerenciar categorias** abre a lista das categorias que você criou, com a quantidade e o total de lançamentos de cada uma.
 
- **✏️ Renomear:** todos os lançamentos acompanham o novo nome. Se o novo nome já existir, o app oferece **mesclar** as duas categorias
- **🗑 Excluir:** os lançamentos da categoria são movidos para a categoria que você escolher (padrão: *Outros*)
- As categorias **padrão** (Proventos, Rendimentos, Aluguel, Salário, Venda de Patrimônio e Outros) ficam **protegidas**, porque o app usa algumas delas nos cálculos, como a *Venda de Patrimônio* no saldo
---
 
## 🔍 Busca de produtos
 
Abra com o botão **🔍 Buscar**, `Ctrl+K` ou `/`. Digite parte do código, nome, banco ou tipo (ex.: `mxrf`, `tesouro`, `rdb`, `banco xp`, `fii`). Use ↑↓ para navegar, `Enter` para abrir e `Esc` para voltar ou fechar.
 
A lista separa o que está na **carteira** do que está **fora dela** (papéis vendidos que ainda têm proventos no Extrato e produtos que só aparecem nos Resgates).
 
O detalhe do produto mostra:
 
- **Posição:** valor hoje, total aplicado, rendimento, participação na carteira, quantidade, preço atual e preço médio pago
- **Proventos:** total, últimos 12 meses, *yield on cost* (proventos dos últimos 12 meses ÷ valor aplicado), maior pagamento e média, com gráfico mensal
- **Resgates** ligados ao produto e a rentabilidade resgatada
- **Retorno total:** rendimento + proventos + resgates
- Tabela com todos os **lotes**
O cruzamento entre abas é tolerante a nomes diferentes: proventos são ligados pelo código do papel (`MXRF11`) e resgates pelo nome do produto (ex.: "FII XP MALLS" é associado ao papel `XPML11`).
 
---
 
## 💹 Renda por papel
 
Na aba **Renda por papel**, o *yield on cost* de cada papel de renda variável é:
 
```text
yield on cost = proventos recebidos nos últimos 12 meses ÷ valor aplicado no papel
```
 
- Os proventos vêm da categoria **Proventos** do Extrato, ligados ao papel pelo código (ex.: `MXRF11`)
- O cálculo usa o valor aplicado **atual** da carteira e uma janela móvel de 12 meses; ele compara a renda histórica entre posições e não estima pagamentos futuros
- Aportes recentes ainda não completaram 12 meses de proventos, então tendem a aparecer com yield menor
- A mesma métrica aparece no detalhe de cada produto na busca (🔍)
---
 
## 📋 Colar despesas
 
Na aba Despesas, use **📋 Colar despesas** ou `Ctrl+V` fora de qualquer campo. Formatos aceitos:
 
```text
grupo: Cartão de crédito           despesa: Internet
despesa dentro do grupo: Manutenção veicular   preço: R$ 119,90
valor: R$ 1.200,00                 pagamento: 15/05/2020
pago em: 15/05/2020
```
 
- **Blocos "rótulo: valor"**: grupo/conta (`grupo`, `despesa`, `custo`, `conta`, `gasto`, `tipo`, `categoria`), valor (`valor`, `preço`, `total`), data (`pago em`, `pagamento`, `data`, `vencimento`) e a despesa de dentro do grupo (`despesa dentro do grupo`, `descrição`, `item`, `obs`)
- **Tabela copiada do Excel/Sheets**, com ou sem cabeçalho
- **Uma despesa por linha**, em ordem livre: `Energia elétrica - R$ 150,00 - 15/05/2020`
A prévia mostra cada registro como **nova**, **duplicada** ou **incompleta** e permite editar antes de adicionar. Grupos parecidos com os existentes são unificados (`energia` → `ENERGIA ELÉTRICA`), registros sem data vão para um mês padrão à sua escolha e registros do mesmo mês e grupo viram uma linha com várias despesas dentro. Só o **mês** é guardado, já que a aba Despesas é mensal.
 
---
 
## 🧩 Grupos dentro de grupos
 
Um grupo pode ficar dentro de outro (ex.: *Condomínio* dentro de *Aluguel*):
 
1. Na aba Despesas, clique no lápis ✏️ da linha do grupo (com a edição liberada).
2. Em **"Dentro do grupo…"**, escolha o grupo principal e confirme com `Enter` ou saindo do campo. Deixe vazio para voltar a ser um grupo principal.
Regras:
 
- O vínculo vale para **todas as linhas com o mesmo nome de grupo**; linhas novas desse grupo (colar, Lançar mês, novo lançamento) já entram vinculadas
- Nos resumos, o total do filho **sobe para o grupo principal** e aparece no detalhe como `FILHO › despesa`; o total geral não conta nada duas vezes
- Pode haver mais de um nível. Um grupo não pode ficar dentro dele mesmo, nem formar ciclo (A dentro de B e B dentro de A)
- Na matriz mensal cada grupo continua com a sua linha, mostrada com o caminho (`ALUGUEL › CONDOMÍNIO`)
- Exportado na coluna `GRUPO_PAI` da aba `Despesas`
---
 
## 🏷️ Categorias por item
 
Cada despesa pode ter uma categoria (opcional), preenchida no modal de edição do grupo (campo **Categoria**) ou em **＋ Novo lançamento** na página da conta. Se a descrição já foi categorizada antes, a categoria é sugerida sozinha.
 
- Aparece ao lado do item na lista, como em *Amazon (Compras Online)*
- No detalhe do grupo (resumo da aba), há **Por categoria** (subtotal e percentual) acima de **Por despesa**; itens sem categoria entram em *Sem categoria*
- A lupa também filtra pela categoria
- No **Dashboard**, o card **Despesas por categoria** mostra as principais categorias do período (só aparece quando há alguma categoria) e, ao clicar numa barra, lista todas as despesas dela. No **PDF**, a lista de despesas mostra a categoria ao lado de cada item e há a tabela **Subtotal por categoria dentro de cada grupo**
- Exportado nas colunas `CATEGORIA_n` e na aba `Despesas por categoria`
- A colagem de despesas ainda não lê categorias; os itens colados entram sem categoria
---
 
## 🎨 Ícones das contas
 
As contas de despesas usam **ícones genéricos** (sem marcas), desenhados direto no app, sem arquivos externos: funcionam offline e não dependem de nada publicado no site.
 
- Em **🎨 Ícone e cor** (ao criar uma conta e na página da conta, com a edição liberada) escolha o ícone numa grade com busca e a **cor de fundo** entre as cores prontas ou numa cor personalizada. O texto do ícone fica claro ou escuro conforme a cor, para manter a leitura
- **Sugestão automática:** uma conta sem ícone recebe um pelo nome (palavra inteira, vence o termo mais longo), por exemplo *Aluguel* → casa, *Internet* → wifi, *Cartão de crédito* → cartão
- **Usar emoji** volta ao emoji da conta (a cor escolhida continua como fundo). **Cor padrão** limpa a cor
- **Enviar imagem** (PNG, JPG, WebP ou SVG) continua disponível: o app reduz para até 512 px, converte para WebP e guarda a imagem dentro do XLSX. Imagens enviadas deixam o arquivo e o `localStorage` maiores, então prefira os ícones
- O ícone e a cor aparecem também no gráfico **Despesas por grupo** do Dashboard e, no PDF, nos gráficos, na lista de despesas e na composição por grupo
- No XLSX o ícone fica em `LOGO` (`icone:<id>`) e a cor em `COR`, na aba `Contas de despesas`
Os desenhos dos ícones vêm do projeto [Lucide](https://lucide.dev) (licença ISC) e estão em `src/icons.js`. Para adicionar um ícone, acrescente uma entrada em `ICONS` com `id`, `nome`, `apelidos` (usados na sugestão) e o miolo do SVG 24×24. Evite renomear um `id` depois de usar, senão os XLSX já exportados deixam de achar o ícone.
 
> ℹ️ XLSX exportados antes desta versão com logos do banco antigo (`banco:<id>`) continuam abrindo: a conta passa a mostrar o ícone sugerido pelo nome ou o emoji.
 
---
 
## 🧭 Guia rápido e limpeza de dados
 
**Guia rápido.** No primeiro acesso, uma janela com 12 passos explica a barra superior e cada aba (Dashboard, Projeção, Renda por papel, Carteira, Extrato, Despesas, Resgates e Notas). Navegue com **Próximo/Anterior**, com as setas do teclado ou pelas bolinhas; `Esc` ou **Pular guia** fecha. O texto está em `src/Tour.jsx`.
 
- Ao fechar, o app grava `fynn-tour-v1` no `localStorage` e não mostra o guia sozinho de novo
- O botão **❓** do topo reabre o guia quando quiser
- Para testar sem apagar nada, acrescente `?tour=1` ao endereço (ex.: `https://usuario.github.io/FinDash/?tour=1`)
**O que o navegador guarda** (`localStorage` do site): `fynn-control-v1` (seus dados), `fynn-theme` (tema), `fynn-tour-v1` (guia visto) e o cache do CDI e da Selic.
 
**Como limpar**
- **Só os dados do app:** botão **Limpar** do topo (pede confirmação)
- **Tudo do site (para ver o guia como um usuário novo):** no Chrome ou Edge, `F12` → **Application** (Aplicativo) → **Storage** → **Clear site data**. Ou, no console, `localStorage.clear(); location.reload()`
- **Versão antiga do site (GitHub Pages):** recarregue sem cache com `Ctrl+F5` (ou `Ctrl+Shift+R`)
> ⚠️ Limpar os dados do site apaga o que não foi exportado. Exporte o XLSX antes.
 
---
 
## 🗂️ Estrutura do projeto
 
```
.
├── .github/workflows/deploy.yml   # build + deploy no GitHub Pages
├── public/                        # favicon.svg, favicon-32.png, apple-touch-icon.png
 
├── index.html
├── vite.config.js                 # base './' para o GitHub Pages
├── package.json
└── src/
    ├── main.jsx                   # ponto de entrada
    ├── App.jsx                    # estado, abas, importação/exportação, tema
    ├── data.js                    # colunas, regras de cálculo, categorias, import/export, modelos, dados de exemplo
    ├── period.js                  # filtro de período (mês, 3/12 meses, ano, tudo, personalizado)
    ├── paste.js                   # leitura de dados colados no Extrato (datas, valores, colunas)
    ├── pasteDesp.js               # interpretador de texto colado de despesas
    ├── products.js                # cruza carteira, proventos e resgates por produto
    ├── pdf.js                     # relatório em PDF (resumo, gráficos e tabelas)
    ├── useMedia.js                # detecta tela de celular
    ├── Landing.jsx                # tela inicial (sem dados)
    ├── Dashboard.jsx              # indicadores e gráficos
    ├── RendaPorPapel.jsx          # aba Renda por papel (yield on cost)
    ├── market.js                  # CDI e Selic (API pública do Banco Central, com cache local)
    ├── CartHero.jsx               # painel de resumo da Carteira
    ├── Table.jsx                  # tabela editável (todas as abas): ordenação, seleção, lápis e trava
    ├── NewItem.jsx                # formulário de novo item da Carteira
    ├── ExtratoView.jsx            # aba Extrato
    ├── PasteModal.jsx             # colagem interativa de lançamentos do Extrato
    ├── PasteDespesas.jsx          # colagem interativa de despesas
    ├── ProductSearch.jsx          # busca e detalhe de produtos
    ├── DespesasView.jsx           # aba Despesas (lista, matriz mensal, grupos, categorias, contas)
    ├── Projecao.jsx               # aba Projeção (fluxo de caixa e patrimônio)
    ├── dialog.js                  # confirmDialog() e alertDialog(): janelas do app no lugar de confirm()/alert()
    ├── DialogHost.jsx             # desenha as janelas de confirmação e aviso (montado uma vez no App)
    ├── ExtratoCategories.jsx      # janela para renomear/excluir categorias do Extrato
    ├── Tour.jsx                   # guia rápido do primeiro acesso (um passo por aba)
    ├── icons.js                   # ícones genéricos (Lucide), cores prontas e sugestão de ícone pelo nome
    ├── AccountMark.jsx            # desenha o ícone/imagem/emoji da conta sobre a cor de fundo
    ├── IconPicker.jsx             # janela de escolha do ícone e da cor
    ├── ResgatesView.jsx           # aba Resgates
    ├── NotesEditor.jsx            # editor de Notas com formatação
    ├── SearchField.jsx            # campo de busca com botão de limpar
    ├── LancarMes.jsx              # assistente de lançamento mensal
    ├── PeriodFilter.jsx           # seletor de período
    ├── MoneyInput.jsx             # campo de valor em R$ (2 casas)
    ├── sort.js                    # ordenação das tabelas
    ├── Pager.jsx                  # paginação e itens por página
    └── styles.css                 # estilos e temas claro/escuro
```
 
---
 
## 💾 Dados e exportação
 
- Os dados ficam no `localStorage` do navegador. **Limpar o cache apaga tudo**, então exporte um `.xlsx` de vez em quando como backup.
- O botão **Limpar** apaga os dados salvos e volta para a tela inicial.
- **CSV** exporta a aba atual. **XLSX** exporta as abas de dados e `Notas` no mesmo formato de entrada, então pode ser reimportado.
- **PDF** traz o resumo, os gráficos e as tabelas, com a **Projeção na última página** e **linha de totais** no fim de cada uma (Carteira, Extrato, Despesas, composição por grupo e Resgates). Na lista de despesas há o **Total geral** (previsto, pago e pendente) e, havendo meses futuros, a linha **Até o mês atual**. Extrato, despesas e resgates saem apenas com o **período filtrado**, para o relatório não ficar enorme.
---
 
## ⚠️ Observações
 
- **Segurança do `xlsx`:** a versão `0.18.x` publicada no npm (usada aqui) está desatualizada e o `npm audit` aponta vulnerabilidades. Como o app roda só no seu navegador e abre arquivos seus, o risco prático é baixo, mas evite importar planilhas de origem desconhecida.
- A busca de produtos usa apenas os dados da sua planilha; o app **não consulta cotações** de ativos. A única consulta de mercado é o **CDI** (série 4389) e a **meta Selic** (série 432) na API pública do Banco Central. Se ela estiver fora do ar ou sem internet, o último valor salvo é exibido.
- Dados salvos em `localStorage` têm limite de cerca de 5 MB por navegador, o que é suficiente para milhares de lançamentos.
---
 
## 🗺️ TO DO

- [X] `v26.10.1` Gráficos no PDF
- [X] `v26.10.2` Colagem de várias despesas de uma vez
- [X] `v26.10.3` Implantar função para selecionar diversos itens em todas as sheets
- [X] `v26.10.4` Pesquisar algum produto e filtrar seleção
- [X] `v26.10.5` Na aba Carteira, travar e destravar todos os itens para edição para evitar digitação indevida
- [X] `v26.10.6` Melhorar o leitor de colar itens
- [X] `v26.10.7` Inserir uma função de Notas que deve ser salvo no .xlsx e ao importá-lo, disponibilizá-lo ao usuário
- [X] `v26.10.7` Ao filtrar um item em Despesas, exibir total apurado
- [X] `v26.10.7` Exibir o percentual de gastos de cada categoria de item
- [X] `v26.10.8` Em Extrato, retirar os itens predefinidos de CATEGORIA
- [X] `v26.10.9` Metas de alocação e comparação com CDI/IPCA
- [X] `v26.10.10` *Yield on cost* por papel, cruzando proventos e valor aplicado
- [X] `v26.11.1` Atribuir abas de contas, com layout próprio, que ao ir inserindo, ir para os itens principais, respectivamente para o .xls
- [X] `v26.11.2` Despesas: valores negativos (abatimentos) em itens e parcelas, e mover qualquer item para qualquer grupo do mesmo mês
- [X] `v26.11.3` Despesas: grupo dentro de grupo, com totais somados no grupo principal
- [X] `v26.11.4` Despesas: lista sem rolagem horizontal e despesas do grupo com quebra de linha
- [X] `v26.11.5` Ícones genéricos para as contas de despesas, com cor de fundo editável, sugestão automática pelo nome e envio de PNG, JPG, WebP ou SVG
- [X] `v26.11.6` Categorias por item (subitens) exportadas no XLSX e total apurado ao usar a lupa em Despesas
- [X] `v26.11.7` PDF com linha de totais no fim das tabelas
- [X] `v26.11.8` Notas: a barra `/` pode ser digitada sem abrir a busca de produtos
- [X] `v26.11.9` Mostrar categorias e ícones das contas no PDF e no Dashboard
- [X] `v26.11.10` Exibir percentual dos itens em Dashboard
- [X] `v26.11.11` Exibir Guia de Uso ao acessar pela primeira vez + Remolde layout
- [X] `v26.11.12` Criação de Pop-Up, exibir valor total ao filtrar um item por categoria
- [ ] Pesquisar algum produto e ver detalhes e informações 

---

Desenvolvido por RAFAEL BARBOSA | Feito para rodar no seu navegador. 💜
