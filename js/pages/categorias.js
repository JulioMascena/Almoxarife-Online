(function () {
  const { icon, esc, num, empty, openModal, confirm, toast } = UI;

  function render(root) {
    const s = Store.state;
    const resumo = Store.produtosPorCategoria();
    const mes = Store.hoje().slice(0, 7);
    root.innerHTML = `
      <div class="page-header"><span class="page-header__summary">${s.categorias.length} categoria(s)</span><button class="btn btn-primary" data-add>${icon('plus', 'i-sm')}Adicionar Categoria</button></div>
      ${s.categorias.length ? `<div class="grid grid-3">${s.categorias.map((c) => {
        const r = resumo.find((x) => x.id === c.id) || { valor: 0, baixos: 0 };
        const baixos = r.baixos;
        const ids = new Set(s.produtos.filter((p) => p.categoriaId === c.id).map((p) => p.id));
        const saidasMes = s.movimentos.filter((m) => m.tipo === 'saida' && ids.has(m.produtoId) && m.data.slice(0, 7) === mes).length;
        return `
        <div class="card cat-card" style="--c:${esc(c.cor)}" data-id="${c.id}">
          <div class="cat-card__head">
            <div class="cat-card__name">${esc(c.nome)}</div>
            <div class="nowrap">
              <button class="icon-btn" data-act="editar" aria-label="Editar ${esc(c.nome)}">${icon('edit', 'i-sm')}</button>
              <button class="icon-btn del" data-act="excluir" aria-label="Excluir ${esc(c.nome)}">${icon('trash', 'i-sm')}</button>
            </div>
          </div>
          <div class="cat-card__desc">${esc(c.descricao || '')}</div>
          <div class="cat-card__stats">
            <div><b>${num(r.valor, 0)}</b>produtos</div>
            <div><b>${num(saidasMes, 0)}</b>saídas no mês</div>
            ${baixos ? `<div><b class="text-warn">${baixos}</b>em falta</div>` : ''}
          </div>
          <a class="btn btn-ghost btn-sm" style="align-self:flex-start;margin-left:-10px" href="#/produtos?categoria=${c.id}">Ver produtos →</a>
        </div>`;
      }).join('')}</div>` : `<div class="card">${empty('Nenhuma categoria ainda.', false, '<button class="btn btn-primary" data-add-empty>Adicionar Categoria</button>')}</div>`}
    `;
    root.querySelector('[data-add]').addEventListener('click', () => abrirForm());
    const e = root.querySelector('[data-add-empty]');
    if (e) e.addEventListener('click', () => abrirForm());
    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
      const c = Store.categoria(b.closest('[data-id]').dataset.id);
      if (b.dataset.act === 'editar') return abrirForm(c);
      const n = s.produtos.filter((p) => p.categoriaId === c.id).length;
      const ok = await confirm({ title: 'Excluir categoria?', message: `A categoria <b>${esc(c.nome)}</b> será removida.${n ? ` ${n} produto(s) ficarão sem categoria.` : ''}`, confirmText: 'Excluir', danger: true });
      if (ok) { Store.excluirCategoria(c.id); toast('Categoria excluída.'); }
    }));
  }

  function abrirForm(c) {
    const ed = !!c;
    c = c || { nome: '', descricao: '', cor: Store.CORES[Store.state.categorias.length % Store.CORES.length] };
    let cor = c.cor;
    openModal({
      title: ed ? 'Editar Categoria' : 'Adicionar Categoria',
      body: `
        <form class="form" id="f-cat">
          <div class="field"><label for="c-nome">Nome</label><input class="input" id="c-nome" name="nome" required value="${esc(c.nome)}" placeholder="Ex.: Hidráulica"></div>
          <div class="field"><label for="c-desc">Descrição</label><textarea class="textarea" id="c-desc" name="descricao" placeholder="O que entra nesta categoria">${esc(c.descricao)}</textarea></div>
          <div class="field"><label>Cor</label>
            <div class="swatches">${Store.CORES.map((k) => `<button type="button" class="swatch" data-cor="${k}" style="background:${k}" aria-label="Cor ${k}"></button>`).join('')}<input type="color" value="${esc(cor)}" aria-label="Cor personalizada" data-picker></div>
          </div>
        </form>`,
      footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-cat">${ed ? 'Salvar' : 'Criar'}</button>`,
      onMount(el, close) {
        const marcar = () => {
          el.querySelectorAll('[data-cor]').forEach((b) => b.classList.toggle('is-selected', b.dataset.cor.toLowerCase() === cor.toLowerCase()));
          el.querySelector('[data-picker]').value = cor;
        };
        el.querySelectorAll('[data-cor]').forEach((b) => b.addEventListener('click', () => { cor = b.dataset.cor; marcar(); }));
        el.querySelector('[data-picker]').addEventListener('input', (e) => { cor = e.target.value; marcar(); });
        marcar();
        el.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const nome = String(f.get('nome')).trim();
          if (!nome) return;
          Store.salvarCategoria({ id: ed ? c.id : undefined, nome, descricao: String(f.get('descricao')).trim(), cor });
          close();
          toast(ed ? 'Categoria atualizada.' : 'Categoria criada.');
        });
      },
    });
  }

  Pages.categorias = { render };
})();
