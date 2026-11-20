/* Dados do app: a obra fica no Firestore (sincronizada entre todos os aparelhos, ver nuvem.js).
   Cada mudança de estoque vira um registro em `movimentos`, que é o histórico:
   cadastro, entrada, saida, ajuste e exclusao. */
(function () {

  const TIPOS_LOCAL = [
    { id: 'apartamento', nome: 'Apartamento', icon: 'door' },
    { id: 'area-comum', nome: 'Área comum', icon: 'users' },
    { id: 'garagem', nome: 'Garagem / Estacionamento', icon: 'car' },
    { id: 'almoxarifado', nome: 'Almoxarifado', icon: 'box' },
    { id: 'externa', nome: 'Fachada / Área externa', icon: 'building' },
    { id: 'outro', nome: 'Outro', icon: 'pin' },
  ];

  const STATUS_LOCAL = [
    { id: 'nao-iniciado', nome: 'Não iniciado', badge: '' },
    { id: 'em-andamento', nome: 'Em andamento', badge: 'badge-warn' },
    { id: 'concluido', nome: 'Concluído', badge: 'badge-ok' },
  ];

  const TIPOS_MOV = {
    cadastro: { nome: 'Cadastro', badge: 'badge-primary', icon: 'plus', cls: 'cad' },
    entrada: { nome: 'Entrada', badge: 'badge-ok', icon: 'in', cls: 'in' },
    saida: { nome: 'Saída', badge: 'badge-warn', icon: 'out', cls: 'out' },
    ajuste: { nome: 'Ajuste', badge: 'badge-info', icon: 'adj', cls: 'adj' },
    exclusao: { nome: 'Exclusão', badge: 'badge-danger', icon: 'trash', cls: 'del' },
  };

  const FUNCOES = ['Mestre de obras', 'Encarregado', 'Pedreiro', 'Servente', 'Eletricista', 'Encanador', 'Carpinteiro', 'Armador', 'Azulejista', 'Gesseiro', 'Pintor', 'Serralheiro', 'Almoxarife', 'Técnico de segurança', 'Engenheiro'];

  const UNIDADES = ['un', 'saco', 'kg', 'm', 'm²', 'm³', 'L', 'lata', 'galão', 'caixa', 'rolo', 'barra', 'peça', 'par', 'milheiro'];
  const CORES = ['#4b6c5f', '#55868b', '#58729d', '#8b6bb1', '#c2410c', '#d97706', '#b91c1c', '#0f766e', '#4d7c0f', '#6b7280'];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function isoDe(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function hoje(offsetDias) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDias || 0));
    return isoDe(d);
  }

  function defaultSettings() {
    return {
      obraNome: 'Minha Obra',
      tema: 'claro',
      estoqueMinimoPadrao: 5,
      lembreteBackup: 30,
      alteracoesDesdeBackup: 0,
      mostrarAlertas: true,
      mostrarMovRecentes: true,
      tabelaCompacta: false,
    };
  }

  function vazio() {
    return { version: 3, settings: defaultSettings(), categorias: [], produtos: [], locais: [], funcionarios: [], movimentos: [] };
  }

  /* ---------- Dados de exemplo (obra residencial) ---------- */
  function exemplo() {
    const s = vazio();
    s.settings.obraNome = 'Residencial Exemplo';
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    const cat = (nome, descricao, cor) => { const c = { id: uid(), nome, descricao, cor }; s.categorias.push(c); return c.id; };
    const C = {
      alv: cat('Alvenaria e Estrutura', 'Cimento, areia, blocos, aço', '#4b6c5f'),
      hid: cat('Hidráulica', 'Tubos, conexões, registros', '#58729d'),
      ele: cat('Elétrica', 'Fios, eletrodutos, caixas, disjuntores', '#d97706'),
      aca: cat('Acabamento', 'Pisos, revestimentos, argamassas, rejuntes', '#8b6bb1'),
      pin: cat('Pintura', 'Tintas, massas, seladores, lixas', '#55868b'),
      epi: cat('EPI e Ferramentas', 'Equipamentos de proteção e consumíveis', '#b91c1c'),
    };

    // [nome, código, unidade, categoria, estoque inicial, mínimo, retirada típica]
    const base = [
      ['Cimento CP-II 50kg', 'ALV-001', 'saco', C.alv, 150, 40, 12],
      ['Areia média lavada', 'ALV-002', 'm³', C.alv, 12, 4, 1],
      ['Bloco cerâmico 14x19x29', 'ALV-003', 'milheiro', C.alv, 6, 2, 1],
      ['Vergalhão CA-50 10mm', 'ALV-004', 'barra', C.alv, 80, 30, 10],
      ['Tubo PVC soldável 25mm', 'HID-001', 'barra', C.hid, 90, 20, 6],
      ['Joelho 90° PVC 25mm', 'HID-002', 'un', C.hid, 300, 100, 20],
      ['Registro de gaveta 3/4"', 'HID-003', 'un', C.hid, 30, 12, 3],
      ['Fio flexível 2,5mm² (100m)', 'ELE-001', 'rolo', C.ele, 25, 8, 2],
      ['Eletroduto corrugado 3/4" (50m)', 'ELE-002', 'rolo', C.ele, 35, 10, 3],
      ['Caixa 4x2 embutir', 'ELE-003', 'un', C.ele, 400, 150, 25],
      ['Disjuntor DIN 20A', 'ELE-004', 'un', C.ele, 40, 20, 8],
      ['Porcelanato 60x60 acetinado', 'ACA-001', 'm²', C.aca, 600, 150, 45],
      ['Argamassa AC-III 20kg', 'ACA-002', 'saco', C.aca, 120, 60, 10],
      ['Rejunte flexível 1kg cinza', 'ACA-003', 'un', C.aca, 60, 40, 6],
      ['Tinta acrílica fosca branca 18L', 'PIN-001', 'lata', C.pin, 20, 6, 2],
      ['Massa corrida PVA 25kg', 'PIN-002', 'lata', C.pin, 40, 10, 3],
      ['Lixa para massa nº 150', 'PIN-003', 'un', C.pin, 250, 100, 20],
      ['Luva de raspa (par)', 'EPI-001', 'par', C.epi, 40, 20, 4],
      ['Capacete de segurança', 'EPI-002', 'un', C.epi, 15, 10, 2],
      ['Disco de corte diamantado 110mm', 'EPI-003', 'un', C.epi, 20, 8, 2],
    ];

    const loc = (nome, tipo, pavimento, status) => {
      const l = { id: uid(), nome, tipo, pavimento: pavimento || '', bloco: '', status: status || 'nao-iniciado', obs: '' };
      s.locais.push(l); return l;
    };
    loc('Almoxarifado central', 'almoxarifado', 'Térreo', 'em-andamento');
    const L = [
      loc('Apto 1901', 'apartamento', '19', 'em-andamento'),
      loc('Apto 1902', 'apartamento', '19', 'em-andamento'),
      loc('Apto 1903', 'apartamento', '19', 'nao-iniciado'),
      loc('Apto 1301', 'apartamento', '13', 'concluido'),
      loc('Apto 1302', 'apartamento', '13', 'em-andamento'),
      loc('Apto 1303', 'apartamento', '13', 'em-andamento'),
      loc('Salão de festas', 'area-comum', 'Térreo', 'em-andamento'),
      loc('Hall de entrada', 'area-comum', 'Térreo', 'nao-iniciado'),
      loc('Academia', 'area-comum', '1', 'nao-iniciado'),
      loc('Estacionamento G1', 'garagem', 'Subsolo 1', 'concluido'),
      loc('Estacionamento G2', 'garagem', 'Subsolo 2', 'em-andamento'),
      loc('Fachada norte', 'externa', '', 'em-andamento'),
    ];

    const func = (nome, funcao) => {
      const f = { id: uid(), nome, funcao, ativo: true, obs: '' };
      s.funcionarios.push(f); return f;
    };
    const F = [
      func('Carlos Silva', 'Mestre de obras'),
      func('Joana Souza', 'Eletricista'),
      func('Paulo Lima', 'Encanador'),
      func('Ricardo Alves', 'Azulejista'),
      func('Marcos Pereira', 'Pintor'),
      func('Antônio Rocha', 'Pedreiro'),
      func('Bruno Costa', 'Servente'),
    ];
    const quando = (dias) => Date.now() - dias * 86400000 + Math.floor((rnd() - 0.5) * 6 * 3600000);
    const reg = (p, tipo, quantidade, dias, extra) => {
      s.movimentos.push(Object.assign({
        id: uid(), produtoId: p.id, produtoNome: p.nome, unidade: p.unidade, tipo, quantidade,
        localId: null, responsavel: '', obs: '', data: hoje(-dias), criadoEm: quando(dias),
      }, extra || {}));
    };

    // Simulação dia a dia: cadastro há ~115 dias, saídas para os locais e reposições.
    base.forEach(([nome, codigo, unidade, categoriaId, inicial, minimo, lote], i) => {
      const dias0 = 115 - (i % 5);
      const p = { id: uid(), nome, codigo, unidade, categoriaId, quantidade: inicial, minimo, descricao: '', criadoEm: quando(dias0) };
      s.produtos.push(p);
      reg(p, 'cadastro', inicial, dias0, { responsavel: 'Almoxarife', obs: 'Estoque inicial' });
      for (let d = dias0 - 2; d >= 0; d--) {
        if (rnd() < 0.055) {
          const q = Math.max(1, Math.round(lote * (0.5 + rnd())));
          if (q <= p.quantidade) {
            p.quantidade -= q;
            const f = F[Math.floor(rnd() * F.length)];
            const destino = L[Math.floor(rnd() * L.length)].id;
            reg(p, 'saida', q, d, { localId: destino, funcionarioId: f.id, responsavel: f.nome });
          }
        }
        if (p.quantidade < minimo && d > 12 && rnd() < 0.12) {
          const q = Math.round(minimo * 1.5);
          p.quantidade += q;
          reg(p, 'entrada', q, d, { responsavel: 'Almoxarife', obs: 'Reposição' });
        }
      }
    });
    s.movimentos.sort((a, b) => b.criadoEm - a.criadoEm);
    return s;
  }

  /* ---------- Estado e sincronização ----------
     Os dados da obra vêm do Firestore (Nuvem). Preferências do aparelho
     (tema, tabela compacta, lembrete de backup) ficam só neste navegador. */
  const PREFS_KEY = 'almoxarife:prefs';
  const COMPARTILHADAS = ['obraNome', 'estoqueMinimoPadrao'];
  let state = vazio();
  const listeners = [];
  let ops = [];

  function lerPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function salvarPrefs() {
    const p = {};
    Object.keys(state.settings).forEach((k) => { if (!COMPARTILHADAS.includes(k)) p[k] = state.settings[k]; });
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* ignora */ }
  }

  function load() {
    state = vazio();
    Object.assign(state.settings, lerPrefs());
  }

  const op = (o) => ops.push(o);
  const avisar = (origem) => listeners.forEach((fn) => fn(state, origem));

  function commit(contarAlteracao) {
    if (contarAlteracao !== false) state.settings.alteracoesDesdeBackup = (state.settings.alteracoesDesdeBackup || 0) + 1;
    salvarPrefs();
    const lote = ops;
    ops = [];
    if (window.Nuvem) Nuvem.enviar(lote).catch(() => {});
    avisar('local');
  }

  /* Chegou dado do servidor (deste ou de outro aparelho) */
  let timerRemoto = null;
  function aplicarRemoto(tipo, dados) {
    if (tipo === 'movimentos') state.movimentos = dados.slice().sort((a, b) => b.criadoEm - a.criadoEm);
    else if (tipo === 'config') COMPARTILHADAS.forEach((k) => { if (dados[k] !== undefined) state.settings[k] = dados[k]; });
    else if (state[tipo]) state[tipo] = dados;
    clearTimeout(timerRemoto);
    timerRemoto = setTimeout(() => avisar('remoto'), 40);
  }

  function normalizar(obj) {
    const s = Object.assign(vazio(), obj || {});
    s.settings = Object.assign(defaultSettings(), (obj && obj.settings) || {}, lerPrefs());
    if (obj && obj.settings) COMPARTILHADAS.forEach((k) => { if (obj.settings[k] !== undefined) s.settings[k] = obj.settings[k]; });
    ['categorias', 'produtos', 'locais', 'funcionarios', 'movimentos'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    // Versões antigas: tira campos de preço e guarda nome/unidade no histórico
    delete s.settings.moeda;
    s.produtos.forEach((p) => { delete p.custo; });
    s.funcionarios.forEach((f) => { delete f.localId; delete f.telefone; });
    s.movimentos.forEach((m) => {
      delete m.custoUnit;
      const p = s.produtos.find((x) => x.id === m.produtoId);
      if (!m.produtoNome) m.produtoNome = p ? p.nome : 'Produto removido';
      if (!m.unidade) m.unidade = p ? p.unidade : '';
    });
    s.version = 3;
    return s;
  }

  /* ---------- Consultas ---------- */
  const byId = (arr, id) => arr.find((x) => x.id === id);
  const categoria = (id) => byId(state.categorias, id);
  const produto = (id) => byId(state.produtos, id);
  const local = (id) => byId(state.locais, id);
  const funcionario = (id) => byId(state.funcionarios, id);

  function minimoDe(p) {
    return p.minimo === null || p.minimo === undefined || p.minimo === '' ? Number(state.settings.estoqueMinimoPadrao) || 0 : Number(p.minimo);
  }
  function statusEstoque(p) {
    if (p.quantidade <= 0) return 'zerado';
    if (p.quantidade <= minimoDe(p)) return 'baixo';
    return 'ok';
  }
  const estoqueBaixo = () => state.produtos.filter((p) => statusEstoque(p) !== 'ok');

  function noPeriodo(m, de, ate) {
    if (de && m.data < de) return false;
    if (ate && m.data > ate) return false;
    return true;
  }

  /* Por local: quantas saídas recebeu e quantos produtos diferentes */
  function saidasPorLocal(de, ate) {
    const map = new Map();
    state.movimentos.forEach((m) => {
      if (m.tipo !== 'saida' || !m.localId || !noPeriodo(m, de, ate)) return;
      const cur = map.get(m.localId) || { saidas: 0, produtos: new Set(), ultima: '' };
      cur.saidas += 1; cur.produtos.add(m.produtoId);
      if (m.data > cur.ultima) cur.ultima = m.data;
      map.set(m.localId, cur);
    });
    return map;
  }

  function produtosPorCategoria() {
    const rows = state.categorias.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor, valor: 0, baixos: 0 }));
    const sem = { id: null, nome: 'Sem categoria', cor: '#9ca3af', valor: 0, baixos: 0 };
    state.produtos.forEach((p) => {
      const r = rows.find((x) => x.id === p.categoriaId) || sem;
      r.valor += 1;
      if (statusEstoque(p) !== 'ok') r.baixos += 1;
    });
    if (sem.valor) rows.push(sem);
    return rows;
  }

  /* Totais de um produto ao longo do histórico */
  function resumoProduto(produtoId) {
    const r = { cadastradoEm: null, inicial: 0, entradas: 0, qtdEntradas: 0, saidas: 0, qtdSaidas: 0, ajustes: 0, ultima: null };
    state.movimentos.forEach((m) => {
      if (m.produtoId !== produtoId) return;
      if (!r.ultima || m.criadoEm > r.ultima.criadoEm) r.ultima = m;
      if (m.tipo === 'cadastro') { r.cadastradoEm = m.data; r.inicial += m.quantidade; }
      else if (m.tipo === 'entrada') { r.entradas += m.quantidade; r.qtdEntradas += 1; }
      else if (m.tipo === 'saida') { r.saidas += m.quantidade; r.qtdSaidas += 1; }
      else if (m.tipo === 'ajuste') r.ajustes += m.quantidade;
    });
    return r;
  }

  /* ---------- Ações ---------- */
  function semId(d) { const c = Object.assign({}, d); delete c.id; return c; }
  function round(n) { return Math.round(n * 1000) / 1000; }

  function horaAgora() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  /* Hora do lançamento: a informada pelo usuário ou, em registros antigos, a hora em que foi salvo */
  function horaDe(m) {
    if (m.hora) return m.hora;
    const d = new Date(m.criadoEm);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  /* Ordem cronológica decrescente: dia, hora e ordem de cadastro */
  function compararMov(a, b) {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    const ha = horaDe(a), hb = horaDe(b);
    if (ha !== hb) return ha < hb ? 1 : -1;
    return b.criadoEm - a.criadoEm;
  }

  function novoMov(p, tipo, quantidade, extra) {
    const m = Object.assign({
      id: uid(), produtoId: p.id, produtoNome: p.nome, unidade: p.unidade, tipo, quantidade: Number(quantidade) || 0,
      localId: null, responsavel: '', obs: '', data: hoje(), hora: horaAgora(), criadoEm: Date.now(),
    }, extra || {});
    state.movimentos.unshift(m);
    op({ t: 'movAdd', mov: m });
  }
  const dadosDoc = (o) => { const d = Object.assign({}, o); delete d.id; return d; };

  function salvarCategoria(dados) {
    let c;
    if (dados.id) { c = categoria(dados.id); Object.assign(c, dados); }
    else { c = Object.assign({}, semId(dados), { id: uid() }); state.categorias.push(c); }
    op({ t: 'set', col: 'categorias', id: c.id, dados: dadosDoc(c) });
    commit();
  }
  function excluirCategoria(id) {
    state.categorias = state.categorias.filter((c) => c.id !== id);
    op({ t: 'del', col: 'categorias', id });
    state.produtos.forEach((p) => {
      if (p.categoriaId === id) { p.categoriaId = null; op({ t: 'update', col: 'produtos', id: p.id, dados: { categoriaId: null } }); }
    });
    commit();
  }

  function salvarProduto(dados, extra) {
    if (dados.id) {
      const p = produto(dados.id);
      const qtdAntiga = Number(p.quantidade) || 0;
      Object.assign(p, dados);
      const diff = round((Number(dados.quantidade) || 0) - qtdAntiga);
      const campos = dadosDoc(p);
      delete campos.quantidade;
      op({ t: 'update', col: 'produtos', id: p.id, dados: campos });
      if (diff !== 0) {
        op({ t: 'inc', col: 'produtos', id: p.id, campo: 'quantidade', valor: diff });
        novoMov(p, 'ajuste', diff, Object.assign({ obs: 'Quantidade corrigida na edição' }, extra || {}));
      }
    } else {
      const p = Object.assign({}, semId(dados), { id: uid(), criadoEm: Date.now() });
      state.produtos.push(p);
      op({ t: 'set', col: 'produtos', id: p.id, dados: dadosDoc(p) });
      novoMov(p, 'cadastro', Number(p.quantidade) || 0, Object.assign({ obs: 'Estoque inicial' }, extra || {}));
    }
    commit();
  }
  function excluirProduto(id) {
    const p = produto(id);
    if (!p) return;
    novoMov(p, 'exclusao', Number(p.quantidade) || 0, { obs: 'Produto excluído do cadastro' });
    state.produtos = state.produtos.filter((x) => x.id !== id);
    op({ t: 'del', col: 'produtos', id });
    commit();
  }

  /* Entrada soma; saída subtrai e exige destino. */
  function aplicarMov(dados) {
    const p = produto(dados.produtoId);
    if (!p) throw new Error('Produto não encontrado');
    const qtd = Number(dados.quantidade);
    if (!(qtd > 0)) throw new Error('Informe uma quantidade maior que zero.');
    if (dados.tipo === 'saida') {
      if (qtd > p.quantidade) throw new Error(`Estoque insuficiente: há ${p.quantidade} ${p.unidade}.`);
      p.quantidade = round(p.quantidade - qtd);
    } else {
      p.quantidade = round(p.quantidade + qtd);
    }
    op({ t: 'inc', col: 'produtos', id: p.id, campo: 'quantidade', valor: dados.tipo === 'saida' ? -qtd : qtd });
    const f = dados.funcionarioId ? funcionario(dados.funcionarioId) : null;
    const l = dados.tipo === 'saida' && dados.localId ? local(dados.localId) : null;
    novoMov(p, dados.tipo, qtd, {
      localId: dados.tipo === 'saida' ? dados.localId || null : null,
      localNome: l ? l.nome : '',
      funcionarioId: f ? f.id : null,
      responsavel: f ? f.nome : dados.responsavel || '', obs: dados.obs || '',
      data: dados.data || hoje(), hora: dados.hora || horaAgora(),
    });
  }
  function registrarMov(dados) {
    aplicarMov(dados);
    commit();
  }
  /* Lote: aplica tudo ou nada (se uma linha falhar, o estoque volta como estava) */
  function registrarLote(lista) {
    const qtds = new Map(state.produtos.map((p) => [p.id, p.quantidade]));
    const nMov = state.movimentos.length;
    const nOps = ops.length;
    try {
      lista.forEach((d) => aplicarMov(Object.assign({}, d, { obs: d.obs || '' })));
    } catch (e) {
      state.produtos.forEach((p) => { p.quantidade = qtds.get(p.id); });
      state.movimentos.splice(0, state.movimentos.length - nMov);
      ops.length = nOps;
      throw e;
    }
    commit();
    return lista.length;
  }

  /* Desfaz um lançamento (entrada, saída ou ajuste) e devolve o estoque. */
  function podeDesfazer(m) {
    return ['entrada', 'saida', 'ajuste'].includes(m.tipo) && !!produto(m.produtoId);
  }
  function excluirMov(id) {
    const m = state.movimentos.find((x) => x.id === id);
    if (!m || !podeDesfazer(m)) return false;
    const p = produto(m.produtoId);
    const delta = m.tipo === 'saida' ? m.quantidade : -m.quantidade;
    if (p.quantidade + delta < 0) throw new Error(`Não dá para desfazer: o estoque de ${p.nome} ficaria negativo.`);
    p.quantidade = round(p.quantidade + delta);
    state.movimentos = state.movimentos.filter((x) => x.id !== id);
    op({ t: 'inc', col: 'produtos', id: p.id, campo: 'quantidade', valor: delta });
    op({ t: 'movDel', mov: m });
    commit();
    return true;
  }

  function salvarLocal(dados) {
    let l;
    if (dados.id) { l = local(dados.id); Object.assign(l, dados); }
    else { l = Object.assign({}, semId(dados), { id: uid() }); state.locais.push(l); }
    op({ t: 'set', col: 'locais', id: l.id, dados: dadosDoc(l) });
    commit();
  }
  function criarLocaisEmLote(lista) {
    lista.forEach((d) => {
      const l = Object.assign({}, semId(d), { id: uid() });
      state.locais.push(l);
      op({ t: 'set', col: 'locais', id: l.id, dados: dadosDoc(l) });
    });
    commit();
  }
  function excluirLocal(id) {
    state.locais = state.locais.filter((x) => x.id !== id);
    op({ t: 'del', col: 'locais', id });
    commit();
  }
  /* O lançamento guarda o nome do local; se o local for excluído, o histórico continua legível */
  function nomeLocal(m) {
    const l = local(m.localId);
    return l ? l.nome : m.localNome ? `${m.localNome} (removido)` : '';
  }

  function salvarFuncionario(dados) {
    let f;
    if (dados.id) { f = funcionario(dados.id); Object.assign(f, dados); }
    else { f = Object.assign({ ativo: true }, semId(dados), { id: uid() }); state.funcionarios.push(f); }
    op({ t: 'set', col: 'funcionarios', id: f.id, dados: dadosDoc(f) });
    commit();
  }
  function excluirFuncionario(id) {
    state.funcionarios = state.funcionarios.filter((f) => f.id !== id);
    op({ t: 'del', col: 'funcionarios', id });
    commit();
  }
  function saidasPorFuncionario(de, ate) {
    const map = new Map();
    state.movimentos.forEach((m) => {
      if (m.tipo !== 'saida' || !m.funcionarioId || !noPeriodo(m, de, ate)) return;
      const cur = map.get(m.funcionarioId) || { saidas: 0, ultima: '', ultimoLocalId: null, ultimoTs: 0 };
      cur.saidas += 1;
      if (m.data > cur.ultima) cur.ultima = m.data;
      const ts = Date.parse(m.data) + (m.criadoEm % 86400000);
      if (m.localId && ts >= cur.ultimoTs) { cur.ultimoTs = ts; cur.ultimoLocalId = m.localId; }
      map.set(m.funcionarioId, cur);
    });
    return map;
  }

  function salvarSettings(parcial, contar) {
    Object.assign(state.settings, parcial);
    const comp = {};
    COMPARTILHADAS.forEach((k) => { if (parcial[k] !== undefined) comp[k] = parcial[k]; });
    if (Object.keys(comp).length) op({ t: 'config', dados: comp });
    commit(contar === true);
  }
  /* Troca todos os dados da obra (para todos os aparelhos) */
  function trocarTudo(novo) {
    const antigo = state;
    state = novo;
    salvarPrefs();
    avisar('local');
    return window.Nuvem ? Nuvem.substituirTudo(antigo, novo) : Promise.resolve();
  }
  function substituirTudo(novo) {
    const s = normalizar(novo);
    s.settings.alteracoesDesdeBackup = 0;
    return trocarTudo(s);
  }
  function resetarExemplo() {
    const s = exemplo();
    Object.assign(s.settings, lerPrefs(), { obraNome: s.settings.obraNome });
    return trocarTudo(s);
  }
  function apagarTudo() {
    const s = vazio();
    Object.assign(s.settings, lerPrefs(), { obraNome: state.settings.obraNome, estoqueMinimoPadrao: state.settings.estoqueMinimoPadrao });
    return trocarTudo(s);
  }
  function marcarBackupFeito() {
    state.settings.alteracoesDesdeBackup = 0;
    commit(false);
  }

  window.Store = {
    TIPOS_LOCAL, STATUS_LOCAL, TIPOS_MOV, UNIDADES, CORES, FUNCOES,
    load, aplicarRemoto, get state() { return state; }, onChange: (fn) => listeners.push(fn),
    uid, hoje, horaAgora, horaDe, compararMov,
    categoria, produto, local, funcionario, nomeLocal, minimoDe, statusEstoque, estoqueBaixo, noPeriodo,
    saidasPorLocal, saidasPorFuncionario, produtosPorCategoria, resumoProduto, podeDesfazer,
    salvarCategoria, excluirCategoria, salvarProduto, excluirProduto, registrarMov, registrarLote, excluirMov,
    salvarLocal, criarLocaisEmLote, excluirLocal, salvarFuncionario, excluirFuncionario, salvarSettings, substituirTudo, resetarExemplo, apagarTudo, marcarBackupFeito,
  };
})();
