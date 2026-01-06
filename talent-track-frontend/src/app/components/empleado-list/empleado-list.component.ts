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
  imports: [CommonModule, RouterLink],
  templateUrl: './empleado-list.component.html',
  styleUrls: ['./empleado-list.component.css'] // Asegúrate de tener este archivo aunque esté vacío
})
export class EmpleadoListComponent implements OnInit {
  
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  loading: boolean = true;
  searchTerm: string = '';

  // Contexto
  currentDeptoId: number | null = null;
  currentEmpresaId: number | null = null;

  // Catálogos para mapeo (Crucial para que no salga "ID: 5")
  sucursales: any[] = [];
  puestos: any[] = [];
  turnos: any[] = []; // ¡Nuevo!

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
    const deptoId = this.route.snapshot.paramMap.get('id');
    const path = this.route.snapshot.url[0]?.path;

    if (path === 'departamentos' && deptoId) {
      this.currentDeptoId = Number(deptoId);
    }
    this.currentEmpresaId = this.auth.getEmpresaId();
  }

  cargarDatosCompletos() {
    this.loading = true;

    // 1. Definir la petición de empleados según contexto
    let empleadosReq;
    if (this.currentDeptoId) {
        empleadosReq = this.api.getEmpleados(undefined, this.currentDeptoId);
    } else {
        // Asumiendo que getEmpleados acepta (empresaId | null) gracias al fix anterior
        empleadosReq = this.api.getEmpleados(this.currentEmpresaId || undefined);
    }

    // 2. Carga Paralela (Empleados + Catálogos para poner nombres bonitos)
    forkJoin({
        lista: empleadosReq,
        sucursales: this.api.getSucursales(this.currentEmpresaId || undefined),
        puestos: this.api.getPuestos(undefined, this.currentEmpresaId || undefined),
        turnos: this.api.getTurnos() // Asegúrate de tener este método en ApiService
    }).subscribe({
        next: (res: any) => {
            const rawEmpleados = res.lista.results || res.lista;
            this.sucursales = res.sucursales.results || res.sucursales;
            this.puestos = res.puestos.results || res.puestos;
            this.turnos = res.turnos.results || res.turnos;

            // 3. ENRIQUECIMIENTO DE DATOS (Mapping)
            this.empleados = rawEmpleados.map((emp: any) => {
                // Resolver si viene como Objeto o como ID
                const sucId = (typeof emp.sucursal === 'object' && emp.sucursal) ? emp.sucursal.id : emp.sucursal;
                const ptoId = (typeof emp.puesto === 'object' && emp.puesto) ? emp.puesto.id : emp.puesto;
                // Si tienes turno en el modelo Empleado:
                // const turnoId = ...

                return {
                    ...emp,
                    // Buscamos el nombre en los catálogos descargados
                    nombre_sucursal_real: this.sucursales.find(s => s.id === sucId)?.nombre || 'Matriz',
                    nombre_puesto_real: this.puestos.find(p => p.id === ptoId)?.nombre || 'Sin Asignar',
                    // Iniciales para avatar
                    iniciales: (emp.nombres[0] || '') + (emp.apellidos[0] || '')
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
    this.empleadosFiltrados = this.empleados.filter(e => 
      (e.nombres + ' ' + e.apellidos).toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term) ||
      e.nombre_puesto_real.toLowerCase().includes(term)
    );
  }
}