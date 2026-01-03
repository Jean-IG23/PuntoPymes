import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) { }

  // --- GETs (Listados Generales) ---
  getEmpresas(): Observable<any> { return this.http.get(this.apiUrl + 'empresas/'); }
  getEmpresaById(id: number): Observable<any> { return this.http.get(this.apiUrl + 'empresas/' + id + '/'); }
  
  getSucursales(empresaId?: number): Observable<any> {
    let url = this.apiUrl + 'sucursales/';
    if (empresaId) url += `?empresa=${empresaId}`;
    return this.http.get(url);
  }

  // Atajo útil para obtener sucursales directas
  getSucursalesEmpresa(empresaId: number): Observable<any> {
    return this.http.get(this.apiUrl + 'sucursales/?empresa=' + empresaId);
  }

  getDepartamentos(sucursalId?: number): Observable<any> {
    let url = this.apiUrl + 'departamentos/';
    if (sucursalId) url += `?sucursal=${sucursalId}`;
    return this.http.get(url);
  }

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

  // --- TURNOS / HORARIOS ---
  getTurnos(): Observable<any> { return this.http.get(this.apiUrl + 'turnos/'); }
  saveTurno(data: any): Observable<any> { return this.http.post(this.apiUrl + 'turnos/', data); }
  deleteTurno(id: number): Observable<any> { return this.http.delete(this.apiUrl + 'turnos/' + id + '/'); }
  
  // --- EMPLEADOS ---
  getEmpleados(empresaId?: number, departamentoId?: number): Observable<any> {
    let url = this.apiUrl + 'empleados/';
    if (departamentoId) {
      url += `?departamento=${departamentoId}`;
    } else if (empresaId) {
      url += `?empresa=${empresaId}`;
    }
    return this.http.get(url);
  }

  saveEmpleado(data: any): Observable<any> { return this.http.post(this.apiUrl + 'empleados/', data); }
  
  uploadEmpleados(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.apiUrl + 'empleados/upload/', formData);
  }

  // --- DASHBOARD & SOLICITUDES ---
  getStats(): Observable<any> { return this.http.get(this.apiUrl + 'dashboard/stats/'); }
  getSolicitudes(): Observable<any> { return this.http.get(this.apiUrl + 'solicitudes/'); }
  saveSolicitud(data: any): Observable<any> { return this.http.post(this.apiUrl + 'solicitudes/', data); }
  updateSolicitud(id: number, data: any): Observable<any> { return this.http.patch(this.apiUrl + 'solicitudes/' + id + '/', data); }
  
  // --- POSTs GENÉRICOS (Guardar) ---
  saveEmpresa(data: any): Observable<any> { return this.http.post(this.apiUrl + 'empresas/', data); }
  saveSucursal(data: any): Observable<any> { return this.http.post(this.apiUrl + 'sucursales/', data); }
  saveDepartamento(data: any): Observable<any> { return this.http.post(this.apiUrl + 'departamentos/', data); }
  saveArea(data: any): Observable<any> { return this.http.post(this.apiUrl + 'areas/', data); }
  savePuesto(data: any): Observable<any> { return this.http.post(this.apiUrl + 'puestos/', data); }

  // --- ASISTENCIA ---
  registrarAsistencia(data: any): Observable<any> { return this.http.post(this.apiUrl + 'marcas/', data); }

  // 👇👇👇 AQUÍ ESTÁ LO NUEVO QUE FALTABA (KPIs) 👇👇👇
  
  // --- GESTIÓN DE KPIS ---
  getKPIs(): Observable<any> {
    return this.http.get(this.apiUrl + 'kpis/');
  }

  saveKPI(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'kpis/', data);
  }

  deleteKPI(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + 'kpis/' + id + '/');
  }

  // --- RESULTADOS / EVALUACIONES ---
  saveResultadoKPI(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'resultados-kpi/', data);
  }
}