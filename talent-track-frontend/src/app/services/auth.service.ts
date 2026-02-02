import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError, timeout } from 'rxjs';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrl = 'http://127.0.0.1:8000/api/'; 
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient, private router: Router) { }

  // --- LOGIN Y GESTIÓN DE SESIÓN ---
  login(credentials: any): Observable<any> {
    localStorage.removeItem(this.tokenKey); 
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('empresa_id');

    return this.http.post(this.apiUrl + 'login/', credentials).pipe(
      // FIX: Timeout de 10 segundos para evitar bucles infinitos
      timeout(10000),
      tap((response: any) => {
        if (response.token) {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem('user_role', response.role); 
          
          if (response.empresa_id) {
            localStorage.setItem('empresa_id', String(response.empresa_id));
            if (response.nombre_empresa) {
                localStorage.setItem('nombre_empresa', response.nombre_empresa);
            }
          }

          if (response.user) {
            this.saveUser(response.user);
          }
        }
      }),
      // FIX: Manejo de errores para evitar bucles
      catchError((error) => {
        // Limpiar cualquier dato guardado en caso de error
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem('user');
        localStorage.removeItem('user_role');
        localStorage.removeItem('empresa_id');
        // Propagar el error para que el componente lo maneje
        return throwError(() => error);
      })
    );
  }

  logout() {
    localStorage.clear(); 
    this.router.navigate(['/login']);
  }

  // --- MANEJO DE USUARIO ---
  saveUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // --- GESTIÓN DE TOKENS ---
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ==========================================
  //      GESTIÓN DE ROLES Y PERMISOS
  // ==========================================
  
  getRole(): string {
    return localStorage.getItem('user_role') || '';
  }

  // 1. ROLES ESPECÍFICOS (Indispensables para validaciones puntuales)
  isSuperAdmin(): boolean { return this.getRole() === 'SUPERADMIN'; } // <--- ESTE FALTABA
  isGerente(): boolean { return this.getRole() === 'GERENTE'; }
  isRRHH(): boolean { return this.getRole() === 'RRHH'; }
  isEmployee(): boolean { return this.getRole() === 'EMPLEADO'; }

  // 2. NIVELES JERÁRQUICOS (Para lógica de negocio agrupada)

  // NIVEL DIOS: SuperAdmin (SaaS) y Admin (Dueño Empresa)
  // Tienen acceso a facturación y datos sensibles.
  isAdminLevel(): boolean {
    const role = this.getRole();
    return role === 'SUPERADMIN' || role === 'ADMIN'; 
  }

  // NIVEL CONFIGURACIÓN: Dueño + RRHH
  // Pueden crear turnos, sucursales, puestos y contratar.
  canConfigCompany(): boolean {
    const user = this.getUser();
    if (!user) return false;
    
    // Si es SuperAdmin de Django, pase libre
    if (this.isSuperAdmin()) return true;

    // Roles permitidos para configurar catálogos
    const rolesPermitidos = ['ADMIN', 'CLIENTE', 'RRHH'];
    return rolesPermitidos.includes(user.rol);
  }

  // NIVEL SUPERVISIÓN: Dueño + RRHH + Gerente
  // Pueden ver listas de empleados, aprobar vacaciones, ver dashboard de equipo.
  isManagement(): boolean {
    const role = this.getRole();
    return ['SUPERADMIN', 'ADMIN', 'RRHH', 'GERENTE'].includes(role);
  }

  // Helper para mostrar paneles administrativos generales
  canAccessPanel(): boolean {
    return this.isManagement(); 
  }

  // Helper legacy (si lo usas en algún lado para identificar Admin de Empresa)
  isCompanyAdmin(): boolean {
    const role = this.getRole();
    return role === 'ADMIN' || role === 'SUPERADMIN';
  }

  // --- DATOS DE EMPRESA ---
  getEmpresaId(): number | null {
    const id = localStorage.getItem('empresa_id');
    return id ? Number(id) : null;
  }

  // ==========================================
  //      RESTRICCIONES DE MÓDULOS (RBAC)
  // ==========================================

  /**
   * Verifica si el usuario puede ver el módulo de Organización (Org Chart).
   * REGLA: Solo ADMIN, RRHH y SUPERADMIN pueden ver este módulo.
   * GERENTE y EMPLEADO NO pueden verlo.
   */
  canSeeOrganization(): boolean {
    const role = this.getRole();
    // Solo estos roles pueden ver la estructura organizacional
    return ['SUPERADMIN', 'ADMIN', 'RRHH'].includes(role);
  }

  /**
   * Verifica si el usuario puede ver el módulo de Empleados.
   * REGLA: EMPLEADO no puede ver la lista de empleados.
   */
  canSeeEmployees(): boolean {
    const role = this.getRole();
    return ['SUPERADMIN', 'ADMIN', 'RRHH', 'GERENTE'].includes(role);
  }

  /**
   * Verifica si el usuario puede crear/editar objetivos y tareas.
   * REGLA: EMPLEADO solo puede ver y actualizar progreso, no crear.
   */
  canCreateObjectives(): boolean {
    const role = this.getRole();
    return ['SUPERADMIN', 'ADMIN', 'RRHH', 'GERENTE'].includes(role);
  }

  /**
   * Verifica si el usuario puede aprobar solicitudes de ausencia.
   * REGLA: Solo GERENTE, RRHH, ADMIN y SUPERADMIN pueden aprobar.
   */
  canApproveRequests(): boolean {
    const role = this.getRole();
    return ['SUPERADMIN', 'ADMIN', 'RRHH', 'GERENTE'].includes(role);
  }

  /**
   * Verifica si el usuario puede ver el módulo de Nómina.
   * REGLA: GERENTE no puede ver nómina, los demás sí (con diferentes permisos).
   */
  canSeePayroll(): boolean {
    const role = this.getRole();
    return ['SUPERADMIN', 'ADMIN', 'RRHH', 'EMPLEADO'].includes(role);
  }
}