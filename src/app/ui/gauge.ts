import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Marca {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mayor: boolean;
}

/**
 * Goniómetro: medio círculo graduado con aguja. Es el motivo de la marca.
 * `valor` va de 0 a 100. Usa `currentColor` para las marcas y `--aguja` para la aguja.
 */
@Component({
  selector: 'fn-goniometro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      color: inherit;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .pista {
      stroke: currentColor;
      opacity: 0.18;
    }
    .arco {
      stroke: var(--aguja, #e8a02a);
      transition: stroke-dasharray 0.6s ease-out;
    }
    .aguja {
      stroke: var(--aguja, #e8a02a);
    }
    .pivote {
      fill: var(--aguja, #e8a02a);
    }
    .marca {
      stroke: currentColor;
      opacity: 0.55;
    }
    .marca.mayor {
      opacity: 0.9;
    }
  `,
  template: `
    <svg viewBox="0 0 220 124" role="img" [attr.aria-label]="etiqueta()">
      @for (m of marcas; track $index) {
        <line class="marca" [class.mayor]="m.mayor" [attr.x1]="m.x1" [attr.y1]="m.y1" [attr.x2]="m.x2" [attr.y2]="m.y2" stroke-width="1.5" stroke-linecap="round" />
      }
      <path class="pista" d="M30 110 A80 80 0 0 1 190 110" fill="none" stroke-width="10" stroke-linecap="round" />
      <path class="arco" d="M30 110 A80 80 0 0 1 190 110" fill="none" stroke-width="10" stroke-linecap="round" pathLength="100" [attr.stroke-dasharray]="relleno()" />
      <line class="aguja" x1="110" y1="110" [attr.x2]="agujaX()" [attr.y2]="agujaY()" stroke-width="3" stroke-linecap="round" />
      <circle class="pivote" cx="110" cy="110" r="6" />
    </svg>
  `,
})
export class Goniometro {
  readonly valor = input(0);
  readonly etiqueta = input('Medidor');

  protected readonly marcas: Marca[] = Array.from({ length: 19 }, (_, i) => {
    const a = Math.PI - (i * Math.PI) / 18;
    const mayor = i % 3 === 0;
    const r1 = 94;
    const r2 = mayor ? 108 : 102;
    return {
      x1: 110 + r1 * Math.cos(a),
      y1: 110 - r1 * Math.sin(a),
      x2: 110 + r2 * Math.cos(a),
      y2: 110 - r2 * Math.sin(a),
      mayor,
    };
  });

  private readonly v = computed(() => Math.max(0, Math.min(100, this.valor())));
  protected readonly relleno = computed(() => `${this.v()} 100`);
  private readonly angulo = computed(() => Math.PI - (this.v() / 100) * Math.PI);
  protected readonly agujaX = computed(() => 110 + 66 * Math.cos(this.angulo()));
  protected readonly agujaY = computed(() => 110 - 66 * Math.sin(this.angulo()));
}
