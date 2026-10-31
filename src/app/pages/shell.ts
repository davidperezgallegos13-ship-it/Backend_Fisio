import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { MODULOS, Modulo } from '../core/permisos';
import { DataService } from '../core/data.service';
import { ToastService } from '../core/toast.service';
import { iniciales } from '../core/util';
import { Icon } from '../ui/icon';

interface Enlace {
  modulo: Modulo;
  ruta: string;
  texto: string;
  icono: string;
}

const TODOS: Enlace[] = [
  { modulo: 'inicio', ruta: '/inicio', texto: 'Inicio', icono: 'inicio' },
  { modulo: 'portal', ruta: '/portal', texto: 'Inicio', icono: 'inicio' },
  { modulo: 'citas', ruta: '/citas', texto: 'Citas', icono: 'calendario' },
  { modulo: 'mis-citas', ruta: '/mis-citas', texto: 'Mis citas', icono: 'calendario' },
  { modulo: 'pacientes', ruta: '/pacientes', texto: 'Pacientes', icono: 'pacientes' },
  { modulo: 'paquetes', ruta: '/paquetes', texto: 'Paquetes', icono: 'paquete' },
  { modulo: 'mis-paquetes', ruta: '/mis-paquetes', texto: 'Mis paquetes', icono: 'paquete' },
  { modulo: 'reportes', ruta: '/reportes', texto: 'Reportes', icono: 'reportes' },
  { modulo: 'personal', ruta: '/personal', texto: 'Personal y servicios', icono: 'escudo' },
  { modulo: 'guia', ruta: '/guia', texto: 'Guía del cuerpo', icono: 'cuerpo' },
];

@Component({
  selector: 'fn-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      min-height: 100dvh;
    }
    nav.lateral {
      position: sticky;
      top: 0;
      height: 100dvh;
      background: var(--tinta);
      color: #cfe0dd;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 0.9rem 1rem;
      gap: 1.5rem;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0 0.6rem;
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 1.3rem;
      color: #fff;
    }
    .logo svg {
      width: 32px;
      color: #cfe0dd;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    a.enlace {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radio-sm);
      color: inherit;
      text-decoration: none;
      font-weight: 500;
    }
    a.enlace:hover {
      background: var(--tinta-2);
      color: #fff;
    }
    a.enlace.activo {
      background: var(--tinta-3);
      color: #fff;
    }
    a.enlace.activo::before {
      content: '';
      position: absolute;
      left: -0.9rem;
      top: 8px;
      bottom: 8px;
      width: 4px;
      border-radius: 0 4px 4px 0;
      background: var(--ambar);
    }
    .pie {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.8rem 0.6rem 0;
      border-top: 1px solid var(--tinta-3);
    }
    .avatar {
      flex: none;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--abeto);
      color: #fff;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .quien {
      min-width: 0;
      flex: 1;
      line-height: 1.25;
    }
    .quien strong {
      display: block;
      color: #fff;
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .quien span {
      font-size: 0.8rem;
      color: #8fb3ae;
    }
    .salir {
      color: #8fb3ae;
    }
    .salir:hover {
      background: var(--tinta-2);
      color: #fff;
    }
    main {
      min-width: 0;
    }
    .barra-movil {
      display: none;
    }
    @media (max-width: 900px) {
      :host {
        display: block;
      }
      .barra-movil {
        position: sticky;
        top: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem 0.8rem;
        background: var(--tinta);
        color: #fff;
        font-family: var(--fuente-titulo);
        font-weight: 700;
      }
      .barra-movil .btn-icono {
        color: #fff;
      }
      nav.lateral {
        position: fixed;
        z-index: 35;
        inset: 0 auto 0 0;
        width: 270px;
        transform: translateX(-100%);
        transition: transform 0.2s ease-out;
      }
      nav.lateral.abierto {
        transform: none;
      }
      .velo-movil {
        position: fixed;
        inset: 0;
        z-index: 34;
        background: rgba(15, 42, 46, 0.55);
      }
    }
  `,
  template: `
    <div class="barra-movil no-imprimir">
      <span>FisioNova</span>
      <button type="button" class="btn-icono" (click)="abierto.set(!abierto())" aria-label="Abrir menú">
        <fn-icon name="menu" />
      </button>
    </div>
    @if (abierto()) {
      <div class="velo-movil" (click)="abierto.set(false)"></div>
    }

    <nav class="lateral no-imprimir" [class.abierto]="abierto()" aria-label="Principal">
      <span class="logo">
        <svg viewBox="0 0 40 24" fill="none" aria-hidden="true">
          <path d="M3 22A17 17 0 0 1 37 22" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.4" />
          <path d="M3 22A17 17 0 0 1 28 7" stroke="var(--ambar)" stroke-width="3" stroke-linecap="round" />
        </svg>
        FisioNova
      </span>
      <ul>
        @for (e of enlaces(); track e.ruta) {
          <li>
            <a class="enlace" [routerLink]="e.ruta" routerLinkActive="activo" (click)="abierto.set(false)">
              <fn-icon [name]="e.icono" />
              {{ e.texto }}
            </a>
          </li>
        }
      </ul>
      <div class="pie">
        <span class="avatar" aria-hidden="true">{{ siglas() }}</span>
        <span class="quien">
          <strong>{{ auth.usuario()?.nombre }}</strong>
          <span>{{ auth.usuario()?.rol }}</span>
        </span>
        <button type="button" class="btn-icono salir" (click)="salir()" aria-label="Cerrar sesión" title="Cerrar sesión">
          <fn-icon name="salir" />
        </button>
      </div>
    </nav>

    <main>
      <router-outlet />
    </main>

    @if (toast.aviso(); as a) {
      <div class="aviso no-imprimir" [class.error]="a.tipo === 'error'" role="status" aria-live="polite">
        <fn-icon [name]="a.tipo === 'ok' ? 'check' : 'alerta'" />
        {{ a.texto }}
      </div>
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly toast = inject(ToastService);
  private readonly data = inject(DataService);
  private readonly router = inject(Router);

  protected readonly abierto = signal(false);
  protected readonly siglas = computed(() => iniciales(this.auth.usuario()?.nombre ?? ''));

  /** Solo los módulos habilitados para el rol del usuario (RF-05). */
  protected readonly enlaces = computed<Enlace[]>(() => {
    const rol = this.auth.usuario()?.rol;
    const permitidos = rol ? MODULOS[rol] : [];
    return TODOS.filter((e) => permitidos.includes(e.modulo));
  });

  protected salir(): void {
    this.data.log('Cierre de sesión', 'Sesión cerrada por el usuario');
    this.auth.salir();
    void this.router.navigateByUrl('/ingresar');
  }
}
