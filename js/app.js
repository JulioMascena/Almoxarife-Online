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
    { id: 'empresas', nome: 'Empresas', icon: 'users' },
    { id: 'obras', nome: 'Obras', icon: 'building' },
  ];
  const CONFIG = { id: 'configuracoes', nome: 'Configurações', icon: 'gear' };
  const raiz = () => document.getElementById('app');
  let obras = [];
  let empresas = [];
  const gestor = () => !!(Nuvem.perfil?.admin || Nuvem.perfil?.empresaIds?.length);
  const rotas = () => ROTAS.filter((r) => !['obras', 'empresas'].includes(r.id) || gestor());
  function bloquearObra(mensagem) {
    carregado = false;
    Nuvem.pararDeOuvir();
    Store.load();
    UI.closeModals();
    const content = document.getElementById('content');
    if (content) content.innerHTML = `<div class="card"><p role="alert">${esc(mensagem)}</p><button class="btn btn-outline" data-recarregar>Atualizar acesso</button></div>`;
    document.querySelector('[data-recarregar]')?.addEventListener('click', () => location.reload());
  }

  function trocarObra(id) {
    if (!obras.some((o) => o.id === id)) return;
    if (Nuvem.status.pendentes || Nuvem.status.ocupado) {
      UI.toast('Aguarde a sincronização antes de trocar de obra.', { error: true });
      document.querySelector('[data-obra-select]').value = Nuvem.obraAtual;
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('obra', id);
    url.hash = url.hash.split('?')[0];
    location.href = url.href;
  }

  function atualizarObras(lista) {
    obras = lista;
    const seletor = document.querySelector('[data-obra-select]');
    if (!seletor) return;
    seletor.innerHTML = lista.length ? lista.map((o) => `<option value="${esc(o.id)}">${esc(empresas.find((e) => e.id === o.empresaId)?.nome ? empresas.find((e) => e.id === o.empresaId).nome + ' · ' : '')}${esc(o.nome)}${o.teste ? ' · Fictícia' : ''}</option>`).join('') : '<option value="">Nenhuma obra liberada</option>';
    seletor.value = lista.some((o) => o.id === Nuvem.obraAtual) ? Nuvem.obraAtual : lista[0]?.id || '';
    seletor.disabled = !lista.length || !!(Nuvem.status.pendentes || Nuvem.status.ocupado);
  }

  function rotaAtual() {
    const h = location.hash.replace(/^#\/?/, '').split('?')[0];
    return [...rotas(), CONFIG].find((r) => r.id === h) ? h : 'painel';
  }

  /* ---------- Telas antes do sistema ---------- */
  function telaSimples(conteudo) {
    raiz().innerHTML = `<div class="login"><div class="login__card">
      <div class="login__brand"><span class="brand-plate"><img class="brand-logo" src="imgs/plumb_logo_transparente.png" alt="PLUMB" width="168" height="67"></span></div>${conteudo}</div></div>`;
  }
  function telaCarregando(msg) {
    telaSimples(`<div class="login__carregando"><span class="spinner" aria-hidden="true"></span>${esc(msg)}</div>`);
  }

  function mostrarLogin(aviso, criar = false) {
    telaSimples(`
      <h1 class="login__titulo">${criar ? 'Criar minha conta' : 'Entrar'}</h1>
      <p class="login__desc">${criar ? 'Use o mesmo e-mail informado ao administrador. Confirme o e-mail para acessar suas obras.' : 'Entre com seu e-mail e senha pessoal. Você verá as obras liberadas para sua conta.'}</p>
      <form class="form" id="f-login" autocomplete="on">
        <div class="field"><label for="lg-email">E-mail</label><input class="input" id="lg-email" name="email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div class="field"><label for="lg-senha">Senha</label><input class="input" id="lg-senha" name="senha" type="password" ${criar ? 'minlength="8"' : ''} autocomplete="${criar ? 'new-password' : 'current-password'}" required></div>
        ${criar ? '<div class="field"><label for="lg-senha2">Repita a senha</label><input class="input" id="lg-senha2" name="senha2" type="password" autocomplete="new-password" required></div>' : ''}
        <div class="login__erro" role="alert" data-erro>${esc(aviso || '')}</div>
        <button class="btn btn-primary" type="submit" style="width:100%;min-height:44px">${criar ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <div class="login__links"><button class="btn btn-ghost" data-alternar>${criar ? 'Já tenho uma conta' : 'Primeiro acesso: criar conta'}</button>${!criar ? '<button class="btn btn-ghost" data-recuperar>Esqueci minha senha</button>' : ''}</div>`);
    const form = document.getElementById('f-login');
    const erro = form.querySelector('[data-erro]');
    form.elements.email.focus();
    document.querySelector('[data-alternar]').addEventListener('click', () => mostrarLogin('', !criar));
    document.querySelector('[data-recuperar]')?.addEventListener('click', async (e) => {
      if (!form.elements.email.reportValidity()) return;
      e.currentTarget.disabled = true;
      try { await Nuvem.redefinirSenha(form.elements.email.value); erro.textContent = 'Se houver uma conta para esse e-mail, você receberá as instruções para redefinir sua senha.'; }
      catch (err) { erro.textContent = err.message; }
      finally { e.target.disabled = false; }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      erro.textContent = '';
      if (criar && form.senha.value !== form.senha2.value) { erro.textContent = 'As senhas não são iguais.'; return; }
      btn.disabled = true;
      btn.textContent = 'Aguarde…';
      try {
        if (criar) await Nuvem.criarAcesso(form.elements.email.value, form.senha.value);
        else await Nuvem.entrar(form.elements.email.value, form.senha.value);
        // onAuthStateChanged abre o sistema
      } catch (err) {
        if (form.isConnected) erro.textContent = err.message;
        else UI.toast(err.message, { error: true });
        btn.disabled = false;
        btn.textContent = criar ? 'Criar conta' : 'Entrar';
      }
    });
  }

  function mostrarVerificacao(email) {
    telaSimples(`<h1 class="login__titulo">Confirme seu e-mail</h1><p class="login__desc">Abra o link enviado para <b>${esc(email)}</b>. A confirmação é necessária para liberar o acesso às obras.</p><div class="form"><button class="btn btn-primary" data-confirmado>Já confirmei meu e-mail</button><button class="btn btn-outline" data-reenviar>Enviar novo e-mail de confirmação</button><button class="btn btn-ghost" data-sair-verificacao>Sair</button><p role="status" data-aviso></p></div>`);
    document.querySelector('[data-confirmado]').addEventListener('click', () => location.reload());
    document.querySelector('[data-sair-verificacao]').addEventListener('click', () => Nuvem.sair());
    document.querySelector('[data-reenviar]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try { await Nuvem.reenviarVerificacao(); document.querySelector('[data-aviso]').textContent = 'Mensagem enviada. Confira também a pasta de spam.'; }
      catch (erro) { document.querySelector('[data-aviso]').textContent = erro.message; }
      finally { e.target.disabled = false; }
    });
  }

  /* ---------- Sistema ---------- */
  function shell(perfil) {
    raiz().innerHTML = `
      <div class="app">
        <aside class="sidebar" aria-label="Menu principal">
          <div class="sidebar__brand">
            <a href="#/painel" class="sidebar__logo"><span class="brand-plate"><img class="brand-logo" src="imgs/plumb_logo_transparente.png" alt="PLUMB" width="168" height="67"></span></a>
          </div>
          <nav>${rotas().map(link).join('')}</nav>
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
              <label class="obra-picker"><span class="sr-only">Obra atual</span><select class="select" data-obra-select aria-label="Obra atual" disabled><option>Carregando obras…</option></select></label>
              <span class="sync" data-sync role="status" aria-live="polite"></span>
            </div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>`;

    document.querySelector('[data-open-nav]').addEventListener('click', () => document.body.classList.add('nav-open'));
    document.querySelector('[data-obra-select]').addEventListener('change', (e) => trocarObra(e.target.value));
    document.querySelector('[data-close-nav]').addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.querySelectorAll('.nav-link').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
    document.querySelector('[data-sair]').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Sair do sistema?', message: 'Para entrar novamente neste aparelho será preciso informar seu e-mail e senha.', confirmText: 'Sair' });
      if (ok) await Nuvem.sair();
    });
    atualizarStatus(Nuvem.status);
  }

  function link(r) {
    return `<a href="#/${r.id}" class="nav-link" data-route="${r.id}">${icon(r.icon)}<span>${esc(r.nome)}</span></a>`;
  }

  function atualizarStatus(st) {
    const seletor = document.querySelector('[data-obra-select]');
    if (seletor) seletor.disabled = !!(st.pendentes || st.ocupado) || !obras.length;
    const el = document.querySelector('[data-sync]');
    if (!el) return;
    if (Nuvem.demo) {
      el.className = 'sync';
      el.textContent = 'Demonstração';
      el.title = 'Obras locais para demonstração, separadas dos dados do servidor.';
      return;
    }
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
  }

  let carregado = false;
  let rotaRenderizada = null;
  function render() {
    const content = document.getElementById('content');
    if (!content || !carregado) return;
    const id = rotaAtual();
    const rota = [...rotas(), CONFIG].find((r) => r.id === id);
    document.querySelectorAll('.nav-link[data-route]').forEach((a) => a.classList.toggle('is-active', a.dataset.route === id));
    document.querySelector('[data-title]').textContent = rota.nome;
    document.title = `${rota.nome} · PLUMB`;
    if (!obras.some((o) => o.id === Nuvem.obraAtual) && !['empresas', 'obras'].includes(id)) {
      content.innerHTML = '<div class="card"><h3>Selecione ou cadastre uma obra</h3><p class="muted">Selecione uma obra no topo ou cadastre uma obra na sua empresa.</p><a class="btn btn-primary" href="#/obras">Gerenciar obras</a></div>';
      return;
    }
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
    let iniciouDados = false;
    const receberObras = (lista) => {
      atualizarObras(lista);
      if (!lista.some((o) => o.id === Nuvem.obraAtual)) {
        bloquearObra('Nenhuma obra liberada. Peça ao administrador para liberar acesso para o seu e-mail.');
        iniciouDados = false;
        if (lista.length) {
          const url = new URL(location.href);
          url.searchParams.set('obra', lista[0].id);
          url.hash = '#/painel';
          location.href = url.href;
        } else {
          document.getElementById('content').innerHTML = '<div class="card"><h3>Nenhuma obra liberada</h3><p class="muted">Peça ao administrador para liberar o acesso para o seu e-mail.</p></div>';
          if (gestor()) { carregado = true; render(); }
        }
        return;
      }
      if (iniciouDados) { if (carregado && ['obras', 'empresas'].includes(rotaAtual())) render(); return; }
      iniciouDados = true;
      Nuvem.ouvir((tipo, dados) => {
        if (tipo === 'erro') { bloquearObra(dados); return; }
        if (tipo === 'pronto') { carregado = true; aplicarPreferencias(); render(); return; }
        Store.aplicarRemoto(tipo, dados);
      });
    };
    const erroCatalogo = (e) => bloquearObra('Não foi possível carregar suas empresas e obras. ' + (e.message || ''));
    let iniciouCatalogo = false;
    Nuvem.ouvirEmpresas((lista, mudouEscopo) => {
      empresas = lista;
      atualizarObras(obras);
      if (mudouEscopo) { bloquearObra('Suas permissões de empresa foram alteradas. Atualizando acesso…'); location.reload(); return; }
      if (!iniciouCatalogo) { iniciouCatalogo = true; Nuvem.ouvirObras(receberObras, erroCatalogo); }
      else if (carregado && ['empresas', 'obras'].includes(rotaAtual())) render();
    }, erroCatalogo);
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
      carregado = false;
      obras = [];
      empresas = [];
      Nuvem.pararDeOuvir();
      Nuvem.pararObras();
      Nuvem.pararEmpresas();
      Store.load();
      if (!user) { carregado = false; Nuvem.pararDeOuvir(); Nuvem.pararObras(); mostrarLogin(); return; }
      telaCarregando('Conferindo acesso…');
      let perfil = null;
      try { perfil = await Nuvem.conferirAcesso(user); }
      catch (e) { carregado = false; mostrarLogin(e.message || 'Não foi possível verificar seu acesso.'); return; }
      if (perfil.loginAntigo) { await Nuvem.sair(); mostrarLogin('O acesso compartilhado foi substituído. Crie ou entre com sua conta de e-mail pessoal.'); return; }
      if (perfil.verificarEmail) { carregado = false; mostrarVerificacao(perfil.email); return; }
      abrirSistema(perfil);
    });
  }

  window.App = { iniciar, render, trocarObra, get obras() { return obras; }, get empresas() { return empresas; } };
  document.addEventListener('DOMContentLoaded', iniciar);
})();
