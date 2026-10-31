import { HttpInterceptorFn } from '@angular/common/http';

export const API_URL = 'http://localhost:3000/api';
export const CLAVE_TOKEN = 'fisionova.token';

/** Añade el token a cada petición hacia la API. */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;
  try { token = sessionStorage.getItem(CLAVE_TOKEN); } catch { /* sin almacenamiento */ }
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};