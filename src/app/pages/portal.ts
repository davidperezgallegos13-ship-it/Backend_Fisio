import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Cita, Compra, DataService } from '../core/data.service';
import { ToastService } from '../core/toast.service';
import { addDays, claseEstado, diaCorto, diaLargo, fechaFmt, hoy, horasHasta } from '../core/util';
import { Icon } from '../ui/icon';
import { Modal } from '../ui/modal';

// ---------------------------------------------------------------------------
// Inicio del paciente
// ---------------------------------------------------------------------------
@Component({
  selector: 'fn-portal',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .cuadricula {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
    }
    .proxima {
      background: var(--tinta);
      color: #e9f1ef;
      border-radius: var(--radio);
      padding: 1.75rem;
    }
    .proxima h2 {
      font-family: var(--fuente);
      font-size: 1rem;
      font-weight: 600;
      color: #a9c2be;
    }
    .proxima .cuando {
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: clamp(1.8rem, 3.4vw, 2.6rem);
      line-height: 1.1;
      color: #fff;
      margin: 0.75rem 0 0.4rem;
    }
    .proxima .hora {
      color: var(--ambar);
    }
    .proxima p {
      color: #a9c2be;
    }
    .proxima .btn {
      margin-top: 1.25rem;
    }
    .saldo-num {
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 2.4rem;
      line-height: 1;
    }
    .cuerpo-panel {
      padding: 1.25rem;
    }
    @media (max-width: 900px) {
      .cuadricula {
        grid-template-columns: 1fr;
      }
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Hola, {{ nombre() }}</h1>
          <p>Aquí está lo importante de tu tratamiento.</p>
        </div>
        <div class="acciones">
          <a class="btn btn-primario" routerLink="/mis-citas" [queryParams]="{ nueva: 1 }"><fn-icon name="mas" /> Agendar cita</a>
        </div>
      </header>

      <div class="cuadricula">
        <section class="proxima" aria-labelledby="t-prox">
          <h2 id="t-prox">Tu próxima cita</h2>
          @if (proxima(); as c) {
            <p class="cuando">{{ dia(c.fecha) }}, <span class="hora">{{ c.hora }}</span></p>
            <p>{{ data.servicio(c.servicioId)?.nombre }} con {{ data.fisio(c.fisioId)?.nombre }}</p>
            <a class="btn" routerLink="/mis-citas">Ver o cambiar mis citas</a>
          } @else {
            <p class="cuando">Aún no tienes citas agendadas</p>
            <p>Elige un servicio, un fisioterapeuta y un horario disponible.</p>
            <a class="btn" routerLink="/mis-citas" [queryParams]="{ nueva: 1 }">Agendar mi primera cita</a>
          }
        </section>

        <section class="panel" aria-labelledby="t-saldo">
          <div class="panel-cab">
            <h2 id="t-saldo">Mis sesiones</h2>
            <a class="btn btn-sm" routerLink="/mis-paquetes">Ver paquetes</a>
          </div>
          <div class="cuerpo-panel">
            @if (compra(); as c) {
              <p class="saldo-num">{{ saldo() }} <span class="nota">sesiones disponibles</span></p>
              <div class="progreso" [class.bajo]="saldo() <= 2"><span [style.width.%]="(c.saldo / c.sesiones) * 100"></span></div>
              <p class="nota">{{ c.paqueteNombre }}. Vence el {{ fecha(c.vence) }}.</p>
              @if (saldo() <= 2) {
                <div class="alerta alerta-info" style="margin-top: 1rem"><fn-icon name="alerta" /> <span>Te quedan pocas sesiones. Pide un paquete nuevo en recepción.</span></div>
              }
            } @else {
              <p class="nombre">No tienes un paquete vigente.</p>
              <p class="nota">Puedes pagar por sesión o comprar un paquete en recepción.</p>
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class PortalInicio {
  protected readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  private readonly pacienteId = computed(() => this.auth.usuario()?.pacienteId ?? '');
  protected readonly nombre = computed(() => this.auth.usuario()?.nombre.split(' ')[0] ?? '');
  protected readonly saldo = computed(() => this.data.saldo(this.pacienteId()));
  protected readonly compra = computed(() => this.data.comprasVigentes(this.pacienteId())[0]);
  protected readonly proxima = computed(() =>
    this.data
      .citasVisibles()
      .filter((c) => (c.estado === 'Pendiente' || c.estado === 'Confirmada') && horasHasta(c.fecha, c.hora) > 0)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0],
  );

  protected dia(f: string): string {
    return diaLargo(f);
  }
  protected fecha(f: string): string {
    return fechaFmt(f);
  }
}

// ---------------------------------------------------------------------------
// Mis citas
// ---------------------------------------------------------------------------
@Component({
  selector: 'fn-mis-citas',
  imports: [Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    h2.sec {
      margin: 2rem 0 0.8rem;
    }
    .lista {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .lista li {
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr) auto auto;
      gap: 1rem;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--linea);
    }
    .lista li:last-child {
      border-bottom: 0;
    }
    .cuando {
      font-weight: 700;
      font-family: var(--fuente-titulo);
    }
    .cuando small {
      display: block;
      font-family: var(--fuente);
      font-weight: 500;
      color: var(--suave);
    }
    .acc {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    @media (max-width: 760px) {
      .lista li {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Mis citas</h1>
          <p>Puedes reprogramar o cancelar hasta 12 horas antes. Después, llama a recepción.</p>
        </div>
        <div class="acciones">
          <button type="button" class="btn btn-primario" (click)="abrirNueva()"><fn-icon name="mas" /> Agendar cita</button>
        </div>
      </header>

      <h2 class="sec" style="margin-top: 0">Próximas</h2>
      <section class="panel">
        @if (proximas().length === 0) {
          <div class="vacio"><strong>No tienes citas próximas.</strong> Agenda una para continuar con tu tratamiento.</div>
        } @else {
          <ul class="lista">
            @for (c of proximas(); track c.id) {
              <li>
                <span class="cuando">{{ dia(c.fecha) }}<small>{{ c.hora }}</small></span>
                <span>
                  <span class="nombre">{{ data.servicio(c.servicioId)?.nombre }}</span><br />
                  <span class="nota">con {{ data.fisio(c.fisioId)?.nombre }}</span>
                </span>
                <span [class]="claseEstado(c.estado)">{{ c.estado }}</span>
                <span class="acc">
                  <button type="button" class="btn btn-sm" [disabled]="bloqueada(c)" (click)="abrirReprogramar(c)">Reprogramar</button>
                  <button type="button" class="btn btn-sm btn-peligro" [disabled]="bloqueada(c)" (click)="cancelar(c)">Cancelar</button>
                </span>
              </li>
            }
          </ul>
        }
      </section>

      <h2 class="sec">Anteriores</h2>
      <section class="panel">
        @if (anteriores().length === 0) {
          <div class="vacio">Todavía no tienes citas anteriores.</div>
        } @else {
          <ul class="lista">
            @for (c of anteriores(); track c.id) {
              <li>
                <span class="cuando">{{ dia(c.fecha) }}<small>{{ c.hora }}</small></span>
                <span>
                  <span class="nombre">{{ data.servicio(c.servicioId)?.nombre }}</span><br />
                  <span class="nota">con {{ data.fisio(c.fisioId)?.nombre }}</span>
                </span>
                <span [class]="claseEstado(c.estado)">{{ c.estado }}</span>
                <span></span>
              </li>
            }
          </ul>
        }
      </section>
    </div>

    @if (modo()) {
      <fn-modal [titulo]="modo() === 'nueva' ? 'Agendar cita' : 'Reprogramar cita'" (cerrar)="cerrar()">
        <form class="dialogo-cuerpo" (submit)="guardar($event)" novalidate>
          @if (modo() === 'nueva') {
            <div class="campo">
              <label for="m-ser">Servicio</label>
              <select id="m-ser" (change)="nSer.set($any($event.target).value)">
                <option value="" [selected]="!nSer()">Elige un servicio</option>
                @for (s of data.servicios(); track s.id) {
                  <option [value]="s.id" [selected]="s.id === nSer()">{{ s.nombre }} ({{ s.minutos }} min)</option>
                }
              </select>
            </div>
            <div class="campo">
              <label for="m-fis">Fisioterapeuta</label>
              <select id="m-fis" (change)="nFis.set($any($event.target).value); nHora.set('')">
                <option value="" [selected]="!nFis()">Elige un fisioterapeuta</option>
                @for (f of data.fisios(); track f.id) {
                  <option [value]="f.id" [selected]="f.id === nFis()">{{ f.nombre }}, {{ f.especialidad }}</option>
                }
              </select>
            </div>
          }
          <div class="rejilla-2">
            <div class="campo">
              <label for="m-fecha">Fecha</label>
              <input id="m-fecha" type="date" [min]="hoyISO" [max]="maxISO" [value]="nFecha()" (change)="nFecha.set($any($event.target).value); nHora.set('')" />
            </div>
            <div class="campo">
              <label for="m-hora">Hora</label>
              <select id="m-hora" (change)="nHora.set($any($event.target).value)" [disabled]="libres().length === 0">
                <option value="" [selected]="!nHora()">{{ libres().length ? 'Elige una hora' : 'Sin horas libres' }}</option>
                @for (h of libres(); track h) {
                  <option [value]="h" [selected]="h === nHora()">{{ h }}</option>
                }
              </select>
            </div>
          </div>
          @if (modo() === 'nueva' && saldo() > 0) {
            <label class="casilla">
              <input type="checkbox" [checked]="nPaq()" (change)="nPaq.set($any($event.target).checked)" />
              <span>Descontar de mi paquete. Me quedan {{ saldo() }} sesiones.</span>
            </label>
          }
          @if (error()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
          }
          <div class="dialogo-pie">
            <button type="button" class="btn" (click)="cerrar()">Volver</button>
            <button type="submit" class="btn btn-primario">{{ modo() === 'nueva' ? 'Agendar cita' : 'Guardar nuevo horario' }}</button>
          </div>
        </form>
      </fn-modal>
    }
  `,
})
export class MisCitas {
  protected readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** Se llena desde /mis-citas?nueva=1 para abrir directamente el agendamiento. */
  readonly nueva = input<string>();

  protected readonly hoyISO = hoy();
  protected readonly maxISO = addDays(hoy(), 30);
  protected readonly claseEstado = claseEstado;

  protected readonly modo = signal<'nueva' | 'reprogramar' | null>(null);
  protected readonly editando = signal<Cita | null>(null);
  protected readonly nSer = signal('');
  protected readonly nFis = signal('');
  protected readonly nFecha = signal(hoy());
  protected readonly nHora = signal('');
  protected readonly nPaq = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly pacienteId = computed(() => this.auth.usuario()?.pacienteId ?? '');
  protected readonly saldo = computed(() => this.data.saldo(this.pacienteId()));

  protected readonly proximas = computed(() =>
    this.data
      .citasVisibles()
      .filter((c) => (c.estado === 'Pendiente' || c.estado === 'Confirmada') && horasHasta(c.fecha, c.hora) > -1)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)),
  );
  protected readonly anteriores = computed(() => {
    const prox = new Set(this.proximas().map((c) => c.id));
    return this.data
      .citasVisibles()
      .filter((c) => !prox.has(c.id))
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
      .slice(0, 12);
  });
  protected readonly libres = computed(() => this.data.horasLibres(this.nFecha(), this.nFis(), this.editando()?.id));

  constructor() {
    effect(() => {
      if (this.nueva()) untracked(() => this.abrirNueva());
    });
  }

  protected dia(f: string): string {
    return f === hoy() ? 'Hoy' : diaCorto(f);
  }
  protected bloqueada(c: Cita): boolean {
    return horasHasta(c.fecha, c.hora) < 12;
  }

  protected abrirNueva(): void {
    this.error.set(null);
    this.editando.set(null);
    this.nSer.set('');
    this.nFis.set('');
    this.nFecha.set(hoy());
    this.nHora.set('');
    this.nPaq.set(false);
    this.modo.set('nueva');
  }

  protected abrirReprogramar(c: Cita): void {
    this.error.set(null);
    this.editando.set(c);
    this.nFis.set(c.fisioId);
    this.nFecha.set(c.fecha < hoy() ? hoy() : c.fecha);
    this.nHora.set('');
    this.modo.set('reprogramar');
  }

  protected cerrar(): void {
    this.modo.set(null);
    this.editando.set(null);
    this.error.set(null);
  }

  protected guardar(ev: Event): void {
    ev.preventDefault();
    const edit = this.editando();
    const e =
      this.modo() === 'reprogramar' && edit
        ? this.data.reprogramar(edit.id, this.nFecha(), this.nHora())
        : this.data.agendar({
            pacienteId: this.pacienteId(),
            fisioId: this.nFis(),
            servicioId: this.nSer(),
            fecha: this.nFecha(),
            hora: this.nHora(),
            conPaquete: this.nPaq(),
          });
    if (e) {
      this.error.set(e);
      return;
    }
    const reprogramada = this.modo() === 'reprogramar';
    this.cerrar();
    this.toast.ok(reprogramada ? 'Cita reprogramada.' : 'Cita agendada. Recibirás un recordatorio 24 horas antes.');
  }

  protected cancelar(c: Cita): void {
    const e = this.data.cambiarEstado(c.id, 'Cancelada');
    if (e) this.toast.error(e);
    else this.toast.ok('Cita cancelada.');
  }
}

// ---------------------------------------------------------------------------
// Mis paquetes
// ---------------------------------------------------------------------------
@Component({
  selector: 'fn-mis-paquetes',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .tarjetas {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .tarjeta {
      padding: 1.25rem;
    }
    .num {
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 2.2rem;
      line-height: 1;
    }
    .fila {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.5rem;
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Mis paquetes</h1>
          <p>Las sesiones sobrantes vencen al terminar la vigencia. No hay reembolsos ni transferencias.</p>
        </div>
      </header>

      @if (vigentes().length === 0) {
        <section class="panel" style="margin-bottom: 2rem">
          <div class="vacio"><strong>No tienes paquetes vigentes.</strong> Pide uno en recepción cuando lo necesites.</div>
        </section>
      } @else {
        <div class="tarjetas">
          @for (c of vigentes(); track c.id) {
            <section class="panel tarjeta">
              <div class="fila">
                <span class="nombre">{{ c.paqueteNombre }}</span>
                <span class="nota">Vence el {{ fecha(c.vence) }}</span>
              </div>
              <p class="num">{{ c.saldo }} <span class="nota">de {{ c.sesiones }} sesiones</span></p>
              <div class="progreso" [class.bajo]="c.saldo <= 2"><span [style.width.%]="(c.saldo / c.sesiones) * 100"></span></div>
              @if (c.saldo <= 2) {
                <p class="nota"><fn-icon name="alerta" [size]="14" /> Te quedan pocas sesiones.</p>
              } @else if (c.vence <= pronto()) {
                <p class="nota"><fn-icon name="reloj" [size]="14" /> Vence en menos de 7 días.</p>
              }
            </section>
          }
        </div>
      }

      <h2 style="margin-bottom: 0.8rem">Historial</h2>
      <section class="panel">
        @if (todas().length === 0) {
          <div class="vacio">Todavía no has comprado paquetes.</div>
        } @else {
          <div class="tabla-envoltura">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Paquete</th>
                  <th>Comprado</th>
                  <th class="num">Sesiones</th>
                  <th class="num">Restantes</th>
                  <th>Vence</th>
                </tr>
              </thead>
              <tbody>
                @for (c of todas(); track c.id) {
                  <tr>
                    <td class="nombre">{{ c.paqueteNombre }}</td>
                    <td>{{ fecha(c.fecha) }}</td>
                    <td class="num">{{ c.sesiones }}</td>
                    <td class="num">{{ c.saldo }}</td>
                    <td>{{ fecha(c.vence) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
})
export class MisPaquetes {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  private readonly pacienteId = computed(() => this.auth.usuario()?.pacienteId ?? '');
  protected readonly vigentes = computed<Compra[]>(() => this.data.comprasVigentes(this.pacienteId()));
  protected readonly todas = computed<Compra[]>(() =>
    this.data
      .compras()
      .filter((c) => c.pacienteId === this.pacienteId())
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  );
  protected readonly pronto = computed(() => addDays(hoy(), 7));

  protected fecha(f: string): string {
    return fechaFmt(f);
  }
}
