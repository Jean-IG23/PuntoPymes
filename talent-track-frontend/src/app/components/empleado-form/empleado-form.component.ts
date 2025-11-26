import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empleado-form.component.html',
  styleUrl: './empleado-form.component.css'
})
export class EmpleadoFormComponent implements OnInit {
  
  // Objeto principal del empleado
  empleado: any = {
    nombres: '',
    apellidos: '',
    documento: '',
    email: '',
    telefono: '',
    direccion: '',
    foto_url: '',
    empresa: '',
    sucursal: '', // Campo temporal para filtrar (no se guarda en empleado)
    departamento: '',
    puesto: '',
    turno: ''
  };

  // Listas Maestras (Todos los datos crudos de la API)
  empresas: any[] = [];
  allSucursales: any[] = [];
  allDepartamentos: any[] = [];
  allPuestos: any[] = [];
  allTurnos: any[] = [];

  // Listas Filtradas (Lo que ve el usuario en los selects)
  filteredSucursales: any[] = [];
  filteredDepartamentos: any[] = [];
  filteredPuestos: any[] = [];
  filteredTurnos: any[] = [];

  constructor(
    private api: ApiService, 
    private router: Router,
    private cd: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.cargarCatalogos();
  }

  cargarCatalogos() {
    // 1. Cargar EMPRESAS
    this.api.getEmpresas().subscribe((data: any) => {
      this.empresas = data.results ? data.results : data;
    });
    
    // 2. Cargar el resto (Guardamos todo en memoria para filtrar localmente)
    // Asegúrate de tener getSucursales() en tu api.service.ts
    this.api.getSucursales().subscribe((data: any) => {
      this.allSucursales = data.results ? data.results : data;
    });

    this.api.getDepartamentos().subscribe((data: any) => {
      this.allDepartamentos = data.results ? data.results : data;
    });

    this.api.getPuestos().subscribe((data: any) => {
      this.allPuestos = data.results ? data.results : data;
    });

    this.api.getTurnos().subscribe((data: any) => {
      this.allTurnos = data.results ? data.results : data;
    });
  }

  // FILTRO NIVEL 1: Cuando seleccionas Empresa
  onSelectEmpresa() {
    const empresaId = Number(this.empleado.empresa);
    
    // Reiniciar campos hijos
    this.empleado.sucursal = '';
    this.empleado.departamento = '';
    this.empleado.puesto = '';
    this.empleado.turno = '';

    // Filtrar listas dependientes de Empresa
    this.filteredSucursales = this.allSucursales.filter(s => Number(s.empresa) === empresaId);
    this.filteredPuestos = this.allPuestos.filter(p => Number(p.empresa) === empresaId);
    this.filteredTurnos = this.allTurnos.filter(t => Number(t.empresa) === empresaId);
    
    // Limpiar departamentos (porque dependen de sucursal)
    this.filteredDepartamentos = [];

    this.cd.detectChanges(); // Actualizar vista
  }

  // FILTRO NIVEL 2: Cuando seleccionas Sucursal
  onSelectSucursal() {
    const sucursalId = Number(this.empleado.sucursal);
    
    // Reiniciar departamento
    this.empleado.departamento = '';

    // Filtrar Departamentos
    this.filteredDepartamentos = this.allDepartamentos.filter(d => Number(d.sucursal) === sucursalId);
    
    this.cd.detectChanges(); // Actualizar vista
  }

  guardar() {
    // Validaciones básicas
    if(!this.empleado.nombres || !this.empleado.documento || !this.empleado.departamento) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }

    this.api.saveEmpleado(this.empleado).subscribe(
      () => {
        alert('¡Empleado registrado correctamente!');
        this.router.navigate(['/empleados']); // Volver a la lista
      },
      (error) => {
        console.error(error);
        alert('Error al guardar. Revisa la consola.');
      }
    );
  }
}