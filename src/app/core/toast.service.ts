import { Injectable, signal } from '@angular/core';

export interface Aviso {
  texto: string;
  tipo: 'ok' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly aviso = signal<Aviso | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | undefined;

  ok(texto: string): void {
    this.mostrar({ texto, tipo: 'ok' });
  }

  error(texto: string): void {
    this.mostrar({ texto, tipo: 'error' });
  }

  cerrar(): void {
    this.aviso.set(null);
  }

  private mostrar(a: Aviso): void {
    clearTimeout(this.temporizador);
    this.aviso.set(a);
    this.temporizador = setTimeout(() => this.aviso.set(null), 4000);
  }
}
