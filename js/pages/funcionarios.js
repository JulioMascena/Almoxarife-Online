/* Funcionários da obra: quem retira material e em qual local trabalha. */
(function () {
  const { icon, esc, num, data, empty, openModal, confirm, toast, movItem } = UI;
  const filtros = { busca: '', funcao: '', status: 'ativos' };

  const iniciais = (nome) => nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  function filtrar() {
    const b = filtros.busca.trim().toLowerCase();
    return Store.state.funcionarios.filter((f) => {
      if (filtros.status === 'ativos' && f.ativo === false) return false;
      if (filtros.status === 'inativos' && f.ativo !== false) return false;
      if (filtros.funcao && f.funcao !== filtros.funcao) return false;
      if (b && !`${f.nome} ${f.funcao || ''}`.toLowerCase().includes(b)) return false;
      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function render(root) {
    const s = Store.state;
    const funcoes = [...new Set(s.funcionarios.map((f) => f.funcao).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    root.innerHTML = `
      <div class="toolbar">
        <label class="search">${icon('search')}<input class="input" type="search" placeholder="Buscar funcionário ou função..." value="${esc(filtros.busca)}" data-busca aria-label="Buscar funcionários"></label>
        <select class="select select-inline" data-funcao aria-label="Filtrar por função">
          <option value="">Todas as funções</option>
          ${funcoes.map((fn) => `<option ${filtros.funcao === fn ? 'selected' : ''}>${esc(fn)}</option>`).join('')}
        </select>
        <select class="select select-inline" data-status aria-label="Filtrar por situação">
          <option value="ativos" ${filtros.status === 'ativos' ? 'selected' : ''}>Ativos</option>
          <option value="inativos" ${filtros.status === 'inativos' ? 'selected' : ''}>Inativos</option>
          <option value="" ${filtros.status === '' ? 'selected' : ''}>Todos</option>
        </select>
        <span class="spacer"></span>
        <button class="btn btn-primary" data-add>${icon('plus', 'i-sm')}Adicionar Funcionário</button>
      </div>
      <div class="card card--flush" data-lista></div>`;

    const lista = root.querySelector('[data-lista]');
    const desenhar = () => { lista.innerHTML = tabela(filtrar()); ligar(lista); };
    desenhar();
    root.querySelector('[data-busca]').addEventListener('input', (e) => { filtros.busca = e.target.value; desenhar(); });
    root.querySelector('[data-funcao]').addEventListener('change', (e) => { filtros.funcao = e.target.value; desenhar(); });
    root.querySelector('[data-status]').addEventListener('change', (e) => { filtros.status = e.target.value; desenhar(); });
    root.querySelector('[data-add]').addEventListener('click', () => abrirForm());
  }

  function tabela(rows) {
    if (!Store.state.funcionarios.length) {
      return empty('Nenhum funcionário cadastrado. Cadastre a equipe para registrar quem retira cada material.', false, '<button class="btn btn-primary" data-add-empty>Adicionar Funcionário</button>');
    }
    if (!rows.length) return empty('Nenhum funcionário encontrado com esses filtros.');
    const saidas = Store.saidasPorFuncionario();
    return `
      <div class="table-wrap"><table class="table">
        <thead><tr><th style="min-width:220px">Funcionário</th><th>Último local atendido</th><th class="num">Retiradas</th><th>Situação</th><th class="actions"><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${rows.map((f) => {
          const r = saidas.get(f.id);
          const l = r ? Store.local(r.ultimoLocalId) : null;
          return `
          <tr data-id="${f.id}">
            <td><button class="func-cell" data-act="ver">
              <span class="avatar">${esc(iniciais(f.nome))}</span>
              <span><span class="cell-title">${esc(f.nome)}</span><span class="cell-sub" style="display:block">${esc(f.funcao || 'Sem função')}</span></span>
            </button></td>
            <td>${l ? `<span class="badge badge-primary">${icon('pin', 'i-sm')}${esc(l.nome)}</span>` : '<span class="muted">—</span>'}</td>
            <td class="num">${r ? `<b>${r.saidas}</b><div class="cell-sub">última ${data(r.ultima)}</div>` : '<span class="muted">0</span>'}</td>
            <td>${f.ativo === false ? '<span class="badge">Inativo</span>' : '<span class="badge badge-ok">Ativo</span>'}</td>
            <td class="actions">
              <a class="icon-btn" href="#/historico?funcionario=${f.id}" title="Histórico de retiradas" aria-label="Histórico de ${esc(f.nome)}">${icon('clock', 'i-sm')}</a>
              <button class="icon-btn" data-act="editar" title="Editar" aria-label="Editar ${esc(f.nome)}">${icon('edit', 'i-sm')}</button>
              <button class="icon-btn del" data-act="excluir" title="Excluir" aria-label="Excluir ${esc(f.nome)}">${icon('trash', 'i-sm')}</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);font-size:13px" class="muted">${rows.length} funcionário(s)</div>`;
  }

  function ligar(lista) {
    const e = lista.querySelector('[data-add-empty]');
    if (e) e.addEventListener('click', () => abrirForm());
    lista.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      const f = Store.funcionario(b.closest('tr').dataset.id);
      if (b.dataset.act === 'ver') return abrirDetalhe(f.id);
      if (b.dataset.act === 'editar') return abrirForm(f);
      const n = Store.state.movimentos.filter((m) => m.funcionarioId === f.id).length;
      const ok = await confirm({
        title: 'Excluir funcionário?',
        message: `<b>${esc(f.nome)}</b> sairá do cadastro.${n ? ` As ${n} retiradas dele continuam no Histórico com o nome registrado.` : ''} Se ele só saiu da obra, prefira marcar como <b>inativo</b> na edição.`,
        confirmText: 'Excluir', danger: true,
      });
      if (ok) { Store.excluirFuncionario(f.id); toast('Funcionário excluído.'); }
    }));
  }

  function abrirDetalhe(id) {
    const f = Store.funcionario(id);
    const movs = Store.state.movimentos.filter((m) => m.funcionarioId === id && m.tipo === 'saida');
    const porProduto = new Map();
    movs.forEach((m) => {
      const cur = porProduto.get(m.produtoId) || { nome: m.produtoNome, unidade: m.unidade, qtd: 0, vezes: 0 };
      cur.qtd += m.quantidade; cur.vezes += 1;
      porProduto.set(m.produtoId, cur);
    });
    const linhas = [...porProduto.values()].sort((a, b) => b.vezes - a.vezes);
    const locais = new Set(movs.map((m) => m.localId).filter(Boolean));

    /* Onde trabalhou: cada local com o período e o serviço (categoria do material que levou para lá) */
    const porLocal = new Map();
    movs.forEach((mv) => {
      const chave = mv.localId || (mv.localNome ? 'nome:' + mv.localNome : 'sem');
      const cur = porLocal.get(chave) || { nome: Store.nomeLocal(mv) || 'Sem local', localId: mv.localId, primeira: mv.data, ultima: mv.data, vezes: 0, servicos: new Map(), materiais: new Map() };
      if (mv.data < cur.primeira) cur.primeira = mv.data;
      if (mv.data > cur.ultima) cur.ultima = mv.data;
      cur.vezes += 1;
      const cat = Store.categoria((Store.produto(mv.produtoId) || {}).categoriaId);
      const sNome = cat ? cat.nome : 'Outros';
      const s = cur.servicos.get(sNome) || { cor: cat ? cat.cor : '#9ca3af', vezes: 0 };
      s.vezes += 1;
      cur.servicos.set(sNome, s);
      const mat = cur.materiais.get(mv.produtoId) || { nome: mv.produtoNome, unidade: mv.unidade, qtd: 0 };
      mat.qtd += mv.quantidade;
      cur.materiais.set(mv.produtoId, mat);
      porLocal.set(chave, cur);
    });
    const ondeTrabalhou = [...porLocal.values()].sort((a, b) => (a.ultima < b.ultima ? 1 : a.ultima > b.ultima ? -1 : 0));
    const periodo = (r) => (r.primeira === r.ultima ? data(r.primeira) : `${data(r.primeira)} a ${data(r.ultima)}`);
    const secaoLocais = ondeTrabalhou.length ? `
        <h4 style="font-size:15px;margin-bottom:8px">Onde trabalhou e em qual serviço</h4>
        <div class="card card--flush" style="margin-bottom:20px"><div class="table-wrap"><table class="table">
          <thead><tr><th>Local</th><th>Período</th><th>Serviço</th><th style="min-width:200px">Material levado</th></tr></thead>
          <tbody>${ondeTrabalhou.map((r) => `
            <tr>
              <td><div class="cell-title">${r.localId ? `<a class="hist-link" href="#/historico?funcionario=${f.id}" data-close>${esc(r.nome)}</a>` : esc(r.nome)}</div><div class="cell-sub">${r.vezes} retirada(s)</div></td>
              <td class="nowrap">${periodo(r)}</td>
              <td><div style="display:flex;flex-wrap:wrap;gap:4px">${[...r.servicos.entries()].sort((a, b) => b[1].vezes - a[1].vezes).map(([nome, s]) => `<span class="badge"><span class="dot" style="background:${esc(s.cor)}"></span>${esc(nome)}</span>`).join('')}</div></td>
              <td class="muted" style="font-size:13px">${[...r.materiais.values()].sort((a, b) => b.qtd - a.qtd).map((x) => `${esc(x.nome)} <b style="color:var(--text)">${num(x.qtd)} ${esc(x.unidade)}</b>`).join(' · ')}</td>
            </tr>`).join('')}
          </tbody>
        </table></div></div>` : '';

    const m = openModal({
      title: f.nome,
      wide: true,
      body: `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          <span class="badge badge-primary">${esc(f.funcao || 'Sem função')}</span>
          ${f.ativo === false ? '<span class="badge">Inativo</span>' : '<span class="badge badge-ok">Ativo</span>'}
        </div>
        ${f.obs ? `<p class="muted" style="font-size:14px;margin:0 0 16px">${esc(f.obs)}</p>` : ''}
        <div class="grid grid-3" style="gap:12px;margin-bottom:20px">
          <div class="card" style="padding:16px"><p class="stat__label">Retiradas</p><div class="stat__value" style="font-size:20px">${movs.length}</div></div>
          <div class="card" style="padding:16px"><p class="stat__label">Produtos diferentes</p><div class="stat__value" style="font-size:20px">${linhas.length}</div></div>
          <div class="card" style="padding:16px"><p class="stat__label">Locais atendidos</p><div class="stat__value" style="font-size:20px">${locais.size}</div></div>
        </div>
        ${secaoLocais}
        <h4 style="font-size:15px;margin-bottom:8px">Material retirado (total)</h4>
        ${linhas.length ? `<div class="card card--flush" style="margin-bottom:20px"><div class="table-wrap"><table class="table">
          <thead><tr><th>Produto</th><th class="num">Total retirado</th><th class="num">Retiradas</th></tr></thead>
          <tbody>${linhas.map((r) => `<tr><td><div class="cell-title">${esc(r.nome)}</div></td><td class="num">${num(r.qtd)} ${esc(r.unidade)}</td><td class="num">${r.vezes}</td></tr>`).join('')}</tbody>
        </table></div></div>` : empty('Nenhuma retirada registrada para este funcionário.', true)}
        ${movs.length ? `<h4 style="font-size:15px;margin-bottom:4px">Últimas retiradas <a class="btn btn-ghost btn-sm" href="#/historico?funcionario=${f.id}" data-close>ver tudo</a></h4><div class="list">${movs.slice(0, 10).map(movItem).join('')}</div>` : ''}`,
      footer: `
        <button class="btn btn-outline" data-edit style="margin-right:auto">${icon('edit', 'i-sm')}Editar</button>
        <button class="btn btn-primary" data-send ${Store.state.produtos.length && f.ativo !== false ? '' : 'disabled'}>${icon('out', 'i-sm')}Registrar retirada</button>`,
    });
    m.el.querySelector('.modal').classList.add('modal--xl');
    m.el.querySelector('[data-edit]').addEventListener('click', () => { m.close(); abrirForm(f); });
    m.el.querySelector('[data-send]').addEventListener('click', () => { m.close(); Pages.produtos.abrirMovimento({ tipo: 'saida', funcionarioId: f.id }); });
  }

  function abrirForm(f) {
    const ed = !!f;
    f = f || { nome: '', funcao: '', ativo: true, obs: '' };
    openModal({
      title: ed ? 'Editar Funcionário' : 'Adicionar Funcionário',
      body: `
        <form class="form" id="f-func">
          <div class="field"><label for="fu-nome">Nome completo</label><input class="input" id="fu-nome" name="nome" required value="${esc(f.nome)}" placeholder="Ex.: João da Silva"></div>
          <div class="field"><label for="fu-funcao">Função</label><input class="input" id="fu-funcao" name="funcao" value="${esc(f.funcao)}" placeholder="Ex.: Pedreiro" list="funcoes"></div>
          <datalist id="funcoes">${Store.FUNCOES.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
          <label class="toggle" style="border-top:0;padding:0"><span>Funcionário ativo na obra</span><span class="switch"><input type="checkbox" name="ativo" ${f.ativo !== false ? 'checked' : ''}><span></span></span></label>
          <div class="field"><label for="fu-obs">Observações</label><textarea class="textarea" id="fu-obs" name="obs" placeholder="Opcional">${esc(f.obs)}</textarea></div>
        </form>`,
      footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-func">${ed ? 'Salvar' : 'Cadastrar'}</button>`,
      onMount(el, close) {
        el.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          const d = new FormData(e.target);
          const nome = String(d.get('nome')).trim();
          if (!nome) return;
          Store.salvarFuncionario({
            id: ed ? f.id : undefined, nome, funcao: String(d.get('funcao')).trim(),
            ativo: d.get('ativo') === 'on', obs: String(d.get('obs')).trim(),
          });
          close();
          toast(ed ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
        });
      },
    });
  }

  Pages.funcionarios = { render };
})();
