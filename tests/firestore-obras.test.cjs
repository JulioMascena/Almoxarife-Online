const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, setDoc, deleteDoc, query, where } = require('firebase/firestore');
const firebaseModule = require('firebase/compat/app');
require('firebase/compat/firestore');
const firebase = firebaseModule.default || firebaseModule;
const projectId = 'demo-almoxarife-obras';
assert(process.env.FIRESTORE_EMULATOR_HOST, 'Run only under the Firestore emulator');
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');

(async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules: fs.readFileSync('firestore.rules', 'utf8') } });
  let app;
  const adapters = [];
  const extraApps = [];
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'config/acesso'), { uid: 'owner', usuario: 'equipe' });
      await setDoc(doc(ctx.firestore(), 'config/permissoes'), { adminEmails: ['admin@example.com', 'admin2@example.com'] });
      await setDoc(doc(ctx.firestore(), 'empresas/empresa-inicial'), { nome: 'Empresa inicial', responsavelEmail: 'dono-inicial@example.com', criadoEm: Date.now() });
      await setDoc(doc(ctx.firestore(), 'empresas/empresa-a'), { nome: 'Empresa A', responsavelEmail: 'gestor-a@example.com', criadoEm: Date.now() });
      await setDoc(doc(ctx.firestore(), 'empresas/empresa-b'), { nome: 'Empresa B', responsavelEmail: 'gestor-b@example.com', criadoEm: Date.now() });
      await setDoc(doc(ctx.firestore(), 'obras/principal'), { nome: 'Obra original', empresaId: 'empresa-inicial', endereco: '', responsavel: '', usuarios: [], teste: false, criadoEm: Date.now() });
      await setDoc(doc(ctx.firestore(), 'config/geral'), { obraNome: 'Obra original' });
      await setDoc(doc(ctx.firestore(), 'produtos/legado'), { nome: 'Produto existente', quantidade: 10 });
    });
    const owner = env.authenticatedContext('owner', { email: 'admin@example.com', email_verified: true }).firestore();
    const other = env.authenticatedContext('intruder').firestore();
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(anon, 'obras')));
    await assertFails(getDoc(doc(other, 'produtos/legado')));

    app = firebase.initializeApp({ projectId }, 'obras-adapter-test');
    const db = app.firestore();
    db.useEmulator(host, Number(port), { mockUserToken: { sub: 'owner', email: 'admin@example.com', email_verified: true } });
    // Firestore rejects plain objects from another VM realm; retain FieldValue instances.
    function native(value) {
      if (Array.isArray(value)) return Array.from(value, native);
      if (value && value.constructor?.name === 'Object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, native(v)]));
      return value;
    }
    const wrapDb = (database) => ({
      collection: (...args) => {
        const col = database.collection(...args);
        const getRef = col.doc.bind(col);
        col.doc = (...parts) => {
          const ref = getRef(...parts);
          const update = ref.update.bind(ref);
          const set = ref.set.bind(ref);
          ref.update = data => update(native(data));
          ref.set = (data, opts) => opts ? set(native(data), native(opts)) : set(native(data));
          return ref;
        };
        return col;
      },
      enablePersistence: async () => {},
      batch: () => {
        const batch = database.batch();
        return {
          set: (ref, data, opts) => opts ? batch.set(ref, native(data), native(opts)) : batch.set(ref, native(data)),
          update: (ref, data) => batch.update(ref, native(data)),
          delete: ref => batch.delete(ref),
          commit: () => batch.commit(),
        };
      },
    });
    const sdkDb = wrapDb(db);
    const fieldValue = {
      increment: value => firebase.firestore.FieldValue.increment(value),
      arrayUnion: (...values) => firebase.firestore.FieldValue.arrayUnion(...values.map(native)),
      arrayRemove: (...values) => firebase.firestore.FieldValue.arrayRemove(...values.map(native)),
      serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
    };
    async function adapter(id, email = 'admin@example.com', database = sdkDb) {
      const prefs = new Map();
      const ctx = vm.createContext({ console, URLSearchParams, Date, Math, setTimeout, clearTimeout,
        navigator: { onLine: true }, location: { search: id ? '?obra=' + id : '' },
        localStorage: { getItem: k => prefs.get(k), setItem: (k, v) => prefs.set(k, v) },
        fetch: async () => ({ ok: false }), addEventListener: () => {},
        firebase: { initializeApp: () => {}, auth: () => ({}), firestore: Object.assign(() => database, { FieldValue: fieldValue }) } });
      ctx.window = ctx;
      vm.runInContext(fs.readFileSync('js/store.js', 'utf8'), ctx);
      vm.runInContext(fs.readFileSync('js/nuvem.js', 'utf8'), ctx);
      await ctx.Nuvem.iniciar();
      await ctx.Nuvem.conferirAcesso({ email, emailVerified: true, reload: async () => {}, getIdToken: async () => 'emulator-token' });
      adapters.push(ctx.Nuvem);
      return ctx;
    }
    const original = await adapter();
    const aId = await original.Nuvem.criarObra({ nome: 'Obra A', empresaId: 'empresa-a' });
    const bId = await original.Nuvem.criarObra({ nome: 'Obra B', empresaId: 'empresa-b' });
    const a = await adapter(aId), b = await adapter(bId);
    await a.Nuvem.enviar([{ t: 'set', col: 'produtos', id: 'material', dados: { nome: 'Cimento', quantidade: 12 } }]);
    await b.Nuvem.enviar([{ t: 'set', col: 'produtos', id: 'material', dados: { nome: 'Cimento', quantidade: 4 } }]);
    await a.Nuvem.enviar([{ t: 'inc', col: 'produtos', id: 'material', campo: 'quantidade', valor: -2 }, { t: 'movAdd', mov: { id: 'mov1', data: '2026-11-20', tipo: 'saida', produtoId: 'material', quantidade: 2 } }]);
    assert.equal((await getDoc(doc(owner, `obras/${aId}/produtos/material`))).data().quantidade, 10);
    assert.equal((await getDoc(doc(owner, `obras/${bId}/produtos/material`))).data().quantidade, 4);
    assert.equal((await getDoc(doc(owner, 'produtos/legado'))).data().quantidade, 10);
    assert.equal((await getDocs(collection(owner, `obras/${bId}/movimentos`))).size, 0);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('listener timeout')), 15000);
      const seen = {};
      a.Nuvem.ouvir((type, value) => {
        seen[type] = value;
        if (type === 'pronto') {
          try { assert.equal(seen.produtos.length, 1); assert.equal(seen.produtos[0].quantidade, 10); assert.equal(seen.movimentos.length, 1); clearTimeout(timer); resolve(); } catch (error) { clearTimeout(timer); reject(error); }
        }
      });
    });
    a.Nuvem.pararDeOuvir();
    await a.Nuvem.substituirTudo({ produtos: [{ id: 'material' }], movimentos: [{ data: '2026-11-20' }] }, { categorias: [], produtos: [], funcionarios: [], locais: [], movimentos: [], settings: { obraNome: 'Obra A restaurada', estoqueMinimoPadrao: 5 } });
    assert.equal((await getDoc(doc(owner, `obras/${aId}/produtos/material`))).exists(), false);
    assert.equal((await getDoc(doc(owner, `obras/${bId}/produtos/material`))).data().quantidade, 4);
    assert.equal((await getDoc(doc(owner, 'produtos/legado'))).data().quantidade, 10);
    assert.equal((await getDoc(doc(owner, 'obras/' + aId))).data().nome, 'Obra A restaurada');
    assert.equal(a.Nuvem.status.ocupado, false);
    const managerApp = firebase.initializeApp({ projectId }, 'company-manager-adapter-test');
    extraApps.push(managerApp);
    managerApp.firestore().useEmulator(host, Number(port), { mockUserToken: { sub: 'manager-a', email: 'gestor-a@example.com', email_verified: true } });
    const manager = await adapter(aId, 'gestor-a@example.com', wrapDb(managerApp.firestore()));
    assert.equal(manager.Nuvem.perfil.admin, false);
    assert.deepEqual(Array.from(manager.Nuvem.perfil.empresaIds), ['empresa-a']);
    const managedId = await manager.Nuvem.criarObra({ nome: 'Nova obra da Empresa A', empresaId: 'empresa-a' });
    assert.equal((await getDoc(doc(owner, 'obras/' + managedId))).data().empresaId, 'empresa-a');
    await manager.Nuvem.salvarObra(managedId, { nome: 'Obra gerenciada', empresaId: 'empresa-a', endereco: 'Rua A', responsavel: 'Gestor A' });
    await manager.Nuvem.alterarAcesso(managedId, 'colaborador@example.com', true);
    assert((await getDoc(doc(owner, 'obras/' + managedId))).data().usuarios.includes('colaborador@example.com'));
    await assert.rejects(manager.Nuvem.criarEmpresa({ nome: 'Escalada', responsavelEmail: 'gestor-a@example.com' }));
    await assert.rejects(manager.Nuvem.criarObra({ nome: 'Invadir B', empresaId: 'empresa-b' }));
    await assert.rejects(manager.Nuvem.salvarObra(bId, { nome: 'Invadir B' }));
    await assert.rejects(manager.Nuvem.alterarAcesso(bId, 'gestor-a@example.com', true));
    const managerDb = env.authenticatedContext('manager-a', { email: 'gestor-a@example.com', email_verified: true }).firestore();
    assert.equal((await getDocs(query(collection(managerDb, 'empresas'), where('responsavelEmail', '==', 'gestor-a@example.com')))).size, 1);
    await assertSucceeds(getDocs(query(collection(managerDb, 'obras'), where('empresaId', '==', 'empresa-a'))));
    await assertSucceeds(getDoc(doc(managerDb, 'obras/' + aId)));
    await assertFails(getDoc(doc(managerDb, 'empresas/empresa-b')));
    await assertFails(getDoc(doc(managerDb, 'obras/' + bId)));
    await assertFails(getDoc(doc(managerDb, `obras/${bId}/produtos/material`)));
    await assertFails(setDoc(doc(managerDb, 'empresas/empresa-a'), { responsavelEmail: 'another@example.com' }, { merge: true }));
    await assertFails(setDoc(doc(managerDb, 'obras/' + aId), { empresaId: 'empresa-b' }, { merge: true }));
    await assertFails(setDoc(doc(managerDb, 'empresas/forjada'), { nome: 'Forjada', responsavelEmail: 'gestor-a@example.com', criadoEm: Date.now() }));
    await assertSucceeds(setDoc(doc(managerDb, 'empresas/empresa-a'), { nome: 'Empresa A atualizada' }, { merge: true }));
    const companyId = await original.Nuvem.criarEmpresa({ nome: 'Empresa criada pelo admin', responsavelEmail: 'Gestor-Novo@Example.com' });
    assert.equal((await getDoc(doc(owner, 'empresas/' + companyId))).data().responsavelEmail, 'gestor-novo@example.com');
    await original.Nuvem.salvarEmpresa('empresa-a', { nome: 'Empresa A transferida', responsavelEmail: 'gestor-novo@example.com' });
    await assertFails(getDoc(doc(managerDb, 'obras/' + managedId)));
    await assertFails(setDoc(doc(managerDb, `obras/${managedId}/produtos/apos-revogacao`), { nome: 'Negado', quantidade: 1 }));
    assert.equal((await getDocs(query(collection(managerDb, 'empresas'), where('responsavelEmail', '==', 'gestor-a@example.com')))).size, 0);
    await original.Nuvem.salvarObra(bId, { nome: 'Obra B atualizada', endereco: 'Rua 2', responsavel: 'Maria' });
    assert.equal((await getDoc(doc(owner, `obras/${bId}/config/geral`))).data().obraNome, 'Obra B atualizada');
    await original.Nuvem.criarObra({ nome: 'Obra teste', empresaId: 'empresa-inicial' }, true);
    assert.equal((await getDocs(collection(owner, 'obras/teste/produtos'))).size, 20);
    assert.equal((await getDocs(collection(owner, 'obras/teste/locais'))).size, 27);
    const member = env.authenticatedContext('member', { email: 'member@example.com', email_verified: true }).firestore();
    const unverified = env.authenticatedContext('unverified', { email: 'member@example.com', email_verified: false }).firestore();
    const fakeAdmin = env.authenticatedContext('fake-admin', { email: 'admin@example.com', email_verified: false }).firestore();
    const secondAdmin = env.authenticatedContext('admin2', { email: 'admin2@example.com', email_verified: true }).firestore();
    const legacyUser = env.authenticatedContext('owner').firestore();
    const assigned = () => getDocs(query(collection(member, 'obras'), where('usuarios', 'array-contains', 'member@example.com')));
    assert.equal((await assigned()).size, 0);
    await original.Nuvem.alterarAcesso(bId, 'Member@Example.com', true);
    await original.Nuvem.alterarAcesso(bId, 'member@example.com', true);
    assert.equal((await assigned()).size, 1);
    assert.equal((await getDoc(doc(owner, 'obras/' + bId))).data().usuarios.length, 1);
    await assertSucceeds(getDoc(doc(member, `obras/${bId}/produtos/material`)));
    await assertSucceeds(setDoc(doc(member, `obras/${bId}/produtos/novo`), { nome: 'Material do membro', quantidade: 1 }));
    await assertSucceeds(getDocs(collection(secondAdmin, 'obras')));
    await assertFails(getDocs(collection(member, 'obras')));
    await assertFails(getDoc(doc(member, `obras/${aId}/config/geral`)));
    await assertFails(getDoc(doc(member, 'produtos/legado')));
    await assertFails(getDoc(doc(unverified, `obras/${bId}/produtos/material`)));
    await assertFails(getDoc(doc(fakeAdmin, `obras/${bId}/produtos/material`)));
    await assertFails(getDoc(doc(legacyUser, 'produtos/legado')));
    await assertFails(setDoc(doc(member, 'config/permissoes'), { adminEmails: ['member@example.com'] }));
    await assertFails(setDoc(doc(secondAdmin, 'config/permissoes'), { adminEmails: ['member@example.com'] }));
    await assertFails(setDoc(doc(member, 'obras/' + bId), { usuarios: ['member@example.com', 'other@example.com'] }, { merge: true }));
    await assertFails(setDoc(doc(member, 'obras/nova'), { nome: 'Self-assigned work', usuarios: ['member@example.com'] }));
    await assertFails(setDoc(doc(member, `obras/${bId}/config/geral`), { obraNome: 'Rename denied' }, { merge: true }));
    await assertSucceeds(setDoc(doc(member, `obras/${bId}/config/geral`), { estoqueMinimoPadrao: 8 }, { merge: true }));
    await original.Nuvem.alterarAcesso('principal', 'member@example.com', true);
    await assertSucceeds(getDoc(doc(member, 'produtos/legado')));
    await original.Nuvem.alterarAcesso('principal', 'member@example.com', false);
    await assertFails(getDoc(doc(member, 'produtos/legado')));
    await original.Nuvem.alterarAcesso(bId, 'member@example.com', false);
    assert.equal((await assigned()).size, 0);
    await assertFails(getDoc(doc(member, `obras/${bId}/produtos/material`)));
    await assertFails(setDoc(doc(member, `obras/${bId}/produtos/novo`), { quantidade: 99 }, { merge: true }));
    await assert.rejects(original.Nuvem.criarObra({ nome: 'Obra teste', empresaId: 'empresa-inicial' }, true), /permission/i);
    assert.equal((await getDocs(collection(owner, 'obras/teste/produtos'))).size, 20);
    await assertFails(getDoc(doc(other, 'obras/teste')));
    await assertFails(getDocs(collection(other, 'obras/teste/produtos')));
    await assertFails(setDoc(doc(other, 'obras/teste/produtos/invasor'), { quantidade: 99 }));
    await assertFails(setDoc(doc(owner, 'obras/sem-cadastro/produtos/solto'), { quantidade: 99 }));
    await assertFails(setDoc(doc(owner, 'obras/teste/config/acesso'), { uid: 'intruder' }));
    await assertFails(deleteDoc(doc(owner, 'obras/teste')));
    await assertFails(setDoc(doc(owner, 'obras/principal'), { nome: 'Duplicada', endereco: '', responsavel: '', teste: false, criadoEm: Date.now() }));
    await assertSucceeds(getDoc(doc(owner, 'produtos/legado')));
    console.log('PASS: real adapters isolate reads, writes, history, backup restoration and seed data; rules reject unauthorized access and invalid scopes; legacy data intact.');
  } finally {
    adapters.forEach(a => { a.pararDeOuvir(); a.pararObras(); });
    if (app) { await app.firestore().terminate(); await app.delete(); }
    for (const extra of extraApps) { await extra.firestore().terminate(); await extra.delete(); }
    await env.cleanup();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
