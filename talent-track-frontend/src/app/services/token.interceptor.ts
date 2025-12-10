import { HttpInterceptorFn } from '@angular/common/http';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Obtener el token del almacenamiento
  const token = localStorage.getItem('auth_token');
  console.log('👮‍♂️ INTERCEPTOR: Intentando enviar petición a', req.url, '| Token:', token ? 'SI TIENE' : 'NO TIENE');
  // 2. Si existe token, clonamos la petición y le pegamos el encabezado
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Token ${token}`)
    });
    return next(authReq);
  }

  // 3. Si no hay token, dejamos pasar la petición tal cual (ej. Login)
  return next(req);
};