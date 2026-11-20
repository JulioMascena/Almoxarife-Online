/* Busca aproximada (fuzzy) e caixa de autocompletar.
   Encontra o material mesmo com letras faltando ("cmto" → Cimento),
   fora de ordem por palavra ("pvc tubo") ou com um erro de digitação ("cimneto"). */
(function () {
  const { esc, num } = UI;

  /* Normaliza letra a letra, mantendo o mesmo tamanho do texto original (para destacar) */
  function norm(t) {
    let out = '';
    for (const ch of String(t || '')) out += ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().charAt(0) || ' ';
    return out;
  }
  const inicioPalavra = (t, i) => i === 0 || /[\s\-_/().,x]/.test(t[i - 1]) || (/\d/.test(t[i]) && !/\d/.test(t[i - 1]));

  /* Distância de edição com troca de letras vizinhas (Damerau), limitada */
  function distancia(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 1) return 9;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[m][n];
  }

  /* Pontua um termo contra um texto normalizado. Retorna { score, idx[] } ou null. */
  function pontuarTermo(termo, t) {
    // 1) trecho exato
    const pos = t.indexOf(termo);
    if (pos >= 0) {
      const idx = Array.from({ length: termo.length }, (_, k) => pos + k);
      return { score: 100 + termo.length * 4 + (inicioPalavra(t, pos) ? 40 : 0) - Math.min(pos, 30), idx };
    }
    // 2) letras na ordem, com buracos ("cmto" → "cimento")
    let i = 0, score = 0, ant = -2;
    const idx = [];
    for (const ch of termo) {
      const k = t.indexOf(ch, i);
      if (k < 0) { score = null; break; }
      score += 2 + (k === ant + 1 ? 6 : 0) + (inicioPalavra(t, k) ? 8 : 0) - Math.min(k - i, 6) * 0.5;
      idx.push(k); ant = k; i = k + 1;
    }
    // Letras soltas só valem se começarem numa palavra e ficarem próximas (evita "tinta" → "disco de corTe dIamaNTAdo")
    if (score !== null && inicioPalavra(t, idx[0]) && idx[idx.length - 1] - idx[0] <= termo.length * 3 + 2) return { score: score + 10, idx };
    // 3) um erro de digitação no começo de alguma palavra ("cimneto" → "cimento")
    if (termo.length >= 4) {
      const re = /[^\s]+/g;
      let mm;
      while ((mm = re.exec(t))) {
        const palavra = mm[0];
        for (const tam of [termo.length, termo.length - 1, termo.length + 1]) {
          if (tam < 3 || tam > palavra.length) continue;
          if (distancia(termo, palavra.slice(0, tam)) <= 1) {
            return { score: 40 + termo.length * 2, idx: Array.from({ length: tam }, (_, k) => mm.index + k) };
          }
        }
      }
    }
    return null;
  }

  /* Todos os termos precisam bater em algum dos campos. Nome vale mais que código e categoria. */
  function pontuar(consulta, campos) {
    const termos = norm(consulta).split(/\s+/).filter(Boolean);
    if (!termos.length) return { score: 0, marcas: {} };
    let total = 0;
    const marcas = {};
    for (const termo of termos) {
      let melhor = null;
      for (const c of campos) {
        const r = pontuarTermo(termo, c.n);
        if (r && (!melhor || r.score * c.peso > melhor.score)) melhor = { score: r.score * c.peso, idx: r.idx, campo: c.chave };
      }
      if (!melhor) return null;
      total += melhor.score;
      (marcas[melhor.campo] = marcas[melhor.campo] || new Set());
      melhor.idx.forEach((k) => marcas[melhor.campo].add(k));
    }
    return { score: total, marcas };
  }

  function destacar(texto, marcas) {
    if (!marcas || !marcas.size) return esc(texto);
    let out = '', aberto = false;
    [...String(texto)].forEach((ch, i) => {
      const m = marcas.has(i);
      if (m && !aberto) { out += '<mark>'; aberto = true; }
      if (!m && aberto) { out += '</mark>'; aberto = false; }
      out += esc(ch);
    });
    return out + (aberto ? '</mark>' : '');
  }

  /* ---------- Caixa de busca de produtos ---------- */
  function buscarProdutos(consulta, limite) {
    const s = Store.state;
    const lista = s.produtos.map((p) => {
      const cat = Store.categoria(p.categoriaId);
      const campos = [
        { chave: 'nome', n: norm(p.nome), peso: 1 },
        { chave: 'codigo', n: norm(p.codigo || ''), peso: 0.9 },
        { chave: 'cat', n: norm(cat ? cat.nome : ''), peso: 0.45 },
      ];
      const r = pontuar(consulta, campos);
      return r ? { p, cat, ...r } : null;
    }).filter(Boolean);
    if (!consulta.trim()) {
      // Sem texto: tudo, agrupado por categoria
      return lista.sort((a, b) => ((a.cat ? a.cat.nome : '~') .localeCompare(b.cat ? b.cat.nome : '~', 'pt-BR')) || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
    }
    lista.sort((a, b) => b.score - a.score || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
    // Quando há resultados fortes, esconde os muito mais fracos
    const corte = lista.length ? lista[0].score * 0.35 : 0;
    return lista.filter((r) => r.score >= corte).slice(0, limite || 12);
  }

  function buscarFuncionarios(consulta, limite) {
    const lista = Store.state.funcionarios.filter((f) => f.ativo !== false).map((f) => {
      const r = pontuar(consulta, [
        { chave: 'nome', n: norm(f.nome), peso: 1 },
        { chave: 'funcao', n: norm(f.funcao || ''), peso: 0.5 },
      ]);
      return r ? { f, ...r } : null;
    }).filter(Boolean);
    if (!consulta.trim()) return lista.sort((a, b) => a.f.nome.localeCompare(b.f.nome, 'pt-BR'));
    lista.sort((a, b) => b.score - a.score || a.f.nome.localeCompare(b.f.nome, 'pt-BR'));
    const corte = lista.length ? lista[0].score * 0.35 : 0;
    return lista.filter((r) => r.score >= corte).slice(0, limite || 12);
  }

  /* Caixa de autocompletar genérica: input de texto + input escondido com o id escolhido.
     cfg: { input, hidden, buscar(texto), item(r), grupo(r), idDe(r), textoDe(r), vazio(texto), exato(texto), onSelect(id) } */
  function combo(cfg) {
    const { input, hidden } = cfg;
    const wrap = input.closest('.combo');
    const lista = document.createElement('div');
    lista.className = 'combo-list';
    lista.setAttribute('role', 'listbox');
    lista.id = input.id + '-lista';
    lista.hidden = true;
    wrap.appendChild(lista);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', lista.id);
    input.setAttribute('aria-expanded', 'false');

    let itens = [];
    let ativo = 0;

    const desenhar = () => {
      const consulta = input.value;
      itens = cfg.buscar(consulta);
      if (!itens.length) {
        lista.innerHTML = `<div class="combo-vazio">${cfg.vazio(consulta)}</div>`;
      } else {
        let grupoAnt = null;
        lista.innerHTML = itens.map((r, i) => {
          const g = !consulta.trim() && cfg.grupo ? cfg.grupo(r) : null;
          const cab = g && g !== grupoAnt ? `<div class="combo-grupo">${esc((grupoAnt = g))}</div>` : '';
          return `${cab}<div class="combo-item ${i === ativo ? 'is-active' : ''}" role="option" id="${lista.id}-${i}" data-i="${i}" aria-selected="${i === ativo}">${cfg.item(r)}</div>`;
        }).join('');
      }
      lista.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      marcarAtivo();
    };
    const marcarAtivo = () => {
      lista.querySelectorAll('.combo-item').forEach((el) => {
        const on = Number(el.dataset.i) === ativo;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-selected', on);
        if (on) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
      });
    };
    const fechar = () => { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
    const escolher = (i) => {
      const r = itens[i];
      if (!r) return;
      input.value = cfg.textoDe(r);
      hidden.value = cfg.idDe(r);
      fechar();
      if (cfg.onSelect) cfg.onSelect(hidden.value);
    };

    input.addEventListener('focus', () => { ativo = 0; desenhar(); input.select(); });
    input.addEventListener('input', () => { hidden.value = ''; ativo = 0; desenhar(); if (cfg.onSelect) cfg.onSelect(null); });
    input.addEventListener('blur', () => setTimeout(fechar, 120));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (lista.hidden) desenhar(); else { ativo = Math.min(ativo + 1, itens.length - 1); marcarAtivo(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(ativo - 1, 0); marcarAtivo(); }
      else if (e.key === 'Enter') { if (!lista.hidden && itens.length) { e.preventDefault(); escolher(ativo); } }
      else if (e.key === 'Escape') { if (!lista.hidden) { e.preventDefault(); e.stopPropagation(); fechar(); } }
      else if (e.key === 'Tab') { if (!lista.hidden && itens.length && input.value.trim() && !hidden.value) escolher(ativo); }
    });
    lista.addEventListener('mousedown', (e) => {
      const el = e.target.closest('.combo-item');
      if (!el) return;
      e.preventDefault();
      escolher(Number(el.dataset.i));
    });

    return {
      /* Resolve o texto digitado sem escolha explícita: nome exato ou um único resultado */
      resolver() {
        if (hidden.value) return hidden.value;
        const txt = input.value.trim();
        if (!txt) return null;
        let id = cfg.exato ? cfg.exato(txt) : null;
        if (!id) { const r = cfg.buscar(txt); if (r.length === 1) id = cfg.idDe(r[0]); }
        if (id) {
          hidden.value = id;
          const r = cfg.buscar('').find((x) => cfg.idDe(x) === id);
          if (r) input.value = cfg.textoDe(r);
        }
        return id;
      },
    };
  }

  function comboProdutos({ input, hidden, onSelect }) {
    const c = combo({
      input, hidden,
      buscar: (t) => buscarProdutos(t, 12),
      grupo: (r) => (r.cat ? r.cat.nome : 'Sem categoria'),
      idDe: (r) => r.p.id,
      textoDe: (r) => r.p.nome,
      vazio: (t) => `Nenhum material encontrado para "<b>${esc(t)}</b>".`,
      exato: (t) => (Store.state.produtos.find((p) => norm(p.nome) === norm(t) || (p.codigo && norm(p.codigo) === norm(t))) || {}).id || null,
      item: (r) => {
        const st = Store.statusEstoque(r.p);
        return `<div class="combo-item__main">
            <div class="combo-item__nome">${destacar(r.p.nome, r.marcas.nome)}</div>
            <div class="combo-item__sub">${r.cat ? `<span class="dot" style="background:${esc(r.cat.cor)}"></span>${destacar(r.cat.nome, r.marcas.cat)}` : 'Sem categoria'}${r.p.codigo ? ` · ${destacar(r.p.codigo, r.marcas.codigo)}` : ''}</div>
          </div>
          <div class="combo-item__qtd ${st === 'zerado' ? 'text-danger' : st === 'baixo' ? 'text-warn' : ''}">${num(r.p.quantidade)} ${esc(r.p.unidade)}</div>`;
      },
      onSelect: (id) => onSelect && onSelect(id ? Store.produto(id) : null),
    });
    return { resolver: () => { const id = c.resolver(); return id ? Store.produto(id) : null; } };
  }

  function comboFuncionarios({ input, hidden, onSelect }) {
    const iniciais = (n) => n.trim().split(/\s+/).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
    const c = combo({
      input, hidden,
      buscar: (t) => buscarFuncionarios(t, 10),
      idDe: (r) => r.f.id,
      textoDe: (r) => r.f.nome,
      vazio: (t) => (Store.state.funcionarios.length
        ? `Nenhum funcionário encontrado para "<b>${esc(t)}</b>". <a href="#/funcionarios" style="text-decoration:underline">Cadastrar</a>`
        : 'Nenhum funcionário cadastrado. <a href="#/funcionarios" style="text-decoration:underline">Cadastrar</a>'),
      exato: (t) => (Store.state.funcionarios.find((f) => f.ativo !== false && norm(f.nome) === norm(t)) || {}).id || null,
      item: (r) => {
        const ult = Store.saidasPorFuncionario().get(r.f.id);
        return `<div class="combo-item__main" style="display:flex;align-items:center;gap:10px">
            <span class="avatar" style="width:30px;height:30px;font-size:11px">${esc(iniciais(r.f.nome))}</span>
            <div style="min-width:0"><div class="combo-item__nome">${destacar(r.f.nome, r.marcas.nome)}</div>
            <div class="combo-item__sub">${r.f.funcao ? destacar(r.f.funcao, r.marcas.funcao) : 'Sem função'}</div></div>
          </div>
          <div class="combo-item__qtd">${ult ? `última retirada ${UI.data(ult.ultima).slice(0, 5)}` : ''}</div>`;
      },
      onSelect: (id) => onSelect && onSelect(id ? Store.funcionario(id) : null),
    });
    return { resolver: () => { const id = c.resolver(); return id ? Store.funcionario(id) : null; } };
  }

  UI.fuzzy = { norm, pontuar, buscarProdutos, buscarFuncionarios, combo, comboProdutos, comboFuncionarios, destacar };
})();
