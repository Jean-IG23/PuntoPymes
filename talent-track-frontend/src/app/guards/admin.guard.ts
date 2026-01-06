import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Verificamos si tiene permisos de gestión (Dueño, RRHH, Gerente)
  if (auth.isManagement()) {
    return true; 
  } else {
    // Si es empleado raso intentando entrar aquí, lo mandamos al dashboard
    alert('⛔ Acceso Denegado: Se requieren permisos administrativos.');
    router.navigate(['/dashboard']);
    return false;
  }
};