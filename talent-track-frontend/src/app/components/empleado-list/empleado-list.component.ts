import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2'; // Asegúrate de tener: npm install sweetalert2

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './empleado-list.component.html',
  styleUrls: ['./empleado-list.component.css']
})
export class EmpleadoListComponent implements OnInit {
  
  // --- DATOS ---
  empleados: any[] = [];          // Lista original completa
  empleadosFiltrados: any[] = []; // Lista filtrada que se ve en pantalla
  sucursales: any[] = [];         // Para el dropdown de filtro
  
  // --- ESTADO DE UI ---
  loading: boolean = true;
  textoBusqueda: string = '';
  filtroSucursal: string = '';    // ID de sucursal seleccionada (string vacía = todas)

  // --- CONTEXTO ---
  currentDeptoId: number | null = null;
  currentEmpresaId: number | null = null;

  constructor(
    private api: ApiService, 
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit() {
    this.verificarContexto();
    this.cargarDatos();
  }

  // Detecta si estamos viendo la lista general o dentro de un departamento específico
  verificarContexto() {
    const deptoId = this.route.snapshot.paramMap.get('id');
    const firstSegment = this.route.snapshot.url.length > 0 ? this.route.snapshot.url[0].path : '';

    if (firstSegment === 'departamentos' && deptoId) {
      this.currentDeptoId = Number(deptoId);
    }
    this.currentEmpresaId = this.auth.getEmpresaId();
  }

  // Carga inicial de datos
  cargarDatos() {
    this.loading = true;
    this.cd.detectChanges();
    const peticiones: any = {
      // 1. Cargar Sucursales para el filtro
      sucursales: this.api.getSucursales(this.currentEmpresaId || undefined),
    };

    // 2. Cargar Empleados (Filtrados por depto si aplica, o todos de la empresa)
    if (this.currentDeptoId) {
       peticiones.empleados = this.api.getEmpleados(undefined, this.currentDeptoId);
    } else {
       peticiones.empleados = this.api.getEmpleados(this.currentEmpresaId || undefined);
    }

    forkJoin(peticiones).subscribe({
        next: (res: any) => {
            // Manejo robusto de respuestas (paginadas o array directo)
            this.sucursales = res.sucursales.results || res.sucursales;
            this.empleados = res.empleados.results || res.empleados;
            
            // Aplicar filtros iniciales (muestra todo al principio)
            this.filtrar(); 
            this.loading = false;
            this.cd.detectChanges();
        },
        error: (e) => {
            console.error("Error cargando datos:", e);
            Swal.fire('Error', 'No se pudo cargar la lista de colaboradores', 'error');
            this.loading = false;
            this.cd.detectChanges();
        }
    });
  }

  // Filtra en memoria (Local) sin recargar la API
  filtrar() {
    const texto = this.textoBusqueda.toLowerCase().trim();
    const idSucursal = this.filtroSucursal;

    this.empleadosFiltrados = this.empleados.filter(emp => {
      // 1. Filtro por Texto (Nombre, Apellido, Cédula, Cargo)
      const matchTexto = 
          (emp.nombres || '').toLowerCase().includes(texto) ||
          (emp.apellidos || '').toLowerCase().includes(texto) ||
          (emp.documento || '').includes(texto) ||
          (emp.nombre_puesto || '').toLowerCase().includes(texto);

      // 2. Filtro por Sucursal
      let matchSucursal = true;
      if (idSucursal && idSucursal !== '') {
          // El backend puede devolver el objeto completo o solo el ID
          const empSucId = (typeof emp.sucursal === 'object' && emp.sucursal) ? emp.sucursal.id : emp.sucursal;
          // Usamos '==' para comparar string "5" con number 5
          matchSucursal = empSucId == idSucursal;
      }

      return matchTexto && matchSucursal;
    });
  }

  // Activar / Desactivar empleado
  toggleEstado(emp: any) {
    const nuevoEstado = emp.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const original = emp.estado; // Guardamos el estado anterior por si falla

    // 1. Optimismo UI: Cambiamos visualmente rápido
    emp.estado = nuevoEstado;

    // 2. Petición al Backend
    this.api.updateEmpleado(emp.id, { estado: nuevoEstado }).subscribe({
        next: () => {
            const msg = nuevoEstado === 'ACTIVO' ? 'activado' : 'desactivado';
            const toast = Swal.mixin({
              toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
              timerProgressBar: true
            });
            toast.fire({ icon: 'success', title: `Empleado ${msg}` });
        },
        error: (e) => {
            // Si falla, revertimos el cambio visual
            emp.estado = original; 
            console.error(e);
            Swal.fire('Error', 'No se pudo cambiar el estado. Intente de nuevo.', 'error');
            this.cd.detectChanges();
          }
    });
  }

  // Modal informativo rápido
  verDetalles(emp: any) {
    Swal.fire({
      title: `<span class="text-xl font-bold">${emp.nombres} ${emp.apellidos}</span>`,
      html: `
        <div class="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
            <div class="mb-2"><strong class="text-indigo-600">🆔 Documento:</strong> ${emp.documento}</div>
            <div class="mb-2"><strong class="text-indigo-600">📧 Email:</strong> ${emp.email}</div>
            <div class="mb-2"><strong class="text-indigo-600">📞 Teléfono:</strong> ${emp.telefono || 'No registrado'}</div>
            <hr class="my-3 border-gray-300">
            <div class="mb-1"><strong>Sucursal:</strong> ${emp.nombre_sucursal || 'Matriz'}</div>
            <div class="mb-1"><strong>Departamento:</strong> ${emp.nombre_departamento || 'General'}</div>
            <div class="mb-1"><strong>Puesto:</strong> ${emp.nombre_puesto || 'Sin cargo'}</div>
            <div class="mb-1"><strong> Turno:</strong> ${emp.nombre_turno || 'Sin turno asignado'}</div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#4F46E5' // Indigo 600
    });
  }
}