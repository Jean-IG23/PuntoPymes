import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
// 1. Quitamos 'withFetch' de los imports porque ya no lo usamos
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './services/token.interceptor'; // Confirma que la ruta sea correcta

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    
    // 2. Configuración HTTP estable (Sin withFetch)
    provideHttpClient(
      withInterceptors([tokenInterceptor]) 
    )
  ]
};