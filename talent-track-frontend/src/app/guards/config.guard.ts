import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const configGuard: CanActivateFn = (route, state) => {
  // Inyectamos los servicios necesarios
  const auth = inject(AuthService);
  const router = inject(Router);

  // PREGUNTA: ¿Tiene permisos de configuración?
  if (auth.canConfigCompany()) {
    return true; // ¡Adelante, pase!
  } else {
    // RESPUESTA: No, acceso denegado.
    alert('⛔ Acceso restringido. Solo Administradores y RRHH.');
    router.navigate(['/dashboard']); // Lo devolvemos al dashboard
    return false;
  }
};