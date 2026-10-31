import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Cita, DataService, Estado } from '../core/data.service';
import { ToastService } from '../core/toast.service';
import { addDays, claseEstado, diaLargo, fechaFmt, hoy, horasDia, parse } from '../core/util';
import { gestionaCitas, puede } from '../core/permisos';
import { Goniometro } from '../ui/gauge';
import { Icon } from '../ui/icon';

@Component({
  selector: 'fn-dashboard',
  imports: [RouterLink, Icon, Goniometro],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      margin-bottom: 1.75rem;
      border-block: 1px solid var(--linea-fuerte);
    }
    .cifra {
      padding: 1rem 1.25rem;
      border-left: 1px solid var(--linea);
    }
    .cifra:first-child {
      border-left: 0;
      padding-left: 0;
    }
    .cifra dt {
      color: var(--suave);
      font-size: 0.88rem;
    }
    .cifra dd {
      margin: 0.15rem 0 0;
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 2rem;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .cifra dd small {
      font-family: var(--fuente);
      font-weight: 500;
      font-size: 0.85rem;
      color: var(--suave);
      letter-spacing: 0;
      margin-left: 0.35rem;
    }
    .cuadricula {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
      gap: 1.5rem;
      align-items: start;
    }
    .agenda {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .agenda li {
      display: grid;
      grid-template-columns: 62px minmax(0, 1fr) auto auto;
      gap: 1rem;
      align-items: center;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--linea);
    }
    .agenda li:last-child {
      border-bottom: 0;
    }
    .agenda li.cancelada {
      opacity: 0.55;
    }
    .hora {
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 1.05rem;
      font-variant-numeric: tabular-nums;
    }
    .quien strong {
      display: block;
      line-height: 1.3;
    }
    .fisio {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: var(--suave);
    }
    .punto {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex: none;
    }
    .lateral {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .ocupacion {
      background: var(--tinta);
      color: #e9f1ef;
      border-radius: var(--radio);
      padding: 1.5rem 1.5rem 1.25rem;
    }
    .ocupacion h2 {
      font-size: 1rem;
      color: #a9c2be;
      font-family: var(--fuente);
      font-weight: 600;
    }
    .medidor {
      max-width: 270px;
      margin: 1rem auto 0;
      color: #8fb3ae;
      --aguja: var(--ambar);
    }
    .porcentaje {
      text-align: center;
      font-family: var(--fuente-titulo);
      font-weight: 700;
      font-size: 2.6rem;
      line-height: 1;
      margin-top: -0.2rem;
      color: #fff;
    }
    .leyenda {
      text-align: center;
      color: #a9c2be;
      font-size: 0.88rem;
      margin-top: 0.35rem;
    }
    .barras {
      list-style: none;
      margin: 1.4rem 0 0;
      padding: 1rem 0 0;
      border-top: 1px solid var(--tinta-3);
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }
    .barras li {
      display: grid;
      grid-template-columns: 1fr 44px;
      gap: 0.2rem 0.75rem;
      font-size: 0.85rem;
    }
    .barras .pista {
      grid-column: 1 / -1;
      height: 6px;
      border-radius: 3px;
      background: var(--tinta-3);
      overflow: hidden;
    }
    .barras .pista span {
      display: block;
      height: 100%;
      border-radius: 3px;
    }
    .barras .valor {
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: #fff;
    }
    .alertas {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .alertas li {
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--linea);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .alertas li:last-child {
      border-bottom: 0;
    }
    .alertas .fila {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }
    @media (max-width: 1100px) {
      .cuadricula {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 700px) {
      .cifras {
        grid-template-columns: 1fr 1fr;
      }
      .cifra:nth-child(3) {
        border-left: 0;
        padding-left: 0;
      }
      .agenda li {
        grid-template-columns: 52px minmax(0, 1fr);
      }
      .agenda li > :nth-child(n + 3) {
        grid-column: 2;
      }
    }
  `,
  template: `
    <div class="pagina">
      <header class="pagina-cabecera">
        <div>
          <h1>{{ saludo() }}, {{ nombre() }}</h1>
          <p>{{ fechaHoy }}</p>
        </div>
        <div class="acciones">
          @if (puedeAgendar()) {
            <a class="btn btn-primario" routerLink="/citas"><fn-icon name="mas" /> Nueva cita</a>
          }
        </div>
      </header>

      <dl class="cifras">
        <div class="cifra">
          <dt>Citas de hoy</dt>
          <dd>{{ activasHoy().length }}</dd>
        </div>
        <div class="cifra">
          <dt>Por atender</dt>
          <dd>{{ porAtender() }}</dd>
        </div>
        <div class="cifra">
          <dt>Atendidas</dt>
          <dd>{{ atendidas() }}<small>de {{ activasHoy().length }}</small></dd>
        </div>
        @if (verPaquetes()) {
          <div class="cifra">
            <dt>Paquetes por revisar</dt>
            <dd>{{ data.alertasPaquete().length }}</dd>
          </div>
        }
      </dl>

      <div class="cuadricula">
        <section class="panel" aria-labelledby="t-agenda">
          <div class="panel-cab">
            <h2 id="t-agenda">Agenda de hoy</h2>
            <a class="btn btn-sm" routerLink="/citas">Ver agenda completa</a>
          </div>
          @if (citasHoy().length === 0) {
            <div class="vacio">
              <strong>No hay citas para hoy.</strong>
              Revisa la agenda de otro día o agenda una cita nueva.
            </div>
          } @else {
            <ol class="agenda">
              @for (c of citasHoy(); track c.id) {
                <li [class.cancelada]="c.estado === 'Cancelada'">
                  <span class="hora">{{ c.hora }}</span>
                  <span class="quien">
                    <strong>{{ data.paciente(c.pacienteId)?.nombre }}</strong>
                    <span class="fisio">
                      <span class="punto" [style.background]="data.fisio(c.fisioId)?.color"></span>
                      {{ data.servicio(c.servicioId)?.nombre }} con {{ data.fisio(c.fisioId)?.nombre }}
                    </span>
                  </span>
                  <span [class]="claseEstado(c.estado)">{{ c.estado }}</span>
                  <span>
                    @if (c.estado === 'Pendiente') {
                      <button type="button" class="btn btn-sm" (click)="cambiar(c, 'Confirmada')">Confirmar</button>
                    } @else if (c.estado === 'Confirmada') {
                      <button type="button" class="btn btn-sm btn-primario" (click)="cambiar(c, 'Atendida')">Marcar atendida</button>
                    }
                  </span>
                </li>
              }
            </ol>
          }
        </section>

        <div class="lateral">
          <section class="ocupacion" aria-labelledby="t-ocup">
            <h2 id="t-ocup">Ocupación de la semana</h2>
            <fn-goniometro class="medidor" [valor]="ocupacionSemana()" etiqueta="Ocupación de la semana" />
            <p class="porcentaje">{{ ocupacionSemana() }}%</p>
            <p class="leyenda">de las horas disponibles están agendadas</p>
            <ul class="barras">
              @for (f of ocupacionFisios(); track f.id) {
                <li>
                  <span>{{ f.nombre }}</span>
                  <span class="valor">{{ f.pct }}%</span>
                  <span class="pista"><span [style.width.%]="f.pct" [style.background]="f.color"></span></span>
                </li>
              }
            </ul>
          </section>

          @if (verPaquetes()) {
          <section class="panel" aria-labelledby="t-alertas">
            <div class="panel-cab">
              <h2 id="t-alertas">Paquetes por revisar</h2>
              <a class="btn btn-sm" routerLink="/paquetes">Ver paquetes</a>
            </div>
            @if (data.alertasPaquete().length === 0) {
              <div class="vacio"><strong>Todo en orden.</strong> Ningún paquete está por agotarse o vencer.</div>
            } @else {
              <ul class="alertas">
                @for (a of data.alertasPaquete(); track a.compra.id) {
                  <li>
                    <div class="fila">
                      <strong>{{ a.paciente?.nombre }}</strong>
                      <span class="secundario">{{ a.compra.saldo }} de {{ a.compra.sesiones }}</span>
                    </div>
                    <span class="secundario">
                      @if (a.porSaldo) {
                        Quedan {{ a.compra.saldo }} sesiones.
                      }
                      @if (a.porVencer) {
                        Vence el {{ fecha(a.compra.vence) }}.
                      }
                    </span>
                  </li>
                }
              </ul>
            }
          </section>
          }
        </div>
      </div>
    </div>
  `,
})
export class Dashboard {
  protected readonly data = inject(DataService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly fechaHoy = diaLargo(hoy());

  protected readonly saludo = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });
  protected readonly nombre = computed(() => this.auth.usuario()?.nombre.split(' ')[0] ?? '');
  protected readonly puedeAgendar = computed(() => gestionaCitas(this.auth.usuario()?.rol));
  protected readonly verPaquetes = computed(() => puede(this.auth.usuario()?.rol, 'paquetes'));

  protected readonly citasHoy = computed(() =>
    this.data
      .citasVisibles()
      .filter((c) => c.fecha === hoy())
      .sort((a, b) => a.hora.localeCompare(b.hora) || a.fisioId.localeCompare(b.fisioId)),
  );
  protected readonly activasHoy = computed(() => this.citasHoy().filter((c) => c.estado !== 'Cancelada'));
  protected readonly porAtender = computed(
    () => this.citasHoy().filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada').length,
  );
  protected readonly atendidas = computed(() => this.citasHoy().filter((c) => c.estado === 'Atendida').length);

  private readonly diasSemana = computed(() => {
    const dow = parse(hoy()).getDay();
    const lunes = addDays(hoy(), dow === 0 ? -6 : 1 - dow);
    return Array.from({ length: 6 }, (_, i) => addDays(lunes, i));
  });

  protected readonly ocupacionFisios = computed(() => {
    const dias = this.diasSemana();
    const disponibles = dias.reduce((s, d) => s + horasDia(d).length, 0);
    return this.data.fisiosVisibles().map((f) => {
      const agendadas = this.data
        .citasVisibles()
        .filter((c) => c.fisioId === f.id && dias.includes(c.fecha) && c.estado !== 'Cancelada').length;
      return { id: f.id, nombre: f.nombre, color: f.color, pct: disponibles ? Math.round((agendadas / disponibles) * 100) : 0 };
    });
  });

  protected readonly ocupacionSemana = computed(() => {
    const l = this.ocupacionFisios();
    return l.length ? Math.round(l.reduce((s, f) => s + f.pct, 0) / l.length) : 0;
  });

  protected readonly claseEstado = claseEstado;

  protected fecha(s: string): string {
    return fechaFmt(s);
  }

  protected cambiar(c: Cita, estado: Estado): void {
    const e = this.data.cambiarEstado(c.id, estado);
    if (e) this.toast.error(e);
    else this.toast.ok(`Cita ${estado.toLowerCase()}.`);
  }
}
