import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private auth: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    
    // 1. EXCEPCIÓN: Si la petición va a /login, NO adjuntar token.
    if (request.url.includes('/login')) {
        return next.handle(request);
    }

    // 2. Obtener token
    const token = this.auth.getToken();

    if (token) {
      // Clonar y adjuntar header
      const authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            // Si el token expiró o es inválido (401), cerrar sesión
            if (error.status === 401) {
                this.auth.logout(); 
            }
            return throwError(() => error);
        })
      );
    }

    return next.handle(request);
  }
}