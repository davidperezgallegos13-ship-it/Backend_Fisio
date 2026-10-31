import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, output } from '@angular/core';
import { Icon } from './icon';

/** Ventana modal o panel lateral. El contenido se proyecta con <ng-content>. */
@Component({
  selector: 'fn-modal',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
    <div class="velo" (click)="cerrar.emit()"></div>
    <section
      [class]="lateral() ? 'panel-lateral' : 'dialogo'"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      [attr.aria-label]="titulo()"
    >
      <header class="dialogo-cab">
        <h2>{{ titulo() }}</h2>
        <button type="button" class="btn-icono" (click)="cerrar.emit()" aria-label="Cerrar">
          <fn-icon name="cerrar" />
        </button>
      </header>
      <ng-content />
    </section>
  `,
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly lateral = input(false);
  readonly cerrar = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const primero = this.el.nativeElement.querySelector<HTMLElement>('input, select, button.btn-primario');
      (primero ?? this.el.nativeElement.querySelector<HTMLElement>('[role=dialog]'))?.focus();
    });
  }
}
