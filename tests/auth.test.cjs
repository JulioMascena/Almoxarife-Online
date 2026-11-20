const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const calls = [];
  let reads = 0;
  const user = { email: 'admin@example.com', emailVerified: false,
    reload: async () => {}, getIdToken: async refresh => { assert.equal(refresh, true); },
    sendEmailVerification: async () => calls.push('verify') };
  const auth = {
    currentUser: user,
    createUserWithEmailAndPassword: async (email, password) => { calls.push(['signup', email, password]); return { user }; },
    signInWithEmailAndPassword: async (email, password) => calls.push(['signin', email, password]),
    sendPasswordResetEmail: async email => calls.push(['reset', email]),
    signOut: async () => calls.push('signout'),
  };
  const db = { enablePersistence: async () => {}, collection: name => ({ where: () => ({ get: async () => ({ docs: [] }) }), doc: id => ({ get: async () => {
    assert.equal(name, 'config'); assert.equal(id, 'permissoes'); reads++;
    return { exists: true, data: () => ({ adminEmails: ['admin@example.com', 'second@example.com'] }) };
  } }) }) };
  const ctx = vm.createContext({ console, URLSearchParams, navigator: { onLine: true }, location: { search: '' },
    addEventListener: () => {}, fetch: async () => ({ ok: false }),
    firebase: { initializeApp: () => {}, auth: () => auth, firestore: Object.assign(() => db, { FieldValue: {} }) } });
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync('js/nuvem.js', 'utf8'), ctx);
  const api = ctx.Nuvem;
  await api.iniciar();
  await api.entrar(' Admin@Example.com ', 'personal-password');
  assert.deepEqual(calls[0], ['signin', 'admin@example.com', 'personal-password']);
  await api.criarAcesso('Member@Example.com', 'new-password');
  assert.deepEqual(calls[1], ['signup', 'member@example.com', 'new-password']);
  assert.equal(calls[2], 'verify');
  await assert.rejects(api.criarAcesso('member@example.com', 'short'));
  const unverified = await api.conferirAcesso(user);
  assert.equal(unverified.verificarEmail, true);
  assert.equal(reads, 0, 'unverified accounts must not read any access configuration');
  user.email = 'old.123@usuarios.almoxarife-online.web.app';
  assert.equal((await api.conferirAcesso(user)).loginAntigo, true);
  assert.equal(reads, 0);
  user.email = 'admin@example.com';
  user.emailVerified = true;
  const admin = await api.conferirAcesso(user);
  assert.equal(admin.admin, true);
  user.email = 'second@example.com';
  assert.equal((await api.conferirAcesso(user)).admin, true);
  user.email = 'member@example.com';
  assert.equal((await api.conferirAcesso(user)).admin, false);
  await assert.rejects(api.criarObra({ nome: 'Unauthorized' }), /gerenciar/);
  await assert.rejects(api.salvarObra('other', { nome: 'Unauthorized' }), /gerenciar/);
  await assert.rejects(api.alterarAcesso('other', 'member@example.com', true), /gerenciar/);
  await api.redefinirSenha('Member@Example.com');
  assert.deepEqual(calls.at(-1), ['reset', 'member@example.com']);
  await api.sair();
  assert.equal(api.perfil, null);
  console.log('PASS: personal passwords, email verification, both administrators, member guards and password recovery. No email sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
