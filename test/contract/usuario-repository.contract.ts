import { beforeEach, describe, expect, it } from 'vitest';
import type { IUsuarioRepository } from '../../src/core/ports/repositories/IUsuarioRepository.js';
import { Usuario } from '../../src/core/entities/Usuario.js';

/**
 * Suite de contrato: se ejecuta contra CADA implementación de `IUsuarioRepository`
 * (fake en memoria y Firestore/emulador). Verifica que ambas cumplen la misma semántica (LSP).
 */
export function contratoUsuarioRepository(
  nombre: string,
  crear: () => Promise<{ repo: IUsuarioRepository; limpiar: () => Promise<void> }>,
): void {
  describe(`IUsuarioRepository — ${nombre}`, () => {
    let repo: IUsuarioRepository;
    let limpiar: () => Promise<void>;

    beforeEach(async () => {
      ({ repo, limpiar } = await crear());
      await limpiar();
    });

    const nuevoUsuario = (over: Partial<ConstructorParameters<typeof Usuario>[0]> = {}) =>
      new Usuario({
        uid: 'u1',
        email: 'ana@dattasoft.mx',
        nombre: 'Ana',
        rol: 'agente',
        ...over,
      });

    it('devuelve null si no existe', async () => {
      expect(await repo.findByUid('nope')).toBeNull();
      expect(await repo.findByEmail('nope@x.com')).toBeNull();
    });

    it('guarda y recupera por uid y por email (normalizado)', async () => {
      await repo.save(nuevoUsuario());
      expect((await repo.findByUid('u1'))?.nombre).toBe('Ana');
      expect((await repo.findByEmail('ANA@DATTASOFT.MX'))?.uid).toBe('u1');
    });

    it('save hace upsert por uid', async () => {
      await repo.save(nuevoUsuario());
      const u = (await repo.findByUid('u1'))!;
      u.nombre = 'Ana María';
      await repo.save(u);
      expect((await repo.findByUid('u1'))?.nombre).toBe('Ana María');
      expect(await repo.list()).toHaveLength(1);
    });

    it('countByRol cuenta solo activos de ese rol', async () => {
      await repo.save(nuevoUsuario({ uid: 'a1', email: 'a1@x.com', rol: 'admin' }));
      await repo.save(nuevoUsuario({ uid: 'a2', email: 'a2@x.com', rol: 'admin', activo: false }));
      expect(await repo.countByRol('admin')).toBe(1);
    });

    it('delete quita el usuario (findByUid/findByEmail dejan de verlo)', async () => {
      await repo.save(nuevoUsuario());
      await repo.delete('u1');
      expect(await repo.findByUid('u1')).toBeNull();
      expect(await repo.findByEmail('ana@dattasoft.mx')).toBeNull();
      expect(await repo.list()).toHaveLength(0);
    });

    it('listAgentesAsignables incluye roles técnicos (agente y soporte), activos y disponibles', async () => {
      await repo.save(nuevoUsuario({ uid: 'g1', email: 'g1@x.com', rol: 'agente' }));
      await repo.save(nuevoUsuario({ uid: 'g2', email: 'g2@x.com', rol: 'soporte' }));
      await repo.save(
        nuevoUsuario({
          uid: 'g3',
          email: 'g3@x.com',
          rol: 'agente',
          agente: { disponibleAsignacion: false },
        }),
      );
      await repo.save(nuevoUsuario({ uid: 'v1', email: 'v1@x.com', rol: 'ventas' }));
      await repo.save(nuevoUsuario({ uid: 's1', email: 's1@x.com', rol: 'supervisor' }));
      const asignables = await repo.listAgentesAsignables();
      expect(asignables.map((u) => u.uid).sort()).toEqual(['g1', 'g2']);
    });

    it('list({ roles }) filtra por varios roles a la vez', async () => {
      await repo.save(nuevoUsuario({ uid: 'g1', email: 'g1@x.com', rol: 'agente' }));
      await repo.save(nuevoUsuario({ uid: 'g2', email: 'g2@x.com', rol: 'soporte' }));
      await repo.save(nuevoUsuario({ uid: 'v1', email: 'v1@x.com', rol: 'ventas' }));
      const tecnicos = await repo.list({ roles: ['agente', 'soporte'] });
      expect(tecnicos.map((u) => u.uid).sort()).toEqual(['g1', 'g2']);
    });
  });
}
