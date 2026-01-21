import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
// 1. Quitamos 'withFetch' de los imports porque ya no lo usamos
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './services/token.interceptor'; // Confirma que la ruta sea correcta
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([tokenInterceptor]) 
    ),
    provideCharts(withDefaultRegisterables())
  ]
};