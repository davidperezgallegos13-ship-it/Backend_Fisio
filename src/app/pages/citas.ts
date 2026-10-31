import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { Cita, DataService, Estado, TRANSICIONES } from '../core/data.service';
import { gestionaCitas } from '../core/permisos';
import { ToastService } from '../core/toast.service';
import { addDays, claseEstado, diaLargo, hoy, horasDia, horasHasta } from '../core/util';
import { Icon } from '../ui/icon';
import { Modal } from '../ui/modal';

@Component({
  selector: 'fn-citas',
  imports: [Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .dia {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .dia h2 {
      min-width: 15ch;
      text-align: center;
    }
    .dia input {
      min-height: 36px;
      border: 1px solid var(--linea-fuerte);
      border-radius: var(--radio-sm);
      padding: 0 0.5rem;
      background: var(--superficie);
    }
    .filtros {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .filtro {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      min-height: 34px;
      padding: 0 0.8rem;
      border-radius: 999px;
      border: 1px solid var(--linea-fuerte);
      background: var(--superficie);
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 500;
    }
    .filtro.activo {
      background: var(--tinta);
      border-color: var(--tinta);
      color: #fff;
    }
    .punto {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex: none;
    }
    .rejilla {
      display: grid;
      grid-template-columns: 64px repeat(var(--cols), minmax(190px, 1fr));
      min-width: min-content;
    }
    .enc {
      padding: 0.8rem 0.9rem;
      border-bottom: 1px solid var(--linea-fuerte);
      background: #f8faf9;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .enc span {
      display: flex;
      gap: 0.45rem;
      align-items: center;
      font-weight: 600;
    }
    .enc small {
      color: var(--suave);
      padding-left: 1rem;
    }
    .h {
      padding: 0.7rem 0.6rem;
      font-size: 0.82rem;
      color: var(--suave);
      font-variant-numeric: tabular-nums;
      border-bottom: 1px solid var(--linea);
      text-align: right;
    }
    .celda {
      min-height: 76px;
      padding: 5px;
      border-bottom: 1px solid var(--linea);
      border-left: 1px solid var(--linea);
      display: flex;
    }
    .cita {
      flex: 1;
      text-align: left;
      border: 0;
      border-left: 4px solid;
      border-radius: 6px;
      padding: 0.45rem 0.6rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }
    .cita:hover {
      filter: brightness(0.97);
    }
    .cita strong {
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cita .sec {
      font-size: 0.8rem;
      color: var(--suave);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cita .chip {
      align-self: flex-start;
      margin-top: auto;
      font-size: 0.72rem;
      padding: 0.05rem 0.5rem;
    }
    .libre {
      flex: 1;
      border: 1px dashed transparent;
      border-radius: 6px;
      background: transparent;
      color: transparent;
      cursor: pointer;
      display: grid;
      place-items: center;
    }
    .libre:hover,
    .libre:focus-visible {
      border-color: var(--abeto);
      background: var(--abeto-claro);
      color: var(--abeto);
    }
    .pasado {
      flex: 1;
      border-radius: 6px;
      background: repeating-linear-gradient(135deg, transparent 0 7px, #eef1f0 7px 8px);
    }
    dl.datos {
      display: grid;
      grid-template-columns: 8.5rem 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
    }
    dl.datos dt {
      color: var(--suave);
    }
    dl.datos dd {
      margin: 0;
      font-weight: 500;
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Citas</h1>
          <p>Agenda por fisioterapeuta. Toca un horario libre para agendar o una cita para gestionarla.</p>
        </div>
        <div class="acciones">
          @if (puedeAgendar()) {
            <button type="button" class="btn btn-primario" (click)="abrirNueva()"><fn-icon name="mas" /> Nueva cita</button>
          }
        </div>
      </header>

      <div class="barra">
        <div class="dia">
          <button type="button" class="btn-icono" (click)="mover(-1)" aria-label="Día anterior"><fn-icon name="izquierda" /></button>
          <h2>{{ titulo() }}</h2>
          <button type="button" class="btn-icono" (click)="mover(1)" aria-label="Día siguiente"><fn-icon name="derecha" /></button>
          <button type="button" class="btn btn-sm" (click)="fecha.set(hoyISO)">Hoy</button>
          <label class="solo-lectores" for="f-dia">Ir a una fecha</label>
          <input id="f-dia" type="date" [value]="fecha()" (change)="irA($any($event.target).value)" />
        </div>
        @if (data.fisiosVisibles().length > 1) {
          <div class="filtros" role="group" aria-label="Filtrar por fisioterapeuta">
            <button type="button" class="filtro" [class.activo]="filtro() === 'todos'" (click)="filtro.set('todos')">Todos</button>
            @for (f of data.fisiosVisibles(); track f.id) {
              <button type="button" class="filtro" [class.activo]="filtro() === f.id" (click)="filtro.set(f.id)">
                <span class="punto" [style.background]="f.color"></span>{{ f.nombre }}
              </button>
            }
          </div>
        }
      </div>

      <section class="panel" aria-label="Agenda del día">
        @if (horas().length === 0) {
          <div class="vacio"><strong>El centro no atiende los domingos.</strong> Elige otro día para ver o agendar citas.</div>
        } @else {
          <div class="tabla-envoltura">
            <div class="rejilla" [style.--cols]="columnas().length">
              <div class="enc"></div>
              @for (f of columnas(); track f.id) {
                <div class="enc">
                  <span><i class="punto" [style.background]="f.color"></i>{{ f.nombre }}</span>
                  <small>{{ f.especialidad }}</small>
                </div>
              }
              @for (h of horas(); track h) {
                <div class="h">{{ h }}</div>
                @for (f of columnas(); track f.id) {
                  <div class="celda">
                    @let c = celda(f.id, h);
                    @if (c) {
                      <button type="button" class="cita" [style.border-left-color]="f.color" [style.background]="fondo(f.color)" (click)="sel.set(c)">
                        <strong>{{ data.paciente(c.pacienteId)?.nombre }}</strong>
                        <span class="sec">{{ data.servicio(c.servicioId)?.nombre }}</span>
                        <span [class]="claseEstado(c.estado)">{{ c.estado }}</span>
                      </button>
                    } @else if (esLibre(f.id, h) && puedeAgendar()) {
                      <button type="button" class="libre" (click)="abrirNueva(f.id, h)" [attr.aria-label]="'Agendar con ' + f.nombre + ' a las ' + h">
                        <fn-icon name="mas" />
                      </button>
                    } @else if (esLibre(f.id, h)) {
                      <div></div>
                    } @else {
                      <div class="pasado"></div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }
      </section>
    </div>

    @if (modo()) {
      <fn-modal [titulo]="modo() === 'nueva' ? 'Nueva cita' : 'Reprogramar cita'" (cerrar)="cerrar()">
        <form class="dialogo-cuerpo" (submit)="guardar($event)" novalidate>
          @if (modo() === 'nueva') {
            <div class="campo">
              <label for="n-pac">Paciente</label>
              <select id="n-pac" (change)="nPac.set($any($event.target).value); nPaq.set(false)">
                <option value="" [selected]="!nPac()">Elige un paciente</option>
                @for (p of data.pacientes(); track p.id) {
                  <option [value]="p.id" [selected]="p.id === nPac()">{{ p.nombre }} · {{ p.cedula }}</option>
                }
              </select>
            </div>
            <div class="campo">
              <label for="n-ser">Servicio</label>
              <select id="n-ser" (change)="nSer.set($any($event.target).value)">
                <option value="" [selected]="!nSer()">Elige un servicio</option>
                @for (s of data.servicios(); track s.id) {
                  <option [value]="s.id" [selected]="s.id === nSer()">{{ s.nombre }} ({{ s.minutos }} min)</option>
                }
              </select>
            </div>
            <div class="campo">
              <label for="n-fis">Fisioterapeuta</label>
              <select id="n-fis" (change)="nFis.set($any($event.target).value); nHora.set('')">
                <option value="" [selected]="!nFis()">Elige un fisioterapeuta</option>
                @for (f of data.fisios(); track f.id) {
                  <option [value]="f.id" [selected]="f.id === nFis()">{{ f.nombre }}</option>
                }
              </select>
            </div>
          } @else if (editando(); as e) {
            <dl class="datos">
              <dt>Paciente</dt>
              <dd>{{ data.paciente(e.pacienteId)?.nombre }}</dd>
              <dt>Servicio</dt>
              <dd>{{ data.servicio(e.servicioId)?.nombre }}</dd>
              <dt>Fisioterapeuta</dt>
              <dd>{{ data.fisio(e.fisioId)?.nombre }}</dd>
            </dl>
          }
          <div class="rejilla-2">
            <div class="campo">
              <label for="n-fecha">Fecha</label>
              <input id="n-fecha" type="date" [min]="hoyISO" [max]="maxISO" [value]="nFecha()" (change)="nFecha.set($any($event.target).value); nHora.set('')" />
              <span class="ayuda">Hasta 30 días de anticipación.</span>
            </div>
            <div class="campo">
              <label for="n-hora">Hora</label>
              <select id="n-hora" (change)="nHora.set($any($event.target).value)" [disabled]="libres().length === 0">
                <option value="" [selected]="!nHora()">{{ libres().length ? 'Elige una hora' : 'Sin horas libres' }}</option>
                @for (h of libres(); track h) {
                  <option [value]="h" [selected]="h === nHora()">{{ h }}</option>
                }
              </select>
            </div>
          </div>
          @if (modo() === 'nueva' && saldoSel() > 0) {
            <label class="casilla">
              <input type="checkbox" [checked]="nPaq()" (change)="nPaq.set($any($event.target).checked)" />
              <span>Descontar de su paquete. Le quedan {{ saldoSel() }} sesiones vigentes.</span>
            </label>
          }
          @if (errorForm()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ errorForm() }}</span></div>
          }
          <div class="dialogo-pie">
            <button type="button" class="btn" (click)="cerrar()">Cancelar</button>
            <button type="submit" class="btn btn-primario">{{ modo() === 'nueva' ? 'Agendar cita' : 'Guardar nuevo horario' }}</button>
          </div>
        </form>
      </fn-modal>
    }

    @if (sel(); as c) {
      <fn-modal titulo="Detalle de la cita" (cerrar)="sel.set(null)">
        <div class="dialogo-cuerpo">
          <dl class="datos">
            <dt>Paciente</dt>
            <dd>{{ data.paciente(c.pacienteId)?.nombre }}</dd>
            <dt>Servicio</dt>
            <dd>{{ data.servicio(c.servicioId)?.nombre }} ({{ data.servicio(c.servicioId)?.minutos }} min)</dd>
            <dt>Fisioterapeuta</dt>
            <dd>{{ data.fisio(c.fisioId)?.nombre }}</dd>
            <dt>Fecha y hora</dt>
            <dd>{{ dia(c.fecha) }}, {{ c.hora }}</dd>
            <dt>Estado</dt>
            <dd><span [class]="claseEstado(c.estado)">{{ c.estado }}</span></dd>
            <dt>Cobro</dt>
            <dd>{{ c.conPaquete ? 'Se descuenta de su paquete al atenderla' : 'Pago por sesión' }}</dd>
            <dt>Agendada por</dt>
            <dd>{{ c.creadaPor }}</dd>
          </dl>
          @if (puedeAgendar() && bloqueada(c)) {
            <div class="alerta alerta-info">
              <fn-icon name="reloj" />
              <span>Faltan menos de 12 horas, o la cita ya pasó. Ya no se puede reprogramar ni cancelar.</span>
            </div>
          }
          @if (errorForm()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ errorForm() }}</span></div>
          }
          <div class="dialogo-pie">
            @if (puedeAgendar() && puede(c, 'Cancelada')) {
              <button type="button" class="btn btn-peligro" [disabled]="bloqueada(c)" (click)="estado(c, 'Cancelada')">Cancelar cita</button>
            }
            @if (puedeAgendar() && (c.estado === 'Pendiente' || c.estado === 'Confirmada')) {
              <button type="button" class="btn" [disabled]="bloqueada(c)" (click)="abrirReprogramar(c)">Reprogramar</button>
            }
            @if (puede(c, 'No asistió')) {
              <button type="button" class="btn" (click)="estado(c, 'No asistió')">No asistió</button>
            }
            @if (puede(c, 'Confirmada')) {
              <button type="button" class="btn btn-primario" (click)="estado(c, 'Confirmada')">Confirmar</button>
            }
            @if (puede(c, 'Atendida')) {
              <button type="button" class="btn btn-primario" (click)="estado(c, 'Atendida')">Marcar atendida</button>
            }
          </div>
        </div>
      </fn-modal>
    }
  `,
})
export class Citas {
  protected readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  protected readonly puedeAgendar = computed(() => gestionaCitas(this.auth.usuario()?.rol));

  /** Se llena desde /citas?paciente=ID (withComponentInputBinding). */
  readonly paciente = input<string>();

  protected readonly hoyISO = hoy();
  protected readonly maxISO = addDays(hoy(), 30);
  protected readonly claseEstado = claseEstado;

  protected readonly fecha = signal(hoy());
  protected readonly filtro = signal('todos');
  protected readonly sel = signal<Cita | null>(null);
  protected readonly modo = signal<'nueva' | 'reprogramar' | null>(null);
  protected readonly editando = signal<Cita | null>(null);

  protected readonly nPac = signal('');
  protected readonly nSer = signal('');
  protected readonly nFis = signal('');
  protected readonly nFecha = signal(hoy());
  protected readonly nHora = signal('');
  protected readonly nPaq = signal(false);
  protected readonly errorForm = signal<string | null>(null);

  protected readonly titulo = computed(() => diaLargo(this.fecha()));
  protected readonly horas = computed(() => horasDia(this.fecha()));
  protected readonly columnas = computed(() =>
    this.data.fisiosVisibles().filter((f) => this.filtro() === 'todos' || f.id === this.filtro()),
  );

  private readonly delDia = computed(() => {
    const m = new Map<string, Cita>();
    for (const c of this.data.citasVisibles()) {
      if (c.fecha === this.fecha() && c.estado !== 'Cancelada') m.set(`${c.fisioId}|${c.hora}`, c);
    }
    return m;
  });

  private readonly libresDia = computed(() => {
    const m = new Map<string, Set<string>>();
    for (const f of this.data.fisiosVisibles()) m.set(f.id, new Set(this.data.horasLibres(this.fecha(), f.id)));
    return m;
  });

  protected readonly libres = computed(() =>
    this.data.horasLibres(this.nFecha(), this.nFis(), this.editando()?.id),
  );
  protected readonly saldoSel = computed(() => (this.nPac() ? this.data.saldo(this.nPac()) : 0));

  constructor() {
    effect(() => {
      const id = this.paciente();
      if (id && this.puedeAgendar()) untracked(() => this.abrirNueva(undefined, undefined, id));
    });
  }

  protected celda(fisioId: string, hora: string): Cita | undefined {
    return this.delDia().get(`${fisioId}|${hora}`);
  }
  protected esLibre(fisioId: string, hora: string): boolean {
    return this.libresDia().get(fisioId)?.has(hora) ?? false;
  }
  protected fondo(color: string): string {
    return `color-mix(in srgb, ${color} 11%, white)`;
  }
  protected dia(f: string): string {
    return diaLargo(f);
  }

  protected mover(n: number): void {
    this.fecha.update((f) => addDays(f, n));
  }
  protected irA(v: string): void {
    if (v) this.fecha.set(v);
  }

  protected puede(c: Cita, e: Estado): boolean {
    return TRANSICIONES[c.estado].includes(e);
  }
  protected bloqueada(c: Cita): boolean {
    return horasHasta(c.fecha, c.hora) < 12;
  }

  protected abrirNueva(fisioId?: string, hora?: string, pacienteId?: string): void {
    this.errorForm.set(null);
    this.editando.set(null);
    this.nPac.set(pacienteId ?? '');
    this.nSer.set('');
    this.nFis.set(fisioId ?? (this.filtro() !== 'todos' ? this.filtro() : ''));
    this.nFecha.set(this.fecha() < hoy() ? hoy() : this.fecha());
    this.nHora.set(hora ?? '');
    this.nPaq.set(false);
    this.modo.set('nueva');
  }

  protected abrirReprogramar(c: Cita): void {
    this.errorForm.set(null);
    this.sel.set(null);
    this.editando.set(c);
    this.nFis.set(c.fisioId);
    this.nFecha.set(c.fecha < hoy() ? hoy() : c.fecha);
    this.nHora.set('');
    this.modo.set('reprogramar');
  }

  protected cerrar(): void {
    this.modo.set(null);
    this.editando.set(null);
    this.errorForm.set(null);
  }

  protected guardar(ev: Event): void {
    ev.preventDefault();
    const edit = this.editando();
    const error =
      this.modo() === 'reprogramar' && edit
        ? this.data.reprogramar(edit.id, this.nFecha(), this.nHora())
        : this.data.agendar({
            pacienteId: this.nPac(),
            fisioId: this.nFis(),
            servicioId: this.nSer(),
            fecha: this.nFecha(),
            hora: this.nHora(),
            conPaquete: this.nPaq(),
          });
    if (error) {
      this.errorForm.set(error);
      return;
    }
    const reprogramada = this.modo() === 'reprogramar';
    this.fecha.set(this.nFecha());
    this.cerrar();
    this.toast.ok(reprogramada ? 'Cita reprogramada.' : 'Cita agendada.');
  }

  protected estado(c: Cita, nuevo: Estado): void {
    const error = this.data.cambiarEstado(c.id, nuevo);
    if (error) {
      this.errorForm.set(error);
      return;
    }
    this.errorForm.set(null);
    this.sel.set(null);
    this.toast.ok(nuevo === 'Cancelada' ? 'Cita cancelada.' : `Cita ${nuevo.toLowerCase()}.`);
  }
}
