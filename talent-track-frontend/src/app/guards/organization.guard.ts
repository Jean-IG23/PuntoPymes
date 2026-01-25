import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger el módulo de Organización (Org Chart).
 * 
 * REGLA DE NEGOCIO:
 * - Solo ADMIN, RRHH y SUPERADMIN pueden acceder
 * - GERENTE y EMPLEADO NO pueden ver la estructura organizacional
 */
export const organizationGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Verificamos si tiene permisos para ver la organización
  if (auth.canSeeOrganization()) {
    return true; 
  } else {
    // Si es GERENTE o EMPLEADO intentando entrar aquí, lo mandamos al dashboard
    alert('⛔ Acceso Denegado: No tienes permisos para ver la estructura organizacional.');
    router.navigate(['/dashboard']);
    return false;
  }
};
