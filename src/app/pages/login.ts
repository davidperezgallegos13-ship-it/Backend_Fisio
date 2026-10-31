import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { ToastService } from '../core/toast.service';
import { requisitosClave, validarCedula } from '../core/util';
import { Icon } from '../ui/icon';
import { Goniometro } from '../ui/gauge';

@Component({
  selector: 'fn-login',
  imports: [Goniometro, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      min-height: 100dvh;
    }
    .marca-lado {
      position: sticky;
      top: 0;
      height: 100dvh;
      background: var(--tinta);
      color: #e9f1ef;
      padding: 2.5rem clamp(2rem, 5vw, 4.5rem);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 1.35rem;
      letter-spacing: -0.01em;
    }
    .logo-signo {
      width: 34px;
      color: #e9f1ef;
    }
    .lado-centro {
      max-width: 520px;
    }
    .lado-centro fn-goniometro {
      color: #8fb3ae;
      --aguja: var(--ambar);
      margin-bottom: 2.5rem;
    }
    .lado-centro h1 {
      font-size: clamp(2rem, 3.4vw, 3rem);
      color: #fff;
      max-width: 14ch;
    }
    .lado-centro p {
      margin-top: 1rem;
      color: #a9c2be;
      max-width: 40ch;
    }
    .lado-pie {
      font-size: 0.85rem;
      color: #7fa09b;
    }
    .formulario-lado {
      display: grid;
      place-items: center;
      padding: 2rem 1.25rem;
    }
    .tarjeta {
      width: min(420px, 100%);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .logo-movil {
      display: none;
      color: var(--tinta);
    }
    .tarjeta p.sub {
      color: var(--suave);
      margin-top: 0.4rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .codigo input {
      font-family: var(--fuente-titulo);
      font-size: 1.6rem;
      letter-spacing: 0.5em;
      text-align: center;
    }
    .demo {
      font-size: 0.85rem;
    }
    .demo code {
      background: rgba(27, 61, 128, 0.1);
      padding: 0 0.3rem;
      border-radius: 4px;
    }
    .volver {
      background: none;
      border: 0;
      padding: 0;
      color: var(--abeto);
      font-weight: 600;
      cursor: pointer;
      align-self: flex-start;
    }
    .cambio {
      text-align: center;
      color: var(--suave);
    }
    .beneficios {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.5rem;
      font-size: 0.9rem;
      color: var(--suave);
    }
    .beneficios li {
      padding-left: 1.1rem;
      position: relative;
    }
    .beneficios li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.55em;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ambar);
    }
    .reglas {
      list-style: none;
      padding: 0;
      margin: 0.25rem 0 0;
      display: grid;
      gap: 0.2rem;
      font-size: 0.82rem;
      color: var(--suave);
    }
    .reglas li.ok {
      color: #13706c;
      font-weight: 600;
    }
    .cambio a {
      font-weight: 600;
    }
    @media (max-width: 900px) {
      :host {
        grid-template-columns: 1fr;
      }
      .marca-lado {
        display: none;
      }
      .logo-movil {
        display: inline-flex;
      }
    }
  `,
  template: `
    <section class="marca-lado">
      <span class="logo">
        <svg class="logo-signo" viewBox="0 0 40 24" fill="none" aria-hidden="true">
          <path d="M3 22A17 17 0 0 1 37 22" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.4" />
          <path d="M3 22A17 17 0 0 1 28 7" stroke="var(--ambar)" stroke-width="3" stroke-linecap="round" />
        </svg>
        FisioNova
      </span>
      <div class="lado-centro">
        <fn-goniometro [valor]="68" etiqueta="Ilustración de un goniómetro, el instrumento que mide el arco de movimiento" />
        <h1>Recuperar movimiento se mide sesión a sesión.</h1>
        <p>Agenda tus citas, revisa tus sesiones disponibles y mantén tu tratamiento al día.</p>
      </div>
      <span class="lado-pie">Centro de rehabilitación FisioNova</span>
    </section>

    <section class="formulario-lado">
      <div class="tarjeta">
        <span class="logo logo-movil">FisioNova</span>

        @if (modo() === 'registro') {
          <div>
            <h1>Crea tu cuenta</h1>
            <p class="sub">Para agendar citas y ver tus sesiones. Solo toma un minuto.</p>
          </div>
          <ul class="beneficios">
            <li><strong>Agenda en línea:</strong> reserva y reprograma tus citas sin llamar.</li>
            <li><strong>Tus sesiones:</strong> consulta el saldo y la vigencia de tus paquetes.</li>
            <li><strong>Datos protegidos:</strong> tratamos tu información según la LOPDP.</li>
          </ul>
          <form (submit)="registrar($event)" novalidate>
            <div class="campo">
              <label for="r-nombre">Nombres y apellidos</label>
              <input id="r-nombre" name="nombre" type="text" autocomplete="name" [value]="rNombre()" (input)="rNombre.set($any($event.target).value)" />
            </div>
            <div class="rejilla-2">
              <div class="campo">
                <label for="r-ced">Cédula</label>
                <input id="r-ced" name="cedula" type="text" inputmode="numeric" maxlength="10" autocomplete="off" [value]="rCedula()" (input)="rCedula.set($any($event.target).value)" />
                @if (rCedula().length === 10) {
                  @if (cedulaOk()) {
                    <span class="ok">Cédula válida</span>
                  } @else {
                    <span class="error">La cédula no es válida.</span>
                  }
                }
              </div>
              <div class="campo">
                <label for="r-tel">Teléfono</label>
                <input id="r-tel" name="telefono" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel" [value]="rTelefono()" (input)="rTelefono.set($any($event.target).value)" />
              </div>
            </div>
            <div class="campo">
              <label for="r-correo">Correo electrónico</label>
              <input id="r-correo" name="correo" type="email" autocomplete="email" [value]="rCorreo()" (input)="rCorreo.set($any($event.target).value)" />
              <span class="ayuda">Acepta Gmail, Outlook, Hotmail, Yahoo o iCloud.</span>
            </div>
            <div class="campo">
              <label for="r-clave">Contraseña</label>
              <input id="r-clave" name="clave" type="password" autocomplete="new-password" [value]="rClave()" (input)="rClave.set($any($event.target).value)" />
              <ul class="reglas">
                @for (r of reglas(); track r.texto) {
                  <li [class.ok]="r.ok">{{ r.ok ? '✓' : '○' }} {{ r.texto }}</li>
                }
              </ul>
            </div>
            <div class="campo">
              <label for="r-clave2">Repite la contraseña</label>
              <input id="r-clave2" name="clave2" type="password" autocomplete="new-password" [value]="rClave2()" (input)="rClave2.set($any($event.target).value)" />
              @if (rClave2() && rClave() !== rClave2()) {
                <span class="error">Las contraseñas no coinciden.</span>
              }
            </div>
            <label class="casilla">
              <input type="checkbox" [checked]="rConsent()" (change)="rConsent.set($any($event.target).checked)" />
              <span>Autorizo el tratamiento de mis datos personales según la LOPDP.</span>
            </label>
            @if (error()) {
              <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
            }
            <button class="btn btn-primario btn-bloque" type="submit">Crear cuenta</button>
          </form>
          <p class="cambio">¿Ya tienes cuenta? <a routerLink="/ingresar">Ingresa</a></p>
        } @else if (!auth.usuarioPendiente()) {
          <div>
            <h1>Ingresa a tu cuenta</h1>
            <p class="sub">Usa tu cédula o tu correo.</p>
          </div>
          <form (submit)="entrar($event)" novalidate>
            <div class="campo">
              <label for="id">Cédula o correo</label>
              <input id="id" name="id" type="text" autocomplete="username" [value]="id()" (input)="id.set($any($event.target).value)" />
            </div>
            <div class="campo">
              <label for="clave">Contraseña</label>
              <input id="clave" name="clave" type="password" autocomplete="current-password" [value]="clave()" (input)="clave.set($any($event.target).value)" />
            </div>
            @if (error()) {
              <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
            }
            <button class="btn btn-primario btn-bloque" type="submit">Continuar</button>
          </form>
          <p class="cambio">¿Primera vez en FisioNova? <a routerLink="/registro">Crea tu cuenta</a></p>
          <p class="cambio"><a routerLink="/explorar">Explora el cuerpo humano en 3D</a></p>
          <div class="alerta alerta-info demo">
            <span>
              <strong>Datos de demostración.</strong> Contraseña de todas las cuentas: <code>{{ auth.CLAVE_DEMO }}</code><br />
              Administrador: <code>admin&#64;fisionova.ec</code><br />
              Recepción: <code>recepcion&#64;fisionova.ec</code><br />
              Fisioterapeuta: <code>camila.andrade&#64;fisionova.ec</code><br />
              Paciente: <code>lucia.paredes&#64;correo.ec</code>
            </span>
          </div>
        } @else {
          <div>
            <h1>Verifica tu identidad</h1>
            <p class="sub">Escribe el código temporal de 6 dígitos de tu aplicación autenticadora.</p>
          </div>
          <form (submit)="verificar($event)" novalidate>
            <div class="campo codigo">
              <label for="codigo" class="solo-lectores">Código temporal</label>
              <input id="codigo" name="codigo" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" [value]="codigo()" (input)="codigo.set($any($event.target).value)" />
            </div>
            @if (error()) {
              <div class="alerta" role="alert"><fn-icon name="alerta" /> <span>{{ error() }}</span></div>
            }
            <button class="btn btn-primario btn-bloque" type="submit">Verificar y entrar</button>
          </form>
          <button type="button" class="volver" (click)="volver()">Usar otra cuenta</button>
          <div class="alerta alerta-info demo">Código de demostración: <code>{{ auth.CODIGO_DEMO }}</code></div>
        }
      </div>
    </section>
  `,
})
export class Login {
  protected readonly auth = inject(AuthService);
  private readonly data = inject(DataService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly modo = signal<'ingresar' | 'registro'>(
    inject(ActivatedRoute).snapshot.data['modo'] === 'registro' ? 'registro' : 'ingresar',
  );

  protected readonly id = signal('');
  protected readonly clave = signal('');
  protected readonly codigo = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly rNombre = signal('');
  protected readonly rCedula = signal('');
  protected readonly rTelefono = signal('');
  protected readonly rCorreo = signal('');
  protected readonly rClave = signal('');
  protected readonly rClave2 = signal('');
  protected readonly rConsent = signal(false);
  protected readonly cedulaOk = computed(() => validarCedula(this.rCedula()));
  protected readonly reglas = computed(() => requisitosClave(this.rClave()));

  protected async entrar(ev: Event): Promise<void> {
    ev.preventDefault();
    const e = await this.auth.iniciarApi(this.id(), this.clave());
    this.error.set(e);
    if (!e && this.auth.usuario()) void this.router.navigateByUrl('/');
  }

  protected verificar(ev: Event): void {
    ev.preventDefault();
    if (this.auth.verificarApi(this.codigo())) {
      void this.router.navigateByUrl('/');
    } else {
      this.error.set('El código no es correcto o ya venció. Pide uno nuevo en tu aplicación.');
    }
  }

  protected async registrar(ev: Event): Promise<void> {
    ev.preventDefault();
    if (this.rClave() !== this.rClave2()) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    const e = await this.auth.registrarApi({
      nombre: this.rNombre(),
      cedula: this.rCedula(),
      correo: this.rCorreo(),
      telefono: this.rTelefono(),
      clave: this.rClave(),
      consentimiento: this.rConsent(),
    });
    if (e) {
      this.error.set(e);
      return;
    }
    this.toast.ok('Cuenta creada. Ya puedes agendar tu primera cita.');
    void this.router.navigateByUrl('/');
  }

  protected volver(): void {
    this.auth.cancelarVerificacionApi();
    this.codigo.set('');
    this.error.set(null);
  }
}
