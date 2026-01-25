import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleBasedGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as string[];
    
    // Si no hay restricción de roles, permitir
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    const userRole = this.auth.getRole();
    
    // SuperAdmin siempre tiene acceso
    if (this.auth.isSuperAdmin()) {
      return true;
    }
    
    // Validar si el rol del usuario está en la lista permitida
    if (requiredRoles.includes(userRole)) {
      return true;
    }
    
    // Denegar acceso
    console.warn(`⛔ Acceso denegado. Se requieren uno de estos roles: ${requiredRoles.join(', ')}. Tu rol: ${userRole}`);
    alert(`⛔ Acceso denegado.\n\nSe requieren uno de estos roles:\n${requiredRoles.join(', ')}\n\nTu rol: ${userRole}`);
    this.router.navigate(['/dashboard']);
    return false;
  }
}
