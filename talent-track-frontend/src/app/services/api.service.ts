import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Única URL Base (Coincide con urls.py de Django)
  private apiUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient, private auth: AuthService) { }

  // Helper para enviar el Token en cada petición
  private getHeaders() {
    const token = this.auth.getToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // ==========================================
  // 0. DASHBOARD
  // ==========================================
  getStats(): Observable<any> {
    return this.http.get(this.apiUrl + 'dashboard/stats/', this.getHeaders());
  }

  // ==========================================
  // 1. MÓDULO CORE (Estructura Empresa)
  // ==========================================
  
  // Empresas
  getEmpresas(): Observable<any> { return this.http.get(this.apiUrl + 'empresas/', this.getHeaders()); }
  
  createEmpresa(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'empresas/', data, this.getHeaders());
  }

  getEmpresaById(id: number): Observable<any> { 
    return this.http.get(this.apiUrl + 'empresas/' + id + '/', this.getHeaders()); 
  }
  
  saveEmpresa(data: any): Observable<any> { return this.http.post(this.apiUrl + 'empresas/', data, this.getHeaders()); }
  
  updateEmpresa(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}empresas/${id}/`, data, this.getHeaders());
  }

  deleteEmpresa(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}empresas/${id}/`, this.getHeaders());
  }
  
  // Sucursales
  getSucursales(empresaId?: number): Observable<any> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa', empresaId.toString());
    return this.http.get(this.apiUrl + 'sucursales/', { headers: this.getHeaders().headers, params });
  }
  saveSucursal(data: any): Observable<any> { return this.http.post(this.apiUrl + 'sucursales/', data, this.getHeaders()); }

  // Áreas
  getAreas(empresaId?: number): Observable<any> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa', empresaId.toString());
    return this.http.get(this.apiUrl + 'areas/', { headers: this.getHeaders().headers, params });
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
  getPuestos(departamentoId?: number | null, empresaId?: number | null): Observable<any> {
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

  // Empleados (Lista)
  getEmpleados(empresaId?: number | null, deptoId?: number | null): Observable<any> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresa', empresaId.toString());
    if (deptoId) params = params.set('departamento', deptoId.toString());
    
    return this.http.get(this.apiUrl + 'empleados/', { headers: this.getHeaders().headers, params });
  }
  
  // Empleado (Individual)
  getEmpleado(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}empleados/${id}/`, this.getHeaders());
  }

  createEmpleado(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'empleados/', data, this.getHeaders());
  }

  saveEmpleado(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'empleados/', data, this.getHeaders());
  }
  
  updateEmpleado(id: number, data: any): Observable<any> {
    return this.http.put(this.apiUrl + `empleados/${id}/`, data, this.getHeaders());
  }

  // Carga Masiva (Excel)
  uploadEmpleados(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo); 
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
    });
    return this.http.post(this.apiUrl + 'empleados/importar_excel/', formData, { headers });
  }
  downloadPlantilla(): void {
    // Truco para descargar archivo con Auth Header
    this.http.get(this.apiUrl + 'empleados/download_template/', { 
      headers: this.getHeaders().headers, 
      responseType: 'blob' 
    }).subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_empleados.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
    });
  }

  // --- SOLICITUDES (VACACIONES) ---
  // Aquí corregí: agregué getHeaders() y eliminé los duplicados
  
  getSolicitudes(): Observable<any> { 
      return this.http.get(this.apiUrl + 'solicitudes/', this.getHeaders()); 
  }
  
  createSolicitud(data: any): Observable<any> {
    // CORRECCIÓN IMPORTANTE: Agregado this.getHeaders()
    return this.http.post(this.apiUrl + 'solicitudes/', data, this.getHeaders());
  }

  saveSolicitud(data: any): Observable<any> { return this.http.post(this.apiUrl + 'solicitudes/', data, this.getHeaders()); }
  
  updateSolicitud(id: number, data: any): Observable<any> { return this.http.patch(this.apiUrl + 'solicitudes/' + id + '/', data, this.getHeaders()); }
  
  gestionarSolicitud(id: number, estado: 'APROBADA' | 'RECHAZADA', comentario: string): Observable<any> {
    // CORRECCIÓN IMPORTANTE: Agregado this.getHeaders()
    return this.http.post(this.apiUrl + `solicitudes/${id}/gestionar/`, {
        estado: estado,
        comentario_jefe: comentario
    }, this.getHeaders());
  }

  // Tipos de Ausencia
  getTiposAusencia(): Observable<any> { return this.http.get(this.apiUrl + 'tipos-ausencia/', this.getHeaders()); }
  
  createTipoAusencia(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'tipos-ausencia/', data, this.getHeaders());
  }

  deleteTipoAusencia(id: number): Observable<any> {
    return this.http.delete(this.apiUrl + `tipos-ausencia/${id}/`, this.getHeaders());
  }

  // ==========================================
  // 3. MÓDULO ASISTENCIA (Reloj)
  // ==========================================

  marcarAsistencia(lat: number, lng: number): Observable<any> {
    return this.http.post(this.apiUrl + 'asistencia/marcar/', { lat, lng }, this.getHeaders());
  }

  registrarAsistencia(data: any): Observable<any> {
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
  
  // RESULTADOS KPI
  saveResultadoKPI(data: any): Observable<any> {
    return this.http.post(this.apiUrl + 'resultados-kpi/', data, this.getHeaders());
  }

  // Evaluaciones
  getEvaluaciones(empleadoId?: number): Observable<any> {
    let url = this.apiUrl + 'evaluaciones/';
    if (empleadoId) url += `?empleado=${empleadoId}`;
    return this.http.get(url, this.getHeaders());
  }

  generarCierreMensual(empleadoId: number, mes: number, anio: number): Observable<any> {
    return this.http.post(this.apiUrl + 'evaluaciones/generar_cierre/', {
      empleado_id: empleadoId,
      mes: mes,
      anio: anio
    }, this.getHeaders());
  }
  // --- ÁREAS ---
updateArea(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}areas/${id}/`, data, this.getHeaders());
}
deleteArea(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}areas/${id}/`, this.getHeaders());
}

// --- SUCURSALES ---
updateSucursal(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}sucursales/${id}/`, data, this.getHeaders());
}
deleteSucursal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}sucursales/${id}/`, this.getHeaders());
}

// --- DEPARTAMENTOS ---
updateDepartamento(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}departamentos/${id}/`, data, this.getHeaders());
}
deleteDepartamento(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}departamentos/${id}/`, this.getHeaders());
}

// --- PUESTOS ---
updatePuesto(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}puestos/${id}/`, data, this.getHeaders());
}
deletePuesto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}puestos/${id}/`, this.getHeaders());
}

// --- TURNOS ---
updateTurno(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}turnos/${id}/`, data, this.getHeaders());
}
}