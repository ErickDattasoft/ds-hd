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

  // ── Colapsar menú lateral (escritorio) ─────────────────────────────────────
  function pintarColapsar() {
    var btn = document.querySelector('[data-nav-colapsar]');
    if (btn) btn.textContent = root.getAttribute('data-sidebar') === 'mini' ? '›' : '‹';
  }
  pintarColapsar();
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-nav-colapsar]')) return;
    var mini = root.getAttribute('data-sidebar') !== 'mini';
    if (mini) root.setAttribute('data-sidebar', 'mini');
    else root.removeAttribute('data-sidebar');
    document.cookie = 'sidebar=' + (mini ? 'mini;max-age=31536000' : ';max-age=0') + ';path=/;samesite=lax';
    pintarColapsar();
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

  // ── Puntos de restauración (GitHub): crea un tag anotado sobre HEAD de main ──
  // El PAT nunca sale del navegador — fetch directo del cliente a api.github.com,
  // igual que hacía el CRM viejo (localStorage, sin pasar por el servidor de ds-hd).
  (function () {
    var GH_OWNER = 'ErickDattasoft';
    var GH_REPO = 'ds-hd';
    var GH_PAT_KEY = 'ds_hd_gh_pat';
    var contenedor = document.querySelector('[data-gh-punto]');
    if (!contenedor) return;
    var patInput = contenedor.querySelector('[data-gh-pat]');
    if (patInput) {
      patInput.value = localStorage.getItem(GH_PAT_KEY) || '';
      // Se guarda apenas lo escribes, no solo al crear un punto — si no, un campo "Nombre"
      // vacío al hacer clic en "Crear" perdía el token ya tecleado (nunca llegaba a guardarse).
      patInput.addEventListener('input', function () {
        try { localStorage.setItem(GH_PAT_KEY, patInput.value.trim()); } catch (e) { void e; }
      });
    }
    contenedor.querySelector('[data-gh-crear]').addEventListener('click', function () {
      var pat = (patInput.value || '').trim();
      var nombre = contenedor.querySelector('[data-gh-nombre]').value.trim().replace(/\s+/g, '-');
      var desc = contenedor.querySelector('[data-gh-desc]').value.trim() || ('Punto de restauración ' + nombre);
      var estado = contenedor.querySelector('[data-gh-estado]');
      var btn = contenedor.querySelector('[data-gh-crear]');
      if (!pat) { toast('Falta el Personal Access Token de GitHub'); return; }
      if (!nombre) { toast('El nombre del punto no puede estar vacío'); return; }

      var headers = { Authorization: 'Bearer ' + pat, Accept: 'application/vnd.github+json' };
      btn.disabled = true;
      estado.textContent = '⏳ Obteniendo commit actual…';

      fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/git/ref/heads/main', { headers: headers })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status === 401 ? 'Token inválido o sin permiso' : 'Error ' + r.status);
          return r.json();
        })
        .then(function (ref) {
          estado.textContent = '⏳ Creando tag anotado…';
          return fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/git/tags', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
            body: JSON.stringify({
              tag: nombre,
              message: desc,
              object: ref.object.sha,
              type: 'commit',
              tagger: { name: 'ds-hd', email: 'erick.casas@dattasoft.mx', date: new Date().toISOString() },
            }),
          }).then(function (r) {
            if (!r.ok) return r.json().then(function (err) { throw new Error(err.message || 'Error ' + r.status); });
            return r.json();
          });
        })
        .then(function (tag) {
          return fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/git/refs', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
            body: JSON.stringify({ ref: 'refs/tags/' + nombre, sha: tag.sha }),
          }).then(function (r) {
            if (!r.ok) return r.json().then(function (err) { throw new Error(err.message || 'Error ' + r.status); });
          });
        })
        .then(function () {
          estado.textContent = '✓ Punto "' + nombre + '" creado en GitHub';
          toast('🔖 Punto de restauración "' + nombre + '" guardado');
        })
        .catch(function (err) {
          estado.textContent = '✗ ' + err.message;
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  })();

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
    var btn = e.submitter || form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
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
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
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
    var btn = e.submitter || form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
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
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      });
  });

  // ── Base de conocimiento: subida en lote (lee los archivos en el navegador) ──
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-kb-subir]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input[type="file"]');
    var files = input && input.files ? Array.prototype.slice.call(input.files) : [];
    var salida = document.getElementById('resultado-kb-subir');
    if (!files.length || !salida) return;
    var btn = e.submitter || form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
    salida.innerHTML = '<p class="muted">Leyendo ' + files.length + ' archivo(s)…</p>';
    Promise.all(
      files.map(function (file) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve({
              nombre: file.name || 'archivo',
              contenido: String(reader.result || ''),
              rutaRelativa: file.webkitRelativePath || file.name || '',
            });
          };
          reader.onerror = function () { resolve(null); };
          reader.readAsText(file);
        });
      }),
    ).then(function (archivos) {
      var vis = form.querySelector('[name="visibilidad"]');
      var pub = form.querySelector('[name="publicado"]');
      salida.innerHTML = '<p class="muted">Subiendo…</p>';
      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({
          archivos: archivos.filter(Boolean),
          visibilidad: vis ? vis.value : 'staff',
          publicado: pub && pub.checked ? 'on' : '',
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            window.location.href = '/app/kb?aviso=' + encodeURIComponent(data.creados + ' archivo(s) importado(s)');
          } else {
            salida.innerHTML = '<p class="alert alert--error">' + data.error + '</p>';
          }
        })
        .catch(function () {
          salida.innerHTML = '<p class="alert alert--error">No se pudo subir. Revisa tu conexión e inténtalo de nuevo.</p>';
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
        });
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
      btnWebhook.disabled = true;
      btnWebhook.classList.add('is-loading');
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
        })
        .finally(function () {
          btnWebhook.disabled = false;
          btnWebhook.classList.remove('is-loading');
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
      btnWhatsapp.disabled = true;
      btnWhatsapp.classList.add('is-loading');
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
        })
        .finally(function () {
          btnWhatsapp.disabled = false;
          btnWhatsapp.classList.remove('is-loading');
        });
      return;
    }

    var btnWaCli = e.target.closest('[data-probar-wa-clientes]');
    if (btnWaCli) {
      var telCli = document.querySelector('[data-wa-prueba-tel]');
      var salidaCli = document.querySelector('[data-resultado-wa-clientes]');
      if (!telCli || !salidaCli) return;
      btnWaCli.disabled = true;
      salidaCli.textContent = 'Enviando…';
      fetch('/app/configuracion/integraciones/probar-whatsapp-clientes', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ telefono: telCli.value }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) { salidaCli.textContent = (data.ok ? '✅ ' : '❌ ') + data.detalle; })
        .catch(function () { salidaCli.textContent = '❌ No se pudo probar.'; })
        .finally(function () { btnWaCli.disabled = false; });
      return;
    }

    var btnWaOtros = e.target.closest('[data-probar-whatsapp-otros]');
    if (btnWaOtros) {
      var area = document.querySelector('[data-whatsapp-otros]');
      var lista = document.querySelector('[data-resultado-whatsapp-otros]');
      if (!area || !lista) return;
      lista.innerHTML = '';
      var filas = area.value.split(/\r?\n/).map(function (l) {
        return l.split(/[,|\t]/).map(function (p) { return p.trim(); });
      }).filter(function (p) { return p.length >= 3 && p[1] && p[2]; });
      if (!filas.length) {
        lista.textContent = 'Escribe al menos una línea: Nombre, teléfono, API key.';
        return;
      }
      btnWaOtros.disabled = true;
      Promise.all(filas.map(function (p) {
        var li = document.createElement('li');
        li.textContent = p[0] + ': probando…';
        lista.appendChild(li);
        return fetch('/app/configuracion/integraciones/probar-whatsapp', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
          body: JSON.stringify({ telefono: p[1], apiKey: p[2] }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) { li.textContent = p[0] + ': ' + (data.ok ? '✅ ' : '❌ ') + data.detalle; })
          .catch(function () { li.textContent = p[0] + ': ❌ no se pudo probar'; });
      })).finally(function () { btnWaOtros.disabled = false; });
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
      btnCorreo.disabled = true;
      btnCorreo.classList.add('is-loading');
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
        })
        .finally(function () {
          btnCorreo.disabled = false;
          btnCorreo.classList.remove('is-loading');
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
  // Botón 🖼️ Imagen del editor: si el destino es el editor enriquecido de la descripción,
  // inserta la imagen INLINE (ver rteImagenes abajo); si no (p. ej. "Agregar nota"), abre el
  // selector de adjuntos normal como antes.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-insertar-imagen]');
    if (!btn) return;
    e.preventDefault();
    var destino = btn.getAttribute('data-destino') && document.querySelector(btn.getAttribute('data-destino'));
    if (destino && destino.hasAttribute('data-descripcion-editor')) {
      var input = destino.parentElement.querySelector('[data-descripcion-img-input]');
      if (input) input.click();
      return;
    }
    var f = document.querySelector('[data-adjuntos] [data-adjunto-file]');
    if (f) f.click();
    else toast('Abre la sección "Adjuntos" para agregar imágenes');
  });

  // ── Editor enriquecido de descripción: pegar/insertar imágenes inline ────
  // Las imágenes se comprimen en el navegador (canvas) e insertan como
  // data: URI para verse al instante; el servidor las "desinfla" a adjuntos
  // reales al crear el ticket (ver desinflarImagenesDescripcion en el backend).
  (function () {
    var RTE_MAX_DIM = 1400;
    var RTE_MAX_BYTES = 680 * 1024;

    function comprimirImagen(file, maxDim, calidad) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        var url = URL.createObjectURL(file);
        img.onload = function () {
          URL.revokeObjectURL(url);
          var w = img.naturalWidth || 1;
          var h = img.naturalHeight || 1;
          var escala = Math.min(1, maxDim / Math.max(w, h));
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * escala));
          cv.height = Math.max(1, Math.round(h * escala));
          var ctx = cv.getContext('2d');
          if (!ctx) { reject(new Error('sin canvas')); return; }
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/jpeg', calidad));
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
        img.src = url;
      });
    }

    function tamanoDataUri(d) {
      var i = d.indexOf(',');
      var b64 = i >= 0 ? d.slice(i + 1) : d;
      return Math.ceil((b64.length * 3) / 4);
    }

    function insertarNodoEnEditor(editor, nodo) {
      editor.focus();
      var sel = window.getSelection();
      var range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      if (range && editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(nodo);
        range.setStartAfter(nodo);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.appendChild(nodo);
      }
    }

    function insertarImagenEnEditor(editor, file) {
      if (!file || file.type.indexOf('image/') !== 0) { toast('Solo se pueden insertar imágenes'); return; }
      comprimirImagen(file, RTE_MAX_DIM, 0.72)
        .then(function (d) {
          if (tamanoDataUri(d) <= RTE_MAX_BYTES) return d;
          return comprimirImagen(file, 1000, 0.55);
        })
        .then(function (d) {
          if (tamanoDataUri(d) > RTE_MAX_BYTES) { toast('La imagen es muy grande, incluso comprimida'); return; }
          var img = document.createElement('img');
          img.src = d;
          insertarNodoEnEditor(editor, img);
        })
        .catch(function () { toast('No se pudo procesar la imagen'); });
    }

    document.addEventListener('paste', function (e) {
      var editor = e.target.closest('[data-descripcion-editor]');
      if (!editor) return;
      var items = (e.clipboardData && e.clipboardData.items) || [];
      var archivo = null;
      Array.prototype.forEach.call(items, function (it) {
        if (!archivo && it.kind === 'file' && it.type.indexOf('image/') === 0) archivo = it.getAsFile();
      });
      if (archivo) { e.preventDefault(); insertarImagenEnEditor(editor, archivo); }
    });

    document.addEventListener('change', function (e) {
      var input = e.target.closest('[data-descripcion-img-input]');
      if (!input || !input.files || !input.files[0]) return;
      var editor = input.parentElement.querySelector('[data-descripcion-editor]');
      if (editor) insertarImagenEnEditor(editor, input.files[0]);
      input.value = '';
    });

    // ── Selección de imagen dentro del editor: barra flotante (tamaño/flotar/quitar) ──
    var toolbar = null;
    var imgSeleccionada = null;

    function quitarToolbar() {
      if (toolbar) { toolbar.remove(); toolbar = null; }
      if (imgSeleccionada) { imgSeleccionada.classList.remove('rte-img--seleccionada'); imgSeleccionada = null; }
    }

    function posicionarToolbar() {
      if (!toolbar || !imgSeleccionada) return;
      var r = imgSeleccionada.getBoundingClientRect();
      toolbar.style.top = Math.max(4, r.top - toolbar.offsetHeight - 6) + 'px';
      toolbar.style.left = Math.max(4, r.left) + 'px';
    }

    function mostrarToolbar(img) {
      quitarToolbar();
      imgSeleccionada = img;
      img.classList.add('rte-img--seleccionada');
      toolbar = document.createElement('div');
      toolbar.className = 'rte-img-toolbar';
      toolbar.innerHTML =
        '<button type="button" data-rte-size="240px" title="Chica">S</button>' +
        '<button type="button" data-rte-size="420px" title="Mediana">M</button>' +
        '<button type="button" data-rte-size="100%" title="Grande">L</button>' +
        '<button type="button" data-rte-float="none" title="Sin flotar">▭</button>' +
        '<button type="button" data-rte-float="left" title="Flotar a la izquierda">◧</button>' +
        '<button type="button" data-rte-float="right" title="Flotar a la derecha">◨</button>' +
        '<button type="button" data-rte-quitar title="Quitar imagen">🗑️</button>';
      document.body.appendChild(toolbar);
      posicionarToolbar();
    }

    document.addEventListener('click', function (e) {
      var img = e.target.closest('.rte-editor img');
      if (img) { e.preventDefault(); mostrarToolbar(img); return; }
      if (e.target.closest('.rte-img-toolbar')) return;
      quitarToolbar();
    });

    document.addEventListener('click', function (e) {
      if (!imgSeleccionada) return;
      var tb = e.target.closest('.rte-img-toolbar');
      if (!tb) return;
      var tam = e.target.closest('[data-rte-size]');
      var flot = e.target.closest('[data-rte-float]');
      var quitar = e.target.closest('[data-rte-quitar]');
      if (tam) {
        imgSeleccionada.style.width = tam.getAttribute('data-rte-size');
        imgSeleccionada.style.height = 'auto';
      } else if (flot) {
        var f = flot.getAttribute('data-rte-float');
        if (f === 'none') { imgSeleccionada.style.float = ''; imgSeleccionada.style.margin = ''; }
        else { imgSeleccionada.style.float = f; imgSeleccionada.style.margin = f === 'left' ? '0 0.75rem 0.5rem 0' : '0 0 0.5rem 0.75rem'; }
      } else if (quitar) {
        var img = imgSeleccionada;
        quitarToolbar();
        img.remove();
        return;
      }
      posicionarToolbar();
    });

    window.addEventListener('scroll', function () { if (imgSeleccionada) posicionarToolbar(); }, true);
    window.addEventListener('resize', function () { if (imgSeleccionada) posicionarToolbar(); });

    // ── Sincroniza el HTML del editor al textarea oculto antes de enviar ────
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-form-ticket]');
      if (!form) return;
      var editor = form.querySelector('[data-descripcion-editor]');
      var oculto = form.querySelector('#ticket-descripcion');
      if (!editor || !oculto) return;
      quitarToolbar();
      var texto = editor.textContent || '';
      if (!texto.trim() && !editor.querySelector('img')) {
        e.preventDefault();
        toast('Describe el problema antes de guardar');
        editor.focus();
        return;
      }
      oculto.value = editor.innerHTML;
    });
  })();

  // ── Form de ticket: buscador de contacto → autocompleta empresa y correo ──
  document.addEventListener('input', function (e) {
    var busca = e.target.closest('[data-buscar-contacto]');
    if (!busca) return;
    var wrap = busca.closest('[data-contacto-picker]');
    var dl = document.getElementById(busca.getAttribute('list'));
    if (!wrap || !dl) return;
    var opt = Array.prototype.filter.call(dl.options, function (o) { return o.value === busca.value; })[0];
    var nombre = wrap.querySelector('[data-c-nombre]');
    var correo = wrap.querySelector('[data-c-correo]');
    var empresa = wrap.querySelector('[data-c-empresa]');
    if (opt) {
      if (nombre) nombre.value = opt.value;
      if (correo && opt.getAttribute('data-email')) correo.value = opt.getAttribute('data-email');
      if (empresa && opt.getAttribute('data-empresa')) empresa.value = opt.getAttribute('data-empresa');
    } else if (nombre) {
      nombre.value = busca.value;
    }
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

  // ── Cotizaciones: al elegir un concepto del catálogo (datalist), llena el precio ─
  document.addEventListener('input', function (e) {
    if (!e.target.matches('[data-conceptos-catalogo] input[name="concepto_descripcion"]')) return;
    var input = e.target;
    var list = document.getElementById(input.getAttribute('list') || '');
    if (!list) return;
    var opt = list.querySelector('option[value="' + CSS.escape(input.value) + '"]');
    if (!opt) return;
    var row = input.closest('tr');
    var precioInput = row && row.querySelector('input[name="concepto_precio"]');
    if (precioInput) precioInput.value = opt.dataset.precio || '0';
    var descuentoInput = row && row.querySelector('input[name="concepto_descuento"]');
    if (descuentoInput) descuentoInput.value = opt.dataset.descuento || '0';
  });

  // ── Configuración → Excel unificado: sube el archivo por FormData ───────
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-importar-excel-unificado]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input[type="file"]');
    var file = input && input.files[0];
    var salida = document.getElementById('resultado-importar-excel-unificado');
    if (!file || !salida) return;
    var btn = e.submitter || form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
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
        if (!data.ok) { salida.innerHTML = '<p class="alert alert--error">' + data.error + '</p>'; return; }
        var html = '';
        ['empresas', 'contactos'].forEach(function (tipo) {
          var r = data.resultado[tipo];
          if (!r) return;
          html += '<p class="alert alert--ok"><strong>' + tipo + ':</strong> ' + r.total + ' filas leídas: ' +
            r.creadas + ' creadas, ' + r.actualizadas + ' actualizadas.</p>';
          if (r.errores.length) {
            html += '<p class="alert alert--warning">' + r.errores.length + ' fila(s) con error (' + tipo + '):</p><ul>';
            r.errores.forEach(function (msg) {
              var li = document.createElement('li');
              li.textContent = msg;
              html += li.outerHTML;
            });
            html += '</ul>';
          }
        });
        salida.innerHTML = html || '<p class="alert alert--error">El archivo no trae hojas reconocibles.</p>';
      })
      .catch(function () {
        salida.innerHTML = '<p class="alert alert--error">No se pudo importar. Revisa tu conexión e inténtalo de nuevo.</p>';
      })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      });
  });

  // ── Configuración → Cotizaciones: catálogo de conceptos ─────────────────
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-agregar-catalogo-concepto]')) return;
    var tb = document.querySelector('[data-catalogo-conceptos-body]');
    if (!tb) return;
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><input name="catDescripcion" placeholder="Ej: Instalación remota" style="width:100%"></td>' +
      '<td><input name="catPrecio" type="number" min="0" step="0.01" value="0"></td>' +
      '<td><input name="catDescuento" type="number" min="0" max="100" step="1" value="0"></td>' +
      '<td><button type="button" class="btn btn--ghost btn--sm" data-quitar-fila>✕</button></td>';
    tb.appendChild(tr);
  });

  // ── Imprimir / guardar como PDF ────────────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-print]')) {
      e.preventDefault();
      window.print();
    }
  });
  function initImprimirAuto() {
    if (document.querySelector('[data-print-auto]')) setTimeout(function () { window.print(); }, 150);
  }

  // ── Impresión: checkbox de "incluir logo", recordado entre documentos ───
  function initLogoImpresion() {
    var chk = document.querySelector('[data-toggle-logo]');
    if (!chk) return;
    var clave = 'ds_hd_imprimir_logo';
    var url = new URL(location.href);
    if (!url.searchParams.has('logo')) {
      var guardado = lee(clave);
      if (guardado === false) {
        url.searchParams.set('logo', '0');
        location.replace(url.toString());
        return;
      }
    }
    chk.addEventListener('change', function () {
      guarda(clave, chk.checked);
      var u = new URL(location.href);
      u.searchParams.set('logo', chk.checked ? '1' : '0');
      location.href = u.toString();
    });
  }

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

  // ── Logo del sidebar: clic para verlo en grande ──────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-logo-agrandar]')) {
      var dialog = document.getElementById('logo-grande');
      if (dialog) dialog.showModal();
    }
  });
  document.addEventListener('click', function (e) {
    var dialog = document.getElementById('logo-grande');
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
  function escHtmlTexto(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
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
    } else if (!texto) {
      toast('No tienes una firma configurada — ponla en "Mi perfil"');
      return;
    }
    if (caja.isContentEditable) {
      var html = texto.split('\n').map(escHtmlTexto).join('<br>');
      var actual = caja.innerHTML;
      caja.innerHTML = tipo === 'encabezado'
        ? html + (actual ? '<br><br>' + actual : '')
        : (actual ? actual.replace(/(<br\s*\/?>\s*)+$/i, '') + '<br><br>' : '') + html;
    } else if (tipo === 'encabezado') {
      caja.value = texto + (caja.value ? '\n\n' + caja.value : '');
    } else {
      caja.value = (caja.value ? caja.value.replace(/\s+$/, '') + '\n\n' : '') + texto;
    }
    caja.focus();
  });

  // Respuestas guardadas: se agregan al final de la caja, como la firma.
  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('[data-insertar-respuesta]');
    if (!sel || !sel.value) return;
    var caja = document.querySelector(sel.getAttribute('data-destino'));
    var texto = sel.value.replace(/\[fecha\]/g, new Date().toLocaleDateString('es-MX'));
    sel.value = '';
    if (!caja) return;
    if (caja.isContentEditable) {
      var html = texto.split('\n').map(escHtmlTexto).join('<br>');
      var actual = caja.innerHTML;
      caja.innerHTML = (actual ? actual.replace(/(<br\s*\/?>\s*)+$/i, '') + '<br><br>' : '') + html;
    } else {
      caja.value = (caja.value ? caja.value.replace(/\s+$/, '') + '\n\n' : '') + texto;
    }
    caja.focus();
  });

  // ── Integraciones: mostrar solo los campos del proveedor de WhatsApp elegido ──
  document.addEventListener('change', function (e) {
    if (!e.target.matches || !e.target.matches('[data-wa-proveedor]')) return;
    var valor = e.target.value;
    document.querySelectorAll('[data-wa-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-wa-panel').split(' ').indexOf(valor) === -1;
    });
  });

  // hx-boost está puesto en todo el shell para que los ENLACES naveguen sin recargar. Los
  // formularios se quedan fuera a propósito: varios se interceptan aquí con submit +
  // preventDefault (confirmaciones, favoritas por fetch, subida de archivos) y htmx mandaría
  // la petición antes de que corriera ese código. Se exceptúan las barras de filtro GET, que
  // no tienen lógica propia y son justo donde se nota la espera.
  // Descargas (Excel, CSV, backup, logo) y enlaces que abren otra pestaña: navegación normal,
  // porque htmx intentaría meter el archivo dentro de la página.
  var SIN_BOOST = /\/(exportar|descargar|export\.(json|zip)|logo)(\?|$)|\.(csv|xlsx|zip|json|pdf)(\?|$)/;
  function ajustarBoost(nodo) {
    if (!nodo || !nodo.querySelectorAll) return;
    var formularios = nodo instanceof HTMLFormElement ? [nodo] : nodo.querySelectorAll('form');
    Array.prototype.forEach.call(formularios, function (f) {
      if (f.hasAttribute('hx-boost')) return;
      var esFiltroGet = f.classList.contains('filterbar') && f.method.toLowerCase() === 'get';
      f.setAttribute('hx-boost', esFiltroGet ? 'true' : 'false');
    });
    var enlaces = nodo.tagName === 'A' ? [nodo] : nodo.querySelectorAll('a[href]');
    Array.prototype.forEach.call(enlaces, function (a) {
      if (a.hasAttribute('hx-boost')) return;
      var href = a.getAttribute('href') || '';
      if (a.hasAttribute('download') || a.target || SIN_BOOST.test(href) || href.charAt(0) === '#') {
        a.setAttribute('hx-boost', 'false');
      }
    });
  }
  ajustarBoost(document);
  document.addEventListener('htmx:beforeProcessNode', function (e) {
    ajustarBoost(e.target);
  });

  // ── Filtros que se aplican solos al cambiar (sin darle a "Filtrar") ────────
  // El texto espera a que dejes de escribir; lo demás se aplica al instante. Los controles
  // que solo tocan la vista en el navegador (mostrar/ocultar columnas) se quedan fuera.
  var temporizadorFiltro = null;
  function enviarFiltro(form) {
    if (!form) return;
    clearTimeout(temporizadorFiltro);
    if (window.htmx && form.closest('[hx-boost]')) {
      window.htmx.trigger(form, 'submit');
    } else if (form.requestSubmit) {
      form.requestSubmit();
    } else {
      form.submit();
    }
  }
  function esControlDeFiltro(el) {
    return (
      el.form &&
      el.form.matches('form.filterbar') &&
      el.form.method.toLowerCase() === 'get' &&
      el.name &&
      !el.hasAttribute('data-toggle-columna') &&
      !el.hasAttribute('data-sin-autofiltro')
    );
  }
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el.matches || !esControlDeFiltro(el)) return;
    if (el.type === 'search' || el.type === 'text') return; // el texto se maneja abajo
    enviarFiltro(el.form);
  });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.matches || !esControlDeFiltro(el) || (el.type !== 'search' && el.type !== 'text')) return;
    clearTimeout(temporizadorFiltro);
    var form = el.form;
    temporizadorFiltro = setTimeout(function () { enviarFiltro(form); }, 500);
  });

  // ── Selects que envían su formulario al cambiar (filtros, embudo de ventas) ──
  document.addEventListener('change', function (e) {
    var sel = e.target;
    if (!sel.matches) return;
    if (sel.matches('[data-autoenviar]')) {
      sel.form.submit();
    } else if (sel.matches('[data-mover-etapa]')) {
      if (sel.value === 'perdida') {
        var motivo = prompt('¿Por qué se perdió? (opcional)');
        if (motivo === null) {
          sel.value = sel.getAttribute('data-etapa-actual');
          return;
        }
        sel.form.elements.motivoPerdida.value = motivo;
      }
      sel.form.submit();
    }
  });

  // ── Logo de empresa: si no hay uno configurado, oculta el <img> roto ────
  document.addEventListener(
    'error',
    function (e) {
      if (e.target && e.target.matches && e.target.matches('[data-logo-img]')) e.target.hidden = true;
    },
    true,
  );

  // ── Configuración → Apariencia: subir logo ──────────────────────────────
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-logo-form]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input[type=file]');
    var file = input.files[0];
    var msg = document.getElementById('logo-mensaje');
    if (!file) return;
    var btn = e.submitter || form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
    if (msg) msg.textContent = 'Subiendo…';
    leerBase64(file, function (b64) {
      fetch('/app/configuracion/apariencia/logo', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ contentType: file.type, base64: b64 }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) window.location.reload();
          else if (msg) msg.textContent = '❌ ' + (data.error || 'No se pudo subir el logo');
        })
        .catch(function () { if (msg) msg.textContent = '❌ No se pudo subir. Revisa tu conexión.'; })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
        });
    });
  });

  // ── KB: pizarra personal con autoguardado (debounce, guarda en el servidor) ──
  (function () {
    var caja = document.querySelector('[data-pizarra-texto]');
    if (!caja) return;
    var estado = document.querySelector('[data-pizarra-estado]');
    var timer = null;
    function guardar() {
      fetch(window.location.pathname, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ contenido: caja.value }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (estado) estado.textContent = data.ok ? '✓ Guardado' : '✗ ' + (data.error || 'No se pudo guardar');
        })
        .catch(function () { if (estado) estado.textContent = '✗ No se pudo guardar. Revisa tu conexión.'; });
    }
    caja.addEventListener('input', function () {
      if (estado) estado.textContent = 'Guardando…';
      clearTimeout(timer);
      timer = setTimeout(guardar, 800);
    });
  })();

  // ── Registro público de eventos: reenviar link si ya estás registrado ────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-reenviar-link]');
    if (!btn) return;
    var msg = document.getElementById('reenviar-link-mensaje');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    fetch('/eventos/' + btn.dataset.eventoId + '/reenviar-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
      body: JSON.stringify({ correo: btn.dataset.correo }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (msg) msg.textContent = data.mensaje || 'Listo.';
        btn.remove();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = '🔁 No encuentro el correo, reenviármelo';
        if (msg) msg.textContent = 'No se pudo reenviar en este momento — intenta de nuevo en un rato.';
      });
  });

  // ── Login / invitación: mostrar/ocultar contraseña ───────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-toggle-password]');
    if (!btn) return;
    var input = btn.previousElementSibling;
    if (!input || input.tagName !== 'INPUT') return;
    var mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    btn.textContent = mostrar ? '🙈' : '👁';
    btn.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  // ── Login / invitación: aviso de Bloq Mayús ──────────────────────────────
  function initCapsLock() {
    document.querySelectorAll('[data-capslock-check]').forEach(function (input) {
      var aviso = input.parentElement && input.parentElement.querySelector('[data-capslock-aviso]');
      if (!aviso) return;
      var check = function (e) {
        aviso.hidden = !(e.getModifierState && e.getModifierState('CapsLock'));
      };
      input.addEventListener('keyup', check);
      input.addEventListener('keydown', check);
    });
  }

  // ── Eventos → Detalle: subir flayer ──────────────────────────────────────
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-flayer-form]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input[type=file]');
    var file = input.files[0];
    var msg = document.getElementById('flayer-mensaje');
    if (!file) return;
    var btn = e.submitter || form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
    if (msg) msg.textContent = 'Subiendo…';
    leerBase64(file, function (b64) {
      fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': cookie('x-csrf-token') },
        body: JSON.stringify({ contentType: file.type, base64: b64 }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) window.location.reload();
          else if (msg) msg.textContent = '❌ ' + (data.error || 'No se pudo subir el flayer');
        })
        .catch(function () { if (msg) msg.textContent = '❌ No se pudo subir. Revisa tu conexión.'; })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
        });
    });
  });

  // ── Dashboard: descartar el banner de licencias por vencer (por hoy) ─────
  var ALERTAS_DESCARTADAS_KEY = 'ds_hd_alertas_vencimiento_descartadas';
  function hoyISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function aplicarDescarteBanner(banner) {
    var firma = banner.getAttribute('data-firma-alertas') || '';
    var guardado;
    try { guardado = JSON.parse(localStorage.getItem(ALERTAS_DESCARTADAS_KEY) || 'null'); } catch (e) { void e; guardado = null; }
    if (guardado && guardado.fecha === hoyISO() && guardado.firma === firma) banner.hidden = true;
  }
  document.querySelectorAll('#banner-licencias[data-firma-alertas]').forEach(aplicarDescarteBanner);
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-descartar-banner]');
    if (!btn) return;
    var banner = document.querySelector(btn.getAttribute('data-descartar-banner'));
    if (!banner) return;
    try {
      localStorage.setItem(ALERTAS_DESCARTADAS_KEY, JSON.stringify({ fecha: hoyISO(), firma: banner.getAttribute('data-firma-alertas') || '' }));
    } catch (e) { void e; }
    banner.hidden = true;
  });

  // ── KB: copiar / descargar el documento (Markdown) ──────────────────────────
  document.addEventListener('click', function (e) {
    var copiar = e.target.closest('[data-kb-copiar]');
    var descargar = e.target.closest('[data-kb-descargar]');
    if (!copiar && !descargar) return;
    var fuente = document.querySelector('[data-kb-markdown]');
    if (!fuente) return;
    var texto = fuente.value;
    if (copiar) {
      navigator.clipboard.writeText(texto).then(function () {
        var original = copiar.textContent;
        copiar.textContent = '✅ Copiado';
        setTimeout(function () { copiar.textContent = original; }, 1500);
      }, function () { alert('No se pudo copiar al portapapeles.'); });
      return;
    }
    var url = URL.createObjectURL(new Blob([texto], { type: 'text/markdown;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = descargar.getAttribute('data-kb-descargar');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  // ── Favoritas: alternar sin recargar la página ────────────────────────────
  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    if (!form.id || form.id.indexOf('fav-') !== 0 || !window.fetch) return;
    ev.preventDefault();
    var input = form.querySelector('input[name="favorita"]');
    var boton = document.querySelector('button[form="' + form.id + '"]');
    var marcar = input.value === 'true';
    var pintar = function (on) {
      if (!boton) return;
      boton.textContent = on ? '⭐' : '☆';
      boton.setAttribute('aria-pressed', on ? 'true' : 'false');
      boton.title = on ? 'Quitar de favoritas' : 'Marcar como favorita';
      input.value = on ? 'false' : 'true';
    };
    pintar(marcar);
    fetch(form.action, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      headers: { 'X-Requested-With': 'fetch' },
      credentials: 'same-origin',
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
    }).catch(function () {
      pintar(!marcar);
      alert('No se pudo actualizar la favorita. Intenta de nuevo.');
    });
  });

  // ── Tablas largas: encabezado fijo justo debajo del topbar (--topbar-h real) ─
  function medirTopbar() {
    var topbar = document.querySelector('.topbar');
    if (topbar) document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px');
  }

  // ── Tablas: columnas opcionales (ej. ocultar SLA si no se usa), por página ───
  function indiceColumna(tabla, nombre) {
    var ths = tabla.tHead ? tabla.tHead.rows[0].cells : [];
    for (var i = 0; i < ths.length; i++) {
      if (ths[i].textContent.trim().toLowerCase() === nombre.toLowerCase()) return i;
    }
    return -1;
  }
  function aplicarColumna(tabla, idx, visible) {
    if (idx < 0) return;
    Array.prototype.forEach.call(tabla.rows, function (r) {
      if (r.cells[idx]) r.cells[idx].hidden = !visible;
    });
  }
  function initColumnasOpcionales() {
    document.querySelectorAll('[data-toggle-columna]').forEach(function (chk) {
      var nombre = chk.getAttribute('data-toggle-columna');
      var tabla = document.querySelector('table.data-table');
      if (!tabla || chk.__enh) return;
      chk.__enh = true;
      // "col2": versión bumpeada a propósito — el default de "mostrar SLA" cambió de
      // mostrado a oculto, así que se invalida cualquier preferencia vieja guardada bajo
      // la clave anterior (quedaba "encendida" para quien ya la había tocado antes).
      var clave = 'ds_hd_col2_' + location.pathname + ':' + nombre;
      var guardado = lee(clave);
      if (guardado !== null) chk.checked = guardado;
      aplicarColumna(tabla, indiceColumna(tabla, nombre), chk.checked);
      chk.addEventListener('change', function () {
        guarda(clave, chk.checked);
        aplicarColumna(tabla, indiceColumna(tabla, nombre), chk.checked);
      });
    });
  }

  // ── Filtros que se recuerdan entre visitas (ej. "incluir cerrados") ──────────
  // El checkbox se marca `data-filtro-recordar="<clave>"`. Si llegas a la página SIN pasar
  // por el formulario (nav lateral, "Tickets" del sidebar, etc. — se detecta por la ausencia
  // del marcador `f=1` que el propio formulario siempre manda), y la última vez lo dejaste
  // marcado, se re-aplica solo con un redirect. Si SÍ vienes de enviar el formulario
  // (`f=1` presente), se respeta tal cual lo mandaste, incluso desmarcado.
  function initFiltrosRecordados() {
    document.querySelectorAll('[data-filtro-recordar]').forEach(function (cb) {
      var clave = 'ds_hd_filtro_' + cb.getAttribute('data-filtro-recordar');
      var url = new URL(location.href);
      if (!url.searchParams.has('f')) {
        var guardado = lee(clave);
        if (guardado === true && !cb.checked) {
          url.searchParams.set(cb.name, cb.value);
          url.searchParams.set('f', '1');
          location.replace(url.toString());
          return;
        }
      }
      cb.addEventListener('change', function () { guarda(clave, cb.checked); });
    });
  }

  // ── Feedback de envío: deshabilita el botón mientras un form normal viaja ──
  // Se registra AL FINAL a propósito: si algún listener anterior (confirm(), o un
  // handler que intercepta el submit para mandar fetch a mano) ya llamó
  // preventDefault(), no hay que tocar el botón aquí — esos casos manejan su
  // propio disabled/enabled porque solo ellos saben cuándo termina la petición.
  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    var form = e.target;
    if (!(form instanceof HTMLFormElement) || form.hasAttribute('data-no-loading')) return;
    var btn = e.submitter || form.querySelector('button[type="submit"], input[type="submit"]');
    if (!btn || btn.hasAttribute('data-no-loading')) return;
    btn.disabled = true;
    btn.classList.add('is-loading');
  });

  /**
   * Todo lo que hay que preparar al pintar una página. Se llama al cargar y también después de
   * cada navegación con hx-boost (htmx reemplaza el <body> sin recargar, así que no hay un
   * DOMContentLoaded nuevo). Cada init es idempotente: volver a llamarlo no duplica nada.
   */
  function iniciarPagina() {
    updateToggle();
    pintarColapsar();
    initKanban();
    initTablas();
    medirTopbar();
    initColumnasOpcionales();
    initFiltrosRecordados();
    initImprimirAuto();
    initLogoImpresion();
    initCapsLock();
  }
  document.addEventListener('DOMContentLoaded', iniciarPagina);
  window.addEventListener('resize', medirTopbar);
  document.addEventListener('htmx:afterSettle', function (e) {
    // Swap del <body> entero (navegación boosted) → preparar toda la página; si solo cambió
    // un trozo (htmx puntual, como la búsqueda global), basta con mejorar ese trozo.
    if (e.target === document.body || e.target === document.documentElement) iniciarPagina();
    else {
      initKanban();
      initTablas(e.target);
    }
  });
  // Errores de red en una navegación boosted: sin esto la página se queda como estaba.
  document.addEventListener('htmx:responseError', function () {
    location.reload();
  });
  document.addEventListener('htmx:sendError', function () {
    alert('Se perdió la conexión. Revisa tu internet e intenta de nuevo.');
  });
})();
