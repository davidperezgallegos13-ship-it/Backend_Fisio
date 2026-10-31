# FisioNova · Panel web

Panel para **recepción y administración** del centro de rehabilitación FisioNova (Angular).
Citas, pacientes, paquetes de sesiones y reportes. Los datos son ficticios y viven en memoria.

## Ejecutar

```bash
npm install
ng serve
```

Abre `http://localhost:4200/`.

## Cuentas de demostración

Contraseña de todas: `FisioNova2026!`. El personal pide además el código `123456` (segundo factor, RF-26).
El paciente entra sin segundo factor.

| Rol | Usuario |
| --- | --- |
| Administrador | `admin@fisionova.ec` |
| Recepción | `recepcion@fisionova.ec` |
| Fisioterapeuta | `camila.andrade@fisionova.ec` |
| Paciente | `lucia.paredes@correo.ec` |

Se puede ingresar con correo o cédula (RF-02). Tras 5 intentos fallidos se bloquea 15 minutos (RF-03).
Un paciente nuevo se registra solo en **/registro** (cédula validada, contraseña de 12+ caracteres, consentimiento).

## Módulos por rol (RF-05)

| Módulo | Administrador | Recepción | Fisioterapeuta | Paciente |
| --- | :-: | :-: | :-: | :-: |
| Inicio (panel del personal) | sí | sí | sí (solo lo suyo) | |
| Citas | sí | sí (agenda y gestiona) | sí (solo su agenda) | |
| Pacientes | sí | sí | sí (los que atiende, sin pagos) | |
| Paquetes | sí | sí | | |
| Reportes | todos | REP-01, 04, 05 | REP-04 (el suyo) | |
| Personal y servicios | sí | | | |
| Inicio, Mis citas, Mis paquetes (portal) | | | | sí |
| Guía del cuerpo (3D) | sí | sí | sí | sí |

La matriz está en `core/permisos.ts`; el menú, las rutas (guards) y los datos visibles la usan.
**El backend debe repetir esta validación** y responder 403 cuando un rol pida algo que no le corresponde.

## Guía del cuerpo en 3D

Pública en **/explorar** (sin cuenta) y dentro del sistema en **/guia**. Un maniquí 3D (three.js) que se gira con el dedo o el mouse;
al tocar una zona muestra molestias frecuentes, cuándo consultar y señales de alerta. Los textos están en `core/cuerpo-info.ts`.
Es contenido educativo: no diagnostica ni indica tratamientos (RES-14). Requiere `npm install` para instalar `three` y `@types/three`.

## Estructura

```
src/app/
  core/    reglas de negocio y datos (DataService), autenticación, guards, utilidades
  ui/      componentes base: icono, goniómetro, modal, cuerpo 3D
  pages/   login y registro, shell (menú por rol), dashboard, citas, pacientes, paquetes,
           reportes, personal (admin), portal (paciente), explorar (guía 3D)
```

## Requisitos que cubre

RF-01 cédula validada · RF-02/03/26 acceso y segundo factor · RF-05 roles · RF-06 a RF-10 citas
(sin doble reserva, 12 h, estados) · RF-20 reportes REP-01 a REP-06 (Excel y PDF) · RF-23 a RF-25 y RF-29 paquetes y saldo
· RF-27 consentimiento · RNF-13 interfaz en español · RNF-15 sin datos de tarjeta.

## Conectar el backend

`core/data.service.ts` y `core/auth.service.ts` concentran la lógica en memoria. Para conectar la API,
reemplaza cada método por una llamada `HttpClient` (`provideHttpClient()` en `app.config.ts`) y deja que
el servidor valide también las reglas.
