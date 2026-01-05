import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders,HttpParams  } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Única URL Base (Coincide con urls.py de Django)
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient, private auth: AuthService) { }

  //Helper para enviar el Token en cada petición
  private getHeaders() {
    const token = this.auth.getToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }
  getStats(): Observable<any> {
    // Conecta con la vista DashboardStatsView de Django
    return this.http.get(this.apiUrl + 'dashboard/stats/', this.getHeaders());
  }

  // ==========================================
  // 1. MÓDULO CORE (Estructura Empresa)
  // ==========================================
  
  // Empresas
  getEmpresas(): Observable<any> { return this.http.get(this.apiUrl + 'empresas/', this.getHeaders()); }
  getEmpresaById(id: number): Observable<any> { 
    return this.http.get(this.apiUrl + 'empresas/' + id + '/', this.getHeaders()); 
  }
  saveEmpresa(data: any): Observable<any> { return this.http.post(this.apiUrl + 'empresas/', data, this.getHeaders()); }

  // Sucursales
  getSucursales(empresaId?: number): Observable<any> {
    let url = this.apiUrl + 'sucursales/';
    if (empresaId) url += `?empresa=${empresaId}`;
    return this.http.get(url, this.getHeaders());
  }
  saveSucursal(data: any): Observable<any> { return this.http.post(this.apiUrl + 'sucursales/', data, this.getHeaders()); }

  // Áreas
  getAreas(empresaId?: number): Observable<any> {
    let url = this.apiUrl + 'areas/';
    if (empresaId) url += `?empresa=${empresaId}`;
    return this.http.get(url, this.getHeaders());
  }
  saveArea(data: any): Observable<any> { return this.http.post(this.apiUrl + 'areas/', data, this.getHeaders()); }

  // Departamentos
  getDepartamentos(sucursalId?: number): Observable<any> {
      let params = new HttpParams();
      if (sucursalId) params = params.set('sucursal', sucursalId.toString());
      return this.http.get(this.apiUrl + 'departamentos/', { headers: this.getHeaders().headers, params });
  }
  saveDepartamento(data: any): Observable<any> { return this.http.post(this.apiUrl + 'departamentos/', data, this.getHeaders()); }

  // Puestos
  getPuestos(departamentoId?: number, empresaId?: number): Observable<any> {
    let params = new HttpParams();
    if (departamentoId) params = params.set('departamento', departamentoId.toString());
    if (empresaId) params = params.set('empresa', empresaId.toString());

    return this.http.get(this.apiUrl + 'puestos/', { headers: this.getHeaders().headers, params });
  }
  savePuesto(data: any): Observable<any> { return this.http.post(this.apiUrl + 'puestos/', data, this.getHeaders()); }

  // Turnos
  getTurnos(): Observable<any> { return this.http.get(this.apiUrl + 'turnos/', this.getHeaders()); }
  saveTurno(data: any): Observable<any> { return this.http.post(this.apiUrl + 'turnos/', data, this.getHeaders()); }
  deleteTurno(id: number): Observable<any> { return this.http.delete(this.apiUrl + 'turnos/' + id + '/', this.getHeaders()); }

  // ==========================================
  // 2. MÓDULO PERSONAL (Gente)
  // ==========================================

  // Empleados
  getEmpleados(empresaId?: number, deptoId?: number): Observable<any> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa', empresaId.toString());
    if (deptoId) params = params.set('departamento', deptoId.toString());
    
    return this.http.get(this.apiUrl + 'empleados/', { headers: this.getHeaders().headers, params });
  }

  saveEmpleado(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'empleados/', data, this.getHeaders());
  }

  // Carga Masiva (Excel) - Nota: FormData requiere headers especiales, Angular los maneja pero necesita Auth
  updateEmpleado(id: number, data: any): Observable<any> {
    return this.http.put(this.apiUrl + `empleados/${id}/`, data, this.getHeaders());
  }
  uploadEmpleados(archivo: File): Observable<any> {
    const formData = new FormData();
    // 'archivo' es el nombre que Django esperará en request.FILES['archivo']
    formData.append('archivo', archivo); 
    return this.http.post(this.apiUrl + 'empleados/importar_excel/', formData);
  }

  // Solicitudes (Vacaciones)
  getSolicitudes(): Observable<any> { return this.http.get(this.apiUrl + 'solicitudes/', this.getHeaders()); }
  saveSolicitud(data: any): Observable<any> { return this.http.post(this.apiUrl + 'solicitudes/', data, this.getHeaders()); }
  updateSolicitud(id: number, data: any): Observable<any> { return this.http.patch(this.apiUrl + 'solicitudes/' + id + '/', data, this.getHeaders()); }

  // Tipos de Ausencia
  getTiposAusencia(): Observable<any> { return this.http.get(this.apiUrl + 'tipos-ausencia/', this.getHeaders()); }

  // ==========================================
  // 3. MÓDULO ASISTENCIA (Reloj)
  // ==========================================

  marcarAsistencia(lat: number, lng: number): Observable<any> {
    // Apunta al ViewSet nuevo en asistencia/views.py
    return this.http.post(this.apiUrl + 'asistencia/marcar/', { lat, lng }, this.getHeaders());
  }

  registrarAsistencia(data: any): Observable<any> {
    // Si el componente viejo manda un objeto completo, extraemos lat/lng o lo mandamos directo
    return this.http.post(this.apiUrl + 'asistencia/marcar/', data, this.getHeaders());
  }

  getHistorialAsistencia(): Observable<any> {
    return this.http.get(this.apiUrl + 'asistencia/', this.getHeaders());
  }

  getJornadas(): Observable<any> {
    return this.http.get(this.apiUrl + 'jornadas/', this.getHeaders());
  }

  // ==========================================
  // 4. MÓDULO KPI (Evaluaciones y Objetivos)
  // ==========================================

  // Objetivos
  getObjetivos(empleadoId?: number): Observable<any> {
    let url = this.apiUrl + 'objetivos/';
    if (empleadoId) url += `?empleado=${empleadoId}`; 
    return this.http.get(url, this.getHeaders());
  }

  saveObjetivo(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'objetivos/', data, this.getHeaders());
  }

  updateObjetivo(id: number, data: any): Observable<any> {
    return this.http.patch(this.apiUrl + 'objetivos/' + id + '/', data, this.getHeaders());
  }

  deleteObjetivo(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + 'objetivos/' + id + '/', this.getHeaders());
  }

  // Configuración de KPIs
  getKPIs(): Observable<any> { return this.http.get(this.apiUrl + 'kpis/', this.getHeaders()); }
  saveKPI(data: any): Observable<any> { return this.http.post(this.apiUrl + 'kpis/', data, this.getHeaders()); }
  deleteKPI(id: number): Observable<any> { return this.http.delete(this.apiUrl + 'kpis/' + id + '/', this.getHeaders()); }
  saveResultadoKPI(data: any): Observable<any> {
     // Nota: Asegúrate de tener este endpoint en Backend o usa DetalleEvaluacion
     return this.http.post(this.apiUrl + 'resultados-kpi/', data, this.getHeaders());
  }
  // Evaluaciones (Boletín)
  getEvaluaciones(empleadoId?: number): Observable<any> {
    let url = this.apiUrl + 'evaluaciones/';
    if (empleadoId) url += `?empleado=${empleadoId}`;
    return this.http.get(url, this.getHeaders());
  }

  // EL CEREBRO: Dispara el cálculo automático
  generarCierreMensual(empleadoId: number, mes: number, anio: number): Observable<any> {
    return this.http.post(this.apiUrl + 'evaluaciones/generar_cierre/', {
      empleado_id: empleadoId,
      mes: mes,
      anio: anio
    }, this.getHeaders());
  }
  
}