import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { REGIONES, RegionId } from '../core/cuerpo-info';

type Punto = [number, number, number];

interface Giro {
  target: THREE.Vector3;
  distancia: number;
  azimut: number | null;
}

const COLOR_PIEL = 0xcde3de;
const COLOR_SELECCION = 0xe8a02a;
const COLOR_HOVER = 0x13706c;

/**
 * Maniquí 3D hecho con formas simples (cápsulas y elipsoides) para no depender de un archivo de modelo.
 * Se arrastra para girar, se toca una zona para elegirla y la cámara se acerca a ella.
 * Si más adelante quieres un modelo anatómico real, reemplaza `construirCuerpo` por un GLTFLoader.
 */
@Component({
  selector: 'fn-cuerpo-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }
    .marco {
      position: relative;
      border-radius: 14px;
      overflow: hidden;
      background: radial-gradient(ellipse at 50% 38%, #24484e 0%, #0f2a2e 68%);
      height: clamp(420px, 68vh, 640px);
    }
    .lienzo {
      position: absolute;
      inset: 0;
      touch-action: none;
    }
    .lienzo canvas {
      display: block;
      width: 100%;
      height: 100%;
      outline-offset: -3px;
    }
    .pista,
    .sin-3d {
      position: absolute;
      left: 1rem;
      right: 1rem;
      bottom: 0.9rem;
      margin: 0;
      text-align: center;
      font-size: 0.85rem;
      color: #a9c2be;
      pointer-events: none;
    }
    .sin-3d {
      top: 50%;
      bottom: auto;
      transform: translateY(-50%);
      font-size: 1rem;
    }
  `,
  template: `
    <div class="marco">
      <div
        #lienzo
        class="lienzo"
        role="img"
        aria-label="Modelo 3D del cuerpo humano. Usa los botones de zonas para explorar la información."
      ></div>
      @if (disponible()) {
        <p class="pista">Arrastra para girar. Toca una zona para ver su información.</p>
      } @else {
        <p class="sin-3d">Tu dispositivo no puede mostrar el modelo 3D. Usa los botones de zonas para ver la información.</p>
      }
    </div>
  `,
})
export class Cuerpo3D {
  readonly seleccionada = input<RegionId | null>(null);
  readonly elegir = output<RegionId>();

  protected readonly disponible = signal(true);

  private readonly lienzo = viewChild.required<ElementRef<HTMLDivElement>>('lienzo');
  private readonly destruir = inject(DestroyRef);

  private renderer!: THREE.WebGLRenderer;
  private escena!: THREE.Scene;
  private camara!: THREE.PerspectiveCamera;
  private controles!: OrbitControls;
  private observador?: ResizeObserver;
  private cuadro = 0;
  private listo = false;

  private readonly materiales = new Map<RegionId, THREE.MeshStandardMaterial>();
  private readonly interactivos: THREE.Mesh[] = [];
  private readonly rayo = new THREE.Raycaster();
  private readonly puntero = new THREE.Vector2();
  private hover: RegionId | null = null;
  private giro: Giro | null = null;
  private inicioClic: { x: number; y: number } | null = null;

  constructor() {
    afterNextRender(() => this.iniciar());
    effect(() => {
      const id = this.seleccionada();
      if (!this.listo) return;
      this.pintar();
      this.enfocar(id);
    });
    this.destruir.onDestroy(() => this.limpiar());
  }

  // ---------- escena ----------
  private iniciar(): void {
    const cont = this.lienzo().nativeElement;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      this.disponible.set(false);
      return;
    }
    const ancho = cont.clientWidth || 480;
    const alto = cont.clientHeight || 560;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(ancho, alto);
    cont.appendChild(this.renderer.domElement);

    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(30, ancho / alto, 0.1, 50);
    this.camara.position.set(0, 1.1, 5.2);

    this.escena.add(new THREE.HemisphereLight(0xe3f6f2, 0x1b3d42, 1.2));
    const principal = new THREE.DirectionalLight(0xffffff, 2.4);
    principal.position.set(2, 3, 3);
    this.escena.add(principal);
    const contraluz = new THREE.DirectionalLight(COLOR_SELECCION, 1.4);
    contraluz.position.set(-3, 2, -2.5);
    this.escena.add(contraluz);

    this.construirSuelo();
    this.construirCuerpo();

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controles = new OrbitControls(this.camara, this.renderer.domElement);
    this.controles.target.set(0, 0.9, 0);
    this.controles.enablePan = false;
    this.controles.enableDamping = true;
    this.controles.dampingFactor = 0.08;
    this.controles.minDistance = 1.6;
    this.controles.maxDistance = 7;
    this.controles.minPolarAngle = Math.PI * 0.28;
    this.controles.maxPolarAngle = Math.PI * 0.62;
    this.controles.autoRotate = !reducido;
    this.controles.autoRotateSpeed = 1.1;
    this.controles.addEventListener('start', () => {
      this.controles.autoRotate = false;
      this.giro = null;
    });
    this.controles.update();

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', (e) => (this.inicioClic = { x: e.clientX, y: e.clientY }));
    el.addEventListener('pointerup', (e) => this.alSoltar(e));
    el.addEventListener('pointermove', (e) => this.alMover(e));
    el.addEventListener('pointerleave', () => this.cambiarHover(null));

    this.observador = new ResizeObserver(() => this.ajustarTamano());
    this.observador.observe(cont);

    this.listo = true;
    this.pintar();
    if (this.seleccionada()) this.enfocar(this.seleccionada());

    const bucle = (): void => {
      this.cuadro = requestAnimationFrame(bucle);
      this.avanzarGiro();
      this.controles.update();
      this.renderer.render(this.escena, this.camara);
    };
    bucle();
  }

  private construirSuelo(): void {
    const material = new THREE.MeshBasicMaterial({ color: 0x8fb3ae, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const anillo = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.355, 80), material);
    anillo.rotation.x = -Math.PI / 2;
    anillo.position.y = 0.002;
    this.escena.add(anillo);
    const exterior = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.628, 96), material.clone());
    (exterior.material as THREE.MeshBasicMaterial).opacity = 0.2;
    exterior.rotation.x = -Math.PI / 2;
    exterior.position.y = 0.002;
    this.escena.add(exterior);
  }

  private construirCuerpo(): void {
    // Cabeza y cuello
    this.elipsoide('cabeza', [0, 1.67, 0], [0.095, 0.115, 0.105]);
    this.elipsoide('cabeza', [0, 1.655, 0.105], [0.018, 0.022, 0.02]); // nariz: marca el frente
    this.extremidad('cuello', [0, 1.5, 0], [0, 1.6, 0], 0.048);

    // Tronco
    this.elipsoide('dorsal', [0, 1.34, 0], [0.2, 0.2, 0.115]);
    this.elipsoide('lumbar', [0, 1.08, 0], [0.17, 0.15, 0.1]);
    this.elipsoide('cadera', [0, 0.9, 0], [0.19, 0.12, 0.115]);

    // Columna visible por detrás
    for (let y = 1.46; y >= 0.96; y -= 0.045) {
      const z = this.superficieEspalda(y);
      const region: RegionId = y > 1.2 ? 'dorsal' : 'lumbar';
      const m = this.parte(region, new THREE.SphereGeometry(0.017, 16, 12));
      m.position.set(0, y, -z);
    }
    for (let y = 1.52; y <= 1.6; y += 0.04) {
      const m = this.parte('cuello', new THREE.SphereGeometry(0.016, 16, 12));
      m.position.set(0, y, -0.047);
    }

    // Lado izquierdo y derecho
    for (const s of [-1, 1]) {
      this.esfera('hombro', [s * 0.235, 1.46, 0], 0.075);
      this.extremidad('hombro', [s * 0.235, 1.46, 0], [s * 0.285, 1.18, 0], 0.05);
      this.esfera('codo', [s * 0.285, 1.18, 0], 0.046);
      this.extremidad('codo', [s * 0.285, 1.18, 0], [s * 0.31, 0.93, 0.02], 0.04);
      this.esfera('mano', [s * 0.31, 0.93, 0.02], 0.032);
      this.elipsoide('mano', [s * 0.315, 0.85, 0.025], [0.032, 0.075, 0.02]);

      this.extremidad('cadera', [s * 0.1, 0.86, 0], [s * 0.1, 0.5, 0], 0.078);
      this.esfera('rodilla', [s * 0.1, 0.5, 0], 0.062);
      this.extremidad('rodilla', [s * 0.1, 0.5, 0], [s * 0.1, 0.11, 0], 0.056);
      this.esfera('pie', [s * 0.1, 0.1, 0], 0.046);
      this.elipsoide('pie', [s * 0.1, 0.04, 0.06], [0.048, 0.036, 0.115]);
    }
  }

  /** Distancia hacia atrás de la superficie del tronco a una altura dada, para apoyar la columna. */
  private superficieEspalda(y: number): number {
    const el = (cy: number, ry: number, rz: number): number => {
      const t = (y - cy) / ry;
      return Math.abs(t) >= 1 ? 0 : rz * Math.sqrt(1 - t * t);
    };
    return Math.max(el(1.34, 0.2, 0.115), el(1.08, 0.15, 0.1), el(0.9, 0.12, 0.115));
  }

  // ---------- piezas ----------
  private materialDe(region: RegionId): THREE.MeshStandardMaterial {
    let m = this.materiales.get(region);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: COLOR_PIEL, roughness: 0.55, metalness: 0, emissive: 0x000000 });
      this.materiales.set(region, m);
    }
    return m;
  }

  private parte(region: RegionId, geometria: THREE.BufferGeometry): THREE.Mesh {
    const malla = new THREE.Mesh(geometria, this.materialDe(region));
    malla.userData['region'] = region;
    this.escena.add(malla);
    this.interactivos.push(malla);
    return malla;
  }

  private esfera(region: RegionId, c: Punto, radio: number): void {
    this.parte(region, new THREE.SphereGeometry(radio, 32, 24)).position.set(...c);
  }

  private elipsoide(region: RegionId, c: Punto, radios: Punto): void {
    const m = this.parte(region, new THREE.SphereGeometry(1, 40, 28));
    m.position.set(...c);
    m.scale.set(...radios);
  }

  private extremidad(region: RegionId, a: Punto, b: Punto, radio: number): void {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const largo = Math.max(dir.length() - 2 * radio, 0.001);
    const m = this.parte(region, new THREE.CapsuleGeometry(radio, largo, 8, 20));
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }

  // ---------- interacción ----------
  private regionEn(e: PointerEvent): RegionId | null {
    const caja = this.renderer.domElement.getBoundingClientRect();
    this.puntero.set(((e.clientX - caja.left) / caja.width) * 2 - 1, -((e.clientY - caja.top) / caja.height) * 2 + 1);
    this.rayo.setFromCamera(this.puntero, this.camara);
    const golpe = this.rayo.intersectObjects(this.interactivos, false)[0];
    return golpe ? (golpe.object.userData['region'] as RegionId) : null;
  }

  private alMover(e: PointerEvent): void {
    if (e.buttons) return; // arrastrando para girar
    this.cambiarHover(this.regionEn(e));
  }

  private alSoltar(e: PointerEvent): void {
    const ini = this.inicioClic;
    this.inicioClic = null;
    if (!ini || Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 6) return; // fue un arrastre
    const id = this.regionEn(e);
    if (id) this.elegir.emit(id);
  }

  private cambiarHover(id: RegionId | null): void {
    if (id === this.hover) return;
    this.hover = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    this.pintar();
  }

  private pintar(): void {
    const sel = this.seleccionada();
    for (const [id, m] of this.materiales) {
      if (id === sel) {
        m.emissive.setHex(COLOR_SELECCION);
        m.emissiveIntensity = 0.6;
      } else if (id === this.hover) {
        m.emissive.setHex(COLOR_HOVER);
        m.emissiveIntensity = 0.55;
      } else {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    }
  }

  // ---------- cámara ----------
  private enfocar(id: RegionId | null): void {
    this.controles.autoRotate = false;
    const region = REGIONES.find((r) => r.id === id);
    this.giro = region
      ? { target: new THREE.Vector3(0, region.foco[1], 0), distancia: region.distancia, azimut: region.vista === 'espalda' ? Math.PI : 0 }
      : { target: new THREE.Vector3(0, 0.9, 0), distancia: 5.2, azimut: null };
  }

  private avanzarGiro(): void {
    const g = this.giro;
    if (!g) return;
    const k = 0.09;
    const desde = this.camara.position.clone().sub(this.controles.target);
    const dist = desde.length();
    const alt = Math.asin(Math.max(-1, Math.min(1, desde.y / dist)));
    const az = Math.atan2(desde.x, desde.z);

    let nuevoAz = az;
    let faltaAz = 0;
    if (g.azimut !== null) {
      let d = g.azimut - az;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      nuevoAz = az + d * k;
      faltaAz = Math.abs(d);
    }
    const nuevaDist = dist + (g.distancia - dist) * k;
    this.controles.target.lerp(g.target, k);

    const c = Math.cos(alt);
    this.camara.position.set(
      this.controles.target.x + Math.sin(nuevoAz) * c * nuevaDist,
      this.controles.target.y + Math.sin(alt) * nuevaDist,
      this.controles.target.z + Math.cos(nuevoAz) * c * nuevaDist,
    );

    if (faltaAz < 0.01 && Math.abs(g.distancia - nuevaDist) < 0.01 && this.controles.target.distanceTo(g.target) < 0.005) {
      this.giro = null;
    }
  }

  private ajustarTamano(): void {
    const cont = this.lienzo().nativeElement;
    const ancho = cont.clientWidth;
    const alto = cont.clientHeight;
    if (!ancho || !alto) return;
    this.renderer.setSize(ancho, alto);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
  }

  private limpiar(): void {
    cancelAnimationFrame(this.cuadro);
    this.observador?.disconnect();
    if (!this.listo) return;
    this.controles.dispose();
    this.escena.traverse((o) => {
      const malla = o as THREE.Mesh;
      malla.geometry?.dispose();
    });
    this.materiales.forEach((m) => m.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.listo = false;
  }
}
