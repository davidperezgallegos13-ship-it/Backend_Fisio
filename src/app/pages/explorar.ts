import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { GLOSARIO, PREGUNTAS, REGIONES, RegionId } from '../core/cuerpo-info';
import { Icon } from '../ui/icon';
import { Cuerpo3D } from '../ui/cuerpo-3d';

/**
 * Guía educativa del cuerpo humano. Es pública (/explorar) y también un módulo del sistema (/guia).
 * El contenido es orientativo: no diagnostica ni indica tratamientos (RES-14).
 */
@Component({
  selector: 'fn-explorar',
  imports: [RouterLink, Icon, Cuerpo3D],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    .barra-publica {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem clamp(1rem, 3vw, 2.5rem);
      background: var(--tinta);
      color: #fff;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 1.25rem;
      color: #fff;
      text-decoration: none;
    }
    .logo svg {
      width: 30px;
      color: #cfe0dd;
    }
    .barra-publica nav {
      display: flex;
      gap: 0.6rem;
      align-items: center;
    }
    .barra-publica a.enlace {
      color: #cfe0dd;
      text-decoration: none;
      font-weight: 500;
      padding: 0.4rem 0.6rem;
    }
    .barra-publica a.enlace:hover {
      color: #fff;
    }
    .contenido {
      max-width: 1320px;
      margin: 0 auto;
      padding: 2rem clamp(1rem, 3vw, 2.5rem) 3rem;
    }
    .intro {
      max-width: 62ch;
      margin-bottom: 1.5rem;
    }
    .intro p {
      color: var(--suave);
      margin-top: 0.5rem;
    }
    .zonas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }
    .zona {
      min-height: 36px;
      padding: 0 0.85rem;
      border-radius: 999px;
      border: 1px solid var(--linea-fuerte);
      background: var(--superficie);
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 500;
    }
    .zona:hover {
      background: var(--gris-claro);
    }
    .zona.activa {
      background: var(--tinta);
      border-color: var(--tinta);
      color: #fff;
    }
    .visor {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
    }
    .detalle {
      padding: 1.75rem;
      min-height: 320px;
    }
    .detalle h2 {
      font-size: 1.6rem;
      margin-bottom: 0.6rem;
    }
    .detalle > p {
      max-width: 60ch;
    }
    .detalle h3 {
      margin: 1.5rem 0 0.6rem;
      font-size: 1rem;
    }
    .afecciones {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }
    .afecciones dt {
      font-weight: 600;
    }
    .afecciones dd {
      margin: 0.1rem 0 0;
      color: var(--suave);
    }
    ul.lista {
      margin: 0;
      padding-left: 1.2rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .urgencia {
      margin-top: 1.5rem;
      display: flex;
      gap: 0.7rem;
      padding: 0.9rem 1rem;
      border-radius: var(--radio-sm);
      background: var(--rojo-claro);
      color: #7d221d;
    }
    .urgencia strong {
      display: block;
    }
    .cta {
      margin-top: 1.5rem;
    }
    .vacio-zona h2 {
      font-size: 1.4rem;
    }
    .vacio-zona p {
      color: var(--suave);
      margin-top: 0.6rem;
    }
    .vacio-zona ul {
      margin: 1rem 0 0;
      padding-left: 1.2rem;
      color: var(--suave);
    }
    h2.sec {
      margin: 3rem 0 1rem;
    }
    .glosario {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }
    .glosario .panel {
      padding: 1.1rem 1.25rem;
    }
    .glosario h3 {
      margin-bottom: 0.3rem;
    }
    .glosario p {
      color: var(--suave);
      font-size: 0.92rem;
    }
    details {
      border-bottom: 1px solid var(--linea);
      padding: 0.9rem 0;
    }
    details summary {
      cursor: pointer;
      font-weight: 600;
      list-style-position: outside;
    }
    details p {
      margin-top: 0.6rem;
      color: var(--suave);
      max-width: 70ch;
    }
    .faq {
      max-width: 820px;
      border-top: 1px solid var(--linea);
    }
    .banda {
      margin-top: 3rem;
      padding: 2rem;
      border-radius: var(--radio);
      background: var(--tinta);
      color: #e9f1ef;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .banda h2 {
      color: #fff;
    }
    .banda p {
      color: #a9c2be;
      margin-top: 0.3rem;
    }
    .aviso-legal {
      margin-top: 1.5rem;
      font-size: 0.85rem;
      color: var(--suave);
      max-width: 80ch;
    }
    @media (max-width: 960px) {
      .visor {
        grid-template-columns: 1fr;
      }
    }
  `,
  template: `
    @if (!auth.usuario()) {
      <header class="barra-publica">
        <a class="logo" routerLink="/explorar">
          <svg viewBox="0 0 40 24" fill="none" aria-hidden="true">
            <path d="M3 22A17 17 0 0 1 37 22" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.4" />
            <path d="M3 22A17 17 0 0 1 28 7" stroke="var(--ambar)" stroke-width="3" stroke-linecap="round" />
          </svg>
          FisioNova
        </a>
        <nav aria-label="Principal">
          <a class="enlace" routerLink="/ingresar">Ingresar</a>
          <a class="btn btn-primario btn-sm" routerLink="/registro">Crear cuenta</a>
        </nav>
      </header>
    }

    <div class="contenido">
      <div class="intro">
        <h1>Conoce tu cuerpo</h1>
        <p>
          Gira el modelo y toca una zona para ver qué molestias son frecuentes ahí y cuándo conviene consultar a un fisioterapeuta.
        </p>
      </div>

      <div class="zonas" role="group" aria-label="Zonas del cuerpo">
        @for (r of regiones; track r.id) {
          <button type="button" class="zona" [class.activa]="sel() === r.id" [attr.aria-pressed]="sel() === r.id" (click)="alternar(r.id)">
            {{ r.nombre }}
          </button>
        }
      </div>

      <div class="visor">
        <fn-cuerpo-3d [seleccionada]="sel()" (elegir)="sel.set($event)" />

        <section class="panel detalle" aria-live="polite">
          @if (region(); as r) {
            <h2>{{ r.nombre }}</h2>
            <p>{{ r.resumen }}</p>

            <h3>Molestias frecuentes</h3>
            <dl class="afecciones">
              @for (a of r.afecciones; track a.nombre) {
                <div>
                  <dt>{{ a.nombre }}</dt>
                  <dd>{{ a.texto }}</dd>
                </div>
              }
            </dl>

            <h3>Conviene consultar si</h3>
            <ul class="lista">
              @for (c of r.consultar; track c) {
                <li>{{ c }}</li>
              }
            </ul>

            <div class="urgencia" role="note">
              <fn-icon name="alerta" />
              <span><strong>Busca atención médica urgente si hay</strong>{{ r.urgencia }}</span>
            </div>

            @if (cta(); as c) {
              <div class="cta">
                <a class="btn btn-primario" [routerLink]="c.ruta" [queryParams]="c.q">{{ c.texto }}</a>
              </div>
            }
          } @else {
            <div class="vacio-zona">
              <h2>Elige una zona</h2>
              <p>Toca el modelo o usa los botones de arriba. Verás:</p>
              <ul>
                <li>qué hace esa parte del cuerpo,</li>
                <li>las molestias más frecuentes,</li>
                <li>cuándo conviene consultar,</li>
                <li>y las señales de alerta que requieren atención urgente.</li>
              </ul>
            </div>
          }
        </section>
      </div>

      <h2 class="sec">Glosario básico</h2>
      <div class="glosario">
        @for (t of glosario; track t.nombre) {
          <div class="panel">
            <h3>{{ t.nombre }}</h3>
            <p>{{ t.texto }}</p>
          </div>
        }
      </div>

      <h2 class="sec">Preguntas frecuentes</h2>
      <div class="faq">
        @for (p of preguntas; track p.pregunta) {
          <details>
            <summary>{{ p.pregunta }}</summary>
            <p>{{ p.respuesta }}</p>
          </details>
        }
      </div>

      @if (cta(); as c) {
        <section class="banda">
          <div>
            <h2>Empieza con una valoración</h2>
            <p>Un fisioterapeuta revisa tu caso y define contigo los siguientes pasos.</p>
          </div>
          <a class="btn btn-primario" [routerLink]="c.ruta" [queryParams]="c.q">{{ c.texto }}</a>
        </section>
      }

      <p class="aviso-legal">
        Esta guía es educativa. No reemplaza la valoración de un profesional de la salud y no sirve para diagnosticar ni para decidir un
        tratamiento.
      </p>
    </div>
  `,
})
export class Explorar {
  protected readonly auth = inject(AuthService);
  protected readonly regiones = REGIONES;
  protected readonly glosario = GLOSARIO;
  protected readonly preguntas = PREGUNTAS;

  protected readonly sel = signal<RegionId | null>(null);
  protected readonly region = computed(() => REGIONES.find((r) => r.id === this.sel()) ?? null);

  /** Llamada a la acción según quién mira la página. El personal no la necesita. */
  protected readonly cta = computed<{ texto: string; ruta: string; q: { nueva: number } | null } | null>(() => {
    const rol = this.auth.usuario()?.rol;
    if (!rol) return { texto: 'Crear mi cuenta y agendar', ruta: '/registro', q: null };
    if (rol === 'Paciente') return { texto: 'Agendar una cita', ruta: '/mis-citas', q: { nueva: 1 } };
    return null;
  });

  protected alternar(id: RegionId): void {
    this.sel.set(this.sel() === id ? null : id);
  }
}
