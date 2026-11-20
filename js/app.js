/* Casca do app: login, menu lateral, barra superior, rotas por hash e sincronização. */
(function () {
  const { icon, esc } = UI;
  window.Pages = window.Pages || {};

  const ROTAS = [
    { id: 'painel', nome: 'Painel', icon: 'painel' },
    { id: 'produtos', nome: 'Produtos', icon: 'box' },
    { id: 'categorias', nome: 'Categorias', icon: 'tag' },
    { id: 'locais', nome: 'Locais da Obra', icon: 'building' },
    { id: 'funcionarios', nome: 'Funcionários', icon: 'user' },
    { id: 'historico', nome: 'Histórico', icon: 'clock' },
    { id: 'relatorios', nome: 'Relatórios', icon: 'chart' },
  ];
  const CONFIG = { id: 'configuracoes', nome: 'Configurações', icon: 'gear' };
  const raiz = () => document.getElementById('app');

  function rotaAtual() {
    const h = location.hash.replace(/^#\/?/, '').split('?')[0];
    return [...ROTAS, CONFIG].find((r) => r.id === h) ? h : 'painel';
  }

  /* ---------- Telas antes do sistema ---------- */
  function telaSimples(conteudo) {
    raiz().innerHTML = `<div class="login"><div class="login__card">
      <div class="login__brand">${icon('warehouse')}<span>Almoxarife</span></div>${conteudo}</div></div>`;
  }
  function telaCarregando(msg) {
    telaSimples(`<div class="login__carregando"><span class="spinner" aria-hidden="true"></span>${esc(msg)}</div>`);
  }

  async function mostrarLogin(aviso) {
    telaCarregando('Conectando…');
    let existe = true;
    try { existe = await Nuvem.acessoExiste(); } catch (e) { /* sem conexão: mostra o login normal */ }
    const criar = !existe;
    telaSimples(`
      <h1 class="login__titulo">${criar ? 'Criar o acesso da obra' : 'Entrar'}</h1>
      <p class="login__desc">${criar
        ? 'Primeiro acesso: defina um ID e uma senha. Toda a equipe vai usar este mesmo login no celular e no computador.'
        : 'Use o ID e a senha da obra. Os dados são os mesmos em todos os aparelhos.'}</p>
      <form class="form" id="f-login" autocomplete="on">
        <div class="field"><label for="lg-id">ID</label><input class="input" id="lg-id" name="id" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div class="field"><label for="lg-senha">Senha</label><input class="input" id="lg-senha" name="senha" type="password" autocomplete="${criar ? 'new-password' : 'current-password'}" required></div>
        ${criar ? '<div class="field"><label for="lg-senha2">Repita a senha</label><input class="input" id="lg-senha2" name="senha2" type="password" autocomplete="new-password" required></div>' : ''}
        <div class="login__erro" role="alert" data-erro>${esc(aviso || '')}</div>
        <button class="btn btn-primary" type="submit" style="width:100%;min-height:42px">${criar ? 'Criar acesso e entrar' : 'Entrar'}</button>
      </form>`);
    const form = document.getElementById('f-login');
    const erro = form.querySelector('[data-erro]');
    form.id.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      erro.textContent = '';
      if (criar && form.senha.value !== form.senha2.value) { erro.textContent = 'As senhas não são iguais.'; return; }
      btn.disabled = true;
      btn.textContent = 'Aguarde…';
      try {
        if (criar) await Nuvem.criarAcesso(form.id.value, form.senha.value);
        else await Nuvem.entrar(form.id.value, form.senha.value);
        // onAuthStateChanged abre o sistema
      } catch (err) {
        erro.textContent = err.message;
        btn.disabled = false;
        btn.textContent = criar ? 'Criar acesso e entrar' : 'Entrar';
      }
    });
  }

  /* ---------- Sistema ---------- */
  function shell(perfil) {
    raiz().innerHTML = `
      <div class="app">
        <aside class="sidebar" aria-label="Menu principal">
          <div class="sidebar__brand">
            <a href="#/painel" class="sidebar__logo">${icon('warehouse')}Almoxarife</a>
            <div class="sidebar__obra" data-obra></div>
          </div>
          <nav>${ROTAS.map(link).join('')}</nav>
          <div class="sidebar__bottom">
            ${link(CONFIG)}
            <button class="nav-link nav-sair" data-sair title="Sair do sistema">${icon('logout')}<span>Sair <small>(${esc(perfil.rotulo || '')})</small></span></button>
          </div>
        </aside>
        <div class="backdrop-nav" data-close-nav></div>
        <div class="main-col">
          <header class="topbar">
            <div class="topbar__left">
              <button class="icon-btn menu-btn" data-open-nav aria-label="Abrir menu">${icon('menu')}</button>
              <h2 data-title></h2>
            </div>
            <div class="topbar__right">
              <span class="obra-tag" data-obra></span>
              <span class="sync" data-sync role="status" aria-live="polite"></span>
            </div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>`;

    document.querySelector('[data-open-nav]').addEventListener('click', () => document.body.classList.add('nav-open'));
    document.querySelector('[data-close-nav]').addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.querySelectorAll('.nav-link').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
    document.querySelector('[data-sair]').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Sair do sistema?', message: 'Para entrar de novo neste aparelho será preciso digitar o ID e a senha.', confirmText: 'Sair' });
      if (ok) await Nuvem.sair();
    });
    atualizarStatus(Nuvem.status);
  }

  function link(r) {
    return `<a href="#/${r.id}" class="nav-link" data-route="${r.id}">${icon(r.icon)}<span>${esc(r.nome)}</span></a>`;
  }

  function atualizarStatus(st) {
    const el = document.querySelector('[data-sync]');
    if (!el) return;
    let cls = 'ok', txt = 'Sincronizado';
    if (st.ultimoErro) { cls = 'erro'; txt = 'Erro ao sincronizar'; }
    else if (!st.online) { cls = 'aviso'; txt = st.pendentes ? 'Sem internet · será enviado depois' : 'Sem internet'; }
    else if (st.pendentes) { cls = 'aviso'; txt = 'Enviando…'; }
    el.className = `sync sync--${cls}`;
    el.innerHTML = `<i></i><span>${esc(txt)}</span>`;
    el.title = st.ultimoErro || (st.online ? 'Todos os aparelhos veem os mesmos dados' : 'Os lançamentos ficam guardados neste aparelho e sobem quando a internet voltar');
  }

  function aplicarPreferencias() {
    const s = Store.state.settings;
    document.documentElement.setAttribute('data-theme', s.tema === 'escuro' ? 'dark' : 'light');
    document.body.classList.toggle('compact', !!s.tabelaCompacta);
    document.querySelectorAll('[data-obra]').forEach((el) => { el.textContent = s.obraNome || ''; });
  }

  let carregado = false;
  let rotaRenderizada = null;
  function render() {
    const content = document.getElementById('content');
    if (!content || !carregado) return;
    const id = rotaAtual();
    const rota = [...ROTAS, CONFIG].find((r) => r.id === id);
    document.querySelectorAll('.nav-link[data-route]').forEach((a) => a.classList.toggle('is-active', a.dataset.route === id));
    document.querySelector('[data-title]').textContent = rota.nome;
    document.title = `${rota.nome} · Almoxarife`;
    const scroll = rotaRenderizada === id ? content.scrollTop : 0;
    const page = window.Pages[id];
    content.innerHTML = `<div class="page">${bannerBackup()}<div data-page></div></div>`;
    if (page) page.render(content.querySelector('[data-page]'));
    const b = content.querySelector('[data-backup-now]');
    if (b) b.addEventListener('click', () => { location.hash = '#/configuracoes'; });
    content.scrollTop = scroll;
    rotaRenderizada = id;
    pendente = false;
  }

  /* Mudança vinda de outro aparelho: não redesenha enquanto a pessoa está digitando nesta tela */
  let pendente = false;
  function digitando() {
    const a = document.activeElement;
    const content = document.getElementById('content');
    return !!(a && content && content.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  }
  document.addEventListener('focusout', () => {
    setTimeout(() => { if (pendente && !digitando()) render(); }, 250);
  });

  function bannerBackup() {
    const s = Store.state.settings;
    const limite = Number(s.lembreteBackup) || 0;
    if (!limite || (s.alteracoesDesdeBackup || 0) < limite || rotaAtual() === 'configuracoes') return '';
    return `<div class="alert-banner no-print">${icon('alert')}<span>Você fez ${s.alteracoesDesdeBackup} alterações neste aparelho desde o último backup. Os dados estão salvos no servidor; o backup é uma cópia extra de segurança.</span><span class="spacer"></span><button class="btn btn-outline btn-sm" data-backup-now>Fazer backup</button></div>`;
  }

  function abrirSistema(perfil) {
    carregado = false;
    Store.load();
    shell(perfil);
    aplicarPreferencias();
    document.getElementById('content').innerHTML = `<div class="login__carregando" style="padding:64px 0"><span class="spinner" aria-hidden="true"></span>Carregando os dados da obra…</div>`;
    Nuvem.ouvir((tipo, dados) => {
      if (tipo === 'pronto') { carregado = true; aplicarPreferencias(); render(); return; }
      Store.aplicarRemoto(tipo, dados);
    });
  }

  let ligado = false;
  async function iniciar() {
    Store.load();
    aplicarPreferencias();
    telaCarregando('Conectando…');
    if (!ligado) {
      ligado = true;
      Store.onChange((st, origem) => {
        aplicarPreferencias();
        if (!carregado) return;
        if (origem === 'remoto' && digitando()) { pendente = true; return; }
        render();
      });
      window.addEventListener('hashchange', render);
      Nuvem.aoMudarStatus(atualizarStatus);
    }
    try {
      await Nuvem.iniciar();
    } catch (e) {
      telaSimples(`<p class="login__desc">Não foi possível carregar o sistema. Verifique a internet e recarregue a página.</p><button class="btn btn-primary" onclick="location.reload()">Tentar de novo</button>`);
      return;
    }
    Nuvem.aoMudarLogin(async (user) => {
      if (!user) { carregado = false; Nuvem.pararDeOuvir(); mostrarLogin(); return; }
      telaCarregando('Conferindo acesso…');
      let perfil = null;
      try { perfil = await Nuvem.conferirAcesso(user); } catch (e) { /* trata abaixo */ }
      if (!perfil) { await Nuvem.sair(); mostrarLogin('Esta conta não tem acesso a esta obra.'); return; }
      abrirSistema(perfil);
    });
  }

  window.App = { iniciar, render };
  document.addEventListener('DOMContentLoaded', iniciar);
})();
