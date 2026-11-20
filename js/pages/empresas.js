(function () {
  const { esc, icon, openModal, toast } = UI;
  function render(root) {
    if (!Nuvem.perfil?.admin && !Nuvem.perfil?.empresaIds?.length) { root.innerHTML = '<div class="card" role="alert">Você não gerencia nenhuma empresa.</div>'; return; }
    const empresas = App.empresas;
    root.innerHTML = `
      <div class="page-header"><span class="page-header__summary">${empresas.length} ${empresas.length === 1 ? 'empresa' : 'empresas'}</span>${Nuvem.perfil.admin ? `<button class="btn btn-primary" data-add>${icon('plus', 'i-sm')}Adicionar Empresa</button>` : '<a class="btn btn-primary" href="#/obras">Gerenciar obras</a>'}</div>
      <p class="muted mt-0">${Nuvem.perfil.admin ? 'O responsável pode criar e gerenciar as obras e os acessos somente dentro da própria empresa.' : 'Você pode criar obras e liberar colaboradores nas empresas sob sua responsabilidade.'}</p>
      <div class="grid grid-3">${empresas.map((e) => `
        <section class="card obra-card"><div class="obra-card__heading">${icon('users')}<h3>${esc(e.nome)}</h3></div>
          <p class="muted">${e.responsavelEmail ? 'Responsável: ' + esc(e.responsavelEmail) : 'Responsável a definir pelo administrador geral'}</p>
          <p>${App.obras.filter((o) => o.empresaId === e.id).length} obra(s)</p>
          <div class="btn-row"><button class="btn btn-outline" data-edit="${esc(e.id)}">Editar empresa</button><a class="btn btn-primary" href="#/obras?empresa=${encodeURIComponent(e.id)}">Ver obras</a></div>
        </section>`).join('') || '<div class="card"><p>Nenhuma empresa cadastrada. Adicione a primeira empresa para cadastrar suas obras.</p></div>'}</div>`;
    root.querySelector('[data-add]')?.addEventListener('click', () => formulario());
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => formulario(empresas.find((e) => e.id === b.dataset.edit))));
  }
  function formulario(empresa) {
    openModal({
      title: empresa ? 'Editar Empresa' : 'Adicionar Empresa',
      body: `<form class="form" id="f-empresa"><div class="field"><label for="e-nome">Nome da empresa</label><input class="input" id="e-nome" name="nome" maxlength="100" required value="${esc(empresa?.nome || '')}"></div><div class="field"><label for="e-responsavel">E-mail do responsável</label><input class="input" type="email" id="e-responsavel" name="responsavelEmail" maxlength="254" required ${Nuvem.perfil.admin ? '' : 'readonly'} value="${esc(empresa?.responsavelEmail || '')}"></div><p class="muted">O responsável usa sua própria conta com e-mail confirmado. O administrador geral define ou altera o responsável.</p><p class="login__erro" data-erro role="alert"></p></form>`,
      footer: '<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-primary" type="submit" form="f-empresa">Salvar empresa</button>',
      onMount(el, close) {
        el.querySelector('form').addEventListener('submit', async (evento) => {
          evento.preventDefault();
          const form = new FormData(evento.target);
          const dados = { nome: form.get('nome'), responsavelEmail: form.get('responsavelEmail') };
          const botao = el.querySelector('[type=submit]');
          botao.disabled = true;
          try { if (empresa) await Nuvem.salvarEmpresa(empresa.id, dados); else await Nuvem.criarEmpresa(dados); close(); toast('Empresa salva.'); }
          catch (erro) { el.querySelector('[data-erro]').textContent = erro.message; botao.disabled = false; }
        });
      },
    });
  }
  window.Pages = window.Pages || {};
  Pages.empresas = { render };
})();
