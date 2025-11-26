import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) { }

  // 1. Obtener lista (Ya lo tenías)
  getEmpleados(): Observable<any> {
    return this.http.get(this.apiUrl + 'empleados/');
  }

  // 2. GUARDAR NUEVO (Agrega esto) 👇
  saveEmpleado(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'empleados/', data);
  }

  // 3. OBTENER CATÁLOGOS (Para los selects del formulario) 👇
  getDepartamentos(): Observable<any> { return this.http.get(this.apiUrl + 'departamentos/'); }
   getSucursales(): Observable<any> { return this.http.get(this.apiUrl + 'sucursales/'); }
  getPuestos(): Observable<any> { return this.http.get(this.apiUrl + 'puestos/'); }
  getEmpresas(): Observable<any> { return this.http.get(this.apiUrl + 'empresas/'); }


  getTurnos(): Observable<any> { 
  return this.http.get(this.apiUrl + 'turnos/'); 
}
}

