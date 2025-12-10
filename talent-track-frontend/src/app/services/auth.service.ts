import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api/login/';
  private tokenKey = 'auth_token'; // Nombre para guardar en el navegador

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: any): Observable<any> {
    return this.http.post(this.apiUrl, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          localStorage.setItem(this.tokenKey, response.token);
          
          // Guardamos los roles
          localStorage.setItem('es_superadmin', String(response.es_superadmin));
          localStorage.setItem('es_admin_empresa', String(response.es_admin_empresa)); // <--- NUEVO
          if (response.empresa_id) {
            localStorage.setItem('empresa_id', String(response.empresa_id));
            localStorage.setItem('nombre_empresa', response.nombre_empresa);
          }
        }
      })
    );
  }
  isAdmin(): boolean {
    const superAdmin = localStorage.getItem('es_superadmin') === 'true';
    const companyAdmin = localStorage.getItem('es_admin_empresa') === 'true';
    return superAdmin || companyAdmin;
  }
  isSuperAdmin(): boolean {
    const value = localStorage.getItem('es_superadmin');
    // Comparación estricta con el texto "true"
    return value === 'true';
  }
  getEmpresaId(): number | null {
    const id = localStorage.getItem('empresa_id');
    return id ? Number(id) : 0;
  }

  logout() {
    localStorage.removeItem('auth_token'); // <--- BORRAR LA LLAVE
    this.router.navigate(['/login']);      // <--- REDIRIGIR AL LOGIN
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken(); // Devuelve true si hay token
  }

  isCompanyAdmin(): boolean {
    return localStorage.getItem('es_admin_empresa') === 'true';
  }
}