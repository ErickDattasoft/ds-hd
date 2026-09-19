import { readFileSync } from 'node:fs';
import { hashId } from './src/application/migracion/lib.js';
const d = JSON.parse(readFileSync('/mnt/d/WORK/WORK VA/RESPALDOS VA CRM/crm-backup-2026-09-19_15-44-43.json','utf8')).datos;
const s = (v: unknown) => (v == null ? '' : String(v)).trim();

// ¿Ids repetidos dentro del lote de un mismo ticket? Firestore rechaza el commit entero
// si trae dos escrituras al MISMO documento.
let ticketsConDuplicados = 0, duplicadosTotales = 0;
for (const t of d.tickets ?? []) {
  const id = `tic-${Number(t.numero)}`;
  const ids: string[] = [];
  for (const a of t.actividad ?? []) {
    if (!s(a.texto)) continue;
    ids.push(await hashId('evt', id, s(a.texto), s(a.fecha)));
  }
  for (const n of t.notas ?? []) {
    const cuerpo = s(n.texto ?? n.cuerpo); if (!cuerpo) continue;
    ids.push(await hashId('nota', id, cuerpo, s(n.fecha)));
  }
  const rep = ids.length - new Set(ids).size;
  if (rep) { ticketsConDuplicados++; duplicadosTotales += rep; }
}
console.log(`TICKETS: ${ticketsConDuplicados} tickets traen ids de detalle REPETIDOS (${duplicadosTotales} escrituras duplicadas)`);

// Contactos: ¿cuántos colapsa el emparejado por correo / nombre+empresa?
const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const porCorreo = new Map<string,string>(), porNombreEmpresa = new Map<string,string>();
let colapsados = 0; const ejemplos: string[] = [];
for (const c of d.contactos ?? []) {
  const nombre = s(c.nombre) || 'Sin nombre';
  const correo = s(c.correo).split(/[,;]/)[0]?.trim() ?? '';
  const emp = norm(s(c.empresa));
  const kC = correo ? norm(correo) : '', kN = `${emp}|${norm(nombre)}`;
  const yaC = kC && porCorreo.has(kC), yaN = porNombreEmpresa.has(kN);
  if (yaC || yaN) { colapsados++; if (ejemplos.length < 6) ejemplos.push(`${nombre} <${correo || 'sin correo'}> de ${s(c.empresa) || 'sin empresa'} → choca por ${yaC ? 'CORREO' : 'nombre+empresa'}`); }
  if (kC) porCorreo.set(kC, '1');
  porNombreEmpresa.set(kN, '1');
}
console.log(`CONTACTOS: ${d.contactos.length} en el archivo, ${colapsados} se funden con otro (quedarían ${d.contactos.length - colapsados})`);
for (const e of ejemplos) console.log('   -', e);
