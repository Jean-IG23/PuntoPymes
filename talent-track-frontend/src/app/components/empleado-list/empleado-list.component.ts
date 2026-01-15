import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Vital para [(ngModel)]
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // FormsModule agregado
  templateUrl: './empleado-list.component.html',
  styleUrls: ['./empleado-list.component.css']
})
export class EmpleadoListComponent implements OnInit {
  
  // Datos principales
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  loading: boolean = true;
  
  // Filtros visuales
  searchTerm: string = '';
  filtroSucursal: string = ''; // <--- ¡ESTA ERA LA VARIABLE QUE FALTABA!

  // Contexto (¿Vengo de un depto específico o veo todo?)
  currentDeptoId: number | null = null;
  currentEmpresaId: number | null = null;

  // Catálogos para mapeo (Crucial para que no salga "ID: 5")
  sucursales: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];

  constructor(
    private api: ApiService, 
    public auth: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.verificarContexto();
    this.cargarDatosCompletos();
  }

  verificarContexto() {
    // Detectamos si la URL es /departamentos/:id/empleados
    const deptoId = this.route.snapshot.paramMap.get('id');
    // Verificamos de forma segura la URL
    const firstSegment = this.route.snapshot.url.length > 0 ? this.route.snapshot.url[0].path : '';

    if (firstSegment === 'departamentos' && deptoId) {
      this.currentDeptoId = Number(deptoId);
    }
    this.currentEmpresaId = this.auth.getEmpresaId();
  }

  cargarDatosCompletos() {
    this.loading = true;

    // 1. Definir la petición de empleados según contexto
    let empleadosReq;
    if (this.currentDeptoId) {
        // Pedir solo empleados de este depto
        empleadosReq = this.api.getEmpleados(undefined, this.currentDeptoId);
    } else {
        // Pedir todos los de la empresa
        empleadosReq = this.api.getEmpleados(this.currentEmpresaId || undefined);
    }

    // 2. Carga Paralela (Empleados + Catálogos)
    forkJoin({
        lista: empleadosReq,
        sucursales: this.api.getSucursales(this.currentEmpresaId || undefined),
        puestos: this.api.getPuestos(undefined, this.currentEmpresaId || undefined),
        turnos: this.api.getTurnos() 
    }).subscribe({
        next: (res: any) => {
            const rawEmpleados = res.lista.results || res.lista;
            this.sucursales = res.sucursales.results || res.sucursales;
            this.puestos = res.puestos.results || res.puestos;
            this.turnos = res.turnos.results || res.turnos;

            // 3. ENRIQUECIMIENTO DE DATOS (Mapping Inteligente)
            this.empleados = rawEmpleados.map((emp: any) => {
                // Django a veces devuelve ID (5) y a veces Objeto ({id:5, nombre:'...'})
                // Esta lógica normaliza todo a ID para buscar en el catálogo
                const sucId = (typeof emp.sucursal === 'object' && emp.sucursal) ? emp.sucursal.id : emp.sucursal;
                const ptoId = (typeof emp.puesto === 'object' && emp.puesto) ? emp.puesto.id : emp.puesto;
                
                return {
                    ...emp,
                    // Inyectamos el nombre real buscándolo en los arrays descargados
                    nombre_sucursal_real: this.sucursales.find(s => s.id == sucId)?.nombre || 'Sin Asignar',
                    nombre_puesto_real: this.puestos.find(p => p.id == ptoId)?.nombre || 'Sin Cargo',
                    // Generamos iniciales para el avatar (Ej: Juan Perez -> JP)
                    iniciales: (emp.nombres?.[0] || '') + (emp.apellidos?.[0] || '')
                };
            });

            this.empleadosFiltrados = this.empleados;
            this.loading = false;
        },
        error: (e) => {
            console.error("Error cargando personal:", e);
            this.loading = false;
        }
    });
  }

  filtrar() {
    const term = this.searchTerm.toLowerCase();
    const idSucursalFiltro = this.filtroSucursal; // string del select

    this.empleadosFiltrados = this.empleados.filter(emp => {
      // 1. Coincidencia de Texto (Nombre, Apellido, Cargo)
      const matchTexto = 
          (emp.nombres || '').toLowerCase().includes(term) ||
          (emp.apellidos || '').toLowerCase().includes(term) ||
          (emp.documento || '').includes(term) ||
          (emp.nombre_puesto_real || '').toLowerCase().includes(term);

      // 2. Coincidencia de Sucursal (Dropdown)
      // Comparamos el ID del empleado con el ID seleccionado en el filtro
      let matchSucursal = true;
      if (idSucursalFiltro) {
          const empSucId = (typeof emp.sucursal === 'object') ? emp.sucursal.id : emp.sucursal;
          // Usamos == para comparar número con string sin problemas
          matchSucursal = empSucId == idSucursalFiltro;
      }

      return matchTexto && matchSucursal;
    });
  }
}