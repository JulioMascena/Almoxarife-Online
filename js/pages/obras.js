(function () {
  const { icon, esc, openModal, toast } = UI;

  function render(root) {
    if (!Nuvem.perfil?.admin && !Nuvem.perfil?.empresaIds?.length) { root.innerHTML = '<div class="card" role="alert">Você não gerencia nenhuma empresa.</div>'; return; }
    const obras = App.obras;
    const empresaFiltro = new URLSearchParams(location.hash.split('?')[1] || '').get('empresa') || '';
    const lista = empresaFiltro ? obras.filter((o) => o.empresaId === empresaFiltro) : obras;
    root.innerHTML = `
      <div class="page-header"><span class="page-header__summary">${lista.length} ${lista.length === 1 ? 'obra' : 'obras'}</span><button class="btn btn-primary" data-add ${App.empresas.length ? '' : 'disabled'}>${icon('plus', 'i-sm')}Adicionar Obra</button></div>
      <div class="toolbar filter-toolbar"><label class="field toolbar-filter"><span>Empresa</span><select class="select" data-empresa><option value="">Todas as empresas</option>${App.empresas.map((e) => `<option value="${esc(e.id)}" ${empresaFiltro === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</select></label>${!App.empresas.length ? '<a class="btn btn-outline" href="#/empresas">Cadastre uma empresa primeiro</a>' : ''}</div>
      <p class="muted mt-0">Cada obra pertence a uma empresa e mantém seu estoque, equipe, locais e histórico separados.</p>
      ${Nuvem.perfil.admin && App.empresas.length && !obras.some((o) => o.id === 'teste') ? '<div><button class="btn btn-outline" data-teste>Criar Obra teste com dados fictícios</button></div>' : ''}
      <div class="grid grid-3">${lista.map((o) => `
        <section class="card obra-card">
          <div class="obra-card__heading">${icon('building')}<h3>${esc(o.nome)}</h3></div>
          <p class="muted">${esc(App.empresas.find((e) => e.id === o.empresaId)?.nome || 'Obra compartilhada')}</p>
          <div>${o.id === Nuvem.obraAtual ? '<span class="badge badge-ok">Obra atual</span>' : ''} ${o.teste ? '<span class="badge badge-warn">Dados fictícios</span>' : ''}</div>
          <p class="muted">${esc(o.endereco || 'Endereço não informado')}</p>
          <p class="muted">${o.responsavel ? 'Responsável: ' + esc(o.responsavel) : 'Responsável não informado'}</p>
          <p class="muted">${(o.usuarios || []).length} colaborador(es) liberado(s), além dos gestores</p>
          <div class="btn-row">${Nuvem.podeGerenciarObra(o) ? `<button class="btn btn-outline" data-edit="${esc(o.id)}">${icon('edit', 'i-sm')}Editar</button><button class="btn btn-outline" data-acessos="${esc(o.id)}">${icon('users', 'i-sm')}Acessos</button>` : ''}<button class="btn btn-primary" data-open="${esc(o.id)}" ${o.id === Nuvem.obraAtual ? 'disabled' : ''}>Abrir obra</button></div>
        </section>`).join('') || '<div class="card"><p>Nenhuma obra cadastrada nesta empresa.</p></div>'}</div>`;
    root.querySelector('[data-empresa]').addEventListener('change', (e) => { location.hash = '#/obras' + (e.target.value ? '?empresa=' + encodeURIComponent(e.target.value) : ''); });
    root.querySelector('[data-add]').addEventListener('click', () => formulario());
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => formulario(obras.find((o) => o.id === b.dataset.edit))));
    root.querySelectorAll('[data-acessos]').forEach((b) => b.addEventListener('click', () => acessos(obras.find((o) => o.id === b.dataset.acessos))));
    root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => App.trocarObra(b.dataset.open)));
    root.querySelector('[data-teste]')?.addEventListener('click', () => formulario(null, true));
  }

  function acessos(obra) {
    let usuarios = [...(obra.usuarios || [])];
    openModal({
      title: `Acessos · ${obra.nome}`,
      body: `<p class="muted">Administradores gerais acessam todas as obras. O responsável da empresa gerencia suas obras. Colaboradores acessam somente as obras em que forem liberados.</p>
        <form class="form" id="f-acesso"><div class="field"><label for="acesso-email">E-mail do usuário</label><input class="input" type="email" id="acesso-email" name="email" autocomplete="off" maxlength="254" required placeholder="pessoa@empresa.com"></div><button class="btn btn-primary" type="submit">Liberar acesso</button></form>
        <p class="muted">O usuário deve criar sua conta com esse mesmo e-mail e confirmá-lo. A liberação não envia uma mensagem automaticamente.</p><p role="status" data-aviso></p><div class="access-list" data-usuarios></div>`,
      footer: '<button class="btn btn-outline" data-close>Fechar</button>',
      onMount(el) {
        const aviso = el.querySelector('[data-aviso]');
        const lista = el.querySelector('[data-usuarios]');
        function desenhar() {
          lista.innerHTML = usuarios.length ? usuarios.sort().map((email) => `<div class="access-list__row"><span>${esc(email)}</span><button class="btn btn-danger-outline btn-sm" data-remover="${esc(email)}" aria-label="Remover acesso de ${esc(email)}">Remover</button></div>`).join('') : '<p class="muted">Nenhum usuário adicional liberado.</p>';
          lista.querySelectorAll('[data-remover]').forEach((b) => b.addEventListener('click', async () => {
            b.disabled = true;
            try { usuarios = await Nuvem.alterarAcesso(obra.id, b.dataset.remover, false); aviso.textContent = 'Acesso removido desta obra.'; desenhar(); }
            catch (erro) { aviso.textContent = erro.message; b.disabled = false; }
          }));
        }
        desenhar();
        el.querySelector('form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const b = e.target.querySelector('[type=submit]');
          b.disabled = true;
          try { usuarios = await Nuvem.alterarAcesso(obra.id, e.target.elements.email.value, true); e.target.reset(); aviso.textContent = 'Acesso liberado para esta obra.'; desenhar(); }
          catch (erro) { aviso.textContent = erro.message; }
          finally { b.disabled = false; }
        });
      },
    });
  }

  function formulario(obra, teste = false) {
    const principal = obra?.id === 'principal';
    const filtro = new URLSearchParams(location.hash.split('?')[1] || '').get('empresa');
    const empresaId = obra?.empresaId || (App.empresas.some((e) => e.id === filtro) ? filtro : App.empresas.length === 1 ? App.empresas[0].id : '');
    openModal({
      title: obra ? 'Editar Obra' : 'Adicionar Obra',
      body: `<form class="form" id="f-obra">
        <div class="field"><label for="o-empresa">Empresa</label><select class="select" id="o-empresa" name="empresaId" required ${obra ? 'disabled' : ''}><option value="">Selecione uma empresa</option>${App.empresas.map((e) => `<option value="${esc(e.id)}" ${e.id === empresaId ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</select></div>
        <div class="field"><label for="o-nome">Nome da obra</label><input class="input" id="o-nome" name="nome" maxlength="100" required value="${esc(obra?.nome || (teste ? 'Obra teste' : ''))}" placeholder="Ex.: Residencial das Palmeiras"></div>
        ${principal ? '<p class="muted">Esta obra reúne os dados já existentes no sistema.</p>' : ''}
        <div class="field"><label for="o-endereco">Endereço</label><input class="input" id="o-endereco" name="endereco" maxlength="250" value="${esc(obra?.endereco || '')}"></div>
        <div class="field"><label for="o-responsavel">Responsável</label><input class="input" id="o-responsavel" name="responsavel" maxlength="100" value="${esc(obra?.responsavel || '')}"></div>
        <p class="login__erro" data-erro role="alert"></p>
      </form>`,
      footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-obra">${obra ? 'Salvar' : 'Criar obra'}</button>`,
      onMount(el, close) {
        el.querySelector('form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = new FormData(e.target);
          const dados = { empresaId: obra?.empresaId || form.get('empresaId'), nome: String(form.get('nome') || '').trim(), endereco: String(form.get('endereco') || '').trim(), responsavel: String(form.get('responsavel') || '').trim() };
          if (!dados.nome) { el.querySelector('[data-erro]').textContent = 'Informe o nome da obra.'; return; }
          const botao = el.querySelector('[type=submit]');
          botao.disabled = true;
          try {
            if (obra) await Nuvem.salvarObra(obra.id, dados);
            else await Nuvem.criarObra(dados, teste);
            close();
            toast(obra ? 'Obra atualizada.' : 'Obra criada. Use Abrir obra para acessar.');
          } catch (erro) { el.querySelector('[data-erro]').textContent = erro.message; botao.disabled = false; }
        });
      },
    });
  }
  window.Pages = window.Pages || {};
  Pages.obras = { render };
})();
