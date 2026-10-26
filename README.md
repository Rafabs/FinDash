# 📊 Fynn Control

Painel pessoal de **investimentos, proventos e despesas** que roda inteiro no navegador.
Você importa a sua planilha (`.xlsx` ou `.csv`), edita os dados direto na tela, acompanha o dashboard por período e exporta quando quiser.

> **Privacidade:** não existe servidor nem banco de dados. Os dados ficam apenas no `localStorage` do seu navegador e nunca são enviados para lugar nenhum.

---

## ✨ Funcionalidades

**Geral**
- Importação de `.xlsx` (dados e notas) ou `.csv` (uma tabela por arquivo, reconhecida pelo cabeçalho)
- Exportação em **CSV**, **XLSX** e **PDF** (com resumo, **gráficos** e tabelas)
- **Busca de produtos** (🔍 no topo, `Ctrl+K` ou `/`): veja detalhes de qualquer papel ou produto (veja [Busca de produtos](#-busca-de-produtos))
- **Seleção múltipla**: marque várias linhas com o checkbox e exclua de uma vez
- Tabelas com **ordenação por cabeçalho** (clique: crescente → decrescente → original; vale para o conjunto filtrado, não só para a página)
- **Itens por página** configurável (20, 30, 40, 50, 100 ou 200; padrão 40) no Extrato, Despesas e Resgates, e a escolha fica salva
- Linhas do Extrato, Despesas e Resgates ficam travadas e só editam pelo **lápis ✏️**
- Tema **claro e escuro** (segue o sistema e lembra a sua escolha)
- **Versão para celular**: abas viram barra inferior, tabelas viram cartões e janelas sobem de baixo da tela
- Landing page com explicação, modelos para download e dados de exemplo
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
- Filtro por **período**, categoria e busca em texto
- Tabela paginada e editável
- **Colar dados** do Excel/Google Sheets com reconhecimento automático das colunas, prévia editável e detecção de duplicatas

**Resgates**
- Resgates de investimentos com a **rentabilidade** obtida até a data do resgate (lucro, pode ser negativo)
- Esse valor **soma-se às entradas** (Extrato, fluxo de caixa e saldo do dashboard)
- Filtros por período, produto e busca, com tabela editável e paginada

**Despesas**
- Lista, **matriz mensal** (conta × mês) e filtros
- Assistente **📅 Lançar mês**: sugere as contas recorrentes dos últimos 3 meses, mostra o valor anterior como referência e permite copiar os últimos valores
- **📋 Colar despesas** (ou `Ctrl+V` na aba): cole vários registros de uma vez; o app entende texto em blocos (`despesa:` / `valor:` / `pago em:`), tabelas do Excel e linhas livres (veja [Colar despesas](#-colar-despesas))

**Dashboard**
- Patrimônio, alocação e patrimônio por banco
- Proventos por mês e por papel, média mensal e maior pagador
- Despesas por conta e por mês, entradas (com resgates) × despesas e saldo do período
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
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`

Por que funciona em qualquer subpasta: o `vite.config.js` usa `base: './'` (caminhos relativos) e o app não usa rotas por URL, apenas abas internas. Por isso não há erro 404 ao recarregar a página.

---

## 📥 Formato da planilha

O arquivo `.xlsx` tem até 5 abas de dados. Mantenha os cabeçalhos **exatamente** como abaixo. Na tela inicial do app há botões para baixar um modelo pronto (`.xlsx` completo ou CSV de cada tabela).

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
| `COTA_1`, `VALOR`, `COTA_2`, `VALOR`, … | Itens da conta (nome + valor) |

A mesma conta pode aparecer em mais de uma linha no mesmo mês (por exemplo, dois cartões). Linhas sem nenhum valor são ignoradas.

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

## 📋 Colar despesas

Na aba Despesas, use **📋 Colar despesas** ou `Ctrl+V` fora de qualquer campo. Formatos aceitos:

```text
despesa: energia elétrica          custo: internet
valor: R$ 150,00                   preço: R$ 119,90
pago em: 15/05/2020                pagamento: 15/05/2020
```

- **Blocos "rótulo: valor"**: conta (`despesa`, `custo`, `conta`, `gasto`, `tipo`, `categoria`), valor (`valor`, `preço`, `total`), data (`pago em`, `pagamento`, `data`, `vencimento`) e descrição opcional (`descrição`, `item`, `obs`)
- **Tabela copiada do Excel/Sheets**, com ou sem cabeçalho
- **Uma despesa por linha**, em ordem livre: `Energia elétrica - R$ 150,00 - 15/05/2020`

A prévia mostra cada registro como **nova**, **duplicada** ou **incompleta** e permite editar antes de adicionar. Contas parecidas com as existentes são unificadas (`energia` → `ENERGIA ELÉTRICA`), registros sem data vão para um mês padrão à sua escolha e registros do mesmo mês e conta viram uma linha com vários itens. Só o **mês** é guardado, já que a aba Despesas é mensal.

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
    ├── CartHero.jsx               # painel de resumo da Carteira
    ├── Table.jsx                  # tabela editável (todas as abas): ordenação, seleção, lápis e trava
    ├── NewItem.jsx                # formulário de novo item da Carteira
    ├── ExtratoView.jsx            # aba Extrato
    ├── PasteModal.jsx             # colagem interativa de lançamentos do Extrato
    ├── PasteDespesas.jsx          # colagem interativa de despesas
    ├── ProductSearch.jsx          # busca e detalhe de produtos
    ├── DespesasView.jsx           # aba Despesas (lista e matriz mensal)
    ├── ResgatesView.jsx           # aba Resgates
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
- **PDF** traz o resumo, os gráficos e as tabelas. Extrato, despesas e resgates saem apenas com o **período filtrado**, para o relatório não ficar enorme.

---

## ⚠️ Observações

- **Segurança do `xlsx`:** a versão `0.18.x` publicada no npm (usada aqui) está desatualizada e o `npm audit` aponta vulnerabilidades. Como o app roda só no seu navegador e abre arquivos seus, o risco prático é baixo, mas evite importar planilhas de origem desconhecida.
- A busca de produtos usa apenas os dados da sua planilha; não consulta cotações nem informações de mercado (o app não usa servidor).
- Dados salvos em `localStorage` têm limite de cerca de 5 MB por navegador, o que é suficiente para milhares de lançamentos.

---

## 🗺️ TO DO

- [ ] Em Extrato, retirar os itens predefinidos de CATEGORIA
- [ ] Exibir o percentual de gastos de cada categoria de item
- [ ] Pesquisar algum produto e ver detalhes e informações
- [ ] *Yield on cost* por papel, cruzando proventos e valor aplicado
- [ ] Metas de alocação e comparação com CDI/IPCA
- [X] v26.10.1 Gráficos no PDF
- [X] v26.10.2 Colagem de várias despesas de uma vez
- [X] v26.10.3 Implantar função para selecionar diversos itens em todas as sheets
- [X] Pesquisar algum produto e filtrar seleção
- [X] Na aba Carteira, travar e destravar todos os itens para edição para evitar digitação indevida
- [X] Melhorar o leitor de colar itens
- [X] Inserir uma função de Notas que deve ser salvo no .xlsx e ao importá-lo, disponibilizá-lo ao usuário
- [X] Ao filtrar um item em Despesas, exibir total apurado
---

Feito para rodar no seu navegador. 💜
