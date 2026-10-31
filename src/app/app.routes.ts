import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { authGuard, invitadoGuard, moduloGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'ingresar',
    canActivate: [invitadoGuard],
    title: 'Ingresar · FisioNova',
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    title: 'Crear cuenta · FisioNova',
    data: { modo: 'registro' },
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: 'explorar',
    title: 'Conoce tu cuerpo · FisioNova',
    loadComponent: () => import('./pages/explorar').then((m) => m.Explorar),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        // Cada rol aterriza en su propio inicio.
        redirectTo: () => (inject(AuthService).usuario()?.rol === 'Paciente' ? 'portal' : 'inicio'),
      },

      // Personal
      {
        path: 'inicio',
        title: 'Inicio · FisioNova',
        canActivate: [moduloGuard('inicio')],
        loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'citas',
        title: 'Citas · FisioNova',
        canActivate: [moduloGuard('citas')],
        loadComponent: () => import('./pages/citas').then((m) => m.Citas),
      },
      {
        path: 'pacientes',
        title: 'Pacientes · FisioNova',
        canActivate: [moduloGuard('pacientes')],
        loadComponent: () => import('./pages/pacientes').then((m) => m.Pacientes),
      },
      {
        path: 'paquetes',
        title: 'Paquetes · FisioNova',
        canActivate: [moduloGuard('paquetes')],
        loadComponent: () => import('./pages/paquetes').then((m) => m.Paquetes),
      },
      {
        path: 'reportes',
        title: 'Reportes · FisioNova',
        canActivate: [moduloGuard('reportes')],
        loadComponent: () => import('./pages/reportes').then((m) => m.Reportes),
      },
      {
        path: 'personal',
        title: 'Personal y servicios · FisioNova',
        canActivate: [moduloGuard('personal')],
        loadComponent: () => import('./pages/personal').then((m) => m.Personal),
      },

      {
        path: 'guia',
        title: 'Guía del cuerpo · FisioNova',
        canActivate: [moduloGuard('guia')],
        loadComponent: () => import('./pages/explorar').then((m) => m.Explorar),
      },

      // Portal del paciente
      {
        path: 'portal',
        title: 'Inicio · FisioNova',
        canActivate: [moduloGuard('portal')],
        loadComponent: () => import('./pages/portal').then((m) => m.PortalInicio),
      },
      {
        path: 'mis-citas',
        title: 'Mis citas · FisioNova',
        canActivate: [moduloGuard('mis-citas')],
        loadComponent: () => import('./pages/portal').then((m) => m.MisCitas),
      },
      {
        path: 'mis-paquetes',
        title: 'Mis paquetes · FisioNova',
        canActivate: [moduloGuard('mis-paquetes')],
        loadComponent: () => import('./pages/portal').then((m) => m.MisPaquetes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
