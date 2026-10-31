// Utilidades de fechas, validación de cédula y exportación.

export const pad = (n: number): string => String(n).padStart(2, '0');

export function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function hoy(): string {
  return iso(new Date());
}

export function ahoraHM(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function diaLargo(s: string): string {
  const t = parse(s).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function diaCorto(s: string): string {
  return parse(s).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fechaFmt(s: string): string {
  return parse(s).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Horas de inicio de cita disponibles en el día: lunes a viernes 08:00-18:00, sábado 08:00-13:00. */
export function horasDia(s: string): string[] {
  const dow = parse(s).getDay();
  if (dow === 0) return [];
  const ultima = dow === 6 ? 12 : 17;
  const horas: string[] = [];
  for (let h = 8; h <= ultima; h++) horas.push(`${pad(h)}:00`);
  return horas;
}

/** Horas que faltan entre ahora y una cita (negativo si ya pasó). */
export function horasHasta(fecha: string, hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  const d = parse(fecha);
  d.setHours(h, m, 0, 0);
  return (d.getTime() - Date.now()) / 3_600_000;
}

/** Valida una cédula ecuatoriana de 10 dígitos con el algoritmo del módulo 10. */
export function validarCedula(c: string): boolean {
  if (!/^\d{10}$/.test(c)) return false;
  const prov = Number(c.slice(0, 2));
  if ((prov < 1 || prov > 24) && prov !== 30) return false;
  if (Number(c[2]) > 5) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = Number(c[i]) * coef[i];
    if (v > 9) v -= 9;
    suma += v;
  }
  const dv = (10 - (suma % 10)) % 10;
  return dv === Number(c[9]);
}

/** Genera una cédula válida (solo para datos ficticios de demostración). */
export function cedulaFicticia(prov: number, serie: number): string {
  const base = `${pad(prov)}0${String(serie).padStart(6, '0')}`;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = Number(base[i]) * coef[i];
    if (v > 9) v -= 9;
    suma += v;
  }
  return base + String((10 - (suma % 10)) % 10);
}

/** Descarga un CSV (abre en Excel) con BOM para conservar tildes. */
export function descargarCsv(nombre: string, cabecera: string[], filas: (string | number)[][]): void {
  const esc = (v: string | number): string => `"${String(v).replace(/"/g, '""')}"`;
  const texto = [cabecera, ...filas].map((f) => f.map(esc).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function iniciales(nombre: string): string {
  return nombre
    .replace(/^(Dra?\.|Lic\.)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/** Clase CSS del chip según el estado de la cita. */
export function claseEstado(estado: string): string {
  const mapa: Record<string, string> = {
    Pendiente: 'pendiente',
    Confirmada: 'confirmada',
    Atendida: 'atendida',
    Cancelada: 'cancelada',
    'No asistió': 'no-asistio',
  };
  return `chip ${mapa[estado] ?? ''}`;
}
export const DOMINIOS_PERMITIDOS = [
  'gmail.com', 'outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es',
  'live.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'protonmail.com',
];

/** Correo válido y de un proveedor conocido. `extra` permite dominios propios (ej. fisionova.ec). */
export function correoPermitido(correo: string, extra: string[] = []): boolean {
  const c = correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return false;
  const dominio = c.split('@')[1];
  return [...DOMINIOS_PERMITIDOS, ...extra].includes(dominio);
}
