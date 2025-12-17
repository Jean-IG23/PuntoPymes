import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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
    empresa: '', sucursal: '', departamento: '', puesto: '', turno: '',
    crear_usuario_admin: false 
  };

  // Listas Maestras
  empresas: any[] = [];
  allSucursales: any[] = [];
  allDepartamentos: any[] = []; // <--- SE LLAMA 'allDepartamentos'
  allPuestos: any[] = [];
  allTurnos: any[] = [];

  // Listas Filtradas para los Selects
  filteredSucursales: any[] = [];
  filteredDepartamentos: any[] = [];
  filteredPuestos: any[] = [];
  filteredTurnos: any[] = [];

  // Variable para saber si bloqueamos campos (Contexto)
  isContextual: boolean = false;
  esCliente: boolean = false;

  constructor(
    private api: ApiService, 
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private auth: AuthService
  ) {}
  
  ngOnInit() {
    this.esCliente = this.auth.isCompanyAdmin();
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    const empresaId = this.auth.getEmpresaId();

    // 1. Cargar Empresas
    if (!this.esCliente) {
       this.api.getEmpresas().subscribe((res: any) => this.empresas = res.results || res);
    } else {
       this.empleado.empresa = empresaId;
    }

    // 2. Cargar Catálogos Generales
    this.api.getSucursales().subscribe((res: any) => {
        this.allSucursales = res.results || res;
        if (this.esCliente) this.onSelectEmpresa(true);
    });

    this.api.getTurnos().subscribe((res: any) => {
        this.allTurnos = res.results || res;
    });

    // 3. Cargar Departamentos (CORREGIDO: Usar allDepartamentos)
    this.api.getDepartamentos(undefined).subscribe(data => {
      this.allDepartamentos = data.results || data; // <--- CORREGIDO AQUÍ
    });

    // 4. Cargar Puestos
    this.api.getPuestos(undefined, this.esCliente ? empresaId : undefined).subscribe(data => {
      this.allPuestos = data.results || data;
      this.filtrarPuestos();
    });

    // Verificar si venimos de una URL contextual
    // (Damos un pequeño timeout para asegurar que las listas carguen un poco)
    setTimeout(() => {
        this.verificarContexto();
    }, 500);
  }

  // --- FILTROS ---

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
    // CORREGIDO: Usar allDepartamentos
    this.filteredDepartamentos = this.allDepartamentos.filter(d => Number(d.sucursal) === sucursalId);
    this.cd.detectChanges();
  }

  onSelectDepartamento() {
    this.filtrarPuestos();
  }

  filtrarPuestos() {
    const deptoId = this.empleado.departamento;
    const empresaId = this.empleado.empresa;

    if (!empresaId) return;

    // Base: Puestos de la empresa
    let basePuestos = this.allPuestos.filter(p => Number(p.empresa) == Number(empresaId));

    if (!deptoId) {
        // Sin depto: Solo Universales
        this.filteredPuestos = basePuestos.filter(p => !p.area);
    } else {
        // Con depto: Buscar área
        // CORREGIDO: Usar allDepartamentos
        const deptoSeleccionado = this.allDepartamentos.find(d => d.id == deptoId);
        
        if (deptoSeleccionado) {
            const areaId = deptoSeleccionado.area; 
            // Universales O Puestos de la misma área
            this.filteredPuestos = basePuestos.filter(p => p.area === null || p.area === areaId);
        } else {
            this.filteredPuestos = basePuestos;
        }
    }
  }

  // --- CONTEXTO ---

  verificarContexto() {
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
    // CORREGIDO: Usar allDepartamentos
    const depto = this.allDepartamentos.find(d => d.id === deptoId);
    if (!depto) return;

    this.empleado.departamento = depto.id;
    const sucursalId = depto.sucursal; 
    this.empleado.sucursal = sucursalId;

    const suc = this.allSucursales.find(s => s.id === sucursalId);
    if (suc) {
      this.empleado.empresa = suc.empresa;
      
      this.onSelectEmpresa(true);
      this.onSelectSucursal(true);
      this.filtrarPuestos(); // Esto filtra los puestos por el área del depto
      
      this.isContextual = true; 
      this.cd.detectChanges();
    }
  }

  guardar() {
    if(!this.empleado.nombres || !this.empleado.departamento || !this.empleado.empresa) {
      alert("Faltan datos obligatorios (Nombres, Empresa, Departamento)");
      return;
    }

    this.api.saveEmpleado(this.empleado).subscribe(
      () => {
        alert('Guardado!');
        if (this.isContextual) {
           this.router.navigate(['/departamentos', this.empleado.departamento, 'empleados']);
        } else {
           if(this.esCliente) {
                this.router.navigate(['/empresas', this.empleado.empresa, 'empleados']);
           } else {
                this.router.navigate(['/empleados']);
           }
        }
      },
      (err) => {
          console.error(err);
          alert('Error al guardar. Verifica los datos.');
      }
    );
  }
}