# Almoxarife

Controle de estoque do almoxarifado da obra com identidade PLUMB: verde militar, terracota, superfícies em cinza concreto e tipografia Oxanium. Estrutura de navegação preservada, com temas claro e escuro em **Configurações → Aparência**, salvos por aparelho. Diretrizes em [DESIGN.md](DESIGN.md); fonte hospedada localmente em `fonts/oxanium/`, com licença OFL incluída.

## Como funciona

### Visualizar com dados fictícios

Abra `http://localhost:5173/?demo=1#/painel` com o servidor local em execução (`python -m http.server 5173`). A demonstração entra sem login e apresenta 20 materiais, 6 categorias, 7 funcionários, 20 apartamentos em 5 andares e áreas comuns, com histórico e saldos relacionados. Eletricistas retiram materiais elétricos; encanadores, itens hidráulicos; e assim por diante. Inclui estoques regulares, baixos e zerados.

O indicador **Demonstração** identifica esse modo. Os dados fictícios ficam na **Obra teste**. É possível criar e editar outras obras locais para experimentar o seletor. Dados e preferências desse modo ficam no armazenamento do navegador, separados do acesso normal; recarregar preserva as alterações. Não há leitura ou gravação no banco Firebase. Remova `?demo=1` e o parâmetro `obra` da URL para voltar ao acesso normal. Para verificar consistência dos dados e isolamento: `node tests/demo.test.cjs`.

### Acesso normal

O site é publicado no **Firebase Hosting** do projeto `almoxarife-online` e os dados ficam no **Firestore** do mesmo projeto. Cada pessoa entra com e-mail e senha pessoal e deve confirmar o e-mail antes de acessar dados. No primeiro acesso, use **Criar minha conta**; para uma conta existente, use **Esqueci minha senha** quando necessário. O login compartilhado por ID deixou de conceder acesso.

Os administradores configurados em `config/permissoes.adminEmails` acessam todas as obras. São administradores `jcmascena55@gmail.com` e `vitordonadellirodrigues@gmail.com`. A conta de serviço do Firebase é uma identidade de infraestrutura, não um usuário de login no site. O documento de administradores só pode ser alterado pelo proprietário do projeto usando acesso administrativo ao Firebase, nunca por clientes web.

Em **Empresas**, o administrador geral cadastra empresas e define o e-mail do responsável de cada uma. O responsável cria e gerencia obras e libera colaboradores somente nas próprias empresas, em **Obras → Acessos**. Só o administrador geral cria empresas ou troca seus responsáveis. O responsável pode atualizar o nome da própria empresa. Uma pessoa pode ser responsável por mais de uma empresa.

Colaboradores criam suas contas com e-mail confirmado e veem somente as obras em que foram liberados. Não acessam os menus de gestão e não alteram permissões. A liberação não envia convite automaticamente. As regras do Firestore protegem empresas, obras, catálogos e os registros antigos da obra principal.

Tema, tabela compacta e lembrete de backup são preferências de cada obra neste aparelho.

### Obras

O seletor ao lado do status de sincronização escolhe a obra de todas as abas. A troca recarrega o contexto para limpar filtros, rascunhos e seleções da obra anterior; fica bloqueada enquanto há sincronização ou restauração em andamento. A obra selecionada é identificada no parâmetro `obra` da URL.

Em **Obras**, administradores gerais gerenciam todas as obras; responsáveis gerenciam as obras das próprias empresas. Toda nova obra exige uma empresa, e essa vinculação não é alterada pelo formulário de edição. O botão **Criar Obra teste com dados fictícios** é exclusivo do administrador geral e pede uma empresa de destino. Não há exclusão de empresas ou obras nesta versão. Colaboradores alternam apenas entre obras liberadas no seletor do topo.

A hierarquia é **Admin geral → Empresa → Obras**. Empresas ficam em `empresas/{id}`, com `nome` e `responsavelEmail`; obras em `obras/{id}`, com `empresaId` e `usuarios`. Os registros anteriores são vinculados à **Empresa inicial**, com responsável a definir pelo administrador geral. Os dados operacionais não são movidos: a Obra principal conserva os caminhos originais e as demais usam subcoleções próprias. Backup, importação, lançamentos e relatórios continuam restritos à obra selecionada. Código e regras devem ser publicados juntos, após preparar os metadados.

Testes locais de autenticação, sem enviar e-mails: `node tests/auth.test.cjs`. Os testes do emulador também verificam acesso de membro, e-mail não confirmado, revogação, tentativa de autopromoção e o bloqueio do login compartilhado antigo.

### Testes de isolamento no emulador

O teste `tests/firestore-obras.test.cjs` verifica o adaptador real, as regras, a criação de exemplos e a preservação dos dados legados usando apenas o projeto fictício `demo-almoxarife-obras`. Requer Java e os pacotes de teste. Exemplo em PowerShell, sem instalar dependências no site:

```powershell
$testDeps = Join-Path $env:TEMP 'almoxarife-obras-tests'
npm install --prefix $testDeps --no-audit --no-fund @firebase/rules-unit-testing firebase
$env:NODE_PATH = Join-Path $testDeps 'node_modules'
npx --yes firebase-tools emulators:exec --config .firebase-emulator.json --project demo-almoxarife-obras --only firestore 'node tests/firestore-obras.test.cjs'
```

## Publicar
Na pasta do projeto, com o Firebase CLI logado:
```
firebase deploy --only hosting,firestore:rules
```

Para testar localmente: `python -m http.server 5173` e abra http://localhost:5173 (usa o mesmo banco de produção).

## Menu
| Item | O que faz |
|---|---|
| Painel | **Lançamento rápido** (material com busca fuzzy: aceita letras faltando, palavras fora de ordem, código, categoria e um erro de digitação; funcionário com a mesma busca fuzzy (nome ou função), local, dia e hora já preenchidos com o momento atual), estoque baixo e movimentações recentes |
| Produtos | Cadastro (nome, código, unidade, quantidade, mínimo, categoria), busca e filtros, **Entrada**, **Saída para um local da obra**, histórico do produto, editar e excluir. **Clicando no nome do produto** abre o relatório de uso: média por dia, gráfico de uso por dia/semana, previsão de quanto o estoque dura, quem mais retira e onde mais é usado (7, 30, 90 dias ou tudo). Botão **Lote CSV**: baixa o modelo com todos os produtos e importa a planilha preenchida, conferindo linha a linha antes de gravar |
| Categorias | Cards coloridos com nº de produtos, saídas no mês e itens em falta |
| Locais da Obra | Apartamentos por andar, áreas comuns, garagens, fachada e almoxarifado. Inclui status da etapa, gerador de apartamentos (1901, 1902…) e o detalhe do que cada local recebeu |
| Funcionários | Cadastro da equipe (nome, função, ativo/inativo). Toda saída de material exige o funcionário que retirou e o local onde o material vai ser aplicado. A lista mostra o último local atendido, e cada funcionário tem o detalhe de onde trabalhou, em qual serviço, o que retirou e o histórico dele |
| Histórico | Tudo o que aconteceu, dia a dia: cadastro de produto (data e estoque inicial), entradas, saídas (para onde e quem retirou), ajustes e exclusões. Filtros por tipo, produto, local, funcionário e período. Tem a visão **Resumo por produto** (cadastrado em, quanto entrou, quanto saiu, estoque atual), exportação em CSV e botão para desfazer um lançamento errado |
| Relatórios | Filtro por período, saídas por local, entradas × saídas por mês, produtos mais retirados, itens abaixo do mínimo com sugestão de compra, impressão |
| Configurações | Nome da obra, backup e restauração (JSON), importação e exportação de produtos em CSV, link de compartilhamento, tema, preferências, mínimo padrão, lembrete de backup, redefinir dados |

O app não usa preço nem valores em dinheiro. Em relação ao Tavara, saíram Pedidos, Fornecedores, Contatos, Planta Baixa e o seletor de idioma.

## Estrutura
```
index.html
css/styles.css          tokens de cor (claro e escuro), layout e componentes
js/store.js             dados, regras de estoque e dados de exemplo
js/nuvem.js             login e sincronização com o Firestore
js/ui.js                ícones, modal, toast, gráficos de barras
js/fuzzy.js             busca aproximada e caixa de autocompletar
js/lote.js              movimentações em lote por CSV
js/app.js               menu lateral, topo e rotas (#/painel, #/produtos…)
js/pages/*.js           uma tela por arquivo (historico.js = aba Histórico)
```

## Movimentações em lote (CSV)
1. Em **Produtos → Lote CSV** (ou **Histórico → Lançar em lote**), baixe o modelo. Ele traz uma linha por produto.
2. Preencha no Excel: `quantidade` (linhas vazias são ignoradas), `tipo` (saida/entrada), `data` (dd/mm/aaaa, vazio = hoje), `hora` (hh:mm, vazio = hora da importação), `funcionario` e `local` (obrigatórios na saída; para apartamento basta o número, ex.: 1901). Para um produto que saiu várias vezes, copie a linha.
3. Importe o arquivo. O app mostra a conferência: o que está OK, o que tem erro (e por quê) e confere o estoque na ordem dos horários. Só as linhas OK são gravadas. As linhas com erro podem ser baixadas para corrigir e importar de novo.

