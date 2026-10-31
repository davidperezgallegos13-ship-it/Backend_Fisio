import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Modulo, puede } from './permisos';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.usuario() ? true : router.createUrlTree(['/ingresar']);
};

export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.usuario() ? router.createUrlTree(['/']) : true;
};

/** RF-05: cada rol solo entra a los módulos que tiene habilitados. */
export const moduloGuard =
  (modulo: Modulo): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return puede(auth.usuario()?.rol, modulo) ? true : router.createUrlTree(['/']);
  };
