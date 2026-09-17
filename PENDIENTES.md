# Pendientes

## Envío de correos — PROBADO Y FUNCIONANDO ✅

2026-09-01: dominio `dattasoft.mx` verificado en Brevo (DKIM en verde), API key
`ds-hd-produccion` generada, y **probado de punta a punta**: se creó un usuario y llegó el
correo real "Tu acceso a ds-hd" desde `DATTASOFT Soporte <erick.casas@dattasoft.mx>`.

Config usada (remitente verificado real): `BREVO_SENDER_EMAIL=erick.casas@dattasoft.mx`,
`BREVO_SENDER_NAME=DATTASOFT Soporte`.

**Para producción:** copiar la key a `BREVO_API_KEY` en el `.env` del servidor (con
`SMTP_HOST` vacío) y dar de alta el webhook `/webhooks/brevo?key=<JOBS_SECRET>` en Brevo.

**Limpieza pendiente en el DNS de dattasoft.mx (no bloquea):** el registro DMARC tiene una
etiqueta `rua=` duplicada — conviene corregirlo para máxima entregabilidad con Gmail/Yahoo.

La integración de correo en código está lista:

- **Dev**: `SmtpEmailSender` (nodemailer) → MailHog (`SMTP_HOST=mailhog` en docker-compose).
  Los correos se ven en http://localhost:8025.
- **Producción**: define **`BREVO_API_KEY`** en el `.env` (y verifica el remitente
  `BREVO_SENDER_EMAIL` en Brevo). Alternativa: `SMTP_HOST` propio.
- Prioridad de selección: `SMTP_HOST` > `BREVO_API_KEY` > log (no envía).
- Webhook `/webhooks/brevo?key=<JOBS_SECRET>` ya actualiza `correoEstado` de las
  inscripciones a eventos (tag `insc_<id>`). Configúralo en el panel de Brevo apuntando a
  `https://<dominio>/webhooks/brevo?key=<JOBS_SECRET>`.

**Único paso manual restante:** poner la `BREVO_API_KEY` real en producción y dar de alta
el webhook en Brevo. Brevo YA lo usa el CRM actual, así que se reutiliza la cuenta (solo
generar una API key nueva para ds-hd). **Guía paso a paso: `docs/deploy/CORREO-BREVO.md`.**

## Correo entrante de Zoho — IMPLEMENTADO, FALTA AUTORIZAR EN ZOHO ⏳

2026-09-17: el código está listo y desplegado, pero **nace apagado y nunca se ha probado
contra la API real de Zoho**. Sirve para que las respuestas que el cliente manda por correo
entren solas como nota de su ticket (hoy se quedan solo en el buzón de Zoho; el CRM viejo
tampoco las metía). Es opcional: si no se activa, todo lo demás sigue igual.

Qué hace cuando se activa: el cron horario llama `/jobs/revisar-correo`; se revisan los
correos no leídos del buzón y, si el asunto trae `#<número>` de ticket, el texto se agrega
como nota pública (quitando el hilo citado). Solo acepta al contacto del ticket (o sus CC)
salvo que se desmarque la opción. Lo que no se puede ligar se queda sin leer, con el motivo.

**Pasos manuales pendientes (los hace Erick):**

1. En <https://api-console.zoho.com> crear un cliente **Self Client**; copiar Client ID y
   Client Secret.
2. Pestaña "Generate Code", scope `ZohoMail.messages.ALL,ZohoMail.accounts.READ`, duración
   10 minutos → da un código `1000.…`.
3. Cambiarlo por el refresh token (el código vence en 10 min):

   ```bash
   curl -s -X POST 'https://accounts.zoho.com/oauth/v2/token' \
     -d 'grant_type=authorization_code' \
     -d 'client_id=CLIENT_ID' \
     -d 'client_secret=CLIENT_SECRET' \
     -d 'code=CODIGO_1000...'
   ```

4. Pegar Client ID, Client Secret y `refresh_token` en **Configuración → Correo entrante**,
   guardar, y usar **Probar conexión** (descubre y guarda el `accountId`) y **Revisar ahora**.
5. Si la cuenta no está en `.com`, ajustar el dominio del comando y el campo "Región".

**Riesgo conocido:** los endpoints de la API de Zoho Mail (`/messages/view`, `.../content`,
`/updatemessage`) se escribieron sin poder probarlos. Si "Probar conexión" o "Revisar ahora"
devuelven un error de Zoho, hay que ajustar `ZohoBuzonEntrante` con lo que diga ese error
(se muestra tal cual en la pantalla).

## Decisiones tomadas (para no volver a proponerlas)

- **Encuesta de satisfacción:** las calificaciones se quedan en el ticket y en Reportes. NO
  se manda correo al equipo (2026-09-17): el soporte lo da una sola persona, que ya entra al
  CRM. Se implementó el aviso por correo y se quitó a petición del usuario.
- **Pólizas / bolsas de horas por empresa:** no se usan, no implementar.
- **Base de conocimiento:** es de uso interno y personal del administrador.
- **Puntos de restauración de GitHub:** sí se usan, no quitarlos.
- **Portal de clientes:** se queda (el cliente solo ve sus propios tickets); los clientes
  levantan tickets desde el formulario público y no tienen acceso al CRM.

## Otros pendientes menores

- Retrofit de `BitacoraService` a los casos de uso de tickets (hoy usan su subcolección `eventos`).
- Migración: reasignar `usuarios/{uid}` al uid real de Firebase Auth tras `auth:import`.
- `IInscripcionRepository.findGlobal` hace un scan de collection-group; si el volumen de
  inscripciones crece mucho, indexar por un campo `inscripcionId` plano.
