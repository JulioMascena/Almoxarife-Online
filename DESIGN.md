---
name: "PLUMB / Almoxarife"
description: "Estrutura operacional existente com identidade PLUMB e temas claro e escuro."
colors:
  primary: "#35421F"
  primary-hover: "#293417"
  primary-soft: "rgba(53, 66, 31, .10)"
  primary-text: "#35421F"
  secondary: "#64635F"
  accent: "#B54B20"
  sidebar-bg: "#35421F"
  bg: "#E5E2DE"
  surface: "#FAF9F7"
  surface-2: "#EFEDE9"
  border: "#D4D0C9"
  border-strong: "#89867D"
  text: "#35421F"
  text-strong: "#293417"
  muted: "#64635F"
  muted-2: "#64635F"
  danger: "#B42318"
  danger-soft: "#FCEAE6"
  danger-border: "#E6A89F"
  warn: "#8A460F"
  warn-soft: "#FCF0DB"
  ok: "#35421F"
  ok-soft: "#E7EBDD"
  info: "#3D6177"
  info-soft: "#E7EFF3"
  login-overlay: "rgba(229, 226, 222, .72)"
  focus: "#B54B20"
  dark-primary: "#536832"
  dark-primary-hover: "#60783A"
  dark-primary-soft: "rgba(173, 195, 139, .14)"
  dark-primary-text: "#C0D29F"
  dark-secondary: "#C0BDB6"
  dark-accent: "#EF9D78"
  dark-sidebar-bg: "#252E1B"
  dark-bg: "#191C16"
  dark-surface: "#242820"
  dark-surface-2: "#2D3227"
  dark-border: "#3D4435"
  dark-border-strong: "#727B66"
  dark-text: "#E5E2DE"
  dark-text-strong: "#F6F4F0"
  dark-muted: "#BFBCB5"
  dark-muted-2: "#B0ADA6"
  dark-danger: "#FFB4A8"
  dark-danger-soft: "#412722"
  dark-danger-border: "#8A5045"
  dark-warn: "#EAC28A"
  dark-warn-soft: "#3A3021"
  dark-ok: "#C0D29F"
  dark-ok-soft: "#303B24"
  dark-info: "#A9CBDE"
  dark-info-soft: "#263640"
  dark-login-overlay: "rgba(25, 28, 22, .88)"
  dark-focus: "#EF9D78"
typography:
  headline:
    fontFamily: "Oxanium, system-ui, sans-serif"
    fontWeight: 800
  title:
    fontFamily: "Oxanium, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
  body:
    fontFamily: "Oxanium, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Oxanium, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
rounded:
  sm: "8px"
  card: "12px"
  dialog: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  control: "12px"
  md: "16px"
  lg: "24px"
  login: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#fff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "24px"
  badge-primary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: PLUMB / Almoxarife

## Overview

**Creative North Star: "Estrutura atual com a marca PLUMB"**

Direção escolhida pelo usuário: **Estrutura atual com a marca PLUMB**, incluindo opção escura. A interface mantém a organização operacional existente; a identidade aparece na assinatura oficial, no verde militar, no terracota e na tipografia angular.

A prioridade é consultar e registrar materiais com clareza no celular e no computador. Superfícies discretas, bordas visíveis e hierarquia tipográfica sustentam a leitura de formulários e tabelas. Os valores abaixo foram extraídos de `css/styles.css`; este documento consolida a escolha, sem exigir uma nova seleção visual.

**Key Characteristics:**

- Marca PLUMB preservada nos assets oficiais.
- Mesma estrutura operacional nos dois temas.
- Leitura de dados com superfícies sóbrias e contraste de estados.
- Celular e computador com igual prioridade.

## Colors

A paleta fixa fornecida pelo usuário combina verde militar, terracota, cinza concreto e cinza grafite. O frontmatter registra os valores reais do CSS; os tokens com prefixo `dark-` são as substituições em `:root[data-theme="dark"]`, não uma segunda paleta de marca.

### Primary

- **Verde militar:** `primary` nas ações principais e `sidebar-bg` na navegação. `primary-hover`, `primary-soft` e `primary-text` distinguem interação, fundo suave e texto de destaque. No tema escuro essas funções usam variações mais claras para legibilidade.

### Secondary

- **Terracota:** `accent` em detalhes da interface, separador da barra superior e cursor dos campos; `focus` identifica o foco de teclado. Os assets conservam o terracota original em ambos os temas.

### Neutral

- **Cinza concreto:** `bg` no ambiente claro. A logo é apresentada sem placa, preservando a transparência.
- **Cinza grafite:** `secondary`, `muted` e `muted-2` para informação secundária; versões escuras ajustam a luminosidade.
- `surface` recebe cards e campos; `surface-2` distingue cabeçalhos, fundos auxiliares e hover. `border` e `border-strong` delimitam superfícies e controles; `text` e `text-strong` sustentam leitura e hierarquia.
- `danger`, `warn`, `ok` e `info`, com seus fundos suaves, são papéis funcionais. Conservar texto, ícone ou rótulo que explique cada estado.

O tema é escolhido nas configurações e mantido na preferência existente `almoxarife:prefs`, campo `tema`. `index.html` aplica `escuro` antes da primeira renderização; `aplicarPreferencias()` em `js/app.js` atualiza `data-theme` para `dark` ou `light`. O tema padrão é claro; não há seleção automática pelo sistema operacional neste fluxo.

## Typography

**Display Font / Body Font:** Oxanium, com fallback `system-ui, sans-serif`. A fonte variável local em `fonts/oxanium/Oxanium-Variable.ttf` declara pesos 200–800, `font-display: swap` e preload em `index.html`.

A construção angular aproxima o caráter técnico da marca sem substituir sua assinatura em imagem. O corpo usa o peso normal (400); títulos gerais e títulos de cards/acesso usam 800. A barra superior, cabeçalhos de modal, números e subtítulos existentes preservam regras específicas em 600.

### Hierarchy

- **Headline:** títulos gerais em 800; título de acesso com tamanho 22px.
- **Title:** título de card com tamanho 16px e peso 800; barra superior com tamanho 18px e peso 600, reduzido a 16px no celular.
- **Body:** corpo base em 16px/400; tabelas, controles e descrições em 14px. A descrição de acesso usa entrelinha 1.5; não há uma entrelinha global explícita.
- **Label:** campos e botões em 14px/500; cabeçalhos de tabela em 12px/500, caixa alta e espaçamento entre letras de .04em. Caixa alta é localizada.
- **Números:** métricas em 26px/600, reduzidas para 22px e 19px em telas menores; números de tabelas usam algarismos tabulares e alinhamento é direita.

### Estudo preservado

Candidatas indicadas pelo usuário: Chakra Petch Bold, Oxanium ExtraBold e Eurostile Extended Bold. A avaliação preliminar favoreceu Oxanium pelos chanfros e pelo desenho angular; Eurostile aproxima largura e peso, mas tem cantos mais arredondados; Chakra Petch tem caráter técnico mais estreito e leve. Essa avaliação é um julgamento visual, não identifica a fonte original e não constitui comparação de amostras renderizadas com a logo. A implementação atual usa Oxanium; a assinatura continua sendo o asset oficial.

Referências do estudo: [Oxanium e licença](https://github.com/sevmeyer/oxanium), [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch), [Eurostile e licenciamento](https://www.myfonts.com/collections/eurostile-font-urw). Eurostile exige conferir licença antes de uma eventual incorporação.

## Layout

Navegação lateral com largura 240px, barra superior com altura 64px e conteúdo central com largura máxima 1280px. Cards, páginas e grades usam espaçamento principal de 24px. Formulários e grupos usam 16px; controles usam intervalos menores de 4–12px.

A grade de quatro ou três colunas passa a duas até 1100px; a de duas passa a uma até 860px. Até 767px, a navegação vira gaveta, a barra superior tem altura 56px, conteúdo e cards usam 16px, formulários ficam em uma coluna e a busca ocupa a linha. Tabelas mantém rolagem horizontal. Até 420px, métricas compactam sua tipografia e intervalo. Até 768px, botões, campos e seletores têm altura mínima de 44px para toque.

Preservar a opção existente de tabela compacta; ela reduz o padding vertical das células para 8px. Não esconder funções por tamanho de tela.

## Elevation & Depth

Cards são planos, definidos por fundo e borda. Sombra é reservada para acesso, modais, notificações e listas flutuantes; não é decoração geral de cards. `--shadow-modal` é a sombra compartilhada de acesso, modal e toast. O seletor de sugestões tem sombra própria. Foco e hover de alguns cards usam contorno de um pixel em vez de elevação.

Transições de controles e navegação duram .15s; a gaveta usa .2s com `ease-out`. O indicador de carregamento gira em .8s e o aviso de sincronização pulsa em 1.2s. Os valores exatos de sombra e movimento estão em `css/styles.css`.

## Shapes

Controles e navegação têm cantos discretos (`rounded.sm`); cards usam `rounded.card`; acesso e modal usam `rounded.dialog`. Badges, chips, indicadores e interruptores têm forma de cápsula ou círculo. Bordas têm espessura de 1px na maior parte da interface. Não aplicar chanfros artificiais aos componentes para imitar o lettering.

## Components

### Buttons

Ação principal sólida em verde, texto branco e hover com `primary-hover`; contorno usa superfície e borda forte; ghost usa fundo transparente e texto secundário. Padding de 8px 16px, peso 500 e altura mínima 36px no desktop. Botões pequenos usam 6px 10px e altura mínima 30px. Desabilitados têm opacidade .5 e cursor correspondente. Foco de teclado tem contorno de 2px com afastamento de 3px. A ação destrutiva usa vermelho funcional, com fundo específico no escuro.

### Cards / Containers

Superfície neutra, borda discreta, cantos de 12px e padding de 24px, reduzido para 16px no celular. Containers de tabela sem padding mantém recorte e cabeçalho tonal. Cards operacionais não recebem banner ou imagem decorativa.

### Inputs / Fields

Superfície do tema, borda forte, cantos de 8px, padding de 8px 12px e tamanho 14px. Foco altera a borda para a cor primária e acrescenta anel de 1px, junto do contorno de teclado. Labels são explícitas; placeholder é informação secundária, não substituto do label.

### Chips / Badges

Em Produtos, Categoria e Situação do estoque têm rótulos visíveis em todos os tamanhos. No celular, busca, filtros e ações ficam em linhas individuais. As tabelas mantêm rolagem horizontal dentro de seu próprio contêiner, sem alargar a página. Nos locais, o cabeçalho de cada andar tem faixa tonal, com alternância entre fundo primário suave e superfície secundária, título e contagem de locais.

Badges em cápsula usam 12px/500 e padding de 2px 10px, com fundo e texto semânticos. Chips de filtro usam 13px/500 e padding de 6px 12px. Rótulos e ícones comunicam significado além da cor.

### Navigation

O menu inclui Obras. O seletor de obra fica ao lado do status de sincronização e tem rótulo acessível “Obra atual”. No celular, o topo usa duas linhas para manter o título, o seletor e o status legíveis; nomes longos têm largura contida. A obra fictícia recebe identificação explícita no seletor e no gerenciador. A página de Obras reutiliza o cabeçalho e os controles padronizados.

Empresas e Obras são visíveis ao administrador geral e aos responsáveis de empresa, respeitando seus escopos. Só o administrador geral tem Adicionar Empresa e pode trocar o responsável. Toda nova obra exige um seletor de empresa com rótulo; o responsável vê apenas suas empresas nesse campo. O filtro de empresa da listagem fica separado do cabeçalho padronizado. Colaboradores usam somente o seletor de obras liberadas. O modal Acessos mantém campo de e-mail, Liberar acesso e Remover. Estados sem obra permitem aos gestores criar sua primeira obra, sem expor operações em um contexto indevido.

Produtos, Categorias, Funcionários, Locais, Histórico e Relatórios compartilham `.page-header`: contagem ou período à esquerda e ação principal à direita, com altura mínima de 44px e largura mínima de 210px para o botão no desktop. No celular, resumo e ação ocupam linhas separadas e o botão preenche a largura disponível. Filtros e ações secundárias ficam fora desse cabeçalho, em faixa `.filter-toolbar`, para não deslocar a ação principal entre abas. Selects e datas têm rótulos visíveis e ficam em linhas individuais no celular. Painel e Configurações preservam a organização de seus formulários, sem ação global de cadastro.

Navegação vertical verde, texto claro e itens arredondados com 14px/500. Hover usa branco translúcido; item ativo usa base cinza concreto e texto verde com peso 700 nos dois temas. Foco usa contorno pêssego para legibilidade na barra. A gaveta móvel conserva os destinos e se abre pelo botão de menu.

### Assinatura e acesso

- `imgs/plumb_logo_transparente.png`: assinatura horizontal oficial, largura de 168px e altura proporcional, sem placa ou fundo adicional. No acesso claro mantém as cores originais; na navegação verde e no acesso escuro, CSS apresenta a assinatura branca para contraste, preservando a transparência do arquivo.
- `imgs/plumb_icone_transparente.png`: símbolo compacto e favicon, sem reconstrução por fonte.
- `imgs/plumb_banner_completo.png`: fundo institucional do acesso com sobreposição tonal ajustada ao tema; o formulário permanece em superfície sólida.

Preservar proporção, cores e transparência dos assets; não esticar, recolorir nem recortar a assinatura.

## Do's and Don'ts

### Do:

- Do usar os assets oficiais preservando cores, transparência e proporção.
- Do aplicar os tokens semânticos de tema em novas superfícies e controles.
- Do manter Oxanium 400 no corpo e 800 nos títulos principais, respeitando os subtítulos existentes em 600.
- Do conferir foco, contraste, estados e uso em celular nos dois temas.

### Don't:

- Don't reconstruir o lettering PLUMB com fonte ou deformar a assinatura.
- Don't usar ExtraBold em textos extensos nem aplicar caixa alta a todos os textos.
- Don't transformar o banner institucional em fundo de tabelas e formulários operacionais.
- Don't comunicar erro, sucesso ou estado selecionado apenas por cor.
