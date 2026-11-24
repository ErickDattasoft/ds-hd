import type { Request, Response } from 'express';
import type { EventoService } from '../../../../application/eventos/EventoService.js';
import type { EstadoInscripcion } from '../../../../core/entities/Inscripcion.js';
import {
  RESPUESTAS_INVITACION,
  RESPUESTA_INVITACION_ETIQUETA,
  PLANTILLA_EVENTO_DEFAULT,
  PLANTILLA_PRESENCIAL_DEFAULT,
  resolverPlantillaEvento,
  itinerarioATexto,
  TIPOS_EVENTO,
  ESTILOS_EVENTO,
  ESTILO_EVENTO_INFO,
  TIPO_EVENTO_ETIQUETA,
  TIPO_EVENTO_AYUDA,
  TIPO_EVENTO_GRUPO,
  MAX_PASES,
  type TipoEvento,
  type EstiloEvento,
  type EstadoEvento,
  type RespuestaInvitacion,
  type DatosRsvp,
} from '../../../../core/entities/Evento.js';
import { camposDeError } from '../../support/errores.js';
import { datetimeLocalMexico } from '../../../../core/entities/value-objects/horaMexico.js';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const n = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const bool = (v: unknown): boolean => v === 'on' || v === 'true' || v === true;
const pases = (v: unknown): number | undefined => (str(v).trim() ? Math.max(1, Math.trunc(n(v))) : undefined);
const opcional = (v: unknown): string | undefined => (v !== undefined ? str(v) : undefined);
/** Teléfono → link de WhatsApp (10 dígitos = México). */
const waLink = (tel: string | null | undefined, texto: string): string => {
  const t = (tel ?? '').replace(/[^\d]/g, '');
  return `https://wa.me/${t ? `${t.length === 10 ? '52' : ''}${t}` : ''}?text=${encodeURIComponent(texto)}`;
};
/** Texto de fábrica del mensaje de confirmación según el tipo de evento. */
const plantillaDe = (tipo: unknown): string => (tipo === 'presencial' ? PLANTILLA_PRESENCIAL_DEFAULT : PLANTILLA_EVENTO_DEFAULT);
const datosFormulario = { TIPOS_EVENTO, TIPO_EVENTO_ETIQUETA, TIPO_EVENTO_AYUDA, ESTILOS_EVENTO, ESTILO_EVENTO_INFO };
const respuesta = (v: unknown): RespuestaInvitacion | undefined =>
  RESPUESTAS_INVITACION.includes(v as RespuestaInvitacion) ? (v as RespuestaInvitacion) : undefined;

/** Gestión de eventos/webinars (staff). */
export class EventoController {
  constructor(private readonly eventos: EventoService) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const eventos = await this.eventos.listar();
    res.render('pages/backoffice/eventos/list', {
      titulo: 'Eventos',
      eventos,
      // Un recuadro por tipo, en el mismo orden que las tarjetas de arriba.
      grupos: TIPOS_EVENTO.map((tipo) => ({
        tipo,
        titulo: TIPO_EVENTO_GRUPO[tipo],
        eventos: eventos.filter((e) => e.tipo === tipo),
      })),
      TIPOS_EVENTO,
      TIPO_EVENTO_ETIQUETA,
      TIPO_EVENTO_AYUDA,
      hayEjemplos: eventos.some((e) => e.esPrueba),
      aviso: str(req.query.aviso),
    });
  };

  ejemplosCrearPost = async (req: Request, res: Response): Promise<void> => {
    const { creados, enviadas } = await this.eventos.crearEjemplos(req.user!);
    const aviso = `🧪 ${creados} eventos de ejemplo creados; ${enviadas} invitaciones enviadas a ${req.user!.email}. Revisa tu correo (y spam).`;
    res.redirect(`/app/eventos?aviso=${encodeURIComponent(aviso)}`);
  };

  ejemplosInvitarPost = async (req: Request, res: Response): Promise<void> => {
    const correo = str(req.body?.correo);
    let aviso: string;
    try {
      const { enviadas } = await this.eventos.invitarAEjemplos(req.user!, { nombre: str(req.body?.nombre), correo });
      aviso = enviadas
        ? `✉️ ${correo} quedó invitado a los ejemplos: ${enviadas} invitaciones enviadas.`
        : `${correo} ya estaba invitado a todos los ejemplos; no se reenvió nada.`;
    } catch (err) {
      aviso = `⚠ ${(err as Error).message}`;
    }
    res.redirect(`/app/eventos?aviso=${encodeURIComponent(aviso)}`);
  };

  ejemplosEliminarPost = async (req: Request, res: Response): Promise<void> => {
    const n = await this.eventos.eliminarEjemplos(req.user!);
    res.redirect(`/app/eventos?aviso=${encodeURIComponent(`🗑 ${n} eventos de ejemplo borrados.`)}`);
  };

  nuevo = (_req: Request, res: Response): void => {
    res.render('pages/backoffice/eventos/form', {
      titulo: 'Nuevo evento',
      modo: 'crear',
      // La plantilla arranca con el texto por defecto para editarle el link y el contacto, como en el viejo.
      valores: {
        estado: 'borrador',
        tipo: str(_req.query.tipo) || 'webinar',
        horasRecordatorio: 24,
        maxPersonasRegistro: 1,
      },
      plantillaPorDefecto: plantillaDe(str(_req.query.tipo)),
      errores: {},
      ...datosFormulario,
    });
  };

  editar = async (req: Request, res: Response): Promise<void> => {
    const evento = await this.eventos.obtener(str(req.params.id));
    res.render('pages/backoffice/eventos/form', {
      titulo: `Editar ${evento.titulo}`,
      modo: 'editar',
      evento,
      valores: {
        ...evento,
        fechaHora: datetimeLocalMexico(evento.fechaHora),
        itinerario: itinerarioATexto(evento.itinerario),
      },
      plantillaPorDefecto: plantillaDe(evento.tipo),
      errores: {},
      ...datosFormulario,
    });
  };

  guardarPost = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id ? str(req.params.id) : undefined;
    const b = req.body ?? {};
    try {
      const evento = await this.eventos.guardar(
        req.user!,
        {
          titulo: str(b.titulo),
          tipo: (TIPOS_EVENTO.includes(str(b.tipo) as TipoEvento) ? str(b.tipo) : 'webinar') as TipoEvento,
          estilo: ESTILOS_EVENTO.includes(str(b.estilo) as EstiloEvento) ? (str(b.estilo) as EstiloEvento) : undefined,
          lugarNombre: str(b.lugarNombre),
          lugarDireccion: str(b.lugarDireccion),
          lugarMapsUrl: str(b.lugarMapsUrl),
          vestimenta: str(b.vestimenta),
          itinerario: str(b.itinerario),
          maxPersonasRegistro: pases(b.maxPersonasRegistro) ?? 1,
          descripcion: str(b.descripcion),
          fechaHora: str(b.fechaHora),
          cupo: n(b.cupo),
          urlWebinar: str(b.urlWebinar),
          urlComunicado: str(b.urlComunicado),
          // Vacío = 24h por defecto; 0 = sin recordatorio para este evento.
          horasRecordatorio: str(b.horasRecordatorio).trim() ? Math.max(0, Math.trunc(n(b.horasRecordatorio))) : 24,
          limiteRegistrosPorIp: str(b.limiteRegistrosPorIp) ? Math.max(1, n(b.limiteRegistrosPorIp)) : null,
          estado: (str(b.estado) || 'borrador') as EstadoEvento,
          sistema: str(b.sistema),
          contactoNombre: str(b.contactoNombre),
          contactoWhatsapp: str(b.contactoWhatsapp),
          plantilla: str(b.plantilla),
          mensajeSeguimiento: str(b.mensajeSeguimiento),
          horasSeguimiento: str(b.horasSeguimiento) ? Math.max(1, n(b.horasSeguimiento)) : null,
        },
        id,
      );
      res.redirect(`/app/eventos/${evento.id}`);
    } catch (err) {
      res.status(422).render('pages/backoffice/eventos/form', {
        titulo: id ? 'Editar evento' : 'Nuevo evento',
        modo: id ? 'editar' : 'crear',
        evento: id ? { id } : null,
        valores: b,
        plantillaPorDefecto: plantillaDe(b.tipo),
        errores: camposDeError(err),
        ...datosFormulario,
      });
    }
  };

  ver = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const [{ evento, inscritos }, listaNegra, empresasCartera, historialEmpresas, historialPersonas] =
      await Promise.all([
        this.eventos.detalleConInscritos(id),
        this.eventos.listaNegraTodos(),
        this.eventos.empresasParaInvitar(),
        this.eventos.historialEmpresas(id),
        this.eventos.historialAsistencias(id),
      ]);
    // Las invitaciones de antes del link personal reciben el suyo aquí (una sola vez).
    await this.eventos.asegurarLinksInvitados(evento);
    const conLink = <T extends DatosRsvp & { id: string }>(
      inv: T,
      nombre: string,
    ) => ({
      link: this.eventos.linkInvitacion(evento, inv),
      waInvitacion: waLink(inv.telefono, this.eventos.mensajeWhatsAppInvitacion(evento, inv, nombre)),
    });
    const invitacionesVM = evento.invitaciones.map((i) => ({ ...i, ...conLink(i, i.paraNombre ?? i.empresaNombre) }));
    const externosVM = evento.invitadosExternos.map((i) => ({ ...i, ...conLink(i, i.nombre) }));
    const difusionVM = evento.difusion.map((d) => ({
      ...d,
      waLink: waLink(d.telefono, this.eventos.mensajeWhatsAppLinkAbierto(evento, d.nombre)),
    }));
    // Cruce en vivo contra la lista negra (no solo lo que se grabó al registrarse) — si a alguien
    // se le marca DESPUÉS de haberse inscrito, su fila lo refleja de inmediato.
    const correosNegra = new Map(listaNegra.map((e) => [e.email, e]));
    const telefonosNegra = new Map(
      listaNegra.filter((e) => e.telefono).map((e) => [e.telefono!.trim(), e]),
    );
    const inscritosVM = inscritos.map((i) => {
      const tel = (i.telefono ?? '').replace(/[^\d]/g, '');
      const mensaje = resolverPlantillaEvento(evento, i);
      const enNegra =
        (i.email ? correosNegra.get(i.email) : undefined) ??
        (i.telefono ? telefonosNegra.get(i.telefono.trim()) : undefined);
      return {
        ...i,
        waLink: tel ? `https://wa.me/${tel.length === 10 ? '52' : ''}${tel}?text=${encodeURIComponent(mensaje)}` : null,
        enListaNegra: enNegra
          ? [enNegra.motivo || 'Marcado como problemático', enNegra.marcadoPor ? `— por ${enNegra.marcadoPor}` : '']
              .filter(Boolean)
              .join(' ')
          : null,
        asistioAntes:
          (i.email ? historialPersonas[i.email.toLowerCase()] : undefined) ??
          (i.telefono ? historialPersonas[i.telefono.trim()] ?? null : null),
      };
    });
    res.render('pages/backoffice/eventos/detail', {
      titulo: evento.titulo,
      evento,
      inscritos: inscritosVM,
      listaNegra,
      empresasCartera,
      historialEmpresas,
      pendientesWsp: inscritosVM.filter((i) => i.waLink && !i.contactadoWsp).length,
      errorInscrito: str(req.query.error),
      resumen: evento.resumenInvitaciones,
      invitacionesVM,
      externosVM,
      difusionVM,
      mensajeLinkAbierto: this.eventos.mensajeWhatsAppLinkAbierto(evento, ''),
      // Del link público cuentan quienes dijeron «Sí» (cada uno con sus acompañantes).
      personasInscritos: inscritos
        .filter((i) => (i.asistira ?? '').trim().toLowerCase() === 'sí' || (i.asistira ?? '').trim().toLowerCase() === 'si')
        .reduce((t, i) => t + (i.personas ?? 1), 0),
      avisoInvitaciones: str(req.query.aviso),
      MAX_PASES,
      TIPO_EVENTO_ETIQUETA,
      RESPUESTAS_INVITACION,
      RESPUESTA_INVITACION_ETIQUETA,
    });
  };

  // ── Invitación dirigida a empresas ─────────────────────────────────────
  empresaAgregarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.agregarEmpresaInvitada(req.user!, id, {
      empresaNombre: str(req.body?.empresaNombre),
      invitadoPor: str(req.body?.invitadoPor) || undefined,
      pases: pases(req.body?.pases),
      paraNombre: str(req.body?.paraNombre) || undefined,
      correo: str(req.body?.correo) || undefined,
      telefono: str(req.body?.telefono) || undefined,
    }).catch((err) => this.avisar(res, id, err));
    if (!res.headersSent) res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  /** «☑️ Agregar varias de la cartera»: las empresas marcadas (de 25 en 25; el JS manda lotes). */
  empresasVariasPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const nombres = ([] as unknown[]).concat(req.body?.empresas ?? []).map((v) => str(v));
    try {
      const r = await this.eventos.agregarEmpresasInvitadas(req.user!, id, { nombres, pases: pases(req.body?.pases) });
      const partes = [`✅ Se agregaron ${r.agregadas} empresa${r.agregadas === 1 ? '' : 's'}`];
      if (r.yaEstaban) partes.push(`${r.yaEstaban} ya estaba${r.yaEstaban === 1 ? '' : 'n'} invitada${r.yaEstaban === 1 ? '' : 's'}`);
      if (r.sobrantes) partes.push(`faltan ${r.sobrantes}: vuelve a marcarlas (van de 25 en 25)`);
      res.redirect(`/app/eventos/${id}?aviso=${encodeURIComponent(partes.join(' · '))}#invitaciones`);
    } catch (err) {
      this.avisar(res, id, err);
    }
  };

  /** «📄 Cargar lista» de Otros invitados (CSV o celdas pegadas de Excel). */
  externosListaPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      const r = await this.eventos.cargarListaExternos(req.user!, id, {
        texto: str(req.body?.lista),
        pases: pases(req.body?.pases),
        fuente: str(req.body?.fuente) || undefined,
      });
      const partes = [`📄 Se crearon ${r.agregados} ${r.agregados === 1 ? 'invitación' : 'invitaciones'}`];
      if (r.repetidos) partes.push(`${r.repetidos} ya estaba${r.repetidos === 1 ? '' : 'n'} invitado${r.repetidos === 1 ? '' : 's'}`);
      if (r.errores.length) partes.push(`⚠ ${r.errores.length} con problema: ${r.errores.slice(0, 5).join('; ')}${r.errores.length > 5 ? '…' : ''}`);
      if (!r.agregados && !r.repetidos && !r.errores.length) partes.splice(0, 1, '⚠ La lista venía vacía');
      res.redirect(`/app/eventos/${id}?aviso=${encodeURIComponent(partes.join(' · ').slice(0, 900))}#invitaciones`);
    } catch (err) {
      this.avisar(res, id, err);
    }
  };

  /** «⬇ Plantilla de Excel» para llenar la lista de invitados. */
  plantillaListaGet = async (_req: Request, res: Response): Promise<void> => {
    const buffer = await this.eventos.plantillaListaInvitados();
    res
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .attachment('Plantilla invitados.xlsx')
      .send(buffer);
  };

  /** El Excel elegido en «📄 Lista de Excel» → texto para el cuadro (se revisa antes de agregar). */
  listaExcelPost = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No llegó el archivo' });
      return;
    }
    try {
      res.json({ texto: await this.eventos.excelListaATexto(req.file.buffer) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo leer el archivo' });
    }
  };

  /** «📤 Se envía desde»: WhatsApp y correo de quien manda las invitaciones. */
  envioPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      await this.eventos.cambiarEnvio(req.user!, id, {
        whatsapp: str(req.body?.envioWhatsapp),
        correo: str(req.body?.envioCorreo),
      });
      const tab = str(req.body?.tab) === 'abierto' ? 'tab=abierto&' : '';
      res.redirect(`/app/eventos/${id}?${tab}aviso=${encodeURIComponent('📤 Guardado: así se mandarán las invitaciones')}#invitaciones`);
    } catch (err) {
      this.avisar(res, id, err);
    }
  };

  /** 💬 Marca que se abrió el WhatsApp del invitado con su invitación (sin recargar). */
  invitacionWspPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.marcarEnviadaWsp(req.user!, str(req.params.id), str(req.params.invId));
    res.json({ ok: true });
  };

  empresaActualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    await this.eventos.actualizarEmpresaInvitada(req.user!, id, str(req.params.invId), {
      contactado: bool(b.contactado),
      respuesta: respuesta(b.respuesta),
      invitadoPor: b.invitadoPor !== undefined ? str(b.invitadoPor) : undefined,
      notas: b.notas !== undefined ? str(b.notas) : undefined,
      pases: pases(b.pases),
      personas: str(b.personas).trim() ? n(b.personas) : undefined,
      paraNombre: opcional(b.paraNombre),
      correo: opcional(b.correo),
      telefono: opcional(b.telefono),
    }).catch((err) => this.avisar(res, id, err));
    if (!res.headersSent) res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  empresaQuitarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.quitarEmpresaInvitada(req.user!, id, str(req.params.invId));
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  externoAgregarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.agregarInvitadoExterno(req.user!, id, {
      nombre: str(req.body?.nombre) || undefined,
      fuente: str(req.body?.fuente) || undefined,
      pases: pases(req.body?.pases),
      correo: str(req.body?.correo) || undefined,
      telefono: str(req.body?.telefono) || undefined,
    }).catch((err) => this.avisar(res, id, err));
    if (!res.headersSent) res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  externoActualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    await this.eventos.actualizarInvitadoExterno(req.user!, id, str(req.params.extId), {
      nombre: b.nombre !== undefined ? str(b.nombre) : undefined,
      fuente: b.fuente !== undefined ? str(b.fuente) : undefined,
      contactado: bool(b.contactado),
      respuesta: respuesta(b.respuesta),
      notas: b.notas !== undefined ? str(b.notas) : undefined,
      pases: pases(b.pases),
      personas: str(b.personas).trim() ? n(b.personas) : undefined,
      correo: opcional(b.correo),
      telefono: opcional(b.telefono),
    }).catch((err) => this.avisar(res, id, err));
    if (!res.headersSent) res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  /** ✉️ Manda la invitación por correo a UN invitado (empresa o externo). */
  /** ✉️ Enviarme una prueba: el correo de la invitación a quien da clic. */
  enviarPruebaPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      const correo = await this.eventos.enviarPrueba(req.user!, id);
      res.redirect(`/app/eventos/${id}?aviso=${encodeURIComponent(`✉️ Prueba enviada a ${correo}. Revisa tu correo (y spam).`)}#invitaciones`);
    } catch (err) {
      this.avisar(res, id, err);
    }
  };

  invitacionEnviarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      await this.eventos.enviarInvitacion(req.user!, id, str(req.params.invId));
      res.redirect(`/app/eventos/${id}?aviso=${encodeURIComponent('✉️ Invitación enviada')}#invitaciones`);
    } catch (err) {
      this.avisar(res, id, err);
    }
  };

  /** ✉️ Manda la invitación a todos los que tienen correo y no se les ha mandado. */
  invitacionesEnviarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      const r = await this.eventos.enviarInvitacionesPendientes(req.user!, id);
      const partes = [`✉️ ${r.enviadas} invitación(es) enviada(s)`];
      if (r.fallidas) partes.push(`${r.fallidas} no se pudieron mandar`);
      if (r.faltan) partes.push(`faltan ${r.faltan}: vuelve a picar «Enviar»`);
      if (r.sinCorreo) partes.push(`${r.sinCorreo} sin correo (mándalas por 💬 WhatsApp)`);
      res.redirect(`/app/eventos/${id}?aviso=${encodeURIComponent(partes.join(' · '))}#invitaciones`);
    } catch (err) {
      this.avisar(res, id, err);
    }
  };

  // ── Lista del link abierto ───────────────────────────────────────────
  /** Lleva a la pestaña «🌐 Link abierto» con un aviso. */
  private alLinkAbierto(res: Response, id: string, aviso?: string): void {
    if (res.headersSent) return;
    res.redirect(`/app/eventos/${id}?tab=abierto${aviso ? `&aviso=${encodeURIComponent(aviso.slice(0, 900))}` : ''}#invitaciones`);
  }

  private avisarAbierto(res: Response, id: string, err: unknown): void {
    this.alLinkAbierto(res, id, '⚠ ' + (err instanceof Error ? err.message : 'No se pudo completar'));
  }

  /** «📄 Cargar lista» del link abierto (Excel, CSV o celdas pegadas). */
  difusionListaPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      const r = await this.eventos.cargarListaDifusion(req.user!, id, str(req.body?.lista));
      const partes = [`📄 ${r.agregados} persona(s) agregada(s) a la lista`];
      if (r.repetidos) partes.push(`${r.repetidos} ya estaba(n)`);
      if (r.errores.length) partes.push(`⚠ ${r.errores.length} con problema: ${r.errores.slice(0, 5).join('; ')}${r.errores.length > 5 ? '…' : ''}`);
      if (!r.agregados && !r.repetidos && !r.errores.length) partes.splice(0, 1, '⚠ La lista venía vacía');
      this.alLinkAbierto(res, id, partes.join(' · '));
    } catch (err) {
      this.avisarAbierto(res, id, err);
    }
  };

  /** «👤 Agregar una persona» a la lista del link abierto. */
  difusionAgregarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      await this.eventos.agregarADifusion(req.user!, id, {
        nombre: str(req.body?.nombre),
        correo: str(req.body?.correo),
        telefono: str(req.body?.telefono),
      });
      this.alLinkAbierto(res, id, '👤 Agregado a la lista');
    } catch (err) {
      this.avisarAbierto(res, id, err);
    }
  };

  difusionQuitarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.quitarDeDifusion(req.user!, id, str(req.params.difId)).catch((err) => this.avisarAbierto(res, id, err));
    this.alLinkAbierto(res, id);
  };

  difusionVaciarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.vaciarDifusion(req.user!, id);
    this.alLinkAbierto(res, id, '🗑 Lista vaciada (los registrados no se tocan)');
  };

  /** 💬 Marca que se abrió su WhatsApp con el link abierto (sin recargar). */
  difusionWspPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.marcarDifusionWsp(req.user!, str(req.params.id), str(req.params.difId));
    res.json({ ok: true });
  };

  /** ✉️ Manda el link abierto por correo a una persona de la lista. */
  difusionCorreoPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      await this.eventos.enviarDifusionCorreo(req.user!, id, str(req.params.difId));
      this.alLinkAbierto(res, id, '✉️ Link enviado por correo');
    } catch (err) {
      this.avisarAbierto(res, id, err);
    }
  };

  /** ✉️ Manda el link abierto por correo a los de la lista que faltan. */
  difusionEnviarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    try {
      const r = await this.eventos.enviarDifusionPendientes(req.user!, id);
      const partes = [`✉️ Link enviado a ${r.enviadas} persona(s)`];
      if (r.fallidas) partes.push(`${r.fallidas} no se pudieron mandar`);
      if (r.faltan) partes.push(`faltan ${r.faltan}: vuelve a picar «Enviar»`);
      this.alLinkAbierto(res, id, partes.join(' · '));
    } catch (err) {
      this.avisarAbierto(res, id, err);
    }
  };

  /** Regresa al panel de invitaciones con el error a la vista (en vez de una página de error). */
  private avisar(res: Response, id: string, err: unknown): void {
    if (res.headersSent) return;
    const msg = err instanceof Error ? err.message : 'No se pudo completar';
    res.redirect(`/app/eventos/${id}?aviso=${encodeURIComponent('⚠ ' + msg)}#invitaciones`);
  }

  externoQuitarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.quitarInvitadoExterno(req.user!, id, str(req.params.extId));
    res.redirect(`/app/eventos/${id}#invitaciones`);
  };

  // ── Flayer (imagen promocional) ─────────────────────────────────────────
  flayerSubirPost = async (req: Request, res: Response): Promise<void> => {
    const b = req.body ?? {};
    try {
      await this.eventos.actualizarFlayer(req.user!, str(req.params.id), {
        contentType: str(b.contentType),
        base64: str(b.base64),
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(422).json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo subir el flayer' });
    }
  };

  flayerEliminarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.eliminarFlayer(req.user!, id);
    res.redirect(`/app/eventos/${id}`);
  };

  eliminarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.eliminar(req.user!, str(req.params.id));
    res.redirect('/app/eventos');
  };

  marcarInscripcionPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.marcarInscripcion(
      req.user!,
      str(req.params.id),
      str(req.params.insId),
      str(req.body?.estado) as EstadoInscripcion,
    );
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };

  reenviarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.reenviarConfirmacion(req.user!, str(req.params.id), str(req.params.insId));
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };

  /** Edición en línea de un inscrito: solo se mandan los campos que trae el formulario. */
  inscritoActualizarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    const b = req.body ?? {};
    try {
      await this.eventos.actualizarInscripcion(req.user!, id, str(req.params.insId), {
        ...(b.nombre !== undefined ? { nombre: str(b.nombre) } : {}),
        ...(b.empresa !== undefined ? { empresa: str(b.empresa) } : {}),
        ...(b.email !== undefined ? { email: str(b.email) } : {}),
        ...(b.telefono !== undefined ? { telefono: str(b.telefono) } : {}),
        // Checkboxes: el formulario siempre los manda (campo oculto + checkbox), así que su
        // ausencia significa "desmarcado", no "no lo toques".
        ...(b.marcasPresentes ? { contactadoWsp: bool(b.contactadoWsp), asistioReal: bool(b.asistioReal) } : {}),
      });
      res.redirect(`/app/eventos/${id}#inscritos`);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo guardar';
      res.redirect(`/app/eventos/${id}?error=${encodeURIComponent(mensaje)}#inscritos`);
    }
  };

  /** Marca `contactadoWsp` sin recargar — lo llama el botón 💬 al abrir wa.me. */
  inscritoContactadoPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.marcarContactadoWsp(req.user!, str(req.params.id), str(req.params.insId));
    res.json({ ok: true });
  };

  inscritoEliminarPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.eliminarInscripcion(req.user!, id, str(req.params.insId));
    res.redirect(`/app/eventos/${id}#inscritos`);
  };

  inscritoListaNegraPost = async (req: Request, res: Response): Promise<void> => {
    const id = str(req.params.id);
    await this.eventos.marcarInscritoEnListaNegra(req.user!, id, str(req.params.insId), str(req.body?.motivo));
    res.redirect(`/app/eventos/${id}#inscritos`);
  };

  exportarInscritosExcel = async (req: Request, res: Response): Promise<void> => {
    const { buffer, nombre } = await this.eventos.exportarInscritosExcel(req.user!, str(req.params.id));
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buffer);
  };

  listaNegraAgregarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.agregarListaNegra(
      req.user!,
      str(req.body?.email),
      str(req.body?.motivo),
      str(req.body?.telefono),
    );
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };

  listaNegraQuitarPost = async (req: Request, res: Response): Promise<void> => {
    await this.eventos.quitarListaNegra(req.user!, str(req.body?.email));
    res.redirect(`/app/eventos/${str(req.params.id)}`);
  };
}
