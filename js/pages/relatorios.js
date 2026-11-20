(function () {
  const { icon, esc, num, bars, vchart, empty, badgeEstoque, MESES, data } = UI;
  const filtros = { de: '', ate: '' };

  function render(root) {
    const s = Store.state;
    const { de, ate } = filtros;
    const movsPeriodo = s.movimentos.filter((m) => Store.noPeriodo(m, de, ate));
    const saidas = movsPeriodo.filter((m) => m.tipo === 'saida');
    const entradas = movsPeriodo.filter((m) => m.tipo === 'entrada');
    const cadastros = movsPeriodo.filter((m) => m.tipo === 'cadastro');
    const baixos = Store.estoqueBaixo();
    const zerados = baixos.filter((p) => p.quantidade <= 0);
    const fmtSaidas = (v) => `${num(v, 0)} ${v === 1 ? 'saída' : 'saídas'}`;
    const fmtProd = (v) => `${num(v, 0)} ${v === 1 ? 'produto' : 'produtos'}`;

    const porLocal = [...Store.saidasPorLocal(de, ate).entries()]
      .map(([id, v]) => ({ nome: (Store.local(id) || {}).nome || '—', valor: v.saidas }))
      .sort((a, b) => b.valor - a.valor).slice(0, 10);

    const porProduto = new Map();
    saidas.forEach((m) => {
      const cur = porProduto.get(m.produtoId) || { nome: m.produtoNome, unidade: m.unidade, qtd: 0, vezes: 0, locais: new Set() };
      cur.qtd += m.quantidade; cur.vezes += 1; if (m.localId) cur.locais.add(m.localId);
      porProduto.set(m.produtoId, cur);
    });
    const maisRetirados = [...porProduto.entries()].map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.vezes - a.vezes || b.qtd - a.qtd).slice(0, 10);

    const porMes = ultimosMeses(6).map((mk) => {
      const ms = s.movimentos.filter((m) => m.data.slice(0, 7) === mk);
      return { label: MESES[Number(mk.slice(5, 7)) - 1], a: ms.filter((m) => m.tipo === 'entrada' || m.tipo === 'cadastro').length, b: ms.filter((m) => m.tipo === 'saida').length };
    });

    const periodoTxt = de || ate ? `${de ? data(de) : 'início'} até ${ate ? data(ate) : 'hoje'}` : 'Todo o período';

    root.innerHTML = `
      <div class="print-only"><h1 style="font-size:22px">Relatório do almoxarifado · ${esc(s.settings.obraNome)}</h1><p class="muted">${esc(periodoTxt)} · gerado em ${data(Store.hoje())}</p></div>
      <div class="toolbar no-print">
        <div class="field" style="flex-direction:row;align-items:center;gap:8px"><label for="r-de" class="muted" style="font-weight:400">De:</label><input class="input" id="r-de" type="date" value="${esc(de)}" data-de style="width:auto"></div>
        <div class="field" style="flex-direction:row;align-items:center;gap:8px"><label for="r-ate" class="muted" style="font-weight:400">Até:</label><input class="input" id="r-ate" type="date" value="${esc(ate)}" data-ate style="width:auto"></div>
        ${de || ate ? '<button class="btn btn-ghost btn-sm" data-limpar>Limpar período</button>' : ''}
        <span class="spacer"></span>
        <a class="btn btn-outline" href="#/historico">${icon('clock', 'i-sm')}Ver histórico completo</a>
        <button class="btn btn-primary" data-print>${icon('printer', 'i-sm')}Imprimir Relatório</button>
      </div>

      <div class="grid grid-4">
        ${stat('Produtos Cadastrados', num(s.produtos.length, 0), `${cadastros.length} novos no período`)}
        ${stat('Saídas para a Obra', num(saidas.length, 0), esc(periodoTxt.toLowerCase()))}
        ${stat('Entradas', num(entradas.length, 0), 'recebimentos no período')}
        ${stat('Estoque Baixo / Zerado', `${baixos.length} <span class="muted" style="font-size:16px">/ ${zerados.length}</span>`, 'abaixo do mínimo / sem estoque', baixos.length > 0)}
      </div>

      <div class="grid grid-2">
        <div class="card"><h3 class="card__title">Saídas por Local</h3>${bars(porLocal, fmtSaidas)}</div>
        <div class="card"><h3 class="card__title">Entradas × Saídas por Mês</h3>${vchart(porMes, { legend: ['Entradas e cadastros', 'Saídas'], fmt: (v) => `${num(v, 0)} lançamentos` })}</div>
      </div>

      <div class="grid grid-2">
        <div class="card"><h3 class="card__title">Produtos por Categoria</h3>${bars(Store.produtosPorCategoria().filter((r) => r.valor > 0).sort((a, b) => b.valor - a.valor), fmtProd)}</div>
        <div class="card"><h3 class="card__title">Retiradas por Funcionário</h3>${bars([...Store.saidasPorFuncionario(de, ate).entries()].map(([id, v]) => ({ nome: (Store.funcionario(id) || {}).nome || '—', valor: v.saidas })).sort((a, b) => b.valor - a.valor).slice(0, 10), fmtSaidas)}</div>
      </div>

      <div class="card card--flush">
        <div class="card__head" style="padding:20px 24px 0"><h3 class="card__title">Produtos Mais Retirados</h3><span class="muted" style="font-size:13px">${esc(periodoTxt)}</span></div>
        ${maisRetirados.length ? `<div class="table-wrap" style="margin-top:12px"><table class="table">
          <thead><tr><th>Produto</th><th class="num">Saídas</th><th class="num">Quantidade retirada</th><th class="num">Locais atendidos</th><th class="num">Em estoque</th></tr></thead>
          <tbody>${maisRetirados.map((r) => { const p = Store.produto(r.id); return `<tr><td><div class="cell-title">${esc(r.nome)}</div></td><td class="num">${r.vezes}</td><td class="num">${num(r.qtd)} ${esc(r.unidade)}</td><td class="num">${r.locais.size}</td><td class="num">${p ? `${num(p.quantidade)} ${esc(p.unidade)}` : '<span class="muted">excluído</span>'}</td></tr>`; }).join('')}</tbody>
        </table></div>` : empty('Nenhuma saída no período.', true)}
      </div>

      <div class="card card--flush">
        <div class="card__head" style="padding:20px 24px 0"><h3 class="card__title">Itens Abaixo do Mínimo</h3><span class="muted" style="font-size:13px">sugestão de compra = mínimo × 2 − estoque</span></div>
        ${baixos.length ? `<div class="table-wrap" style="margin-top:12px"><table class="table">
          <thead><tr><th>Produto</th><th class="num">Em estoque</th><th class="num">Mínimo</th><th class="num">Sugestão de compra</th><th>Situação</th></tr></thead>
          <tbody>${baixos.map((p) => { const sug = Math.max(0, Store.minimoDe(p) * 2 - p.quantidade); return `<tr><td><div class="cell-title">${esc(p.nome)}</div><div class="cell-sub">${esc(p.codigo || '')}</div></td><td class="num">${num(p.quantidade)} ${esc(p.unidade)}</td><td class="num">${num(Store.minimoDe(p))}</td><td class="num">${num(sug)} ${esc(p.unidade)}</td><td>${badgeEstoque(p)}</td></tr>`; }).join('')}</tbody>
        </table></div>` : empty('Nenhum item abaixo do mínimo.', true)}
      </div>
    `;

    root.querySelector('[data-de]').addEventListener('change', (e) => { filtros.de = e.target.value; App.render(); });
    root.querySelector('[data-ate]').addEventListener('change', (e) => { filtros.ate = e.target.value; App.render(); });
    const l = root.querySelector('[data-limpar]');
    if (l) l.addEventListener('click', () => { filtros.de = ''; filtros.ate = ''; App.render(); });
    root.querySelector('[data-print]').addEventListener('click', () => window.print());
  }

  function ultimosMeses(n) {
    const out = [];
    const d = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  }

  function stat(label, value, hint, danger) {
    return `<div class="card ${danger ? 'stat--danger' : ''}"><p class="stat__label">${esc(label)}</p><div class="stat__value">${value}</div>${hint ? `<div class="stat__hint">${hint}</div>` : ''}</div>`;
  }

  Pages.relatorios = { render };
})();
