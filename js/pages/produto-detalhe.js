/* Relatório de uso de um produto: consumo por dia, quem mais retira e para onde vai. */
(function () {
  const { icon, esc, num, data, openModal, empty, movItem, badgeEstoque, catBadge } = UI;
  const PERIODOS = [
    { id: '7', nome: '7 dias', dias: 7 },
    { id: '30', nome: '30 dias', dias: 30 },
    { id: '90', nome: '90 dias', dias: 90 },
    { id: 'tudo', nome: 'Tudo', dias: null },
  ];
  let periodoAtual = '30';

  const DIA = 86400000;
  const isoParaTs = (iso) => new Date(iso + 'T12:00').getTime();
  const tsParaIso = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const diasEntre = (a, b) => Math.round((isoParaTs(b) - isoParaTs(a)) / DIA) + 1;

  function calcular(p, periodoId) {
    const movs = Store.state.movimentos.filter((m) => m.produtoId === p.id);
    const cadastro = (movs.find((m) => m.tipo === 'cadastro') || {}).data || movs.reduce((a, m) => (m.data < a ? m.data : a), Store.hoje());
    const hoje = Store.hoje();
    const per = PERIODOS.find((x) => x.id === periodoId);
    let inicio = per.dias ? Store.hoje(-(per.dias - 1)) : cadastro;
    if (inicio < cadastro) inicio = cadastro;
    const dias = Math.max(1, diasEntre(inicio, hoje));
    const saidas = movs.filter((m) => m.tipo === 'saida' && m.data >= inicio && m.data <= hoje);
    const entradas = movs.filter((m) => m.tipo === 'entrada' && m.data >= inicio && m.data <= hoje);

    const porDia = new Map();
    saidas.forEach((m) => porDia.set(m.data, (porDia.get(m.data) || 0) + m.quantidade));
    const total = saidas.reduce((a, m) => a + m.quantidade, 0);
    const media = total / dias;
    let pico = { data: null, qtd: 0 };
    porDia.forEach((q, d) => { if (q > pico.qtd) pico = { data: d, qtd: q }; });

    const agrupar = (chave, nome) => {
      const map = new Map();
      saidas.forEach((m) => {
        const k = chave(m) || '—';
        const cur = map.get(k) || { nome: nome(m), qtd: 0, vezes: 0, dias: new Set() };
        cur.qtd += m.quantidade; cur.vezes += 1; cur.dias.add(m.data);
        map.set(k, cur);
      });
      return [...map.entries()].map(([id, v]) => ({ id, ...v, mediaDia: v.qtd / dias, mediaDiaUso: v.qtd / v.dias.size }))
        .sort((a, b) => b.qtd - a.qtd);
    };
    const porFuncionario = agrupar((m) => m.funcionarioId || (m.responsavel ? 'nome:' + m.responsavel : ''), (m) => m.responsavel || 'Sem funcionário');
    const porLocal = agrupar((m) => m.localId || (m.localNome ? 'nome:' + m.localNome : ''), (m) => Store.nomeLocal(m) || 'Sem local');

    // Barras: diárias até 45 dias; acima disso, por semana
    const semanal = dias > 45;
    const passo = semanal ? 7 : 1;
    const barras = [];
    for (let t = isoParaTs(inicio); t <= isoParaTs(hoje); t += passo * DIA) {
      const de = tsParaIso(t);
      const ate = tsParaIso(Math.min(t + (passo - 1) * DIA, isoParaTs(hoje)));
      let q = 0;
      porDia.forEach((v, d) => { if (d >= de && d <= ate) q += v; });
      barras.push({ de, ate, q });
    }

    return { movs, cadastro, inicio, dias, saidas, entradas, total, media, pico, porDia, porFuncionario, porLocal, barras, semanal,
      diasComUso: porDia.size, duracao: media > 0 ? p.quantidade / media : null };
  }

  function grafico(r, un) {
    const max = Math.max(0, ...r.barras.map((b) => b.q));
    if (max <= 0) return empty('Nenhuma retirada neste período.', true);
    const mediaBarra = r.semanal ? r.media * 7 : r.media;
    const rot = (b) => (r.semanal ? `semana de ${data(b.de).slice(0, 5)} a ${data(b.ate).slice(0, 5)}` : data(b.de));
    const marcas = [0, Math.floor((r.barras.length - 1) / 2), r.barras.length - 1].filter((v, i, a) => a.indexOf(v) === i);
    return `
      <div class="uso-chart" role="img" aria-label="Uso ${r.semanal ? 'por semana' : 'por dia'}">
        <div class="uso-chart__media" style="bottom:${(mediaBarra / max) * 100}%"><span>média ${num(mediaBarra, 1)} ${esc(un)}${r.semanal ? '/sem.' : '/dia'}</span></div>
        ${r.barras.map((b) => `<div class="uso-chart__col" title="${esc(rot(b))}: ${num(b.q)} ${esc(un)}"><div class="uso-chart__bar ${b.q ? '' : 'zero'}" style="height:${(b.q / max) * 100}%"></div></div>`).join('')}
      </div>
      <div class="uso-chart__eixo">${marcas.map((i) => `<span style="left:${(i + 0.5) / r.barras.length * 100}%">${data(i === r.barras.length - 1 ? r.barras[i].ate : r.barras[i].de).slice(0, 5)}</span>`).join('')}</div>`;
  }

  function ranking(lista, un, titulo, vazio, link) {
    if (!lista.length) return `<div class="card"><h3 class="card__title">${titulo}</h3>${empty(vazio, true)}</div>`;
    const max = lista[0].qtd;
    const totalGeral = lista.reduce((a, x) => a + x.qtd, 0) || 1;
    return `
      <div class="card card--flush">
        <h3 class="card__title" style="padding:20px 24px 0">${titulo}</h3>
        <div class="table-wrap" style="margin-top:12px"><table class="table">
          <thead><tr><th>Nome</th><th class="num">Total</th><th class="num">Média/dia</th></tr></thead>
          <tbody>${lista.slice(0, 8).map((x, i) => `
            <tr>
              <td style="width:55%">
                <div class="cell-title">${link && !String(x.id).startsWith('nome:') && x.id !== '—' ? `<a class="hist-link" href="${link(x.id)}" data-close>${esc(x.nome)}</a>` : esc(x.nome)}</div>
                <div class="bar-track" style="margin:6px 0 4px;height:6px"><div class="bar-fill" style="width:${(x.qtd / max) * 100}%"></div></div>
                <div class="cell-sub">${i === 0 ? '<b class="text-warn">maior uso</b> · ' : ''}${x.vezes} retirada(s) em ${x.dias.size} dia(s)</div>
              </td>
              <td class="num nowrap"><b>${num(x.qtd)}</b> <span class="muted">${esc(un)}</span><div class="cell-sub">${num((x.qtd / totalGeral) * 100, 0)}% do total</div></td>
              <td class="num nowrap"><b>${num(x.mediaDia, 2)}</b><div class="cell-sub" title="média só nos dias em que retirou">${num(x.mediaDiaUso, 1)} por dia de uso</div></td>
            </tr>`).join('')}
          </tbody></table></div>
      </div>`;
  }

  function corpo(p) {
    const r = calcular(p, periodoAtual);
    const un = p.unidade;
    const stat = (label, valor, hint, cls) => `<div class="card" style="padding:16px"><p class="stat__label">${label}</p><div class="stat__value ${cls || ''}" style="font-size:22px">${valor}</div>${hint ? `<div class="stat__hint">${hint}</div>` : ''}</div>`;
    const duracaoTxt = r.duracao === null ? '—' : r.duracao < 1 ? 'menos de 1 dia' : `~${num(Math.floor(r.duracao), 0)} dias`;
    const alertaDur = r.duracao !== null && r.duracao < 7;
    return `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px">
        ${catBadge(p.categoriaId)}${p.codigo ? `<span class="badge">${esc(p.codigo)}</span>` : ''}${badgeEstoque(p)}
        <span class="muted" style="font-size:13px">cadastrado em ${data(r.cadastro)}</span>
        <span style="flex:1"></span>
        <div class="segmented" role="tablist" aria-label="Período">${PERIODOS.map((x) => `<button type="button" data-periodo="${x.id}" class="${x.id === periodoAtual ? 'is-active' : ''}">${x.nome}</button>`).join('')}</div>
      </div>

      <div class="grid grid-4" style="gap:12px;margin-bottom:16px">
        ${stat('Uso médio por dia', `${num(r.media, 2)} <small class="muted" style="font-size:13px">${esc(un)}</small>`, `${num(r.total)} ${esc(un)} em ${r.dias} dia(s)`)}
        ${stat('Dias com retirada', `${r.diasComUso} <small class="muted" style="font-size:13px">de ${r.dias}</small>`, r.pico.data ? `pico: ${num(r.pico.qtd)} ${esc(un)} em ${data(r.pico.data)}` : 'sem retiradas')}
        ${stat('Estoque atual', `${num(p.quantidade)} <small class="muted" style="font-size:13px">${esc(un)}</small>`, `mínimo ${num(Store.minimoDe(p))} · ${r.entradas.length} entrada(s) no período`)}
        ${stat('Estoque dura', duracaoTxt, r.duracao === null ? 'sem consumo no período' : 'no ritmo de uso atual', alertaDur ? 'text-danger' : '')}
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card__head"><h3 class="card__title">Uso ${r.semanal ? 'por semana' : 'por dia'}</h3><span class="muted" style="font-size:13px">${data(r.inicio)} a ${data(Store.hoje())}</span></div>
        ${grafico(r, un)}
      </div>

      <div class="grid grid-2" style="gap:16px;margin-bottom:16px">
        ${ranking(r.porFuncionario, un, 'Quem mais retira', 'Nenhuma retirada no período.', (id) => `#/historico?funcionario=${id}`)}
        ${ranking(r.porLocal, un, 'Onde mais é usado', 'Nenhuma retirada no período.', (id) => `#/historico?local=${id}`)}
      </div>

      <div class="card">
        <div class="card__head"><h3 class="card__title">Últimas movimentações</h3><a class="btn btn-ghost btn-sm" href="#/historico?produto=${p.id}" data-close>Ver histórico completo</a></div>
        ${r.movs.length ? `<div class="list">${[...r.movs].sort(Store.compararMov).slice(0, 8).map(movItem).join('')}</div>` : empty('Nenhuma movimentação.', true)}
      </div>`;
  }

  function abrir(id) {
    const p = Store.produto(id);
    if (!p) return;
    const m = openModal({
      title: p.nome,
      wide: true,
      body: `<div data-detalhe>${corpo(p)}</div>`,
      footer: `
        <button class="btn btn-outline" data-act="editar" style="margin-right:auto">${icon('edit', 'i-sm')}Editar</button>
        <button class="btn btn-outline" data-act="entrada">${icon('in', 'i-sm')}Entrada</button>
        <button class="btn btn-primary" data-act="saida">${icon('out', 'i-sm')}Saída</button>`,
    });
    m.el.querySelector('.modal').classList.add('modal--xl');
    const box = m.el.querySelector('[data-detalhe]');
    const ligar = () => box.querySelectorAll('[data-periodo]').forEach((b) => b.addEventListener('click', () => {
      periodoAtual = b.dataset.periodo;
      box.innerHTML = corpo(Store.produto(id));
      box.querySelectorAll('[data-close]').forEach((a) => a.addEventListener('click', m.close));
      ligar();
    }));
    ligar();
    m.el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      m.close();
      if (b.dataset.act === 'editar') Pages.produtos.abrirForm(Store.produto(id));
      else Pages.produtos.abrirMovimento({ tipo: b.dataset.act, produtoId: id });
    }));
  }

  Pages.produtoDetalhe = { abrir, calcular };
})();
