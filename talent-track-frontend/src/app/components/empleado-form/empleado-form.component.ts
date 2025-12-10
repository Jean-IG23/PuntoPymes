import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empleado-form.component.html',
  styleUrl: './empleado-form.component.css'
})
export class EmpleadoFormComponent implements OnInit {
  
  empleado: any = {
    nombres: '', apellidos: '', documento: '', email: '', telefono: '', direccion: '', foto_url: '',
    empresa: '', sucursal: '', departamento: '', puesto: '', turno: ''
  };

  // Listas
  empresas: any[] = [];
  allSucursales: any[] = [];
  allDepartamentos: any[] = [];
  allPuestos: any[] = [];
  allTurnos: any[] = [];

  // Listas Filtradas
  filteredSucursales: any[] = [];
  filteredDepartamentos: any[] = [];
  filteredPuestos: any[] = [];
  filteredTurnos: any[] = [];

  // Variable para saber si bloqueamos campos (Contexto)
  isContextual: boolean = false;

  constructor(
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute, // Importante para leer URL
    private cd: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    // Cargar catálogos y LUEGO verificar contexto
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    // Usamos forkJoin o promesas encadenadas idealmente, pero lo haremos secuencial simple
    this.api.getEmpresas().subscribe((res: any) => this.empresas = res.results || res);
    this.api.getSucursales().subscribe((res: any) => this.allSucursales = res.results || res);
    this.api.getPuestos().subscribe((res: any) => this.allPuestos = res.results || res);
    this.api.getTurnos().subscribe((res: any) => this.allTurnos = res.results || res);
    
    this.api.getDepartamentos().subscribe((res: any) => {
      this.allDepartamentos = res.results || res;
      
      // UNA VEZ CARGADO TODO, VERIFICAMOS SI HAY CONTEXTO EN LA URL
      this.verificarContexto();
    });
  }

  verificarContexto() {
    // La URL es: /departamentos/:id/empleados/nuevo
    // Buscamos si existe el parámetro 'id' en la ruta padre o actual
    // Como la ruta está definida como 'departamentos/:id/...', necesitamos leer la URL cruda o params
    const url = this.router.url;
    
    if (url.includes('/departamentos/')) {
      const partes = url.split('/');
      const indexDepto = partes.indexOf('departamentos');
      const deptoId = Number(partes[indexDepto + 1]);

      if (deptoId) {
        console.log('🔒 Modo Contextual Activado. Depto ID:', deptoId);
        this.autoLlenarPorDepartamento(deptoId);
      }
    }
  }

  autoLlenarPorDepartamento(deptoId: number) {
    // 1. Encontrar el departamento
    const depto = this.allDepartamentos.find(d => d.id === deptoId);
    if (!depto) return;

    this.empleado.departamento = depto.id;
    
    // 2. Encontrar sucursal (Padre)
    // Necesitamos saber la sucursal del departamento.
    // Si el serializador de departamento incluye 'sucursal' (ID), lo usamos.
    const sucursalId = depto.sucursal; 
    this.empleado.sucursal = sucursalId;

    // 3. Encontrar empresa (Abuelo)
    const suc = this.allSucursales.find(s => s.id === sucursalId);
    if (suc) {
      this.empleado.empresa = suc.empresa;
      
      // 4. Ejecutar los filtros visuales
      this.onSelectEmpresa(true); // true = no borrar hijos
      this.onSelectSucursal(true);
      
      // 5. Bloquear campos
      this.isContextual = true; 
      this.cd.detectChanges();
    }
  }

  onSelectEmpresa(mantenerHijos = false) {
    const empresaId = Number(this.empleado.empresa);
    
    if (!mantenerHijos) {
      this.empleado.sucursal = '';
      this.empleado.departamento = '';
      this.empleado.puesto = '';
      this.empleado.turno = '';
    }

    this.filteredSucursales = this.allSucursales.filter(s => Number(s.empresa) === empresaId);
    this.filteredPuestos = this.allPuestos.filter(p => Number(p.empresa) === empresaId);
    this.filteredTurnos = this.allTurnos.filter(t => Number(t.empresa) === empresaId);
    
    if (!mantenerHijos) this.filteredDepartamentos = [];
    this.cd.detectChanges();
  }

  onSelectSucursal(mantenerHijos = false) {
    const sucursalId = Number(this.empleado.sucursal);
    if (!mantenerHijos) this.empleado.departamento = '';
    this.filteredDepartamentos = this.allDepartamentos.filter(d => Number(d.sucursal) === sucursalId);
    this.cd.detectChanges();
  }

  guardar() {
    if(!this.empleado.nombres || !this.empleado.departamento) {
      alert("Faltan datos obligatorios");
      return;
    }
    this.api.saveEmpleado(this.empleado).subscribe(
      () => {
        alert('Guardado!');
        // Volver inteligentemente
        if (this.isContextual) {
           // Volver a la lista del departamento
           this.router.navigate(['/departamentos', this.empleado.departamento, 'empleados']);
        } else {
           this.router.navigate(['/empleados']);
        }
      },
      (err) => console.error(err)
    );
  }
}