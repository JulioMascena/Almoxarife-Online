(function () {
  const { icon, esc, num, data, empty, badgeEstoque, catBadge, openModal, confirm, toast } = UI;

  const filtros = { busca: '', categoria: '', situacao: '' };

  function lerFiltroDaUrl() {
    const q = location.hash.split('?')[1];
    if (!q) return;
    const params = new URLSearchParams(q);
    if (params.get('filtro') === 'baixo') filtros.situacao = 'baixo';
    if (params.get('categoria')) filtros.categoria = params.get('categoria');
    history.replaceState(null, '', location.pathname + '#/produtos');
  }

  function filtrar() {
    const b = filtros.busca.trim().toLowerCase();
    return Store.state.produtos.filter((p) => {
      if (b && !(`${p.nome} ${p.codigo || ''} ${p.descricao || ''}`.toLowerCase().includes(b))) return false;
      if (filtros.categoria === '__sem' && p.categoriaId) return false;
      if (filtros.categoria && filtros.categoria !== '__sem' && p.categoriaId !== filtros.categoria) return false;
      const st = Store.statusEstoque(p);
      if (filtros.situacao === 'baixo' && st === 'ok') return false;
      if (filtros.situacao === 'zerado' && st !== 'zerado') return false;
      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function render(root) {
    lerFiltroDaUrl();
    const s = Store.state;
    root.innerHTML = `
      <div class="toolbar">
        <label class="search">${icon('search')}<input class="input" type="search" placeholder="Buscar produtos..." value="${esc(filtros.busca)}" data-busca aria-label="Buscar produtos"></label>
        <select class="select select-inline" data-cat aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          ${s.categorias.map((c) => `<option value="${c.id}" ${filtros.categoria === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
          <option value="__sem" ${filtros.categoria === '__sem' ? 'selected' : ''}>Sem categoria</option>
        </select>
        <select class="select select-inline" data-sit aria-label="Filtrar por situação">
          <option value="">Qualquer situação</option>
          <option value="baixo" ${filtros.situacao === 'baixo' ? 'selected' : ''}>Estoque baixo</option>
          <option value="zerado" ${filtros.situacao === 'zerado' ? 'selected' : ''}>Sem estoque</option>
        </select>
        <span class="spacer"></span>
        <button class="btn btn-outline" data-lote ${s.produtos.length ? '' : 'disabled'}>${icon('upload', 'i-sm')}Lote CSV</button>
        <button class="btn btn-outline" data-mov ${s.produtos.length ? '' : 'disabled'}>${icon('swap', 'i-sm')}Movimentar</button>
        <button class="btn btn-primary" data-add>${icon('plus', 'i-sm')}Adicionar Produto</button>
      </div>
      <div class="card card--flush" data-lista></div>`;

    const lista = root.querySelector('[data-lista]');
    const desenhar = () => { lista.innerHTML = tabela(filtrar()); ligarLinhas(lista); };
    desenhar();

    root.querySelector('[data-busca]').addEventListener('input', (e) => { filtros.busca = e.target.value; desenhar(); });
    root.querySelector('[data-cat]').addEventListener('change', (e) => { filtros.categoria = e.target.value; desenhar(); });
    root.querySelector('[data-sit]').addEventListener('change', (e) => { filtros.situacao = e.target.value; desenhar(); });
    root.querySelector('[data-add]').addEventListener('click', () => abrirForm());
    root.querySelector('[data-mov]').addEventListener('click', () => abrirMovimento({ tipo: 'saida' }));
    root.querySelector('[data-lote]').addEventListener('click', () => Pages.lote.abrir());
  }

  function tabela(rows) {
    if (!Store.state.produtos.length) {
      return empty('Nenhum produto cadastrado ainda.', false, '<button class="btn btn-primary" data-add-empty>Adicionar Produto</button>');
    }
    if (!rows.length) return empty('Nenhum produto encontrado com esses filtros.');
    const cadastro = new Map();
    Store.state.movimentos.forEach((m) => { if (m.tipo === 'cadastro') cadastro.set(m.produtoId, m.data); });
    return `
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th style="min-width:220px">Produto</th><th>Categoria</th><th class="num">Em estoque</th>
          <th>Cadastrado em</th><th>Situação</th><th class="actions"><span class="sr-only">Ações</span></th>
        </tr></thead>
        <tbody>${rows.map((p) => `
          <tr data-id="${p.id}">
            <td><button class="prod-link" data-act="ver" title="Ver relatório de uso"><span class="cell-title">${esc(p.nome)}</span><span class="cell-sub">${esc(p.codigo || '—')}</span></button></td>
            <td>${catBadge(p.categoriaId)}</td>
            <td class="num"><div><b>${num(p.quantidade)}</b> <span class="muted">${esc(p.unidade)}</span></div><div class="cell-sub">mín. ${num(Store.minimoDe(p))}${p.minimo === null || p.minimo === '' || p.minimo === undefined ? '*' : ''}</div></td>
            <td class="muted nowrap">${cadastro.has(p.id) ? data(cadastro.get(p.id)) : '—'}</td>
            <td>${badgeEstoque(p)}</td>
            <td class="actions">
              <button class="icon-btn in" data-act="entrada" title="Entrada no almoxarifado" aria-label="Entrada de ${esc(p.nome)}">${icon('in', 'i-sm')}</button>
              <button class="icon-btn out" data-act="saida" title="Saída para um local da obra" aria-label="Saída de ${esc(p.nome)}">${icon('out', 'i-sm')}</button>
              <a class="icon-btn" href="#/historico?produto=${p.id}" title="Histórico do produto" aria-label="Histórico de ${esc(p.nome)}">${icon('clock', 'i-sm')}</a>
              <button class="icon-btn" data-act="editar" title="Editar" aria-label="Editar ${esc(p.nome)}">${icon('edit', 'i-sm')}</button>
              <button class="icon-btn del" data-act="excluir" title="Excluir" aria-label="Excluir ${esc(p.nome)}">${icon('trash', 'i-sm')}</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--border);font-size:13px" class="muted">
        <span>${rows.length} produto(s)</span><span>* usa o mínimo padrão das Configurações</span>
      </div>`;
  }

  function ligarLinhas(lista) {
    const e = lista.querySelector('[data-add-empty]');
    if (e) e.addEventListener('click', () => abrirForm());
    lista.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      const p = Store.produto(id);
      const act = btn.dataset.act;
      if (act === 'ver') Pages.produtoDetalhe.abrir(id);
      else if (act === 'editar') abrirForm(p);
      else if (act === 'entrada' || act === 'saida') abrirMovimento({ tipo: act, produtoId: id });
      else if (act === 'excluir') {
        const ok = await confirm({ title: 'Excluir produto?', message: `<b>${esc(p.nome)}</b> sairá do cadastro. O histórico de movimentações continua guardado na aba Histórico.`, confirmText: 'Excluir', danger: true });
        if (ok) { Store.excluirProduto(id); toast('Produto excluído.'); }
      }
    }));
  }

  function abrirForm(p) {
    const s = Store.state;
    const ed = !!p;
    p = p || { nome: '', codigo: '', unidade: 'un', descricao: '', quantidade: 0, minimo: '', categoriaId: '' };
    const unidades = Store.UNIDADES.includes(p.unidade) ? Store.UNIDADES : [p.unidade, ...Store.UNIDADES];
    openModal({
      title: ed ? 'Editar Produto' : 'Adicionar Novo Produto',
      body: `
        <form class="form" id="f-prod">
          <div class="field"><label for="p-nome">Nome</label><input class="input" id="p-nome" name="nome" required value="${esc(p.nome)}" placeholder="Ex.: Cimento CP-II 50kg"></div>
          <div class="form-row">
            <div class="field"><label for="p-cod">Código / SKU</label><input class="input" id="p-cod" name="codigo" value="${esc(p.codigo)}" placeholder="Ex.: ALV-001"></div>
            <div class="field"><label for="p-un">Unidade</label><select class="select" id="p-un" name="unidade">${unidades.map((u) => `<option ${u === p.unidade ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
          </div>
          <div class="field"><label for="p-desc">Descrição</label><textarea class="textarea" id="p-desc" name="descricao" placeholder="Marca, especificação, observações">${esc(p.descricao)}</textarea></div>
          <div class="form-row">
            <div class="field"><label for="p-qtd">Quantidade</label><input class="input" id="p-qtd" name="quantidade" type="number" min="0" step="any" value="${esc(p.quantidade)}"></div>
            <div class="field"><label for="p-min">Estoque mínimo</label><input class="input" id="p-min" name="minimo" type="number" min="0" step="any" value="${esc(p.minimo === null ? '' : p.minimo)}" placeholder="Padrão: ${esc(s.settings.estoqueMinimoPadrao)}"></div>
          </div>
          ${ed ? '' : '<div class="field"><label for="p-resp">Cadastrado por</label><input class="input" id="p-resp" name="responsavel" placeholder="Opcional"></div>'}
          ${ed ? '<p class="hint muted" style="font-size:12px;margin:-8px 0 0">Mudar a quantidade aqui registra um ajuste no histórico. Para entradas e saídas use os botões da tabela.</p>' : ''}
          <div class="field"><label for="p-cat">Categoria</label>
            <select class="select" id="p-cat" name="categoriaId"><option value="">Sem categoria</option>${s.categorias.map((c) => `<option value="${c.id}" ${c.id === p.categoriaId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>
          </div>
        </form>`,
      footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-prod">${ed ? 'Salvar' : 'Criar Produto'}</button>`,
      onMount(el, close) {
        el.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const nome = String(f.get('nome')).trim();
          if (!nome) return;
          const minimo = String(f.get('minimo')).trim();
          Store.salvarProduto({
            id: ed ? p.id : undefined,
            nome, codigo: String(f.get('codigo')).trim(), unidade: f.get('unidade'), descricao: String(f.get('descricao')).trim(),
            quantidade: Number(f.get('quantidade')) || 0,
            minimo: minimo === '' ? null : Number(minimo), categoriaId: f.get('categoriaId') || null,
          }, ed ? {} : { responsavel: String(f.get('responsavel') || '').trim() });
          close();
          toast(ed ? 'Produto atualizado.' : 'Produto criado.');
        });
      },
    });
  }

  /* Entrada (chega no almoxarifado) ou saída (vai para um local da obra) */
  function abrirMovimento(opts) {
    const s = Store.state;
    let tipo = opts.tipo || 'saida';
    const produtos = [...s.produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const locais = [...s.locais].filter((l) => l.tipo !== 'almoxarifado').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
    const funcs = [...s.funcionarios].filter((f) => f.ativo !== false || f.id === opts.funcionarioId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    openModal({
      title: 'Movimentar Estoque',
      body: `
        <form class="form" id="f-mov">
          <div class="segmented" role="tablist" aria-label="Tipo de movimentação">
            <button type="button" data-tipo="entrada">${icon('in', 'i-sm')}Entrada</button>
            <button type="button" data-tipo="saida">${icon('out', 'i-sm')}Saída para a obra</button>
          </div>
          <div class="field"><label for="m-prod">Produto</label>
            <select class="select" id="m-prod" name="produtoId" required>${produtos.map((p) => `<option value="${p.id}" ${p.id === opts.produtoId ? 'selected' : ''}>${esc(p.nome)} (${num(p.quantidade)} ${esc(p.unidade)})</option>`).join('')}</select>
          </div>
          <div class="form-row-3">
            <div class="field"><label for="m-qtd">Quantidade</label><div class="input-suffix"><input class="input" id="m-qtd" name="quantidade" type="number" min="0.001" step="any" required value="1" style="max-width:none"><span data-un></span></div></div>
            <div class="field"><label for="m-data">Data</label><input class="input" id="m-data" name="data" type="date" value="${Store.hoje()}" required></div>
            <div class="field"><label for="m-hora">Hora</label><input class="input" id="m-hora" name="hora" type="time" value="${Store.horaAgora()}" required></div>
          </div>
          <div class="field" data-func><label for="m-func">Retirado por (funcionário)</label>
            ${funcs.length ? `<select class="select" id="m-func" name="funcionarioId"><option value="">Selecione o funcionário…</option>${funcs.map((f) => `<option value="${f.id}" ${f.id === opts.funcionarioId ? 'selected' : ''}>${esc(f.nome)}${f.funcao ? ' · ' + esc(f.funcao) : ''}</option>`).join('')}</select>`
              : '<div class="preview-box">Nenhum funcionário cadastrado. <a href="#/funcionarios" data-close style="color:var(--primary-text);text-decoration:underline">Cadastrar funcionários</a> ou preencha o nome abaixo.</div>'}
          </div>
          <div class="field" data-destino><label for="m-loc">Destino (local da obra)</label>
            <select class="select" id="m-loc" name="localId">${locais.length ? '<option value="">Selecione o local…</option>' + locais.map((l) => `<option value="${l.id}" ${l.id === opts.localId ? 'selected' : ''}>${esc(l.nome)}${l.pavimento ? ' · ' + esc(pav(l.pavimento)) : ''}</option>`).join('') : '<option value="">Cadastre locais em "Locais da Obra"</option>'}</select>
          </div>
          <div class="field" data-resp><label for="m-resp" data-resp-label>Recebido por</label><input class="input" id="m-resp" name="responsavel" placeholder="Nome de quem recebeu"></div>
          <div class="field"><label for="m-obs">Observação</label><input class="input" id="m-obs" name="obs" placeholder="Opcional"></div>
          <div class="preview-box" data-resumo></div>
        </form>`,
      footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-mov">Registrar</button>`,
      onMount(el, close) {
        const form = el.querySelector('form');
        const atualizar = () => {
          el.querySelectorAll('[data-tipo]').forEach((b) => b.classList.toggle('is-active', b.dataset.tipo === tipo));
          el.querySelector('[data-destino]').style.display = tipo === 'saida' ? '' : 'none';
          el.querySelector('[data-func]').style.display = tipo === 'saida' ? '' : 'none';
          el.querySelector('[data-resp]').style.display = tipo === 'saida' && funcs.length ? 'none' : '';
          el.querySelector('[data-resp-label]').textContent = tipo === 'saida' ? 'Retirado por' : 'Recebido por';
          el.querySelector('#m-resp').placeholder = tipo === 'saida' ? 'Nome de quem retirou' : 'Nome de quem recebeu';
          const p = Store.produto(form.produtoId.value);
          if (!p) return;
          el.querySelector('[data-un]').textContent = p.unidade;
          const q = Number(form.quantidade.value) || 0;
          const depois = tipo === 'saida' ? p.quantidade - q : p.quantidade + q;
          el.querySelector('[data-resumo]').innerHTML = `Estoque: <b>${num(p.quantidade)}</b> → <b class="${depois < 0 ? 'text-danger' : ''}">${num(depois)}</b> ${esc(p.unidade)}`;
        };
        el.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { tipo = b.dataset.tipo; atualizar(); }));
        form.addEventListener('input', atualizar);
        form.addEventListener('change', atualizar);
        atualizar();
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const f = new FormData(form);
          if (tipo === 'saida' && funcs.length && !f.get('funcionarioId')) { toast('Escolha o funcionário que está retirando o material.', { error: true }); form.funcionarioId.focus(); return; }
          if (tipo === 'saida' && !f.get('localId')) { toast('Escolha o local da obra que vai receber o material.', { error: true }); form.localId.focus(); return; }
          try {
            Store.registrarMov({ tipo, produtoId: f.get('produtoId'), quantidade: Number(f.get('quantidade')), localId: tipo === 'saida' ? f.get('localId') : null, funcionarioId: tipo === 'saida' ? f.get('funcionarioId') || null : null, data: f.get('data'), hora: f.get('hora'), responsavel: String(f.get('responsavel')).trim(), obs: String(f.get('obs')).trim() });
            close();
            toast(tipo === 'saida' ? 'Saída registrada.' : 'Entrada registrada.');
          } catch (err) { toast(err.message, { error: true }); }
        });
      },
    });
  }

  function pav(v) {
    return /^\d+$/.test(String(v)) ? `${v}º andar` : v;
  }

  Pages.produtos = { render, abrirMovimento, abrirForm, pav };
})();
