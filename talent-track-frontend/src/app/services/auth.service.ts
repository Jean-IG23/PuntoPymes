import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api/login/';
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: any): Observable<any> {
    return this.http.post(this.apiUrl, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          // 1. Guardar Token y Rol Principal
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem('user_role', response.role); // 'SUPERADMIN', 'CLIENT', 'MANAGER', 'EMPLOYEE'
          
          // 2. Guardar Datos de Empresa (si existen)
          if (response.empresa_id) {
            localStorage.setItem('empresa_id', String(response.empresa_id));
            localStorage.setItem('nombre_empresa', response.nombre_empresa);
          } else {
            // Limpiar datos viejos por seguridad
            localStorage.removeItem('empresa_id');
            localStorage.removeItem('nombre_empresa');
          }
        }
      })
    );
  }

  // --- GESTIÓN DE TOKENS ---
  logout() {
    localStorage.clear(); // Borra todo (Token, Roles, IDs)
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // --- GESTIÓN DE ROLES (Lógica Unificada) ---
  
  getRole(): string {
    return localStorage.getItem('user_role') || '';
  }

  // Roles Específicos
  isSuperAdmin(): boolean { return this.getRole() === 'SUPERADMIN'; }
  isClient(): boolean { return this.getRole() === 'CLIENT'; }   // Dueño
  isManager(): boolean { return this.getRole() === 'MANAGER'; } // Gerente
  isEmployee(): boolean { return this.getRole() === 'EMPLOYEE'; } // Empleado base

  // Permiso para ver el Panel Administrativo (Sidebar)
  // El empleado normal NO entra aquí, va directo a su portal
  canAccessPanel(): boolean {
    const role = this.getRole();
    return role === 'SUPERADMIN' || role === 'CLIENT' || role === 'MANAGER'; 
  }

  // Helper para saber si es "Admin de Empresa" (Dueño o Gerente)
  isCompanyAdmin(): boolean {
    const role = this.getRole();
    return role === 'CLIENT' || role === 'MANAGER';
  }

  // --- DATOS DE EMPRESA ---
  getEmpresaId(): number {
    const id = localStorage.getItem('empresa_id');
    return id ? Number(id) : 0;
  }
}