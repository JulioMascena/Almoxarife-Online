/* Locais DENTRO da obra: apartamentos (1901, 1302…), salão de festas, hall, estacionamento… */
(function () {
  const { icon, esc, num, data, empty, openModal, confirm, toast, movItem } = UI;
  const filtros = { busca: '', tipo: '', status: '' };

  const tipoDe = (id) => Store.TIPOS_LOCAL.find((t) => t.id === id) || Store.TIPOS_LOCAL[Store.TIPOS_LOCAL.length - 1];
  const statusDe = (id) => Store.STATUS_LOCAL.find((t) => t.id === id) || Store.STATUS_LOCAL[0];
  const pav = (v) => Pages.produtos.pav(v);

  /* Ordena pavimentos: Cobertura > andares numéricos (desc) > Térreo > Subsolos */
  function pesoPavimento(v) {
    const t = String(v || '').trim().toLowerCase();
    if (!t) return -1000;
    if (/^\d+$/.test(t)) return Number(t);
    if (t.startsWith('cobertura')) return 1000;
    if (t.startsWith('térreo') || t.startsWith('terreo')) return 0;
    const sub = t.match(/subsolo\s*(\d+)?/);
    if (sub) return -Number(sub[1] || 1);
    return -500;
  }

  function filtrar() {
    const b = filtros.busca.trim().toLowerCase();
    return Store.state.locais.filter((l) => {
      if (filtros.tipo && l.tipo !== filtros.tipo) return false;
      if (filtros.status && l.status !== filtros.status) return false;
      if (b && !`${l.nome} ${l.bloco || ''} ${l.pavimento || ''} ${tipoDe(l.tipo).nome}`.toLowerCase().includes(b)) return false;
      return true;
    });
  }

  function agrupar(lista) {
    const grupos = new Map();
    const add = (chave, titulo, ordem, l) => {
      if (!grupos.has(chave)) grupos.set(chave, { titulo, ordem, itens: [] });
      grupos.get(chave).itens.push(l);
    };
    lista.forEach((l) => {
      if (l.tipo === 'apartamento') {
        const bloco = l.bloco ? `${l.bloco} · ` : '';
        add(`apto|${l.bloco}|${l.pavimento}`, `${bloco}${l.pavimento ? pav(l.pavimento) : 'Sem pavimento'}`, 10000 + pesoPavimento(l.pavimento) - (l.bloco ? l.bloco.charCodeAt(0) * 0.001 : 0), l);
      } else {
        const t = tipoDe(l.tipo);
        const ordem = { 'area-comum': 500, garagem: 400, externa: 350, almoxarifado: 300, outro: 100 }[l.tipo] || 0;
        add(`tipo|${l.tipo}`, t.id === 'area-comum' ? 'Áreas comuns' : t.nome, ordem, l);
      }
    });
    return [...grupos.values()]
      .sort((a, b) => b.ordem - a.ordem)
      .map((g) => Object.assign(g, { itens: g.itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })) }));
  }

  function render(root) {
    const s = Store.state;
    const consumo = Store.saidasPorLocal();
    const contagem = {};
    s.locais.forEach((l) => { contagem[l.tipo] = (contagem[l.tipo] || 0) + 1; });
    const lista = filtrar();
    const andamento = s.locais.filter((l) => l.status === 'em-andamento').length;
    const concluidos = s.locais.filter((l) => l.status === 'concluido').length;

    root.innerHTML = `
      <div class="grid grid-4">
        <div class="card"><p class="stat__label">Locais cadastrados</p><div class="stat__value">${s.locais.length}</div><div class="stat__hint">${contagem.apartamento || 0} apartamentos</div></div>
        <div class="card"><p class="stat__label">Em andamento</p><div class="stat__value">${andamento}</div><div class="stat__hint">${concluidos} concluídos</div></div>
        <div class="card"><p class="stat__label">Saídas para locais</p><div class="stat__value">${num([...consumo.values()].reduce((a, v) => a + v.saidas, 0), 0)}</div><div class="stat__hint">retiradas registradas</div></div>
        <div class="card"><p class="stat__label">Locais que já receberam</p><div class="stat__value">${consumo.size}</div><div class="stat__hint">de ${s.locais.length} cadastrados</div></div>
      </div>

      <div class="toolbar">
        <label class="search">${icon('search')}<input class="input" type="search" placeholder="Buscar locais... (ex.: 1901, hall)" value="${esc(filtros.busca)}" data-busca aria-label="Buscar locais"></label>
        <select class="select select-inline" data-status aria-label="Filtrar por status">
          <option value="">Qualquer status</option>
          ${Store.STATUS_LOCAL.map((st) => `<option value="${st.id}" ${filtros.status === st.id ? 'selected' : ''}>${esc(st.nome)}</option>`).join('')}
        </select>
        <span class="spacer"></span>
        <button class="btn btn-outline" data-lote>${icon('layers', 'i-sm')}Gerar apartamentos</button>
        <button class="btn btn-primary" data-add>${icon('plus', 'i-sm')}Adicionar Local</button>
      </div>

      <div class="chips" role="group" aria-label="Filtrar por tipo">
        <button class="chip ${!filtros.tipo ? 'is-active' : ''}" data-tipo="">Todos <b>${s.locais.length}</b></button>
        ${Store.TIPOS_LOCAL.filter((t) => contagem[t.id]).map((t) => `<button class="chip ${filtros.tipo === t.id ? 'is-active' : ''}" data-tipo="${t.id}">${esc(t.nome)} <b>${contagem[t.id]}</b></button>`).join('')}
      </div>

      <div data-grupos>${grupos(lista, consumo)}</div>
    `;

    const busca = root.querySelector('[data-busca]');
    busca.addEventListener('input', (e) => {
      filtros.busca = e.target.value;
      root.querySelector('[data-grupos]').innerHTML = grupos(filtrar(), consumo);
      ligarCards(root);
    });
    root.querySelector('[data-status]').addEventListener('change', (e) => { filtros.status = e.target.value; App.render(); });
    root.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { filtros.tipo = b.dataset.tipo; App.render(); }));
    root.querySelector('[data-add]').addEventListener('click', () => abrirForm());
    root.querySelector('[data-lote]').addEventListener('click', abrirLote);
    ligarCards(root);
  }

  function grupos(lista, consumo) {
    if (!Store.state.locais.length) {
      return `<div class="card">${empty('Nenhum local cadastrado. Comece gerando os apartamentos por andar ou adicione áreas como hall e salão de festas.', false, '<div class="btn-row" style="justify-content:center"><button class="btn btn-outline" data-lote-empty>Gerar apartamentos</button><button class="btn btn-primary" data-add-empty>Adicionar Local</button></div>')}</div>`;
    }
    if (!lista.length) return `<div class="card">${empty('Nenhum local encontrado com esses filtros.')}</div>`;
    return `<div style="display:flex;flex-direction:column;gap:24px">${agrupar(lista).map((g) => `
      <section class="group">
        <h3 class="group__title">${esc(g.titulo)} <small>${g.itens.length} ${g.itens.length === 1 ? 'local' : 'locais'}</small></h3>
        <div class="loc-grid">${g.itens.map((l) => card(l, consumo.get(l.id))).join('')}</div>
      </section>`).join('')}</div>`;
  }

  function card(l, c) {
    const t = tipoDe(l.tipo);
    const st = statusDe(l.status);
    const sub = [l.bloco, l.tipo !== 'apartamento' && l.pavimento ? pav(l.pavimento) : '', l.tipo !== 'apartamento' ? t.nome : ''].filter(Boolean).join(' · ');
    return `
      <button class="loc-card" data-id="${l.id}" aria-label="Abrir ${esc(l.nome)}">
        <div class="loc-card__top"><div class="loc-card__icon">${icon(t.icon, 'i-sm')}</div><span class="badge ${st.badge}">${esc(st.nome)}</span></div>
        <div><div class="loc-card__name">${esc(l.nome)}</div><div class="loc-card__meta">${esc(sub || t.nome)}</div></div>
        <div class="loc-card__foot"><span>${c ? `Última: ${data(c.ultima).slice(0, 5)}` : 'Nada recebido'}</span><b>${c ? `${c.saidas} ${c.saidas === 1 ? 'saída' : 'saídas'}` : ''}</b></div>
      </button>`;
  }

  function ligarCards(root) {
    root.querySelectorAll('.loc-card').forEach((el) => el.addEventListener('click', () => abrirDetalhe(el.dataset.id)));
    const a = root.querySelector('[data-add-empty]');
    if (a) a.addEventListener('click', () => abrirForm());
    const b = root.querySelector('[data-lote-empty]');
    if (b) b.addEventListener('click', abrirLote);
  }

  /* ---------- Detalhe do local ---------- */
  function abrirDetalhe(id) {
    const l = Store.local(id);
    if (!l) return;
    const movs = Store.state.movimentos.filter((m) => m.localId === id && m.tipo === 'saida');
    const porProduto = new Map();
    movs.forEach((m) => {
      const cur = porProduto.get(m.produtoId) || { qtd: 0, vezes: 0, nome: m.produtoNome, unidade: m.unidade };
      cur.qtd += m.quantidade; cur.vezes += 1;
      porProduto.set(m.produtoId, cur);
    });
    const linhas = [...porProduto.values()].sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, 'pt-BR'));
    const ultima = movs.length ? movs.reduce((a, m) => (m.data > a ? m.data : a), '') : '';
    const t = tipoDe(l.tipo);
    const st = statusDe(l.status);

    const m = openModal({
      title: l.nome,
      wide: true,
      body: `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          <span class="badge badge-primary">${esc(t.nome)}</span>
          ${l.bloco ? `<span class="badge">${esc(l.bloco)}</span>` : ''}
          ${l.pavimento ? `<span class="badge">${esc(pav(l.pavimento))}</span>` : ''}
          <span class="badge ${st.badge}">${esc(st.nome)}</span>
        </div>
        ${l.obs ? `<p class="muted" style="font-size:14px;margin:0 0 16px">${esc(l.obs)}</p>` : ''}
        ${(() => { const nomes = [...new Set(movs.map((m) => m.responsavel).filter(Boolean))]; return nomes.length ? `<p style="font-size:14px;margin:0 0 16px"><span class="muted">Quem levou material para cá:</span> ${nomes.map((n) => `<b>${esc(n)}</b>`).join(', ')}</p>` : ''; })()}
        <div class="grid grid-3" style="gap:12px;margin-bottom:20px">
          <div class="card" style="padding:16px"><p class="stat__label">Última entrega</p><div class="stat__value" style="font-size:20px">${ultima ? data(ultima) : '—'}</div></div>
          <div class="card" style="padding:16px"><p class="stat__label">Saídas registradas</p><div class="stat__value" style="font-size:20px">${movs.length}</div></div>
          <div class="card" style="padding:16px"><p class="stat__label">Produtos diferentes</p><div class="stat__value" style="font-size:20px">${linhas.length}</div></div>
        </div>
        <h4 style="font-size:15px;margin-bottom:8px">Consumo por produto</h4>
        ${linhas.length ? `<div class="card card--flush" style="margin-bottom:20px"><div class="table-wrap"><table class="table">
          <thead><tr><th>Produto</th><th class="num">Total recebido</th><th class="num">Saídas</th></tr></thead>
          <tbody>${linhas.map((r) => `<tr><td><div class="cell-title">${esc(r.nome)}</div></td><td class="num">${num(r.qtd)} ${esc(r.unidade)}</td><td class="num">${r.vezes}</td></tr>`).join('')}</tbody>
        </table></div></div>` : empty('Nenhum material enviado para este local ainda.', true)}
        ${movs.length ? `<h4 style="font-size:15px;margin-bottom:4px">Histórico <a class="btn btn-ghost btn-sm" href="#/historico?local=${l.id}" data-close>ver tudo</a></h4><div class="list">${movs.slice(0, 15).map(movItem).join('')}</div>` : ''}
      `,
      footer: `
        <button class="btn btn-danger-outline" data-del style="margin-right:auto">${icon('trash', 'i-sm')}Excluir</button>
        <button class="btn btn-outline" data-edit>${icon('edit', 'i-sm')}Editar</button>
        <button class="btn btn-primary" data-send ${Store.state.produtos.length ? '' : 'disabled'}>${icon('out', 'i-sm')}Enviar material</button>`,
    });
    m.el.querySelector('[data-edit]').addEventListener('click', () => { m.close(); abrirForm(l); });
    m.el.querySelector('[data-send]').addEventListener('click', () => { m.close(); Pages.produtos.abrirMovimento({ tipo: 'saida', localId: l.id }); });
    m.el.querySelector('[data-del]').addEventListener('click', async () => {
      const ok = await confirm({ title: 'Excluir local?', message: `<b>${esc(l.nome)}</b> será removido. As saídas já registradas continuam no histórico, sem o local.`, confirmText: 'Excluir', danger: true });
      if (ok) { m.close(); Store.excluirLocal(l.id); toast('Local excluído.'); }
    });
  }

  /* ---------- Formulário ---------- */
  function abrirForm(l) {
    const ed = !!l;
    l = l || { nome: '', tipo: 'apartamento', bloco: '', pavimento: '', status: 'nao-iniciado', obs: '' };
    openModal({
      title: ed ? 'Editar Local' : 'Adicionar Local',
      body: `
        <form class="form" id="f-loc">
          <div class="field"><label for="l-nome">Nome</label><input class="input" id="l-nome" name="nome" required value="${esc(l.nome)}" placeholder="Ex.: Apto 1901, Salão de festas, Hall"></div>
          <div class="field"><label for="l-tipo">Tipo</label>
            <select class="select" id="l-tipo" name="tipo">${Store.TIPOS_LOCAL.map((t) => `<option value="${t.id}" ${t.id === l.tipo ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select>
          </div>
          <div class="form-row">
            <div class="field"><label for="l-pav">Pavimento / andar</label><input class="input" id="l-pav" name="pavimento" value="${esc(l.pavimento)}" placeholder="Ex.: 19, Térreo, Subsolo 1" list="pavs"></div>
            <div class="field"><label for="l-bloco">Torre / bloco</label><input class="input" id="l-bloco" name="bloco" value="${esc(l.bloco)}" placeholder="Opcional"></div>
          </div>
          <datalist id="pavs"><option value="Cobertura"><option value="Térreo"><option value="Mezanino"><option value="Subsolo 1"><option value="Subsolo 2"></datalist>
          <div class="field"><label>Status da etapa</label>
            <div class="segmented" data-status>${Store.STATUS_LOCAL.map((st) => `<button type="button" data-v="${st.id}" class="${st.id === l.status ? 'is-active' : ''}">${esc(st.nome)}</button>`).join('')}</div>
          </div>
          <div class="field"><label for="l-obs">Observações</label><textarea class="textarea" id="l-obs" name="obs" placeholder="Ex.: proprietário pediu porcelanato diferente">${esc(l.obs)}</textarea></div>
        </form>`,
      footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-loc">${ed ? 'Salvar' : 'Criar'}</button>`,
      onMount(el, close) {
        let status = l.status;
        el.querySelectorAll('[data-status] button').forEach((b) => b.addEventListener('click', () => {
          status = b.dataset.v;
          el.querySelectorAll('[data-status] button').forEach((x) => x.classList.toggle('is-active', x === b));
        }));
        el.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const nome = String(f.get('nome')).trim();
          if (!nome) return;
          Store.salvarLocal({ id: ed ? l.id : undefined, nome, tipo: f.get('tipo'), pavimento: String(f.get('pavimento')).trim(), bloco: String(f.get('bloco')).trim(), status, obs: String(f.get('obs')).trim() });
          close();
          toast(ed ? 'Local atualizado.' : 'Local criado.');
        });
      },
    });
  }

  /* ---------- Gerar apartamentos por andar ---------- */
  function abrirLote() {
    openModal({
      title: 'Gerar Apartamentos',
      body: `
        <form class="form" id="f-lote">
          <p class="muted mt-0" style="font-size:14px">Cria um apartamento para cada andar e posição. O número segue o padrão andar + posição: 19º andar, posição 1 = <b>1901</b>.</p>
          <div class="form-row">
            <div class="field"><label for="g-de">Do andar</label><input class="input" id="g-de" name="de" type="number" min="1" max="200" value="1" required></div>
            <div class="field"><label for="g-ate">Até o andar</label><input class="input" id="g-ate" name="ate" type="number" min="1" max="200" value="20" required></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="g-n">Apartamentos por andar</label><input class="input" id="g-n" name="n" type="number" min="1" max="30" value="4" required></div>
            <div class="field"><label for="g-pre">Prefixo do nome</label><input class="input" id="g-pre" name="prefixo" value="Apto" placeholder="Apto, Unidade, Sala…"></div>
          </div>
          <div class="field"><label for="g-bloco">Torre / bloco</label><input class="input" id="g-bloco" name="bloco" placeholder="Opcional (ex.: Torre A)"></div>
          <div class="preview-box" data-prev></div>
        </form>`,
      footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-lote" data-go>Gerar</button>`,
      onMount(el, close) {
        const form = el.querySelector('form');
        const calcular = () => {
          const de = Math.max(1, parseInt(form.de.value, 10) || 1);
          const ate = Math.max(de, parseInt(form.ate.value, 10) || de);
          const n = Math.min(30, Math.max(1, parseInt(form.n.value, 10) || 1));
          const pre = form.prefixo.value.trim();
          const bloco = form.bloco.value.trim();
          const existentes = new Set(Store.state.locais.map((l) => `${(l.bloco || '').toLowerCase()}|${l.nome.toLowerCase()}`));
          const novos = [];
          let repetidos = 0;
          for (let a = de; a <= ate; a++) {
            for (let i = 1; i <= n; i++) {
              const numero = `${a}${String(i).padStart(2, '0')}`;
              const nome = pre ? `${pre} ${numero}` : numero;
              if (existentes.has(`${bloco.toLowerCase()}|${nome.toLowerCase()}`)) { repetidos++; continue; }
              novos.push({ nome, tipo: 'apartamento', pavimento: String(a), bloco, status: 'nao-iniciado', obs: '' });
            }
          }
          return { novos, repetidos };
        };
        const prev = () => {
          const { novos, repetidos } = calcular();
          el.querySelector('[data-prev]').innerHTML = novos.length
            ? `Serão criados <b>${novos.length}</b> apartamentos: <b>${esc(novos[0].nome)}</b> … <b>${esc(novos[novos.length - 1].nome)}</b>${repetidos ? ` · ${repetidos} já existem e serão ignorados` : ''}`
            : `Nada a criar${repetidos ? `: os ${repetidos} apartamentos já existem` : ''}.`;
          el.querySelector('[data-go]').disabled = !novos.length || novos.length > 2000;
        };
        form.addEventListener('input', prev);
        prev();
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const { novos } = calcular();
          if (!novos.length) return;
          Store.criarLocaisEmLote(novos);
          close();
          toast(`${novos.length} apartamentos criados.`);
        });
      },
    });
  }

  Pages.locais = { render };
})();
