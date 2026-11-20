(function () {
  const { icon, esc, toast, confirm, download } = UI;

  function render(root) {
    const s = Store.state.settings;
    const pend = s.alteracoesDesdeBackup || 0;
    root.innerHTML = `
      <div class="settings">
        <div class="card">
          <h3 class="card__title">Obra</h3>
          <p class="desc">Nome exibido no menu e no topo dos relatórios impressos.</p>
          <div class="field"><label for="s-obra">Nome da obra</label><input class="input" id="s-obra" maxlength="100" value="${esc(s.obraNome)}" data-obra ${Nuvem.podeGerenciarObra(App.obras.find((o) => o.id === Nuvem.obraAtual)) ? '' : 'readonly'} placeholder="Ex.: Residencial Jardins"></div>
        </div>

        <div class="card">
          <h3 class="card__title">Gestão de Dados</h3>
          <p class="desc">Os dados da obra ficam no servidor e são os mesmos em todos os aparelhos. O backup é uma cópia extra de segurança, guardada no seu computador.${pend ? ` <b class="text-warn">${pend} alteração(ões) neste aparelho desde o último backup.</b>` : ''}</p>
          <div class="btn-row">
            <button class="btn btn-primary" data-backup>${icon('download', 'i-sm')}Baixar backup completo</button>
            <button class="btn btn-outline" data-restore>${icon('upload', 'i-sm')}Restaurar backup</button>
            <input type="file" accept=".json,application/json" hidden data-restore-file>
          </div>
          <div style="border-top:1px solid var(--border);margin:20px 0 16px"></div>
          <p class="desc" style="margin-bottom:12px">Planilha de produtos (CSV, abre no Excel). Colunas: nome; codigo; unidade; categoria; quantidade; minimo; descricao.</p>
          <div class="btn-row">
            <button class="btn btn-outline" data-csv-out>${icon('download', 'i-sm')}Exportar CSV</button>
            <button class="btn btn-outline" data-csv-in>${icon('upload', 'i-sm')}Importar CSV</button>
            <input type="file" accept=".csv,text/csv" hidden data-csv-file>
          </div>
        </div>

        <div class="card">
          <h3 class="card__title">Aparência</h3>
          <p class="desc">Alternar entre modo claro e escuro. Vale só para este aparelho.</p>
          <div class="segmented">
            <button data-tema="claro" class="${s.tema !== 'escuro' ? 'is-active' : ''}">${icon('sun', 'i-sm')}Claro</button>
            <button data-tema="escuro" class="${s.tema === 'escuro' ? 'is-active' : ''}">${icon('moon', 'i-sm')}Escuro</button>
          </div>
        </div>

        <div class="card">
          <h3 class="card__title">Preferências de Exibição</h3>
          <p class="desc">Valem só para este aparelho.</p>
          ${toggle('mostrarAlertas', 'Mostrar estoque baixo no painel', s.mostrarAlertas)}
          ${toggle('mostrarMovRecentes', 'Mostrar movimentações recentes no painel', s.mostrarMovRecentes)}
          ${toggle('tabelaCompacta', 'Tabelas compactas', s.tabelaCompacta)}
        </div>

        <div class="grid grid-2">
          <div class="card">
            <h3 class="card__title">Estoque Mínimo Padrão</h3>
            <p class="desc">Vale para produtos sem mínimo próprio, em todos os aparelhos.</p>
            <div class="input-suffix"><input class="input" type="number" min="0" step="any" value="${esc(s.estoqueMinimoPadrao)}" data-min aria-label="Estoque mínimo padrão"><span>unidades</span></div>
          </div>
          <div class="card">
            <h3 class="card__title">Lembrete de Backup</h3>
            <p class="desc">Avisar depois de quantas alterações. 0 desativa.</p>
            <div class="input-suffix"><input class="input" type="number" min="0" step="1" value="${esc(s.lembreteBackup)}" data-lembrete aria-label="Lembrete de backup"><span>alterações</span></div>
          </div>
        </div>

        <div class="card danger-card">
          <h3 class="card__title">Apagar Todos os Dados</h3>
          <p class="desc">Apaga produtos, categorias, locais, funcionários e histórico somente de <b>${esc(s.obraNome)}</b>, para todos os aparelhos. As outras obras são preservadas. Baixe um backup antes.</p>
          <div class="btn-row">
            <button class="btn btn-danger" data-zerar>Apagar tudo e começar do zero</button>
          </div>
        </div>
      </div>`;

    const $ = (sel) => root.querySelector(sel);
    $('[data-obra]').addEventListener('change', (e) => { Store.salvarSettings({ obraNome: e.target.value.trim() || 'Minha Obra' }); toast('Nome da obra salvo.'); });
    root.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => Store.salvarSettings({ tema: b.dataset.tema })));
    root.querySelectorAll('[data-toggle]').forEach((c) => c.addEventListener('change', () => Store.salvarSettings({ [c.dataset.toggle]: c.checked })));
    $('[data-min]').addEventListener('change', (e) => Store.salvarSettings({ estoqueMinimoPadrao: Math.max(0, Number(e.target.value) || 0) }));
    $('[data-lembrete]').addEventListener('change', (e) => Store.salvarSettings({ lembreteBackup: Math.max(0, parseInt(e.target.value, 10) || 0) }));

    $('[data-backup]').addEventListener('click', () => {
      const nome = (Store.state.settings.obraNome || 'obra').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
      download(`almoxarife-${nome}-${Store.hoje()}.json`, JSON.stringify(Store.state, null, 2), 'application/json');
      Store.marcarBackupFeito();
      toast('Backup baixado.');
    });
    $('[data-restore]').addEventListener('click', () => $('[data-restore-file]').click());
    $('[data-restore-file]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const dados = JSON.parse(await file.text());
        if (!dados || !Array.isArray(dados.produtos)) throw new Error();
        const ok = await confirm({ title: 'Restaurar backup?', message: `O arquivo tem ${dados.produtos.length} produtos e ${(dados.locais || []).length} locais. <b>Os dados de ${esc(Store.state.settings.obraNome)} serão substituídos em todos os aparelhos.</b> As outras obras serão preservadas.`, confirmText: 'Restaurar', danger: true });
        if (ok) {
          dados.settings = { ...(dados.settings || {}), obraNome: Store.state.settings.obraNome };
          toast('Restaurando backup…');
          Store.substituirTudo(dados).then(() => toast('Backup restaurado para todos os aparelhos.')).catch(() => {});
        }
      } catch (err) { toast('Arquivo de backup inválido.', { error: true }); }
    });

    $('[data-csv-out]').addEventListener('click', exportarCSV);
    $('[data-csv-in]').addEventListener('click', () => $('[data-csv-file]').click());
    $('[data-csv-file]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) importarCSV(await file.text());
    });

    $('[data-zerar]').addEventListener('click', async () => {
      const ok = await confirm({ title: 'Apagar tudo da obra?', message: `Todos os dados de <b>${esc(Store.state.settings.obraNome)}</b> serão apagados para todos os aparelhos. As outras obras serão preservadas. Isso não pode ser desfeito.`, confirmText: 'Continuar', danger: true });
      if (!ok) return;
      const digitado = window.prompt('Para confirmar, digite APAGAR');
      if ((digitado || '').trim().toUpperCase() !== 'APAGAR') { toast('Nada foi apagado.'); return; }
      Store.apagarTudo().then(() => toast('Dados da obra apagados.')).catch(() => {});
    });
  }

  function toggle(key, label, checked) {
    return `<label class="toggle"><span>${esc(label)}</span><span class="switch"><input type="checkbox" data-toggle="${key}" ${checked ? 'checked' : ''}><span></span></span></label>`;
  }

  /* ---------- CSV ---------- */
  function toCSV(linhas) {
    return linhas.map((l) => l.map((v) => {
      const t = String(v === null || v === undefined ? '' : v);
      return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    }).join(';')).join('\r\n');
  }

  function parseCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    const primeira = texto.split(/\r?\n/)[0] || '';
    const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
    const rows = [];
    let row = [], cur = '', q = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (q) {
        if (c === '"' && texto[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        row.push(cur); rows.push(row); row = []; cur = '';
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim() !== ''));
  }

  const numBR = (v) => {
    const t = String(v || '').trim().replace(/[^\d,.-]/g, '');
    if (!t) return 0;
    const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
    return isNaN(n) ? 0 : n;
  };

  function exportarCSV() {
    const linhas = [['nome', 'codigo', 'unidade', 'categoria', 'quantidade', 'minimo', 'descricao']];
    Store.state.produtos.forEach((p) => linhas.push([
      p.nome, p.codigo, p.unidade, (Store.categoria(p.categoriaId) || {}).nome || '',
      String(p.quantidade).replace('.', ','), p.minimo === null || p.minimo === undefined ? '' : String(p.minimo).replace('.', ','), p.descricao,
    ]));
    download(`produtos-${Store.hoje()}.csv`, '﻿' + toCSV(linhas), 'text/csv;charset=utf-8');
  }

  async function importarCSV(texto) {
    const rows = parseCSV(texto);
    if (rows.length < 2) return toast('CSV vazio ou sem cabeçalho.', { error: true });
    const norm = (h) => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const head = rows[0].map(norm);
    const col = (...nomes) => head.findIndex((h) => nomes.includes(h));
    const ix = {
      nome: col('nome', 'produto', 'material', 'descricao do produto', 'name'),
      codigo: col('codigo', 'sku', 'cod'),
      unidade: col('unidade', 'un', 'und', 'unit'),
      categoria: col('categoria', 'category'),
      quantidade: col('quantidade', 'qtd', 'estoque', 'quantity'),
      minimo: col('minimo', 'estoque minimo', 'nivel de recompra', 'reorder level'),
      descricao: col('descricao', 'observacao', 'description'),
    };
    if (ix.nome < 0) return toast('O CSV precisa de uma coluna "nome".', { error: true });
    const dados = rows.slice(1).map((r) => ({
      nome: (r[ix.nome] || '').trim(),
      codigo: ix.codigo >= 0 ? (r[ix.codigo] || '').trim() : '',
      unidade: ix.unidade >= 0 ? (r[ix.unidade] || '').trim() || 'un' : 'un',
      categoria: ix.categoria >= 0 ? (r[ix.categoria] || '').trim() : '',
      quantidade: ix.quantidade >= 0 ? numBR(r[ix.quantidade]) : 0,
      minimo: ix.minimo >= 0 && String(r[ix.minimo] || '').trim() !== '' ? numBR(r[ix.minimo]) : null,
      descricao: ix.descricao >= 0 && ix.descricao !== ix.nome ? (r[ix.descricao] || '').trim() : '',
    })).filter((d) => d.nome);

    const existentes = Store.state.produtos;
    const atualizar = dados.filter((d) => existentes.some((p) => (d.codigo && p.codigo === d.codigo) || p.nome.toLowerCase() === d.nome.toLowerCase())).length;
    const ok = await confirm({
      title: 'Importar CSV?',
      message: `${dados.length} produto(s) encontrados: <b>${dados.length - atualizar}</b> novos e <b>${atualizar}</b> já cadastrados (serão atualizados pelo código ou nome). Categorias que não existem serão criadas.`,
      confirmText: 'Importar',
    });
    if (!ok) return;

    dados.forEach((d) => {
      let catId = null;
      if (d.categoria) {
        let c = Store.state.categorias.find((x) => x.nome.toLowerCase() === d.categoria.toLowerCase());
        if (!c) { Store.salvarCategoria({ nome: d.categoria, descricao: '', cor: Store.CORES[Store.state.categorias.length % Store.CORES.length] }); c = Store.state.categorias[Store.state.categorias.length - 1]; }
        catId = c.id;
      }
      const atual = existentes.find((p) => (d.codigo && p.codigo === d.codigo) || p.nome.toLowerCase() === d.nome.toLowerCase());
      const reg = { nome: d.nome, codigo: d.codigo, unidade: d.unidade, quantidade: d.quantidade, minimo: d.minimo, descricao: d.descricao, categoriaId: catId };
      if (atual) Store.salvarProduto(Object.assign({}, atual, reg, { id: atual.id, categoriaId: catId || atual.categoriaId }), { obs: 'Quantidade atualizada por CSV' });
      else Store.salvarProduto(reg, { obs: 'Importado de CSV' });
    });
    toast(`${dados.length} produto(s) importados.`);
  }

  Pages.configuracoes = { render, toCSV, parseCSV };
})();
