import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService, Rol } from '../core/auth.service';
import { DataService, Estado } from '../core/data.service';
import { addDays, descargarCsv, diaCorto, fechaFmt, hoy, horasDia } from '../core/util';
import { Icon } from '../ui/icon';

type Cel = string | number;
type Id = 'REP-01' | 'REP-02' | 'REP-03' | 'REP-04' | 'REP-05' | 'REP-06';

interface Def {
  id: Id;
  nombre: string;
  resumen: string;
  roles: Rol[];
  rango: boolean;
  fisio: boolean;
  dia: boolean;
}

interface Resultado {
  cabecera: string[];
  filas: Cel[][];
  kpis: { etiqueta: string; valor: string }[];
  excluye: string;
  nota?: string;
}

const DEFS: Def[] = [
  { id: 'REP-01', nombre: 'Asistencia', resumen: 'Citas atendidas, canceladas e inasistencias', roles: ['Administrador', 'Recepción'], rango: true, fisio: true, dia: false },
  { id: 'REP-02', nombre: 'Citas por fisioterapeuta', resumen: 'Estados por día y total del periodo', roles: ['Administrador'], rango: true, fisio: true, dia: false },
  { id: 'REP-03', nombre: 'Ocupación de agenda', resumen: 'Horas disponibles frente a agendadas', roles: ['Administrador'], rango: true, fisio: true, dia: false },
  { id: 'REP-04', nombre: 'Agenda diaria', resumen: 'Lista de citas de un día', roles: ['Administrador', 'Recepción', 'Fisioterapeuta'], rango: false, fisio: true, dia: true },
  { id: 'REP-05', nombre: 'Paquetes vendidos y saldos', resumen: 'Sesiones totales y restantes por paciente', roles: ['Administrador', 'Recepción'], rango: true, fisio: false, dia: false },
  { id: 'REP-06', nombre: 'Auditoría de actividad', resumen: 'Quién hizo qué y cuándo', roles: ['Administrador'], rango: true, fisio: false, dia: false },
];

@Component({
  selector: 'fn-reportes',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .cuerpo {
      display: grid;
      grid-template-columns: 270px minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
    }
    .lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .rep {
      width: 100%;
      text-align: left;
      border: 1px solid transparent;
      background: transparent;
      border-radius: var(--radio-sm);
      padding: 0.7rem 0.85rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .rep:hover {
      background: var(--superficie);
    }
    .rep.activo {
      background: var(--superficie);
      border-color: var(--linea-fuerte);
      box-shadow: inset 4px 0 0 var(--ambar);
    }
    .rep strong {
      font-size: 0.95rem;
    }
    .rep span {
      font-size: 0.82rem;
      color: var(--suave);
    }
    .filtros {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-end;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--linea);
    }
    .filtros .campo {
      min-width: 150px;
    }
    .filtros .campo input,
    .filtros .campo select {
      min-height: 38px;
    }
    .filtros .acciones {
      margin-left: auto;
    }
    .kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 2.5rem;
      padding: 1.1rem 1.25rem;
      border-bottom: 1px solid var(--linea);
      margin: 0;
    }
    .kpis div {
      display: flex;
      flex-direction: column;
    }
    .kpis dt {
      font-size: 0.82rem;
      color: var(--suave);
    }
    .kpis dd {
      margin: 0;
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 1.5rem;
      line-height: 1.2;
    }
    tr.total td {
      font-weight: 700;
      background: #f8faf9;
    }
    .pie-reporte {
      padding: 0.9rem 1.25rem;
      font-size: 0.82rem;
      color: var(--suave);
      border-top: 1px solid var(--linea);
    }
    @media (max-width: 1000px) {
      .cuerpo {
        grid-template-columns: 1fr;
      }
      .lista {
        flex-direction: row;
        overflow-x: auto;
      }
      .rep {
        min-width: 210px;
      }
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Reportes</h1>
          <p>Descarga en Excel o imprime como PDF. Los reportes no incluyen notas clínicas ni diagnósticos.</p>
        </div>
      </header>

      <div class="cuerpo">
        <nav class="no-imprimir" aria-label="Tipos de reporte">
          <ul class="lista">
            @for (d of disponibles(); track d.id) {
              <li>
                <button type="button" class="rep" [class.activo]="d.id === def().id" [attr.aria-pressed]="d.id === def().id" (click)="id.set(d.id)">
                  <strong>{{ d.nombre }}</strong>
                  <span>{{ d.resumen }}</span>
                </button>
              </li>
            }
          </ul>
        </nav>

        <section class="panel" aria-live="polite">
          <div class="filtros no-imprimir">
            @if (def().rango) {
              <div class="campo">
                <label for="r-desde">Desde</label>
                <input id="r-desde" type="date" [value]="desde()" (change)="desde.set($any($event.target).value)" />
              </div>
              <div class="campo">
                <label for="r-hasta">Hasta</label>
                <input id="r-hasta" type="date" [value]="hasta()" (change)="hasta.set($any($event.target).value)" />
              </div>
            }
            @if (def().dia) {
              <div class="campo">
                <label for="r-dia">Día</label>
                <input id="r-dia" type="date" [value]="dia()" (change)="dia.set($any($event.target).value)" />
              </div>
            }
            @if (def().fisio) {
              <div class="campo">
                <label for="r-fis">Fisioterapeuta</label>
                <select id="r-fis" (change)="fisio.set($any($event.target).value)">
                  <option value="todos" [selected]="fisio() === 'todos'">Todos</option>
                  @for (f of data.fisiosVisibles(); track f.id) {
                    <option [value]="f.id" [selected]="fisio() === f.id">{{ f.nombre }}</option>
                  }
                </select>
              </div>
            }
            <div class="acciones">
              <button type="button" class="btn" (click)="exportar()"><fn-icon name="descargar" /> Excel</button>
              <button type="button" class="btn" (click)="imprimir()"><fn-icon name="imprimir" /> PDF</button>
            </div>
          </div>

          <dl class="kpis">
            @for (k of resultado().kpis; track k.etiqueta) {
              <div>
                <dt>{{ k.etiqueta }}</dt>
                <dd>{{ k.valor }}</dd>
              </div>
            }
          </dl>

          @if (resultado().filas.length === 0) {
            <div class="vacio"><strong>No hay datos para estos filtros.</strong> Amplía el rango de fechas o cambia el fisioterapeuta.</div>
          } @else {
            <div class="tabla-envoltura">
              <table class="tabla">
                <thead>
                  <tr>
                    @for (c of resultado().cabecera; track c) {
                      <th>{{ c }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (fila of resultado().filas; track $index) {
                    <tr [class.total]="esTotal(fila)">
                      @for (cel of fila; track $index) {
                        <td [class.num]="esNumero(cel)">{{ cel }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <p class="pie-reporte">
            No incluye: {{ resultado().excluye }}.
            @if (resultado().nota) {
              {{ resultado().nota }}
            }
          </p>
        </section>
      </div>
    </div>
  `,
})
export class Reportes {
  protected readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  protected readonly id = signal<Id>('REP-01');
  protected readonly desde = signal(addDays(hoy(), -7));
  protected readonly hasta = signal(hoy());
  protected readonly dia = signal(hoy());
  protected readonly fisio = signal('todos');

  protected readonly disponibles = computed(() =>
    DEFS.filter((d) => {
      const rol = this.auth.usuario()?.rol;
      return !!rol && d.roles.includes(rol);
    }),
  );
  protected readonly def = computed(() => this.disponibles().find((d) => d.id === this.id()) ?? this.disponibles()[0]);

  private readonly dias = computed(() => {
    const out: string[] = [];
    let d = this.desde();
    let tope = 0;
    while (d && d <= this.hasta() && tope++ < 400) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  });

  private readonly fisiosSel = computed(() =>
    this.data.fisiosVisibles().filter((f) => this.fisio() === 'todos' || f.id === this.fisio()),
  );

  protected readonly resultado = computed<Resultado>(() => {
    switch (this.def().id) {
      case 'REP-01':
        return this.asistencia();
      case 'REP-02':
        return this.porFisio();
      case 'REP-03':
        return this.ocupacion();
      case 'REP-04':
        return this.agenda();
      case 'REP-05':
        return this.paquetes();
      default:
        return this.auditoria();
    }
  });

  protected esTotal(fila: Cel[]): boolean {
    return String(fila[0]).startsWith('Total');
  }
  protected esNumero(c: Cel): boolean {
    return typeof c === 'number' || /^\d+(\.\d+)?%?$/.test(String(c));
  }

  protected exportar(): void {
    const r = this.resultado();
    descargarCsv(`FisioNova_${this.def().id}_${hoy()}`, r.cabecera, r.filas);
  }
  protected imprimir(): void {
    window.print();
  }

  // ---------- cálculo de cada reporte ----------
  private conteo(citas: { estado: Estado }[]): Record<Estado, number> {
    const r: Record<Estado, number> = { Pendiente: 0, Confirmada: 0, Atendida: 0, Cancelada: 0, 'No asistió': 0 };
    for (const c of citas) r[c.estado]++;
    return r;
  }

  private pct(parte: number, total: number): string {
    return total ? `${Math.round((parte / total) * 1000) / 10}%` : '0%';
  }

  private citasRango(fisioId?: string) {
    const dias = new Set(this.dias());
    return this.data.citasVisibles().filter((c) => dias.has(c.fecha) && (!fisioId || c.fisioId === fisioId));
  }

  private asistencia(): Resultado {
    const filas: Cel[][] = [];
    const todas = this.fisiosSel().flatMap((f) => this.citasRango(f.id));
    for (const f of this.fisiosSel()) {
      const n = this.conteo(this.citasRango(f.id));
      const total = Object.values(n).reduce((s, v) => s + v, 0);
      filas.push([f.nombre, total, n.Atendida, n.Cancelada, n['No asistió'], this.pct(n['No asistió'], total)]);
    }
    const t = this.conteo(todas);
    const total = todas.length;
    filas.push(['Total', total, t.Atendida, t.Cancelada, t['No asistió'], this.pct(t['No asistió'], total)]);
    return {
      cabecera: ['Fisioterapeuta', 'Total de citas', 'Atendidas', 'Canceladas', 'No asistió', '% de inasistencia'],
      filas: total ? filas : [],
      kpis: [
        { etiqueta: 'Total de citas', valor: String(total) },
        { etiqueta: 'Atendidas', valor: String(t.Atendida) },
        { etiqueta: 'Canceladas', valor: String(t.Cancelada) },
        { etiqueta: 'No asistió', valor: String(t['No asistió']) },
        { etiqueta: 'Inasistencia', valor: this.pct(t['No asistió'], total) },
      ],
      excluye: 'notas clínicas ni diagnósticos',
      nota: 'El porcentaje de inasistencia es No asistió ÷ total de citas.',
    };
  }

  private porFisio(): Resultado {
    const filas: Cel[][] = [];
    let total = 0;
    for (const d of this.dias()) {
      for (const f of this.fisiosSel()) {
        const cs = this.data.citasVisibles().filter((c) => c.fecha === d && c.fisioId === f.id);
        if (!cs.length) continue;
        const n = this.conteo(cs);
        total += cs.length;
        filas.push([diaCorto(d), f.nombre, n.Pendiente, n.Confirmada, n.Atendida, n.Cancelada, n['No asistió'], cs.length]);
      }
    }
    if (filas.length) filas.push(['Total del periodo', '', ...this.sumas(filas, 2, 7)]);
    return {
      cabecera: ['Día', 'Fisioterapeuta', 'Pendiente', 'Confirmada', 'Atendida', 'Cancelada', 'No asistió', 'Total'],
      filas,
      kpis: [{ etiqueta: 'Citas en el periodo', valor: String(total) }],
      excluye: 'datos clínicos del paciente',
    };
  }

  private ocupacion(): Resultado {
    const filas: Cel[][] = [];
    let disp = 0;
    let agen = 0;
    for (const d of this.dias()) {
      const horas = horasDia(d).length;
      if (!horas) continue;
      for (const f of this.fisiosSel()) {
        const a = this.data.citasVisibles().filter((c) => c.fecha === d && c.fisioId === f.id && c.estado !== 'Cancelada').length;
        disp += horas;
        agen += a;
        filas.push([diaCorto(d), f.nombre, horas, a, this.pct(a, horas)]);
      }
    }
    if (filas.length) filas.push(['Total del periodo', '', disp, agen, this.pct(agen, disp)]);
    return {
      cabecera: ['Día', 'Fisioterapeuta', 'Horas disponibles', 'Horas agendadas', '% de ocupación'],
      filas,
      kpis: [
        { etiqueta: 'Horas disponibles', valor: String(disp) },
        { etiqueta: 'Horas agendadas', valor: String(agen) },
        { etiqueta: 'Ocupación', valor: this.pct(agen, disp) },
      ],
      excluye: 'proyecciones o predicciones',
      nota: 'Cada cita ocupa una hora de agenda. Las citas canceladas no cuentan.',
    };
  }

  private agenda(): Resultado {
    const citas = this.data
      .citas()
      .filter((c) => c.fecha === this.dia() && (this.fisio() === 'todos' || c.fisioId === this.fisio()))
      .sort((a, b) => a.hora.localeCompare(b.hora) || a.fisioId.localeCompare(b.fisioId));
    return {
      cabecera: ['Hora', 'Paciente', 'Servicio', 'Fisioterapeuta', 'Estado'],
      filas: citas.map((c) => [
        c.hora,
        this.data.paciente(c.pacienteId)?.nombre ?? '',
        this.data.servicio(c.servicioId)?.nombre ?? '',
        this.data.fisio(c.fisioId)?.nombre ?? '',
        c.estado,
      ]),
      kpis: [{ etiqueta: 'Citas del día', valor: String(citas.length) }],
      excluye: 'historial ni notas clínicas',
    };
  }

  private paquetes(): Resultado {
    const dias = new Set(this.dias());
    const compras = this.data.compras().filter((c) => dias.has(c.fecha));
    const restantes = compras.reduce((s, c) => s + (c.vence >= hoy() ? c.saldo : 0), 0);
    return {
      cabecera: ['Paciente', 'Paquete', 'Sesiones totales', 'Sesiones restantes', 'Vence', 'Monto (USD)', 'Método de pago'],
      filas: compras.map((c) => [
        this.data.paciente(c.pacienteId)?.nombre ?? '',
        c.paqueteNombre,
        c.sesiones,
        c.saldo,
        fechaFmt(c.vence),
        c.monto,
        c.metodo,
      ]),
      kpis: [
        { etiqueta: 'Paquetes vendidos', valor: String(compras.length) },
        { etiqueta: 'Sesiones vigentes por usar', valor: String(restantes) },
      ],
      excluye: 'reportes contables o de ingresos ni datos de tarjeta',
    };
  }

  private auditoria(): Resultado {
    const dias = new Set(this.dias());
    const regs = this.data.registros().filter((r) => dias.has(r.ts.slice(0, 10)) || dias.has(this.local(r.ts)));
    return {
      cabecera: ['Fecha y hora', 'Usuario', 'Rol', 'Acción', 'Detalle'],
      filas: regs.map((r) => [new Date(r.ts).toLocaleString('es-EC'), r.usuario, r.rol, r.accion, r.detalle]),
      kpis: [{ etiqueta: 'Acciones registradas', valor: String(regs.length) }],
      excluye: 'el contenido clínico consultado',
      nota: 'La bitácora se conserva 12 meses.',
    };
  }

  private local(ts: string): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Suma las columnas numéricas [desde, hasta] de las filas para la fila de totales. */
  private sumas(filas: Cel[][], desde: number, hasta: number): number[] {
    const out: number[] = [];
    for (let i = desde; i <= hasta; i++) out.push(filas.reduce((s, f) => s + Number(f[i]), 0));
    return out;
  }
}
