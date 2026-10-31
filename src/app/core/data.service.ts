import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { addDays, ahoraHM, cedulaFicticia, correoPermitido, hoy, horasDia, horasHasta, validarCedula } from './util';

export type Estado = 'Pendiente' | 'Confirmada' | 'Atendida' | 'Cancelada' | 'No asistió';
export type Metodo = 'Efectivo' | 'Transferencia' | 'Depósito';

export interface Fisio {
  id: string;
  nombre: string;
  especialidad: string;
  color: string;
}
export interface Servicio {
  id: string;
  nombre: string;
  minutos: number;
  precio: number;
}
export interface Paciente {
  id: string;
  cedula: string;
  nombre: string;
  correo: string;
  telefono: string;
  consentimiento: { version: string; fecha: string };
}
export interface Paquete {
  id: string;
  nombre: string;
  sesiones: number;
  precio: number;
  vigenciaDias: number;
  activo: boolean;
}
export interface Compra {
  id: string;
  pacienteId: string;
  paqueteNombre: string;
  sesiones: number;
  saldo: number;
  monto: number;
  metodo: Metodo;
  fecha: string;
  vence: string;
}
export interface Cita {
  id: string;
  pacienteId: string;
  fisioId: string;
  servicioId: string;
  fecha: string;
  hora: string;
  estado: Estado;
  conPaquete: boolean;
  creadaPor: string;
}
export interface Registro {
  id: number;
  ts: string;
  usuario: string;
  rol: string;
  accion: string;
  detalle: string;
}

export const TRANSICIONES: Record<Estado, Estado[]> = {
  Pendiente: ['Confirmada', 'Cancelada'],
  Confirmada: ['Atendida', 'No asistió', 'Cancelada'],
  Atendida: [],
  Cancelada: [],
  'No asistió': [],
};

function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Datos ficticios (RES-16) y reglas de negocio en memoria.
 * Cuando conectes el backend, cada método se convierte en una llamada HttpClient
 * y las reglas pasan a validarse también en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly auth = inject(AuthService);

  readonly fisios = signal<Fisio[]>([
    { id: 'f1', nombre: 'Dra. Camila Andrade', especialidad: 'Rehabilitación deportiva', color: '#13706C' },
    { id: 'f2', nombre: 'Lic. Mateo Ríos', especialidad: 'Terapia manual', color: '#C9810E' },
    { id: 'f3', nombre: 'Lic. Valeria Torres', especialidad: 'Neurorehabilitación', color: '#2D5FBF' },
    { id: 'f4', nombre: 'Lic. Andrés Salazar', especialidad: 'Electroterapia y ejercicio', color: '#8A4FA8' },
  ]);

  readonly servicios = signal<Servicio[]>([
    { id: 's1', nombre: 'Terapia manual', minutos: 45, precio: 25 },
    { id: 's2', nombre: 'Electroterapia', minutos: 30, precio: 18 },
    { id: 's3', nombre: 'Rehabilitación deportiva', minutos: 60, precio: 30 },
    { id: 's4', nombre: 'Ejercicio terapéutico', minutos: 45, precio: 22 },
    { id: 's5', nombre: 'Neurorehabilitación', minutos: 60, precio: 32 },
  ]);

  readonly pacientes = signal<Paciente[]>([]);
  readonly paquetes = signal<Paquete[]>([
    { id: 'p1', nombre: 'Plan inicial · 3 sesiones', sesiones: 3, precio: 70, vigenciaDias: 30, activo: true },
    { id: 'p2', nombre: 'Paquete 5 sesiones', sesiones: 5, precio: 110, vigenciaDias: 60, activo: true },
    { id: 'p3', nombre: 'Paquete 10 sesiones', sesiones: 10, precio: 200, vigenciaDias: 90, activo: true },
    { id: 'p4', nombre: 'Paquete 20 sesiones', sesiones: 20, precio: 360, vigenciaDias: 180, activo: true },
  ]);
  readonly compras = signal<Compra[]>([]);
  readonly citas = signal<Cita[]>([]);
  readonly registros = signal<Registro[]>([]);

  // ---------- vistas según el rol (RF-05, RES-07, RES-10) ----------
  /** Fisioterapeutas que el usuario puede ver: el fisioterapeuta solo se ve a sí mismo. */
  readonly fisiosVisibles = computed(() => {
    const u = this.auth.usuario();
    return u?.rol === 'Fisioterapeuta' ? this.fisios().filter((f) => f.id === u.fisioId) : this.fisios();
  });

  /** Citas visibles: el fisioterapeuta ve las suyas y el paciente solo las propias. */
  readonly citasVisibles = computed(() => {
    const u = this.auth.usuario();
    if (u?.rol === 'Fisioterapeuta') return this.citas().filter((c) => c.fisioId === u.fisioId);
    if (u?.rol === 'Paciente') return this.citas().filter((c) => c.pacienteId === u.pacienteId);
    return this.citas();
  });

  /** Pacientes visibles: el fisioterapeuta solo los que atiende. */
  readonly pacientesVisibles = computed(() => {
    const u = this.auth.usuario();
    if (u?.rol === 'Fisioterapeuta') {
      const ids = new Set(this.citas().filter((c) => c.fisioId === u.fisioId).map((c) => c.pacienteId));
      return this.pacientes().filter((p) => ids.has(p.id));
    }
    if (u?.rol === 'Paciente') return this.pacientes().filter((p) => p.id === u.pacienteId);
    return this.pacientes();
  });

  private contador = 1000;

  constructor() {
    this.sembrar();
  }

  // ---------- consultas ----------
  paciente(id: string): Paciente | undefined {
    return this.pacientes().find((p) => p.id === id);
  }
  fisio(id: string): Fisio | undefined {
    return this.fisios().find((f) => f.id === id);
  }
  servicio(id: string): Servicio | undefined {
    return this.servicios().find((s) => s.id === id);
  }

  comprasVigentes(pacienteId: string): Compra[] {
    const h = hoy();
    return this.compras()
      .filter((c) => c.pacienteId === pacienteId && c.saldo > 0 && c.vence >= h)
      .sort((a, b) => a.vence.localeCompare(b.vence));
  }
  saldo(pacienteId: string): number {
    return this.comprasVigentes(pacienteId).reduce((s, c) => s + c.saldo, 0);
  }

  /** Paquetes con 2 sesiones o menos, o que vencen en 7 días o menos (RF-29). */
  readonly alertasPaquete = computed(() => {
    const limite = addDays(hoy(), 7);
    return this.compras()
      .filter((c) => c.saldo > 0 && c.vence >= hoy() && (c.saldo <= 2 || c.vence <= limite))
      .map((c) => ({
        compra: c,
        paciente: this.paciente(c.pacienteId),
        porSaldo: c.saldo <= 2,
        porVencer: c.vence <= limite,
      }))
      .sort((a, b) => a.compra.vence.localeCompare(b.compra.vence));
  });

  /** Horas libres de un fisioterapeuta en una fecha (RES-01, RES-02). */
  horasLibres(fecha: string, fisioId: string, excluirCita?: string): string[] {
    if (!fecha || !fisioId) return [];
    const h = hoy();
    if (fecha < h || fecha > addDays(h, 30)) return [];
    const ocupadas = new Set(
      this.citas()
        .filter((c) => c.fisioId === fisioId && c.fecha === fecha && c.estado !== 'Cancelada' && c.id !== excluirCita)
        .map((c) => c.hora),
    );
    const ahora = ahoraHM();
    return horasDia(fecha).filter((hr) => !ocupadas.has(hr) && !(fecha === h && hr <= ahora));
  }

  // ---------- citas ----------
  agendar(i: { pacienteId: string; fisioId: string; servicioId: string; fecha: string; hora: string; conPaquete: boolean }): string | null {
    if (!i.pacienteId) return 'Elige un paciente.';
    if (!i.servicioId) return 'Elige un servicio.';
    if (!i.fisioId) return 'Elige un fisioterapeuta.';
    if (!i.fecha) return 'Elige una fecha.';
    if (!i.hora) return 'Elige una hora disponible.';
    if (!this.horasLibres(i.fecha, i.fisioId).includes(i.hora)) {
      return 'Ese horario ya no está disponible. Elige otra hora.';
    }
    const cruce = this.citas().some(
      (c) => c.pacienteId === i.pacienteId && c.fecha === i.fecha && c.hora === i.hora && c.estado !== 'Cancelada',
    );
    if (cruce) return 'El paciente ya tiene una cita a esa hora.';
    if (i.conPaquete && this.saldo(i.pacienteId) <= 0) {
      return 'El paciente no tiene sesiones vigentes en un paquete. Registra la venta o desmarca el cargo a paquete.';
    }
    const cita: Cita = {
      id: this.id('c'),
      ...i,
      estado: 'Pendiente',
      creadaPor: this.auth.usuario()?.nombre ?? 'Sistema',
    };
    this.citas.update((l) => [...l, cita]);
    this.log('Agendó cita', `${this.paciente(i.pacienteId)?.nombre} · ${i.fecha} ${i.hora}`);
    return null;
  }

  reprogramar(id: string, fecha: string, hora: string): string | null {
    const c = this.citas().find((x) => x.id === id);
    if (!c) return 'No encontramos la cita.';
    if (horasHasta(c.fecha, c.hora) < 12) {
      return 'Faltan menos de 12 horas para la cita. Ya no se puede reprogramar.';
    }
    if (!hora) return 'Elige una hora disponible.';
    if (!this.horasLibres(fecha, c.fisioId, id).includes(hora)) return 'Ese horario no está disponible.';
    this.citas.update((l) => l.map((x) => (x.id === id ? { ...x, fecha, hora } : x)));
    this.log('Reprogramó cita', `${this.paciente(c.pacienteId)?.nombre} · ${fecha} ${hora}`);
    return null;
  }

  cambiarEstado(id: string, nuevo: Estado): string | null {
    const c = this.citas().find((x) => x.id === id);
    if (!c) return 'No encontramos la cita.';
    if (!TRANSICIONES[c.estado].includes(nuevo)) {
      return `Una cita ${c.estado.toLowerCase()} no puede pasar a ${nuevo.toLowerCase()}.`;
    }
    if (nuevo === 'Cancelada' && horasHasta(c.fecha, c.hora) < 12) {
      return 'Faltan menos de 12 horas para la cita. Ya no se puede cancelar.';
    }
    if (nuevo === 'Atendida' && c.conPaquete) {
      const compra = this.comprasVigentes(c.pacienteId)[0];
      if (!compra) return 'El paciente no tiene sesiones vigentes para descontar.';
      this.compras.update((l) => l.map((x) => (x.id === compra.id ? { ...x, saldo: x.saldo - 1 } : x)));
      this.log('Descontó sesión de paquete', `${this.paciente(c.pacienteId)?.nombre} · quedan ${compra.saldo - 1}`);
    }
    this.citas.update((l) => l.map((x) => (x.id === id ? { ...x, estado: nuevo } : x)));
    this.log(`Marcó cita como ${nuevo.toLowerCase()}`, `${this.paciente(c.pacienteId)?.nombre} · ${c.fecha} ${c.hora}`);
    return null;
  }

  // ---------- pacientes ----------
  registrarPaciente(d: { nombre: string; cedula: string; correo: string; telefono: string; consentimiento: boolean }, soloValidar = false): string | null {
    if (d.nombre.trim().length < 5) return 'Escribe el nombre completo.';
    if (!validarCedula(d.cedula)) return 'La cédula no es válida. Revisa los 10 dígitos.';
    if (this.pacientes().some((p) => p.cedula === d.cedula)) return 'Ya existe un paciente con esa cédula.';
    if (!correoPermitido(d.correo)) return 'Usa un correo de Gmail, Outlook, Hotmail, Yahoo o iCloud.';
    if (this.pacientes().some((p) => p.correo.toLowerCase() === d.correo.toLowerCase())) return 'Ya existe un paciente con ese correo.';
    if (!/^\d{9,10}$/.test(d.telefono)) return 'El teléfono debe tener 9 o 10 dígitos.';
    if (!d.consentimiento) return 'Sin el consentimiento de tratamiento de datos no se puede completar el registro.';
    if (soloValidar) return null;
    const p: Paciente = {
      id: this.id('p'),
      cedula: d.cedula,
      nombre: d.nombre.trim(),
      correo: d.correo.trim(),
      telefono: d.telefono,
      consentimiento: { version: 'v1.0', fecha: hoy() },
    };
    this.pacientes.update((l) => [p, ...l]);
    this.log('Registró paciente', p.nombre);
    return null;
  }

  /**
   * Registro público de un paciente nuevo (crea paciente y cuenta).
   * Si recepción ya lo registró, solo crea su cuenta cuando cédula y correo coinciden.
   * En el backend real, este vínculo debe confirmarse con un enlace enviado al correo.
   */
  registrarse(d: { nombre: string; cedula: string; correo: string; telefono: string; clave: string; consentimiento: boolean }): string | null {
    const errClave = this.auth.validarClave(d.clave, d.cedula, d.correo);
    const existente = this.pacientes().find((p) => p.cedula === d.cedula);
    if (existente) {
      if (existente.correo.toLowerCase() !== d.correo.trim().toLowerCase()) {
        return 'Ya hay un paciente con esa cédula. Usa el correo con que te registraron o pide ayuda en recepción.';
      }
      if (this.auth.tieneCuenta(existente.id)) return 'Ya tienes una cuenta. Ingresa con tu cédula o correo.';
      if (!d.consentimiento) return 'Sin el consentimiento de tratamiento de datos no se puede crear la cuenta.';
      if (errClave) return errClave;
      this.auth.crearCuentaPaciente(existente, d.clave);
      this.log('Activó su cuenta de paciente', existente.nombre);
      return null;
    }
    if (errClave) {
      // Se valida el resto de campos antes para mostrar primero el error más probable.
      const e = this.registrarPaciente({ ...d, consentimiento: d.consentimiento }, true);
      return e ?? errClave;
    }
    const e = this.registrarPaciente(d);
    if (e) return e;
    const p = this.pacientes().find((x) => x.cedula === d.cedula);
    if (!p) return 'No pudimos crear tu cuenta. Intenta de nuevo.';
    this.auth.crearCuentaPaciente(p, d.clave);
    this.log('Se registró como paciente', p.nombre);
    return null;
  }

  crearServicio(d: { nombre: string; minutos: number; precio: number }): string | null {
    if (d.nombre.trim().length < 3) return 'Escribe el nombre del servicio.';
    if (!(d.minutos >= 15 && d.minutos <= 120)) return 'La duración debe estar entre 15 y 120 minutos.';
    if (!(d.precio > 0)) return 'Indica el precio referencial.';
    this.servicios.update((l) => [...l, { id: this.id('s'), nombre: d.nombre.trim(), minutos: d.minutos, precio: d.precio }]);
    this.log('Creó servicio', d.nombre);
    return null;
  }

  // ---------- paquetes ----------
  registrarVenta(d: { pacienteId: string; paqueteId: string; monto: number; metodo: Metodo }): string | null {
    const paq = this.paquetes().find((p) => p.id === d.paqueteId);
    if (!d.pacienteId) return 'Elige un paciente.';
    if (!paq) return 'Elige un paquete.';
    if (!(d.monto > 0)) return 'Escribe el monto cobrado.';
    const compra: Compra = {
      id: this.id('v'),
      pacienteId: d.pacienteId,
      paqueteNombre: paq.nombre,
      sesiones: paq.sesiones,
      saldo: paq.sesiones,
      monto: d.monto,
      metodo: d.metodo,
      fecha: hoy(),
      vence: addDays(hoy(), paq.vigenciaDias),
    };
    this.compras.update((l) => [compra, ...l]);
    this.log('Registró venta de paquete', `${this.paciente(d.pacienteId)?.nombre} · ${paq.nombre}`);
    return null;
  }

  crearPaquete(d: { nombre: string; sesiones: number; precio: number; vigenciaDias: number }): string | null {
    if (d.nombre.trim().length < 3) return 'Escribe el nombre del paquete.';
    if (!(d.sesiones >= 1)) return 'Indica cuántas sesiones incluye.';
    if (!(d.precio > 0)) return 'Indica el precio.';
    if (!(d.vigenciaDias >= 1)) return 'Indica la vigencia en días.';
    this.paquetes.update((l) => [...l, { id: this.id('p'), activo: true, ...d, nombre: d.nombre.trim() }]);
    this.log('Creó paquete', d.nombre);
    return null;
  }

  alternarPaquete(id: string): void {
    this.paquetes.update((l) => l.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p)));
    const p = this.paquetes().find((x) => x.id === id);
    this.log(p?.activo ? 'Activó paquete' : 'Desactivó paquete', p?.nombre ?? id);
  }

  log(accion: string, detalle: string): void {
    const u = this.auth.usuario();
    const r: Registro = {
      id: ++this.contador,
      ts: new Date().toISOString(),
      usuario: u?.nombre ?? 'Sistema',
      rol: u?.rol ?? '—',
      accion,
      detalle,
    };
    this.registros.update((l) => [r, ...l]);
  }

  private id(prefijo: string): string {
    return `${prefijo}${++this.contador}`;
  }

  // ---------- datos ficticios ----------
  private sembrar(): void {
    const rnd = prng(2026);
    const nombres: [string, string][] = [
      ['Lucía Paredes', 'lucia.paredes'],
      ['Jorge Villacís', 'jorge.villacis'],
      ['María Fernanda Cueva', 'mf.cueva'],
      ['Diego Armijos', 'diego.armijos'],
      ['Karla Mendoza', 'karla.mendoza'],
      ['Pablo Naranjo', 'pablo.naranjo'],
      ['Andrea Chicaiza', 'andrea.chicaiza'],
      ['Santiago Bravo', 'santiago.bravo'],
      ['Daniela Loor', 'daniela.loor'],
      ['Ricardo Zambrano', 'ricardo.zambrano'],
      ['Paola Guerrero', 'paola.guerrero'],
      ['Esteban Mora', 'esteban.mora'],
    ];
    const provincias = [17, 17, 1, 9, 18, 17, 10, 11, 13, 23, 6, 17];
    const pacientes: Paciente[] = nombres.map(([n, mail], i) => ({
      id: `p${i + 1}`,
      cedula: cedulaFicticia(provincias[i], 300100 + i * 137),
      nombre: n,
      correo: `${mail}@correo.ec`,
      telefono: `09${String(80000000 + Math.floor(rnd() * 19999999))}`,
      consentimiento: { version: 'v1.0', fecha: addDays(hoy(), -30 - i) },
    }));
    this.pacientes.set(pacientes);

    const h = hoy();
    const compras: Compra[] = [
      ['p1', 'Paquete 10 sesiones', 10, 4, 200, 'Transferencia', -40, 50],
      ['p2', 'Paquete 5 sesiones', 5, 2, 110, 'Efectivo', -25, 35],
      ['p3', 'Paquete 20 sesiones', 20, 14, 360, 'Depósito', -20, 160],
      ['p4', 'Plan inicial · 3 sesiones', 3, 1, 70, 'Efectivo', -26, 4],
      ['p5', 'Paquete 10 sesiones', 10, 7, 200, 'Transferencia', -12, 78],
      ['p7', 'Paquete 5 sesiones', 5, 5, 110, 'Efectivo', -2, 58],
      ['p9', 'Paquete 5 sesiones', 5, 3, 110, 'Depósito', -50, 6],
    ].map((c, i) => ({
      id: `v${i + 1}`,
      pacienteId: c[0] as string,
      paqueteNombre: c[1] as string,
      sesiones: c[2] as number,
      saldo: c[3] as number,
      monto: c[4] as number,
      metodo: c[5] as Metodo,
      fecha: addDays(h, c[6] as number),
      vence: addDays(h, c[7] as number),
    }));
    this.compras.set(compras);

    const citas: Cita[] = [];
    const ahora = ahoraHM();
    let n = 0;
    for (let d = -6; d <= 8; d++) {
      const fecha = addDays(h, d);
      const horas = horasDia(fecha);
      for (const f of this.fisios()) {
        for (const hora of horas) {
          if (rnd() > (d === 0 ? 0.62 : 0.5)) continue;
          const libres = pacientes.filter(
            (p) => !citas.some((c) => c.pacienteId === p.id && c.fecha === fecha && c.hora === hora),
          );
          const p = libres[Math.floor(rnd() * libres.length)];
          if (!p) continue;
          const r = rnd();
          let estado: Estado;
          if (fecha < h || (fecha === h && hora < ahora)) {
            estado = r < 0.74 ? 'Atendida' : r < 0.88 ? 'No asistió' : 'Cancelada';
          } else if (fecha === h) {
            estado = r < 0.55 ? 'Confirmada' : 'Pendiente';
          } else {
            estado = r < 0.04 ? 'Cancelada' : r < 0.6 ? 'Confirmada' : 'Pendiente';
          }
          citas.push({
            id: `c${++n}`,
            pacienteId: p.id,
            fisioId: f.id,
            servicioId: this.servicios()[Math.floor(rnd() * this.servicios().length)].id,
            fecha,
            hora,
            estado,
            conPaquete: compras.some((c) => c.pacienteId === p.id) && rnd() > 0.4,
            creadaPor: rnd() > 0.3 ? 'Sofía Mendieta' : 'Daniela Proaño',
          });
        }
      }
    }
    this.citas.set(citas);

    const base = new Date();
    const evento = (min: number, usuario: string, rol: string, accion: string, detalle: string, i: number): Registro => ({
      id: i,
      ts: new Date(base.getTime() - min * 60_000).toISOString(),
      usuario,
      rol,
      accion,
      detalle,
    });
    this.registros.set([
      evento(35, 'Sofía Mendieta', 'Recepción', 'Inicio de sesión', 'Verificación en dos pasos completada', 3),
      evento(120, 'Daniela Proaño', 'Administrador', 'Creó paquete', 'Paquete 20 sesiones', 2),
      evento(1500, 'Sofía Mendieta', 'Recepción', 'Registró paciente', 'Esteban Mora', 1),
    ]);
  }
}
