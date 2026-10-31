import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { Compra, DataService, Metodo } from '../core/data.service';
import { ToastService } from '../core/toast.service';
import { addDays, fechaFmt, hoy } from '../core/util';
import { Icon } from '../ui/icon';
import { Modal } from '../ui/modal';

type Vigencia = 'Vigente' | 'Por vencer' | 'Agotado' | 'Vencido';

@Component({
  selector: 'fn-paquetes',
  imports: [Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .pestanas {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--linea-fuerte);
      margin-bottom: 1.25rem;
    }
    .pestana {
      border: 0;
      background: none;
      padding: 0.7rem 1rem;
      font-weight: 600;
      color: var(--suave);
      cursor: pointer;
      border-bottom: 3px solid transparent;
      margin-bottom: -1px;
    }
    .pestana.activa {
      color: var(--texto);
      border-bottom-color: var(--ambar);
    }
    .filtros {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .filtro {
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
    .restan {
      min-width: 150px;
    }
    .progreso {
      height: 6px;
      border-radius: 3px;
      background: var(--gris-claro);
      overflow: hidden;
      margin-top: 0.35rem;
    }
    .progreso span {
      display: block;
      height: 100%;
      background: var(--abeto);
    }
    .progreso.bajo span {
      background: var(--ambar);
    }
    .nombre {
      font-weight: 600;
    }
    .sin-tarjeta {
      font-size: 0.85rem;
      color: var(--suave);
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>Paquetes de sesiones</h1>
          <p>Controla las sesiones prepagadas de cada paciente. El saldo nunca baja de cero.</p>
        </div>
        <div class="acciones">
          @if (esAdmin()) {
            <button type="button" class="btn" (click)="abrirPaquete()"><fn-icon name="mas" /> Nuevo paquete</button>
          }
          <button type="button" class="btn btn-primario" (click)="abrirVenta()"><fn-icon name="mas" /> Registrar venta</button>
        </div>
      </header>

      <div class="pestanas" role="tablist">
        <button type="button" role="tab" class="pestana" [class.activa]="pestana() === 'saldos'" [attr.aria-selected]="pestana() === 'saldos'" (click)="pestana.set('saldos')">Saldos de pacientes</button>
        <button type="button" role="tab" class="pestana" [class.activa]="pestana() === 'catalogo'" [attr.aria-selected]="pestana() === 'catalogo'" (click)="pestana.set('catalogo')">Catálogo</button>
      </div>

      @if (pestana() === 'saldos') {
        <div class="filtros" role="group" aria-label="Filtrar por vigencia">
          @for (f of opciones; track f) {
            <button type="button" class="filtro" [class.activo]="filtro() === f" (click)="filtro.set(f)">{{ f }}</button>
          }
        </div>
        <section class="panel">
          @if (lista().length === 0) {
            <div class="vacio"><strong>No hay paquetes en esta vista.</strong> Cambia el filtro o registra una venta.</div>
          } @else {
            <div class="tabla-envoltura">
              <table class="tabla">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Paquete</th>
                    <th>Sesiones restantes</th>
                    <th>Vence</th>
                    <th>Pago registrado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of lista(); track c.id) {
                    <tr>
                      <td class="nombre">{{ data.paciente(c.pacienteId)?.nombre }}</td>
                      <td>{{ c.paqueteNombre }}</td>
                      <td class="restan">
                        {{ c.saldo }} de {{ c.sesiones }}
                        <div class="progreso" [class.bajo]="c.saldo <= 2"><span [style.width.%]="(c.saldo / c.sesiones) * 100"></span></div>
                      </td>
                      <td>{{ fecha(c.vence) }}</td>
                      <td>
                        \${{ c.monto }}
                        <div class="secundario">{{ c.metodo }}, {{ fecha(c.fecha) }}</div>
                      </td>
                      <td><span [class]="clase(estadoDe(c))">{{ estadoDe(c) }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else {
        <section class="panel">
          <div class="tabla-envoltura">
            <table class="tabla">
              <thead>
                <tr>
                  <th>Paquete</th>
                  <th class="num">Sesiones</th>
                  <th class="num">Precio</th>
                  <th class="num">Vigencia</th>
                  <th>Estado</th>
                  @if (esAdmin()) {
                    <th></th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (p of data.paquetes(); track p.id) {
                  <tr>
                    <td class="nombre">{{ p.nombre }}</td>
                    <td class="num">{{ p.sesiones }}</td>
                    <td class="num">\${{ p.precio }}</td>
                    <td class="num">{{ p.vigenciaDias }} días</td>
                    <td><span [class]="p.activo ? 'chip atendida' : 'chip cancelada'">{{ p.activo ? 'A la venta' : 'Desactivado' }}</span></td>
                    @if (esAdmin()) {
                      <td class="num"><button type="button" class="btn btn-sm" (click)="data.alternarPaquete(p.id)">{{ p.activo ? 'Desactivar' : 'Activar' }}</button></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
        @if (!esAdmin()) {
          <p class="secundario" style="margin-top: 0.75rem">Solo administración puede crear o desactivar paquetes.</p>
        }
      }
    </div>

    @if (venta()) {
      <fn-modal titulo="Registrar venta de paquete" (cerrar)="venta.set(false)">
        <form class="dialogo-cuerpo" (submit)="guardarVenta($event)" novalidate>
          <div class="campo">
            <label for="v-pac">Paciente</label>
            <select id="v-pac" (change)="vPac.set($any($event.target).value)">
              <option value="" [selected]="!vPac()">Elige un paciente</option>
              @for (p of data.pacientes(); track p.id) {
                <option [value]="p.id" [selected]="p.id === vPac()">{{ p.nombre }}</option>
              }
            </select>
          </div>
          <div class="campo">
            <label for="v-paq">Paquete</label>
            <select id="v-paq" (change)="elegirPaquete($any($event.target).value)">
              <option value="" [selected]="!vPaq()">Elige un paquete</option>
              @for (p of activos(); track p.id) {
                <option [value]="p.id" [selected]="p.id === vPaq()">{{ p.nombre }} · \${{ p.precio }}</option>
              }
            </select>
          </div>
          <div class="rejilla-2">
            <div class="campo">
              <label for="v-monto">Monto cobrado (USD)</label>
              <input id="v-monto" type="number" min="0" step="0.01" [value]="vMonto()" (input)="vMonto.set($any($event.target).valueAsNumber)" />
            </div>
            <div class="campo">
              <label for="v-met">Método de pago</label>
              <select id="v-met" (change)="vMetodo.set($any($event.target).value)">
                @for (m of metodos; track m) {
                  <option [value]="m" [selected]="m === vMetodo()">{{ m }}</option>
                }
              </select>
            </div>
          </div>
          <p class="sin-tarjeta">El cobro se registra a mano. No se guardan datos de tarjeta.</p>
          @if (error()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
          }
          <div class="dialogo-pie">
            <button type="button" class="btn" (click)="venta.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primario">Registrar venta</button>
          </div>
        </form>
      </fn-modal>
    }

    @if (nuevoPaquete()) {
      <fn-modal titulo="Nuevo paquete" (cerrar)="nuevoPaquete.set(false)">
        <form class="dialogo-cuerpo" (submit)="guardarPaquete($event)" novalidate>
          <div class="campo">
            <label for="n-nom">Nombre</label>
            <input id="n-nom" type="text" [value]="nNombre()" (input)="nNombre.set($any($event.target).value)" />
          </div>
          <div class="rejilla-2">
            <div class="campo">
              <label for="n-ses">Sesiones incluidas</label>
              <input id="n-ses" type="number" min="1" [value]="nSesiones()" (input)="nSesiones.set($any($event.target).valueAsNumber)" />
            </div>
            <div class="campo">
              <label for="n-pre">Precio (USD)</label>
              <input id="n-pre" type="number" min="0" step="0.01" [value]="nPrecio()" (input)="nPrecio.set($any($event.target).valueAsNumber)" />
            </div>
          </div>
          <div class="campo">
            <label for="n-vig">Vigencia (días)</label>
            <input id="n-vig" type="number" min="1" [value]="nVigencia()" (input)="nVigencia.set($any($event.target).valueAsNumber)" />
            <span class="ayuda">Pasado este tiempo las sesiones sobrantes vencen. No hay reembolsos.</span>
          </div>
          @if (error()) {
            <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
          }
          <div class="dialogo-pie">
            <button type="button" class="btn" (click)="nuevoPaquete.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primario">Crear paquete</button>
          </div>
        </form>
      </fn-modal>
    }
  `,
})
export class Paquetes {
  protected readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly opciones: (Vigencia | 'Todos')[] = ['Todos', 'Vigente', 'Por vencer', 'Agotado', 'Vencido'];
  protected readonly metodos: Metodo[] = ['Efectivo', 'Transferencia', 'Depósito'];

  protected readonly pestana = signal<'saldos' | 'catalogo'>('saldos');
  protected readonly filtro = signal<Vigencia | 'Todos'>('Todos');
  protected readonly venta = signal(false);
  protected readonly nuevoPaquete = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly vPac = signal('');
  protected readonly vPaq = signal('');
  protected readonly vMonto = signal(0);
  protected readonly vMetodo = signal<Metodo>('Efectivo');

  protected readonly nNombre = signal('');
  protected readonly nSesiones = signal(5);
  protected readonly nPrecio = signal(0);
  protected readonly nVigencia = signal(60);

  protected readonly esAdmin = computed(() => this.auth.usuario()?.rol === 'Administrador');
  protected readonly activos = computed(() => this.data.paquetes().filter((p) => p.activo));

  protected readonly lista = computed(() => {
    const f = this.filtro();
    return this.data
      .compras()
      .filter((c) => f === 'Todos' || this.estadoDe(c) === f)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  protected estadoDe(c: Compra): Vigencia {
    if (c.saldo === 0) return 'Agotado';
    if (c.vence < hoy()) return 'Vencido';
    if (c.vence <= addDays(hoy(), 7)) return 'Por vencer';
    return 'Vigente';
  }

  protected clase(e: Vigencia): string {
    const mapa: Record<Vigencia, string> = {
      Vigente: 'chip atendida',
      'Por vencer': 'chip pendiente',
      Agotado: 'chip cancelada',
      Vencido: 'chip no-asistio',
    };
    return mapa[e];
  }

  protected fecha(f: string): string {
    return fechaFmt(f);
  }

  protected abrirVenta(): void {
    this.vPac.set('');
    this.vPaq.set('');
    this.vMonto.set(0);
    this.vMetodo.set('Efectivo');
    this.error.set(null);
    this.venta.set(true);
  }

  protected elegirPaquete(id: string): void {
    this.vPaq.set(id);
    const p = this.data.paquetes().find((x) => x.id === id);
    if (p) this.vMonto.set(p.precio);
  }

  protected guardarVenta(ev: Event): void {
    ev.preventDefault();
    const e = this.data.registrarVenta({
      pacienteId: this.vPac(),
      paqueteId: this.vPaq(),
      monto: this.vMonto(),
      metodo: this.vMetodo(),
    });
    if (e) {
      this.error.set(e);
      return;
    }
    this.venta.set(false);
    this.pestana.set('saldos');
    this.toast.ok('Venta registrada. El saldo ya está disponible.');
  }

  protected abrirPaquete(): void {
    this.nNombre.set('');
    this.nSesiones.set(5);
    this.nPrecio.set(0);
    this.nVigencia.set(60);
    this.error.set(null);
    this.nuevoPaquete.set(true);
  }

  protected guardarPaquete(ev: Event): void {
    ev.preventDefault();
    const e = this.data.crearPaquete({
      nombre: this.nNombre(),
      sesiones: this.nSesiones(),
      precio: this.nPrecio(),
      vigenciaDias: this.nVigencia(),
    });
    if (e) {
      this.error.set(e);
      return;
    }
    this.nuevoPaquete.set(false);
    this.pestana.set('catalogo');
    this.toast.ok('Paquete creado y a la venta.');
  }
}
