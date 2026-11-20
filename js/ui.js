/* Utilitários de interface: ícones, formatação, modal, toast, gráficos simples. */
(function () {
  const P = {
    painel: '<rect x="3.75" y="3.75" width="6.75" height="6.75" rx="2"/><rect x="13.5" y="3.75" width="6.75" height="6.75" rx="2"/><rect x="3.75" y="13.5" width="6.75" height="6.75" rx="2"/><rect x="13.5" y="13.5" width="6.75" height="6.75" rx="2"/>',
    box: '<path d="M20.25 7.5 12 3 3.75 7.5m16.5 0L12 12m8.25-4.5v9L12 21m0-9L3.75 7.5M12 12v9m-8.25-4.5v-9"/>',
    tag: '<path d="M3.75 4.5v5.38c0 .6.24 1.17.66 1.6l8.1 8.1a1.5 1.5 0 0 0 2.13 0l5.38-5.38a1.5 1.5 0 0 0 0-2.12l-8.1-8.1a2.25 2.25 0 0 0-1.6-.66H4.5a.75.75 0 0 0-.75.75Z"/><circle cx="8" cy="8" r="1.25"/>',
    building: '<path d="M3.75 21h16.5M5.25 21V4.5a1.5 1.5 0 0 1 1.5-1.5h10.5a1.5 1.5 0 0 1 1.5 1.5V21M9 7h1.5M13.5 7H15M9 10.5h1.5M13.5 10.5H15M9 14h1.5M13.5 14H15M10.5 21v-3.5h3V21"/>',
    chart: '<path d="M3.75 20.25h16.5M6.75 17.25v-6M11.25 17.25V6.75M15.75 17.25v-4.5M20.25 17.25V9"/>',
    gear: '<path d="M4.5 6.75h9M17.25 6.75h2.25M4.5 12h3M11.25 12h8.25M4.5 17.25h9M17.25 17.25h2.25"/><circle cx="15.375" cy="6.75" r="1.875"/><circle cx="9.375" cy="12" r="1.875"/><circle cx="15.375" cy="17.25" r="1.875"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.75"/><path d="m20.25 20.25-4.97-4.97"/>',
    plus: '<path d="M12 4.5v15m7.5-7.5h-15"/>',
    x: '<path d="M6 18 18 6M6 6l12 12"/>',
    edit: '<path d="m16.86 4.49 2.65 2.65a1.5 1.5 0 0 1 0 2.12L9.75 19.02 4.5 19.5l.48-5.25 9.76-9.76a1.5 1.5 0 0 1 2.12 0Z"/><path d="m13.5 6.75 3.75 3.75"/>',
    trash: '<path d="M4.5 6.75h15M9.75 6.75V4.5h4.5v2.25M6.75 6.75l.75 12.75a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l.75-12.75M10.5 10.5v6M13.5 10.5v6"/>',
    in: '<path d="M12 3.75v11.25m0 0-4.5-4.5M12 15l4.5-4.5M4.5 15.75v2.25a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-2.25"/>',
    out: '<path d="M12 15V3.75m0 0L7.5 8.25M12 3.75l4.5 4.5M4.5 15.75v2.25a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-2.25"/>',
    adj: '<path d="M7.5 4.5v15m0 0L4.5 16.5m3 3 3-3M16.5 19.5v-15m0 0-3 3m3-3 3 3"/>',
    swap: '<path d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>',
    alert: '<path d="M12 9v3.75m0 3.75h.01M10.29 3.86 2.82 17.05A1.95 1.95 0 0 0 4.52 20h14.96a1.95 1.95 0 0 0 1.7-2.95L13.71 3.86a1.97 1.97 0 0 0-3.42 0Z"/>',
    menu: '<path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>',
    sun: '<circle cx="12" cy="12" r="3.75"/><path d="M12 2.25v2.25M12 19.5v2.25M4.5 12H2.25M21.75 12H19.5M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M5.1 18.9l1.6-1.6M17.3 6.7l1.6-1.6"/>',
    moon: '<path d="M21.75 15A9.72 9.72 0 0 1 9 2.25 9.75 9.75 0 1 0 21.75 15Z"/>',
    printer: '<path d="M6.75 8.25V3.75h10.5v4.5M6.75 17.25H4.5a1.5 1.5 0 0 1-1.5-1.5V9.75a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-2.25"/><path d="M6.75 13.5h10.5v6.75H6.75z"/>',
    download: '<path d="M12 3.75v11.25m0 0-4.5-4.5M12 15l4.5-4.5M3.75 19.5h16.5"/>',
    upload: '<path d="M12 15V3.75m0 0L7.5 8.25M12 3.75l4.5 4.5M3.75 19.5h16.5"/>',
    link: '<path d="M13.19 8.69a4.5 4.5 0 0 1 1.24 7.24l-3 3a4.5 4.5 0 0 1-6.36-6.36l1.76-1.76m11.32-1.62 1.76-1.76a4.5 4.5 0 0 0-6.36-6.36l-3 3a4.5 4.5 0 0 0 1.24 7.24"/>',
    inbox: '<path d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.01 1.24l.27.53a2.25 2.25 0 0 0 2.01 1.23h3.2a2.25 2.25 0 0 0 2.01-1.23l.27-.53a2.25 2.25 0 0 1 2.01-1.24h3.86M2.25 13.5V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.5M2.25 13.5l2.6-7.8A2.25 2.25 0 0 1 6.98 4.5h10.04a2.25 2.25 0 0 1 2.13 1.2l2.6 7.8"/>',
    door: '<path d="M4.5 21h15M6.75 21V3.75h10.5V21"/><circle cx="14.25" cy="12.75" r=".75"/>',
    users: '<circle cx="9" cy="8.25" r="3"/><path d="M3.75 19.5a5.25 5.25 0 0 1 10.5 0M15.75 5.4a3 3 0 0 1 0 5.7M17.25 14.6a5.25 5.25 0 0 1 3 4.9"/>',
    car: '<path d="M5.25 16.5v2.25M18.75 16.5v2.25M3.75 12.75l1.6-4.8A1.5 1.5 0 0 1 6.77 6.9h10.46a1.5 1.5 0 0 1 1.42 1.05l1.6 4.8M3.75 12.75h16.5v3.75H3.75z"/><circle cx="7.5" cy="14.6" r=".6"/><circle cx="16.5" cy="14.6" r=".6"/>',
    pin: '<path d="M12 21s-6.75-5.6-6.75-11.25a6.75 6.75 0 0 1 13.5 0C18.75 15.4 12 21 12 21Z"/><circle cx="12" cy="9.75" r="2.25"/>',
    layers: '<path d="m3.75 9 8.25 4.5L20.25 9 12 4.5 3.75 9Z"/><path d="m3.75 13.5 8.25 4.5 8.25-4.5"/>',
    check: '<path d="m4.5 12.75 6 6 9-13.5"/>',
    logout: '<path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"/>',
    user: '<circle cx="12" cy="7.5" r="3.75"/><path d="M4.5 20.25a7.5 7.5 0 0 1 15 0"/>',
    clock: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2.25"/>',
    warehouse: '<path d="M2.25 21h19.5M3.75 21V8.25L12 3.75l8.25 4.5V21M7.5 21v-8.25h9V21M7.5 16.5h9"/>',
  };

  function icon(name, cls) {
    return `<svg class="i ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function num(v, max) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max === undefined ? 2 : max }).format(Number(v) || 0);
  }
  function data(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function hora(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* ---------- Modal ---------- */
  let modalStack = [];
  function openModal({ title, body, footer, wide, onMount }) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal__head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button></div>
        <div class="modal__body">${body}</div>
        ${footer ? `<div class="modal__foot">${footer}</div>` : ''}
      </div>`;
    const prevFocus = document.activeElement;
    const close = () => {
      wrap.remove();
      modalStack = modalStack.filter((m) => m !== api);
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
    const onKey = (e) => { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === api) close(); };
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    const api = { el: wrap, close };
    modalStack.push(api);
    const first = wrap.querySelector('.modal__body input:not([type=hidden]):not([type=color]), .modal__body select, .modal__body textarea');
    if (first) setTimeout(() => first.focus(), 30);
    if (onMount) onMount(wrap, close);
    return api;
  }

  function confirm({ title, message, confirmText, danger }) {
    return new Promise((resolve) => {
      let ok = false;
      const m = openModal({
        title,
        body: `<p class="muted mt-0" style="font-size:14px;line-height:1.5">${message}</p>`,
        footer: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText || 'Confirmar')}</button>`,
      });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { ok = true; m.close(); });
      const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); resolve(ok); } });
      obs.observe(document.body, { childList: true });
    });
  }

  /* ---------- Toast ---------- */
  function toast(msg, opts) {
    opts = opts || {};
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (opts.error ? ' toast--error' : '');
    t.innerHTML = `<span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => t.remove(), opts.duration || 3200);
  }

  /* ---------- Gráficos ---------- */
  function bars(rows, fmt) {
    const max = Math.max(0, ...rows.map((r) => r.valor));
    if (!rows.length || max <= 0) return empty('Sem dados para exibir.', true);
    return `<div class="bars">${rows.map((r) => `
      <div class="bar-row">
        <div class="bar-row__label" title="${esc(r.nome)}">${r.cor ? `<span class="dot" style="background:${esc(r.cor)}"></span>` : ''}<span class="t">${esc(r.nome)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(r.valor / max) * 100}%;${r.cor ? `background:${esc(r.cor)}` : ''}"></div></div>
        <div class="bar-row__value">${(fmt || ((v) => num(v, 0)))(r.valor)}</div>
      </div>`).join('')}</div>`;
  }

  /* cols: [{label, a, b}] — duas séries opcionais */
  function vchart(cols, opts) {
    opts = opts || {};
    const max = Math.max(0, ...cols.map((c) => Math.max(c.a || 0, c.b || 0)));
    if (max <= 0) return empty('Sem dados para exibir.', true);
    const fmt = opts.fmt || ((v) => num(v, 0));
    return `
      ${opts.legend ? `<div class="legend" style="margin-bottom:8px">${opts.legend.map((l, i) => `<span><i style="background:${i ? 'var(--accent)' : 'var(--primary)'}"></i>${esc(l)}</span>`).join('')}</div>` : ''}
      <div class="vchart">${cols.map((c) => `
        <div class="vchart__col">
          <div class="vchart__bars">
            <div class="vchart__bar" style="height:${((c.a || 0) / max) * 100}%" title="${esc(c.label)}: ${fmt(c.a || 0)}"></div>
            ${'b' in c ? `<div class="vchart__bar alt" style="height:${((c.b || 0) / max) * 100}%" title="${esc(c.label)}: ${fmt(c.b || 0)}"></div>` : ''}
          </div>
          <div class="vchart__label">${esc(c.label)}</div>
        </div>`).join('')}
      </div>`;
  }

  function empty(msg, small, action) {
    return `<div class="empty ${small ? 'empty--sm' : ''}">${icon('inbox')}<div>${esc(msg)}</div>${action || ''}</div>`;
  }

  function badgeEstoque(p) {
    const st = Store.statusEstoque(p);
    if (st === 'zerado') return '<span class="badge badge-danger">Sem estoque</span>';
    if (st === 'baixo') return '<span class="badge badge-warn">Estoque baixo</span>';
    return '<span class="badge badge-ok">OK</span>';
  }

  function catBadge(catId) {
    const c = Store.categoria(catId);
    if (!c) return '<span class="badge">Sem categoria</span>';
    return `<span class="badge"><span class="dot" style="background:${esc(c.cor)}"></span>${esc(c.nome)}</span>`;
  }

  function movItem(m) {
    const t = Store.TIPOS_MOV[m.tipo] || Store.TIPOS_MOV.ajuste;
    const destino = m.tipo === 'saida' ? ` → ${Store.nomeLocal(m) || 'sem local'}` : '';
    const q = Math.abs(m.quantidade);
    const sinal = m.tipo === 'saida' || m.tipo === 'exclusao' ? '−' : m.tipo === 'ajuste' ? (m.quantidade < 0 ? '−' : '+') : '+';
    const cor = m.tipo === 'entrada' || m.tipo === 'cadastro' ? 'text-ok' : m.tipo === 'saida' ? 'text-warn' : m.tipo === 'exclusao' ? 'text-danger' : '';
    return `
      <div class="list-item">
        <div class="list-item__icon ${t.cls}">${icon(t.icon, 'i-sm')}</div>
        <div class="list-item__body">
          <div class="cell-title">${esc(m.produtoNome || 'Produto')}</div>
          <div class="list-item__meta">${esc(t.nome + destino)} · ${data(m.data)}${m.responsavel ? ' · ' + esc(m.responsavel) : ''}</div>
        </div>
        <div class="list-item__right"><div class="cell-title ${cor}">${sinal}${num(q)} ${esc(m.unidade || '')}</div></div>
      </div>`;
  }

  function download(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.Pages = window.Pages || {};
  window.UI = { icon, esc, num, data, hora, MESES, openModal, confirm, toast, bars, vchart, empty, badgeEstoque, catBadge, movItem, download };
})();
