# 📊 Fynn Control
 
Painel pessoal de **investimentos, proventos e despesas** que roda inteiro no navegador.
Você importa a sua planilha (`.xlsx` ou `.csv`), edita os dados direto na tela, acompanha o dashboard por período e exporta quando quiser.
 
> **Privacidade:** não existe servidor nem banco de dados. Os seus dados ficam apenas no `localStorage` do navegador e nunca são enviados para lugar nenhum. A única consulta externa é pública e não leva nada seu: o **CDI** e a **meta Selic** vêm da API do Banco Central.
 
---
 
## ✨ Funcionalidades
 
**Geral**
- Importação de `.xlsx` (dados e notas) ou `.csv` (uma tabela por arquivo, reconhecida pelo cabeçalho)
- Exportação em **CSV**, **XLSX** e **PDF** (com resumo, **gráficos** e tabelas, todas com linha de **totais** no fim). O PDF pode ser o relatório completo ou **somente de uma conta ou categoria de despesas** (ex.: *Cartão de crédito*, *Internet*); veja [Exportar PDF de uma conta ou categoria](#-exportar-pdf-de-uma-conta-ou-categoria)
- **Busca de produtos** (🔍 no topo, `Ctrl+K` ou `/`; a barra só abre a busca fora de campos de texto, então pode ser digitada normalmente nas Notas): veja detalhes de qualquer papel ou produto (veja [Busca de produtos](#-busca-de-produtos))
- **Seleção múltipla**: marque várias linhas com o checkbox e exclua de uma vez (no Extrato, o cabeçalho também mostra a **soma** dos itens selecionados)
- Tabelas com **ordenação por cabeçalho** (clique: crescente → decrescente → original; vale para o conjunto filtrado, não só para a página)
- **Itens por página** configurável (20, 30, 40, 50, 100 ou 200; padrão 40) no Extrato, Despesas e Resgates, e a escolha fica salva
- Linhas do Extrato, Despesas e Resgates ficam travadas e só editam pelo **lápis ✏️**
- Tema **claro e escuro** (segue o sistema e lembra a sua escolha)
- **🎨 Personalização do layout** (botão 🎨 do topo): tema, cor de destaque, densidade, **papel de parede** (cor, gradiente, imagem sua ou **fundos prontos** como grade, pontos, linhas e xadrez) e **quais abas aparecem e em que ordem**. Fica salvo no XLSX e volta do jeito que você deixou ao importar (veja [Personalização](#-personalização))
- **Menu lateral (sidebar)**: as seções (Dashboard, Projeção, Renda por papel, Carteira, Extrato, Despesas, Resgates e Notas) ficam num menu à esquerda, com a contagem de itens. Clique em **FYNN CONTROL** ou na **logo** para voltar ao Dashboard. O botão **«** recolhe o menu para só ícones (**»** expande) e a escolha fica salva; em telas médias ele já abre recolhido. Pelo 🎨 **Personalizar** você escolhe quais seções aparecem e a ordem
- **Versão para celular**: as abas viram uma barra inferior que **rola para o lado** (com nomes curtos e a aba ativa sempre à vista), tabelas viram cartões e janelas sobem de baixo da tela
- Abas: **Dashboard**, **Projeção**, **Renda por papel**, **Carteira**, **Extrato**, **Despesas**, **Resgates** e **Notas**
- Landing page com explicação, modelos para download e **dados de exemplo completos** (veja [Dados de exemplo](#-dados-de-exemplo))
- **Guia rápido** no primeiro acesso, explicando cada aba para quem está começando; o botão **❓** do topo abre o guia de novo (veja [Guia rápido e limpeza de dados](#-guia-rápido-e-limpeza-de-dados))
- Dados salvos automaticamente no navegador
- **Arquivo carregado na barra superior**: mostra o nome do `.xlsx`, a **data e hora do carregamento** e a **hora da última edição** (qualquer item, valor, nota ou lançamento alterado), com o botão **🔄 Recarregar** (veja [Arquivo carregado e recarregar](#-arquivo-carregado-e-recarregar))
- **Notas pessoais formatadas**: fonte, tamanho, negrito, itálico, sublinhado e cores; salvas automaticamente e preservadas no XLSX
**Carteira**
- Itens de renda fixa (RF) e variável (RV) com cálculos automáticos
- Colunas travadas conforme o tipo (veja [Regras da Carteira](#-regras-da-carteira))
- **Trava geral de edição**: a aba abre **🔒 travada**; o botão **🔓 Destravar** libera os campos editáveis e a exclusão. Ao sair da aba, ela trava de novo
- Lotes do mesmo papel mesclados: editar o preço de um atualiza todos
- Rendimento e variação coloridos (▲ verde / ▼ vermelho) e linhas alternadas
- **Custo Médio** por papel de renda variável (FIIs, ações e fundos): total aplicado ÷ quantidade, somando todos os lotes do mesmo papel. Aparece em cada lote do papel, fica em branco na renda fixa e acompanha novos aportes e exclusões na hora
- Painel no topo com patrimônio, total investido, rendimento e alocação RF x RV
- **Previdência privada (PGBL e VGBL)**: vários fundos, um modo **🛡️ Aporte de previdência** no **+ Novo item** para os aportes mensais e o botão **🛡️ Atualizar saldo da previdência** (veja [Previdência privada](#-previdência-privada))
**Extrato (entradas)**
- Categorias automáticas: Proventos, Rendimentos, Aluguel, Salário e Outros (mais "Venda de Patrimônio", escolhida manualmente)
- Filtro por **período**, categoria e busca em texto (com botão para limpar)
- **Categorias personalizadas**: crie as suas com **＋ Categoria**; elas aparecem nos filtros, na tabela, no painel e ficam salvas no XLSX
- Tabela paginada e editável
- **Trava geral de edição**: a aba abre **🔒 travada**; o botão **🔓** libera o lápis ✏️, o **+ Novo lançamento**, o **📋 Colar dados** e a exclusão. Ao sair da aba, ela trava de novo
- **Soma da seleção**: marque lançamentos pelo checkbox e o cabeçalho da tabela mostra quantos estão selecionados e a **soma** do valor (funciona também com a edição travada). A seleção é limpa ao trocar de página, filtro, busca, ordem ou período
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
- **Despesas parceladas em qualquer conta**: na página de cada conta (cartão, financiamento, mensalidades, seguros, IPTU…), divida o total em parcelas mensais, com **categoria** opcional (inclusive valor negativo, para abatimentos parcelados), e acompanhe o valor pago em cada parcela. As parcelas entram na Projeção, no Dashboard e no PDF. **Cada parcela entra na fatura já existente** da mesma conta e mês (ex.: duas compras parceladas no cartão aparecem juntas na fatura de cada mês); se o mês ainda não tem fatura da conta, ela é criada. O **＋ Novo lançamento** da conta segue a mesma regra
- **Categorias por item (subitens)**: classifique cada despesa, por exemplo *Amazon (Compras Online)*, *Nissan (Manutenção Veículo)*, *Shell (Abastecimento)*. A categoria é sugerida automaticamente quando a descrição já foi usada antes, aparece ao lado do item e, no detalhe do grupo, o app mostra o **subtotal por categoria** (veja a seção *Categorias por item*)
- **Indicadores do filtro**: acima da lista, cartões no estilo do Dashboard mostram **valor total, valor pago, a pagar, valor futuro, parcelas em aberto e média por lançamento** do que está filtrado (período, grupos marcados e busca). Ao usar a lupa, também aparecem o total de todo o histórico e os totais por item. A busca encontra pela categoria do item e pelo nome do grupo
- **Contas com ícone e cor**: cada conta tem um **ícone genérico** (65 opções, como casa, carro, internet, cartão) sobre uma **cor de fundo** que você escolhe, ou uma imagem sua (PNG, JPG, WebP ou SVG). Sem escolha, o app sugere o ícone pelo nome da conta (veja a seção *Ícones das contas*)
- **Faturas e comprovantes**: anexe PDFs e imagens: **uma fatura e um comprovante para cada conta e mês** (valem para todos os itens da linha, como as várias compras do cartão), e abra-os dentro do app. Os arquivos ficam numa **pasta no seu computador** e o XLSX guarda só o caminho (veja [Faturas e comprovantes](#-faturas-e-comprovantes-anexos))
- **Situação colorida em cada despesa e fatura**: **PAGA** (verde), **VENCIDA** (vermelho), **VENCE ESSE MÊS** (âmbar) e **A VENCER** (azul), com filtro por situação acima da lista (veja [Baixa de despesas](#-baixa-de-despesas))
- **Baixa de despesas**: lançamentos novos nascem **a pagar** e só contam como **pagos** depois da baixa. Use **✓ Dar baixa hoje** ou **📅 Outra data** (no histórico da conta e no lápis ✏️ do grupo) e **↩ Desfazer baixa** se errar (veja [Baixa de despesas](#-baixa-de-despesas))
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
| `npm run versao -- "texto"` | Lança uma nova versão: atualiza `src/version.js` e o histórico deste README (veja a seção **Versionamento**) |
 
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
 
O arquivo `.xlsx` tem as abas de dados `Control_Fynn`, `Extrato`, `Despesas`, `Resgates` e `Notas`, mais `Contas de despesas`, `Despesas por categoria` e `Preferências` (opcionais, criadas pelo app quando necessárias). Mantenha os cabeçalhos **exatamente** como abaixo. Na tela inicial do app há botões para baixar um modelo pronto (`.xlsx` completo ou CSV de cada tabela).
 
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
| `CUSTO_MEDIO`, `PERIODO`, `REND_BRUTO`, `VAR_PP`, `IOF` | **Calculadas pelo app** (podem ficar em branco). O `CUSTO_MEDIO` é recalculado ao importar |
 
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
| `PAGAMENTO_1`, `PAGAMENTO_2`, … | Colunas ocultas, escritas pelo app na exportação completa, com a **baixa** de cada item (pago e data). Não edite. Itens sem essa informação seguem a regra antiga: pagos quando o mês já chegou |
| `CATEGORIA_1`, `CATEGORIA_2`, … | Categoria do item correspondente (`COTA_1` ↔ `CATEGORIA_1`). Opcional; as colunas só aparecem quando existe alguma categoria |
| `FATURA` | Caminhos da fatura da linha (conta e mês), relativos à pasta das faturas; vários separados por `\|`. Opcional |
| `COMPROVANTE` | Caminhos do comprovante da linha, relativos à pasta dos comprovantes. Um só vale para todos os itens. Opcional. Arquivos antigos com `COMPROVANTE_1`, `COMPROVANTE_2`… (um por item) continuam sendo lidos e viram o comprovante da linha |
| `GRUPO_PAI` | Opcional. Nome do grupo em que este grupo está "dentro" (ex.: `ALUGUEL` para a conta `CONDOMÍNIO`) |
| `FATURA` | Caminhos da fatura desta linha (conta e mês), relativos à pasta das faturas; vários separados por `\|`. Opcional |
 
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
 
Relatório legível, criado na exportação quando existe alguma categoria ou baixa: uma linha por item, com `MÊS`, `GRUPO`, `ITEM`, `CATEGORIA`, `VALOR`, `STATUS` (`Paga`, `Vencida`, `Vence este mês`, `A vencer` ou `Abatimento`), `DATA_PAGAMENTO`, `FATURA` e `COMPROVANTE` (caminhos dos anexos). Serve para consulta, filtros e tabelas dinâmicas. Ao importar, o app usa essa aba para **preencher a categoria de itens que ainda estão sem categoria** (casando por mês, grupo, item e valor). Para **trocar** uma categoria que já existe, edite as colunas `CATEGORIA_n` da aba `Despesas`.
 
### Aba `Preferências` (opcional)

Guarda a personalização do layout (veja [Personalização](#-personalização)) em duas colunas, `CHAVE` e `VALOR`. Ao importar, o app aplica essas preferências; sem a aba, mantém as atuais.

| Chave | Valor |
|---|---|
| `version` | Versão do formato (hoje `1`) |
| `theme` | `light` ou `dark` |
| `accent` | Cor de destaque em hexadecimal (vazio = cor padrão do tema) |
| `density` | `normal` ou `compact` |
| `anexos.pasta`, `anexos.pasta.comprovante` | Nomes da pasta das faturas e da pasta dos comprovantes (só uma dica para reconectar; o navegador não guarda o caminho completo) |
| `tabs.order`, `tabs.hidden` | Ordem das abas e abas ocultas, separadas por vírgula |
| `wallpaper.type`, `wallpaper.dim` | `none`, `color`, `gradient`, `pattern` ou `image`, e o contraste (0 a 0,9) |
| `wallpaper.value.0`, `.1`, … | Cor, gradiente, nome do fundo pronto ou a imagem (data URL), em blocos de 30 000 caracteres por causa do limite da célula do Excel |

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
 
## 🛡️ Previdência privada
 
A previdência privada tem **vários fundos**. No app, cada **fundo é um papel** da Carteira (renda variável, em cotas) e cada **aporte mensal é um item (lote)** do mesmo fundo. A categoria pode ser **PGBL**, **VGBL** ou **PREVIDÊNCIA PRIVADA**: todas são reconhecidas como previdência.
 
**Lançar um aporte:** no **+ Novo item**, escolha **🛡️ Aporte de previdência**.
 
1. **Fundo:** escolha um fundo já lançado ou **＋ Novo fundo** (nome do fundo, banco, categoria PGBL ou VGBL, produto)
2. Informe a **data** e o **valor do aporte**
3. O app usa a **cota atual do fundo** para calcular as cotas compradas. Em um fundo novo, a cota é a que você informar ou uma **cota virtual de R$ 1,00** (cada R$ aportado = 1 cota), o que dispensa saber o valor real da cota
**Atualizar os saldos:** na aba Carteira, o botão **🛡️ Atualizar saldo da previdência** lista os fundos. Informe o saldo atual de cada um, como aparece no extrato do plano, e o app ajusta a cota de todos os aportes do fundo (cota = saldo ÷ total de cotas). O Valor Hoje de cada aporte, o rendimento e a variação se recalculam sozinhos.
 
- Funciona com fundos já lançados no formato antigo (1 cota com o valor do saldo): os novos aportes entram como frações dessa cota
- Para alterar só a cota de um fundo, também dá para editar o **Preço Unitário** de qualquer aporte dele (com a aba destravada): todos acompanham
- O **Dashboard** mostra o cartão **🛡️ Previdência privada** com o total, o percentual do patrimônio e a divisão entre PGBL e VGBL
- Aporte com data antiga entra pela cota atual do fundo (sem histórico de cotas, o ganho do período é distribuído entre as cotas ao atualizar o saldo)
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
 
Com categoria, estorno e grupo pai:
 
```text
grupo: Cartão de crédito           despesa: Condomínio
despesa dentro do grupo: Estorno    grupo pai: Aluguel
valor: -R$ 50,00                    preço: R$ 480,00
pago em: 16/05/2020                 pagamento: 15/05/2020
```
 
- **Blocos "rótulo: valor"**: grupo/conta (`grupo`, `despesa`, `custo`, `conta`, `gasto`, `tipo`), valor (`valor`, `preço`, `total`), data (`pago em`, `pagamento`, `data`, `vencimento`), a despesa de dentro do grupo (`despesa dentro do grupo`, `descrição`, `item`), a **categoria do item** (`categoria`, `classificação`) e o **grupo pai** (`grupo pai`, `pai`, `subgrupo`, `dentro do grupo`). Categoria e grupo pai são opcionais
- **Valores negativos (abatimentos)**: `-50,00`, `-R$ 50,00`, `R$ -50,00`, `(50,00)` ou `50,00-`. Um hífen separado por espaços continua sendo só separador (`Energia - R$ 150,00` segue positivo)
- **Tabela copiada do Excel/Sheets**, com ou sem cabeçalho (com cabeçalho, as colunas `Categoria` e `Grupo pai` também são lidas)
- **Uma despesa por linha**, em ordem livre: `Energia elétrica - R$ 150,00 - 15/05/2020`
A prévia mostra cada registro como **nova**, **duplicada** ou **incompleta** e permite editar antes de adicionar, inclusive a **categoria** e o **grupo pai**. Quando a categoria não vem na colagem, o app sugere a mais recente usada para a mesma descrição (aparece como sugestão no campo e é aplicada ao adicionar). Grupos parecidos com os existentes são unificados (`energia` → `ENERGIA ELÉTRICA`), registros sem data vão para um mês padrão à sua escolha e registros do mesmo mês e grupo viram uma linha com várias despesas dentro. Só o **mês** é guardado, já que a aba Despesas é mensal.
 
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
- Na colagem de despesas, a categoria vem do rótulo `categoria` (ou da coluna *Categoria* da tabela); sem ela, o app sugere a usada antes para a mesma descrição
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
 
## 🌈 Personalização

O botão **🎨** do topo abre a janela **Personalizar**. Tudo tem **pré-visualização ao vivo**; só vale depois de **Salvar** (**Cancelar** desfaz) e **Restaurar padrão** volta ao original.

- **Tema:** claro ou escuro (o botão ☀️/🌙 do topo continua funcionando)
- **Cor de destaque:** seis cores prontas, uma cor personalizada ou **Padrão** (a cor do tema)
- **Densidade:** *Normal* ou *Compacta* (tabelas e cartões mais enxutos)
- **Papel de parede:** nenhum, **gradientes**, cor sólida, **imagem sua** ou um dos **fundos prontos**: Grade, Projeto, Pontos, Linhas, Diagonal, Traços cruzados, Xadrez, Aurora e Foco. Os traços seguem o tema claro/escuro e a Aurora e o Foco usam a sua cor de destaque. O controle de **Contraste** clareia ou escurece o fundo para manter a leitura
- **Abas:** mostre ou oculte cada aba e mude a ordem com ↑ ↓ (o **Dashboard** não pode ser oculto)

**Onde fica salvo**
- No navegador (`fynn-prefs-v1`) e no **XLSX**, na aba `Preferências`. Ao importar um XLSX exportado por você, o layout volta como estava (veja o [formato da aba](#aba-preferências-opcional))
- Imagens são reduzidas a até 1600 px e guardadas em JPEG (limite de 10 MB no envio). Elas deixam o XLSX e o `localStorage` maiores; os fundos prontos guardam só o nome, sem peso
- Planilha de terceiros é tratada como não confiável: cores, gradientes e imagens são validados ao importar, e um valor inválido vira "sem papel de parede"

---

## ✅ Baixa de despesas

Cada despesa tem uma situação de pagamento, para separar o que foi **lançado** do que já foi **pago**.

- **Itens novos nascem "a pagar":** lançamento rápido da conta, **+ item** no lápis ✏️ e itens novos do **📅 Lançar mês**. Valores negativos (abatimentos) não têm baixa
- **✓ Dar baixa hoje** registra o pagamento na data atual; **📅 Outra data** abre uma janela para escolher o dia (inclusive antecipado). **↩ Desfazer baixa** volta o item para "a pagar"
- **Situação colorida:** cada despesa e cada fatura (linha) mostra um selo. **PAGA** = baixada; **VENCIDA** = sem baixa em mês anterior; **VENCE ESSE MÊS** = sem baixa no mês atual; **A VENCER** = sem baixa em mês futuro. A fatura mostra a situação mais urgente entre os itens e só fica **PAGA** quando tudo foi pago. Abatimentos (valor negativo) não têm selo. O vencimento é por **mês**, já que a aba Despesas é mensal
- **Filtro por situação:** acima da lista, os botões **PAGA / VENCIDA / VENCE ESSE MÊS / A VENCER** mostram a quantidade e o valor de cada uma (pagas: valor total; as demais: valor ainda em aberto). Clique para ver só aquela situação; os indicadores (valor total, pago, a pagar…) acompanham o filtro
- Os botões ficam no **histórico da conta** (com a edição liberada) e no lápis ✏️ do grupo. Na lista, o item mostra **✓ paga** ou **⏳ a pagar**
- **Parcelas** usam os mesmos botões: **Quitar restante hoje** quando há pagamento parcial e data livre, como nos demais itens
- **Despesas antigas** (sem baixa registrada) continuam como antes: contam como pagas quando o mês já chegou, e como a pagar nos meses futuros. Para corrigir uma delas, use **↩ Desfazer baixa**
- Itens vindos de **📋 Colar despesas** também seguem essa regra antiga
- Os cartões **Valor pago** e **A pagar**, o **Valor futuro** e o **PDF** (colunas *Pago* e *Pendente*, com "paga em", "vencida", "vence este mês" ou "a vencer" no item) usam a baixa
- O **📅 Lançar mês** preserva categoria, parcela e baixa dos itens já lançados
- No XLSX, a baixa vai nas colunas ocultas `PAGAMENTO_n` e, de forma legível, em `STATUS` e `DATA_PAGAMENTO` da aba `Despesas por categoria`

---

## 🔄 Arquivo carregado e recarregar

Ao importar uma planilha, a barra superior mostra um cartão com:

- **Nome do arquivo** (ex.: `fynn-control.xlsx`)
- **Carregado:** data e hora em que o arquivo foi lido pelo app
- **Editado:** hora da **última alteração** feita depois do carregamento: qualquer item, valor, nota, lançamento, exclusão ou categoria. Sem alterações, aparece *Sem edições* (a data só é repetida se a edição for em outro dia)
- Passe o mouse para ver as datas completas e quando o arquivo foi modificado no disco

**🔄 Recarregar** lê o arquivo de novo e substitui os dados pelos do arquivo, útil quando você o alterou fora do app (Excel, outro dispositivo sincronizado).

- Se houve edições depois do carregamento, o app **pede confirmação**, porque elas serão descartadas. Exporte o XLSX antes se quiser guardá-las
- **Chrome, Edge e Opera:** ao importar, o app guarda a referência do arquivo (sem copiá-lo). Recarregar é **um clique**; depois de fechar e abrir o navegador, ele pede a permissão de leitura de novo
- **Outros navegadores (Firefox, Safari):** não há acesso ao disco, então **Recarregar** abre a escolha de arquivo para você selecionar o mesmo `.xlsx`
- Arquivos arrastados para a tela inicial não guardam a referência: na primeira vez, **Recarregar** pede para escolher o arquivo
- Os dados do cartão ficam no navegador (`fynn-file-v1`) e são apagados em **Limpar**. **Dados de exemplo** não contam como arquivo

---

## 📎 Faturas e comprovantes (anexos)

**Estratégia:** os arquivos **não vão para o XLSX nem para a internet**. Eles ficam em **pastas do seu computador** e o XLSX guarda apenas o **caminho relativo** à pasta (ex.: `2026-11/cartao-de-credito - fatura.pdf`). Há **duas pastas**: a das **faturas (boletos)** e a dos **comprovantes**. A dos comprovantes é **opcional**: sem ela, os comprovantes usam a pasta das faturas (ou seja, dá para usar **uma pasta só**). O XLSX continua pequeno e, para usar em outro PC, basta levar as pastas junto com ele (OneDrive, Drive, pen drive) e conectá-las de novo.

**Como usar**

1. Na aba **Despesas**, clique em **📎 Anexos** e escolha a **pasta das faturas** e, se os comprovantes ficam em outro lugar, a **pasta dos comprovantes** (a janela mostra um cartão para cada tipo, com o nome da pasta, quantos PDFs/imagens ela tem e **Ver arquivos** para conferir; no botão **📎 Anexos** há duas bolinhas, uma para as faturas e outra para os comprovantes: verde = conectada, amarela = falta permissão, vazada = usa a pasta das faturas)
2. Para anexar: abra o lápis ✏️ de uma linha e use **＋ Anexar** em **📄 Fatura** e em **🧾 Comprovante**, lado a lado, no topo da janela. É **um de cada por conta e mês**: vale para todos os itens da linha (por exemplo, todas as compras do cartão no mês). Para trocar, remova com **✕** e anexe outro. Também dá para anexar no **histórico da conta** (com a edição liberada). Na janela de anexar, **📂 Procurar no computador** abre o explorador de arquivos **já dentro da pasta** (Chrome, Edge e Opera; no Firefox e Safari escolha o arquivo e o app o localiza na pasta conectada). Abaixo há a lista dos PDFs e imagens da pasta, com busca, os mais parecidos com o mês e o nome em primeiro lugar e o botão **↻ Atualizar lista**. **Arquivos já anexados a outra fatura ou comprovante somem da lista**, para não usar o mesmo arquivo em duas faturas; a janela avisa quantos ficaram ocultos e a caixa **Mostrar** os traz de volta, marcados como *já anexado* (escolher um deles pede confirmação). Também dá para digitar o caminho à mão
3. Para ver: na lista, a linha mostra **📄 Fatura** e **🧾 Comprovante**, um ao lado do outro. Clique para abrir o visualizador (PDF e imagens), com **↗ Nova aba** e **⬇ Baixar**. **Esc** fecha. Nas **imagens (JPG, PNG…)** há **zoom**: roda do mouse, botões **− / +**, **duplo clique** (ou pinça no celular) e, ampliada, é só **arrastar** para mover; **Ajustar** (ou a tecla `0`) volta ao tamanho da tela. Nos PDFs, use o zoom do próprio visualizador

**Organização sugerida**

- **Uma pasta só:** use uma pasta raiz e, dentro dela, **uma subpasta por mês**. A fatura (boleto) e o comprovante de cada conta ficam juntos e o nome do arquivo diz qual é qual. Basta não escolher a pasta dos comprovantes
- **Duas pastas:** uma para os boletos e outra para os comprovantes, cada uma com a organização que você já usa. Escolha as duas em **📎 Anexos**. O seletor de cada campo lista só os arquivos da pasta daquele tipo

Em qualquer caso, evite renomear ou mover os arquivos depois de anexar, porque o caminho salvo deixa de existir.

```
Anexos/
└── 2026-11/
    ├── cartao-de-credito - fatura.pdf
    ├── cartao-de-credito - comprovante.pdf
    ├── aluguel - fatura.pdf
    └── aluguel - comprovante.pdf
```

**Regras**

- A lista só mostra **PDF, PNG, JPG, JFIF, WEBP, GIF, BMP, SVG e AVIF**. Se ela vier vazia, a janela diz quantos arquivos leu e quais tipos encontrou (ex.: `.docx (3)`). Pastas que começam com ponto são ignoradas. O arquivo escolhido precisa estar **dentro da pasta conectada**; fora dela o app avisa
- Aceita **PDF, PNG, JPG, WEBP, GIF, BMP e SVG**. O app reconhece o **tipo real pelo conteúdo**, então um PDF com nome `.png` abre como PDF (com um aviso). Renomear a extensão **não converte** o arquivo. O app **só lê**: não copia, move nem apaga arquivos. **✕** remove o anexo da despesa e o arquivo continua na pasta
- A verificação de arquivos repetidos compara o caminho e vale entre **todas as linhas**: o arquivo da própria linha não é escondido dela. Com **uma pasta só**, um arquivo usado como fatura também some da lista de comprovantes (e vice-versa); com **duas pastas**, cada tipo olha só o seu
- Se o arquivo não estiver na pasta do tipo, o app procura na outra pasta (por isso anexos antigos continuam abrindo ao separar as pastas)
- Maiúsculas e minúsculas são ignoradas, e vale também o caminho com o nome da pasta na frente ou um caminho completo do Windows que contenha o nome da pasta
- **Chrome, Edge e Opera** lembram a pasta; ao abrir de novo o navegador pede a permissão (**🔓 Reconectar**). **Firefox e Safari** não guardam a pasta: escolha-a de novo a cada vez que abrir o app
- Se o navegador retirar a permissão no meio do uso, a janela mostra **🔓 Reconectar** em vez de uma lista vazia
- Arquivo não encontrado? O visualizador mostra o caminho esperado; confira a pasta em **📎 Anexos**
- No XLSX: colunas `FATURA` e `COMPROVANTE` da aba `Despesas` (separe vários caminhos com `|`) e, para consulta, as mesmas colunas na aba `Despesas por categoria`. Também dá para preencher os caminhos direto no Excel

---

## 📄 Exportar PDF de uma conta ou categoria

O botão **PDF** do topo abre a janela **Exportar PDF**, com duas opções:

- **Relatório completo:** carteira, extrato, despesas, resgates, gráficos e projeção (como antes)
- **Somente uma conta ou categoria de despesas:** escolha na lista uma **conta / grupo** (ex.: *Cartão de crédito*, *Internet*, *Aluguel*) ou uma **categoria dos itens** (ex.: *Compras Online*). A janela mostra na hora o número de lançamentos, o previsto, o pago e o a pagar do que será exportado

O PDF de uma conta ou categoria traz:

- Cabeçalho com o nome escolhido e quatro indicadores: **total previsto**, **pago**, **a pagar** e **lançamentos**
- Uma página de gráficos: despesas por mês, por categoria do item e maiores despesas (e por grupo, quando há mais de um)
- A lista de despesas com **Previsto, Pago e Pendente** e linha de totais, a composição por grupo e o subtotal por categoria
- Nada de carteira, extrato, resgates ou projeção. O arquivo sai como `fynn-despesas-<nome>.pdf`

Regras:

- O **período** do topo vale também aqui (meses futuros entram quando o período inclui o mês atual)
- Escolher uma conta que tem **grupos dentro** (ex.: *Condomínio* dentro de *Aluguel*) inclui os grupos de dentro; escolher o grupo de dentro exporta só ele
- Na categoria dos itens, só entram os itens daquela categoria, em qualquer conta
- O **pago** segue a [baixa de despesas](#-baixa-de-despesas)

---

## 🧪 Dados de exemplo

O botão **Ver dados de exemplo** da tela inicial carrega uma carteira fictícia que usa quase todos os recursos do app. As datas são **sempre relativas a hoje** (o exemplo nunca fica "velho") e não há números aleatórios, então o resultado é o mesmo a cada vez.

- **Carteira:** renda fixa (conta remunerada, Tesouro Selic e IPCA+, LCI, LCA, CDB pós e prefixado, com um CDB recente para mostrar o **IOF**), **FIIs**, **ações** (uma delas no prejuízo), **ETFs** e dois fundos de **previdência** (VGBL e PGBL) com aportes mensais
- **Extrato (12 meses):** salário, PLR, 13º, aluguel recebido, rendimentos da conta, **proventos** de FIIs e ações (dividendos e JCP), uma categoria criada pelo usuário (*Freelance*) e uma *Venda de Patrimônio*
- **Despesas:** meses passados, atual e futuros, com grupos dentro de grupos (*Moradia* com Aluguel, Condomínio, Energia e Internet), **categorias por item**, cartão de crédito com 4 **compras parceladas** (uma com pagamento parcial e um estorno), contas com ícone e cor
- **Situação das despesas:** o exemplo mostra **PAGA**, **VENCIDA**, **VENCE ESSE MÊS** e **A VENCER**, além de uma despesa **paga antecipadamente**
- **Resgates** e **Notas** de exemplo

Para começar do zero, use **Limpar**; para guardar o exemplo como planilha, use **XLSX**.

---

## 🧭 Guia rápido e limpeza de dados
 
**Guia rápido.** No primeiro acesso, uma janela com 12 passos explica a barra superior e cada aba (Dashboard, Projeção, Renda por papel, Carteira, Extrato, Despesas, Resgates e Notas). Navegue com **Próximo/Anterior**, com as setas do teclado ou pelas bolinhas; `Esc` ou **Pular guia** fecha. O texto está em `src/Tour.jsx`.
 
- Ao fechar, o app grava `fynn-tour-v1` no `localStorage` e não mostra o guia sozinho de novo
- O botão **❓** do topo reabre o guia quando quiser
- Para testar sem apagar nada, acrescente `?tour=1` ao endereço (ex.: `https://usuario.github.io/FinDash/?tour=1`)
**O que o navegador guarda** (`localStorage` do site): `fynn-control-v1` (seus dados), `fynn-theme` (tema), `fynn-prefs-v1` (personalização do layout), `fynn-file-v1` (nome e horários do arquivo carregado), `fynn-tour-v1` (guia visto) e o cache do CDI e da Selic.
 
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
├── scripts/versao.mjs             # lança nova versão (npm run versao)
├── vite.config.js                 # base './' para o GitHub Pages
├── package.json
└── src/
    ├── main.jsx                   # ponto de entrada
    ├── App.jsx                    # estado, abas, importação/exportação, arquivo carregado, preferências
    ├── prefs.js                   # preferências de layout: carregar, aplicar, fundos prontos e leitura/escrita na aba Preferências
    ├── version.js                 # versão do app (único lugar para editar; aparece no rodapé e no PDF)
    ├── Personalizar.jsx           # janela 🎨 Personalizar (tema, cor, densidade, papel de parede e abas)
    ├── data.js                    # colunas, regras de cálculo, categorias, import/export, modelos, dados de exemplo
    ├── period.js                  # filtro de período (mês, 3/12 meses, ano, tudo, personalizado)
    ├── paste.js                   # leitura de dados colados no Extrato (datas, valores, colunas)
    ├── pasteDesp.js               # interpretador de texto colado de despesas
    ├── products.js                # cruza carteira, proventos e resgates por produto
    ├── pdf.js                     # relatório em PDF (resumo, gráficos e tabelas; completo ou só de uma conta/categoria)
    ├── PdfModal.jsx               # janela Exportar PDF (relatório completo ou uma conta/categoria de despesas)
    ├── fileMeta.js                # arquivo carregado: nome, horários de carga/edição e recarga do disco
    ├── anexos.js                  # pastas de anexos (faturas e comprovantes): caminhos relativos, leitura das pastas e arquivos
    ├── Anexos.jsx                 # visualizador, escolha do arquivo, janela das pastas e campos de anexo
    ├── pdfScope.js                # filtra as despesas por conta (com os grupos de dentro) ou por categoria para o PDF
    ├── useMedia.js                # detecta tela de celular
    ├── Landing.jsx                # tela inicial (sem dados)
    ├── Dashboard.jsx              # indicadores e gráficos
    ├── RendaPorPapel.jsx          # aba Renda por papel (yield on cost)
    ├── market.js                  # CDI e Selic (API pública do Banco Central, com cache local)
    ├── CartHero.jsx               # painel de resumo da Carteira
    ├── Table.jsx                  # tabela editável (todas as abas): ordenação, seleção (com soma), lápis e trava
    ├── NewItem.jsx                # formulário de novo item da Carteira
    ├── ExtratoView.jsx            # aba Extrato (trava de edição e soma da seleção)
    ├── PasteModal.jsx             # colagem interativa de lançamentos do Extrato
    ├── PasteDespesas.jsx          # colagem interativa de despesas
    ├── ProductSearch.jsx          # busca e detalhe de produtos
    ├── DespesasView.jsx           # aba Despesas (lista, matriz mensal, grupos, categorias, contas, baixa)
    ├── Projecao.jsx               # aba Projeção (fluxo de caixa e patrimônio)
    ├── dialog.js                  # confirmDialog() e alertDialog(): janelas do app no lugar de confirm()/alert()
    ├── DialogHost.jsx             # desenha as janelas de confirmação e aviso (montado uma vez no App)
    ├── PrevSaldos.jsx             # janela para atualizar o saldo dos fundos de previdência
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
- A **personalização do layout** também vai no XLSX (aba `Preferências`) e é restaurada ao importar.
- **CSV** exporta a aba atual. **XLSX** exporta as abas de dados, `Notas` e `Preferências` (com a baixa das despesas) no mesmo formato de entrada, então pode ser reimportado.
- **PDF** pode ser completo ou só de uma conta/categoria de despesas (janela ao clicar em **PDF**). O completo traz o resumo, os gráficos e as tabelas, com a **Projeção na última página** e **linha de totais** no fim de cada uma (Carteira, Extrato, Despesas, composição por grupo e Resgates). Na lista de despesas há o **Total geral** (previsto, pago e pendente) e, havendo meses futuros, a linha **Até o mês atual**. Extrato, despesas e resgates saem apenas com o **período filtrado**, para o relatório não ficar enorme.
---
 
## ⚠️ Observações
 
- **Segurança do `xlsx`:** a versão `0.18.x` publicada no npm (usada aqui) está desatualizada e o `npm audit` aponta vulnerabilidades. Como o app roda só no seu navegador e abre arquivos seus, o risco prático é baixo, mas evite importar planilhas de origem desconhecida.
- A busca de produtos usa apenas os dados da sua planilha; o app **não consulta cotações** de ativos. A única consulta de mercado é o **CDI** (série 4389) e a **meta Selic** (série 432) na API pública do Banco Central. Se ela estiver fora do ar ou sem internet, o último valor salvo é exibido.
- Dados salvos em `localStorage` têm limite de cerca de 5 MB por navegador, o que é suficiente para milhares de lançamentos.
---
 
## 🏷️ Versionamento

A versão do app fica em **um único arquivo**: `src/version.js`. Ela aparece no rodapé da tela (ex.: `v26.11.30`) e no rodapé dos PDFs.

Para lançar uma versão, rode na raiz do projeto:

```bash
npm run versao -- "O que mudou"              # soma 1 ao último número (26.11.29 → 26.11.30)
npm run versao -- 26.12.1 "O que mudou"      # escolhe o número da versão
```

O comando atualiza o `src/version.js` e acrescenta uma linha no topo do **Histórico de atualizações**. Depois é só `git commit` e `git push`.

- **Padrão do número:** `AA.MM.N` (ano, mês e contador de lançamentos)
- **Sem o comando:** edite `VERSION` em `src/version.js` e escreva a linha do histórico à mão
- A versão do `package.json` (`0.1.0`) não é usada pelo app

---

## 🗺️ Histórico de atualizações
- [X] `v26.11.39` Anexos: arquivos já anexados a outra fatura ou comprovante somem da lista de sugestões (com opção de mostrar e aviso de repetição)
- [X] `v26.11.38` Anexos: nova janela de escolha das pastas (um cartão para faturas e outro para comprovantes, com conferência dos arquivos) e zoom nas imagens JPG e PNG
- [X] `v26.11.37` Anexar: botão para procurar o arquivo no explorador já dentro da pasta, lista com diagnóstico (tipos ignorados), atualizar lista e aviso de permissão perdida
- [X] `v26.11.36` Anexos: pasta própria para os comprovantes (opcional), separada da pasta das faturas; o app procura na outra pasta se o arquivo não estiver na do tipo
- [X] `v26.11.35` Visualizador de anexos mais robusto: reconhece o tipo real do arquivo (PDF renomeado para .png abre como PDF), layout fixo, aviso de extensão errada e detalhes do erro
- [X] `v26.11.32` Menu lateral (sidebar) no lugar das abas; clicar em FYNN CONTROL ou na logo volta ao Dashboard; menu recolhível e barra inferior no celular
- [X] `v26.11.31` Dados de exemplo mais completos: carteira com FIIs, ações, ETFs e previdência, proventos, grupos de despesas, parcelamentos e todas as situações (paga, vencida, vence esse mês, a vencer)
- [X] `v26.11.30` Versionamento centralizado: a versão do app fica em src/version.js e o comando npm run versao atualiza a versão e o histórico do README
- [X] `v26.11.29` Despesas: situação colorida (PAGA, VENCIDA, VENCE ESSE MÊS, A VENCER) em cada despesa e fatura, com filtro por situação
- [X] `v26.11.28` Despesas: parcelas e lançamentos da conta entram na fatura já existente do mesmo mês (ex.: várias compras parceladas na mesma fatura do cartão)
- [X] `v26.11.27` Barra superior com o nome do arquivo (.xlsx), data e hora do carregamento, hora da última edição e botão de recarregar
- [X] `v26.11.26` Exportar PDF somente de uma conta ou categoria de despesas (ex.: Cartão de crédito, Internet)
- [X] `v26.11.25` Extrato: botão de travar a edição e soma dos itens selecionados
- [X] `v26.11.24` Despesas: botão de dar baixa (hoje ou outra data); lançamentos novos nascem "a pagar"
- [X] `v26.11.23` Preferências de layout salvas no .xlsx (aba Preferências) e restauradas ao importar
- [X] `v26.11.22` Papel de parede com fundos pré-definidos (grade, pontos, linhas, xadrez, aurora e outros)
- [X] `v26.11.21` Criação de campo para edição de preferências do layout e customização da página
- [X] `v26.11.20` Correção de largura em despesa, no pop-up de editar os itens.
- [X] `v26.11.19` Função para editar itens na carteira e criar nome de PAPEL limitado em 40 caracteres
- [X] `v26.11.18` Exibir custo médio em carteira
- [X] `v26.11.17` Criação e edição de Previdência Privada
- [X] `v26.11.16` Projeção só com parcelas em aberto, Projeção na última página do PDF e totais (pago, a pagar, futuro) ao filtrar em Despesas
- [X] `v26.11.15` Extrato: renomear, mesclar e excluir categorias criadas pelo usuário
- [X] `v26.11.14` Janelas de confirmação e aviso do próprio app, no lugar das do navegador
- [X] `v26.11.13` Aba Projeção: fluxo de caixa e patrimônio projetados a partir das entradas e despesas
- [X] `v26.11.12` Guia rápido no primeiro acesso, explicando cada aba (botão ❓ para rever)
- [X] `v26.11.11` Exibir Guia de Uso ao acessar pela primeira vez + Remolde layout
- [X] `v26.11.10` Exibir percentual dos itens em Dashboard
- [X] `v26.11.9` Mostrar categorias e ícones das contas no PDF e no Dashboard
- [X] `v26.11.8` Notas: a barra `/` pode ser digitada sem abrir a busca de produtos
- [X] `v26.11.7` PDF com linha de totais no fim das tabelas
- [X] `v26.11.6` Categorias por item (subitens) exportadas no XLSX e total apurado ao usar a lupa em Despesas
- [X] `v26.11.5` Ícones genéricos para as contas de despesas, com cor de fundo editável, sugestão automática pelo nome e envio de PNG, JPG, WebP ou SVG
- [X] `v26.11.4` Despesas: lista sem rolagem horizontal e despesas do grupo com quebra de linha
- [X] `v26.11.3` Despesas: grupo dentro de grupo, com totais somados no grupo principal
- [X] `v26.11.2` Despesas: valores negativos (abatimentos) em itens e parcelas, e mover qualquer item para qualquer grupo do mesmo mês
- [X] `v26.11.1` Atribuir abas de contas, com layout próprio, que ao ir inserindo, ir para os itens principais, respectivamente para o .xls
- [X] `v26.10.10` *Yield on cost* por papel, cruzando proventos e valor aplicado
- [X] `v26.10.9` Metas de alocação e comparação com CDI/IPCA
- [X] `v26.10.8` Em Extrato, retirar os itens predefinidos de CATEGORIA
- [X] `v26.10.7` Exibir o percentual de gastos de cada categoria de item
- [X] `v26.10.7` Ao filtrar um item em Despesas, exibir total apurado
- [X] `v26.10.7` Inserir uma função de Notas que deve ser salvo no .xlsx e ao importá-lo, disponibilizá-lo ao usuário
- [X] `v26.10.6` Melhorar o leitor de colar itens
- [X] `v26.10.5` Na aba Carteira, travar e destravar todos os itens para edição para evitar digitação indevida
- [X] `v26.10.4` Pesquisar algum produto e filtrar seleção
- [X] `v26.10.3` Implantar função para selecionar diversos itens em todas as sheets
- [X] `v26.10.2` Colagem de várias despesas de uma vez
- [X] `v26.10.1` Gráficos no PDF

---

Desenvolvido por RAFAEL BARBOSA | Feito para rodar no seu navegador. 💜
