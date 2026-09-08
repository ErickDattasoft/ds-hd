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

  // ── Restaurar backup: lee el archivo en el navegador y lo manda como JSON ──
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-restaurar-backup]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input[type="file"]');
    var file = input && input.files[0];
    var salida = document.getElementById('resultado-restaurar-backup');
    if (!file || !salida) return;
    if (!window.confirm('¿Restaurar este backup? Se agregará o actualizará lo que traiga el archivo — no se borra nada existente.')) return;
    var reader = new FileReader();
    reader.onload = function () {
      salida.innerHTML = '<p class="muted">Restaurando…</p>';
      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: reader.result,
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data.ok) {
            var r = data.resumen;
            salida.innerHTML =
              '<p class="alert alert--ok">Restaurado: ' +
              r.empresas + ' empresas, ' + r.contactos + ' contactos, ' + r.tickets + ' tickets, ' +
              r.cotizaciones + ' cotizaciones, ' + r.versiones + ' versiones, ' + r.kb + ' artículos de KB, ' +
              r.usuarios + ' usuarios.' +
              (r.errores.length ? ' ' + r.errores.length + ' con error (revisa la consola).' : '') +
              '</p>';
            if (r.errores.length) console.warn('Errores al restaurar:', r.errores);
          } else {
            salida.innerHTML = '<p class="alert alert--error">' + data.error + '</p>';
          }
        })
        .catch(function () {
          salida.innerHTML = '<p class="alert alert--error">No se pudo restaurar. Revisa tu conexión e inténtalo de nuevo.</p>';
        });
    };
    reader.readAsText(file);
  });

  // ── Importar Excel (empresas/contactos): sube el archivo por FormData ──
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-importar-excel]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input[type="file"]');
    var file = input && input.files[0];
    var salida = document.getElementById('resultado-importar-excel');
    if (!file || !salida) return;
    salida.innerHTML = '<p class="muted">Importando…</p>';
    var fd = new FormData();
    fd.append('archivo', file);
    fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'x-csrf-token': cookie('x-csrf-token') },
      body: fd,
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          var r = data.resultado;
          var html =
            '<p class="alert alert--ok">' + r.total + ' filas leídas: ' +
            r.creadas + ' creadas, ' + r.actualizadas + ' actualizadas.</p>';
          if (r.errores.length) {
            html += '<p class="alert alert--warning">' + r.errores.length + ' fila(s) con error:</p><ul>';
            r.errores.forEach(function (msg) {
              var li = document.createElement('li');
              li.textContent = msg;
              html += li.outerHTML;
            });
            html += '</ul>';
          }
          salida.innerHTML = html;
        } else {
          salida.innerHTML = '<p class="alert alert--error">' + data.error + '</p>';
        }
      })
      .catch(function () {
        salida.innerHTML = '<p class="alert alert--error">No se pudo importar. Revisa tu conexión e inténtalo de nuevo.</p>';
      });
  });

  // ── Configuración → Integraciones: "probar conexión" (webhook n8n / WhatsApp) ──
  document.addEventListener('click', function (e) {
    var btnWebhook = e.target.closest('[data-probar-webhook]');
    if (btnWebhook) {
      var canal = btnWebhook.getAttribute('data-probar-webhook');
      var input = document.querySelector('[data-n8n-url="' + canal + '"]');
      var salida = document.querySelector('[data-resultado-webhook="' + canal + '"]');
      if (!input || !salida) return;
      if (!input.value) {
        salida.textContent = 'Escribe una URL primero.';
        return;
      }
      salida.textContent = 'Probando…';
      fetch('/app/configuracion/integraciones/probar-webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ url: input.value }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          salida.textContent = (data.ok ? '✅ ' : '❌ ') + data.detalle;
        })
        .catch(function () {
          salida.textContent = '❌ No se pudo probar. Revisa tu conexión.';
        });
      return;
    }

    var btnWhatsapp = e.target.closest('[data-probar-whatsapp]');
    if (btnWhatsapp) {
      var tel = document.querySelector('[data-whatsapp-tel]');
      var key = document.querySelector('[data-whatsapp-key]');
      var salidaWa = document.querySelector('[data-resultado-whatsapp]');
      if (!tel || !key || !salidaWa) return;
      if (!tel.value || !key.value) {
        salidaWa.textContent = 'Completa teléfono y API key primero.';
        return;
      }
      salidaWa.textContent = 'Probando…';
      fetch('/app/configuracion/integraciones/probar-whatsapp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ telefono: tel.value, apiKey: key.value }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          salidaWa.textContent = (data.ok ? '✅ ' : '❌ ') + data.detalle;
        })
        .catch(function () {
          salidaWa.textContent = '❌ No se pudo probar. Revisa tu conexión.';
        });
      return;
    }

    var btnCorreo = e.target.closest('[data-probar-correo]');
    if (btnCorreo) {
      var dest = document.querySelector('[data-correo-prueba]');
      var salidaCorreo = document.querySelector('[data-resultado-correo]');
      if (!dest || !salidaCorreo) return;
      if (!dest.value || dest.value.indexOf('@') === -1) {
        salidaCorreo.textContent = 'Escribe un correo de destino primero.';
        return;
      }
      salidaCorreo.textContent = 'Enviando…';
      fetch('/app/configuracion/integraciones/probar-correo', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ email: dest.value }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          salidaCorreo.textContent = (data.ok ? '✅ ' : '❌ ') + data.detalle;
        })
        .catch(function () {
          salidaCorreo.textContent = '❌ No se pudo probar. Revisa tu conexión.';
        });
    }
  });

  // ── Adjuntos de ticket ──────────────────────────────────────────────────
  // Modo "detalle": sube al instante contra el ticket. Modo "crear": acumula en un
  // campo oculto (JSON) que se manda al crear el ticket.
  var ADJ_MAX = 700 * 1024;
  function leerBase64(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var d = String(reader.result || '');
      cb(d.indexOf(',') >= 0 ? d.slice(d.indexOf(',') + 1) : d);
    };
    reader.readAsDataURL(file);
  }
  function nuevosCrear(cont) {
    var campo = document.querySelector('[data-adjuntos-nuevos]');
    var lista = cont.querySelector('[data-adjuntos-preview]');
    try { return { campo: campo, lista: lista, arr: JSON.parse(campo.value || '[]') }; }
    catch (e) { void e; return { campo: campo, lista: lista, arr: [] }; }
  }
  function pintaPreview(st) {
    if (!st.lista) return;
    st.lista.innerHTML = st.arr.length
      ? st.arr.map(function (a, i) {
          return '<li>📎 ' + a.nombre + ' <button type="button" class="btn btn--ghost btn--sm" data-quitar-nuevo="' + i + '">✕</button></li>';
        }).join('')
      : '<li class="muted">Sin adjuntos.</li>';
  }
  function agregarAdjunto(file) {
    var cont = file.__cont || document.querySelector('[data-adjuntos]');
    if (!cont) return;
    var modo = cont.getAttribute('data-adjuntos-modo') || 'detalle';
    var salida = cont.querySelector('[data-adjunto-resultado]');
    if (file.size > ADJ_MAX) { if (salida) salida.textContent = '❌ "' + file.name + '" supera 700 KB'; return; }

    if (modo === 'crear') {
      leerBase64(file, function (b64) {
        var st = nuevosCrear(cont);
        if (st.arr.length >= 20) return;
        st.arr.push({ nombre: file.name || 'adjunto', contentType: file.type || 'application/octet-stream', base64: b64 });
        st.campo.value = JSON.stringify(st.arr);
        pintaPreview(st);
      });
      return;
    }
    var base = cont.getAttribute('data-adjuntos-base');
    if (!base) return;
    if (salida) salida.textContent = 'Subiendo "' + file.name + '"…';
    leerBase64(file, function (b64) {
      fetch(base + '/adjuntos', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ nombre: file.name || 'adjunto', contentType: file.type || 'application/octet-stream', base64: b64 }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) window.location.reload();
          else if (salida) salida.textContent = '❌ ' + (data.detalle || 'No se pudo subir');
        })
        .catch(function () { if (salida) salida.textContent = '❌ No se pudo subir. Revisa tu conexión.'; });
    });
  }

  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-adjunto-file]');
    if (!input || !input.files) return;
    var cont = input.closest('[data-adjuntos]');
    Array.prototype.forEach.call(input.files, function (f) { f.__cont = cont; agregarAdjunto(f); });
    input.value = '';
  });
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quitar-nuevo]');
    if (!q) return;
    var cont = q.closest('[data-adjuntos]');
    var st = nuevosCrear(cont);
    st.arr.splice(parseInt(q.getAttribute('data-quitar-nuevo'), 10), 1);
    st.campo.value = JSON.stringify(st.arr);
    pintaPreview(st);
  });
  document.addEventListener('paste', function (e) {
    var cont = document.querySelector('[data-adjuntos] [data-adjunto-file]');
    if (!cont) return;
    cont = cont.closest('[data-adjuntos]');
    var items = (e.clipboardData && e.clipboardData.items) || [];
    Array.prototype.forEach.call(items, function (it) {
      if (it.kind === 'file') { var f = it.getAsFile(); if (f) { f.__cont = cont; agregarAdjunto(f); } }
    });
  });
  // Botón 🖼️ Imagen del editor → abre el selector de adjuntos
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-insertar-imagen]')) return;
    e.preventDefault();
    var f = document.querySelector('[data-adjuntos] [data-adjunto-file]');
    if (f) f.click();
    else toast('Abre la sección "Adjuntos" para agregar imágenes');
  });

  // ── Form de ticket: "Otro" sistema + "Guardar y crear otro" ──────────────
  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-sistema-select]');
    if (!sel) return;
    var otro = document.querySelector('[data-sistema-otro]');
    if (otro) otro.hidden = sel.value !== '__otro__';
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-submit-y-nuevo]')) return;
    var f = document.querySelector('[data-guardar-y-nuevo]');
    if (f) f.value = '1';
  });

  // ── Form de empresa: licencias por sistema (desde el textarea) + campos extra ──
  function sincroLicencias() {
    var ta = document.querySelector('[data-sistemas-textarea]');
    var tabla = document.querySelector('[data-licencias-tabla]');
    if (!ta || !tabla) return;
    var vig, ver;
    try { vig = JSON.parse(tabla.getAttribute('data-vigencias') || '{}'); } catch (e) { void e; vig = {}; }
    try { ver = JSON.parse(tabla.getAttribute('data-versiones') || '{}'); } catch (e) { void e; ver = {}; }
    var tb = tabla.tBodies[0];
    // conserva lo ya escrito
    Array.prototype.forEach.call(tb.querySelectorAll('tr[data-sistema]'), function (tr) {
      var s = tr.getAttribute('data-sistema');
      var vi = tr.querySelector('input[type="date"]'); if (vi) vig[s] = vi.value;
      var vr = tr.querySelector('input[type="text"]'); if (vr) ver[s] = vr.value;
    });
    var sistemas = ta.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    tb.innerHTML = sistemas.length
      ? sistemas.map(function (s) {
          return '<tr data-sistema="' + s + '"><td>' + s + '</td>' +
            '<td><input type="date" name="vigencia:' + s + '" value="' + (vig[s] || '') + '"></td>' +
            '<td><input type="text" name="version:' + s + '" value="' + (ver[s] || '') + '" placeholder="ej. 16.3.1 SP2"></td></tr>';
        }).join('')
      : '<tr><td colspan="3" class="muted">Agrega sistemas arriba.</td></tr>';
  }
  document.addEventListener('input', function (e) {
    if (e.target.closest('[data-sistemas-textarea]')) sincroLicencias();
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-agregar-campo-extra]')) {
      var tb = document.querySelector('[data-campos-extra-body]');
      if (!tb) return;
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><input name="campoExtraEtiqueta" placeholder="Ej: Contrato"></td>' +
        '<td><input name="campoExtraValor"></td>' +
        '<td><button type="button" class="btn btn--ghost btn--sm" data-quitar-fila>✕</button></td>';
      tb.appendChild(tr);
      return;
    }
    var q = e.target.closest('[data-quitar-fila]');
    if (q) { var row = q.closest('tr'); if (row) row.remove(); }
  });

  // ── Imprimir / guardar como PDF ────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-print]')) {
      e.preventDefault();
      window.print();
    }
  });
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('[data-print-auto]')) setTimeout(function () { window.print(); }, 150);
  });

  // ── Doble clic en una fila de tabla → abrir el primer enlace de la fila ──
  document.addEventListener('dblclick', function (e) {
    if (e.target.closest('a, button, input, select, textarea, label')) return;
    var row = e.target.closest('.data-table tbody tr');
    if (!row) return;
    var link = row.querySelector('a[href]');
    if (link) window.location.href = link.href;
  });

  // ── Búsqueda global (Ctrl/Cmd+K) ─────────────────────────────────────────
  function abrirBusquedaGlobal() {
    var dialog = document.getElementById('busqueda-global');
    if (!dialog) return;
    dialog.showModal();
    var input = dialog.querySelector('input[name="q"]');
    if (input) {
      input.value = '';
      input.focus();
    }
    var resultados = document.getElementById('busqueda-global-resultados');
    if (resultados) resultados.innerHTML = '';
  }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      abrirBusquedaGlobal();
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-busqueda-abrir]')) abrirBusquedaGlobal();
  });
  document.addEventListener('click', function (e) {
    var dialog = document.getElementById('busqueda-global');
    if (dialog && e.target === dialog) dialog.close();
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
  // ── Tablas: scroll horizontal, ordenar por columna y ancho ajustable ─────
  function claveTabla(tabla) {
    if (tabla.getAttribute('data-tabla')) return 'tbl:' + tabla.getAttribute('data-tabla');
    var ths = tabla.tHead ? tabla.tHead.rows[0].cells : [];
    var cols = Array.prototype.map.call(ths, function (th) { return th.textContent.trim().slice(0, 12); }).join('|');
    return 'tbl:' + location.pathname + '#' + cols;
  }
  function lee(clave) { try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) { void e; return null; } }
  function guarda(clave, val) { try { localStorage.setItem(clave, JSON.stringify(val)); } catch (e) { void e; } }

  function valorCelda(fila, idx) {
    var td = fila.cells[idx];
    if (!td) return '';
    var raw = td.getAttribute('data-sort-value');
    var txt = raw != null ? raw : td.textContent.trim();
    var num = parseFloat(txt.replace(/[^0-9.,-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.'));
    return { txt: txt, num: isNaN(num) || !/[0-9]/.test(txt) ? null : num };
  }

  function ordenarPor(tabla, idx, dir) {
    var tb = tabla.tBodies[0];
    if (!tb) return;
    var filas = Array.prototype.filter.call(tb.rows, function (r) {
      return r.cells.length > 1 && !r.querySelector('[colspan]');
    });
    if (filas.length < 2) return;
    filas.sort(function (a, b) {
      var va = valorCelda(a, idx), vb = valorCelda(b, idx), c;
      if (va.num !== null && vb.num !== null) c = va.num - vb.num;
      else c = va.txt.localeCompare(vb.txt, 'es', { numeric: true });
      return dir === 'desc' ? -c : c;
    });
    filas.forEach(function (f) { tb.appendChild(f); });
  }

  function initTablas(scope) {
    (scope || document).querySelectorAll('table.data-table').forEach(function (tabla) {
      if (tabla.__enh) return;
      tabla.__enh = true;

      if (!tabla.parentElement.classList.contains('table-wrap')) {
        var wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        tabla.parentNode.insertBefore(wrap, tabla);
        wrap.appendChild(tabla);
      }
      var thead = tabla.tHead;
      if (!thead || !thead.rows.length) return;
      var clave = claveTabla(tabla);
      var estado = lee(clave) || {};

      // Anchos guardados
      if (estado.anchos) {
        tabla.style.tableLayout = 'fixed';
        Array.prototype.forEach.call(thead.rows[0].cells, function (th, i) {
          if (estado.anchos[i]) th.style.width = estado.anchos[i] + 'px';
        });
      }

      Array.prototype.forEach.call(thead.rows[0].cells, function (th, idx) {
        if (!th.hasAttribute('data-no-ordenar')) {
          th.classList.add('th-ordenable');
          th.addEventListener('click', function (e) {
            if (e.target.classList.contains('col-ajuste')) return;
            var dir = estado.orden && estado.orden.idx === idx && estado.orden.dir === 'asc' ? 'desc' : 'asc';
            estado.orden = { idx: idx, dir: dir };
            guarda(clave, estado);
            marcarFlechas(thead.rows[0], idx, dir);
            ordenarPor(tabla, idx, dir);
          });
        }
        // Handle de ajuste de ancho
        var h = document.createElement('span');
        h.className = 'col-ajuste';
        th.appendChild(h);
        h.addEventListener('mousedown', function (e) {
          e.preventDefault();
          e.stopPropagation();
          tabla.style.tableLayout = 'fixed';
          var x0 = e.pageX, w0 = th.offsetWidth;
          function mover(ev) {
            var w = Math.max(48, w0 + (ev.pageX - x0));
            th.style.width = w + 'px';
          }
          function soltar() {
            document.removeEventListener('mousemove', mover);
            document.removeEventListener('mouseup', soltar);
            estado.anchos = estado.anchos || {};
            Array.prototype.forEach.call(thead.rows[0].cells, function (c, i) {
              estado.anchos[i] = c.offsetWidth;
            });
            guarda(clave, estado);
          }
          document.addEventListener('mousemove', mover);
          document.addEventListener('mouseup', soltar);
        });
      });

      if (estado.orden) {
        marcarFlechas(thead.rows[0], estado.orden.idx, estado.orden.dir);
        ordenarPor(tabla, estado.orden.idx, estado.orden.dir);
      }
    });
  }
  function marcarFlechas(tr, idx, dir) {
    Array.prototype.forEach.call(tr.cells, function (th, i) {
      var f = th.querySelector('.col-flecha');
      if (i === idx) {
        if (!f) { f = document.createElement('span'); f.className = 'col-flecha'; th.insertBefore(f, th.querySelector('.col-ajuste')); }
        f.textContent = dir === 'desc' ? ' ▼' : ' ▲';
      } else if (f) {
        f.remove();
      }
    });
  }

  // ── Insertar encabezado / firma en el editor de tickets ──────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-insertar]');
    if (!btn) return;
    e.preventDefault();
    var tipo = btn.getAttribute('data-insertar');
    var caja = document.querySelector(btn.getAttribute('data-destino') || '#nota-cuerpo, [name="descripcion"], [name="cuerpo"]');
    if (!caja) return;
    var texto = btn.getAttribute('data-texto') || '';
    if (tipo === 'encabezado') {
      var hoy = new Date().toLocaleDateString('es-MX');
      texto = (texto || 'Fecha: [fecha]\n\nSíntoma:\n\nProblema:\n\nSolución:\n\nTiempo trabajado:\n').replace(/\[fecha\]/g, hoy);
      caja.value = texto + (caja.value ? '\n\n' + caja.value : '');
    } else {
      if (!texto) { toast('No tienes una firma configurada — ponla en "Mi perfil"'); return; }
      caja.value = (caja.value ? caja.value.replace(/\s+$/, '') + '\n\n' : '') + texto;
    }
    caja.focus();
  });

  document.addEventListener('DOMContentLoaded', function () {
    updateToggle();
    initKanban();
    initTablas();
  });
  document.body.addEventListener('htmx:afterSwap', function (e) {
    initKanban();
    initTablas(e.target);
  });
})();
