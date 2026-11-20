const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const storeSource = fs.readFileSync('js/store.js', 'utf8');
const demoSource = fs.readFileSync('js/demo.js', 'utf8');

function context(search, prefs = new Map()) {
  const ctx = vm.createContext({ URLSearchParams, Date, Math, console, setTimeout, clearTimeout,
    location: { search }, localStorage: { getItem: k => prefs.get(k), setItem: (k, v) => prefs.set(k, v) } });
  ctx.window = ctx;
  vm.runInContext(storeSource, ctx);
  return { ctx, prefs };
}

(async () => {
  const normal = context('');
  const live = { sentinel: true };
  normal.ctx.Nuvem = live;
  vm.runInContext(demoSource, normal.ctx);
  assert.equal(normal.ctx.Nuvem, live, 'ordinary mode must retain the real adapter');

  const { ctx, prefs } = context('?demo=1');
  vm.runInContext(demoSource, ctx);
  await ctx.Nuvem.iniciar();
  await ctx.Nuvem.ouvir(type => assert.equal(type, 'pronto'));
  const s = ctx.Store.state;
  assert.equal(s.produtos.length, 20);
  assert.equal(s.categorias.length, 6);
  assert.equal(s.funcionarios.length, 7);
  assert.equal(s.locais.filter(l => l.tipo === 'apartamento').length, 20);
  for (let n = 1; n <= 5; n++) assert.equal(s.locais.filter(l => l.pavimento === String(n) && l.tipo === 'apartamento').length, 4);
  const balances = new Map();
  const workers = new Map(s.funcionarios.map(f => [f.id, f]));
  const places = new Map(s.locais.map(l => [l.id, l]));
  const products = new Map(s.produtos.map(p => [p.id, p]));
  const trades = { 'HID': 'Encanador', 'ELE': 'Eletricista', 'ACA': 'Azulejista', 'PIN': 'Pintor' };
  for (const m of [...s.movimentos].sort((a, b) => a.criadoEm - b.criadoEm)) {
    assert(products.has(m.produtoId));
    assert(m.quantidade > 0);
    assert(m.criadoEm <= Date.now());
    const delta = m.tipo === 'saida' ? -m.quantidade : m.quantidade;
    balances.set(m.produtoId, (balances.get(m.produtoId) || 0) + delta);
    assert(balances.get(m.produtoId) >= 0, 'stock must never become negative');
    if (m.tipo === 'saida') {
      assert(workers.has(m.funcionarioId));
      assert(places.has(m.localId));
      assert.notEqual(places.get(m.localId).status, 'nao-iniciado');
      const trade = trades[products.get(m.produtoId).codigo.slice(0, 3)];
      if (trade) assert.equal(workers.get(m.funcionarioId).funcao, trade);
    }
  }
  for (const p of s.produtos) assert.equal(balances.get(p.id), p.quantidade, p.nome);
  assert(s.produtos.some(p => p.quantidade === 0));
  assert(s.produtos.some(p => p.quantidade > 0 && p.quantidade < p.minimo));
  assert.equal(s.settings.obraNome, 'Obra teste');
  assert(prefs.has('almoxarife:demo:prefs:teste'));
  assert(!prefs.has('almoxarife:prefs'), 'demo must not overwrite real preferences');
  const outraId = await ctx.Nuvem.criarObra({ nome: 'Residencial Palmeiras', empresaId: 'inicial', endereco: 'Av. Central, 100', responsavel: 'Maria Costa' });
  const outra = context('?demo=1&obra=' + outraId, prefs);
  vm.runInContext(demoSource, outra.ctx);
  await outra.ctx.Nuvem.ouvir(() => {});
  assert.equal(outra.ctx.Store.state.produtos.length, 0);
  outra.ctx.Store.salvarCategoria({ nome: 'Categoria isolada', cor: '#35421F' });
  const volta = context('?demo=1&obra=teste', prefs);
  vm.runInContext(demoSource, volta.ctx);
  await volta.ctx.Nuvem.ouvir(() => {});
  assert.equal(volta.ctx.Store.state.produtos.length, 20);
  assert.equal(volta.ctx.Store.state.categorias.length, 6);
  const persiste = context('?demo=1&obra=' + outraId, prefs);
  vm.runInContext(demoSource, persiste.ctx);
  await persiste.ctx.Nuvem.ouvir(() => {});
  assert.equal(persiste.ctx.Store.state.categorias.length, 1);
  assert.equal(persiste.ctx.Store.state.categorias[0].nome, 'Categoria isolada');
  await assert.rejects(ctx.Nuvem.criarObra({ nome: 'Obra teste', empresaId: 'inicial' }, true), /existe/);
  const empresaId = await ctx.Nuvem.criarEmpresa({ nome: 'Empresa B', responsavelEmail: 'gestor-b@example.com' });
  ctx.Nuvem.perfil.admin = false;
  ctx.Nuvem.perfil.email = 'gestor-b@example.com';
  await ctx.Nuvem.conferirAcesso();
  assert.deepEqual(Array.from(ctx.Nuvem.perfil.empresaIds), [empresaId]);
  await assert.rejects(ctx.Nuvem.criarEmpresa({ nome: 'Forjada', responsavelEmail: 'gestor-b@example.com' }));
  await assert.rejects(ctx.Nuvem.criarObra({ nome: 'Invadir inicial', empresaId: 'inicial' }));
  await assert.rejects(ctx.Nuvem.alterarAcesso('teste', 'gestor-b@example.com', true));
  const propriaObra = await ctx.Nuvem.criarObra({ nome: 'Obra B1', empresaId });
  await ctx.Nuvem.alterarAcesso(propriaObra, 'colaborador@example.com', true);
  let visiveis;
  ctx.Nuvem.ouvirObras(lista => { visiveis = lista; });
  assert.equal(visiveis.length, 1);
  assert.equal(visiveis[0].id, propriaObra);
  console.log(`Demo verified: ${s.produtos.length} products, ${s.locais.length} places, ${s.movimentos.length} linked movements; balances and isolation valid.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
