/* Firebase: contas pessoais verificadas e hierarquia Admin -> Empresa -> Obras.
   Empresas: empresas/{id}, com responsavelEmail.
   Obras: obras/{id}, com empresaId e usuarios.
   A obra principal preserva os caminhos de dados legados; as demais usam subcolecoes.
   Estoque continua usando increment e historico mensal para concorrencia. */
(function () {
  // Configuração pública do app web (não é segredo). No Firebase Hosting ela vem de /__/firebase/init.json.
  const CONFIG_PADRAO = {
    apiKey: 'AIzaSyAasWFx1x5DbA99Tzyj-sr-50LA5J1XFbA',
    authDomain: 'almoxarife-online.firebaseapp.com',
    projectId: 'almoxarife-online',
    storageBucket: 'almoxarife-online.firebasestorage.app',
    messagingSenderId: '97339965087',
    appId: '1:97339965087:web:0f2ca8ca6558ef510eecaa',
  };
  let perfil = null;
  const COLECOES = ['categorias', 'produtos', 'locais', 'funcionarios'];
  const obraAtual = new URLSearchParams(location.search).get('obra') || 'principal';
  const baseDados = (id = obraAtual) => id === 'principal' ? db : db.collection('obras').doc(id);
  const desligarCatalogo = [];
  const desligarEmpresas = [];
  let catalogoObras = [];

  let auth, db, FV;
  let pronto = null;
  const desligar = [];
  const status = { online: navigator.onLine, pendentes: false, ocupado: false, ultimoErro: '' };
  const ouvintesStatus = [];

  const avisarStatus = () => ouvintesStatus.forEach((fn) => fn(status));
  window.addEventListener('online', () => { status.online = true; avisarStatus(); });
  window.addEventListener('offline', () => { status.online = false; avisarStatus(); });

  async function iniciar() {
    if (pronto) return pronto;
    pronto = (async () => {
      let config = CONFIG_PADRAO;
      try {
        const r = await fetch('/__/firebase/init.json', { cache: 'no-store' });
        if (r.ok) config = await r.json();
      } catch (e) { /* fora do Firebase Hosting: usa a configuração padrão */ }
      firebase.initializeApp(config);
      auth = firebase.auth();
      db = firebase.firestore();
      FV = firebase.firestore.FieldValue;
      try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* navegador sem cache offline: segue online */ }
    })();
    return pronto;
  }

  /* ---------- Login ---------- */
  const normalizarEmail = (email) => String(email || '').trim().toLowerCase();
  const validarEmail = (valor) => {
    const email = normalizarEmail(valor);
    if (email.length > 254 || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) throw new Error('Informe um e-mail válido.');
    return email;
  };
  const exigirAdmin = () => { if (!perfil?.admin) throw new Error('Somente administradores gerais podem executar esta ação.'); };
  const podeGerenciarEmpresa = (id) => !!perfil && (perfil.admin || perfil.empresaIds.includes(id));
  const podeGerenciarObra = (obra) => !!perfil && (perfil.admin || (!!obra && podeGerenciarEmpresa(obra.empresaId)));
  const exigirGestao = (id) => { if (!podeGerenciarEmpresa(id)) throw new Error('Você não pode gerenciar obras desta empresa.'); };
  const exigirGerente = () => { if (!perfil?.admin && !perfil?.empresaIds?.length) throw new Error('Você não pode gerenciar obras e acessos.'); };

  function erroAmigavel(e) {
    const c = (e && e.code) || '';
    if (c.includes('wrong-password') || c.includes('invalid-credential') || c.includes('user-not-found') || c.includes('invalid-login')) return 'E-mail ou senha incorretos.';
    if (c.includes('email-already-in-use')) return 'Este e-mail já tem uma conta. Entre ou use Esqueci minha senha.';
    if (c.includes('weak-password')) return 'Escolha uma senha com pelo menos 8 caracteres.';
    if (c.includes('invalid-email')) return 'Informe um e-mail válido.';
    if (c.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    if (c.includes('network')) return 'Sem conexão com a internet.';
    if (c.includes('permission-denied')) return 'Sem permissão para acessar os dados.';
    return (e && e.message) || 'Erro inesperado.';
  }

  async function entrar(email, senha) {
    try { await auth.signInWithEmailAndPassword(validarEmail(email), senha); }
    catch (e) { throw new Error(erroAmigavel(e)); }
  }

  async function criarAcesso(email, senha) {
    if (String(senha || '').length < 8) throw new Error('Escolha uma senha com pelo menos 8 caracteres.');
    try {
      const cred = await auth.createUserWithEmailAndPassword(validarEmail(email), senha);
      await cred.user.sendEmailVerification();
    } catch (e) { throw new Error(erroAmigavel(e)); }
  }

  async function reenviarVerificacao() {
    try { await auth.currentUser.sendEmailVerification(); }
    catch (e) { throw new Error(erroAmigavel(e)); }
  }

  async function redefinirSenha(email) {
    try { await auth.sendPasswordResetEmail(validarEmail(email)); }
    catch (e) { if (e.code !== 'auth/user-not-found') throw new Error(erroAmigavel(e)); }
  }

  async function conferirAcesso(user) {
    perfil = null;
    if (normalizarEmail(user.email).endsWith('@usuarios.almoxarife-online.web.app')) return { loginAntigo: true };
    await user.reload();
    if (!user.emailVerified) return { verificarEmail: true, email: user.email };
    await user.getIdToken(true);
    const email = validarEmail(user.email);
    const snap = await db.collection('config').doc('permissoes').get({ source: 'server' });
    if (!snap.exists) throw new Error('A configuração de administradores ainda não foi publicada.');
    const adminEmails = snap.data().adminEmails || [];
    const admin = adminEmails.includes(email);
    const empresas = admin ? null : await db.collection('empresas').where('responsavelEmail', '==', email).get({ source: 'server' });
    perfil = { email, rotulo: email, admin, adminEmails, empresaIds: empresas ? empresas.docs.map((d) => d.id).sort() : [] };
    return perfil;
  }

  function aoMudarLogin(fn) { return auth.onAuthStateChanged(fn); }
  async function sair() { perfil = null; pararDeOuvir(); pararObras(); pararEmpresas(); await auth.signOut(); }

  function pararEmpresas() { while (desligarEmpresas.length) desligarEmpresas.pop()(); }
  function ouvirEmpresas(fn, erro) {
    pararEmpresas();
    const consulta = perfil.admin ? db.collection('empresas') : db.collection('empresas').where('responsavelEmail', '==', perfil.email);
    desligarEmpresas.push(consulta.onSnapshot((snap) => {
      const lista = snap.docs.map((d) => ({ ...d.data(), id: d.id })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      const ids = perfil.admin ? [] : lista.map((e) => e.id).sort();
      const mudouEscopo = !perfil.admin && JSON.stringify(ids) !== JSON.stringify(perfil.empresaIds);
      perfil.empresaIds = ids;
      fn(lista, mudouEscopo);
    }, erro));
  }

  async function criarEmpresa(dados) {
    exigirAdmin();
    const nome = String(dados.nome || '').trim();
    if (!nome || nome.length > 100) throw new Error('Informe o nome da empresa com até 100 caracteres.');
    const id = Store.uid();
    await db.collection('empresas').doc(id).set({ nome, responsavelEmail: validarEmail(dados.responsavelEmail), criadoEm: Date.now() });
    return id;
  }

  async function salvarEmpresa(id, dados) {
    exigirGestao(id);
    const nome = String(dados.nome || '').trim();
    if (!nome || nome.length > 100) throw new Error('Informe o nome da empresa com até 100 caracteres.');
    const novos = { nome };
    if (perfil.admin) novos.responsavelEmail = validarEmail(dados.responsavelEmail);
    await db.collection('empresas').doc(id).update(novos);
  }

  function pararObras() { while (desligarCatalogo.length) desligarCatalogo.pop()(); }
  function ouvirObras(fn, erro) {
    pararObras();
    const consultas = perfil.admin ? [db.collection('obras')] : [
      db.collection('obras').where('usuarios', 'array-contains', perfil.email),
      ...perfil.empresaIds.map((id) => db.collection('obras').where('empresaId', '==', id)),
    ];
    const resultados = new Map();
    consultas.forEach((consulta, i) => desligarCatalogo.push(consulta.onSnapshot((snap) => {
      resultados.set(i, snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      if (resultados.size !== consultas.length) return;
      const unicos = new Map();
      resultados.forEach((docs) => docs.forEach((obra) => unicos.set(obra.id, obra)));
      catalogoObras = [...unicos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      fn(catalogoObras);
    }, erro)));
  }

  async function criarObra(dados, teste = false) {
    if (teste) exigirAdmin();
    exigirGestao(dados.empresaId);
    if (!dados.empresaId) throw new Error('Selecione uma empresa.');
    const nome = String(dados.nome || '').trim();
    if (!nome || nome.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
    const id = teste ? 'teste' : Store.uid();
    const ref = db.collection('obras').doc(id);
    const meta = { nome, endereco: String(dados.endereco || '').trim(), responsavel: String(dados.responsavel || '').trim(), empresaId: dados.empresaId, teste, criadoEm: Date.now(), usuarios: [] };
    const lote = db.batch();
    lote.set(ref, meta);
    const exemplo = teste ? Store.gerarExemplo() : null;
    if (exemplo) {
      COLECOES.forEach((col) => exemplo[col].forEach(({ id: docId, ...valor }) => lote.set(ref.collection(col).doc(docId), valor)));
      const meses = new Map();
      exemplo.movimentos.forEach((m) => { const mes = mesDe(m); if (!meses.has(mes)) meses.set(mes, []); meses.get(mes).push(m); });
      meses.forEach((itens, mes) => lote.set(ref.collection('movimentos').doc(mes), { itens }));
    }
    lote.set(ref.collection('config').doc('geral'), { obraNome: nome, estoqueMinimoPadrao: 5 });
    await lote.commit();
    return id;
  }

  async function salvarObra(id, dados) {
    exigirGerente();
    const atual = await db.collection('obras').doc(id).get({ source: 'server' });
    if (!atual.exists) throw new Error('Obra não encontrada.');
    exigirGestao(atual.data().empresaId);
    if (dados.empresaId && dados.empresaId !== atual.data().empresaId) throw new Error('A empresa da obra não pode ser alterada nesta tela.');
    const nome = String(dados.nome || '').trim();
    if (!nome || nome.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
    const lote = db.batch();
    lote.update(db.collection('obras').doc(id), { nome, endereco: String(dados.endereco || '').trim(), responsavel: String(dados.responsavel || '').trim() });
    lote.set(baseDados(id).collection('config').doc('geral'), { obraNome: nome }, { merge: true });
    await lote.commit();
  }

  async function alterarAcesso(id, email, permitir) {
    exigirGerente();
    const obra = await db.collection('obras').doc(id).get({ source: 'server' });
    if (!obra.exists) throw new Error('Obra não encontrada.');
    exigirGestao(obra.data().empresaId);
    const valor = validarEmail(email);
    const ref = db.collection('obras').doc(id);
    await ref.update({ usuarios: permitir ? FV.arrayUnion(valor) : FV.arrayRemove(valor) });
    return (await ref.get({ source: 'server' })).data().usuarios;
  }

  /* ---------- Leitura em tempo real ---------- */
  function ouvir(aoReceber) {
    pararDeOuvir();
    const base = baseDados();
    const recebidos = new Set();
    const esperando = COLECOES.length + 2;
    const pendentesPor = {};
    let avisouPronto = false;
    const marcar = (chave, snap) => {
      recebidos.add(chave);
      if (snap && snap.metadata) {
        // "Pendente" = gravado neste aparelho, ainda não confirmado pelo servidor
        pendentesPor[chave] = snap.metadata.hasPendingWrites;
        status.pendentes = Object.values(pendentesPor).some(Boolean);
        status.ultimoErro = '';
        avisarStatus();
      }
      if (!avisouPronto && recebidos.size >= esperando) { avisouPronto = true; aoReceber('pronto'); }
    };
    const erro = (e) => { status.ultimoErro = erroAmigavel(e); avisarStatus(); aoReceber('erro', status.ultimoErro); };

    COLECOES.forEach((col) => {
      desligar.push(base.collection(col).onSnapshot({ includeMetadataChanges: true }, (snap) => {
        aoReceber(col, snap.docs.map((d) => Object.assign({}, d.data(), { id: d.id })));
        marcar(col, snap);
      }, erro));
    });
    desligar.push(base.collection('movimentos').onSnapshot({ includeMetadataChanges: true }, (snap) => {
      const todos = [];
      snap.docs.forEach((d) => (d.data().itens || []).forEach((m) => todos.push(m)));
      aoReceber('movimentos', todos);
      marcar('movimentos', snap);
    }, erro));
    desligar.push(base.collection('config').doc('geral').onSnapshot({ includeMetadataChanges: true }, (snap) => {
      aoReceber('config', snap.exists ? snap.data() : {});
      marcar('config', snap);
    }, erro));
  }
  function pararDeOuvir() { while (desligar.length) { try { desligar.pop()(); } catch (e) { /* já desligado */ } } }

  /* ---------- Gravação ---------- */
  const limpar = (o) => JSON.parse(JSON.stringify(o));
  const mesDe = (m) => String(m.data || '').slice(0, 7) || 'sem-data';

  /* ops: lista de { t: 'set'|'update'|'inc'|'del'|'movAdd'|'movDel'|'config', ... } */
  function enviar(ops) {
    if (!ops.length || !db) return Promise.resolve();
    const base = baseDados();
    const lotes = [];
    let lote = db.batch(), n = 0;
    const novoLote = () => { lotes.push(lote); lote = db.batch(); n = 0; };
    ops.forEach((op) => {
      if (n >= 450) novoLote();
      const ref = op.col ? base.collection(op.col).doc(op.id) : null;
      if (op.t === 'set') lote.set(ref, limpar(op.dados));
      else if (op.t === 'update') lote.set(ref, limpar(op.dados), { merge: true });
      else if (op.t === 'inc') lote.set(ref, { [op.campo]: FV.increment(op.valor) }, { merge: true });
      else if (op.t === 'del') lote.delete(ref);
      else if (op.t === 'movAdd') lote.set(base.collection('movimentos').doc(mesDe(op.mov)), { itens: FV.arrayUnion(limpar(op.mov)) }, { merge: true });
      else if (op.t === 'movDel') lote.set(base.collection('movimentos').doc(mesDe(op.mov)), { itens: FV.arrayRemove(limpar(op.mov)) }, { merge: true });
      else if (op.t === 'config') {
        lote.set(base.collection('config').doc('geral'), limpar(op.dados), { merge: true });
        if (podeGerenciarObra(catalogoObras.find((o) => o.id === obraAtual)) && op.dados.obraNome !== undefined) lote.update(db.collection('obras').doc(obraAtual), { nome: op.dados.obraNome });
      }
      else if (op.t === 'movMes') lote.set(base.collection('movimentos').doc(op.id), { itens: op.itens.map(limpar) });
      n++;
    });
    if (n) lotes.push(lote);
    status.pendentes = true;
    avisarStatus();
    return Promise.all(lotes.map((l) => l.commit())).catch((e) => {
      status.ultimoErro = erroAmigavel(e);
      avisarStatus();
      if (window.UI) UI.toast('Não foi possível salvar no servidor: ' + status.ultimoErro, { error: true, duration: 6000 });
      throw e;
    });
  }

  /* Substitui tudo (restaurar backup / apagar tudo): apaga o que existe e grava o novo */
  async function substituirTudo(atual, novo) {
    status.ocupado = true;
    avisarStatus();
    try {
      const ops = [];
      COLECOES.forEach((col) => (atual[col] || []).forEach((x) => ops.push({ t: 'del', col, id: x.id })));
      const mesesAntigos = new Set((atual.movimentos || []).map(mesDe));
      const porMes = new Map();
      (novo.movimentos || []).forEach((m) => { const k = mesDe(m); if (!porMes.has(k)) porMes.set(k, []); porMes.get(k).push(m); });
      mesesAntigos.forEach((k) => { if (!porMes.has(k)) ops.push({ t: 'del', col: 'movimentos', id: k }); });
      // Apaga primeiro, depois grava (lotes separados, na ordem)
      await enviar(ops);
      const novos = [];
      COLECOES.forEach((col) => (novo[col] || []).forEach((x) => { const d = Object.assign({}, x); delete d.id; novos.push({ t: 'set', col, id: x.id, dados: d }); }));
      porMes.forEach((itens, id) => novos.push({ t: 'movMes', id, itens }));
      novos.push({ t: 'config', dados: { obraNome: novo.settings.obraNome, estoqueMinimoPadrao: novo.settings.estoqueMinimoPadrao } });
      await enviar(novos);
    } finally {
      status.ocupado = false;
      avisarStatus();
    }
  }

  window.Nuvem = {
    ouvirEmpresas, pararEmpresas, criarEmpresa, salvarEmpresa, podeGerenciarEmpresa, podeGerenciarObra,
    obraAtual, ouvirObras, pararObras, criarObra, salvarObra, alterarAcesso,
    get perfil() { return perfil; },
    iniciar, entrar, criarAcesso, reenviarVerificacao, redefinirSenha, conferirAcesso, aoMudarLogin, sair,
    ouvir, pararDeOuvir, enviar, substituirTudo,
    status, aoMudarStatus: (fn) => ouvintesStatus.push(fn),
  };
})();
