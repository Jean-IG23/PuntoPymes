import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './empleado-list.component.html',
  styleUrl: './empleado-list.component.css'
})
export class EmpleadoListComponent implements OnInit {
  
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  loading: boolean = true;
  searchTerm: string = '';

  // Contexto (¿Viendo todos o solo un depto?)
  currentDeptoId: number | null = null;
  currentEmpresaId: number | null = null;

  constructor(
    private api: ApiService, 
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.verificarContexto();
    this.cargarEmpleados();
  }

  verificarContexto() {
    // Si la URL es /departamentos/5/empleados
    const deptoId = this.route.snapshot.paramMap.get('id');
    const path = this.route.snapshot.url[0]?.path;

    if (path === 'departamentos' && deptoId) {
      this.currentDeptoId = Number(deptoId);
    }

    this.currentEmpresaId = this.auth.getEmpresaId();
  }

  cargarEmpleados() {
    this.loading = true;
    
    // CASO 1: Filtrar por Departamento
    if (this.currentDeptoId) {
       this.api.getEmpleados(undefined, this.currentDeptoId).subscribe(
         (data: any) => this.procesarDatos(data),
         (err: any) => this.handleError(err)
       );
    } 
    // CASO 2: Filtrar por Empresa (Si es Cliente o Gerente)
    else if (this.auth.isCompanyAdmin() && this.currentEmpresaId) {
       this.api.getEmpleados(this.currentEmpresaId).subscribe(
         (data: any) => this.procesarDatos(data),
         (err: any) => this.handleError(err)
       );
    } 
    // CASO 3: Super Admin (Ver todo)
    else {
       this.api.getEmpleados().subscribe(
         (data: any) => this.procesarDatos(data),
         (err: any) => this.handleError(err)
       );
    }
  }

  procesarDatos(data: any) {
    // Maneja si el backend devuelve array directo o paginación
    this.empleados = data.results || data;
    this.empleadosFiltrados = this.empleados;
    this.loading = false;
  }

  handleError(error: any) {
    console.error(error);
    this.loading = false;
  }

  // Buscador en tiempo real
  filtrar() {
    const term = this.searchTerm.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(e => 
      (e.nombres + ' ' + e.apellidos).toLowerCase().includes(term) ||
      e.documento.includes(term) ||
      (e.nombre_puesto || '').toLowerCase().includes(term)
    );
  }
}