/**
 * Lee la lista de «📄 Cargar lista» de Otros invitados: un CSV (coma o punto y coma) o celdas
 * pegadas de Excel (tabuladores). Con encabezado (nombre, correo, celular, personas — en el orden
 * que sea) usa esas columnas; sin encabezado adivina cada celda: con «@» es correo, con 7+ dígitos
 * es celular, un número chico es personas y lo demás es el nombre.
 */

/** Un renglón válido de la lista. */
export interface RenglonInvitado {
  nombre: string;
  correo: string | null;
  telefono: string | null;
  personas: number | null;
}

/** Lo que se pudo leer y los renglones que no. */
export interface ListaLeida {
  renglones: RenglonInvitado[];
  errores: string[];
}

/** Máximo de renglones por carga (tamaño del documento del evento y presupuesto del Worker). */
export const MAX_RENGLONES_LISTA = 300;

type Campo = keyof RenglonInvitado;

const ENCABEZADOS: Record<string, Campo> = {
  nombre: 'nombre', nombres: 'nombre', invitado: 'nombre', 'nombre completo': 'nombre', cliente: 'nombre',
  correo: 'correo', email: 'correo', 'e-mail': 'correo', mail: 'correo', 'correo electronico': 'correo',
  celular: 'telefono', telefono: 'telefono', tel: 'telefono', whatsapp: 'telefono', movil: 'telefono',
  personas: 'personas', pases: 'personas', invitados: 'personas', lugares: 'personas', cantidad: 'personas',
};

/** Minúsculas y sin acentos, para reconocer encabezados escritos de cualquier forma. */
function normal(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Separa un renglón respetando comillas («"Pérez, Juan"» es una sola celda). */
function celdas(linea: string, sep: string): string[] {
  const out: string[] = [];
  let actual = '';
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]!;
    if (c === '"') {
      if (comillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else comillas = !comillas;
    } else if (c === sep && !comillas) {
      out.push(actual.trim());
      actual = '';
    } else actual += c;
  }
  out.push(actual.trim());
  return out;
}

/** Tabulador si se pegó de Excel; si no, el que más aparezca entre «;» y «,». */
function separador(primera: string): string {
  if (primera.includes('\t')) return '\t';
  return (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ';' : ',';
}

const esCorreo = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const digitos = (v: string): string => v.replace(/\D/g, '');

/** Adivina qué es cada celda de un renglón sin encabezado. */
function adivinar(valores: string[]): Partial<Record<Campo, string>> {
  const r: Partial<Record<Campo, string>> = {};
  for (const v of valores) {
    if (!v) continue;
    if (!r.correo && v.includes('@')) r.correo = v;
    else if (!r.telefono && digitos(v).length >= 7 && /^[\d\s+()-]+$/.test(v)) r.telefono = v;
    else if (!r.personas && /^\d{1,2}$/.test(v)) r.personas = v;
    else if (!r.nombre) r.nombre = v;
  }
  return r;
}

/** Convierte el texto pegado o el CSV en renglones de invitados. */
export function leerListaInvitados(texto: string): ListaLeida {
  const lineas = String(texto ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
  const errores: string[] = [];
  if (!lineas.length) return { renglones: [], errores };

  const sep = separador(lineas[0]!);
  const primera = celdas(lineas[0]!, sep).map(normal);
  const columnas = primera.map((h) => ENCABEZADOS[h]);
  const conEncabezado = columnas.some(Boolean);
  const datos = conEncabezado ? lineas.slice(1) : lineas;

  const renglones: RenglonInvitado[] = [];
  datos.forEach((linea, i) => {
    const num = i + (conEncabezado ? 2 : 1);
    const valores = celdas(linea, sep);
    let r: Partial<Record<Campo, string>> = {};
    if (conEncabezado) {
      columnas.forEach((campo, j) => {
        if (campo && valores[j]) r[campo] = valores[j];
      });
    } else r = adivinar(valores);

    const correo = r.correo?.trim() || '';
    const telefono = r.telefono?.trim() || '';
    if (correo && !esCorreo(correo)) {
      errores.push(`Renglón ${num}: «${correo}» no es un correo válido`);
      return;
    }
    if (!correo && !telefono && !r.nombre) return; // renglón vacío (p. ej. solo comas)
    if (!correo && !telefono) {
      errores.push(`Renglón ${num}: «${r.nombre}» no trae correo ni celular`);
      return;
    }
    const personas = r.personas ? Number.parseInt(digitos(r.personas), 10) : NaN;
    renglones.push({
      nombre: (r.nombre ?? '').trim().slice(0, 120),
      correo: correo || null,
      telefono: telefono || null,
      personas: Number.isFinite(personas) && personas >= 1 ? personas : null,
    });
  });

  if (renglones.length > MAX_RENGLONES_LISTA) {
    errores.push(`Solo se cargan ${MAX_RENGLONES_LISTA} por vez: quedaron fuera ${renglones.length - MAX_RENGLONES_LISTA}`);
    renglones.length = MAX_RENGLONES_LISTA;
  }
  return { renglones, errores };
}
