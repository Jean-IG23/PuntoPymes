import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './empleado-list.component.html',
  styleUrls: ['./empleado-list.component.css']
})
export class EmpleadoListComponent implements OnInit {
  
  // --- DATOS ---
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  sucursales: any[] = [];
  departamentos: any[] = [];
  
  // --- ESTADO DE UI ---
  loading: boolean = true;
  textoBusqueda: string = '';
  filtroSucursal: string = '';
  filtroDepartamento: string = '';
  filtroEstado: string = '';

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

  verificarContexto() {
    const deptoId = this.route.snapshot.paramMap.get('id');
    const firstSegment = this.route.snapshot.url.length > 0 ? this.route.snapshot.url[0].path : '';

    if (firstSegment === 'departamentos' && deptoId) {
      this.currentDeptoId = Number(deptoId);
    }
    this.currentEmpresaId = this.auth.getEmpresaId();
  }

  cargarDatos() {
    this.loading = true;
    this.cd.detectChanges();
    
    const peticiones: any = {
      sucursales: this.api.getSucursales(this.currentEmpresaId || undefined),
      departamentos: this.api.getDepartamentos(),
    };

    if (this.currentDeptoId) {
       peticiones.empleados = this.api.getEmpleados(undefined, this.currentDeptoId);
    } else {
       peticiones.empleados = this.api.getEmpleados(this.currentEmpresaId || undefined);
    }

    forkJoin(peticiones).subscribe({
        next: (res: any) => {
            this.sucursales = res.sucursales.results || res.sucursales || [];
            this.departamentos = res.departamentos.results || res.departamentos || [];
            this.empleados = res.empleados.results || res.empleados || [];
            
            this.filtrar(); 
            this.loading = false;
            this.cd.detectChanges();
        },
        error: (e) => {
            console.error("Error cargando datos:", e);
            Swal.fire('Error', 'No se pudo cargar la lista de empleados', 'error');
            this.loading = false;
            this.cd.detectChanges();
        }
    });
  }

  filtrar() {
    const texto = this.textoBusqueda.toLowerCase().trim();
    const idSucursal = this.filtroSucursal;
    const idDpto = this.filtroDepartamento;
    const estado = this.filtroEstado;

    this.empleadosFiltrados = this.empleados.filter(emp => {
      const matchTexto = 
          (emp.nombres || '').toLowerCase().includes(texto) ||
          (emp.apellidos || '').toLowerCase().includes(texto) ||
          (emp.documento || '').includes(texto) ||
          (emp.nombre_puesto || '').toLowerCase().includes(texto) ||
          (emp.email || '').toLowerCase().includes(texto);

      let matchSucursal = true;
      if (idSucursal && idSucursal !== '') {
          const empSucId = (typeof emp.sucursal === 'object' && emp.sucursal) ? emp.sucursal.id : emp.sucursal;
          matchSucursal = empSucId == idSucursal;
      }

      let matchDpto = true;
      if (idDpto && idDpto !== '') {
          const empDptoId = (typeof emp.departamento === 'object' && emp.departamento) ? emp.departamento.id : emp.departamento;
          matchDpto = empDptoId == idDpto;
      }

      let matchEstado = true;
      if (estado && estado !== '') {
          matchEstado = emp.estado === estado;
      }

      return matchTexto && matchSucursal && matchDpto && matchEstado;
    });
  }

  toggleEstado(emp: any) {
    const nuevoEstado = emp.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const original = emp.estado;

    emp.estado = nuevoEstado;

    // Enviar los datos completos del empleado con el nuevo estado
    const dataToUpdate = {
      nombres: emp.nombres,
      apellidos: emp.apellidos,
      email: emp.email,
      documento: emp.documento,
      fecha_ingreso: emp.fecha_ingreso,
      estado: nuevoEstado
    };

    this.api.updateEmpleado(emp.id, dataToUpdate).subscribe({
        next: () => {
            const msg = nuevoEstado === 'ACTIVO' ? 'activado' : 'desactivado';
            Swal.fire({
              title: 'Listo',
              text: `Empleado ${msg} correctamente`,
              icon: 'success',
              timer: 2000
            });
        },
        error: (e) => {
            emp.estado = original; 
            console.error(e);
            Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
            this.cd.detectChanges();
          }
    });
  }

  editarEmpleado(id: number) {
    this.router.navigate(['/gestion/empleados/editar', id]);
  }

  eliminarEmpleado(emp: any) {
    Swal.fire({
      title: '¿Eliminar empleado?',
      text: `¿Estás seguro de que deseas eliminar a ${emp.nombres} ${emp.apellidos}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.deleteEmpleado(emp.id).subscribe({
          next: () => {
            this.empleados = this.empleados.filter(e => e.id !== emp.id);
            this.filtrar();
            Swal.fire('Eliminado', 'Empleado eliminado correctamente', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar el empleado', 'error')
        });
      }
    });
  }

  verDetalles(emp: any) {
    Swal.fire({
      title: `<strong>${emp.nombres} ${emp.apellidos}</strong>`,
      html: `
        <div class="text-left space-y-3 text-sm">
            <div class="flex justify-between border-b pb-2">
              <span class="font-semibold text-gray-700">Documento:</span>
              <span>${emp.documento}</span>
            </div>
            <div class="flex justify-between border-b pb-2">
              <span class="font-semibold text-gray-700">Email:</span>
              <span>${emp.email}</span>
            </div>
            <div class="flex justify-between border-b pb-2">
              <span class="font-semibold text-gray-700">Teléfono:</span>
              <span>${emp.telefono || '-'}</span>
            </div>
            <div class="flex justify-between border-b pb-2">
              <span class="font-semibold text-gray-700">Sucursal:</span>
              <span>${emp.nombre_sucursal || '-'}</span>
            </div>
            <div class="flex justify-between border-b pb-2">
              <span class="font-semibold text-gray-700">Departamento:</span>
              <span>${emp.nombre_departamento || '-'}</span>
            </div>
            <div class="flex justify-between border-b pb-2">
              <span class="font-semibold text-gray-700">Puesto:</span>
              <span>${emp.nombre_puesto || '-'}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-semibold text-gray-700">Estado:</span>
              <span class="px-2 py-1 rounded text-xs font-bold ${emp.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                ${emp.estado}
              </span>
            </div>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#dc2626'
    });
  }
}