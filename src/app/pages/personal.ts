import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService, Rol } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { MODULOS, Modulo } from '../core/permisos';
import { ToastService } from '../core/toast.service';
import { Icon } from '../ui/icon';
import { Modal } from '../ui/modal';

const NOMBRE_MODULO: Record<Modulo, string> = {
  inicio: 'Inicio',
  portal: 'Inicio',
  citas: 'Citas',
  pacientes: 'Pacientes',
  paquetes: 'Paquetes',
  reportes: 'Reportes',
  personal: 'Personal y servicios',
  'mis-citas': 'Mis citas',
  'mis-paquetes': 'Mis paquetes',
  guia: 'Guía del cuerpo',
};

/** Módulo exclusivo del administrador (RF-17, RF-18, RF-19). */
@Component({
  selector: 'fn-personal',
  imports: [Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    h2.sec {
      margin: 2.25rem 0 0.8rem;
    }
    .nombre {
      font-weight: 600;
    }
    .modulos {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .modulos span {
      font-size: 0.78rem;
      padding: 0.1rem 0.5rem;
      border-radius: 4px;
      background: var(--gris-claro);
      color: var(--suave);
    }
    .matriz td,
    .matriz th {
      text-align: center;
    }
    .matriz td:first-child,
    .matriz th:first-child {
      text-align: left;
    }
    .si {
      color: var(--verde);
      display: inline-flex;
    }
    .no {
      color: var(--linea-fuerte);
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Personal y servicios</h1>
          <p>Administra quién entra al sistema y qué ofrece el centro. Las cuentas no se eliminan, se desactivan.</p>
        </div>
        <div class="acciones">
          <button type="button" class="btn" (click)="abrirServicio()"><fn-icon name="mas" /> Nuevo servicio</button>
          <button type="button" class="btn btn-primario" (click)="abrirCuenta()"><fn-icon name="mas" /> Nueva cuenta de personal</button>
        </div>
      </header>

      <h2 class="sec" style="margin-top: 0">Cuentas del personal</h2>
      <section class="panel">
        <div class="tabla-envoltura">
          <table class="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Módulos</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (c of auth.personal(); track c.id) {
                <tr>
                  <td>
                    <div class="nombre">{{ c.nombre }}</div>
                    <div class="secundario">{{ c.correo }}</div>
                  </td>
                  <td>{{ c.rol }}</td>
                  <td>
                    <div class="modulos">
                      @for (m of modulosDe(c.rol); track m) {
                        <span>{{ m }}</span>
                      }
                    </div>
                  </td>
                  <td><span [class]="c.activa ? 'chip atendida' : 'chip cancelada'">{{ c.activa ? 'Activa' : 'Desactivada' }}</span></td>
                  <td class="num">
                    <button type="button" class="btn btn-sm" [disabled]="c.id === auth.usuario()?.id" (click)="alternar(c.id)">
                      {{ c.activa ? 'Desactivar' : 'Activar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <h2 class="sec">Qué módulos ve cada rol</h2>
      <section class="panel">
        <div class="tabla-envoltura">
          <table class="tabla matriz">
            <thead>
              <tr>
                <th>Módulo</th>
                @for (r of roles; track r) {
                  <th>{{ r }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (m of todosModulos; track m) {
                <tr>
                  <td>{{ nombreModulo(m) }}</td>
                  @for (r of roles; track r) {
                    <td>
                      @if (tiene(r, m)) {
                        <span class="si" aria-label="Sí"><fn-icon name="check" /></span>
                      } @else {
                        <span class="no" aria-label="No">—</span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <h2 class="sec">Servicios</h2>
      <section class="panel">
        <div class="tabla-envoltura">
          <table class="tabla">
            <thead>
              <tr>
                <th>Servicio</th>
                <th class="num">Duración</th>
                <th class="num">Precio referencial</th>
              </tr>
            </thead>
            <tbody>
              @for (s of data.servicios(); track s.id) {
                <tr>
                  <td class="nombre">{{ s.nombre }}</td>
                  <td class="num">{{ s.minutos }} min</td>
                  <td class="num">\${{ s.precio }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    @if (cuenta()) {
      <fn-modal titulo="Nueva cuenta de personal" (cerrar)="cuenta.set(false)">
        <form class="dialogo-cuerpo" (submit)="guardarCuenta($event)" novalidate>
          <div class="campo">
            <label for="c-nom">Nombres y apellidos</label>
            <input id="c-nom" type="text" [value]="cNombre()" (input)="cNombre.set($any($event.target).value)" />
          </div>
          <div class="rejilla-2">
            <div class="campo">
              <label for="c-ced">Cédula</label>
              <input id="c-ced" type="text" inputmode="numeric" maxlength="10" [value]="cCedula()" (input)="cCedula.set($any($event.target).value)" />
            </div>
            <div class="campo">
              <label for="c-rol">Rol</label>
              <select id="c-rol" (change)="cRol.set($any($event.target).value)">
                @for (r of rolesPersonal; track r) {
                  <option [value]="r" [selected]="r === cRol()">{{ r }}</option>
                }
              </select>
            </div>
          </div>
          @if (cRol() === 'Fisioterapeuta') {
            <div class="campo">
              <label for="c-fis">Fisioterapeuta de la agenda</label>
              <select id="c-fis" (change)="cFisio.set($any($event.target).value)">
                <option value="" [selected]="!cFisio()">Elige un fisioterapeuta</option>
                @for (f of data.fisios(); track f.id) {
                  <option [value]="f.id" [selected]="f.id === cFisio()">{{ f.nombre }}</option>
                }
              </select>
            </div>
          }
          <div class="campo">
            <label for="c-cor">Correo</label>
            <input id="c-cor" type="email" [value]="cCorreo()" (input)="cCorreo.set($any($event.target).value)" />
          </div>
          <div class="campo">
            <label for="c-cla">Contraseña temporal</label>
            <input id="c-cla" type="text" autocomplete="off" [value]="cClave()" (input)="cClave.set($any($event.target).value)" />
            <span class="ayuda">Mínimo 12 caracteres. Debe cambiarla al primer ingreso. Tendrá verificación en dos pasos.</span>
          </div>
          @if (error()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
          }
          <div class="dialogo-pie">
            <button type="button" class="btn" (click)="cuenta.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primario">Crear cuenta</button>
          </div>
        </form>
      </fn-modal>
    }

    @if (servicio()) {
      <fn-modal titulo="Nuevo servicio" (cerrar)="servicio.set(false)">
        <form class="dialogo-cuerpo" (submit)="guardarServicio($event)" novalidate>
          <div class="campo">
            <label for="s-nom">Nombre</label>
            <input id="s-nom" type="text" [value]="sNombre()" (input)="sNombre.set($any($event.target).value)" />
          </div>
          <div class="rejilla-2">
            <div class="campo">
              <label for="s-min">Duración (minutos)</label>
              <input id="s-min" type="number" min="15" max="120" step="5" [value]="sMinutos()" (input)="sMinutos.set($any($event.target).valueAsNumber)" />
            </div>
            <div class="campo">
              <label for="s-pre">Precio referencial (USD)</label>
              <input id="s-pre" type="number" min="0" step="0.01" [value]="sPrecio()" (input)="sPrecio.set($any($event.target).valueAsNumber)" />
            </div>
          </div>
          @if (error()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
          }
          <div class="dialogo-pie">
            <button type="button" class="btn" (click)="servicio.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primario">Crear servicio</button>
          </div>
        </form>
      </fn-modal>
    }
  `,
})
export class Personal {
  protected readonly auth = inject(AuthService);
  protected readonly data = inject(DataService);
  private readonly toast = inject(ToastService);

  protected readonly roles: Rol[] = ['Administrador', 'Recepción', 'Fisioterapeuta', 'Paciente'];
  protected readonly rolesPersonal: Rol[] = ['Recepción', 'Fisioterapeuta', 'Administrador'];
  protected readonly todosModulos: Modulo[] = ['inicio', 'citas', 'pacientes', 'paquetes', 'reportes', 'personal', 'portal', 'mis-citas', 'mis-paquetes', 'guia'];

  protected readonly cuenta = signal(false);
  protected readonly servicio = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cNombre = signal('');
  protected readonly cCedula = signal('');
  protected readonly cCorreo = signal('');
  protected readonly cRol = signal<Rol>('Recepción');
  protected readonly cFisio = signal('');
  protected readonly cClave = signal('');

  protected readonly sNombre = signal('');
  protected readonly sMinutos = signal(45);
  protected readonly sPrecio = signal(0);

  protected nombreModulo(m: Modulo): string {
    return m === 'portal' ? 'Inicio del paciente' : NOMBRE_MODULO[m];
  }
  protected tiene(r: Rol, m: Modulo): boolean {
    return MODULOS[r].includes(m);
  }
  protected modulosDe(r: Rol): string[] {
    return MODULOS[r].map((m) => NOMBRE_MODULO[m]);
  }

  protected alternar(id: string): void {
    const e = this.auth.alternarCuenta(id);
    if (e) this.toast.error(e);
    else {
      this.data.log('Cambió el estado de una cuenta', id);
      this.toast.ok('Cuenta actualizada.');
    }
  }

  protected abrirCuenta(): void {
    this.cNombre.set('');
    this.cCedula.set('');
    this.cCorreo.set('');
    this.cRol.set('Recepción');
    this.cFisio.set('');
    this.cClave.set('');
    this.error.set(null);
    this.cuenta.set(true);
  }

  protected guardarCuenta(ev: Event): void {
    ev.preventDefault();
    const e = this.auth.crearPersonal({
      nombre: this.cNombre(),
      cedula: this.cCedula(),
      correo: this.cCorreo(),
      rol: this.cRol(),
      fisioId: this.cFisio(),
      clave: this.cClave(),
    });
    if (e) {
      this.error.set(e);
      return;
    }
    this.data.log('Creó cuenta de personal', `${this.cNombre()} (${this.cRol()})`);
    this.cuenta.set(false);
    this.toast.ok('Cuenta creada.');
  }

  protected abrirServicio(): void {
    this.sNombre.set('');
    this.sMinutos.set(45);
    this.sPrecio.set(0);
    this.error.set(null);
    this.servicio.set(true);
  }

  protected guardarServicio(ev: Event): void {
    ev.preventDefault();
    const e = this.data.crearServicio({ nombre: this.sNombre(), minutos: this.sMinutos(), precio: this.sPrecio() });
    if (e) {
      this.error.set(e);
      return;
    }
    this.servicio.set(false);
    this.toast.ok('Servicio creado.');
  }
}
