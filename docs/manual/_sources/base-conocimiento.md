---
titulo: Base de conocimiento
audiencia: [staff]
rol_minimo: —
orden: 70
---

Documentos de soporte del equipo (soluciones, datos de empresas, scripts), escritos en
Markdown. Es solo del equipo: los clientes del portal y el público ya no la ven.

![Base de conocimiento, vista de gestión](../screenshots/base-conocimiento-staff.png)

## Quién ve cada documento

Cada documento tiene una **visibilidad**:

| Visibilidad | La ven |
| --- | --- |
| **Soporte** | los usuarios con el rol *Administrador* o *Soporte técnico* marcado |
| **Administrador** | solo los usuarios con el rol *Administrador* |

Los demás roles (Supervisor, Comercial, Agente técnico mixto, Solo lectura) no ven los
documentos. Si alguien de esos roles necesita verlos, márcale también *Soporte técnico* en
*Usuarios*.

## Buscar

En `/app/kb`, el buscador encuentra por título o contenido. Con **frase exacta** exige la
frase completa; sin ella basta con que aparezca cada palabra. Tus búsquedas recientes quedan
abajo del buscador y se pueden borrar. También filtras por categoría, etiqueta, fecha de
modificación y orden (A→Z, Z→A, más recientes).

## Escribir y subir documentos

- *Nuevo artículo*: título, contenido en Markdown, categoría, etiquetas y visibilidad.
- *Subir archivos*: varios archivos sueltos o **una carpeta completa**. Eliges la categoría
  (los `.ps1`, `.bat`, `.cmd` y `.sql` siempre quedan como Script) y, si marcas
  **actualizar**, un archivo con la misma ruta reemplaza al que ya existe en vez de
  duplicarse. Las carpetas grandes se suben en tandas con barra de avance; los archivos que
  no son de texto (imágenes, ejecutables) se omiten.
- 🗑️ elimina un documento (desde la lista o al editarlo).
