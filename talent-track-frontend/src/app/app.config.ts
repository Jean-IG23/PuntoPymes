import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
// IMPORTAR ESTOS DOS:
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './services/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // CAMBIAR ESTA LÍNEA ASÍ:
    provideHttpClient(
      withFetch(),
      withInterceptors([tokenInterceptor]) // <--- AQUÍ ACTIVAMOS EL INTERCEPTOR
    )
  ]
};