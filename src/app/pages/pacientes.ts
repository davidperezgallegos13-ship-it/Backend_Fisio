import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService, Paciente } from '../core/data.service';
import { gestionaCitas, puede } from '../core/permisos';
import { ToastService } from '../core/toast.service';
import { claseEstado, diaCorto, fechaFmt, hoy, horasHasta, validarCedula } from '../core/util';
import { Icon } from '../ui/icon';
import { Modal } from '../ui/modal';

@Component({
  selector: 'fn-pacientes',
  imports: [RouterLink, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .buscador {
      position: relative;
      flex: 1;
      min-width: 240px;
      max-width: 420px;
    }
    .buscador fn-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--suave);
    }
    .buscador input {
      width: 100%;
      min-height: 42px;
      padding: 0 0.75rem 0 2.4rem;
      border: 1px solid var(--linea-fuerte);
      border-radius: var(--radio-sm);
      background: var(--superficie);
    }
    .barra {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .nombre {
      font-weight: 600;
    }
    .saldo {
      display: inline-flex;
      align-items: baseline;
      gap: 0.3rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .saldo.bajo {
      color: var(--ambar-oscuro);
    }
    .saldo small {
      font-weight: 500;
      color: var(--suave);
    }
    .lateral-cuerpo {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .bloque h3 {
      font-size: 0.95rem;
      margin-bottom: 0.6rem;
    }
    .linea {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: var(--suave);
      margin-bottom: 0.3rem;
    }
    .progreso {
      height: 6px;
      border-radius: 3px;
      background: var(--gris-claro);
      overflow: hidden;
      margin-top: 0.4rem;
    }
    .progreso span {
      display: block;
      height: 100%;
      background: var(--abeto);
    }
    .paq {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--linea);
    }
    .paq:last-child {
      border-bottom: 0;
    }
    .paq .fila {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    ul.citas {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    ul.citas li {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.55rem 0;
      border-bottom: 1px solid var(--linea);
      font-size: 0.9rem;
    }
    ul.citas li:last-child {
      border-bottom: 0;
    }
    .nota {
      font-size: 0.82rem;
      color: var(--suave);
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Pacientes</h1>
          <p>{{ data.pacientesVisibles().length }} {{ esFisio() ? 'pacientes que atiendes' : 'pacientes registrados' }}. Aquí no se muestran notas clínicas.</p>
        </div>
        <div class="acciones">
          @if (puedeAgendar()) {
            <button type="button" class="btn btn-primario" (click)="abrirNuevo()"><fn-icon name="mas" /> Registrar paciente</button>
          }
        </div>
      </header>

      <div class="barra">
        <div class="buscador">
          <fn-icon name="buscar" />
          <label class="solo-lectores" for="buscar">Buscar paciente</label>
          <input id="buscar" type="search" placeholder="Buscar por nombre, cédula o correo" [value]="q()" (input)="q.set($any($event.target).value)" />
        </div>
        <span class="secundario">{{ filtrados().length }} resultados</span>
      </div>

      <section class="panel">
        @if (filtrados().length === 0) {
          <div class="vacio"><strong>No encontramos pacientes con ese dato.</strong> Revisa la búsqueda o registra un paciente nuevo.</div>
        } @else {
          <div class="tabla-envoltura">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Contacto</th>
                  @if (verPaquetes()) {
                    <th>Sesiones disponibles</th>
                  }
                  <th>Próxima cita</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filtrados(); track p.id) {
                  <tr class="clic" tabindex="0" (click)="sel.set(p)" (keydown.enter)="sel.set(p)">
                    <td>
                      <div class="nombre">{{ p.nombre }}</div>
                      <div class="secundario">{{ p.cedula }}</div>
                    </td>
                    <td>
                      <div>{{ p.correo }}</div>
                      <div class="secundario">{{ p.telefono }}</div>
                    </td>
                    @if (verPaquetes()) {
                      <td>
                        @let s = data.saldo(p.id);
                        @if (s > 0) {
                          <span class="saldo" [class.bajo]="s <= 2">{{ s }} <small>{{ s <= 2 ? 'por agotarse' : 'sesiones' }}</small></span>
                        } @else {
                          <span class="secundario">Sin paquete vigente</span>
                        }
                      </td>
                    }
                    <td>
                      @let c = proxima(p.id);
                      @if (c) {
                        {{ dia(c.fecha) }}, {{ c.hora }}
                      } @else {
                        <span class="secundario">Sin citas próximas</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>

    @if (sel(); as p) {
      <fn-modal [titulo]="p.nombre" [lateral]="true" (cerrar)="sel.set(null)">
        <div class="lateral-cuerpo">
          <div class="bloque">
            <div class="linea"><fn-icon name="escudo" /> Cédula {{ p.cedula }}</div>
            <div class="linea"><fn-icon name="correo" /> {{ p.correo }}</div>
            <div class="linea"><fn-icon name="telefono" /> {{ p.telefono }}</div>
            <p class="nota">Consentimiento de datos {{ p.consentimiento.version }}, firmado el {{ fecha(p.consentimiento.fecha) }}.</p>
          </div>

          @if (verPaquetes()) {
          <div class="bloque">
            <h3>Paquetes vigentes</h3>
            @for (c of data.comprasVigentes(p.id); track c.id) {
              <div class="paq">
                <div class="fila">
                  <strong>{{ c.paqueteNombre }}</strong>
                  <span>{{ c.saldo }} de {{ c.sesiones }}</span>
                </div>
                <div class="progreso"><span [style.width.%]="(c.saldo / c.sesiones) * 100"></span></div>
                <span class="nota">Vence el {{ fecha(c.vence) }}</span>
              </div>
            } @empty {
              <p class="secundario">Este paciente no tiene sesiones vigentes. Puedes registrar una venta en Paquetes.</p>
            }
          </div>
          }

          <div class="bloque">
            <h3>Próximas citas</h3>
            <ul class="citas">
              @for (c of proximas(p.id); track c.id) {
                <li>
                  <span>{{ dia(c.fecha) }}, {{ c.hora }}<br /><span class="secundario">{{ data.servicio(c.servicioId)?.nombre }}</span></span>
                  <span [class]="claseEstado(c.estado)">{{ c.estado }}</span>
                </li>
              } @empty {
                <li class="secundario">No tiene citas próximas.</li>
              }
            </ul>
          </div>

          @if (puedeAgendar()) {
            <a class="btn btn-primario" routerLink="/citas" [queryParams]="{ paciente: p.id }"><fn-icon name="calendario" /> Agendar cita</a>
          }
        </div>
      </fn-modal>
    }

    @if (nuevo()) {
      <fn-modal titulo="Registrar paciente" (cerrar)="nuevo.set(false)">
        <form class="dialogo-cuerpo" (submit)="guardar($event)" novalidate>
          <div class="campo">
            <label for="p-nombre">Nombres y apellidos</label>
            <input id="p-nombre" type="text" autocomplete="off" [value]="fNombre()" (input)="fNombre.set($any($event.target).value)" />
          </div>
          <div class="rejilla-2">
            <div class="campo">
              <label for="p-ced">Cédula</label>
              <input id="p-ced" type="text" inputmode="numeric" maxlength="10" autocomplete="off" [value]="fCedula()" (input)="fCedula.set($any($event.target).value)" />
              @if (fCedula().length === 10) {
                @if (cedulaOk()) {
                  <span class="ok">Cédula válida</span>
                } @else {
                  <span class="error">La cédula no es válida. Revisa los dígitos.</span>
                }
              } @else {
                <span class="ayuda">10 dígitos, sin guiones.</span>
              }
            </div>
            <div class="campo">
              <label for="p-tel">Teléfono</label>
              <input id="p-tel" type="tel" inputmode="numeric" maxlength="10" [value]="fTelefono()" (input)="fTelefono.set($any($event.target).value)" />
            </div>
          </div>
          <div class="campo">
            <label for="p-correo">Correo electrónico</label>
            <input id="p-correo" type="email" autocomplete="off" [value]="fCorreo()" (input)="fCorreo.set($any($event.target).value)" />
          </div>
          <label class="casilla">
            <input type="checkbox" [checked]="fConsent()" (change)="fConsent.set($any($event.target).checked)" />
            <span>El paciente autoriza el tratamiento de sus datos personales según la LOPDP. Se guarda la versión y la fecha del consentimiento.</span>
          </label>
          @if (error()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
          }
          <div class="dialogo-pie">
            <button type="button" class="btn" (click)="nuevo.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primario">Registrar paciente</button>
          </div>
        </form>
      </fn-modal>
    }
  `,
})
export class Pacientes {
  protected readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  protected readonly puedeAgendar = computed(() => gestionaCitas(this.auth.usuario()?.rol));
  protected readonly verPaquetes = computed(() => puede(this.auth.usuario()?.rol, 'paquetes'));
  protected readonly esFisio = computed(() => this.auth.usuario()?.rol === 'Fisioterapeuta');

  protected readonly claseEstado = claseEstado;
  protected readonly q = signal('');
  protected readonly sel = signal<Paciente | null>(null);
  protected readonly nuevo = signal(false);

  protected readonly fNombre = signal('');
  protected readonly fCedula = signal('');
  protected readonly fCorreo = signal('');
  protected readonly fTelefono = signal('');
  protected readonly fConsent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cedulaOk = computed(() => validarCedula(this.fCedula()));

  protected readonly filtrados = computed(() => {
    const t = this.q().trim().toLowerCase();
    const lista = this.data.pacientesVisibles();
    if (!t) return lista;
    return lista.filter(
      (p) => p.nombre.toLowerCase().includes(t) || p.cedula.includes(t) || p.correo.toLowerCase().includes(t),
    );
  });

  protected proximas(id: string) {
    return this.data
      .citasVisibles()
      .filter((c) => c.pacienteId === id && (c.estado === 'Pendiente' || c.estado === 'Confirmada') && horasHasta(c.fecha, c.hora) > 0)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
      .slice(0, 4);
  }

  protected proxima(id: string) {
    return this.proximas(id)[0];
  }

  protected dia(f: string): string {
    return f === hoy() ? 'Hoy' : diaCorto(f);
  }

  protected fecha(f: string): string {
    return fechaFmt(f);
  }

  protected abrirNuevo(): void {
    this.fNombre.set('');
    this.fCedula.set('');
    this.fCorreo.set('');
    this.fTelefono.set('');
    this.fConsent.set(false);
    this.error.set(null);
    this.nuevo.set(true);
  }

  protected guardar(ev: Event): void {
    ev.preventDefault();
    const e = this.data.registrarPaciente({
      nombre: this.fNombre(),
      cedula: this.fCedula(),
      correo: this.fCorreo(),
      telefono: this.fTelefono(),
      consentimiento: this.fConsent(),
    });
    if (e) {
      this.error.set(e);
      return;
    }
    this.nuevo.set(false);
    this.toast.ok('Paciente registrado.');
  }
}
