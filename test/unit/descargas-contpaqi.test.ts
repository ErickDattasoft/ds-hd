import { beforeEach, describe, expect, it } from 'vitest';
import { leerPaginaDescargas, ultimaVersionDe, esDelSistema, sistemasDelMercado } from '../../src/core/entities/DescargasContpaqi.js';
import { VersionesContpaqiService } from '../../src/application/versiones/VersionesContpaqiService.js';
import { VersionSistema } from '../../src/core/entities/VersionSistema.js';
import type { IDescargasContpaqi } from '../../src/core/ports/services/IDescargasContpaqi.js';
import { InMemoryVersionRepository } from '../fakes/kb.js';
import { InMemoryConfiguracionRepository } from '../fakes/tickets.js';
import { FixedClock, silentLogger } from '../fakes/support.js';

/** Un bloque como los de old.contpaqi.com/descargas (Zoho Sites), recortado. */
function bloque(titulo: string, o: { version?: string; publicado?: string; descarga?: string; carta?: string } = {}): string {
  return `<h2 style="margin-bottom:10px;"><span><span>${titulo}</span></span><br/></h2></div>
    ${o.carta ? `<p><span style="font-weight:700;">Carta técnica</span></p><p>HTML:&nbsp;<a href="${o.carta}" title="Haz&nbsp;clic aquí">Haz&nbsp;clic aquí</a></p>` : ''}
    <div class="zptext"><p style="text-align:center;">Tamaño: <span>88.3&nbsp; MB</span></p>
    ${o.version ? `<p style="text-align:center;">Versión: ${o.version}</p>` : ''}
    ${o.publicado ? `<p style="text-align:center;">Publicado: ${o.publicado}</p>` : ''}</div>
    ${o.descarga ? `<a class="zpbutton-wrapper" href="${o.descarga}" target="_blank" title="Descarga la actualización"><span>Descargar</span></a>` : ''}`;
}

const D = 'https://descargas.contpaqi.com/repositorios/fls/evaluacion';
const CT = 'https://conocimiento.blob.core.windows.net/conocimiento/2026/CartasTecnicas';

const PAGINA = `<html><head><style>h2{color:red}</style><script>var x = "<h2>no</h2>";</script></head><body>
${bloque('CONTPAQi® Herramientas complementarias 9.1.0', { version: '9.1.0', publicado: '2026-10-19', descarga: `${D}/Componentes/910/Componentes_i_910.zip`, carta: `${CT}/CT_Componentes_910/portada.html` })}
${bloque('CONTPAQi® Herramientas complementarias 9.0.0', { version: '9.0.0', publicado: '2026-09-30', descarga: `${D}/Componentes/900/Componentes_i_900.zip` })}
${bloque('Solución Fuera de Versión CONTPAQi Nóminas® 19.4.3', { version: '19.4.3', publicado: '2026-10-21', descarga: `${D}/Nominas/SFV_Nominas_v1943.zip` })}
${bloque('CONTPAQi Nóminas® 19.4.2', { version: '19.4.2', publicado: '2026-10-19', descarga: `${D}/Nominas/CTi_NOMINAS_1942.zip`, carta: `${CT}/CT_Nominas_1942/portada.html` })}
${bloque('Solución fuera de versión CONTPAQi Nóminas® 19.4.0', { version: '19.4.0', publicado: '2026-09-17', descarga: `${D}/Nominas/SFV_Nominas_v1940.zip` })}
${bloque('CONTPAQi Nóminas® 19.3.5', { version: '19.3.5', publicado: '2026-08-11', descarga: `${D}/Nominas/CTi_NOMINAS_1935.zip` })}
${bloque('CONTPAQi Comercial Premium® 12.2.1', { version: '12.2.1', publicado: '2026-09-28', descarga: `${D}/Comercial/CTi_Comercial_Premium_1221.zip` })}
${bloque('Service Pack 2 para CONTPAQi Comercial® Start/Pro 11.0.0', { version: '11.0.0', descarga: `${D}/StartPro/1100SP2.zip` })}
${bloque('Service Pack 1 para CONTPAQi Comercial® Start/Pro 11.0.0', { version: '11.0.0', descarga: `${D}/StartPro/1100SP1.zip` })}
${bloque('CONTPAQi Comercial® Start/Pro 11.0.0', { version: '11.0.0', descarga: `${D}/StartPro/1100.zip`, carta: `${CT}/CT_StartPro_1100/portada.html` })}
${bloque('CONTPAQi® Contabilidad-Bancos 19.3.1', { version: '19.3.1', publicado: '2026-08', descarga: `${D}/CONTABILIDAD_BANCOS_1931.zip` })}
${bloque('CONTPAQi Bancos® y CONTPAQi Contabilidad® 18')}
${bloque('Service Pack CONTPAQi XML en linea+® 6.7.0', { version: '18', publicado: '2026-07', descarga: `${D}/Service_Pack_Contabilidad_18_XML_linea_670.zip` })}
${bloque('CONTPAQi XML en línea+® 6.8.0', { version: '6.8.0', publicado: '2026-09-24', descarga: `${D}/CTi_XML_Linea_680.zip` })}
</body></html>`;

describe('leerPaginaDescargas', () => {
  const pubs = leerPaginaDescargas(PAGINA);

  it('lee un bloque por <h2> con versión, fecha, descarga y carta; ignora scripts', () => {
    expect(pubs[0]).toEqual({
      titulo: 'CONTPAQi® Herramientas complementarias 9.1.0',
      base: '9.1.0',
      tipo: 'version',
      sp: 0,
      fecha: '2026-10-19',
      linkDescarga: `${D}/Componentes/910/Componentes_i_910.zip`,
      linkCartaTecnica: `${CT}/CT_Componentes_910/portada.html`,
    });
    expect(pubs.some((p) => p.titulo === 'no')).toBe(false);
  });

  it('la versión sale del título aunque el campo "Versión:" diga otra cosa; la fecha de solo mes queda en día 01', () => {
    const xml = pubs.find((p) => p.titulo.includes('XML en linea+® 6.7.0'))!;
    expect(xml).toMatchObject({ base: '6.7.0', tipo: 'service_pack', sp: 1, fecha: '2026-07-01' });
  });

  it('distingue service pack con número y soluciones fuera de versión', () => {
    expect(pubs.find((p) => p.titulo.startsWith('Service Pack 2 para'))).toMatchObject({ tipo: 'service_pack', sp: 2 });
    expect(pubs.find((p) => p.titulo.includes('19.4.3'))).toMatchObject({ tipo: 'fuera_de_version', base: '19.4.3' });
  });
});

describe('sistemasDelMercado', () => {
  it('suma Anticipa y Servidor de Licencias Común al catálogo, sin repetirlos', () => {
    expect(sistemasDelMercado(['NOMINAS'])).toEqual(['NOMINAS', 'ANTICIPA', 'SERVIDOR DE LICENCIAS COMUN']);
    expect(sistemasDelMercado(['Anticipa', 'Servidor de Licencias Común'])).toEqual(['Anticipa', 'Servidor de Licencias Común']);
  });
});

describe('fechas de la página', () => {
  it('voltea día y mes cuando vienen al revés (Instalia: 2024-18-06)', () => {
    const [p] = leerPaginaDescargas(`<h2>CONTPAQi Instalia® 3.1.0</h2><p>Versión: 3.1.0</p><p>Publicado: 2024-18-06</p>`);
    expect(p!.fecha).toBe('2024-06-18');
  });
});

describe('esDelSistema', () => {
  it('empareja por palabras, sin acentos ni ®, con alias para Componentes y Start/Pro', () => {
    expect(esDelSistema('NOMINAS', 'CONTPAQi Nóminas® 19.4.2')).toBe(true);
    expect(esDelSistema('CONTABILIDAD', 'CONTPAQi® Contabilidad-Bancos 19.3.1')).toBe(true);
    expect(esDelSistema('BANCOS', 'CONTPAQi® Contabilidad-Bancos 19.3.1')).toBe(true);
    expect(esDelSistema('COMPONENTES', 'CONTPAQi® Herramientas complementarias 9.1.0')).toBe(true);
    expect(esDelSistema('COMERCIAL PRO', 'CONTPAQi Comercial® Start/Pro 11.0.0')).toBe(true);
    expect(esDelSistema('COMERCIAL PRO', 'CONTPAQi Comercial Premium® 12.2.1')).toBe(false);
    expect(esDelSistema('XML EN LINEA', 'CONTPAQi XML en línea+® 6.8.0')).toBe(true);
    expect(esDelSistema('Varios', 'CONTPAQi XML en línea+® 6.8.0')).toBe(false);
  });
});

describe('ultimaVersionDe', () => {
  const pubs = leerPaginaDescargas(PAGINA);

  it('una solución fuera de versión es SP de la versión normal anterior y hereda su carta técnica', () => {
    // La versión trae su propia fecha y descarga; la SFV queda como SP 1 con la suya.
    expect(ultimaVersionDe('NOMINAS', pubs)).toEqual({
      version: '19.4.2 Sp 1',
      base: '19.4.2',
      fecha: '2026-10-19',
      linkDescarga: `${D}/Nominas/CTi_NOMINAS_1942.zip`,
      linkCartaTecnica: `${CT}/CT_Nominas_1942/portada.html`,
      titulo: 'Solución Fuera de Versión CONTPAQi Nóminas® 19.4.3',
      servicePacks: [
        { numero: 1, fecha: '2026-10-21', linkDescarga: `${D}/Nominas/SFV_Nominas_v1943.zip`, titulo: 'Solución Fuera de Versión CONTPAQi Nóminas® 19.4.3' },
      ],
    });
  });

  it('el service pack más alto gana y toma la carta de su versión', () => {
    const u = ultimaVersionDe('Comercial Pro', pubs)!;
    expect(u).toMatchObject({
      version: '11.0.0 Sp 2',
      base: '11.0.0',
      linkDescarga: `${D}/StartPro/1100.zip`,
      linkCartaTecnica: `${CT}/CT_StartPro_1100/portada.html`,
    });
    expect(u.servicePacks.map((p) => [p.numero, p.linkDescarga])).toEqual([
      [1, `${D}/StartPro/1100SP1.zip`],
      [2, `${D}/StartPro/1100SP2.zip`],
    ]);
  });

  it('una versión normal más alta le gana a un SP de una anterior; sin coincidencias → null', () => {
    expect(ultimaVersionDe('XML EN LINEA', pubs)?.version).toBe('6.8.0');
    expect(ultimaVersionDe('COMPONENTES', pubs)?.version).toBe('9.1.0');
    expect(ultimaVersionDe('CONTABILIDAD', pubs)?.version).toBe('19.3.1');
    expect(ultimaVersionDe('XELCRON', pubs)).toBeNull();
  });
});

describe('VersionesContpaqiService', () => {
  let config: InMemoryConfiguracionRepository;
  let versiones: InMemoryVersionRepository;
  let clock: FixedClock;
  let pagina: { html: string; falla: string; lecturas: number };
  let svc: VersionesContpaqiService;

  beforeEach(async () => {
    config = new InMemoryConfiguracionRepository();
    await config.guardarTickets({ ...(await config.obtenerTickets()), sistemas: ['NOMINAS', 'COMPONENTES', 'XELCRON', 'XML EN LINEA'] });
    versiones = new InMemoryVersionRepository();
    await versiones.save(new VersionSistema({ id: 'v1', sistema: 'NOMINAS', versionActual: '19.2.1 Sp 1' }));
    await versiones.save(new VersionSistema({ id: 'v2', sistema: 'COMPONENTES', versionActual: '9.1.0' }));
    clock = new FixedClock(new Date('2026-10-29T15:00:00Z'));
    pagina = { html: PAGINA, falla: '', lecturas: 0 };
    const descargas: IDescargasContpaqi = {
      leerPagina: async () => {
        pagina.lecturas++;
        if (pagina.falla) throw new Error(pagina.falla);
        return pagina.html;
      },
    };
    svc = new VersionesContpaqiService(config, versiones, descargas, clock, silentLogger);
  });

  it('guarda lo último por sistema y solo avisa de los registrados que quedaron atrás', async () => {
    const estado = await svc.consultar();
    expect(Object.keys(estado.ultimas).sort()).toEqual(['COMPONENTES', 'NOMINAS', 'XML EN LINEA']);
    const nov = await svc.novedades();
    // XML EN LINEA no está registrado (no cuenta); COMPONENTES ya está al día.
    expect(nov.map((n) => [n.sistema, n.actual, n.nueva.version])).toEqual([['NOMINAS', '19.2.1 Sp 1', '19.4.2 Sp 1']]);
    // No toca las versiones registradas.
    expect((await versiones.findById('v1'))!.versionActual).toBe('19.2.1 Sp 1');
  });

  it('el cron lee la página una vez al día', async () => {
    expect(await svc.revisarSiToca()).toEqual({ revisado: true, novedades: 1 });
    clock.avanzarMs(5 * 3_600_000);
    expect(await svc.revisarSiToca()).toEqual({ revisado: false, novedades: 1 });
    expect(pagina.lecturas).toBe(1);
    clock.avanzarMs(20 * 3_600_000);
    await svc.revisarSiToca();
    expect(pagina.lecturas).toBe(2);
  });

  it('si la página falla o cambia de formato, conserva lo último bueno y deja el error', async () => {
    await svc.consultar();
    pagina.falla = 'HTTP 503';
    await expect(svc.consultar()).rejects.toThrow('HTTP 503');
    const e = await svc.estado();
    expect(e.error).toBe('HTTP 503');
    expect(e.ultimas.NOMINAS?.version).toBe('19.4.2 Sp 1');

    pagina.falla = '';
    pagina.html = '<html><body>en mantenimiento</body></html>';
    await expect(svc.consultar()).rejects.toThrow(/cambió de formato/);
    expect((await svc.novedades()).length).toBe(1);
  });
});
