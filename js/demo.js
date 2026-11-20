/* Obras de demonstração locais, ativadas somente por ?demo=1. */
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') !== '1') return;
  const chave = 'almoxarife:demo:obras';
  const chaveEmpresas = 'almoxarife:demo:empresas';
  let obras;
  try { obras = JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { obras = null; }
  if (!obras) {
    const teste = Store.gerarExemplo();
    obras = { teste: { id: 'teste', nome: 'Obra teste', endereco: 'Rua das Palmeiras, 120 — endereço fictício', responsavel: 'Carlos Silva', teste: true, dados: teste } };
  }
  const obraAtual = params.get('obra') || 'teste';
  let empresas;
  try { empresas = JSON.parse(localStorage.getItem(chaveEmpresas) || 'null'); } catch (e) { empresas = null; }
  if (!empresas) empresas = { inicial: { id: 'inicial', nome: 'Empresa demonstração', responsavelEmail: 'gestor@exemplo.com', criadoEm: Date.now() } };
  let aoListar = () => {};
  let aoListarEmpresas = () => {};
  const perfil = { admin: true, email: 'admin@exemplo.com', rotulo: 'Administrador · Demonstração', adminEmails: ['admin@exemplo.com'], empresaIds: [] };
  const podeGerenciarEmpresa = (id) => perfil.admin || perfil.empresaIds.includes(id);
  const podeGerenciarObra = (o) => perfil.admin || (!!o && podeGerenciarEmpresa(o.empresaId));
  const listar = () => Object.values(obras).filter((o) => podeGerenciarObra(o) || o.usuarios.includes(perfil.email)).map(({ dados, ...meta }) => meta);
  const listarEmpresas = () => Object.values(empresas).filter((e) => perfil.admin || e.responsavelEmail === perfil.email);
  const persistir = () => { localStorage.setItem(chave, JSON.stringify(obras)); localStorage.setItem(chaveEmpresas, JSON.stringify(empresas)); };
  Object.values(obras).forEach((o) => { o.usuarios = o.usuarios || []; o.empresaId = o.empresaId || 'inicial'; });
  const atualizarEscopo = () => { perfil.empresaIds = perfil.admin ? [] : listarEmpresas().map((e) => e.id).sort(); };
  function emitirEmpresas() { atualizarEscopo(); aoListarEmpresas(listarEmpresas()); aoListar(listar()); }

  window.Nuvem = {
    demo: true, obraAtual,
    perfil,
    podeGerenciarEmpresa, podeGerenciarObra,
    ouvirEmpresas: (fn) => { aoListarEmpresas = fn; atualizarEscopo(); fn(listarEmpresas()); },
    pararEmpresas: () => { aoListarEmpresas = () => {}; },
    criarEmpresa: async (dados) => {
      if (!perfil.admin) throw new Error('Somente administradores gerais podem criar empresas.');
      const nome = String(dados.nome || '').trim(), email = String(dados.responsavelEmail || '').trim().toLowerCase();
      if (!nome || nome.length > 100 || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) throw new Error('Informe nome e e-mail válidos.');
      const id = Store.uid();
      empresas[id] = { id, nome, responsavelEmail: email, criadoEm: Date.now() };
      persistir(); emitirEmpresas(); return id;
    },
    salvarEmpresa: async (id, dados) => {
      if (!podeGerenciarEmpresa(id)) throw new Error('Você não pode gerenciar esta empresa.');
      const nome = String(dados.nome || '').trim();
      if (!nome || nome.length > 100) throw new Error('Informe um nome válido.');
      if (perfil.admin) {
        const email = String(dados.responsavelEmail || '').trim().toLowerCase();
        if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) throw new Error('Informe um e-mail válido.');
        empresas[id].responsavelEmail = email;
      }
      empresas[id].nome = nome;
      persistir(); emitirEmpresas();
    },
    status: { online: true, pendentes: false, ultimoErro: '' },
    iniciar: async () => {},
    aoMudarLogin: (fn) => fn({ uid: 'demonstracao' }),
    conferirAcesso: async () => { atualizarEscopo(); return perfil; },
    ouvirObras: (fn) => { aoListar = fn; fn(listar()); },
    pararObras: () => { aoListar = () => {}; },
    ouvir: async (fn) => {
      await Store.substituirTudo(obras[obraAtual].dados);
      fn('pronto');
    },
    enviar: async () => {
      obras[obraAtual].dados = Store.state;
      obras[obraAtual].nome = Store.state.settings.obraNome;
      persistir();
      aoListar(listar());
    },
    substituirTudo: async (anterior, novo) => {
      obras[obraAtual].dados = novo;
      obras[obraAtual].nome = novo.settings.obraNome;
      persistir();
      aoListar(listar());
    },
    criarObra: async (dados, teste = false) => {
      if ((teste && !perfil.admin) || !podeGerenciarEmpresa(dados.empresaId) || !empresas[dados.empresaId]) throw new Error('Você não pode criar obras nesta empresa.');
      const nome = String(dados.nome || '').trim();
      if (!nome || nome.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
      const id = teste ? 'teste' : Store.uid();
      if (obras[id]) throw new Error('A Obra teste já existe.');
      const novo = teste ? Store.gerarExemplo() : { version: 3, settings: { estoqueMinimoPadrao: 5 }, categorias: [], produtos: [], locais: [], funcionarios: [], movimentos: [] };
      novo.settings.obraNome = nome;
      obras[id] = { ...dados, nome, id, teste, dados: novo, usuarios: [] };
      persistir();
      aoListar(listar());
      return id;
    },
    salvarObra: async (id, dados) => {
      if (!podeGerenciarObra(obras[id])) throw new Error('Você não pode gerenciar esta obra.');
      if (dados.empresaId && dados.empresaId !== obras[id].empresaId) throw new Error('A empresa da obra não pode ser alterada nesta tela.');
      const nome = String(dados.nome || '').trim();
      if (!nome || nome.length > 100) throw new Error('Informe um nome com até 100 caracteres.');
      Object.assign(obras[id], dados, { nome });
      obras[id].dados.settings.obraNome = nome;
      persistir();
      aoListar(listar());
    },
    pararDeOuvir: () => {},
    alterarAcesso: async (id, email, permitir) => {
      if (!podeGerenciarObra(obras[id])) throw new Error('Você não pode gerenciar acessos desta obra.');
      const valor = String(email || '').trim().toLowerCase();
      if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(valor)) throw new Error('Informe um e-mail válido.');
      const emails = new Set(obras[id].usuarios);
      if (permitir) emails.add(valor); else emails.delete(valor);
      obras[id].usuarios = [...emails];
      persistir();
      aoListar(listar());
      return [...emails];
    },
    aoMudarStatus: () => {},
    sair: async () => {
      const url = new URL(location.href);
      url.searchParams.delete('demo');
      url.searchParams.delete('obra');
      location.href = url.href;
    },
  };
})();
