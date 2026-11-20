/* Histórico geral: tudo o que aconteceu com o estoque, dia a dia.
   Cadastro de produto, entradas, saídas para a obra, ajustes e exclusões. */
(function () {
  const { icon, esc, num, data, hora, empty, confirm, toast } = UI;
  const f = { visao: 'linha', busca: '', tipo: '', produto: '', local: '', funcionario: '', de: '', ate: '', limite: 100 };

  function lerUrl() {
    const q = location.hash.split('?')[1];
    if (!q) return;
    const p = new URLSearchParams(q);
    if (p.get('produto')) { f.produto = p.get('produto'); f.visao = 'linha'; f.tipo = ''; f.local = ''; f.funcionario = ''; }
    if (p.get('local')) { f.local = p.get('local'); f.visao = 'linha'; f.produto = ''; f.tipo = ''; f.funcionario = ''; }
    if (p.get('funcionario')) { f.funcionario = p.get('funcionario'); f.visao = 'linha'; f.produto = ''; f.local = ''; f.tipo = ''; }
    history.replaceState(null, '', location.pathname + '#/historico');
  }

  function filtrar() {
    const b = f.busca.trim().toLowerCase();
    return Store.state.movimentos.filter((m) => {
      if (f.tipo && m.tipo !== f.tipo) return false;
      if (f.produto && m.produtoId !== f.produto) return false;
      if (f.local && m.localId !== f.local) return false;
      if (f.funcionario && m.funcionarioId !== f.funcionario) return false;
      if (!Store.noPeriodo(m, f.de, f.ate)) return false;
      if (b && !`${m.produtoNome} ${m.responsavel} ${m.obs} ${Store.nomeLocal(m)}`.toLowerCase().includes(b)) return false;
      return true;
    }).sort(Store.compararMov);
  }

  /* Produtos que aparecem no histórico, inclusive os já excluídos */
  function produtosDoHistorico() {
    const map = new Map();
    Store.state.movimentos.forEach((m) => { if (!map.has(m.produtoId)) map.set(m.produtoId, m.produtoNome); });
    Store.state.produtos.forEach((p) => map.set(p.id, p.nome));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }

  function render(root) {
    lerUrl();
    const s = Store.state;
    const lista = filtrar();
    const conta = (t) => lista.filter((m) => m.tipo === t).length;
    const temFiltro = f.busca || f.tipo || f.produto || f.local || f.funcionario || f.de || f.ate;
    const funcs = [...s.funcionarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const locais = [...s.locais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));

    root.innerHTML = `
      <div class="toolbar">
        <div class="segmented" role="tablist" aria-label="Forma de exibir">
          <button data-visao="linha" class="${f.visao === 'linha' ? 'is-active' : ''}">${icon('clock', 'i-sm')}Linha do tempo</button>
          <button data-visao="produto" class="${f.visao === 'produto' ? 'is-active' : ''}">${icon('box', 'i-sm')}Resumo por produto</button>
        </div>
        <span class="spacer"></span>
        <button class="btn btn-outline" data-lote ${s.produtos.length ? '' : 'disabled'}>${icon('upload', 'i-sm')}Lançar em lote</button>
        <button class="btn btn-outline" data-csv>${icon('download', 'i-sm')}Exportar CSV</button>
      </div>

      <div class="toolbar">
        <label class="search">${icon('search')}<input class="input" type="search" placeholder="Buscar produto, pessoa, observação..." value="${esc(f.busca)}" data-busca aria-label="Buscar no histórico"></label>
        ${f.visao === 'linha' ? `
        <select class="select select-inline" data-f="tipo" aria-label="Tipo">
          <option value="">Todos os tipos</option>
          ${Object.entries(Store.TIPOS_MOV).map(([id, t]) => `<option value="${id}" ${f.tipo === id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}
        </select>
        <select class="select select-inline" data-f="produto" aria-label="Produto">
          <option value="">Todos os produtos</option>
          ${produtosDoHistorico().map(([id, nome]) => `<option value="${id}" ${f.produto === id ? 'selected' : ''}>${esc(nome)}${Store.produto(id) ? '' : ' (excluído)'}</option>`).join('')}
        </select>
        <select class="select select-inline" data-f="local" aria-label="Local">
          <option value="">Todos os locais</option>
          ${locais.map((l) => `<option value="${l.id}" ${f.local === l.id ? 'selected' : ''}>${esc(l.nome)}</option>`).join('')}
        </select>
        <select class="select select-inline" data-f="funcionario" aria-label="Funcionário">
          <option value="">Todos os funcionários</option>
          ${funcs.map((x) => `<option value="${x.id}" ${f.funcionario === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}
        </select>` : ''}
        <input class="input" type="date" value="${esc(f.de)}" data-f="de" aria-label="De" title="De" style="width:auto">
        <input class="input" type="date" value="${esc(f.ate)}" data-f="ate" aria-label="Até" title="Até" style="width:auto">
        ${temFiltro ? '<button class="btn btn-ghost btn-sm" data-limpar>Limpar filtros</button>' : ''}
      </div>

      ${f.visao === 'linha' ? `
        ${f.produto ? resumoDoProduto(f.produto) : ''}
        ${f.funcionario && Store.funcionario(f.funcionario) ? `<div class="card" style="border-left:4px solid var(--primary);display:flex;align-items:center;gap:12px;padding:16px 20px">${icon('user')}<div><div class="cell-title">${esc(Store.funcionario(f.funcionario).nome)}</div><div class="cell-sub">${esc(Store.funcionario(f.funcionario).funcao || '')}</div></div></div>` : ''}
        <div class="grid grid-4">
          ${stat('Cadastros', conta('cadastro'), 'produtos novos', 'cad')}
          ${stat('Entradas', conta('entrada'), 'material que chegou', 'in')}
          ${stat('Saídas', conta('saida'), 'material para a obra', 'out')}
          ${stat('Ajustes e exclusões', conta('ajuste') + conta('exclusao'), 'correções de estoque', 'adj')}
        </div>
        ${linhaDoTempo(lista)}
      ` : porProduto()}
    `;

    root.querySelectorAll('[data-visao]').forEach((b) => b.addEventListener('click', () => { f.visao = b.dataset.visao; App.render(); }));
    root.querySelectorAll('[data-f]').forEach((el) => el.addEventListener('change', () => { f[el.dataset.f] = el.value; f.limite = 100; App.render(); }));
    let t;
    root.querySelector('[data-busca]').addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        f.busca = e.target.value; f.limite = 100; App.render();
        const inp = document.querySelector('[data-busca]');
        if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      }, 250);
    });
    const lim = root.querySelector('[data-limpar]');
    if (lim) lim.addEventListener('click', () => { Object.assign(f, { busca: '', tipo: '', produto: '', local: '', funcionario: '', de: '', ate: '', limite: 100 }); App.render(); });
    const mais = root.querySelector('[data-mais]');
    if (mais) mais.addEventListener('click', () => { f.limite += 200; App.render(); });
    root.querySelector('[data-lote]').addEventListener('click', () => Pages.lote.abrir());
    root.querySelector('[data-csv]').addEventListener('click', () => exportar(f.visao === 'linha' ? lista : null));
    root.querySelectorAll('[data-desfazer]').forEach((b) => b.addEventListener('click', () => desfazer(b.dataset.desfazer)));
  }

  function stat(label, valor, hint, cls) {
    return `<div class="card" style="display:flex;gap:14px;align-items:center">
      <div class="list-item__icon ${cls}" style="width:40px;height:40px">${icon(Store.TIPOS_MOV[{ cad: 'cadastro', in: 'entrada', out: 'saida', adj: 'ajuste' }[cls]].icon)}</div>
      <div><p class="stat__label">${esc(label)}</p><div class="stat__value" style="font-size:22px">${num(valor, 0)}</div><div class="stat__hint">${esc(hint)}</div></div>
    </div>`;
  }

  function resumoDoProduto(id) {
    const p = Store.produto(id);
    const r = Store.resumoProduto(id);
    const nome = p ? p.nome : (Store.state.movimentos.find((m) => m.produtoId === id) || {}).produtoNome || 'Produto';
    const un = p ? p.unidade : (Store.state.movimentos.find((m) => m.produtoId === id) || {}).unidade || '';
    const box = (label, valor, sub) => `<div><p class="stat__label">${label}</p><div class="stat__value" style="font-size:20px">${valor}</div>${sub ? `<div class="stat__hint">${sub}</div>` : ''}</div>`;
    return `
      <div class="card" style="border-left:4px solid var(--primary)">
        <div class="card__head"><h3 class="card__title">${esc(nome)}${p ? '' : ' <span class="badge badge-danger">excluído</span>'}</h3>${p ? `<span class="muted" style="font-size:13px">${esc(p.codigo || '')}</span>` : ''}</div>
        <div class="grid grid-4" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px">
          ${box('Cadastrado em', r.cadastradoEm ? data(r.cadastradoEm) : '—', r.cadastradoEm ? `com ${num(r.inicial)} ${esc(un)}` : '')}
          ${box('Adicionado', `<span class="text-ok">+${num(r.entradas)}</span> <small class="muted" style="font-size:13px">${esc(un)}</small>`, `${r.qtdEntradas} ${r.qtdEntradas === 1 ? 'entrada' : 'entradas'}`)}
          ${box('Retirado', `<span class="text-warn">−${num(r.saidas)}</span> <small class="muted" style="font-size:13px">${esc(un)}</small>`, `${r.qtdSaidas} ${r.qtdSaidas === 1 ? 'saída' : 'saídas'}`)}
          ${r.ajustes ? box('Ajustes', `${r.ajustes > 0 ? '+' : '−'}${num(Math.abs(r.ajustes))}`, esc(un)) : ''}
          ${box('Estoque atual', p ? `${num(p.quantidade)} <small class="muted" style="font-size:13px">${esc(un)}</small>` : '—', p ? UI.badgeEstoque(p) : '')}
        </div>
      </div>`;
  }

  function linhaDoTempo(lista) {
    if (!Store.state.movimentos.length) return `<div class="card">${empty('Nada registrado ainda. Cadastre um produto ou registre uma entrada/saída.')}</div>`;
    if (!lista.length) return `<div class="card">${empty('Nenhum registro com esses filtros.')}</div>`;
    const visiveis = lista.slice(0, f.limite);
    const dias = [];
    visiveis.forEach((m) => {
      let d = dias[dias.length - 1];
      if (!d || d.data !== m.data) { d = { data: m.data, itens: [] }; dias.push(d); }
      d.itens.push(m);
    });
    const totalDia = new Map();
    lista.forEach((m) => totalDia.set(m.data, (totalDia.get(m.data) || 0) + 1));

    return `
      <div class="card card--flush">
        <div class="table-wrap"><table class="table hist-table">
          <thead><tr><th>Hora</th><th>Tipo</th><th style="min-width:200px">Produto</th><th class="num">Quantidade</th><th>Local</th><th>Responsável</th><th>Observação</th><th class="actions"><span class="sr-only">Ações</span></th></tr></thead>
          ${dias.map((d) => `
          <tbody>
            <tr class="hist-day"><td colspan="8">${esc(diaSemana(d.data))}, ${data(d.data)} <span>${totalDia.get(d.data)} ${totalDia.get(d.data) === 1 ? 'registro' : 'registros'}</span></td></tr>
            ${d.itens.map(linha).join('')}
          </tbody>`).join('')}
        </table></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--border);font-size:13px" class="muted">
          <span>Mostrando ${visiveis.length} de ${lista.length} registros</span>
          ${lista.length > visiveis.length ? '<button class="btn btn-outline btn-sm" data-mais>Mostrar mais</button>' : ''}
        </div>
      </div>`;
  }

  function linha(m) {
    const t = Store.TIPOS_MOV[m.tipo] || Store.TIPOS_MOV.ajuste;
    const q = Math.abs(m.quantidade);
    const sinal = m.tipo === 'saida' || m.tipo === 'exclusao' || (m.tipo === 'ajuste' && m.quantidade < 0) ? '−' : '+';
    const cor = { cadastro: 'text-ok', entrada: 'text-ok', saida: 'text-warn', exclusao: 'text-danger' }[m.tipo] || '';
    const qtdTxt = m.tipo === 'exclusao' ? `${num(q)} ${esc(m.unidade)} <div class="cell-sub">em estoque ao excluir</div>`
      : m.tipo === 'cadastro' ? `${num(q)} ${esc(m.unidade)} <div class="cell-sub">estoque inicial</div>`
      : `<b class="${cor}">${sinal}${num(q)}</b> ${esc(m.unidade)}`;
    return `
      <tr>
        <td class="muted nowrap">${Store.horaDe(m)}</td>
        <td><span class="badge ${t.badge}">${esc(t.nome)}</span></td>
        <td>${Store.produto(m.produtoId) ? `<a class="cell-title hist-link" href="#/historico?produto=${m.produtoId}">${esc(m.produtoNome)}</a>` : `<span class="cell-title">${esc(m.produtoNome)}</span>`}</td>
        <td class="num nowrap">${qtdTxt}</td>
        <td>${m.tipo === 'saida' ? esc(Store.nomeLocal(m) || '—') : '<span class="muted">Almoxarifado</span>'}</td>
        <td>${m.funcionarioId && Store.funcionario(m.funcionarioId) ? `<a class="hist-link" href="#/historico?funcionario=${m.funcionarioId}">${esc(m.responsavel)}</a>` : esc(m.responsavel || '—')}</td>
        <td class="muted" style="max-width:220px">${esc(m.obs || '')}</td>
        <td class="actions">${Store.podeDesfazer(m) ? `<button class="icon-btn del" data-desfazer="${m.id}" title="Desfazer este lançamento" aria-label="Desfazer lançamento">${icon('trash', 'i-sm')}</button>` : ''}</td>
      </tr>`;
  }

  function porProduto() {
    const ids = produtosDoHistorico();
    const b = f.busca.trim().toLowerCase();
    const linhas = ids.filter(([, nome]) => !b || nome.toLowerCase().includes(b)).map(([id, nome]) => {
      const r = resumoPeriodo(id);
      return { id, nome, p: Store.produto(id), r };
    }).filter((x) => x.r.total > 0 || (!f.de && !f.ate));
    if (!linhas.length) return `<div class="card">${empty('Nenhum produto no histórico com esses filtros.')}</div>`;
    const temAjuste = linhas.some((x) => x.r.ajustes);
    return `
      <div class="card card--flush">
        <div class="table-wrap"><table class="table">
          <thead><tr><th style="min-width:200px">Produto</th><th>Cadastrado em</th><th class="num">Estoque inicial</th><th class="num">Adicionado</th><th class="num">Retirado</th>${temAjuste ? '<th class="num">Ajustes</th>' : ''}<th class="num">Estoque atual</th><th>Última mov.</th></tr></thead>
          <tbody>${linhas.map(({ id, nome, p, r }) => `
            <tr>
              <td><a class="cell-title hist-link" href="#/historico?produto=${id}">${esc(nome)}</a>${p ? `<div class="cell-sub">${esc(p.codigo || '')}</div>` : '<div class="cell-sub text-danger">excluído</div>'}</td>
              <td class="nowrap">${r.cadastradoEm ? data(r.cadastradoEm) : '—'}</td>
              <td class="num">${num(r.inicial)} <span class="muted">${esc(r.un)}</span></td>
              <td class="num"><b class="text-ok">+${num(r.entradas)}</b><div class="cell-sub">${r.qtdEntradas} ${r.qtdEntradas === 1 ? 'entrada' : 'entradas'}</div></td>
              <td class="num"><b class="text-warn">−${num(r.saidas)}</b><div class="cell-sub">${r.qtdSaidas} ${r.qtdSaidas === 1 ? 'saída' : 'saídas'}</div></td>
              ${temAjuste ? `<td class="num">${r.ajustes ? `${r.ajustes > 0 ? '+' : '−'}${num(Math.abs(r.ajustes))}` : '<span class="muted">—</span>'}</td>` : ''}
              <td class="num">${p ? `<b>${num(p.quantidade)}</b> <span class="muted">${esc(p.unidade)}</span>` : '<span class="muted">—</span>'}</td>
              <td class="muted nowrap">${r.ultima ? data(r.ultima) : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
        <div style="padding:12px 16px;border-top:1px solid var(--border);font-size:13px" class="muted">${linhas.length} produto(s)${f.de || f.ate ? ' · entradas, saídas e ajustes contam só o período escolhido' : ''}</div>
      </div>`;
  }

  /* Igual ao resumoProduto, mas respeitando o período escolhido */
  function resumoPeriodo(id) {
    const r = { cadastradoEm: null, inicial: 0, entradas: 0, qtdEntradas: 0, saidas: 0, qtdSaidas: 0, ajustes: 0, ultima: null, un: '', total: 0 };
    Store.state.movimentos.forEach((m) => {
      if (m.produtoId !== id) return;
      r.un = r.un || m.unidade;
      if (m.tipo === 'cadastro') { r.cadastradoEm = m.data; r.inicial = m.quantidade; }
      if (!Store.noPeriodo(m, f.de, f.ate)) return;
      r.total += 1;
      if (!r.ultima || m.data > r.ultima) r.ultima = m.data;
      if (m.tipo === 'entrada') { r.entradas += m.quantidade; r.qtdEntradas += 1; }
      else if (m.tipo === 'saida') { r.saidas += m.quantidade; r.qtdSaidas += 1; }
      else if (m.tipo === 'ajuste') r.ajustes += m.quantidade;
    });
    const p = Store.produto(id);
    if (p) r.un = p.unidade;
    return r;
  }

  async function desfazer(id) {
    const m = Store.state.movimentos.find((x) => x.id === id);
    if (!m) return;
    const t = Store.TIPOS_MOV[m.tipo];
    const efeito = m.tipo === 'saida' ? `${num(m.quantidade)} ${esc(m.unidade)} voltam para o estoque` : `${num(Math.abs(m.quantidade))} ${esc(m.unidade)} ${m.tipo === 'ajuste' && m.quantidade < 0 ? 'voltam para' : 'saem do'} estoque`;
    const ok = await confirm({ title: `Desfazer ${t.nome.toLowerCase()}?`, message: `${esc(t.nome)} de <b>${esc(m.produtoNome)}</b> em ${data(m.data)} será apagada do histórico e ${efeito}. Use isso só para corrigir um lançamento errado.`, confirmText: 'Desfazer', danger: true });
    if (!ok) return;
    try { Store.excluirMov(id); toast('Lançamento desfeito.'); } catch (e) { toast(e.message, { error: true }); }
  }

  function exportar(lista) {
    const csv = Pages.configuracoes.toCSV;
    if (lista) {
      const linhas = [['data', 'hora', 'tipo', 'produto', 'quantidade', 'unidade', 'local', 'responsavel', 'observacao']];
      lista.forEach((m) => {
        const q = m.tipo === 'saida' || m.tipo === 'exclusao' ? -Math.abs(m.quantidade) : m.quantidade;
        linhas.push([data(m.data), Store.horaDe(m), Store.TIPOS_MOV[m.tipo].nome, m.produtoNome, String(q).replace('.', ','), m.unidade, m.tipo === 'saida' ? Store.nomeLocal(m) : 'Almoxarifado', m.responsavel, m.obs]);
      });
      UI.download(`historico-${Store.hoje()}.csv`, '﻿' + csv(linhas), 'text/csv;charset=utf-8');
    } else {
      const linhas = [['produto', 'codigo', 'cadastrado_em', 'estoque_inicial', 'adicionado', 'entradas', 'retirado', 'saidas', 'ajustes', 'estoque_atual', 'unidade']];
      produtosDoHistorico().forEach(([id, nome]) => {
        const r = resumoPeriodo(id);
        const p = Store.produto(id);
        const br = (v) => String(v).replace('.', ',');
        linhas.push([nome, p ? p.codigo : '', r.cadastradoEm ? data(r.cadastradoEm) : '', br(r.inicial), br(r.entradas), r.qtdEntradas, br(r.saidas), r.qtdSaidas, br(r.ajustes), p ? br(p.quantidade) : 'excluído', r.un]);
      });
      UI.download(`resumo-por-produto-${Store.hoje()}.csv`, '﻿' + csv(linhas), 'text/csv;charset=utf-8');
    }
  }

  function diaSemana(iso) {
    const t = new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  Pages.historico = { render };
})();
