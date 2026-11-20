/* Sincronização com o Firebase (Firestore + Authentication).
   Todos os aparelhos leem e gravam no mesmo banco, e cada tela recebe as mudanças na hora.

   Estrutura no Firestore:
     config/geral          nome da obra e estoque mínimo padrão
     categorias/{id}       produtos/{id}       locais/{id}       funcionarios/{id}
     movimentos/{AAAA-MM}  { itens: [ ...movimentações daquele mês ] }
   O estoque de cada produto (produtos/{id}.quantidade) muda com "increment",
   então dois lançamentos ao mesmo tempo nunca se perdem.

   Login: o mesmo acesso único do sistema anterior (ID + senha). */
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
  const DOMINIO_INTERNO = 'usuarios.almoxarife-online.web.app';
  const COMPLEMENTO_SENHA = '@AlmoxOnline';
  const SENHA_MINIMA = 4;
  const COLECOES = ['categorias', 'produtos', 'locais', 'funcionarios'];

  let auth, db, FV;
  let pronto = null;
  const desligar = [];
  const status = { online: navigator.onLine, pendentes: false, ultimoErro: '' };
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
  const normalizarId = (t) => String(t || '').trim().toLowerCase();
  const senhaInterna = (s) => String(s) + COMPLEMENTO_SENHA;
  const refAcesso = () => db.collection('config').doc('acesso');

  function erroAmigavel(e) {
    const c = (e && e.code) || '';
    if (c.includes('wrong-password') || c.includes('invalid-credential') || c.includes('user-not-found') || c.includes('invalid-login')) return 'ID ou senha incorretos.';
    if (c.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    if (c.includes('network')) return 'Sem conexão com a internet.';
    if (c.includes('permission-denied')) return 'Sem permissão para acessar os dados.';
    return (e && e.message) || 'Erro inesperado.';
  }

  async function acessoExiste() {
    return (await refAcesso().get()).exists;
  }

  async function entrar(idDigitado, senha) {
    const id = normalizarId(idDigitado);
    if (!id || !senha) throw new Error('Informe o ID e a senha.');
    const login = await db.collection('logins').doc(id).get();
    if (!login.exists) throw new Error('ID ou senha incorretos.');
    try {
      await auth.signInWithEmailAndPassword(login.data().email, senhaInterna(senha));
    } catch (e) { throw new Error(erroAmigavel(e)); }
  }

  /* Cria o acesso único (só funciona enquanto ainda não existe nenhum) */
  async function criarAcesso(idDigitado, senha) {
    const rotulo = String(idDigitado || '').trim();
    const id = normalizarId(rotulo);
    if (!/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(id) || id.length < 3 || id.length > 30) throw new Error('ID inválido. Use de 3 a 30 letras ou números, sem espaços.');
    if (String(senha || '').length < SENHA_MINIMA) throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    const sufixo = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const email = `${id}.${sufixo}@${DOMINIO_INTERNO}`;
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, senhaInterna(senha));
      const lote = db.batch();
      lote.set(refAcesso(), { uid: cred.user.uid, usuario: id, rotulo, criadoEm: FV.serverTimestamp() });
      lote.set(db.collection('logins').doc(id), { email });
      await lote.commit();
    } catch (e) {
      if (auth.currentUser) await auth.signOut().catch(() => {});
      throw new Error(erroAmigavel(e));
    }
  }

  /* Só o acesso único entra; qualquer outra conta é recusada */
  async function conferirAcesso(user) {
    const snap = await refAcesso().get();
    if (!snap.exists || snap.data().uid !== user.uid) return null;
    return { rotulo: snap.data().rotulo || snap.data().usuario };
  }

  function aoMudarLogin(fn) { return auth.onAuthStateChanged(fn); }
  async function sair() { pararDeOuvir(); await auth.signOut(); }

  /* ---------- Leitura em tempo real ---------- */
  function ouvir(aoReceber) {
    pararDeOuvir();
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
    const erro = (e) => { status.ultimoErro = erroAmigavel(e); avisarStatus(); };

    COLECOES.forEach((col) => {
      desligar.push(db.collection(col).onSnapshot({ includeMetadataChanges: true }, (snap) => {
        aoReceber(col, snap.docs.map((d) => Object.assign({}, d.data(), { id: d.id })));
        marcar(col, snap);
      }, erro));
    });
    desligar.push(db.collection('movimentos').onSnapshot({ includeMetadataChanges: true }, (snap) => {
      const todos = [];
      snap.docs.forEach((d) => (d.data().itens || []).forEach((m) => todos.push(m)));
      aoReceber('movimentos', todos);
      marcar('movimentos', snap);
    }, erro));
    desligar.push(db.collection('config').doc('geral').onSnapshot({ includeMetadataChanges: true }, (snap) => {
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
    const lotes = [];
    let lote = db.batch(), n = 0;
    const novoLote = () => { lotes.push(lote); lote = db.batch(); n = 0; };
    ops.forEach((op) => {
      if (n >= 450) novoLote();
      const ref = op.col ? db.collection(op.col).doc(op.id) : null;
      if (op.t === 'set') lote.set(ref, limpar(op.dados));
      else if (op.t === 'update') lote.set(ref, limpar(op.dados), { merge: true });
      else if (op.t === 'inc') lote.set(ref, { [op.campo]: FV.increment(op.valor) }, { merge: true });
      else if (op.t === 'del') lote.delete(ref);
      else if (op.t === 'movAdd') lote.set(db.collection('movimentos').doc(mesDe(op.mov)), { itens: FV.arrayUnion(limpar(op.mov)) }, { merge: true });
      else if (op.t === 'movDel') lote.set(db.collection('movimentos').doc(mesDe(op.mov)), { itens: FV.arrayRemove(limpar(op.mov)) }, { merge: true });
      else if (op.t === 'config') lote.set(db.collection('config').doc('geral'), limpar(op.dados), { merge: true });
      else if (op.t === 'movMes') lote.set(db.collection('movimentos').doc(op.id), { itens: op.itens.map(limpar) });
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
  }

  window.Nuvem = {
    iniciar, entrar, criarAcesso, acessoExiste, conferirAcesso, aoMudarLogin, sair,
    ouvir, pararDeOuvir, enviar, substituirTudo,
    status, aoMudarStatus: (fn) => ouvintesStatus.push(fn),
  };
})();
