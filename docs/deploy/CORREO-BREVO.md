# Configurar el correo con Brevo — paso a paso

Guía para dejar el envío de correos funcionando en **producción** con Brevo (antes
Sendinblue). En desarrollo ya funciona solo (usa MailHog); esto es solo para el servidor
real.

Tiempo aproximado: 30–45 min, más la espera de propagación del DNS (de minutos a 24 h).

> **DATTASOFT ya tiene cuenta de Brevo** (la usa el CRM actual). Reutilízala: NO hace falta
> crear una cuenta nueva ni volver a autenticar el dominio desde cero. El camino corto está
> justo abajo; los pasos completos quedan como referencia por si el dominio hay que
> re-verificarlo tras los cambios recientes.

## Camino corto (reutilizando la cuenta existente)

1. Inicia sesión en la cuenta de Brevo de DATTASOFT.
2. **Verifica que el dominio siga autenticado** (Paso 2): *Settings → Senders, Domains &
   Dedicated IPs → Domains*. `dattasoft.mx` debe estar en verde ("Authenticated"). Como
   hubo cambios de dominio, es posible que algún registro DNS se haya caído: si aparece en
   rojo/amarillo, pulsa **Verify**; si sigue fallando, vuelve a crear los registros que
   Brevo marque como faltantes (Paso 2 completo).
3. **Crea una API key nueva para ds-hd** (Paso 3) — no reutilices la del CRM viejo, así se
   pueden revocar por separado. Nómbrala `ds-hd-produccion`.
4. Ponla en el `.env` del droplet (Paso 4) y reinicia.
5. Prueba (Paso 6).
6. (Opcional) Añade **otro** webhook apuntando a ds-hd (Paso 5). Brevo admite varios
   webhooks; el del CRM viejo se queda como está. Los eventos de correos del CRM viejo que
   lleguen a ds-hd se ignoran solos (no encuentra la inscripción y responde sin hacer nada).

El remitente (`soporte@dattasoft.mx` o el que use el CRM actual) ya está verificado, así que
puedes enviar de inmediato una vez tengas la key en el servidor.

---

## Pasos completos (referencia)

Necesitas:
- Acceso a la cuenta de correo `soporte@dattasoft.mx` (o similar) para confirmar.
- Acceso al panel donde se administra el **DNS del dominio `dattasoft.mx`** (con quien
  esté registrado el dominio: GoDaddy, Cloudflare, Namecheap, el hosting, etc.).
- Acceso al servidor donde corre ds-hd (el droplet) para editar el archivo `.env`.

---

## Paso 1 — Cuenta de Brevo

DATTASOFT ya tiene una (la usa el CRM actual): **inicia sesión con esas credenciales**.
Solo si NO existiera: <https://www.brevo.com>, crea la cuenta, y en el onboarding elige
**"Transactional email"**. El plan gratuito da **300 correos/día** (ojo: ese límite se
comparte entre el CRM viejo y ds-hd mientras convivan).

---

## Paso 2 — Autenticar el dominio `dattasoft.mx`

Esto es lo que hace que los correos **no caigan en spam** y que puedas enviar como
`@dattasoft.mx`. Es el paso que dependía de que "arreglaran el dominio".

1. En Brevo, arriba a la derecha, clic en el **nombre de la cuenta → "Senders, Domains &
   Dedicated IPs"** (también aparece como *Settings → Senders & Domains*).
2. Pestaña **"Domains"** → botón **"Add a domain"** → escribe `dattasoft.mx` → **"Save"**.
3. Brevo te mostrará una lista de **registros DNS** que tienes que crear. Serán del estilo:
   - Un registro **TXT** de verificación (algo como `brevo-code:xxxxxxxx`).
   - Dos o tres registros **DKIM** (normalmente TXT o CNAME, con nombres como
     `mail._domainkey` o `brevo1._domainkey` / `brevo2._domainkey`).
   - Un registro **SPF** (TXT) — o te pedirá **añadir** `include:spf.brevo.com` a tu SPF
     actual si ya tienes uno.
   - Opcionalmente un registro **DMARC** (TXT en `_dmarc.dattasoft.mx`).

   > ⚠️ **Copia los valores EXACTOS que muestra tu panel de Brevo**, no los de esta guía.
   > Cada cuenta recibe valores distintos.

4. Entra al **panel de DNS de `dattasoft.mx`** y crea cada registro:
   - **Type / Tipo**: el que indique Brevo (TXT o CNAME).
   - **Host / Name / Nombre**: lo que indique Brevo. Ojo: algunos paneles quieren el
     subdominio solo (`brevo1._domainkey`) y otros el dominio completo
     (`brevo1._domainkey.dattasoft.mx`). Si dudas, prueba primero con el nombre corto.
   - **Value / Valor / Points to**: el valor largo que da Brevo, tal cual (sin espacios ni
     comillas extra).
   - **TTL**: deja el que venga por defecto (1 hora / 3600 está bien).
5. **Cuidado con el SPF**: solo puede haber **UN** registro SPF (`v=spf1 ...`) en el
   dominio. Si ya existe uno, **edítalo** para añadir `include:spf.brevo.com` antes del
   `~all` o `-all`. No crees un segundo registro SPF.
   Ejemplo de cómo quedaría uno combinado:
   `v=spf1 include:spf.brevo.com include:_spf.google.com ~all`
6. Vuelve a Brevo y pulsa **"Verify" / "Authenticate"** para cada registro. Puede tardar:
   si sale error, espera 15–30 min (a veces hasta 24 h) y vuelve a darle a Verify.
7. Cuando el dominio quede **"Authenticated" / verificado** (marca verde), listo.

### Alternativa rápida (sin tocar DNS)

Si por ahora no puedes tocar el DNS, puedes al menos **verificar un remitente concreto**:

1. Misma pantalla → pestaña **"Senders"** → **"Add a sender"**.
2. Nombre: `Soporte DATTASOFT`, correo: `soporte@dattasoft.mx`.
3. Brevo manda un correo de confirmación a esa dirección → abre el correo y confirma.

Con esto ya puedes enviar, pero **sin autenticar el dominio muchos correos irán a spam**.
Autentica el dominio en cuanto puedas.

---

## Paso 3 — Crear la API key

1. En Brevo, arriba a la derecha: **nombre de la cuenta → "SMTP & API"**.
2. Pestaña **"API Keys"** → botón **"Generate a new API key"**.
3. Ponle un nombre reconocible, por ejemplo `ds-hd-produccion`.
4. Brevo te muestra la key **una sola vez** (empieza con `xkeysib-...`). **Cópiala y
   guárdala** en un lugar seguro ahora; luego ya no se puede volver a ver.

---

## Paso 4 — Poner la API key en el servidor

En el droplet, en la carpeta del proyecto (p. ej. `/opt/ds-hd`), edita el archivo `.env`:

```bash
nano .env
```

Deja estas líneas así (rellena tu key):

```
SMTP_HOST=
BREVO_API_KEY=xkeysib-LA_KEY_QUE_COPIASTE
BREVO_SENDER_NAME=Soporte DATTASOFT
BREVO_SENDER_EMAIL=soporte@dattasoft.mx
```

> `SMTP_HOST` debe quedar **vacío**: si tiene valor, la app usa SMTP y **ignora** Brevo.
> El orden de prioridad es: `SMTP_HOST` → `BREVO_API_KEY` → (nada = no se envía, solo log).

Guarda (`Ctrl+O`, `Enter`) y sal (`Ctrl+X`). Reinicia la app:

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

*(Si el deploy es por GitHub Actions y no editas el `.env` a mano, añade `BREVO_API_KEY`
como **secret del repositorio** y asegúrate de que el workflow lo pase al contenedor.)*

---

## Paso 5 — Configurar el webhook (opcional pero recomendado)

Esto hace que ds-hd sepa si un correo de un evento se **entregó** o **rebotó**
(se ve en la lista de inscritos de cada evento).

1. En Brevo: menú lateral **"Transactional" → "Email" → pestaña "Settings"** (o busca
   **"Webhooks"** en el buscador del panel).
2. **"Add a new webhook"**.
3. **URL**: `https://TU_DOMINIO/webhooks/brevo?key=EL_VALOR_DE_JOBS_SECRET`
   (el `JOBS_SECRET` es el que está en tu `.env`; sirve para que nadie más pueda llamar al
   webhook).
4. **Eventos / Events**: marca **Delivered**, **Hard bounce**, **Soft bounce** y
   **Blocked**.
5. Guardar. Brevo suele mandar un ping de prueba; debe responder `200`.

---

## Paso 6 — Probar que funciona

1. Entra a ds-hd en producción como admin.
2. **Usuarios → Nuevo usuario** (o **Invitar cliente**): crea uno con **tu correo
   personal**.
3. Deberías recibir en tu bandeja el correo **"Tu acceso a ds-hd"** con el enlace de
   invitación, en menos de 1 minuto.
4. Si no llega:
   - Revisa la carpeta de **spam**.
   - En Brevo: menú **"Transactional" → "Logs"**: ahí se ve cada correo y su estado
     (enviado, entregado, rebotado, error). El motivo del error suele estar claro.
   - En el servidor: `docker compose -f docker/docker-compose.prod.yml logs app | grep -i brevo`
     — si sale `Brevo respondió 401` la key está mal; `403` suele ser remitente no
     verificado.

---

## Correos que envía ds-hd

| Cuándo | A quién |
| --- | --- |
| Alta de usuario staff / invitación de cliente | al invitado (enlace para fijar contraseña) |
| Ticket pasa a Resuelto o Cerrado | al correo del contacto del ticket |
| Nota pública del staff en un ticket | al contacto del ticket |
| El cliente responde en el portal | al agente asignado |
| Ticket público recibido | confirmación al cliente + aviso al staff |
| Solicitud de acceso desde el login | a los correos de notificación configurados |
| Registro a un evento | confirmación al inscrito |
| Recordatorio de evento (cron) | a los inscritos, X horas antes |

---

## Resumen de lo mínimo indispensable

1. Cuenta en Brevo.
2. **API key** (`xkeysib-...`) → en `.env` como `BREVO_API_KEY`, con `SMTP_HOST` vacío.
3. **Remitente verificado** (idealmente **dominio autenticado** por DNS; como mínimo, el
   sender `soporte@dattasoft.mx` confirmado por correo).
4. Reiniciar la app.
5. Probar creando un usuario con tu correo.
6. (Opcional) Webhook para el estado de los correos de eventos.
