/* Movimentações em lote por CSV:
   1) baixar o modelo (uma linha por produto, já com código e nome)
   2) preencher no Excel
   3) importar: o app confere cada linha antes de gravar */
(function () {
  const { icon, esc, num, data, openModal, toast, download } = UI;

  const COLUNAS = ['data', 'hora', 'tipo', 'codigo', 'produto', 'quantidade', 'unidade', 'funcionario', 'local', 'observacao'];

  const csv = (linhas) => '﻿' + Pages.configuracoes.toCSV(linhas);
  const norm = (t) => String(t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function produtosOrdenados() {
    const nomeCat = (p) => (Store.categoria(p.categoriaId) || { nome: 'zzz' }).nome;
    return [...Store.state.produtos].sort((a, b) => nomeCat(a).localeCompare(nomeCat(b), 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function baixarModelo() {
    const hoje = data(Store.hoje());
    const linhas = [COLUNAS];
    produtosOrdenados().forEach((p) => linhas.push([hoje, '', 'saida', p.codigo || '', p.nome, '', p.unidade, '', '', '']));
    download(`modelo-movimentacoes-${Store.hoje()}.csv`, csv(linhas), 'text/csv;charset=utf-8');
  }

  function baixarListas() {
    const funcs = Store.state.funcionarios.filter((f) => f.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const locais = Store.state.locais.filter((l) => l.tipo !== 'almoxarifado').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
    const n = Math.max(funcs.length, locais.length);
    const linhas = [['funcionario', 'funcao', '', 'local', 'tipo_local']];
    for (let i = 0; i < n; i++) {
      const f = funcs[i], l = locais[i];
      linhas.push([f ? f.nome : '', f ? f.funcao || '' : '', '', l ? l.nome : '', l ? (Store.TIPOS_LOCAL.find((t) => t.id === l.tipo) || {}).nome || '' : '']);
    }
    download(`funcionarios-e-locais-${Store.hoje()}.csv`, csv(linhas), 'text/csv;charset=utf-8');
  }

  /* ---------- Leitura e conferência ---------- */
  function numBR(v) {
    const t = String(v || '').trim().replace(/\s/g, '');
    if (!t) return NaN;
    const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
    return n;
  }

  function lerData(v) {
    const t = String(v || '').trim();
    if (!t) return Store.hoje();
    let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      const iso = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      return valida(iso) ? iso : null;
    }
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) { const iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; return valida(iso) ? iso : null; }
    return null;
  }
  function valida(iso) {
    const d = new Date(iso + 'T12:00');
    return !isNaN(d) && d.toISOString().slice(0, 10) === iso;
  }

  function lerHora(v) {
    const t = String(v || '').trim();
    if (!t) return '';
    const m = t.match(/^(\d{1,2})[:h](\d{2})(?::\d{2})?$/i) || t.match(/^(\d{1,2})h?$/i);
    if (!m) return null;
    const h = Number(m[1]), mi = Number(m[2] || 0);
    if (h > 23 || mi > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
  }

  function lerTipo(v) {
    const t = norm(v);
    if (!t || ['saida', 's', 'retirada', 'retirar', 'saidas'].includes(t)) return 'saida';
    if (['entrada', 'e', 'recebimento', 'compra', 'entradas'].includes(t)) return 'entrada';
    return null;
  }

  function acharProduto(codigo, nome) {
    const c = norm(codigo), n = norm(nome);
    return (c && Store.state.produtos.find((p) => norm(p.codigo) === c)) || (n && Store.state.produtos.find((p) => norm(p.nome) === n)) || null;
  }

  function acharLocal(v) {
    const t = norm(v);
    if (!t) return null;
    const locais = Store.state.locais;
    const exato = locais.find((l) => norm(l.nome) === t);
    if (exato) return exato;
    // "1901" encontra "Apto 1901", se for o único
    const parecidos = locais.filter((l) => norm(l.nome).split(/\s+/).includes(t));
    return parecidos.length === 1 ? parecidos[0] : null;
  }

  function acharFuncionario(v) {
    const t = norm(v);
    if (!t) return null;
    const fs = Store.state.funcionarios;
    return fs.find((f) => norm(f.nome) === t) || (() => { const p = fs.filter((f) => norm(f.nome).startsWith(t + ' ') || norm(f.nome) === t); return p.length === 1 ? p[0] : null; })();
  }

  function conferir(texto) {
    const rows = Pages.configuracoes.parseCSV(texto);
    if (rows.length < 2) throw new Error('O arquivo está vazio ou sem cabeçalho.');
    const head = rows[0].map(norm);
    const col = (...nomes) => head.findIndex((h) => nomes.includes(h));
    const ix = {
      data: col('data', 'dia'), hora: col('hora', 'horario'), tipo: col('tipo', 'movimento'),
      codigo: col('codigo', 'sku', 'cod'), produto: col('produto', 'material', 'nome'),
      quantidade: col('quantidade', 'qtd', 'qtde'), funcionario: col('funcionario', 'responsavel', 'retirado por'),
      local: col('local', 'destino'), obs: col('observacao', 'obs', 'observacoes'),
    };
    if (ix.quantidade < 0 || (ix.produto < 0 && ix.codigo < 0)) throw new Error('O arquivo precisa das colunas "quantidade" e "produto" (ou "codigo"). Use o modelo.');
    const temFuncs = Store.state.funcionarios.length > 0;
    const get = (r, k) => (ix[k] >= 0 ? (r[ix[k]] || '').trim() : '');

    const linhas = [];
    let emBranco = 0;
    rows.slice(1).forEach((r, i) => {
      const qtdTxt = get(r, 'quantidade');
      if (!qtdTxt) { emBranco++; return; }
      const L = { n: i + 2, bruto: r, erros: [] };
      L.tipo = lerTipo(get(r, 'tipo'));
      if (!L.tipo) L.erros.push(`tipo "${get(r, 'tipo')}" inválido (use entrada ou saida)`);
      L.p = acharProduto(get(r, 'codigo'), get(r, 'produto'));
      if (!L.p) L.erros.push(`produto "${get(r, 'produto') || get(r, 'codigo')}" não encontrado`);
      L.qtd = numBR(qtdTxt);
      if (!(L.qtd > 0)) L.erros.push(`quantidade "${qtdTxt}" inválida`);
      L.data = lerData(get(r, 'data'));
      if (!L.data) L.erros.push(`data "${get(r, 'data')}" inválida (use dd/mm/aaaa)`);
      L.hora = lerHora(get(r, 'hora'));
      if (L.hora === null) { L.erros.push(`hora "${get(r, 'hora')}" inválida (use hh:mm)`); L.hora = ''; }
      L.funcTxt = get(r, 'funcionario');
      L.f = acharFuncionario(L.funcTxt);
      L.localTxt = get(r, 'local');
      L.l = acharLocal(L.localTxt);
      L.obs = get(r, 'obs');
      if (L.tipo === 'saida') {
        if (temFuncs && !L.f) L.erros.push(L.funcTxt ? `funcionário "${L.funcTxt}" não cadastrado` : 'falta o funcionário');
        if (!L.l) L.erros.push(L.localTxt ? `local "${L.localTxt}" não encontrado` : 'falta o local');
      }
      linhas.push(L);
    });

    // Confere o estoque na ordem do tempo, como se fosse lançando uma a uma
    const estoque = new Map(Store.state.produtos.map((p) => [p.id, p.quantidade]));
    const ordem = (a, b) => (a.data + (a.hora || '99:99')).localeCompare(b.data + (b.hora || '99:99')) || a.n - b.n;
    linhas.filter((L) => !L.erros.length).sort(ordem).forEach((L) => {
      const atual = estoque.get(L.p.id);
      if (L.tipo === 'saida' && L.qtd > atual) { L.erros.push(`estoque insuficiente (haveria ${num(atual)} ${L.p.unidade})`); return; }
      estoque.set(L.p.id, Math.round((atual + (L.tipo === 'saida' ? -L.qtd : L.qtd)) * 1000) / 1000);
    });
    return { linhas, emBranco, head: rows[0], ordem };
  }

  /* ---------- Modal ---------- */
  function abrir() {
    const nProd = Store.state.produtos.length;
    const m = openModal({
      title: 'Movimentações em Lote',
      wide: true,
      body: `
        <div class="lote-steps">
          <div class="lote-step">
            <h4><span>1</span>Baixe o modelo</h4>
            <p>Planilha com os ${nProd} produtos já listados (código e nome). Preencha a <b>quantidade</b> só nas linhas que tiveram movimento; linhas sem quantidade são ignoradas. Repita a linha do produto se ele saiu mais de uma vez.</p>
            <div class="btn-row">
              <button class="btn btn-primary btn-sm" data-modelo>${icon('download', 'i-sm')}Baixar modelo CSV</button>
              <button class="btn btn-outline btn-sm" data-listas>${icon('download', 'i-sm')}Lista de funcionários e locais</button>
            </div>
          </div>
          <div class="lote-step">
            <h4><span>2</span>Importe preenchido</h4>
            <p><b>tipo</b>: saida ou entrada · <b>data</b>: dd/mm/aaaa (vazio = hoje) · <b>hora</b>: hh:mm · Na saída, <b>funcionario</b> e <b>local</b> são obrigatórios e precisam estar cadastrados (para apartamento pode escrever só o número, ex.: 1901).</p>
            <button class="btn btn-outline btn-sm" data-escolher>${icon('upload', 'i-sm')}Escolher arquivo CSV</button>
            <input type="file" accept=".csv,text/csv" hidden data-arquivo>
          </div>
        </div>
        <div data-resultado></div>`,
      footer: `<button class="btn btn-outline" data-close>Fechar</button><button class="btn btn-primary" data-importar disabled>Importar</button>`,
    });
    const el = m.el;
    el.querySelector('.modal').classList.add('modal--xl');
    let conferido = null;
    el.querySelector('[data-modelo]').addEventListener('click', baixarModelo);
    el.querySelector('[data-listas]').addEventListener('click', baixarListas);
    el.querySelector('[data-escolher]').addEventListener('click', () => el.querySelector('[data-arquivo]').click());
    el.querySelector('[data-arquivo]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        conferido = conferir(await file.text());
        mostrar(el, conferido, file.name);
      } catch (err) {
        conferido = null;
        el.querySelector('[data-resultado]').innerHTML = `<div class="alert-banner" style="background:var(--danger-soft);color:var(--danger)">${icon('alert')}<span>${esc(err.message)}</span></div>`;
        el.querySelector('[data-importar]').disabled = true;
      }
    });
    el.querySelector('[data-importar]').addEventListener('click', () => {
      if (!conferido) return;
      const ok = conferido.linhas.filter((L) => !L.erros.length).sort(conferido.ordem);
      if (!ok.length) return;
      try {
        const n = Store.registrarLote(ok.map((L) => ({
          tipo: L.tipo, produtoId: L.p.id, quantidade: L.qtd, data: L.data, hora: L.hora || '',
          localId: L.tipo === 'saida' && L.l ? L.l.id : null,
          funcionarioId: L.f ? L.f.id : null, responsavel: L.f ? L.f.nome : L.funcTxt,
          obs: L.obs || 'Importado em lote',
        })));
        m.close();
        const erros = conferido.linhas.length - ok.length;
        toast(`${n} movimentações importadas${erros ? ` · ${erros} linha(s) com erro ficaram de fora` : ''}.`);
      } catch (err) { toast(err.message, { error: true }); }
    });
  }

  function mostrar(el, c, nomeArquivo) {
    const ok = c.linhas.filter((L) => !L.erros.length);
    const ruins = c.linhas.filter((L) => L.erros.length);
    const btn = el.querySelector('[data-importar]');
    btn.disabled = !ok.length;
    btn.textContent = ok.length ? `Importar ${ok.length} movimentaç${ok.length === 1 ? 'ão' : 'ões'}` : 'Importar';
    const visiveis = [...ruins, ...ok].slice(0, 300);
    el.querySelector('[data-resultado]').innerHTML = `
      <h4 style="font-size:15px">Conferência de <span class="muted" style="font-weight:400">${esc(nomeArquivo)}</span></h4>
      <div class="lote-resumo">
        <span class="badge badge-ok">${ok.length} pronta(s) para importar</span>
        ${ruins.length ? `<span class="badge badge-danger">${ruins.length} com erro (não serão importadas)</span>` : ''}
        <span class="badge">${c.emBranco} linha(s) sem quantidade ignorada(s)</span>
        ${ruins.length ? '<button class="btn btn-ghost btn-sm" data-baixar-erros>Baixar linhas com erro</button>' : ''}
      </div>
      ${c.linhas.length ? `<div class="card card--flush lote-preview"><div class="table-wrap" style="max-height:320px;overflow:auto"><table class="table">
        <thead><tr><th>Linha</th><th>Dia / hora</th><th>Tipo</th><th>Produto</th><th class="num">Qtd</th><th>Funcionário</th><th>Local</th><th>Conferência</th></tr></thead>
        <tbody>${visiveis.map((L) => `
          <tr class="${L.erros.length ? 'row-erro' : ''}">
            <td class="muted">${L.n}</td>
            <td class="nowrap">${L.data ? data(L.data) : '—'} ${esc(L.hora || '')}</td>
            <td>${L.tipo ? `<span class="badge ${L.tipo === 'saida' ? 'badge-warn' : 'badge-ok'}">${L.tipo === 'saida' ? 'Saída' : 'Entrada'}</span>` : '—'}</td>
            <td>${L.p ? esc(L.p.nome) : '<span class="text-danger">?</span>'}</td>
            <td class="num nowrap">${L.qtd > 0 ? `${num(L.qtd)} ${L.p ? esc(L.p.unidade) : ''}` : '—'}</td>
            <td>${L.f ? esc(L.f.nome) : esc(L.funcTxt || '—')}</td>
            <td>${L.tipo === 'saida' ? (L.l ? esc(L.l.nome) : esc(L.localTxt || '—')) : '<span class="muted">Almoxarifado</span>'}</td>
            <td>${L.erros.length ? `<span class="text-danger">${esc(L.erros.join('; '))}</span>` : `<span class="text-ok">${icon('check', 'i-sm')} OK</span>`}</td>
          </tr>`).join('')}
        </tbody></table></div></div>
        ${c.linhas.length > visiveis.length ? `<p class="muted" style="font-size:12px">Mostrando ${visiveis.length} de ${c.linhas.length} linhas (erros primeiro).</p>` : ''}` : '<p class="muted" style="font-size:14px">Nenhuma linha com quantidade preenchida.</p>'}`;
    const be = el.querySelector('[data-baixar-erros]');
    if (be) be.addEventListener('click', () => {
      const linhas = [[...c.head, 'erro']];
      ruins.forEach((L) => linhas.push([...L.bruto, L.erros.join('; ')]));
      download(`linhas-com-erro-${Store.hoje()}.csv`, csv(linhas), 'text/csv;charset=utf-8');
    });
  }

  Pages.lote = { abrir, conferir };
})();
