(function () {
  const { icon, esc, num, empty, badgeEstoque, movItem, toast } = UI;

  /* O que o usuário escolheu no lançamento rápido sobrevive ao redesenho da tela */
  const q = { tipo: 'saida', produtoId: '', funcionario: '', localId: '', obs: '' };
  let relogio = null;

  function render(root) {
    const s = Store.state;
    const baixos = Store.estoqueBaixo().sort((a, b) => a.quantidade / (Store.minimoDe(a) || 1) - b.quantidade / (Store.minimoDe(b) || 1));

    root.innerHTML = `
      ${lancamentoRapido()}

      ${s.settings.mostrarAlertas ? `
      <div class="card card--flush">
        <div class="card__head" style="padding:20px 24px 0"><h3 class="card__title">${icon('alert', 'i-sm')} Estoque Baixo</h3><a class="btn btn-ghost btn-sm" href="#/produtos?filtro=baixo">Ver todos</a></div>
        ${baixos.length ? `
        <div class="table-wrap" style="margin-top:12px"><table class="table">
          <thead><tr><th>Produto</th><th class="num">Em estoque</th><th class="num">Mínimo</th><th>Situação</th></tr></thead>
          <tbody>${baixos.slice(0, 8).map((p) => `
            <tr><td><div class="cell-title">${esc(p.nome)}</div><div class="cell-sub">${esc(p.codigo || '')}</div></td>
            <td class="num">${num(p.quantidade)} ${esc(p.unidade)}</td><td class="num">${num(Store.minimoDe(p))}</td><td>${badgeEstoque(p)}</td></tr>`).join('')}
          </tbody></table></div>` : empty('Nenhum produto abaixo do mínimo.', true)}
      </div>` : ''}

      ${s.settings.mostrarMovRecentes ? `
      <div class="card">
        <div class="card__head"><h3 class="card__title">Movimentações Recentes</h3><a class="btn btn-ghost btn-sm" href="#/historico">Ver histórico</a></div>
        ${s.movimentos.length ? `<div class="list">${s.movimentos.slice(0, 10).map(movItem).join('')}</div>` : empty('Nenhuma movimentação ainda.', true)}
      </div>` : ''}
    `;
    ligarLancamento(root);
  }

  /* ---------- Lançamento rápido ---------- */
  function opcoesLocais() {
    const locais = Store.state.locais.filter((l) => l.tipo !== 'almoxarifado');
    return Store.TIPOS_LOCAL.map((t) => {
      const itens = locais.filter((l) => l.tipo === t.id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
      return itens.length ? `<optgroup label="${esc(t.nome)}">${itens.map((l) => `<option value="${l.id}" ${l.id === q.localId ? 'selected' : ''}>${esc(l.nome)}</option>`).join('')}</optgroup>` : '';
    }).join('');
  }

  function lancamentoRapido() {
    const s = Store.state;
    if (!s.produtos.length) {
      return `<div class="card">${empty('Cadastre produtos para começar a lançar movimentações.', true, '<a class="btn btn-primary" href="#/produtos">Ir para Produtos</a>')}</div>`;
    }
    const fuSalvo = s.funcionarios.find((f) => f.ativo !== false && f.nome.toLowerCase() === q.funcionario.trim().toLowerCase());
    return `
      <div class="card quick">
        <div class="card__head">
          <h3 class="card__title">${icon('swap', 'i-sm')} Lançamento rápido</h3>
          <div class="segmented" role="tablist" aria-label="Tipo de movimentação">
            <button type="button" data-qtipo="saida" class="${q.tipo === 'saida' ? 'is-active' : ''}">${icon('out', 'i-sm')}Saída</button>
            <button type="button" data-qtipo="entrada" class="${q.tipo === 'entrada' ? 'is-active' : ''}">${icon('in', 'i-sm')}Entrada</button>
          </div>
        </div>
        <form class="quick-grid" id="f-quick" autocomplete="off">
          <div class="field q-mat"><label for="q-prod">Material</label>
            <div class="combo search">${icon('search')}
              <input class="input" id="q-prod" type="text" value="${esc((Store.produto(q.produtoId) || {}).nome || '')}" placeholder="Digite para buscar: nome, código ou categoria…" spellcheck="false">
              <input type="hidden" name="produtoId" value="${esc(Store.produto(q.produtoId) ? q.produtoId : '')}">
            </div>
          </div>
          <div class="field q-qtd"><label for="q-qtd">Quantidade</label>
            <div class="input-suffix"><input class="input" id="q-qtd" name="quantidade" type="number" min="0.001" step="any" required placeholder="0" style="max-width:none"><span data-qun></span></div>
          </div>
          <div class="field q-func"><label for="q-func" data-qfunc-label>Funcionário</label>
            <div class="combo search">${icon('user')}
              <input class="input" id="q-func" name="funcionario" type="text" value="${esc(q.funcionario)}" placeholder="Digite para buscar: nome ou função…" spellcheck="false">
              <input type="hidden" name="funcionarioId" value="${fuSalvo ? fuSalvo.id : ''}">
            </div>
            <span class="hint" data-qfunc-hint></span>
          </div>
          <div class="field q-loc" data-qloc><label for="q-loc">Local</label>
            <select class="select" id="q-loc" name="localId"><option value="">Selecione o local…</option>${opcoesLocais()}</select>
          </div>
          <div class="field q-data"><label for="q-data">Dia</label><input class="input" id="q-data" name="data" type="date" value="${Store.hoje()}" required></div>
          <div class="field q-hora"><label for="q-hora">Hora</label><input class="input" id="q-hora" name="hora" type="time" value="${Store.horaAgora()}" required></div>
          <div class="field q-obs"><label for="q-obs">Observação</label><input class="input" id="q-obs" name="obs" value="${esc(q.obs)}" placeholder="Opcional"></div>
          <div class="q-foot">
            <span class="preview-box" data-qresumo>Escolha o material e a quantidade.</span>
            <button class="btn btn-primary" type="submit">${icon('check', 'i-sm')}Registrar</button>
          </div>
        </form>
      </div>`;
  }

  function ligarLancamento(root) {
    const form = root.querySelector('#f-quick');
    if (relogio) { clearInterval(relogio); relogio = null; }
    if (!form) return;
    let mexeuNoHorario = false;

    const funcPorNome = (nome) => {
      const n = nome.trim().toLowerCase();
      return n ? Store.state.funcionarios.find((f) => f.ativo !== false && f.nome.toLowerCase() === n) : null;
    };

    const atualizar = () => {
      root.querySelectorAll('[data-qtipo]').forEach((b) => b.classList.toggle('is-active', b.dataset.qtipo === q.tipo));
      form.querySelector('[data-qloc]').style.visibility = q.tipo === 'saida' ? '' : 'hidden';
      form.querySelector('[data-qfunc-label]').textContent = q.tipo === 'saida' ? 'Funcionário (quem retira)' : 'Recebido por';
      const p = Store.produto(form.produtoId.value);
      form.querySelector('[data-qun]').textContent = p ? p.unidade : '';
      const hint = form.querySelector('[data-qfunc-hint]');
      const nome = form.funcionario.value.trim();
      const fu = Store.funcionario(form.funcionarioId.value) || funcPorNome(nome);
      if (q.tipo === 'saida' && nome && !fu && !UI.fuzzy.buscarFuncionarios(nome).length) hint.innerHTML = '<span class="text-danger">Não cadastrado.</span> <a href="#/funcionarios" style="text-decoration:underline">Cadastrar</a>';
      else hint.textContent = fu ? (fu.funcao || 'Funcionário') : '';
      const resumo = form.querySelector('[data-qresumo]');
      const qtd = Number(form.quantidade.value) || 0;
      if (!p) { resumo.textContent = 'Escolha o material e a quantidade.'; return; }
      const depois = q.tipo === 'saida' ? p.quantidade - qtd : p.quantidade + qtd;
      resumo.innerHTML = `${esc(p.nome)}: <b>${num(p.quantidade)}</b> → <b class="${depois < 0 ? 'text-danger' : ''}">${num(depois)}</b> ${esc(p.unidade)}`;
    };

    root.querySelectorAll('[data-qtipo]').forEach((b) => b.addEventListener('click', () => { q.tipo = b.dataset.qtipo; atualizar(); }));
    form.addEventListener('input', (e) => {
      if (e.target.name === 'data' || e.target.name === 'hora') mexeuNoHorario = true;
      if (e.target.name === 'funcionario') q.funcionario = e.target.value;
      if (e.target.name === 'obs') q.obs = e.target.value;
      atualizar();
    });
    const combo = UI.fuzzy.comboProdutos({
      input: form.querySelector('#q-prod'),
      hidden: form.produtoId,
      onSelect: (p) => {
        q.produtoId = p ? p.id : '';
        atualizar();
        if (p) form.quantidade.focus();
      },
    });
    const comboFunc = UI.fuzzy.comboFuncionarios({
      input: form.querySelector('#q-func'),
      hidden: form.funcionarioId,
      onSelect: (fu) => {
        q.funcionario = form.funcionario.value;
        atualizar();
        if (fu) (q.tipo === 'saida' ? form.localId : form.obs).focus();
      },
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'localId') q.localId = e.target.value;
      atualizar();
    });

    // Dia e hora acompanham o relógio até o usuário mexer neles
    relogio = setInterval(() => {
      if (!document.body.contains(form)) { clearInterval(relogio); relogio = null; return; }
      if (!mexeuNoHorario) { form.data.value = Store.hoje(); form.hora.value = Store.horaAgora(); }
    }, 20000);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const fu = comboFunc.resolver();
      const nome = form.funcionario.value.trim();
      if (fu) q.funcionario = fu.nome;
      const temFuncs = Store.state.funcionarios.some((f) => f.ativo !== false);
      const erro = (msg, campo) => { toast(msg, { error: true }); if (campo) form[campo].focus(); };
      const prodEscolhido = combo.resolver();
      if (!prodEscolhido) { toast(form.querySelector('#q-prod').value.trim() ? 'Escolha o material na lista de sugestões.' : 'Escolha o material.', { error: true }); form.querySelector('#q-prod').focus(); return; }
      q.produtoId = prodEscolhido.id;
      d.set('produtoId', prodEscolhido.id);
      if (!(Number(d.get('quantidade')) > 0)) return erro('Informe a quantidade.', 'quantidade');
      if (q.tipo === 'saida') {
        if (temFuncs && !fu) return erro(nome ? (UI.fuzzy.buscarFuncionarios(nome).length ? 'Escolha o funcionário na lista de sugestões.' : `"${nome}" não está cadastrado como funcionário.`) : 'Informe o funcionário que está retirando.', 'funcionario');
        if (!d.get('localId')) return erro('Escolha o local que vai receber o material.', 'localId');
      }
      // Limpa material e observação antes de gravar (a tela é redesenhada ao salvar);
      // funcionário, local e tipo ficam para o próximo lançamento
      const anterior = { produtoId: q.produtoId, obs: q.obs };
      q.produtoId = ''; q.obs = '';
      try {
        Store.registrarMov({
          tipo: q.tipo, produtoId: d.get('produtoId'), quantidade: Number(d.get('quantidade')),
          localId: q.tipo === 'saida' ? d.get('localId') : null,
          funcionarioId: fu ? fu.id : null, responsavel: fu ? fu.nome : nome,
          data: mexeuNoHorario ? d.get('data') : Store.hoje(), hora: mexeuNoHorario ? d.get('hora') : Store.horaAgora(),
          obs: String(d.get('obs')).trim(),
        });
        const p = Store.produto(d.get('produtoId'));
        toast(`${q.tipo === 'saida' ? 'Saída' : 'Entrada'} registrada: ${num(d.get('quantidade'))} ${p.unidade} de ${p.nome}.`);
        setTimeout(() => { const sel = document.getElementById('q-prod'); if (sel) sel.focus(); }, 0);
      } catch (err) { Object.assign(q, anterior); erro(err.message, 'quantidade'); }
    });

    atualizar();
  }

  Pages.painel = { render };
})();
