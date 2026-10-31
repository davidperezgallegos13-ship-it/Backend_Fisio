import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL, CLAVE_TOKEN } from './api';
import { cedulaFicticia, correoPermitido, requisitosClave, validarCedula } from './util';

export type Rol = 'Administrador' | 'Recepción' | 'Fisioterapeuta' | 'Paciente';

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  correo: string;
  fisioId?: string;
  pacienteId?: string;
}

export interface Cuenta extends Usuario {
  cedula: string;
  clave: string;
  activa: boolean;
}

export const MSG_GENERICO =
  'No pudimos iniciar sesión. Revisa tus datos o espera 15 minutos si superaste los intentos permitidos.';

const CLAVES_COMUNES = ['123456789012', 'contraseña123', 'password1234', 'qwertyuiop12', 'fisionova1234'];

/**
 * Autenticación de demostración (RF-02, RF-03, RF-05, RF-26).
 * Reemplaza `iniciar`, `verificar` y las altas por llamadas HTTP a tu backend.
 * El servidor debe validar el rol en cada petición (respuesta 403 si no corresponde).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly CLAVE_DEMO = 'FisioNova2026!';
  readonly CODIGO_DEMO = '123456';

  private readonly http = inject(HttpClient);
  private contador = 10;

  private readonly _cuentas = signal<Cuenta[]>([
    this.semilla('u1', 'Daniela Proaño', 'Administrador', 'admin@fisionova.ec', cedulaFicticia(17, 100201)),
    this.semilla('u2', 'Sofía Mendieta', 'Recepción', 'recepcion@fisionova.ec', cedulaFicticia(17, 100302)),
    this.semilla('u3', 'Dra. Camila Andrade', 'Fisioterapeuta', 'camila.andrade@fisionova.ec', cedulaFicticia(17, 100403), { fisioId: 'f1' }),
    this.semilla('u4', 'Lic. Mateo Ríos', 'Fisioterapeuta', 'mateo.rios@fisionova.ec', cedulaFicticia(17, 100504), { fisioId: 'f2' }),
    this.semilla('u5', 'Lic. Valeria Torres', 'Fisioterapeuta', 'valeria.torres@fisionova.ec', cedulaFicticia(17, 100605), { fisioId: 'f3' }),
    this.semilla('u6', 'Lic. Andrés Salazar', 'Fisioterapeuta', 'andres.salazar@fisionova.ec', cedulaFicticia(17, 100706), { fisioId: 'f4' }),
    this.semilla('u7', 'Lucía Paredes', 'Paciente', 'lucia.paredes@correo.ec', cedulaFicticia(17, 300100), { pacienteId: 'p1' }),
  ]);

  /** Cuentas del personal (sin contraseña), para el módulo de administración. */
  readonly personal = computed(() =>
    this._cuentas()
      .filter((c) => c.rol !== 'Paciente')
      .map(({ clave: _omitida, ...resto }) => resto),
  );

  private intentos = new Map<string, { n: number; hasta: number }>();

  readonly usuario = signal<Usuario | null>(this.restaurar());
  readonly pendiente = signal<Cuenta | null>(null);

  // ---------- conexión con la API (PostgreSQL) ----------
  private tokenPendiente: string | null = null;
  /** Personal que ya puso su contraseña y falta el segundo factor. */
  readonly usuarioPendiente = signal<Usuario | null>(null);

  private msgError(e: unknown): string {
    const err = e as { error?: { error?: string } };
    return err?.error?.error ?? 'No pudimos conectar con el servidor. Intenta de nuevo.';
  }

  /** Paso 1: cédula o correo + contraseña, validados por la API. Devuelve un error o null. */
  async iniciarApi(identificador: string, clave: string): Promise<string | null> {
    try {
      const r = await firstValueFrom(
        this.http.post<{ token: string; usuario: Usuario }>(`${API_URL}/login`, { identificador, clave }),
      );
      if (r.usuario.rol === 'Paciente') {
        this.guardarSesion(r.usuario, r.token);
      } else {
        this.tokenPendiente = r.token;
        this.usuarioPendiente.set(r.usuario);
      }
      return null;
    } catch (e) {
      return this.msgError(e);
    }
  }

  /** Paso 2: segundo factor del personal. */
  verificarApi(codigo: string): boolean {
    const u = this.usuarioPendiente();
    if (!u || !this.tokenPendiente || codigo.trim() !== this.CODIGO_DEMO) return false;
    this.guardarSesion(u, this.tokenPendiente);
    this.usuarioPendiente.set(null);
    this.tokenPendiente = null;
    return true;
  }

  cancelarVerificacionApi(): void {
    this.usuarioPendiente.set(null);
    this.tokenPendiente = null;
  }

  async registrarApi(d: {
    nombre: string;
    cedula: string;
    correo: string;
    telefono: string;
    clave: string;
    consentimiento: boolean;
  }): Promise<string | null> {
    try {
      const r = await firstValueFrom(
        this.http.post<{ token: string; usuario: Usuario }>(`${API_URL}/registro`, d),
      );
      this.guardarSesion(r.usuario, r.token);
      return null;
    } catch (e) {
      return this.msgError(e);
    }
  }

  private guardarSesion(u: Usuario, token: string): void {
    this.usuario.set(u);
    try {
      sessionStorage.setItem('fisionova.usuario', JSON.stringify(u));
      sessionStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* sin almacenamiento: la sesión vive solo en memoria */
    }
  }

  /** Paso 1: cédula o correo más contraseña. Devuelve un mensaje genérico de error o null. */
  iniciar(identificador: string, clave: string): string | null {
    const id = identificador.trim().toLowerCase();
    const reg = this.intentos.get(id) ?? { n: 0, hasta: 0 };
    if (reg.hasta > Date.now()) return MSG_GENERICO;

    const cuenta = this._cuentas().find((c) => c.correo.toLowerCase() === id || c.cedula === id);
    if (!cuenta || !cuenta.activa || cuenta.clave !== clave) {
      reg.n += 1;
      if (reg.n >= 5) {
        reg.hasta = Date.now() + 15 * 60_000;
        reg.n = 0;
      }
      this.intentos.set(id, reg);
      return MSG_GENERICO;
    }
    this.intentos.delete(id);
    if (cuenta.rol === 'Paciente') {
      // RF-26: el segundo factor es solo para el personal.
      this.abrirSesion(cuenta);
    } else {
      this.pendiente.set(cuenta);
    }
    return null;
  }

  /** Paso 2: segundo factor (código temporal) para el personal. */
  verificar(codigo: string): boolean {
    const cuenta = this.pendiente();
    if (!cuenta || codigo.trim() !== this.CODIGO_DEMO) return false;
    this.pendiente.set(null);
    this.abrirSesion(cuenta);
    return true;
  }

  cancelarVerificacion(): void {
    this.pendiente.set(null);
  }

  salir(): void {
    this.usuario.set(null);
    this.pendiente.set(null);
    this.cancelarVerificacionApi();
    try {
      sessionStorage.removeItem('fisionova.usuario');
      sessionStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* nada que limpiar */
    }
  }

  // ---------- pacientes ----------
  tieneCuenta(pacienteId: string): boolean {
    return this._cuentas().some((c) => c.pacienteId === pacienteId);
  }

  /** RNF-01: 12 o más caracteres, sin contraseñas comunes ni datos personales. */
  validarClave(clave: string, cedula: string, correo: string): string | null {
    const falta = requisitosClave(clave).find((r) => !r.ok);
    if (falta) return `La contraseña necesita: ${falta.texto.toLowerCase()}.`;
    const baja = clave.toLowerCase();
    if (CLAVES_COMUNES.includes(baja) || /^(.)\1+$/.test(clave)) return 'Esa contraseña es muy común. Elige otra.';
    const usuarioCorreo = correo.split('@')[0].toLowerCase();
    if ((cedula && baja.includes(cedula)) || (usuarioCorreo.length >= 4 && baja.includes(usuarioCorreo))) {
      return 'No uses tu cédula ni tu correo dentro de la contraseña.';
    }
    return null;
  }

  crearCuentaPaciente(p: { id: string; nombre: string; correo: string; cedula: string }, clave: string): void {
    this._cuentas.update((l) => [
      ...l,
      {
        id: `u${++this.contador}`,
        nombre: p.nombre,
        rol: 'Paciente',
        correo: p.correo.trim(),
        cedula: p.cedula,
        clave,
        activa: true,
        pacienteId: p.id,
      },
    ]);
  }

  entrarComoPaciente(pacienteId: string): void {
    const c = this._cuentas().find((x) => x.pacienteId === pacienteId);
    if (c) this.abrirSesion(c);
  }

  // ---------- personal (solo administrador) ----------
  alternarCuenta(id: string): string | null {
    if (this.usuario()?.id === id) return 'No puedes desactivar tu propia cuenta.';
    this._cuentas.update((l) => l.map((c) => (c.id === id ? { ...c, activa: !c.activa } : c)));
    return null;
  }

  crearPersonal(d: { nombre: string; cedula: string; correo: string; rol: Rol; fisioId: string; clave: string }): string | null {
    if (d.rol === 'Paciente') return 'Elige un rol del personal.';
    if (d.nombre.trim().length < 5) return 'Escribe el nombre completo.';
    if (!validarCedula(d.cedula)) return 'La cédula no es válida. Revisa los 10 dígitos.';
    if (!correoPermitido(d.correo, ['fisionova.ec'])) return 'Usa un correo de @fisionova.ec, Gmail u Outlook.';
    const cuentas = this._cuentas();
    if (cuentas.some((c) => c.cedula === d.cedula)) return 'Ya existe una cuenta con esa cédula.';
    if (cuentas.some((c) => c.correo.toLowerCase() === d.correo.trim().toLowerCase())) return 'Ya existe una cuenta con ese correo.';
    if (d.rol === 'Fisioterapeuta') {
      if (!d.fisioId) return 'Elige a qué fisioterapeuta corresponde la cuenta.';
      if (cuentas.some((c) => c.fisioId === d.fisioId)) return 'Ese fisioterapeuta ya tiene una cuenta.';
    }
    const errClave = this.validarClave(d.clave, d.cedula, d.correo);
    if (errClave) return errClave;
    this._cuentas.update((l) => [
      ...l,
      {
        id: `u${++this.contador}`,
        nombre: d.nombre.trim(),
        rol: d.rol,
        correo: d.correo.trim(),
        cedula: d.cedula,
        clave: d.clave,
        activa: true,
        ...(d.rol === 'Fisioterapeuta' ? { fisioId: d.fisioId } : {}),
      },
    ]);
    return null;
  }

  // ---------- internos ----------
  private semilla(id: string, nombre: string, rol: Rol, correo: string, cedula: string, extra: Partial<Usuario> = {}): Cuenta {
    return { id, nombre, rol, correo, cedula, clave: this.CLAVE_DEMO, activa: true, ...extra };
  }

  private abrirSesion(c: Cuenta): void {
    const u: Usuario = { id: c.id, nombre: c.nombre, rol: c.rol, correo: c.correo, fisioId: c.fisioId, pacienteId: c.pacienteId };
    this.usuario.set(u);
    try {
      sessionStorage.setItem('fisionova.usuario', JSON.stringify(u));
    } catch {
      /* sin almacenamiento: la sesión vive solo en memoria */
    }
  }

  private restaurar(): Usuario | null {
    try {
      const raw = sessionStorage.getItem('fisionova.usuario');
      if (!raw || !sessionStorage.getItem(CLAVE_TOKEN)) return null;
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }
}
