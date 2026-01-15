import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './empleado-list.component.html',
  styleUrls: ['./empleado-list.component.css']
})
export class EmpleadoListComponent implements OnInit {
  
  // Datos
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  
  // Catálogos para filtros (Dropdowns)
  sucursales: any[] = [];
  
  // Estados de vista
  loading: boolean = true;
  textoBusqueda: string = '';
  filtroSucursal: string = ''; // ID de la sucursal seleccionada

  // Contexto (Si viene de "Ver Depto")
  currentDeptoId: number | null = null;
  currentEmpresaId: number | null = null;

  constructor(
    private api: ApiService, 
    public auth: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.verificarContexto();
    this.cargarDatos();
  }

  verificarContexto() {
    // Si la URL es /departamentos/:id/empleados
    const deptoId = this.route.snapshot.paramMap.get('id');
    const firstSegment = this.route.snapshot.url.length > 0 ? this.route.snapshot.url[0].path : '';

    if (firstSegment === 'departamentos' && deptoId) {
      this.currentDeptoId = Number(deptoId);
    }
    this.currentEmpresaId = this.auth.getEmpresaId();
  }

  cargarDatos() {
    this.loading = true;

    // Preparamos peticiones en paralelo
    const peticiones: any = {
      // 1. Cargar Sucursales (Para el dropdown de filtro)
      sucursales: this.api.getSucursales(this.currentEmpresaId || undefined),
    };

    // 2. Cargar Empleados (Filtrados por depto o todos)
    if (this.currentDeptoId) {
       peticiones.empleados = this.api.getEmpleados(undefined, this.currentDeptoId);
    } else {
       peticiones.empleados = this.api.getEmpleados(this.currentEmpresaId || undefined);
    }

    // Ejecutar todo junto
    forkJoin(peticiones).subscribe({
        next: (res: any) => {
            // Guardar sucursales
            this.sucursales = res.sucursales.results || res.sucursales;
            
            // Guardar empleados
            this.empleados = res.empleados.results || res.empleados;
            
            // Inicializar tabla
            this.empleadosFiltrados = this.empleados;
            this.loading = false;
        },
        error: (e) => {
            console.error("Error cargando datos:", e);
            this.loading = false;
        }
    });
  }

  filtrar() {
    const texto = this.textoBusqueda.toLowerCase();
    const idSucursal = this.filtroSucursal; // Viene como string del select

    this.empleadosFiltrados = this.empleados.filter(emp => {
      // 1. Filtro por Texto
      const matchTexto = 
          (emp.nombres || '').toLowerCase().includes(texto) ||
          (emp.apellidos || '').toLowerCase().includes(texto) ||
          (emp.documento || '').includes(texto) ||
          (emp.nombre_puesto || '').toLowerCase().includes(texto);

      // 2. Filtro por Sucursal
      // Nota: El serializer devuelve el OBJETO sucursal o el ID. 
      // Si es objeto, usamos .id. Si es número, directo.
      let matchSucursal = true;
      if (idSucursal) {
          const empSucId = (typeof emp.sucursal === 'object' && emp.sucursal) ? emp.sucursal.id : emp.sucursal;
          // Usamos '==' para que coincida "5" (string) con 5 (number)
          matchSucursal = empSucId == idSucursal;
      }

      return matchTexto && matchSucursal;
    });
  }

  toggleEstado(emp: any) {
    const nuevoEstado = emp.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const original = emp.estado;

    // Optimismo UI: Cambiamos visualmente primero
    emp.estado = nuevoEstado;

    this.api.updateEmpleado(emp.id, { estado: nuevoEstado }).subscribe({
        error: (e) => {
            // Si falla, revertimos
            emp.estado = original;
            alert('No se pudo actualizar el estado.');
            console.error(e);
        }
    });
  }

  editarEmpleado(emp: any) {
    // Aquí puedes navegar a /empleados/editar/:id o abrir un modal
    console.log("Editar:", emp);
  }

  verDetalles(emp: any) {
    console.log("Detalles:", emp);
  }

  abrirModalCrear() {
    // Lógica para abrir modal
    console.log("Abrir modal crear");
  }
}