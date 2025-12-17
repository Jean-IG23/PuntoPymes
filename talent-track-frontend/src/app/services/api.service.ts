import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) { }

  // --- GETs (Listados) ---
  getEmpresas(): Observable<any> { return this.http.get(this.apiUrl + 'empresas/'); }
  getEmpresaById(id: number): Observable<any> { return this.http.get(this.apiUrl + 'empresas/' + id + '/'); }
  
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

  // --- AQUÍ ESTABA EL ERROR: Faltaba getAreas ---
  getAreas(empresaId?: number): Observable<any> {
    let url = this.apiUrl + 'areas/';
    if (empresaId) url += `?empresa=${empresaId}`;
    return this.http.get(url);
  }

  getPuestos(departamentoId?: number, empresaId?: number): Observable<any> { 
    let url = this.apiUrl + 'puestos/?';
    if (departamentoId) url += `departamento=${departamentoId}&`;
    if (empresaId) url += `empresa=${empresaId}&`;
    return this.http.get(url);
  }

  getTurnos(): Observable<any> { return this.http.get(this.apiUrl + 'turnos/'); }
  
  getEmpleados(empresaId?: number, departamentoId?: number): Observable<any> {
    let url = this.apiUrl + 'empleados/';
    if (departamentoId) {
      url += `?departamento=${departamentoId}`;
    } else if (empresaId) {
      url += `?empresa=${empresaId}`;
    }
    return this.http.get(url);
  }

  getStats(): Observable<any> { return this.http.get(this.apiUrl + 'dashboard/stats/'); }

  // --- POSTs (Guardar) ---
  saveEmpresa(data: any): Observable<any> { return this.http.post(this.apiUrl + 'empresas/', data); }
  saveSucursal(data: any): Observable<any> { return this.http.post(this.apiUrl + 'sucursales/', data); }
  saveDepartamento(data: any): Observable<any> { return this.http.post(this.apiUrl + 'departamentos/', data); }
  
  // --- AQUÍ ESTABA EL ERROR: Faltaba saveArea ---
  saveArea(data: any): Observable<any> { return this.http.post(this.apiUrl + 'areas/', data); }
  
  savePuesto(data: any): Observable<any> { return this.http.post(this.apiUrl + 'puestos/', data); }
  saveTurno(data: any): Observable<any> { return this.http.post(this.apiUrl + 'turnos/', data); }
  saveEmpleado(data: any): Observable<any> { return this.http.post(this.apiUrl + 'empleados/', data); }
  
  registrarAsistencia(data: any): Observable<any> { return this.http.post(this.apiUrl + 'marcas/', data); }

  uploadEmpleados(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.apiUrl + 'empleados/upload/', formData);
  }
}