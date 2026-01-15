import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // Importamos 'of' para mocks rápidos si faltan endpoints
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  
  private baseUrl = 'http://localhost:8000/api'; 

  constructor(private http: HttpClient, private auth: AuthService) { }

  private getHeaders() {
    const token = this.auth.getToken(); 
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // ==========================================
  // 🏢 EMPRESAS
  // ==========================================
  getEmpresas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/empresas/`, this.getHeaders());
  }

  getEmpresaById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/empresas/${id}/`, this.getHeaders());
  }
  
  createEmpresa(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/empresas/`, data, this.getHeaders());
  }

  updateEmpresa(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/empresas/${id}/`, data, this.getHeaders()); 
  }

  saveEmpresa(data: any): Observable<any> {
    if (data.id) return this.updateEmpresa(data.id, data);
    return this.createEmpresa(data);
  }

  // ==========================================
  // 📍 SUCURSALES
  // ==========================================
  getSucursales(empresaId?: number): Observable<any> {
    let url = `${this.baseUrl}/sucursales/`;
    if (empresaId) url += `?empresa=${empresaId}`;
    return this.http.get(url, this.getHeaders());
  }

  createSucursal(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/sucursales/`, data, this.getHeaders());
  }

  updateSucursal(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/sucursales/${id}/`, data, this.getHeaders());
  }

  deleteSucursal(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/sucursales/${id}/`, this.getHeaders());
  }

  saveSucursal(data: any): Observable<any> {
    if (data.id) return this.updateSucursal(data.id, data);
    return this.createSucursal(data);
  }

  // ==========================================
  // 🏷️ ÁREAS
  // ==========================================
  getAreas(empresaId?: number): Observable<any> {
    let url = `${this.baseUrl}/areas/`;
    if (empresaId) url += `?empresa=${empresaId}`;
    return this.http.get(url, this.getHeaders());
  }

  createArea(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/areas/`, data, this.getHeaders());
  }

  updateArea(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/areas/${id}/`, data, this.getHeaders());
  }

  deleteArea(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/areas/${id}/`, this.getHeaders());
  }

  saveArea(data: any): Observable<any> {
    if (data.id) return this.updateArea(data.id, data);
    return this.createArea(data);
  }

  // ==========================================
  // 📂 DEPARTAMENTOS
  // ==========================================
  getDepartamentos(sucursalId?: number): Observable<any> {
    let url = `${this.baseUrl}/departamentos/`;
    if (sucursalId) url += `?sucursal=${sucursalId}`;
    return this.http.get(url, this.getHeaders());
  }

  createDepartamento(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/departamentos/`, data, this.getHeaders());
  }

  updateDepartamento(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/departamentos/${id}/`, data, this.getHeaders());
  }

  deleteDepartamento(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/departamentos/${id}/`, this.getHeaders());
  }

  saveDepartamento(data: any): Observable<any> {
    if (data.id) return this.updateDepartamento(data.id, data);
    return this.createDepartamento(data);
  }

  // ==========================================
  // 💼 PUESTOS (CARGOS)
  // ==========================================
  getPuestos(areaId?: number, empresaId?: number): Observable<any> {
    let url = `${this.baseUrl}/puestos/`;
    const params: string[] = [];
    if (areaId) params.push(`area=${areaId}`);
    if (empresaId) params.push(`empresa=${empresaId}`);
    if (params.length > 0) url += '?' + params.join('&');
    return this.http.get(url, this.getHeaders());
  }

  createPuesto(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/puestos/`, data, this.getHeaders());
  }

  updatePuesto(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/puestos/${id}/`, data, this.getHeaders());
  }

  deletePuesto(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/puestos/${id}/`, this.getHeaders());
  }

  savePuesto(data: any): Observable<any> {
    if (data.id) return this.updatePuesto(data.id, data);
    return this.createPuesto(data);
  }

  // ==========================================
  // ⏰ TURNOS & JORNADAS
  // ==========================================
  getTurnos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/turnos/`, this.getHeaders());
  }

  createTurno(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/turnos/`, data, this.getHeaders());
  }

  updateTurno(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/turnos/${id}/`, data, this.getHeaders());
  }

  deleteTurno(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/turnos/${id}/`, this.getHeaders());
  }

  saveTurno(data: any): Observable<any> {
    if (data.id) return this.updateTurno(data.id, data);
    return this.createTurno(data);
  }

  getJornadas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/asistencia/jornadas/`, this.getHeaders());
  }

  // ==========================================
  // 👥 EMPLEADOS (CRUD COMPLETO)
  // ==========================================
  getEmpleados(empresaId?: any, departamentoId?: any): Observable<any> {
    let url = `${this.baseUrl}/empleados/`;
    const params: string[] = [];
    if (empresaId) params.push(`empresa=${empresaId}`);
    if (departamentoId) params.push(`departamento=${departamentoId}`);
    if (params.length > 0) url += '?' + params.join('&');
    return this.http.get(url, this.getHeaders());
  }

  getEmpleadosSimple(): Observable<any> {
    return this.http.get(`${this.baseUrl}/empleados/`, this.getHeaders());
  }

  getEmpleado(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/empleados/${id}/`, this.getHeaders());
  }

  createEmpleado(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/empleados/`, data, this.getHeaders());
  }

  updateEmpleado(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/empleados/${id}/`, data, this.getHeaders());
  }

  uploadEmpleados(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/empleados/upload_excel/`, formData, this.getHeaders());
  }

  downloadPlantilla(): void {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth.getToken()}`
    });
    this.http.get(`${this.baseUrl}/empleados/download_plantilla/`, { 
      headers: headers, 
      responseType: 'blob' 
    }).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_empleados.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // ==========================================
  // 🗓️ SOLICITUDES
  // ==========================================
  getSolicitudes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/solicitudes/`, this.getHeaders());
  }

  createSolicitud(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/solicitudes/`, data, this.getHeaders());
  }

  updateSolicitud(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/solicitudes/${id}/`, data, this.getHeaders());
  }

  saveSolicitud(data: any): Observable<any> {
    if (data.id) return this.updateSolicitud(data.id, data);
    return this.createSolicitud(data);
  }

  gestionarSolicitud(id: number, estado: string, motivo: string = ''): Observable<any> {
    const payload = { estado: estado, motivo: motivo };
    return this.http.post(`${this.baseUrl}/solicitudes/${id}/gestionar/`, payload, this.getHeaders());
  }

  getTiposAusencia(): Observable<any> {
    return this.http.get(`${this.baseUrl}/tipos-ausencia/`, this.getHeaders());
  }

  createTipoAusencia(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/tipos-ausencia/`, data, this.getHeaders());
  }

  deleteTipoAusencia(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tipos-ausencia/${id}/`, this.getHeaders());
  }

  // ==========================================
  // 🕒 ASISTENCIA
  // ==========================================
  marcarAsistencia(lat: number, lng: number): Observable<any> {
    const data = {
      latitud: lat,
      longitud: lng,
      timestamp: new Date().toISOString()
    };
    return this.http.post(`${this.baseUrl}/asistencia/marcar/`, data, this.getHeaders());
  }

  registrarAsistencia(data: any): Observable<any> {
    if(data.latitud && data.longitud) {
       return this.marcarAsistencia(data.latitud, data.longitud);
    }
    return this.http.post(`${this.baseUrl}/asistencia/marcar/`, data, this.getHeaders());
  }

  // ==========================================
  // 📊 DASHBOARD / STATS
  // ==========================================
  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/stats/`, this.getHeaders());
  }

  // ==========================================
  // 📈 KPIs & OBJETIVOS (Legacy)
  // ==========================================
  getKPIs(): Observable<any> {
    return this.http.get(`${this.baseUrl}/kpis/`, this.getHeaders());
  }

  saveKPI(data: any): Observable<any> {
    if(data.id) return this.http.put(`${this.baseUrl}/kpis/${data.id}/`, data, this.getHeaders());
    return this.http.post(`${this.baseUrl}/kpis/`, data, this.getHeaders());
  }

  deleteKPI(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/kpis/${id}/`, this.getHeaders());
  }

  saveResultadoKPI(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/kpis/resultados/`, data, this.getHeaders());
  }

  getObjetivos(empleadoId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/objetivos/?empleado=${empleadoId}`, this.getHeaders());
  }

  saveObjetivo(data: any): Observable<any> {
    if(data.id) return this.http.put(`${this.baseUrl}/objetivos/${data.id}/`, data, this.getHeaders());
    return this.http.post(`${this.baseUrl}/objetivos/`, data, this.getHeaders());
  }

}