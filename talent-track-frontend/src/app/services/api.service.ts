import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) { }

  // 1. Obtener lista (Ya lo tenías)
  getEmpleados(departamentoId?: number): Observable<any> {
    let url = this.apiUrl + 'empleados/';
    if (departamentoId) url += `?departamento=${departamentoId}`;
    return this.http.get(url);
  }

  // 2. GUARDAR NUEVO (Agrega esto) 👇
  saveEmpleado(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'empleados/', data);
  }

  // 3. OBTENER CATÁLOGOS (Para los selects del formulario) 👇
  getSucursales(empresaId?: number): Observable<any> {
    let url = this.apiUrl + 'sucursales/';
    if (empresaId) url += `?empresa=${empresaId}`;
    return this.http.get(url);
  }

  getDepartamentos(sucursalId?: number): Observable<any> {
    let url = this.apiUrl + 'departamentos/';
    if (sucursalId) url += `?sucursal=${sucursalId}`;
    return this.http.get(url);
  }
  getPuestos(): Observable<any> { return this.http.get(this.apiUrl + 'puestos/'); }
  getEmpresas(): Observable<any> { return this.http.get(this.apiUrl + 'empresas/'); }


  getTurnos(): Observable<any> { 
  return this.http.get(this.apiUrl + 'turnos/'); 
}
// ... métodos anteriores ...

  // GUARDAR EMPRESA
  saveEmpresa(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'empresas/', data);
  }

  // GUARDAR SUCURSAL
  saveSucursal(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'sucursales/', data);
  }

  // GUARDAR DEPARTAMENTO
  saveDepartamento(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'departamentos/', data);
  }
  
  // GUARDAR PUESTO
  savePuesto(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'puestos/', data);
  }
  
  // GUARDAR TURNO
  saveTurno(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'turnos/', data);
  }
}


