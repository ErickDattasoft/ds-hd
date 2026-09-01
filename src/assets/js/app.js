/* JS de cliente de ds-hd. Sin dependencias más allá de htmx (cargado aparte). */
(function () {
  'use strict';
  var root = document.documentElement;

  // ── Tema (claro / oscuro / sistema) ───────────────────────────────────────
  function setTheme(mode) {
    if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
      document.cookie = 'theme=' + mode + ';path=/;max-age=31536000;samesite=lax';
    } else {
      root.removeAttribute('data-theme');
      document.cookie = 'theme=;path=/;max-age=0';
    }
    updateToggle();
  }
  function currentTheme() {
    return root.getAttribute('data-theme') || 'system';
  }
  function updateToggle() {
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    var t = currentTheme();
    btn.textContent = t === 'dark' ? '☾' : t === 'light' ? '☀' : '◐';
    btn.setAttribute('aria-label', 'Tema: ' + t + ' (clic para cambiar)');
  }
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-theme-toggle]');
    if (!toggle) return;
    var order = ['system', 'light', 'dark'];
    var next = order[(order.indexOf(currentTheme()) + 1) % order.length];
    setTheme(next);
  });

  // ── Nav móvil ────────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    if (e.target.closest('[data-nav-toggle]')) {
      sidebar.classList.toggle('is-open');
      toggleBackdrop(sidebar.classList.contains('is-open'));
    } else if (e.target.classList.contains('sidebar-backdrop')) {
      sidebar.classList.remove('is-open');
      toggleBackdrop(false);
    }
  });
  function toggleBackdrop(show) {
    var bd = document.querySelector('.sidebar-backdrop');
    if (show && !bd) {
      bd = document.createElement('div');
      bd.className = 'sidebar-backdrop';
      document.body.appendChild(bd);
    } else if (!show && bd) {
      bd.remove();
    }
  }

  // ── Confirmación en acciones destructivas ───────────────────────────────
  document.addEventListener('submit', function (e) {
    var msg = e.target.getAttribute && e.target.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) {
      e.preventDefault();
    }
  });

  // ── CSRF en peticiones htmx ──────────────────────────────────────────────
  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  document.body.addEventListener('htmx:configRequest', function (evt) {
    var m = (evt.detail.verb || 'get').toLowerCase();
    if (m !== 'get' && m !== 'head') {
      evt.detail.headers['x-csrf-token'] = cookie('x-csrf-token');
    }
  });

  // ── Toasts ──────────────────────────────────────────────────────────────
  function toast(msg, tipo) {
    var box = document.querySelector('.toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toasts';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    var el = document.createElement('div');
    el.className = 'toast toast--' + (tipo || 'ok');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 4000);
  }
  window.dsToast = toast;
  document.body.addEventListener('htmx:responseError', function () {
    toast('No se pudo completar la acción. Recarga la página.', 'error');
  });

  // ── Kanban: arrastrar tarjeta → cambiar estado ──────────────────────────
  function initKanban() {
    var board = document.querySelector('[data-kanban]');
    if (!board || !window.htmx) return;
    var dragged = null;
    board.querySelectorAll('.kanban__card').forEach(function (card) {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', function () {
        dragged = card;
        setTimeout(function () {
          card.style.opacity = '0.4';
        }, 0);
      });
      card.addEventListener('dragend', function () {
        card.style.opacity = '';
      });
    });
    board.querySelectorAll('[data-col-estado]').forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        col.classList.add('is-dragover');
      });
      col.addEventListener('dragleave', function () {
        col.classList.remove('is-dragover');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('is-dragover');
        if (!dragged) return;
        var id = dragged.getAttribute('data-ticket-id');
        var estado = col.getAttribute('data-col-estado');
        col.appendChild(dragged);
        window.htmx.ajax('POST', '/app/tickets/' + id + '/estado', {
          values: { estado: estado, _csrf: cookie('x-csrf-token') },
          swap: 'none',
        });
        toast('Ticket movido a "' + estado + '"');
      });
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    updateToggle();
    initKanban();
  });
  document.body.addEventListener('htmx:afterSwap', initKanban);
})();
