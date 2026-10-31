import { Rol } from './auth.service';

export type Modulo =
  | 'inicio'
  | 'portal'
  | 'citas'
  | 'pacientes'
  | 'paquetes'
  | 'reportes'
  | 'personal'
  | 'mis-citas'
  | 'mis-paquetes'
  | 'guia';

/**
 * Matriz de módulos por rol (RF-05).
 * El administrador accede a todos los módulos del personal; el paciente solo a su portal.
 */
export const MODULOS: Record<Rol, Modulo[]> = {
  Administrador: ['inicio', 'citas', 'pacientes', 'paquetes', 'reportes', 'personal', 'guia'],
  Recepción: ['inicio', 'citas', 'pacientes', 'paquetes', 'reportes', 'guia'],
  Fisioterapeuta: ['inicio', 'citas', 'pacientes', 'reportes', 'guia'],
  Paciente: ['portal', 'mis-citas', 'mis-paquetes', 'guia'],
};

/** Roles que agendan, reprograman y cancelan citas en nombre de los pacientes (RF-09). */
export const GESTORES_DE_CITAS: Rol[] = ['Administrador', 'Recepción'];

export function puede(rol: Rol | undefined, modulo: Modulo): boolean {
  return !!rol && MODULOS[rol].includes(modulo);
}

export function gestionaCitas(rol: Rol | undefined): boolean {
  return !!rol && GESTORES_DE_CITAS.includes(rol);
}
