# Almoxarife

Controle de estoque do almoxarifado da obra, com o visual do painel do Tavara: menu lateral verde, cards brancos, fontes Outfit e Work Sans e modo escuro.

## Como funciona
O site é publicado no **Firebase Hosting** do projeto `almoxarife-online` e os dados ficam no **Firestore** do mesmo projeto. Todos os aparelhos (celular e computador) usam o mesmo login (ID + senha da obra) e veem os mesmos dados em tempo real. Sem internet, os lançamentos ficam guardados no aparelho e sobem sozinhos quando a conexão volta (indicador no topo: Sincronizado / Enviando / Sem internet).

Tema, tabela compacta e lembrete de backup são preferências de cada aparelho.

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

